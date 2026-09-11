import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R3-A payroll finance report certification", () => {
  test("HR admin can certify payroll register filters, pagination, exports, and drilldown", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/payroll-register", hrAdmin);
    await expectPageReady(page, "Payroll Register Report");

    const report = page.getByTestId("payroll-register-report");
    await expect(report).toBeVisible();
    await expect(report.getByRole("columnheader", { name: "Payroll run" })).toBeVisible();
    await expect(report.getByRole("columnheader", { name: "Gross" })).toBeVisible();
    await expect(report.getByRole("columnheader", { name: "Deductions" })).toBeVisible();
    await expect(report.getByRole("columnheader", { name: "Net pay" })).toBeVisible();
    await expect(report.getByRole("columnheader", { name: "Lock and publish" })).toBeVisible();
    await expect(report.getByRole("columnheader", { name: "Evidence" })).toBeVisible();
    await expect(report.getByRole("columnheader", { name: "Actions" })).toBeVisible();

    await expect(report.locator(".metric-tile").filter({ hasText: "Register artifacts" })).toBeVisible();
    await expect(report.locator(".metric-tile").filter({ hasText: "Gross earnings" })).toBeVisible();
    await expect(report.locator(".metric-tile").filter({ hasText: "Deductions" })).toBeVisible();
    await expect(report.locator(".metric-tile").filter({ hasText: "Net pay" })).toBeVisible();

    const search = report.getByPlaceholder("Search run, file, profile, hash");
    await search.fill("no-such-payroll-register");
    await expect(report.getByText("No payroll register rows match the selected filters.")).toBeVisible();
    await search.fill("");

    await report.getByLabel("Batch status").selectOption({ index: 1 });
    expect(await report.getByText(/Showing|No payroll register rows/).count()).toBeGreaterThan(0);
    await report.getByLabel("Batch status").selectOption("All");

    await report.getByLabel("Artifact status").selectOption({ index: 1 });
    expect(await report.getByText(/Showing|No payroll register rows/).count()).toBeGreaterThan(0);
    await report.getByLabel("Artifact status").selectOption("All");

    await report.getByLabel("Sort").selectOption("run_name");
    await expect(report.getByText(/Showing/)).toBeVisible();
    await report.getByLabel("Sort").selectOption("net_pay_desc");
    await expect(report.getByText(/Showing/)).toBeVisible();

    const filteredExportLink = report.getByRole("link", { name: "Export filtered CSV" });
    await expect(filteredExportLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/payroll-register\?.*sort=net_pay_desc/);
    const filteredExportHref = await filteredExportLink.getAttribute("href");
    expect(filteredExportHref).toBeTruthy();
    const filteredExportResponse = await page.request.get(filteredExportHref ?? "");
    expect(filteredExportResponse.status()).toBe(200);
    expect(filteredExportResponse.headers()["content-type"]).toContain("text/csv");
    expect(filteredExportResponse.headers()["x-hrms-report-key"]).toBe("payroll-register");
    expect(filteredExportResponse.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    expect(filteredExportResponse.headers()["x-hrms-report-filters"]).toContain("net_pay_desc");
    const filteredExportBody = await filteredExportResponse.text();
    expect(filteredExportBody).toContain("payroll_run_name");
    expect(filteredExportBody).toContain("source_hash");

    const manifestLink = report.getByRole("link", { name: "Manifest" });
    await expect(manifestLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/payroll-register\?.*format=manifest/);
    const manifestHref = await manifestLink.getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await page.request.get(manifestHref ?? "");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["content-type"]).toContain("application/json");
    expect(manifestResponse.headers()["x-hrms-report-key"]).toBe("payroll-register");
    expect(manifestResponse.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    const manifest = await manifestResponse.json();
    expect(manifest.export_schema_version).toBe("hrms.report.export.manifest.v1");
    expect(manifest.csv_checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.source_endpoints).toContain("/hr-admin/payroll-output-setup/");
    expect(manifest.evidence_columns).toContain("checksum_sha256");
    expect(manifest.evidence_columns).toContain("source_hash");

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expect(report.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(report.getByRole("button", { name: "Next" })).toBeVisible();

    const exportLink = report.getByRole("link", { name: "Export", exact: true }).first();
    await expect(exportLink).toHaveAttribute("href", /\/api\/hr-admin\/payroll-output-artifacts\/.+\/download/);
    const exportHref = await exportLink.getAttribute("href");
    expect(exportHref).toBeTruthy();
    const exportResponse = await page.request.get(exportHref ?? "");
    expect(exportResponse.status()).toBe(200);
    expect(exportResponse.headers()["content-type"]).toContain("text/csv");
    expect(exportResponse.headers()["x-payroll-artifact-checksum"]).toBeTruthy();
    expect(await exportResponse.text()).toContain("employee_code");

    const openLink = report.getByRole("link", { name: "Open" }).first();
    await expect(openLink).toHaveAttribute("href", /\/hr-admin\/payroll-outputs\?batchId=.+artifactId=/);
    await openLink.click();
    await expect(page).toHaveURL(/\/hr-admin\/payroll-outputs\?batchId=.+artifactId=/);
    await expectPageReady(page, "Payroll Outputs");
    await expect(page.getByRole("heading", { name: /Payroll Register/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access payroll register report or register export", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/payroll-register", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("payroll-register-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();

    const csvResponse = await page.request.get("/api/hr-admin/reports/payroll-register?sort=net_pay_desc");
    expect([401, 403]).toContain(csvResponse.status());
    const manifestResponse = await page.request.get("/api/hr-admin/reports/payroll-register?sort=net_pay_desc&format=manifest");
    expect([401, 403]).toContain(manifestResponse.status());
  });
});
