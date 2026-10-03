import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal } from "../helpers/hr-admin-ui-audit";
import { gotoAuthenticated, tenantAdmin } from "../helpers/staging-auth";

const artifactDir = path.join(process.cwd(), "test-results/tenant-admin-governance-phase4");

const phase4Routes = [
  {
    path: "/tenant-admin/security-readiness",
    heading: "Enterprise Security Readiness",
    required: ["Security domains", "Launch posture", "Launch blockers"],
  },
  {
    path: "/tenant-admin/support-access",
    heading: "Support Access",
    required: ["Scoped support grants", "What support can access", "Scope guide"],
  },
  {
    path: "/tenant-admin/trust-audit",
    heading: "Tenant Trust Audit",
    required: ["Review scope", "Audit taxonomy", "Evidence ledger"],
  },
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

async function expectPhase4RouteHealthy(page: Page, route: (typeof phase4Routes)[number], label: string) {
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
  await auditVisibleControls(page, `${route.path} ${label}`, 84);
}

test.describe("Tenant Admin Phase 4 governance polish", () => {
  test("security readiness uses compact governance rows on desktop", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 960 });
    await expectPhase4RouteHealthy(page, phase4Routes[0], "desktop");

    await expect(page.locator(".tenant-security-workspace--phase4")).toHaveCount(2);
    await expect(page.locator(".tenant-security-command-band--phase6")).toBeVisible();
    await expect(page.locator(".tenant-security-domain-summary")).toHaveCount(3);
    await expect(page.locator(".tenant-governance-row").first()).toBeVisible();
    const rowsFit = await page.locator(".tenant-governance-row").evaluateAll((rows) =>
      rows.every((row) => row.scrollWidth <= row.clientWidth + 1),
    );
    expect(rowsFit, "Security governance rows should not horizontally scroll").toBe(true);
    await capture(page, "security-readiness-desktop");
  });

  test("support access keeps request and grant actions reachable on desktop", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 960 });
    await expectPhase4RouteHealthy(page, phase4Routes[1], "desktop");

    await expect(page.locator(".tenant-support-access-form--phase4")).toBeVisible();
    await expect(page.locator(".tenant-support-command-band--phase7")).toBeVisible();
    await expect(page.locator(".tenant-support-guardrail-grid")).toBeVisible();
    await expect(page.getByRole("button", { name: /request access/i })).toBeVisible();
    await expect(page.locator(".tenant-support-access-list--phase4")).toBeVisible();
    if (await page.locator(".tenant-support-access-row").count()) {
      await expect(page.locator(".tenant-support-access-row__actions").first()).toBeVisible();
    }
    await capture(page, "support-access-desktop");
  });

  test("trust audit filters and evidence ledger are usable on desktop", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 960 });
    await expectPhase4RouteHealthy(page, phase4Routes[2], "desktop");

    await expect(page.locator(".tenant-audit-filter-workspace--phase4")).toHaveCount(2);
    await expect(page.locator(".tenant-audit-command-band--phase7")).toBeVisible();
    await expect(page.locator(".tenant-audit-evidence-summary")).toBeVisible();
    await expect(page.locator(".tenant-audit-ledger--phase4")).toBeVisible();
    await expect(page.getByLabel("Trust audit pagination")).toBeVisible();
    await capture(page, "trust-audit-desktop");
  });

  test("phase 4 governance pages stay readable on mobile", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });

    for (const route of phase4Routes) {
      await expectPhase4RouteHealthy(page, route, "mobile");
      await capture(page, `${route.path.split("/").pop() ?? "route"}-mobile`);
    }

    await gotoAuthenticated(page, "/tenant-admin/security-readiness", tenantAdmin);
    await expect(page.locator(".tenant-governance-row").first()).toBeVisible();
    await gotoAuthenticated(page, "/tenant-admin/support-access", tenantAdmin);
    await expect(page.locator(".tenant-support-access-form--phase4")).toBeVisible();
    await gotoAuthenticated(page, "/tenant-admin/trust-audit", tenantAdmin);
    await expect(page.locator(".tenant-audit-ledger--phase4")).toBeVisible();
  });
});
