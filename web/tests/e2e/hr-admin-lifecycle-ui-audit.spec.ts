import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal } from "../helpers/hr-admin-ui-audit";
import { gotoAuthenticated } from "../helpers/staging-auth";

const lifecycleStaticRoutes = [
  "/hr-admin/lifecycle",
  "/hr-admin/onboardings",
  "/hr-admin/onboardings/new",
  "/hr-admin/movements",
  "/hr-admin/movements/new",
  "/hr-admin/exits",
  "/hr-admin/exits/new",
  "/hr-admin/probation-reviews",
  "/hr-admin/probation-reviews/new",
];

const lifecycleRoutePatterns = [
  /^\/hr-admin\/lifecycle$/,
  /^\/hr-admin\/onboardings$/,
  /^\/hr-admin\/onboardings\/new$/,
  /^\/hr-admin\/onboardings\/[^/]+\/edit$/,
  /^\/hr-admin\/movements$/,
  /^\/hr-admin\/movements\/new$/,
  /^\/hr-admin\/movements\/[^/]+\/edit$/,
  /^\/hr-admin\/exits$/,
  /^\/hr-admin\/exits\/new$/,
  /^\/hr-admin\/exits\/[^/]+\/edit$/,
  /^\/hr-admin\/probation-reviews$/,
  /^\/hr-admin\/probation-reviews\/new$/,
  /^\/hr-admin\/probation-reviews\/[^/]+\/edit$/,
];

function normalizeLifecycleHref(rawHref: string, baseUrl: string) {
  const url = new URL(rawHref, baseUrl);
  if (url.origin !== new URL(baseUrl).origin) {
    return null;
  }
  if (!lifecycleRoutePatterns.some((pattern) => pattern.test(url.pathname))) {
    return null;
  }
  if (url.pathname.includes("[") || url.pathname.includes("]") || url.pathname.includes("undefined") || url.pathname.includes("null")) {
    return null;
  }
  return `${url.pathname}${url.search}`;
}

async function expectVisibleLifecycleLinksHealthy(page: Page, route: string) {
  const hrefs = await page.locator("a[href]").evaluateAll((links) =>
    links
      .filter((link) => {
        const rect = link.getBoundingClientRect();
        const style = window.getComputedStyle(link);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      })
      .map((link) => (link as HTMLAnchorElement).href),
  );
  const normalizedHrefs = [...new Set(hrefs.map((href) => normalizeLifecycleHref(href, page.url())).filter((href): href is string => Boolean(href)))];

  for (const href of normalizedHrefs) {
    const response = await page.request.get(href, { failOnStatusCode: false, maxRedirects: 2 });
    expect(response.status(), `${route} exposes a lifecycle link that does not open cleanly: ${href}`).toBeLessThan(400);
  }

  return normalizedHrefs;
}

async function expectNoOverlappingInteractiveControls(page: Page, route: string) {
  const overlaps = await page.locator("main button, main a.button, main input:not([type='hidden']), main select, main textarea, main summary").evaluateAll((elements) => {
    const boxes = elements.flatMap((element, index) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      if (rect.width <= 0 || rect.height <= 0 || style.display === "none" || style.visibility === "hidden") {
        return [];
      }
      return [{
        index,
        label: (element.textContent || element.getAttribute("aria-label") || element.getAttribute("name") || element.tagName).trim(),
        left: Math.max(rect.left, 0),
        right: Math.min(rect.right, document.documentElement.clientWidth),
        top: Math.max(rect.top, 0),
        bottom: Math.min(rect.bottom, document.documentElement.clientHeight),
        area: Math.max(0, rect.width) * Math.max(0, rect.height),
      }];
    });

    const findings: string[] = [];
    for (let firstIndex = 0; firstIndex < boxes.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < boxes.length; secondIndex += 1) {
        const first = boxes[firstIndex];
        const second = boxes[secondIndex];
        const overlapWidth = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
        const overlapHeight = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
        const overlapArea = overlapWidth * overlapHeight;
        const threshold = Math.min(first.area, second.area) * 0.18;
        if (overlapArea > 24 && overlapArea > threshold) {
          findings.push(`${first.label || first.index} overlaps ${second.label || second.index}`);
        }
      }
    }
    return findings.slice(0, 8);
  });

  expect(overlaps, `${route} has overlapping lifecycle controls`).toEqual([]);
}

async function auditLifecycleRoute(page: Page, route: string) {
  await gotoAuthenticated(page, route);
  await suppressBrowserTestNoise(page);
  await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
  await expect(page.locator("h1").first()).toBeVisible();
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await auditVisibleControls(page, route, 48);
  await expectVisibleLinksAreReal(page, route);
  await expectNoOverlappingInteractiveControls(page, route);
  return expectVisibleLifecycleLinksHealthy(page, route);
}

test.describe("HR Admin lifecycle UI audit", () => {
  test("certifies lifecycle static and exposed edit routes", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    const discoveredEditRoutes = new Set<string>();
    for (const route of lifecycleStaticRoutes) {
      const hrefs = await auditLifecycleRoute(page, route);
      for (const href of hrefs) {
        if (href.includes("/edit")) {
          discoveredEditRoutes.add(href);
        }
      }
    }

    for (const route of [...discoveredEditRoutes].sort()) {
      await auditLifecycleRoute(page, route);
    }
  });
});
