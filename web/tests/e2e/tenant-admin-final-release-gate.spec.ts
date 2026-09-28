import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal } from "../helpers/hr-admin-ui-audit";
import { gotoAuthenticated, tenantAdmin } from "../helpers/staging-auth";

type TenantRoute = {
  path: string;
  heading: string | RegExp;
  navLabel: string;
  requiredText: string[];
};

const artifactDir = path.join(process.cwd(), "test-results/tenant-admin-final-release-gate");

const tenantRoutes: TenantRoute[] = [
  {
    path: "/tenant-admin",
    heading: "Account Control Center",
    navLabel: "Dashboard",
    requiredText: ["Tenant Status", "Items that need your attention", "User Management", "Access design"],
  },
  {
    path: "/tenant-admin/users",
    heading: "Tenant User Management",
    navLabel: "Users",
    requiredText: ["User Directory", "Invite member", "Role coverage"],
  },
  {
    path: "/tenant-admin/roles",
    heading: "Roles & Permissions",
    navLabel: "Roles",
    requiredText: ["Access model", "Search roles", "Add role"],
  },
  {
    path: "/tenant-admin/plan",
    heading: "Plan & Billing",
    navLabel: "Plan",
    requiredText: ["Commercial profile", "Current subscription", "Change requests"],
  },
  {
    path: "/tenant-admin/setup",
    heading: "Tenant Setup Guide",
    navLabel: "Setup Guide",
    requiredText: ["Setup areas", "Start master setup", "Dependency guardrails"],
  },
  {
    path: "/tenant-admin/settings",
    heading: "Tenant Settings",
    navLabel: "Settings",
    requiredText: ["Tenant account", "Readiness checks", "Published setup"],
  },
  {
    path: "/tenant-admin/security-readiness",
    heading: "Enterprise Security Readiness",
    navLabel: "Security",
    requiredText: ["Security domains", "Launch posture", "Launch blockers"],
  },
  {
    path: "/tenant-admin/support-access",
    heading: "Support Access",
    navLabel: "Support Access",
    requiredText: ["Scoped support grants", "What support can access", "Scope guide"],
  },
  {
    path: "/tenant-admin/trust-audit",
    heading: "Tenant Trust Audit",
    navLabel: "Trust Audit",
    requiredText: ["Event groups", "Audit taxonomy", "Evidence ledger"],
  },
];

const viewports = [
  { label: "desktop", width: 1440, height: 960 },
  { label: "mobile", width: 390, height: 844 },
] as const;

function slug(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

async function capture(page: Page, name: string) {
  mkdirSync(artifactDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactDir, `${slug(name)}.png`), fullPage: true, animations: "disabled" });
}

function normalizeInternalHref(rawHref: string, baseUrl: string) {
  const url = new URL(rawHref, baseUrl);
  const base = new URL(baseUrl);
  if (url.origin !== base.origin) {
    return null;
  }
  if (url.pathname.includes("[") || url.pathname.includes("]") || url.pathname.includes("undefined") || url.pathname.includes("null")) {
    return null;
  }
  return `${url.pathname}${url.search}`;
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
  const internalLinks = hrefs
    .map((href) => normalizeInternalHref(href, page.url()))
    .filter((href): href is string => Boolean(href));

  for (const href of internalLinks.slice(0, 16)) {
    const response = await page.request.get(href, { failOnStatusCode: false, maxRedirects: 2, timeout: 20_000 });
    expect(response.status(), `${label} visible internal link should resolve: ${href}`).toBeLessThan(400);
  }
}

async function expectNoCrowdedControls(page: Page, label: string) {
  const issues = await page.locator("main button, main a.button, main input:not([type='hidden']), main select, main textarea, main summary").evaluateAll((elements) =>
    elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0) {
        return [];
      }
      const name = (element.textContent || element.getAttribute("aria-label") || element.getAttribute("placeholder") || element.tagName).trim();
      const isChoice = element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type);
      const minimumSize = isChoice ? 16 : 28;
      const textClipped = (element instanceof HTMLButtonElement || element.classList.contains("button")) && element.scrollWidth > element.clientWidth + 2;
      if (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1) {
        return [`${name || element.tagName} is outside viewport`];
      }
      if (rect.width < minimumSize || rect.height < minimumSize) {
        return [`${name || element.tagName} is too small`];
      }
      if (textClipped) {
        return [`${name || element.tagName} text is clipped`];
      }
      return [];
    }).slice(0, 8),
  );
  expect(issues, `${label} should not expose clipped or undersized controls`).toEqual([]);
}

async function expectRouteReleaseReady(page: Page, route: TenantRoute, viewportLabel: string) {
  await gotoAuthenticated(page, route.path, tenantAdmin);
  await suppressBrowserTestNoise(page);
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  for (const text of route.requiredText) {
    await expect(page.getByRole("main").getByText(text, { exact: true }).first(), `${route.path} should include ${text}`).toBeVisible();
  }

  if (viewportLabel === "desktop") {
    const navigation = page.getByRole("navigation", { name: "Tenant Admin navigation" });
    await expect(navigation).toBeVisible();
    const activeLinks = await navigation.locator('a[aria-current="page"]').evaluateAll((links) =>
      links.map((link) => link.textContent?.replace(/\s+/g, " ").trim() ?? ""),
    );
    expect(activeLinks, `${route.path} should mark exactly one active tenant-admin nav item`).toHaveLength(1);
    expect(activeLinks[0], `${route.path} should mark ${route.navLabel} active`).toContain(route.navLabel);
  }

  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await expectVisibleLinksAreReal(page, `${route.path} ${viewportLabel}`);
  await expectVisibleInternalLinksResolve(page, `${route.path} ${viewportLabel}`);
  await auditVisibleControls(page, `${route.path} ${viewportLabel}`, 96);
  await expectNoCrowdedControls(page, `${route.path} ${viewportLabel}`);
  await capture(page, `${route.path.replace("/tenant-admin", "tenant-admin-home")}-${viewportLabel}`);
}

async function expectDialogOpensAndCloses(page: Page, buttonName: string | RegExp, dialogName: string | RegExp) {
  const trigger = page.getByRole("main").getByRole("button", { name: buttonName }).first();
  await expect(trigger).toBeVisible();
  await expect(trigger).toBeEnabled();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: dialogName }).first();
  await expect(dialog).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const close = dialog.getByRole("button", { name: /close|cancel/i }).first();
  await expect(close).toBeVisible();
  await close.click();
  await expect(dialog).toBeHidden();
}

test.describe("Tenant Admin final release gate", () => {
  for (const viewport of viewports) {
    test(`all tenant-admin pages are release-ready at ${viewport.label}`, async ({ page }) => {
      test.setTimeout(420_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of tenantRoutes) {
        await expectRouteReleaseReady(page, route, viewport.label);
      }
    });
  }

  test("safe account-control dialogs and filters are release-ready", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    await gotoAuthenticated(page, "/tenant-admin/users", tenantAdmin);
    await expectDialogOpensAndCloses(page, /invite member/i, /invite tenant member/i);
    await expectDialogOpensAndCloses(page, /update roles/i, /update tenant member roles/i);
    await page.getByRole("main").getByLabel("Search members").fill("no-member-matches-release-gate");
    await expect(page.getByText("No members match the current search.")).toBeVisible();

    await gotoAuthenticated(page, "/tenant-admin/roles", tenantAdmin);
    await expectDialogOpensAndCloses(page, /add role/i, /create tenant role/i);
    await expectDialogOpensAndCloses(page, /^edit$/i, /update tenant role/i);
    await page.getByRole("main").getByPlaceholder("Role, code, permission, status").fill("no-role-matches-release-gate");
    await expect(page.getByText("No roles match the current search.")).toBeVisible();

    await gotoAuthenticated(page, "/tenant-admin/support-access", tenantAdmin);
    await page.getByRole("main").getByLabel("Search support grants").fill("no-grants-match-release-gate");
    await expect(page.getByText("No support grants match the current search.")).toBeVisible();

    await gotoAuthenticated(page, "/tenant-admin/trust-audit?event_group=support", tenantAdmin);
    await expect(page.getByRole("heading", { level: 1, name: "Tenant Trust Audit" })).toBeVisible();
    await expect(page.getByLabel("Trust audit pagination")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await capture(page, "safe-dialogs-and-filters-desktop");
  });
});
