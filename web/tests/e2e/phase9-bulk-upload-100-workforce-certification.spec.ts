import { createHash } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";
import { createPayrollLifecycleOperator } from "../helpers/tenant-rbac";

const employeeImportHeaders = [
  "employee_code",
  "first_name",
  "middle_name",
  "last_name",
  "preferred_name",
  "work_email",
  "personal_email",
  "phone_number",
  "employment_status",
  "date_of_birth",
  "date_of_joining",
  "probation_end_date",
  "confirmation_date",
  "legal_entity",
  "branch",
  "location",
  "business_unit",
  "department",
  "cost_center",
  "designation",
  "grade",
  "employment_type",
  "reporting_manager_code",
];
const bankImportHeaders = ["employee_code", "account_holder_name", "bank_name", "account_number", "ifsc_code", "branch_name", "is_primary"];
const managerImportHeaders = ["employee_code", "reporting_manager_code", "effective_date", "reason"];
const shiftImportHeaders = ["employee_code", "shift_name", "assignment_kind", "effective_from", "effective_to", "is_primary", "rotation_anchor_date"];
const attendanceImportHeaders = [
  "employee_code",
  "attendance_date",
  "status",
  "source",
  "shift_name",
  "check_in_at",
  "check_out_at",
  "work_duration_hours",
  "overtime_hours",
  "late_minutes",
  "early_exit_minutes",
  "is_regularized",
  "is_locked",
  "notes",
];
const leavePolicyAssignmentImportHeaders = ["employee_code", "leave_policy_name", "priority", "is_active"];
const leaveImportHeaders = ["employee_code", "leave_type_name", "start_date", "end_date", "start_day_portion", "end_day_portion", "reason", "attachment_reference"];
const payrollInputImportHeaders = ["employee_code", "monthly_gross", "present_days", "lop_days", "overtime_hours", "leave_days", "working_days"];

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll("\"", "\"\"")}"` : value;
}

function employeeRow(runRef: string, index: number) {
  const code = `P9-${runRef}-${String(index).padStart(3, "0")}`;
  const firstNames = ["Aarav", "Isha", "Kabir", "Meera", "Neha", "Rohan", "Sana", "Vihaan"];
  const lastNames = ["Rao", "Mehta", "Iyer", "Kapoor", "Sharma", "Nair", "Bose", "Khan"];
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[index % lastNames.length];
  const status = index % 19 === 0 ? "on_notice" : "active";

  return [
    code,
    firstName,
    "",
    lastName,
    firstName,
    `${code.toLowerCase()}@example.test`,
    "",
    `+91 98${String(index).padStart(8, "0")}`,
    status,
    `199${index % 10}-04-10`,
    "2026-04-01",
    "2026-09-30",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ];
}

function buildHundredEmployeeCsv(runRef: string) {
  const validRows = Array.from({ length: 100 }, (_, index) => employeeRow(runRef, index + 1));
  const blockedDuplicate = [...employeeRow(runRef, 1)];
  blockedDuplicate[5] = `duplicate.${runRef}@example.test`;
  const rows = [...validRows, blockedDuplicate];
  return [employeeImportHeaders, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildHundredBankCsv(runRef: string) {
  const validRows = Array.from({ length: 100 }, (_, index) => {
    const rowNumber = index + 1;
    const code = `P9-${runRef}-${String(rowNumber).padStart(3, "0")}`;
    return [
      code,
      `Payroll Holder ${rowNumber}`,
      `Phase 9 Bank ${rowNumber}`,
      `9100${runRef}${String(rowNumber).padStart(3, "0")}`,
      "HDFC0001234",
      "Payroll Branch",
      "true",
    ];
  });
  const duplicatePrimary = [
    `P9-${runRef}-001`,
    "Duplicate Primary",
    "Blocked Duplicate Bank",
    `9200${runRef}001`,
    "HDFC0001234",
    "Payroll Branch",
    "true",
  ];
  const invalidIfsc = [
    `P9-${runRef}-002`,
    "Invalid IFSC",
    "Blocked IFSC Bank",
    `9300${runRef}002`,
    "BADIFSC",
    "Payroll Branch",
    "false",
  ];
  const missingEmployee = [
    `P9-${runRef}-999`,
    "Missing Employee",
    "Blocked Missing Employee Bank",
    `9400${runRef}999`,
    "HDFC0001234",
    "Payroll Branch",
    "false",
  ];
  return [bankImportHeaders, ...validRows, duplicatePrimary, invalidIfsc, missingEmployee].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildHundredManagerCsv(runRef: string) {
  const validRows = Array.from({ length: 100 }, (_, index) => {
    const rowNumber = index + 1;
    return [
      `P9-${runRef}-${String(rowNumber).padStart(3, "0")}`,
      "EMP-0002",
      "2026-04-01",
      `Phase 9 reporting line ${runRef}`,
    ];
  });
  const duplicateMapping = [
    `P9-${runRef}-001`,
    "EMP-0002",
    "2026-04-01",
    `Duplicate manager mapping ${runRef}`,
  ];
  const invalidManager = [
    `P9-${runRef}-002`,
    `NO-MGR-${runRef}`,
    "2026-04-01",
    `Invalid manager mapping ${runRef}`,
  ];
  const missingReason = [
    `P9-${runRef}-003`,
    "EMP-0002",
    "2026-04-01",
    "",
  ];
  return [managerImportHeaders, ...validRows, duplicateMapping, invalidManager, missingReason].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildHundredShiftCsv(runRef: string) {
  const validRows = Array.from({ length: 100 }, (_, index) => {
    const rowNumber = index + 1;
    return [
      `P9-${runRef}-${String(rowNumber).padStart(3, "0")}`,
      "General Shift",
      rowNumber % 10 === 0 ? "weekly_rotation" : "fixed",
      "2026-04-01",
      "",
      "true",
      "2026-04-01",
    ];
  });
  const duplicateAssignment = [`P9-${runRef}-001`, "General Shift", "fixed", "2026-04-01", "", "true", "2026-04-01"];
  const invalidShift = [`P9-${runRef}-002`, `Missing Shift ${runRef}`, "fixed", "2026-04-01", "", "true", "2026-04-01"];
  const invalidDate = [`P9-${runRef}-003`, "General Shift", "fixed", "bad-date", "", "true", "2026-04-01"];
  const missingEmployee = [`P9-${runRef}-999`, "General Shift", "fixed", "2026-04-01", "", "true", "2026-04-01"];
  return [shiftImportHeaders, ...validRows, duplicateAssignment, invalidShift, invalidDate, missingEmployee].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildHundredAttendanceCsv(runRef: string) {
  const statusByRemainder = ["present", "present", "late", "absent", "half_day", "remote", "on_leave", "present", "late", "present"];
  const validRows = Array.from({ length: 100 }, (_, index) => {
    const rowNumber = index + 1;
    const status = statusByRemainder[rowNumber % statusByRemainder.length];
    const lateMinutes = status === "late" ? "45" : "0";
    const isRegularized = status === "late" && rowNumber % 20 === 0 ? "true" : "false";
    const checkIn = status === "absent" || status === "on_leave" ? "" : status === "late" ? "2026-11-12T10:15:00+05:30" : "2026-11-12T09:00:00+05:30";
    const checkOut = status === "absent" || status === "on_leave" ? "" : status === "half_day" ? "2026-11-12T13:00:00+05:30" : "2026-11-12T18:00:00+05:30";
    return [
      `P9-${runRef}-${String(rowNumber).padStart(3, "0")}`,
      "2026-11-12",
      status,
      "import",
      "General Shift",
      checkIn,
      checkOut,
      status === "absent" || status === "on_leave" ? "0.00" : status === "half_day" ? "4.00" : "8.00",
      rowNumber % 25 === 0 ? "1.00" : "0.00",
      lateMinutes,
      "0",
      isRegularized,
      "false",
      `Phase 9 attendance scenario ${status}`,
    ];
  });
  const duplicateAttendance = [`P9-${runRef}-001`, "2026-11-12", "present", "import", "General Shift", "2026-11-12T09:00:00+05:30", "2026-11-12T18:00:00+05:30", "8.00", "0.00", "0", "0", "false", "false", "Duplicate attendance row"];
  const invalidStatus = [`P9-${runRef}-002`, "2026-11-12", "moonlighting", "import", "General Shift", "2026-11-12T09:00:00+05:30", "2026-11-12T18:00:00+05:30", "8.00", "0.00", "0", "0", "false", "false", "Invalid status"];
  const invalidDate = [`P9-${runRef}-003`, "bad-date", "present", "import", "General Shift", "2026-11-12T09:00:00+05:30", "2026-11-12T18:00:00+05:30", "8.00", "0.00", "0", "0", "false", "false", "Invalid date"];
  const missingEmployee = [`P9-${runRef}-999`, "2026-11-12", "present", "import", "General Shift", "2026-11-12T09:00:00+05:30", "2026-11-12T18:00:00+05:30", "8.00", "0.00", "0", "0", "false", "false", "Missing employee"];
  return [attendanceImportHeaders, ...validRows, duplicateAttendance, invalidStatus, invalidDate, missingEmployee].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildHundredLeaveCsv(runRef: string) {
  const validRows = Array.from({ length: 100 }, (_, index) => {
    const rowNumber = index + 1;
    const date = "2026-11-12";
    return [
      `P9-${runRef}-${String(rowNumber).padStart(3, "0")}`,
      "Casual Leave",
      date,
      date,
      "full_day",
      "full_day",
      `Phase 9 leave attendance collision ${runRef}`,
      "",
    ];
  });
  const duplicateLeave = [`P9-${runRef}-001`, "Casual Leave", "2026-11-12", "2026-11-12", "full_day", "full_day", "Duplicate leave range", ""];
  const invalidType = [`P9-${runRef}-002`, `Unknown Leave ${runRef}`, "2026-11-04", "2026-11-04", "full_day", "full_day", "Invalid leave type", ""];
  const invalidDate = [`P9-${runRef}-003`, "Casual Leave", "bad-date", "2026-11-05", "full_day", "full_day", "Invalid leave date", ""];
  const missingEmployee = [`P9-${runRef}-999`, "Casual Leave", "2026-11-04", "2026-11-04", "full_day", "full_day", "Missing employee", ""];
  return [leaveImportHeaders, ...validRows, duplicateLeave, invalidType, invalidDate, missingEmployee].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildHundredLeavePolicyAssignmentCsv(runRef: string) {
  const validRows = Array.from({ length: 100 }, (_, index) => {
    const rowNumber = index + 1;
    return [`P9-${runRef}-${String(rowNumber).padStart(3, "0")}`, "CL Standard", "10", "true"];
  });
  const duplicateAssignment = [`P9-${runRef}-001`, "CL Standard", "10", "true"];
  const invalidPolicy = [`P9-${runRef}-002`, `Missing Leave Policy ${runRef}`, "10", "true"];
  const invalidPriority = [`P9-${runRef}-003`, "CL Standard", "0", "true"];
  const missingEmployee = [`P9-${runRef}-999`, "CL Standard", "10", "true"];
  return [leavePolicyAssignmentImportHeaders, ...validRows, duplicateAssignment, invalidPolicy, invalidPriority, missingEmployee].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildHundredPayrollInputCsv(runRef: string) {
  const rows = Array.from({ length: 100 }, (_, index) => {
    const rowNumber = index + 1;
    const monthlyGross = 42000 + rowNumber * 125;
    const presentDays = rowNumber % 10 === 4 ? "20.00" : rowNumber % 10 === 6 ? "21.00" : "22.00";
    const lopDays = rowNumber % 10 === 4 ? "2.00" : rowNumber % 10 === 6 ? "1.00" : "0.00";
    const overtime = rowNumber % 25 === 0 ? "1.00" : "0.00";
    const leaveDays = "1.00";
    return [`P9-${runRef}-${String(rowNumber).padStart(3, "0")}`, String(monthlyGross), presentDays, lopDays, overtime, leaveDays, "22.00"];
  });
  return [payrollInputImportHeaders, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function parseCsvRows(csv: string) {
  const [headerLine, ...lines] = csv.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(",");
  return lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

async function createPayrollRunForImportedWorkforce(page: Page, runRef: string) {
  const setupResponse = await page.request.get("/api/hr-admin/payroll-input-snapshot-setup");
  expect(setupResponse.ok()).toBeTruthy();
  const setup = (await setupResponse.json()) as { options: { periods: Array<{ id: string; name: string }> } };
  const period = setup.options.periods[0];
  expect(period, "Payroll setup should expose at least one payroll period.").toBeTruthy();

  const runResponse = await page.request.post("/api/hr-admin/payroll-runs", {
    data: {
      period_id: period.id,
      pay_group_id: null,
      code: `phase9f-${runRef}`,
      name: `Phase 9F payroll close ${runRef}`,
      status: "draft",
      input_profile_ref: "payroll.input.phase9f.bulk.v1",
      snapshot_schema_ref: "payroll.input.snapshot.phase9f.v1",
      config_snapshot: {
        profile_ref: "payroll.close.phase9f.v1",
        calculation_profile_ref: "payroll.calculation.phase9f.v1",
        review_profile: { review_profile_ref: "payroll.review.phase9f.v1" },
        output_profile: { output_profile_ref: "payroll.output.phase9f.v1" },
      },
    },
  });
  expect(runResponse.ok()).toBeTruthy();
  return (await runResponse.json()) as { id: string; name: string };
}

async function runPayrollCloseActions(page: Page, payrollRunId: string) {
  const lockResponse = await page.request.post(`/api/hr-admin/payroll-runs/${payrollRunId}/lock-inputs`, { data: {} });
  expect(lockResponse.ok()).toBeTruthy();
  const lockPayload = (await lockResponse.json()) as { locked_count: number };
  expect(lockPayload.locked_count).toBe(100);

  const calculateResponse = await page.request.post(`/api/hr-admin/payroll-runs/${payrollRunId}/calculate-draft`, {
    data: { calculation_profile_ref: "payroll.calculation.phase9f.browser.v1" },
  });
  expect(calculateResponse.ok()).toBeTruthy();
  const calculationPayload = (await calculateResponse.json()) as { calculation: { id: string; status: string; line_count: number } };
  expect(calculationPayload.calculation.status).toBe("completed");
  expect(calculationPayload.calculation.line_count).toBeGreaterThanOrEqual(100);

  const reviewResponse = await page.request.post(`/api/hr-admin/payroll-runs/${payrollRunId}/open-review`, {
    data: { calculation_id: calculationPayload.calculation.id, review_profile_ref: "payroll.review.phase9f.browser.v1" },
  });
  expect(reviewResponse.ok()).toBeTruthy();
  const reviewPayload = (await reviewResponse.json()) as { review: { id: string; status: string } };
  expect(reviewPayload.review.status).toBe("open");

  const submitResponse = await page.request.post(`/api/hr-admin/payroll-reviews/${reviewPayload.review.id}/submit`, { data: {} });
  expect(submitResponse.ok()).toBeTruthy();
  const approveResponse = await page.request.post(`/api/hr-admin/payroll-reviews/${reviewPayload.review.id}/approve`, {
    data: { comment: "Phase 9F browser certification approval.", approval_profile_ref: "payroll.approval.phase9f.v1" },
  });
  expect(approveResponse.ok()).toBeTruthy();
  const lockReviewResponse = await page.request.post(`/api/hr-admin/payroll-reviews/${reviewPayload.review.id}/lock`, { data: {} });
  expect(lockReviewResponse.ok()).toBeTruthy();

  const outputResponse = await page.request.post(`/api/hr-admin/payroll-reviews/${reviewPayload.review.id}/generate-outputs`, {
    data: { output_profile_ref: "payroll.output.phase9f.browser.v1" },
  });
  expect(outputResponse.ok()).toBeTruthy();
  const outputPayload = (await outputResponse.json()) as { output_batch: { id: string; artifact_count: number } };
  expect(outputPayload.output_batch.artifact_count).toBeGreaterThanOrEqual(100);

  const publishResponse = await page.request.post(`/api/hr-admin/payroll-output-batches/${outputPayload.output_batch.id}/publish`, { data: {} });
  expect(publishResponse.ok()).toBeTruthy();
  const handoffResponse = await page.request.post(`/api/hr-admin/payroll-output-batches/${outputPayload.output_batch.id}/generate-finance-handoff`, {
    data: { handoff_profile_ref: "payroll.handoff.phase9f.browser.v1" },
  });
  expect(handoffResponse.ok()).toBeTruthy();
  const handoffPayload = (await handoffResponse.json()) as { handoff: { id: string; status: string } };
  expect(handoffPayload.handoff.status).toBe("generated");
  return { calculationId: calculationPayload.calculation.id, reviewId: reviewPayload.review.id, outputBatchId: outputPayload.output_batch.id, handoffId: handoffPayload.handoff.id };
}

function openEmployeeImportTools(page: Page) {
  return test.step("open employee bulk import tools", async () => {
    const disclosure = page.locator("details.employee-imports-disclosure").first();
    await expect(disclosure).toBeVisible();
    const isOpen = await disclosure.evaluate((element) => (element as HTMLDetailsElement).open);
    if (!isOpen) {
      await disclosure.locator("summary").click();
    }
    await expect(disclosure).toHaveAttribute("open", "");
  });
}

async function expectCommittedImportAudit(
  page: Page,
  importType: string,
  csvHash: string,
  expected: { rowCount: number; createdCount: number; blockedCount: number },
) {
  const params = new URLSearchParams({
    import_type: importType,
    status: "committed",
    source_hash: csvHash,
    page_size: "25",
  });
  const response = await page.request.get(`/api/hr-admin/import-batches?${params.toString()}`);
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    items: Array<{
      source_hash: string;
      row_count: number;
      created_count: number;
      blocked_count: number;
      status: string;
    }>;
  };
  const committedBatch = payload.items.find((item) => item.source_hash === csvHash);
  expect(committedBatch).toBeTruthy();
  expect(committedBatch?.status).toBe("committed");
  expect(committedBatch?.row_count).toBe(expected.rowCount);
  expect(committedBatch?.created_count).toBe(expected.createdCount);
  expect(committedBatch?.blocked_count).toBe(expected.blockedCount);
}

async function expectImportHistoryUi(page: Page) {
  await gotoAuthenticated(page, "/hr-admin/import-history", hrAdmin);
  await expectPageReady(page, "Import history");

  const history = page.getByTestId("import-history-workspace");
  await expect(history).toBeVisible();
  await expect(history.locator(".import-history-card").first()).toBeVisible();
  await expect(history.getByText("Import batches")).toBeVisible();
  await expect(history.locator(".record-chip", { hasText: "Committed" }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function countImportedEmployees(page: Page, runRef: string) {
  const response = await page.request.get("/api/hr-admin/employees");
  expect(response.ok()).toBeTruthy();
  const employees = (await response.json()) as Array<{ employee_code: string }>;
  return employees.filter((employee) => employee.employee_code.startsWith(`P9-${runRef}-`)).length;
}

test.describe("Phase 9 bulk upload 100 workforce certification", () => {
  test("imports 100 employees and payroll prerequisites through browser bulk upload paths", async ({ page }) => {
    test.setTimeout(25 * 60 * 1000);

    const runRef = String(Date.now()).slice(-6);
    const employeeCsv = buildHundredEmployeeCsv(runRef);
    const employeeCsvHash = createHash("sha256").update(employeeCsv).digest("hex");
    const bankCsv = buildHundredBankCsv(runRef);
    const bankCsvHash = createHash("sha256").update(bankCsv).digest("hex");
    const managerCsv = buildHundredManagerCsv(runRef);
    const managerCsvHash = createHash("sha256").update(managerCsv).digest("hex");
    const shiftCsv = buildHundredShiftCsv(runRef);
    const shiftCsvHash = createHash("sha256").update(shiftCsv).digest("hex");
    const attendanceCsv = buildHundredAttendanceCsv(runRef);
    const attendanceCsvHash = createHash("sha256").update(attendanceCsv).digest("hex");
    const leavePolicyAssignmentCsv = buildHundredLeavePolicyAssignmentCsv(runRef);
    const leavePolicyAssignmentCsvHash = createHash("sha256").update(leavePolicyAssignmentCsv).digest("hex");
    const leaveCsv = buildHundredLeaveCsv(runRef);
    const leaveCsvHash = createHash("sha256").update(leaveCsv).digest("hex");

    await gotoAuthenticated(page, "/hr-admin/employees?page_size=5", hrAdmin);
    await expectPageReady(page, "Employees");
    await openEmployeeImportTools(page);

    const workbench = page.getByTestId("employee-import-workbench");
    await expect(workbench).toBeVisible();
    await expect(workbench.getByRole("heading", { name: "Employee bulk import" })).toBeVisible();

    await workbench.locator("input[type='file']").setInputFiles({
      name: `phase9-workforce-${runRef}.csv`,
      mimeType: "text/csv",
      buffer: Buffer.from(employeeCsv),
    });
    await expect(workbench.getByLabel("CSV data")).toContainText(`P9-${runRef}-001`);

    await workbench.getByRole("button", { name: "Preview import" }).click();
    await expect(workbench.getByText("Preview ready. Review blocked rows before committing.")).toBeVisible();
    await expect(workbench.locator("tbody tr")).toHaveCount(101);
    await expect(workbench.locator("tr").filter({ hasText: `P9-${runRef}-001` }).first().locator(".readiness-badge", { hasText: "ready" })).toBeVisible();
    await expect(workbench.locator("tr").filter({ hasText: `P9-${runRef}-001` }).last().locator(".readiness-badge", { hasText: "blocked" })).toBeVisible();
    await expect(workbench.getByText("Employee code already exists in this tenant or import batch.")).toBeVisible();

    await workbench.getByRole("button", { name: "Commit ready rows" }).click();
    await expect(workbench.getByText("Commit complete. Refresh the directory to verify created employees.")).toBeVisible({ timeout: 180_000 });
    await expect(workbench.locator("tbody tr").locator(".readiness-badge", { hasText: "created" })).toHaveCount(100, { timeout: 180_000 });
    await expect(workbench.locator("tbody tr").locator(".readiness-badge", { hasText: "blocked" })).toHaveCount(1);

    expect(await countImportedEmployees(page, runRef)).toBe(100);
    await gotoAuthenticated(page, `/hr-admin/employees?q=P9-${runRef}-100&status=all&page_size=5`, hrAdmin);
    await expectPageReady(page, "Employees");
    await expect(page.locator(".employee-directory-item").filter({ hasText: `P9-${runRef}-100` })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await expectCommittedImportAudit(page, "employees", employeeCsvHash, { rowCount: 101, createdCount: 100, blockedCount: 1 });

    await gotoAuthenticated(page, "/hr-admin/employees?page_size=5", hrAdmin);
    await expectPageReady(page, "Employees");
    await openEmployeeImportTools(page);

    const bankWorkbench = page.getByTestId("employee-bank-import-workbench");
    await expect(bankWorkbench).toBeVisible();
    await bankWorkbench.locator("input[type='file']").setInputFiles({
      name: `phase9-bank-${runRef}.csv`,
      mimeType: "text/csv",
      buffer: Buffer.from(bankCsv),
    });
    await expect(bankWorkbench.getByLabel("Bank CSV data")).toContainText(`P9-${runRef}-001`);
    await bankWorkbench.getByRole("button", { name: "Preview bank import" }).click();
    await expect(bankWorkbench.getByText("Preview ready. Commit ready bank accounts after checking blocked rows.")).toBeVisible();
    await expect(bankWorkbench.locator("tbody tr")).toHaveCount(103);
    await expect(bankWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "ready" })).toHaveCount(100);
    await expect(bankWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "blocked" })).toHaveCount(3);
    await expect(bankWorkbench.getByText("Only one primary account per employee can be committed in one import batch.").first()).toBeVisible();
    await expect(bankWorkbench.getByText("IFSC code must use the 11-character bank format.").first()).toBeVisible();
    await expect(bankWorkbench.getByText("Employee code must match an existing employee.").first()).toBeVisible();

    await bankWorkbench.getByRole("button", { name: "Commit ready bank rows" }).click();
    await expect(bankWorkbench.getByText("Commit complete. Open the employee bank account page or payroll readiness to verify coverage.")).toBeVisible({ timeout: 240_000 });
    await expect(bankWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "created" })).toHaveCount(100, { timeout: 240_000 });
    await expect(bankWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "blocked" })).toHaveCount(3);
    await expectCommittedImportAudit(page, "employee_bank_accounts", bankCsvHash, { rowCount: 103, createdCount: 100, blockedCount: 3 });

    await gotoAuthenticated(page, "/hr-admin/employees?page_size=5", hrAdmin);
    await expectPageReady(page, "Employees");
    await openEmployeeImportTools(page);

    const managerWorkbench = page.getByTestId("employee-manager-import-workbench");
    await expect(managerWorkbench).toBeVisible();
    await managerWorkbench.locator("input[type='file']").setInputFiles({
      name: `phase9-managers-${runRef}.csv`,
      mimeType: "text/csv",
      buffer: Buffer.from(managerCsv),
    });
    await expect(managerWorkbench.getByLabel("Manager CSV data")).toContainText(`P9-${runRef}-001`);
    await managerWorkbench.getByRole("button", { name: "Preview manager import" }).click();
    await expect(managerWorkbench.getByText("Preview ready. Commit ready manager mappings after checking blocked rows.")).toBeVisible();
    await expect(managerWorkbench.locator("tbody tr")).toHaveCount(103);
    await expect(managerWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "ready" })).toHaveCount(100);
    await expect(managerWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "blocked" })).toHaveCount(3);
    await expect(managerWorkbench.getByText("Only one manager mapping per employee can be committed in one import batch.").first()).toBeVisible();
    await expect(managerWorkbench.getByText("Reporting manager must match an active manager option.").first()).toBeVisible();
    await expect(managerWorkbench.getByText("Reason is required for reporting-line audit context.").first()).toBeVisible();

    await managerWorkbench.getByRole("button", { name: "Commit ready manager rows" }).click();
    await expect(managerWorkbench.getByText("Commit complete. Refresh the directory or workforce report to verify manager coverage.")).toBeVisible({ timeout: 240_000 });
    await expect(managerWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "created" })).toHaveCount(100, { timeout: 240_000 });
    await expect(managerWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "blocked" })).toHaveCount(3);
    await expectCommittedImportAudit(page, "reporting_manager_mappings", managerCsvHash, { rowCount: 103, createdCount: 100, blockedCount: 3 });

    await gotoAuthenticated(page, "/hr-admin/employee-shift-assignments", hrAdmin);
    await expectPageReady(page, "Shift assignments");
    const shiftWorkbench = page.getByTestId("employee-shift-assignment-import-workbench");
    await expect(shiftWorkbench).toBeVisible();
    await shiftWorkbench.locator("input[type='file']").setInputFiles({
      name: `phase9-shifts-${runRef}.csv`,
      mimeType: "text/csv",
      buffer: Buffer.from(shiftCsv),
    });
    await expect(shiftWorkbench.getByLabel("Shift assignment CSV data")).toContainText(`P9-${runRef}-001`);
    await shiftWorkbench.getByRole("button", { name: "Preview shift import" }).click();
    await expect(shiftWorkbench.getByText("Preview ready. Commit ready shift assignments after checking blocked rows.")).toBeVisible();
    await expect(shiftWorkbench.locator("tbody tr")).toHaveCount(104);
    await expect(shiftWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "ready" })).toHaveCount(100);
    await expect(shiftWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "blocked" })).toHaveCount(4);
    await expect(shiftWorkbench.getByText("Only one shift assignment per employee/window can be committed in one import batch.").first()).toBeVisible();
    await expect(shiftWorkbench.getByText("Shift name must match an active shift.").first()).toBeVisible();
    await expect(shiftWorkbench.getByText("Effective from must be a valid date.").first()).toBeVisible();
    await expect(shiftWorkbench.getByText("Employee code must match an existing employee.").first()).toBeVisible();

    await shiftWorkbench.getByRole("button", { name: "Commit ready shift rows" }).click();
    await expect(shiftWorkbench.getByText("Commit complete. Refresh shift assignments or Time to Payroll to verify roster coverage.")).toBeVisible({ timeout: 240_000 });
    await expect(shiftWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "created" })).toHaveCount(100, { timeout: 240_000 });
    await expect(shiftWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "blocked" })).toHaveCount(4);
    await expectCommittedImportAudit(page, "employee_shift_assignments", shiftCsvHash, { rowCount: 104, createdCount: 100, blockedCount: 4 });

    await gotoAuthenticated(page, "/hr-admin/attendance-records?page_size=100", hrAdmin);
    await expectPageReady(page, "Attendance records");
    const attendanceWorkbench = page.getByTestId("attendance-record-import-workbench");
    await expect(attendanceWorkbench).toBeVisible();
    await attendanceWorkbench.locator("input[type='file']").setInputFiles({
      name: `phase9-attendance-${runRef}.csv`,
      mimeType: "text/csv",
      buffer: Buffer.from(attendanceCsv),
    });
    await expect(attendanceWorkbench.getByLabel("Attendance CSV data")).toContainText(`P9-${runRef}-001`);
    await attendanceWorkbench.getByRole("button", { name: "Preview attendance import" }).click();
    await expect(attendanceWorkbench.getByText("Preview ready. Commit ready attendance rows after checking blocked rows.")).toBeVisible();
    await expect(attendanceWorkbench.locator("tbody tr")).toHaveCount(104);
    await expect(attendanceWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "ready" })).toHaveCount(100);
    await expect(attendanceWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "blocked" })).toHaveCount(4);
    await expect(attendanceWorkbench.getByText("Only one attendance row per employee and date can be committed in one import batch.").first()).toBeVisible();
    await expect(attendanceWorkbench.getByText("Status must match an attendance status option.").first()).toBeVisible();
    await expect(attendanceWorkbench.getByText("Attendance date must be a valid date.").first()).toBeVisible();
    await expect(attendanceWorkbench.getByText("Employee code must match an existing employee.").first()).toBeVisible();

    await attendanceWorkbench.getByRole("button", { name: "Commit ready attendance rows" }).click();
    await expect(attendanceWorkbench.getByText("Commit complete. Open Time to Payroll to verify attendance exceptions.")).toBeVisible({ timeout: 240_000 });
    await expect(attendanceWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "created" })).toHaveCount(100, { timeout: 240_000 });
    await expect(attendanceWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "blocked" })).toHaveCount(4);
    await expectCommittedImportAudit(page, "attendance_records", attendanceCsvHash, { rowCount: 104, createdCount: 100, blockedCount: 4 });

    await gotoAuthenticated(page, `/hr-admin/attendance-records?q=P9-${runRef}-020&page_size=25`, hrAdmin);
    await expectPageReady(page, "Attendance records");
    await expect(page.locator(".record-card").filter({ hasText: `P9-${runRef}-020` }).filter({ hasText: "2026-11-12" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, "/hr-admin/leave-policy-assignments", hrAdmin);
    await expectPageReady(page, "Leave assignments");
    const leavePolicyAssignmentWorkbench = page.getByTestId("leave-policy-assignment-import-workbench");
    await expect(leavePolicyAssignmentWorkbench).toBeVisible();
    await leavePolicyAssignmentWorkbench.locator("input[type='file']").setInputFiles({
      name: `phase9-leave-policy-assignments-${runRef}.csv`,
      mimeType: "text/csv",
      buffer: Buffer.from(leavePolicyAssignmentCsv),
    });
    await expect(leavePolicyAssignmentWorkbench.getByLabel("Leave policy assignment CSV data")).toContainText(`P9-${runRef}-001`);
    await leavePolicyAssignmentWorkbench.getByRole("button", { name: "Preview assignment import" }).click();
    await expect(leavePolicyAssignmentWorkbench.getByText("Preview ready. Commit ready leave policy assignments after checking blocked rows.")).toBeVisible();
    await expect(leavePolicyAssignmentWorkbench.locator("tbody tr")).toHaveCount(104);
    await expect(leavePolicyAssignmentWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "ready" })).toHaveCount(100);
    await expect(leavePolicyAssignmentWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "blocked" })).toHaveCount(4);
    await expect(leavePolicyAssignmentWorkbench.getByText("Only one leave policy assignment per employee and policy can be committed in one import batch.").first()).toBeVisible();
    await expect(leavePolicyAssignmentWorkbench.getByText("Leave policy name must match an active leave policy.").first()).toBeVisible();
    await expect(leavePolicyAssignmentWorkbench.getByText("Priority must be a positive number.").first()).toBeVisible();
    await expect(leavePolicyAssignmentWorkbench.getByText("Employee code must match an existing employee.").first()).toBeVisible();

    await leavePolicyAssignmentWorkbench.getByRole("button", { name: "Commit ready assignment rows" }).click();
    await expect(leavePolicyAssignmentWorkbench.getByText("Commit complete. Import leave requests to verify policy coverage.")).toBeVisible({ timeout: 300_000 });
    await expect(leavePolicyAssignmentWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "created" })).toHaveCount(100, { timeout: 300_000 });
    await expect(leavePolicyAssignmentWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "blocked" })).toHaveCount(4);
    await expectCommittedImportAudit(page, "leave_policy_assignments", leavePolicyAssignmentCsvHash, { rowCount: 104, createdCount: 100, blockedCount: 4 });

    await gotoAuthenticated(page, "/hr-admin/leave-requests?page_size=100", hrAdmin);
    await expectPageReady(page, "Leave Requests");
    const leaveWorkbench = page.getByTestId("leave-request-import-workbench");
    await expect(leaveWorkbench).toBeVisible();
    await leaveWorkbench.locator("input[type='file']").setInputFiles({
      name: `phase9-leave-${runRef}.csv`,
      mimeType: "text/csv",
      buffer: Buffer.from(leaveCsv),
    });
    await expect(leaveWorkbench.getByLabel("Leave request CSV data")).toContainText(`P9-${runRef}-001`);
    await leaveWorkbench.getByRole("button", { name: "Preview leave import" }).click();
    await expect(leaveWorkbench.getByText("Preview ready. Commit ready leave requests after checking blocked rows.")).toBeVisible();
    await expect(leaveWorkbench.locator("tbody tr")).toHaveCount(104);
    await expect(leaveWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "ready" })).toHaveCount(100);
    await expect(leaveWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "blocked" })).toHaveCount(4);
    await expect(leaveWorkbench.getByText("Leave range overlaps an existing or same-batch active leave request.").first()).toBeVisible();
    await expect(leaveWorkbench.getByText("Leave type name must match an active leave type.").first()).toBeVisible();
    await expect(leaveWorkbench.getByText("Start date must be a valid date.").first()).toBeVisible();
    await expect(leaveWorkbench.getByText("Employee code must match an existing employee.").first()).toBeVisible();

    await leaveWorkbench.getByRole("button", { name: "Commit ready leave rows" }).click();
    await expect(leaveWorkbench.getByText("Commit complete. Open leave-attendance collisions or Time to Payroll to verify impact.")).toBeVisible({ timeout: 300_000 });
    await expect(leaveWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "created" })).toHaveCount(100, { timeout: 300_000 });
    await expect(leaveWorkbench.locator("tbody tr").locator(".readiness-badge", { hasText: "blocked" })).toHaveCount(4);
    await expectCommittedImportAudit(page, "leave_requests", leaveCsvHash, { rowCount: 104, createdCount: 100, blockedCount: 4 });

    await gotoAuthenticated(page, `/hr-admin/leave-requests?q=P9-${runRef}-020&page_size=25`, hrAdmin);
    await expectPageReady(page, "Leave Requests");
    await expect(page.locator(".record-card").filter({ hasText: `P9-${runRef}-020` }).filter({ hasText: "Phase 9 leave attendance collision" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await expectImportHistoryUi(page);

    const payrollOperator = await createPayrollLifecycleOperator(page);
    await gotoAuthenticated(page, "/hr-admin/payroll-inputs", payrollOperator);
    const payrollRun = await createPayrollRunForImportedWorkforce(page, runRef);
    const payrollInputCsv = buildHundredPayrollInputCsv(runRef);
    await gotoAuthenticated(page, `/hr-admin/payroll-inputs?runId=${payrollRun.id}&snapshotSize=25`, payrollOperator);
    await expectPageReady(page, "Payroll Inputs");
    const payrollBulkImport = page.getByTestId("payroll-input-bulk-import");
    await expect(payrollBulkImport).toBeVisible();
    await payrollBulkImport.getByLabel("CSV data").fill(payrollInputCsv);
    const [payrollImportResponse] = await Promise.all([
      page.waitForResponse((item) => item.url().includes("/api/hr-admin/payroll-input-snapshots/bulk-import") && item.request().method() === "POST", { timeout: 300_000 }),
      payrollBulkImport.getByRole("button", { name: "Import payroll snapshots" }).click(),
    ]);
    expect(payrollImportResponse.ok()).toBeTruthy();
    const payrollImportPayload = (await payrollImportResponse.json()) as { created_count: number; failed_count: number };
    expect(payrollImportPayload.created_count).toBe(100);
    expect(payrollImportPayload.failed_count).toBe(0);
    await expect(page.getByRole("region", { name: "Payroll cycle journey" }).getByText("100").first()).toBeVisible({ timeout: 60_000 });

    const payrollRows = parseCsvRows(payrollInputCsv).map((row) => ({ ...row, payroll_run_id: payrollRun.id }));
    const duplicateResponse = await page.request.post("/api/hr-admin/payroll-input-snapshots/bulk-import", { data: { rows: payrollRows.slice(0, 2) } });
    expect(duplicateResponse.status()).toBe(207);
    const duplicatePayload = (await duplicateResponse.json()) as { created_count: number; failed_count: number };
    expect(duplicatePayload.created_count).toBe(0);
    expect(duplicatePayload.failed_count).toBe(2);

    const closeResult = await runPayrollCloseActions(page, payrollRun.id);
    await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${payrollRun.id}&calculationId=${closeResult.calculationId}&lineSize=25`, payrollOperator);
    await expectPageReady(page, "Payroll Calculations");
    await expect(page.getByText(payrollRun.name).first()).toBeVisible();
    await expect(page.getByText("Latest net pay").or(page.getByText("Calculation attempts")).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, `/hr-admin/payroll-review?reviewId=${closeResult.reviewId}&lineSize=25`, payrollOperator);
    await expectPageReady(page, "Payroll Review");
    await expect(page.getByText(payrollRun.name).first()).toBeVisible();
    await expect(page.getByText("Locked").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, "/hr-admin/payroll-outputs", payrollOperator);
    await expectPageReady(page, "Payroll Outputs");
    await expect(page.getByText(payrollRun.name).first()).toBeVisible();
    await expect(page.getByText(/Published|published/).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, "/hr-admin/payroll-handoff", payrollOperator);
    await expectPageReady(page, "Payroll Handoff");
    await expect(page.getByText(payrollRun.name).first()).toBeVisible();
    await expect(page.getByText(closeResult.handoffId.slice(0, 8)).or(page.getByText("Generated")).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
