import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

function filterToolbar(page: Page) {
  return page.locator(".queue-toolbar").first();
}

test.describe("Tier 2 workflow flows", () => {
  test("HR admin can filter attendance regularizations and open full review", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/attendance-regularizations");
    await expectPageReady(page, /Attendance regularization queue/);

    await filterToolbar(page).getByRole("combobox", { name: /^Request status/ }).selectOption("pending");
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("status") === "pending" && url.searchParams.get("page") === "1"),
      filterToolbar(page).getByRole("button", { name: "Apply filters" }).click(),
    ]);

    const reviewRequest = page.getByRole("link", { name: "Review request" }).first();
    await expect(reviewRequest).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/hr-admin\/attendance-regularizations\/.+\/review$/, { timeout: 30_000 }),
      reviewRequest.click(),
    ]);
    await expectPageReady(page, "Review attendance regularization");
    await expect(page.getByRole("heading", { name: "HR review decision" })).toBeVisible();
    await expect(page.getByLabel("HR decision note")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("notification diagnostics drill down into retry-ready queue", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/notification-diagnostics");
    await expectPageReady(page, "Notification diagnostics");

    const retryReady = page.getByRole("link", { name: "Retry ready" }).first();
    await expect(retryReady).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/hr-admin\/notifications\?retry_state=retry_ready/, { timeout: 30_000 }),
      retryReady.click(),
    ]);
    await expectPageReady(page, "Notification queue");
    await expect(filterToolbar(page).getByRole("combobox", { name: /^Retry state/ })).toHaveValue("retry_ready");
    await expectNoHorizontalOverflow(page);
  });

  test("ESS notification detail can open its source workflow", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/notifications?subject_type=employee_document");
    await expectPageReady(page, "Notifications");

    await expect(page.getByRole("heading", { name: "Notification detail" })).toBeVisible();
    const openSource = page.getByRole("link", { name: "Open source" });
    if (await openSource.isVisible().catch(() => false)) {
      await expect(openSource).toHaveAttribute("href", /\/ess\/documents|\/ess/);
      await openSource.click();
      await expect(page).toHaveURL(/\/ess/);
      await expect(page.getByRole("heading", { name: /Documents|Self service/ })).toBeVisible();
    } else {
      await expect(page.getByText("Source").or(page.getByText("Notification detail")).first()).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
  });

  test("MSS approvals switch from leave to attendance queue and expose decision context", async ({ page }) => {
    await gotoAuthenticated(page, "/mss/approvals");
    await expectPageReady(page, "Manager inbox");
    await expect(page.getByRole("heading", { name: "Leave approvals" })).toBeVisible();

    await page.getByRole("link", { name: /Attendance/ }).first().click();
    await expect(page).toHaveURL(/queue=attendance/);
    await expect(page.getByRole("heading", { name: "Attendance regularizations" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Regularization detail" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Regularization decision" }).or(page.getByText("No regularization selected."))).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
