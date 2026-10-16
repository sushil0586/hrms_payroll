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
        await expect(page.getByTestId("hr-admin-control-center")).toBeVisible();
        await expect(page.getByTestId("hr-admin-action-queue")).toBeVisible();
        await expect(page.getByTestId("hr-admin-operational-readiness")).toBeVisible();
        await expect(page.getByRole("link", { name: "Payroll blockers" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Employees", exact: true })).toBeVisible();
        await expect(page.getByRole("link", { name: "Reports", exact: true })).toBeVisible();
      }
    });
  }
});
