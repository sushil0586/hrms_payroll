import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R4-E provider filing receipts report certification", () => {
  test("HR admin can certify provider receipt catalog, filters, pagination, evidence, and handoff drilldown", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports", hrAdmin);
    await expectPageReady(page, "Reports");

    const catalog = page.getByTestId("report-catalog-workspace");
    await expect(catalog).toBeVisible();
    await catalog.getByRole("tab", { name: "Compliance" }).click();
    await catalog.getByPlaceholder("Search by report, field, or owner").fill("provider filing");
    await expect(catalog.getByText("Provider filing receipts report")).toBeVisible();
    await expect(catalog.getByText("provider-filing-receipts")).toBeVisible();
    const catalogRow = catalog.getByRole("row").filter({ hasText: "provider-filing-receipts" });
    await expect(catalogRow.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/hr-admin/reports/provider-filing-receipts");
    await catalogRow.getByRole("link", { name: "Open" }).click();

    await expectPageReady(page, "Provider Filing Receipts");
    const report = page.getByTestId("provider-filing-receipts-report");
    await expect(report).toBeVisible();

    for (const column of ["Artifact", "Delivery", "Provider", "Receipt", "Timeline", "Callbacks", "Checksum", "Failure", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    for (const metric of ["Provider deliveries", "Acknowledged", "Callbacks", "Retries"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric })).toBeVisible();
    }

    const search = report.getByPlaceholder("Search provider, receipt, artifact, checksum, failure");
    await search.fill("no-such-provider-filing-receipt-row");
    await expect(report.getByText("No provider filing receipt rows match the selected filters.")).toBeVisible();
    await search.fill("");
    await expect(report.getByText(/Showing/)).toBeVisible();

    const deliveryStatus = report.getByLabel("Delivery status");
    if ((await deliveryStatus.locator("option").count()) > 1) {
      await deliveryStatus.selectOption({ index: 1 });
      await expect(report.getByText(/Showing|No provider filing receipt rows/)).toBeVisible();
      await deliveryStatus.selectOption("All");
    }

    const providerStatus = report.getByLabel("Provider status");
    if ((await providerStatus.locator("option").count()) > 1) {
      await providerStatus.selectOption({ index: 1 });
      await expect(report.getByText(/Showing|No provider filing receipt rows/)).toBeVisible();
      await providerStatus.selectOption("All");
    }

    const providerRoute = report.getByLabel("Provider route");
    if ((await providerRoute.locator("option").count()) > 1) {
      await providerRoute.selectOption({ index: 1 });
      await expect(report.getByText(/Showing|No provider filing receipt rows/)).toBeVisible();
      await providerRoute.selectOption("All");
    }

    const sort = report.getByLabel("Sort receipt rows");
    await sort.selectOption("provider");
    await expect(report.getByText(/Showing/)).toBeVisible();
    await sort.selectOption("status");
    await expect(report.getByText(/Showing/)).toBeVisible();
    await sort.selectOption("callbacks");
    await expect(report.getByText(/Showing/)).toBeVisible();

    const manifestLink = report.getByRole("link", { name: "Manifest" });
    await expect(manifestLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/provider-filing-receipts\?.*sort=callbacks.*format=manifest/);
    const manifestResponse = await page.request.get((await manifestLink.getAttribute("href")) ?? "");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["content-type"]).toContain("application/json");
    expect(manifestResponse.headers()["x-hrms-report-key"]).toBe("provider-filing-receipts");
    const manifest = await manifestResponse.json();
    expect(manifest.export_schema_version).toBe("hrms.report.export.manifest.v1");
    expect(manifest.csv_checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.source_endpoints).toContain("/hr-admin/payroll-finance-handoff-setup/");

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expect(report.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(report.getByRole("button", { name: "Next" })).toBeVisible();
    expect(await report.getByText(/callbacks|receipt\.pending|checksum\.pending/).count()).toBeGreaterThan(0);

    const evidenceLink = report.getByRole("link", { name: "Evidence" }).first();
    if (await evidenceLink.isVisible().catch(() => false)) {
      await expect(evidenceLink).toHaveAttribute("href", /\/hr-admin\/payroll-handoff\?.*evidence=delivery%3A/);
    }
    await report.getByRole("link", { name: "Handoff" }).first().click();
    await expect(page).toHaveURL(/\/hr-admin\/payroll-handoff/);
    await expectPageReady(page, "Payroll Handoff");
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access provider filing receipts report", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/provider-filing-receipts", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("provider-filing-receipts-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();
  });
});
