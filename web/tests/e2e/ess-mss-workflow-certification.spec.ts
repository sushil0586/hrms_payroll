import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { expectDialogStable } from "../helpers/modal-stability";
import { employee, gotoAuthenticated, manager } from "../helpers/staging-auth";

function field(scope: Page | Locator, label: string | RegExp) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").first();
}

function isoDateFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function firstEnabledOptionValue(select: Locator) {
  return select.evaluate((element) => {
    const selectElement = element as HTMLSelectElement;
    const option = Array.from(selectElement.options).find((item) => item.value && !item.disabled);
    return option?.value ?? "";
  });
}

async function optionValueByName(select: Locator, pattern: RegExp) {
  return select.locator("option").evaluateAll((options, source) => {
    const regexp = new RegExp(source, "i");
    const option = options.find((item) => regexp.test(item.textContent ?? "") && !(item as HTMLOptionElement).disabled);
    return option ? (option as HTMLOptionElement).value : "";
  }, pattern.source);
}

async function openApplyLeave(page: Page) {
  await page.getByRole("button", { name: "Apply leave" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Apply leave" });
  await expect(dialog).toBeVisible();
  await expectDialogStable(page, "Apply leave");
  return dialog;
}

async function openRegularization(page: Page) {
  await page.getByRole("button", { name: "Regularize attendance" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Regularize attendance" });
  await expect(dialog).toBeVisible();
  await expectDialogStable(page, "Regularize attendance");
  return dialog;
}

async function exerciseManagerDecision(
  page: Page,
  options: {
    approveRoute: string;
    dialogName: "Leave approval review" | "Attendance approval review";
    emptyState: RegExp;
    queuePath: string;
  },
) {
  await gotoAuthenticated(page, options.queuePath, manager);
  await expectPageReady(page, "Manager approvals");

  const reviewButton = page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" }).first();
  if (!(await reviewButton.isVisible().catch(() => false))) {
    await expect(page.getByText(options.emptyState).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    return;
  }

  await reviewButton.click();
  const dialog = page.getByRole("dialog", { name: options.dialogName });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Decision note")).toBeVisible();
  await expectDialogStable(page, options.dialogName);

  const approveButton = dialog.getByRole("button", { name: /Approve request|Approve cancellation/ }).first();
  if (!(await approveButton.isEnabled().catch(() => false))) {
    await expect(dialog.getByText(/This request is already resolved|Read-only approval view/).first()).toBeVisible();
    await expectDialogStable(page, options.dialogName);
    return;
  }

  await dialog.getByLabel("Decision note").fill(`Playwright intercepted manager decision ${Date.now()}`);
  if (await dialog.getByText("Demo mode shows the action flow").isVisible().catch(() => false)) {
    await approveButton.click();
    await expect(dialog.getByText("Action saved.")).toBeVisible();
    await expect(dialog.getByText(/Demo approval captured|Demo rejection captured/).first()).toBeVisible();
    await expectDialogStable(page, options.dialogName);
    return;
  }

  let attempt = 0;
  await page.route(options.approveRoute, async (route) => {
    attempt += 1;
    if (attempt === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Manager decision service is temporarily unavailable." }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "approved", source: "playwright-intercepted" }),
    });
  });

  await approveButton.click();
  await expect(dialog.getByText("Action failed.")).toBeVisible();
  await expect(dialog.getByText("Manager decision service is temporarily unavailable.")).toBeVisible();
  await expectDialogStable(page, options.dialogName);

  await approveButton.click();
  await expect(dialog.getByText("Action saved.")).toBeVisible();
  await expect(dialog.getByText(/Request approved|Cancellation request approved/).first()).toBeVisible();
  await expectDialogStable(page, options.dialogName);
  await page.unroute(options.approveRoute);
}

test.describe("ESS to MSS workflow certification", () => {
  test("leave request workflow stays usable from employee submit to manager decision", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectPageReady(page, "Leave");

    const dialog = await openApplyLeave(page);
    const leaveType = field(dialog, "Leave type");
    const leaveValue = await optionValueByName(leaveType, /casual|earned|privilege|annual/) || await firstEnabledOptionValue(leaveType);
    if (!leaveValue) {
      await expect(dialog.getByText("No leave type is available.")).toBeVisible();
    } else {
      await leaveType.selectOption(leaveValue);
      await field(dialog, "Start date").fill(isoDateFromToday(48));
      await field(dialog, "End date").fill(isoDateFromToday(48));
      await field(dialog, /Reason for leave/i).fill(`Playwright ESS to MSS leave flow ${Date.now()}`);

      if (await dialog.getByText("Evidence required.").isVisible().catch(() => false)) {
        await field(dialog, "Evidence reference").fill("Playwright policy evidence reference");
      }

      let submitAttempt = 0;
      await page.route("**/api/me/leave-requests", async (route) => {
        submitAttempt += 1;
        if (submitAttempt === 1) {
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ detail: "Leave request service is temporarily unavailable." }),
          });
          return;
        }
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: "playwright-leave-request", status: "pending" }),
        });
      });

      const submit = dialog.getByRole("button", { name: "Submit leave" });
      await expect(submit).toBeEnabled();
      await submit.click();
      await expect(dialog.getByText("Submission failed.")).toBeVisible();
      await expect(dialog.getByText("Leave request service is temporarily unavailable.")).toBeVisible();
      await expectDialogStable(page, "Apply leave");

      await submit.click();
      await expect(dialog).toBeHidden();
      await expect(page.getByRole("button", { name: "Apply leave" }).first()).toBeVisible();
      await page.unroute("**/api/me/leave-requests");
    }

    await exerciseManagerDecision(page, {
      approveRoute: "**/api/manager/leave-requests/*/approve",
      dialogName: "Leave approval review",
      emptyState: /No pending leave approvals|No leave approval selected/,
      queuePath: "/mss/approvals?queue=leave",
    });
  });

  test("attendance regularization workflow stays usable from employee submit to manager decision", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/attendance", employee);
    await expectPageReady(page, "Attendance");

    const dialog = await openRegularization(page);
    const recordSelect = field(dialog, /Attendance record/i);
    const recordValue = await firstEnabledOptionValue(recordSelect);
    if (!recordValue) {
      await expect(dialog.getByText(/No attendance day is available|Record locked/).first()).toBeVisible();
    } else {
      await recordSelect.selectOption(recordValue);
      await field(dialog, /Requested status/i).selectOption("present");
      await field(dialog, /Reason/i).fill(`Playwright ESS to MSS attendance flow ${Date.now()}`);

      let submitAttempt = 0;
      await page.route("**/api/me/attendance-regularizations", async (route) => {
        submitAttempt += 1;
        if (submitAttempt === 1) {
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({ detail: "Attendance regularization service is temporarily unavailable." }),
          });
          return;
        }
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: "playwright-attendance-regularization", status: "pending" }),
        });
      });

      const submit = dialog.getByRole("button", { name: /Submit correction|Submit regularization/ });
      await expect(submit).toBeEnabled();
      await submit.click();
      await expect(dialog.getByText("Submission failed.")).toBeVisible();
      await expect(dialog.getByText("Attendance regularization service is temporarily unavailable.")).toBeVisible();
      await expectDialogStable(page, "Regularize attendance");

      await submit.click();
      await expect(dialog).toBeHidden();
      await expect(page.getByRole("button", { name: "Regularize attendance" }).first()).toBeVisible();
      await page.unroute("**/api/me/attendance-regularizations");
    }

    await exerciseManagerDecision(page, {
      approveRoute: "**/api/manager/attendance-regularizations/*/approve",
      dialogName: "Attendance approval review",
      emptyState: /No pending regularizations|No regularization selected/,
      queuePath: "/mss/approvals?queue=attendance",
    });
  });

  test("cross-workspace navigation, browser history, and manager API boundaries stay closed for employees", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "My workspace");

    await page.getByRole("link", { name: "Apply leave" }).first().click();
    await expectPageReady(page, "Leave");
    await page.goBack();
    await expectPageReady(page, "My workspace");
    await page.goForward();
    await expectPageReady(page, "Leave");

    await page.goto("/mss", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    if (await page.getByRole("heading", { name: "Manager dashboard" }).isVisible().catch(() => false)) {
      test.skip(true, `${employee.username} has MSS access in this tenant and cannot be used as a non-manager negative control.`);
    }
    await expect(page.getByRole("heading", { name: "Manager dashboard" })).toHaveCount(0);

    for (const path of [
      "/api/manager/leave-requests/00000000-0000-4000-8000-000000000000/approve",
      "/api/manager/attendance-regularizations/00000000-0000-4000-8000-000000000000/approve",
    ]) {
      const response = await page.request.post(path, { data: { comment: "Employee should not approve manager workflow." } });
      expect([401, 403, 404, 405], `${path} should fail closed for employee persona`).toContain(response.status());
      const body = JSON.stringify(await response.json().catch(() => ({}))).toLowerCase();
      for (const forbidden of ["password", "secret", "token", "salary_snapshot"]) {
        expect(body, `denial should not leak ${forbidden}`).not.toContain(forbidden);
      }
    }
  });
});
