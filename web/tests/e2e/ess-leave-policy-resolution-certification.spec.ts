import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, type Persona } from "../helpers/staging-auth";

type LeaveSubmission = {
  id?: string;
  status?: string;
  [key: string]: unknown;
};

type SubmitCapture<T> = {
  ok: boolean;
  status: number;
  payload: T;
};

function field(scope: Page | Locator, label: string, index = 0) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").nth(index);
}

function isoDateFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function stageBalanceFallbackPersona(): Persona | null {
  const username = process.env.PLAYWRIGHT_LEAVE_FALLBACK_EMPLOYEE_USERNAME;
  const password = process.env.PLAYWRIGHT_LEAVE_FALLBACK_EMPLOYEE_PASSWORD;
  if (!username || !password) return null;
  return { username, password };
}

async function submitAndCapture<T>(
  page: Page,
  path: string,
  method: "POST",
  action: () => Promise<void>,
): Promise<SubmitCapture<T>> {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(path) && item.request().method() === method),
    action(),
  ]);
  return {
    ok: response.ok(),
    status: response.status(),
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

test.describe("ESS leave policy resolution certification", () => {
  test("balance-backed employee can submit leave without a raw policy assignment error", async ({ page }) => {
    const persona = stageBalanceFallbackPersona();
    test.skip(
      !persona,
      "Set PLAYWRIGHT_LEAVE_FALLBACK_EMPLOYEE_USERNAME and PLAYWRIGHT_LEAVE_FALLBACK_EMPLOYEE_PASSWORD to certify a stage employee with balance-backed leave.",
    );

    const reason = `PW_BALANCE_FALLBACK_${Date.now()}`;
    const startDate = isoDateFromToday(45 + (Math.floor(Date.now() / 1000) % 45));

    await gotoAuthenticated(page, "/ess/leave", persona!);
    await expectPageReady(page, "Leave");
    await page.getByRole("button", { name: "Apply leave" }).click();

    const dialog = page.getByRole("dialog", { name: "Apply leave" });
    await expect(dialog).toBeVisible();
    const leaveType = field(dialog, "Leave type");
    const casualLeaveValue = await leaveType.locator("option").evaluateAll((options) => {
      const option = options.find((item) => /casual/i.test(item.textContent ?? ""));
      return option ? (option as HTMLOptionElement).value : "";
    });
    expect(casualLeaveValue, "Stage employee must expose a casual leave option to exercise this regression.").toBeTruthy();

    await leaveType.selectOption(casualLeaveValue);
    await field(dialog, "Start date").fill(startDate);
    await field(dialog, "End date").fill(startDate);
    await field(dialog, "Reason").fill(reason);

    const leaveResult = await submitAndCapture<LeaveSubmission>(
      page,
      "/api/me/leave-requests",
      "POST",
      async () => {
        await dialog.getByRole("button", { name: "Submit leave" }).click();
      },
    );

    const payloadText = JSON.stringify(leaveResult.payload);
    expect(payloadText).not.toContain("No active leave policy is assigned");
    expect(leaveResult.ok, `Leave request failed with ${leaveResult.status}: ${payloadText}`).toBeTruthy();
    expect(leaveResult.status).toBe(201);
    expect(leaveResult.payload.status).toBe("pending");
    await expect(dialog.getByText("Submitted.", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
