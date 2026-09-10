import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R4-A statutory deductions report certification", () => {
  test("HR admin can certify statutory deduction filters, pagination, export evidence, and drilldown", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/statutory-deductions", hrAdmin);
    await expectPageReady(page, "Statutory Deduction Summary");

    const report = page.getByTestId("statutory-deductions-report");
    await expect(report).toBeVisible();
    for (const column of ["Component", "Employee", "Line type", "Amount", "Registration", "Provider", "Evidence", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    await expect(report.getByText("Deduction rows", { exact: true })).toBeVisible();
    await expect(report.getByText("Total amount", { exact: true })).toBeVisible();
    await expect(report.getByText("Components", { exact: true })).toBeVisible();
    await expect(report.getByText("Provider routes", { exact: true })).toBeVisible();

    const search = report.getByPlaceholder("Search component, employee, provider, hash");
    await search.fill("no-such-statutory-deduction");
    await expect(report.getByText("No statutory deduction rows match the selected filters.")).toBeVisible();
    await search.fill("");

    const statutoryType = report.getByLabel("Statutory type");
    if ((await statutoryType.locator("option").count()) > 1) {
      await statutoryType.selectOption({ index: 1 });
      await expect(report.getByText(/Showing|No statutory deduction rows/)).toBeVisible();
      await statutoryType.selectOption("All");
    }

    const providerRoute = report.getByLabel("Provider route");
    if ((await providerRoute.locator("option").count()) > 1) {
      await providerRoute.selectOption({ index: 1 });
      await expect(report.getByText(/Showing|No statutory deduction rows/)).toBeVisible();
      await providerRoute.selectOption("All");
    }

    await report.getByLabel("Sort").selectOption("component");
    await expect(report.getByText(/Showing/)).toBeVisible();
    await report.getByLabel("Sort").selectOption("provider");
    await expect(report.getByText(/Showing/)).toBeVisible();

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expect(report.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(report.getByRole("button", { name: "Next" })).toBeVisible();

    const exportLink = report.getByRole("link", { name: "Export" }).first();
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
      expect(exportBody).toMatch(/component_code|statutory_component_code/);
    } else {
      await expect(report.getByText("No statutory deduction rows match the selected filters.")).toBeVisible();
    }

    const openLink = report.getByRole("link", { name: "Open" }).first();
    if (!(await openLink.isVisible().catch(() => false))) {
      await page.getByRole("link", { name: "Statutory setup" }).click();
    } else {
      await openLink.click();
    }
    await expect(page).toHaveURL(/\/hr-admin\/payroll-statutory/);
    await expectPageReady(page, "Payroll Statutory");
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access statutory deductions report", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/statutory-deductions", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("statutory-deductions-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();
  });
});
