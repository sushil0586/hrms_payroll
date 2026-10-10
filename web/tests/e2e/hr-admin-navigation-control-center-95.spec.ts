import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type HrAdminNavItem = {
  href: string;
  label: string;
};

const navGroups: { title: string; items: HrAdminNavItem[] }[] = [
  {
    title: "Command",
    items: [
      { href: "/hr-admin", label: "Dashboard" },
      { href: "/hr-admin/launch-remediation", label: "Launch Readiness" },
    ],
  },
  {
    title: "Workforce",
    items: [
      { href: "/hr-admin/employees", label: "Employees" },
      { href: "/hr-admin/lifecycle", label: "Lifecycle" },
      { href: "/hr-admin/employee-documents", label: "Documents" },
    ],
  },
  {
    title: "Time & Leave",
    items: [
      { href: "/hr-admin/attendance-operations", label: "Attendance" },
      { href: "/hr-admin/leave-requests", label: "Leave" },
      { href: "/hr-admin/policies", label: "Policies" },
    ],
  },
  {
    title: "Payroll",
    items: [
      { href: "/hr-admin/payroll-readiness", label: "Payroll Control" },
      { href: "/hr-admin/payroll-setup", label: "Payroll Setup" },
      { href: "/hr-admin/salary-setup", label: "Salary Setup" },
      { href: "/hr-admin/payroll-rules", label: "Payroll Rules" },
      { href: "/hr-admin/payroll-statutory", label: "Statutory" },
      { href: "/hr-admin/payroll-providers", label: "Providers" },
      { href: "/hr-admin/payroll-adjustments", label: "Adjustments & Settlements" },
    ],
  },
  {
    title: "Compliance",
    items: [
      { href: "/hr-admin/audit", label: "Audit" },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/hr-admin/reports", label: "Reports" },
    ],
  },
  {
    title: "Setup",
    items: [
      { href: "/hr-admin/organization", label: "Organization" },
      { href: "/hr-admin/workflows", label: "Workflows" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/hr-admin/notifications-admin", label: "Notifications" },
      { href: "/hr-admin/import-history", label: "Imports" },
      { href: "/hr-admin/saas-operations", label: "Ops Health" },
    ],
  },
];

const allNavItems = navGroups.flatMap((group) => group.items);

async function openHrAdminNavGroups(page: Page) {
  await page.locator("details.nav-group").evaluateAll((groups) => {
    groups.forEach((group) => {
      group.setAttribute("open", "");
    });
  });
}

async function expectRouteHealthy(page: Page, item: HrAdminNavItem) {
  await gotoAuthenticated(page, item.href, hrAdmin);
  await expect(page).toHaveURL(new RegExp(`${item.href.replaceAll("/", "\\/")}(\\?|$)`));
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await openHrAdminNavGroups(page);

  const nav = page.getByRole("navigation", { name: /hr admin navigation/i });
  await expect(nav.getByText(item.label, { exact: true }).or(nav.getByLabel(`${item.label} unavailable`))).toBeVisible();
}

test.describe("HR Admin navigation and control center 95 certification", () => {
  test.describe.configure({ timeout: 240_000 });

  test("certifies grouped sidebar, topbar, command center, and every menu route on desktop", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/hr-admin", hrAdmin);
    await expectPageReady(page, "HR Control Center");
    await openHrAdminNavGroups(page);

    const nav = page.getByRole("navigation", { name: /hr admin navigation/i });
    await expect(nav).toBeVisible();

    for (const group of navGroups) {
      await expect(nav.getByText(group.title, { exact: true })).toBeVisible();
      for (const item of group.items) {
        const link = nav.getByRole("link", { name: new RegExp(`^${item.label}\\b`) }).first();
        const disabled = nav.getByLabel(`${item.label} unavailable`).first();

        if (await link.isVisible().catch(() => false)) {
          await expect(link).toHaveAttribute("href", item.href);
        } else {
          await expect(disabled).toBeVisible();
          await expect(disabled).toHaveAttribute("aria-disabled", "true");
        }
      }
    }

    for (const oldCycleItem of ["Inputs", "Calculation", "Review", "Outputs", "Handoff"]) {
      await expect(nav.getByRole("link", { name: new RegExp(`^${oldCycleItem}\\b`) })).toHaveCount(0);
    }

    await expect(page.getByRole("searchbox", { name: "Workspace search" })).toHaveAttribute(
      "placeholder",
      "Search employees, payroll, leave, attendance, reports...",
    );
    await expect(page.getByRole("link", { name: "ESS", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "MSS", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

    const controlCenter = page.getByTestId("hr-admin-control-center");
    await expect(controlCenter).toBeVisible();

    for (const action of [
      "Open readiness",
      "Review lifecycle",
      "Review documents",
      "Open attendance",
      "Open delivery",
      "Resolve launch",
      "Payroll blockers",
      "Open employees",
      "Open payroll",
      "Open reports",
    ]) {
      const link = controlCenter.getByRole("link", { name: action }).or(page.getByRole("link", { name: action }));
      await expect(link.first()).toBeVisible();
      await expect(link.first()).toHaveAttribute("href", /^\/hr-admin\//);
    }

    for (const item of allNavItems) {
      await expectRouteHealthy(page, item);
    }
  });

  test("maps payroll cycle pages back to the correct sidebar area", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-inputs", hrAdmin);
    await openHrAdminNavGroups(page);

    const nav = page.getByRole("navigation", { name: /hr admin navigation/i });
    await expect(nav.getByRole("link", { name: /^Payroll Control\b/ })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await gotoAuthenticated(page, "/hr-admin/payroll-settlements", hrAdmin);
    await openHrAdminNavGroups(page);

    await expect(nav.getByRole("link", { name: /^Adjustments & Settlements\b/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("keeps HR Admin navigation usable without overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/hr-admin", hrAdmin);
    await expectPageReady(page, "HR Control Center");
    await openHrAdminNavGroups(page);

    await page.getByText("Menu", { exact: true }).click();

    const nav = page.getByRole("navigation", { name: /hr admin mobile navigation/i });
    await expect(nav).toBeVisible();

    for (const group of navGroups) {
      await expect(nav.getByText(group.title, { exact: true })).toBeVisible();
    }

    for (const item of ["Dashboard", "Employees", "Payroll Control", "Attendance", "Organization", "Policies"]) {
      await expect(nav.getByText(item, { exact: true }).or(nav.getByLabel(`${item} unavailable`))).toBeVisible();
    }

    await expect(page.getByTestId("hr-admin-control-center")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
