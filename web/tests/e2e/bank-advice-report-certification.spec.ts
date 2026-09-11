import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R4-Q bank advice report certification", () => {
  test("HR admin can certify bank advice filters, pagination, export evidence, and drilldown", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/bank-advice", hrAdmin);
    await expectPageReady(page, "Bank Advice Report");

    const report = page.getByTestId("bank-advice-report");
    await expect(report).toBeVisible();
    for (const column of ["Payroll run", "Payout", "Handoff", "Provider", "Delivery", "Evidence", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    for (const metric of ["Bank advice files", "Payout value", "Submitted", "Reconciled"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric })).toBeVisible();
    }

    const search = report.getByPlaceholder("Search run, provider, file, hash");
    await search.fill("no-such-bank-advice");
    await expect(report.getByText("No bank advice rows match the selected filters.")).toBeVisible();
    await search.fill("");

    await report.getByLabel("Handoff status").selectOption({ index: 1 });
    await expect(report.getByText(/Showing|No bank advice rows/)).toBeVisible();
    await report.getByLabel("Handoff status").selectOption("All");

    await report.getByLabel("Delivery status").selectOption({ index: 1 });
    await expect(report.getByText(/Showing|No bank advice rows/)).toBeVisible();
    await report.getByLabel("Delivery status").selectOption("All");

    const providerOptions = await report.getByLabel("Provider").locator("option").count();
    if (providerOptions > 1) {
      await report.getByLabel("Provider").selectOption({ index: 1 });
      await expect(report.getByText(/Showing|No bank advice rows/)).toBeVisible();
      await report.getByLabel("Provider").selectOption("All");
    }

    await report.getByLabel("Sort").selectOption("run_name");
    await expect(report.getByText(/Showing/)).toBeVisible();
    await report.getByLabel("Sort").selectOption("delivery_status");
    await expect(report.getByText(/Showing/)).toBeVisible();

    const filteredExportLink = report.getByRole("link", { name: "Export filtered CSV" });
    await expect(filteredExportLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/bank-advice\?.*sort=delivery_status/);
    const filteredExportHref = await filteredExportLink.getAttribute("href");
    expect(filteredExportHref).toBeTruthy();
    const filteredExportResponse = await page.request.get(filteredExportHref ?? "");
    expect(filteredExportResponse.status()).toBe(200);
    expect(filteredExportResponse.headers()["content-type"]).toContain("text/csv");
    expect(filteredExportResponse.headers()["x-hrms-report-key"]).toBe("bank-advice");
    expect(filteredExportResponse.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    const filteredExportBody = await filteredExportResponse.text();
    expect(filteredExportBody).toContain("bank_advice_total");
    expect(filteredExportBody).toContain("delivery_status");
    expect(filteredExportBody).toContain("source_hash");

    const manifestHref = await report.getByRole("link", { name: "Manifest" }).getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await page.request.get(manifestHref ?? "");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["content-type"]).toContain("application/json");
    expect(manifestResponse.headers()["x-hrms-report-key"]).toBe("bank-advice");
    const manifest = await manifestResponse.json();
    expect(manifest.export_schema_version).toBe("hrms.report.export.manifest.v1");
    expect(manifest.source_endpoints).toContain("/hr-admin/payroll-finance-handoff-setup/");
    expect(manifest.evidence_columns).toContain("bank_advice_total");
    expect(manifest.evidence_columns).toContain("source_hash");

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expect(report.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(report.getByRole("button", { name: "Next" })).toBeVisible();

    const openLink = report.getByRole("link", { name: "Open" }).first();
    await expect(openLink).toHaveAttribute("href", /\/hr-admin\/payroll-handoff\?handoffId=.*artifactId=/);
    await openLink.click();
    await expect(page).toHaveURL(/\/hr-admin\/payroll-handoff\?handoffId=.*artifactId=/);
    await expectPageReady(page, "Payroll Handoff");
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access bank advice report or exports", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/bank-advice", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("bank-advice-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();

    const csvResponse = await page.request.get("/api/hr-admin/reports/bank-advice?sort=delivery_status");
    expect([401, 403]).toContain(csvResponse.status());
    const manifestResponse = await page.request.get("/api/hr-admin/reports/bank-advice?sort=delivery_status&format=manifest");
    expect([401, 403]).toContain(manifestResponse.status());
  });
});
