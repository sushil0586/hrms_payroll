import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal } from "../helpers/hr-admin-ui-audit";
import { gotoAuthenticated } from "../helpers/staging-auth";

const timeLeavePolicyRoutes = [
  "/hr-admin/attendance-operations",
  "/hr-admin/attendance-records",
  "/hr-admin/attendance-regularizations",
  "/hr-admin/leave-balances",
  "/hr-admin/policies",
  "/hr-admin/policy-assignments",
  "/hr-admin/leave-types",
  "/hr-admin/leave-types/new",
  "/hr-admin/leave-policies",
  "/hr-admin/leave-policies/new",
  "/hr-admin/leave-policy-assignments",
  "/hr-admin/leave-policy-assignments/new",
  "/hr-admin/shifts",
  "/hr-admin/shifts/new",
  "/hr-admin/holiday-calendars",
  "/hr-admin/holiday-calendars/new",
  "/hr-admin/attendance-policies",
  "/hr-admin/attendance-policies/new",
  "/hr-admin/attendance-policy-assignments",
  "/hr-admin/attendance-policy-assignments/new",
  "/hr-admin/employee-shift-assignments",
  "/hr-admin/employee-shift-assignments/new",
  "/hr-admin/shift-roster-templates",
  "/hr-admin/shift-roster-templates/new",
];

const timeLeavePolicyRouteGroups = [
  {
    name: "operations",
    routes: [
      "/hr-admin/attendance-operations",
      "/hr-admin/attendance-records",
      "/hr-admin/attendance-regularizations",
      "/hr-admin/leave-balances",
      "/hr-admin/policies",
      "/hr-admin/policy-assignments",
    ],
  },
  {
    name: "leave setup",
    routes: [
      "/hr-admin/leave-types",
      "/hr-admin/leave-types/new",
      "/hr-admin/leave-policies",
      "/hr-admin/leave-policies/new",
      "/hr-admin/leave-policy-assignments",
      "/hr-admin/leave-policy-assignments/new",
    ],
  },
  {
    name: "attendance setup",
    routes: [
      "/hr-admin/shifts",
      "/hr-admin/shifts/new",
      "/hr-admin/holiday-calendars",
      "/hr-admin/holiday-calendars/new",
      "/hr-admin/attendance-policies",
      "/hr-admin/attendance-policies/new",
    ],
  },
  {
    name: "assignment and roster setup",
    routes: [
      "/hr-admin/attendance-policy-assignments",
      "/hr-admin/attendance-policy-assignments/new",
      "/hr-admin/employee-shift-assignments",
      "/hr-admin/employee-shift-assignments/new",
      "/hr-admin/shift-roster-templates",
      "/hr-admin/shift-roster-templates/new",
    ],
  },
];

const timeLeavePolicyPathPatterns = [
  ...timeLeavePolicyRoutes.map((route) => new RegExp(`^${route.replaceAll("/", "\\/")}$`)),
  /^\/hr-admin\/attendance-records\/[^/]+\/edit$/,
  /^\/hr-admin\/attendance-regularizations\/[^/]+\/review$/,
  /^\/hr-admin\/attendance-policies\/[^/]+\/edit$/,
  /^\/hr-admin\/attendance-policy-assignments\/[^/]+\/edit$/,
  /^\/hr-admin\/employee-shift-assignments\/[^/]+\/edit$/,
  /^\/hr-admin\/holiday-calendars\/[^/]+\/edit$/,
  /^\/hr-admin\/leave-policies\/[^/]+\/edit$/,
  /^\/hr-admin\/leave-policy-assignments\/[^/]+\/edit$/,
  /^\/hr-admin\/leave-types\/[^/]+\/edit$/,
  /^\/hr-admin\/shift-roster-templates\/[^/]+\/edit$/,
  /^\/hr-admin\/shifts\/[^/]+\/edit$/,
];

const dynamicTimeLeavePolicyRoutes = [
  {
    name: "attendance record edit",
    sourceRoute: "/hr-admin/attendance-records",
    actionName: "Edit record",
    expectedUrl: /\/hr-admin\/attendance-records\/[^/]+\/edit/,
  },
  {
    name: "attendance regularization review",
    sourceRoute: "/hr-admin/attendance-regularizations",
    actionName: "Review request",
    expectedUrl: /\/hr-admin\/attendance-regularizations\/[^/]+\/review/,
  },
  {
    name: "attendance policy edit",
    sourceRoute: "/hr-admin/attendance-policies",
    actionName: "Edit",
    expectedUrl: /\/hr-admin\/attendance-policies\/[^/]+\/edit/,
  },
  {
    name: "attendance assignment edit",
    sourceRoute: "/hr-admin/attendance-policy-assignments",
    actionName: "Edit",
    expectedUrl: /\/hr-admin\/attendance-policy-assignments\/[^/]+\/edit/,
  },
  {
    name: "employee shift assignment edit",
    sourceRoute: "/hr-admin/employee-shift-assignments",
    actionName: "Edit",
    expectedUrl: /\/hr-admin\/employee-shift-assignments\/[^/]+\/edit/,
  },
  {
    name: "holiday calendar edit",
    sourceRoute: "/hr-admin/holiday-calendars",
    actionName: "Edit",
    expectedUrl: /\/hr-admin\/holiday-calendars\/[^/]+\/edit/,
  },
  {
    name: "leave policy edit",
    sourceRoute: "/hr-admin/leave-policies",
    actionName: "Edit",
    expectedUrl: /\/hr-admin\/leave-policies\/[^/]+\/edit/,
  },
  {
    name: "leave assignment edit",
    sourceRoute: "/hr-admin/leave-policy-assignments",
    actionName: "Edit",
    expectedUrl: /\/hr-admin\/leave-policy-assignments\/[^/]+\/edit/,
  },
  {
    name: "leave type edit",
    sourceRoute: "/hr-admin/leave-types",
    actionName: "Edit",
    expectedUrl: /\/hr-admin\/leave-types\/[^/]+\/edit/,
  },
  {
    name: "roster template edit",
    sourceRoute: "/hr-admin/shift-roster-templates",
    actionName: "Edit",
    expectedUrl: /\/hr-admin\/shift-roster-templates\/[^/]+\/edit/,
  },
  {
    name: "shift edit",
    sourceRoute: "/hr-admin/shifts",
    actionName: "Edit",
    expectedUrl: /\/hr-admin\/shifts\/[^/]+\/edit/,
  },
];

function normalizeTimeLeavePolicyHref(rawHref: string, baseUrl: string) {
  const url = new URL(rawHref, baseUrl);
  if (url.origin !== new URL(baseUrl).origin) {
    return null;
  }
  if (!timeLeavePolicyPathPatterns.some((pattern) => pattern.test(url.pathname))) {
    return null;
  }
  if (url.pathname.includes("[") || url.pathname.includes("]") || url.pathname.includes("undefined") || url.pathname.includes("null")) {
    return null;
  }
  return `${url.pathname}${url.search}`;
}

async function expectVisibleTimeLeavePolicyLinksHealthy(page: Page, route: string) {
  const hrefs = await page.locator("a[href]").evaluateAll((links) =>
    links
      .filter((link) => {
        const rect = link.getBoundingClientRect();
        const style = window.getComputedStyle(link);
        const hiddenByClosedDisclosure = Boolean(link.closest("details:not([open])") && link.tagName !== "SUMMARY");
        return !hiddenByClosedDisclosure && rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      })
      .map((link) => (link as HTMLAnchorElement).href),
  );
  const normalizedHrefs = [
    ...new Set(hrefs.map((href) => normalizeTimeLeavePolicyHref(href, page.url())).filter((href): href is string => Boolean(href))),
  ];

  for (const href of normalizedHrefs) {
    const response = await page.request.get(href, { failOnStatusCode: false, maxRedirects: 2 });
    expect(response.status(), `${route} exposes a time/leave/policy link that does not open cleanly: ${href}`).toBeLessThan(400);
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
      if (element.closest("details:not([open])") && element.tagName !== "SUMMARY") {
        return [];
      }
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

  expect(collisions, `${route} has clipped or overlapping time/leave/policy controls`).toEqual([]);
}

async function auditCurrentTimeLeavePolicyPage(page: Page, route: string) {
  await suppressBrowserTestNoise(page);
  await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
  await expect(page.locator("h1").first()).toBeVisible();
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await auditVisibleControls(page, route, 64);
  await expectVisibleLinksAreReal(page, route);
  await expectNoVisibleControlCollisions(page, route);
  await expectVisibleTimeLeavePolicyLinksHealthy(page, route);
}

async function auditTimeLeavePolicyRoute(page: Page, route: string) {
  await gotoAuthenticated(page, route);
  await auditCurrentTimeLeavePolicyPage(page, route);
}

async function auditLinkedTimeLeavePolicyRoute(
  page: Page,
  sourceRoute: string,
  actionName: string,
  expectedUrl: RegExp,
  routeName: string,
) {
  await gotoAuthenticated(page, sourceRoute);
  const action = page.getByRole("link", { name: actionName, exact: true }).first();
  if ((await action.count()) === 0) {
    await auditCurrentTimeLeavePolicyPage(page, sourceRoute);
    return;
  }
  await expect(action, `${sourceRoute} should expose a ${routeName} link`).toBeVisible();
  await action.click();
  await expect(page, `${routeName} should open the intended child page`).toHaveURL(expectedUrl);
  await auditCurrentTimeLeavePolicyPage(page, routeName);
}

test.describe("HR Admin time, leave, and policy UI audit", () => {
  for (const routeGroup of timeLeavePolicyRouteGroups) {
    test(`certifies ${routeGroup.name} page layout, controls, and internal links`, async ({ page }) => {
      test.setTimeout(360_000);
      await page.setViewportSize({ width: 1440, height: 960 });

      for (const route of routeGroup.routes) {
        await auditTimeLeavePolicyRoute(page, route);
      }
    });
  }

  test("certifies time/leave/policy dynamic edit links", async ({ page }) => {
    test.setTimeout(600_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    for (const dynamicRoute of dynamicTimeLeavePolicyRoutes) {
      await auditLinkedTimeLeavePolicyRoute(
        page,
        dynamicRoute.sourceRoute,
        dynamicRoute.actionName,
        dynamicRoute.expectedUrl,
        dynamicRoute.name,
      );
    }
  });
});
