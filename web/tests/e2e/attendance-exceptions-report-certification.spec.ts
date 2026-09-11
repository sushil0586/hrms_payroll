import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R4-T attendance exceptions SLA report certification", () => {
  test("HR admin can certify attendance exception filters, pagination, export evidence, and drilldowns", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/attendance-exceptions", hrAdmin);
    await expectPageReady(page, "Attendance Exceptions SLA Report");

    const report = page.getByTestId("attendance-exceptions-report");
    await expect(report).toBeVisible();
    for (const column of ["Employee", "Attendance", "Correction", "SLA", "Payroll", "Evidence", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    for (const metric of ["Exception rows", "Pending review", "Overdue SLA", "Payroll impact"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    const search = report.getByPlaceholder("Search employee, reason, workflow, status");
    await search.fill("no-such-attendance-exception-row");
    await expect(report.getByText("No attendance exception rows match the selected filters.")).toBeVisible();
    await search.fill("");

    for (const label of ["Request status", "Requested status", "Current status", "SLA risk", "Payroll impact"]) {
      const control = report.getByLabel(label);
      const optionCount = await control.locator("option").count();
      if (optionCount > 1) {
        await control.selectOption({ index: 1 });
        await expect(report.getByText(/Showing|No attendance exception rows/).first()).toBeVisible();
        await control.selectOption("All");
      }
    }

    for (const sort of ["aging", "employee", "date", "status", "impact"]) {
      await report.getByLabel("Sort").selectOption(sort);
      await expect(report.getByText(/Showing|No attendance exception rows/).first()).toBeVisible();
    }
    await report.getByLabel("Sort").selectOption("aging");

    const filteredExportLink = report.getByRole("link", { name: "Export filtered CSV" });
    await expect(filteredExportLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/attendance-exceptions\?.*sort=aging/);
    const filteredExportHref = await filteredExportLink.getAttribute("href");
    expect(filteredExportHref).toBeTruthy();
    const filteredExportResponse = await page.request.get(filteredExportHref ?? "");
    expect(filteredExportResponse.status()).toBe(200);
    expect(filteredExportResponse.headers()["content-type"]).toContain("text/csv");
    expect(filteredExportResponse.headers()["x-hrms-report-key"]).toBe("attendance-exceptions");
    expect(filteredExportResponse.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    expect(filteredExportResponse.headers()["x-hrms-source-row-count"]).toMatch(/^\d+$/);
    const filteredExportBody = await filteredExportResponse.text();
    expect(filteredExportBody).toContain("employee_code");
    expect(filteredExportBody).toContain("aging_days");
    expect(filteredExportBody).toContain("sla_risk");
    expect(filteredExportBody).toContain("payroll_impact");

    const manifestHref = await report.getByRole("link", { name: "Manifest" }).getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await page.request.get(manifestHref ?? "");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["content-type"]).toContain("application/json");
    expect(manifestResponse.headers()["x-hrms-report-key"]).toBe("attendance-exceptions");
    const manifest = await manifestResponse.json();
    expect(manifest.export_schema_version).toBe("hrms.report.export.manifest.v1");
    expect(manifest.source_endpoints).toContain("/hr-admin/attendance-regularizations/");
    expect(manifest.evidence_columns).toContain("aging_days");
    expect(manifest.evidence_columns).toContain("sla_risk");
    expect(manifest.evidence_columns).toContain("payroll_impact");

    const auditResponse = await page.request.get("/api/hr-admin/reports/export-audits?report_key=attendance-exceptions");
    expect(auditResponse.status()).toBe(200);
    const auditPayload = await auditResponse.json();
    expect(auditPayload.items.length).toBeGreaterThanOrEqual(2);
    expect(auditPayload.items.some((item: { export_type: string }) => item.export_type === "csv")).toBeTruthy();
    expect(auditPayload.items.some((item: { export_type: string }) => item.export_type === "manifest")).toBeTruthy();
    expect(auditPayload.items[0].source_endpoints).toContain("/hr-admin/attendance-regularizations/");

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expect(report.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(report.getByRole("button", { name: "Next" })).toBeVisible();

    const reviewLink = report.getByRole("link", { name: "Review" }).first();
    if ((await reviewLink.count()) > 0) {
      await expect(reviewLink).toHaveAttribute("href", /\/hr-admin\/attendance-regularizations\/.+\/review/);
      await reviewLink.click();
      await expect(page).toHaveURL(/\/hr-admin\/attendance-regularizations\/.+\/review/);
      await expectNoHorizontalOverflow(page);
    } else {
      await expect(report.getByText("No attendance exception rows match the selected filters.")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("employee cannot access attendance exceptions report or exports", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/attendance-exceptions", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("attendance-exceptions-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();

    const csvResponse = await page.request.get("/api/hr-admin/reports/attendance-exceptions?sort=aging");
    expect([401, 403]).toContain(csvResponse.status());
    const manifestResponse = await page.request.get("/api/hr-admin/reports/attendance-exceptions?sort=aging&format=manifest");
    expect([401, 403]).toContain(manifestResponse.status());
  });
});
