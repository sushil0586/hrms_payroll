import { expect, test } from "@playwright/test";

import { auditHrAdminRoute, chunks, discoverHrAdminRoutes } from "../helpers/hr-admin-ui-audit";

const excludedStaticRoutes = new Set<string>([
  // Dynamic sample-bound coverage is tracked separately in the route matrix.
]);

type RouteType = "dashboard" | "queue" | "form" | "report" | "setup" | "operations";

function routeType(route: string): RouteType {
  if (route === "/hr-admin") return "dashboard";
  if (route.includes("/reports")) return "report";
  if (route.endsWith("/new")) return "form";
  if (
    route.includes("setup") ||
    route.includes("policies") ||
    route.includes("templates") ||
    route.includes("organization") ||
    route.includes("workflows") ||
    route.includes("rules")
  ) {
    return "setup";
  }
  if (
    route.includes("records") ||
    route.includes("requests") ||
    route.includes("assignments") ||
    route.includes("notifications") ||
    route.includes("documents") ||
    route.includes("employees") ||
    route.includes("audit") ||
    route.includes("import-history")
  ) {
    return "queue";
  }
  return "operations";
}

function requiredFunctionality(route: string) {
  const type = routeType(route);
  return {
    route,
    type,
    expectsCompactShell: [
      "dashboard",
      "queue",
      "report",
      "setup",
      "operations",
      "form",
    ].includes(type),
    expectsTableOrCards: ["queue", "report", "setup", "operations"].includes(type),
  };
}

const staticRoutes = discoverHrAdminRoutes()
  .filter((route) => !excludedStaticRoutes.has(route))
  .map((route) => requiredFunctionality(route));

const routeGroups = chunks(staticRoutes, 12);

test.describe("HR Admin unified design full static route certification", () => {
  for (const [groupIndex, routes] of routeGroups.entries()) {
    test(`static route group ${groupIndex + 1} follows unified model`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.setViewportSize({ width: 1440, height: 960 });

      for (const route of routes) {
        await auditHrAdminRoute(page, route.route);

        if (route.expectsCompactShell) {
          await expect(page.locator("main.shell").first(), `${route.route} should keep shell visible`).toBeVisible();
        }

        if (route.expectsTableOrCards) {
          const operationalSurface = page.locator([
            "main .queue-toolbar",
            "main .pagination-bar",
            "main .metric-grid-modern",
            "main .panel-card-soft",
            "main .record-card",
            "main .workspace-card",
            "main .report-catalog-workspace",
            "main .notification-admin-action-list",
            "main .notification-admin-workspace-list",
            "main .payroll-input-source-grid",
            "main .payroll-input-source-card",
            "main .payroll-setup-tabs",
            "main .payroll-statutory-component-grid",
            "main .payroll-statutory-operations-grid",
            "main .saas-control-panel",
            "main .saas-usage-grid",
            "main table",
            "main .empty-state",
            "main .payroll-setup-empty-state",
          ].join(", "));
          await expect(
            operationalSurface.first(),
            `${route.route} should expose filters, pagination, cards, table, or empty state`,
          ).toBeVisible();
        }
      }
    });
  }

  test("dynamic route patterns remain explicitly sample-bound", async () => {
    const dynamicRoutes = discoverHrAdminRoutes(undefined, true).filter((route) => route.includes("[") || route.includes("]"));
    expect(dynamicRoutes.length).toBeGreaterThan(0);
  });
});
