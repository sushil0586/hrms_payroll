import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from "../helpers/isolated-qa-workspace";

const repo = path.resolve(__dirname, "../../..");
const evidenceRoot = process.env.PAYROLL_PHASE2_EVIDENCE_ROOT
  || path.join(repo, "docs/qa/evidence/payroll-makeover-phase2-2026-10-24");

let fixture: IsolatedQaWorkspace;

test.beforeAll(async ({}, info) => {
  fixture = await provisionIsolatedQaWorkspace(info);
  mkdirSync(path.join(evidenceRoot, "screens"), { recursive: true });
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(fixture));

test.beforeEach(async ({ page }) => {
  const persona = workspacePersona(fixture, "hr_admin");
  const login = await page.request.post("/api/auth/login", {
    data: { identifier: persona.username, password: persona.password },
  });
  expect(login.status()).toBe(200);
});

async function expectContainedPage(page: Page) {
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.locator("main h1")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
}

const workspaces = [
  {
    slug: "payroll-setup",
    route: "/hr-admin/payroll-setup?tab=actions",
    navigation: "Payroll setup action groups",
    tabs: ["Calendars", "Periods", "Pay groups", "Assignments"],
    activeAttribute: ".payroll-crud-console",
    visibleTarget: "payroll-calendar-form",
  },
  {
    slug: "salary-setup",
    route: "/hr-admin/salary-setup?tab=actions",
    navigation: "Salary setup action groups",
    tabs: ["Import", "Components", "Structures", "Versions", "Lines", "Assignments"],
    activeAttribute: ".salary-crud-console",
    visibleTarget: "salary-assignment-import-workbench",
  },
  {
    slug: "payroll-statutory",
    route: "/hr-admin/payroll-statutory?tab=actions",
    navigation: "Statutory setup action groups",
    tabs: ["Import", "Catalog", "Compliance", "Profiles", "Declarations"],
    activeAttribute: ".payroll-statutory-crud-console",
    visibleTarget: "statutory-profile-import-workbench",
  },
  {
    slug: "payroll-rules",
    route: "/hr-admin/payroll-rules?tab=actions",
    navigation: "Payroll rule action groups",
    tabs: ["Definitions", "Versions"],
    activeAttribute: ".payroll-rule-operations-panel",
    visibleTarget: "payroll-rule-definition-form",
  },
] as const;

for (const workspace of workspaces) {
  test(`${workspace.slug} keeps one compact active configuration task`, async ({ page }, info) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.setViewportSize({ width: 320, height: 640 });
    const response = await page.goto(workspace.route, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expectContainedPage(page);

    const navigation = page.getByRole("navigation", { name: workspace.navigation });
    await expect(navigation).toBeVisible();
    for (const tab of workspace.tabs) {
      await expect(navigation.getByRole("button", { name: new RegExp(`^${tab}`) })).toBeVisible();
    }
    await expect(page.getByTestId(workspace.visibleTarget)).toBeVisible();

    const finalTab = workspace.tabs.at(-1)!;
    await navigation.getByRole("button", { name: new RegExp(`^${finalTab}`) }).click();
    await expect(page.locator(workspace.activeAttribute)).toHaveAttribute("data-active-action", /.+/);
    await expectContainedPage(page);

    const hash = await page.evaluate(() => window.location.hash);
    expect(hash).not.toBe("");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(workspace.activeAttribute)).toHaveAttribute("data-active-action", /.+/);
    await expectContainedPage(page);

    const screenshot = `${info.project.name}-${workspace.slug}-actions-320.png`;
    await page.screenshot({ path: path.join(evidenceRoot, "screens", screenshot), fullPage: true });
    expect(pageErrors).toEqual([]);
    writeFileSync(info.outputPath("configuration-proof.json"), JSON.stringify({
      browser: info.project.name,
      route: workspace.route,
      tabs: workspace.tabs,
      finalTab,
      hash,
      screenshot,
    }, null, 2));
  });
}

test("statutory overview wraps long readiness values at narrow width", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/hr-admin/payroll-statutory", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("tds-compliance-report")).toBeVisible();
  await expectContainedPage(page);
  const cards = page.getByTestId("tds-compliance-report").locator(".payroll-statutory-filing-card");
  for (let index = 0; index < await cards.count(); index += 1) {
    expect(await cards.nth(index).evaluate((element) => element.scrollWidth <= element.clientWidth)).toBeTruthy();
  }
  await page.screenshot({
    path: path.join(evidenceRoot, "screens", `${info.project.name}-payroll-statutory-overview-320.png`),
    fullPage: true,
  });
});
