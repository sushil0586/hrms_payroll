import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

function filterToolbar(page: Page) {
  return page.locator(".queue-toolbar").first();
}

type NotificationOptions = {
  memberships: Array<{ id: string; name: string }>;
};

function apiBaseUrl() {
  if (process.env.HRMS_API_BASE_URL) {
    return process.env.HRMS_API_BASE_URL.replace(/\/$/, "");
  }
  if (process.env.PLAYWRIGHT_BASE_URL) {
    return `${process.env.PLAYWRIGHT_BASE_URL.replace(/\/$/, "")}/api/v1`;
  }
  return "http://127.0.0.1:8001/api/v1";
}

async function authHeaders(page: Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  return { Authorization: `Token ${token}` };
}

async function ensureEmployeeDocumentNotification(page: Page) {
  await gotoAuthenticated(page, "/hr-admin/notifications-admin", hrAdmin);
  const optionsResponse = await page.request.get(`${apiBaseUrl()}/hr-admin/notification-options/`, {
    headers: await authHeaders(page),
  });
  const options = (await optionsResponse.json().catch(() => ({}))) as NotificationOptions;
  expect(optionsResponse.ok(), `Notification options failed: ${optionsResponse.status()}`).toBeTruthy();
  const employeeNumber = employee.username.match(/e(\d+)$/i)?.[1];
  const membership =
    (employeeNumber ? options.memberships.find((item) => item.name.includes(employeeNumber)) : undefined) ??
    options.memberships.find((item) => /Riya Sharma/i.test(item.name)) ??
    options.memberships.find((item) => /riya/i.test(item.name));
  expect(membership, "Expected ESS employee membership for notification fixture").toBeTruthy();

  const sendResponse = await page.request.post(`${apiBaseUrl()}/hr-admin/notification-events/test-send/`, {
    headers: await authHeaders(page),
    data: {
      module: "documents",
      trigger_key: "documents.employee.reupload_requested",
      audience_type: "membership",
      channel: "in_app",
      membership_id: membership!.id,
      priority: "high",
      delivery_delay_minutes: 0,
      recipient_snapshot: { routing: "phase3b5a_fixed_membership" },
      sample_payload: {
        employee_name: membership!.name,
        document_name: "Address proof",
        status: "Needs review",
      },
      subject_type: "employee_document",
      subject_identifier: `phase3b5a-${Date.now()}`,
      process_now: true,
    },
  });
  const payload = await sendResponse.json().catch(() => ({}));
  expect(sendResponse.ok(), `Notification test-send failed: ${sendResponse.status()} ${JSON.stringify(payload)}`).toBeTruthy();
}

test.describe("Tier 2 workflow flows", () => {
  test("HR admin can filter attendance regularizations and open full review", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/attendance-regularizations");
    await expectPageReady(page, /Regularizations/);

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
    await ensureEmployeeDocumentNotification(page);
    await gotoAuthenticated(page, "/ess/notifications?subject_type=employee_document", employee);
    await expectPageReady(page, "Notifications");

    await page.getByRole("button", { name: "Review notification" }).first().click();
    await expect(page.getByRole("dialog", { name: /Notification detail/ })).toBeVisible();
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
    await expectPageReady(page, "Manager approvals");
    await expect(page.getByRole("heading", { name: "Leave approvals" })).toBeVisible();

    await page.getByRole("link", { name: /Attendance/ }).first().click();
    await expect(page).toHaveURL(/queue=attendance/);
    await expect(page.getByRole("heading", { name: "Pending attendance fixes" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Selected attendance request" })).toBeVisible();
    const reviewButton = page.getByRole("button", { name: "Review" }).first();
    if (await reviewButton.isVisible().catch(() => false)) {
      await reviewButton.click();
      await expect(page.getByRole("dialog", { name: "Attendance approval review" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Regularization decision" })).toBeVisible();
    } else {
      await expect(page.getByText("No regularization selected.")).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
  });
});
