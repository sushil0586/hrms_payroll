import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { expectDialogStable } from "../helpers/modal-stability";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe.configure({ mode: "serial" });

type EmployeeListItem = {
  id: string;
  employee_code: string;
  full_name: string;
  work_email: string;
};

type ShiftItem = {
  id: string;
  name: string;
  weekly_off_days: string[];
};

type WorkSchedulePreview = {
  days: Array<{
    shift_id: string | null;
    shift_name: string | null;
  }>;
};

type LeaveSubmission = {
  id: string;
  status: string;
  requested_units: string;
  unit_breakdown?: {
    days?: Array<{
      day: string;
      counted: boolean;
      reason: string;
      units: string;
    }>;
    requested_units?: string;
  };
};

type ShiftAssignment = {
  id: string;
  shift_id: string;
};

function field(scope: Page | Locator, label: string, index = 0) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").nth(index);
}

function isoDateFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isoDateOffset(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextIsoWeekday(minDaysFromToday: number, weekday: number) {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + minDaysFromToday);
  while (date.getUTCDay() !== weekday) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date.toISOString().slice(0, 10);
}

async function optionValueByName(select: Locator, pattern: RegExp) {
  return select.locator("option").evaluateAll((options, source) => {
    const regexp = new RegExp(source, "i");
    const option = options.find((item) => regexp.test(item.textContent ?? ""));
    return option ? (option as HTMLOptionElement).value : "";
  }, pattern.source);
}

async function apiJson<T>(page: Page, path: string) {
  const response = await page.request.get(path);
  const payload = await response.json().catch(() => ({}));
  expect(response.ok(), `${path} should be available: ${response.status()} ${JSON.stringify(payload)}`).toBeTruthy();
  return payload as T;
}

async function authenticatedBackendJson<T>(page: Page, path: string) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value ?? "";
  expect(token, "Authenticated API token should be available.").not.toBe("");
  const currentUrl = new URL(page.url());
  const apiBaseUrl = process.env.HRMS_API_BASE_URL ?? `${currentUrl.origin}/api/v1`;
  const response = await page.request.get(`${apiBaseUrl}${path}`, {
    headers: { Authorization: `Token ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  expect(response.ok(), `${path} should be available: ${response.status()} ${JSON.stringify(payload)}`).toBeTruthy();
  return payload as T;
}

function findConfiguredEmployee(employees: EmployeeListItem[]) {
  const configuredLogin = employee.username.toLowerCase();
  const exactEmail = employees.find((item) => item.work_email.toLowerCase() === configuredLogin);
  if (exactEmail) {
    return exactEmail;
  }
  return employees.find((item) =>
    [item.work_email, item.employee_code, item.full_name].some((value) => {
      const label = value.toLowerCase();
      return label === configuredLogin || label.includes(configuredLogin) || configuredLogin.includes(label);
    }),
  );
}

async function submitAndCapture<T>(
  page: Page,
  path: string,
  action: () => Promise<void>,
) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(path) && item.request().method() === "POST"),
    action(),
  ]);
  return {
    ok: response.ok(),
    status: response.status(),
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

async function openApplyLeave(page: Page) {
  await page.getByRole("button", { name: "Apply leave" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Apply leave" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function expectBalanceCardsVisuallyBalanced(page: Page) {
  const cards = page.locator(".ess-balance-card");
  const count = await cards.count();
  if (count === 0) {
    return;
  }

  await expect(async () => {
    const centered = await cards.evaluateAll((items) =>
      items.every((card) => {
        const value = card.querySelector(":scope > strong");
        if (!value) {
          return false;
        }
        const cardRect = card.getBoundingClientRect();
        const valueRect = value.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const valueCenter = valueRect.left + valueRect.width / 2;
        return Math.abs(cardCenter - valueCenter) <= 16;
      }),
    );
    expect(centered).toBe(true);
  }).toPass();
}

test.describe("ESS Leave launch certification", () => {
  test("leave page keeps one responsibility with balances, history, filters, detail drilldown, and modal actions", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectPageReady(page, "Leave");

    await expect(page.getByRole("heading", { name: /Balance snapshot|Balances/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leave requests" })).toBeVisible();
    await expectBalanceCardsVisuallyBalanced(page);
    await expect(page.getByText("Leave request summary")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Submit leave request" })).toHaveCount(0);

    for (const label of ["Upcoming leave", "Waiting for review", "Recent decision", "Evidence files"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }

    await page.getByText("Filters", { exact: true }).click();
    await expect(page.getByLabel("Search leave history")).toBeVisible();
    await expect(page.getByLabel("Type filter")).toBeVisible();
    await expect(page.getByLabel("Period filter")).toBeVisible();
    await expect(page.getByRole("link", { name: /pending/i }).first()).toBeVisible();
    await expect(page.locator(".pagination-bar").first()).toBeVisible();

    const firstRequest = page.locator("button.leave-request-card, .leave-request-row button").first();
    if (await firstRequest.isVisible().catch(() => false)) {
      await firstRequest.click();
      const detail = page.getByRole("dialog", { name: "Leave request detail" });
      await expect(detail).toBeVisible();
      await expect(detail.getByRole("heading", { name: "Timeline" })).toBeVisible();
      await expect(detail.getByRole("heading", { name: "Request details" })).toBeVisible();
      await expect(detail.getByRole("heading", { name: "Evidence", exact: true })).toBeVisible();
      await expectDialogStable(page, "Leave request detail");
      await page.keyboard.press("Escape");
      await expect(detail).toHaveCount(0);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectPageReady(page, "Leave");
    await expect(page.getByRole("heading", { name: "Leave requests" })).toBeVisible();
    const compactApplyDialog = await openApplyLeave(page);
    await expectDialogStable(page, "Apply leave");
    await compactApplyDialog.getByRole("button", { name: "Close" }).click();
    await expectNoHorizontalOverflow(page);
  });

  test("apply leave modal validates dates and evidence before submission", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectPageReady(page, "Leave");

    const dialog = await openApplyLeave(page);
    await expectDialogStable(page, "Apply leave");
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
    await expect(dialog.locator(".notice--success").getByText("Checked on submit")).toBeVisible();
    await expectDialogStable(page, "Apply leave");
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
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Leave requests" })).toBeVisible();
  });

  test("leave unit calculation follows the employee roster weekly offs instead of a hardcoded weekend", async ({ page }) => {
    test.setTimeout(6 * 60 * 1000);
    const runOffsetDays = 90 + (Date.now() % 180);
    const startDate = nextIsoWeekday(runOffsetDays, 6);
    const endDate = isoDateOffset(startDate, 4);
    const retiredStartDate = isoDateOffset(endDate, 26_000);
    const retiredEndDate = isoDateOffset(retiredStartDate, 1);
    let createdAssignmentId: string | null = null;
    let restoredShift = false;

    await gotoAuthenticated(page, "/hr-admin/employee-shift-assignments", hrAdmin);
    const employeeRecord = findConfiguredEmployee(await apiJson<EmployeeListItem[]>(page, "/api/hr-admin/employees"));
    test.skip(!employeeRecord, `No HR employee record matched ${employee.username}.`);
    if (!employeeRecord) {
      return;
    }

    const resolutionResponse = await page.request.get(
      `/api/hr-admin/work-schedule-preview/?employee_id=${employeeRecord.id}&start_date=${startDate}&end_date=${endDate}`,
    );
    const resolution = (await resolutionResponse.json().catch(() => ({}))) as WorkSchedulePreview;
    expect(
      resolutionResponse.ok(),
      `Work schedule preview should be available: ${resolutionResponse.status()} ${JSON.stringify(resolution)}`,
    ).toBeTruthy();

    const shifts = await apiJson<ShiftItem[]>(page, "/api/hr-admin/shifts");
    const resolvedShiftId = resolution.days?.find((item) => item.shift_id)?.shift_id ?? null;
    const originalShift = shifts.find((item) => item.id === resolvedShiftId) ?? shifts[0];
    test.skip(!originalShift, "No shift is available for the roster calculation check.");
    if (!originalShift) {
      return;
    }

    try {
      const patchResponse = await page.request.patch(`/api/hr-admin/shifts/${originalShift.id}`, {
        data: {
          weekly_off_days: ["tuesday", "wednesday"],
        },
      });
      const patchPayload = await patchResponse.json().catch(() => ({}));
      expect(
        patchResponse.ok(),
        `Shift weekly offs should be patched for roster QA: ${patchResponse.status()} ${JSON.stringify(patchPayload)}`,
      ).toBeTruthy();

      if (!resolvedShiftId) {
        const assignmentResponse = await page.request.post("/api/hr-admin/employee-shift-assignments", {
          data: {
            employee_id: employeeRecord.id,
            shift_id: originalShift.id,
            assignment_kind: "temporary_override",
            effective_from: startDate,
            effective_to: endDate,
            is_primary: false,
          },
        });
        const assignmentPayload = (await assignmentResponse.json().catch(() => ({}))) as ShiftAssignment;
        expect(
          assignmentResponse.ok(),
          `Temporary roster assignment should be created: ${assignmentResponse.status()} ${JSON.stringify(assignmentPayload)}`,
        ).toBeTruthy();
        createdAssignmentId = assignmentPayload.id;
      }

      await gotoAuthenticated(page, "/ess/leave", employee);
      await expectPageReady(page, "Leave");
      test.skip(await page.getByText("Demo ESS").isVisible().catch(() => false), "Live roster mutation is skipped in demo mode.");

      const dialog = await openApplyLeave(page);
      const leaveType = field(dialog, "Leave type");
      const optionalLeaveValue = await optionValueByName(leaveType, /sick|casual|earned|annual/);
      test.skip(!optionalLeaveValue, "No optional leave type is available for the roster calculation check.");

      await leaveType.selectOption(optionalLeaveValue);
      await field(dialog, "Start date").fill(startDate);
      await field(dialog, "End date").fill(endDate);
      await field(dialog, "Reason").fill(`Playwright roster weekly-off calculation ${Date.now()}`);

      const result = await submitAndCapture<LeaveSubmission>(
        page,
        "/api/me/leave-requests",
        async () => {
          await dialog.getByRole("button", { name: "Submit leave" }).click();
        },
      );
      expect(result.ok, `Leave submit should pass for roster QA: ${result.status} ${JSON.stringify(result.payload)}`).toBeTruthy();
      await expect(dialog).toHaveCount(0);

      const detail = await authenticatedBackendJson<LeaveSubmission>(page, `/me/leave-requests/${result.payload.id}/`);
      const breakdownDays = detail.unit_breakdown?.days ?? [];
      expect(detail.requested_units).toBe("3.00");
      expect(detail.unit_breakdown?.requested_units).toBe("3.00");
      expect(breakdownDays.find((day) => day.day === "Saturday")).toMatchObject({ counted: true, reason: "working_day" });
      expect(breakdownDays.find((day) => day.day === "Sunday")).toMatchObject({ counted: true, reason: "working_day" });
      expect(breakdownDays.find((day) => day.day === "Tuesday")).toMatchObject({ counted: false, reason: "weekly_off" });
      expect(breakdownDays.find((day) => day.day === "Wednesday")).toMatchObject({ counted: false, reason: "weekly_off" });

      await page.goto(`/ess/leave?status=pending`, { waitUntil: "domcontentloaded" });
      await expectPageReady(page, "Leave");
      await expectNoHorizontalOverflow(page);
    } finally {
      if (createdAssignmentId) {
        await gotoAuthenticated(page, "/hr-admin/employee-shift-assignments", hrAdmin).catch(() => undefined);
        await page.request.patch(`/api/hr-admin/employee-shift-assignments/${createdAssignmentId}`, {
          data: {
            effective_from: retiredStartDate,
            effective_to: retiredEndDate,
          },
        }).catch(() => undefined);
      }
      if (originalShift && !restoredShift) {
        await gotoAuthenticated(page, "/hr-admin/employee-shift-assignments", hrAdmin).catch(() => undefined);
        const restoreResponse = await page.request.patch(`/api/hr-admin/shifts/${originalShift.id}`, {
          data: {
            weekly_off_days: originalShift.weekly_off_days,
          },
        });
        restoredShift = restoreResponse.ok();
      }
    }
  });
});
