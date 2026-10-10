import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

const liveApiRequired = Boolean(process.env.HRMS_API_BASE_URL);

type ResponsiveRoute = {
  path: string;
  heading: string | RegExp;
  primaryAction?: string | RegExp;
};

const scopedRoutes: ResponsiveRoute[] = [
  { path: "/hr-admin/employees", heading: "Employees", primaryAction: "New employee" },
  { path: "/hr-admin/employees/new", heading: "Create employee", primaryAction: "Create employee" },
  { path: "/hr-admin/employee-documents", heading: "Employee document review", primaryAction: "Upload document" },
  { path: "/hr-admin/employee-documents/new", heading: /Upload employee document|Employee document/i },
  { path: "/hr-admin/document-categories", heading: /Document categories/i, primaryAction: "Create category" },
  { path: "/hr-admin/document-requirements", heading: /Document requirements/i, primaryAction: "Create requirement" },
  { path: "/hr-admin/onboardings", heading: /Onboarding/i, primaryAction: /Create onboarding|New onboarding/i },
];

const viewports = [
  { label: "tablet", width: 768, height: 1024 },
  { label: "mobile", width: 390, height: 844 },
];

async function expectCompactResponsivePage(page: Page, route: ResponsiveRoute) {
  await gotoAuthenticated(page, route.path);
  await expectPageReady(page, route.heading);
  await expect(page.locator("main").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  if (route.primaryAction) {
    await expect(page.getByRole("link", { name: route.primaryAction }).or(page.getByRole("button", { name: route.primaryAction })).first()).toBeVisible();
  }
}

test.describe("Phase 3B.2 HR Admin workforce, documents, and access responsive certification", () => {
  test.skip(!liveApiRequired, "Responsive certification requires a live HRMS API.");
  test.setTimeout(4 * 60 * 1000);

  for (const viewport of viewports) {
    test(`scoped HR Admin screens remain compact and usable on ${viewport.label}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of scopedRoutes) {
        await expectCompactResponsivePage(page, route);
        await testInfo.attach(`${viewport.label}-${route.path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.png`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: "image/png",
        });
      }
    });
  }
});
