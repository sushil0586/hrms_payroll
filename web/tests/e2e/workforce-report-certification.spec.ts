import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady, expectSummaryMetric } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin, requestWithBrowserSession } from "../helpers/staging-auth";

test.describe("Phase R2-A workforce report certification", () => {
  test("HR admin can certify workforce filters, pagination, export evidence, and drilldowns", async ({ page }) => {
    test.setTimeout(90_000);
    await gotoAuthenticated(page, "/hr-admin/reports/workforce", hrAdmin);
    await expectPageReady(page, "Employee Master Report");

    const report = page.getByTestId("workforce-report");
    await expect(report).toBeVisible();
    for (const column of ["Employee", "Organization", "Role", "Manager", "Access", "Dates", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    for (const metric of ["Employees", "Active", "Manager coverage", "Access provisioned"]) {
      await expectSummaryMetric(report, metric);
    }

    const search = report.getByPlaceholder("Search name, code, org, manager");
    await search.fill("no-such-workforce-row");
    await expect(search).toHaveValue("no-such-workforce-row");
    await expect(report.locator(".pagination-bar")).toBeVisible();
    await search.fill("");

    await report.getByLabel("Employment status").selectOption({ index: 1 });
    await expect(report.getByText(/Showing|No workforce rows/)).toBeVisible();
    await report.getByLabel("Employment status").selectOption("All");

    const departmentOptions = await report.getByLabel("Department").locator("option").count();
    if (departmentOptions > 1) {
      await report.getByLabel("Department").selectOption({ index: 1 });
      await expect(report.getByText(/Showing|No workforce rows/)).toBeVisible();
      await report.getByLabel("Department").selectOption("All");
    }

    await report.getByLabel("Manager coverage").selectOption("managers");
    await expect(report.getByText(/Showing|No workforce rows/)).toBeVisible();
    await report.getByLabel("Manager coverage").selectOption("needs_reassignment");
    await expect(report.getByText(/Showing|No workforce rows/)).toBeVisible();
    await report.getByLabel("Manager coverage").selectOption("All");

    for (const sort of ["status", "department", "manager_coverage", "access", "name"]) {
      await report.getByLabel("Sort").selectOption(sort);
      await expect(report.getByText(/Showing/)).toBeVisible();
    }

    const filteredExportLink = report.getByRole("link", { name: "Export filtered CSV" });
    await expect(filteredExportLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/workforce\?.*sort=name/);
    const filteredExportHref = await filteredExportLink.getAttribute("href");
    expect(filteredExportHref).toBeTruthy();
    const filteredExportResponse = await requestWithBrowserSession(page, filteredExportHref ?? "");
    expect(filteredExportResponse.status).toBe(200);
    expect(filteredExportResponse.headers["content-type"]).toContain("text/csv");
    expect(filteredExportResponse.headers["x-hrms-report-key"]).toBe("workforce");
    expect(filteredExportResponse.headers["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    expect(filteredExportResponse.headers["x-hrms-source-row-count"]).toMatch(/^\d+$/);
    const filteredExportBody = filteredExportResponse.body;
    expect(filteredExportBody).toContain("employee_code");
    expect(filteredExportBody).toContain("manager_coverage_status");
    expect(filteredExportBody).toContain("access_coverage_status");

    const manifestHref = await report.getByRole("link", { name: "Manifest" }).getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await requestWithBrowserSession(page, manifestHref ?? "");
    expect(manifestResponse.status).toBe(200);
    expect(manifestResponse.headers["content-type"]).toContain("application/json");
    expect(manifestResponse.headers["x-hrms-report-key"]).toBe("workforce");
    const manifest = JSON.parse(manifestResponse.body);
    expect(manifest.export_schema_version).toBe("hrms.report.export.manifest.v1");
    expect(manifest.source_endpoints).toContain("/hr-admin/employees/");
    expect(manifest.evidence_columns).toContain("employee_code");
    expect(manifest.evidence_columns).toContain("manager_coverage_status");
    expect(manifest.evidence_columns).toContain("access_coverage_status");

    const auditResponse = await requestWithBrowserSession(page, "/api/hr-admin/reports/export-audits?report_key=workforce");
    expect(auditResponse.status).toBe(200);
    const auditPayload = JSON.parse(auditResponse.body);
    expect(auditPayload.items.length).toBeGreaterThanOrEqual(2);
    expect(auditPayload.items.some((item: { export_type: string }) => item.export_type === "csv")).toBeTruthy();
    expect(auditPayload.items.some((item: { export_type: string }) => item.export_type === "manifest")).toBeTruthy();
    expect(auditPayload.items[0].source_endpoints).toContain("/hr-admin/employees/");

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expect(report.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(report.getByRole("button", { name: "Next" })).toBeVisible();

    const openLink = report.getByRole("link", { name: "Open" }).first();
    await expect(openLink).toHaveAttribute("href", /\/hr-admin\/employees\?employeeId=/);
    await Promise.all([
      page.waitForURL(/\/hr-admin\/employees\?employeeId=/, { timeout: 30_000 }),
      openLink.click(),
    ]);
    await expectPageReady(page, "Employees");
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access workforce report or exports", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "My workspace");

    await page.goto("/hr-admin/reports/workforce", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("workforce-report")).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/hr-admin\/reports\/workforce(?:\?|$)/);

    const csvResponse = await requestWithBrowserSession(page, "/api/hr-admin/reports/workforce?sort=name");
    expect([401, 403]).toContain(csvResponse.status);
    const manifestResponse = await requestWithBrowserSession(page, "/api/hr-admin/reports/workforce?sort=name&format=manifest");
    expect([401, 403]).toContain(manifestResponse.status);
  });
});
