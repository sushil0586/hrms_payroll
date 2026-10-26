import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
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
const evidence = path.join(repoRoot, "docs/qa/evidence/platform-admin-makeover-phase2-2026-10-26");
let workspace: IsolatedQaWorkspace;

function cleanupPhase2Records() {
  execFileSync(path.join(repoRoot, ".venv/bin/python"), [
    "backend/manage.py",
    "shell",
    "-c",
    "from django.db import connection; from apps.tenants.models import Tenant; from apps.tenant_onboarding.models import PublicTenantLead; cursor=connection.cursor(); cursor.execute(\"SET hrms.synthetic_tenant_teardown = 'authorized'\"); Tenant.objects.filter(code__startswith='p2-').delete(); PublicTenantLead.objects.filter(source_path='/qa-platform-admin-phase2').delete(); cursor.execute(\"SET hrms.synthetic_tenant_teardown = 'blocked'\")",
  ], { cwd: repoRoot, env: process.env, stdio: "pipe" });
}

function runRef() {
  return `${test.info().project.name}-${Date.now().toString(36)}`.replace(/[^a-z0-9-]/g, "").slice(0, 28);
}

async function login(page: Page, role: "platform_admin" | "employee" = "platform_admin") {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const persona = role === "platform_admin" ? workspacePlatformPersona(workspace) : workspacePersona(workspace, "employee");
  const response = await page.request.post("/api/auth/login", {
    data: { identifier: persona.username, password: persona.password },
  });
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

async function createLead(page: Page, status: "new" | "reviewing" | "qualified" | "closed" = "new") {
  const ref = runRef();
  const payload = {
    intent: "signup",
    company_name: `Phase 2 ${ref} Private Limited`,
    contact_name: `Phase 2 Contact ${ref}`,
    work_email: `phase2.${ref}@example.test`,
    phone_number: "+91 90000 44004",
    employee_count: 84,
    industry: "Technology",
    country_code: "IN",
    preferred_plan: "growth",
    message: "Phase 2 lead lifecycle and filter certification.",
    source_path: "/qa-platform-admin-phase2",
    website: "",
  };
  const response = await page.request.post("/api/public-leads", { data: payload });
  expect(response.status(), await response.text()).toBe(201);
  const body = await response.json() as { lead_id: string };
  if (status !== "new") {
    const patch = await page.request.patch(`/api/platform/leads/${body.lead_id}`, { data: { status } });
    expect(patch.ok(), await patch.text()).toBeTruthy();
  }
  return { ...payload, id: body.lead_id };
}

function leadRow(page: Page, company: string) {
  return page.locator(".platform-lead-card").filter({ hasText: company }).first();
}

function formCard(page: Page, heading: string): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

test.beforeAll(async ({}, info) => {
  mkdirSync(evidence, { recursive: true });
  workspace = await provisionIsolatedQaWorkspace(info);
});

test.afterAll(async () => {
  cleanupPhase2Records();
  await cleanupIsolatedQaWorkspace(workspace);
});

test("renders the compact hierarchy responsively with selected accessibility coverage", async ({ page }) => {
  await login(page);
  const routes = [
    ["/platform-admin", "Platform Admin Dashboard", "Platform operations summary", "dashboard"],
    ["/platform-admin/leads", "Leads", "Lead queue summary", "leads"],
    ["/platform-admin/tenants", "Tenants", "Tenant register summary", "tenants"],
  ] as const;
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 760 : 900 });
    for (const [url, heading, summary, slug] of routes) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole("group", { name: summary }).locator("article")).toHaveCount(4);
      await expect(page.getByRole("tablist", { name: "Platform admin sections" })).toHaveCount(0);
      await expect(page.getByTestId("platform-admin-panel-guide")).toHaveCount(0);
      await expectNoOverflow(page);
      await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-${slug}-${width}.png`), fullPage: true, animations: "disabled" });
      if (width === 390) await axeScan(page, slug);
    }
  }
});

test("documents and exercises all lead and tenant local filter states", async ({ page }) => {
  await login(page);
  const qualified = await createLead(page, "qualified");
  await createLead(page, "closed");

  await page.goto("/platform-admin/leads");
  const leadsPanel = page.getByTestId("platform-admin-leads-panel");
  await expect(leadsPanel.getByText(/narrow the loaded queue immediately/i)).toBeVisible();
  await leadsPanel.getByRole("textbox", { name: "Search" }).fill(qualified.company_name);
  await expect(leadRow(page, qualified.company_name)).toBeVisible();
  await leadsPanel.locator('[name="lead_status_filter"]').selectOption("new");
  await expect(leadsPanel.getByText("No public leads match this view.")).toBeVisible();
  await leadsPanel.getByRole("button", { name: "Reset filters" }).click();
  await expect(leadsPanel.locator('[name="lead_status_filter"]')).toHaveValue("active");
  await expect(leadsPanel.getByRole("textbox", { name: "Search" })).toHaveValue("");
  await leadsPanel.locator('[name="lead_status_filter"]').selectOption("all");
  await leadsPanel.getByRole("textbox", { name: "Search" }).fill("no-match-phase-two");
  await expect(leadsPanel.getByText("No public leads match this view.")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("platform-admin-leads-panel").locator('[name="lead_status_filter"]')).toHaveValue("active");

  await page.goto("/platform-admin/tenants");
  const tenantsPanel = page.getByTestId("platform-admin-tenants-panel");
  await expect(tenantsPanel.getByText(/narrow the loaded tenant register immediately/i)).toBeVisible();
  await tenantsPanel.getByRole("textbox", { name: "Search" }).fill(workspace.manifest.tenant.code);
  await expect(tenantsPanel.getByText(workspace.manifest.tenant.code, { exact: true })).toBeVisible();
  await tenantsPanel.locator('[name="tenant_status_filter"]').selectOption("suspended");
  await expect(tenantsPanel.getByText("No tenants match this view.")).toBeVisible();
  await tenantsPanel.locator('[name="tenant_plan_filter"]').selectOption("enterprise");
  await tenantsPanel.getByRole("button", { name: "Reset filters" }).click();
  await expect(tenantsPanel.locator('[name="tenant_status_filter"]')).toHaveValue("all");
  await expect(tenantsPanel.locator('[name="tenant_plan_filter"]')).toHaveValue("all");
  await expect(tenantsPanel.getByRole("textbox", { name: "Search" })).toHaveValue("");
});

test("qualifies and converts a lead once with tenant evidence", async ({ page }) => {
  await login(page);
  const lead = await createLead(page);
  const tenantCode = `p2-convert-${runRef()}`.slice(0, 48);
  const domain = `${tenantCode}.example.test`;
  await page.goto("/platform-admin/leads");
  const panel = page.getByTestId("platform-admin-leads-panel");
  await panel.getByRole("textbox", { name: "Search" }).fill(lead.company_name);
  let row = leadRow(page, lead.company_name);
  const qualifiedResponse = page.waitForResponse((response) => response.url().includes(`/api/platform/leads/${lead.id}`) && response.request().method() === "PATCH");
  await row.getByRole("button", { name: "Qualified" }).click();
  expect((await qualifiedResponse).ok()).toBeTruthy();
  await page.waitForTimeout(750);
  await page.goto("/platform-admin/leads", { waitUntil: "domcontentloaded" });
  await page.getByTestId("platform-admin-leads-panel").getByRole("textbox", { name: "Search" }).fill(lead.company_name);
  row = leadRow(page, lead.company_name);
  await expect(row.locator(".record-chip").filter({ hasText: /^Qualified$/ })).toBeVisible();
  await row.getByLabel("Tenant code").fill(tenantCode);
  await row.getByLabel("Primary domain").fill(domain);
  const conversionResponse = page.waitForResponse((response) => response.url().includes(`/api/platform/leads/${lead.id}/convert`) && response.request().method() === "POST");
  await row.getByRole("button", { name: "Convert lead" }).click();
  const conversion = await conversionResponse;
  expect(conversion.status(), await conversion.text()).toBe(201);
  const result = await conversion.json() as { tenant: { id: string; code: string }; lead: { converted_tenant_id: string } };
  expect(result.tenant.code).toBe(tenantCode);
  expect(result.lead.converted_tenant_id).toBe(result.tenant.id);
  await expect(page).toHaveURL(new RegExp(`/platform-admin/admins\\?tenantId=${result.tenant.id}`));
  const duplicate = await page.request.post(`/api/platform/leads/${lead.id}/convert`, { data: { code: `${tenantCode}-again` }, failOnStatusCode: false });
  expect(duplicate.status()).toBe(400);
  expect(await duplicate.text()).toContain("already been converted");
  const tenants = await page.request.get("/api/platform/tenants");
  const matching = (await tenants.json() as Array<{ code: string }>).filter((tenant) => tenant.code === tenantCode);
  expect(matching).toHaveLength(1);
});

test("preserves interrupted tenant input, then creates, suspends, reactivates, and denies employees", async ({ page }) => {
  await login(page);
  const tenantCode = `p2-tenant-${runRef()}`.slice(0, 48);
  const tenantName = `Phase 2 Tenant ${runRef()}`;
  await page.goto("/platform-admin/tenants");
  await page.getByRole("button", { name: "Create tenant" }).click();
  const dialog = page.getByRole("dialog", { name: "Create platform tenant" });
  await dialog.getByLabel("Code").fill(tenantCode);
  await dialog.getByLabel("Name", { exact: true }).fill(tenantName);
  await dialog.getByLabel("Primary domain").fill(`${tenantCode}.example.test`);
  const interrupt = async (route: import("@playwright/test").Route) => {
    if (route.request().method() === "POST") await route.abort("connectionreset");
    else await route.continue();
  };
  await page.route("**/api/platform/tenants", interrupt);
  await dialog.getByRole("button", { name: "Create tenant" }).click();
  await expect(page.locator(".platform-feedback--error")).toContainText("Check the tenant register before retrying");
  await expect(dialog.getByLabel("Code")).toHaveValue(tenantCode);
  await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue(tenantName);
  await page.unroute("**/api/platform/tenants", interrupt);
  const createResponse = page.waitForResponse((response) => response.url().endsWith("/api/platform/tenants") && response.request().method() === "POST");
  await dialog.getByRole("button", { name: "Create tenant" }).click();
  const createdResponse = await createResponse;
  expect(createdResponse.status(), await createdResponse.text()).toBe(201);
  const created = await createdResponse.json() as { id: string };
  await expect(page).toHaveURL(new RegExp(`/platform-admin/onboarding\\?tenantId=${created.id}`));

  const setup = formCard(page, "Edit tenant setup");
  await setup.getByLabel("Status").selectOption("suspended");
  let update = page.waitForResponse((response) => response.url().includes(`/api/platform/tenants/${created.id}`) && response.request().method() === "PATCH");
  await setup.getByRole("button", { name: "Save tenant" }).click();
  expect((await update).ok()).toBeTruthy();
  let stored = await page.request.get(`/api/platform/tenants/${created.id}`);
  expect((await stored.json()).status).toBe("suspended");
  await page.reload();
  const refreshedSetup = formCard(page, "Edit tenant setup");
  await refreshedSetup.getByLabel("Status").selectOption("active");
  update = page.waitForResponse((response) => response.url().includes(`/api/platform/tenants/${created.id}`) && response.request().method() === "PATCH");
  await refreshedSetup.getByRole("button", { name: "Save tenant" }).click();
  expect((await update).ok()).toBeTruthy();
  stored = await page.request.get(`/api/platform/tenants/${created.id}`);
  expect((await stored.json()).status).toBe("active");

  await login(page, "employee");
  for (const url of ["/api/platform/summary", "/api/platform/leads", "/api/platform/tenants"]) {
    const denied = await page.request.get(url, { failOnStatusCode: false });
    expect([401, 403]).toContain(denied.status());
  }
});
