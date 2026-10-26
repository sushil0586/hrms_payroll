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
const evidence = path.join(repoRoot, "docs/qa/evidence/tenant-admin-makeover-phase6-2026-10-26");
let workspace: IsolatedQaWorkspace;

const routes = [
  ["/tenant-admin", "Account Control Center", "Dashboard", "Tenant account summary"],
  ["/tenant-admin/users", "Tenant User Management", "Users", "Tenant user access summary"],
  ["/tenant-admin/roles", "Roles & Permissions", "Roles & Permissions", "Tenant role access summary"],
  ["/tenant-admin/plan", "Plan & Billing", "Plan & Billing", "Tenant commercial summary"],
  ["/tenant-admin/setup", "Tenant Setup Guide", "Setup Guide", "Tenant setup progress summary"],
  ["/tenant-admin/settings", "Tenant Settings", "Settings", "Tenant settings summary"],
  ["/tenant-admin/financial-calendars", "Financial years and periods", "Financial Years", "Financial calendar summary"],
  ["/tenant-admin/leave-year", "Leave-year control", "Leave Years", "Leave-year governance summary"],
  ["/tenant-admin/security-readiness", "Enterprise Security Readiness", "Security", "Security readiness summary"],
  ["/tenant-admin/support-access", "Support Access", "Support Access", "Support access summary"],
  ["/tenant-admin/trust-audit", "Tenant Trust Audit", "Audit Trail", "Trust audit summary"],
  ["/tenant-admin/data-governance", "Data retention and exports", "Data Governance", "Data governance summary"],
] as const;

async function login(page: Page, role: "tenant_admin" | "employee") {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const persona = workspacePersona(workspace, role);
  const response = await page.request.post("/api/auth/login", {
    data: { identifier: persona.username, password: persona.password },
  });
  expect(response.ok()).toBeTruthy();
}

async function expectNoOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
}

async function axeScan(page: Page, name: string) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (root: Element, options: object) => Promise<{ violations: unknown[] }> } }).axe;
    return axe.run(document.querySelector("main")!, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    });
  });
  writeFileSync(path.join(evidence, `${test.info().project.name}-${name}-axe.json`), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]);
}

function slug(route: string) {
  return route === "/tenant-admin" ? "dashboard" : route.split("/").pop()!;
}

test.beforeAll(async ({}, info) => {
  mkdirSync(evidence, { recursive: true });
  workspace = await provisionIsolatedQaWorkspace(info);
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

test("all twelve routes retain the compact responsive and accessible contract", async ({ page }) => {
  await login(page, "tenant_admin");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const [url, heading, , summary] of routes) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole("group", { name: summary }).locator("article")).toHaveCount(4);
      await expect(page.getByText(/could not load the current workspace|application error/i)).toHaveCount(0);
      await expectNoOverflow(page);
      await page.screenshot({
        path: path.join(evidence, `${test.info().project.name}-${slug(url)}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      if (width === 390) await axeScan(page, slug(url));
    }
  }
});

test("database navigation vocabulary and active-route state match the certified family", async ({ page }) => {
  await login(page, "tenant_admin");
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [url, heading, label] of routes) {
    await page.goto(url);
    const nav = page.getByRole("navigation", { name: "Tenant Admin navigation" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    await expect(nav.locator("a[aria-current='page']")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
});

test("settings, plan, support and audit form one restorable governed journey", async ({ page }) => {
  await login(page, "tenant_admin");
  await page.goto("/tenant-admin/settings");
  await page.getByRole("link", { name: "Request account change" }).click();
  await expect(page).toHaveURL(/request_type=configuration_change/);
  await expect(page.getByLabel("Type")).toHaveValue("configuration_change");
  await page.reload();
  await expect(page.getByLabel("Target ref")).toHaveValue("tenant.account.profile");

  const suffix = `${test.info().project.name}-${Date.now()}`;
  const requestTitle = `Phase 6 account change ${suffix}`;
  await page.getByLabel("Title").fill(requestTitle);
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByRole("status")).toContainText("submitted successfully");
  await expect(page.locator(".tenant-change-request-row").filter({ hasText: requestTitle })).toContainText("Submitted");

  await page.goto("/tenant-admin/support-access");
  const reason = `Phase 6 joined support ${suffix}`;
  const form = page.getByTestId("tenant-support-access-form");
  await form.getByLabel("Support agent").fill(`phase6.${suffix}@example.test`);
  await form.getByLabel("Reason").fill(reason);
  await form.getByRole("button", { name: "Request access" }).click();
  const row = page.locator(".tenant-support-access-row").filter({ hasText: reason }).first();
  await expect(row).toContainText("Requested");
  await row.getByLabel("Decision note").fill("Joined closure independent review completed.");
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(row).toContainText("Approved");
  await row.getByLabel("Session ref").fill(`phase6-session-${suffix}`);
  await row.getByRole("button", { name: "Start session" }).click();
  await expect(row).toContainText("Active");
  await row.getByRole("button", { name: "End session" }).click();
  await expect(row).toContainText("Ended");
  await page.waitForLoadState("networkidle");

  await page.goto(`/tenant-admin/trust-audit?event_group=support&support_session_ref=phase6-session-${suffix}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(`Session: phase6-session-${suffix}`)).toBeVisible();
  await page.reload();
  await expect(page.getByText("Group: Support")).toBeVisible();
  await expect(page.getByText(`Session: phase6-session-${suffix}`)).toBeVisible();
});

test("keyboard dialogs and employee route and API boundaries fail closed", async ({ page }) => {
  await login(page, "tenant_admin");
  await page.goto("/tenant-admin/users");
  const opener = page.getByRole("button", { name: /invite member/i }).first();
  await opener.focus();
  await opener.press("Enter");
  const dialog = page.getByRole("dialog", { name: /invite tenant member/i });
  await expect(dialog.getByLabel("Email")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();

  await login(page, "employee");
  for (const route of [
    "/api/tenant-admin/console",
    "/api/tenant-admin/roles",
    "/api/tenant-admin/financial-calendars",
    "/api/tenant-admin/security-readiness",
    "/api/tenant-admin/trust-audit",
    "/api/tenant-admin/data-governance",
  ]) {
    const response = await page.request.get(route, { failOnStatusCode: false });
    expect([401, 403, 404, 405]).toContain(response.status());
  }
  await page.goto("/tenant-admin", { waitUntil: "domcontentloaded" });
  await expect(page).not.toHaveURL(/\/tenant-admin(?:\/|$)/);
});
