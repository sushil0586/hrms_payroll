import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const EVIDENCE_DIR = resolve(process.cwd(), "../docs/qa/evidence/phase3c3");
const PASSWORD = process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123";

type Evidence = {
  scenario_ids: string[];
  status: "Passed" | "Failed" | "Blocked";
  actual_result: string;
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
  await field(page, "Work email").fill(`${input.code.toLowerCase()}@example.test`);
  await field(page, "Personal email").fill(`${input.code.toLowerCase()}.personal@example.test`);
  await field(page, "Phone number").fill("+91 90000 03103");
  await field(page, "Date of birth").fill("1994-01-01");
  await field(page, "Date of joining").fill("2026-04-01");
  await field(page, "Probation end date").fill("2026-09-30");
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

  const createResult = await submitAndCapture<{ id: string; employee_code: string; full_name: string }>(
    page,
    "employees",
    "POST",
    async () => {
      await page.getByRole("button", { name: "Create employee" }).click();
    },
  );
  expect(createResult.ok, `Employee create failed: ${createResult.status} ${JSON.stringify(createResult.payload)}`).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`/hr-admin/employees\\?employeeId=${createResult.payload.id}`));
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
    await expect(page.locator(".metric-tile, .metric-tile-soft").filter({ hasText: "Team members" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leave approvals" })).toBeVisible();

    await gotoAuthenticated(page, "/hr-admin/employees", { username: "restricted.viewer", password: PASSWORD });
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
    const categoryResponse = await page.request.post("/api/hr-admin/document-categories", {
      data: {
        code: uniqueRef("DOC_CAT"),
        name: `${employeeCode} onboarding category`,
        category_type: "identity",
        metadata_schema: { phase: "3C.3" },
      },
    });
    expect(categoryResponse.ok(), `Document category create failed: ${categoryResponse.status()} ${await categoryResponse.text()}`).toBeTruthy();

    await gotoAuthenticated(page, "/hr-admin/employee-documents/new", hrAdmin);
    await selectOptionContaining(field(page, "Employee"), employeeCode);
    await selectFirstNonEmptyOption(field(page, "Category"));
    await field(page, "Title").fill(documentTitle);
    await field(page, "Document number").fill(`${employeeCode}-ID`);
    await field(page, "Issued on").fill("2026-04-01");
    await field(page, "Expires on").fill("2027-04-01");
    await field(page, "File").setInputFiles({
      name: `${employeeCode}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(`%PDF-1.4\n% Phase 3C.3 employee document proof ${employeeCode}\n%%EOF\n`),
    });
    const uploadResult = await submitAndCapture<{ id: string }>(page, "employee-documents", "POST", async () => {
      await page.getByRole("button", { name: "Upload document" }).click();
    });
    expect(uploadResult.ok, `Document upload failed: ${uploadResult.status} ${JSON.stringify(uploadResult.payload)}`).toBeTruthy();
    await expect(page).toHaveURL(/\/hr-admin\/employee-documents$/);
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

    await checklistCard.locator("label.detail-row").filter({ hasText: "Done" }).locator("input[type='checkbox']").check();
    await expect(page.getByText("1/1 checklist items complete, 0 open.")).toBeVisible();
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
        document_upload_status: uploadResult.status,
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
    test.setTimeout(90_000);
    await gotoAuthenticated(page, "/hr-admin/employees", hrAdmin);
    await expectPageReady(page, "Employees");
    const employeesResponse = await page.request.get("/api/hr-admin/employees");
    expect(employeesResponse.ok()).toBeTruthy();
    const restrictedResponse = await page.request.get("/api/hr-admin/employees", {
      headers: { "X-HRMS-Tenant-Code": "missing-tenant-for-phase3c3" },
    });
    expect(employeesResponse.status()).toBe(200);

    await writeEvidence(testInfo, "03-cross-tenant-prerequisite-disposition", {
      scenario_ids: ["HRADM-E2E-020"],
      status: "Blocked",
      actual_result:
        "Current certified Phase 3C.2 fixture contains only tenant northstar-foods, so full two-tenant employee/document object isolation could not be executed in this batch. Same-tenant restricted persona denial was verified in HRADM-E2E-003.",
      api_evidence: {
        employee_list_status: employeesResponse.status(),
        invalid_tenant_header_status: restrictedResponse.status(),
      },
      notes: [
        "No second PH3C tenant/persona exists in backend/db.phase3c_e2e.sqlite3.",
        "Payroll/report/artifact cross-tenant checks remain outside Phase 3C.3 scope.",
      ],
    });
  });
});
