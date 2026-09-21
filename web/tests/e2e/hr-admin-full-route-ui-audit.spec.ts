import { test } from "@playwright/test";

import { auditHrAdminRoute, chunks, discoverHrAdminRoutes } from "../helpers/hr-admin-ui-audit";

const staticRoutes = discoverHrAdminRoutes();
const routeGroups = chunks(staticRoutes, 14);

test.describe("HR Admin full route UI audit", () => {
  test.skip(staticRoutes.length === 0, "No HR Admin routes were discovered.");

  for (const [index, routes] of routeGroups.entries()) {
    test(`audits HR Admin static route group ${index + 1} of ${routeGroups.length}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: 1440, height: 960 });

      for (const route of routes) {
        await auditHrAdminRoute(page, route);
      }
    });
  }
});
