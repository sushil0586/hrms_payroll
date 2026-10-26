import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";

const repoRoot = path.resolve(__dirname, "../../..");
const evidence = path.join(repoRoot, "docs/qa/evidence/workflow-notification-phase1-2026-10-24");
let workspace: IsolatedQaWorkspace;

async function login(page: Page, role: "hr_admin" | "employee" | "manager") {
  const persona = workspacePersona(workspace, role);
  const response = await page.request.post("/api/auth/login", { data: { identifier: persona.username, password: persona.password } });
  expect(response.status()).toBe(200);
}

async function scan(page: Page, name: string) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (root: Element, options: object) => Promise<{ violations: unknown[] }> } }).axe;
    return axe.run(document.querySelector("main")!, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
  });
  writeFileSync(path.join(evidence, `${name}-axe.json`), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]);
}

test.beforeAll(async ({}, info) => {
  workspace = await provisionIsolatedQaWorkspace(info);
  mkdirSync(evidence, { recursive: true });
});
test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

test("HR catalogs preserve committed no-match scope, Clear, and browser history", async ({ page }) => {
  await login(page, "hr_admin");
  const cases = [
    ["/hr-admin/workflows?q=phase1-no-match", "No workflow traces match the current filters."],
    ["/hr-admin/notification-templates?q=phase1-no-match", "No templates match the current filters."],
    ["/hr-admin/notification-events?q=phase1-no-match", "No events match the current filters."],
    ["/hr-admin/notifications?q=phase1-no-match", "No notifications match the current filters."],
  ] as const;
  for (const [route, message] of cases) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    const clear = page.getByRole("link", { name: "Clear filters" }).or(page.getByRole("button", { name: "Clear filters" })).first();
    if (await clear.evaluate((element) => element.tagName === "A")) {
      const href = await clear.getAttribute("href");
      expect(href).toBeTruthy();
      await page.goto(href!, { waitUntil: "domcontentloaded" });
    } else {
      await clear.click();
    }
    await expect(page).not.toHaveURL(/phase1-no-match/);
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/q=phase1-no-match/);
    await expect(page.getByText(message, { exact: true })).toBeVisible();
  }
});

test("ESS and MSS inboxes preserve no-match, Clear, and history", async ({ page }) => {
  for (const [role, route, message] of [
    ["employee", "/ess/notifications?q=phase1-no-match", /No notifications match/],
    ["manager", "/mss/notifications?q=phase1-no-match", /No notifications match/],
  ] as const) {
    await login(page, role);
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(message).first()).toBeVisible();
    const clear = page.getByRole("link", { name: "Clear filters" }).first();
    const href = await clear.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/phase1-no-match/);
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/q=phase1-no-match/);
  }
});

test("employee and manager cannot use HR notification APIs", async ({ page }) => {
  for (const role of ["employee", "manager"] as const) {
    await login(page, role);
    for (const endpoint of ["/api/hr-admin/notifications", "/api/hr-admin/notification-templates", "/api/hr-admin/workflow-templates"]) {
      const response = await page.request.get(endpoint);
      expect([403, 404, 405]).toContain(response.status());
    }
  }
});

test("MSS notification dialog traps focus, closes with Escape, and restores its opener", async ({ page }) => {
  await login(page, "manager");
  await page.goto("/mss/notifications", { waitUntil: "domcontentloaded" });
  const opener = page.getByRole("button", { name: "Review notification" }).first();
  await expect(opener).toBeVisible();
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: /Notification detail/i });
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog.getByText("Message", { exact: true }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("selected representative routes pass WCAG A/AA automated scans", async ({ page }) => {
  await login(page, "hr_admin");
  for (const [route, name] of [
    ["/hr-admin/workflows", "workflows"],
    ["/hr-admin/notification-delivery", "notification-delivery"],
    ["/hr-admin/notifications", "notification-queue"],
    ["/hr-admin/notification-diagnostics", "notification-diagnostics"],
  ] as const) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await scan(page, name);
  }
  await login(page, "manager");
  await page.goto("/mss/notifications", { waitUntil: "domcontentloaded" });
  await scan(page, "mss-notifications");
});
