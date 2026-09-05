import { test } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { tierZeroRoutes } from "../helpers/routes";

test.describe("tier 0 workspace routes", () => {
  for (const route of tierZeroRoutes) {
    test(`${route.path} renders the modern shell`, async ({ page }) => {
      await page.goto(route.path);
      await expectPageReady(page, route.heading);
    });
  }
});
