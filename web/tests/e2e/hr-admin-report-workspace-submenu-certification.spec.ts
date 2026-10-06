import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const reportWorkspaces = [
  { href: "/hr-admin/reports/hr-core", navLabel: "HR Core Reports", heading: "HR Core Reports", expectedText: "Employee master report" },
  { href: "/hr-admin/reports/attendance", navLabel: "Attendance Reports", heading: "Attendance Reports", expectedText: "Daily attendance register" },
  { href: "/hr-admin/reports/payroll", navLabel: "Payroll Reports", heading: "Payroll Reports", expectedText: "Payroll register" },
  { href: "/hr-admin/reports/compliance", navLabel: "Compliance Reports", heading: "Compliance Reports", expectedText: "Compliance summary report" },
] as const;

test.describe("HR Admin report workspace submenu certification", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  test("report catalog exposes clear report-family navigation from sidebar, cards, and report strip", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await gotoAuthenticated(page, "/hr-admin/reports", hrAdmin);
    await expectPageReady(page, "Reports");

    const sidebar = page.getByRole("navigation", { name: "HR Admin navigation" });
    await expect(sidebar.getByRole("link", { name: "Reports Catalog and search" })).toHaveAttribute("href", "/hr-admin/reports");
    for (const workspace of reportWorkspaces) {
      await expect(sidebar.getByRole("link", { name: new RegExp(`${workspace.navLabel}`) })).toHaveAttribute("href", workspace.href);
      await expect(page.getByRole("link", { name: new RegExp(workspace.navLabel) }).first()).toHaveAttribute("href", workspace.href);
    }
    await expect(sidebar.getByRole("link", { name: /Export Audits/ })).toHaveAttribute("href", "/hr-admin/reports/export-audits");

    const strip = page.getByRole("navigation", { name: "Report workspace navigation" });
    for (const label of ["Catalog", "HR Core", "Attendance", "Payroll", "Compliance", "Audit & exports"]) {
      await expect(strip.getByRole("link", { name: new RegExp(label) })).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
  });

  test("each report family opens as a focused workspace with uncluttered cards and evidence actions", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });

    for (const workspace of reportWorkspaces) {
      await gotoAuthenticated(page, workspace.href, hrAdmin);
      await expectPageReady(page, workspace.heading);
      await expect(page.getByTestId(workspace.href.endsWith("/compliance") ? "compliance-report-hub" : "report-family-workspace")).toBeVisible();
      await expect(page.getByText(workspace.expectedText).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /Open report|Open/ }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /Export audit history/ }).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("report family workspaces stay usable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/hr-admin/reports/attendance", hrAdmin);
    await expectPageReady(page, "Attendance Reports");
    await expect(page.getByTestId("report-family-workspace")).toBeVisible();
    await expect(page.getByRole("tab", { name: "All Attendance" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open report" }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
