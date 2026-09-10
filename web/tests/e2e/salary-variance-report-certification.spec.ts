import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R3-B salary variance report certification", () => {
  test("HR admin can certify salary variance filters, pagination, evidence, and drilldown", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/salary-variance", hrAdmin);
    await expectPageReady(page, "Salary Variance Report");

    const report = page.getByTestId("salary-variance-report");
    await expect(report).toBeVisible();
    for (const column of ["Employee", "Payroll run", "Gross", "Deductions", "Current net", "Baseline net", "Variance", "Evidence", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    await expect(report.locator(".metric-tile").filter({ hasText: "Employees compared" })).toBeVisible();
    await expect(report.locator(".metric-tile").filter({ hasText: "Current net pay" })).toBeVisible();
    await expect(report.locator(".metric-tile").filter({ hasText: "Variance amount" })).toBeVisible();
    await expect(report.locator(".metric-tile").filter({ hasText: "Baseline pending" })).toBeVisible();

    const search = report.getByPlaceholder("Search employee, run, hash");
    await search.fill("no-such-salary-variance");
    await expect(report.getByText("No salary variance rows match the selected filters.")).toBeVisible();
    await search.fill("");

    await report.getByLabel("Variance band").selectOption("Baseline pending");
    await expect(report.getByText(/Showing|No salary variance rows/)).toBeVisible();
    await report.getByLabel("Variance band").selectOption("All");

    await report.getByLabel("Sort").selectOption("net_pay_desc");
    await expect(report.getByText(/Showing/)).toBeVisible();
    await report.getByLabel("Sort").selectOption("employee");
    await expect(report.getByText(/Showing/)).toBeVisible();

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expect(report.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(report.getByRole("button", { name: "Next" })).toBeVisible();
    await expect(report.locator("code").first()).toBeVisible();

    const openLink = report.getByRole("link", { name: "Open" }).first();
    await expect(openLink).toHaveAttribute("href", /\/hr-admin\/payroll-review/);
    await openLink.click();
    await expect(page).toHaveURL(/\/hr-admin\/payroll-review/);
    await expectPageReady(page, "Payroll Review");
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access salary variance report", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/salary-variance", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("salary-variance-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();
  });
});
