import { expect, type Page, test } from "@playwright/test";

import { auditHrAdminRoute, chunks, discoverHrAdminRoutes, gotoDemoHrAdmin } from "../helpers/hr-admin-ui-audit";

type DynamicCandidate = {
  href: string;
  sources: string[];
};

const staticRoutes = discoverHrAdminRoutes();
const staticRouteSet = new Set(staticRoutes);
const dynamicSourceRoutes = [
  "/hr-admin/attendance-policies",
  "/hr-admin/attendance-policy-assignments",
  "/hr-admin/attendance-records",
  "/hr-admin/attendance-regularizations",
  "/hr-admin/document-categories",
  "/hr-admin/document-requirements",
  "/hr-admin/employee-documents",
  "/hr-admin/employees",
  "/hr-admin/exits",
  "/hr-admin/holiday-calendars",
  "/hr-admin/leave-policies",
  "/hr-admin/leave-policy-assignments",
  "/hr-admin/leave-types",
  "/hr-admin/movements",
  "/hr-admin/notification-events",
  "/hr-admin/notification-templates",
  "/hr-admin/notifications",
  "/hr-admin/onboardings",
  "/hr-admin/organization",
  "/hr-admin/probation-reviews",
  "/hr-admin/shift-roster-templates",
  "/hr-admin/shifts",
  "/hr-admin/workflow-template-assignments",
  "/hr-admin/workflow-templates",
].filter((route) => staticRouteSet.has(route));

function normalizeHrAdminHref(rawHref: string) {
  const url = new URL(rawHref);
  if (!url.pathname.startsWith("/hr-admin")) {
    return null;
  }
  if (url.pathname.includes("[") || url.pathname.includes("]") || url.pathname.includes("undefined") || url.pathname.includes("null")) {
    return null;
  }
  if (url.pathname === "/hr-admin") {
    return null;
  }
  if (staticRouteSet.has(url.pathname)) {
    return null;
  }
  return `${url.pathname}${url.search}`;
}

async function collectDynamicHrAdminLinks(page: Page, sourceRoute: string, candidates: Map<string, DynamicCandidate>) {
  await gotoDemoHrAdmin(page, sourceRoute);
  const hrefs = await page.locator("a[href]").evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href));

  for (const rawHref of hrefs) {
    const href = normalizeHrAdminHref(rawHref);
    if (!href) {
      continue;
    }

    const candidate = candidates.get(href);
    if (candidate) {
      candidate.sources.push(sourceRoute);
    } else {
      candidates.set(href, { href, sources: [sourceRoute] });
    }
  }
}

test.describe("HR Admin dynamic route UI audit", () => {
  test.skip(dynamicSourceRoutes.length === 0, "No HR Admin record-list source routes were discovered.");

  for (const [index, sourceRoutes] of chunks(dynamicSourceRoutes, 6).entries()) {
    test(`discovers and audits record-backed action pages group ${index + 1}`, async ({ page }) => {
      test.setTimeout(360_000);
      await page.setViewportSize({ width: 1440, height: 960 });

      const candidates = new Map<string, DynamicCandidate>();
      for (const route of sourceRoutes) {
        await collectDynamicHrAdminLinks(page, route, candidates);
      }

      const dynamicRoutes = [...candidates.values()].sort((first, second) => first.href.localeCompare(second.href));
      expect(dynamicRoutes.length, `Record-list routes ${sourceRoutes.join(", ")} should expose edit/review/detail routes`).toBeGreaterThan(0);

      for (const candidate of dynamicRoutes) {
        await auditHrAdminRoute(page, candidate.href);
      }
    });
  }
});
