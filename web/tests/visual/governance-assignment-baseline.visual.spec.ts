import { expect, test } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { governanceAssignmentVisualRoutes } from "../helpers/routes";
import { screenshotName, visualViewports } from "../helpers/screenshots";

test.describe("governance and assignment visual baseline", () => {
  for (const route of governanceAssignmentVisualRoutes) {
    for (const viewport of visualViewports) {
      test(`${route.path} matches ${viewport.label} baseline`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(route.path);
        await expectPageReady(page, route.heading);
        await expect(page).toHaveScreenshot(screenshotName(route.path, viewport.label), {
          fullPage: true,
          animations: "disabled",
        });
      });
    }
  }
});
