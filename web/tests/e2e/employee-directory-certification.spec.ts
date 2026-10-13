import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin, tenantAdmin } from "../helpers/staging-auth";

function directoryPanel(page: Page) {
  return page.locator(".queue-toolbar").filter({ has: page.getByRole("heading", { name: "Employee directory" }) }).first();
}

function detailPanel(page: Page) {
  return page.locator(".record-card").filter({ has: page.getByRole("heading", { name: "Employee master detail" }) }).first();
}

function directoryItems(page: Page) {
  return page.locator(".employee-directory-table tbody tr");
}

function directoryIdentityLink(row: Locator) {
  return row.getByRole("link").first();
}

async function openDirectoryRow(page: Page, row: Locator) {
  const href = await directoryIdentityLink(row).getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href ?? "/hr-admin/employees", { waitUntil: "domcontentloaded" });
}

function pagination(page: Page) {
  return directoryPanel(page).locator(".pagination-bar");
}

async function openEmployeeImportTools(page: Page) {
  const disclosure = page.locator("details.employee-imports-disclosure").first();
  await expect(disclosure).toBeVisible();
  const isOpen = await disclosure.evaluate((element) => (element as HTMLDetailsElement).open);
  if (!isOpen) {
    await disclosure.locator("summary").click();
  }
  await expect(disclosure).toHaveAttribute("open", "");
}

function fieldByLabel(scope: Page | Locator, label: string) {
  const accessibleControl = scope.getByLabel(label, { exact: true });
  const legacyControl = scope
    .locator("label.form-field")
    .filter({ hasText: new RegExp(`^${label}`) })
    .locator("input, select, textarea")
    .first();
  return accessibleControl.or(legacyControl).first();
}

function uniqueSuffix() {
  return Date.now().toString(36).slice(-6);
}

async function expectFieldByLabel(scope: Page | Locator, label: string) {
  const control = fieldByLabel(scope, label);
  await expect(control, `${label} should be visible`).toBeVisible();
  return control;
}

async function selectFirstNonEmptyOption(locator: Locator) {
  const value = await locator.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).find((option) => option.value)?.value ?? "";
  });
  if (value) {
    await locator.selectOption(value);
  }
}

async function selectOptionContaining(locator: Locator, text: string) {
  const value = await locator.evaluate((element, expectedText) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).find((option) => option.textContent?.includes(expectedText))?.value ?? "";
  }, text);
  expect(value).toBeTruthy();
  await locator.selectOption(value);
}

async function continueEmployeeForm(page: Page) {
  await page.locator(".form-actions-bar").getByRole("button", { name: "Continue" }).click();
}

async function fillEmployeeIdentity(page: Page, input: { code: string; firstName: string; lastName: string; preferredName: string }) {
  await fieldByLabel(page, "Employee code").fill(input.code);
  await fieldByLabel(page, "Employment status").selectOption("active");
  await fieldByLabel(page, "First name").fill(input.firstName);
  await fieldByLabel(page, "Last name").fill(input.lastName);
  await fieldByLabel(page, "Preferred name").fill(input.preferredName);
  await continueEmployeeForm(page);
  await expect(page.getByRole("heading", { name: "Contact and dates" })).toBeVisible();
}

async function fillEmployeeContact(page: Page, input: { workEmail: string; personalEmail: string; phoneNumber: string }) {
  await fieldByLabel(page, "Work email").fill(input.workEmail);
  await fieldByLabel(page, "Personal email").fill(input.personalEmail);
  await fieldByLabel(page, "Phone number").fill(input.phoneNumber);
  await fieldByLabel(page, "Date of birth").fill("1994-01-01");
  await fieldByLabel(page, "Date of joining").fill("2026-04-01");
  await fieldByLabel(page, "Probation end date").fill("2026-09-30");
  await continueEmployeeForm(page);
  await expect(page.getByRole("heading", { name: "Structural mapping" })).toBeVisible();
}

async function fillEmployeeStructure(page: Page, managerCode?: string) {
  await selectFirstNonEmptyOption(fieldByLabel(page, "Legal entity"));
  await selectFirstNonEmptyOption(fieldByLabel(page, "Branch"));
  await selectFirstNonEmptyOption(fieldByLabel(page, "Location"));
  await selectFirstNonEmptyOption(fieldByLabel(page, "Business unit"));
  await selectFirstNonEmptyOption(fieldByLabel(page, "Department"));
  await selectFirstNonEmptyOption(fieldByLabel(page, "Cost center"));
  await selectFirstNonEmptyOption(fieldByLabel(page, "Designation"));
  await selectFirstNonEmptyOption(fieldByLabel(page, "Grade"));
  await selectFirstNonEmptyOption(fieldByLabel(page, "Employment type"));
  if (managerCode) {
    await selectOptionContaining(fieldByLabel(page, "Reporting manager"), managerCode);
  } else {
    await selectFirstNonEmptyOption(fieldByLabel(page, "Reporting manager"));
  }
  await continueEmployeeForm(page);
  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
}

async function createEmployeeFromBrowser(page: Page, suffix: string) {
  const code = `BANK-IMP-${suffix}`;
  await gotoAuthenticated(page, "/hr-admin/employees/new");
  await expectPageReady(page, "Create employee");

  await fillEmployeeIdentity(page, { code, firstName: "Bank", lastName: "Import", preferredName: "Bank Import" });
  await fillEmployeeContact(page, {
    workEmail: `bank.import.${suffix}@example.test`,
    personalEmail: `bank.import.personal.${suffix}@example.test`,
    phoneNumber: "+91 90000 01001",
  });
  await fillEmployeeStructure(page);

  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes("/api/hr-admin/employees") && item.request().method() === "POST"),
    page.getByRole("button", { name: "Create employee" }).click(),
  ]);
  expect(response.ok()).toBeTruthy();
  const created = (await response.json()) as { id: string; employee_code: string; full_name: string };
  await gotoAuthenticated(page, `/hr-admin/employees?employeeId=${created.id}`, hrAdmin);
  await expect(page).toHaveURL(new RegExp(`/hr-admin/employees\\?employeeId=${created.id}`));
  return created;
}

async function createNamedEmployeeFromBrowser(page: Page, input: { code: string; firstName: string; lastName: string; emailSlug: string; managerCode?: string }) {
  await gotoAuthenticated(page, "/hr-admin/employees/new");
  await expectPageReady(page, "Create employee");

  await fillEmployeeIdentity(page, {
    code: input.code,
    firstName: input.firstName,
    lastName: input.lastName,
    preferredName: `${input.firstName} ${input.lastName}`,
  });
  await fillEmployeeContact(page, {
    workEmail: `${input.emailSlug}@example.test`,
    personalEmail: `${input.emailSlug}.personal@example.test`,
    phoneNumber: "+91 90000 01002",
  });
  await fillEmployeeStructure(page, input.managerCode);

  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes("/api/hr-admin/employees") && item.request().method() === "POST"),
    page.getByRole("button", { name: "Create employee" }).click(),
  ]);
  expect(response.ok()).toBeTruthy();
  const created = (await response.json()) as { id: string; employee_code: string; full_name: string };
  await gotoAuthenticated(page, `/hr-admin/employees?employeeId=${created.id}`, hrAdmin);
  await expect(page).toHaveURL(new RegExp(`/hr-admin/employees\\?employeeId=${created.id}`));
  return created;
}

async function expectDirectoryPageCertified(page: Page) {
  await expectPageReady(page, "Employees");
  await expect(page.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/hr-admin");
  const newEmployeeLinks = page.getByRole("link", { name: "New employee" });
  const newEmployeeLinkCount = await newEmployeeLinks.count();
  expect(newEmployeeLinkCount).toBeGreaterThanOrEqual(1);
  for (let index = 0; index < newEmployeeLinkCount; index += 1) {
    await expect(newEmployeeLinks.nth(index)).toHaveAttribute("href", /\/hr-admin\/employees(?:\/new|.*[?&]create=1)/);
  }

  const summary = page.getByLabel("Employee directory summary");
  await expect(summary).toBeVisible();
  for (const metric of ["employees", "access provisioned", "need review"]) {
    await expect(summary.getByText(metric, { exact: true })).toBeVisible();
  }

  const panel = directoryPanel(page);
  await expect(panel).toBeVisible();
  await expectFieldByLabel(panel, "Search");
  await expectFieldByLabel(panel, "Department");
  await expectFieldByLabel(panel, "Status");
  await expect(panel.getByText("More filters")).toBeVisible();
  await expect(panel.locator("form").first().getByRole("button", { name: "Apply" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "Reset" })).toHaveAttribute("href", "/hr-admin/employees");

  for (const status of ["all", "active", "on notice", "inactive", "exited"]) {
    await expect(
      panel.getByRole("link", { name: new RegExp(`^${status}\\b`, "i") }),
    ).toBeVisible();
  }

  await expect(pagination(page)).toBeVisible();
  await expect(pagination(page).getByText(/records/)).toBeVisible();
  await expect(pagination(page).getByText("Rows")).toBeVisible();

  await expectNoHorizontalOverflow(page);
}

test.describe("Certification: HR admin employee directory", () => {
  test("limited employee viewer role sees read-only HR Admin and receives backend denials", async ({ page }) => {
    test.skip(!process.env.HRMS_API_BASE_URL, "Limited HR role proof requires a live HRMS API.");

    await gotoAuthenticated(page, "/tenant-admin/roles", tenantAdmin);
    await expectPageReady(page, "Roles & Permissions");

    const suffix = Date.now();
    const roleResponse = await page.request.post("/api/tenant-admin/roles", {
      data: {
        name: `QA Employee Viewer ${suffix}`,
        code: `qa-employee-viewer-${suffix}`,
        description: "Browser certification role with read-only employee access.",
        is_active: true,
        permission_keys: ["employees.view"],
      },
    });
    expect(roleResponse.ok()).toBeTruthy();
    const rolePayload = await roleResponse.json();
    const roleId = rolePayload.role.id as string;

    const username = `qa.hr.viewer.${suffix}`;
    const employeeResponse = await page.request.post("/api/hr-admin/employees", {
      data: {
        employee_code: `EMPVIEW-${suffix}`,
        first_name: "QA",
        last_name: "HR Viewer",
        work_email: `${username}@example.com`,
        employment_status: "active",
      },
    });
    const employeePayload = await employeeResponse.json();
    expect(employeeResponse.ok(), `Employee fixture create failed: ${employeeResponse.status()} ${JSON.stringify(employeePayload)}`).toBeTruthy();
    const employeeId = employeePayload.id as string;
    expect(employeeId).toBeTruthy();

    const accessResponse = await page.request.post(`/api/hr-admin/employees/${employeeId}/access`, {
      data: {
        username,
        email: `${username}@example.com`,
        first_name: "QA",
        last_name: "HR Viewer",
        display_name: "QA HR Viewer",
        phone_number: "",
        is_user_active: true,
        must_change_password: false,
        membership_status: "active",
        is_default_membership: true,
        role_ids: [roleId],
      },
    });
    const accessPayload = await accessResponse.json();
    expect(accessResponse.ok(), `Employee access fixture create failed: ${accessResponse.status()} ${JSON.stringify(accessPayload)}`).toBeTruthy();
    const generatedPassword = accessPayload.generated_password as string;
    expect(generatedPassword).toBeTruthy();

    await page.request.post("/api/auth/logout").catch(() => null);
    await page.context().clearCookies();
    await gotoAuthenticated(page, "/hr-admin/employees?page_size=5", { username, password: generatedPassword });
    await expectPageReady(page, "Employees");

    const navigation = page.getByRole("navigation");
    await expect(navigation.locator('a[href="/hr-admin/employees"]')).toBeVisible();
    await expect(navigation.locator('a[href*="/hr-admin/payroll"]')).toHaveCount(0);
    await expect(navigation.locator('a[href="/hr-admin/organization"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: "New employee" })).toHaveCount(0);
    await expect(page.getByTestId("employee-import-workbench")).toHaveCount(0);
    await expect(page.getByTestId("employee-bank-import-workbench")).toHaveCount(0);
    await expect(page.getByTestId("employee-manager-import-workbench")).toHaveCount(0);

    const listResponse = await page.request.get("/api/hr-admin/employees");
    expect(listResponse.ok()).toBeTruthy();
    const employees = (await listResponse.json()) as Array<{ id: string }>;
    expect(employees.length).toBeGreaterThan(0);

    await openDirectoryRow(page, directoryItems(page).first());
    await expect(page).toHaveURL(/employeeId=/);
    await expect(detailPanel(page).locator("details.action-menu")).toHaveCount(0);

    const blockedCreateResponse = await page.request.post("/api/hr-admin/employees", {
      data: {
        employee_code: `BLOCKED-BROWSER-${suffix}`,
        first_name: "Blocked",
        last_name: "Create",
        work_email: `blocked.browser.${suffix}@example.com`,
        employment_status: "active",
      },
    });
    expect(blockedCreateResponse.status()).toBe(403);
    expect(JSON.stringify(await blockedCreateResponse.json())).toContain("employees.create");

    const blockedEditResponse = await page.request.patch(`/api/hr-admin/employees/${employees[0].id}`, {
      data: { preferred_name: "Blocked Edit" },
    });
    expect(blockedEditResponse.status()).toBe(403);
    expect(JSON.stringify(await blockedEditResponse.json())).toContain("employees.edit");

    const blockedAccessResponse = await page.request.get(`/api/hr-admin/employees/${employees[0].id}/access`);
    expect(blockedAccessResponse.status()).toBe(403);
    expect(JSON.stringify(await blockedAccessResponse.json())).toContain("employees.access.manage");
    await expectNoHorizontalOverflow(page);
  });

  test("reporting manager import validates commits and updates manager coverage", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const suffix = uniqueSuffix();
    const manager = await createNamedEmployeeFromBrowser(page, {
      code: `MGR-IMP-${suffix}`,
      firstName: "Manager",
      lastName: `Import ${suffix}`,
      emailSlug: `manager.import.${suffix}`,
    });
    const employee = await createNamedEmployeeFromBrowser(page, {
      code: `REP-IMP-${suffix}`,
      firstName: "Report",
      lastName: `Import ${suffix}`,
      emailSlug: `report.import.${suffix}`,
    });
    const duplicateReason = `Duplicate manager row ${suffix}`;
    const csv = [
      "employee_code,reporting_manager_code,effective_date,reason",
      `${employee.employee_code},${manager.employee_code},2026-04-01,Manager mapping import ${suffix}`,
      `${employee.employee_code},${manager.employee_code},2026-04-02,${duplicateReason}`,
      `UNKNOWN-${suffix},${manager.employee_code},2026-04-01,Unknown employee`,
      `${manager.employee_code},${manager.employee_code},2026-04-01,Self manager`,
      `${employee.employee_code},UNKNOWN-MANAGER-${suffix},2026-04-01,Unknown manager`,
    ].join("\n");

    await gotoAuthenticated(page, `/hr-admin/employees?q=${employee.employee_code}&status=all&page_size=5`);
    await expectDirectoryPageCertified(page);
    await openEmployeeImportTools(page);

    const workbench = page.getByTestId("employee-manager-import-workbench");
    await expect(workbench).toBeVisible();
    await expect(workbench.getByRole("heading", { name: "Reporting manager import" })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Load sample template" })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Copy template" })).toBeVisible();
    await expect(workbench.getByRole("link", { name: "Download template" })).toHaveAttribute("download", "employee-manager-import-template.csv");
    await expect(workbench.getByText("Upload CSV", { exact: true })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Preview manager import" })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Commit ready manager rows" })).toBeDisabled();

    await workbench.locator("input[type='file']").setInputFiles({
      name: "employee-manager-import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
    await expect(workbench.getByLabel("Manager CSV data")).toContainText(employee.employee_code);
    await workbench.getByRole("button", { name: "Preview manager import" }).click();
    await expect(workbench.getByText("Preview ready. Commit ready manager mappings after checking blocked rows.")).toBeVisible();
    await expect(workbench.locator("tbody tr")).toHaveCount(5);
    await expect(workbench.locator("tr").filter({ hasText: employee.employee_code }).first().locator(".readiness-badge", { hasText: "ready" })).toBeVisible();
    await expect(workbench.locator("tr").filter({ hasText: duplicateReason }).locator(".readiness-badge", { hasText: "blocked" })).toBeVisible();
    await expect(workbench.getByText("Only one manager mapping per employee can be committed in one import batch.").first()).toBeVisible();
    await expect(workbench.getByText("Employee code must match an existing employee.").first()).toBeVisible();
    await expect(workbench.getByText("Employee cannot report to self.").first()).toBeVisible();
    await expect(workbench.getByText("Reporting manager must match an active manager option.").first()).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Commit ready manager rows" })).toBeEnabled();

    await workbench.getByRole("button", { name: "Commit ready manager rows" }).click();
    await expect(workbench.getByText("Commit complete. Refresh the directory or workforce report to verify manager coverage.")).toBeVisible({ timeout: 30_000 });
    await expect(workbench.locator("tr").filter({ hasText: employee.employee_code }).first().locator(".readiness-badge", { hasText: "created" })).toBeVisible();
    await expect(workbench.locator("tr").filter({ hasText: duplicateReason }).locator(".readiness-badge", { hasText: "blocked" })).toBeVisible();

    await gotoAuthenticated(page, `/hr-admin/employees?q=${employee.employee_code}&status=all&page_size=5`);
    await expect(directoryItems(page).filter({ hasText: employee.employee_code }).getByText(manager.full_name)).toBeVisible();
    await openDirectoryRow(page, directoryItems(page).filter({ hasText: employee.employee_code }).first());
    await expect(detailPanel(page).locator(".detail-row").filter({ hasText: "Reporting Manager" }).getByText(manager.full_name)).toHaveText(manager.full_name);

    await gotoAuthenticated(page, `/hr-admin/import-history`);
    await expectPageReady(page, "Import history");
    const history = page.getByTestId("import-history-workspace");
    await expect(history).toBeVisible();
    await expect(history.getByText("Import batches")).toBeVisible();
    await expect(history.locator(".import-history-metrics").getByText("Committed")).toBeVisible();
    await expect(history.locator(".import-history-metrics").getByText("Completed batches")).toBeVisible();
    await expect(history.getByText("Blocked rows")).toBeVisible();
    await expect(history.getByText("Rollback ready")).toBeVisible();
    await expect(history.getByLabel("Import type")).toBeVisible();
    await expect(history.getByLabel("Import status")).toBeVisible();
    await history.getByLabel("Search imports").fill("reporting_manager_mappings");
    await expect(history.locator(".import-history-card").filter({ hasText: "Reporting Manager Mappings" }).first()).toBeVisible();
    await history.getByLabel("Import type").selectOption("reporting_manager_mappings");
    await history.getByLabel("Import status").selectOption("committed");
    const importHistoryCard = history.locator(".import-history-card").filter({ hasText: "Reporting Manager Mappings" }).first();
    await expect(importHistoryCard.locator(".record-chip", { hasText: "Committed" })).toBeVisible();
    await expect(importHistoryCard).toContainText("5 total");
    await expect(importHistoryCard).toContainText("1 created");
    await expect(importHistoryCard).toContainText("4 blocked");
    await expect(importHistoryCard).toContainText(/[a-f0-9]{20}/);
    await expect(importHistoryCard.getByRole("link", { name: "Open employees" })).toHaveAttribute("href", "/hr-admin/employees");
    await expect(history.getByLabel("Import history pagination")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("employee bank import workbench validates commits and updates payout readiness coverage", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const suffix = uniqueSuffix();
    const employee = await createEmployeeFromBrowser(page, suffix);
    const duplicatePrimaryBank = `Duplicate Primary Bank ${suffix}`;
    const csv = [
      "employee_code,account_holder_name,bank_name,account_number,ifsc_code,branch_name,is_primary",
      `${employee.employee_code},Bank Import,Primary Bank ${suffix},910000${suffix},HDFC0001234,Main Payroll Branch,true`,
      `${employee.employee_code},Bank Import,${duplicatePrimaryBank},920000${suffix},ICIC0001234,Duplicate Payroll Branch,true`,
      `UNKNOWN-${suffix},Unknown Employee,Unknown Bank,930000${suffix},HDFC0001234,Unknown Branch,true`,
      `${employee.employee_code},Bank Import,Bad IFSC Bank ${suffix},940000${suffix},BADIFSC,Bad Branch,false`,
    ].join("\n");

    await gotoAuthenticated(page, `/hr-admin/employees?q=${employee.employee_code}&status=all&page_size=5`);
    await expectDirectoryPageCertified(page);
    await openEmployeeImportTools(page);

    const workbench = page.getByTestId("employee-bank-import-workbench");
    await expect(workbench).toBeVisible();
    await expect(workbench.getByRole("heading", { name: "Employee bank import" })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Load sample template" })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Copy template" })).toBeVisible();
    await expect(workbench.getByRole("link", { name: "Download template" })).toHaveAttribute("download", "employee-bank-import-template.csv");
    await expect(workbench.getByText("Upload CSV", { exact: true })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Preview bank import" })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Commit ready bank rows" })).toBeDisabled();

    await workbench.locator("input[type='file']").setInputFiles({
      name: "employee-bank-import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
    await expect(workbench.getByLabel("Bank CSV data")).toContainText(employee.employee_code);
    await workbench.getByRole("button", { name: "Preview bank import" }).click();
    await expect(workbench.getByText("Preview ready. Commit ready bank accounts after checking blocked rows.")).toBeVisible();
    await expect(workbench.locator("tbody tr")).toHaveCount(4);
    await expect(workbench.locator("tr").filter({ hasText: `Primary Bank ${suffix}` }).locator(".readiness-badge", { hasText: "ready" })).toBeVisible();
    await expect(workbench.locator("tr").filter({ hasText: duplicatePrimaryBank }).locator(".readiness-badge", { hasText: "blocked" })).toBeVisible();
    await expect(workbench.getByText("Only one primary account per employee can be committed in one import batch.")).toBeVisible();
    await expect(workbench.getByText("Employee code must match an existing employee.")).toBeVisible();
    await expect(workbench.getByText("IFSC code must use the 11-character bank format.")).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Commit ready bank rows" })).toBeEnabled();

    await workbench.getByRole("button", { name: "Commit ready bank rows" }).click();
    await expect(workbench.getByText("Commit complete. Open the employee bank account page or payroll readiness to verify coverage.")).toBeVisible({ timeout: 30_000 });
    await expect(workbench.locator("tr").filter({ hasText: `Primary Bank ${suffix}` }).locator(".readiness-badge", { hasText: "created" })).toBeVisible();
    await expect(workbench.locator("tr").filter({ hasText: duplicatePrimaryBank }).locator(".readiness-badge", { hasText: "blocked" })).toBeVisible();

    await gotoAuthenticated(page, `/hr-admin/employees/${employee.id}/bank-accounts`);
    await expectPageReady(page, /Bank accounts for Bank Import/);
    await expect(page.locator("[aria-label='Employee bank account records']").getByText(`Primary Bank ${suffix}`)).toBeVisible();
    await expect(page.locator("[aria-label='Employee bank account records']").getByText("primary", { exact: true })).toBeVisible();

    const accountsResponse = await page.request.get(`/api/hr-admin/employees/${employee.id}/bank-accounts`);
    expect(accountsResponse.ok()).toBeTruthy();
    const accounts = (await accountsResponse.json()) as Array<{ bank_name: string; is_primary: boolean }>;
    expect(accounts.some((account) => account.bank_name === `Primary Bank ${suffix}` && account.is_primary)).toBeTruthy();
    expect(accounts.some((account) => account.bank_name === duplicatePrimaryBank)).toBeFalsy();
    await expectNoHorizontalOverflow(page);
  });

  test("employee bulk import workbench uploads validates commits and verifies directory rows", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const suffix = uniqueSuffix();
    const employeeCode = `BULK-${suffix}`;
    const duplicateCode = `BULK-DUP-${suffix}`;
    const csv = [
      "employee_code,first_name,middle_name,last_name,preferred_name,work_email,personal_email,phone_number,employment_status,date_of_birth,date_of_joining,probation_end_date,confirmation_date,legal_entity,branch,location,business_unit,department,cost_center,designation,grade,employment_type,reporting_manager_code",
      `${employeeCode},Aditi,,Bulk,Aditi,aditi.bulk.${suffix}@example.test,,+91 90000 00001,active,1995-04-10,2026-04-01,2026-09-30,,,,,,,,,,,`,
      `${duplicateCode},Duplicate,,One,,duplicate.one.${suffix}@example.test,,+91 90000 00002,active,,2026-04-01,,,,,,,,,,,`,
      `${duplicateCode},Duplicate,,Two,,duplicate.two.${suffix}@example.test,,+91 90000 00003,active,,2026-04-01,,,,,,,,,,,`,
      `MISSING-${suffix},,,,missing.${suffix}@example.test,,,+91 90000 00004,active,,2026-04-01,,,,,,,,,,,`,
    ].join("\n");

    await gotoAuthenticated(page, "/hr-admin/employees?page_size=5");
    await expectDirectoryPageCertified(page);
    await openEmployeeImportTools(page);

    const workbench = page.getByTestId("employee-import-workbench");
    await expect(workbench).toBeVisible();
    await expect(workbench.getByRole("heading", { name: "Employee bulk import" })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Load sample template" })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Copy template" })).toBeVisible();
    await expect(workbench.getByRole("link", { name: "Download template" })).toBeVisible();
    await expect(workbench.getByText("Upload CSV", { exact: true })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Preview import" })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Commit ready rows" })).toBeDisabled();

    await workbench.locator("input[type='file']").setInputFiles({
      name: "employee-import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
    await workbench.getByLabel("CSV data").fill(csv);
    await expect(workbench.getByLabel("CSV data")).toContainText(employeeCode);
    await workbench.getByRole("button", { name: "Preview import" }).click();
    await expect(workbench.getByText("Preview ready. Review blocked rows before committing.")).toBeVisible();
    await expect(workbench.locator("tbody tr")).toHaveCount(4);
    await expect(workbench.locator("tr").filter({ hasText: employeeCode }).locator(".readiness-badge", { hasText: "ready" })).toBeVisible();
    await expect(workbench.locator("tr").filter({ hasText: duplicateCode }).last().locator(".readiness-badge", { hasText: "blocked" })).toBeVisible();
    await expect(workbench.locator("tr").filter({ hasText: `MISSING-${suffix}` }).locator(".readiness-badge", { hasText: "blocked" })).toBeVisible();
    await expect(workbench.getByText("Employee code already exists in this tenant or import batch.")).toBeVisible();
    await expect(workbench.getByText("First name is required.")).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Commit ready rows" })).toBeEnabled();

    await workbench.getByRole("button", { name: "Commit ready rows" }).click();
    await expect(workbench.getByText("Commit complete. Refresh the directory to verify created employees.")).toBeVisible({ timeout: 30_000 });
    await expect(workbench.locator("tr").filter({ hasText: employeeCode }).locator(".readiness-badge", { hasText: "created" })).toBeVisible();
    await expect(workbench.locator("tr").filter({ hasText: duplicateCode }).first().locator(".readiness-badge", { hasText: "created" })).toBeVisible();
    await expect(workbench.locator("tr").filter({ hasText: duplicateCode }).last().locator(".readiness-badge", { hasText: "blocked" })).toBeVisible();

    await gotoAuthenticated(page, `/hr-admin/employees?q=${employeeCode}&status=all&page_size=5`);
    await expect(directoryItems(page).filter({ hasText: employeeCode })).toBeVisible();
    await gotoAuthenticated(page, `/hr-admin/employees?q=${duplicateCode}&status=all&page_size=5`);
    await expect(directoryItems(page).filter({ hasText: duplicateCode })).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
  });

  test("directory controls, pagination, selection, detail, actions, and empty state are certified", async ({ page }) => {
    test.setTimeout(300_000);

    await gotoAuthenticated(page, "/hr-admin/employees?page_size=5");
    await expectDirectoryPageCertified(page);
    await expect(directoryItems(page)).toHaveCount(5);

    const firstEmployeeText = (await directoryItems(page).first().innerText()).trim();
    expect(firstEmployeeText).toMatch(/Provisioned|Not provisioned/);
    expect(firstEmployeeText).toMatch(/direct reports/);

    const next = pagination(page).getByRole("link", { name: "Next" });
    const canNavigateNext = (await next.isVisible().catch(() => false)) && (await next.getAttribute("aria-disabled")) !== "true";
    if (canNavigateNext) {
      const nextHref = await next.getAttribute("href");
      expect(nextHref).toContain("page=2");
      await page.goto(nextHref ?? "/hr-admin/employees?page_size=5&page=2", { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/page=2/);
      await expect(directoryItems(page).first()).toBeVisible();
      await expect(directoryItems(page).count()).resolves.toBeLessThanOrEqual(5);
    }

    await openDirectoryRow(page, directoryItems(page).first());
    await expect(page).toHaveURL(/employeeId=/);
    await expect(detailPanel(page).getByText(/Access Provisioned|Access ready|Not provisioned/i).first()).toBeAttached();

    const actionsSummary = detailPanel(page).locator("details.action-menu summary").first();
    await expect(actionsSummary).toBeVisible();
    await actionsSummary.click();
    await expect(detailPanel(page).getByRole("link", { name: "Edit employee" })).toHaveAttribute("href", /\/hr-admin\/employees\?.*employeeId=.+&action=edit/);
    await expect(detailPanel(page).getByRole("link", { name: "Manage access" })).toHaveAttribute("href", /\/hr-admin\/employees\?.*employeeId=.+&action=access/);
    await expect(detailPanel(page).getByRole("link", { name: "Manage bank accounts" })).toHaveAttribute("href", /\/hr-admin\/employees\?.*employeeId=.+&action=bank/);

    await gotoAuthenticated(page, "/hr-admin/employees?page_size=5");
    await fieldByLabel(directoryPanel(page), "Search").fill("NO_MATCH_EMPLOYEE_CERTIFICATION_VALUE");
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("q") === "NO_MATCH_EMPLOYEE_CERTIFICATION_VALUE"),
      directoryPanel(page).locator("form").first().getByRole("button", { name: "Apply" }).click(),
    ]);
    await expect(page.getByText("No employees in this view.")).toBeVisible();
    await expect(pagination(page).getByText("0-0")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await Promise.all([
      page.waitForURL((url) => url.pathname === "/hr-admin/employees" && !url.search, { waitUntil: "commit", timeout: 60_000 }),
      directoryPanel(page).getByRole("link", { name: "Reset" }).click(),
    ]);
    await expect(page).toHaveURL(/\/hr-admin\/employees$/);
    await expectDirectoryPageCertified(page);
  });
});
