import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin, type Persona } from "../helpers/staging-auth";
import { createPayrollLifecycleOperator } from "../helpers/tenant-rbac";

function uniqueCode(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function form(page: Page, testId: string) {
  return page.getByTestId(testId);
}

function field(scope: Locator, label: string) {
  return scope.getByText(label, { exact: true }).locator("xpath=ancestor::label[1]").locator("input, select, textarea").first();
}

async function selectOptionContaining(select: Locator, text: string) {
  const value = await select.evaluate((element, needle) => {
    const option = Array.from((element as HTMLSelectElement).options).find((item) => item.textContent?.includes(String(needle)));
    return option?.value ?? "";
  }, text);
  expect(value).toBeTruthy();
  await select.selectOption(value);
}

async function selectEmployeeSearchOption(page: Page, employee: { id?: string; employeeCode?: string; employeeOptionText?: string }) {
  const searchNeedle = employee.employeeCode || employee.employeeOptionText || "";
  expect(searchNeedle, "Expected employee code or name for payroll employee search.").toBeTruthy();
  await page.getByLabel("Find person").fill(searchNeedle);
  const employeeSelect = field(form(page, "payroll-input-snapshot-form"), "Employee");
  await expect.poll(async () => employeeSelect.locator("option").count(), { timeout: 15_000 }).toBeGreaterThan(1);
  if (employee.id) {
    await employeeSelect.selectOption(employee.id);
    return;
  }
  await selectOptionContaining(employeeSelect, searchNeedle);
}

async function submitAndCapture<T>(page: Page, routePattern: RegExp, method: string, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => routePattern.test(item.url()) && item.request().method() === method, { timeout: 30000 }),
    action(),
  ]);
  return {
    ok: response.ok(),
    status: response.status(),
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

async function authToken(page: Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token, "Expected authenticated browser session token.").toBeTruthy();
  return token!;
}

async function backendApiGet<T>(page: Page, path: string) {
  const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
  const response = await page.request.get(`${apiBase}${path}`, {
    headers: { Authorization: `Token ${await authToken(page)}` },
  });
  expect(response.status(), `${path} should return 200 from backend API`).toBe(200);
  return (await response.json()) as T;
}

async function getSignedInEssEmployee(page: Page) {
  await gotoAuthenticated(page, "/ess", employee);
  const dashboard = await backendApiGet<{ profile?: { employee_code?: string; full_name?: string } }>(page, "/me/dashboard/");
  const employeeCode = dashboard.profile?.employee_code ?? "";
  const employeeName = dashboard.profile?.full_name ?? "";
  expect(employeeCode || employeeName).toBeTruthy();
  await gotoAuthenticated(page, "/hr-admin/payroll-inputs", hrAdmin);
  const optionResponse = await page.request.get(`/api/hr-admin/employees/option-search?q=${encodeURIComponent(employeeCode || employeeName)}&limit=1`);
  expect(optionResponse.ok(), await optionResponse.text()).toBeTruthy();
  const optionPayload = (await optionResponse.json()) as { items?: Array<{ id: string }> };
  return {
    id: optionPayload.items?.[0]?.id,
    employeeCode,
    employeeOptionText: employeeCode || employeeName,
  };
}

async function createDisposablePayrollEmployee(page: Page, suffix: string, label: string) {
  await gotoAuthenticated(page, "/hr-admin", hrAdmin);
  const employeeCode = `QA-TAX-${label}-${suffix}`.slice(0, 32);
  const response = await page.request.post("/api/hr-admin/employees", {
    data: {
      employee_code: employeeCode,
      employment_status: "active",
      first_name: "QA",
      last_name: `Tax ${label}`,
      work_email: `${employeeCode.toLowerCase()}@example.com`,
      date_of_joining: "2026-04-01",
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const payload = (await response.json()) as { id: string; employee_code?: string; full_name?: string };
  return {
    id: payload.id,
    employeeCode,
    employeeOptionText: employeeCode,
  };
}

async function createLockedReview(
  page: Page,
  payrollOperator: Persona,
  options: {
    employeeId?: string;
    employeeOptionText?: string;
    expectedEmployeeCode?: string;
    additionalEmployees?: Array<{ id: string; employeeCode: string }>;
    runConfigSnapshot?: Record<string, unknown>;
    outputProfileRef?: string;
  } = {},
) {
  await gotoAuthenticated(page, "/hr-admin/payroll-inputs", payrollOperator);
  await expectPageReady(page, "Payroll Inputs");
  const runForm = form(page, "payroll-run-form");
  const snapshotForm = form(page, "payroll-input-snapshot-form");
  const lockForm = form(page, "payroll-input-lock-form");
  const runCode = uniqueCode("OUTPUT_CERT");

  await runForm.getByRole("button", { name: "New" }).click();
  const run = await submitAndCapture<{ id: string; code: string }>(page, /\/api\/hr-admin\/payroll-runs$/, "POST", async () => {
    await field(runForm, "Code").fill(runCode);
    await field(runForm, "Name").fill(`Output certification ${runCode}`);
    await field(runForm, "Pay group").selectOption("").catch(() => undefined);
    await field(runForm, "Status").selectOption("collecting_inputs");
    await field(runForm, "Input profile ref").fill("tenant.payroll.input.phase5p.v1");
    await field(runForm, "Snapshot schema ref").fill("tenant.payroll.snapshot.phase5p.v1");
    await field(runForm, "Config profile reference").fill("tenant.payroll.run.phase5p.v1");
    await runForm.getByRole("button", { name: "Create run" }).click();
  });
  expect(run.ok, `Payroll run create failed with ${run.status}: ${JSON.stringify(run.payload)}`).toBeTruthy();
  if (options.runConfigSnapshot) {
    const runConfigResponse = await page.request.patch(`/api/hr-admin/payroll-runs/${run.payload.id}`, {
      data: { config_snapshot: options.runConfigSnapshot },
    });
    expect(runConfigResponse.status(), `Payroll run config patch failed: ${await runConfigResponse.text()}`).toBe(200);
  }

  await snapshotForm.getByRole("button", { name: "New" }).click();
  const snapshot = await submitAndCapture<{ id: string }>(page, /\/api\/hr-admin\/payroll-input-snapshots$/, "POST", async () => {
    await field(snapshotForm, "Payroll run").selectOption(run.payload.id);
    await selectEmployeeSearchOption(page, {
      id: options.employeeId,
      employeeCode: options.expectedEmployeeCode,
      employeeOptionText: options.employeeOptionText ?? "EMP-0042",
    });
    await field(snapshotForm, "Snapshot status").selectOption("ready");
    await field(snapshotForm, "Input profile ref").fill("tenant.payroll.input.phase5p.v1");
    await field(snapshotForm, "Config profile reference").fill("tenant.payroll.snapshot.phase5p.v1");
    await field(snapshotForm, "Employee snapshot JSON").fill(JSON.stringify({ source: "browser", employment_status: "active" }));
    await field(snapshotForm, "Organization snapshot JSON").fill(JSON.stringify({ source: "browser", legal_entity: "Phase 5P", cost_center: "QA-CC" }));
    await field(snapshotForm, "Salary snapshot JSON").fill(JSON.stringify({ source: "browser", annual_ctc: 960000, monthly_gross: 80000, currency_code: "INR" }));
    await field(snapshotForm, "Attendance snapshot JSON").fill(JSON.stringify({ working_days: 22, present_days: 22, lop_days: 0 }));
    await field(snapshotForm, "Validation snapshot JSON").fill(JSON.stringify({ blockers: [], warnings: [] }));
    await snapshotForm.getByRole("button", { name: "Create snapshot" }).click();
  });
  expect(snapshot.ok, `Payroll snapshot create failed with ${snapshot.status}: ${JSON.stringify(snapshot.payload)}`).toBeTruthy();

  for (const item of options.additionalEmployees ?? []) {
    const additionalSnapshot = await page.request.post("/api/hr-admin/payroll-input-snapshots", {
      data: {
        payroll_run_id: run.payload.id,
        employee_id: item.id,
        status: "ready",
        input_profile_ref: "tenant.payroll.input.phase5p.v1",
        config_profile_ref: "tenant.payroll.snapshot.phase5p.v1",
        employee_snapshot: { source: "browser", employment_status: "active" },
        organization_snapshot: { source: "browser", legal_entity: "Phase 5P", cost_center: "QA-CC" },
        salary_snapshot: { source: "browser", annual_ctc: 960000, monthly_gross: 80000, currency_code: "INR" },
        attendance_snapshot: { working_days: 22, present_days: 22, lop_days: 0 },
        validation_snapshot: { blockers: [], warnings: [] },
      },
    });
    expect(additionalSnapshot.ok(), `Additional payroll snapshot failed for ${item.employeeCode}: ${await additionalSnapshot.text()}`).toBeTruthy();
  }

  await gotoAuthenticated(page, `/hr-admin/payroll-inputs?runId=${run.payload.id}&snapshotId=${snapshot.payload.id}`, payrollOperator);
  await expectPageReady(page, "Payroll Inputs");
  const lockInputs = await submitAndCapture<{ locked_count: number }>(page, new RegExp(`/api/hr-admin/payroll-runs/${run.payload.id}/lock-inputs$`), "POST", async () => {
    await lockForm.getByRole("button", { name: "Lock selected run inputs" }).click();
  });
  expect(lockInputs.ok, `Payroll input lock failed with ${lockInputs.status}: ${JSON.stringify(lockInputs.payload)}`).toBeTruthy();

  await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${run.payload.id}`, payrollOperator);
  await expectPageReady(page, "Payroll Calculations");
  const calculationPanel = page.getByLabel("Calculation controls");
  const calculation = await submitAndCapture<{ calculation: { id: string } }>(page, new RegExp(`/api/hr-admin/payroll-runs/${run.payload.id}/calculate-draft$`), "POST", async () => {
    await calculationPanel.getByLabel("Calculation profile ref").fill("tenant.payroll.calc.phase5p.v1");
    await calculationPanel.getByRole("button", { name: "Calculate draft" }).click();
  });
  expect(calculation.ok, `Payroll calculation failed with ${calculation.status}: ${JSON.stringify(calculation.payload)}`).toBeTruthy();

  const review = await submitAndCapture<{ review: { id: string } }>(page, new RegExp(`/api/hr-admin/payroll-runs/${run.payload.id}/open-review$`), "POST", async () => {
    await calculationPanel.getByLabel("Review profile ref").fill("tenant.payroll.review.phase5p.v1");
    await calculationPanel.getByRole("button", { name: "Open review" }).click();
  });
  expect(review.ok, `Payroll review open failed with ${review.status}: ${JSON.stringify(review.payload)}`).toBeTruthy();

  await gotoAuthenticated(page, `/hr-admin/payroll-review?reviewId=${review.payload.review.id}`, payrollOperator);
  await expectPageReady(page, "Payroll Review");
  const controls = page.getByLabel("Review controls");
  const submitted = await submitAndCapture<{ review: { status: string } }>(page, new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/submit$`), "POST", async () => {
    await controls.getByRole("button", { name: "Submit review" }).click();
  });
  expect(submitted.ok, `Payroll review submit failed with ${submitted.status}: ${JSON.stringify(submitted.payload)}`).toBeTruthy();

  await controls.getByLabel("Approval profile ref").fill("tenant.payroll.approval.phase5p.v1");
  await controls.getByLabel("Approval comment").fill("Approved for output artifact certification.");
  const approved = await submitAndCapture<{ review: { status: string } }>(page, new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/approve$`), "POST", async () => {
    await controls.getByRole("button", { name: "Approve review" }).click();
  });
  expect(approved.ok, `Payroll review approve failed with ${approved.status}: ${JSON.stringify(approved.payload)}`).toBeTruthy();

  const locked = await submitAndCapture<{ review: { status: string } }>(page, new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/lock$`), "POST", async () => {
    await controls.getByRole("button", { name: "Final lock" }).click();
  });
  expect(locked.ok, `Payroll review lock failed with ${locked.status}: ${JSON.stringify(locked.payload)}`).toBeTruthy();

  await controls.getByLabel("Output profile ref").fill(options.outputProfileRef ?? "tenant.payroll.outputs.phase5p.v1");
  const outputs = await submitAndCapture<{
    output_batch: { id: string; status: string; artifact_count: number; payslip_count: number; register_count: number };
    artifacts: Array<{ id: string; kind: string; status: string; employee_code: string | null }>;
  }>(page, new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/generate-outputs$`), "POST", async () => {
    await controls.getByRole("button", { name: "Generate outputs" }).click();
  });
  expect(outputs.ok, `Payroll output generation failed with ${outputs.status}: ${JSON.stringify(outputs.payload)}`).toBeTruthy();
  expect(outputs.payload.output_batch.artifact_count).toBeGreaterThanOrEqual(2);

  return {
    batchId: outputs.payload.output_batch.id,
    payslipId: outputs.payload.artifacts.find((artifact) => (
      artifact.kind === "payslip" &&
      (!options.expectedEmployeeCode || artifact.employee_code === options.expectedEmployeeCode)
    ))?.id ?? "",
    registerId: outputs.payload.artifacts.find((artifact) => artifact.kind === "register")?.id ?? "",
    employeeCode: outputs.payload.artifacts.find((artifact) => artifact.kind === "payslip")?.employee_code ?? "",
    payslipIds: outputs.payload.artifacts.filter((artifact) => artifact.kind === "payslip").map((artifact) => artifact.id),
    runCode,
  };
}

test.describe("Phase 5P payroll output artifact certification", () => {
  test("outputs publish, metadata, downloads, access audit, pagination, and ESS scope are certified", async ({ page }) => {
    test.setTimeout(6 * 60 * 1000);
    const essEmployee = await getSignedInEssEmployee(page);
    const payrollOperator = await createPayrollLifecycleOperator(page);
    const setup = await createLockedReview(page, payrollOperator, {
      employeeId: essEmployee.id,
      employeeOptionText: essEmployee.employeeOptionText,
      expectedEmployeeCode: essEmployee.employeeCode || undefined,
    });
    expect(setup.payslipId).toBeTruthy();
    expect(setup.registerId).toBeTruthy();

    await gotoAuthenticated(page, `/hr-admin/payroll-outputs?batchId=${setup.batchId}&artifactId=${setup.payslipId}&batchPageSize=1&artifactPageSize=1`, payrollOperator);
    await expectPageReady(page, "Payroll Outputs");
    await expect(page.getByRole("heading", { name: "Output controls" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Artifact register" })).toBeVisible();
    await expect(page.getByText("Available after publish")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Output batches" })).toBeVisible();
    await expect(page.locator(".pagination-bar__summary").filter({ hasText: "Page 1" })).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Next" }).first()).toBeVisible();
    await expect(page.locator(".payroll-output-card.is-selected")).toContainText(setup.runCode);
    await expect(page.locator(".payroll-output-artifact-table tr.is-selected")).toContainText(setup.employeeCode || "Payslip");
    await expect(page.locator("aside[aria-label$='output artifact']")).toContainText("Storage governance");
    await expect(page.locator("aside[aria-label$='output artifact']")).toContainText("Access governance");
    await expect(page.locator("aside[aria-label$='output artifact']")).toContainText("Register reconciliation");
    await expect(page.locator("aside[aria-label$='output artifact']")).toContainText("Payslip totals match the payroll register");
    await expect(page.locator("aside[aria-label$='output artifact']")).toContainText("tenant.payroll.outputs.phase5p.v1");

    const controls = page.getByLabel("Output controls");
    await expect(controls.getByRole("button", { name: "Publish outputs" })).toBeEnabled();
    await expect(controls.getByRole("button", { name: "Generate handoff" })).toBeDisabled();
    await expect(controls).toContainText(/publish outputs before finance handoff/i);
    const published = await submitAndCapture<{
      output_batch: { status: string; published_artifact_count: number };
      artifacts: Array<{ id: string; status: string }>;
    }>(page, new RegExp(`/api/hr-admin/payroll-output-batches/${setup.batchId}/publish$`), "POST", async () => {
      await controls.getByRole("button", { name: "Publish outputs" }).click();
    });
    expect(published.ok).toBeTruthy();
    expect(published.payload.output_batch.status).toBe("published");
    expect(published.payload.output_batch.published_artifact_count).toBeGreaterThanOrEqual(2);
    await expect(page.getByRole("status").first()).toContainText("Payroll outputs published.");

    await gotoAuthenticated(page, `/hr-admin/payroll-outputs?batchId=${setup.batchId}&artifactId=${setup.payslipId}&batchPageSize=1&artifactPageSize=1`, payrollOperator);
    await expectPageReady(page, "Payroll Outputs");
    await expect(page.getByLabel("Output controls").getByRole("button", { name: "Publish outputs" })).toBeDisabled();
    await expect(page.getByLabel("Output controls").getByRole("button", { name: "Generate handoff" })).toBeEnabled();
    const downloadLink = page.getByRole("link", { name: "Download file" }).first();
    await expect(downloadLink).toHaveAttribute("href", new RegExp(`/api/hr-admin/payroll-output-artifacts/${setup.payslipId}/download`));
    const download = await page.request.get(`/api/hr-admin/payroll-output-artifacts/${setup.payslipId}/download`);
    expect(download.status()).toBe(200);
    expect(download.headers()["content-disposition"] ?? "").toContain("attachment");
    expect(download.headers()["x-payroll-artifact-checksum"]).toBeTruthy();
    expect(download.headers()["x-payroll-storage-key"]).toBeTruthy();
    expect(download.headers()["x-payroll-storage-provider"]).toBeTruthy();
    expect(download.headers()["x-payroll-storage-version"]).toBeTruthy();
    expect(download.headers()["x-payroll-download-strategy"]).toBeTruthy();
    expect(download.headers()["x-payroll-retention-policy"]).toBeTruthy();
    expect((await download.body()).length).toBeGreaterThan(0);

    const auditExport = await page.request.get(`/api/hr-admin/payroll-output-artifacts/${setup.payslipId}/access-audit-export`);
    expect(auditExport.status()).toBe(200);
    expect(auditExport.headers()["content-type"]).toContain("text/csv");
    const auditCsv = await auditExport.text();
    expect(auditCsv).toContain("row_type,artifact_id,artifact_key");
    expect(auditCsv).toContain("downloaded");

    await gotoAuthenticated(page, `/hr-admin/payroll-outputs?batchId=${setup.batchId}&artifactId=${setup.registerId}`, payrollOperator);
    await expectPageReady(page, "Payroll Outputs");
    await expect(page.locator(".payroll-output-artifact-table tr.is-selected")).toContainText(/register/i);
    const registerDownload = await page.request.get(`/api/hr-admin/payroll-output-artifacts/${setup.registerId}/download`);
    expect(registerDownload.status()).toBe(200);
    expect(registerDownload.headers()["x-payroll-artifact-checksum"]).toBeTruthy();

    await gotoAuthenticated(page, `/ess/payslips?q=${setup.runCode}`, employee);
    await expectPageReady(page, "Payslips");
    await expect(page.locator(".ess-payslip-table tr.is-selected")).toContainText(setup.runCode);
    await page.getByRole("button", { name: "Review payslip" }).first().click();
    await expect(page.getByRole("dialog", { name: /Payslip detail/ })).toContainText("Storage governance");
    await expect(page.getByRole("link", { name: "Download payslip" }).first()).toHaveAttribute("href", new RegExp(`/api/me/payroll-payslips/${setup.payslipId}/download`));
    const essDownload = await page.request.get(`/api/me/payroll-payslips/${setup.payslipId}/download`);
    expect(essDownload.status()).toBe(200);
    expect(essDownload.headers()["x-payroll-artifact-checksum"]).toBeTruthy();
    const registerFromEss = await page.request.get(`/api/me/payroll-payslips/${setup.registerId}/download`);
    expect(registerFromEss.status()).toBe(404);
    const hrRouteFromEss = await page.request.get(`/api/hr-admin/payroll-output-artifacts/${setup.payslipId}/download`);
    expect([403, 404]).toContain(hrRouteFromEss.status());
    await expectNoHorizontalOverflow(page);
  });

  test("PDF payslip output carries tax-sheet evidence in HR and ESS browser flows", async ({ page }) => {
    test.setTimeout(6 * 60 * 1000);
    const essEmployee = await getSignedInEssEmployee(page);
    const suffix = String(Date.now()).slice(-10);
    const noTaxEmployee = await createDisposablePayrollEmployee(page, suffix, "NO");
    const oldRegimeEmployee = await createDisposablePayrollEmployee(page, suffix, "OLD");

    const payrollOperator = await createPayrollLifecycleOperator(page);
    const outputProfileRef = "tenant.payroll.outputs.pdf-tax-sheet.v1";
    const setup = await createLockedReview(page, payrollOperator, {
      employeeId: essEmployee.id,
      employeeOptionText: essEmployee.employeeOptionText,
      expectedEmployeeCode: essEmployee.employeeCode || undefined,
      additionalEmployees: [
        { id: noTaxEmployee.id, employeeCode: noTaxEmployee.employeeCode },
        { id: oldRegimeEmployee.id, employeeCode: oldRegimeEmployee.employeeCode },
      ],
      outputProfileRef,
      runConfigSnapshot: {
        profile_ref: "tenant.payroll.run.pdf-tax-sheet.v1",
        output_profile: {
          output_profile_ref: outputProfileRef,
          payslip_template_ref: "tenant.payslip.pdf.tax-sheet.v1",
          mime_types: { payslip: "application/pdf" },
          tax_sheet_profile: { enabled: true, country: "IN" },
          tax_regime: "new_regime",
          taxable_earnings: "900000.00",
          taxable_deductions: "150000.00",
          projected_annual_tax: "120000.00",
          remaining_annual_tax: "75000.00",
          proof_status_summary: { verified: 1, pending: 0, rejected: 0 },
          per_employee_tax_sheet_profiles: {
            [noTaxEmployee.employeeCode]: {
              tax_sheet_profile: null,
              tax_regime: "new_regime",
              taxable_earnings: "0.00",
              proof_status_summary: { verified: 0, pending: 0, rejected: 0 },
            },
            [oldRegimeEmployee.employeeCode]: {
              tax_sheet_profile: { enabled: true, country: "IN" },
              tax_regime: "old_regime",
              taxable_earnings: "500000.00",
              taxable_deductions: "150000.00",
              projected_annual_tax: "60000.00",
              remaining_annual_tax: "60000.00",
              proof_status_summary: { verified: 2, pending: 0, rejected: 0 },
            },
          },
        },
      },
    });
    expect(setup.payslipId).toBeTruthy();
    expect(setup.payslipIds.length).toBeGreaterThanOrEqual(3);

    await gotoAuthenticated(page, `/hr-admin/payroll-outputs?batchId=${setup.batchId}&artifactId=${setup.payslipId}`, payrollOperator);
    await expectPageReady(page, "Payroll Outputs");
    const controls = page.getByLabel("Output controls");
    const published = await submitAndCapture<{ output_batch: { status: string } }>(
      page,
      new RegExp(`/api/hr-admin/payroll-output-batches/${setup.batchId}/publish$`),
      "POST",
      async () => {
        await controls.getByRole("button", { name: "Publish outputs" }).click();
      },
    );
    expect(published.ok).toBeTruthy();

    await gotoAuthenticated(page, `/hr-admin/payroll-outputs?batchId=${setup.batchId}&artifactId=${setup.payslipId}`, payrollOperator);
    await expectPageReady(page, "Payroll Outputs");
    const detail = page.locator("aside[aria-label$='output artifact']");
    await expect(detail).toContainText("Payslip PDF readiness");
    await expect(detail).toContainText("Register reconciliation");
    await expect(detail).toContainText("Payslip totals match the payroll register");
    await expect(detail).toContainText("tenant.payslip.pdf.tax-sheet.v1");
    await expect(detail).toContainText("Tax sheet");
    await expect(detail).toContainText("Included");
    await expect(detail).toContainText("new_regime");
    await expect(detail).toContainText("Tax readiness");
    await expect(detail).toContainText("Taxable earnings");
    await expect(detail).toContainText("900000.00");
    await expect(detail).toContainText(/Tax readiness(Ready|Warning)/);
    const detailText = await detail.textContent();
    if (detailText?.includes("Tax warning")) {
      await expect(detail).toContainText("No current-period tax line was attached.");
    } else {
      await expect(detail).toContainText("Source hashes");
    }

    const hrDownload = await page.request.get(`/api/hr-admin/payroll-output-artifacts/${setup.payslipId}/download`);
    expect(hrDownload.status()).toBe(200);
    expect(hrDownload.headers()["content-type"]).toContain("application/pdf");
    expect(hrDownload.headers()["content-disposition"] ?? "").toContain(".pdf");
    const hrPdf = await hrDownload.text();
    expect(hrPdf).toContain("%PDF-1.4");
    expect(hrPdf).toContain("PAYSLIP");
    expect(hrPdf).toContain("Employee details");
    expect(hrPdf).toContain("Net pay summary");
    expect(hrPdf).toContain("Tax sheet");
    expect(hrPdf).toContain("Tax regime: new_regime");
    expect(hrPdf).toContain("Taxable earnings: 900000.00");
    expect(hrPdf).toContain("Readiness:");

    await gotoAuthenticated(page, `/ess/payslips?q=${setup.runCode}`, employee);
    await expectPageReady(page, "Payslips");
    await page.getByRole("button", { name: "Review payslip" }).first().click();
    const dialog = page.getByRole("dialog", { name: /Payslip detail/ });
    await expect(dialog).toContainText("Tax sheet");
    await expect(dialog).toContainText("Taxable earnings");
    await expect(dialog).toContainText("Readiness");
    await expect(dialog).toContainText(/Ready|Warning/);
    await expect(dialog).toContainText("PDF readiness");
    await expect(dialog).toContainText("Attached");
    await expect(dialog.getByRole("link", { name: "Download payslip" })).toHaveAttribute("href", new RegExp(`/api/me/payroll-payslips/${setup.payslipId}/download`));
    const essDownload = await page.request.get(`/api/me/payroll-payslips/${setup.payslipId}/download`);
    expect(essDownload.status()).toBe(200);
    expect(essDownload.headers()["content-type"]).toContain("application/pdf");
    const essPdf = await essDownload.text();
    expect(essPdf).toContain("PAYSLIP");
    expect(essPdf).toContain("Tax sheet");

    await gotoAuthenticated(page, `/hr-admin/reports/tds-efile-readiness`, hrAdmin);
    await expectPageReady(page, "TDS E-file Readiness");
    const tdsReport = page.getByTestId("tds-efile-readiness-report");
    await tdsReport.getByLabel("Search gates").fill(setup.runCode);
    const payslipTaxRow = tdsReport.getByRole("row").filter({ hasText: "Payslip tax-sheet evidence" });
    await expect(payslipTaxRow).toContainText(setup.runCode);
    await expect(payslipTaxRow).toContainText(/ready|warning/i);
    await expect(payslipTaxRow).toContainText("1 not applicable");
    await expect(payslipTaxRow).toContainText(/published payslips with tax sheets/i);
    await expectNoHorizontalOverflow(page);
  });

  test("published outputs generate finance handoff with provider terminal evidence, audit pack, and pagination evidence", async ({ page }) => {
    test.setTimeout(6 * 60 * 1000);
    const essEmployee = await getSignedInEssEmployee(page);
    const payrollOperator = await createPayrollLifecycleOperator(page);
    const setup = await createLockedReview(page, payrollOperator, {
      employeeId: essEmployee.id,
      employeeOptionText: essEmployee.employeeOptionText,
      expectedEmployeeCode: essEmployee.employeeCode || undefined,
    });
    expect(setup.payslipId).toBeTruthy();

    await gotoAuthenticated(page, `/hr-admin/payroll-outputs?batchId=${setup.batchId}`, payrollOperator);
    await expectPageReady(page, "Payroll Outputs");
    const outputControls = page.getByLabel("Output controls");
    const published = await submitAndCapture<{ output_batch: { status: string } }>(
      page,
      new RegExp(`/api/hr-admin/payroll-output-batches/${setup.batchId}/publish$`),
      "POST",
      async () => {
        await outputControls.getByRole("button", { name: "Publish outputs" }).click();
      },
    );
    expect(published.ok).toBeTruthy();

    await outputControls.getByLabel("Handoff profile ref").fill("tenant.payroll.handoff.phase5q.v1");
    const handoff = await submitAndCapture<{ handoff: { id: string; status: string }; artifacts: Array<{ id: string; kind: string }> }>(
      page,
      new RegExp(`/api/hr-admin/payroll-output-batches/${setup.batchId}/generate-finance-handoff$`),
      "POST",
      async () => {
        await outputControls.getByRole("button", { name: "Generate handoff" }).click();
      },
    );
    expect(handoff.ok).toBeTruthy();
    expect(handoff.payload.handoff.status).toBe("generated");
    await expect(page.getByRole("status").first()).toContainText("Payroll finance handoff generated.");

    await gotoAuthenticated(page, `/hr-admin/payroll-handoff?handoffId=${handoff.payload.handoff.id}&handoffPageSize=1&artifactPageSize=1`, payrollOperator);
    await expectPageReady(page, "Payroll Handoff");
    expect(await page.locator(".pagination-bar__summary").filter({ hasText: "Page 1" }).count()).toBeGreaterThanOrEqual(2);
    await expect(page.locator(".payroll-handoff-card.is-selected")).toContainText(setup.runCode);
    await expect(page.getByRole("heading", { name: "Handoff controls" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Finance artifacts" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Configurable finance routing" })).toBeVisible();
    await expect(page.locator("aside[aria-label$='finance artifact']")).toContainText("Storage governance");

    const handoffControls = page.getByLabel("Handoff controls");
    const transmitted = await submitAndCapture<{ handoff: { status: string }; deliveries: Array<{ id: string; output_artifact_id: string }> }>(
      page,
      new RegExp(`/api/hr-admin/payroll-finance-handoffs/${handoff.payload.handoff.id}/transmit$`),
      "POST",
      async () => {
        await handoffControls.getByRole("button", { name: "Transmit handoff" }).click();
      },
    );
    expect(transmitted.ok).toBeTruthy();
    expect(["transmitted", "failed"]).toContain(transmitted.payload.handoff.status);
    await expect(page.getByRole("status").first()).toContainText(/Payroll finance handoff (transmitted|failed)/);

    if (transmitted.payload.handoff.status === "transmitted") {
      await handoffControls.getByLabel("Acknowledgement profile ref").fill("tenant.payroll.ack.phase5q.v1");
      const acknowledged = await submitAndCapture<{ handoff: { status: string } }>(
        page,
        new RegExp(`/api/hr-admin/payroll-finance-handoffs/${handoff.payload.handoff.id}/acknowledge$`),
        "POST",
        async () => {
          await handoffControls.getByRole("button", { name: "Acknowledge handoff" }).click();
        },
      );
      expect(acknowledged.ok).toBeTruthy();
      expect(acknowledged.payload.handoff.status).toBe("accepted");
    }

    await handoffControls.getByLabel("Audit pack profile ref").fill("tenant.payroll.audit.phase5q.v1");
    const auditPack = await submitAndCapture<{ handoff: { id: string }; artifacts: Array<{ kind: string }> }>(
      page,
      new RegExp(`/api/hr-admin/payroll-finance-handoffs/${handoff.payload.handoff.id}/generate-audit-pack$`),
      "POST",
      async () => {
        await handoffControls.getByRole("button", { name: "Generate audit pack" }).click();
      },
    );
    expect(auditPack.ok).toBeTruthy();
    expect(auditPack.payload.artifacts.some((artifact) => artifact.kind === "provider_audit_pack")).toBe(true);

    await gotoAuthenticated(page, `/hr-admin/payroll-handoff?handoffId=${handoff.payload.handoff.id}`, payrollOperator);
    await expectPageReady(page, "Payroll Handoff");
    await expect(page.getByRole("heading", { name: "Provider audit pack" })).toBeVisible();
    await expect(page.getByRole("main")).toContainText("tenant.payroll.handoff.phase5q.v1");
    await expect(page.getByRole("main")).toContainText("tenant.payroll.audit.phase5q.v1");
    await expect(page.getByRole("heading", { name: "Delivery acknowledgements" })).toBeVisible();
    const deliveryLink = page.locator(".payroll-handoff-evidence-card").first();
    await expect(deliveryLink).toBeVisible();
    await deliveryLink.click();
    await expect(page.getByLabel("Delivery audit evidence")).toContainText("Provider delivery");
    await expectNoHorizontalOverflow(page);
  });
});
