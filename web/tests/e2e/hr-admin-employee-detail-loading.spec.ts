import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const detailRequest = /\/api\/hr-admin\/employees\/[^/?]+$/;

function rows(page: Page) {
  return page.locator(".employee-directory-table tbody tr");
}

function identity(row: Locator) {
  return row.getByRole("link").first();
}

function panel(page: Page) {
  return page.getByRole("heading", { name: "Employee master detail" }).locator("..", { hasText: "Employee master detail" }).locator("xpath=ancestor::article[1]");
}

async function employeeId(row: Locator) {
  const href = await identity(row).getAttribute("href");
  const id = href ? new URL(href, "http://localhost").searchParams.get("employeeId") : null;
  expect(id).toBeTruthy();
  return id as string;
}

async function delayedUpstream(route: Route, delayMs: number) {
  const response = await route.fetch();
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  await route.fulfill({ response });
}

test.describe("HR Admin employee detail loading feedback", () => {
  for (const delayMs of [750, 2_000]) {
    test(`acknowledges selection immediately during a ${delayMs} ms detail request`, async ({ page }, testInfo) => {
      if (delayMs === 2_000) await page.setViewportSize({ width: 390, height: 844 });
      await gotoAuthenticated(page, "/hr-admin/employees?page_size=5", hrAdmin);
      const row = rows(page).first();
      const id = await employeeId(row);
      await page.route(detailRequest, (route) => delayedUpstream(route, delayMs));

      const startedAt = Date.now();
      await identity(row).click();
      await expect(page.getByTestId("employee-detail-skeleton")).toBeVisible({ timeout: 500 });
      const feedbackMs = Date.now() - startedAt;
      expect(feedbackMs).toBeLessThan(500);
      console.info(`employee-detail-feedback delay_ms=${delayMs} indicator_ms=${feedbackMs}`);
      await testInfo.attach("selection-feedback.json", {
        body: Buffer.from(JSON.stringify({ detailDelayMs: delayMs, feedbackMs }, null, 2)),
        contentType: "application/json",
      });
      await expect(row).toHaveAttribute("data-selection-state", "loading");
      await expect(panel(page)).toHaveAttribute("aria-busy", "true");
      await expect(page.getByText("Loading employee details", { exact: true })).toBeAttached();
      await expect(page).toHaveURL(new RegExp(`employeeId=${id}`));
      await expect(row).toHaveAttribute("data-selection-state", "ready", { timeout: delayMs + 5_000 });
      await expect(panel(page)).toContainText(await row.locator("strong").first().innerText());
      await expect(page.locator("body")).toHaveCSS("overflow-x", /^(visible|auto|hidden)$/);
    });
  }

  test("uses latest-request-wins for rapid employee selections", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/employees?page_size=5", hrAdmin);
    const targetRows = rows(page).filter({ has: page.getByRole("link") });
    expect(await targetRows.count()).toBeGreaterThanOrEqual(3);
    const ids = await Promise.all([0, 1, 2].map((index) => employeeId(targetRows.nth(index))));
    const names = await Promise.all([0, 1, 2].map((index) => targetRows.nth(index).locator("strong").first().innerText()));
    const delays = new Map([[ids[0], 2_000], [ids[1], 750], [ids[2], 50]]);
    let resolveOldestRequest: () => void = () => undefined;
    const oldestRequestCompleted = new Promise<void>((resolve) => { resolveOldestRequest = resolve; });
    await page.route(detailRequest, async (route) => {
      const id = route.request().url().split("/").pop() as string;
      await delayedUpstream(route, delays.get(id) ?? 0);
      if (id === ids[0]) resolveOldestRequest();
    });

    await identity(targetRows.nth(0)).click();
    await identity(targetRows.nth(1)).click();
    await identity(targetRows.nth(2)).click();
    await expect(targetRows.nth(2)).toHaveAttribute("data-selection-state", "ready");
    await expect(panel(page).locator(".hr-employee-profile-summary h3")).toHaveText(names[2]);
    await oldestRequestCompleted;
    await expect(panel(page).locator(".hr-employee-profile-summary h3")).toHaveText(names[2]);
    await expect(panel(page).locator(".hr-employee-profile-summary h3")).not.toHaveText(names[0]);
  });

  test("shows an actionable panel error and recovers on retry", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/employees?page_size=5", hrAdmin);
    const row = rows(page).first();
    const name = await row.locator("strong").first().innerText();
    let attempts = 0;
    await page.route(detailRequest, async (route) => {
      attempts += 1;
      if (attempts === 1) {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Temporary employee service failure." }) });
        return;
      }
      await route.continue();
    });

    await identity(row).click();
    const alert = panel(page).getByRole("alert");
    await expect(alert).toContainText("Temporary employee service failure.");
    await alert.getByRole("button", { name: "Retry" }).click();
    await expect(row).toHaveAttribute("data-selection-state", "ready");
    await expect(panel(page)).toContainText(name);
    expect(attempts).toBe(2);
  });

  test("restores cached employee details with browser Back and Forward", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/employees?page_size=5", hrAdmin);
    const first = rows(page).nth(0);
    const second = rows(page).nth(1);
    const firstId = await employeeId(first);
    const secondId = await employeeId(second);
    const firstName = await first.locator("strong").first().innerText();
    const secondName = await second.locator("strong").first().innerText();

    await identity(first).click();
    await expect(first).toHaveAttribute("data-selection-state", "ready");
    await expect(page).toHaveURL(new RegExp(`employeeId=${firstId}`));
    await identity(second).click();
    await expect(second).toHaveAttribute("data-selection-state", "ready");
    await expect(page).toHaveURL(new RegExp(`employeeId=${secondId}`));
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`employeeId=${firstId}`));
    await expect(panel(page)).toContainText(firstName);
    await expect(page.getByTestId("employee-detail-skeleton")).toHaveCount(0);
    await page.goForward();
    await expect(panel(page)).toContainText(secondName);
  });
});
