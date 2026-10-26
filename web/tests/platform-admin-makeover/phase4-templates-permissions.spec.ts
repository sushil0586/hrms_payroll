import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
  workspacePlatformPersona,
} from "../helpers/isolated-qa-workspace";

test.describe.configure({ mode: "serial" });

const repoRoot = path.resolve(__dirname, "../../..");
const evidence = path.join(repoRoot, "docs/qa/evidence/platform-admin-makeover-phase4-2026-10-26");
let workspace: IsolatedQaWorkspace;

function cleanupPhase4Records() {
  execFileSync(path.join(repoRoot, ".venv/bin/python"), [
    "backend/manage.py", "shell", "-c",
    "from django.contrib.auth import get_user_model; from django.db import connection; from apps.tenants.models import Tenant; from apps.platform_policies.models import PlatformPolicyPack; cursor=connection.cursor(); cursor.execute(\"SET hrms.synthetic_tenant_teardown = 'authorized'\"); Tenant.objects.filter(code__startswith='p4-').delete(); get_user_model().objects.filter(username__startswith='p4-').delete(); PlatformPolicyPack.objects.filter(code__startswith='p4-').delete(); cursor.execute(\"SET hrms.synthetic_tenant_teardown = 'blocked'\")",
  ], { cwd: repoRoot, env: process.env, stdio: "pipe" });
}

function runRef() {
  return `${test.info().project.name}-${Date.now().toString(36)}`.replace(/[^a-z0-9-]/g, "").slice(0, 25);
}

async function login(page: Page, role: "platform_admin" | "employee" = "platform_admin") {
  const persona = role === "platform_admin" ? workspacePlatformPersona(workspace) : workspacePersona(workspace, "employee");
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  if (role === "employee") {
    const response = await page.request.post("/api/auth/login", { data: { identifier: persona.username, password: persona.password } });
    expect(response.ok()).toBeTruthy();
    return;
  }
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Username or email").fill(persona.username);
  await page.getByLabel("Password", { exact: true }).fill(persona.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/platform-admin(?:$|\/|\?)/, { timeout: 20_000 });
}

async function expectNoOverflow(page: Page) {
  const widths = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
}

async function axeScan(page: Page, name: string) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (root: Element, options: object) => Promise<{ violations: unknown[] }> } }).axe;
    return axe.run(document.querySelector("main")!, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
  });
  writeFileSync(path.join(evidence, `${test.info().project.name}-${name}-axe.json`), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]);
}

async function createTenant(page: Page) {
  const ref = runRef();
  const code = `p4-tenant-${ref}`.slice(0, 48);
  const response = await page.request.post("/api/platform/tenants", { data: {
    code, name: `Phase 4 ${ref}`, legal_name: `Phase 4 ${ref} Private Limited`,
    primary_email: `${code}@example.test`, primary_domain: `${code}.example.test`, subscription_plan: "growth",
    seed_pack: "standard_office", timezone: "Asia/Kolkata", country_code: "IN", is_sandbox: true,
  } });
  expect(response.status(), await response.text()).toBe(201);
  return await response.json() as { id: string; code: string };
}

async function createDraftPack(page: Page, suffix: string) {
  const code = `p4-pack-${runRef()}-${suffix}`.slice(0, 58);
  const response = await page.request.post("/api/platform-policy-packs", { data: {
    code, name: `Phase 4 ${suffix}`, domain: "leave", status: "draft", version: 1,
    country_code: "IN", industry_tag: "phase4", description: "Phase 4 governed template", is_active: true,
  } });
  expect(response.status(), await response.text()).toBe(201);
  return await response.json() as { id: string; code: string; status: string; items: Array<{ id: string; item_key: string }> };
}

async function addLeaveType(page: Page, packId: string, key = "earned-leave-type", name = "Earned Leave") {
  const response = await page.request.post(`/api/platform-policy-packs/${packId}/items`, { data: {
    item_type: "leave_type", item_key: key, name,
    payload: { code: key.replace(/-type$/, ""), name, category: "paid", unit: "day" },
    dependency_keys: [], sort_order: 10, is_required: true,
  } });
  expect(response.status(), await response.text()).toBe(201);
  return await response.json() as { items: Array<{ id: string; item_key: string }> };
}

test.beforeAll(async ({}, info) => {
  mkdirSync(evidence, { recursive: true });
  workspace = await provisionIsolatedQaWorkspace(info);
});

test.afterAll(async () => {
  cleanupPhase4Records();
  await cleanupIsolatedQaWorkspace(workspace);
});

test("renders compact template and permission workspaces responsively with accessibility coverage", async ({ page }) => {
  const tenantId = workspace.manifest.tenant.id;
  const routes = [
    [`/platform-admin/policy-packs?tenantId=${tenantId}`, "Setup Templates", "Setup template summary", "templates"],
    ["/platform-admin/permissions", "Permission Catalog", "Permission catalog summary", "permissions"],
  ] as const;
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 760 : 900 });
    for (const [url, heading, summary, slug] of routes) {
      await login(page);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole("group", { name: summary }).locator("article")).toHaveCount(4);
      await expect(page.getByText("Next required action", { exact: true }).first()).toBeVisible();
      if (slug === "templates") {
        await expect(page.getByRole("tablist", { name: "Platform admin sections" })).toHaveCount(0);
        await expect(page.getByTestId("platform-admin-panel-guide")).toHaveCount(0);
      }
      await expectNoOverflow(page);
      await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-${slug}-${width}.png`), fullPage: true, animations: "disabled" });
      if (width === 390) await axeScan(page, slug);
    }
  }
});

test("validates draft content, preserves uncertain input, publishes with locks, and clones a version", async ({ page }) => {
  await login(page);
  await page.goto(`/platform-admin/policy-packs?tenantId=${workspace.manifest.tenant.id}`);
  const setup = page.locator("article").filter({ has: page.getByRole("heading", { name: "Setup templates" }) }).first();
  const code = `p4-pack-${runRef()}-ui`.slice(0, 58);
  await setup.locator('[name="code"]').fill(code);
  await setup.locator('[name="name"]').fill("Phase 4 interrupted draft");
  const interrupt = async (route: import("@playwright/test").Route) => route.abort("connectionreset");
  await page.route("**/api/platform-policy-packs", interrupt);
  await setup.getByRole("button", { name: "Create template" }).click();
  await expect(page.locator(".platform-feedback--error")).toContainText("Check the template register before retrying");
  await expect(setup.locator('[name="code"]')).toHaveValue(code);
  await page.unroute("**/api/platform-policy-packs", interrupt);

  const pack = await createDraftPack(page, "lifecycle");
  const invalid = await page.request.post(`/api/platform-policy-packs/${pack.id}/items`, { data: {
    item_type: "leave_policy", item_key: "earned-policy", name: "Earned policy",
    payload: { code: "earned-policy", name: "Earned policy", leave_type_item_key: "missing-type" },
    dependency_keys: [], sort_order: 20, is_required: true,
  } });
  expect(invalid.status()).toBe(400);
  const withItem = await addLeaveType(page, pack.id);
  const published = await page.request.post(`/api/platform-policy-packs/${pack.id}/publish`, { data: {} });
  expect(published.ok(), await published.text()).toBeTruthy();
  const locked = await page.request.patch(`/api/platform-policy-packs/${pack.id}/items/${withItem.items[0].id}`, { data: { name: "Must remain locked" } });
  expect(locked.status()).toBe(400);
  const cloned = await page.request.post(`/api/platform-policy-packs/${pack.id}/clone-version`, { data: {} });
  expect(cloned.status(), await cloned.text()).toBe(201);
  const cloneBody = await cloned.json() as { status: string; version: number; source_pack_id: string; items: unknown[] };
  expect(cloneBody).toMatchObject({ status: "draft", version: 2, source_pack_id: pack.id });
  expect(cloneBody.items).toHaveLength(1);
});

test("previews adoption, isolates tenants, compares versions, applies upgrade, and rejects repeats", async ({ page }) => {
  await login(page);
  const tenantA = await createTenant(page);
  const tenantB = await createTenant(page);
  const v1 = await createDraftPack(page, "adoption");
  await addLeaveType(page, v1.id, "phase4-earned-type", "Phase 4 Earned");
  expect((await page.request.post(`/api/platform-policy-packs/${v1.id}/publish`, { data: {} })).ok()).toBeTruthy();
  const previewA = await page.request.post(`/api/platform-policy-packs/${v1.id}/adoption-preview`, { data: { tenant_id: tenantA.id, adoption_mode: "clone_to_tenant_records" } });
  expect((await previewA.json()).counts.create).toBe(1);
  const adopt = await page.request.post(`/api/platform-policy-packs/${v1.id}/adopt-for-tenant`, { data: { tenant_id: tenantA.id, adoption_mode: "clone_to_tenant_records", notes: "Phase 4 adoption" } });
  expect(adopt.status(), await adopt.text()).toBe(201);
  const previewB = await page.request.post(`/api/platform-policy-packs/${v1.id}/adoption-preview`, { data: { tenant_id: tenantB.id, adoption_mode: "clone_to_tenant_records" } });
  expect((await previewB.json()).counts.create).toBe(1);

  const cloned = await page.request.post(`/api/platform-policy-packs/${v1.id}/clone-version`, { data: {} });
  const v2 = await cloned.json() as { id: string; items: Array<{ id: string; item_key: string }> };
  await page.request.patch(`/api/platform-policy-packs/${v2.id}/items/${v2.items[0].id}`, { data: {
    name: "Phase 4 Earned v2", payload: { code: "phase4-earned", name: "Phase 4 Earned v2", category: "paid", unit: "day" },
  } });
  await addLeaveType(page, v2.id, "phase4-sick-type", "Phase 4 Sick");
  expect((await page.request.post(`/api/platform-policy-packs/${v2.id}/publish`, { data: {} })).ok()).toBeTruthy();
  const compare = await page.request.post(`/api/platform-policy-packs/${v2.id}/upgrade-compare`, { data: { tenant_id: tenantA.id } });
  const comparison = await compare.json();
  expect(comparison.can_upgrade).toBe(true);
  expect(comparison.counts.change).toBe(1);
  expect(comparison.counts.add).toBe(1);
  const apply = await page.request.post(`/api/platform-policy-packs/${v2.id}/upgrade-apply`, { data: { tenant_id: tenantA.id, notes: "Phase 4 upgrade" } });
  expect(apply.status(), await apply.text()).toBe(201);
  const repeat = await page.request.post(`/api/platform-policy-packs/${v2.id}/upgrade-apply`, { data: { tenant_id: tenantA.id } });
  expect(repeat.status()).toBe(400);
});

test("persists combined permission filters and metadata while denying employee access", async ({ page }) => {
  await login(page);
  const catalogResponse = await page.request.get("/api/platform/permission-catalog");
  expect(catalogResponse.ok()).toBeTruthy();
  const catalog = await catalogResponse.json() as Array<{ key: string; label: string; module: string; risk_level: string; tenant_assignable: boolean; description: string }>;
  const permission = catalog.find((item) => item.tenant_assignable) ?? catalog[0];
  const filterUrl = `/platform-admin/permissions?q=${encodeURIComponent(permission.key)}&assignable=${permission.tenant_assignable ? "tenant" : "platform"}&risk=${encodeURIComponent(permission.risk_level)}&module=${encodeURIComponent(permission.module)}`;
  await page.goto(filterUrl);
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  const form = page.locator(".platform-permission-filters");
  await expect(form.locator('[name="assignable"]')).toHaveValue(permission.tenant_assignable ? "tenant" : "platform");
  await expect(form.locator('[name="risk"]')).toHaveValue(permission.risk_level);
  await expect(form.locator('[name="module"]')).toHaveValue(permission.module);
  await expect(page).toHaveURL(new RegExp(`q=.*assignable=.*risk=.*module=${encodeURIComponent(permission.module)}`));
  await page.reload();
  await expect(form.locator('[name="module"]')).toHaveValue(permission.module);
  const row = page.locator(".platform-permission-row").filter({ hasText: permission.key }).first();
  await row.getByRole("button", { name: "Edit" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit platform permission" });
  await expect(dialog.getByText("Keys are immutable.")).toBeVisible();
  expect(await dialog.locator('input').evaluateAll(
    (inputs, permissionKey) => inputs.some((input) => (input as HTMLInputElement).value === permissionKey),
    permission.key,
  )).toBe(false);
  const updated = `${permission.label} Phase 4`;
  await dialog.getByLabel("Label").fill(updated);
  await dialog.getByRole("button", { name: "Save permission" }).click();
  await expect(page.locator(".platform-permission-row").filter({ hasText: permission.key }).first()).toContainText(updated);
  await page.reload();
  await expect(page.locator(".platform-permission-row").filter({ hasText: permission.key }).first()).toContainText(updated);
  const restored = await page.request.patch(`/api/platform/permission-catalog/${encodeURIComponent(permission.key)}`, { data: { label: permission.label, description: permission.description, module: permission.module, risk_level: permission.risk_level, tenant_assignable: permission.tenant_assignable } });
  expect(restored.ok(), await restored.text()).toBeTruthy();

  await login(page, "employee");
  expect([401, 403]).toContain((await page.request.get("/api/platform/permission-catalog", { failOnStatusCode: false })).status());
  expect([401, 403]).toContain((await page.request.patch(`/api/platform/permission-catalog/${encodeURIComponent(permission.key)}`, { data: { label: "Denied" }, failOnStatusCode: false })).status());
  expect([401, 403]).toContain((await page.request.post(`/api/platform-policy-packs/${workspace.manifest.tenant.id}/publish`, { data: {}, failOnStatusCode: false })).status());
});
