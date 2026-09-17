import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin, tenantAdmin } from "../helpers/staging-auth";

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

const customPassword = "Password@123";

function uniqueRef(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function field(scope: Page | Locator, label: string, index = 0) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").nth(index);
}

function card(page: Page, text: string | RegExp) {
  return page.locator("article.record-card, a.tableish__row").filter({ hasText: text }).first();
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
  return {
    ok: response.ok(),
    status: response.status(),
    requestBody: response.request().postDataJSON() as unknown,
    payload: (await response.json().catch(() => ({}))) as T,
  };
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
  await gotoAuthenticated(page, "/hr-admin/employees", hrAdmin);
  const response = await page.request.get("/api/hr-admin/employees");
  expect(response.ok()).toBeTruthy();
  const employees = (await response.json()) as EmployeeListItem[];
  const matched = employees.find((item) => item.employee_code === employeeCode);
  expect(matched, `Expected employee ${employeeCode} to exist`).toBeTruthy();
  return matched!;
}

async function createApproverEmployeeWithAccess(page: Page, suffix: string, roleId: string) {
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

test.describe("MSS RBAC approver certification", () => {
  test.skip(!process.env.HRMS_API_BASE_URL, "MSS RBAC approver proof requires a live HRMS API.");

  test("custom leave approver can approve scoped leave and remains blocked from unrelated HR APIs", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const suffix = String(Date.now());
    const roleId = await createCustomLeaveApproverRole(page, suffix);
    const approver = await createApproverEmployeeWithAccess(page, suffix, roleId);
    const targetEmployee = await getEmployeeByCode(page, "EMP-0042");
    const seedManager = await getEmployeeByCode(page, "EMP-0043");
    const reason = uniqueRef("MSS_RBAC_LEAVE");
    const decisionNote = `${reason}_APPROVED_BY_CUSTOM_ROLE`;

    try {
      await gotoAuthenticated(page, "/hr-admin/employees", hrAdmin);
      const managerPatch = await page.request.patch(`/api/hr-admin/employees/${targetEmployee.id}`, {
        data: { reporting_manager_id: approver.id },
      });
      expect(managerPatch.ok()).toBeTruthy();

      await gotoAuthenticated(page, "/ess", employee);
      await expectPageReady(page, "Self service");
      const startDate = isoDateFromToday(85);
      await field(page, "Start date").fill(startDate);
      await field(page, "End date").fill(startDate);
      await field(page, "Reason").fill(reason);
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

      await gotoAuthenticated(page, `/mss/approvals?queue=leave&leaveId=${leaveResult.payload.id}`, approver);
      await expectPageReady(page, "Manager inbox");
      await expect(page.getByRole("heading", { name: "Leave approvals" })).toBeVisible();
      await expect(card(page, reason)).toBeVisible();
      await expect(card(page, reason)).toContainText("pending");

      const hrDenied = await page.request.get("/api/hr-admin/employees");
      expect(hrDenied.status()).toBe(403);
      expect(JSON.stringify(await hrDenied.json())).toContain("employees.view");

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
    const seedManager = await getEmployeeByCode(page, "EMP-0043");
    const reason = uniqueRef("MSS_RBAC_ATTENDANCE");
    const decisionNote = `${reason}_APPROVED_BY_CUSTOM_ROLE`;

    try {
      await gotoAuthenticated(page, "/hr-admin/employees", hrAdmin);
      const managerPatch = await page.request.patch(`/api/hr-admin/employees/${targetEmployee.id}`, {
        data: { reporting_manager_id: reviewer.id },
      });
      expect(managerPatch.ok()).toBeTruthy();

      await gotoAuthenticated(page, "/ess", employee);
      await expectPageReady(page, "Self service");
      await field(page, "Requested status").selectOption("remote");
      await field(page, "Reason", 1).fill(reason);
      const regularizationResult = await submitAndCapture<{ id: string; status: string }>(
        page,
        "/api/me/attendance-regularizations",
        "POST",
        async () => {
          await page.getByRole("button", { name: "Submit regularization" }).click();
        },
      );
      expect(regularizationResult.ok).toBeTruthy();
      expect(regularizationResult.payload.status).toBe("pending");

      await gotoAuthenticated(page, "/mss", reviewer);
      await expectPageReady(page, "Manager control center");
      await expect(page.getByRole("link", { name: "Attendance queue" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Leave queue" })).toHaveCount(0);

      await gotoAuthenticated(page, `/mss/approvals?queue=attendance&regId=${regularizationResult.payload.id}`, reviewer);
      await expectPageReady(page, "Manager inbox");
      await expect(page.getByRole("heading", { name: "Attendance regularizations" })).toBeVisible();
      await expect(card(page, reason)).toBeVisible();
      await expect(card(page, reason)).toContainText("pending");

      const leaveDenied = await page.request.get("/api/manager/leave-requests/pending");
      expect(leaveDenied.status()).toBe(403);
      expect(JSON.stringify(await leaveDenied.json())).toContain("leave.view");

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
    } finally {
      await gotoAuthenticated(page, "/hr-admin/employees", hrAdmin);
      await page.request.patch(`/api/hr-admin/employees/${targetEmployee.id}`, {
        data: { reporting_manager_id: seedManager.id },
      }).catch(() => null);
    }
  });
});
