import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";

const repo = path.resolve(__dirname, "../../..");
const evidence = path.join(repo, "docs/qa/evidence/payroll-makeover-phase4-2026-10-24");
let fixture: IsolatedQaWorkspace;

test.beforeAll(async ({}, info) => {
  fixture = await provisionIsolatedQaWorkspace(info);
  mkdirSync(path.join(evidence, "screens"), { recursive: true });
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(fixture));

test.beforeEach(async ({ page }) => {
  const persona = workspacePersona(fixture, "hr_admin");
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Username or email").fill(persona.username);
  await page.getByLabel("Password").fill(persona.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.setViewportSize({ width: 320, height: 640 });
});

async function expectContained(page: import("@playwright/test").Page, heading: string) {
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
}

const routes = [
  { slug: "review", heading: "Payroll Review", base: "/hr-admin/payroll-review", nav: "Payroll review workspace sections", tabs: ["Overview", "Exceptions", "Actions", "Lines"] },
  { slug: "adjustments", heading: "Payroll Adjustments", base: "/hr-admin/payroll-adjustments", nav: "Payroll adjustment sections", tabs: ["Overview", "Register", "Detail", "Actions"] },
  { slug: "settlements", heading: "Payroll Settlements", base: "/hr-admin/payroll-settlements", nav: "Payroll settlement sections", tabs: ["Overview", "Register", "Detail", "Actions"] },
] as const;

for (const route of routes) {
  for (const tab of route.tabs) {
    test(`${route.heading} ${tab} follows the Phase 4 narrow-screen contract`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const tabId = tab.toLowerCase();
      await page.goto(`${route.base}?tab=${tabId}`, { waitUntil: "domcontentloaded" });
      await expectContained(page, route.heading);
      const navigation = page.getByRole("navigation", { name: route.nav });
      await expect(navigation.getByRole("link", { name: new RegExp(`^${tab}`) })).toHaveAttribute("aria-current", "page");
      if (tab === "Actions") {
        await page.screenshot({ path: path.join(evidence, "screens", `${info.project.name}-${route.slug}-actions-320.png`), fullPage: true });
      }
      expect(errors).toEqual([]);
    });
  }
}
