import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, manager, payrollFinanceManager } from "../helpers/staging-auth";

async function expectReportExport(page: Page, path: string, contentType: RegExp) {
  const response = await page.request.get(path);
  expect(response.status(), `${path} should be readable by payroll finance manager`).toBe(200);
  expect(response.headers()["content-type"]).toMatch(contentType);
  const checksum = response.headers()["x-hrms-report-checksum"];
  if (checksum) expect(checksum).toMatch(/^[a-f0-9]{64}$/);
  return response;
}

async function expectFinanceManifest(
  page: Page,
  path: string,
  reportKey: string,
  expectedSource: string,
  expectedEvidence: string[],
) {
  const response = await expectReportExport(page, path, /application\/json/);
  const payload = await response.json();
  expect(payload.report_key).toBe(reportKey);
  expect(payload.export_schema_version).toBe("hrms.report.export.manifest.v1");
  expect(payload.source_endpoints).toContain(expectedSource);
  expect(payload.csv_checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
  for (const column of expectedEvidence) {
    expect(payload.evidence_columns).toContain(column);
  }
  return payload;
}

async function expectDeniedFinanceExport(page: Page, path: string, label: string) {
  const response = await page.request.get(path);
  expect([401, 403, 404], `${label} should fail closed`).toContain(response.status());
  const body = JSON.stringify(await response.json().catch(() => ({}))).toLowerCase();
  for (const forbidden of ["password", "secret", "token"]) {
    expect(body, `${label} should not leak ${forbidden}`).not.toContain(forbidden);
  }
}

test.describe("Finance Manager control center certification", () => {
  test("payroll finance manager can use the finance control center and export evidence", async ({ page }) => {
    await gotoAuthenticated(page, "/finance-manager", payrollFinanceManager);
    await expectPageReady(page, "Finance control center");

    await expect(page.getByRole("navigation", { name: /Payroll Finance navigation|Finance operations navigation/i })).toBeVisible();
    for (const navLabel of ["Control Center", "Payments", "Compliance", "Audit"]) {
      await expect(page.getByRole("navigation").getByText(navLabel, { exact: true })).toBeVisible();
    }

    const workspace = page.getByTestId("finance-manager-control-center");
    await expect(workspace).toBeVisible();
    for (const metric of ["Latest net pay", "Handoffs", "Bank artifacts", "Provider exceptions"]) {
      await expect(page.locator(".metric-tile__label").filter({ hasText: metric })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Close and payout priorities" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Latest handoff snapshot" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evidence coverage" })).toBeVisible();

    for (const action of ["Open manifest", "Open evidence", "Review receipts", "Open filing proof", "Inspect risk", "Open audit"]) {
      await expect(workspace.getByRole("link", { name: action }).first()).toBeVisible();
    }

    for (const linkName of ["Export bank advice", "Export filings", "Open audit history"]) {
      await expect(page.getByRole("link", { name: linkName })).toBeVisible();
    }
    for (const linkName of ["Payroll register", "Bank advice", "Challan proof", "Statutory deductions", "Exceptions"]) {
      await expect(workspace.getByRole("link", { name: linkName })).toBeVisible();
    }

    await expectReportExport(page, "/api/hr-admin/reports/bank-advice?format=csv", /text\/csv/);
    await expectReportExport(page, "/api/hr-admin/reports/statutory-filing-status?format=csv", /text\/csv/);
    const auditHistory = await page.request.get("/api/hr-admin/reports/export-audits");
    expect(auditHistory.status()).toBe(200);
    expect(auditHistory.headers()["content-type"]).toContain("application/json");
    const auditPayload = await auditHistory.json();
    expect(Array.isArray(auditPayload.items)).toBeTruthy();
    await expectFinanceManifest(
      page,
      "/api/hr-admin/reports/finance-handoff-exceptions?sort=risk&format=manifest",
      "finance-handoff-exceptions",
      "/hr-admin/payroll-finance-handoff-setup/",
      ["handoff_risk", "blocker_category", "audit_pack_ready"],
    );
    await expectFinanceManifest(
      page,
      "/api/hr-admin/reports/bank-advice?format=manifest",
      "bank-advice",
      "/hr-admin/payroll-finance-handoff-setup/",
      ["bank_advice_total", "source_hash"],
    );
    await expectFinanceManifest(
      page,
      "/api/hr-admin/reports/payroll-register?format=manifest",
      "payroll-register",
      "/hr-admin/payroll-output-setup/",
      ["checksum_sha256", "source_hash"],
    );
    await expectFinanceManifest(
      page,
      "/api/hr-admin/reports/payroll-adjustments?sort=amount_desc&format=manifest",
      "payroll-adjustments",
      "/hr-admin/payroll-adjustment-setup/",
      ["approval_state", "amount_risk", "source_hash"],
    );
    await expectFinanceManifest(
      page,
      "/api/hr-admin/reports/payroll-settlements?sort=net_desc&format=manifest",
      "payroll-settlements",
      "/hr-admin/payroll-settlement-setup/",
      ["approval_state", "net_amount_risk", "source_hash"],
    );
    await expectFinanceManifest(
      page,
      "/api/hr-admin/reports/challan-reconciliation?sort=status&format=manifest",
      "challan-reconciliation",
      "/hr-admin/payroll-statutory-setup/",
      ["provider_ref", "source_hash"],
    );
    await expectFinanceManifest(
      page,
      "/api/hr-admin/reports/statutory-filing-status?sort=artifacts&format=manifest",
      "statutory-filing-status",
      "/hr-admin/payroll-statutory-setup/",
      ["due_status", "provider_ref", "source_hash"],
    );
    await expectFinanceManifest(
      page,
      "/api/hr-admin/reports/provider-filing-receipts?sort=callbacks&format=manifest",
      "provider-filing-receipts",
      "/hr-admin/payroll-finance-handoff-setup/",
      ["provider_status", "payload_checksum_sha256", "failure_code"],
    );

    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/finance-manager", payrollFinanceManager);
    await expectPageReady(page, "Finance control center");
    await expect(page.getByTestId("finance-manager-control-center")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("employee and manager cannot access finance manager workspace or finance exports", async ({ page }) => {
    for (const [label, persona, landingPath] of [
      ["employee", employee, "/ess"],
      ["manager", manager, "/mss/approvals"],
    ] as const) {
      await gotoAuthenticated(page, landingPath, persona);
      await page.goto("/finance-manager", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      await expect(page.getByRole("heading", { name: "Finance control center" })).toHaveCount(0);
      await expectDeniedFinanceExport(page, "/api/hr-admin/reports/finance-handoff-exceptions?format=manifest", `${label} finance handoff manifest`);
      await expectDeniedFinanceExport(page, "/api/hr-admin/reports/bank-advice?format=csv", `${label} bank advice export`);
      await expectDeniedFinanceExport(page, "/api/hr-admin/reports/payroll-adjustments?format=manifest", `${label} adjustment manifest`);
      await expectDeniedFinanceExport(page, "/api/hr-admin/reports/payroll-settlements?format=manifest", `${label} settlement manifest`);
      await expectDeniedFinanceExport(page, "/api/hr-admin/reports/challan-reconciliation?format=manifest", `${label} challan manifest`);
      await expectDeniedFinanceExport(page, "/api/hr-admin/reports/statutory-filing-status?format=manifest", `${label} filing manifest`);
      await expectDeniedFinanceExport(page, "/api/hr-admin/reports/provider-filing-receipts?format=manifest", `${label} provider receipts manifest`);
    }
  });
});
