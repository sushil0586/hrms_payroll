import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, workspacePersona, type IsolatedQaWorkspace } from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";
import { expectNoHorizontalOverflow } from "../helpers/assertions";

let workspace: IsolatedQaWorkspace;
const errors: string[] = [];
const evidence = process.env.HRMS_CERT_EVIDENCE_DIR!;
test.beforeAll(async ({}, info) => {
  if (process.env.POSTGRES_DB !== "hrms_ess2" || process.env.POSTGRES_HOST !== "127.0.0.1" || process.env.POSTGRES_PORT !== "55441") {
    throw new Error("Requires the isolated ESS-6A loopback database");
  }
  workspace = await provisionIsolatedQaWorkspace(info);
});
test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(() => expect(errors).toEqual([]));
test.afterAll(async ({}, info) => {
  await cleanupIsolatedQaWorkspace(workspace);
  await writeFile(`${evidence}/${info.project.name}-extra-fixture-cleanup.json`, JSON.stringify({ seed_ref: workspace.seedRef, verified_absent: true }));
});

test("first advertised request region accepts arrows and exposes its action by keyboard", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await gotoAuthenticated(page, "/ess/requests", workspacePersona(workspace, "employee"));
  const region = page.getByRole("region", { name: "Request history table, scroll horizontally for details" });
  await region.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBe(0);
  // macOS WebKit uses Option-Tab to include links in sequential navigation.
  await page.keyboard.press(info.project.name === "webkit" ? "Alt+Tab" : "Tab");
  await expect(region.getByRole("link", { name: "Review request", exact: true })).toBeFocused();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${evidence}/${info.project.name}-first-key-320.png`, fullPage: true });
});

test("active mobile navigation closes without starting an RSC refresh before leaving", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 568 });
  await gotoAuthenticated(page, "/ess/settings", workspacePersona(workspace, "employee"));
  const refreshes: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/ess/settings" && request.headers()["rsc"] === "1") refreshes.push(request.url());
  });
  await page.getByText("Menu", { exact: true }).click();
  await page.locator(".mobile-workspace-nav__panel").getByRole("link", { name: "Settings Employee account", exact: true }).click();
  await expect(page.locator(".mobile-workspace-nav")).toHaveJSProperty("open", false);
  await expect(page).toHaveURL(/\/ess\/settings$/);
  await page.screenshot({ path: `${evidence}/${info.project.name}-active-settings-390.png`, fullPage: true });
  await page.goto("/ess/requests");
  await expect(page.getByRole("heading", { name: "My Requests", exact: true })).toBeVisible();
  expect(refreshes).toEqual([]);
});


test("employee manager employee transition retains a stable authorized shell", async ({ page }, info) => {
  await gotoAuthenticated(page, "/ess/requests", workspacePersona(workspace, "employee"));
  await gotoAuthenticated(page, "/mss", workspacePersona(workspace, "manager"));
  await expect(page).toHaveURL(/\/mss$/);
  await expect(page.locator("main h1")).toBeVisible();
  await page.screenshot({ path: `${evidence}/${info.project.name}-manager-transition.png`, fullPage: false });
  await gotoAuthenticated(page, "/ess/requests", workspacePersona(workspace, "employee"));
  await expect(page.getByRole("heading", { name: "My Requests", exact: true })).toBeVisible();
});
