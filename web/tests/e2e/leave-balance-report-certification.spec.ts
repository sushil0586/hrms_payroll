import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R4-S leave balance report certification", () => {
  test("HR admin can certify leave balance filters, pagination, export evidence, and drilldowns", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/leave-balance", hrAdmin);
    await expectPageReady(page, "Leave Balance Report");

    const report = page.getByTestId("leave-balance-report");
    await expect(report).toBeVisible();
    for (const column of ["Employee", "Policy", "Entitlement", "Usage", "Liability", "Risk", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    for (const metric of ["Balance rows", "Closing liability", "Reserved units", "High liability risk"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    const search = report.getByPlaceholder("Search employee, policy, leave type");
    await search.fill("no-such-leave-balance-row");
    await expect(report.getByText("No leave balance rows match the selected filters.")).toBeVisible();
    await search.fill("");

    for (const label of ["Leave policy", "Leave type", "Period year", "Liability risk"]) {
      const control = report.getByLabel(label);
      const optionCount = await control.locator("option").count();
      if (optionCount > 1) {
        await control.selectOption({ index: 1 });
        await expect(report.getByText(/Showing|No leave balance rows/).first()).toBeVisible();
        await control.selectOption("All");
      }
    }

    for (const sort of ["risk", "employee", "policy", "closing", "utilization", "reserved"]) {
      await report.getByLabel("Sort").selectOption(sort);
      await expect(report.getByText(/Showing|No leave balance rows/).first()).toBeVisible();
    }
    await report.getByLabel("Sort").selectOption("risk");

    const filteredExportLink = report.getByRole("link", { name: "Export filtered CSV" });
    await expect(filteredExportLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/leave-balance\?.*sort=risk/);
    const filteredExportHref = await filteredExportLink.getAttribute("href");
    expect(filteredExportHref).toBeTruthy();
    const filteredExportResponse = await page.request.get(filteredExportHref ?? "");
    expect(filteredExportResponse.status()).toBe(200);
    expect(filteredExportResponse.headers()["content-type"]).toContain("text/csv");
    expect(filteredExportResponse.headers()["x-hrms-report-key"]).toBe("leave-balance");
    expect(filteredExportResponse.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    expect(filteredExportResponse.headers()["x-hrms-source-row-count"]).toMatch(/^\d+$/);
    const filteredExportBody = await filteredExportResponse.text();
    expect(filteredExportBody).toContain("employee_code");
    expect(filteredExportBody).toContain("closing_balance");
    expect(filteredExportBody).toContain("available_after_reserved");
    expect(filteredExportBody).toContain("liability_risk");

    const manifestHref = await report.getByRole("link", { name: "Manifest" }).getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await page.request.get(manifestHref ?? "");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["content-type"]).toContain("application/json");
    expect(manifestResponse.headers()["x-hrms-report-key"]).toBe("leave-balance");
    const manifest = await manifestResponse.json();
    expect(manifest.export_schema_version).toBe("hrms.report.export.manifest.v1");
    expect(manifest.source_endpoints).toContain("/hr-admin/leave-balances/");
    expect(manifest.evidence_columns).toContain("available_after_reserved");
    expect(manifest.evidence_columns).toContain("utilization_percent");
    expect(manifest.evidence_columns).toContain("liability_risk");

    const auditResponse = await page.request.get("/api/hr-admin/reports/export-audits?report_key=leave-balance");
    expect(auditResponse.status()).toBe(200);
    const auditPayload = await auditResponse.json();
    expect(auditPayload.items.length).toBeGreaterThanOrEqual(2);
    expect(auditPayload.items.some((item: { export_type: string }) => item.export_type === "csv")).toBeTruthy();
    expect(auditPayload.items.some((item: { export_type: string }) => item.export_type === "manifest")).toBeTruthy();
    expect(auditPayload.items[0].source_endpoints).toContain("/hr-admin/leave-balances/");

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expect(report.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(report.getByRole("button", { name: "Next" })).toBeVisible();

    const openLink = report.getByRole("link", { name: "Open" }).first();
    if ((await openLink.count()) > 0) {
      await expect(openLink).toHaveAttribute("href", /\/hr-admin\/leave-balances\?q=/);
      await openLink.click();
      await expect(page).toHaveURL(/\/hr-admin\/leave-balances\?q=/);
      await expectNoHorizontalOverflow(page);
    } else {
      await expect(report.getByText("No leave balance rows match the selected filters.")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("employee cannot access leave balance report or exports", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/leave-balance", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("leave-balance-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();

    const csvResponse = await page.request.get("/api/hr-admin/reports/leave-balance?sort=risk");
    expect([401, 403]).toContain(csvResponse.status());
    const manifestResponse = await page.request.get("/api/hr-admin/reports/leave-balance?sort=risk&format=manifest");
    expect([401, 403]).toContain(manifestResponse.status());
  });
});
