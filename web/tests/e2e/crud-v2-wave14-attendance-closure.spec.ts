import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8003/api/v1";

function formField(page: Page, label: string): Locator {
  return page
    .locator("label.form-field")
    .filter({ has: page.locator("span", { hasText: new RegExp(`^${label}$`) }) })
    .locator("input, select, textarea")
    .first();
}

async function backend(page: Page, path: string, method = "GET", data?: unknown) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value ?? "";
  return page.request.fetch(`${apiBase}${path}`, {
    data,
    headers: token ? { Authorization: `Token ${token}` } : undefined,
    method,
  });
}

async function assignmentOptions(page: Page) {
  const employees = await backend(page, "/hr-admin/employees/option-search/?limit=25");
  const shifts = await backend(page, "/hr-admin/attendance-operations/workbench-options/?include_shifts=true");
  expect(employees.status()).toBe(200);
  expect(shifts.status()).toBe(200);
  return {
    employees: (await employees.json()).items as Array<{ id: string; employee_code: string }>,
    shifts: (await shifts.json()).shifts as Array<{ id: string; name: string }>,
  };
}

async function assignmentCount(page: Page) {
  const response = await backend(page, "/hr-admin/employee-shift-assignments/?page=1&page_size=100");
  expect(response.status()).toBe(200);
  return Number((await response.json()).total_count);
}

test("CRUD-00208 CRUD-00209 CRUD-04193 CRUD-04194 assignment validation and truthful feedback", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 1000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const admin = workspacePersona(workspace, "hr_admin");
  try {
    await gotoAuthenticated(page, "/hr-admin/employee-shift-assignments/new", admin);
    await expectPageReady(page, "Shift assignment");
    const before = await assignmentCount(page);
    const submit = page.getByRole("button", { name: "Create assignment" });

    const missingResponse = page.waitForResponse((response) =>
      response.url().includes("/api/hr-admin/employee-shift-assignments") && response.request().method() === "POST",
    );
    await submit.click();
    expect((await missingResponse).status()).toBe(400);
    await expect(page.getByRole("alert").filter({ hasText: "Save failed." })).toContainText(/required|may not be null/i);
    await expect(submit).toBeEnabled();
    expect(await assignmentCount(page)).toBe(before);

    const { employees, shifts } = await assignmentOptions(page);
    const existing = await backend(page, "/hr-admin/employee-shift-assignments/?page=1&page_size=100");
    const assigned = new Set(((await existing.json()).items as Array<{ employee_id: string }>).map((item) => item.employee_id));
    const employee = employees.find((candidate) => !assigned.has(candidate.id)) ?? employees.at(-1)!;
    const employeeSelect = page.locator("label").filter({ hasText: "Employee" }).locator("select").first();

    await page.getByLabel("Base shift").selectOption(shifts[0].id);
    await page.getByLabel("Effective from").fill("2034-04-01");
    let rejected = page.waitForResponse((response) => response.url().includes("/api/hr-admin/employee-shift-assignments") && response.request().method() === "POST");
    await submit.click();
    expect((await rejected).status()).toBe(400);

    await page.getByLabel("Find person").fill(employee.employee_code);
    await expect.poll(() => employeeSelect.locator("option").count()).toBeGreaterThan(1);
    await employeeSelect.selectOption(employee.id);
    await page.getByLabel("Base shift").selectOption("");
    rejected = page.waitForResponse((response) => response.url().includes("/api/hr-admin/employee-shift-assignments") && response.request().method() === "POST");
    await submit.click();
    expect((await rejected).status()).toBe(400);

    await page.getByLabel("Base shift").selectOption(shifts[0].id);
    await page.getByLabel("Effective from").fill("");
    rejected = page.waitForResponse((response) => response.url().includes("/api/hr-admin/employee-shift-assignments") && response.request().method() === "POST");
    await submit.click();
    expect((await rejected).status()).toBe(400);

    await page.getByLabel("Effective from").fill("2034-04-01");

    await page.getByLabel("Effective to").fill("2034-03-31");
    rejected = page.waitForResponse((response) => response.url().includes("/api/hr-admin/employee-shift-assignments") && response.request().method() === "POST");
    await submit.click();
    expect((await rejected).status()).toBe(400);
    await expect(page.getByRole("alert").filter({ hasText: "Save failed." })).toContainText(/on or after/i);
    await page.getByLabel("Effective to").fill("");

    let posts = 0;
    await page.route("**/api/hr-admin/employee-shift-assignments", async (route) => {
      if (route.request().method() === "POST" && posts++ === 0) {
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ detail: "Controlled assignment rejection." }) });
        return;
      }
      await route.continue();
    });
    await submit.click();
    await expect(page.getByRole("alert").filter({ hasText: "Save failed." })).toContainText("Controlled assignment rejection.");
    await expect(page.getByLabel("Effective from")).toHaveValue("2034-04-01");
    expect(await assignmentCount(page)).toBe(before);

    await page.unroute("**/api/hr-admin/employee-shift-assignments");
    await submit.click();
    await expect(page).toHaveURL(/employee-shift-assignments$/);
    const after = await backend(page, "/hr-admin/employee-shift-assignments/?page=1&page_size=100");
    const created = ((await after.json()).items as Array<{ employee_id: string; effective_from: string }>).find(
      (item) => item.employee_id === employee.id && item.effective_from === "2034-04-01",
    );
    expect(created).toBeTruthy();

    const invalid = await backend(page, "/hr-admin/employee-shift-assignments/", "POST", {
      employee_id: employee.id,
      shift_id: shifts[0].id,
      assignment_kind: "fixed",
      effective_from: "2034-06-10",
      effective_to: "2034-06-01",
      is_primary: false,
      config_snapshot: {},
    });
    expect(invalid.status()).toBe(400);
    expect(JSON.stringify(await invalid.json())).toMatch(/on or after/i);
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});

test("CRUD-01573 CRUD-01574 CRUD-05006 CRUD-05013 roster validation success and recoverable update failure", async ({ page }, testInfo) => {
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const admin = workspacePersona(workspace, "hr_admin");
  try {
    await gotoAuthenticated(page, "/hr-admin/shift-roster-templates/new", admin);
    await expectPageReady(page, "Create roster template");
    const submit = page.getByRole("button", { name: "Create template" });
    await submit.click();
    await expect(formField(page, "Code")).toHaveJSProperty("validity.valueMissing", true);
    await expect(formField(page, "Name")).toHaveJSProperty("validity.valueMissing", true);

    const { shifts } = await assignmentOptions(page);
    const code = `W14${Date.now().toString(36).toUpperCase().slice(-7)}`;
    await formField(page, "Code").fill(code);
    await formField(page, "Name").fill("Wave 14 roster");
    await formField(page, "Base shift").selectOption(shifts[0].id);
    await submit.click();
    await expect(page).toHaveURL(/shift-roster-templates$/);

    const list = await backend(page, `/hr-admin/shift-roster-templates/?q=${code}&page=1&page_size=25`);
    expect(list.status()).toBe(200);
    const item = ((await list.json()).items as Array<{ id: string; code: string }>).find((row) => row.code === code)!;
    expect(item).toBeTruthy();

    const tooLong = await backend(page, "/hr-admin/shift-roster-templates/", "POST", {
      code: "X".repeat(80), name: "Boundary roster", status: "draft", assignment_kind: "fixed", shift_id: shifts[0].id, config_snapshot: {},
    });
    expect(tooLong.status()).toBe(400);

    await gotoAuthenticated(page, `/hr-admin/shift-roster-templates/${item.id}/edit`, admin);
    await formField(page, "Name").fill("Retained roster input");
    await page.route(`**/api/hr-admin/shift-roster-templates/${item.id}`, async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ detail: "Controlled roster rejection." }) });
        return;
      }
      await route.continue();
    });
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Save failed." })).toContainText("Controlled roster rejection.");
    await expect(formField(page, "Name")).toHaveValue("Retained roster input");
    const unchanged = await backend(page, `/hr-admin/shift-roster-templates/${item.id}/`);
    expect((await unchanged.json()).name).toBe("Wave 14 roster");
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});

test("CRUD-01352 assignment empty state is accessible on tablet", async ({ page }, testInfo) => {
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  try {
    await page.setViewportSize({ width: 820, height: 1180 });
    await gotoAuthenticated(page, "/hr-admin/attendance-policy-assignments", workspacePersona(workspace, "hr_admin"));
    await expectPageReady(page, "Attendance assignments");
    const toolbar = page.getByTestId("attendance-policy-assignments-toolbar");
    await toolbar.getByPlaceholder("Policy, employee, scope").fill("NO-WAVE14-MATCH");
    await expect(page.getByText("No assignments match the current filters.")).toBeVisible();
    await expect(toolbar.getByRole("button", { name: "Clear filters" })).toBeVisible();
    await toolbar.getByRole("button", { name: "Clear filters" }).focus();
    await expect(toolbar.getByRole("button", { name: "Clear filters" })).toBeFocused();
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});

test("CRUD-01355 CRUD-01359 CRUD-01360 CRUD-04874 policy workbench options remain scoped and durable", async ({ page }, testInfo) => {
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  try {
    const admin = workspacePersona(workspace, "hr_admin");
    await gotoAuthenticated(page, "/hr-admin/attendance-policy-assignments?assignmentModal=create", admin);
    await expectPageReady(page, "Attendance assignments");
    const modal = page.getByRole("dialog", { name: "Create attendance assignment" });
    const policy = modal.getByLabel("Attendance policy");
    await expect(policy.locator("option")).not.toHaveCount(1);
    const selected = await policy.locator("option").nth(1).textContent();
    await policy.selectOption({ index: 1 });
    await page.reload();
    await expectPageReady(page, "Attendance assignments");
    await expect(page.getByRole("dialog", { name: "Create attendance assignment" })).toBeVisible();

    const options = await backend(page, "/hr-admin/policy-workbench-options/?include=attendance_policies,legal_entities,branches,locations,departments,grades,employment_types");
    expect(options.status()).toBe(200);
    expect(JSON.stringify(await options.json())).toContain(selected?.trim() ?? "");

    await gotoAuthenticated(page, "/ess/attendance", workspacePersona(workspace, "employee"));
    const denied = await backend(page, "/hr-admin/policy-workbench-options/?include=attendance_policies");
    expect(denied.status()).toBe(403);
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
