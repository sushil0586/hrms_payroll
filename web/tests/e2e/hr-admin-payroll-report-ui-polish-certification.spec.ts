import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const payrollReports = [
  {
    path: "/hr-admin/reports/payroll-register",
    heading: "Payroll Register Report",
    testId: "payroll-register-report",
    commandHeading: "Payroll register control",
    searchPlaceholder: "Search run, file, profile, hash",
    emptyCopy: "No payroll register rows match the selected filters.",
    impossibleSearch: "no-such-payroll-register-row",
  },
  {
    path: "/hr-admin/reports/payroll-input-exceptions",
    heading: "Payroll Input Exceptions Report",
    testId: "payroll-input-exceptions-report",
    commandHeading: "Input exception control",
    searchPlaceholder: "Search employee, run, issue, hash",
    emptyCopy: "No payroll input exception rows match the selected filters.",
    impossibleSearch: "no-such-payroll-input-exception-row",
  },
  {
    path: "/hr-admin/reports/bank-advice",
    heading: "Bank Advice Report",
    testId: "bank-advice-report",
    commandHeading: "Bank advice control",
    searchPlaceholder: "Search run, provider, file, hash",
    emptyCopy: "No bank advice rows match the selected filters.",
    impossibleSearch: "no-such-bank-advice-row",
  },
];

test.describe("HR Admin payroll report UI polish certification", () => {
  test("payroll report hub supports clear navigation, filtering, exports, print view, and mobile layout", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/payroll", hrAdmin);
    await expectPageReady(page, "Payroll Reports");

    const workspace = page.getByTestId("report-family-workspace");
    await expect(workspace).toBeVisible();
    await expect(workspace.getByRole("heading", { name: "Choose a certified report" })).toBeVisible();
    await expect(workspace.getByRole("link", { name: "Export audit history" })).toHaveAttribute("href", "/hr-admin/reports/export-audits");
    await expect(workspace.getByRole("button", { name: "Print workspace" })).toBeVisible();
    await expect(workspace.locator(".report-filter-panel")).toBeVisible();

    await workspace.getByLabel("Report group").selectOption("outputs");
    await expect(workspace.getByRole("heading", { name: "Bank advice" })).toBeVisible();
    await expect(workspace.getByText("Payroll input exceptions report")).toHaveCount(0);

    await workspace.getByPlaceholder("Search reports, filters, evidence...").fill("register");
    await expect(workspace.getByText("No reports match the selected filters.")).toBeVisible();
    await workspace.getByRole("button", { name: "Clear filters" }).click();
    await expect(workspace.getByRole("heading", { name: "Payroll register" })).toBeVisible();
    await expect(workspace.getByRole("heading", { name: "Bank advice" })).toBeVisible();

    await page.emulateMedia({ media: "print" });
    await expect(workspace.locator(".report-filter-panel")).toBeHidden();
    await expect(workspace.getByRole("button", { name: "Print workspace" })).toBeHidden();
    await expect(workspace.getByRole("link", { name: "Export", exact: true }).first()).toBeHidden();
    await page.emulateMedia({ media: "screen" });

    await page.setViewportSize({ width: 390, height: 820 });
    await expect(workspace.locator(".report-command-panel")).toBeVisible();
    await expect(workspace.locator(".report-filter-panel")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  for (const reportConfig of payrollReports) {
    test(`${reportConfig.heading} has stable controls, exports, empty state, print view, and mobile layout`, async ({ page }) => {
      await gotoAuthenticated(page, reportConfig.path, hrAdmin);
      await expectPageReady(page, reportConfig.heading);

      const report = page.getByTestId(reportConfig.testId);
      await expect(report).toBeVisible();
      await expect(report.getByRole("heading", { name: reportConfig.commandHeading })).toBeVisible();
      await expect(report.locator(".report-filter-panel")).toBeVisible();
      await expect(report.getByRole("link", { name: "Export filtered CSV" })).toHaveAttribute("href", /\/api\/hr-admin\/reports\//);
      await expect(report.getByRole("link", { name: "Manifest" })).toHaveAttribute("href", /format=manifest/);
      await expect(report.getByRole("button", { name: "Print report" })).toBeVisible();

      const search = report.getByPlaceholder(reportConfig.searchPlaceholder);
      await search.fill(reportConfig.impossibleSearch);
      await expect(report.getByText(reportConfig.emptyCopy)).toBeVisible();
      await report.getByRole("button", { name: "Clear filters" }).click();
      await expect(search).toHaveValue("");
      await expect(report.getByText(/Showing/)).toBeVisible();

      await page.emulateMedia({ media: "print" });
      await expect(report.locator(".report-filter-panel")).toBeHidden();
      await expect(report.getByRole("button", { name: "Print report" })).toBeHidden();
      await page.emulateMedia({ media: "screen" });

      await page.setViewportSize({ width: 390, height: 820 });
      await expect(report.locator(".report-command-panel")).toBeVisible();
      await expect(report.locator(".report-filter-panel")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
});
