import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

function field(scope: Page | Locator, label: string | RegExp) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").first();
}

async function firstVisibleCard(page: Page, selector: string) {
  const card = page.locator(selector).first();
  await expect(card).toBeVisible();
  return card;
}

async function expectActionFailureThenSuccess(
  page: Page,
  routePattern: string,
  action: () => Promise<void>,
  failureText: string,
  successText: string,
  responseBody: Record<string, unknown> = { status: "ok", source: "playwright-intercepted" },
) {
  let attempt = 0;
  await page.route(routePattern, async (route) => {
    attempt += 1;
    if (attempt === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: failureText }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(responseBody),
    });
  });

  await action();
  await expect(page.getByText(failureText).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await action();
  await expect(page.getByText(successText).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.unroute(routePattern);
}

async function openFirstNotificationQuickReview(page: Page) {
  const card = await firstVisibleCard(page, "article.notification-queue-card");
  const disclosure = card.locator("details.notification-details-disclosure").first();
  if (!(await disclosure.getAttribute("open"))) {
    await disclosure.locator("summary").click();
  }
  await expect(card.getByRole("heading", { name: "Quick review" })).toBeVisible();
  return card;
}

test.describe("HR Admin documents and notifications workflow certification", () => {
  test("document queue supports filters, inline review failure/retry, reminder failure/retry, and mobile layout", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/employee-documents", hrAdmin);
    await expectPageReady(page, /Employee document review/);

    for (const label of ["Search", "Verification status", "Record status", "Category", "Expiry focus", "Rows per page"]) {
      await expect(field(page, label)).toBeVisible();
    }
    await field(page, "Search").fill("no-document-should-match-this");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/employee-documents\?.*q=no-document-should-match-this/);
    await expect(page.getByText("No employee documents match the current filters.")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expectPageReady(page, /Employee document review/);

    const documentCard = page.locator("article.document-record-card").first();
    if (await documentCard.isVisible().catch(() => false)) {
      await field(documentCard, "Review note").fill(`Playwright document review ${Date.now()}`);
      await expectActionFailureThenSuccess(
        page,
        "**/api/hr-admin/employee-documents/*",
        async () => {
          await documentCard.getByRole("button", { name: "Save review" }).click();
        },
        "Document review service is temporarily unavailable.",
        "Document review updated.",
      );

      const selectPage = page.getByRole("button", { name: /Select page|Clear selection/ }).first();
      if (await selectPage.isEnabled().catch(() => false)) {
        await selectPage.click();
        const reminderButton = page.getByRole("button", { name: /Send reminder/ }).first();
        await expectActionFailureThenSuccess(
          page,
          "**/api/hr-admin/employee-documents/reminders",
          async () => {
            await reminderButton.click();
          },
          "Reminder service is temporarily unavailable.",
          "Reminder action complete.",
          { reminder_count: 1, skipped_count: 0 },
        );
      }
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/hr-admin/employee-documents", hrAdmin);
    await expectPageReady(page, /Employee document review/);
    await expectNoHorizontalOverflow(page);
  });

  test("document full review page handles save failure clearly and remains usable", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/employee-documents", hrAdmin);
    await expectPageReady(page, /Employee document review/);

    const reviewLink = page.getByRole("link", { name: "Review", exact: true }).first();
    test.skip(!(await reviewLink.isVisible().catch(() => false)), "No employee document review row is available in this tenant.");
    await reviewLink.click();
    await expectPageReady(page, "Review employee document");

    await expect(page.getByRole("heading", { name: "Document review and verification" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Review details" })).toBeVisible();
    await field(page, /Rejection reason or review note/i).fill(`Playwright full review ${Date.now()}`);

    await page.route("**/api/hr-admin/employee-documents/*", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Full document review save is temporarily unavailable." }),
      });
    });
    await page.getByRole("button", { name: "Save review" }).click();
    await expect(page.getByText("Save failed.")).toBeVisible();
    await expect(page.getByText("Full document review save is temporarily unavailable.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.unroute("**/api/hr-admin/employee-documents/*");
  });

  test("notification queue supports filters, quick review failure/retry, bulk retry, and mobile layout", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/notifications", hrAdmin);
    await expectPageReady(page, "Notification queue");

    for (const label of ["Search", "Status", "Channel", "Priority", "Audience type", "Retry state", "Module", "Subject type", "Rows per page"]) {
      await expect(field(page, label)).toBeVisible();
    }
    await field(page, "Search").fill("no-notification-should-match-this");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/notifications\?.*q=no-notification-should-match-this/);
    await expect(page.getByText("No notifications match the current filters.")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expectPageReady(page, "Notification queue");

    if (await page.locator("article.notification-queue-card").first().isVisible().catch(() => false)) {
      const card = await openFirstNotificationQuickReview(page);
      await field(card, "Read state").selectOption("mark_read");
      await expectActionFailureThenSuccess(
        page,
        "**/api/hr-admin/notifications/*",
        async () => {
          await card.getByRole("button", { name: "Save review" }).click();
        },
        "Notification review service is temporarily unavailable.",
        "Notification review updated.",
      );
    }

    await gotoAuthenticated(page, "/hr-admin/notifications?retry_state=retry_ready", hrAdmin);
    await expectPageReady(page, "Notification queue");
    const selectRetryPage = page.locator("article").filter({ hasText: "Select notifications" }).locator("input[type='checkbox']").first();
    if (await selectRetryPage.isEnabled().catch(() => false)) {
      await selectRetryPage.check();
      await expectActionFailureThenSuccess(
        page,
        "**/api/hr-admin/notifications/bulk-retry",
        async () => {
          await page.getByRole("button", { name: /Retry selected/ }).click();
        },
        "Bulk retry service is temporarily unavailable.",
        "0 selected",
        { retry_count: 1, skipped_count: 0 },
      );
    } else {
      await expect(page.getByText(/No notifications match|retry ready|Retry selected/).first()).toBeVisible();
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/hr-admin/notifications", hrAdmin);
    await expectPageReady(page, "Notification queue");
    await expectNoHorizontalOverflow(page);
  });

  test("notification review and retry action show recoverable failure states", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/notifications", hrAdmin);
    await expectPageReady(page, "Notification queue");

    const reviewLink = page.getByRole("link", { name: "Review", exact: true }).first();
    test.skip(!(await reviewLink.isVisible().catch(() => false)), "No notification review row is available in this tenant.");
    await reviewLink.click();
    await expectPageReady(page, "Notification review");

    await expect(page.getByText("Payload", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Delivery log" })).toBeVisible();

    const retryButton = page.getByRole("button", { name: /Retry delivery|Retry limit reached/ }).first();
    if (await retryButton.isEnabled().catch(() => false)) {
      await expectActionFailureThenSuccess(
        page,
        "**/api/hr-admin/notifications/*/retry",
        async () => {
          await retryButton.click();
        },
        "Notification retry service is temporarily unavailable.",
        "Notification delivery retried.",
      );
    } else {
      await expect(page.getByText(/Retry capped|Retry limit has been reached/).first()).toBeVisible();
    }
  });

  test("employee persona cannot operate HR admin document or notification APIs", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "My workspace");

    for (const [method, path, data] of [
      ["patch", "/api/hr-admin/employee-documents/00000000-0000-4000-8000-000000000000", { verification_status: "verified" }],
      ["post", "/api/hr-admin/employee-documents/reminders", { document_ids: ["00000000-0000-4000-8000-000000000000"] }],
      ["patch", "/api/hr-admin/notifications/00000000-0000-4000-8000-000000000000", { status: "read" }],
      ["post", "/api/hr-admin/notifications/00000000-0000-4000-8000-000000000000/retry", { process_now: true }],
      ["post", "/api/hr-admin/notifications/bulk-retry", { notification_ids: ["00000000-0000-4000-8000-000000000000"] }],
    ] as Array<["patch" | "post", string, Record<string, unknown>]>) {
      const response = method === "patch"
        ? await page.request.patch(path, { data })
        : await page.request.post(path, { data });
      expect([401, 403, 404, 405], `${method.toUpperCase()} ${path} should fail closed for employee`).toContain(response.status());
      const body = JSON.stringify(await response.json().catch(() => ({}))).toLowerCase();
      for (const forbidden of ["password", "secret", "token", "salary_snapshot"]) {
        expect(body, `denial should not leak ${forbidden}`).not.toContain(forbidden);
      }
    }
  });
});
