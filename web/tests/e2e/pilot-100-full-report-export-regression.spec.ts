import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type ReportTarget = {
  key: string;
  heading: RegExp | string;
  route: string;
  exportRoute?: string;
  sort?: string;
  expectedEvidence?: string;
  expectedSource?: string;
};

const prefix = process.env.PLAYWRIGHT_PILOT100_PREFIX ?? "PILOT100_20260912";

const readyReportTargets: ReportTarget[] = [
  { key: "workforce", heading: /Employee Master Report/i, route: "/hr-admin/reports/workforce", exportRoute: "/api/hr-admin/reports/workforce", sort: "name", expectedEvidence: "manager_coverage_status", expectedSource: "/hr-admin/employees/" },
  { key: "document-compliance", heading: /Document Compliance Report/i, route: "/hr-admin/reports/document-compliance", exportRoute: "/api/hr-admin/reports/document-compliance", sort: "risk", expectedEvidence: "compliance_risk", expectedSource: "/hr-admin/employee-documents/" },
  { key: "lifecycle-queue", heading: /Lifecycle Queue Report/i, route: "/hr-admin/reports/lifecycle-queue", exportRoute: "/api/hr-admin/reports/lifecycle-queue", sort: "attention", expectedEvidence: "lifecycle_risk", expectedSource: "/hr-admin/lifecycle-queue/" },
  { key: "lifecycle-aging", heading: /Lifecycle Aging/i, route: "/hr-admin/reports/lifecycle-aging", exportRoute: "/api/hr-admin/reports/lifecycle-aging", sort: "overdue", expectedEvidence: "sla_risk", expectedSource: "/hr-admin/lifecycle-queue/" },
  { key: "attendance-register", heading: /Daily Attendance Register/i, route: "/hr-admin/reports/attendance-register", exportRoute: "/api/hr-admin/reports/attendance-register", sort: "date_desc", expectedEvidence: "payroll_readiness", expectedSource: "/hr-admin/attendance-records/" },
  { key: "leave-balance", heading: /Leave Balance Report/i, route: "/hr-admin/reports/leave-balance", exportRoute: "/api/hr-admin/reports/leave-balance", sort: "risk", expectedEvidence: "liability_risk", expectedSource: "/hr-admin/leave-balances/" },
  { key: "attendance-exceptions", heading: /Attendance Exceptions/i, route: "/hr-admin/reports/attendance-exceptions", exportRoute: "/api/hr-admin/reports/attendance-exceptions", sort: "aging", expectedEvidence: "payroll_impact", expectedSource: "/hr-admin/attendance-regularizations/" },
  { key: "payroll-register", heading: /Payroll Register/i, route: "/hr-admin/reports/payroll-register", exportRoute: "/api/hr-admin/reports/payroll-register", sort: "net_pay_desc", expectedEvidence: "source_hash", expectedSource: "/hr-admin/payroll-output-setup/" },
  { key: "payroll-input-exceptions", heading: /Payroll Input Exceptions Report/i, route: "/hr-admin/reports/payroll-input-exceptions", exportRoute: "/api/hr-admin/reports/payroll-input-exceptions", sort: "risk", expectedEvidence: "readiness_risk", expectedSource: "/hr-admin/payroll-input-snapshot-setup/" },
  { key: "salary-variance", heading: /Salary Variance Report/i, route: "/hr-admin/reports/salary-variance", exportRoute: "/api/hr-admin/reports/salary-variance", sort: "employee", expectedEvidence: "variance_band", expectedSource: "/hr-admin/payroll-review-setup/" },
  { key: "payroll-review-exceptions", heading: /Payroll Review Exceptions Report/i, route: "/hr-admin/reports/payroll-review-exceptions", exportRoute: "/api/hr-admin/reports/payroll-review-exceptions", sort: "risk", expectedEvidence: "review_exception_risk", expectedSource: "/hr-admin/payroll-review-setup/" },
  { key: "payroll-adjustments", heading: /Payroll Adjustments Report/i, route: "/hr-admin/reports/payroll-adjustments", exportRoute: "/api/hr-admin/reports/payroll-adjustments", sort: "amount_desc", expectedEvidence: "amount_risk", expectedSource: "/hr-admin/payroll-adjustment-setup/" },
  { key: "payroll-settlements", heading: /Payroll Settlements Report/i, route: "/hr-admin/reports/payroll-settlements", exportRoute: "/api/hr-admin/reports/payroll-settlements", sort: "net_desc", expectedEvidence: "net_amount_risk", expectedSource: "/hr-admin/payroll-settlement-setup/" },
  { key: "payroll-close-readiness", heading: /Payroll Close Readiness Report/i, route: "/hr-admin/reports/payroll-close-readiness", exportRoute: "/api/hr-admin/reports/payroll-close-readiness", sort: "risk", expectedEvidence: "close_readiness_risk", expectedSource: "/hr-admin/payroll-input-snapshot-setup/" },
  { key: "payslip-publication", heading: /Payslip Publication Report/i, route: "/hr-admin/reports/payslip-publication", exportRoute: "/api/hr-admin/reports/payslip-publication", sort: "risk", expectedEvidence: "access_risk", expectedSource: "/hr-admin/payroll-output-setup/" },
  { key: "bank-advice", heading: /Bank Advice Report/i, route: "/hr-admin/reports/bank-advice", exportRoute: "/api/hr-admin/reports/bank-advice", sort: "delivery_status", expectedEvidence: "bank_advice_total", expectedSource: "/hr-admin/payroll-finance-handoff-setup/" },
  { key: "finance-handoff-exceptions", heading: /Finance Handoff Exceptions Report/i, route: "/hr-admin/reports/finance-handoff-exceptions", exportRoute: "/api/hr-admin/reports/finance-handoff-exceptions", sort: "risk", expectedEvidence: "handoff_risk", expectedSource: "/hr-admin/payroll-finance-handoff-setup/" },
  { key: "challan-reconciliation", heading: /Challan Reconciliation/i, route: "/hr-admin/reports/challan-reconciliation", exportRoute: "/api/hr-admin/reports/challan-reconciliation", sort: "status", expectedEvidence: "filing_code", expectedSource: "/hr-admin/payroll-statutory-setup/" },
  { key: "statutory-filing-status", heading: /Statutory Filing Status/i, route: "/hr-admin/reports/statutory-filing-status", exportRoute: "/api/hr-admin/reports/statutory-filing-status", sort: "artifacts", expectedEvidence: "due_status", expectedSource: "/hr-admin/payroll-statutory-setup/" },
  { key: "provider-filing-receipts", heading: /Provider Filing Receipts/i, route: "/hr-admin/reports/provider-filing-receipts", exportRoute: "/api/hr-admin/reports/provider-filing-receipts", sort: "callbacks", expectedEvidence: "provider_ref", expectedSource: "/hr-admin/payroll-statutory-setup/" },
  { key: "statutory-deductions", heading: /Statutory Deduction Summary/i, route: "/hr-admin/reports/statutory-deductions" },
];

function exportUrl(report: ReportTarget, format?: "manifest") {
  const params = new URLSearchParams();
  if (report.sort) params.set("sort", report.sort);
  if (format) params.set("format", format);
  const query = params.toString();
  return `${report.exportRoute}${query ? `?${query}` : ""}`;
}

async function exerciseReportUi(page: Page, report: ReportTarget) {
  await gotoAuthenticated(page, report.route, hrAdmin);
  await expectPageReady(page, report.heading);

  const workspace = page.getByTestId(`${report.key}-report`);
  await expect(workspace).toBeVisible();
  await expect(workspace.locator("table").first()).toBeVisible();

  const search = workspace.getByRole("searchbox").first();
  if (await search.isVisible().catch(() => false)) {
    await search.fill("no-such-pilot-report-row");
    await expect(workspace.getByText(/No .*match|No .*rows|No .*records/i).first()).toBeVisible();
    await search.fill("");
  }

  const select = workspace.locator("select").first();
  if ((await select.count()) > 0 && (await select.locator("option").count()) > 1) {
    await select.selectOption({ index: 1 });
    await expect(workspace.getByText(/Showing|No .*match|No .*rows|No .*records/i).first()).toBeVisible();
    await select.selectOption({ index: 0 });
  }

  await expect(workspace.locator(".pagination-bar")).toBeVisible();
  await expect(workspace.getByRole("button", { name: "Previous" })).toBeVisible();
  await expect(workspace.getByRole("button", { name: "Next" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function assertCsvExport(page: Page, report: ReportTarget) {
  const response = await page.request.get(exportUrl(report));
  expect(response.status(), `${report.key} CSV should return 200`).toBe(200);
  expect(response.headers()["content-type"], `${report.key} content type`).toContain("text/csv");
  expect(response.headers()["x-hrms-report-key"]).toBe(report.key);
  expect(response.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
  expect(Number(response.headers()["x-hrms-source-row-count"])).toBeGreaterThanOrEqual(0);
  const body = await response.text();
  expect(body.split("\n")[0], `${report.key} CSV header`).toContain(",");
  if (report.key.startsWith("payroll") || ["payslip-publication", "bank-advice", "finance-handoff-exceptions"].includes(report.key)) {
    expect(body, `${report.key} should include the P100 pilot run evidence`).toContain(prefix);
  }
}

async function assertManifestExport(page: Page, report: ReportTarget) {
  const response = await page.request.get(exportUrl(report, "manifest"));
  expect(response.status(), `${report.key} manifest should return 200`).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(response.headers()["x-hrms-report-key"]).toBe(report.key);
  expect(response.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
  expect(Number(response.headers()["x-hrms-source-row-count"])).toBeGreaterThanOrEqual(0);
  const manifest = await response.json();
  expect(manifest.export_schema_version).toBe("hrms.report.export.manifest.v1");
  expect(manifest.report_key).toBe(report.key);
  expect(manifest.csv_checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(manifest.row_count).toBeGreaterThanOrEqual(0);
  if (report.expectedSource) expect(manifest.source_endpoints).toContain(report.expectedSource);
  if (report.expectedEvidence) expect(manifest.evidence_columns).toContain(report.expectedEvidence);
}

test.describe.serial("P100-10 full report and export regression certification", () => {
  test("HR admin can open every ready report and use report-page controls", async ({ page }) => {
    test.setTimeout(12 * 60 * 1000);

    await gotoAuthenticated(page, "/hr-admin/reports", hrAdmin);
    await expectPageReady(page, "Reports");
    await expect(page.getByTestId("report-catalog-workspace")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Compliance" })).toBeVisible();

    for (const report of readyReportTargets) {
      await test.step(`report UI: ${report.key}`, async () => {
        await exerciseReportUi(page, report);
      });
    }
  });

  test("HR admin can export every ready report with checksum, manifest, and audit evidence", async ({ page }) => {
    test.setTimeout(8 * 60 * 1000);

    await gotoAuthenticated(page, "/hr-admin/reports/compliance", hrAdmin);
    await expectPageReady(page, "Compliance Reports");

    const exportableReports = readyReportTargets.filter((report) => report.exportRoute);
    for (const report of exportableReports) {
      await test.step(`report export: ${report.key}`, async () => {
        await assertCsvExport(page, report);
        await assertManifestExport(page, report);
      });
    }

    const tdsPackage = await page.request.get("/api/hr-admin/reports/tds-efile-package");
    expect([200, 400], "TDS e-file package should be available or return a controlled readiness blocker").toContain(tdsPackage.status());
    if (tdsPackage.status() === 200) {
      expect(tdsPackage.headers()["content-type"]).toContain("text/csv");
      expect(tdsPackage.headers()["x-hrms-package-checksum"]).toMatch(/^[a-f0-9]{64}$/);
      expect(Number(tdsPackage.headers()["x-hrms-source-row-count"])).toBeGreaterThan(0);
      expect(await tdsPackage.text()).toContain("form_ref");
    } else {
      const blocker = await tdsPackage.json();
      expect(blocker.detail).toBe("TDS e-file package is not ready.");
      expect(blocker.blocking_reasons.length).toBeGreaterThan(0);
    }

    await gotoAuthenticated(page, "/hr-admin/reports/export-audits", hrAdmin);
    await expectPageReady(page, "Export Audit History");
    const auditWorkspace = page.getByTestId("report-export-audit-workspace");
    await expect(auditWorkspace).toBeVisible();
    await expect(auditWorkspace.locator(".pagination-bar")).toBeVisible();
    await expect(auditWorkspace.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(auditWorkspace.getByRole("button", { name: "Next" })).toBeVisible();

    for (const report of exportableReports) {
      await test.step(`export audit: ${report.key}`, async () => {
        const response = await page.request.get(`/api/hr-admin/reports/export-audits?report_key=${report.key}`);
        expect(response.status()).toBe(200);
        const payload = await response.json();
        expect(payload.items.length).toBeGreaterThanOrEqual(2);
        expect(payload.items.some((item: { export_type: string }) => item.export_type === "csv")).toBeTruthy();
        expect(payload.items.some((item: { export_type: string }) => item.export_type === "manifest")).toBeTruthy();
        if (report.expectedSource) expect(payload.items[0].source_endpoints).toContain(report.expectedSource);
        if (report.expectedEvidence) expect(payload.items[0].evidence_columns).toContain(report.expectedEvidence);
      });
    }
  });

  test("employee is blocked from all HR admin report routes and export APIs", async ({ page }) => {
    test.setTimeout(6 * 60 * 1000);

    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    for (const report of readyReportTargets) {
      await test.step(`employee route denied: ${report.key}`, async () => {
        await page.goto(report.route, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
        await expect(page.getByTestId(`${report.key}-report`)).toHaveCount(0);
        await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
      });
    }

    for (const report of readyReportTargets.filter((item) => item.exportRoute)) {
      await test.step(`employee export denied: ${report.key}`, async () => {
        const response = await page.request.get(exportUrl(report));
        expect([401, 403]).toContain(response.status());
      });
    }

    const auditResponse = await page.request.get("/api/hr-admin/reports/export-audits");
    expect([401, 403]).toContain(auditResponse.status());
    const tdsResponse = await page.request.get("/api/hr-admin/reports/tds-efile-package");
    expect([401, 403]).toContain(tdsResponse.status());
  });
});
