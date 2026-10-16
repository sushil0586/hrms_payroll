import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady, suppressBrowserTestNoise } from "../helpers/assertions";
import { getDialog, mssAttendanceReviewDialogName, mssLeaveReviewDialogName } from "../helpers/modal-stability";
import { gotoAuthenticated, manager } from "../helpers/staging-auth";

async function gotoMssDemo(page: Page, path: string) {
  if (process.env.HRMS_API_BASE_URL) {
    await gotoAuthenticated(page, path, manager);
    return;
  }

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const origin = new URL(page.url()).origin;
  await page.context().addCookies([
    {
      name: "hrms_access_token",
      value: "playwright-demo-token",
      url: origin,
    },
  ]);
  await page.goto(path, { waitUntil: "networkidle" });
}

async function openFocusedReview(page: Page, dialogName: string | RegExp) {
  const reviewButton = page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" }).first();
  await expect(reviewButton).toBeVisible();
  await reviewButton.click();
  const dialog = getDialog(page, dialogName);
  await expect(dialog).toBeVisible();
  return dialog;
}

async function expectRejectBlocksBeforeApi(dialog: Locator, apiCalls: () => number) {
  await dialog.getByRole("button", { name: /Reject request|Reject cancellation/ }).click();
  await expect(dialog.getByRole("alert").filter({ hasText: "Enter a decision note before rejecting this request." })).toBeVisible();
  await expect(dialog.getByLabel("Decision note")).toHaveAttribute("aria-invalid", "true");
  expect(apiCalls()).toBe(0);
}

async function expectApproveDecisionSubmitted(apiCalls: () => number) {
  await expect.poll(apiCalls).toBe(1);
}

test.describe("MSS frontend validation", () => {
  test("leave rejection requires a decision note before calling the API", async ({ page }) => {
    let leaveDecisionCalls = 0;
    await page.route("**/api/manager/leave-requests/*/reject", async (route) => {
      leaveDecisionCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });
    let leaveApproveCalls = 0;
    await page.route("**/api/manager/leave-requests/*/approve", async (route) => {
      leaveApproveCalls += 1;
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await gotoMssDemo(page, "/mss/approvals?queue=leave");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Manager approvals");

    const dialog = await openFocusedReview(page, mssLeaveReviewDialogName);
    await expectRejectBlocksBeforeApi(dialog, () => leaveDecisionCalls);

    await dialog.getByRole("button", { name: /Approve request|Approve cancellation/ }).click();
    await expectApproveDecisionSubmitted(() => leaveApproveCalls);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("attendance rejection requires a decision note before calling the API", async ({ page }) => {
    let attendanceDecisionCalls = 0;
    await page.route("**/api/manager/attendance-regularizations/*/reject", async (route) => {
      attendanceDecisionCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });
    let attendanceApproveCalls = 0;
    await page.route("**/api/manager/attendance-regularizations/*/approve", async (route) => {
      attendanceApproveCalls += 1;
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await gotoMssDemo(page, "/mss/approvals?queue=attendance");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Manager approvals");

    const dialog = await openFocusedReview(page, mssAttendanceReviewDialogName);
    await dialog.getByRole("button", { name: "Reject request" }).click();
    await expect(dialog.getByRole("alert").filter({ hasText: "Enter a decision note before rejecting this request." })).toBeVisible();
    await expect(dialog.getByLabel("Decision note")).toHaveAttribute("aria-invalid", "true");
    expect(attendanceDecisionCalls).toBe(0);

    await dialog.getByRole("button", { name: "Approve request" }).click();
    await expectApproveDecisionSubmitted(() => attendanceApproveCalls);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });
});
