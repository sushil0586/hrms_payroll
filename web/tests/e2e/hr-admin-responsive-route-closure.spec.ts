import { test } from "@playwright/test";

import { auditHrAdminRoute, chunks, discoverHrAdminRoutes } from "../helpers/hr-admin-ui-audit";

const staticRoutes = discoverHrAdminRoutes();
const viewports = [
  { label: "tablet", width: 820, height: 1180 },
  { label: "mobile", width: 390, height: 844 },
];

const routeGroups = chunks(staticRoutes, 5);

test.describe("HR Admin responsive route closure audit", () => {
  test.skip(staticRoutes.length === 0, "No HR Admin routes were discovered.");

  for (const viewport of viewports) {
    for (const [index, routes] of routeGroups.entries()) {
      test(`${viewport.label} route group ${index + 1} of ${routeGroups.length}`, async ({ page }) => {
        test.setTimeout(180_000);
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        for (const route of routes) {
          await auditHrAdminRoute(page, route);
        }
      });
    }
  }
});
