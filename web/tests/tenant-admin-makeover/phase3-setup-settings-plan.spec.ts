import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";

test.describe.configure({ mode: "serial" });

const repoRoot = path.resolve(__dirname, "../../..");
const evidence = path.join(repoRoot, "docs/qa/evidence/tenant-admin-makeover-phase3-2026-10-26");
let workspace: IsolatedQaWorkspace;

async function login(page: Page, username: string, password = "Password@123") {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const response = await page.request.post("/api/auth/login", { data: { identifier: username, password } });
  expect(response.ok()).toBeTruthy();
}

async function loginAsTenantAdmin(page: Page) {
  const persona = workspacePersona(workspace, "tenant_admin");
  await login(page, persona.username, persona.password);
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

test.beforeAll(async ({}, info) => {
  mkdirSync(evidence, { recursive: true });
  workspace = await provisionIsolatedQaWorkspace(info);
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

test("setup settings and plan share compact responsive hierarchy", async ({ page }) => {
  await loginAsTenantAdmin(page);
  const routes = [
    ["/tenant-admin/setup", "Tenant Setup Guide", "Tenant setup progress summary"],
    ["/tenant-admin/settings", "Tenant Settings", "Tenant settings summary"],
    ["/tenant-admin/plan", "Plan & Billing", "Tenant commercial summary"],
  ] as const;

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const [route, heading, summary] of routes) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole("group", { name: summary })).toBeVisible();
      await expect(page.getByRole("group", { name: summary }).locator("article")).toHaveCount(4);
      await expectNoOverflow(page);
      const slug = route.split("/").pop();
      await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-${slug}-${width}.png`), fullPage: true, animations: "disabled" });
      if (width === 390) await axeScan(page, slug!);
    }
  }

  await page.goto("/tenant-admin/setup");
  const nextLabel = (await page.getByRole("group", { name: "Tenant setup progress summary" }).locator("article").last().locator("small").textContent())?.trim();
  await expect(page.getByRole("link", { name: new RegExp(nextLabel || "launch readiness", "i") })).toBeVisible();
});

test("settings handoff commits a restorable prefilled change request", async ({ page }) => {
  await loginAsTenantAdmin(page);
  await page.goto("/tenant-admin/settings");
  const requestLink = page.getByRole("link", { name: "Request account change" });
  await expect(requestLink).toBeVisible();
  await requestLink.click();
  await expect(page).toHaveURL(/request_type=configuration_change/);
  await expect(page.getByLabel("Type")).toHaveValue("configuration_change");
  await expect(page.getByLabel("Title")).toHaveValue("Update tenant account profile");
  await expect(page.getByLabel("Target ref")).toHaveValue("tenant.account.profile");
  await page.reload();
  await expect(page.getByLabel("Type")).toHaveValue("configuration_change");
  await expect(page.getByLabel("Title")).toHaveValue("Update tenant account profile");
  await expect(page.getByLabel("Target ref")).toHaveValue("tenant.account.profile");
});

test("change requests persist while ambiguous writes preserve the proposal", async ({ page }) => {
  await loginAsTenantAdmin(page);
  await page.goto("/tenant-admin/plan");
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const title = `Phase 3 plan review ${suffix}`;
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByRole("status")).toContainText("submitted successfully");
  let row = page.locator(".tenant-change-request-row").filter({ hasText: title });
  await expect(row).toContainText("Submitted");
  await page.reload();
  row = page.locator(".tenant-change-request-row").filter({ hasText: title });
  await expect(row).toContainText("Submitted");
  await row.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("status")).toContainText("saved successfully");
  await expect(row).toContainText("Canceled");

  const uncertainTitle = `Unconfirmed Phase 3 request ${suffix}`;
  await page.getByLabel("Title").fill(uncertainTitle);
  await page.route("**/api/tenant-admin/change-requests", async (route) => route.abort("connectionreset"), { times: 1 });
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.locator(".tenant-inline-notice[role='alert']")).toContainText("outcome is unconfirmed");
  await expect(page.getByLabel("Title")).toHaveValue(uncertainTitle);
  await expect(page.locator(".tenant-change-request-row").filter({ hasText: uncertainTitle })).toHaveCount(0);
});

test("view-only tenant access explains read-only state and denies mutations", async ({ page }) => {
  await loginAsTenantAdmin(page);
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const roleResponse = await page.request.post("/api/tenant-admin/roles", { data: {
    name: `Phase 3 Viewer ${suffix}`,
    code: `phase-3-viewer-${suffix}`,
    description: "Setup, settings, and plan view-only proof.",
    is_active: true,
    permission_keys: ["tenant.dashboard.view", "tenant.setup.view", "tenant.settings.view", "tenant.plan.view"],
  } });
  expect(roleResponse.ok()).toBeTruthy();
  const roleId = (await roleResponse.json()).role.id as string;
  const username = `phase3.viewer.${suffix}`;
  const inviteResponse = await page.request.post("/api/tenant-admin/memberships", { data: {
    username,
    email: `${username}@playwright.qa.invalid`,
    first_name: "Phase 3",
    last_name: "Viewer",
    membership_status: "active",
    role_ids: [roleId],
  } });
  expect(inviteResponse.ok()).toBeTruthy();
  const password = (await inviteResponse.json()).generated_password as string;

  await login(page, username, password);
  await page.goto("/tenant-admin/plan");
  await expect(page.getByText("change request creation and approvals are disabled")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit request" })).toBeDisabled();
  const denied = await page.request.post("/api/tenant-admin/change-requests", { data: {
    request_type: "plan_change",
    title: "Denied Phase 3 request",
    requested_payload: { subscription_plan: "enterprise" },
  } });
  expect(denied.status()).toBe(403);
  await page.goto("/tenant-admin/settings");
  await expect(page.getByRole("link", { name: "Request account change" })).toHaveCount(0);
  await page.goto("/tenant-admin/setup");
  await expect(page.getByRole("heading", { level: 1, name: "Tenant Setup Guide" })).toBeVisible();
});
