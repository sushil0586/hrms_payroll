import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R5-E payroll close readiness report certification", () => {
  test("HR admin can certify close readiness filters, pagination, export evidence, and drilldowns", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/payroll-close-readiness", hrAdmin);
    await expectPageReady(page, "Payroll Close Readiness Report");

    const report = page.getByTestId("payroll-close-readiness-report");
    await expect(report).toBeVisible();
    for (const column of ["Payroll run", "Inputs", "Review", "Pending payroll inputs", "Output", "Close readiness", "Evidence", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column, exact: true })).toBeVisible();
    }

    for (const metric of ["Payroll runs", "Ready to close", "Blocked runs", "Open blockers"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    const search = report.getByPlaceholder("Search run, blocker, action, hash");
    await search.fill("no-such-payroll-close-readiness-row");
    await expect(report.getByText("No payroll close readiness rows match the selected filters.")).toBeVisible();
    await search.fill("");

    for (const label of ["Payroll run", "Close readiness", "Risk", "Blocker category", "Output state"]) {
      const control = report.getByLabel(label, { exact: true });
      const optionCount = await control.locator("option").count();
      if (optionCount > 1) {
        await control.selectOption({ index: 1 });
        await expect(report.getByText(/Showing|No payroll close readiness rows/).first()).toBeVisible();
        await control.selectOption("All");
      }
    }

    for (const sort of ["risk", "blockers", "coverage", "run", "state"]) {
      await report.getByLabel("Sort", { exact: true }).selectOption(sort);
      await expect(report.getByText(/Showing|No payroll close readiness rows/).first()).toBeVisible();
    }
    await report.getByLabel("Sort", { exact: true }).selectOption("risk");

    const filteredExportLink = report.getByRole("link", { name: "Export filtered CSV" });
    await expect(filteredExportLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/payroll-close-readiness\?.*sort=risk/);
    const filteredExportHref = await filteredExportLink.getAttribute("href");
    expect(filteredExportHref).toBeTruthy();
    const filteredExportResponse = await page.request.get(filteredExportHref ?? "");
    expect(filteredExportResponse.status()).toBe(200);
    expect(filteredExportResponse.headers()["content-type"]).toContain("text/csv");
    expect(filteredExportResponse.headers()["x-hrms-report-key"]).toBe("payroll-close-readiness");
    expect(filteredExportResponse.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    const filteredExportBody = await filteredExportResponse.text();
    expect(filteredExportBody).toContain("payroll_run_name");
    expect(filteredExportBody).toContain("close_readiness_state");
    expect(filteredExportBody).toContain("close_readiness_risk");
    expect(filteredExportBody).toContain("source_hashes");

    const manifestHref = await report.getByRole("link", { name: "Manifest" }).getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await page.request.get(manifestHref ?? "");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["content-type"]).toContain("application/json");
    expect(manifestResponse.headers()["x-hrms-report-key"]).toBe("payroll-close-readiness");
    const manifest = await manifestResponse.json();
    expect(manifest.source_endpoints).toContain("/hr-admin/payroll-input-snapshot-setup/");
    expect(manifest.source_endpoints).toContain("/hr-admin/payroll-output-setup/");
    expect(manifest.evidence_columns).toContain("close_readiness_risk");
    expect(manifest.evidence_columns).toContain("source_hashes");

    const auditResponse = await page.request.get("/api/hr-admin/reports/export-audits?report_key=payroll-close-readiness");
    expect(auditResponse.status()).toBe(200);
    const auditPayload = await auditResponse.json();
    expect(auditPayload.items.length).toBeGreaterThanOrEqual(2);
    expect(auditPayload.items[0].source_endpoints).toContain("/hr-admin/payroll-input-snapshot-setup/");

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expect(report.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(report.getByRole("button", { name: "Next" })).toBeVisible();

    const reviewLink = report.getByRole("link", { name: "Review" }).first();
    if ((await reviewLink.count()) > 0) {
      await expect(reviewLink).toHaveAttribute("href", /\/hr-admin\/payroll-review\?runId=.+/);
      await reviewLink.click();
      await expectPageReady(page, "Payroll Review");
      await expectNoHorizontalOverflow(page);
    } else {
      await expect(report.getByText("No payroll close readiness rows match the selected filters.")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("employee cannot access payroll close readiness report or exports", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/payroll-close-readiness", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("payroll-close-readiness-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();

    const csvResponse = await page.request.get("/api/hr-admin/reports/payroll-close-readiness?sort=risk");
    expect([401, 403]).toContain(csvResponse.status());
    const manifestResponse = await page.request.get("/api/hr-admin/reports/payroll-close-readiness?sort=risk&format=manifest");
    expect([401, 403]).toContain(manifestResponse.status());
  });
});
