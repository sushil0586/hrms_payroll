import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated } from "../helpers/staging-auth";

test.describe("ESS Notifications launch certification", () => {
  test("inbox keeps filters, list, summary, and full review separate", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoAuthenticated(page, "/ess/notifications", employee);
    await expectPageReady(page, "Notifications");

    for (const metric of ["Notifications", "Unread on page", "High priority", "Failed on page"]) {
      await expect(page.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: "Inbox filters" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Inbox list" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notification detail" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Review messages that need action" })).toBeVisible();
    await expect(page.getByText("Provider logs")).toHaveCount(0);

    const review = page.getByRole("button", { name: "Review notification" }).first();
    if (await review.isVisible().catch(() => false)) {
      await review.click();
      const dialog = page.getByRole("dialog", { name: /Notification detail/i });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText("Message", { exact: true })).toBeVisible();
      await expect(dialog.getByText("Delivery", { exact: true })).toBeVisible();
      await expect(dialog.getByText("Source workflow", { exact: true })).toBeVisible();
      await expect(dialog.getByText("Provider logs", { exact: true })).toBeVisible();
      await expect(dialog.getByRole("button", { name: /Mark read|Mark unread/ }).first()).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    }

    await expectNoHorizontalOverflow(page);
  });

  test("filters, empty state, source links, and mobile layout remain usable", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/notifications", employee);
    await expectPageReady(page, "Notifications");

    const main = page.getByRole("main");
    for (const label of ["Search", "Status", "Channel", "Priority", "Subject type", "Rows per page"]) {
      await expect(main.getByLabel(label).first()).toBeVisible();
    }

    const openSource = main.getByRole("link", { name: "Open source" }).first();
    if (await openSource.isVisible().catch(() => false)) {
      await expect(openSource).toHaveAttribute("href", /\/ess|\/ess\/documents|\/ess\/payslips/);
    }

    await main.getByRole("textbox", { name: "Search" }).fill("no-ess-notification-should-match-this");
    await main.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/\/ess\/notifications\?.*q=no-ess-notification-should-match-this/);
    await expect(page.getByText("No notifications match the current filters.")).toBeVisible();

    await main.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/ess\/notifications\/?$/);
    await expect(page.getByRole("heading", { name: "Inbox list" })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ess/notifications", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expectPageReady(page, "Notifications");
    await expect(page.getByRole("heading", { name: "Inbox list" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
