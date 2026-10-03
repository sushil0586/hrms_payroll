import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal } from "../helpers/hr-admin-ui-audit";
import { gotoAuthenticated, tenantAdmin } from "../helpers/staging-auth";

const artifactDir = path.join(process.cwd(), "test-results/tenant-admin-dashboard-phase2");

function slug(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

async function capture(page: Page, name: string) {
  mkdirSync(artifactDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactDir, `${slug(name)}.png`), fullPage: true, animations: "disabled" });
}

async function expectTenantLinksResolve(page: Page) {
  const hrefs = await page.locator("main a[href], aside a[href], header a[href]").evaluateAll((links) =>
    [...new Set(
      links
        .filter((link) => {
          const rect = link.getBoundingClientRect();
          const style = window.getComputedStyle(link);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        })
        .map((link) => (link as HTMLAnchorElement).href),
    )],
  );

  const origin = new URL(page.url()).origin;
  const tenantLinks = hrefs
    .map((href) => new URL(href, page.url()))
    .filter((url) => url.origin === origin && url.pathname.startsWith("/tenant-admin"))
    .map((url) => `${url.pathname}${url.search}`);

  for (const href of tenantLinks.slice(0, 16)) {
    const response = await page.request.get(href, { failOnStatusCode: false, maxRedirects: 2, timeout: 20_000 });
    expect(response.status(), `Visible tenant link should resolve: ${href}`).toBeLessThan(400);
  }
}

async function expectDashboardHealthy(page: Page, label: string) {
  await suppressBrowserTestNoise(page);
  await expect(page.getByRole("heading", { level: 1, name: "Account Control Center" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page.getByTestId("tenant-admin-control-center")).toBeVisible();
  await expect(page.getByText("Items that need your attention")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Launch checklist" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Open the right workspace" })).toBeVisible();
  await expect(page.getByText("Detailed users, roles, support grants, and audit records stay on their own pages.")).toBeVisible();
  const routeCards = page.locator(".tenant-dashboard-route-grid");
  await expect(routeCards.getByRole("link", { name: /User access/i })).toBeVisible();
  await expect(routeCards.getByRole("link", { name: /Access design Roles/i })).toBeVisible();
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await expectVisibleLinksAreReal(page, `/tenant-admin ${label}`);
  await expectTenantLinksResolve(page);
  await auditVisibleControls(page, `/tenant-admin ${label}`, 64);
}

test.describe("Tenant Admin Phase 2 dashboard polish", () => {
  test.describe.configure({ mode: "serial" });

  test("dashboard reads like a control center on desktop", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 960 });
    await gotoAuthenticated(page, "/tenant-admin", tenantAdmin);
    await expectDashboardHealthy(page, "desktop");

    const activeNav = page.getByRole("navigation", { name: "Tenant Admin navigation" }).locator('a[aria-current="page"]');
    await expect(activeNav).toHaveCount(1);
    await expect(activeNav.first()).toContainText("Dashboard");

    const actionTableFits = await page.locator(".tenant-action-table").evaluate((table) => table.scrollWidth <= table.clientWidth + 1);
    expect(actionTableFits, "Dashboard action queue should not need horizontal scrolling on desktop").toBe(true);

    const routeGridFits = await page.locator(".tenant-dashboard-route-grid").evaluate((grid) => grid.scrollWidth <= grid.clientWidth + 1);
    expect(routeGridFits, "Dashboard workspace route cards should not need horizontal scrolling on desktop").toBe(true);

    const primaryActions = page.locator(".tenant-page-intro .page-intro__actions");
    await expect(primaryActions).toBeVisible();
    const primaryActionBox = await primaryActions.boundingBox();
    const introBox = await page.locator(".tenant-page-intro").boundingBox();
    expect(primaryActionBox && introBox ? primaryActionBox.x + primaryActionBox.width <= introBox.x + introBox.width + 1 : true).toBe(true);

    await capture(page, "dashboard-desktop");
  });

  test("dashboard stays calm and navigable on mobile", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/tenant-admin", tenantAdmin);
    await expectDashboardHealthy(page, "mobile");

    await expect(page.locator(".tenant-action-table__head")).toBeHidden();
    await expect(page.locator(".tenant-action-table__row").first().getByRole("link").first()).toBeVisible();
    await expect(page.locator(".tenant-readiness-item").first()).toBeVisible();
    await expect(page.locator(".tenant-dashboard-route-card").first()).toBeVisible();
    await capture(page, "dashboard-mobile");
  });
});
