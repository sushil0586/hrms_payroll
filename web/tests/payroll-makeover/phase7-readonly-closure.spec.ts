import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";

type Inventory = {
  route_pattern_count: number;
  routes: Array<{ route: string; phase: number; kind: string }>;
};

const repoRoot = path.resolve(__dirname, "../../..");
const evidenceRoot = path.join(repoRoot, "docs/qa/evidence/payroll-makeover-phase7-2026-10-24");
const inventory = JSON.parse(readFileSync(path.join(repoRoot, "docs/ui/hrms-payroll-route-inventory.json"), "utf8")) as Inventory;
const axeRoutes = new Set([
  "/hr-admin/payroll-setup",
  "/hr-admin/payroll-readiness",
  "/hr-admin/payroll-calculations",
  "/hr-admin/payroll-review",
  "/hr-admin/payroll-outputs",
  "/hr-admin/payroll-providers",
  "/hr-admin/reports/payroll-register",
]);

let workspace: IsolatedQaWorkspace;

test.beforeAll(async ({}, info) => {
  workspace = await provisionIsolatedQaWorkspace(info);
  mkdirSync(path.join(evidenceRoot, "screens"), { recursive: true });
});
test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

async function login(page: Page, role: "hr_admin" | "employee") {
  const persona = workspacePersona(workspace, role);
  const response = await page.request.post("/api/auth/login", {
    data: { identifier: persona.username, password: persona.password },
  });
  expect(response.status()).toBe(200);
}

async function scanMain(page: Page) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  return page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (root: Element, options: object) => Promise<{ violations: unknown[] }> } }).axe;
    return axe.run(document.querySelector("main")!, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    });
  });
}

test("Phase 7 inventory remains exactly 35 unique owned routes", () => {
  expect(inventory.route_pattern_count).toBe(35);
  expect(inventory.routes).toHaveLength(35);
  expect(new Set(inventory.routes.map((item) => item.route)).size).toBe(35);
});

for (const item of inventory.routes) {
  test(`${item.route} passes joined read-only shell, keyboard and responsive gates`, async ({ page }, info) => {
    await login(page, "hr_admin");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(item.route, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("main h1")).toBeVisible();

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
      { width: 320, height: 568 },
    ]) {
      await page.setViewportSize(viewport);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      const regions = page.locator("main .workspace-table-region:visible");
      for (let index = 0; index < await regions.count(); index += 1) {
        await expect(regions.nth(index)).toHaveAttribute("tabindex", "0");
        await expect(regions.nth(index)).toHaveAccessibleName(/.+/);
      }
    }

    const firstControl = page.locator('main :is(a[href],button,input,select,textarea):visible:not([disabled])').first();
    if (await firstControl.count()) {
      await firstControl.focus();
      await expect(firstControl).toBeFocused();
      await firstControl.evaluate((element) => element.setAttribute("data-phase7-focus-origin", "true"));
      await page.keyboard.press("Tab");
      await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("data-phase7-focus-origin") !== "true")).toBeTruthy();
    }

    if (info.project.name === "chromium" && axeRoutes.has(item.route)) {
      const scan = await scanMain(page);
      writeFileSync(path.join(evidenceRoot, `${item.route.slice(1).replaceAll("/", "-")}-axe.json`), JSON.stringify(scan, null, 2));
      expect(scan.violations, item.route).toEqual([]);
      await page.screenshot({
        path: path.join(evidenceRoot, "screens", `${item.route.slice(1).replaceAll("/", "-")}-320.png`),
        fullPage: true,
      });
    }

    const actionableErrors = errors.filter((message) => (
      !message.includes("due to access control checks") &&
      !(info.project.name === "webkit" && message === "Load failed")
    ));
    expect(actionableErrors).toEqual([]);
  });
}

test("ESS payslips passes the affected-consumer shell and accessibility gate", async ({ page }, info) => {
  await login(page, "employee");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ess/payslips", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "Payslips" })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 568 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  if (info.project.name === "chromium") {
    const scan = await scanMain(page);
    writeFileSync(path.join(evidenceRoot, "ess-payslips-axe.json"), JSON.stringify(scan, null, 2));
    expect(scan.violations).toEqual([]);
    await page.screenshot({ path: path.join(evidenceRoot, "screens", "ess-payslips-320.png"), fullPage: true });
  }
});
