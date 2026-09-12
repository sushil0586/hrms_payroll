import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R4-L compliance export audit history certification", () => {
  test("HR admin can create and review persisted report export audit history", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/compliance", hrAdmin);
    await expectPageReady(page, "Compliance Reports");

    const exportPaths = [
      "/api/hr-admin/reports/challan-reconciliation?sort=status",
      "/api/hr-admin/reports/challan-reconciliation?sort=status&format=manifest",
      "/api/hr-admin/reports/statutory-filing-status?sort=artifacts",
      "/api/hr-admin/reports/provider-filing-receipts?sort=callbacks&format=manifest",
      "/api/hr-admin/reports/payroll-register?sort=net_pay_desc",
      "/api/hr-admin/reports/payroll-register?sort=net_pay_desc&format=manifest",
      "/api/hr-admin/reports/salary-variance?sort=employee",
      "/api/hr-admin/reports/salary-variance?sort=employee&format=manifest",
      "/api/hr-admin/reports/bank-advice?sort=delivery_status",
      "/api/hr-admin/reports/bank-advice?sort=delivery_status&format=manifest",
      "/api/hr-admin/reports/workforce?sort=name",
      "/api/hr-admin/reports/workforce?sort=name&format=manifest",
      "/api/hr-admin/reports/document-compliance?sort=risk",
      "/api/hr-admin/reports/document-compliance?sort=risk&format=manifest",
      "/api/hr-admin/reports/lifecycle-queue?sort=attention",
      "/api/hr-admin/reports/lifecycle-queue?sort=attention&format=manifest",
      "/api/hr-admin/reports/lifecycle-aging?sort=overdue",
      "/api/hr-admin/reports/lifecycle-aging?sort=overdue&format=manifest",
      "/api/hr-admin/reports/attendance-register?sort=date_desc",
      "/api/hr-admin/reports/attendance-register?sort=date_desc&format=manifest",
      "/api/hr-admin/reports/leave-balance?sort=risk",
      "/api/hr-admin/reports/leave-balance?sort=risk&format=manifest",
      "/api/hr-admin/reports/attendance-exceptions?sort=aging",
      "/api/hr-admin/reports/attendance-exceptions?sort=aging&format=manifest",
      "/api/hr-admin/reports/payroll-input-exceptions?sort=risk",
      "/api/hr-admin/reports/payroll-input-exceptions?sort=risk&format=manifest",
      "/api/hr-admin/reports/payroll-review-exceptions?sort=risk",
      "/api/hr-admin/reports/payroll-review-exceptions?sort=risk&format=manifest",
      "/api/hr-admin/reports/payroll-adjustments?sort=amount_desc",
      "/api/hr-admin/reports/payroll-adjustments?sort=amount_desc&format=manifest",
      "/api/hr-admin/reports/payroll-settlements?sort=net_desc",
      "/api/hr-admin/reports/payroll-settlements?sort=net_desc&format=manifest",
      "/api/hr-admin/reports/payroll-close-readiness?sort=risk",
      "/api/hr-admin/reports/payroll-close-readiness?sort=risk&format=manifest",
    ];
    for (const path of exportPaths) {
      const response = await page.request.get(path);
      expect(response.status()).toBe(200);
      expect(response.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    }

    await Promise.all([
      page.waitForURL(/\/hr-admin\/reports\/export-audits/),
      page.getByRole("link", { name: "Export audit history" }).click(),
    ]);
    await expectPageReady(page, "Export Audit History");

    const workspace = page.getByTestId("report-export-audit-workspace");
    await expect(workspace).toBeVisible();
    for (const metric of ["Audit records", "CSV exports", "Manifests", "Reports"]) {
      await expect(workspace.locator(".metric-tile").filter({ hasText: metric })).toBeVisible();
    }
    for (const column of ["Generated", "Report", "Type", "Rows", "Checksum", "Filters", "Evidence", "Actor"]) {
      await expect(workspace.getByRole("columnheader", { name: column })).toBeVisible();
    }

    const searchInput = workspace.getByPlaceholder("Search report, checksum, filters, request");
    const expectedAuditReports = [
      {
        key: "challan-reconciliation",
        source: "/hr-admin/payroll-statutory-setup/",
        evidence: "filing_code",
      },
      {
        key: "provider-filing-receipts",
        source: "/hr-admin/payroll-statutory-setup/",
        evidence: "provider_ref",
      },
      {
        key: "payroll-register",
        source: "/hr-admin/payroll-output-setup/",
        evidence: "source_hash",
      },
      {
        key: "salary-variance",
        source: "/hr-admin/payroll-review-setup/",
        evidence: "variance_band",
      },
      {
        key: "bank-advice",
        source: "/hr-admin/payroll-finance-handoff-setup/",
        evidence: "bank_advice_total",
      },
      {
        key: "workforce",
        source: "/hr-admin/employees/",
        evidence: "manager_coverage_status",
      },
      {
        key: "document-compliance",
        source: "/hr-admin/employee-documents/",
        evidence: "compliance_risk",
      },
      {
        key: "lifecycle-queue",
        source: "/hr-admin/lifecycle-queue/",
        evidence: "lifecycle_risk",
      },
      {
        key: "lifecycle-aging",
        source: "/hr-admin/lifecycle-queue/",
        evidence: "sla_risk",
      },
      {
        key: "attendance-register",
        source: "/hr-admin/attendance-records/",
        evidence: "payroll_readiness",
      },
      {
        key: "leave-balance",
        source: "/hr-admin/leave-balances/",
        evidence: "liability_risk",
      },
      {
        key: "attendance-exceptions",
        source: "/hr-admin/attendance-regularizations/",
        evidence: "payroll_impact",
      },
      {
        key: "payroll-input-exceptions",
        source: "/hr-admin/payroll-input-snapshot-setup/",
        evidence: "readiness_risk",
      },
      {
        key: "payroll-review-exceptions",
        source: "/hr-admin/payroll-review-setup/",
        evidence: "review_exception_risk",
      },
      {
        key: "payroll-adjustments",
        source: "/hr-admin/payroll-adjustment-setup/",
        evidence: "amount_risk",
      },
      {
        key: "payroll-settlements",
        source: "/hr-admin/payroll-settlement-setup/",
        evidence: "net_amount_risk",
      },
      {
        key: "payroll-close-readiness",
        source: "/hr-admin/payroll-input-snapshot-setup/",
        evidence: "close_readiness_risk",
      },
    ];

    for (const report of expectedAuditReports) {
      await searchInput.fill(report.key);
      const visibleRows = workspace.locator("tbody tr");
      await expect(visibleRows.filter({ hasText: report.key }).first()).toBeVisible();
      await expect(visibleRows.filter({ hasText: report.source }).first()).toBeVisible();
      await expect(visibleRows.filter({ hasText: report.evidence }).first()).toBeVisible();
      await expect(visibleRows.locator("code").filter({ hasText: /^[a-f0-9]{20}$/ }).first()).toBeVisible();

      const auditResponse = await page.request.get(`/api/hr-admin/reports/export-audits?report_key=${report.key}`);
      expect(auditResponse.status()).toBe(200);
      const auditPayload = await auditResponse.json();
      expect(auditPayload.items.length).toBeGreaterThanOrEqual(1);
      expect(auditPayload.items[0].source_endpoints).toContain(report.source);
      expect(auditPayload.items[0].evidence_columns).toContain(report.evidence);
    }

    await searchInput.fill("");
    await expect(workspace.getByText("manifest").first()).toBeVisible();

    await workspace.getByLabel("Export type").selectOption("manifest");
    await expect(workspace.getByText("Manifest").first()).toBeVisible();
    await expect(workspace.getByText(/Showing/)).toBeVisible();

    await searchInput.fill("payroll-register");
    await workspace.getByLabel("Report key").selectOption("payroll-register");
    await expect(workspace.getByText("payroll-register").first()).toBeVisible();
    await expect(workspace.getByText("/hr-admin/payroll-output-setup/").first()).toBeVisible();
    await expect(workspace.getByText("checksum_sha256").first()).toBeVisible();
    await expect(workspace.getByText("source_hash").first()).toBeVisible();
    await expect(workspace.getByText(/Showing/)).toBeVisible();

    const payrollAuditResponse = await page.request.get("/api/hr-admin/reports/export-audits?report_key=payroll-register");
    expect(payrollAuditResponse.status()).toBe(200);
    const payrollAuditPayload = await payrollAuditResponse.json();
    expect(payrollAuditPayload.items.length).toBeGreaterThanOrEqual(2);
    expect(payrollAuditPayload.items.some((item: { export_type: string }) => item.export_type === "csv")).toBeTruthy();
    expect(payrollAuditPayload.items.some((item: { export_type: string }) => item.export_type === "manifest")).toBeTruthy();
    expect(payrollAuditPayload.items[0].source_endpoints).toContain("/hr-admin/payroll-output-setup/");

    await workspace.getByLabel("Report key").selectOption("All");
    await searchInput.fill("salary-variance");
    await workspace.getByLabel("Report key").selectOption("salary-variance");
    await expect(workspace.getByText("salary-variance").first()).toBeVisible();
    await expect(workspace.getByText("/hr-admin/payroll-review-setup/").first()).toBeVisible();
    await expect(workspace.getByText("variance_band").first()).toBeVisible();
    await expect(workspace.getByText("source_hash").first()).toBeVisible();

    const salaryVarianceAuditResponse = await page.request.get("/api/hr-admin/reports/export-audits?report_key=salary-variance");
    expect(salaryVarianceAuditResponse.status()).toBe(200);
    const salaryVarianceAuditPayload = await salaryVarianceAuditResponse.json();
    expect(salaryVarianceAuditPayload.items.length).toBeGreaterThanOrEqual(2);
    expect(salaryVarianceAuditPayload.items.some((item: { export_type: string }) => item.export_type === "csv")).toBeTruthy();
    expect(salaryVarianceAuditPayload.items.some((item: { export_type: string }) => item.export_type === "manifest")).toBeTruthy();
    expect(salaryVarianceAuditPayload.items[0].source_endpoints).toContain("/hr-admin/payroll-review-setup/");

    await workspace.getByLabel("Report key").selectOption("All");
    await searchInput.fill("bank-advice");
    await workspace.getByLabel("Report key").selectOption("bank-advice");
    await expect(workspace.getByText("bank-advice").first()).toBeVisible();
    await expect(workspace.getByText("/hr-admin/payroll-finance-handoff-setup/").first()).toBeVisible();
    await expect(workspace.getByText("bank_advice_total").first()).toBeVisible();
    await expect(workspace.getByText("source_hash").first()).toBeVisible();

    const bankAdviceAuditResponse = await page.request.get("/api/hr-admin/reports/export-audits?report_key=bank-advice");
    expect(bankAdviceAuditResponse.status()).toBe(200);
    const bankAdviceAuditPayload = await bankAdviceAuditResponse.json();
    expect(bankAdviceAuditPayload.items.length).toBeGreaterThanOrEqual(2);
    expect(bankAdviceAuditPayload.items.some((item: { export_type: string }) => item.export_type === "csv")).toBeTruthy();
    expect(bankAdviceAuditPayload.items.some((item: { export_type: string }) => item.export_type === "manifest")).toBeTruthy();
    expect(bankAdviceAuditPayload.items[0].source_endpoints).toContain("/hr-admin/payroll-finance-handoff-setup/");

    await workspace.getByLabel("Report key").selectOption("All");
    await searchInput.fill("no-such-export-audit-row");
    await expect(workspace.getByText("No export audit records match the selected filters.")).toBeVisible();
    await searchInput.fill("");
    await expect(workspace.getByText(/Showing/)).toBeVisible();

    await expect(workspace.locator(".pagination-bar")).toBeVisible();
    await expect(workspace.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(workspace.getByRole("button", { name: "Next" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot read HR admin report export audit history", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    const response = await page.request.get("/api/hr-admin/reports/export-audits");
    expect([401, 403]).toContain(response.status());
    const body = JSON.stringify(await response.json().catch(() => ({}))).toLowerCase();
    expect(body).not.toContain("token");
    expect(body).not.toContain("password");
    expect(body).not.toContain("secret");

    await page.goto("/hr-admin/reports/export-audits", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("report-export-audit-workspace")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
  });
});
