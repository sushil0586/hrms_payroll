import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
  workspacePlatformPersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe.configure({ mode: "serial" });

const evidence = path.resolve(__dirname, "../../../docs/qa/evidence/release-candidate-persisted-2026-10-29");
let workspace: IsolatedQaWorkspace;

async function expectReady(page: Page) {
  await expect(page.locator("main h1").first()).toBeVisible();
  await expect(page.getByText(/application error|could not load the current workspace/i)).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();
}

async function axeMain(page: Page, name: string) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: typeof import("axe-core") }).axe;
    return axe.run(document.querySelector("main")!, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
    });
  });
  await writeFile(path.join(evidence, `${name}-axe.json`), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]);
}

test.beforeAll(async ({}, info) => {
  await mkdir(evidence, { recursive: true });
  workspace = await provisionIsolatedQaWorkspace(info);
});

test.afterAll(async () => {
  await cleanupIsolatedQaWorkspace(workspace);
});

test("public landing and login remain available with demo data disabled", async ({ page }) => {
  for (const route of ["/", "/login"]) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("main h1").first()).toBeVisible();
  }
  await expect(page.getByRole("textbox", { name: "Username or email" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("HR Admin route families render and directory filters update locally and survive reload", async ({ page }) => {
  await gotoAuthenticated(page, "/hr-admin", workspacePersona(workspace, "hr_admin"));
  for (const route of [
    "/hr-admin",
    "/hr-admin/employees",
    "/hr-admin/organization",
    "/hr-admin/leave-requests",
    "/hr-admin/attendance-records",
    "/hr-admin/employee-documents",
    "/hr-admin/payroll-readiness",
    "/hr-admin/reports",
  ]) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), route).toBe(200);
    await expectReady(page);
  }

  await page.goto("/hr-admin/employees", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.body.dataset.rcDocument = "preserved");
  await page.getByLabel("Search", { exact: true }).fill("no-such-release-candidate-employee");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("No employees match these filters.");
  await expect.poll(() => page.evaluate(() => document.body.dataset.rcDocument)).toBe("preserved");
  await expect(page).toHaveURL(/q=no-such-release-candidate-employee/);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Search", { exact: true })).toHaveValue("no-such-release-candidate-employee");
  await expect(page.getByRole("status")).toContainText("No employees match these filters.");
  await page.setViewportSize({ width: 390, height: 844 });
  await expectReady(page);
  await axeMain(page, "chromium-hr-admin-employees-filtered");
});

test("Platform Admin is available only to the platform persona", async ({ page }) => {
  await gotoAuthenticated(page, "/platform-admin/tenants", workspacePlatformPersona(workspace));
  await expectReady(page);
  const allowed = await page.evaluate(async () => (await fetch("/api/platform/tenants", { credentials: "same-origin" })).status);
  expect(allowed).toBe(200);
  await axeMain(page, "chromium-platform-admin-tenants");

  await gotoAuthenticated(page, "/platform-admin/tenants", workspacePersona(workspace, "employee"));
  await expect(page).not.toHaveURL(/\/platform-admin\/tenants/);
  const denied = await page.evaluate(async () => (await fetch("/api/platform/tenants", { credentials: "same-origin" })).status);
  expect([401, 403, 404]).toContain(denied);
});
