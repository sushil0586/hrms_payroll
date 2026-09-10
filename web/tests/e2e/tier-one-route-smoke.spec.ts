import { test } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { tierOneRoutes } from "../helpers/routes";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("tier 1 HRMS operational routes", () => {
  for (const route of tierOneRoutes) {
    test(`${route.path} renders without layout overflow`, async ({ page }) => {
      await gotoAuthenticated(page, route.path);
      await expectPageReady(page, route.heading);
    });
  }
});
