import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R5-F payslip publication report certification", () => {
  test("HR admin can certify payslip publication filters, pagination, export evidence, and drilldowns", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/payslip-publication", hrAdmin);
    await expectPageReady(page, "Payslip Publication Report");

    const report = page.getByTestId("payslip-publication-report");
    await expect(report).toBeVisible();
    for (const column of ["Employee", "Run", "Payslip", "Publication", "Access", "Acknowledgement", "Evidence", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column, exact: true })).toBeVisible();
    }

    for (const metric of ["Payslips", "Published", "Acknowledged", "Access risk"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    const search = report.getByPlaceholder("Search employee, run, artifact, hash");
    await search.fill("no-such-payslip-publication-row");
    await expect(report.getByText("No payslip publication rows match the selected filters.")).toBeVisible();
    await search.fill("");

    for (const label of ["Payroll run", "Publication state", "Access risk", "Artifact status", "Acknowledgement"]) {
      const control = report.getByLabel(label, { exact: true });
      const optionCount = await control.locator("option").count();
      if (optionCount > 1) {
        await control.selectOption({ index: 1 });
        await expect(report.getByText(/Showing|No payslip publication rows/).first()).toBeVisible();
        await control.selectOption("All");
      }
    }

    for (const sort of ["risk", "published_at", "employee", "run", "downloads", "acknowledgement"]) {
      await report.getByLabel("Sort", { exact: true }).selectOption(sort);
      await expect(report.getByText(/Showing|No payslip publication rows/).first()).toBeVisible();
    }
    await report.getByLabel("Sort", { exact: true }).selectOption("risk");

    const filteredExportLink = report.getByRole("link", { name: "Export filtered CSV" });
    await expect(filteredExportLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/payslip-publication\?.*sort=risk/);
    const filteredExportHref = await filteredExportLink.getAttribute("href");
    expect(filteredExportHref).toBeTruthy();
    const filteredExportResponse = await page.request.get(filteredExportHref ?? "");
    expect(filteredExportResponse.status()).toBe(200);
    expect(filteredExportResponse.headers()["content-type"]).toContain("text/csv");
    expect(filteredExportResponse.headers()["x-hrms-report-key"]).toBe("payslip-publication");
    expect(filteredExportResponse.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    const filteredExportBody = await filteredExportResponse.text();
    expect(filteredExportBody).toContain("employee_code");
    expect(filteredExportBody).toContain("publication_state");
    expect(filteredExportBody).toContain("access_risk");
    expect(filteredExportBody).toContain("source_hash");
    expect(filteredExportBody).toContain("read_acknowledgement_count");

    const manifestHref = await report.getByRole("link", { name: "Manifest" }).getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await page.request.get(manifestHref ?? "");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["content-type"]).toContain("application/json");
    expect(manifestResponse.headers()["x-hrms-report-key"]).toBe("payslip-publication");
    const manifest = await manifestResponse.json();
    expect(manifest.source_endpoints).toContain("/hr-admin/payroll-output-setup/");
    expect(manifest.evidence_columns).toContain("publication_state");
    expect(manifest.evidence_columns).toContain("access_risk");
    expect(manifest.evidence_columns).toContain("source_hash");

    const auditResponse = await page.request.get("/api/hr-admin/reports/export-audits?report_key=payslip-publication");
    expect(auditResponse.status()).toBe(200);
    const auditPayload = await auditResponse.json();
    expect(auditPayload.items.length).toBeGreaterThanOrEqual(2);
    expect(auditPayload.items[0].source_endpoints).toContain("/hr-admin/payroll-output-setup/");
    expect(auditPayload.items[0].evidence_columns).toContain("access_risk");

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expect(report.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(report.getByRole("button", { name: "Next" })).toBeVisible();

    const openLink = report.getByRole("link", { name: "Open" }).first();
    if ((await openLink.count()) > 0) {
      await expect(openLink).toHaveAttribute("href", /\/hr-admin\/payroll-outputs\?batchId=.+artifactId=/);
      await openLink.click();
      await expectPageReady(page, "Payroll Outputs");
      await expectNoHorizontalOverflow(page);
    } else {
      await expect(report.getByText("No payslip publication rows match the selected filters.")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("employee cannot access payslip publication report or exports", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/payslip-publication", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("payslip-publication-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();

    const csvResponse = await page.request.get("/api/hr-admin/reports/payslip-publication?sort=risk");
    expect([401, 403]).toContain(csvResponse.status());
    const manifestResponse = await page.request.get("/api/hr-admin/reports/payslip-publication?sort=risk&format=manifest");
    expect([401, 403]).toContain(manifestResponse.status());
  });
});
