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

    const requestTable = page.getByRole("table").first();
    if (await requestTable.isVisible().catch(() => false)) {
      await expect(requestTable).toContainText(/Pending approval from|Approved|Rejected|Cancelled|Withdrawn/i);
      await expect(requestTable).toContainText(/Collision clear|collision/i);
      await page.getByRole("button", { name: "Inspect" }).first().click();
      await expect(page.getByRole("heading", { name: "Leave request detail" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Open balance" }).first()).toHaveAttribute("href", /\/hr-admin\/leave-balances\?q=/);
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

  test("leave request HR override opens as a standard modal with inline validation", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/leave-requests?status=pending&page_size=10", hrAdmin);
    await expectPageReady(page, "Leave Requests");

    const requestTable = page.getByRole("table").first();
    test.skip(!(await requestTable.isVisible().catch(() => false)), "No leave requests available for override modal validation.");

    const inspectButton = page.getByRole("button", { name: "Inspect" }).first();
    await inspectButton.click();
    const reviewLink = page.getByRole("link", { name: "Review" }).first();
    test.skip(!(await reviewLink.isVisible().catch(() => false)), "No pending leave request with HR override action is available.");

    await reviewLink.click();
    await expect(page).toHaveURL(/overrideLeave=/);
    const dialog = page.getByRole("dialog", { name: "Review leave request" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("HR override approval.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Reject" })).toBeVisible();

    await dialog.getByLabel(/Decision note/i).fill("");
    await dialog.getByRole("button", { name: "Reject" }).click();
    await expect(dialog.getByRole("alert")).toContainText("A decision note is required when rejecting a leave request.");

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page).not.toHaveURL(/overrideLeave=/);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("employee role cannot access HR Admin leave request APIs", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/leave", employee);
    const response = await page.request.get("/api/hr-admin/leave-requests?page_size=1");
    expect([401, 403, 404, 500]).toContain(response.status());
  });
});
