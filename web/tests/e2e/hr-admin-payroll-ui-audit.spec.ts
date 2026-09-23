import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal } from "../helpers/hr-admin-ui-audit";
import { gotoAuthenticated } from "../helpers/staging-auth";

const payrollCoreRoutes = [
  "/hr-admin/payroll-readiness",
  "/hr-admin/payroll-setup",
  "/hr-admin/salary-setup",
  "/hr-admin/payroll-inputs",
  "/hr-admin/payroll-rules",
  "/hr-admin/payroll-adjustments",
  "/hr-admin/payroll-settlements",
  "/hr-admin/payroll-calculations",
  "/hr-admin/payroll-review",
  "/hr-admin/payroll-outputs",
  "/hr-admin/payroll-handoff",
  "/hr-admin/payroll-statutory",
  "/hr-admin/payroll-providers",
];

const payrollCorePathPatterns = [
  /^\/hr-admin\/payroll-readiness$/,
  /^\/hr-admin\/payroll-setup$/,
  /^\/hr-admin\/salary-setup$/,
  /^\/hr-admin\/payroll-inputs$/,
  /^\/hr-admin\/payroll-rules$/,
  /^\/hr-admin\/payroll-adjustments$/,
  /^\/hr-admin\/payroll-settlements$/,
  /^\/hr-admin\/payroll-calculations$/,
  /^\/hr-admin\/payroll-review$/,
  /^\/hr-admin\/payroll-outputs$/,
  /^\/hr-admin\/payroll-handoff$/,
  /^\/hr-admin\/payroll-statutory$/,
  /^\/hr-admin\/payroll-providers$/,
];

function normalizePayrollHref(rawHref: string, baseUrl: string) {
  const url = new URL(rawHref, baseUrl);
  if (url.origin !== new URL(baseUrl).origin) {
    return null;
  }
  if (!payrollCorePathPatterns.some((pattern) => pattern.test(url.pathname))) {
    return null;
  }
  if (url.pathname.includes("[") || url.pathname.includes("]") || url.pathname.includes("undefined") || url.pathname.includes("null")) {
    return null;
  }
  return `${url.pathname}${url.search}`;
}

async function expectVisiblePayrollLinksHealthy(page: Page, route: string) {
  const hrefs = await page.locator("a[href]").evaluateAll((links) =>
    links
      .filter((link) => {
        const rect = link.getBoundingClientRect();
        const style = window.getComputedStyle(link);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      })
      .map((link) => (link as HTMLAnchorElement).href),
  );
  const normalizedHrefs = [...new Set(hrefs.map((href) => normalizePayrollHref(href, page.url())).filter((href): href is string => Boolean(href)))];
  const unsupportedPayrollHrefs = hrefs.filter((href) => {
    const url = new URL(href, page.url());
    return url.origin === new URL(page.url()).origin
      && url.pathname.startsWith("/hr-admin/payroll")
      && !normalizePayrollHref(href, page.url());
  });

  expect(unsupportedPayrollHrefs, `${route} exposes unsupported payroll hrefs`).toEqual([]);
  expect(normalizedHrefs.length, `${route} should expose at least one certified payroll navigation link`).toBeGreaterThan(0);
}

async function expectNoVisibleControlCollisions(page: Page, route: string) {
  const collisions = await page.locator("main button, main a.button, main input:not([type='hidden']), main select, main textarea, main summary").evaluateAll((elements) => {
    function clippedRect(element: Element) {
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
      right = Math.min(right, document.documentElement.clientWidth);
      top = Math.max(top, 0);
      bottom = Math.min(bottom, document.documentElement.clientHeight);
      return { left, right, top, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top), original: rect };
    }

    const boxes = elements.flatMap((element, index) => {
      const rect = clippedRect(element);
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
        originalLeft: rect.original.left,
        originalRight: rect.original.right,
      }];
    });

    const issues: string[] = [];
    for (const box of boxes) {
      if (box.originalLeft < -1 || box.originalRight > document.documentElement.clientWidth + 1) {
        issues.push(`${box.label || box.index} is outside the viewport`);
      }
    }
    for (let firstIndex = 0; firstIndex < boxes.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < boxes.length; secondIndex += 1) {
        const first = boxes[firstIndex];
        const second = boxes[secondIndex];
        const overlapWidth = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
        const overlapHeight = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
        const overlapArea = overlapWidth * overlapHeight;
        const threshold = Math.min(first.area, second.area) * 0.18;
        if (overlapArea > 24 && overlapArea > threshold) {
          issues.push(`${first.label || first.index} overlaps ${second.label || second.index}`);
        }
      }
    }
    return issues.slice(0, 8);
  });

  expect(collisions, `${route} has clipped or overlapping payroll controls`).toEqual([]);
}

async function auditPayrollCoreRoute(page: Page, route: string) {
  await gotoAuthenticated(page, route);
  await suppressBrowserTestNoise(page);
  await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
  await expect(page.locator("h1").first()).toBeVisible();
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await auditVisibleControls(page, route, 52);
  await expectVisibleLinksAreReal(page, route);
  await expectNoVisibleControlCollisions(page, route);
  await expectVisiblePayrollLinksHealthy(page, route);
}

test.describe("HR Admin payroll core UI audit", () => {
  test("certifies payroll core page layout, controls, and internal links", async ({ page }) => {
    test.setTimeout(360_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    for (const route of payrollCoreRoutes) {
      await auditPayrollCoreRoute(page, route);
    }
  });
});
