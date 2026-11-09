import { expect, test, type Page, type TestInfo } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from "../helpers/isolated-qa-workspace";

let workspace: IsolatedQaWorkspace;

const screens = [
  { route: "/hr-admin/shifts", name: "shifts", action: "Inspect", role: "complementary", surface: "Shift detail", close: "Close" },
  { route: "/hr-admin/shift-roster-templates", name: "roster-templates", action: "Create template", role: "dialog", surface: "Create roster template", close: "Close Create roster template" },
  { route: "/hr-admin/employee-shift-assignments", name: "shift-assignments", action: "Inspect", role: "complementary", surface: "Shift assignment detail", close: "Close" },
] as const;

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({}, testInfo) => {
  test.setTimeout(180_000);
  workspace = await provisionIsolatedQaWorkspace(testInfo);
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true, animations: "disabled" }),
    contentType: "image/png",
  });
}

test("core shift and roster screens remain usable, accessible, and visually contained", async ({ page }, testInfo) => {
  const actor = workspacePersona(workspace, "hr_admin");
  const login = await page.request.post("/api/auth/login", {
    data: { identifier: actor.username, password: actor.password },
  });
  expect(login.status()).toBe(200);

  const consoleErrors: string[] = [];
  const failedResponses: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 500) failedResponses.push(`${response.status()} ${response.url()}`);
  });

  for (const screen of screens) {
    await page.goto(screen.route);
    await expect(page.locator("main.accerio-page")).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });

    const health = await page.evaluate(async () => {
      const axe = (window as unknown as {
        axe: { run: (context: object, options: object) => Promise<{ violations: unknown[] }> };
      }).axe;
      const interactive = Array.from(document.querySelectorAll<HTMLElement>("button, a, input, select, textarea"));
      const clipped = interactive
        .filter((element) => {
          if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
          const rect = element.getBoundingClientRect();
          return rect.width < 1 || rect.height < 1;
        })
        .map((element) => element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName);
      return {
        documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        clipped,
        axe: await axe.run(
          { include: [["main"]] },
          { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } },
        ),
      };
    });

    await testInfo.attach(`${screen.name}-health`, {
      body: JSON.stringify(health, null, 2),
      contentType: "application/json",
    });
    expect(health.documentOverflow, `${screen.route} must not overflow the document`).toBe(false);
    expect(health.clipped, `${screen.route} must not contain zero-size actionable controls`).toEqual([]);
    expect(health.axe.violations, `${screen.route} must have no automated AXE violations`).toEqual([]);
    await attachScreenshot(page, testInfo, `${screen.name}-default`);

    const trigger = page.getByRole("button", { name: screen.action, exact: true }).first();
    await expect(trigger).toBeVisible();
    await trigger.click();
    const surface = page.getByRole(screen.role, { name: screen.surface, exact: true });
    await expect(surface).toBeVisible();
    await attachScreenshot(page, testInfo, `${screen.name}-interaction`);
    await surface.getByRole("button", { name: screen.close, exact: true }).click();
    await expect(trigger).toBeFocused();
  }

  expect(failedResponses, "No screen request may return a server error").toEqual([]);
  expect(consoleErrors, "No screen may emit a browser console error").toEqual([]);
});
