import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const reports = [
  {
    path: "/hr-admin/reports/workforce",
    heading: "Employee Master Report",
    testId: "workforce-report",
    commandHeading: "Employee master evidence",
    searchPlaceholder: "Search name, code, org, manager",
    emptyText: "No workforce rows match the selected filters.",
  },
  {
    path: "/hr-admin/reports/document-compliance",
    heading: "Document Compliance Report",
    testId: "document-compliance-report",
    commandHeading: "Verification and expiry evidence",
    searchPlaceholder: "Search employee, category, title, number",
    emptyText: "No document compliance rows match the selected filters.",
  },
  {
    path: "/hr-admin/reports/lifecycle-queue",
    heading: "Lifecycle Queue Report",
    testId: "lifecycle-queue-report",
    commandHeading: "Workflow workload evidence",
    searchPlaceholder: "Search employee, owner, workflow, notes",
    emptyText: "No lifecycle queue rows match the selected filters.",
  },
  {
    path: "/hr-admin/reports/lifecycle-aging",
    heading: "Lifecycle Aging and SLA Report",
    testId: "lifecycle-aging-report",
    commandHeading: "SLA aging and escalation evidence",
    searchPlaceholder: "Search employee, owner, workflow, SLA",
    emptyText: "No lifecycle aging rows match the selected filters.",
  },
] as const;

test.describe("HR Admin HR Core report UI polish certification", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  for (const reportConfig of reports) {
    test(`${reportConfig.heading} has clear controls, exports, empty state, print view, and mobile layout`, async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 900 });
      await gotoAuthenticated(page, reportConfig.path, hrAdmin);
      await expectPageReady(page, reportConfig.heading);

      const report = page.getByTestId(reportConfig.testId);
      await expect(report).toBeVisible();
      await expect(report.getByRole("heading", { name: reportConfig.commandHeading })).toBeVisible();
      await expect(report.getByRole("link", { name: "Export filtered CSV" })).toHaveAttribute("href", /\/api\/hr-admin\/reports\//);
      await expect(report.getByRole("link", { name: "Manifest" })).toHaveAttribute("href", /format=manifest/);
      await expect(report.getByRole("button", { name: "Print report" })).toBeVisible();

      await expect(report.locator(".report-filter-panel")).toBeVisible();
      await report.getByPlaceholder(reportConfig.searchPlaceholder).fill("no-row-should-match-this-hr-core-polish");
      await expect(report.getByText(reportConfig.emptyText)).toBeVisible();
      await report.getByRole("button", { name: "Clear filters" }).click();
      await expect(report.getByPlaceholder(reportConfig.searchPlaceholder)).toHaveValue("");

      await page.emulateMedia({ media: "print" });
      await expect(report.locator(".report-filter-panel")).toBeHidden();
      await expect(report.getByRole("button", { name: "Print report" })).toBeHidden();
      await page.emulateMedia({ media: "screen" });
      await expectNoHorizontalOverflow(page);

      await page.setViewportSize({ width: 390, height: 844 });
      await gotoAuthenticated(page, reportConfig.path, hrAdmin);
      await expectPageReady(page, reportConfig.heading);
      await expect(page.getByTestId(reportConfig.testId).locator(".report-command-panel")).toBeVisible();
      await expect(page.getByTestId(reportConfig.testId).locator(".report-filter-panel")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
});
