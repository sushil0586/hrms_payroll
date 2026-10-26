import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
  workspacePlatformPersona,
} from "../helpers/isolated-qa-workspace";

test.describe.configure({ mode: "serial" });

const repoRoot = path.resolve(__dirname, "../../..");
const evidence = path.join(repoRoot, "docs/qa/evidence/platform-admin-makeover-phase3-2026-10-26");
let workspace: IsolatedQaWorkspace;

function cleanupPhase3Records() {
  execFileSync(path.join(repoRoot, ".venv/bin/python"), [
    "backend/manage.py", "shell", "-c",
    "from django.contrib.auth import get_user_model; from django.db import connection; from apps.tenants.models import Tenant; cursor=connection.cursor(); cursor.execute(\"SET hrms.synthetic_tenant_teardown = 'authorized'\"); Tenant.objects.filter(code__startswith='p3-').delete(); get_user_model().objects.filter(username__startswith='p3-').delete(); cursor.execute(\"SET hrms.synthetic_tenant_teardown = 'blocked'\")",
  ], { cwd: repoRoot, env: process.env, stdio: "pipe" });
}

function runRef() {
  return `${test.info().project.name}-${Date.now().toString(36)}`.replace(/[^a-z0-9-]/g, "").slice(0, 25);
}

async function login(page: Page, role: "platform_admin" | "employee" = "platform_admin") {
  const persona = role === "platform_admin" ? workspacePlatformPersona(workspace) : workspacePersona(workspace, "employee");
  if (role === "platform_admin") {
    await page.request.post("/api/auth/logout").catch(() => null);
    await page.context().clearCookies();
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Username or email").fill(persona.username);
    await page.getByLabel("Password", { exact: true }).fill(persona.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/platform-admin(?:$|\/|\?)/, { timeout: 20_000 });
    return;
  }
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const response = await page.request.post("/api/auth/login", { data: { identifier: persona.username, password: persona.password } });
  expect(response.ok()).toBeTruthy();
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

async function createTenant(page: Page, plan: "starter" | "growth" | "enterprise" = "growth") {
  const ref = runRef();
  const code = `p3-${plan}-${ref}`.slice(0, 48);
  const response = await page.request.post("/api/platform/tenants", { data: {
    code, name: `Phase 3 ${plan} ${ref}`, legal_name: `Phase 3 ${plan} ${ref} Private Limited`,
    primary_email: `${code}@example.test`, primary_domain: `${code}.example.test`, subscription_plan: plan,
    seed_pack: "standard_office", timezone: "Asia/Kolkata", country_code: "IN", is_sandbox: true,
  } });
  expect(response.status(), await response.text()).toBe(201);
  return await response.json() as { id: string; code: string; name: string };
}

function card(page: Page, heading: string): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

test.beforeAll(async ({}, info) => {
  mkdirSync(evidence, { recursive: true });
  workspace = await provisionIsolatedQaWorkspace(info);
});

test.afterAll(async () => {
  cleanupPhase3Records();
  await cleanupIsolatedQaWorkspace(workspace);
});

test("renders the three dependency-first workspaces responsively with accessibility coverage", async ({ page }) => {
  const tenantId = workspace.manifest.tenant.id;
  const routes = [
    [`/platform-admin/launch?tenantId=${tenantId}`, "Launch Blueprint", "Launch blueprint summary", "launch"],
    [`/platform-admin/onboarding?tenantId=${tenantId}`, "Launch Readiness", "Launch readiness summary", "readiness"],
    [`/platform-admin/admins?tenantId=${tenantId}`, "Admin Access", "Admin access summary", "admins"],
  ] as const;
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 760 : 900 });
    for (const [url, heading, summary, slug] of routes) {
      await login(page);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("group", { name: summary }).locator("article")).toHaveCount(4);
      await expect(page.getByText("Next required action", { exact: true }).first()).toBeVisible();
      await expect(page.getByRole("tablist", { name: "Platform admin sections" })).toHaveCount(0);
      await expect(page.getByTestId("platform-admin-panel-guide")).toHaveCount(0);
      await expectNoOverflow(page);
      await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-${slug}-${width}.png`), fullPage: true, animations: "disabled" });
      if (width === 390) await axeScan(page, slug);
    }
  }
});

test("guards required inputs, plan compatibility, stale preview, safe apply, and repeat apply", async ({ page }) => {
  await login(page);
  const starter = await createTenant(page, "starter");
  const growth = await createTenant(page, "growth");
  const starterBlueprints = await page.request.get(`/api/platform/launch-blueprints?country_code=IN&subscription_plan=starter`);
  const growthBlueprints = await page.request.get(`/api/platform/launch-blueprints?country_code=IN&subscription_plan=growth`);
  expect(starterBlueprints.ok()).toBeTruthy();
  expect(growthBlueprints.ok()).toBeTruthy();
  const starterPack = (await starterBlueprints.json()) as Array<{ compatibility: { plan_gated_module_count: number } }>;
  const growthPack = (await growthBlueprints.json()) as Array<{ compatibility: { plan_gated_module_count: number } }>;
  expect(starterPack[0].compatibility.plan_gated_module_count).toBeGreaterThan(growthPack[0].compatibility.plan_gated_module_count);

  await page.goto(`/platform-admin/launch?tenantId=${growth.id}`);
  await expect(page.getByTestId("platform-launch-blueprint-panel")).toBeVisible();
  await page.getByRole("button", { name: "Preview launch plan" }).click();
  await expect(page.locator(".platform-feedback--error")).toContainText("Fix the highlighted launch inputs");
  await expect(page.getByLabel("Registered address")).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Registered address").fill("Bengaluru, Karnataka 560001");
  await page.getByLabel("Default branch").fill("Bengaluru");
  await page.getByLabel("Shift patterns").fill("General shift");
  await page.getByRole("button", { name: "Preview launch plan" }).click();
  await expect(page.getByRole("group", { name: "Launch blueprint summary" })).toContainText("Fresh");
  await expect(page.getByRole("button", { name: "Apply safe launch setup" }).first()).toBeEnabled();

  const changed = await page.request.patch(`/api/platform/tenants/${growth.id}`, { data: { subscription_plan: "starter" } });
  expect(changed.ok(), await changed.text()).toBeTruthy();
  await page.getByRole("button", { name: "Apply safe launch setup" }).first().click();
  await expect(page.locator(".platform-feedback--error")).toContainText(/preview|plan|changed|fresh/i);
  await page.reload();
  await page.getByLabel("Registered address").fill("Bengaluru, Karnataka 560001");
  await page.getByLabel("Default branch").fill("Bengaluru");
  await page.getByRole("button", { name: "Preview launch plan" }).click();
  await expect(page.getByText("Apply-ready", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Apply safe launch setup" }).first().click();
  await expect(page.getByText("Certified safe launch setup applied.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply safe launch setup" }).first()).toBeDisabled();
  await page.getByLabel("Handoff notes").fill("Safe setup reviewed; customer ownership and remaining gated work explained.");
  await page.getByRole("button", { name: "Complete customer handoff" }).click();
  await expect(page.getByText("Customer handoff completed.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Check drift" }).click();
  await expect(page.getByText("Launch drift check completed.", { exact: true })).toBeVisible();
  await expect(card(page, "Baseline repair").getByRole("button", { name: "Apply repair" })).toBeDisabled();
  await expect(card(page, "Template upgrade").getByRole("button", { name: "Apply upgrade" })).toBeDisabled();
  const runs = await page.request.get(`/api/platform/tenants/${growth.id}/launch-runs`);
  expect(runs.ok()).toBeTruthy();
  expect(((await runs.json()) as Array<{ run_type: string; status: string }>).some((run) => run.run_type === "apply" && run.status === "succeeded")).toBeTruthy();
});

test("preserves uncertain admin input, provisions once, protects credentials, and isolates tenants", async ({ page }) => {
  await login(page);
  const tenantA = await createTenant(page);
  const tenantB = await createTenant(page);
  await page.goto(`/platform-admin/admins?tenantId=${tenantA.id}`);
  await page.getByRole("button", { name: /Add (primary admin )?contact/i }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add platform admin contact" });
  const email = `p3-admin-${runRef()}@example.test`;
  await dialog.getByLabel("Full name").fill("Phase Three Admin");
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByLabel("Primary").check();
  const interrupt = async (route: import("@playwright/test").Route) => route.abort("connectionreset");
  await page.route(`**/api/platform/tenants/${tenantA.id}/admin-contacts`, interrupt);
  await dialog.getByRole("button", { name: "Add contact" }).click();
  await expect(page.locator(".platform-feedback--error")).toContainText("Check the admin contact list before retrying");
  await expect(dialog.getByLabel("Email")).toHaveValue(email);
  await page.unroute(`**/api/platform/tenants/${tenantA.id}/admin-contacts`, interrupt);
  await dialog.getByRole("button", { name: "Add contact" }).click();
  await expect(page.getByText("Admin contact added.")).toBeVisible();
  await page.reload();

  const provision = card(page, "Create tenant admin login");
  await provision.getByLabel("Contact").selectOption({ label: `Phase Three Admin - ${email}` });
  const username = `p3-admin-${runRef()}`.slice(0, 48);
  await provision.getByLabel("Username").fill(username);
  await provision.getByRole("button", { name: "Create login access" }).click();
  await expect(page.getByText("First admin provisioned.")).toBeVisible();
  const credentialNotice = page.locator(".platform-feedback");
  await expect(credentialNotice).toContainText("Generated password:");
  await expect(page).not.toHaveURL(/password/i);
  await page.reload();
  await expect(page.getByRole("group", { name: "Admin access summary" })).toContainText("Usable");
  await expect(page.getByText("Generated password:")).toHaveCount(0);
  const onboardingA = await page.request.get(`/api/platform/tenants/${tenantA.id}/onboarding`);
  const onboardingB = await page.request.get(`/api/platform/tenants/${tenantB.id}/onboarding`);
  expect(JSON.stringify(await onboardingA.json())).toContain(email);
  expect(JSON.stringify(await onboardingB.json())).not.toContain(email);
});

test("enforces readiness ordering, activation guards, and employee denial", async ({ page }) => {
  await login(page);
  const tenant = await createTenant(page);
  let blocked = await page.request.post(`/api/platform/tenants/${tenant.id}/onboarding/mark-handoff-ready`, { failOnStatusCode: false });
  expect(blocked.status()).toBe(400);
  expect(await blocked.text()).toContain("Baseline must be published");
  blocked = await page.request.post(`/api/platform/tenants/${tenant.id}/onboarding/activate`, { failOnStatusCode: false });
  expect(blocked.status()).toBe(400);
  expect(await blocked.text()).toContain("Tenant handoff must be ready");
  await page.goto(`/platform-admin/onboarding?tenantId=${tenant.id}`);
  const readiness = card(page, "Launch readiness");
  await expect(readiness.getByRole("button", { name: "Mark ready" })).toBeDisabled();
  await expect(readiness.getByRole("button", { name: "Activate tenant" })).toBeDisabled();
  await expect(page.getByTestId("platform-onboarding-summary")).toContainText("Initial setup");
  await expect(page.getByTestId("platform-onboarding-summary")).toContainText("Required");

  await login(page, "employee");
  for (const url of [
    `/api/platform/tenants/${tenant.id}/onboarding`,
    `/api/platform/tenants/${tenant.id}/launch-runs`,
    "/api/platform/launch-blueprints?country_code=IN&subscription_plan=growth",
  ]) {
    const denied = await page.request.get(url, { failOnStatusCode: false });
    expect([401, 403]).toContain(denied.status());
  }
});
