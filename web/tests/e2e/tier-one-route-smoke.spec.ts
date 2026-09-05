import { test } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { tierOneRoutes } from "../helpers/routes";

test.describe("tier 1 HRMS operational routes", () => {
  for (const route of tierOneRoutes) {
    test(`${route.path} renders without layout overflow`, async ({ page }) => {
      await page.goto(route.path);
      await expectPageReady(page, route.heading);
    });
  }
});
