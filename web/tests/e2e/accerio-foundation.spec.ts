import path from "node:path";
import { writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { provisionIsolatedQaWorkspace, cleanupIsolatedQaWorkspace, workspacePersona, type IsolatedQaWorkspace } from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";
import { expectNoHorizontalOverflow } from "../helpers/assertions";

const evidence = path.resolve(__dirname, "../../../docs/qa/evidence/accerio-design-system");
async function expectMenuInViewport(page: Page) {
  const panel = page.locator(".mobile-workspace-nav__panel");
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull(); expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
  const clippedLinks = await panel.locator("a").evaluateAll(links => links.filter(link => link.getBoundingClientRect().left < 0 || link.getBoundingClientRect().right > document.documentElement.clientWidth + 1).map(link => link.textContent));
  expect(clippedLinks).toEqual([]);
}
let workspace: IsolatedQaWorkspace;
test.beforeAll(async ({}, info) => {
  if (process.env.POSTGRES_DB !== "hrms_ess2" || process.env.POSTGRES_HOST !== "127.0.0.1") throw new Error("Dedicated loopback QA database required");
  workspace = await provisionIsolatedQaWorkspace(info);
});
test.afterAll(async ({}, info) => {
  await cleanupIsolatedQaWorkspace(workspace);
  await writeFile(path.join(evidence, `${info.project.name}-foundation-fixture-cleanup.json`), JSON.stringify({ seed_ref: workspace?.seedRef, verified_absent: true }, null, 2));
});

test("shared theme, information panels, quick actions, tablet and reduced motion", async ({ page }, info) => {
  await gotoAuthenticated(page, "/ess", workspacePersona(workspace, "employee"));
  const shell = page.locator(".accerio-workspace");
  await expect(shell).toBeVisible();
  expect(await shell.evaluate(el => getComputedStyle(el).getPropertyValue("--ds-brand").trim())).toBe("#5145b8");
  await expect(page.locator(".ess-identity")).toBeVisible();
  const searchFrame = await page.locator(".search-chip--calm").boundingBox();
  const searchInput = await page.getByRole("searchbox", { name: "Workspace search" }).boundingBox();
  expect(searchFrame).not.toBeNull();
  expect(searchInput).not.toBeNull();
  expect(searchFrame!.height).toBeGreaterThanOrEqual(44);
  expect(searchInput!.y).toBeGreaterThanOrEqual(searchFrame!.y);
  expect(searchInput!.y + searchInput!.height).toBeLessThanOrEqual(searchFrame!.y + searchFrame!.height + 1);
  await expect(page.locator(".ess-fields").first()).toBeVisible();
  await expect(page.locator(".ess-service-list a").first()).toHaveAttribute("href", /\/ess\//);
  for (const route of ["/ess", "/ess/profile", "/ess/attendance?month=2029-03"]) {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(route);
    await expect(page.locator("main h1")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
    if (route === "/ess") {
      const clippedHeaders = await page.locator(".ess-balance-table thead th").evaluateAll(cells => cells.filter(cell => cell.scrollWidth > cell.clientWidth + 1).map(cell => cell.textContent));
      expect(clippedHeaders, "Leave headers must fit without overlapping adjacent columns").toEqual([]);
    }
    await page.locator("body").click({ position: { x: 1, y: 1 } });
    await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: path.join(evidence, `${info.project.name}-${route.includes("profile") ? "profile" : route.includes("attendance") ? "attendance" : "dashboard"}-tablet.png`), fullPage: true });
  }
  for (const width of [320, 390, 768, 900]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator(".mobile-workspace-nav summary").click();
    await expectMenuInViewport(page);
    await page.locator(".mobile-workspace-nav summary").click();
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  const durations = await page.locator("a").first().evaluate(el => ({ transition: getComputedStyle(el).transitionDuration, animation: getComputedStyle(el).animationDuration }));
  for (const duration of Object.values(durations)) expect(parseFloat(duration)).toBeLessThanOrEqual(.01);
  await page.goto("/ess/profile");
  // This WebKit runtime uses Option+Tab to traverse links; plain Tab starts at inputs.
  await page.keyboard.press(info.project.name === "webkit" ? "Alt+Tab" : "Tab");
  await expect(page.getByRole("link", { name: "Skip to employee content" })).toBeFocused();
  expect(await page.locator(":focus").evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.locator("#ess-content")).toBeFocused();
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await expectNoHorizontalOverflow(page);
});

test("MSS consumes the same live shell and tokens without changing approval routes", async ({ page }, info) => {
  await gotoAuthenticated(page, "/mss", workspacePersona(workspace, "manager"));
  await expect(page.getByRole("heading", { name: /Manager dashboard/i })).toBeVisible();
  await expect(page.locator(".accerio-workspace")).toBeVisible();
  await expect(page.locator(".app-sidebar__brand strong")).toHaveText("Accerio");
  expect(await page.locator(".accerio-workspace").evaluate(el => getComputedStyle(el).getPropertyValue("--ds-brand").trim())).toBe("#5145b8");
  await expect(page.locator("main .button--primary").first()).toHaveCSS("background-color", "rgb(81, 69, 184)");
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: path.join(evidence, `${info.project.name}-mss-desktop.png`), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await page.getByText("Menu", { exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Manager mobile navigation" })).toBeVisible();
  await expectMenuInViewport(page);
  await page.screenshot({ path: path.join(evidence, `${info.project.name}-mss-mobile.png`), fullPage: true });
  await page.locator('.mobile-workspace-nav__panel a[href="/mss/approvals"]').first().click();
  await expect(page.getByRole("heading", { name: /Manager approvals/i })).toBeVisible();
  await expect(page.locator(".mobile-workspace-nav")).toHaveJSProperty("open", false);
});
