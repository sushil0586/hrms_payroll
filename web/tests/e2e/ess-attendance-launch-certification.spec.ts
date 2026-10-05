import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

function field(scope: Page | Locator, label: string | RegExp) {
  return scope.getByLabel(label, { exact: typeof label === "string" });
}

function submitCorrectionButton(scope: Page | Locator) {
  return scope.getByRole("button", { name: /Submit (correction|regularization)/ });
}

async function openRegularizationModal(page: Page) {
  await page.getByRole("button", { name: "Regularize attendance" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Regularize attendance" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function firstSelectableRecordValue(select: Locator) {
  return select.evaluate((element) => {
    const selectElement = element as HTMLSelectElement;
    const option = Array.from(selectElement.options).find((item) => item.value && !item.disabled);
    return option?.value ?? "";
  });
}

async function firstRecordValue(select: Locator) {
  return select.evaluate((element) => {
    const selectElement = element as HTMLSelectElement;
    const option = Array.from(selectElement.options).find((item) => item.value);
    return option?.value ?? "";
  });
}

async function unlockAttendanceRecordForCertification(page: Page, recordId: string) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const login = await page.request.post("/api/auth/login", {
    data: {
      identifier: hrAdmin.username,
      password: hrAdmin.password,
    },
  });
  const loginPayload = await login.json().catch(() => ({}));
  expect(
    login.ok(),
    `HR admin login failed while preparing attendance state: ${login.status()} ${JSON.stringify(loginPayload)}`,
  ).toBeTruthy();

  const response = await page.request.post("/api/hr-admin/attendance-records/bulk-actions", {
    data: {
      action: "unlock",
      record_ids: [recordId],
    },
  });
  const payload = await response.json().catch(() => ({}));
  expect(
    response.ok(),
    `Attendance record unlock failed: ${response.status()} ${JSON.stringify(payload)}`,
  ).toBeTruthy();

  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
}

test.describe("ESS Attendance launch certification", () => {
  test("attendance page keeps one responsibility with summary, history, detail drilldown, and modal actions", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/attendance", employee);
    await expectPageReady(page, "Attendance");

    for (const heading of ["Today", "Monthly summary", "Correction queue", "Regularizations"]) {
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Submit regularization" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Regularize attendance" }).first()).toBeVisible();
    await expect(page.locator(".pagination-bar").first()).toBeVisible();

    const firstRegularization = page.locator("button.leave-request-card").first();
    if (await firstRegularization.count()) {
      await firstRegularization.click();
      const detailDialog = page.getByRole("dialog", { name: "Regularization detail" });
      await expect(detailDialog).toBeVisible();
      await expect(detailDialog.getByText("Manager decision").first()).toBeVisible();
      await expect(detailDialog.getByRole("heading", { name: "Timeline" })).toBeVisible();
      await expect(detailDialog.getByRole("heading", { name: "Correction details" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(detailDialog).toBeHidden();
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
  });

  test("regularization modal blocks unclear or invalid correction submissions", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/attendance", employee);
    await expectPageReady(page, "Attendance");

    const dialog = await openRegularizationModal(page);
    await expect(dialog.getByText("Reason required.")).toBeVisible();
    await expect(submitCorrectionButton(dialog)).toBeDisabled();

    await field(dialog, "Reason").fill("Forgot to punch out after client meeting");
    await expect(dialog.getByText("Reason required.")).toHaveCount(0);
    await expect(submitCorrectionButton(dialog)).toBeEnabled();

    await field(dialog, "Requested check-in").fill("2026-10-02T18:00");
    await field(dialog, "Requested check-out").fill("2026-10-02T09:30");
    await expect(dialog.getByText("Check time order.")).toBeVisible();
    await expect(submitCorrectionButton(dialog)).toBeDisabled();

    await field(dialog, "Requested check-out").fill("2026-10-02T19:00");
    await expect(submitCorrectionButton(dialog)).toBeEnabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("regularization can submit through the browser when live mode is available", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/attendance", employee);
    await expectPageReady(page, "Attendance");

    let dialog = await openRegularizationModal(page);
    let recordSelect = field(dialog, /Attendance record/i);
    let recordId = await firstSelectableRecordValue(recordSelect);
    if (!recordId) {
      const lockedRecordId = await firstRecordValue(recordSelect);
      expect(lockedRecordId, "Employee should have at least one attendance record for ESS regularization.").toBeTruthy();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await unlockAttendanceRecordForCertification(page, lockedRecordId);
      await gotoAuthenticated(page, "/ess/attendance", employee);
      await expectPageReady(page, "Attendance");
      dialog = await openRegularizationModal(page);
      recordSelect = field(dialog, /Attendance record/i);
      recordId = await firstSelectableRecordValue(recordSelect);
    }
    expect(recordId, "Employee should have an unlocked attendance record after test setup.").toBeTruthy();

    await recordSelect.selectOption(recordId);
    await field(dialog, /Requested status/i).selectOption("present");
    await field(dialog, /Reason/i).fill("Playwright launch certification correction");

    await page.route("**/api/me/attendance-regularizations**", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        status: 201,
        body: JSON.stringify({
          id: "pw-attendance-regularization",
          status: "pending",
          workflow_reference: "pw-attendance-workflow",
        }),
      });
    });

    await submitCorrectionButton(dialog).click();
    await expect(dialog.getByText("Submitted.", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Attendance regularization submitted.")).toBeVisible();
  });
});
