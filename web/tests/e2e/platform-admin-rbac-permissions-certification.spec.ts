import { expect, type APIResponse, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin, platformAdmin, tenantAdmin, type Persona } from "../helpers/staging-auth";

type TenantListItem = {
  id: string;
  code: string;
  name: string;
};

type PolicyPack = {
  id: string;
  code: string;
  name: string;
  status: string;
};

const platformRoutes = [
  { label: "Dashboard", path: "/platform-admin", testId: "platform-admin-control-center" },
  { label: "Leads", path: "/platform-admin/leads", testId: "platform-admin-leads-panel" },
  { label: "Tenants", path: "/platform-admin/tenants", testId: "platform-admin-tenants-panel" },
  { label: "Launch Readiness", path: "/platform-admin/onboarding", testId: "platform-admin-onboarding-panel" },
  { label: "Admin Access", path: "/platform-admin/admins", testId: "platform-admin-admins-panel" },
  { label: "Setup Templates", path: "/platform-admin/policy-packs", testId: "platform-admin-policy-packs-panel" },
  { label: "Permissions", path: "/platform-admin/permissions", heading: "Permission Catalog" },
  { label: "Audit Logs", path: "/platform-admin/audit-logs", testId: "platform-admin-events-panel" },
] as const;

function uniqueRunRef() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14).toLowerCase();
}

async function loginAs(page: Page, persona: Persona, path: string) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  await gotoAuthenticated(page, path, persona);
}

async function expectDenied(response: APIResponse, label: string) {
  expect([401, 403, 404, 405], `${label} status`).toContain(response.status());
  const payload = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  const serialized = JSON.stringify(payload).toLowerCase();
  expect(serialized, `${label} should not expose credentials`).not.toContain("password");
  expect(serialized, `${label} should not expose tokens`).not.toContain("token");
  expect(serialized, `${label} should not expose secrets`).not.toContain("secret");
  expect(serialized, `${label} should not expose traceback`).not.toContain("traceback");
}

async function createTenantViaApi(page: Page, tenantCode: string) {
  const response = await page.request.post("/api/platform/tenants", {
    data: {
      code: tenantCode,
      name: `QA RBAC Tenant ${tenantCode}`,
      legal_name: `QA RBAC Tenant ${tenantCode} Pvt Ltd`,
      primary_email: `ops.${tenantCode}@example.test`,
      primary_domain: `${tenantCode}.example.test`,
      subscription_plan: "growth",
      seed_pack: "standard_office",
      timezone: "Asia/Kolkata",
      country_code: "IN",
      is_sandbox: true,
    },
  });
  expect(response.ok(), `create tenant ${tenantCode}`).toBeTruthy();
  const tenantsResponse = await page.request.get("/api/platform/tenants");
  expect(tenantsResponse.ok()).toBeTruthy();
  const tenants = (await tenantsResponse.json()) as TenantListItem[];
  const tenant = tenants.find((item) => item.code === tenantCode);
  expect(tenant, `tenant ${tenantCode}`).toBeTruthy();
  return tenant as TenantListItem;
}

async function createPolicyPackViaApi(page: Page, packCode: string) {
  const response = await page.request.post("/api/platform-policy-packs", {
    data: {
      code: packCode,
      name: `QA RBAC Template ${packCode}`,
      domain: "leave",
      status: "draft",
      version: 1,
      country_code: "IN",
      industry_tag: "qa",
      description: "RBAC denial certification template.",
    },
  });
  expect(response.ok(), `create policy pack ${packCode}`).toBeTruthy();
  const packsResponse = await page.request.get("/api/platform-policy-packs");
  expect(packsResponse.ok()).toBeTruthy();
  const packs = (await packsResponse.json()) as PolicyPack[];
  const pack = packs.find((item) => item.code === packCode);
  expect(pack, `policy pack ${packCode}`).toBeTruthy();
  return pack as PolicyPack;
}

async function expectPlatformRouteAllowed(page: Page, route: (typeof platformRoutes)[number]) {
  await page.goto(route.path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await expect(page).toHaveURL(new RegExp(route.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  if ("testId" in route) {
    await expect(page.getByTestId(route.testId)).toBeVisible();
  }
  if ("heading" in route) {
    await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
  }
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
}

async function expectPlatformRouteDenied(page: Page, persona: Persona, routePath: string) {
  await loginAs(page, persona, routePath);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-testid^="platform-admin-"]')).toHaveCount(0);
  await expect(page.locator('a[href^="/platform-admin"]')).toHaveCount(0);
  await expectNoAppError(page);
}

test.describe("Platform admin RBAC and permissions certification", () => {
  test("certifies Platform Admin menu, routes, and permission catalog are available only to platform operators", async ({ page }) => {
    test.setTimeout(240_000);
    await gotoAuthenticated(page, "/platform-admin", platformAdmin);
    await suppressBrowserTestNoise(page);

    for (const route of platformRoutes) {
      await expect(page.locator(`a[href="${route.path}"]`).first()).toBeVisible();
      await expectPlatformRouteAllowed(page, route);
    }

    const permissionResponse = await page.request.get("/api/platform/permission-catalog");
    expect(permissionResponse.ok()).toBeTruthy();
    const catalog = (await permissionResponse.json()) as Array<{ key: string; label: string; module: string }>;
    expect(catalog.length).toBeGreaterThan(0);
    expect(new Set(catalog.map((item) => item.key)).size).toBe(catalog.length);
    for (const item of catalog) {
      expect(item.key.trim(), "permission key").toBeTruthy();
      expect(item.label.trim(), `label for ${item.key}`).toBeTruthy();
      expect(item.module.trim(), `module for ${item.key}`).toBeTruthy();
    }

    for (const persona of [hrAdmin, tenantAdmin]) {
      await loginAs(page, persona, "/");
      await expect(page.locator('a[href^="/platform-admin"]')).toHaveCount(0);
      for (const route of platformRoutes) {
        await expectPlatformRouteDenied(page, persona, route.path);
      }
      await expectDenied(await page.request.get("/api/platform/permission-catalog"), `${persona.username} permission catalog list`);
      await expectDenied(
        await page.request.patch("/api/platform/permission-catalog/tenant.roles.manage", {
          data: { label: "Blocked label change" },
        }),
        `${persona.username} permission catalog edit`,
      );
    }
  });

  test("certifies restricted users cannot invoke hidden Platform Admin mutations through browser-authenticated APIs", async ({ page }) => {
    test.setTimeout(180_000);
    const runRef = uniqueRunRef();

    await gotoAuthenticated(page, "/platform-admin", platformAdmin);
    const tenant = await createTenantViaApi(page, `qa-rbac-${runRef}`);
    const pack = await createPolicyPackViaApi(page, `qa-rbac-pack-${runRef}`);

    await loginAs(page, hrAdmin, "/");

    await expectDenied(await page.request.get("/api/platform/summary"), "summary");
    await expectDenied(await page.request.get("/api/platform/leads"), "lead list");
    await expectDenied(await page.request.patch("/api/platform/leads/00000000-0000-0000-0000-000000000000", {
      data: { status: "qualified" },
    }), "lead status mutation");
    await expectDenied(await page.request.post("/api/platform/leads/00000000-0000-0000-0000-000000000000/convert", {
      data: { tenant_code: `blocked-${runRef}`, tenant_name: "Blocked Tenant" },
    }), "lead conversion");

    await expectDenied(await page.request.get("/api/platform/tenants"), "tenant list");
    await expectDenied(await page.request.post("/api/platform/tenants", {
      data: { code: `blocked-${runRef}`, name: "Blocked Tenant" },
    }), "tenant create");
    await expectDenied(await page.request.patch(`/api/platform/tenants/${tenant.id}`, {
      data: { name: "Blocked Edit" },
    }), "tenant edit");
    await expectDenied(await page.request.get(`/api/platform/tenants/${tenant.id}/onboarding`), "launch readiness view");
    await expectDenied(await page.request.patch(`/api/platform/tenants/${tenant.id}/onboarding`, {
      data: { onboarding_owner: "Blocked Owner" },
    }), "launch readiness metadata edit");
    await expectDenied(await page.request.post(`/api/platform/tenants/${tenant.id}/admin-contacts`, {
      data: { full_name: "Blocked Admin", email: `blocked.${runRef}@example.test`, is_primary: true },
    }), "admin contact create");
    await expectDenied(await page.request.post(`/api/platform/admin-contacts/00000000-0000-0000-0000-000000000000/provision-user`, {
      data: { username: `blocked.${runRef}`, password: "Password@123", role: "hr_admin" },
    }), "admin provisioning");
    await expectDenied(await page.request.post(`/api/platform/tenants/${tenant.id}/onboarding/mark-baseline-published`), "baseline publish");
    await expectDenied(await page.request.post(`/api/platform/tenants/${tenant.id}/onboarding/mark-handoff-ready`), "handoff ready");
    await expectDenied(await page.request.post(`/api/platform/tenants/${tenant.id}/onboarding/activate`), "tenant activation");

    await expectDenied(await page.request.get("/api/platform-policy-packs"), "setup template list");
    await expectDenied(await page.request.post("/api/platform-policy-packs", {
      data: { code: `blocked-pack-${runRef}`, name: "Blocked Pack", domain: "leave" },
    }), "setup template create");
    await expectDenied(await page.request.post(`/api/platform-policy-packs/${pack.id}/publish`, {
      data: { release_notes: "Blocked publish" },
    }), "setup template publish");
    await expectDenied(await page.request.post(`/api/platform-policy-packs/${pack.id}/adoption-preview`, {
      data: { tenant_id: tenant.id },
    }), "setup template adoption preview");
    await expectDenied(await page.request.post(`/api/platform-policy-packs/${pack.id}/adopt-for-tenant`, {
      data: { tenant_id: tenant.id, mode: "clone_to_tenant_records" },
    }), "setup template adoption apply");
    await expectDenied(await page.request.post(`/api/platform-policy-packs/${pack.id}/upgrade-compare`, {
      data: { tenant_id: tenant.id },
    }), "setup template upgrade compare");
    await expectDenied(await page.request.post(`/api/platform-policy-packs/${pack.id}/upgrade-apply`, {
      data: { tenant_id: tenant.id },
    }), "setup template upgrade apply");
  });

  test("certifies direct URL denial remains stable across refresh, history, new tab, and responsive viewports", async ({ browser, page }) => {
    const protectedRoute = "/platform-admin/permissions?q=tenant.roles.manage";
    await expectPlatformRouteDenied(page, hrAdmin, protectedRoute);

    await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => null);
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.locator('[data-testid^="platform-admin-"]')).toHaveCount(0);

    await page.goto(protectedRoute, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page).toHaveURL(/\/$/);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('a[href^="/platform-admin"]')).toHaveCount(0);

    const secondPage = await page.context().newPage();
    await secondPage.goto("/platform-admin/audit-logs", { waitUntil: "domcontentloaded" });
    await secondPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(secondPage).toHaveURL(/\/$/);
    await expect(secondPage.locator('[data-testid^="platform-admin-"]')).toHaveCount(0);
    await secondPage.close();

    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 768, height: 1024 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/platform-admin/tenants", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      await expect(page).toHaveURL(/\/$/);
      await expect(page.locator('[data-testid^="platform-admin-"]')).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
    }

    const isolatedContext = await browser.newContext();
    const isolatedPage = await isolatedContext.newPage();
    await isolatedPage.goto("/platform-admin", { waitUntil: "domcontentloaded" });
    await expect(isolatedPage).toHaveURL(/\/login$/);
    await expectDenied(await isolatedPage.request.get("/api/platform/summary"), "unauthenticated summary");
    await isolatedContext.close();
  });
});
