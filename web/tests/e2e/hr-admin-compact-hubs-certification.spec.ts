import { expect, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const routes = [
  {
    path: "/hr-admin/policies",
    heading: "Policy control",
    requiredText: ["Configure policy foundations", "Leave catalog", "Policy rollout", "Leave balance operations"],
  },
  {
    path: "/hr-admin/policy-assignments",
    heading: "Policy assignments",
    requiredText: ["Choose assignment scope", "Leave policy assignments", "Attendance policy assignments"],
  },
];

test.describe("HR admin compact hub certification", () => {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 940 },
    { name: "tablet", width: 820, height: 1180 },
  ]) {
    test(`keeps policy hubs compact and focused on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of routes) {
        await gotoAuthenticated(page, route.path, hrAdmin);
        await suppressBrowserTestNoise(page);
        await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
        for (const text of route.requiredText) {
          await expect(page.locator("main").getByText(text).first()).toBeVisible();
        }
        await expectNoAppError(page);
        await expectNoHorizontalOverflow(page);
      }
    });
  }
});
