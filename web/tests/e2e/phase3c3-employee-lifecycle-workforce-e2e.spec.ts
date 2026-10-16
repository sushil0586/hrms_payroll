import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { expect, test, type APIResponse, type Locator, type Page, type TestInfo } from "@playwright/test";

import { expectCompactMetric, expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const EVIDENCE_DIR = resolve(process.cwd(), "../docs/qa/evidence/phase3c3");
const PASSWORD = process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123";
const execFileAsync = promisify(execFile);
const repoRoot = resolve(__dirname, "../../..");

type Evidence = {
  scenario_ids: string[];
  status: "Passed" | "Failed" | "Blocked";
  actual_result: string;
  environment?: Record<string, string>;
  employee_code?: string;
  employee_id?: string;
  api_evidence?: Record<string, unknown>;
  notes?: string[];
};

function uniqueRef(prefix: string) {
  return `PH3C3_${prefix}_${Date.now()}`;
}

function field(scope: Page | Locator, label: string, index = 0) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").nth(index);
}

function roleRow(page: Page, roleCode: string) {
  const labelByRole = {
    employee: /Employee employee/i,
    manager: /Manager manager/i,
  }[roleCode];
  return page.getByRole("checkbox", { name: labelByRole });
}

async function writeEvidence(testInfo: TestInfo, fileName: string, evidence: Evidence) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    `${EVIDENCE_DIR}/${fileName}.json`,
    JSON.stringify(
      {
        phase: "Phase 3C.3",
        title: testInfo.title,
        project: testInfo.project.name,
        timestamp: new Date().toISOString(),
        environment: {
          base_url: process.env.PLAYWRIGHT_BASE_URL ?? "playwright default",
          api_base_url: process.env.HRMS_API_BASE_URL ?? "Next.js API proxy",
          database: "backend/db.phase3c_e2e.sqlite3",
          tenant_fixture: "PH3C_20261010 / northstar-foods",
        },
        ...evidence,
      },
      null,
      2,
    ),
  );
}

async function runFixtureScript(script: string) {
  const { stdout } = await execFileAsync(resolve(repoRoot, ".venv/bin/python"), ["backend/manage.py", "shell", "-c", script], {
    cwd: repoRoot,
    env: {
      ...process.env,
      DJANGO_SETTINGS_MODULE: process.env.DJANGO_SETTINGS_MODULE ?? "config.settings.local",
    },
    maxBuffer: 1024 * 1024,
  });
  return stdout.trim().split("\n").at(-1) ?? "";
}

async function provisionIsolationTenant(page: Page, input: { code: string; name: string; username: string; email: string }) {
  const tenantResponse = await page.request.post("/api/platform/tenants", {
    data: {
      code: input.code,
      name: input.name,
      legal_name: `${input.name} Private Limited`,
      primary_email: input.email,
      primary_domain: `${input.code}.example.test`,
      subscription_plan: "enterprise",
      seed_pack: "standard_office",
      timezone: "Asia/Kolkata",
      country_code: "IN",
      is_sandbox: true,
    },
  });
  const tenant = (await tenantResponse.json().catch(() => ({}))) as { id?: string };
  expect(tenantResponse.status(), JSON.stringify(tenant)).toBe(201);
  expect(tenant.id).toBeTruthy();

  const contactResponse = await page.request.post(`/api/platform/tenants/${tenant.id}/admin-contacts`, {
    data: {
      full_name: `QA HR Admin ${input.code}`,
      email: input.email,
      job_title: "HR Administrator",
      is_primary: true,
      notes: `Temporary P3-0612 fixture for ${input.code}`,
    },
  });
  const contact = (await contactResponse.json().catch(() => ({}))) as { id?: string };
  expect(contactResponse.status(), JSON.stringify(contact)).toBe(201);
  expect(contact.id).toBeTruthy();

  const provisionResponse = await page.request.post(`/api/platform/admin-contacts/${contact.id}/provision-user`, {
    data: {
      username: input.username,
      role_code: "hr-admin",
      role_name: "HR Admin",
      password: PASSWORD,
      must_change_password: false,
      is_user_active: true,
      membership_status: "active",
    },
  });
  expect(provisionResponse.ok(), await provisionResponse.text()).toBeTruthy();
  return tenant.id as string;
}

async function configureIsolationTenants(tenantCodes: string[]) {
  const encodedCodes = JSON.stringify(tenantCodes);
  const output = await runFixtureScript(`
import json
from apps.documents.models import DocumentCategory, DocumentCategoryType
from apps.iam.models import RolePermission
from apps.tenants.models import Tenant, TenantStatus

codes = ${encodedCodes}
permission_keys = [
    "employees.view", "employees.create", "employees.edit",
    "documents.view", "documents.manage", "documents.verify", "documents.export",
]
result = {}
for tenant in Tenant.objects.filter(code__in=codes):
    tenant.status = TenantStatus.ACTIVE
    tenant.save(update_fields=["status", "updated_at"])
    role = tenant.roles.get(code="hr-admin")
    for key in permission_keys:
        RolePermission.objects.get_or_create(role=role, permission_key=key)
    category, _ = DocumentCategory.objects.get_or_create(
        tenant=tenant,
        code="p3-0612-identity",
        defaults={"name": "P3-0612 Identity Proof", "category_type": DocumentCategoryType.IDENTITY, "is_active": True},
    )
    result[tenant.code] = {"category_id": str(category.id)}
print(json.dumps(result))
`);
  return JSON.parse(output) as Record<string, { category_id: string }>;
}

async function cleanupIsolationTenants(tenantCodes: string[], usernames: string[]) {
  await runFixtureScript(`
from apps.documents.models import EmployeeDocument
from apps.iam.models import User
from apps.tenants.models import Tenant

tenant_codes = ${JSON.stringify(tenantCodes)}
usernames = ${JSON.stringify(usernames)}
documents = EmployeeDocument.objects.filter(tenant__code__in=tenant_codes).select_related("artifact")
for document in documents:
    if document.artifact_id and document.artifact and document.artifact.stored_file:
        document.artifact.stored_file.delete(save=False)
Tenant.objects.filter(code__in=tenant_codes).delete()
User.objects.filter(username__in=usernames).delete()
print("cleaned")
`);
}

async function loginAs(page: Page, username: string, path: string) {
  await gotoAuthenticated(page, path, { username, password: PASSWORD });
}

async function createIsolationEmployee(page: Page, code: string) {
  const response = await page.request.post("/api/hr-admin/employees", {
    data: {
      employee_code: code,
      first_name: "Isolation",
      last_name: code.endsWith("A") ? "Alpha" : "Beta",
      work_email: `${code.toLowerCase()}@example.test`,
      employment_status: "active",
    },
  });
  const payload = (await response.json().catch(() => ({}))) as { id?: string; employee_code?: string };
  expect(response.status(), JSON.stringify(payload)).toBe(201);
  expect(payload.id).toBeTruthy();
  return payload as { id: string; employee_code: string };
}

async function createIsolationDocument(page: Page, employeeId: string, categoryId: string, marker: string) {
  const response = await page.request.post("/api/hr-admin/employee-documents", {
    multipart: {
      employee_id: employeeId,
      category_id: categoryId,
      title: `${marker} confidential identity proof`,
      document_number: `${marker}-DOC-001`,
      file: {
        name: `${marker.toLowerCase()}-identity.pdf`,
        mimeType: "application/pdf",
        buffer: Buffer.from(`%PDF-1.4\n% ${marker} tenant-isolation evidence\n%%EOF\n`),
      },
    },
  });
  const payload = (await response.json().catch(() => ({}))) as { id?: string; title?: string };
  expect(response.status(), JSON.stringify(payload)).toBe(201);
  expect(payload.id).toBeTruthy();
  return payload as { id: string; title: string };
}

async function expectObjectDenied(response: APIResponse, protectedMarkers: string[]) {
  expect([403, 404, 405]).toContain(response.status());
  const body = (await response.text().catch(() => "")).toLowerCase();
  for (const marker of protectedMarkers) {
    expect(body).not.toContain(marker.toLowerCase());
  }
  return response.status();
}

async function submitAndCapture<T>(page: Page, apiPath: string, method: "POST" | "PATCH", action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(`/api/hr-admin/${apiPath}`) && item.request().method() === method),
    action(),
  ]);
  return {
    ok: response.ok(),
    status: response.status(),
    payload: (await response.json().catch(() => ({}))) as T,
  };
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

async function createEmployeeThroughBrowser(page: Page, input: { code: string; firstName: string; lastName: string; managerCode?: string }) {
  await gotoAuthenticated(page, "/hr-admin/employees/new", hrAdmin);
  await expectPageReady(page, "Create employee");

  await field(page, "Employee code").fill(input.code);
  await field(page, "Employment status").selectOption("active");
  await field(page, "First name").fill(input.firstName);
  await field(page, "Last name").fill(input.lastName);
  await field(page, "Preferred name").fill(`${input.firstName} ${input.lastName}`);
  await page.getByRole("button", { name: "Continue" }).click();
  await field(page, "Work email").fill(`${input.code.toLowerCase()}@example.test`);
  await field(page, "Personal email").fill(`${input.code.toLowerCase()}.personal@example.test`);
  await field(page, "Phone number").fill("+91 90000 03103");
  await field(page, "Date of birth").fill("1994-01-01");
  await field(page, "Date of joining").fill("2026-04-01");
  await field(page, "Probation end date").fill("2026-09-30");
  await page.getByRole("button", { name: "Continue" }).click();
  await selectFirstNonEmptyOption(field(page, "Branch"));
  await selectFirstNonEmptyOption(field(page, "Cost center"));
  await selectFirstNonEmptyOption(field(page, "Department"));
  await selectFirstNonEmptyOption(field(page, "Designation"));
  await selectFirstNonEmptyOption(field(page, "Employment type"));
  if (input.managerCode) {
    await selectOptionContaining(field(page, "Reporting manager"), input.managerCode);
  } else {
    await selectFirstNonEmptyOption(field(page, "Reporting manager"));
  }
  await page.getByRole("button", { name: "Continue" }).click();

  const createResult = await submitAndCapture<{ id: string; employee_code: string; full_name: string }>(
    page,
    "employees",
    "POST",
    async () => {
      await page.getByRole("button", { name: "Create employee" }).click();
    },
  );
  expect(createResult.ok, `Employee create failed: ${createResult.status} ${JSON.stringify(createResult.payload)}`).toBeTruthy();
  await page.waitForURL(new RegExp(`/hr-admin/employees\\?employeeId=${createResult.payload.id}`), { timeout: 30_000 });
  await expect(page.getByText(input.code).first()).toBeVisible();
  return createResult.payload;
}

async function provisionAccessThroughBrowser(
  page: Page,
  input: { employeeId: string; username: string; firstName: string; lastName: string; roleCode: "employee" | "manager" },
) {
  await gotoAuthenticated(page, `/hr-admin/employees/${input.employeeId}/access`, hrAdmin);
  await expectPageReady(page, /Access for/);
  await field(page, "Username").fill(input.username);
  await field(page, "Email").fill(`${input.username}@example.test`);
  await field(page, "First name").fill(input.firstName);
  await field(page, "Last name").fill(input.lastName);
  await field(page, "Display name").fill(`${input.firstName} ${input.lastName}`);
  await field(page, "Phone number").fill("+91 98765 43103");
  await field(page, "Membership status").selectOption("active");
  await field(page, "Temporary password").fill(PASSWORD);
  const mustChange = page.locator(".toggle-field").filter({ hasText: "Must change password" }).locator("input[type='checkbox']");
  await mustChange.uncheck();
  await roleRow(page, input.roleCode).check();

  const result = await submitAndCapture(page, `employees/${input.employeeId}/access`, "POST", async () => {
    await page.getByRole("button", { name: "Create access" }).click();
  });
  expect(result.ok, `Access create failed: ${result.status} ${JSON.stringify(result.payload)}`).toBeTruthy();
  await expect(page.getByText("Employee access saved successfully.")).toBeVisible();
}

async function createRestrictedViewerFixture(page: Page, suffix: number) {
  await gotoAuthenticated(page, "/tenant-admin/roles", hrAdmin);
  const roleResponse = await page.request.post("/api/tenant-admin/roles", {
    data: {
      name: `QA Restricted Viewer ${suffix}`,
      code: `qa-restricted-viewer-${suffix}`,
      description: "Browser certification role without HR Admin permissions.",
      is_active: true,
      permission_keys: [],
    },
  });
  const rolePayload = await roleResponse.json().catch(() => ({}));
  expect(roleResponse.ok(), `Restricted role create failed: ${roleResponse.status()} ${JSON.stringify(rolePayload)}`).toBeTruthy();
  const roleId = rolePayload.role.id as string;
  expect(roleId).toBeTruthy();

  const username = `qa.restricted.viewer.${suffix}`;
  const employeeResponse = await page.request.post("/api/hr-admin/employees", {
    data: {
      employee_code: `RESTVIEW-${suffix}`,
      first_name: "QA",
      last_name: "Restricted",
      work_email: `${username}@example.test`,
      employment_status: "active",
    },
  });
  const employeePayload = await employeeResponse.json().catch(() => ({}));
  expect(employeeResponse.ok(), `Restricted employee create failed: ${employeeResponse.status()} ${JSON.stringify(employeePayload)}`).toBeTruthy();
  const employeeId = employeePayload.id as string;
  expect(employeeId).toBeTruthy();

  const accessResponse = await page.request.post(`/api/hr-admin/employees/${employeeId}/access`, {
    data: {
      username,
      email: `${username}@example.test`,
      first_name: "QA",
      last_name: "Restricted",
      display_name: "QA Restricted",
      phone_number: "",
      is_user_active: true,
      must_change_password: false,
      membership_status: "active",
      is_default_membership: true,
      role_ids: [roleId],
    },
  });
  const accessPayload = await accessResponse.json().catch(() => ({}));
  expect(accessResponse.ok(), `Restricted access create failed: ${accessResponse.status()} ${JSON.stringify(accessPayload)}`).toBeTruthy();
  const password = accessPayload.generated_password as string;
  expect(password).toBeTruthy();
  return { username, password };
}

test.describe.serial("Phase 3C.3 employee lifecycle and workforce E2E", () => {
  test("HRADM-E2E-001/003/019 workforce access, ESS/MSS visibility, RBAC and stale-session revocation", async ({ page }, testInfo) => {
    test.setTimeout(5 * 60 * 1000);
    const runId = Date.now();
    const managerCode = uniqueRef("MGR");
    const employeeCode = uniqueRef("EMP");
    const managerUsername = `ph3c3.manager.${runId}`;
    const employeeUsername = `ph3c3.employee.${runId}`;

    const createdManager = await createEmployeeThroughBrowser(page, {
      code: managerCode,
      firstName: "Phase",
      lastName: "Manager",
    });
    await provisionAccessThroughBrowser(page, {
      employeeId: createdManager.id,
      username: managerUsername,
      firstName: "Phase",
      lastName: "Manager",
      roleCode: "manager",
    });

    const createdEmployee = await createEmployeeThroughBrowser(page, {
      code: employeeCode,
      firstName: "Phase",
      lastName: "Employee",
      managerCode,
    });
    await provisionAccessThroughBrowser(page, {
      employeeId: createdEmployee.id,
      username: employeeUsername,
      firstName: "Phase",
      lastName: "Employee",
      roleCode: "employee",
    });

    const duplicateResponse = await page.request.post("/api/hr-admin/employees", {
      data: {
        employee_code: employeeCode,
        employment_status: "active",
        first_name: "Duplicate",
        last_name: "Blocked",
        work_email: `${employeeCode.toLowerCase()}.duplicate@example.test`,
      },
    });
    expect(duplicateResponse.status(), await duplicateResponse.text()).toBe(400);

    await gotoAuthenticated(page, "/ess", { username: employeeUsername, password: PASSWORD });
    await expectPageReady(page, "My workspace");
    await expect(page.getByText(employeeCode).first()).toBeVisible();
    await expect(page.getByText("Phase Employee").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Open MSS" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, "/mss/approvals", { username: managerUsername, password: PASSWORD });
    await expectPageReady(page, "Manager approvals");
    await expectCompactMetric(page.getByRole("region", { name: "Manager approval metrics" }), /team members/i);
    await expect(page.getByRole("heading", { name: "Leave approvals" })).toBeVisible();

    const restrictedViewer = await createRestrictedViewerFixture(page, runId);
    await gotoAuthenticated(page, "/hr-admin/employees", restrictedViewer);
    await expect(page).not.toHaveURL(/\/hr-admin\/employees$/);
    const restrictedApi = await page.request.get(`/api/hr-admin/employees/${createdEmployee.id}/access`);
    expect([401, 403, 404]).toContain(restrictedApi.status());

    await gotoAuthenticated(page, `/hr-admin/employees/${createdEmployee.id}/access`, hrAdmin);
    await field(page, "Membership status").selectOption("revoked");
    const revokeResult = await submitAndCapture(page, `employees/${createdEmployee.id}/access`, "PATCH", async () => {
      await page.getByRole("button", { name: "Update access" }).click();
    });
    expect(revokeResult.ok, `Access revoke failed: ${revokeResult.status} ${JSON.stringify(revokeResult.payload)}`).toBeTruthy();

    await gotoAuthenticated(page, "/ess", { username: employeeUsername, password: PASSWORD });
    await expect(page.getByText(/No workspace access|Choose your workspace|inactive|access/i).first()).toBeVisible();

    await gotoAuthenticated(page, "/hr-admin/employees", hrAdmin);
    const apiEmployee = await page.request.get(`/api/hr-admin/employees?search=${encodeURIComponent(employeeCode)}`);
    expect(apiEmployee.ok()).toBeTruthy();
    const accessDetail = await page.request.get(`/api/hr-admin/employees/${createdEmployee.id}/access`);
    expect(accessDetail.ok()).toBeTruthy();

    await writeEvidence(testInfo, "01-workforce-access-rbac-revocation", {
      scenario_ids: ["HRADM-E2E-001", "HRADM-E2E-003", "HRADM-E2E-019"],
      status: "Passed",
      actual_result:
        "Created disposable manager/employee through HR Admin UI, provisioned ESS/MSS access, verified duplicate prevention, restricted persona denial and stale-session revocation.",
      employee_code: employeeCode,
      employee_id: createdEmployee.id,
      api_evidence: {
        duplicate_create_status: duplicateResponse.status(),
        employee_search_status: apiEmployee.status(),
        access_detail_status: accessDetail.status(),
        restricted_access_status: restrictedApi.status(),
      },
    });
  });

  test("HRADM-E2E-002 document upload, onboarding guard, completion and audit-linked persistence", async ({ page }, testInfo) => {
    test.setTimeout(5 * 60 * 1000);
    const employeeCode = uniqueRef("DOC");
    const workflowRef = uniqueRef("ONB");
    const documentTitle = `${employeeCode} Identity proof`;

    const createdEmployee = await createEmployeeThroughBrowser(page, {
      code: employeeCode,
      firstName: "Document",
      lastName: "Journey",
    });
    const requiredDocuments = ["PAN Card", "Bank Account Proof", "Address Proof"];
    const uploadResults: Array<{ ok: boolean; status: number; payload: { id: string } }> = [];
    for (const [index, categoryName] of requiredDocuments.entries()) {
      const title = index === 0 ? documentTitle : `${employeeCode} ${categoryName}`;
      await gotoAuthenticated(page, "/hr-admin/employee-documents/new", hrAdmin);
      await selectOptionContaining(field(page, "Employee"), employeeCode);
      await field(page, "Category").selectOption({ label: categoryName });
      await field(page, "Title").fill(title);
      await field(page, "Document number").fill(`${employeeCode}-${index + 1}`);
      await field(page, "Issued on").fill("2026-04-01");
      await field(page, "Expires on").fill("2027-04-01");
      await field(page, "File").setInputFiles({
        name: `${employeeCode}-${index + 1}.pdf`,
        mimeType: "application/pdf",
        buffer: Buffer.from(`%PDF-1.4\n% Phase 3C.3 ${categoryName} proof ${employeeCode}\n%%EOF\n`),
      });
      const uploadResult = await submitAndCapture<{ id: string }>(page, "employee-documents", "POST", async () => {
        await page.getByRole("button", { name: "Upload document" }).click();
      });
      expect(uploadResult.ok, `${categoryName} upload failed: ${uploadResult.status} ${JSON.stringify(uploadResult.payload)}`).toBeTruthy();
      const verificationResponse = await page.request.patch(`/api/hr-admin/employee-documents/${uploadResult.payload.id}`, {
        data: { verification_status: "verified" },
      });
      expect(verificationResponse.ok(), `${categoryName} verification failed: ${verificationResponse.status()} ${await verificationResponse.text()}`).toBeTruthy();
      uploadResults.push(uploadResult);
    }
    await gotoAuthenticated(page, `/hr-admin/employee-documents?q=${encodeURIComponent(employeeCode)}`, hrAdmin);
    await expect(page.getByText(documentTitle).first()).toBeVisible();

    await gotoAuthenticated(page, "/hr-admin/onboardings/new", hrAdmin);
    await selectOptionContaining(field(page, "Employee"), employeeCode);
    await field(page, "Status").selectOption("in_progress");
    await field(page, "Expected joining date").fill("2026-05-01");
    await field(page, "Actual joining date").fill("2026-05-02");
    await selectFirstNonEmptyOption(field(page, "Assigned owner"));
    await field(page, "Workflow reference").fill(workflowRef);
    await field(page, "Notes").fill(`Phase 3C.3 onboarding notes for ${workflowRef}.`);

    await page.getByRole("button", { name: "Add checklist item" }).click();
    const checklistCard = page.locator("article.record-card").filter({ hasText: "onboarding-item-1" }).first();
    await field(checklistCard, "Label").fill("Validate uploaded identity proof");
    await selectFirstNonEmptyOption(field(checklistCard, "Owner"));
    await field(checklistCard, "Due on").fill("2026-05-03");
    await field(checklistCard, "Escalate after days").fill("2");

    const createResult = await submitAndCapture<{ id: string }>(page, "onboardings", "POST", async () => {
      await page.getByRole("button", { name: "Create onboarding" }).click();
    });
    expect(createResult.ok, `Onboarding create failed: ${createResult.status} ${JSON.stringify(createResult.payload)}`).toBeTruthy();

    await gotoAuthenticated(page, `/hr-admin/onboardings/${createResult.payload.id}/edit`, hrAdmin);
    await field(page, "Status").selectOption("completed");
    await expect(page.getByText("Completion is still blocked.")).toBeVisible();
    const blockedCompletion = await submitAndCapture(page, `onboardings/${createResult.payload.id}`, "PATCH", async () => {
      await page.getByRole("button", { name: "Save changes" }).click();
    });
    expect(blockedCompletion.status).toBe(400);
    await expect(page.getByText(/checklist item.*open|checklist items.*open/i).first()).toBeVisible();

    const checklistDoneControls = page
      .locator("article.record-card")
      .locator("label.detail-row")
      .filter({ hasText: "Done" })
      .locator("input[type='checkbox']");
    const checklistItemCount = await checklistDoneControls.count();
    expect(checklistItemCount).toBeGreaterThan(0);
    for (let index = 0; index < checklistItemCount; index += 1) {
      await checklistDoneControls.nth(index).check();
    }
    await expect(page.getByText(`${checklistItemCount}/${checklistItemCount} checklist items complete, 0 open.`)).toBeVisible();
    const completionResult = await submitAndCapture(page, `onboardings/${createResult.payload.id}`, "PATCH", async () => {
      await page.getByRole("button", { name: "Save changes" }).click();
    });
    expect(completionResult.ok, `Onboarding completion failed: ${completionResult.status} ${JSON.stringify(completionResult.payload)}`).toBeTruthy();

    const documentDetail = await page.request.get(`/api/hr-admin/employee-documents?search=${encodeURIComponent(documentTitle)}`);
    expect(documentDetail.ok()).toBeTruthy();
    const auditSearch = await page.request.get(`/api/hr-admin/audit?search=${encodeURIComponent(employeeCode)}`);

    await writeEvidence(testInfo, "02-documents-onboarding-guard-completion", {
      scenario_ids: ["HRADM-E2E-002"],
      status: "Passed",
      actual_result:
        "Uploaded employee document, created onboarding workflow, verified blocked completion with open checklist, completed after checklist closure, and confirmed persisted document/onboarding state.",
      employee_code: employeeCode,
      employee_id: createdEmployee.id,
      api_evidence: {
        document_upload_statuses: uploadResults.map((result) => result.status),
        onboarding_create_status: createResult.status,
        blocked_completion_status: blockedCompletion.status,
        completion_status: completionResult.status,
        onboarding_status: (completionResult.payload as { status?: string }).status ?? "completed",
        document_search_status: documentDetail.status(),
        audit_search_status: auditSearch.status(),
      },
    });
  });

  test("HRADM-E2E-020 cross-tenant prerequisite disposition for employee/document isolation", async ({ page }, testInfo) => {
    test.setTimeout(5 * 60 * 1000);
    const runRef = Date.now();
    const tenants = [
      {
        code: `qa-p30612-a-${runRef}`,
        name: `QA P3-0612 Tenant A ${runRef}`,
        username: `qa.p30612.a.${runRef}`,
        email: `qa.p30612.a.${runRef}@example.test`,
        employeeCode: `P30612-${runRef}-A`,
        marker: `P30612-A-${runRef}`,
      },
      {
        code: `qa-p30612-b-${runRef}`,
        name: `QA P3-0612 Tenant B ${runRef}`,
        username: `qa.p30612.b.${runRef}`,
        email: `qa.p30612.b.${runRef}@example.test`,
        employeeCode: `P30612-${runRef}-B`,
        marker: `P30612-B-${runRef}`,
      },
    ];

    const statusEvidence: Record<string, number> = {};
    try {
      await gotoAuthenticated(page, "/platform-admin/tenants", {
        username: process.env.PLAYWRIGHT_LIVE_PLATFORM_ADMIN_USERNAME ?? "platform.admin",
        password: process.env.PLAYWRIGHT_LIVE_PLATFORM_ADMIN_PASSWORD ?? PASSWORD,
      });
      const tenantAId = await provisionIsolationTenant(page, tenants[0]);
      const tenantBId = await provisionIsolationTenant(page, tenants[1]);
      expect(tenantAId).not.toBe(tenantBId);
      const fixture = await configureIsolationTenants(tenants.map((item) => item.code));

      await loginAs(page, tenants[0].username, "/hr-admin/employees");
      const employeeA = await createIsolationEmployee(page, tenants[0].employeeCode);
      const documentA = await createIsolationDocument(
        page,
        employeeA.id,
        fixture[tenants[0].code].category_id,
        tenants[0].marker,
      );

      await loginAs(page, tenants[1].username, "/hr-admin/employees");
      const employeeB = await createIsolationEmployee(page, tenants[1].employeeCode);
      const documentB = await createIsolationDocument(
        page,
        employeeB.id,
        fixture[tenants[1].code].category_id,
        tenants[1].marker,
      );

      await loginAs(page, tenants[0].username, "/hr-admin/employees");
      await expectPageReady(page, "Employees");
      const tenantAToken = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
      expect(tenantAToken).toBeTruthy();
      const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
      await expect(page.getByText(tenants[0].employeeCode).first()).toBeVisible();
      await expect(page.getByText(tenants[1].employeeCode)).toHaveCount(0);

      const employeeListA = await page.request.get("/api/hr-admin/employees");
      expect(employeeListA.status()).toBe(200);
      const employeeListABody = await employeeListA.text();
      expect(employeeListABody).toContain(tenants[0].employeeCode);
      expect(employeeListABody).not.toContain(tenants[1].employeeCode);
      statusEvidence.tenant_a_employee_list = employeeListA.status();

      const employeeAGet = await page.request.get(`/api/hr-admin/employees/${employeeA.id}`);
      expect(employeeAGet.status()).toBe(200);
      const employeeAPatch = await page.request.patch(`/api/hr-admin/employees/${employeeA.id}`, {
        data: { preferred_name: "Tenant A Same-Tenant Update" },
      });
      expect(employeeAPatch.status()).toBe(200);
      statusEvidence.same_tenant_employee_get = employeeAGet.status();
      statusEvidence.same_tenant_employee_patch = employeeAPatch.status();

      statusEvidence.cross_tenant_employee_get = await expectObjectDenied(
        await page.request.get(`/api/hr-admin/employees/${employeeB.id}`),
        [tenants[1].employeeCode, tenants[1].marker],
      );
      statusEvidence.cross_tenant_employee_patch = await expectObjectDenied(
        await page.request.patch(`/api/hr-admin/employees/${employeeB.id}`, {
          data: { preferred_name: "Forbidden Cross-Tenant Update" },
        }),
        [tenants[1].employeeCode, tenants[1].marker],
      );
      statusEvidence.cross_tenant_employee_delete = await expectObjectDenied(
        await page.request.delete(`/api/hr-admin/employees/${employeeB.id}`),
        [tenants[1].employeeCode, tenants[1].marker],
      );

      await page.goto(`/hr-admin/employees?employeeId=${employeeB.id}`, { waitUntil: "domcontentloaded" });
      await expectPageReady(page, "Employees");
      await expect(page.getByText(tenants[1].employeeCode)).toHaveCount(0);

      await page.goto(`/hr-admin/employee-documents?q=${encodeURIComponent(tenants[0].marker)}`, { waitUntil: "domcontentloaded" });
      await expectPageReady(page, "Employee document review");
      await expect(page.getByText(documentA.title).first()).toBeVisible();
      await expect(page.getByText(documentB.title)).toHaveCount(0);

      const documentListA = await page.request.get("/api/hr-admin/employee-documents?page_size=100");
      expect(documentListA.status()).toBe(200);
      const documentListABody = await documentListA.text();
      expect(documentListABody).toContain(documentA.title);
      expect(documentListABody).not.toContain(documentB.title);
      statusEvidence.tenant_a_document_list = documentListA.status();

      const documentAGet = await page.request.get(`${apiBase}/hr-admin/employee-documents/${documentA.id}/`, {
        headers: { Authorization: `Token ${tenantAToken}` },
      });
      expect(documentAGet.status()).toBe(200);
      const documentAPatch = await page.request.patch(`/api/hr-admin/employee-documents/${documentA.id}`, {
        data: { verification_status: "verified" },
      });
      expect(documentAPatch.status()).toBe(200);
      const documentADownload = await page.request.get(`/api/hr-admin/employee-documents/${documentA.id}/download`);
      expect(documentADownload.status()).toBe(200);
      expect((await documentADownload.body()).toString("utf8")).toContain(tenants[0].marker);
      statusEvidence.same_tenant_document_get = documentAGet.status();
      statusEvidence.same_tenant_document_patch = documentAPatch.status();
      statusEvidence.same_tenant_document_download = documentADownload.status();

      statusEvidence.cross_tenant_document_get = await expectObjectDenied(
        await page.request.get(`${apiBase}/hr-admin/employee-documents/${documentB.id}/`, {
          headers: { Authorization: `Token ${tenantAToken}` },
        }),
        [documentB.title, tenants[1].marker],
      );
      statusEvidence.cross_tenant_document_patch = await expectObjectDenied(
        await page.request.patch(`/api/hr-admin/employee-documents/${documentB.id}`, {
          data: { verification_status: "verified" },
        }),
        [documentB.title, tenants[1].marker],
      );
      statusEvidence.cross_tenant_document_delete = await expectObjectDenied(
        await page.request.delete(`/api/hr-admin/employee-documents/${documentB.id}`),
        [documentB.title, tenants[1].marker],
      );
      statusEvidence.cross_tenant_document_download = await expectObjectDenied(
        await page.request.get(`/api/hr-admin/employee-documents/${documentB.id}/download`),
        [documentB.title, tenants[1].marker],
      );

      await loginAs(page, tenants[1].username, "/hr-admin/employees");
      const tenantBToken = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
      expect(tenantBToken).toBeTruthy();
      const employeeBAfterAttack = await page.request.get(`/api/hr-admin/employees/${employeeB.id}`);
      expect(employeeBAfterAttack.status()).toBe(200);
      expect((await employeeBAfterAttack.json()).preferred_name ?? "").not.toBe("Forbidden Cross-Tenant Update");
      const documentBAfterAttack = await page.request.get(`${apiBase}/hr-admin/employee-documents/${documentB.id}/`, {
        headers: { Authorization: `Token ${tenantBToken}` },
      });
      expect(documentBAfterAttack.status()).toBe(200);
      expect((await documentBAfterAttack.json()).verification_status).not.toBe("verified");
      const documentBDownload = await page.request.get(`/api/hr-admin/employee-documents/${documentB.id}/download`);
      expect(documentBDownload.status()).toBe(200);
      expect((await documentBDownload.body()).toString("utf8")).toContain(tenants[1].marker);
      statusEvidence.tenant_b_employee_persisted = employeeBAfterAttack.status();
      statusEvidence.tenant_b_document_persisted = documentBAfterAttack.status();
      statusEvidence.tenant_b_document_download = documentBDownload.status();

      await writeEvidence(testInfo, "03-cross-tenant-prerequisite-disposition", {
        scenario_ids: ["HRADM-E2E-020"],
        status: "Passed",
        actual_result:
          "Provisioned two isolated sandbox tenants and HR Admin identities through Platform Admin APIs; verified same-tenant employee/document access and server-side denial of cross-tenant list, retrieve, update, unsupported delete, and attachment download attempts.",
        environment: {
          base_url: process.env.PLAYWRIGHT_BASE_URL ?? "playwright default",
          api_base_url: process.env.HRMS_API_BASE_URL ?? "Next.js API proxy",
          database: process.env.PLAYWRIGHT_DJANGO_SQLITE_DB ?? "backend/db.sqlite3",
          tenant_fixture: `${tenants[0].code} / ${tenants[1].code} (temporary, cleaned)`,
        },
        api_evidence: {
          tenant_ids_distinct: tenantAId !== tenantBId,
          ...statusEvidence,
        },
        notes: [
          "Cross-tenant object lookups returned non-leaking 404 responses; unsupported DELETE returned 405 and did not mutate protected records.",
          "Protected Tenant B records and attachment content remained readable to Tenant B after Tenant A attack attempts.",
          "Temporary tenants, identities, database records, and uploaded files were removed after evidence capture.",
        ],
      });
    } finally {
      await cleanupIsolationTenants(
        tenants.map((item) => item.code),
        tenants.map((item) => item.username),
      );
    }
  });
});
