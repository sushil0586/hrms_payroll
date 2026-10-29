import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const apiBaseUrl = process.env.HRMS_API_BASE_URL ?? "http://localhost:8001/api/v1";
const runSuffix = Date.now().toString(36).toUpperCase();

function formField(page: Page, label: string): Locator {
  return page
    .locator("label.form-field")
    .filter({ has: page.locator("span", { hasText: new RegExp(`^${label}$`) }) })
    .locator("input, select, textarea")
    .first();
}

function employeeSelect(page: Page): Locator {
  return page
    .locator("label")
    .filter({ has: page.locator("span", { hasText: /^Employee$/ }) })
    .locator("select")
    .first();
}

async function backend(page: Page, path: string, method = "GET", data?: unknown) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value ?? "";
  return page.request.fetch(`${apiBaseUrl}${path}`, {
    data,
    headers: token ? { Authorization: `Token ${token}` } : undefined,
    method,
  });
}

async function assignmentOptions(page: Page) {
  const employeesResponse = await backend(page, "/hr-admin/employees/option-search/?limit=25");
  expect(employeesResponse.ok()).toBeTruthy();
  const employees = (await employeesResponse.json()).items as Array<{ id: string; employee_code: string }>;
  const shiftResponse = await backend(page, "/hr-admin/attendance-operations/workbench-options/?include_shifts=true");
  expect(shiftResponse.ok()).toBeTruthy();
  const shifts = (await shiftResponse.json()).shifts as Array<{ id: string; name: string }>;
  return { employee: employees[1] ?? employees[0], shift: shifts[0] };
}

async function assignmentCount(page: Page) {
  const response = await backend(page, "/hr-admin/employee-shift-assignments/?page=1&page_size=100");
  expect(response.ok()).toBeTruthy();
  return Number((await response.json()).total_count);
}

test.describe.serial("CRUD V2 Wave 11 attendance validation", () => {
  test("CRUD-00208 CRUD-00209 CRUD-04194 reject missing and invalid assignment values without mutation", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/employee-shift-assignments/new", hrAdmin);
    await expectPageReady(page, "Shift assignment");
    const before = await assignmentCount(page);

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/hr-admin/employee-shift-assignments") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Create assignment" }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(400);
    await expect(page.getByRole("alert").filter({ hasText: "Save failed." })).toContainText(/required|may not be null/i);
    await expect(page.getByRole("button", { name: "Create assignment" })).toBeEnabled();
    expect(await assignmentCount(page)).toBe(before);

    const { employee: employeeOption, shift } = await assignmentOptions(page);
    const invalidWindow = await backend(page, "/hr-admin/employee-shift-assignments/", "POST", {
      employee_id: employeeOption.id,
      shift_id: shift.id,
      assignment_kind: "fixed",
      effective_from: "2029-02-10",
      effective_to: "2029-02-01",
      is_primary: true,
      config_snapshot: {},
    });
    expect(invalidWindow.status()).toBe(400);
    expect(JSON.stringify(await invalidWindow.json())).toContain("on or after");
    expect(await assignmentCount(page)).toBe(before);
  });

  test("CRUD-00213 cancel leaves assignment state unchanged and restores the queue", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/employee-shift-assignments/new", hrAdmin);
    await expectPageReady(page, "Shift assignment");
    const before = await assignmentCount(page);
    const { employee: employeeOption, shift } = await assignmentOptions(page);
    await page.getByLabel("Find person").fill(employeeOption.employee_code);
    await expect.poll(() => employeeSelect(page).locator("option").count()).toBeGreaterThan(1);
    await employeeSelect(page).selectOption(employeeOption.id);
    await page.getByLabel("Base shift").selectOption(shift.id);
    await page.getByLabel("Effective from").fill("2029-03-01");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/employee-shift-assignments$/);
    expect(await assignmentCount(page)).toBe(before);
  });

  test("CRUD-00212 CRUD-00218 CRUD-01577 deny ESS and foreign identifiers without disclosure", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/attendance", employee);
    const foreignId = "00000000-0000-4000-8000-000000000001";
    for (const probe of [
      ["POST", "/hr-admin/employee-shift-assignments/", { employee_id: foreignId, shift_id: foreignId, assignment_kind: "fixed", effective_from: "2029-04-01", is_primary: true, config_snapshot: {} }],
      ["GET", `/hr-admin/employee-shift-assignments/${foreignId}/`, undefined],
      ["POST", "/hr-admin/shift-roster-templates/", { code: `DENY${runSuffix}`, name: "Denied", status: "draft", assignment_kind: "fixed", shift_id: foreignId, description: "", config_snapshot: {} }],
    ] as const) {
      const result = await backend(page, probe[1], probe[0], probe[2]);
      expect([403, 404]).toContain(result.status());
      expect(await result.text()).not.toContain("pw-qa-wave11-attendance");
    }
  });

  test("CRUD-01573 CRUD-01575 CRUD-01578 CRUD-05007 validate roster create, duplicate, failure feedback, and cancel", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/shift-roster-templates/new", hrAdmin);
    await expectPageReady(page, "Create roster template");
    const submit = page.getByRole("button", { name: "Create template" });
    await submit.click();
    await expect(formField(page, "Code")).toHaveJSProperty("validity.valueMissing", true);
    await expect(formField(page, "Name")).toHaveJSProperty("validity.valueMissing", true);

    const code = `W11${runSuffix.slice(-8)}`;
    const { shift } = await assignmentOptions(page);
    await formField(page, "Code").fill(code);
    await formField(page, "Name").fill(`Wave 11 ${runSuffix}`);
    await formField(page, "Base shift").selectOption(shift.id);
    await submit.click();
    await expect(page).toHaveURL(/\/hr-admin\/shift-roster-templates$/);

    await gotoAuthenticated(page, "/hr-admin/shift-roster-templates/new", hrAdmin);
    await formField(page, "Code").fill(code);
    await formField(page, "Name").fill(`Duplicate ${runSuffix}`);
    await formField(page, "Base shift").selectOption(shift.id);
    const duplicateResponse = page.waitForResponse((response) => response.url().includes("/api/hr-admin/shift-roster-templates") && response.request().method() === "POST");
    await submit.click();
    expect((await duplicateResponse).status()).toBe(400);
    await expect(page.getByRole("alert").filter({ hasText: "Save failed." })).toContainText(/already exists|unique|duplicate/i);
    await expect(submit).toBeEnabled();

    await formField(page, "Name").fill(`Unsaved ${runSuffix}`);
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/shift-roster-templates$/);
  });

  test("CRUD-01576 CRUD-05008 prevent duplicate roster submission while the first request is pending", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/shift-roster-templates/new", hrAdmin);
    await expectPageReady(page, "Create roster template");
    await formField(page, "Code").fill(`W11P${runSuffix.slice(-7)}`);
    await formField(page, "Name").fill(`Pending ${runSuffix}`);
    const { shift } = await assignmentOptions(page);
    await formField(page, "Base shift").selectOption(shift.id);

    let postCount = 0;
    await page.route("**/api/hr-admin/shift-roster-templates", async (route) => {
      if (route.request().method() === "POST") {
        postCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await route.continue();
    });
    const submit = page.getByRole("button", { name: "Create template" });
    await submit.dblclick();
    await expect(page.getByRole("button", { name: "Saving roster template" })).toBeDisabled();
    await expect(page).toHaveURL(/\/hr-admin\/shift-roster-templates$/, { timeout: 20_000 });
    expect(postCount).toBe(1);
  });
});
