import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type NotificationOptions = {
  memberships: Array<{ id: string; name: string }>;
  channel_configurations: Array<{
    id: string;
    channel: string;
    is_enabled: boolean;
    backend_key: string;
    sender_identifier: string;
    sender_address: string;
    provider_config: Record<string, unknown>;
    delivery_policy: Record<string, unknown>;
  }>;
};

type HrNotification = {
  id: string;
  status: string;
  channel: string;
  priority: string;
  subject_type: string;
  attempt_count: number;
  max_attempts: number;
  can_retry: boolean;
  retry_limit_reached: boolean;
  delivery_logs: Array<{ provider_name: string; status: string; error_message: string }>;
};

async function captureNotificationStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`phase6e-notification-provider-retry/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

async function getOptions(page: Page) {
  const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
  const cookies = await page.context().cookies();
  const token = cookies.find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  const response = await page.request.get(`${apiBase}/hr-admin/notification-options/`, {
    headers: { Authorization: `Token ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as NotificationOptions;
}

async function createDisposableNotification(page: Page, suffix: string) {
  const options = await getOptions(page);
  const membership = options.memberships[0];
  expect(membership).toBeTruthy();
  const response = await page.request.post("/api/hr-admin/notification-templates/test-send", {
    data: {
      channel: "in_app",
      subject_template: "",
      title_template: `Phase 6E ${suffix} alert for {employee_name}`,
      body_template: `Phase 6E ${suffix} body for {employee_name}.`,
      metadata_template: { action_path: "/hr-admin/notifications", source: "phase6e" },
      sample_payload: { employee_name: "Asha", status: "pending" },
      membership_id: membership.id,
      process_now: false,
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const notification = payload.test_notification as HrNotification;
  expect(notification.id).toBeTruthy();
  return notification;
}

async function markNotificationFailed(page: Page, notificationId: string, priority = "high") {
  const response = await page.request.patch(`/api/hr-admin/notifications/${notificationId}`, {
    data: {
      status: "failed",
      priority,
      read_at: null,
      title: `Phase 6E failed ${notificationId.slice(0, 8)}`,
      subject: `Phase 6E retry subject ${notificationId.slice(0, 8)}`,
      body: "Disposable failed notification used for browser retry certification.",
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as HrNotification;
}

async function getNotification(page: Page, notificationId: string) {
  const response = await page.request.get(`/api/hr-admin/notifications/${notificationId}`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as HrNotification;
}

async function patchChannelConfiguration(page: Page, channel: string, deliveryPolicy: Record<string, unknown>) {
  const options = await getOptions(page);
  const config = options.channel_configurations.find((item) => item.channel === channel);
  expect(config).toBeTruthy();
  const response = await page.request.patch(`/api/hr-admin/notification-channel-configs/${config!.id}`, {
    data: {
      channel: config!.channel,
      is_enabled: config!.is_enabled,
      backend_key: config!.backend_key,
      sender_identifier: config!.sender_identifier,
      sender_address: config!.sender_address,
      provider_config: config!.provider_config,
      delivery_policy: deliveryPolicy,
    },
  });
  expect(response.ok()).toBeTruthy();
  return config!;
}

test.describe("Phase 6E notification provider failure and retry certification", () => {
  test("certifies queue filters, full review retry, bulk retry, and capped retry behavior", async ({ page }, testInfo) => {
    await gotoAuthenticated(page, "/hr-admin/notifications", hrAdmin);
    await expectPageReady(page, "Notification queue");

    const singleRetry = await markNotificationFailed(page, (await createDisposableNotification(page, "single")).id);
    const bulkOne = await markNotificationFailed(page, (await createDisposableNotification(page, "bulk-one")).id, "normal");
    const bulkTwo = await markNotificationFailed(page, (await createDisposableNotification(page, "bulk-two")).id, "normal");

    await page.goto(`/hr-admin/notifications?retry_state=retry_ready&q=${singleRetry.id.slice(0, 8)}`);
    await expectPageReady(page, "Notification queue");
    await expect(page.locator(".queue-toolbar").getByRole("combobox", { name: /^Retry state/ })).toHaveValue("retry_ready");
    await expect(page.getByRole("textbox", { name: "Search" })).toHaveValue(singleRetry.id.slice(0, 8));
    await expect(page.getByText("Queue size").first()).toBeVisible();
    await expect(page.getByText("Failed on page").first()).toBeVisible();
    await expect(page.getByText("Retry ready").first()).toBeVisible();
    await expect(page.getByText("Select notifications").first()).toBeVisible();
    await expect(page.getByText("Quick review").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Full review" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Retry selected/ })).toBeDisabled();

    const statusField = page.locator(".inline-review-panel").first().getByRole("combobox", { name: "Status" });
    const priorityField = page.locator(".inline-review-panel").first().getByRole("combobox", { name: "Priority" });
    const readStateField = page.locator(".inline-review-panel").first().getByRole("combobox", { name: "Read state" });
    await expect(statusField).toHaveValue("failed");
    await expect(priorityField).toHaveValue("high");
    await expect(readStateField).toBeVisible();
    await readStateField.selectOption("mark_read");
    await page.locator(".inline-review-panel").first().getByRole("button", { name: "Save review" }).click();
    await expect(page.getByText("Notification review updated.").first()).toBeVisible();
    await captureNotificationStep(page, testInfo, "01-queue-filter-inline-review");

    await page.goto(`/hr-admin/notifications/${singleRetry.id}/review`);
    await expectPageReady(page, "Notification review");
    await expect(page.getByText("Delivery attention needed.").first()).toBeVisible();
    await expect(page.getByText("Retry open").first()).toBeVisible();
    await expect(page.getByText("Delivery log").first()).toBeVisible();
    await expect(page.getByText("Payload").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry delivery" })).toBeEnabled();
    await page.getByRole("button", { name: "Retry delivery" }).click();
    await expect(page.getByText("Notification delivery retried.")).toBeVisible();
    await expect.poll(async () => (await getNotification(page, singleRetry.id)).status).toBe("delivered");
    const retried = await getNotification(page, singleRetry.id);
    expect(retried.delivery_logs.some((log) => log.provider_name === "in_app_default" && log.status === "delivered")).toBeTruthy();
    await captureNotificationStep(page, testInfo, "02-full-review-single-retry");

    await page.goto("/hr-admin/notifications?retry_state=retry_ready&q=Phase%206E%20failed&page_size=100");
    await expectPageReady(page, "Notification queue");
    const bulkRows = page.locator(".record-card").filter({ hasText: /Phase 6E failed/ });
    await expect(bulkRows.first()).toBeVisible();
    await page.getByLabel("Select page").check();
    await expect(page.getByRole("button", { name: /Retry selected/ })).toBeEnabled();
    await page.getByRole("button", { name: /Retry selected/ }).click();
    await expect.poll(async () => (await getNotification(page, bulkOne.id)).status).toBe("delivered");
    await expect.poll(async () => (await getNotification(page, bulkTwo.id)).status).toBe("delivered");
    await captureNotificationStep(page, testInfo, "03-bulk-retry-delivered");

    const originalInAppConfig = await patchChannelConfiguration(page, "in_app", { max_attempts: 1, retry_backoff_minutes: 0 });
    try {
      const capped = await markNotificationFailed(page, (await createDisposableNotification(page, "capped")).id);
      await page.request.post(`/api/hr-admin/notifications/${capped.id}/retry`, { data: { process_now: true } });
      await page.request.patch(`/api/hr-admin/notifications/${capped.id}`, { data: { status: "failed" } });
      const cappedRetry = await page.request.post(`/api/hr-admin/notifications/${capped.id}/retry`, { data: { process_now: true } });
      expect(cappedRetry.status()).toBe(400);
      expect((await cappedRetry.json()).detail).toMatch(/retry limit/i);

      await page.goto(`/hr-admin/notifications/${capped.id}/review`);
      await expectPageReady(page, "Notification review");
      await expect(page.getByText("Retry capped").first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Retry limit reached" })).toBeDisabled();
      await expect(page.getByText("Retry capped.").first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await captureNotificationStep(page, testInfo, "04-retry-limit-capped");
    } finally {
      await patchChannelConfiguration(page, "in_app", originalInAppConfig.delivery_policy);
    }
  });
});
