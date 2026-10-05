import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated } from "../helpers/staging-auth";

function field(scope: Page | Locator, label: string, index = 0) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").nth(index);
}

function isoDateFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function optionValueByName(select: Locator, pattern: RegExp) {
  return select.locator("option").evaluateAll((options, source) => {
    const regexp = new RegExp(source, "i");
    const option = options.find((item) => regexp.test(item.textContent ?? ""));
    return option ? (option as HTMLOptionElement).value : "";
  }, pattern.source);
}

async function openApplyLeave(page: Page) {
  await page.getByRole("button", { name: "Apply leave" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Apply leave" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("ESS Leave launch certification", () => {
  test("leave page keeps one responsibility with balances, history, filters, detail drilldown, and modal actions", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectPageReady(page, "Leave");

    await expect(page.getByRole("heading", { name: "Balances" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leave requests" })).toBeVisible();
    await expect(page.getByText("Leave request summary")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Submit leave request" })).toHaveCount(0);

    for (const label of ["Upcoming leave", "Waiting for review", "Recent decision", "Evidence files"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }

    await expect(page.getByLabel("Search leave history")).toBeVisible();
    await expect(page.getByLabel("Type filter")).toBeVisible();
    await expect(page.getByLabel("Period filter")).toBeVisible();
    await expect(page.getByRole("link", { name: /pending/i }).first()).toBeVisible();
    await expect(page.locator(".pagination-bar").first()).toBeVisible();

    const firstRequest = page.locator("button.leave-request-card").first();
    if (await firstRequest.isVisible().catch(() => false)) {
      await firstRequest.click();
      const detail = page.getByRole("dialog", { name: "Leave request detail" });
      await expect(detail).toBeVisible();
      await expect(detail.getByRole("heading", { name: "Timeline" })).toBeVisible();
      await expect(detail.getByRole("heading", { name: "Request details" })).toBeVisible();
      await expect(detail.getByRole("heading", { name: "Evidence", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(detail).toHaveCount(0);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectPageReady(page, "Leave");
    await expect(page.getByRole("heading", { name: "Leave requests" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("apply leave modal validates dates and evidence before submission", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectPageReady(page, "Leave");

    const dialog = await openApplyLeave(page);
    const leaveType = field(dialog, "Leave type");
    const sickLeaveValue = await optionValueByName(leaveType, /sick/);

    if (sickLeaveValue) {
      await leaveType.selectOption(sickLeaveValue);
      const evidenceRequired = await dialog.getByText("Required", { exact: true }).isVisible().catch(() => false);
      if (evidenceRequired) {
        await expect(dialog.getByText("Evidence required.")).toBeVisible();
        await expect(dialog.getByRole("button", { name: "Submit leave" })).toBeDisabled();
      } else {
        await expect(dialog.getByText("Optional", { exact: true })).toBeVisible();
      }

      await field(dialog, "Evidence file").setInputFiles({
        name: "medical-certificate.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("medical certificate"),
      });
      await expect(dialog.getByText("Evidence selected")).toBeVisible();
    }

    await field(dialog, "Start date").fill(isoDateFromToday(20));
    await field(dialog, "End date").fill(isoDateFromToday(19));
    await expect(dialog.getByText("Check dates.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Submit leave" })).toBeDisabled();

    await field(dialog, "End date").fill(isoDateFromToday(20));
    await expect(dialog.getByText("Checked on submit")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("optional leave can submit through the browser when live mode is available", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectPageReady(page, "Leave");
    test.skip(await page.getByText("Demo ESS").isVisible().catch(() => false), "Submit mutation is skipped in demo mode.");

    const dialog = await openApplyLeave(page);
    const leaveType = field(dialog, "Leave type");
    const optionalLeaveValue = await optionValueByName(leaveType, /casual|earned/);
    test.skip(!optionalLeaveValue, "No optional leave type is available for this employee.");

    await leaveType.selectOption(optionalLeaveValue);
    await field(dialog, "Start date").fill(isoDateFromToday(35));
    await field(dialog, "End date").fill(isoDateFromToday(35));
    await field(dialog, "Reason").fill(`Playwright leave certification ${Date.now()}`);

    await page.route("**/api/me/leave-requests", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "playwright-leave-request",
          status: "pending",
        }),
      });
    });

    await dialog.getByRole("button", { name: "Submit leave" }).click();
    await expect(dialog.getByText("Submitted.", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Leave request submitted.")).toBeVisible();
  });
});
