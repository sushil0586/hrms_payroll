import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R5-C payroll adjustments report certification", () => {
  test("HR admin can certify payroll adjustment filters, pagination, export evidence, and drilldowns", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/payroll-adjustments", hrAdmin);
    await expectPageReady(page, "Payroll Adjustments Report");

    const report = page.getByTestId("payroll-adjustments-report");
    await expect(report).toBeVisible();
    for (const column of ["Employee", "Run", "Adjustment", "Amount", "Approval", "Timeline", "Evidence", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    for (const metric of ["Adjustments", "Submitted", "Approved/applied", "Total amount"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    const search = report.getByPlaceholder("Search employee, run, source, hash");
    await search.fill("no-such-payroll-adjustment-row");
    await expect(report.getByText("No payroll adjustment rows match the selected filters.")).toBeVisible();
    await search.fill("");

    for (const label of ["Payroll run", "Kind", "Direction", "Status", "Approval state", "Amount risk"]) {
      const control = report.getByLabel(label);
      const optionCount = await control.locator("option").count();
      if (optionCount > 1) {
        await control.selectOption({ index: 1 });
        await expect(report.getByText(/Showing|No payroll adjustment rows/).first()).toBeVisible();
        await control.selectOption("All");
      }
    }

    for (const sort of ["amount_desc", "effective_date", "employee", "run", "status", "risk"]) {
      await report.getByLabel("Sort").selectOption(sort);
      await expect(report.getByText(/Showing|No payroll adjustment rows/).first()).toBeVisible();
    }
    await report.getByLabel("Sort").selectOption("amount_desc");

    const filteredExportLink = report.getByRole("link", { name: "Export filtered CSV" });
    await expect(filteredExportLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/payroll-adjustments\?.*sort=amount_desc/);
    const filteredExportHref = await filteredExportLink.getAttribute("href");
    expect(filteredExportHref).toBeTruthy();
    const filteredExportResponse = await page.request.get(filteredExportHref ?? "");
    expect(filteredExportResponse.status()).toBe(200);
    expect(filteredExportResponse.headers()["content-type"]).toContain("text/csv");
    expect(filteredExportResponse.headers()["x-hrms-report-key"]).toBe("payroll-adjustments");
    expect(filteredExportResponse.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    expect(filteredExportResponse.headers()["x-hrms-source-row-count"]).toMatch(/^\d+$/);
    const filteredExportBody = await filteredExportResponse.text();
    expect(filteredExportBody).toContain("employee_code");
    expect(filteredExportBody).toContain("approval_state");
    expect(filteredExportBody).toContain("amount_risk");
    expect(filteredExportBody).toContain("source_hash");

    const manifestHref = await report.getByRole("link", { name: "Manifest" }).getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await page.request.get(manifestHref ?? "");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["content-type"]).toContain("application/json");
    expect(manifestResponse.headers()["x-hrms-report-key"]).toBe("payroll-adjustments");
    const manifest = await manifestResponse.json();
    expect(manifest.export_schema_version).toBe("hrms.report.export.manifest.v1");
    expect(manifest.source_endpoints).toContain("/hr-admin/payroll-adjustment-setup/");
    expect(manifest.evidence_columns).toContain("approval_state");
    expect(manifest.evidence_columns).toContain("amount_risk");
    expect(manifest.evidence_columns).toContain("source_hash");

    const auditResponse = await page.request.get("/api/hr-admin/reports/export-audits?report_key=payroll-adjustments");
    expect(auditResponse.status()).toBe(200);
    const auditPayload = await auditResponse.json();
    expect(auditPayload.items.length).toBeGreaterThanOrEqual(2);
    expect(auditPayload.items.some((item: { export_type: string }) => item.export_type === "csv")).toBeTruthy();
    expect(auditPayload.items.some((item: { export_type: string }) => item.export_type === "manifest")).toBeTruthy();
    expect(auditPayload.items[0].source_endpoints).toContain("/hr-admin/payroll-adjustment-setup/");

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expect(report.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(report.getByRole("button", { name: "Next" })).toBeVisible();

    const reviewLink = report.getByRole("link", { name: "Review" }).first();
    if ((await reviewLink.count()) > 0) {
      await expect(reviewLink).toHaveAttribute("href", /\/hr-admin\/payroll-adjustments\?runId=.+adjustmentId=.+/);
      await reviewLink.click();
      await expect(page).toHaveURL(/\/hr-admin\/payroll-adjustments\?runId=.+adjustmentId=.+/);
      await expectPageReady(page, "Payroll Adjustments");
      await expectNoHorizontalOverflow(page);
    } else {
      await expect(report.getByText("No payroll adjustment rows match the selected filters.")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("employee cannot access payroll adjustments report or exports", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/payroll-adjustments", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("payroll-adjustments-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();

    const csvResponse = await page.request.get("/api/hr-admin/reports/payroll-adjustments?sort=amount_desc");
    expect([401, 403]).toContain(csvResponse.status());
    const manifestResponse = await page.request.get("/api/hr-admin/reports/payroll-adjustments?sort=amount_desc&format=manifest");
    expect([401, 403]).toContain(manifestResponse.status());
  });
});
