import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin, type Persona } from "../helpers/staging-auth";

const PASSWORD = "Password@123";

function uniqueRef(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function field(scope: Page | Locator, label: string, index = 0) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").nth(index);
}

function roleRow(page: Page, code: string) {
  return page.locator(".selection-row").filter({ hasText: code }).first();
}

async function selectFirstNonEmptyOption(locator: Locator) {
  const value = await locator.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).find((option) => option.value)?.value ?? "";
  });
  expect(value).not.toBe("");
  await locator.selectOption(value);
  return value;
}

async function selectOptionContaining(locator: Locator, text: string) {
  const value = await locator.evaluate((element, targetText) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).find((option) => option.textContent?.includes(String(targetText)))?.value ?? "";
  }, text);
  expect(value).not.toBe("");
  await locator.selectOption(value);
  return value;
}

async function submitAndCapture<T>(page: Page, path: string, method: "POST" | "PATCH", action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(`/api/hr-admin/${path}`) && item.request().method() === method),
    action(),
  ]);
  return {
    ok: response.ok(),
    status: response.status(),
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

async function loginAs(page: Page, persona: Persona, path: string) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  await gotoAuthenticated(page, path, persona);
}

async function createEmployeeThroughBrowser(page: Page, input: {
  code: string;
  firstName: string;
  lastName: string;
  username: string;
  reportingManagerCode?: string;
}) {
  await gotoAuthenticated(page, "/hr-admin/employees/new");
  await field(page, "Employee code").fill(input.code);
  await field(page, "Employment status").selectOption("active");
  await field(page, "First name").fill(input.firstName);
  await field(page, "Last name").fill(input.lastName);
  await field(page, "Preferred name").fill(`${input.firstName} ${input.lastName}`);
  await field(page, "Work email").fill(`${input.username}@example.test`);
  await field(page, "Personal email").fill(`${input.username}.personal@example.test`);
  await field(page, "Phone number").fill("+91 98765 43000");
  await field(page, "Date of birth").fill("1995-01-01");
  await field(page, "Date of joining").fill("2026-01-01");
  await field(page, "Probation end date").fill("2026-06-30");
  await field(page, "Confirmation date").fill("2026-07-01");
  await selectFirstNonEmptyOption(field(page, "Legal entity"));
  await selectFirstNonEmptyOption(field(page, "Branch"));
  await selectFirstNonEmptyOption(field(page, "Department"));
  await selectFirstNonEmptyOption(field(page, "Cost center"));
  await selectFirstNonEmptyOption(field(page, "Designation"));
  await selectFirstNonEmptyOption(field(page, "Employment type"));
  if (input.reportingManagerCode) {
    await selectOptionContaining(field(page, "Reporting manager"), input.reportingManagerCode);
  } else {
    await selectFirstNonEmptyOption(field(page, "Reporting manager"));
  }
  const result = await submitAndCapture<{ id: string; employee_code: string }>(page, "employees", "POST", async () => {
    await page.getByRole("button", { name: "Create employee" }).click();
  });
  expect(result.ok).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`/hr-admin/employees\\?employeeId=${result.payload.id}`));
  await expect(page.getByText(input.code).first()).toBeVisible();
  return result.payload.id;
}

async function provisionAccessThroughBrowser(page: Page, input: {
  employeeId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roleCode: "employee" | "manager";
}) {
  await gotoAuthenticated(page, `/hr-admin/employees/${input.employeeId}/access`);
  await expectPageReady(page, /Manage system access/);
  await expect(page.getByRole("heading", { name: "Identity and membership" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Access controls" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Role assignment" })).toBeVisible();
  await field(page, "Username").fill(input.username);
  await field(page, "Email").fill(input.email);
  await field(page, "First name").fill(input.firstName);
  await field(page, "Last name").fill(input.lastName);
  await field(page, "Display name").fill(`${input.firstName} ${input.lastName}`);
  await field(page, "Phone number").fill("+91 98765 43001");
  await field(page, "Membership status").selectOption("active");
  await field(page, "Temporary password").fill(PASSWORD);
  const mustChange = page.locator(".toggle-field").filter({ hasText: "Must change password" }).locator("input[type='checkbox']");
  await mustChange.uncheck();
  await expect(roleRow(page, input.roleCode)).toBeVisible();
  await roleRow(page, input.roleCode).locator("input[type='checkbox']").check();
  const result = await submitAndCapture(page, `employees/${input.employeeId}/access`, "POST", async () => {
    await page.getByRole("button", { name: "Create access" }).click();
  });
  expect(result.ok).toBeTruthy();
  await expect(page.getByText("Employee access saved successfully.")).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

test.describe("Phase 3E fresh access and role visibility certification", () => {
  test("fresh manager and employee can login and see correct ESS/MSS role surfaces", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const runId = Date.now();
    const managerCode = uniqueRef("MGR");
    const employeeCode = uniqueRef("DR");
    const managerUsername = `pw.manager.${runId}`;
    const employeeUsername = `pw.employee.${runId}`;

    await loginAs(page, hrAdmin, "/hr-admin/employees/new");
    const managerId = await createEmployeeThroughBrowser(page, {
      code: managerCode,
      firstName: "Fresh",
      lastName: "Manager",
      username: managerUsername,
    });
    await provisionAccessThroughBrowser(page, {
      employeeId: managerId,
      username: managerUsername,
      email: `${managerUsername}@example.test`,
      firstName: "Fresh",
      lastName: "Manager",
      roleCode: "manager",
    });

    const employeeId = await createEmployeeThroughBrowser(page, {
      code: employeeCode,
      firstName: "Fresh",
      lastName: "Employee",
      username: employeeUsername,
      reportingManagerCode: managerCode,
    });
    await provisionAccessThroughBrowser(page, {
      employeeId,
      username: employeeUsername,
      email: `${employeeUsername}@example.test`,
      firstName: "Fresh",
      lastName: "Employee",
      roleCode: "employee",
    });

    await loginAs(page, { username: employeeUsername, password: PASSWORD }, "/ess");
    await expectPageReady(page, "Self service");
    await expect(page.getByText(employeeCode).first()).toBeVisible();
    await expect(page.getByText("Fresh Employee").first()).toBeVisible();
    await expect(page.getByText("Reporting manager: Fresh Manager").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Open MSS" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await loginAs(page, { username: managerUsername, password: PASSWORD }, "/mss/approvals");
    await expectPageReady(page, "Manager inbox");
    await expect(page.locator(".metric-tile, .metric-tile-soft").filter({ hasText: "Team members" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Approval queues" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leave approvals" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leave approval detail" })).toBeVisible();
    await page.locator(".tabbar").filter({ hasText: "Attendance" }).first().getByRole("link", { name: /Attendance/ }).click();
    await expect(page).toHaveURL(/queue=attendance/);
    await expect(page.getByRole("heading", { name: "Attendance regularizations" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Regularization detail" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await loginAs(page, hrAdmin, `/hr-admin/employees?employeeId=${employeeId}`);
    await expectPageReady(page, "Employees");
    await expect(page.getByText(employeeCode).first()).toBeVisible();
    await expect(page.getByText("Fresh Manager").first()).toBeVisible();
  });
});
