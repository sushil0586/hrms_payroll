import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal } from "../helpers/hr-admin-ui-audit";
import { employee, gotoAuthenticated, manager, type Persona } from "../helpers/staging-auth";

const essRoutes = [
  "/ess",
  "/ess/payslips",
  "/ess/statutory-declarations",
  "/ess/documents",
  "/ess/notifications",
];

const mssRoutes = [
  "/mss",
  "/mss/approvals",
  "/mss/approvals?queue=attendance",
  "/mss/notifications",
];

const routePathPatterns = [...essRoutes, ...mssRoutes]
  .map((route) => route.split("?")[0])
  .map((route) => new RegExp(`^${route.replaceAll("/", "\\/")}$`));

function normalizeSelfServiceHref(rawHref: string, baseUrl: string, route: string) {
  const url = new URL(rawHref, baseUrl);
  if (url.origin !== new URL(baseUrl).origin) {
    return null;
  }
  if (!routePathPatterns.some((pattern) => pattern.test(url.pathname))) {
    return null;
  }
  if (url.pathname.includes("[") || url.pathname.includes("]") || url.pathname.includes("undefined") || url.pathname.includes("null")) {
    return null;
  }

  const isEssRoute = route.startsWith("/ess");
  const isMssRoute = route.startsWith("/mss");
  if (isEssRoute && !url.pathname.startsWith("/ess")) {
    return null;
  }
  if (isMssRoute && !url.pathname.startsWith("/mss") && !url.pathname.startsWith("/ess")) {
    return null;
  }
  return `${url.pathname}${url.search}`;
}

async function expectVisibleSelfServiceLinksHealthy(page: Page, route: string) {
  const hrefs = await page.locator("a[href]").evaluateAll((links) =>
    links
      .filter((link) => {
        const rect = link.getBoundingClientRect();
        const style = window.getComputedStyle(link);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      })
      .map((link) => (link as HTMLAnchorElement).href),
  );
  const normalizedHrefs = [
    ...new Set(hrefs.map((href) => normalizeSelfServiceHref(href, page.url(), route)).filter((href): href is string => Boolean(href))),
  ];

  for (const href of normalizedHrefs) {
    const response = await page.request.get(href, { failOnStatusCode: false, maxRedirects: 2 });
    expect(response.status(), `${route} exposes a self-service link that does not open cleanly: ${href}`).toBeLessThan(400);
  }
}

async function expectNoVisibleControlCollisions(page: Page, route: string) {
  const collisions = await page.locator("main button, main a.button, main input:not([type='hidden']), main select, main textarea, main summary").evaluateAll((elements) => {
    function clippedRect(element: Element) {
      const rect = element.getBoundingClientRect();
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
      return [
        {
          index,
          label: (element.textContent || element.getAttribute("aria-label") || element.getAttribute("name") || element.tagName).trim(),
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          area: rect.width * rect.height,
          originalLeft: rect.original.left,
          originalRight: rect.original.right,
        },
      ];
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

  expect(collisions, `${route} has clipped or overlapping self-service controls`).toEqual([]);
}

async function auditSelfServiceRoute(page: Page, route: string, persona: Persona) {
  await gotoAuthenticated(page, route, persona);
  await suppressBrowserTestNoise(page);
  await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
  await expect(page.locator("h1").first()).toBeVisible();
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await auditVisibleControls(page, route, 64);
  await expectVisibleLinksAreReal(page, route);
  await expectNoVisibleControlCollisions(page, route);
  await expectVisibleSelfServiceLinksHealthy(page, route);
}

test.describe("ESS/MSS visual and functional route audit", () => {
  test("certifies employee self-service page layout, controls, and links", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    for (const route of essRoutes) {
      await auditSelfServiceRoute(page, route, employee);
    }
  });

  test("certifies manager self-service page layout, controls, and links", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    for (const route of mssRoutes) {
      await auditSelfServiceRoute(page, route, manager);
    }
  });
});
