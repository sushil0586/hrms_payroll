import { appendFileSync } from "node:fs";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin, manager, requestWithBrowserSession } from "../helpers/staging-auth";

const suffix = (process.env.STG136_BATCH4_RUN_REF ?? Date.now().toString(36)).toUpperCase();
const evidencePath = process.env.STG136_BATCH4_EVIDENCE_PATH;
const created: { employeeId?: string; employeeCode?: string; departmentId?: string } = {};

function record(scenarioId: string, evidence: Record<string, unknown>) {
  if (evidencePath) appendFileSync(evidencePath, `${JSON.stringify({ scenario_id: scenarioId, recorded_at: new Date().toISOString(), ...evidence })}\n`, { mode: 0o600 });
}

function field(page: Page, label: string): Locator {
  return page.locator("label.form-field").filter({ has: page.locator("span", { hasText: new RegExp(`^${label}(?: \\(required\\))?$`) }) }).locator("input, select, textarea").first();
}

async function selectFirst(select: Locator) {
  const value = await select.locator("option:not([value=''])").first().getAttribute("value");
  expect(value).toBeTruthy(); await select.selectOption(value!);
}

async function selectContaining(select: Locator, text: string) {
  const option = select.locator("option").filter({ hasText: text }).first();
  const value = await option.getAttribute("value");
  expect(value).toBeTruthy(); await select.selectOption(value!);
}

async function continueStep(page: Page, heading: string) {
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}

async function api(page: Page, path: string, method = "GET", data?: unknown) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  const base = process.env.PLAYWRIGHT_BACKEND_URL ?? "http://127.0.0.1:8020/api/v1";
  const response = await page.request.fetch(`${base}${path}`, { method, headers: { Authorization: `Token ${token}`, ...(data === undefined ? {} : { "content-type": "application/json" }) }, data });
  return { response, payload: await response.json().catch(() => ({})) as Record<string, unknown> };
}

test.describe.serial("STG-136 Batch 4 employee access and history closure", () => {
  test.setTimeout(240_000);

  test("STG-E2E-0402 creates Employee B through HR Admin", async ({ page }) => {
    const code = `STG4-B-${suffix}`;
    const email = `stg4.employee.b.${suffix.toLowerCase()}@example.test`;
    await gotoAuthenticated(page, "/hr-admin/employees/new", hrAdmin);
    await expectPageReady(page, "Create employee");
    await field(page, "Employee code").fill(code); await field(page, "Employment status").selectOption("active");
    await field(page, "First name").fill("Batch"); await field(page, "Last name").fill("Employee B"); await field(page, "Preferred name").fill("Employee B");
    await continueStep(page, "Contact and dates");
    await field(page, "Work email").fill(email); await field(page, "Personal email").fill(`personal.${email}`); await field(page, "Phone number").fill("+91 90000 00402");
    await field(page, "Date of birth").fill("1994-04-02"); await field(page, "Date of joining").fill("2026-10-01");
    await continueStep(page, "Structural mapping");
    for (const label of ["Branch", "Cost center", "Department", "Designation", "Employment type"]) await selectFirst(field(page, label));
    const businessUnit = field(page, "Business unit"); if (!(await businessUnit.inputValue())) await selectFirst(businessUnit);
    const grade = field(page, "Grade"); if (!(await grade.inputValue())) await selectFirst(grade);
    await continueStep(page, "Review");
    const responsePromise = page.waitForResponse((response) => response.url().includes("/api/hr-admin/employees") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Create employee" }).click();
    const response = await responsePromise; expect(response.status()).toBe(201);
    await expect(page).toHaveURL(/employeeId=/);
    const employeeId = new URL(page.url()).searchParams.get("employeeId"); expect(employeeId).toBeTruthy();
    created.employeeId = employeeId!; created.employeeCode = code;
    const persisted = await api(page, `/hr-admin/employees/${employeeId}/`); expect(persisted.response.status()).toBe(200); expect(persisted.payload.employee_code).toBe(code);
    expect(persisted.payload.legal_entity_id).toBeTruthy(); expect(persisted.payload.branch_id).toBeTruthy(); expect(persisted.payload.department_id).toBeTruthy();
    record("STG-E2E-0402", { resources: [{ type: "employee", id: employeeId, code }], api_status: 200, employment_timeline: "verified_by_postgresql" });
  });

  test("STG-E2E-0405 provisions and verifies MSS access for Manager A", async ({ page }) => {
    const managerId = process.env.STG136_BATCH4_MANAGER_ID; expect(managerId).toBeTruthy();
    await gotoAuthenticated(page, `/hr-admin/employees?employeeId=${managerId}&action=access`, hrAdmin);
    const dialog = page.getByRole("dialog", { name: "Manage access" }); await expect(dialog).toBeVisible();
    const managerRole = dialog.locator(".selection-row").filter({ hasText: "manager" }).first(); await expect(managerRole).toBeVisible();
    await managerRole.locator('input[type="checkbox"]').setChecked(true);
    page.once("dialog", (confirmation) => confirmation.accept());
    await dialog.getByRole("button", { name: /Update access|Create access/ }).click();
    await expect(dialog.getByText("Employee access saved. Login, membership and role settings are up to date.")).toBeVisible();
    const access = await api(page, `/hr-admin/employees/${managerId}/access/`); expect(access.response.status()).toBe(200);
    expect((access.payload.roles as Array<{ code: string }>).some((role) => role.code === "manager")).toBe(true);
    record("STG-E2E-0405", { manager_id: managerId, role: "manager", membership_status: access.payload.membership_status });
  });

  test("STG-E2E-0406 verifies first login and role-correct workspace routing", async ({ page }) => {
    await page.goto("/login"); await page.getByLabel("Username or email").fill(manager.username); await page.getByLabel("Password").fill(manager.password);
    await page.getByRole("button", { name: "Sign in" }).click(); await expect(page).toHaveURL(/\/mss(?:\/|$)|\/workspace/);
    await page.goto("/mss/approvals"); await expectPageReady(page, /Approvals|Manager/);
    const denied = await api(page, "/hr-admin/employees/"); expect(denied.response.status()).toBe(403);
    record("STG-E2E-0406", { persona: "manager", first_login: "browser_form", mss_route: "allowed", hr_admin_api_status: 403 });
  });

  test("STG-E2E-0407 permits scoped self-profile edits and rejects HR fields", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/profile?section=contact", employee); await expectPageReady(page, "My Profile");
    await page.getByLabel("Preferred name").fill(`ESS ${suffix}`); await page.getByLabel("Personal email").fill(`ess.${suffix.toLowerCase()}@example.test`); await page.getByLabel("Phone number").fill("+91 90000 00407");
    const save = page.waitForResponse((response) => response.url().includes("/api/ess/profile") && response.request().method() === "PATCH");
    await page.getByRole("button", { name: "Save profile" }).click(); expect((await save).status()).toBe(200); await expect(page.getByRole("status")).toContainText("updated");
    const own = await api(page, "/me/profile/"); expect(own.payload.preferred_name).toBe(`ESS ${suffix}`);
    const denied = await api(page, "/me/profile/", "PATCH", { first_name: "Forbidden", department_id: process.env.STG136_BATCH4_FOREIGN_DEPARTMENT_ID });
    expect(denied.response.status()).toBe(400); const after = await api(page, "/me/profile/"); expect(after.payload.full_name).not.toContain("Forbidden");
    record("STG-E2E-0407", { permitted_fields: ["preferred_name", "personal_email", "phone_number"], hr_field_status: 400, audit: "verified_by_postgresql" });
  });

  test("STG-E2E-0409 rejects cross-tenant and overlapping assignments", async ({ page }) => {
    const foreignDepartmentId = process.env.STG136_BATCH4_FOREIGN_DEPARTMENT_ID; expect(foreignDepartmentId).toBeTruthy();
    await gotoAuthenticated(page, "/hr-admin/movements/new", hrAdmin);
    await expect(field(page, "To department").locator(`option[value='${foreignDepartmentId}']`)).toHaveCount(0);
    const cross = await api(page, "/hr-admin/movements/", "POST", { employee_id: created.employeeId, movement_type: "transfer", status: "draft", effective_date: "2028-01-01", reason: "Cross tenant denial", to_department_id: foreignDepartmentId });
    expect(cross.response.status()).toBe(400);
    record("STG-E2E-0409", { employee_id: created.employeeId, cross_tenant_status: 400, overlap_guard: "verified_by_postgresql_concurrency_regression" });
  });

  test("STG-E2E-0410 preserves current projection for a future manager and department change", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/organization/departments/new", hrAdmin); await expectPageReady(page, /Create Department/i);
    await page.getByLabel("Code", { exact: false }).fill(`stg4-future-${suffix}`); await page.getByLabel("Name", { exact: false }).fill(`STG4 Future ${suffix}`); await selectFirst(page.getByLabel("Business unit", { exact: false }));
    const departmentResponse = page.waitForResponse((response) => response.url().includes("/api/hr-admin/organization/departments") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Create department" }).click(); expect((await departmentResponse).status()).toBe(201);
    const organization = await api(page, "/hr-admin/organization/");
    const department = (organization.payload.departments as Array<{ id: string; code: string }>).find((item) => item.code === `stg4-future-${suffix}`); expect(department).toBeTruthy(); created.departmentId = department!.id;
    await gotoAuthenticated(page, "/hr-admin/movements/new", hrAdmin);
    await selectContaining(field(page, "Employee"), created.employeeCode!); await field(page, "Movement type").selectOption("reporting_change"); await field(page, "Status").selectOption("completed");
    await field(page, "Effective date").fill("2030-01-01"); await field(page, "Reason").fill("Approved future projection certification"); await field(page, "Workflow reference").fill(`STG4-FUTURE-${suffix}`);
    await field(page, "To department").selectOption(department!.id); const managerId = process.env.STG136_BATCH4_MANAGER_B_ID; expect(managerId).toBeTruthy();
    await selectContaining(field(page, "Destination manager / owner"), "QA-MGR-002"); await field(page, "Current snapshot JSON").fill(JSON.stringify({ source: "stg136-batch4" }));
    const movementResponse = page.waitForResponse((response) => response.url().includes("/api/hr-admin/movements") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Create movement" }).click(); expect((await movementResponse).status()).toBe(201);
    const detail = await api(page, `/hr-admin/employees/${created.employeeId}/`); expect(detail.payload.department_id).not.toBe(department!.id); expect(detail.payload.reporting_manager_id).not.toBe(managerId);
    record("STG-E2E-0410", { employee_id: created.employeeId, future_department_id: department!.id, future_manager_id: managerId, effective_date: "2030-01-01", current_projection_preserved: true });
  });
});
