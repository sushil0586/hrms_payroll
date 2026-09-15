import { expect, type Page, type TestInfo, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, tenantAdmin } from "../helpers/staging-auth";

const routes = [
  {
    path: "/tenant-admin",
    heading: "Tenant Admin Console",
    landmark: "tenant-admin-control-center",
    requiredLabels: ["Dashboard", "Users", "Plan", "Setup Guide", "Support Access", "Trust Audit", "Settings", "Security"],
  },
  {
    path: "/tenant-admin/users",
    heading: "Tenant User Management",
    requiredText: ["Member mutations", "Invite member", "Search members"],
  },
  {
    path: "/tenant-admin/plan",
    heading: "Plans And Subscription",
    requiredText: ["Commercial profile", "Current subscription", "Recent meter snapshots"],
  },
  {
    path: "/tenant-admin/setup",
    heading: "Tenant Setup Guide",
    landmark: "tenant-setup-workbench",
    requiredText: ["Setup areas", "Start master setup"],
  },
  {
    path: "/tenant-admin/support-access",
    heading: "Support Access",
    requiredText: ["Active or pending", "Scope guide", "What support can access"],
  },
  {
    path: "/tenant-admin/trust-audit",
    heading: "Tenant Trust Audit",
    requiredText: ["Audit events", "Download audit"],
  },
  {
    path: "/tenant-admin/settings",
    heading: "Tenant Settings",
    requiredText: ["Tenant account", "Governance checks", "Configuration health"],
  },
  {
    path: "/tenant-admin/security-readiness",
    heading: "Enterprise Security Readiness",
    requiredText: ["Security domains", "Launch posture", "Launch blockers"],
  },
];

async function attachRouteScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

async function expectTenantShell(page: Page) {
  await expect(page.getByRole("navigation", { name: "Tenant Admin navigation" })).toBeVisible();
  await expect(page.getByText("Account Control Center", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Home" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Tenant" }).first()).toBeVisible();
}

test.describe("Tenant admin visual accessibility certification", () => {
  for (const route of routes) {
    test(`certifies desktop route ${route.path}`, async ({ page }, testInfo) => {
      await gotoAuthenticated(page, route.path, tenantAdmin);
      await expectPageReady(page, route.heading);
      await expectTenantShell(page);
      if (route.landmark) {
        await expect(page.getByTestId(route.landmark)).toBeVisible();
      }
      for (const label of route.requiredLabels ?? []) {
        await expect(page.getByRole("navigation", { name: "Tenant Admin navigation" }).getByText(label, { exact: true })).toBeVisible();
      }
      for (const text of route.requiredText ?? []) {
        await expect(page.getByRole("main").getByText(text, { exact: true }).first()).toBeVisible();
      }
      await expect(page.locator("main")).toHaveCSS("display", /block|grid|flex/);
      await expectNoHorizontalOverflow(page);
      await attachRouteScreenshot(page, testInfo, `desktop-${route.path.replaceAll("/", "-") || "tenant-admin"}`);
    });
  }

  test("certifies mobile dashboard and navigation wrapping", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/tenant-admin", tenantAdmin);
    await expectPageReady(page, "Tenant Admin Console");
    await expectTenantShell(page);
    await expect(page.getByTestId("tenant-next-action")).toBeVisible();
    await expect(page.getByTestId("tenant-setup-guide")).toBeVisible();
    await expect(page.getByRole("link", { name: "Manage users" }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await attachRouteScreenshot(page, testInfo, "mobile-tenant-admin-dashboard");
  });
});
