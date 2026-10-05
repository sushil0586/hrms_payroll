import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow } from "../helpers/assertions";
import { platformAdmin, type Persona } from "../helpers/staging-auth";

const liveApiRequired = Boolean(process.env.HRMS_API_BASE_URL);

const platformTenantCreatePersona: Persona = {
  username: process.env.PLATFORM_E2E_USERNAME ?? process.env.PLAYWRIGHT_LIVE_PLATFORM_ADMIN_USERNAME ?? platformAdmin.username,
  password: process.env.PLATFORM_E2E_PASSWORD ?? process.env.PLAYWRIGHT_LIVE_PLATFORM_ADMIN_PASSWORD ?? platformAdmin.password,
};

type TenantCreateResponse = {
  id?: string;
  code?: string;
  name?: string;
};

type LaunchRun = {
  run_type: string;
  status: string;
  result_payload?: {
    applied_modules?: string[];
  };
  seeded_items: Array<{
    module_ref?: string;
    status: string;
    payload?: {
      result?: {
        created?: string[];
        existing?: string[];
        skipped?: string[];
      };
    };
  }>;
};

function uniqueRunRef() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14).toLowerCase();
}

function card(page: Page, heading: string): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

function namedControl(root: Locator, name: string): Locator {
  return root.locator(`[name="${name}"]`);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function employeeFormControl(page: Page, label: string): Locator {
  return page
    .locator("label.form-field")
    .filter({ has: page.locator("span.muted", { hasText: new RegExp(`^${escapeRegExp(label)}$`) }) })
    .first()
    .locator("input, select, textarea")
    .first();
}

async function loginThroughBrowser(page: Page, persona: Persona) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);

  await expect(page.getByLabel("Username or email")).toBeVisible();
  await page.getByLabel("Username or email").fill(persona.username);
  await page.getByLabel("Password").fill(persona.password);

  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/auth/login") && response.request().method() === "POST",
    { timeout: 20_000 },
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  const loginResponse = await loginResponsePromise;
  const loginPayload = await loginResponse.json().catch(() => ({}));
  expect(
    loginResponse.ok(),
    `Browser login failed for ${persona.username} with status ${loginResponse.status()}: ${JSON.stringify(loginPayload)}`,
  ).toBeTruthy();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

async function expectHrSeededPage(page: Page, path: string, heading: string | RegExp, expectedTexts: Array<string | RegExp>) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  for (const text of expectedTexts) {
    await expect(page.locator("main").getByText(text).first(), `${path} should show ${String(text)}`).toBeVisible();
  }
}

async function openCreateTenantDialog(page: Page) {
  await card(page, "Create tenant").getByRole("button", { name: "Create tenant" }).click();
  const dialog = page.getByRole("dialog", { name: "Create platform tenant" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("Platform Admin tenant creation browser certification", () => {
  test.skip(!liveApiRequired, "Tenant creation browser certification requires HRMS_API_BASE_URL because it creates live tenant records.");
  test.setTimeout(180_000);

  test("creates a tenant and applies the Indian launch blueprint from the browser", async ({ page }) => {
    const runRef = uniqueRunRef();
    const tenantCode = `e2e-${runRef}`;
    const tenantName = `E2E Browser Tenant ${runRef}`;
    const tenantDomain = `${tenantCode}.example.test`;
    const hrAdminName = `E2E HR Admin ${runRef}`;
    const hrAdminEmail = `hr+${tenantCode}@example.test`;
    const hrAdminUsername = `hr.${runRef}`;
    const hrAdminPassword = `HrAdmin@${runRef.slice(-6)}!`;
    const employeeCode = `EMP-${runRef.slice(-8).toUpperCase()}`;
    const employeeFirstName = "E2E";
    const employeeLastName = `Employee ${runRef}`;
    const employeeEmail = `employee+${tenantCode}@example.test`;
    const employeeUsername = `emp.${runRef}`;
    const employeePassword = `Employee@${runRef.slice(-6)}!`;

    await page.setViewportSize({ width: 1440, height: 1100 });
    await loginThroughBrowser(page, platformTenantCreatePersona);

    await page.goto("/platform-admin/tenants", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    await expect(page.getByRole("heading", { name: "Tenant pipeline" })).toBeVisible();

    const dialog = await openCreateTenantDialog(page);
    await dialog.getByLabel("Code", { exact: true }).fill(tenantCode);
    await dialog.getByLabel("Name", { exact: true }).fill(tenantName);
    await dialog.getByLabel("Legal name", { exact: true }).fill(`${tenantName} Pvt Ltd`);
    await dialog.getByLabel("Primary domain", { exact: true }).fill(tenantDomain);
    await dialog.getByLabel("Primary email", { exact: true }).fill(`ops+${tenantCode}@example.test`);
    await dialog.getByLabel("Primary phone", { exact: true }).fill("+91 90000 00123");
    await dialog.getByLabel("Plan", { exact: true }).selectOption("starter");
    await dialog.getByLabel("Seed pack", { exact: true }).selectOption("standard_office");
    await dialog.getByLabel("Timezone", { exact: true }).fill("Asia/Kolkata");
    await dialog.getByLabel("Country", { exact: true }).fill("IN");
    await dialog.getByLabel("Sandbox", { exact: true }).setChecked(true);

    const createResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/platform/tenants") && response.request().method() === "POST",
      { timeout: 20_000 },
    );
    await dialog.getByRole("button", { name: "Create tenant" }).click();
    const createResponse = await createResponsePromise;
    const createPayload = await createResponse.json().catch(() => ({})) as TenantCreateResponse;
    expect(
      createResponse.ok(),
      `Tenant create failed with status ${createResponse.status()}: ${JSON.stringify(createPayload)}`,
    ).toBeTruthy();
    expect(createPayload.id, `Tenant create response should include an id: ${JSON.stringify(createPayload)}`).toBeTruthy();
    const tenantId = createPayload.id as string;

    await expect(page).toHaveURL(/\/platform-admin\/onboarding\?tenantId=/);
    await expect(page.getByText(tenantName).first()).toBeVisible();
    await expect(page.getByText(tenantCode).first()).toBeVisible();

    await page.goto("/platform-admin/tenants", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    await page.getByPlaceholder("Tenant, domain, plan, status").fill(tenantCode);
    await expect(page.getByText(tenantName).first()).toBeVisible();
    await expect(page.getByText(tenantDomain).first()).toBeVisible();

    await page.goto(`/platform-admin/launch?tenantId=${tenantId}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    await expect(page.getByRole("heading", { level: 1, name: "Launch Blueprint" })).toBeVisible();
    await expect(page.getByTestId("platform-launch-blueprint-panel")).toBeVisible();
    const indiaBlueprint = page.getByRole("button", { name: /India Standard SME/i }).first();
    await expect(indiaBlueprint).toBeVisible();
    await indiaBlueprint.click();

    await page.getByRole("button", { name: "Preview launch plan" }).click();
    await expect(page.getByText("Launch preview completed.")).toBeVisible();
    await expect(page.getByText("Needs inputs", { exact: true }).first()).toBeVisible();
    const missingInputs = page.locator(".platform-validation-strip").first();
    await expect(missingInputs).toContainText("Registered address");
    await expect(missingInputs).toContainText("Default branch");
    await expect(page.getByRole("button", { name: "Apply safe launch setup" }).first()).toBeDisabled();

    await page.getByLabel("Registered address").fill("Bandra Kurla Complex, Mumbai, Maharashtra 400051");
    await page.getByLabel("Default branch").fill("Mumbai");
    await page.getByLabel("Holiday region").selectOption("MH");
    await page.getByLabel("Maternity leave").setChecked(true);
    await page.getByLabel("Jury duty leave").setChecked(true);

    await page.getByRole("button", { name: "Preview launch plan" }).click();
    await expect(page.getByText("Launch preview completed.")).toBeVisible();
    await expect(page.getByText("Apply-ready", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Will configure now")).toBeVisible();
    await expect(page.getByText("Roles and Users", { exact: true })).toBeVisible();
    await expect(page.getByText("Organization Masters", { exact: true })).toBeVisible();
    await expect(page.getByText("HR Policies", { exact: true }).or(page.getByText("Leave and Attendance", { exact: true })).first()).toBeVisible();
    await expect(page.getByText("Document Requirements", { exact: true })).toBeVisible();
    await expect(page.getByText("Approval Workflows", { exact: true })).toBeVisible();
    await expect(page.getByText("Notification Templates", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Apply safe launch setup" }).first().click();
    await expect(page.getByText("Certified safe launch setup applied.")).toBeVisible();
    await expect(page.getByText("Apply - Succeeded")).toBeVisible();
    await expect(page.getByText(/Applied: .*roles_users/)).toBeVisible();
    await expect(page.getByText(/Applied: .*org_masters/)).toBeVisible();
    await expect(page.getByText(/Applied: .*leave_attendance/)).toBeVisible();
    await expect(page.getByText(/Applied: .*documents/)).toBeVisible();
    await expect(page.getByText(/Applied: .*workflows/)).toBeVisible();
    await expect(page.getByText(/Applied: .*notifications/)).toBeVisible();

    await page.getByLabel("Handoff notes").fill("Browser certification: safe launch setup applied with Indian HR defaults and optional leave add-ons.");
    await page.getByRole("button", { name: "Complete customer handoff" }).click();
    await expect(page.locator(".platform-feedback").getByText("Customer handoff completed.", { exact: true })).toBeVisible();

    const runsResponse = await page.request.get(`/api/platform/tenants/${tenantId}/launch-runs`);
    expect(runsResponse.ok()).toBeTruthy();
    const runs = (await runsResponse.json()) as LaunchRun[];
    const applyRun = runs.find((run) => run.run_type === "apply" && run.status === "succeeded");
    expect(applyRun?.result_payload?.applied_modules ?? []).toContain("leave_attendance");
    const leaveEvidence = applyRun?.seeded_items.find((item) => item.module_ref === "leave_attendance");
    const leaveRefs = [
      ...(leaveEvidence?.payload?.result?.created ?? []),
      ...(leaveEvidence?.payload?.result?.existing ?? []),
    ];
    expect(leaveRefs).toContain("leave_type:maternity-leave");
    expect(leaveRefs).toContain("leave_policy:maternity-leave-policy");
    expect(leaveRefs).toContain("leave_assignment:maternity-leave-policy");
    expect(leaveRefs).toContain("leave_type:jury-duty-leave");
    expect(leaveRefs).toContain("leave_policy:jury-duty-leave-policy");
    expect(leaveRefs).toContain("leave_assignment:jury-duty-leave-policy");
    expect(leaveRefs).toContain("attendance_policy:standard-attendance-policy");
    expect(leaveRefs).toContain("attendance_assignment:standard-attendance-policy");
    expect(leaveRefs).toContain("shift:general-shift");

    await page.goto(`/platform-admin/admins?tenantId=${tenantId}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    await expect(page.getByTestId("platform-admin-admins-panel")).toBeVisible();

    await card(page, "Admin contacts").getByRole("button", { name: "Add contact" }).click();
    const contactDialog = page.getByRole("dialog", { name: "Add platform admin contact" });
    await expect(contactDialog).toBeVisible();
    await namedControl(contactDialog, "full_name").fill(hrAdminName);
    await namedControl(contactDialog, "email").fill(hrAdminEmail);
    await namedControl(contactDialog, "phone_number").fill("+91 90000 00456");
    await namedControl(contactDialog, "job_title").fill("HR Admin");
    await namedControl(contactDialog, "is_primary").setChecked(true);
    await namedControl(contactDialog, "notes").fill("Browser certification HR Admin for post-launch setup verification.");
    await contactDialog.getByRole("button", { name: "Add contact" }).click();
    await expect(page.getByText("Admin contact added.")).toBeVisible();

    const provisionCard = card(page, "Create tenant admin login");
    await namedControl(provisionCard, "contact_id").selectOption({ label: `${hrAdminName} - ${hrAdminEmail}` });
    await namedControl(provisionCard, "username").fill(hrAdminUsername);
    await namedControl(provisionCard, "role_code").selectOption("hr-admin");
    await namedControl(provisionCard, "role_name").fill("HR Admin");
    await namedControl(provisionCard, "password").fill(hrAdminPassword);
    await namedControl(provisionCard, "membership_status").selectOption("active");
    await namedControl(provisionCard, "must_change_password").setChecked(false);
    await namedControl(provisionCard, "is_user_active").setChecked(true);
    await provisionCard.getByRole("button", { name: "Create login access" }).click();
    await expect(page.getByText("First admin provisioned.")).toBeVisible();

    await loginThroughBrowser(page, { username: hrAdminUsername, password: hrAdminPassword });
    await expect(page).toHaveURL(/\/hr-admin(?:$|[/?#])/);
    await expect(page.getByRole("heading", { level: 1, name: /HR Control Center|Control center/i })).toBeVisible();

    await expectHrSeededPage(page, "/hr-admin/organization?section=legal_entities", "Organization masters", [`${tenantName} Pvt Ltd`, "default-legal-entity"]);
    await expectHrSeededPage(page, "/hr-admin/organization?section=branches", "Organization masters", ["Mumbai", "default-branch"]);
    await expectHrSeededPage(page, "/hr-admin/organization?section=departments", "Organization masters", ["Operations"]);
    await expectHrSeededPage(page, "/hr-admin/organization?section=grades", "Organization masters", ["Level 1", "Level 2", "Level 3"]);
    await expectHrSeededPage(page, "/hr-admin/organization?section=employment_types", "Organization masters", ["Full Time", "full-time"]);
    await expectHrSeededPage(page, "/hr-admin/leave-types", "Leave types", ["Casual Leave", "Sick Leave", "Earned Leave", "Maternity Leave", "Jury Duty Leave"]);
    await expectHrSeededPage(page, "/hr-admin/leave-policies", "Leave policies", ["Casual Leave Policy", "Sick Leave Policy", "Maternity Leave Policy", "Jury Duty Leave Policy"]);
    await expectHrSeededPage(page, "/hr-admin/leave-policy-assignments", "Leave assignments", ["Casual Leave Policy", "Maternity Leave Policy", "Jury Duty Leave Policy", "Mumbai", "Operations"]);
    await expectHrSeededPage(page, "/hr-admin/attendance-policies", "Attendance policies", ["Standard Attendance Policy", "standard-attendance-policy", "General Shift", "India MH Holidays"]);
    await expectHrSeededPage(page, "/hr-admin/attendance-policy-assignments", "Attendance assignments", ["Standard Attendance Policy", "Mumbai", "Operations"]);
    await expectHrSeededPage(page, "/hr-admin/shifts", "Shifts", ["General Shift", "general-shift", "09:30 - 18:30"]);
    await expectHrSeededPage(page, "/hr-admin/holiday-calendars", "Holiday calendars", ["India MH Holidays", "in-mh-holidays"]);

    await page.goto("/hr-admin/employees/new", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    await expect(page.getByRole("heading", { level: 1, name: "Create employee" })).toBeVisible();
    await employeeFormControl(page, "Employee code").fill(employeeCode);
    await employeeFormControl(page, "Employment status").selectOption("active");
    await employeeFormControl(page, "First name").fill(employeeFirstName);
    await employeeFormControl(page, "Last name").fill(employeeLastName);
    await employeeFormControl(page, "Work email").fill(employeeEmail);
    await employeeFormControl(page, "Phone number").fill("+91 90000 00789");
    await employeeFormControl(page, "Date of birth").fill("1995-01-15");
    await employeeFormControl(page, "Date of joining").fill("2026-10-01");
    await employeeFormControl(page, "Legal entity").selectOption({ label: `${tenantName} Pvt Ltd` });
    await employeeFormControl(page, "Branch").selectOption({ label: "Mumbai" });
    await employeeFormControl(page, "Business unit").selectOption({ label: "Corporate" });
    await employeeFormControl(page, "Department").selectOption({ label: "Operations" });
    await employeeFormControl(page, "Grade").selectOption({ label: "G1 - Associate" });
    await employeeFormControl(page, "Designation").selectOption({ label: "Employee" });
    await employeeFormControl(page, "Employment type").selectOption({ label: "Full-time" });

    const employeeCreateResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/hr-admin/employees") && response.request().method() === "POST",
      { timeout: 20_000 },
    );
    await page.getByRole("button", { name: "Create employee" }).click();
    const employeeCreateResponse = await employeeCreateResponsePromise;
    const employeeCreatePayload = await employeeCreateResponse.json().catch(() => ({})) as TenantCreateResponse;
    expect(
      employeeCreateResponse.ok(),
      `Employee create failed with status ${employeeCreateResponse.status()}: ${JSON.stringify(employeeCreatePayload)}`,
    ).toBeTruthy();
    expect(employeeCreatePayload.id, `Employee create response should include an id: ${JSON.stringify(employeeCreatePayload)}`).toBeTruthy();
    const employeeId = employeeCreatePayload.id as string;
    await expect(page).toHaveURL(/\/hr-admin\/employees\?employeeId=/);
    await expect(page.getByText(employeeCode).first()).toBeVisible();
    await expect(page.getByText(employeeEmail).first()).toBeVisible();

    await page.goto(`/hr-admin/employees/${employeeId}/access`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    await expect(page.getByRole("heading", { level: 1, name: new RegExp(`Access for .*${runRef}`) })).toBeVisible();
    await page.getByLabel("Username").fill(employeeUsername);
    await page.getByLabel("Email").fill(employeeEmail);
    await page.getByLabel("Temporary password").fill(employeePassword);
    await page.getByLabel("Membership status").selectOption("active");
    await page.getByLabel("User active").setChecked(true);
    await page.getByLabel("Must change password").setChecked(false);
    await page.getByLabel("Default membership").setChecked(true);
    const employeeRoleRow = page.locator(".selection-row").filter({ hasText: "Employee" }).filter({ hasText: "employee" }).first();
    await expect(employeeRoleRow).toBeVisible();
    await employeeRoleRow.locator('input[type="checkbox"]').setChecked(true);
    await page.getByRole("button", { name: "Create access" }).click();
    await expect(page.getByText("Employee access saved successfully.")).toBeVisible();

    await loginThroughBrowser(page, { username: employeeUsername, password: employeePassword });
    await page.goto("/ess/leave", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    await expect(page.getByRole("heading", { level: 1, name: "Leave" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Balances" })).toBeVisible();
    await expect(page.locator("main").getByText("Casual Leave").first()).toBeVisible();
    await expect(page.locator("main").getByText("Sick Leave").first()).toBeVisible();
    await expect(page.locator("main").getByText("Maternity Leave").first()).toBeVisible();
    await expect(page.locator("main").getByText("Jury Duty Leave").first()).toBeVisible();
    await expect(page.locator("main").getByText("Available:").first()).toBeVisible();
    await expect(page.getByText("No leave balance is assigned yet.")).toHaveCount(0);

    await page.goto("/ess/attendance", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    await expect(page.getByRole("heading", { level: 1, name: "Attendance" })).toBeVisible();
    await expect(page.getByText("Today").first()).toBeVisible();
    await expect(page.getByText("General Shift").first()).toBeVisible();
    await expect(page.getByText("Monthly summary").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Regularize attendance" })).toBeVisible();
    await expect(page.getByText("Not assigned")).toHaveCount(0);

    await expectNoHorizontalOverflow(page);
  });
});
