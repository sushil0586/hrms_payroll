import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, chunks, discoverHrAdminRoutes, gotoDemoHrAdmin } from "../helpers/hr-admin-ui-audit";

const screenshotDir = path.join(process.cwd(), "test-results", "hr-admin-visual-audit");
const staticRoutes = discoverHrAdminRoutes();
const routePatterns = discoverHrAdminRoutes(undefined, true).map((route) => ({
  route,
  pattern: new RegExp(`^${route.replaceAll("/", "\\/").replace(/\[[^\]]+\]/g, "[^/]+")}$`),
}));
const checkedLinks = new Set<string>();

function slugForRoute(route: string) {
  return route
    .replace(/^\/+/, "")
    .replace(/[/?=&.#]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-$/, "");
}

function normalizeInternalHrAdminHref(rawHref: string, baseUrl: string) {
  const url = new URL(rawHref, baseUrl);
  if (url.origin !== new URL(baseUrl).origin) {
    return null;
  }
  if (!url.pathname.startsWith("/hr-admin")) {
    return null;
  }
  if (url.hash && !url.search) {
    return null;
  }
  if (url.pathname.includes("[") || url.pathname.includes("]") || url.pathname.includes("undefined") || url.pathname.includes("null")) {
    return null;
  }
  return `${url.pathname}${url.search}`;
}

async function captureVisualEvidence(page: Page, route: string) {
  mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: path.join(screenshotDir, `${slugForRoute(route)}.png`),
  });
}

async function expectRouteKnown(href: string, sourceRoute: string) {
  const pathname = href.split("?")[0];
  expect(
    routePatterns.some((route) => route.pattern.test(pathname)),
    `${sourceRoute} links to an unknown HR Admin route: ${href}`,
  ).toBe(true);
}

async function expectVisibleInternalLinksHealthy(page: Page, sourceRoute: string) {
  const hrefs = await page.locator("a[href]").evaluateAll((links) =>
    links
      .filter((link) => {
        const rect = link.getBoundingClientRect();
        const style = window.getComputedStyle(link);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      })
      .map((link) => (link as HTMLAnchorElement).href),
  );

  const internalLinks = [...new Set(hrefs.map((href) => normalizeInternalHrAdminHref(href, page.url())).filter((href): href is string => Boolean(href)))];

  for (const href of internalLinks) {
    await expectRouteKnown(href, sourceRoute);
    if (checkedLinks.has(href)) {
      continue;
    }
    checkedLinks.add(href);

    const response = await page.request.get(href, { failOnStatusCode: false, maxRedirects: 2, timeout: 20_000 });
    expect(response.status(), `${sourceRoute} has a visible link that does not open cleanly: ${href}`).toBeLessThan(400);
  }
}

async function expectNoClippedOrOffscreenControls(page: Page, route: string) {
  const issues = await page.locator("main button, main a.button, main input:not([type='hidden']), main select, main textarea, main summary").evaluateAll((elements) => {
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    function visibleRect(element: Element) {
      let rect = element.getBoundingClientRect();
      let left = rect.left;
      let right = rect.right;
      let top = rect.top;
      let bottom = rect.bottom;
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        const clipsX = /(auto|scroll|hidden|clip)/.test(style.overflowX);
        const clipsY = /(auto|scroll|hidden|clip)/.test(style.overflowY);
        if (clipsX || clipsY) {
          const parentRect = parent.getBoundingClientRect();
          if (clipsX) {
            left = Math.max(left, parentRect.left);
            right = Math.min(right, parentRect.right);
          }
          if (clipsY) {
            top = Math.max(top, parentRect.top);
            bottom = Math.min(bottom, parentRect.bottom);
          }
        }
        parent = parent.parentElement;
      }
      left = Math.max(left, 0);
      right = Math.min(right, viewportWidth);
      top = Math.max(top, 0);
      bottom = Math.min(bottom, viewportHeight);
      return { left, right, top, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top), original: rect };
    }

    return elements.flatMap((element) => {
      const style = window.getComputedStyle(element);
      const rect = visibleRect(element);
      if (rect.width <= 0 || rect.height <= 0 || style.display === "none" || style.visibility === "hidden") {
        return [];
      }

      const label = (element.textContent || element.getAttribute("aria-label") || element.getAttribute("name") || element.tagName).trim();
      const failures: string[] = [];
      if (rect.original.left < -1 || rect.original.right > viewportWidth + 1) {
        failures.push(`${label || element.tagName} is outside the viewport`);
      }
      if ((element.tagName === "BUTTON" || element.classList.contains("button")) && element.scrollWidth > element.clientWidth + 2) {
        failures.push(`${label || element.tagName} text is clipped`);
      }
      return failures;
    });
  });

  expect(issues, `${route} has clipped or offscreen controls`).toEqual([]);
}

async function expectNoInteractiveOverlap(page: Page, route: string) {
  const overlaps = await page.locator("main button, main a.button, main input:not([type='hidden']), main select, main textarea, main summary").evaluateAll((elements) => {
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    function visibleRect(element: Element) {
      let rect = element.getBoundingClientRect();
      let left = rect.left;
      let right = rect.right;
      let top = rect.top;
      let bottom = rect.bottom;
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        const clipsX = /(auto|scroll|hidden|clip)/.test(style.overflowX);
        const clipsY = /(auto|scroll|hidden|clip)/.test(style.overflowY);
        if (clipsX || clipsY) {
          const parentRect = parent.getBoundingClientRect();
          if (clipsX) {
            left = Math.max(left, parentRect.left);
            right = Math.min(right, parentRect.right);
          }
          if (clipsY) {
            top = Math.max(top, parentRect.top);
            bottom = Math.min(bottom, parentRect.bottom);
          }
        }
        parent = parent.parentElement;
      }
      left = Math.max(left, 0);
      right = Math.min(right, viewportWidth);
      top = Math.max(top, 0);
      bottom = Math.min(bottom, viewportHeight);
      return { left, right, top, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
    }

    const boxes = elements.flatMap((element, index) => {
      const rect = visibleRect(element);
      const style = window.getComputedStyle(element);
      if (rect.width <= 0 || rect.height <= 0 || style.display === "none" || style.visibility === "hidden") {
        return [];
      }
      return [{
        index,
        label: (element.textContent || element.getAttribute("aria-label") || element.getAttribute("name") || element.tagName).trim(),
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        area: rect.width * rect.height,
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

  expect(overlaps, `${route} has overlapping interactive controls`).toEqual([]);
}

async function auditVisualAndFunctionalRoute(page: Page, route: string) {
  await gotoDemoHrAdmin(page, route);
  await suppressBrowserTestNoise(page);
  await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
  await expect(page.locator("h1").first()).toBeVisible();
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await auditVisibleControls(page, route, 40);
  await expectNoClippedOrOffscreenControls(page, route);
  await expectNoInteractiveOverlap(page, route);
  await expectVisibleInternalLinksHealthy(page, route);
  await captureVisualEvidence(page, route);
}

test.describe("HR Admin visual and functional QA audit", () => {
  test.skip(staticRoutes.length === 0, "No HR Admin routes were discovered.");

  for (const [index, routes] of chunks(staticRoutes, 6).entries()) {
    test(`captures and audits HR Admin static visual group ${index + 1}`, async ({ page }) => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width: 1440, height: 960 });

      for (const route of routes) {
        await auditVisualAndFunctionalRoute(page, route);
      }
    });
  }
});
