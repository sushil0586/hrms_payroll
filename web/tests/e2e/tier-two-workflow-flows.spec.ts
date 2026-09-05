import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

function filterToolbar(page: Page) {
  return page.locator(".queue-toolbar").first();
}

test.describe("Tier 2 workflow flows", () => {
  test("HR admin can filter attendance regularizations and open full review", async ({ page }) => {
    await page.goto("/hr-admin/attendance-regularizations");
    await expectPageReady(page, /Attendance regularization queue/);

    await filterToolbar(page).getByRole("combobox", { name: /^Request status/ }).selectOption("pending");
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("status") === "pending" && url.searchParams.get("page") === "1"),
      filterToolbar(page).getByRole("button", { name: "Apply filters" }).click(),
    ]);

    await expect(page.getByRole("link", { name: "Review request" }).first()).toBeVisible();
    await page.getByRole("link", { name: "Review request" }).first().click();
    await expect(page).toHaveURL(/\/hr-admin\/attendance-regularizations\/.+\/review$/);
    await expectPageReady(page, "Review attendance regularization");
    await expect(page.getByRole("heading", { name: "HR review decision" })).toBeVisible();
    await expect(page.getByLabel("HR decision note")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("notification diagnostics drill down into retry-ready queue", async ({ page }) => {
    await page.goto("/hr-admin/notification-diagnostics");
    await expectPageReady(page, "Notification diagnostics");

    await page.getByRole("link", { name: "Retry ready" }).first().click();
    await expect(page).toHaveURL(/\/hr-admin\/notifications\?retry_state=retry_ready/);
    await expectPageReady(page, "Notification queue");
    await expect(filterToolbar(page).getByRole("combobox", { name: /^Retry state/ })).toHaveValue("retry_ready");
    await expectNoHorizontalOverflow(page);
  });

  test("ESS notification detail can open its source workflow", async ({ page }) => {
    await page.goto("/ess/notifications?subject_type=employee_document");
    await expectPageReady(page, "Notifications");

    await expect(page.getByRole("heading", { name: "Notification detail" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open source" })).toHaveAttribute("href", "/ess/documents");
    await page.getByRole("link", { name: "Open source" }).click();
    await expect(page).toHaveURL("/ess/documents");
    await expectPageReady(page, "Documents");
    await expectNoHorizontalOverflow(page);
  });

  test("MSS approvals switch from leave to attendance queue and expose decision context", async ({ page }) => {
    await page.goto("/mss/approvals");
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
