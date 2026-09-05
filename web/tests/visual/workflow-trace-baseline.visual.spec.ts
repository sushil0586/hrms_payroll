import { expect, test } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { workflowTraceVisualRoutes } from "../helpers/routes";
import { screenshotName, visualViewports } from "../helpers/screenshots";

test.describe("workflow trace visual baseline", () => {
  for (const route of workflowTraceVisualRoutes) {
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
