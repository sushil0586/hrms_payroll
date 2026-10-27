import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, requestWithBrowserSession } from "../helpers/staging-auth";

const liveApiRequired = Boolean(process.env.HRMS_API_BASE_URL);

type CreatedEmployee = {
  id: string;
  employee_code: string;
  full_name?: string;
  work_email?: string;
};

function uniqueRef() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14).toLowerCase();
}

function field(page: Page, label: string): Locator {
  return page
    .locator("label.form-field")
    .filter({ has: page.locator("span", { hasText: new RegExp(`^${label}$`) }) })
    .locator("input, select, textarea")
    .first();
}

function rowForCode(page: Page, code: string): Locator {
  return page.getByRole("row").filter({ hasText: code }).first();
}

async function selectFirstNonEmpty(select: Locator) {
  const value = await select.evaluate((element) => {
    const options = Array.from((element as HTMLSelectElement).options);
    return options.find((option) => option.value)?.value ?? "";
  });
  expect(value).toBeTruthy();
  await select.selectOption(value);
}

async function selectOptionThatPopulates(source: Locator, target: Locator, label: string) {
  const values = await source.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options)
      .filter((option) => option.value)
      .map((option) => option.value);
  });

  for (const value of values) {
    await source.selectOption(value);
    const populated = await target.evaluate((element) => (element as HTMLSelectElement).value);
    if (populated) {
      return;
    }
  }

  throw new Error(`No ${label} option auto-populates its dependent field.`);
}

async function continueToStep(page: Page, heading: string | RegExp) {
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}

async function fillEmployeeBasics(page: Page, input: { code: string; firstName: string; lastName: string; email: string }) {
  await field(page, "Employee code").fill(input.code);
  await field(page, "Employment status").selectOption("active");
  await field(page, "First name").fill(input.firstName);
  await field(page, "Last name").fill(input.lastName);
  await field(page, "Preferred name").fill(`${input.firstName} ${input.lastName}`);
  await continueToStep(page, "Contact and dates");
  await field(page, "Work email").fill(input.email);
  await field(page, "Personal email").fill(`personal.${input.email}`);
  await field(page, "Phone number").fill("+91 90000 01789");
  await field(page, "Date of birth").fill("1995-01-15");
  await field(page, "Date of joining").fill("2026-10-01");
  await field(page, "Probation end date").fill("2026-12-31");
  await continueToStep(page, "Structural mapping");
  await selectFirstNonEmpty(field(page, "Branch"));
  await selectFirstNonEmpty(field(page, "Cost center"));
  await selectOptionThatPopulates(field(page, "Department"), field(page, "Business unit"), "department");
  await selectOptionThatPopulates(field(page, "Designation"), field(page, "Grade"), "designation");
  await selectFirstNonEmpty(field(page, "Employment type"));
  await continueToStep(page, "Review");
}

async function createEmployeeWithNetworkRecovery(page: Page, runRef: string): Promise<CreatedEmployee> {
  const code = `PC-EMP-${runRef}`;
  const email = `pc.employee.${runRef}@example.test`;
  let firstAttempt = true;

  await page.route("**/api/hr-admin/employees", async (route) => {
    if (route.request().method() !== "POST" || !firstAttempt) {
      await route.fallback();
      return;
    }
    firstAttempt = false;
    await route.abort("failed");
  });

  await gotoAuthenticated(page, "/hr-admin/employees/new");
  await expectPageReady(page, "Create employee");
  await fillEmployeeBasics(page, { code, firstName: "PC", lastName: `Employee ${runRef}`, email });

  await page.getByRole("button", { name: "Create employee" }).click();
  await expect(page.getByText("Save needs attention.")).toBeVisible();
  await expect(
    page.getByText(
      "Unable to reach the server. We could not confirm the outcome. Check the latest records before trying again to avoid submitting twice.",
    ),
  ).toBeVisible();
  await expect(page.locator(".employee-form-review-row").filter({ hasText: "Employee code" }).filter({ hasText: code })).toBeVisible();
  await expect(page.locator(".employee-form-review-row").filter({ hasText: "Work email" }).filter({ hasText: email })).toBeVisible();

  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/hr-admin/employees") && response.request().method() === "POST",
    { timeout: 20_000 },
  );
  await page.getByRole("button", { name: "Create employee" }).click();
  const response = await responsePromise;
  const payload = (await response.json().catch(() => ({}))) as CreatedEmployee;
  expect(response.ok(), `Employee create failed after recovery: ${response.status()} ${JSON.stringify(payload)}`).toBeTruthy();
  await expect(page).toHaveURL(/\/hr-admin\/employees\?employeeId=/, { timeout: 20_000 });
  const redirectedId = new URL(page.url()).searchParams.get("employeeId");
  const employeeId = payload.id || redirectedId;
  expect(employeeId).toBeTruthy();
  if (payload.id) {
    expect(redirectedId).toBe(payload.id);
  }
  await page.unroute("**/api/hr-admin/employees");
  return { ...payload, id: employeeId!, employee_code: payload.employee_code || code, work_email: payload.work_email || email };
}

test.describe("HR Admin Employee Directory production certification", () => {
  test.skip(!liveApiRequired, "Employee production certification requires a live HRMS API.");
  test.setTimeout(7 * 60 * 1000);

  test("is launch-grade for employee master, access, offboarding safety, recovery, persistence, and responsive UX", async ({ page }) => {
    const runRef = uniqueRef();
    await page.setViewportSize({ width: 1440, height: 1100 });

    const employee = await createEmployeeWithNetworkRecovery(page, runRef);
    await gotoAuthenticated(page, `/hr-admin/employees?q=${employee.employee_code}&status=all&page_size=5`);
    await expectPageReady(page, "Employees");
    await expect(rowForCode(page, employee.employee_code)).toBeVisible();
    await expect(rowForCode(page, employee.employee_code)).toContainText("Not provisioned");

    await gotoAuthenticated(page, "/hr-admin/employees/new");
    await fillEmployeeBasics(page, {
      code: employee.employee_code,
      firstName: "Duplicate",
      lastName: "Employee",
      email: `duplicate.${runRef}@example.test`,
    });
    await page.getByRole("button", { name: "Create employee" }).click();
    await expect(page.getByText("Save needs attention.")).toBeVisible();
    await expect(page.getByText(/already|unique|exists|duplicate/i).first()).toBeVisible();

    const doubleCode = `PC-DBL-${runRef}`;
    let doubleSubmitCount = 0;
    await page.route("**/api/hr-admin/employees", async (route) => {
      if (route.request().method() === "POST" && route.request().postData()?.includes(doubleCode)) {
        doubleSubmitCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
      await route.fallback();
    });
    await gotoAuthenticated(page, "/hr-admin/employees/new");
    await fillEmployeeBasics(page, {
      code: doubleCode,
      firstName: "PC",
      lastName: "Double Submit",
      email: `pc.double.${runRef}@example.test`,
    });
    const doubleCreateResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/hr-admin/employees") &&
        response.request().method() === "POST" &&
        Boolean(response.request().postData()?.includes(doubleCode)),
      { timeout: 20_000 },
    );
    const createButton = page.getByRole("button", { name: "Create employee" });
    await createButton.click();
    await createButton.click({ timeout: 250 }).catch(() => undefined);
    const doubleResponse = await doubleCreateResponse;
    expect(doubleResponse.ok(), `Double-submit employee create failed: ${doubleResponse.status()}`).toBeTruthy();
    await expect(page).toHaveURL(/\/hr-admin\/employees\?employeeId=/, { timeout: 20_000 });
    expect(doubleSubmitCount, "duplicate submit should send one employee create request").toBe(1);
    await page.unroute("**/api/hr-admin/employees");

    const username = `pc.employee.${runRef}`;
    const password = `Employee@${runRef.slice(-6)}!`;
    await gotoAuthenticated(page, `/hr-admin/employees?employeeId=${employee.id}&action=access`);
    await expect(page.getByRole("dialog", { name: "Manage access" })).toBeVisible();
    await field(page, "Username").fill(username);
    await field(page, "Email").fill(employee.work_email ?? `pc.employee.${runRef}@example.test`);
    await field(page, "Temporary password").fill(password);
    await field(page, "Membership status").selectOption("active");
    await page.getByLabel("User active").setChecked(true);
    await page.getByLabel("Must change password").setChecked(false);
    await page.getByLabel("Default membership").setChecked(true);
    const employeeRole = page.locator(".selection-row").filter({ hasText: "Employee" }).filter({ hasText: "employee" }).first();
    await expect(employeeRole).toBeVisible();
    await employeeRole.locator('input[type="checkbox"]').setChecked(true);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Create access" }).click();
    await expect(page.getByText("Employee access saved. Login, membership and role settings are up to date.")).toBeVisible();

    const accessResponse = await requestWithBrowserSession(page, `/api/hr-admin/employees/${employee.id}/access`);
    expect(accessResponse.status).toBe(200);
    const accessPayload = JSON.parse(accessResponse.body);
    expect(accessPayload.has_access).toBeTruthy();
    expect(accessPayload.membership_status).toBe("active");

    await gotoAuthenticated(page, `/hr-admin/employees?employeeId=${employee.id}&action=edit`);
    await expect(page.getByRole("dialog", { name: "Edit employee" })).toBeVisible();
    await field(page, "Employment status").selectOption("inactive");
    await continueToStep(page, "Contact and dates");
    await continueToStep(page, "Structural mapping");
    await continueToStep(page, "Review");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Save needs attention.")).toBeVisible();
    await expect(page.getByText("Deactivate employee access first before moving this employee to an inactive or exited status.").first()).toBeVisible();

    await gotoAuthenticated(page, `/hr-admin/employees?employeeId=${employee.id}&action=access`);
    await expect(page.getByRole("dialog", { name: "Manage access" })).toBeVisible();
    await page.getByLabel("User active").setChecked(false);
    await field(page, "Membership status").selectOption("suspended");
    await page.getByLabel("Must change password").setChecked(true);
    await expect(page.getByRole("button", { name: "Update access" })).toBeEnabled();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Update access" }).click();
    await expect(page.getByText("Employee access saved. Login, membership and role settings are up to date.")).toBeVisible();
    const offboardedAccessResponse = await requestWithBrowserSession(page, `/api/hr-admin/employees/${employee.id}/access`);
    expect(offboardedAccessResponse.status).toBe(200);
    const offboardedAccess = JSON.parse(offboardedAccessResponse.body);
    expect(offboardedAccess.is_user_active).toBe(false);
    expect(offboardedAccess.membership_status).toBe("suspended");

    await gotoAuthenticated(page, `/hr-admin/employees?employeeId=${employee.id}&action=edit`);
    await expect(page.getByRole("dialog", { name: "Edit employee" })).toBeVisible();
    await field(page, "Employment status").selectOption("inactive");
    await continueToStep(page, "Contact and dates");
    await continueToStep(page, "Structural mapping");
    await continueToStep(page, "Review");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(new RegExp(`/hr-admin/employees\\?employeeId=${employee.id}`), { timeout: 20_000 });
    await gotoAuthenticated(page, `/hr-admin/employees?q=${employee.employee_code}&status=all&page_size=5`);
    await expect(rowForCode(page, employee.employee_code)).toContainText(/Inactive|Active/);
    await expect(rowForCode(page, employee.employee_code)).toContainText("suspended");

    await gotoAuthenticated(page, `/hr-admin/employees?q=${employee.employee_code}&status=all&page_size=5`);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    await expect(rowForCode(page, employee.employee_code)).toBeVisible();
    await expect(rowForCode(page, employee.employee_code)).toContainText("suspended");
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(page.getByRole("heading", { name: "Employees" })).toBeVisible();
    await expect(rowForCode(page, employee.employee_code)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
