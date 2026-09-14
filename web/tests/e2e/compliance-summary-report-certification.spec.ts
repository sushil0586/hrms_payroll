import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase PLF-5F Compliance summary certification", () => {
  test("HR admin can certify consolidated compliance summary, filters, exports, hub discovery, and drilldowns", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports", hrAdmin);
    await expectPageReady(page, "Reports");

    const catalog = page.getByTestId("report-catalog-workspace");
    await catalog.getByRole("tab", { name: "Compliance" }).click();
    await catalog.getByPlaceholder("Search by report, field, or owner").fill("compliance summary");
    const catalogRow = catalog.getByRole("row").filter({ hasText: "compliance-summary" });
    await expect(catalogRow.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/hr-admin/reports/compliance-summary");

    await gotoAuthenticated(page, "/hr-admin/reports/compliance", hrAdmin);
    await expectPageReady(page, "Compliance Reports");
    const hub = page.getByTestId("compliance-report-hub");
    await hub.getByRole("tab", { name: "Summary" }).click();
    await expect(hub.getByRole("heading", { name: "Compliance summary report" })).toBeVisible();
    await hub.getByRole("tab", { name: "Return Packages" }).click();
    for (const reportName of ["TDS e-file readiness report", "PF ECR readiness report", "ESIC contribution readiness report", "Professional Tax readiness report", "LWF readiness report"]) {
      await expect(hub.getByRole("heading", { name: reportName })).toBeVisible();
    }

    await gotoAuthenticated(page, "/hr-admin/reports/compliance-summary", hrAdmin);
    await expectPageReady(page, "Compliance Summary");
    const report = page.getByTestId("compliance-summary-report");
    await expect(report).toBeVisible();

    for (const metric of ["Overall readiness", "Warnings", "Blocked areas", "Filing calendars"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric })).toBeVisible();
    }
    for (const column of ["Area", "Status", "Owner", "Signal", "Evidence", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }
    for (const area of ["TDS", "PF", "ESIC", "Professional Tax", "LWF", "Challans", "Filing status", "Provider evidence"]) {
      await expect(report.getByText(area, { exact: true })).toBeVisible();
    }

    await report.getByLabel("Search areas").fill("no-such-compliance-area");
    await expect(report.getByText("No compliance summary areas match the selected filters.")).toBeVisible();
    await report.getByLabel("Search areas").fill("");
    await report.getByLabel("Readiness status").selectOption("Blocked");
    await expect(report.locator(".report-catalog-summary").getByText(/areas/)).toBeVisible();
    await report.getByLabel("Readiness status").selectOption("All");

    const exportResponse = await page.request.get("/api/hr-admin/reports/compliance-summary");
    expect(exportResponse.status()).toBe(200);
    expect(exportResponse.headers()["x-hrms-report-key"]).toBe("compliance-summary");
    expect(exportResponse.headers()["x-hrms-package-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    const csv = await exportResponse.text();
    expect(csv).toContain("readiness_status");
    expect(csv).toContain("Professional Tax");
    expect(csv).toContain("LWF");

    const manifestResponse = await page.request.get("/api/hr-admin/reports/compliance-summary?format=manifest");
    expect(manifestResponse.status()).toBe(200);
    const manifest = await manifestResponse.json();
    expect(manifest.report_key).toBe("compliance-summary");
    expect(manifest.checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.source_row_count).toBeGreaterThanOrEqual(6);

    await expect(report.getByLabel("Compliance summary pagination")).toBeVisible();
    await report.locator("tbody tr").filter({ hasText: "Provider evidence" }).getByRole("link", { name: "Open" }).click();
    await expectPageReady(page, "Provider Filing Receipts");
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access consolidated compliance summary", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");
    await page.goto("/hr-admin/reports/compliance-summary", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("compliance-summary-report")).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: /Run payroll, compliance, and employee operations/ })).toBeVisible();
  });
});
