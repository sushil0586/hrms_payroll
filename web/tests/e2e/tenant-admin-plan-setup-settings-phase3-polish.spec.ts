import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal } from "../helpers/hr-admin-ui-audit";
import { gotoAuthenticated, tenantAdmin } from "../helpers/staging-auth";

const artifactDir = path.join(process.cwd(), "test-results/tenant-admin-plan-setup-settings-phase3");

const phase3Routes = [
  { path: "/tenant-admin/setup", heading: "Tenant Setup Guide", required: ["Setup areas", "Import prerequisites"] },
  { path: "/tenant-admin/plan", heading: "Plan & Billing", required: ["Current subscription", "Meter snapshots", "Change requests"] },
  { path: "/tenant-admin/settings", heading: "Tenant Settings", required: ["Tenant account", "Readiness checks", "Published setup"] },
] as const;

function slug(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

async function capture(page: Page, name: string) {
  mkdirSync(artifactDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactDir, `${slug(name)}.png`), fullPage: true, animations: "disabled" });
}

async function expectVisibleInternalLinksResolve(page: Page, label: string) {
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
  const internalLinks = hrefs
    .map((href) => new URL(href, page.url()))
    .filter((url) => url.origin === origin && !url.pathname.startsWith("/api/"))
    .map((url) => `${url.pathname}${url.search}`);

  for (const href of internalLinks.slice(0, 18)) {
    const response = await page.request.get(href, { failOnStatusCode: false, maxRedirects: 2, timeout: 20_000 });
    expect(response.status(), `${label} visible internal link should resolve: ${href}`).toBeLessThan(400);
  }
}

async function expectPhase3RouteHealthy(page: Page, route: (typeof phase3Routes)[number], label: string) {
  await gotoAuthenticated(page, route.path, tenantAdmin);
  await suppressBrowserTestNoise(page);
  await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  for (const text of route.required) {
    await expect(page.getByRole("main").getByText(text, { exact: true }).first()).toBeVisible();
  }
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await expectVisibleLinksAreReal(page, `${route.path} ${label}`);
  await expectVisibleInternalLinksResolve(page, `${route.path} ${label}`);
  await auditVisibleControls(page, `${route.path} ${label}`, 72);
}

test.describe("Tenant Admin Phase 3 plan setup settings polish", () => {
  test("setup guide is an ordered launch path on desktop", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 960 });
    await expectPhase3RouteHealthy(page, phase3Routes[0], "desktop");

    await expect(page.locator(".tenant-setup-area--phase3")).toHaveCount(5);
    await expect(page.locator(".tenant-setup-area__index").first()).toContainText("01");
    await expect(page.locator(".tenant-setup-sidecar__hero")).toBeVisible();
    const setupRowsFit = await page.locator(".tenant-setup-area--phase3").evaluateAll((rows) =>
      rows.every((row) => row.scrollWidth <= row.clientWidth + 1),
    );
    expect(setupRowsFit, "Setup guide rows should not horizontally scroll").toBe(true);
    await capture(page, "setup-desktop");
  });

  test("plan and settings keep commercial work controlled on desktop", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    await expectPhase3RouteHealthy(page, phase3Routes[1], "desktop");
    await expect(page.locator(".tenant-change-request-form")).toBeVisible();
    await expect(page.getByRole("button", { name: /submit request/i })).toBeVisible();
    if (await page.locator(".tenant-change-request-row").count()) {
      await expect(page.locator(".tenant-change-request-row__actions").first()).toBeVisible();
    } else {
      await expect(page.getByText("No change requests recorded yet.")).toBeVisible();
    }
    await capture(page, "plan-desktop");

    await expectPhase3RouteHealthy(page, phase3Routes[2], "desktop");
    const changeLink = page.getByRole("link", { name: /request account change/i });
    await expect(changeLink).toHaveAttribute("href", /request_type=configuration_change/);
    await capture(page, "settings-desktop");
  });

  test("phase 3 pages stay readable on mobile", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });

    for (const route of phase3Routes) {
      await expectPhase3RouteHealthy(page, route, "mobile");
      await capture(page, `${route.path.split("/").pop() ?? "route"}-mobile`);
    }

    await gotoAuthenticated(page, "/tenant-admin/setup", tenantAdmin);
    await expect(page.locator(".tenant-setup-area--phase3").first().getByRole("link")).toBeVisible();
    await gotoAuthenticated(page, "/tenant-admin/plan", tenantAdmin);
    await expect(page.locator(".tenant-change-request-form__payload")).toBeVisible();
  });
});
