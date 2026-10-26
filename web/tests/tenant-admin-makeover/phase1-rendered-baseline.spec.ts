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
const evidence = path.join(repoRoot, "docs/qa/evidence/tenant-admin-makeover-phase1-2026-10-26");
let workspace: IsolatedQaWorkspace;

const routes = [
  ["/tenant-admin", "Account Control Center", "Dashboard"],
  ["/tenant-admin/users", "Tenant User Management", "Users"],
  ["/tenant-admin/roles", "Roles & Permissions", "Roles & Permissions"],
  ["/tenant-admin/plan", "Plan & Billing", "Plan & Billing"],
  ["/tenant-admin/setup", "Tenant Setup Guide", "Setup Guide"],
  ["/tenant-admin/settings", "Tenant Settings", "Settings"],
  ["/tenant-admin/financial-calendars", "Financial years and periods", "Financial Years"],
  ["/tenant-admin/leave-year", "Leave-year control", "Leave Years"],
  ["/tenant-admin/security-readiness", "Enterprise Security Readiness", "Security"],
  ["/tenant-admin/support-access", "Support Access", "Support Access"],
  ["/tenant-admin/trust-audit", "Tenant Trust Audit", "Audit Trail"],
  ["/tenant-admin/data-governance", "Data retention and exports", "Data Governance"],
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

async function expectNoDocumentOverflow(page: Page) {
  const size = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(size.scroll).toBeLessThanOrEqual(size.client + 1);
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

function screenshotName(route: string, width: number) {
  const slug = route.replace(/^\//, "").replaceAll("/", "-") || "tenant-admin";
  return path.join(evidence, `${test.info().project.name}-${slug}-${width}.png`);
}

async function verifyRoute(page: Page, route: typeof routes[number], width: number) {
  const [url, heading] = route;
  await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByText(/could not load the current workspace|application error/i)).toHaveCount(0);
  if (width >= 980) {
    const nav = page.getByRole("navigation", { name: "Tenant Admin navigation" });
    await expect(nav).toBeVisible();
    await expect(nav.locator(`a[href="${url}"]`)).toHaveAttribute("aria-current", "page");
  }
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: screenshotName(url, width), fullPage: true, animations: "disabled" });
}

test.beforeAll(async ({}, info) => {
  mkdirSync(evidence, { recursive: true });
  workspace = await provisionIsolatedQaWorkspace(info);
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

test("all twelve routes expose the current desktop and mobile contract", async ({ page }) => {
  test.setTimeout(600_000);
  await login(page, "tenant_admin");
  for (const width of [1440, 390]) {
    for (const route of routes) await verifyRoute(page, route, width);
  }
});

test("late financial, leave-year and governance routes retain evidence at every target width", async ({ page }) => {
  await login(page, "tenant_admin");
  const lateRoutes = routes.filter(([url]) => ["/tenant-admin/financial-calendars", "/tenant-admin/leave-year", "/tenant-admin/data-governance"].includes(url));
  for (const width of [768, 320]) {
    for (const route of lateRoutes) await verifyRoute(page, route, width);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tenant-admin/financial-calendars");
  await expect(page.getByRole("heading", { name: "Calendar register" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Accounting period register" })).toBeVisible();
  await axeScan(page, "financial-calendars");

  await page.goto("/tenant-admin/leave-year");
  await expect(page.getByRole("heading", { name: "Governed leave-year periods" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Year-close status" })).toBeVisible();
  await axeScan(page, "leave-year");

  await page.goto("/tenant-admin/data-governance");
  await expect(page.getByRole("heading", { name: "Governed data request" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Request status" })).toBeVisible();
  await axeScan(page, "data-governance");
});

test("shared dialogs restore focus and employee access fails closed", async ({ page }) => {
  await login(page, "tenant_admin");
  await page.goto("/tenant-admin/users");
  const opener = page.getByRole("button", { name: /invite member/i }).first();
  await opener.focus();
  await opener.press("Enter");
  const dialog = page.getByRole("dialog", { name: /invite tenant member/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Email")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();

  await login(page, "employee");
  await page.goto("/tenant-admin", { waitUntil: "domcontentloaded" });
  await expect(page).not.toHaveURL(/\/tenant-admin(?:\/|$)/);
  const denied = await page.request.get("/api/tenant-admin/data-governance", { failOnStatusCode: false });
  expect([401, 403, 404]).toContain(denied.status());
});
