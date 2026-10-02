import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin, manager, type Persona } from "../helpers/staging-auth";

type SubmitCapture<T> = {
  ok: boolean;
  status: number;
  requestBody: unknown;
  payload: T;
};

type RegularizationSubmission = {
  id: string;
  status: string;
  workflow_reference?: string;
};

type EmployeeListItem = {
  id: string;
  employee_code: string;
};

type LeaveBalanceItem = {
  employee_code: string;
  employee_id: string;
  leave_policy_id: string;
  leave_policy_name: string;
};

type PendingRegularizationItem = {
  id: string;
  employee_code?: string;
  employee?: string;
};

type PendingRegularizationList = {
  items?: PendingRegularizationItem[];
};

function uniqueRef(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function apiBaseUrl() {
  return process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
}

function field(scope: Page | Locator, label: string, index = 0) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").nth(index);
}

function card(page: Page, text: string | RegExp) {
  return page.locator("article.record-card, a.tableish__row, button.leave-request-card").filter({ hasText: text }).first();
}

async function authenticateForSetup(page: Page, persona: Persona) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const response = await page.request.post("/api/auth/login", {
    data: { identifier: persona.username, password: persona.password },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

async function authHeaders(page: Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  return { Authorization: `Token ${token}` };
}

function isoDateFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
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
    requestBody: (() => {
      try {
        return response.request().postDataJSON() as unknown;
      } catch {
        return response.request().postData() ?? "";
      }
    })(),
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

async function submitRegularizationFromAvailableRecord(page: Page, reason: string, requestedStatus: string) {
  const attendanceSelect = field(page, "Attendance record");
  const recordIds = await attendanceSelect.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value.length > 0),
  );
  expect(recordIds.length, "ESS should offer attendance records for regularization").toBeGreaterThan(0);

  let lastResult: SubmitCapture<RegularizationSubmission> | null = null;

  for (const recordId of recordIds) {
    await attendanceSelect.selectOption(recordId);
    await field(page, "Requested check-in").fill("");
    await field(page, "Requested check-out").fill("");
    await field(page, "Requested status").selectOption(requestedStatus);
    await field(page, "Reason").fill(reason);

    const result = await submitAndCapture<RegularizationSubmission>(
      page,
      "/api/me/attendance-regularizations",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Submit regularization" }).click();
      },
    );
    if (result.ok) {
      return { attendanceRecordId: recordId, result };
    }
    lastResult = result;
  }

  return { attendanceRecordId: recordIds[0], result: lastResult };
}

async function getHrEmployeeByCode(page: Page, employeeCode: string) {
  const response = await page.request.get(`${apiBaseUrl()}/hr-admin/employees/`, {
    headers: await authHeaders(page),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const payload = await response.json();
  const employees = (Array.isArray(payload) ? payload : payload.items ?? payload.results ?? []) as EmployeeListItem[];
  const matched = employees.find((item) => item.employee_code === employeeCode);
  expect(matched, `Expected employee ${employeeCode} to exist`).toBeTruthy();
  return matched!;
}

async function topUpSeedLeaveBalance(page: Page) {
  const response = await page.request.get(`${apiBaseUrl()}/hr-admin/leave-balances/?q=EMP-0042`, {
    headers: await authHeaders(page),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const balances = (await response.json()) as LeaveBalanceItem[];
  const balance =
    balances.find((item) => item.employee_code === "EMP-0042" && /CL|Casual/i.test(item.leave_policy_name)) ??
    balances.find((item) => item.employee_code === "EMP-0042");
  expect(balance, "Expected Riya to have at least one leave balance").toBeTruthy();
  const creditResponse = await page.request.post(`${apiBaseUrl()}/hr-admin/leave-balances/actions/`, {
    headers: await authHeaders(page),
    data: {
      employee_id: balance!.employee_id,
      leave_policy_id: balance!.leave_policy_id,
      action: "credit_adjustment",
      units: "20.00",
      reason: "Playwright TL certification balance top-up.",
    },
  });
  expect(creditResponse.ok(), await creditResponse.text()).toBeTruthy();
}

async function ensureSeedManager(page: Page) {
  await authenticateForSetup(page, hrAdmin);
  await page.goto("/hr-admin/employees", { waitUntil: "domcontentloaded" });
  const targetEmployee = await getHrEmployeeByCode(page, "EMP-0042");
  const seedManager = await getHrEmployeeByCode(page, "EMP-0002");
  const response = await page.request.patch(`${apiBaseUrl()}/hr-admin/employees/${targetEmployee.id}/`, {
    headers: await authHeaders(page),
    data: { reporting_manager_id: seedManager.id },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  await topUpSeedLeaveBalance(page);
}

async function clearSeedPendingRegularizations(page: Page) {
  await authenticateForSetup(page, manager);
  await page.goto("/mss/approvals?queue=attendance", { waitUntil: "domcontentloaded" });
  const response = await page.request.get(`${apiBaseUrl()}/manager/attendance-regularizations/pending/?page_size=100`, {
    headers: await authHeaders(page),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const payload = (await response.json()) as PendingRegularizationList | PendingRegularizationItem[];
  const items = (Array.isArray(payload) ? payload : payload.items ?? []) as PendingRegularizationItem[];
  for (const item of items.filter((entry) => entry.employee_code === "EMP-0042" || /Riya Sharma/i.test(entry.employee ?? ""))) {
    const rejectResponse = await page.request.post(`${apiBaseUrl()}/manager/attendance-regularizations/${item.id}/reject/`, {
      headers: await authHeaders(page),
      data: { comment: "Playwright TL certification cleanup." },
    });
    expect([200, 404], await rejectResponse.text()).toContain(rejectResponse.status());
  }
}

test.describe("Phase 4A ESS to MSS leave certification", () => {
  test.beforeEach(async ({ page }) => {
    await ensureSeedManager(page);
    await clearSeedPendingRegularizations(page);
  });

  test("employee submits leave through ESS and manager approves through MSS", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    const reason = uniqueRef("LEAVE_APPROVAL");
    const decisionNote = `${reason}_APPROVED`;
    const startDate = isoDateFromToday(65);
    const endDate = isoDateFromToday(65);

    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectPageReady(page, "Leave");
    await expect(page.getByRole("heading", { name: "Submit leave request" })).toHaveCount(0);
    await page.getByRole("button", { name: "Apply leave" }).click();
    await expect(page.getByRole("dialog", { name: "Apply leave" })).toBeVisible();
    await expect(field(page, "Leave type")).toBeVisible();
    await expect(field(page, "Start date")).toHaveValue(/\d{4}-\d{2}-\d{2}/);
    await expect(field(page, "End date")).toHaveValue(/\d{4}-\d{2}-\d{2}/);
    await expect(field(page, "Start day portion")).toHaveValue("full_day");
    await expect(field(page, "End day portion")).toHaveValue("full_day");
    await expect(field(page, "Evidence file")).toBeVisible();
    await expect(field(page, "Evidence reference")).toBeVisible();
    await expect(field(page, "Reason")).toBeVisible();

    await field(page, "Start date").fill(startDate);
    await field(page, "End date").fill(endDate);
    await field(page, "Reason").fill(reason);
    const leaveResult = await submitAndCapture<{ id: string; status: string; workflow_reference: string }>(
      page,
      "/api/me/leave-requests",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Submit leave" }).click();
      },
    );
    expect(leaveResult.ok).toBeTruthy();
    expect(leaveResult.status).toBe(201);
    expect(String(leaveResult.requestBody)).toContain(startDate);
    expect(String(leaveResult.requestBody)).toContain(endDate);
    expect(String(leaveResult.requestBody)).toContain(reason);
    expect(leaveResult.payload.status).toBe("pending");
    await page.goto(`/ess/leave?status=pending&requestId=${leaveResult.payload.id}`);
    await expectPageReady(page, "Leave");
    await expect(card(page, reason)).toBeVisible();
    await expect(card(page, reason)).toContainText("pending");
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, `/mss/approvals?queue=leave&leaveId=${leaveResult.payload.id}`, manager);
    await expectPageReady(page, "Manager inbox");
    await expect(page.getByRole("heading", { name: "Leave approvals" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leave approval detail" })).toBeVisible();
    await expect(card(page, reason)).toBeVisible();
    await expect(card(page, reason)).toContainText("pending");
    await expect(page.getByText(reason).first()).toBeVisible();
    await field(page, "Decision note").fill(decisionNote);
    const approvalResult = await submitAndCapture<{ id: string; status: string }>(
      page,
      `/api/manager/leave-requests/${leaveResult.payload.id}/approve`,
      "POST",
      async () => {
        await page.getByRole("button", { name: "Approve request" }).click();
      },
    );
    expect(approvalResult.ok).toBeTruthy();
    expect(approvalResult.requestBody).toMatchObject({ comment: decisionNote });
    expect(approvalResult.payload.status).toBe("approved");
    await expect(page.getByText("Request approved.")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, `/ess/leave?status=approved&requestId=${leaveResult.payload.id}`, employee);
    await expectPageReady(page, "Leave");
    await expect(card(page, reason)).toBeVisible();
    await expect(card(page, reason)).toContainText("approved");
    await card(page, reason).click();
    await expect(page.getByRole("dialog", { name: "Leave request detail" })).toBeVisible();
    await expect(page.getByText(decisionNote).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("leave request validation and manager rejection are visible through the browser", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    const invalidReason = uniqueRef("LEAVE_INVALID");
    const rejectReason = uniqueRef("LEAVE_REJECT");
    const decisionNote = `${rejectReason}_MANAGER_REJECTED`;
    const startDate = isoDateFromToday(70);
    const endDate = isoDateFromToday(69);

    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectPageReady(page, "Leave");
    await page.getByRole("button", { name: "Apply leave" }).click();
    await expect(page.getByRole("dialog", { name: "Apply leave" })).toBeVisible();
    await field(page, "Start date").fill(startDate);
    await field(page, "End date").fill(endDate);
    await field(page, "Reason").fill(invalidReason);
    const invalidResult = await submitAndCapture<Record<string, unknown>>(
      page,
      "/api/me/leave-requests",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Submit leave" }).click();
      },
    );
    expect(invalidResult.ok).toBeFalsy();
    expect(invalidResult.status).toBe(400);
    await expect(page.getByText("Submission failed.")).toBeVisible();
    await expect(page.getByText("End date must be on or after start date.")).toBeVisible();

    await field(page, "Start date").fill(isoDateFromToday(71));
    await field(page, "End date").fill(isoDateFromToday(71));
    await field(page, "Reason").fill(rejectReason);
    const leaveResult = await submitAndCapture<{ id: string; status: string }>(
      page,
      "/api/me/leave-requests",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Submit leave" }).click();
      },
    );
    expect(leaveResult.ok).toBeTruthy();
    expect(leaveResult.payload.status).toBe("pending");

    await gotoAuthenticated(page, `/mss/approvals?queue=leave&leaveId=${leaveResult.payload.id}`, manager);
    await expectPageReady(page, "Manager inbox");
    await expect(card(page, rejectReason)).toBeVisible();
    await field(page, "Decision note").fill(decisionNote);
    const rejectionResult = await submitAndCapture<{ id: string; status: string }>(
      page,
      `/api/manager/leave-requests/${leaveResult.payload.id}/reject`,
      "POST",
      async () => {
        await page.getByRole("button", { name: "Reject request" }).click();
      },
    );
    expect(rejectionResult.ok).toBeTruthy();
    expect(rejectionResult.requestBody).toMatchObject({ comment: decisionNote });
    expect(rejectionResult.payload.status).toBe("rejected");
    await expect(page.getByText("Request rejected.")).toBeVisible();

    await gotoAuthenticated(page, `/ess/leave?status=rejected&requestId=${leaveResult.payload.id}`, employee);
    await expectPageReady(page, "Leave");
    await expect(card(page, rejectReason)).toBeVisible();
    await expect(card(page, rejectReason)).toContainText("rejected");
    await card(page, rejectReason).click();
    await expect(page.getByRole("dialog", { name: "Leave request detail" })).toBeVisible();
    await expect(page.getByText(decisionNote).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("employee submits attendance regularization and manager approves through MSS", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    const reason = uniqueRef("REG_APPROVAL");
    const decisionNote = `${reason}_APPROVED`;

    await gotoAuthenticated(page, "/ess/attendance", employee);
    await expectPageReady(page, "Attendance");
    await expect(page.getByRole("heading", { name: "Submit regularization" })).toBeVisible();
    await expect(field(page, "Attendance record")).toBeVisible();
    await expect(field(page, "Requested status")).toBeVisible();
    await expect(field(page, "Requested check-in")).toBeVisible();
    await expect(field(page, "Requested check-out")).toBeVisible();
    await expect(field(page, "Reason")).toBeVisible();

    const { result: regularizationResult } = await submitRegularizationFromAvailableRecord(page, reason, "remote");
    expect(regularizationResult, "regularization submission should produce a response").not.toBeNull();
    if (!regularizationResult) {
      throw new Error("Regularization submission did not produce a response.");
    }
    expect(regularizationResult.ok).toBeTruthy();
    expect(regularizationResult.status).toBe(201);
    expect(regularizationResult.requestBody).toMatchObject({
      requested_status: "remote",
      reason,
    });
    expect(regularizationResult.payload.status).toBe("pending");

    await page.goto(`/ess/attendance?status=pending&regId=${regularizationResult.payload.id}`);
    await expectPageReady(page, "Attendance");
    await expect(card(page, reason)).toBeVisible();
    await expect(card(page, reason)).toContainText("pending");
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, `/mss/approvals?queue=attendance&regId=${regularizationResult.payload.id}`, manager);
    await expectPageReady(page, "Manager inbox");
    await expect(page.getByRole("heading", { name: "Attendance regularizations" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Regularization detail" })).toBeVisible();
    await expect(card(page, reason)).toBeVisible();
    await expect(card(page, reason)).toContainText("pending");
    await expect(page.getByText(reason).first()).toBeVisible();
    await field(page, "Decision note").fill(decisionNote);
    const approvalResult = await submitAndCapture<{ id: string; status: string }>(
      page,
      `/api/manager/attendance-regularizations/${regularizationResult.payload.id}/approve`,
      "POST",
      async () => {
        await page.getByRole("button", { name: "Approve request" }).click();
      },
    );
    expect(approvalResult.ok).toBeTruthy();
    expect(approvalResult.requestBody).toMatchObject({ comment: decisionNote });
    expect(approvalResult.payload.status).toBe("approved");
    await expect(page.getByText("Request approved.")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, `/ess/attendance?status=approved&regId=${regularizationResult.payload.id}`, employee);
    await expectPageReady(page, "Attendance");
    await expect(card(page, reason)).toBeVisible();
    await expect(card(page, reason)).toContainText("approved");
    await expect(page.getByText(decisionNote).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("attendance regularization validation, duplicate guard, and manager rejection are visible", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    const invalidReason = uniqueRef("REG_INVALID");
    const duplicateReason = uniqueRef("REG_DUPLICATE");
    const rejectReason = uniqueRef("REG_REJECT");
    const decisionNote = `${rejectReason}_MANAGER_REJECTED`;

    await gotoAuthenticated(page, "/ess/attendance", employee);
    await expectPageReady(page, "Attendance");
    await field(page, "Requested check-in").fill("2026-09-09T18:10");
    await field(page, "Requested check-out").fill("2026-09-09T09:05");
    await field(page, "Reason").fill(invalidReason);
    const invalidResult = await submitAndCapture<Record<string, unknown>>(
      page,
      "/api/me/attendance-regularizations",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Submit regularization" }).click();
      },
    );
    expect(invalidResult.ok).toBeFalsy();
    expect(invalidResult.status).toBe(400);
    await expect(page.getByText("Submission failed.")).toBeVisible();
    await expect(page.getByText("Requested check-out cannot be earlier than requested check-in.")).toBeVisible();

    const { attendanceRecordId, result: firstPending } = await submitRegularizationFromAvailableRecord(
      page,
      duplicateReason,
      "late",
    );
    expect(firstPending, "first pending regularization should produce a response").not.toBeNull();
    if (!firstPending) {
      throw new Error("First pending regularization did not produce a response.");
    }
    expect(firstPending.ok).toBeTruthy();
    expect(firstPending.payload.status).toBe("pending");

    await page.goto("/ess/attendance");
    await expectPageReady(page, "Attendance");
    await field(page, "Attendance record").selectOption(attendanceRecordId);
    await field(page, "Requested status").selectOption("remote");
    await field(page, "Reason").fill(`${duplicateReason}_SECOND`);
    const duplicateResult = await submitAndCapture<Record<string, unknown>>(
      page,
      "/api/me/attendance-regularizations",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Submit regularization" }).click();
      },
    );
    expect(duplicateResult.ok).toBeFalsy();
    expect(duplicateResult.status).toBe(400);
    await expect(page.getByText("A pending attendance regularization already exists for this attendance record.")).toBeVisible();

    await gotoAuthenticated(page, `/mss/approvals?queue=attendance&regId=${firstPending.payload.id}`, manager);
    await expectPageReady(page, "Manager inbox");
    await expect(card(page, duplicateReason)).toBeVisible();
    await field(page, "Decision note").fill(decisionNote);
    const rejectionResult = await submitAndCapture<{ id: string; status: string }>(
      page,
      `/api/manager/attendance-regularizations/${firstPending.payload.id}/reject`,
      "POST",
      async () => {
        await page.getByRole("button", { name: "Reject request" }).click();
      },
    );
    expect(rejectionResult.ok).toBeTruthy();
    expect(rejectionResult.requestBody).toMatchObject({ comment: decisionNote });
    expect(rejectionResult.payload.status).toBe("rejected");
    await expect(page.getByText("Request rejected.")).toBeVisible();

    await gotoAuthenticated(page, `/ess/attendance?status=rejected&regId=${firstPending.payload.id}`, employee);
    await expectPageReady(page, "Attendance");
    await expect(card(page, duplicateReason)).toBeVisible();
    await expect(card(page, duplicateReason)).toContainText("rejected");
    await expect(page.getByText(decisionNote).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
