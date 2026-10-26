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
const evidence = path.join(repoRoot, "docs/qa/evidence/mss-makeover-phase2-2026-10-26");
let workspace: IsolatedQaWorkspace;

async function login(page: Page, role: "manager" | "manager_b") {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const persona = workspacePersona(workspace, role);
  await page.goto("/login");
  await page.getByLabel("Username or email").fill(persona.username);
  await page.getByLabel("Password").fill(persona.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function noDocumentOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
}

async function axeScan(page: Page) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: { run: (root: Element, options: object) => Promise<{ violations: unknown[] }> };
    }).axe;
    return axe.run(document.querySelector("main")!, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    });
  });
  writeFileSync(path.join(evidence, `${test.info().project.name}-dashboard-axe.json`), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]);
}

test.beforeAll(async ({}, info) => {
  mkdirSync(evidence, { recursive: true });
  workspace = await provisionIsolatedQaWorkspace(info);
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

test("dashboard presents decision queues once with explicit destinations", async ({ page }) => {
  await login(page, "manager");
  await page.goto("/mss");
  await expect(page.getByRole("heading", { name: "Manager dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Coverage context" })).toHaveCount(0);

  const region = page.getByRole("region", { name: "Manager actions" });
  const queues = region.getByRole("list", { name: "Approval queues" }).getByRole("listitem");
  await expect(queues).toHaveCount(2);
  await expect(queues.nth(0)).toContainText("Leave approvals");
  await expect(queues.nth(0)).toContainText("Team leave requests waiting for manager decision.");
  await expect(queues.nth(1)).toContainText("Attendance regularizations");
  await expect(queues.nth(1)).toContainText("Attendance corrections that may affect payroll inputs.");
  await expect(region.getByText("Today exceptions", { exact: true })).toHaveCount(0);
  await expect(region.getByText("Team on leave", { exact: true })).toHaveCount(0);
  await expect(region.getByRole("link", { name: "Review leave" })).toHaveAttribute("href", "/mss/approvals?queue=leave");
  await expect(region.getByRole("link", { name: "Review attendance" })).toHaveAttribute("href", "/mss/approvals?queue=attendance");
  await expect(page.getByText("attendance signals today")).toBeVisible();

  const bodyLayout = await queues.nth(0).locator(".mss-action-row__body").evaluate((element) => ({
    display: getComputedStyle(element).display,
    gap: getComputedStyle(element).rowGap,
  }));
  expect(bodyLayout.display).toBe("grid");
  expect(Number.parseFloat(bodyLayout.gap)).toBeGreaterThan(0);
  await noDocumentOverflow(page);
  await axeScan(page);
  await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-dashboard-desktop.png`), fullPage: true });
});

test("dashboard queue rows and personal links remain directly usable at 320px", async ({ page }) => {
  await login(page, "manager");
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/mss");
  const region = page.getByRole("region", { name: "Manager actions" });
  for (const name of ["Review leave", "Review attendance"]) {
    const link = region.getByRole("link", { name });
    await expect(link).toBeVisible();
    const bounds = await link.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  }
  for (const name of ["Open ESS", "Payslips", "Documents", "Tax"]) {
    await expect(page.getByRole("main").getByRole("link", { name })).toBeVisible();
  }
  await noDocumentOverflow(page);
  await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-dashboard-320x480.png`), fullPage: true });
});

test("manager with clear queues receives a useful ready dashboard", async ({ page }) => {
  await login(page, "manager_b");
  await page.goto("/mss");
  await expect(page.getByRole("heading", { name: "No manager decisions pending" })).toBeVisible();
  await expect(page.getByText("0 pending decisions")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Open ESS" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Review leave" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Review attendance" })).toBeVisible();
  await noDocumentOverflow(page);
});
