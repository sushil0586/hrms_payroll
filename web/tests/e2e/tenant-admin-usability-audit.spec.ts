import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal } from "../helpers/hr-admin-ui-audit";
import { gotoAuthenticated, tenantAdmin } from "../helpers/staging-auth";

type TenantRoute = {
  path: string;
  heading: string | RegExp;
  requiredText: string[];
};

const tenantRoutes: TenantRoute[] = [
  {
    path: "/tenant-admin",
    heading: "Account Control Center",
    requiredText: ["Tenant Status", "Items that need your attention", "User Management", "Access design"],
  },
  {
    path: "/tenant-admin/users",
    heading: "Tenant User Management",
    requiredText: ["User Directory", "Invite member", "Role coverage"],
  },
  {
    path: "/tenant-admin/roles",
    heading: "Roles & Permissions",
    requiredText: ["Access model", "Search roles", "Add role"],
  },
  {
    path: "/tenant-admin/plan",
    heading: "Plan & Billing",
    requiredText: ["Commercial profile", "Current subscription", "Change requests"],
  },
  {
    path: "/tenant-admin/setup",
    heading: "Tenant Setup Guide",
    requiredText: ["Setup areas", "Start master setup", "Dependency guardrails"],
  },
  {
    path: "/tenant-admin/settings",
    heading: "Tenant Settings",
    requiredText: ["Tenant account", "Governance checks", "Configuration health"],
  },
  {
    path: "/tenant-admin/security-readiness",
    heading: "Enterprise Security Readiness",
    requiredText: ["Security domains", "Launch posture", "Launch blockers"],
  },
  {
    path: "/tenant-admin/support-access",
    heading: "Support Access",
    requiredText: ["Scoped support grants", "What support can access", "Scope guide"],
  },
  {
    path: "/tenant-admin/trust-audit",
    heading: "Tenant Trust Audit",
    requiredText: ["Audit events", "Event groups", "Download audit"],
  },
];

const viewports = [
  { label: "desktop", width: 1440, height: 960 },
  { label: "mobile", width: 390, height: 844 },
] as const;

function normalizeTenantHref(rawHref: string, baseUrl: string) {
  const url = new URL(rawHref, baseUrl);
  if (url.origin !== new URL(baseUrl).origin) {
    return null;
  }
  if (!url.pathname.startsWith("/tenant-admin")) {
    return null;
  }
  if (url.pathname.includes("[") || url.pathname.includes("]") || url.pathname.includes("undefined") || url.pathname.includes("null")) {
    return null;
  }
  return `${url.pathname}${url.search}`;
}

async function expectNoVisibleControlCollisions(page: Page, route: TenantRoute) {
  const issues = await page.locator("main button, main a.button, main input:not([type='hidden']), main select, main textarea, main summary").evaluateAll((elements) => {
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

    const collisions: string[] = [];
    for (const box of boxes) {
      if (box.originalLeft < -1 || box.originalRight > document.documentElement.clientWidth + 1) {
        collisions.push(`${box.label || box.index} is outside the viewport`);
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
          collisions.push(`${first.label || first.index} overlaps ${second.label || second.index}`);
        }
      }
    }
    return collisions.slice(0, 8);
  });

  expect(issues, `${route.path} has clipped or overlapping controls`).toEqual([]);
}

async function expectVisibleTenantLinksResolve(page: Page, route: TenantRoute) {
  const hrefs = await page.locator("a[href]").evaluateAll((links) =>
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
  const tenantLinks = hrefs.map((href) => normalizeTenantHref(href, page.url())).filter((href): href is string => Boolean(href));

  for (const href of tenantLinks.slice(0, 12)) {
    const response = await page.request.get(href, { failOnStatusCode: false, maxRedirects: 2, timeout: 20_000 });
    expect(response.status(), `${route.path} has a visible tenant-admin link that does not open cleanly: ${href}`).toBeLessThan(400);
  }
}

async function auditTenantRoute(page: Page, route: TenantRoute) {
  await gotoAuthenticated(page, route.path, tenantAdmin);
  await suppressBrowserTestNoise(page);
  await expect(page.getByRole("main"), `${route.path} should expose a main landmark`).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: route.heading }), `${route.path} should expose the expected H1`).toBeVisible();
  if ((page.viewportSize()?.width ?? 1440) >= 980) {
    await expect(page.getByRole("navigation", { name: "Tenant Admin navigation" })).toBeVisible();
  } else {
    await expect(page.getByRole("banner").getByText("Search users, setup, audit...")).toBeVisible();
  }
  for (const text of route.requiredText) {
    await expect(page.getByRole("main").getByText(text, { exact: true }).first(), `${route.path} should include ${text}`).toBeVisible();
  }
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await expectVisibleLinksAreReal(page, route.path);
  await expectVisibleTenantLinksResolve(page, route);
  await auditVisibleControls(page, route.path, 72);
  await expectNoVisibleControlCollisions(page, route);
}

test.describe("Tenant Admin usability audit", () => {
  for (const viewport of viewports) {
    test(`all tenant-admin pages are usable at ${viewport.label}`, async ({ page }) => {
      test.setTimeout(360_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of tenantRoutes) {
        await auditTenantRoute(page, route);
      }
    });
  }
});
