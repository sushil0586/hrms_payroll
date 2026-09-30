import { expect, test, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { expectActualUserReadyPage } from "../helpers/user-journey-certification";
import { gotoAuthenticated, manager } from "../helpers/staging-auth";

async function expectLinkHref(page: Page, name: string | RegExp, href: RegExp) {
  const link = page.getByRole("link", { name }).first();
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", href);
}

async function openManagerPage(page: Page, path: string, heading: string | RegExp) {
  await gotoAuthenticated(page, path, manager);
  await expectPageReady(page, heading);
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
}

test.describe.serial("User journey phase 4: manager workspace workflow", () => {
  test("manager control center exposes the practical queues and shortcuts", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });

    await expectActualUserReadyPage(page, {
      path: "/mss",
      heading: /Manager control center/i,
      persona: manager,
      requiredText: [/Team priorities|Work queue/i, /Team members/i, /Pending decisions/i],
    });

    await expectLinkHref(page, /Open approvals/i, /\/mss\/approvals$/);
    await expectLinkHref(page, /^Notifications$/i, /\/mss\/notifications$/);
    await expectLinkHref(page, /Self service/i, /\/ess$/);

    await page.getByRole("link", { name: /Open approvals/i }).first().click();
    await expect(page).toHaveURL(/\/mss\/approvals/);
    await expectPageReady(page, /Manager inbox/i);
  });

  test("manager can review leave and attendance queues without layout or routing issues", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });

    await openManagerPage(page, "/mss/approvals", /Manager inbox/i);
    await expect(page.getByText(/Approval queues/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Leave/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Attendance/i }).first()).toBeVisible();
    await expect(page.getByText(/Leave approvals|No pending leave approvals/i).first()).toBeVisible();
    await expect(page.getByText(/Leave approval detail|No leave approval selected/i).first()).toBeVisible();

    await page.getByRole("link", { name: /Attendance/i }).first().click();
    await expect(page).toHaveURL(/\/mss\/approvals\?.*queue=attendance/);
    await expectPageReady(page, /Manager inbox/i);
    await expect(page.getByText(/Attendance regularizations|No pending regularizations/i).first()).toBeVisible();
    await expect(page.getByText(/Regularization detail|No regularization selected/i).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("link", { name: /Leave/i }).first().click();
    await expect(page).toHaveURL(/\/mss\/approvals\?.*queue=leave/);
    await expectPageReady(page, /Manager inbox/i);
    await expectNoHorizontalOverflow(page);
  });

  test("manager notifications support filters, detail context, and approval handoff links", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });

    await openManagerPage(page, "/mss/notifications", /Notifications/i);
    await expect(page.getByText(/Inbox filters/i).first()).toBeVisible();
    await expect(page.getByText(/Inbox list|No notifications match/i).first()).toBeVisible();
    await expectLinkHref(page, /^Approvals$/i, /\/mss\/approvals$/);
    await expectLinkHref(page, /ESS inbox/i, /\/ess\/notifications$/);

    await page.locator("select[name='status']").selectOption("failed");
    await page.getByRole("button", { name: /Apply filters/i }).click();
    await expectPageReady(page, /Notifications/i);
    await expectNoHorizontalOverflow(page);

    await page.getByRole("link", { name: /^Approvals$/i }).first().click();
    await expect(page).toHaveURL(/\/mss\/approvals/);
    await expectPageReady(page, /Manager inbox/i);
  });

  test("manager account stays inside manager and employee workspaces", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });

    for (const blockedPath of ["/platform-admin", "/tenant-admin", "/finance-manager"]) {
      await test.step(`Manager cannot use ${blockedPath}`, async () => {
        await gotoAuthenticated(page, "/mss", manager);
        await page.goto(blockedPath, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
        await expect(page).toHaveURL(/\/mss|\/ess|\/workspace-access|\/login/);
        await expectNoAppError(page);
        await expectNoHorizontalOverflow(page);
      });
    }
  });
});
