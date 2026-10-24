import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, type IsolatedQaWorkspace, workspacePersona } from "../helpers/isolated-qa-workspace";

const repo = path.resolve(__dirname, "../../..");
const evidence = path.join(repo, "docs/qa/evidence/payroll-makeover-phase5-2026-10-24");
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

const routes = [
  { slug: "outputs", heading: "Payroll Outputs", base: "/hr-admin/payroll-outputs", nav: "Payroll output sections", tabs: ["Overview", "Register", "Detail", "Actions"] },
  { slug: "handoff", heading: "Payroll Handoff", base: "/hr-admin/payroll-handoff", nav: "Payroll handoff sections", tabs: ["Overview", "Artifacts", "Actions", "Delivery", "Evidence"] },
  { slug: "providers", heading: "Payroll Providers", base: "/hr-admin/payroll-providers", nav: "Payroll provider sections", tabs: ["Overview", "Connections", "Mapping", "Delivery", "Registry"] },
] as const;

for (const route of routes) {
  for (const tab of route.tabs) {
    test(`${route.heading} ${tab} follows the Phase 5 narrow-screen contract`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${route.base}?tab=${tab.toLowerCase()}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      await expect(page.locator("main h1")).toHaveCount(1);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      const navigation = page.getByRole("navigation", { name: route.nav });
      await expect(navigation.getByRole("link", { name: new RegExp(`^${tab}`) })).toHaveAttribute("aria-current", "page");
      if (tab === "Actions" || (route.slug === "providers" && tab === "Connections")) {
        await page.screenshot({ path: path.join(evidence, "screens", `${info.project.name}-${route.slug}-${tab.toLowerCase()}-320.png`), fullPage: true });
      }
      expect(errors).toEqual([]);
    });
  }
}
