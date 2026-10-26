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
const evidence = path.join(repoRoot, "docs/qa/evidence/tenant-admin-makeover-phase2-2026-10-26");
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

test("users and roles keep compact readable hierarchy at desktop and mobile", async ({ page }) => {
  await loginAsTenantAdmin(page);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const [route, heading, summaryLabel] of [
      ["/tenant-admin/users", "Tenant User Management", "Tenant user access summary"],
      ["/tenant-admin/roles", "Roles & Permissions", "Tenant role access summary"],
    ] as const) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole("group", { name: summaryLabel })).toBeVisible();
      await expectNoOverflow(page);
      if (route.endsWith("/roles") && width === 390) {
        const list = page.locator(".tenant-role-list");
        const overview = page.getByLabel("Permission catalog overview");
        const firstRow = page.locator(".tenant-role-row").first();
        const [listBox, overviewBox, rowBox] = await Promise.all([list.boundingBox(), overview.boundingBox(), firstRow.boundingBox()]);
        expect(listBox?.width).toBeGreaterThan(300);
        expect(rowBox?.width).toBeGreaterThan(300);
        expect(overviewBox!.y).toBeGreaterThan(listBox!.y + listBox!.height - 2);
      }
      await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-${route.endsWith("users") ? "users" : "roles"}-${width}.png`), fullPage: true, animations: "disabled" });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tenant-admin/users");
  await axeScan(page, "users");
  await page.goto("/tenant-admin/roles");
  await axeScan(page, "roles");
});

test("member invitation and custom role changes persist through authoritative refresh", async ({ page }) => {
  await loginAsTenantAdmin(page);
  const suffix = `${test.info().project.name}-${Date.now()}`;

  await page.goto("/tenant-admin/roles");
  await page.getByRole("button", { name: "Add role" }).click();
  const roleDialog = page.getByRole("dialog", { name: "Create tenant role" });
  await roleDialog.getByLabel("Role name").fill(`Phase 2 Reviewer ${suffix}`);
  await roleDialog.getByLabel("Role code").fill(`phase-2-reviewer-${suffix}`);
  await roleDialog.getByLabel("Description").fill("Reviews Tenant Admin Phase 2 evidence.");
  await roleDialog.getByRole("tab", { name: "Tenant Admin" }).click();
  await roleDialog.getByRole("checkbox", { name: /^View tenant control center\b/ }).check();
  await roleDialog.getByRole("button", { name: "Create role" }).click();
  await expect(roleDialog).toHaveCount(0);
  await page.getByLabel("Search roles").fill(`phase-2-reviewer-${suffix}`);
  const createdRole = page.locator(".tenant-role-row").filter({ hasText: `Phase 2 Reviewer ${suffix}` });
  await expect(createdRole).toBeVisible();
  await page.reload();
  await page.getByLabel("Search roles").fill(`phase-2-reviewer-${suffix}`);
  await expect(createdRole).toContainText("Reviews Tenant Admin Phase 2 evidence.");
  await createdRole.getByRole("button", { name: "Deactivate" }).click();
  await expect(page.getByRole("status")).toContainText("Role deactivated successfully.");

  await page.goto("/tenant-admin/users");
  const inviteOpener = page.getByRole("button", { name: "Invite member" });
  await inviteOpener.click();
  const inviteDialog = page.getByRole("dialog", { name: "Invite tenant member" });
  const email = `phase2.${suffix}@playwright.qa.invalid`;
  await inviteDialog.getByLabel("Email").fill(email);
  await inviteDialog.getByLabel("Username").fill(`phase2.${suffix}`);
  await inviteDialog.getByLabel("First name").fill("Phase");
  await inviteDialog.getByLabel("Last name").fill("Reviewer");
  await inviteDialog.getByRole("button", { name: "Invite member", exact: true }).click();
  await expect(inviteDialog).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Invite saved successfully.");
  await expect(page.locator(".tenant-membership-row").filter({ hasText: email })).toBeVisible();
  await page.reload();
  await page.getByLabel("Search members").fill(email);
  await expect(page.locator(".tenant-membership-row")).toContainText(email);
});

test("ambiguous invite and role writes preserve input and avoid success claims", async ({ page }) => {
  await loginAsTenantAdmin(page);
  await page.goto("/tenant-admin/roles");
  await page.getByRole("button", { name: "Add role" }).click();
  const roleDialog = page.getByRole("dialog", { name: "Create tenant role" });
  await roleDialog.getByLabel("Role name").fill("Unconfirmed role write");
  await page.route("**/api/tenant-admin/roles", async (route) => route.abort("connectionreset"), { times: 1 });
  await roleDialog.getByRole("button", { name: "Create role" }).click();
  await expect(roleDialog.getByRole("alert")).toContainText("outcome is unconfirmed");
  await expect(roleDialog.getByLabel("Role name")).toHaveValue("Unconfirmed role write");
  await page.keyboard.press("Escape");

  await page.goto("/tenant-admin/users");
  await page.getByRole("button", { name: "Invite member" }).click();
  const inviteDialog = page.getByRole("dialog", { name: "Invite tenant member" });
  await inviteDialog.getByLabel("Email").fill("unconfirmed.invite@playwright.qa.invalid");
  await inviteDialog.getByLabel("Username").fill("unconfirmed.invite");
  await page.route("**/api/tenant-admin/memberships", async (route) => route.abort("connectionreset"), { times: 1 });
  await inviteDialog.getByRole("button", { name: "Invite member", exact: true }).click();
  await expect(inviteDialog.getByRole("alert")).toContainText("outcome is unconfirmed");
  await expect(inviteDialog.getByLabel("Email")).toHaveValue("unconfirmed.invite@playwright.qa.invalid");
});

test("view-only tenant role keeps navigation and mutations permission-scoped", async ({ page }) => {
  await loginAsTenantAdmin(page);
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const roleResponse = await page.request.post("/api/tenant-admin/roles", { data: {
    name: `Phase 2 Viewer ${suffix}`,
    code: `phase-2-viewer-${suffix}`,
    description: "Tenant Admin view-only proof.",
    is_active: true,
    permission_keys: ["tenant.dashboard.view", "tenant.users.view", "tenant.roles.view"],
  } });
  expect(roleResponse.ok()).toBeTruthy();
  const rolePayload = await roleResponse.json();
  expect(rolePayload.console).toBeUndefined();
  const roleId = rolePayload.role.id as string;
  const username = `phase2.viewer.${suffix}`;
  const inviteResponse = await page.request.post("/api/tenant-admin/memberships", { data: {
    username,
    email: `${username}@playwright.qa.invalid`,
    first_name: "Phase 2",
    last_name: "Viewer",
    membership_status: "active",
    role_ids: [roleId],
  } });
  expect(inviteResponse.ok()).toBeTruthy();
  const invitePayload = await inviteResponse.json();
  expect(invitePayload.console).toBeUndefined();
  const password = invitePayload.generated_password as string;

  await login(page, username, password);
  await page.goto("/tenant-admin/roles");
  await expect(page.getByRole("button", { name: "Add role" })).toBeDisabled();
  await expect(page.getByText("Role changes require tenant.roles.manage.")).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link", { name: /Plan/ })).toHaveCount(0);
  const blockedRole = await page.request.post("/api/tenant-admin/roles", { data: { name: "Blocked", code: `blocked-${suffix}` } });
  expect(blockedRole.status()).toBe(403);

  await page.goto("/tenant-admin/users");
  await expect(page.getByRole("button", { name: "Invite member" })).toBeDisabled();
  await expect(page.getByText("User changes require tenant.users.manage.")).toBeVisible();
  const blockedInvite = await page.request.post("/api/tenant-admin/memberships", { data: { username: `blocked.${suffix}`, email: `blocked.${suffix}@example.test`, role_ids: [roleId] } });
  expect(blockedInvite.status()).toBe(403);
});
