import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { expectActualUserReadyPage } from "../helpers/user-journey-certification";
import { employee, gotoAuthenticated, hrAdmin, manager } from "../helpers/staging-auth";

type SubmitCapture<T> = {
  ok: boolean;
  status: number;
  requestBody: unknown;
  payload: T;
};

type LeaveSubmission = {
  id: string;
  status: string;
  manager_comment?: string | null;
};

type RegularizationSubmission = {
  id: string;
  status: string;
  manager_comment?: string | null;
};

type ApiOption = {
  id: string;
  name: string;
};

type EmployeeListItem = {
  id: string;
  employee_code: string;
  full_name: string;
  work_email: string;
};

type LeavePolicyItem = ApiOption & {
  status: string;
};

type ScopedAssignment = {
  id: string;
  policy_id: string;
  employee_id: string | null;
  is_active: boolean;
};

const shouldRunMutationFlow = process.env.PLAYWRIGHT_PHASE6_MUTATE === "true";
const shouldPrepareStageData = process.env.PLAYWRIGHT_PHASE6_PREPARE === "true";
const missingLeavePolicyMessage = /No active leave policy is assigned to this employee/i;

function uniqueRef(prefix: string) {
  return `PW_PHASE6_${prefix}_${Date.now()}`;
}

function isoDateFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function field(scope: Page | Locator, label: string, index = 0) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").nth(index);
}

function queueRow(page: Page, text: string | RegExp) {
  return page.locator("article.record-card, a.tableish__row, button.leave-request-card").filter({ hasText: text }).first();
}

async function expectLink(page: Page, name: string | RegExp, href: RegExp) {
  const link = page.getByRole("link", { name }).first();
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", href);
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

async function attendanceRecordIds(page: Page) {
  await openAttendanceRegularizationDialog(page);
  return field(page, "Attendance record").locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value.length > 0),
  );
}

async function openAttendanceRegularizationDialog(page: Page) {
  if (await page.getByRole("dialog", { name: "Regularize attendance" }).count()) {
    return;
  }
  await page.getByRole("button", { name: "Regularize attendance" }).first().click();
  await expect(page.getByRole("dialog", { name: "Regularize attendance" })).toBeVisible();
}

async function submitRegularizationFromAvailableRecord(page: Page, reason: string, requestedStatus: string) {
  const recordIds = await attendanceRecordIds(page);
  test.skip(!recordIds.length, "Employee has no attendance records available for regularization.");

  let lastResult: SubmitCapture<RegularizationSubmission> | null = null;

  for (const recordId of recordIds) {
    await field(page, "Attendance record").selectOption(recordId);
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

async function apiJson<T>(page: Page, path: string) {
  const response = await page.request.get(path);
  expect(response.ok(), `${path} should be available`).toBeTruthy();
  return (await response.json()) as T;
}

function findConfiguredEmployeeOption(employees: EmployeeListItem[]) {
  const employeeName = employee.username.toLowerCase();
  return employees.find((item) => {
    return [item.work_email, item.employee_code, item.full_name].some((value) => {
      const label = value.toLowerCase();
      return label === employeeName || label.includes(employeeName) || employeeName.includes(label);
    });
  });
}

async function findConfiguredEmployeeId(page: Page) {
  const employees = await apiJson<EmployeeListItem[]>(page, "/api/hr-admin/employees");
  return findConfiguredEmployeeOption(employees)?.id ?? null;
}

async function ensureEmployeeLeavePolicyAssignment(page: Page) {
  if (!shouldPrepareStageData) {
    return null;
  }

  await gotoAuthenticated(page, "/hr-admin/leave-policy-assignments", hrAdmin);
  const employeeId = await findConfiguredEmployeeId(page);
  test.skip(!employeeId, `No HR Admin employee record matched ${employee.username}.`);
  const leavePolicies = await apiJson<LeavePolicyItem[]>(page, "/api/hr-admin/leave-policies");
  const leavePolicy = leavePolicies.find((item) => item.status === "active") ?? leavePolicies[0];
  test.skip(!leavePolicy, "No leave policies are available for assignment.");

  if (!employeeId) {
    throw new Error(`No HR Admin employee record matched ${employee.username}.`);
  }
  if (!leavePolicy) {
    throw new Error("No leave policies are available for assignment.");
  }

  const assignments = await apiJson<ScopedAssignment[]>(page, "/api/hr-admin/leave-policy-assignments");
  const existingEmployeeAssignment = assignments.find((item) => item.employee_id === employeeId && item.is_active);
  if (existingEmployeeAssignment) {
    return existingEmployeeAssignment;
  }

  const response = await page.request.post("/api/hr-admin/leave-policy-assignments", {
    data: {
      leave_policy_id: leavePolicy.id,
      employee_id: employeeId,
      legal_entity_id: null,
      branch_id: null,
      department_id: null,
      grade_id: null,
      employment_type_id: null,
      priority: 1,
      is_active: true,
    },
  });
  const payload = await response.json().catch(() => ({}));
  expect(
    response.ok(),
    `Unable to prepare employee-scoped leave policy assignment: ${response.status()} ${JSON.stringify(payload)}`,
  ).toBeTruthy();
  return payload as ScopedAssignment;
}

async function expectEssWorkspaceUsable(page: Page) {
  await expectPageReady(page, /My workspace|Self service/i);
  await expect(page.getByTestId("ess-control-center")).toBeVisible();

  for (const heading of [
    "Today's actions",
    "What do you want to do?",
    "My profile",
    "Today",
    "Leave balances",
  ]) {
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }

  await expectLink(page, /Apply leave/i, /\/ess\/leave/);
  await expectLink(page, /Regularize attendance/i, /\/ess\/attendance/);
  await expectNoHorizontalOverflow(page);
}

async function expectEssLeaveUsable(page: Page) {
  await expectPageReady(page, /Leave/i);
  for (const heading of ["Balances", "Leave requests"]) {
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }
  await expect(page.getByLabel("Leave history snapshot")).toBeVisible();
  await expect(field(page, "Search leave history")).toBeVisible();
  await expect(field(page, "Type filter")).toBeVisible();
  await expect(field(page, "Period filter")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Submit leave request" })).toHaveCount(0);
  await page.getByRole("button", { name: "Apply leave" }).click();
  await expect(page.getByRole("dialog", { name: "Apply leave" })).toBeVisible();
  for (const label of ["Leave type", "Start date", "End date", "Start day portion", "End day portion", "Attachment reference"]) {
    const resolvedLabel = label === "Attachment reference" ? "Evidence reference" : label;
    await expect(field(page, resolvedLabel), `${resolvedLabel} should be visible`).toBeVisible();
  }
  await expect(field(page, "Evidence file")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit leave" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  const firstLeaveRequest = page.locator("button.leave-request-card").first();
  if (await firstLeaveRequest.count()) {
    await firstLeaveRequest.click();
    const detailDialog = page.getByRole("dialog", { name: "Leave request detail" });
    await expect(detailDialog).toBeVisible();
    await expect(detailDialog.getByText("Manager decision").first()).toBeVisible();
    for (const heading of ["Timeline", "Request details", "Evidence"]) {
      await expect(detailDialog.getByRole("heading", { name: heading }).first()).toBeVisible();
    }
    await page.getByRole("button", { name: "Close leave request detail" }).click();
  }
  await expect(page.locator(".pagination-bar").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function expectEssAttendanceUsable(page: Page) {
  await expectPageReady(page, /Attendance/i);
  for (const heading of ["Today", "Monthly summary", "Correction queue", "Regularizations"]) {
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Submit regularization" })).toHaveCount(0);
  await openAttendanceRegularizationDialog(page);
  for (const label of ["Attendance record", "Requested status", "Requested check-in", "Requested check-out"]) {
    await expect(field(page, label), `${label} should be visible`).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Submit regularization" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.locator(".pagination-bar").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function expectMssApprovalsUsable(page: Page) {
  await expectPageReady(page, /Manager inbox/i);
  await expect(page.getByRole("heading", { name: "Approval queues" })).toBeVisible();
  await expectLink(page, /Leave/i, /\/mss\/approvals/);
  await expectLink(page, /Attendance/i, /\/mss\/approvals/);
  await expect(page.getByRole("heading", { name: /Leave approvals|Attendance regularizations/i }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Leave approval detail|Regularization detail/i }).first()).toBeVisible();
  await expect(page.locator(".pagination-bar").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

test.describe("User journey phase 6: ESS and MSS practical workflow", () => {
  test.describe.configure({ mode: "default" });

  test("employee can understand and use the ESS workspace and child pages", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    await expectActualUserReadyPage(page, {
      path: "/ess",
      heading: /My workspace|Self service/i,
      persona: employee,
      requiredText: [/Today's actions/i, /Leave balances/i, /Apply leave/i, /Regularize attendance/i],
    });
    await expectEssWorkspaceUsable(page);

    for (const [label, route, heading, requiredText] of [
      ["Leave", "/ess/leave", /Leave/i, /Submit leave request|Leave requests/i],
      ["Attendance", "/ess/attendance", /Attendance/i, /Submit regularization|Regularizations/i],
      ["Payslips", "/ess/payslips", /Payslips/i, /Payslip|No payslip|Published/i],
      ["Documents", "/ess/documents", /Documents/i, /Document|Upload|required/i],
      ["Tax declarations", "/ess/statutory-declarations", /Statutory/i, /Declaration|Proof|Tax/i],
      ["Notifications", "/ess/notifications", /Notifications/i, /Inbox|Notification/i],
    ] as Array<[string, string, RegExp, RegExp]>) {
      await test.step(`ESS child page: ${label}`, async () => {
        await gotoAuthenticated(page, route, employee);
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
        await expectPageReady(page, heading);
        await expect(page.getByText(requiredText).first()).toBeVisible();
        await expectNoAppError(page);
        await expectNoHorizontalOverflow(page);
      });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/ess", employee);
    await expectEssWorkspaceUsable(page);
  });

  test("manager can use MSS approvals and notifications without layout or routing issues", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    await expectActualUserReadyPage(page, {
      path: "/mss",
      heading: /Manager control center/i,
      persona: manager,
      requiredText: [/Team priorities|Work queue/i, /Team members/i, /Pending decisions/i],
    });
    await expectLink(page, /Open approvals/i, /\/mss\/approvals$/);
    await expectLink(page, /^Notifications$/i, /\/mss\/notifications$/);
    await expectLink(page, /Self service/i, /\/ess$/);

    await gotoAuthenticated(page, "/mss/approvals?queue=leave", manager);
    await expectMssApprovalsUsable(page);
    await page.getByRole("link", { name: /Attendance/i }).first().click();
    await expect(page).toHaveURL(/\/mss\/approvals\?.*queue=attendance/);
    await expectMssApprovalsUsable(page);

    await gotoAuthenticated(page, "/mss/notifications", manager);
    await expectPageReady(page, /Notifications/i);
    await expect(page.getByRole("heading", { name: "Inbox filters" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Inbox list" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notification detail" })).toBeVisible();
    await expectLink(page, /^Approvals$/i, /\/mss\/approvals$/);
    await expectLink(page, /ESS inbox/i, /\/ess\/notifications$/);
    await expectNoHorizontalOverflow(page);
  });

  test("employee leave request and manager leave decision work end to end when mutation is enabled", async ({ page }) => {
    test.skip(!shouldRunMutationFlow, "Set PLAYWRIGHT_PHASE6_MUTATE=true to create and decide disposable stage leave requests.");
    test.setTimeout(4 * 60 * 1000);

    const invalidReason = uniqueRef("LEAVE_INVALID");
    const reason = uniqueRef("LEAVE_APPROVE");
    const decisionNote = `${reason}_MANAGER_APPROVED`;

    await ensureEmployeeLeavePolicyAssignment(page);
    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectEssLeaveUsable(page);
    await page.getByRole("button", { name: "Apply leave" }).click();
    await expect(page.getByRole("dialog", { name: "Apply leave" })).toBeVisible();

    await field(page, "Start date").fill(isoDateFromToday(50));
    await field(page, "End date").fill(isoDateFromToday(49));
    await field(page, "Reason").fill(invalidReason);
    await expect(page.getByText("Check dates.")).toBeVisible();
    await expect(page.getByText(/End date must be the same as or after the start date/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit leave" })).toBeDisabled();

    const startDate = isoDateFromToday(51);
    const endDate = isoDateFromToday(51);
    await field(page, "Start date").fill(startDate);
    await field(page, "End date").fill(endDate);
    await field(page, "Reason").fill(reason);
    await field(page, "Evidence file").setInputFiles({
      name: "phase6-leave-evidence.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(`Evidence for ${reason}`),
    });
    const leaveResult = await submitAndCapture<LeaveSubmission>(
      page,
      "/api/me/leave-requests",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Submit leave" }).click();
      },
    );
    test.skip(
      leaveResult.status === 400 && missingLeavePolicyMessage.test(JSON.stringify(leaveResult.payload)),
      "Employee has no active leave policy assignment for the selected leave type.",
    );
    expect(
      leaveResult.ok,
      `Leave request failed with ${leaveResult.status}: ${JSON.stringify(leaveResult.payload)}`,
    ).toBeTruthy();
    expect(leaveResult.status).toBe(201);
    expect(leaveResult.payload.status).toBe("pending");

    await gotoAuthenticated(page, `/mss/approvals?queue=leave&leaveId=${leaveResult.payload.id}`, manager);
    await expectMssApprovalsUsable(page);
    await expect(queueRow(page, reason)).toBeVisible();
    await field(page, "Decision note").fill(decisionNote);
    const approvalResult = await submitAndCapture<LeaveSubmission>(
      page,
      `/api/manager/leave-requests/${leaveResult.payload.id}/approve`,
      "POST",
      async () => {
        await page.getByRole("button", { name: /Approve request|Approve cancellation/ }).first().click();
      },
    );
    expect(approvalResult.ok).toBeTruthy();
    expect(approvalResult.payload.status).toBe("approved");
    await expect(page.getByText(/Request approved|Cancellation request approved/i)).toBeVisible();

    await gotoAuthenticated(page, `/ess/leave?status=approved&requestId=${leaveResult.payload.id}`, employee);
    await expectPageReady(page, /Leave/i);
    await expect(queueRow(page, reason)).toBeVisible();
    await expect(queueRow(page, reason)).toContainText("approved");
    await expect(page.getByRole("dialog", { name: "Leave request detail" })).toBeVisible();
    await expect(page.getByText("phase6-leave-evidence.txt")).toBeVisible();
    await expect(page.getByRole("link", { name: /phase6-leave-evidence.txt/i })).toHaveAttribute("href", /\/api\/me\/leave-requests\/.+\/attachments\/.+\/download/);
    await expect(page.getByText(decisionNote).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("employee attendance regularization and manager decision work end to end when mutation is enabled", async ({ page }) => {
    test.skip(!shouldRunMutationFlow, "Set PLAYWRIGHT_PHASE6_MUTATE=true to create and decide disposable stage attendance requests.");
    test.setTimeout(4 * 60 * 1000);

    const invalidReason = uniqueRef("REG_INVALID");
    const reason = uniqueRef("REG_REJECT");
    const decisionNote = `${reason}_MANAGER_REJECTED`;

    await gotoAuthenticated(page, "/ess/attendance", employee);
    await expectEssAttendanceUsable(page);
    const recordIds = await attendanceRecordIds(page);
    test.skip(!recordIds.length, "Employee has no attendance records available for regularization.");

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
    await expect(page.getByText(/Requested check-out cannot be earlier than requested check-in/i)).toBeVisible();

    const { result: regularizationResult } = await submitRegularizationFromAvailableRecord(page, reason, "remote");
    expect(regularizationResult, "regularization submission should produce a response").not.toBeNull();
    if (!regularizationResult) {
      throw new Error("Regularization submission did not produce a response.");
    }
    expect(
      regularizationResult.ok,
      `Attendance regularization failed with ${regularizationResult.status}: ${JSON.stringify(regularizationResult.payload)}`,
    ).toBeTruthy();
    expect(regularizationResult.status).toBe(201);
    expect(regularizationResult.requestBody).toMatchObject({ requested_status: "remote", reason });
    expect(regularizationResult.payload.status).toBe("pending");

    await gotoAuthenticated(page, `/mss/approvals?queue=attendance&regId=${regularizationResult.payload.id}`, manager);
    await expectMssApprovalsUsable(page);
    await expect(queueRow(page, reason)).toBeVisible();
    await field(page, "Decision note").fill(decisionNote);
    const rejectionResult = await submitAndCapture<RegularizationSubmission>(
      page,
      `/api/manager/attendance-regularizations/${regularizationResult.payload.id}/reject`,
      "POST",
      async () => {
        await page.getByRole("button", { name: "Reject request" }).first().click();
      },
    );
    expect(rejectionResult.ok).toBeTruthy();
    expect(rejectionResult.payload.status).toBe("rejected");
    await expect(page.getByText("Request rejected.")).toBeVisible();

    await gotoAuthenticated(page, `/ess/attendance?status=rejected&regId=${regularizationResult.payload.id}`, employee);
    await expectPageReady(page, /Attendance/i);
    await expect(queueRow(page, reason)).toBeVisible();
    await expect(queueRow(page, reason)).toContainText("rejected");
    await expect(page.getByText(decisionNote).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
