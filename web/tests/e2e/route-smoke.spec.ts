import { expect, test } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { tierZeroRoutes } from "../helpers/routes";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("tier 0 workspace routes", () => {
  for (const route of tierZeroRoutes) {
    test(`${route.path} renders the modern shell`, async ({ page }) => {
      if (route.path === "/" || route.path === "/login") {
        await page.goto(route.path);
      } else {
        await gotoAuthenticated(page, route.path);
      }
      await expectPageReady(page, route.heading);
      if (route.path === "/hr-admin") {
        await expect(page.getByRole("heading", { name: "hrms.saas_launch_audit.v1" })).toBeVisible();
        await expect(page.getByText("SaaS launch audit")).toBeVisible();
        await expect(page.getByText("open assignments")).toBeVisible();
        await expect(page.getByRole("link", { name: "View assignments" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Download audit" })).toBeVisible();
        await expect(page.getByText("Primary bank coverage")).toBeVisible();
        await expect(page.getByRole("link", { name: "Review employees" }).first()).toBeVisible();
        await expect(page.getByText("Employee master - hr-admin - 3d").first()).toBeVisible();
        await expect(page.getByText("payroll.provider_launch_readiness.audit_pack.v1")).toBeVisible();
      }
    });
  }
});
