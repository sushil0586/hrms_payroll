import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { gotoDemoHrAdmin } from "../helpers/hr-admin-ui-audit";

const screenshotDir = path.join(process.cwd(), "test-results", "hr-admin-notification-phase1");

const notificationRoutes = [
  "/hr-admin/notifications-admin",
  "/hr-admin/notification-delivery",
  "/hr-admin/notification-diagnostics",
  "/hr-admin/notification-templates",
  "/hr-admin/notification-events",
  "/hr-admin/notifications",
  "/hr-admin/notifications?status=failed",
  "/hr-admin/notifications?retry_state=retry_ready",
];

const allowedHrAdminTargets = [
  /^\/hr-admin$/,
  /^\/hr-admin\/audit$/,
  /^\/hr-admin\/notifications-admin$/,
  /^\/hr-admin\/notification-delivery$/,
  /^\/hr-admin\/notification-diagnostics$/,
  /^\/hr-admin\/notification-templates(?:\/new|\/[^/]+\/edit)?(?:\?.*)?$/,
  /^\/hr-admin\/notification-events(?:\/new|\/[^/]+\/edit)?(?:\?.*)?$/,
  /^\/hr-admin\/notifications(?:\/[^/]+\/review)?(?:\?.*)?$/,
  /^\/hr-admin\/saas-control-plane$/,
  /^\/hr-admin\/saas-operations$/,
  /^\/hr-admin\/saas-resilience$/,
  /^\/hr-admin\/saas-sla-operations$/,
  /^\/hr-admin\/launch-remediation$/,
  /^\/hr-admin\/import-history$/,
];

function slugForRoute(route: string) {
  return route
    .replace(/^\/+/, "")
    .replace(/[/?=&.#]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-$/, "");
}

function normalizeVisibleHrAdminHref(rawHref: string, baseUrl: string) {
  const url = new URL(rawHref, baseUrl);
  if (url.origin !== new URL(baseUrl).origin) {
    return null;
  }
  if (!url.pathname.startsWith("/hr-admin")) {
    return null;
  }
  if (url.pathname.includes("[") || url.pathname.includes("]") || url.pathname.includes("undefined") || url.pathname.includes("null")) {
    return null;
  }
  return `${url.pathname}${url.search}`;
}

async function capture(page: Page, route: string) {
  mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ fullPage: true, path: path.join(screenshotDir, `${slugForRoute(route)}.png`) });
}

async function expectNotificationPageHealthy(page: Page, route: string) {
  await suppressBrowserTestNoise(page);
  await expect(page.locator("main.notification-shell").first(), `${route} should render notification shell`).toBeVisible();
  await expect(page.locator("h1").first(), `${route} should expose a page title`).toBeVisible();
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await page.locator("main details.notification-details-disclosure").evaluateAll((details) => {
    details.forEach((detail) => {
      (detail as HTMLDetailsElement).open = true;
    });
  });

  const issues = await page.locator("main button, main a.button, main input:not([type='hidden']), main select, main textarea, main summary").evaluateAll((elements) => {
    const viewportWidth = document.documentElement.clientWidth;
    return elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      if (rect.width <= 0 || rect.height <= 0 || style.display === "none" || style.visibility === "hidden") {
        return [];
      }

      const label = (element.textContent || element.getAttribute("aria-label") || element.getAttribute("name") || element.tagName).trim();
      const failures: string[] = [];
      if (rect.left < -1 || rect.right > viewportWidth + 1) {
        failures.push(`${label || element.tagName} is outside the viewport`);
      }
      if ((element.tagName === "BUTTON" || element.classList.contains("button")) && element.scrollWidth > element.clientWidth + 2) {
        failures.push(`${label || element.tagName} text is clipped`);
      }
      return failures;
    });
  });

  expect(issues, `${route} should not have clipped/offscreen controls`).toEqual([]);

  const detailPairIssues = await page.locator("main .record-card__details > div, main .notification-review-detail-grid > div").evaluateAll((elements) =>
    elements.flatMap((element) => {
      const label = element.querySelector(".record-card__label");
      const value = element.querySelector("strong");
      if (!label || !value) return [];

      const labelRect = label.getBoundingClientRect();
      const valueRect = value.getBoundingClientRect();
      const elementText = (element.textContent || "").trim().replace(/\s+/g, " ");
      const hasVerticalSeparation = valueRect.top >= labelRect.bottom - 1;
      const hasReadableGap = valueRect.left <= labelRect.left + 4 || valueRect.top > labelRect.top + 8;

      return hasVerticalSeparation && hasReadableGap ? [] : [`Detail label/value collides: ${elementText}`];
    }),
  );

  expect(detailPairIssues, `${route} should keep detail labels visually separate from values`).toEqual([]);
}

async function collectMainNotificationLinks(page: Page) {
  const hrefs = await page.locator("main a[href], main details.action-menu a[href]").evaluateAll((links) =>
    links
      .filter((link) => {
        const rect = link.getBoundingClientRect();
        const style = window.getComputedStyle(link);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      })
      .map((link) => (link as HTMLAnchorElement).href),
  );
  return [...new Set(hrefs.map((href) => normalizeVisibleHrAdminHref(href, page.url())).filter((href): href is string => Boolean(href)))];
}

async function expectNotificationLinksOpen(page: Page, sourceRoute: string) {
  const links = await collectMainNotificationLinks(page);
  expect(links.length, `${sourceRoute} should expose useful main links`).toBeGreaterThan(0);

  for (const href of links) {
    expect(
      allowedHrAdminTargets.some((pattern) => pattern.test(href)),
      `${sourceRoute} links to an unexpected HR Admin destination: ${href}`,
    ).toBe(true);

    const response = await page.request.get(href, { failOnStatusCode: false, maxRedirects: 2, timeout: 20_000 });
    expect(response.status(), `${sourceRoute} link should open cleanly: ${href}`).toBeLessThan(400);
  }
}

test.describe("HR Admin notification Phase 1 UX certification", () => {
  test("notification pages render cleanly and expose valid links", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    for (const route of notificationRoutes) {
      await gotoDemoHrAdmin(page, route);

      const actionMenu = page.locator("main details.action-menu").first();
      if (await actionMenu.isVisible().catch(() => false)) {
        await actionMenu.locator("summary").click();
      }

      await expectNotificationPageHealthy(page, route);
      await expectNotificationLinksOpen(page, route);
      await capture(page, route);
    }
  });

  test("notification dynamic child routes render cleanly", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    await gotoDemoHrAdmin(page, "/hr-admin/notifications");
    const reviewHref = await page.locator("main a[href*='/hr-admin/notifications/'][href$='/review']").first().getAttribute("href");
    expect(reviewHref, "Notification queue should expose a review child route").toBeTruthy();
    await gotoDemoHrAdmin(page, reviewHref!);
    await expectNotificationPageHealthy(page, reviewHref!);
    await capture(page, reviewHref!);

    await gotoDemoHrAdmin(page, "/hr-admin/notification-templates");
    const templateEditHref = await page.locator("main a[href*='/hr-admin/notification-templates/'][href$='/edit']").first().getAttribute("href");
    expect(templateEditHref, "Template catalog should expose an edit child route").toBeTruthy();
    await gotoDemoHrAdmin(page, templateEditHref!);
    await expectNotificationPageHealthy(page, templateEditHref!);
    await capture(page, templateEditHref!);

    await gotoDemoHrAdmin(page, "/hr-admin/notification-events");
    const eventEditHref = await page.locator("main a[href*='/hr-admin/notification-events/'][href$='/edit']").first().getAttribute("href");
    expect(eventEditHref, "Event catalog should expose an edit child route").toBeTruthy();
    await gotoDemoHrAdmin(page, eventEditHref!);
    await expectNotificationPageHealthy(page, eventEditHref!);
    await capture(page, eventEditHref!);

    for (const route of ["/hr-admin/notification-templates/new", "/hr-admin/notification-events/new"]) {
      await gotoDemoHrAdmin(page, route);
      await expectNotificationPageHealthy(page, route);
      await capture(page, route);
    }
  });

  test("notification pages remain usable on mobile width", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });

    for (const route of [
      "/hr-admin/notifications-admin",
      "/hr-admin/notification-delivery",
      "/hr-admin/notifications?status=failed",
      "/hr-admin/notification-templates",
      "/hr-admin/notification-events",
    ]) {
      await gotoDemoHrAdmin(page, route);
      await expectNotificationPageHealthy(page, route);
      await capture(page, `${route}-mobile`);
    }
  });
});
