import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin, manager, tenantAdmin } from "../helpers/staging-auth";

type RolePayload = {
  role: {
    id: string;
  };
};

type EmployeeListItem = {
  id: string;
  employee_code: string;
  full_name: string;
};

type EmployeePayload = EmployeeListItem & {
  reporting_manager_id?: string | null;
};

type AttendanceRecordOption = {
  id: string;
  is_locked: boolean;
};

type AttendanceRegularizationList = {
  items: Array<{
    id?: string;
    attendance_record_id: string;
    status: string;
    employee?: string;
    employee_code?: string;
  }>;
};

type LeaveBalanceItem = {
  employee_code: string;
  employee_id: string;
  leave_policy_id: string;
  leave_policy_name: string;
};

type EssLeaveTypeItem = {
  id: string;
  name: string;
  code?: string;
};

const customPassword = "Password@123";

function apiBaseUrl() {
  return process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
}

async function authHeaders(page: Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  return { Authorization: `Token ${token}` };
}

function uniqueRef(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function field(scope: Page | Locator, label: string, index = 0) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").nth(index);
}

function card(page: Page, text: string | RegExp) {
  return page.locator("article.record-card, a.tableish__row, tr").filter({ hasText: text }).first();
}

function isoDateFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function submitAndCapture<T>(page: Page, path: string, method: "POST", action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(path) && item.request().method() === method),
    action(),
  ]);
  let requestBody: unknown = undefined;
  try {
    requestBody = response.request().postDataJSON() as unknown;
  } catch {
    requestBody = response.request().postData() ?? undefined;
  }
  return {
    ok: response.ok(),
    status: response.status(),
    requestBody,
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

async function createEmployeeLeaveRequest(page: Page, reason: string): Promise<{ id: string; status: string }> {
  await gotoAuthenticated(page, "/ess", employee);
  const response = await page.request.get("/api/me/leave-types");
  expect(response.ok(), await response.text()).toBeTruthy();
  const payload = (await response.json()) as EssLeaveTypeItem[] | { items?: EssLeaveTypeItem[]; results?: EssLeaveTypeItem[] };
  const leaveTypes = Array.isArray(payload) ? payload : payload.items ?? payload.results ?? [];
  const leaveType = leaveTypes.find((item) => /casual|CL Standard/i.test(`${item.name} ${item.code ?? ""}`));
  expect(leaveType, "Expected a submittable casual leave type for MSS RBAC proof").toBeTruthy();
  let lastPayload: unknown = undefined;
  const candidateOffsets = Array.from({ length: 60 }, (_, index) => index + 1);
  for (const offset of candidateOffsets) {
    const startDate = isoDateFromToday(offset);
    const createResponse = await page.request.post("/api/me/leave-requests", {
      data: {
        leave_type_id: leaveType!.id,
        start_date: startDate,
        end_date: startDate,
        start_day_portion: "full_day",
        end_day_portion: "full_day",
        reason,
      },
    });
    const createPayload = (await createResponse.json().catch(() => ({}))) as { id: string; status: string; start_date?: string[] };
    if (createResponse.ok()) {
      expect(createPayload.status).toBe("pending");
      return createPayload;
    }
    lastPayload = createPayload;
    const payloadText = JSON.stringify(createPayload);
    if (!/overlap|working leave days/i.test(payloadText)) {
      break;
    }
  }
  expect(false, `Expected to create a pending leave request without date overlap: ${JSON.stringify(lastPayload)}`).toBeTruthy();
  throw new Error(`Expected to create a pending leave request without date overlap: ${JSON.stringify(lastPayload)}`);
}

async function createCustomLeaveApproverRole(page: Page, suffix: string) {
  await gotoAuthenticated(page, "/tenant-admin/roles", tenantAdmin);
  await expectPageReady(page, "Roles & Permissions");
  const response = await page.request.post("/api/tenant-admin/roles", {
    data: {
      name: `QA MSS Leave Approver ${suffix}`,
      code: `qa-mss-leave-approver-${suffix}`,
      description: "Browser proof custom MSS leave approver role.",
      is_active: true,
      permission_keys: ["leave.view", "leave.requests.approve"],
    },
  });
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as RolePayload).role.id;
}

async function createCustomAttendanceReviewerRole(page: Page, suffix: string) {
  await gotoAuthenticated(page, "/tenant-admin/roles", tenantAdmin);
  await expectPageReady(page, "Roles & Permissions");
  const response = await page.request.post("/api/tenant-admin/roles", {
    data: {
      name: `QA MSS Attendance Reviewer ${suffix}`,
      code: `qa-mss-attendance-reviewer-${suffix}`,
      description: "Browser proof custom MSS attendance reviewer role.",
      is_active: true,
      permission_keys: ["attendance.view", "attendance.regularization.review"],
    },
  });
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as RolePayload).role.id;
}

async function getEmployeeByCode(page: Page, employeeCode: string) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  await gotoAuthenticated(page, "/hr-admin/employees", hrAdmin);
  const response = await page.request.get(`${apiBaseUrl()}/hr-admin/employees/`, {
    headers: await authHeaders(page),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const employees = (await response.json()) as EmployeeListItem[];
  const matched = employees.find((item) => item.employee_code === employeeCode);
  expect(matched, `Expected employee ${employeeCode} to exist`).toBeTruthy();
  return matched!;
}

async function createApproverEmployeeWithAccess(page: Page, suffix: string, roleId: string) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  await gotoAuthenticated(page, "/hr-admin/employees", hrAdmin);
  const employeeCode = `QA-MSS-${suffix}`;
  const email = `qa.mss.${suffix}@example.test`;
  const employeeResponse = await page.request.post("/api/hr-admin/employees", {
    data: {
      employee_code: employeeCode,
      employment_status: "active",
      first_name: "QA",
      last_name: "Approver",
      work_email: email,
      date_of_joining: "2026-04-01",
    },
  });
  expect(employeeResponse.ok()).toBeTruthy();
  const created = (await employeeResponse.json()) as EmployeePayload;
  const username = `qa.mss.approver.${suffix}`;
  const accessResponse = await page.request.post(`/api/hr-admin/employees/${created.id}/access`, {
    data: {
      username,
      email,
      first_name: "QA",
      last_name: "Approver",
      display_name: "QA Approver",
      is_user_active: true,
      must_change_password: false,
      membership_status: "active",
      is_default_membership: true,
      role_ids: [roleId],
      password: customPassword,
    },
  });
  expect(accessResponse.ok()).toBeTruthy();
  return { ...created, username, password: customPassword };
}

async function topUpRiyaLeaveBalance(page: Page) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  await gotoAuthenticated(page, "/hr-admin/employees", hrAdmin);
  const response = await page.request.get("/api/hr-admin/leave-balances/?q=EMP-0042");
  expect(response.ok(), await response.text()).toBeTruthy();
  const balancePayload = (await response.json()) as LeaveBalanceItem[] | { items?: LeaveBalanceItem[]; results?: LeaveBalanceItem[] };
  const balances = Array.isArray(balancePayload) ? balancePayload : balancePayload.items ?? balancePayload.results ?? [];
  const riyaBalances = balances.filter((item) => item.employee_code === "EMP-0042");
  expect(riyaBalances.length, "Expected Riya to have leave balances for custom MSS proof").toBeGreaterThan(0);
  for (const balance of riyaBalances) {
    const creditResponse = await page.request.post("/api/hr-admin/leave-balances/actions/", {
      data: {
        employee_id: balance.employee_id,
        leave_policy_id: balance.leave_policy_id,
        action: "credit_adjustment",
        units: "20.00",
        reason: "Playwright MSS RBAC certification balance top-up.",
      },
    });
    expect(creditResponse.ok(), await creditResponse.text()).toBeTruthy();
  }
}

async function clearRiyaPendingRegularizations(page: Page) {
  await gotoAuthenticated(page, "/mss/approvals?queue=attendance", manager);
  const response = await page.request.get(`${apiBaseUrl()}/manager/attendance-regularizations/pending/?page_size=100`, {
    headers: await authHeaders(page),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const regularizations = (await response.json()) as AttendanceRegularizationList;
  for (const item of regularizations.items.filter((entry) => entry.employee_code === "EMP-0042" || /Riya Sharma/i.test(entry.employee ?? ""))) {
    if (!item.id) {
      continue;
    }
    const rejectResponse = await page.request.post(`/api/manager/attendance-regularizations/${item.id}/reject`, {
      data: { comment: "Playwright MSS RBAC certification cleanup." },
    });
    expect([200, 404], await rejectResponse.text()).toContain(rejectResponse.status());
  }
}

async function selectRegularizableAttendanceRecord(page: Page) {
  const [recordsResponse, regularizationsResponse] = await Promise.all([
    page.request.get("/api/me/attendance-records"),
    page.request.get(`${apiBaseUrl()}/me/attendance-regularizations/?status=pending&page_size=100`, {
      headers: await authHeaders(page),
    }),
  ]);
  expect(recordsResponse.ok(), await recordsResponse.text()).toBeTruthy();
  expect(regularizationsResponse.ok(), await regularizationsResponse.text()).toBeTruthy();
  const records = (await recordsResponse.json()) as AttendanceRecordOption[];
  const regularizations = (await regularizationsResponse.json()) as AttendanceRegularizationList;
  const pendingRecordIds = new Set(
    regularizations.items
      .filter((item) => item.status === "pending")
      .map((item) => item.attendance_record_id),
  );
  const record = records.find((item) => !item.is_locked && !pendingRecordIds.has(item.id));
  expect(record, "Expected at least one unlocked attendance record without pending regularization.").toBeTruthy();
  return record!;
}

async function createEmployeeRegularization(page: Page, reason: string) {
  await gotoAuthenticated(page, "/ess", employee);
  const record = await selectRegularizableAttendanceRecord(page);
  const response = await page.request.post("/api/me/attendance-regularizations", {
    data: {
      attendance_record_id: record.id,
      requested_status: "remote",
      reason,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as { id: string; status: string };
  expect(response.ok(), JSON.stringify(payload)).toBeTruthy();
  expect(payload.status).toBe("pending");
  return payload;
}

test.describe("MSS RBAC approver certification", () => {
  test.skip(!process.env.HRMS_API_BASE_URL, "MSS RBAC approver proof requires a live HRMS API.");

  test("custom leave approver can approve scoped leave and remains blocked from unrelated HR APIs", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const suffix = String(Date.now());
    const roleId = await createCustomLeaveApproverRole(page, suffix);
    const approver = await createApproverEmployeeWithAccess(page, suffix, roleId);
    const targetEmployee = await getEmployeeByCode(page, "EMP-0042");
    const seedManager = await getEmployeeByCode(page, "EMP-0002");
    const reason = uniqueRef("MSS_RBAC_LEAVE");
    const decisionNote = `${reason}_APPROVED_BY_CUSTOM_ROLE`;
    await topUpRiyaLeaveBalance(page);

    try {
      await gotoAuthenticated(page, "/hr-admin/employees", hrAdmin);
      const managerPatch = await page.request.patch(`/api/hr-admin/employees/${targetEmployee.id}`, {
        data: { reporting_manager_id: approver.id },
      });
      expect(managerPatch.ok()).toBeTruthy();

      const leaveResult = await createEmployeeLeaveRequest(page, reason);

      await gotoAuthenticated(page, `/mss/approvals?queue=leave&leaveId=${leaveResult.id}`, approver);
      await expectPageReady(page, "Manager approvals");
      await expect(page.getByRole("heading", { name: "Leave approvals" })).toBeVisible();
      await expect(card(page, reason)).toBeVisible();
      await expect(card(page, reason)).toContainText("pending");

      const hrDenied = await page.request.get(`${apiBaseUrl()}/hr-admin/employees/`, {
        headers: await authHeaders(page),
      });
      expect(hrDenied.status()).toBe(403);
      expect(JSON.stringify(await hrDenied.json())).toContain("employees.view");

      await page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Selected leave request" }) }).getByRole("button", { name: "Review" }).click();
      const leaveReviewDialog = page.getByRole("dialog", { name: "Review leave approval" });
      await expect(leaveReviewDialog).toBeVisible();
      await field(leaveReviewDialog, "Decision note").fill(decisionNote);
      const approvalResult = await submitAndCapture<{ id: string; status: string }>(
        page,
        `/api/manager/leave-requests/${leaveResult.id}/approve`,
        "POST",
        async () => {
          await leaveReviewDialog.getByRole("button", { name: "Approve request" }).click();
        },
      );
      expect(approvalResult.ok).toBeTruthy();
      expect(approvalResult.requestBody).toMatchObject({ comment: decisionNote });
      expect(approvalResult.payload.status).toBe("approved");
      await expect(page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Pending leave requests" }) })).toContainText("No pending leave approvals.");
      await expectNoHorizontalOverflow(page);
    } finally {
      await gotoAuthenticated(page, "/hr-admin/employees", hrAdmin);
      await page.request.patch(`/api/hr-admin/employees/${targetEmployee.id}`, {
        data: { reporting_manager_id: seedManager.id },
      }).catch(() => null);
    }
  });

  test("custom attendance reviewer can approve scoped regularization and sees attendance-only control center", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const suffix = String(Date.now());
    const roleId = await createCustomAttendanceReviewerRole(page, suffix);
    const reviewer = await createApproverEmployeeWithAccess(page, `att-${suffix}`, roleId);
    const targetEmployee = await getEmployeeByCode(page, "EMP-0042");
    const seedManager = await getEmployeeByCode(page, "EMP-0002");
    const reason = uniqueRef("MSS_RBAC_ATTENDANCE");
    const decisionNote = `${reason}_APPROVED_BY_CUSTOM_ROLE`;
    await clearRiyaPendingRegularizations(page);

    try {
      await gotoAuthenticated(page, "/hr-admin/employees", hrAdmin);
      const managerPatch = await page.request.patch(`/api/hr-admin/employees/${targetEmployee.id}`, {
        data: { reporting_manager_id: reviewer.id },
      });
      expect(managerPatch.ok()).toBeTruthy();

      const regularizationResult = await createEmployeeRegularization(page, reason);

      await gotoAuthenticated(page, "/mss", reviewer);
      await expectPageReady(page, "Manager dashboard");
      await expect(page.getByRole("link", { name: "Attendance approvals" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Review attendance" })).toBeVisible();
      await expect(page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Coverage context" }) })).toContainText("Leave queue rows");
      await expect(page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Coverage context" }) })).toContainText("Hidden");

      await gotoAuthenticated(page, `/mss/approvals?queue=attendance&regId=${regularizationResult.id}`, reviewer);
      await expectPageReady(page, "Manager approvals");
      await expect(page.getByRole("heading", { name: "Pending attendance fixes" })).toBeVisible();
      await expect(card(page, reason)).toBeVisible();
      await expect(card(page, reason)).toContainText("pending");

      const leaveDenied = await page.request.get(`${apiBaseUrl()}/manager/leave-requests/pending/`, {
        headers: await authHeaders(page),
      });
      expect(leaveDenied.status()).toBe(403);
      expect(JSON.stringify(await leaveDenied.json())).toContain("leave.view");

      await page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Selected attendance request" }) }).getByRole("button", { name: "Review" }).click();
      const attendanceReviewDialog = page.getByRole("dialog", { name: "Review attendance approval" });
      await expect(attendanceReviewDialog).toBeVisible();
      await field(attendanceReviewDialog, "Decision note").fill(decisionNote);
      const approvalResult = await submitAndCapture<{ id: string; status: string }>(
        page,
        `/api/manager/attendance-regularizations/${regularizationResult.id}/approve`,
        "POST",
        async () => {
          await attendanceReviewDialog.getByRole("button", { name: "Approve request" }).click();
        },
      );
      expect(approvalResult.ok).toBeTruthy();
      expect(approvalResult.requestBody).toMatchObject({ comment: decisionNote });
      expect(approvalResult.payload.status).toBe("approved");
      await expect(page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Pending attendance fixes" }) })).toContainText("No pending regularizations.");
      await expectNoHorizontalOverflow(page);
    } finally {
      await gotoAuthenticated(page, "/hr-admin/employees", hrAdmin);
      await page.request.patch(`/api/hr-admin/employees/${targetEmployee.id}`, {
        data: { reporting_manager_id: seedManager.id },
      }).catch(() => null);
    }
  });
});
