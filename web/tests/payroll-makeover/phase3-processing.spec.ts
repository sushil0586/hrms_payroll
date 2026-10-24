import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from "../helpers/isolated-qa-workspace";

const repo = path.resolve(__dirname, "../../..");
const evidence = path.join(repo, "docs/qa/evidence/payroll-makeover-phase3-2026-10-24");
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
});

async function expectContained(page: import("@playwright/test").Page) {
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.locator("main h1")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
}

const routes = [
  { slug: "time-to-payroll", route: "/hr-admin/time-to-payroll", heading: "Time to Payroll" },
  { slug: "payroll-readiness", route: "/hr-admin/payroll-readiness?tab=employees", heading: "Payroll Readiness" },
  { slug: "payroll-calculations", route: "/hr-admin/payroll-calculations", heading: "Payroll Calculations" },
] as const;

for (const item of routes) {
  test(`${item.heading} preserves the Phase 3 narrow-screen contract`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 320, height: 640 });
    const response = await page.goto(item.route, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: item.heading })).toBeVisible();
    await expectContained(page);
    await page.screenshot({
      path: path.join(evidence, "screens", `${info.project.name}-${item.slug}-320.png`),
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

test("Payroll Inputs exposes one hash-backed operation family at a time", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/hr-admin/payroll-inputs", { waitUntil: "domcontentloaded" });
  await expectContained(page);

  const console = page.locator(".payroll-input-operations-panel");
  const navigation = page.getByRole("navigation", { name: "Payroll input operation steps" });
  await expect(console).toHaveAttribute("data-active-operation", "run");
  await expect(page.getByTestId("payroll-run-form")).toBeVisible();
  await expect(page.getByTestId("payroll-input-snapshot-form")).toBeHidden();
  await expect(page.getByTestId("payroll-input-lock-form")).toBeHidden();

  await navigation.getByRole("button", { name: /Input snapshot/ }).click();
  await expect(console).toHaveAttribute("data-active-operation", "snapshot");
  await expect(page.getByTestId("payroll-input-snapshot-form")).toBeVisible();
  await expect(page.getByTestId("payroll-input-bulk-import")).toBeVisible();
  await expect(page).toHaveURL(/#payroll-input-operation-snapshot$/);
  await expectContained(page);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(console).toHaveAttribute("data-active-operation", "snapshot");
  await navigation.getByRole("button", { name: /Lock gate/ }).click();
  await expect(console).toHaveAttribute("data-active-operation", "lock");
  await expect(page.getByTestId("payroll-input-lock-form")).toBeVisible();
  await expect(page.getByTestId("payroll-run-form")).toBeHidden();
  await expectContained(page);

  await page.screenshot({
    path: path.join(evidence, "screens", `${info.project.name}-payroll-inputs-lock-320.png`),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
