import { expect, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("HR Admin leave request operations certification", () => {
  test("leave request queue is usable, filterable, printable, and responsive", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "print", {
        configurable: true,
        value: () => {
          window.dispatchEvent(new Event("afterprint"));
        },
      });
    });

    await gotoAuthenticated(page, "/hr-admin/leave-requests", hrAdmin);
    await expectPageReady(page, "Leave Requests");
    await expect(page.getByRole("heading", { name: "Leave request queue" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Print queue" })).toBeVisible();

    const requestCards = page.locator("article.record-card").filter({ has: page.locator(".record-chip") });
    if (await requestCards.count()) {
      await expect(requestCards.first()).toContainText(/Pending approval from|Approved|Rejected|Cancelled|Withdrawn/i);
      await expect(requestCards.first()).toContainText(/Workflow|Approval track/i);
      await expect(requestCards.first().getByRole("link", { name: "Open balance" })).toHaveAttribute("href", /\/hr-admin\/leave-balances\?q=/);
    } else {
      await expect(page.getByText("No leave requests match the current filters.")).toBeVisible();
    }

    await page.locator("label.form-field").filter({ hasText: "Request status" }).locator("select").selectOption("pending");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/leave-requests\?.*status=pending/);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "Print queue" }).click();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/hr-admin/leave-requests?page_size=10", { waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Leave Requests");
    await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("employee role cannot access HR Admin leave request APIs", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/leave", employee);
    const response = await page.request.get("/api/hr-admin/leave-requests?page_size=1");
    expect([401, 403, 404]).toContain(response.status());
  });
});
