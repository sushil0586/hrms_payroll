import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal } from "../helpers/hr-admin-ui-audit";
import { employee, gotoAuthenticated, hrAdmin, manager, platformAdmin, tenantAdmin, type Persona } from "../helpers/staging-auth";

type RcRoute = {
  path: string;
  heading: string | RegExp;
  label: string;
  persona?: Persona;
};

const viewports = [
  { label: "desktop", width: 1440, height: 960 },
  { label: "mobile", width: 390, height: 844 },
] as const;

const releaseCandidateRoutes: RcRoute[] = [
  { path: "/", heading: /Run payroll, compliance, and employee operations/i, label: "public-home" },
  { path: "/login", heading: "Sign in", label: "login" },
  { path: "/platform-admin", heading: "Platform Admin Dashboard", label: "platform-dashboard", persona: platformAdmin },
  { path: "/platform-admin/leads", heading: "Leads", label: "platform-leads", persona: platformAdmin },
  { path: "/platform-admin/tenants", heading: "Tenants", label: "platform-tenants", persona: platformAdmin },
  { path: "/platform-admin/onboarding", heading: "Launch Readiness", label: "platform-launch", persona: platformAdmin },
  { path: "/platform-admin/policy-packs", heading: "Setup Templates", label: "platform-templates", persona: platformAdmin },
  { path: "/tenant-admin", heading: "Account Control Center", label: "tenant-dashboard", persona: tenantAdmin },
  { path: "/tenant-admin/users", heading: "Tenant User Management", label: "tenant-users", persona: tenantAdmin },
  { path: "/tenant-admin/security-readiness", heading: "Enterprise Security Readiness", label: "tenant-security", persona: tenantAdmin },
  { path: "/hr-admin", heading: "Control center", label: "hr-dashboard", persona: hrAdmin },
  { path: "/hr-admin/employees", heading: "Employees", label: "hr-employees", persona: hrAdmin },
  { path: "/hr-admin/organization", heading: "Organization masters", label: "hr-organization", persona: hrAdmin },
  { path: "/hr-admin/payroll-readiness", heading: "Payroll Readiness", label: "hr-payroll-readiness", persona: hrAdmin },
  { path: "/hr-admin/documents", heading: "Documents control", label: "hr-documents", persona: hrAdmin },
  { path: "/hr-admin/notifications-admin", heading: "Notifications", label: "hr-notifications-admin", persona: hrAdmin },
  { path: "/hr-admin/reports", heading: "Reports", label: "hr-reports", persona: hrAdmin },
  { path: "/ess", heading: /self service/i, label: "ess-overview", persona: employee },
  { path: "/ess/payslips", heading: "Payslips", label: "ess-payslips", persona: employee },
  { path: "/ess/documents", heading: "Documents", label: "ess-documents", persona: employee },
  { path: "/ess/notifications", heading: "Notifications", label: "ess-notifications", persona: employee },
  { path: "/mss", heading: "Manager control center", label: "mss-dashboard", persona: manager },
  { path: "/mss/approvals", heading: "Manager inbox", label: "mss-approvals", persona: manager },
  { path: "/mss/notifications", heading: "Notifications", label: "mss-notifications", persona: manager },
];

async function openRoute(page: Page, route: RcRoute) {
  if (route.persona) {
    await gotoAuthenticated(page, route.path, route.persona);
    return;
  }
  await page.goto(route.path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

async function expectRouteReady(page: Page, route: RcRoute) {
  await suppressBrowserTestNoise(page);
  await expect(page.getByRole("main"), `${route.path} should expose a main landmark`).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: route.heading }), `${route.path} should expose the expected H1`).toBeVisible();
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await expectVisibleLinksAreReal(page, route.path);
  await auditVisibleControls(page, route.path, 64);
}

async function expectNoVisibleControlCollisions(page: Page, route: RcRoute) {
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

test.describe("Release candidate cross-workspace UI gate", () => {
  for (const viewport of viewports) {
    test(`launch-critical routes are clean at ${viewport.label}`, async ({ page }) => {
      test.setTimeout(360_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of releaseCandidateRoutes) {
        await openRoute(page, route);
        await expectRouteReady(page, route);
        await expectNoVisibleControlCollisions(page, route);
      }
    });
  }
});
