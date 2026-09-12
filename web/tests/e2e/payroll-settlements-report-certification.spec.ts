import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R5-D payroll settlements report certification", () => {
  test("HR admin can certify payroll settlement filters, pagination, export evidence, and drilldowns", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/payroll-settlements", hrAdmin);
    await expectPageReady(page, "Payroll Settlements Report");

    const report = page.getByTestId("payroll-settlements-report");
    await expect(report).toBeVisible();
    for (const column of ["Employee", "Run", "Package", "Settlement value", "Approval", "Lines", "Evidence", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    for (const metric of ["Settlements", "Applied packages", "Net settlement", "Recoveries/taxes"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    const search = report.getByPlaceholder("Search employee, run, source, hash");
    await search.fill("no-such-payroll-settlement-row");
    await expect(report.getByText("No payroll settlement rows match the selected filters.")).toBeVisible();
    await search.fill("");

    for (const label of ["Payroll run", "Status", "Approval state", "Net amount risk", "Line kind"]) {
      const control = report.getByLabel(label);
      const optionCount = await control.locator("option").count();
      if (optionCount > 1) {
        await control.selectOption({ index: 1 });
        await expect(report.getByText(/Showing|No payroll settlement rows/).first()).toBeVisible();
        await control.selectOption("All");
      }
    }

    for (const sort of ["net_desc", "settlement_date", "employee", "run", "status", "risk"]) {
      await report.getByLabel("Sort").selectOption(sort);
      await expect(report.getByText(/Showing|No payroll settlement rows/).first()).toBeVisible();
    }
    await report.getByLabel("Sort").selectOption("net_desc");

    const filteredExportLink = report.getByRole("link", { name: "Export filtered CSV" });
    await expect(filteredExportLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/payroll-settlements\?.*sort=net_desc/);
    const filteredExportHref = await filteredExportLink.getAttribute("href");
    expect(filteredExportHref).toBeTruthy();
    const filteredExportResponse = await page.request.get(filteredExportHref ?? "");
    expect(filteredExportResponse.status()).toBe(200);
    expect(filteredExportResponse.headers()["content-type"]).toContain("text/csv");
    expect(filteredExportResponse.headers()["x-hrms-report-key"]).toBe("payroll-settlements");
    expect(filteredExportResponse.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    expect(filteredExportResponse.headers()["x-hrms-source-row-count"]).toMatch(/^\d+$/);
    const filteredExportBody = await filteredExportResponse.text();
    expect(filteredExportBody).toContain("employee_code");
    expect(filteredExportBody).toContain("approval_state");
    expect(filteredExportBody).toContain("net_amount_risk");
    expect(filteredExportBody).toContain("line_kinds");
    expect(filteredExportBody).toContain("source_hash");

    const manifestHref = await report.getByRole("link", { name: "Manifest" }).getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await page.request.get(manifestHref ?? "");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["content-type"]).toContain("application/json");
    expect(manifestResponse.headers()["x-hrms-report-key"]).toBe("payroll-settlements");
    const manifest = await manifestResponse.json();
    expect(manifest.export_schema_version).toBe("hrms.report.export.manifest.v1");
    expect(manifest.source_endpoints).toContain("/hr-admin/payroll-settlement-setup/");
    expect(manifest.evidence_columns).toContain("approval_state");
    expect(manifest.evidence_columns).toContain("net_amount_risk");
    expect(manifest.evidence_columns).toContain("source_hash");

    const auditResponse = await page.request.get("/api/hr-admin/reports/export-audits?report_key=payroll-settlements");
    expect(auditResponse.status()).toBe(200);
    const auditPayload = await auditResponse.json();
    expect(auditPayload.items.length).toBeGreaterThanOrEqual(2);
    expect(auditPayload.items.some((item: { export_type: string }) => item.export_type === "csv")).toBeTruthy();
    expect(auditPayload.items.some((item: { export_type: string }) => item.export_type === "manifest")).toBeTruthy();
    expect(auditPayload.items[0].source_endpoints).toContain("/hr-admin/payroll-settlement-setup/");

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expect(report.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(report.getByRole("button", { name: "Next" })).toBeVisible();

    const reviewLink = report.getByRole("link", { name: "Review" }).first();
    if ((await reviewLink.count()) > 0) {
      await expect(reviewLink).toHaveAttribute("href", /\/hr-admin\/payroll-settlements\?runId=.+settlementId=.+/);
      await reviewLink.click();
      await expect(page).toHaveURL(/\/hr-admin\/payroll-settlements\?runId=.+settlementId=.+/);
      await expectPageReady(page, "Payroll Settlements");
      await expectNoHorizontalOverflow(page);
    } else {
      await expect(report.getByText("No payroll settlement rows match the selected filters.")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("employee cannot access payroll settlements report or exports", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/payroll-settlements", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("payroll-settlements-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();

    const csvResponse = await page.request.get("/api/hr-admin/reports/payroll-settlements?sort=net_desc");
    expect([401, 403]).toContain(csvResponse.status());
    const manifestResponse = await page.request.get("/api/hr-admin/reports/payroll-settlements?sort=net_desc&format=manifest");
    expect([401, 403]).toContain(manifestResponse.status());
  });
});
