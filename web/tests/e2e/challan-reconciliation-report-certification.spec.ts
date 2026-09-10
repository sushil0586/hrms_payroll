import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R4-C challan reconciliation report certification", () => {
  test("HR admin can certify challan reconciliation catalog, filters, pagination, export evidence, and drilldown", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports", hrAdmin);
    await expectPageReady(page, "Reports");

    const catalog = page.getByTestId("report-catalog-workspace");
    await expect(catalog).toBeVisible();
    await catalog.getByRole("tab", { name: "Compliance" }).click();
    await catalog.getByPlaceholder("Search by report, field, or owner").fill("challan");
    await expect(catalog.getByText("Challan reconciliation report")).toBeVisible();
    await expect(catalog.getByText("challan-reconciliation")).toBeVisible();
    const catalogRow = catalog.getByRole("row").filter({ hasText: "challan-reconciliation" });
    await expect(catalogRow.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/hr-admin/reports/challan-reconciliation");
    await catalogRow.getByRole("link", { name: "Open" }).click();

    await expectPageReady(page, "Challan Reconciliation");
    const report = page.getByTestId("challan-reconciliation-report");
    await expect(report).toBeVisible();

    for (const column of ["Filing", "Period", "Due date", "Payment status", "Amount", "Registration", "Provider", "Evidence", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    for (const metric of ["Filing calendars", "Mapped challans", "Deduction amount", "Provider routes"]) {
      await expect(report.getByText(metric, { exact: true })).toBeVisible();
    }

    const search = report.getByPlaceholder("Search filing, TAN, provider, artifact, hash");
    await search.fill("no-such-challan-reconciliation-row");
    await expect(report.getByText("No challan reconciliation rows match the selected filters.")).toBeVisible();
    await search.fill("");
    await expect(report.getByText(/Showing/)).toBeVisible();

    const paymentStatus = report.getByLabel("Payment status");
    if ((await paymentStatus.locator("option").count()) > 1) {
      await paymentStatus.selectOption({ index: 1 });
      await expect(report.getByText(/Showing|No challan reconciliation rows/)).toBeVisible();
      await paymentStatus.selectOption("All");
    }

    const providerRoute = report.getByLabel("Provider route");
    if ((await providerRoute.locator("option").count()) > 1) {
      await providerRoute.selectOption({ index: 1 });
      await expect(report.getByText(/Showing|No challan reconciliation rows/)).toBeVisible();
      await providerRoute.selectOption("All");
    }

    const sort = report.getByLabel("Sort challan rows");
    await sort.selectOption("amount_desc");
    await expect(report.getByText(/Showing/)).toBeVisible();
    await sort.selectOption("provider");
    await expect(report.getByText(/Showing/)).toBeVisible();
    await sort.selectOption("status");
    await expect(report.getByText(/Showing/)).toBeVisible();

    const manifestLink = report.getByRole("link", { name: "Manifest" });
    await expect(manifestLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/challan-reconciliation\?.*sort=status.*format=manifest/);
    const manifestResponse = await page.request.get((await manifestLink.getAttribute("href")) ?? "");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["content-type"]).toContain("application/json");
    expect(manifestResponse.headers()["x-hrms-report-key"]).toBe("challan-reconciliation");
    const manifest = await manifestResponse.json();
    expect(manifest.export_schema_version).toBe("hrms.report.export.manifest.v1");
    expect(manifest.csv_checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.source_endpoints).toContain("/hr-admin/payroll-statutory-setup/");

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expect(report.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(report.getByRole("button", { name: "Next" })).toBeVisible();

    const exportLink = report.getByRole("link", { name: /^Export$/ }).first();
    if (await exportLink.isVisible().catch(() => false)) {
      await expect(report.locator("code").first()).toBeVisible();
      await expect(exportLink).toHaveAttribute("href", /\/api\/hr-admin\/payroll-output-artifacts\/.+\/download/);
      const exportHref = await exportLink.getAttribute("href");
      expect(exportHref).toBeTruthy();
      const exportResponse = await page.request.get(exportHref ?? "");
      expect(exportResponse.status()).toBe(200);
      expect(exportResponse.headers()["content-type"]).toContain("text/csv");
      expect(exportResponse.headers()["x-payroll-artifact-checksum"]).toBeTruthy();
      const exportBody = await exportResponse.text();
      expect(exportBody).toMatch(/component_code|statutory_component_code|amount/);
    } else {
      expect(await report.locator("tbody").getByText(/Pending artifact|No challan reconciliation rows/).count()).toBeGreaterThan(0);
    }

    await report.getByRole("link", { name: "Open" }).first().click();
    await expect(page).toHaveURL(/\/hr-admin\/payroll-statutory/);
    await expectPageReady(page, "Payroll Statutory");
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access challan reconciliation report", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/challan-reconciliation", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("challan-reconciliation-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();
  });
});
