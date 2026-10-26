import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

import {
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
  workspacePlatformPersona,
} from "../helpers/isolated-qa-workspace";

test.describe.configure({ mode: "serial" });
const repoRoot = path.resolve(__dirname, "../../..");
const evidence = path.join(repoRoot, "docs/qa/evidence/platform-admin-makeover-phase6-2026-10-26");
let workspace: IsolatedQaWorkspace;

const routes = [
  ["/platform-admin", "Platform Admin Dashboard", "Dashboard", "dashboard"],
  ["/platform-admin/leads", "Leads", "Leads", "leads"],
  ["/platform-admin/tenants", "Tenants", "Tenants", "tenants"],
  ["/platform-admin/launch", "Launch Blueprint", "Launch Blueprint", "launch"],
  ["/platform-admin/onboarding", "Launch Readiness", "Launch Readiness", "onboarding"],
  ["/platform-admin/admins", "Admin Access", "Admin Access", "admins"],
  ["/platform-admin/policy-packs", "Setup Templates", "Setup Templates", "templates"],
  ["/platform-admin/permissions", "Permission Catalog", "Permissions", "permissions"],
  ["/platform-admin/audit-logs", "Audit Logs", "Audit Logs", "audit"],
  ["/platform-admin/data-governance", "Retention and controlled erasure", "Data Governance", "governance"],
] as const;

function ref() {
  return `${test.info().project.name}-${Date.now().toString(36)}`.replace(/[^a-z0-9-]/g, "").slice(0, 25);
}

async function login(page: Page, role: "platform_admin" | "employee" = "platform_admin") {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const persona = role === "platform_admin" ? workspacePlatformPersona(workspace) : workspacePersona(workspace, role);
  const response = await page.request.post("/api/auth/login", { data: { identifier: persona.username, password: persona.password } });
  expect(response.ok(), await response.text()).toBeTruthy();
}

async function loginWith(page: Page, username: string, password: string) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const response = await page.request.post("/api/auth/login", { data: { identifier: username, password } });
  expect(response.ok(), await response.text()).toBeTruthy();
}

async function noOverflow(page: Page) {
  const widths = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
}

async function axe(page: Page, name: string) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(async () => {
    const axeApi = (window as unknown as { axe: { run: (root: Element, options: object) => Promise<{ violations: unknown[] }> } }).axe;
    return axeApi.run(document.querySelector("main")!, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
  });
  writeFileSync(path.join(evidence, `${test.info().project.name}-${name}-axe.json`), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]);
}

test.beforeAll(async ({}, info) => {
  mkdirSync(evidence, { recursive: true });
  workspace = await provisionIsolatedQaWorkspace(info);
});

test("certifies all ten routes on the final responsive and accessible build", async ({ page }) => {
  await login(page);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 760 : 900 });
    for (const [url, heading, , slug] of routes) {
      const tenantScope = ["launch", "onboarding", "admins", "templates", "audit", "governance"].includes(slug)
        ? `${url}?tenantId=${workspace.manifest.tenant.id}` : url;
      await page.goto(tenantScope, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByText(/could not load the current workspace|application error/i)).toHaveCount(0);
      await noOverflow(page);
      await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-${slug}-${width}.png`), fullPage: true, animations: "disabled" });
      if (width === 390) await axe(page, slug);
    }
  }
});

test("keeps database navigation, tenant context, and committed filters stable", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [url, heading, label] of routes) {
    const scoped = ["/platform-admin/launch", "/platform-admin/onboarding", "/platform-admin/admins", "/platform-admin/policy-packs", "/platform-admin/audit-logs", "/platform-admin/data-governance"].includes(url)
      ? `${url}?tenantId=${workspace.manifest.tenant.id}` : url;
    await page.goto(scoped);
    const nav = page.getByRole("navigation", { name: "Platform Admin navigation" });
    await expect(nav.locator("a")).toHaveCount(10);
    await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    await expect(nav.locator("a[aria-current='page']")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
  await page.goto(`/platform-admin/audit-logs?tenantId=${workspace.manifest.tenant.id}&q=created&eventType=tenant_created`);
  await expect(page.locator('[name="q"]')).toHaveValue("created");
  await page.reload();
  await expect(page.locator('[name="eventType"]')).toHaveValue("tenant_created");
  await page.goto("/platform-admin/permissions?q=attendance&assignable=tenant&risk=high&module=Attendance");
  await expect(page.locator('[name="module"]')).toHaveValue("Attendance");
  await page.reload();
  await expect(page).toHaveURL(/q=attendance.*assignable=tenant.*risk=high.*module=Attendance/);
});

test("joins lead, launch, admin, template, activation, audit, and governance evidence", async ({ page }) => {
  test.setTimeout(600_000);
  await login(page);
  const suffix = ref();
  const company = `Phase 6 ${suffix} Private Limited`;
  const email = `phase6.${suffix}@example.test`;
  const code = `p6-${suffix}`.slice(0, 48);
  const username = `p6-${suffix}`.slice(0, 48);
  const password = "Password@123";
  const leadResponse = await page.request.post("/api/public-leads", { data: {
    intent: "signup", company_name: company, contact_name: `Phase 6 Admin ${suffix}`, work_email: email,
    phone_number: "+91 90000 66006", employee_count: 66, industry: "Technology", country_code: "IN",
    preferred_plan: "enterprise", message: "Joined Platform Admin closure.", source_path: "/qa-platform-admin-phase6", website: "",
  } });
  expect(leadResponse.status(), await leadResponse.text()).toBe(201);
  const leadId = String((await leadResponse.json()).lead_id);
  expect((await page.request.patch(`/api/platform/leads/${leadId}`, { data: { status: "qualified" } })).ok()).toBeTruthy();
  const converted = await page.request.post(`/api/platform/leads/${leadId}/convert`, { data: {
    code, primary_domain: `${code}.example.test`, subscription_plan: "enterprise", seed_pack: "standard_office",
    is_sandbox: true, owner_mode: "combined_platform_admin", setup_style: "platform_assisted",
    data_setup_style: "manual", policy_control_style: "mixed", admin_job_title: "Head of People",
  } });
  expect(converted.status(), await converted.text()).toBe(201);
  const conversion = await converted.json() as { tenant: { id: string; code: string }; admin_contact: { id: string } };
  const tenantId = conversion.tenant.id;
  expect(conversion.tenant.code).toBe(code);

  await page.goto(`/platform-admin/launch?tenantId=${tenantId}`);
  await page.getByLabel("Registered address").fill("Bengaluru, Karnataka 560001");
  await page.getByLabel("Default branch").fill("Bengaluru");
  const shifts = page.getByLabel("Shift patterns");
  if (await shifts.count()) await shifts.fill("General shift");
  const requiredInputs = page.locator("input[required]:not([type='checkbox']), textarea[required]");
  for (let index = 0; index < await requiredInputs.count(); index += 1) {
    const field = requiredInputs.nth(index);
    if (!(await field.inputValue())) await field.fill((await field.getAttribute("type")) === "email" ? email : "Phase 6 certified value");
  }
  const requiredSelects = page.locator("select[required]");
  for (let index = 0; index < await requiredSelects.count(); index += 1) {
    const field = requiredSelects.nth(index);
    if (!(await field.inputValue())) await field.selectOption({ index: 1 });
  }
  await page.getByRole("button", { name: "Preview launch plan" }).click();
  await expect(page.getByRole("button", { name: "Apply safe launch setup" }).first()).toBeEnabled();
  await page.getByRole("button", { name: "Apply safe launch setup" }).first().click();
  await expect(page.getByText("Certified safe launch setup applied.")).toBeVisible();

  const provisioned = await page.request.post(`/api/platform/admin-contacts/${conversion.admin_contact.id}/provision-user`, { data: {
    username, role_code: "tenant-admin", role_name: "Tenant Admin", password,
    must_change_password: false, is_user_active: true, membership_status: "active",
  } });
  expect(provisioned.ok(), await provisioned.text()).toBeTruthy();

  const packCode = `p6-pack-${suffix}`.slice(0, 58);
  const packCreate = await page.request.post("/api/platform-policy-packs", { data: {
    code: packCode, name: `Phase 6 ${suffix}`, domain: "leave", status: "draft", version: 1,
    country_code: "IN", industry_tag: "phase6", description: "Joined closure template", is_active: true,
  } });
  expect(packCreate.status(), await packCreate.text()).toBe(201);
  const pack = await packCreate.json() as { id: string };
  const packItem = await page.request.post(`/api/platform-policy-packs/${pack.id}/items`, { data: {
    item_type: "leave_type", item_key: `phase6-earned-${suffix}`.slice(0, 110), name: "Phase 6 Earned Leave",
    payload: { code: `p6-earned-${suffix}`.slice(0, 78), name: "Phase 6 Earned Leave", category: "paid", unit: "day" },
    dependency_keys: [], sort_order: 10, is_required: true,
  } });
  expect(packItem.status(), await packItem.text()).toBe(201);
  expect((await page.request.post(`/api/platform-policy-packs/${pack.id}/publish`, { data: {} })).ok()).toBeTruthy();
  const preview = await page.request.post(`/api/platform-policy-packs/${pack.id}/adoption-preview`, { data: { tenant_id: tenantId, adoption_mode: "clone_to_tenant_records" } });
  expect(preview.ok(), await preview.text()).toBeTruthy();
  const adoption = await page.request.post(`/api/platform-policy-packs/${pack.id}/adopt-for-tenant`, { data: { tenant_id: tenantId, adoption_mode: "clone_to_tenant_records", notes: "Phase 6 joined baseline" } });
  expect(adoption.status(), await adoption.text()).toBe(201);

  expect((await page.request.post(`/api/platform/tenants/${tenantId}/onboarding/mark-baseline-published`, { data: {} })).ok()).toBeTruthy();
  expect((await page.request.post(`/api/platform/tenants/${tenantId}/onboarding/mark-handoff-ready`, { data: {} })).ok()).toBeTruthy();
  expect((await page.request.post(`/api/platform/tenants/${tenantId}/onboarding/activate`, { data: {} })).ok()).toBeTruthy();

  await page.goto(`/platform-admin/audit-logs?tenantId=${tenantId}`);
  await expect(page.getByTestId("platform-admin-events-panel")).toContainText("Tenant Activated");
  await expect(page.getByTestId("platform-admin-events-panel")).toContainText("First Admin Provisioned");
  await page.getByTestId("platform-admin-events-panel").getByRole("button", { name: /View evidence for Tenant Activated/i }).click();
  await expect(page.getByRole("dialog", { name: "Tenant Activated" })).toContainText(code);
  await page.getByRole("dialog", { name: "Tenant Activated" }).getByRole("button", { name: "Close" }).click();

  await loginWith(page, username, password);
  const request = await page.request.post("/api/tenant-admin/data-governance/requests", { data: {
    request_type: "export", reason: `Phase 6 governed export ${suffix}`,
    idempotency_key: `phase6-${suffix}`, scope: { record_categories: ["employee_documents"] },
  } });
  expect(request.status(), await request.text()).toBe(201);
  const requestId = String((await request.json()).id);

  await login(page);
  const policy = await page.request.post("/api/platform/data-governance", { data: {
    tenant_id: tenantId, jurisdiction: `IN-${suffix}`, record_category: "employee_documents", retention_days: 365,
    lifecycle_date_field: "updated_at", effective_from: "2026-01-01", legal_basis_ref: `LEGAL-${suffix}`,
    approval_ref: `APPROVAL-${suffix}`, status: "approved",
  } });
  expect(policy.status(), await policy.text()).toBe(201);
  expect((await page.request.post(`/api/platform/data-governance/requests/${requestId}/actions`, { data: { action: "approve" } })).ok()).toBeTruthy();
  expect((await page.request.post(`/api/platform/data-governance/requests/${requestId}/actions`, { data: { action: "dispatch" } })).ok()).toBeTruthy();
  await expect.poll(async () => {
    const response = await page.request.get(`/api/platform/data-governance?tenant_id=${tenantId}`);
    const body = await response.json() as { requests: Array<{ id: string; status: string }> };
    return body.requests.find((item) => item.id === requestId)?.status;
  }, { timeout: 30_000 }).toBe("succeeded");
  await page.goto(`/platform-admin/data-governance?tenantId=${tenantId}`);
  await expect(page.getByRole("row").filter({ hasText: `Phase 6 governed export ${suffix}` })).toContainText("succeeded");
});

test("preserves platform-only route and API boundaries", async ({ page }) => {
  await login(page, "employee");
  for (const api of ["/api/platform/summary", "/api/platform/tenants", "/api/platform/leads", "/api/platform/permission-catalog", "/api/platform/data-governance"]) {
    const response = await page.request.get(api, { failOnStatusCode: false });
    expect([401, 403]).toContain(response.status());
  }
  for (const [url] of routes) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/platform-admin(?:\/|$)/);
  }
});
