import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const runId = Date.now().toString(36).toUpperCase();
const employeeEmail = process.env.PLAYWRIGHT_PHASE3_EMPLOYEE_EMAIL ?? `pw.hrms.phase3.${runId.toLowerCase()}@example.test`;
const employeePassword = process.env.PLAYWRIGHT_PHASE3_EMPLOYEE_PASSWORD;
const employeeLoginIdentifier = process.env.PLAYWRIGHT_PHASE3_EMPLOYEE_LOGIN ?? employeeEmail;

function code(prefix: string) {
  return `PW_${prefix}_${runId}`;
}

function username(prefix: string) {
  return `pw.${prefix}.${runId.toLowerCase()}`;
}

function field(scope: Page | Locator, label: string, index = 0) {
  return scope
    .locator("label.form-field")
    .filter({ hasText: new RegExp(`^${label}`) })
    .locator("input, select, textarea")
    .nth(index);
}

function roleRow(page: Page, roleCode: string) {
  return page.locator(`label.selection-row:has(p:text-is("${roleCode}"))`).first();
}

async function submitAndCapture<T>(page: Page, path: string, method: "POST" | "PATCH", action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(path) && item.request().method() === method),
    action(),
  ]);
  const payload = (await response.json().catch(() => ({}))) as T;
  expect(response.ok(), `${method} ${path} failed with ${response.status()}: ${JSON.stringify(payload)}`).toBeTruthy();
  return payload;
}

async function expectSelectHasOption(locator: Locator) {
  const optionCount = await locator.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).filter((option) => option.value).length;
  });
  expect(optionCount).toBeGreaterThan(0);
}

async function selectFirstNonEmpty(locator: Locator) {
  const value = await locator.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).find((option) => option.value)?.value ?? "";
  });
  expect(value, "Expected select to have a usable option").not.toBe("");
  await locator.selectOption(value);
  return value;
}

async function selectStructureForReadyEmployee(page: Page) {
  const legalEntity = field(page, "Legal entity");
  const legalEntityValues = await legalEntity.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).filter((option) => option.value).map((option) => option.value);
  });
  expect(legalEntityValues.length, "At least one legal entity is required for employee setup").toBeGreaterThan(0);

  let foundReadyLegalEntity = false;
  for (const value of legalEntityValues) {
    await legalEntity.selectOption(value);
    const branchCount = await field(page, "Branch").evaluate((element) => {
      const select = element as HTMLSelectElement;
      return Array.from(select.options).filter((option) => option.value).length;
    });
    const costCenterCount = await field(page, "Cost center").evaluate((element) => {
      const select = element as HTMLSelectElement;
      return Array.from(select.options).filter((option) => option.value).length;
    });
    if (branchCount > 0 && costCenterCount > 0) {
      foundReadyLegalEntity = true;
      break;
    }
  }
  expect(foundReadyLegalEntity, "At least one legal entity should have branch and cost-center mappings").toBe(true);

  await selectFirstNonEmpty(field(page, "Branch"));
  await expect(field(page, "Location")).not.toHaveValue("");
  await selectFirstNonEmpty(field(page, "Department"));
  await expect(field(page, "Business unit")).not.toHaveValue("");
  await selectFirstNonEmpty(field(page, "Cost center"));
  await selectFirstNonEmpty(field(page, "Designation"));
  await expect(field(page, "Grade")).not.toHaveValue("");
  await selectFirstNonEmpty(field(page, "Employment type"));
  await selectFirstNonEmpty(field(page, "Reporting manager"));
}

async function expectEmployeeFormUsable(page: Page, mode: "create" | "edit") {
  await expectPageReady(page, mode === "create" ? "Create employee" : /Edit employee:/);
  await expect(page.getByRole("heading", { name: mode === "create" ? "Create employee master" : "Edit employee master" })).toBeVisible();
  for (const heading of ["Identity and employment", "Contact and dates", "Structural mapping"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  for (const label of [
    "Employee code",
    "Employment status",
    "First name",
    "Last name",
    "Preferred name",
    "Work email",
    "Personal email",
    "Phone number",
    "Date of birth",
    "Date of joining",
    "Legal entity",
    "Branch",
    "Location",
    "Business unit",
    "Department",
    "Cost center",
    "Designation",
    "Grade",
    "Employment type",
    "Reporting manager",
  ]) {
    await expect(field(page, label), `${label} should stay visible and usable`).toBeVisible();
  }
  for (const label of ["Employment status", "Legal entity", "Branch", "Department", "Cost center", "Designation", "Employment type", "Reporting manager"]) {
    await expectSelectHasOption(field(page, label));
  }
  await expect(page.getByRole("button", { name: mode === "create" ? "Create employee" : "Save changes" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function fillNewEmployee(page: Page) {
  const employeeCode = code("EMP_STAGE");
  await field(page, "Employee code").fill(employeeCode);
  await field(page, "Employment status").selectOption("active");
  await field(page, "First name").fill("Aadish");
  await field(page, "Last name").fill("Stage");
  await field(page, "Preferred name").fill("Aadish Stage");
  await field(page, "Work email").fill(employeeEmail);
  await field(page, "Personal email").fill(employeeEmail);
  await field(page, "Phone number").fill("+91 98765 43002");
  await field(page, "Date of birth").fill("1996-01-01");
  await field(page, "Date of joining").fill("2026-09-01");
  await field(page, "Probation end date").fill("2027-02-28");
  await field(page, "Confirmation date").fill("2027-03-01");
  await selectStructureForReadyEmployee(page);
  return employeeCode;
}

async function provisionEmployeeAccess(page: Page, employeeId: string) {
  await gotoAuthenticated(page, `/hr-admin/employees/${employeeId}/access`, hrAdmin);
  await expectPageReady(page, /Access for Aadish Stage/);
  for (const heading of ["Identity and membership", "Access controls", "Role assignment"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  const loginName = username("aadish.stage");
  await field(page, "Username").fill(loginName);
  await field(page, "Email").fill(employeeEmail);
  await field(page, "First name").fill("Aadish");
  await field(page, "Last name").fill("Stage");
  await field(page, "Display name").fill("Aadish Stage");
  await field(page, "Phone number").fill("+91 98765 43002");
  await field(page, "Membership status").selectOption("active");

  const mustChange = page.locator(".toggle-field").filter({ hasText: "Must change password" }).locator("input[type='checkbox']");
  await mustChange.check();
  const employeeRole = roleRow(page, "employee");
  await expect(employeeRole).toBeVisible();
  await employeeRole.click();
  await expect(employeeRole.locator("input[type='checkbox']")).toBeChecked();
  await expect(page.getByRole("button", { name: "Create access" })).toBeEnabled();

  await submitAndCapture(page, `/api/hr-admin/employees/${employeeId}/access`, "POST", async () => {
    await page.getByRole("button", { name: "Create access" }).click();
  });
  await expect(page.getByText("Employee access saved successfully.")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  return loginName;
}

async function requestPasswordSetupEmail(page: Page, identifier: string) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  await page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await expect(page.locator(".auth-panel")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
  await page.locator("form.auth-form-shell input.auth-input").fill(identifier);
  await expect(page.locator("form.auth-form-shell input.auth-input")).toHaveValue(identifier);
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes("/api/auth/password-reset/request") && item.request().method() === "POST", { timeout: 30_000 }),
    page.getByRole("button", { name: "Send setup link" }).click(),
  ]);
  const payload = await response.json().catch(() => ({}));
  expect(response.ok(), `Password setup email request failed with ${response.status()}: ${JSON.stringify(payload)}`).toBeTruthy();
  await expect(page.getByText(/secure password setup link|if the account exists/i)).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function addPrimaryBankAccount(page: Page, employeeId: string) {
  await gotoAuthenticated(page, `/hr-admin/employees/${employeeId}/bank-accounts`, hrAdmin);
  await expectPageReady(page, /Bank accounts for Aadish Stage/);
  await expect(page.getByRole("heading", { name: "Bank accounts", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create bank account" })).toBeVisible();

  const form = page.locator("form.employee-bank-account-form").first();
  await field(form, "Account holder name").fill("Aadish Stage");
  await field(form, "Bank name").fill(`Stage Certification Bank ${runId}`);
  await field(form, "Account number").fill(`910000${Date.now().toString().slice(-8)}`);
  await field(form, "IFSC code").fill("HDFC0001234");
  await field(form, "Branch name").fill("Bengaluru Stage");
  await form.locator("label.selection-row").filter({ hasText: "Primary account" }).locator("input").check();

  await submitAndCapture(page, `/api/hr-admin/employees/${employeeId}/bank-accounts`, "POST", async () => {
    await form.getByRole("button", { name: "Create account" }).click();
  });
  await expect(page.getByRole("status").filter({ hasText: "Employee bank account saved." })).toBeVisible();
  await expect(page.getByText("primary", { exact: true }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function loginAsCreatedEmployee(page: Page, loginName: string) {
  const password = employeePassword;
  test.skip(!password, "Set PLAYWRIGHT_PHASE3_EMPLOYEE_PASSWORD after the email password flow to verify ESS login.");
  if (!password) return;
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  await gotoAuthenticated(page, "/ess", { username: loginName, password });
  await expectPageReady(page, /My workspace|Self service|Employee/i);
  await expectNoHorizontalOverflow(page);
}

async function expectEmployeeWorkspaceJourney(page: Page, loginName: string) {
  const password = employeePassword;
  test.skip(!password, "Set PLAYWRIGHT_PHASE3_EMPLOYEE_PASSWORD after the email password flow to verify ESS login.");
  if (!password) return;

  const persona = { username: loginName, password };
  const essRoutes = [
    { path: "/ess", heading: /My workspace|Self service|Employee/i, content: [/Leave|Attendance|Documents|Payslip/i] },
    { path: "/ess/documents", heading: /Documents/i, content: [/Document|Verification|Upload/i] },
    { path: "/ess/payslips", heading: /Payslip/i, content: [/Payslip|Access|Published|No payslips/i] },
    { path: "/ess/statutory-declarations", heading: /Statutory/i, content: [/Declaration|Proof|Tax/i] },
    { path: "/ess/notifications", heading: /Notifications/i, content: [/Notifications|Inbox|No notifications/i] },
  ];

  for (const route of essRoutes) {
    await test.step(`Employee can use ${route.path}`, async () => {
      await gotoAuthenticated(page, route.path, persona);
      await expectPageReady(page, route.heading);
      for (const pattern of route.content) {
        await expect(page.getByText(pattern).first()).toBeVisible();
      }
      await expectNoAppError(page);
      await expectNoHorizontalOverflow(page);
    });
  }

  for (const blockedPath of ["/hr-admin", "/tenant-admin", "/platform-admin", "/finance-manager"]) {
    await test.step(`Employee is not allowed into ${blockedPath}`, async () => {
      await gotoAuthenticated(page, "/ess", persona);
      await page.goto(blockedPath, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      await expect(page).toHaveURL(/\/ess|\/workspace-access|\/login/);
      await expectNoAppError(page);
      await expectNoHorizontalOverflow(page);
    });
  }
}

test.describe.serial("User journey phase 3: HR Admin operational workflow", () => {
  test("creates employee, edits profile, provisions ESS access, adds bank, and requests setup email", async ({ page }) => {
    test.setTimeout(8 * 60 * 1000);
    await page.setViewportSize({ width: 1440, height: 960 });

    await test.step("Open employee create form and confirm form usability", async () => {
      await gotoAuthenticated(page, "/hr-admin/employees/new", hrAdmin);
      await expectEmployeeFormUsable(page, "create");
      await page.getByRole("button", { name: "Create employee" }).click();
      await expect
        .poll(() => field(page, "Employee code").evaluate((element) => (element as HTMLInputElement).validity.valueMissing))
        .toBe(true);
    });

    let employeeId = "";
    let employeeCode = "";
    await test.step("Create employee master through browser", async () => {
      employeeCode = await fillNewEmployee(page);
      const result = await submitAndCapture<{ id: string; employee_code: string }>(page, "/api/hr-admin/employees", "POST", async () => {
        await page.getByRole("button", { name: "Create employee" }).click();
      });
      employeeId = result.id;
      expect(employeeId).toBeTruthy();
      await expect(page).toHaveURL(new RegExp(`/hr-admin/employees\\?employeeId=${employeeId}`));
      await expect(page.getByText(employeeCode).first()).toBeVisible();
      await expectNoAppError(page);
      await expectNoHorizontalOverflow(page);
    });

    await test.step("Edit employee profile and verify directory detail", async () => {
      await gotoAuthenticated(page, `/hr-admin/employees/${employeeId}/edit`, hrAdmin);
      await expectEmployeeFormUsable(page, "edit");
      await field(page, "Preferred name").fill("Aadish Stage Certified");
      await field(page, "Phone number").fill("+91 98765 43003");
      await submitAndCapture(page, `/api/hr-admin/employees/${employeeId}`, "PATCH", async () => {
        await page.getByRole("button", { name: "Save changes" }).click();
      });
      await expect(page).toHaveURL(new RegExp(`/hr-admin/employees\\?employeeId=${employeeId}`));
      await expect(page.getByText("Aadish Stage Certified").first()).toBeVisible();
      await expect(page.getByText(employeeEmail).first()).toBeVisible();
      await expect(page.getByRole("heading", { name: /Employees/i }).first()).toBeVisible();
      await expect(page.getByText(/Employee directory|Employee master detail/i).first()).toBeVisible();
      await expect(page.getByText(employeeCode).first()).toBeVisible();
      await expectNoAppError(page);
      await expectNoHorizontalOverflow(page);
    });

    let loginName = "";
    await test.step("Provision ESS access with employee role", async () => {
      loginName = await provisionEmployeeAccess(page, employeeId);
    });

    await test.step("Add payroll-ready primary bank account", async () => {
      await addPrimaryBankAccount(page, employeeId);
    });

    await test.step("Request employee password setup email through browser", async () => {
      await requestPasswordSetupEmail(page, employeeEmail);
      test.info().annotations.push({
        type: "manual follow-up",
        description: `Set password from the setup email for ${employeeEmail}, then run certify:users:phase3:login with PLAYWRIGHT_PHASE3_EMPLOYEE_PASSWORD to certify ESS login.`,
      });
      test.info().annotations.push({
        type: "created employee",
        description: `Employee code ${employeeCode}; username ${loginName}; email ${employeeEmail}.`,
      });
      expect(loginName, "Access provisioning should create a login username for the employee").toBeTruthy();
    });
  });

  test("verifies employee ESS login after email password setup", async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);
    await page.setViewportSize({ width: 1440, height: 960 });
    await loginAsCreatedEmployee(page, employeeLoginIdentifier);
  });

  test("certifies employee ESS child pages and denies admin workspaces after password setup", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    await page.setViewportSize({ width: 1440, height: 960 });
    await expectEmployeeWorkspaceJourney(page, employeeLoginIdentifier);
  });
});
