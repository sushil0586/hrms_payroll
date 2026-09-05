import { expect, test } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { operationalVisualRoutes } from "../helpers/routes";
import { screenshotName, visualViewports } from "../helpers/screenshots";

test.describe("operational HRMS visual baseline", () => {
  for (const route of operationalVisualRoutes) {
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
