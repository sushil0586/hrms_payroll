import { expect, test, type Locator } from "@playwright/test";

import { mssLeaveReviewDialogName } from "../helpers/modal-stability";
import { employee, gotoAuthenticated, hrAdmin, manager, requestWithBrowserSession, tenantAdmin } from "../helpers/staging-auth";

function formField(scope: Locator, label: string) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").first();
}

test("HR admin previews and queues a governed leave-year close", async ({ page }) => {
  await gotoAuthenticated(page, "/hr-admin/leave-year", hrAdmin);
  await expect(page.getByRole("heading", { name: "Leave-year control" })).toBeVisible();
  await expect(page.getByText("FY-2026", { exact: true })).toBeVisible();
  await expect(page.getByText("No historical balance or ledger transaction is changed automatically.")).toBeVisible();

  await page.getByLabel("Source period").selectOption({ label: "FY-2026 - Annual Standard" });
  await page.getByLabel("Target period").selectOption({ label: "FY-2027 - Annual Standard" });
  await page.getByLabel("Carry-forward cap per employee").fill("10.00");
  await page.getByRole("button", { name: "Preview impact" }).click();
  await expect(page.getByText("1 balances reviewed.")).toBeVisible();
  await expect(page.getByText(/10.00 carried, 8.00 forfeited/)).toBeVisible();

  const confirmation = page.getByLabel("Type CLOSE FY-2026");
  await confirmation.fill("CLOSE FY-2026");
  const commit = page.getByRole("button", { name: "Confirm year close" });
  await commit.dblclick();
  await expect(page.getByRole("status").getByText(/Leave-year close accepted/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "queued" }).first()).toBeVisible();

  const runs = await requestWithBrowserSession(page, "/api/hr-admin/leave-year/close-runs/");
  expect(runs.status).toBe(200);
  const payload = JSON.parse(runs.body) as Array<{ idempotency_key: string }>;
  expect(payload.filter((item) => item.idempotency_key.includes("leave-close:")).length).toBe(1);

  await page.reload();
  await expect(page.getByRole("cell", { name: "queued" }).first()).toBeVisible();
});

test("leave-year workspace remains compact on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAuthenticated(page, "/hr-admin/leave-year", hrAdmin);
  await expect(page.getByRole("heading", { name: "Governed leave-year periods" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview impact" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
});

test("tenant admin sees the same tenant-scoped governed periods", async ({ page }) => {
  await gotoAuthenticated(page, "/tenant-admin/leave-year", tenantAdmin);
  await expect(page.getByRole("heading", { name: "Leave-year control" })).toBeVisible();
  await expect(page.getByText("FY-2026", { exact: true })).toBeVisible();
  await expect(page.getByText("No implicit rule is applied for these cases.")).toBeVisible();
});

test("manager approves the synthetic employee request and ESS observes the persisted result", async ({ page }) => {
  const requestId = process.env.DB6_LEAVE_REQUEST_ID;
  expect(requestId, "DB6_LEAVE_REQUEST_ID must identify the disposable employee request.").toBeTruthy();

  await gotoAuthenticated(page, `/mss/approvals?queue=leave&leaveId=${requestId}`, manager);
  await page.getByRole("button", { name: "Review" }).last().click();
  const dialog = page.getByRole("dialog", { name: mssLeaveReviewDialogName });
  await expect(dialog).toBeVisible();
  await formField(dialog, "Decision note").fill("DB-6.4 browser approval evidence.");
  await dialog.getByRole("button", { name: "Approve request" }).click();
  await expect(page.getByText("Request approved.").first()).toBeVisible();

  await gotoAuthenticated(page, `/ess/leave?status=approved&requestId=${requestId}`, employee);
  await expect(page.getByText("approved", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("DB-6.4 browser approval evidence.").first()).toBeVisible();
});

test("employee cancels an approved request through the governed browser action", async ({ page }) => {
  const requestId = process.env.DB6_APPROVED_LEAVE_REQUEST_ID;
  expect(requestId, "DB6_APPROVED_LEAVE_REQUEST_ID must identify the approved disposable request.").toBeTruthy();
  await gotoAuthenticated(page, `/ess/leave?status=approved&requestId=${requestId}`, employee);
  const dialog = page.getByRole("dialog").filter({ has: page.getByText("Lifecycle actions") });
  await expect(dialog).toBeVisible();
  await formField(dialog, "Reason").fill("DB-6.4 cancellation and restoration evidence.");
  const cancel = dialog.getByRole("button", { name: /Cancel approved leave|Submit cancellation request/ });
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(`/api/me/leave-requests/${requestId}/cancel`) && item.request().method() === "POST" && item.status() !== 308),
    cancel.click(),
  ]);
  expect(response.ok(), `Cancellation returned HTTP ${response.status()}.`).toBeTruthy();
  await page.goto(`/ess/leave?status=cancelled&requestId=${requestId}`);
  await expect(page.getByText("cancelled", { exact: true }).first()).toBeVisible();
});
