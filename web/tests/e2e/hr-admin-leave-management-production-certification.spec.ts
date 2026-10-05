import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin, manager, type Persona } from "../helpers/staging-auth";

type EmployeeListItem = {
  id: string;
  employee_code: string;
  full_name?: string;
};

type LeaveBalanceItem = {
  id: string;
  employee_id: string;
  employee_code: string;
  leave_policy_id: string;
  leave_policy_name: string;
  leave_type_id: string;
  leave_type_name: string;
  period_year: number;
  closing_balance: string;
  consumed_amount: string;
  reserved_amount: string;
};

type LeavePolicyPayload = {
  id: string;
  name: string;
  code: string;
};

type LeaveTypePayload = {
  id: string;
  name: string;
  code: string;
};

type LeaveRequestPayload = {
  id: string;
  status: string;
  workflow_reference?: string;
};

type ManagerPendingLeaveItem = {
  id: string;
  employee_code?: string;
  reason?: string;
};

type ManagerPendingLeaveList = {
  items?: ManagerPendingLeaveItem[];
};

function apiBaseUrl() {
  return process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
}

function uniqueSuffix() {
  return String(Date.now()).slice(-8);
}

function isoDateFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function numeric(value: string) {
  return Number.parseFloat(value);
}

function field(scope: Page | Locator, label: string, index = 0) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").nth(index);
}

function card(page: Page, text: string | RegExp) {
  return page.locator("article.record-card, a.tableish__row, button.leave-request-card").filter({ hasText: text }).first();
}

async function openManagerReviewForLeaveReason(page: Page, reason: string) {
  for (let pageIndex = 0; pageIndex < 5; pageIndex += 1) {
    const requestCard = page.locator("article.tableish__row").filter({ hasText: reason }).first();
    if (await requestCard.isVisible().catch(() => false)) {
      const reviewButton = requestCard.getByRole("button", { name: "Review" });
      await expect(reviewButton).toBeVisible();
      await expect(reviewButton).toBeEnabled();
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      await page.waitForTimeout(300);
      await reviewButton.click();
      const reviewDialog = page.getByRole("dialog", { name: "Leave approval review" });
      await expect(reviewDialog).toBeVisible();
      return reviewDialog;
    }
    const nextLink = page.getByRole("link", { name: "Next" });
    if (!(await nextLink.isVisible().catch(() => false)) || (await nextLink.getAttribute("aria-disabled")) === "true") {
      break;
    }
    const nextHref = await nextLink.getAttribute("href");
    if (!nextHref) {
      break;
    }
    await page.goto(nextHref, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Manager approvals" })).toBeVisible();
  }
  throw new Error(`Could not find pending manager leave request for ${reason}.`);
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

async function apiGet<T>(page: Page, path: string) {
  const response = await page.request.get(`${apiBaseUrl()}${path}`, {
    headers: await authHeaders(page),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as T;
}

async function apiPost<T>(page: Page, path: string, data: unknown, expectedStatus = 201) {
  const response = await page.request.post(`${apiBaseUrl()}${path}`, {
    headers: await authHeaders(page),
    data,
  });
  expect(response.status(), await response.text()).toBe(expectedStatus);
  return (await response.json()) as T;
}

async function apiPatch<T>(page: Page, path: string, data: unknown) {
  const response = await page.request.patch(`${apiBaseUrl()}${path}`, {
    headers: await authHeaders(page),
    data,
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as T;
}

async function getEmployeeByCode(page: Page, employeeCode: string) {
  const payload = await apiGet<EmployeeListItem[] | { items?: EmployeeListItem[]; results?: EmployeeListItem[] }>(
    page,
    `/hr-admin/employees/?q=${encodeURIComponent(employeeCode)}`,
  );
  const employees = Array.isArray(payload) ? payload : payload.items ?? payload.results ?? [];
  const matched = employees.find((item) => item.employee_code === employeeCode);
  expect(matched, `Expected employee ${employeeCode} to exist`).toBeTruthy();
  return matched!;
}

async function getBalances(page: Page, employeeId: string, leavePolicyId: string) {
  return apiGet<LeaveBalanceItem[]>(
    page,
    `/hr-admin/leave-balances/?employee_id=${encodeURIComponent(employeeId)}&leave_policy_id=${encodeURIComponent(leavePolicyId)}`,
  );
}

async function clearGeneratedPendingLeaveRequests(page: Page) {
  await authenticateForSetup(page, manager);
  const response = await page.request.get(`${apiBaseUrl()}/manager/leave-requests/pending/?page_size=100`, {
    headers: await authHeaders(page),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const payload = (await response.json()) as ManagerPendingLeaveList | ManagerPendingLeaveItem[];
  const items = Array.isArray(payload) ? payload : payload.items ?? [];
  for (const item of items.filter((entry) => (
    entry.employee_code === "EMP-0042" && /^PW_LEAVE_(E2E|EVIDENCE)_/.test(entry.reason ?? "")
  ))) {
    const rejectResponse = await page.request.post(`${apiBaseUrl()}/manager/leave-requests/${item.id}/reject/`, {
      headers: await authHeaders(page),
      data: { comment: "Playwright leave certification cleanup." },
    });
    expect([200, 404], await rejectResponse.text()).toContain(rejectResponse.status());
  }
}

async function setupDedicatedLeavePolicy(page: Page, options: { requiresAttachment?: boolean } = {}) {
  await clearGeneratedPendingLeaveRequests(page);
  await authenticateForSetup(page, hrAdmin);
  const targetEmployee = await getEmployeeByCode(page, "EMP-0042");
  const seedManager = await getEmployeeByCode(page, "EMP-0002");

  await apiPatch<EmployeeListItem>(page, `/hr-admin/employees/${targetEmployee.id}/`, {
    reporting_manager_id: seedManager.id,
  });

  const suffix = uniqueSuffix();
  const leaveType = await apiPost<LeaveTypePayload>(page, "/hr-admin/leave-types/", {
    code: `pw-prod-leave-${suffix}`,
    name: `${options.requiresAttachment ? "PW Evidence Leave" : "PW Production Leave"} ${suffix}`,
    short_code: `PWL${suffix.slice(-3)}`,
    category: "paid",
    unit: "day",
    color_code: "#2563eb",
    description: "Playwright production certification leave type.",
    is_active: true,
    requires_attachment: Boolean(options.requiresAttachment),
    allow_negative_balance: false,
    is_approval_required: true,
  });

  const leavePolicy = await apiPost<LeavePolicyPayload>(page, "/hr-admin/leave-policies/", {
    leave_type_id: leaveType.id,
    code: `pw-prod-policy-${suffix}`,
    name: `${options.requiresAttachment ? "PW Evidence Policy" : "PW Production Policy"} ${suffix}`,
    status: "active",
    accrual_frequency: "yearly",
    annual_entitlement: "6.00",
    max_carry_forward: "0.00",
    max_consecutive_days: "3.00",
    min_days_per_request: "0.50",
    notice_days_required: 0,
    allow_half_day: true,
    allow_backdated_application: false,
    allow_weekend_holiday_overlap: true,
    sandwich_rule_enabled: false,
    is_probation_eligible: true,
    minimum_service_days: 0,
    config_snapshot: {
      approval: { default_route: "manager_only" },
      entitlement: {
        grant_mode: "upfront",
        proration_mode: "none",
        policy_year_start_month: 1,
        policy_year_start_day: 1,
        carry_forward_mode: "none",
        probation_accrual_mode: "accrue",
      },
      lifecycle: {
        allow_employee_withdraw_pending: true,
        allow_employee_cancel_approved: false,
      },
    },
  });

  await apiPost(page, "/hr-admin/leave-policy-assignments/", {
    leave_policy_id: leavePolicy.id,
    employee_id: targetEmployee.id,
    priority: 10,
    is_active: true,
  });

  const balances = await getBalances(page, targetEmployee.id, leavePolicy.id);
  expect(balances.length, "Assignment should create at least one leave balance").toBeGreaterThan(0);
  expect(balances.some((balance) => numeric(balance.closing_balance) >= 6)).toBeTruthy();

  return { suffix, leaveType, leavePolicy, targetEmployee };
}

test.describe("HR Admin Leave Management production certification", () => {
  test.setTimeout(5 * 60 * 1000);
  test.skip(!process.env.HRMS_API_BASE_URL, "Leave production certification requires a live HRMS API.");

  test("certifies setup, assignment, ESS submission, MSS approval, balances, recovery, and responsive UX", async ({ page }) => {
    const { leaveType, leavePolicy, targetEmployee, suffix } = await setupDedicatedLeavePolicy(page);
    const reason = `PW_LEAVE_E2E_${suffix}`;
    const decisionNote = `${reason}_APPROVED`;
    const startDate = isoDateFromToday(2 + (Number(suffix.slice(-1)) % 5));
    const requestPeriodYear = Number(startDate.slice(0, 4));

    await gotoAuthenticated(page, `/hr-admin/leave-types?q=${encodeURIComponent(leaveType.name)}`, hrAdmin);
    await expectPageReady(page, "Leave types");
    await expect(page.getByText(leaveType.name).first()).toBeVisible();

    await gotoAuthenticated(page, `/hr-admin/leave-policies?q=${encodeURIComponent(leavePolicy.name)}`, hrAdmin);
    await expectPageReady(page, "Leave policies");
    await expect(page.getByText(leavePolicy.name).first()).toBeVisible();

    await gotoAuthenticated(page, `/hr-admin/leave-policy-assignments?q=${encodeURIComponent(leavePolicy.name)}`, hrAdmin);
    await expectPageReady(page, "Leave assignments");
    await expect(page.getByText(leavePolicy.name).first()).toBeVisible();
    await expect(page.getByText("Employee: EMP-0042").or(page.getByText("EMP-0042")).first()).toBeVisible();

    await gotoAuthenticated(page, `/hr-admin/leave-balances?q=${encodeURIComponent(leaveType.name)}`, hrAdmin);
    await expectPageReady(page, "Leave balances");
    await expect(page.getByText(leaveType.name).first()).toBeVisible();
    await expect(page.getByText(targetEmployee.employee_code).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectPageReady(page, "Leave");
    await expect(page.getByRole("heading", { name: "Balances" })).toBeVisible();
    await expect(page.getByText(leaveType.name).first()).toBeVisible();
    await page.getByRole("button", { name: "Apply leave" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Apply leave" });
    await expect(dialog).toBeVisible();
    await field(dialog, "Leave type").selectOption(leaveType.id);
    await field(dialog, "Start date").fill(startDate);
    await field(dialog, "End date").fill(isoDateFromToday(1));
    await expect(dialog.getByText("Check dates.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Submit leave" })).toBeDisabled();

    await field(dialog, "End date").fill(startDate);
    await field(dialog, "Reason").fill(reason);

    const [leaveResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/me/leave-requests") && response.request().method() === "POST"),
      dialog.getByRole("button", { name: "Submit leave" }).click(),
    ]);
    expect(leaveResponse.status()).toBe(201);
    const leaveRequest = (await leaveResponse.json()) as LeaveRequestPayload;
    expect(leaveRequest.status).toBe("pending");
    await expect(dialog.getByText("Submitted.", { exact: true })).toBeVisible();

    await authenticateForSetup(page, hrAdmin);
    const reservedBalances = await getBalances(page, targetEmployee.id, leavePolicy.id);
    const pendingBalance = reservedBalances.find((balance) => balance.period_year === requestPeriodYear);
    expect(pendingBalance, `Expected pending balance for ${requestPeriodYear}`).toBeTruthy();
    expect(numeric(pendingBalance!.reserved_amount)).toBe(1);
    expect(numeric(pendingBalance!.consumed_amount)).toBe(0);

    await authenticateForSetup(page, manager);
    const approvalResponse = await page.request.post(`${apiBaseUrl()}/manager/leave-requests/${leaveRequest.id}/approve/`, {
      headers: await authHeaders(page),
      data: { comment: decisionNote },
    });
    expect(approvalResponse.ok(), await approvalResponse.text()).toBeTruthy();
    const approvalPayload = (await approvalResponse.json()) as LeaveRequestPayload;
    expect(approvalPayload.status).toBe("approved");

    await authenticateForSetup(page, hrAdmin);
    const approvedBalances = await getBalances(page, targetEmployee.id, leavePolicy.id);
    const approvedBalance = approvedBalances.find((balance) => balance.period_year === requestPeriodYear);
    expect(approvedBalance, `Expected approved balance for ${requestPeriodYear}`).toBeTruthy();
    expect(numeric(approvedBalance!.reserved_amount)).toBe(0);
    expect(numeric(approvedBalance!.consumed_amount)).toBe(1);
    expect(numeric(approvedBalance!.closing_balance)).toBe(5);

    await gotoAuthenticated(page, `/ess/leave?status=approved&requestId=${leaveRequest.id}`, employee);
    await expectPageReady(page, "Leave");
    await expect(card(page, reason)).toBeVisible();
    await expect(card(page, reason)).toContainText("approved");
    let detail = page.getByRole("dialog", { name: "Leave request detail" });
    if (!(await detail.isVisible().catch(() => false))) {
      await card(page, reason).click();
      detail = page.getByRole("dialog", { name: "Leave request detail" });
    }
    await expect(detail).toBeVisible();
    await expect(detail.getByText(leavePolicy.name).first()).toBeVisible();
    await expect(detail.getByText(decisionNote).first()).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
  });

  test("certifies attachment-required leave evidence is uploaded and visible to employee and manager", async ({ page }) => {
    const { leaveType, suffix } = await setupDedicatedLeavePolicy(page, { requiresAttachment: true });
    const reason = `PW_LEAVE_EVIDENCE_${suffix}`;
    const startDate = isoDateFromToday(7 + (Number(suffix.slice(-1)) % 5));
    const fileName = `leave-evidence-${suffix}.txt`;

    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectPageReady(page, "Leave");
    await page.getByRole("button", { name: "Apply leave" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Apply leave" });
    await expect(dialog).toBeVisible();
    await field(dialog, "Leave type").selectOption(leaveType.id);
    await field(dialog, "Start date").fill(startDate);
    await field(dialog, "End date").fill(startDate);
    await field(dialog, "Reason").fill(reason);
    await expect(dialog.getByText("Evidence required.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Submit leave" })).toBeDisabled();

    await field(dialog, "Evidence file").setInputFiles({
      name: fileName,
      mimeType: "text/plain",
      buffer: Buffer.from(`Playwright leave evidence ${suffix}`),
    });
    await expect(dialog.getByText(fileName)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Submit leave" })).toBeEnabled();

    const [leaveResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/me/leave-requests") && response.request().method() === "POST"),
      dialog.getByRole("button", { name: "Submit leave" }).click(),
    ]);
    expect(leaveResponse.status()).toBe(201);
    const leaveRequest = (await leaveResponse.json()) as LeaveRequestPayload;
    expect(leaveRequest.status).toBe("pending");

    await gotoAuthenticated(page, `/ess/leave?status=pending&requestId=${leaveRequest.id}`, employee);
    await expectPageReady(page, "Leave");
    let detail = page.getByRole("dialog", { name: "Leave request detail" });
    if (!(await detail.isVisible().catch(() => false))) {
      await card(page, reason).click();
      detail = page.getByRole("dialog", { name: "Leave request detail" });
    }
    await expect(detail.getByText(fileName).first()).toBeVisible();
    const employeeDownload = detail.locator(`a[href*="/api/me/leave-requests/${leaveRequest.id}/attachments/"][href$="/download"]`).first();
    await expect(employeeDownload).toBeVisible();
    const employeeDownloadResponse = await page.request.get((await employeeDownload.getAttribute("href")) ?? "");
    expect(employeeDownloadResponse.ok()).toBeTruthy();

    await authenticateForSetup(page, manager);
    await page.goto("/mss/approvals?queue=leave&leavePage=1", { waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Manager approvals");
    const reviewDialog = await openManagerReviewForLeaveReason(page, reason);
    await expect(reviewDialog.getByRole("heading", { name: "Evidence" })).toBeVisible();
    await expect(reviewDialog.getByText(fileName).first()).toBeVisible();
    const managerDownload = reviewDialog.locator(`a[href*="/api/manager/leave-requests/${leaveRequest.id}/attachments/"][href$="/download"]`).first();
    await expect(managerDownload).toBeVisible();
    const managerDownloadResponse = await page.request.get((await managerDownload.getAttribute("href")) ?? "");
    expect(managerDownloadResponse.ok()).toBeTruthy();
    await expectNoHorizontalOverflow(page);
  });
});
