import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R4-D statutory filing status report certification", () => {
  test("HR admin can certify filing status catalog, filters, pagination, evidence, and drilldowns", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports", hrAdmin);
    await expectPageReady(page, "Reports");

    const catalog = page.getByTestId("report-catalog-workspace");
    await expect(catalog).toBeVisible();
    await catalog.getByRole("tab", { name: "Compliance" }).click();
    await catalog.getByPlaceholder("Search by report, field, or owner").fill("statutory filing");
    await expect(catalog.getByText("Statutory filing status report")).toBeVisible();
    await expect(catalog.getByText("statutory-filing-status")).toBeVisible();
    const catalogRow = catalog.getByRole("row").filter({ hasText: "statutory-filing-status" });
    await expect(catalogRow.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/hr-admin/reports/statutory-filing-status");
    await catalogRow.getByRole("link", { name: "Open" }).click();

    await expectPageReady(page, "Statutory Filing Status");
    const report = page.getByTestId("statutory-filing-status-report");
    await expect(report).toBeVisible();

    for (const column of ["Filing", "Frequency", "Period", "Due date", "Due status", "Registration", "Provider", "Evidence", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    for (const metric of ["Filing calendars", "Due or overdue", "Published evidence", "Provider routes"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric })).toBeVisible();
    }

    const search = report.getByPlaceholder("Search filing, TAN, provider, output profile, hash");
    await search.fill("no-such-statutory-filing-status-row");
    await expect(report.getByText("No statutory filing rows match the selected filters.")).toBeVisible();
    await search.fill("");
    await expect(report.getByText(/Showing/)).toBeVisible();

    const dueStatus = report.getByLabel("Due status");
    if ((await dueStatus.locator("option").count()) > 1) {
      await dueStatus.selectOption({ index: 1 });
      await expect(report.getByText(/Showing|No statutory filing rows/)).toBeVisible();
      await dueStatus.selectOption("All");
    }

    const providerRoute = report.getByLabel("Provider route");
    if ((await providerRoute.locator("option").count()) > 1) {
      await providerRoute.selectOption({ index: 1 });
      await expect(report.getByText(/Showing|No statutory filing rows/)).toBeVisible();
      await providerRoute.selectOption("All");
    }

    const sort = report.getByLabel("Sort filing rows");
    await sort.selectOption("filing");
    await expect(report.getByText(/Showing/)).toBeVisible();
    await sort.selectOption("provider");
    await expect(report.getByText(/Showing/)).toBeVisible();
    await sort.selectOption("artifacts");
    await expect(report.getByText(/Showing/)).toBeVisible();

    const manifestLink = report.getByRole("link", { name: "Manifest" });
    await expect(manifestLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/statutory-filing-status\?.*sort=artifacts.*format=manifest/);
    const manifestResponse = await page.request.get((await manifestLink.getAttribute("href")) ?? "");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["content-type"]).toContain("application/json");
    expect(manifestResponse.headers()["x-hrms-report-key"]).toBe("statutory-filing-status");
    const manifest = await manifestResponse.json();
    expect(manifest.export_schema_version).toBe("hrms.report.export.manifest.v1");
    expect(manifest.csv_checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.source_endpoints).toContain("/hr-admin/payroll-statutory-setup/");

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expect(report.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(report.getByRole("button", { name: "Next" })).toBeVisible();
    await expect(report.locator("code").first()).toBeVisible();
    expect(await report.getByText(/published \/|source_hash\.pending/).count()).toBeGreaterThan(0);

    await report.getByRole("link", { name: "Handoff" }).first().click();
    await expect(page).toHaveURL(/\/hr-admin\/payroll-handoff/);
    await expectPageReady(page, "Payroll Handoff");
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Statutory Filing Status");

    await page.getByTestId("statutory-filing-status-report").getByRole("link", { name: "Open" }).first().click();
    await expect(page).toHaveURL(/\/hr-admin\/payroll-statutory/);
    await expectPageReady(page, "Payroll Statutory");
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access statutory filing status report", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/statutory-filing-status", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("statutory-filing-status-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();
  });
});
