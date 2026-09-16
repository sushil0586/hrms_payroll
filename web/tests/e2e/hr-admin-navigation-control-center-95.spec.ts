import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type HrAdminNavItem = {
  href: string;
  label: string;
};

const navGroups: { title: string; items: HrAdminNavItem[] }[] = [
  {
    title: "Workspace",
    items: [
      { href: "/hr-admin", label: "Overview" },
      { href: "/hr-admin/employees", label: "People" },
      { href: "/hr-admin/lifecycle", label: "Lifecycle" },
      { href: "/hr-admin/employee-documents", label: "Documents" },
      { href: "/hr-admin/reports", label: "Reports" },
      { href: "/hr-admin/payroll-readiness", label: "Payroll" },
      { href: "/hr-admin/payroll-statutory", label: "Statutory" },
      { href: "/hr-admin/payroll-providers", label: "Providers" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/hr-admin/attendance-operations", label: "Attendance" },
      { href: "/hr-admin/notifications-admin", label: "Notifications" },
      { href: "/hr-admin/launch-remediation", label: "Launch" },
      { href: "/hr-admin/saas-control-plane", label: "SaaS" },
      { href: "/hr-admin/saas-operations", label: "Ops Health" },
      { href: "/hr-admin/saas-resilience", label: "Resilience" },
      { href: "/hr-admin/saas-sla-operations", label: "SLA Ops" },
    ],
  },
  {
    title: "Governance",
    items: [
      { href: "/hr-admin/organization", label: "Organization" },
      { href: "/hr-admin/policies", label: "Policies" },
      { href: "/hr-admin/workflows", label: "Workflows" },
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
  test("certifies grouped sidebar, topbar, command center, and every menu route on desktop", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/hr-admin", hrAdmin);
    await expectPageReady(page, "Control center");
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

    await expect(page.getByLabel("Search placeholder")).toContainText(
      "Search people, policy, workflow, and review actions",
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
      "Payroll inputs",
      "Payroll review",
      "Employees",
      "Reports",
      "Letters",
      "Ops health",
    ]) {
      const link = controlCenter.getByRole("link", { name: action }).or(page.getByRole("link", { name: action }));
      await expect(link.first()).toBeVisible();
      await expect(link.first()).toHaveAttribute("href", /^\/hr-admin\//);
    }

    for (const item of allNavItems) {
      await expectRouteHealthy(page, item);
    }
  });

  test("keeps HR Admin navigation usable without overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/hr-admin", hrAdmin);
    await expectPageReady(page, "Control center");
    await openHrAdminNavGroups(page);

    const nav = page.getByRole("navigation", { name: /hr admin navigation/i });
    await expect(nav).toBeVisible();

    for (const group of navGroups) {
      await expect(nav.getByText(group.title, { exact: true })).toBeVisible();
    }

    for (const item of ["Overview", "People", "Payroll", "Attendance", "Organization", "Policies"]) {
      await expect(nav.getByText(item, { exact: true }).or(nav.getByLabel(`${item} unavailable`))).toBeVisible();
    }

    await expect(page.getByTestId("hr-admin-control-center")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
