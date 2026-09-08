import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

async function captureNotificationStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`production-notifications/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

async function expectVisibleText(page: Page, patterns: (string | RegExp)[]) {
  for (const pattern of patterns) {
    await expect(page.getByText(pattern).first()).toBeVisible();
  }
}

test.describe("Production notification reliability proof", () => {
  test("HR notification queue exposes retry-ready batch recovery and delivery triage", async ({ page }, testInfo) => {
    await page.goto("/hr-admin/notifications?retry_state=retry_ready");
    await expectPageReady(page, "Notification queue");

    await expectVisibleText(page, [
      "Queue size",
      "Failed on page",
      "Retry capped",
      "Document notifications",
      "Channels with failures",
      "Notifications",
      "Retry ready",
      "Select notifications",
      "Select page",
      "Retry policy",
      "Retry available now",
      "Quick review",
      "Full review",
    ]);
    await expect(page.locator(".queue-toolbar").getByRole("combobox", { name: /^Retry state/ })).toHaveValue("retry_ready");
    await expect(page.getByRole("heading", { name: "Payslip published" })).toBeVisible();
    await expect(page.getByText("Payroll Payslip Published").first()).toBeVisible();

    await page.getByLabel("Select page").check();
    await expect(page.getByRole("button", { name: /Retry selected \([1-9]\d*\)/ })).toBeEnabled();

    await expectNoHorizontalOverflow(page);
    await captureNotificationStep(page, testInfo, "01-hr-retry-ready-queue");
  });

  test("HR notification review shows provider evidence and retry controls", async ({ page }, testInfo) => {
    await page.goto("/hr-admin/notifications/n-5/review");
    await expectPageReady(page, "Notification review");

    await expectVisibleText(page, [
      "Payslip published",
      "Payroll Payslip Published",
      "payroll_payslip",
      "Riya Sharma",
      "Retry open",
      "Delivery log",
      "in_app_default",
      "payoutartifact-payslip-emp-0042-notification",
      "Provider response",
      "payroll.download.stream.local.v1",
      "payroll_publish",
    ]);
    await expect(page.getByRole("button", { name: "Retry delivery" })).toBeEnabled();
    await expect(page.getByRole("link", { name: "Back to queue" })).toHaveAttribute("href", "/hr-admin/notifications");

    await expectNoHorizontalOverflow(page);
    await captureNotificationStep(page, testInfo, "02-hr-notification-review-provider-evidence");
  });

  test("notification diagnostics routes operators into failed and retry queues", async ({ page }, testInfo) => {
    await page.goto("/hr-admin/notification-diagnostics");
    await expectPageReady(page, "Notification diagnostics");

    await expectVisibleText(page, [
      "Failed notifications",
      "Preview and test sends",
      "Queue focus",
      "Failed delivery",
      "Open failed queue",
      "Retry ready",
      "Retry capped",
      "Channel diagnostics",
      "Backend-backed delivery health",
      "Template diagnostics",
      "Event diagnostics",
      "Recent test notifications",
      "Payroll Payslip Published",
    ]);

    await page.getByRole("link", { name: "Retry ready" }).first().click();
    await expect(page).toHaveURL(/\/hr-admin\/notifications\?retry_state=retry_ready/);
    await expectPageReady(page, "Notification queue");
    await expect(page.locator(".queue-toolbar").getByRole("combobox", { name: /^Retry state/ })).toHaveValue("retry_ready");

    await expectNoHorizontalOverflow(page);
    await captureNotificationStep(page, testInfo, "03-diagnostics-retry-drilldown");
  });

  test("notification delivery control exposes channel health and configurable routing", async ({ page }, testInfo) => {
    await page.goto("/hr-admin/notification-delivery");
    await expectPageReady(page, "Notification delivery");

    await expectVisibleText(page, [
      "Configured channels",
      "Enabled channels",
      "Channels with failures",
      "Retry capped items",
      "Backend options",
      "Email readiness",
      "Operator note.",
      "process_notifications",
      "Channel health",
      "Observed providers",
      "Open queue",
      "Failed only",
      "Retry ready",
      "Core routing",
      "Provider routing",
      "Retry policy",
      "Advanced delivery configuration",
      "Provider config JSON",
      "Delivery policy JSON",
      "Save delivery settings",
    ]);
    await expect(page.getByRole("combobox", { name: "Backend" }).first()).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Delivery state" }).first()).toBeVisible();

    await expectNoHorizontalOverflow(page);
    await captureNotificationStep(page, testInfo, "04-delivery-channel-configuration");
  });

  test("ESS payroll notification opens payslip source and access evidence", async ({ page }, testInfo) => {
    await page.goto("/ess/notifications?subject_type=payroll_payslip&itemId=n-5");
    await expectPageReady(page, "Notifications");

    await expectVisibleText(page, [
      "Inbox filters",
      "Notification detail",
      "Payslip published",
      "Your August 2026 payslip is ready in employee self-service.",
      "Read at",
      "Open source",
      "Provider",
      "in_app_default",
    ]);
    await expect(page.getByRole("combobox", { name: /^Subject type/ })).toHaveValue("payroll_payslip");
    await expect(page.getByRole("link", { name: "Open source" })).toHaveAttribute("href", "/ess/payslips");

    await page.getByRole("link", { name: "Open source" }).click();
    await expect(page).toHaveURL("/ess/payslips");
    await expectPageReady(page, "Payslips");
    await expectVisibleText(page, [
      "Published payslips",
      "Download payslip",
      "Read receipt",
      "Latest notification",
      "Recent access events",
      "Notified",
      "Mark as read",
      "payroll.download.stream.local.v1",
      "payroll.retention.7y.v1",
    ]);

    await expectNoHorizontalOverflow(page);
    await captureNotificationStep(page, testInfo, "05-ess-notification-to-payslip-access");
  });
});
