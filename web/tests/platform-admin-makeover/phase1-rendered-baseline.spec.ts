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
const evidence = path.join(repoRoot, "docs/qa/evidence/platform-admin-makeover-phase1-2026-10-26");
let workspace: IsolatedQaWorkspace;

const routes = [
  ["/platform-admin", "Platform Admin Dashboard", "Dashboard"],
  ["/platform-admin/leads", "Leads", "Leads"],
  ["/platform-admin/tenants", "Tenants", "Tenants"],
  ["/platform-admin/launch", "Launch Blueprint", "Launch Blueprint"],
  ["/platform-admin/onboarding", "Launch Readiness", "Launch Readiness"],
  ["/platform-admin/admins", "Admin Access", "Admin Access"],
  ["/platform-admin/policy-packs", "Setup Templates", "Setup Templates"],
  ["/platform-admin/permissions", "Permission Catalog", "Permissions"],
  ["/platform-admin/audit-logs", "Audit Logs", "Audit Logs"],
  ["/platform-admin/data-governance", "Retention and controlled erasure", "Data Governance"],
] as const;

async function login(page: Page, role: "platform_admin" | "employee") {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const persona = role === "platform_admin" ? workspacePlatformPersona(workspace) : workspacePersona(workspace, "employee");
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

function slug(route: string) {
  return route === "/platform-admin" ? "dashboard" : route.split("/").pop()!;
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

test.beforeAll(async ({}, info) => {
  mkdirSync(evidence, { recursive: true });
  workspace = await provisionIsolatedQaWorkspace(info);
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

test("all ten routes expose the current responsive and accessible contract", async ({ page }) => {
  await login(page, "platform_admin");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width <= 390 ? 720 : 900 });
    for (const [url, heading] of routes) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole("main")).toBeVisible();
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

test("database navigation exposes ten agreed destinations and one current route", async ({ page }) => {
  await login(page, "platform_admin");
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [url, heading, label] of routes) {
    await page.goto(url);
    const nav = page.getByRole("navigation", { name: "Platform Admin navigation" });
    await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    await expect(nav.locator("a[aria-current='page']")).toHaveCount(1);
    await expect(nav.locator("a")).toHaveCount(10);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
});

test("tenant dialog keyboard behavior and non-platform denial remain safe", async ({ page }) => {
  await login(page, "platform_admin");
  await page.goto("/platform-admin/tenants");
  const opener = page.getByRole("button", { name: "Create tenant" });
  await opener.focus();
  await opener.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Create platform tenant" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Code")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();

  await login(page, "employee");
  for (const api of [
    "/api/platform/summary",
    "/api/platform/tenants",
    "/api/platform/leads",
    "/api/platform/permission-catalog",
    "/api/platform/data-governance",
  ]) {
    const response = await page.request.get(api, { failOnStatusCode: false });
    expect([401, 403, 404, 405]).toContain(response.status());
  }
  await page.goto("/platform-admin", { waitUntil: "domcontentloaded" });
  await expect(page).not.toHaveURL(/\/platform-admin(?:\/|$)/);
});
