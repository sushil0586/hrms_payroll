import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R5-G finance handoff exceptions report certification", () => {
  test("HR admin can certify handoff exception filters, pagination, export evidence, and drilldowns", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/finance-handoff-exceptions", hrAdmin);
    await expectPageReady(page, "Finance Handoff Exceptions Report");

    const report = page.getByTestId("finance-handoff-exceptions-report");
    await expect(report).toBeVisible();
    for (const column of ["Payroll run", "Artifact", "Delivery", "Callbacks", "Retries and jobs", "Risk", "Evidence", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column, exact: true })).toBeVisible();
    }

    for (const metric of ["Handoff rows", "High risk", "Retries", "Queued jobs"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    const search = report.getByPlaceholder("Search run, provider, failure, hash");
    await search.fill("no-such-finance-handoff-exception-row");
    await expect(report.getByText("No finance handoff exception rows match the selected filters.")).toBeVisible();
    await search.fill("");

    for (const label of ["Handoff status", "Delivery status", "Provider", "Risk", "Blocker category"]) {
      const control = report.getByLabel(label, { exact: true });
      const optionCount = await control.locator("option").count();
      if (optionCount > 1) {
        await control.selectOption({ index: 1 });
        await expect(report.getByText(/Showing|No finance handoff exception rows/).first()).toBeVisible();
        await control.selectOption("All");
      }
    }

    for (const sort of ["risk", "delivery_status", "run", "retries", "jobs"]) {
      await report.getByLabel("Sort", { exact: true }).selectOption(sort);
      await expect(report.getByText(/Showing|No finance handoff exception rows/).first()).toBeVisible();
    }
    await report.getByLabel("Sort", { exact: true }).selectOption("risk");

    const filteredExportLink = report.getByRole("link", { name: "Export filtered CSV" });
    await expect(filteredExportLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/finance-handoff-exceptions\?.*sort=risk/);
    const filteredExportHref = await filteredExportLink.getAttribute("href");
    expect(filteredExportHref).toBeTruthy();
    const filteredExportResponse = await page.request.get(filteredExportHref ?? "");
    expect(filteredExportResponse.status()).toBe(200);
    expect(filteredExportResponse.headers()["content-type"]).toContain("text/csv");
    expect(filteredExportResponse.headers()["x-hrms-report-key"]).toBe("finance-handoff-exceptions");
    expect(filteredExportResponse.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    const filteredExportBody = await filteredExportResponse.text();
    expect(filteredExportBody).toContain("handoff_status");
    expect(filteredExportBody).toContain("delivery_status");
    expect(filteredExportBody).toContain("blocker_category");
    expect(filteredExportBody).toContain("handoff_risk");
    expect(filteredExportBody).toContain("audit_pack_ready");

    const manifestHref = await report.getByRole("link", { name: "Manifest" }).getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await page.request.get(manifestHref ?? "");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["content-type"]).toContain("application/json");
    expect(manifestResponse.headers()["x-hrms-report-key"]).toBe("finance-handoff-exceptions");
    const manifest = await manifestResponse.json();
    expect(manifest.source_endpoints).toContain("/hr-admin/payroll-finance-handoff-setup/");
    expect(manifest.evidence_columns).toContain("handoff_risk");
    expect(manifest.evidence_columns).toContain("blocker_category");
    expect(manifest.evidence_columns).toContain("audit_pack_ready");

    const auditResponse = await page.request.get("/api/hr-admin/reports/export-audits?report_key=finance-handoff-exceptions");
    expect(auditResponse.status()).toBe(200);
    const auditPayload = await auditResponse.json();
    expect(auditPayload.items.length).toBeGreaterThanOrEqual(2);
    expect(auditPayload.items[0].source_endpoints).toContain("/hr-admin/payroll-finance-handoff-setup/");
    expect(auditPayload.items[0].evidence_columns).toContain("handoff_risk");

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expect(report.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(report.getByRole("button", { name: "Next" })).toBeVisible();

    const openLink = report.getByRole("link", { name: "Open" }).first();
    if ((await openLink.count()) > 0) {
      await expect(openLink).toHaveAttribute("href", /\/hr-admin\/payroll-handoff\?handoffId=/);
      await openLink.click();
      await expectPageReady(page, "Payroll Handoff");
      await expectNoHorizontalOverflow(page);
    } else {
      await expect(report.getByText("No finance handoff exception rows match the selected filters.")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("employee cannot access finance handoff exceptions report or exports", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/finance-handoff-exceptions", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("finance-handoff-exceptions-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();

    const csvResponse = await page.request.get("/api/hr-admin/reports/finance-handoff-exceptions?sort=risk");
    expect([401, 403]).toContain(csvResponse.status());
    const manifestResponse = await page.request.get("/api/hr-admin/reports/finance-handoff-exceptions?sort=risk&format=manifest");
    expect([401, 403]).toContain(manifestResponse.status());
  });
});
