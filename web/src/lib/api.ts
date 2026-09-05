import type {
  AttendanceRegularizationItem,
  EmployeeDashboard,
  EssAttendanceRegularizationListResponse,
  EssDocumentCenterResponse,
  EssLeaveRequestListResponse,
  HrAdminDashboard,
  HrAdminAttendanceOperationOptions,
  HrAdminAttendanceRegularizationListResponse,
  HrAdminAttendanceRecord,
  HrAdminAttendanceRecordListResponse,
  HrAdminEmployeeShiftAssignment,
  HrAdminShiftRosterTemplate,
  HrAdminShiftRosterRollout,
  HrAdminEmployeeDetail,
  HrAdminEmployeeAccessDetail,
  HrAdminEmployeeAccessOptions,
  HrAdminEmployeeFormOptions,
  HrAdminGovernanceFields,
  HrAdminEmployeeListItem,
  HrAdminAttendancePolicy,
  HrAdminDocumentCategory,
  HrAdminDocumentOptions,
  HrAdminDocumentRequirementRule,
  HrAdminEmployeeDocument,
  HrAdminEmployeeDocumentListResponse,
  HrAdminGeneratedLetter,
  HrAdminGeneratedLetterListResponse,
  HrAdminExit,
  HrAdminExitListResponse,
  HrAdminLifecycleOptions,
  HrAdminLifecycleQueueListResponse,
  HrAdminMovement,
  HrAdminMovementListResponse,
  HrAdminNotification,
  HrAdminNotificationDiagnostics,
  HrAdminNotificationChannelConfiguration,
  HrAdminNotificationEventDefinition,
  HrAdminNotificationListResponse,
  HrAdminNotificationOptions,
  HrAdminNotificationTemplate,
  HrAdminOnboarding,
  HrAdminOnboardingListResponse,
  HrAdminPayrollCalculationSetupResponse,
  HrAdminPayrollAdjustmentSetupResponse,
  HrAdminPayrollFinanceHandoffSetupResponse,
  HrAdminPayrollOutputSetupResponse,
  HrAdminPayrollReviewSetupResponse,
  HrAdminPayrollSettlementSetupResponse,
  HrAdminPayrollReadinessListResponse,
  HrAdminPayrollInputSnapshotSetupResponse,
  HrAdminPayrollRulesSetupResponse,
  HrAdminPayrollSetupResponse,
  HrAdminProbationReview,
  HrAdminProbationReviewListResponse,
  HrAdminSalarySetupResponse,
  HrAdminShift,
  HrAdminHolidayCalendar,
  HrAdminLeavePolicy,
  HrAdminLeaveBalance,
  HrAdminLeaveBalanceTransaction,
  HrAdminOrganizationFormOptions,
  HrAdminLeaveType,
  HrAdminPolicyOptions,
  HrAdminScopedAssignment,
  HrAdminWorkflowOptions,
  HrAdminWorkflowTrace,
  HrAdminWorkflowTraceListResponse,
  HrAdminWorkflowTemplate,
  HrAdminWorkflowTemplateAssignment,
  HrAdminOrganizationSnapshot,
  LeaveRequestItem,
  ManagerAttendanceApprovalListResponse,
  ManagerLeaveApprovalListResponse,
  ManagerTeamSummary,
  SessionUser,
} from "@/lib/types";
import { API_BASE_URL, BEARER_TOKEN, DEMO_DATA_ENABLED } from "@/lib/runtime-flags";
import { cookies } from "next/headers";

type ApiState = "live" | "demo";

async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get("hrms_access_token")?.value || BEARER_TOKEN;
}

function buildApiError(path: string, detail: string) {
  return new Error(`[api] ${path}: ${detail}`);
}

async function apiGet<T>(path: string): Promise<{ data: T; state: ApiState }> {
  if (!API_BASE_URL) {
    if (DEMO_DATA_ENABLED) {
      return { data: getDemoData<T>(path), state: "demo" };
    }

    throw buildApiError(path, "HRMS_API_BASE_URL is not configured and demo mode is disabled.");
  }

  const token = await getAccessToken();
  if (!token) {
    throw buildApiError(path, "No access token is available for this workspace request.");
  }

  try {
    const result = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Authorization: `Token ${token}`,
      },
      cache: "no-store",
    });

    if (!result.ok) {
      throw buildApiError(path, `Live API request failed with status ${result.status}.`);
    }

    return { data: (await result.json()) as T, state: "live" };
  } catch (error) {
    if (DEMO_DATA_ENABLED && error instanceof TypeError) {
      return { data: getDemoData<T>(path), state: "demo" };
    }

    throw error;
  }
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === false) {
      return;
    }
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export async function getEssDashboard(params?: {
  leave_status?: string;
  leave_page?: number;
  leave_page_size?: number;
  regularization_status?: string;
  regularization_page?: number;
  regularization_page_size?: number;
}) {
  const [dashboard, leaveRequests, regularizations] = await Promise.all([
    apiGet<EmployeeDashboard>("/me/dashboard/"),
    apiGet<EssLeaveRequestListResponse>(`/me/leave-requests/${buildQueryString({
      status: params?.leave_status && params.leave_status !== "all" ? params.leave_status : undefined,
      page: params?.leave_page ?? 1,
      page_size: params?.leave_page_size ?? 10,
    })}`),
    apiGet<EssAttendanceRegularizationListResponse>(`/me/attendance-regularizations/${buildQueryString({
      status: params?.regularization_status && params.regularization_status !== "all" ? params.regularization_status : undefined,
      page: params?.regularization_page ?? 1,
      page_size: params?.regularization_page_size ?? 10,
    })}`),
  ]);

  return {
    dashboard: dashboard.data,
    leaveRequests: leaveRequests.data,
    regularizations: regularizations.data,
    state: dashboard.state === "live" && leaveRequests.state === "live" && regularizations.state === "live" ? "live" : "demo",
  };
}

export async function getEssDocumentCenter(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  verification_status?: string;
  category_id?: string;
  expiry_filter?: string;
}) {
  return apiGet<EssDocumentCenterResponse>(`/me/document-center/${buildQueryString(params ?? {})}`);
}

export async function getEssNotifications(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  status?: string;
  channel?: string;
  priority?: string;
  subject_type?: string;
}) {
  return apiGet<HrAdminNotificationListResponse>(`/me/notifications/${buildQueryString(params ?? {})}`);
}

export async function getMssApprovalInbox(params?: {
  leave_page?: number;
  leave_page_size?: number;
  regularization_page?: number;
  regularization_page_size?: number;
}) {
  const [summary, pendingLeave, pendingRegularizations] = await Promise.all([
    apiGet<ManagerTeamSummary>("/manager/team-summary/"),
    apiGet<ManagerLeaveApprovalListResponse>(`/manager/leave-requests/pending/${buildQueryString({
      page: params?.leave_page ?? 1,
      page_size: params?.leave_page_size ?? 10,
    })}`),
    apiGet<ManagerAttendanceApprovalListResponse>(`/manager/attendance-regularizations/pending/${buildQueryString({
      page: params?.regularization_page ?? 1,
      page_size: params?.regularization_page_size ?? 10,
    })}`),
  ]);

  return {
    summary: summary.data,
    pendingLeave: pendingLeave.data,
    pendingRegularizations: pendingRegularizations.data,
    state: summary.state === "live" && pendingLeave.state === "live" && pendingRegularizations.state === "live" ? "live" : "demo",
  };
}

export async function getMssNotifications(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  status?: string;
  channel?: string;
  priority?: string;
  subject_type?: string;
}) {
  return apiGet<HrAdminNotificationListResponse>(`/manager/notifications/${buildQueryString(params ?? {})}`);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!API_BASE_URL) {
    return null;
  }

  const token = await getAccessToken();
  if (!token) {
    return null;
  }

  try {
    const result = await fetch(`${API_BASE_URL}/auth/session/`, {
      headers: {
        Authorization: `Token ${token}`,
      },
      cache: "no-store",
    });
    if (!result.ok) {
      return null;
    }
    return (await result.json()) as SessionUser;
  } catch {
    return null;
  }
}

export async function getHrAdminEmployees() {
  return apiGet<HrAdminEmployeeListItem[]>("/hr-admin/employees/");
}

export async function getHrAdminDashboard() {
  return apiGet<HrAdminDashboard>("/hr-admin/dashboard/");
}

export async function getHrAdminPayrollReadiness(params?: {
  q?: string;
  status?: string;
  period_start?: string;
  period_end?: string;
  page?: number;
  page_size?: number;
}) {
  return apiGet<HrAdminPayrollReadinessListResponse>(`/hr-admin/payroll-readiness/${buildQueryString(params ?? {})}`);
}

export async function getHrAdminPayrollSetup() {
  return apiGet<HrAdminPayrollSetupResponse>("/hr-admin/payroll-setup/");
}

export async function getHrAdminSalarySetup() {
  return apiGet<HrAdminSalarySetupResponse>("/hr-admin/salary-setup/");
}

export async function getHrAdminPayrollInputSnapshotSetup() {
  return apiGet<HrAdminPayrollInputSnapshotSetupResponse>("/hr-admin/payroll-input-snapshot-setup/");
}

export async function getHrAdminPayrollAdjustmentSetup() {
  return apiGet<HrAdminPayrollAdjustmentSetupResponse>("/hr-admin/payroll-adjustment-setup/");
}

export async function getHrAdminPayrollSettlementSetup() {
  return apiGet<HrAdminPayrollSettlementSetupResponse>("/hr-admin/payroll-settlement-setup/");
}

export async function getHrAdminPayrollRulesSetup() {
  return apiGet<HrAdminPayrollRulesSetupResponse>("/hr-admin/payroll-rules-setup/");
}

export async function getHrAdminPayrollCalculationSetup() {
  return apiGet<HrAdminPayrollCalculationSetupResponse>("/hr-admin/payroll-calculation-setup/");
}

export async function getHrAdminPayrollReviewSetup() {
  return apiGet<HrAdminPayrollReviewSetupResponse>("/hr-admin/payroll-review-setup/");
}

export async function getHrAdminPayrollOutputSetup() {
  return apiGet<HrAdminPayrollOutputSetupResponse>("/hr-admin/payroll-output-setup/");
}

export async function getHrAdminPayrollFinanceHandoffSetup() {
  return apiGet<HrAdminPayrollFinanceHandoffSetupResponse>("/hr-admin/payroll-finance-handoff-setup/");
}

export async function getHrAdminEmployeeDetail(employeeId: string) {
  return apiGet<HrAdminEmployeeDetail>(`/hr-admin/employees/${employeeId}/`);
}

export async function getHrAdminOrganizationSnapshot() {
  return apiGet<HrAdminOrganizationSnapshot>("/hr-admin/organization/");
}

export async function getHrAdminEmployeeFormOptions() {
  return apiGet<HrAdminEmployeeFormOptions>("/hr-admin/employees/options/");
}

export async function getHrAdminEmployeeAccessOptions() {
  return apiGet<HrAdminEmployeeAccessOptions>("/hr-admin/employees/access/options/");
}

export async function getHrAdminEmployeeAccessDetail(employeeId: string) {
  return apiGet<HrAdminEmployeeAccessDetail>(`/hr-admin/employees/${employeeId}/access/`);
}

export async function getHrAdminOrganizationFormOptions() {
  return apiGet<HrAdminOrganizationFormOptions>("/hr-admin/organization/options/");
}

export async function getHrAdminOrganizationItem(section: string, itemId: string) {
  return apiGet(`/hr-admin/organization/${section}/${itemId}/`);
}

export async function getHrAdminPolicyOptions() {
  return apiGet<HrAdminPolicyOptions>("/hr-admin/policy-options/");
}

export async function getHrAdminLeaveTypes() {
  return apiGet<HrAdminLeaveType[]>("/hr-admin/leave-types/");
}

export async function getHrAdminLeaveType(itemId: string) {
  return apiGet<HrAdminLeaveType>(`/hr-admin/leave-types/${itemId}/`);
}

export async function getHrAdminAttendancePolicies() {
  return apiGet<HrAdminAttendancePolicy[]>("/hr-admin/attendance-policies/");
}

export async function getHrAdminAttendanceOperationOptions() {
  return apiGet<HrAdminAttendanceOperationOptions>("/hr-admin/attendance-operations/options/");
}

export async function getHrAdminShifts() {
  return apiGet<HrAdminShift[]>("/hr-admin/shifts/");
}

export async function getHrAdminShift(itemId: string) {
  return apiGet<HrAdminShift>(`/hr-admin/shifts/${itemId}/`);
}

export async function getHrAdminHolidayCalendars() {
  return apiGet<HrAdminHolidayCalendar[]>("/hr-admin/holiday-calendars/");
}

export async function getHrAdminHolidayCalendar(itemId: string) {
  return apiGet<HrAdminHolidayCalendar>(`/hr-admin/holiday-calendars/${itemId}/`);
}

export async function getHrAdminAttendanceRecords(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  status?: string;
  source?: string;
  lock_state?: string;
  regularized_state?: string;
  late_only?: boolean;
}) {
  return apiGet<HrAdminAttendanceRecordListResponse>(`/hr-admin/attendance-records/${buildQueryString(params ?? {})}`);
}

export async function getHrAdminAttendanceRecord(itemId: string) {
  return apiGet<HrAdminAttendanceRecord>(`/hr-admin/attendance-records/${itemId}/`);
}

export async function getHrAdminAttendanceRegularizations(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  status?: string;
  requested_status?: string;
  current_status?: string;
}) {
  return apiGet<HrAdminAttendanceRegularizationListResponse>(`/hr-admin/attendance-regularizations/${buildQueryString(params ?? {})}`);
}

export async function getHrAdminAttendanceRegularization(itemId: string) {
  return apiGet<AttendanceRegularizationItem>(`/hr-admin/attendance-regularizations/${itemId}/`);
}

export async function getHrAdminAttendancePolicy(itemId: string) {
  return apiGet<HrAdminAttendancePolicy>(`/hr-admin/attendance-policies/${itemId}/`);
}

export async function getHrAdminLeavePolicies() {
  return apiGet<HrAdminLeavePolicy[]>("/hr-admin/leave-policies/");
}

export async function getHrAdminLeavePolicy(itemId: string) {
  return apiGet<HrAdminLeavePolicy>(`/hr-admin/leave-policies/${itemId}/`);
}

export async function getHrAdminLeavePolicyAssignments() {
  return apiGet<HrAdminScopedAssignment[]>("/hr-admin/leave-policy-assignments/");
}

export async function getHrAdminLeaveBalances(params?: {
  employee_id?: string;
  leave_policy_id?: string;
  q?: string;
}) {
  return apiGet<HrAdminLeaveBalance[]>(`/hr-admin/leave-balances/${buildQueryString(params ?? {})}`);
}

export async function getHrAdminLeaveBalanceTransactions(params?: {
  employee_id?: string;
  leave_policy_id?: string;
  q?: string;
  status?: string;
}) {
  return apiGet<HrAdminLeaveBalanceTransaction[]>(`/hr-admin/leave-balances/transactions/${buildQueryString(params ?? {})}`);
}

export async function getHrAdminAttendancePolicyAssignments() {
  return apiGet<HrAdminScopedAssignment[]>("/hr-admin/attendance-policy-assignments/");
}

export async function getHrAdminEmployeeShiftAssignments() {
  return apiGet<HrAdminEmployeeShiftAssignment[]>("/hr-admin/employee-shift-assignments/");
}

export async function getHrAdminEmployeeShiftAssignment(itemId: string) {
  return apiGet<HrAdminEmployeeShiftAssignment>(`/hr-admin/employee-shift-assignments/${itemId}/`);
}

export async function getHrAdminShiftRosterTemplates() {
  return apiGet<HrAdminShiftRosterTemplate[]>("/hr-admin/shift-roster-templates/");
}

export async function getHrAdminShiftRosterTemplate(itemId: string) {
  return apiGet<HrAdminShiftRosterTemplate>(`/hr-admin/shift-roster-templates/${itemId}/`);
}

export async function getHrAdminShiftRosterRollouts() {
  return apiGet<HrAdminShiftRosterRollout[]>("/hr-admin/shift-roster-rollouts/");
}

export async function getHrAdminWorkflowOptions() {
  return apiGet<HrAdminWorkflowOptions>("/hr-admin/workflow-options/");
}

export async function getHrAdminWorkflowTemplates() {
  return apiGet<HrAdminWorkflowTemplate[]>("/hr-admin/workflow-templates/");
}

export async function getHrAdminWorkflowTemplate(itemId: string) {
  return apiGet<HrAdminWorkflowTemplate>(`/hr-admin/workflow-templates/${itemId}/`);
}

export async function getHrAdminWorkflowTemplateAssignments() {
  return apiGet<HrAdminWorkflowTemplateAssignment[]>("/hr-admin/workflow-template-assignments/");
}

export async function getHrAdminWorkflowTraces(params?: {
  module?: string;
  status?: string;
  q?: string;
  page?: number;
  page_size?: number;
}) {
  return apiGet<HrAdminWorkflowTraceListResponse>(`/hr-admin/workflow-traces/${buildQueryString(params ?? {})}`);
}

export async function getHrAdminDocumentOptions() {
  return apiGet<HrAdminDocumentOptions>("/hr-admin/document-options/");
}

export async function getHrAdminDocumentCategories() {
  return apiGet<HrAdminDocumentCategory[]>("/hr-admin/document-categories/");
}

export async function getHrAdminDocumentCategory(itemId: string) {
  return apiGet<HrAdminDocumentCategory>(`/hr-admin/document-categories/${itemId}/`);
}

export async function getHrAdminDocumentRequirements() {
  return apiGet<HrAdminDocumentRequirementRule[]>("/hr-admin/document-requirements/");
}

export async function getHrAdminEmployeeDocuments(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  verification_status?: string;
  status?: string;
  category_id?: string;
  expiry_filter?: string;
}) {
  return apiGet<HrAdminEmployeeDocumentListResponse>(`/hr-admin/employee-documents/${buildQueryString(params ?? {})}`);
}

export async function getHrAdminEmployeeDocument(itemId: string) {
  return apiGet<HrAdminEmployeeDocument>(`/hr-admin/employee-documents/${itemId}/`);
}

export async function getHrAdminGeneratedLetters(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  employee_id?: string;
  letter_type?: string;
}) {
  return apiGet<HrAdminGeneratedLetterListResponse>(`/hr-admin/generated-letters/${buildQueryString(params ?? {})}`);
}

export async function getHrAdminLifecycleOptions() {
  return apiGet<HrAdminLifecycleOptions>("/hr-admin/lifecycle-options/");
}

export async function getHrAdminLifecycleQueue(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  item_type?: string;
  status?: string;
  employee_id?: string;
  owner?: string;
  primary_date_from?: string;
  primary_date_to?: string;
}) {
  return apiGet<HrAdminLifecycleQueueListResponse>(`/hr-admin/lifecycle-queue/${buildQueryString(params ?? {})}`);
}

export async function getHrAdminOnboardings(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  status?: string;
  owner?: string;
}) {
  return apiGet<HrAdminOnboardingListResponse>(`/hr-admin/onboardings/${buildQueryString(params ?? {})}`);
}

export async function getHrAdminOnboarding(itemId: string) {
  return apiGet<HrAdminOnboarding>(`/hr-admin/onboardings/${itemId}/`);
}

export async function getHrAdminProbationReviews(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  decision?: string;
  owner?: string;
}) {
  return apiGet<HrAdminProbationReviewListResponse>(`/hr-admin/probation-reviews/${buildQueryString(params ?? {})}`);
}

export async function getHrAdminProbationReview(itemId: string) {
  return apiGet<HrAdminProbationReview>(`/hr-admin/probation-reviews/${itemId}/`);
}

export async function getHrAdminMovements(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  status?: string;
  movement_type?: string;
  owner?: string;
}) {
  return apiGet<HrAdminMovementListResponse>(`/hr-admin/movements/${buildQueryString(params ?? {})}`);
}

export async function getHrAdminMovement(itemId: string) {
  return apiGet<HrAdminMovement>(`/hr-admin/movements/${itemId}/`);
}

export async function getHrAdminExits(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  status?: string;
  rehire_eligible?: string;
}) {
  return apiGet<HrAdminExitListResponse>(`/hr-admin/exits/${buildQueryString(params ?? {})}`);
}

export async function getHrAdminExit(itemId: string) {
  return apiGet<HrAdminExit>(`/hr-admin/exits/${itemId}/`);
}

export async function getHrAdminNotificationOptions() {
  return apiGet<HrAdminNotificationOptions>("/hr-admin/notification-options/");
}

export async function getHrAdminNotificationChannelConfigurations() {
  return apiGet<HrAdminNotificationChannelConfiguration[]>("/hr-admin/notification-channel-configs/");
}

export async function getHrAdminNotificationTemplates() {
  return apiGet<HrAdminNotificationTemplate[]>("/hr-admin/notification-templates/");
}

export async function getHrAdminNotificationTemplate(itemId: string) {
  return apiGet<HrAdminNotificationTemplate>(`/hr-admin/notification-templates/${itemId}/`);
}

export async function getHrAdminNotificationEvents() {
  return apiGet<HrAdminNotificationEventDefinition[]>("/hr-admin/notification-events/");
}

export async function getHrAdminNotificationEvent(itemId: string) {
  return apiGet<HrAdminNotificationEventDefinition>(`/hr-admin/notification-events/${itemId}/`);
}

export async function getHrAdminNotifications(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  status?: string;
  channel?: string;
  priority?: string;
  audience_type?: string;
  module?: string;
  subject_type?: string;
  retry_state?: string;
}) {
  return apiGet<HrAdminNotificationListResponse>(`/hr-admin/notifications/${buildQueryString(params ?? {})}`);
}

export async function getHrAdminNotificationDiagnostics() {
  return apiGet<HrAdminNotificationDiagnostics>("/hr-admin/notification-diagnostics/");
}

export async function getHrAdminNotification(itemId: string) {
  return apiGet<HrAdminNotification>(`/hr-admin/notifications/${itemId}/`);
}

function getDemoData<T>(path: string): T {
  const [pathname, rawQuery = ""] = path.split("?");
  const query = new URLSearchParams(rawQuery);
  const paginateDemoItems = <Item,>(
    items: Item[],
    opts?: {
      statusCounts?: Record<string, number>;
    },
  ) => {
    const page = Math.max(Number(query.get("page") || "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.get("page_size") || "10") || 10, 1), 100);
    const offset = (page - 1) * pageSize;
    return {
      items: items.slice(offset, offset + pageSize),
      total_count: items.length,
      page,
      page_size: pageSize,
      has_next: offset + pageSize < items.length,
      has_previous: page > 1,
      ...(opts?.statusCounts ? { status_counts: opts.statusCounts } : {}),
    };
  };
  const demoDashboard: EmployeeDashboard = {
    profile: {
      id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
      employee_code: "EMP-0042",
      full_name: "Riya Sharma",
      preferred_name: "Riya",
      work_email: "riya.sharma@northstar.example",
      personal_email: "riya.personal@example.com",
      phone_number: "+91-9876543210",
      employment_status: "active",
      date_of_joining: "2024-04-15",
      department: "People Operations",
      designation: "Assistant Manager",
      legal_entity: "Northstar Foods Pvt Ltd",
      branch: "Bengaluru HO",
      location: "Bengaluru",
      reporting_manager: "Karan Mehta",
    },
    leave: {
      period_year: 2026,
      pending_requests_count: 1,
      balances: [
        { leave_type: "Casual Leave", policy_name: "CL Standard", closing_balance: "5.50", consumed_amount: "2.00", reserved_amount: "1.00" },
        { leave_type: "Sick Leave", policy_name: "SL Standard", closing_balance: "6.00", consumed_amount: "1.00", reserved_amount: "0.00" },
        { leave_type: "Earned Leave", policy_name: "EL Standard", closing_balance: "12.00", consumed_amount: "3.00", reserved_amount: "0.00" },
      ],
      recent_requests: [],
    },
    attendance: {
      today: {
        date: "2026-06-06",
        status: "present",
        shift: "General Shift",
        check_in_at: "2026-06-06T09:12:00+05:30",
        check_out_at: null,
      },
      month_to_date: {
        present_days: 5,
        absent_days: 0,
        half_days: 1,
        late_days: 1,
        work_duration_hours: "42.50",
        overtime_hours: "1.50",
      },
      pending_regularizations_count: 1,
    },
  };

  const demoLeaveRequests: LeaveRequestItem[] = [
    {
      id: "2016f1cf-6870-4e52-b604-b2082d4f10aa",
      leave_type: "Casual Leave",
      leave_type_code: "casual-leave",
      policy_name: "CL Standard",
      status: "pending",
      start_date: "2026-06-21",
      end_date: "2026-06-22",
      start_day_portion: "full_day",
      end_day_portion: "full_day",
      requested_units: "2.00",
      approved_units: "0.00",
      reason: "Family event out of town.",
      manager_comment: "",
      rejection_reason: "",
      workflow_reference: "wf-leave-001",
      applied_at: "2026-06-05T18:15:00+05:30",
      approved_at: null,
      cancelled_at: null,
      can_withdraw: true,
      withdraw_block_reason: null,
      withdraw_requires_attachment: false,
      withdraw_attachment_label: "withdrawal evidence",
      can_cancel: false,
      cancel_block_reason: "Only approved leave requests can be cancelled.",
      cancel_requires_attachment: true,
      cancel_attachment_label: "medical certificate",
      cancel_requires_reapproval: true,
      cancel_approval_route: "manager_then_hr",
      created_at: "2026-06-05T18:15:00+05:30",
      updated_at: "2026-06-05T18:15:00+05:30",
      employee_id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
      employee_code: "EMP-0042",
      employee_name: "Riya Sharma",
      department: "People Operations",
      designation: "Assistant Manager",
    },
    {
      id: "915a1e75-0f84-45f2-bd19-7e2090eb70e4",
      leave_type: "Sick Leave",
      leave_type_code: "sick-leave",
      policy_name: "SL Standard",
      status: "approved",
      start_date: "2026-05-27",
      end_date: "2026-05-27",
      start_day_portion: "first_half",
      end_day_portion: "second_half",
      requested_units: "1.00",
      approved_units: "1.00",
      reason: "Doctor appointment.",
      manager_comment: "Take care.",
      rejection_reason: "",
      workflow_reference: "wf-leave-0008",
      applied_at: "2026-05-26T16:45:00+05:30",
      approved_at: "2026-05-26T18:00:00+05:30",
      cancelled_at: null,
      can_withdraw: false,
      withdraw_block_reason: "Only pending leave requests can be withdrawn.",
      withdraw_requires_attachment: false,
      withdraw_attachment_label: "withdrawal evidence",
      can_cancel: true,
      cancel_block_reason: null,
      cancel_requires_attachment: true,
      cancel_attachment_label: "medical certificate",
      cancel_requires_reapproval: true,
      cancel_approval_route: "manager_then_hr",
      created_at: "2026-05-26T16:45:00+05:30",
      updated_at: "2026-05-26T18:00:00+05:30",
      employee_id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
      employee_code: "EMP-0042",
      employee_name: "Riya Sharma",
      department: "People Operations",
      designation: "Assistant Manager",
    },
  ];

  const demoRegularizations: AttendanceRegularizationItem[] = [
    {
      id: "c89f5554-d7f9-4e56-ac5e-c8dfa0c8787c",
      attendance_record_id: "att-001",
      attendance_date: "2026-06-03",
      current_status: "late",
      requested_status: "present",
      shift: "General Shift",
      requested_check_in_at: "2026-06-03T09:05:00+05:30",
      requested_check_out_at: "2026-06-03T18:30:00+05:30",
      actual_check_in_at: "2026-06-03T10:14:00+05:30",
      actual_check_out_at: "2026-06-03T18:30:00+05:30",
      status: "pending",
      reason: "Biometric device was offline during morning entry.",
      manager_comment: "",
      rejection_reason: "",
      workflow_reference: "wf-att-1001",
      applied_at: "2026-06-03T18:45:00+05:30",
      resolved_at: null,
      created_at: "2026-06-03T18:45:00+05:30",
      updated_at: "2026-06-03T18:45:00+05:30",
      employee_id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
      employee_code: "EMP-0042",
      employee_name: "Riya Sharma",
      department: "People Operations",
      designation: "Assistant Manager",
    },
  ];

  const demoHrAdminAttendanceRecords: HrAdminAttendanceRecord[] = [
    {
      id: "att-001",
      employee_id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
      employee_code: "EMP-0042",
      employee_name: "Riya Sharma",
      department: "People Operations",
      designation: "Assistant Manager",
      attendance_date: "2026-06-03",
      status: "late",
      source: "biometric",
      shift_id: "shift-1",
      shift: "General Shift",
      holiday_id: null,
      holiday: null,
      check_in_at: "2026-06-03T10:14:00+05:30",
      check_out_at: "2026-06-03T18:30:00+05:30",
      work_duration_hours: "07.40",
      overtime_hours: "0.00",
      late_minutes: 59,
      early_exit_minutes: 0,
      is_regularized: false,
      is_locked: false,
      notes: "Pending regularization.",
    },
    {
      id: "att-002",
      employee_id: "emp-0043",
      employee_code: "EMP-0043",
      employee_name: "Aman Verma",
      department: "Sales",
      designation: "Sales Executive",
      attendance_date: "2026-06-03",
      status: "present",
      source: "mobile",
      shift_id: "shift-2",
      shift: "Support Shift",
      holiday_id: null,
      holiday: null,
      check_in_at: "2026-06-03T12:02:00+05:30",
      check_out_at: "2026-06-03T21:10:00+05:30",
      work_duration_hours: "08.20",
      overtime_hours: "0.30",
      late_minutes: 0,
      early_exit_minutes: 0,
      is_regularized: false,
      is_locked: true,
      notes: "",
    },
  ];

  const demoManagerSummary: ManagerTeamSummary = {
    team_size: 8,
    employees_on_leave_today: 1,
    pending_leave_approvals_count: 2,
    pending_attendance_regularizations_count: 3,
    attendance_exceptions_today: 2,
  };

  const demoHrAdminEmployees: HrAdminEmployeeListItem[] = [
    {
      id: "emp-0001",
      employee_code: "EMP-0001",
      full_name: "Nisha Rao",
      work_email: "nisha.rao@northstar.example",
      phone_number: "+91-9000000001",
      employment_status: "active",
      date_of_joining: "2023-06-01",
      department: "People Operations",
      business_unit: "Corporate",
      legal_entity: "Northstar Foods Pvt Ltd",
      cost_center: "HO People Ops",
      designation: "HR Manager",
      grade: "M1",
      employment_type: "Full Time",
      branch: "Bengaluru HO",
      location: "Bengaluru",
      reporting_manager: null,
      has_access: true,
      membership_status: "active",
      assigned_role_count: 1,
      direct_reports_count: 1,
    },
    {
      id: "emp-0002",
      employee_code: "EMP-0002",
      full_name: "Karan Mehta",
      work_email: "karan.mehta@northstar.example",
      phone_number: "+91-9000000002",
      employment_status: "active",
      date_of_joining: "2024-01-15",
      department: "People Operations",
      business_unit: "Corporate",
      legal_entity: "Northstar Foods Pvt Ltd",
      cost_center: "HO People Ops",
      designation: "Assistant Manager",
      grade: "M1",
      employment_type: "Full Time",
      branch: "Bengaluru HO",
      location: "Bengaluru",
      reporting_manager: "Nisha Rao",
      has_access: true,
      membership_status: "active",
      assigned_role_count: 1,
      direct_reports_count: 3,
    },
    {
      id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
      employee_code: "EMP-0042",
      full_name: "Riya Sharma",
      work_email: "riya.sharma@northstar.example",
      phone_number: "+91-9876543210",
      employment_status: "active",
      date_of_joining: "2024-04-15",
      department: "People Operations",
      business_unit: "Corporate",
      legal_entity: "Northstar Foods Pvt Ltd",
      cost_center: "HO People Ops",
      designation: "Assistant Manager",
      grade: "M1",
      employment_type: "Full Time",
      branch: "Bengaluru HO",
      location: "Bengaluru",
      reporting_manager: "Karan Mehta",
      has_access: true,
      membership_status: "active",
      assigned_role_count: 1,
      direct_reports_count: 0,
    },
    {
      id: "emp-0043",
      employee_code: "EMP-0043",
      full_name: "Aman Verma",
      work_email: "aman.verma@northstar.example",
      phone_number: "+91-9876500011",
      employment_status: "active",
      date_of_joining: "2024-06-01",
      department: "Sales",
      business_unit: "Corporate",
      legal_entity: "Northstar Foods Pvt Ltd",
      cost_center: "HO Sales",
      designation: "Sales Executive",
      grade: "IC1",
      employment_type: "Full Time",
      branch: "Bengaluru HO",
      location: "Bengaluru",
      reporting_manager: "Karan Mehta",
      has_access: false,
      membership_status: "",
      assigned_role_count: 0,
      direct_reports_count: 0,
    },
    {
      id: "emp-0044",
      employee_code: "EMP-0044",
      full_name: "Meera Iyer",
      work_email: "meera.iyer@northstar.example",
      phone_number: "+91-9876500012",
      employment_status: "active",
      date_of_joining: "2024-07-01",
      department: "Sales",
      business_unit: "Corporate",
      legal_entity: "Northstar Foods Pvt Ltd",
      cost_center: "HO Sales",
      designation: "Sales Executive",
      grade: "IC1",
      employment_type: "Full Time",
      branch: "Bengaluru HO",
      location: "Bengaluru",
      reporting_manager: "Karan Mehta",
      has_access: true,
      membership_status: "active",
      assigned_role_count: 1,
      direct_reports_count: 0,
    },
  ];

  const demoHrAdminEmployeeDetails: Record<string, HrAdminEmployeeDetail> = {
    "emp-0001": {
      id: "emp-0001",
      employee_code: "EMP-0001",
      first_name: "Nisha",
      middle_name: "",
      last_name: "Rao",
      full_name: "Nisha Rao",
      preferred_name: "Nisha",
      work_email: "nisha.rao@northstar.example",
      personal_email: "nisha.rao.personal@example.com",
      phone_number: "+91-9000000001",
      employment_status: "active",
      date_of_birth: "1990-03-14",
      date_of_joining: "2023-06-01",
      probation_end_date: null,
      confirmation_date: "2023-12-01",
      legal_entity_id: "le-1",
      legal_entity: "Northstar Foods Pvt Ltd",
      branch_id: "br-1",
      branch: "Bengaluru HO",
      location_id: "loc-1",
      location: "Bengaluru",
      department_id: "dep-1",
      department: "People Operations",
      business_unit_id: "bu-1",
      business_unit: "Corporate",
      cost_center_id: "cc-1",
      cost_center: "HO People Ops",
      designation_id: "des-1",
      designation: "HR Manager",
      grade_id: "gr-1",
      grade: "M1",
      employment_type_id: "et-1",
      employment_type: "Full Time",
      reporting_manager_id: null,
      reporting_manager: null,
      has_access: true,
      membership_status: "active",
      assigned_role_count: 1,
      direct_reports_count: 1,
      created_at: "2023-06-01T09:00:00+05:30",
      updated_at: "2026-06-07T09:00:00+05:30",
    },
    "emp-0002": {
      id: "emp-0002",
      employee_code: "EMP-0002",
      first_name: "Karan",
      middle_name: "",
      last_name: "Mehta",
      full_name: "Karan Mehta",
      preferred_name: "Karan",
      work_email: "karan.mehta@northstar.example",
      personal_email: "karan.mehta.personal@example.com",
      phone_number: "+91-9000000002",
      employment_status: "active",
      date_of_birth: "1994-11-22",
      date_of_joining: "2024-01-15",
      probation_end_date: "2024-07-15",
      confirmation_date: "2024-07-20",
      legal_entity_id: "le-1",
      legal_entity: "Northstar Foods Pvt Ltd",
      branch_id: "br-1",
      branch: "Bengaluru HO",
      location_id: "loc-1",
      location: "Bengaluru",
      department_id: "dep-1",
      department: "People Operations",
      business_unit_id: "bu-1",
      business_unit: "Corporate",
      cost_center_id: "cc-1",
      cost_center: "HO People Ops",
      designation_id: "des-2",
      designation: "Assistant Manager",
      grade_id: "gr-1",
      grade: "M1",
      employment_type_id: "et-1",
      employment_type: "Full Time",
      reporting_manager_id: "emp-0001",
      reporting_manager: "Nisha Rao",
      has_access: true,
      membership_status: "active",
      assigned_role_count: 1,
      direct_reports_count: 3,
      created_at: "2024-01-15T09:00:00+05:30",
      updated_at: "2026-06-07T09:00:00+05:30",
    },
    "42f9eac1-4dc6-476f-8cd4-923e1e90f001": {
      id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
      employee_code: "EMP-0042",
      first_name: "Riya",
      middle_name: "",
      last_name: "Sharma",
      full_name: "Riya Sharma",
      preferred_name: "Riya",
      work_email: "riya.sharma@northstar.example",
      personal_email: "riya.personal@example.com",
      phone_number: "+91-9876543210",
      employment_status: "active",
      date_of_birth: "1998-09-12",
      date_of_joining: "2024-04-15",
      probation_end_date: "2024-10-15",
      confirmation_date: "2024-10-20",
      legal_entity_id: "le-1",
      legal_entity: "Northstar Foods Pvt Ltd",
      branch_id: "br-1",
      branch: "Bengaluru HO",
      location_id: "loc-1",
      location: "Bengaluru",
      department_id: "dep-1",
      department: "People Operations",
      business_unit_id: "bu-1",
      business_unit: "Corporate",
      cost_center_id: "cc-1",
      cost_center: "HO People Ops",
      designation_id: "des-2",
      designation: "Assistant Manager",
      grade_id: "gr-1",
      grade: "M1",
      employment_type_id: "et-1",
      employment_type: "Full Time",
      reporting_manager_id: "emp-0002",
      reporting_manager: "Karan Mehta",
      has_access: true,
      membership_status: "active",
      assigned_role_count: 1,
      direct_reports_count: 0,
      created_at: "2024-04-15T09:00:00+05:30",
      updated_at: "2026-06-07T09:00:00+05:30",
    },
    "emp-0043": {
      id: "emp-0043",
      employee_code: "EMP-0043",
      first_name: "Aman",
      middle_name: "",
      last_name: "Verma",
      full_name: "Aman Verma",
      preferred_name: "Aman",
      work_email: "aman.verma@northstar.example",
      personal_email: "aman.verma.personal@example.com",
      phone_number: "+91-9876500011",
      employment_status: "active",
      date_of_birth: "1997-01-08",
      date_of_joining: "2024-06-01",
      probation_end_date: "2024-12-01",
      confirmation_date: null,
      legal_entity_id: "le-1",
      legal_entity: "Northstar Foods Pvt Ltd",
      branch_id: "br-1",
      branch: "Bengaluru HO",
      location_id: "loc-1",
      location: "Bengaluru",
      department_id: "dep-2",
      department: "Sales",
      business_unit_id: "bu-1",
      business_unit: "Corporate",
      cost_center_id: "cc-2",
      cost_center: "HO Sales",
      designation_id: "des-3",
      designation: "Sales Executive",
      grade_id: "gr-2",
      grade: "IC1",
      employment_type_id: "et-1",
      employment_type: "Full Time",
      reporting_manager_id: "emp-0002",
      reporting_manager: "Karan Mehta",
      has_access: false,
      membership_status: "",
      assigned_role_count: 0,
      direct_reports_count: 0,
      created_at: "2024-06-01T09:00:00+05:30",
      updated_at: "2026-06-07T09:00:00+05:30",
    },
    "emp-0044": {
      id: "emp-0044",
      employee_code: "EMP-0044",
      first_name: "Meera",
      middle_name: "",
      last_name: "Iyer",
      full_name: "Meera Iyer",
      preferred_name: "Meera",
      work_email: "meera.iyer@northstar.example",
      personal_email: "meera.iyer.personal@example.com",
      phone_number: "+91-9876500012",
      employment_status: "active",
      date_of_birth: "1999-07-19",
      date_of_joining: "2024-07-01",
      probation_end_date: "2025-01-01",
      confirmation_date: null,
      legal_entity_id: "le-1",
      legal_entity: "Northstar Foods Pvt Ltd",
      branch_id: "br-1",
      branch: "Bengaluru HO",
      location_id: "loc-1",
      location: "Bengaluru",
      department_id: "dep-2",
      department: "Sales",
      business_unit_id: "bu-1",
      business_unit: "Corporate",
      cost_center_id: "cc-2",
      cost_center: "HO Sales",
      designation_id: "des-3",
      designation: "Sales Executive",
      grade_id: "gr-2",
      grade: "IC1",
      employment_type_id: "et-1",
      employment_type: "Full Time",
      reporting_manager_id: "emp-0002",
      reporting_manager: "Karan Mehta",
      has_access: true,
      membership_status: "active",
      assigned_role_count: 1,
      direct_reports_count: 0,
      created_at: "2024-07-01T09:00:00+05:30",
      updated_at: "2026-06-07T09:00:00+05:30",
    },
  };

  const demoHrAdminOrganizationSnapshot: HrAdminOrganizationSnapshot = {
    summary: {
      legal_entities_count: 1,
      locations_count: 1,
      branches_count: 1,
      business_units_count: 1,
      departments_count: 2,
      grades_count: 2,
      designations_count: 3,
      employment_types_count: 1,
    },
    legal_entities: [
      { id: "le-1", code: "northstar-pvt-ltd", name: "Northstar Foods Pvt Ltd", is_active: true, country_code: "IN", timezone: "Asia/Kolkata" },
    ],
    locations: [
      { id: "loc-1", code: "bengaluru-hq", name: "Bengaluru", is_active: true, city: "Bengaluru", state: "Karnataka", country_code: "IN" },
    ],
    branches: [
      { id: "br-1", code: "bengaluru-ho", name: "Bengaluru HO", is_active: true, legal_entity: "Northstar Foods Pvt Ltd", location: "Bengaluru", branch_type: "Head Office" },
    ],
    business_units: [
      { id: "bu-1", code: "corporate", name: "Corporate", is_active: true, parent: null },
    ],
    departments: [
      { id: "dep-1", code: "people-ops", name: "People Operations", is_active: true, business_unit: "Corporate", parent: null },
      { id: "dep-2", code: "sales", name: "Sales", is_active: true, business_unit: "Corporate", parent: null },
    ],
    grades: [
      { id: "gr-1", code: "m1", name: "M1", is_active: true, level: 1 },
      { id: "gr-2", code: "ic1", name: "IC1", is_active: true, level: 2 },
    ],
    designations: [
      { id: "des-1", code: "hr-manager", name: "HR Manager", is_active: true, grade: "M1" },
      { id: "des-2", code: "assistant-manager", name: "Assistant Manager", is_active: true, grade: "M1" },
      { id: "des-3", code: "sales-executive", name: "Sales Executive", is_active: true, grade: "IC1" },
    ],
    employment_types: [
      { id: "et-1", code: "full-time", name: "Full Time", is_active: true, is_payroll_eligible: true },
    ],
  };

  const demoHrAdminEmployeeFormOptions: HrAdminEmployeeFormOptions = {
    employment_statuses: [
      { value: "draft", label: "Draft" },
      { value: "active", label: "Active" },
      { value: "on_notice", label: "On Notice" },
      { value: "exited", label: "Exited" },
      { value: "inactive", label: "Inactive" },
    ],
    legal_entities: [{ id: "le-1", name: "Northstar Foods Pvt Ltd" }],
    branches: [{ id: "br-1", name: "Bengaluru HO", legal_entity_id: "le-1", location_id: "loc-1" }],
    locations: [{ id: "loc-1", name: "Bengaluru" }],
    departments: [
      { id: "dep-1", name: "People Operations", business_unit_id: "bu-1" },
      { id: "dep-2", name: "Sales", business_unit_id: "bu-1" },
    ],
    business_units: [{ id: "bu-1", name: "Corporate" }],
    cost_centers: [
      { id: "cc-1", name: "HO People Ops", legal_entity_id: "le-1" },
      { id: "cc-2", name: "HO Sales", legal_entity_id: "le-1" },
    ],
    designations: [
      { id: "des-1", name: "HR Manager", grade_id: "gr-1" },
      { id: "des-2", name: "Assistant Manager", grade_id: "gr-1" },
      { id: "des-3", name: "Sales Executive", grade_id: "gr-2" },
    ],
    grades: [
      { id: "gr-1", name: "M1" },
      { id: "gr-2", name: "IC1" },
    ],
    employment_types: [{ id: "et-1", name: "Full Time" }],
    managers: [
      { id: "emp-0001", name: "Nisha Rao", employee_code: "EMP-0001" },
      { id: "emp-0002", name: "Karan Mehta", employee_code: "EMP-0002" },
    ],
  };

  const demoHrAdminEmployeeAccessOptions: HrAdminEmployeeAccessOptions = {
    membership_statuses: [
      { value: "invited", label: "Invited" },
      { value: "active", label: "Active" },
      { value: "suspended", label: "Suspended" },
      { value: "revoked", label: "Revoked" },
    ],
    roles: [
      { id: "role-hr-admin", code: "hr-admin", name: "HR Admin" },
      { id: "role-manager", code: "manager", name: "Manager" },
      { id: "role-employee", code: "employee", name: "Employee" },
    ],
  };

  const demoHrAdminEmployeeAccessDetails: Record<string, HrAdminEmployeeAccessDetail> = {
    "emp-0001": {
      employee_id: "emp-0001",
      employee_code: "EMP-0001",
      employee_name: "Nisha Rao",
      has_access: true,
      membership_id: "membership-0001",
      user_id: "user-0001",
      username: "nisha.rao",
      email: "nisha.rao@northstar.example",
      first_name: "Nisha",
      last_name: "Rao",
      display_name: "Nisha Rao",
      phone_number: "+91-9000000001",
      is_user_active: true,
      must_change_password: false,
      membership_status: "active",
      is_default_membership: true,
      role_ids: ["role-hr-admin"],
      roles: [{ id: "role-hr-admin", code: "hr-admin", name: "HR Admin", is_primary: true }],
    },
    "emp-0002": {
      employee_id: "emp-0002",
      employee_code: "EMP-0002",
      employee_name: "Karan Mehta",
      has_access: true,
      membership_id: "membership-0002",
      user_id: "user-0002",
      username: "karan.mehta",
      email: "karan.mehta@northstar.example",
      first_name: "Karan",
      last_name: "Mehta",
      display_name: "Karan Mehta",
      phone_number: "+91-9000000002",
      is_user_active: true,
      must_change_password: false,
      membership_status: "active",
      is_default_membership: true,
      role_ids: ["role-manager"],
      roles: [{ id: "role-manager", code: "manager", name: "Manager", is_primary: true }],
    },
    "42f9eac1-4dc6-476f-8cd4-923e1e90f001": {
      employee_id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
      employee_code: "EMP-0042",
      employee_name: "Riya Sharma",
      has_access: true,
      membership_id: "membership-0042",
      user_id: "user-0042",
      username: "riya.sharma",
      email: "riya.sharma@northstar.example",
      first_name: "Riya",
      last_name: "Sharma",
      display_name: "Riya Sharma",
      phone_number: "+91-9876543210",
      is_user_active: true,
      must_change_password: false,
      membership_status: "active",
      is_default_membership: true,
      role_ids: ["role-employee"],
      roles: [{ id: "role-employee", code: "employee", name: "Employee", is_primary: true }],
    },
    "emp-0043": {
      employee_id: "emp-0043",
      employee_code: "EMP-0043",
      employee_name: "Aman Verma",
      has_access: true,
      membership_id: "membership-0043",
      user_id: "user-0043",
      username: "aman.verma",
      email: "aman.verma@northstar.example",
      first_name: "Aman",
      last_name: "Verma",
      display_name: "Aman Verma",
      phone_number: "+91-9876500011",
      is_user_active: true,
      must_change_password: false,
      membership_status: "active",
      is_default_membership: true,
      role_ids: ["role-employee"],
      roles: [{ id: "role-employee", code: "employee", name: "Employee", is_primary: true }],
    },
    "emp-0044": {
      employee_id: "emp-0044",
      employee_code: "EMP-0044",
      employee_name: "Meera Iyer",
      has_access: true,
      membership_id: "membership-0044",
      user_id: "user-0044",
      username: "meera.iyer",
      email: "meera.iyer@northstar.example",
      first_name: "Meera",
      last_name: "Iyer",
      display_name: "Meera Iyer",
      phone_number: "+91-9876500012",
      is_user_active: true,
      must_change_password: false,
      membership_status: "active",
      is_default_membership: true,
      role_ids: ["role-employee"],
      roles: [{ id: "role-employee", code: "employee", name: "Employee", is_primary: true }],
    },
  };

  const demoHrAdminOrganizationFormOptions: HrAdminOrganizationFormOptions = {
    legal_entities: [{ id: "le-1", name: "Northstar Foods Pvt Ltd" }],
    locations: [{ id: "loc-1", name: "Bengaluru" }],
    business_units: [{ id: "bu-1", name: "Corporate" }],
    departments: [
      { id: "dep-1", name: "People Operations" },
      { id: "dep-2", name: "Sales" },
    ],
    grades: [
      { id: "gr-1", name: "M1" },
      { id: "gr-2", name: "IC1" },
    ],
  };

  const demoHrAdminPolicyOptions: HrAdminPolicyOptions = {
    leave_categories: [
      { value: "paid", label: "Paid" },
      { value: "sick", label: "Sick" },
      { value: "vacation", label: "Vacation" },
      { value: "unpaid", label: "Unpaid" },
    ],
    leave_units: [{ value: "day", label: "Day" }, { value: "hour", label: "Hour" }],
    accrual_frequencies: [
      { value: "none", label: "None" },
      { value: "monthly", label: "Monthly" },
      { value: "yearly", label: "Yearly" },
    ],
    leave_policy_statuses: [
      { value: "draft", label: "Draft" },
      { value: "active", label: "Active" },
      { value: "archived", label: "Archived" },
    ],
    attendance_statuses: [
      { value: "present", label: "Present" },
      { value: "absent", label: "Absent" },
      { value: "half_day", label: "Half Day" },
      { value: "late", label: "Late" },
    ],
    attendance_units: [{ value: "day", label: "Day" }, { value: "hour", label: "Hour" }],
    attendance_policy_statuses: [
      { value: "draft", label: "Draft" },
      { value: "active", label: "Active" },
      { value: "archived", label: "Archived" },
    ],
    leave_types: [
      { id: "lt-1", name: "Casual Leave" },
      { id: "lt-2", name: "Sick Leave" },
    ],
    leave_policies: [{ id: "lp-1", name: "CL Standard" }],
    attendance_policies: [{ id: "ap-1", name: "General Office Policy" }],
    legal_entities: [{ id: "le-1", name: "Northstar Foods Pvt Ltd" }],
    branches: [{ id: "br-1", name: "Bengaluru HO" }],
    locations: [{ id: "loc-1", name: "Bengaluru" }],
    departments: [
      { id: "dep-1", name: "People Operations" },
      { id: "dep-2", name: "Sales" },
    ],
    grades: [
      { id: "gr-1", name: "M1" },
      { id: "gr-2", name: "IC1" },
    ],
    employment_types: [{ id: "et-1", name: "Full Time" }],
    employees: [
      { id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001", name: "Riya Sharma" },
      { id: "emp-0043", name: "Aman Verma" },
      { id: "emp-0044", name: "Meera Iyer" },
    ],
    shifts: [{ id: "shift-1", name: "General Shift" }],
    holiday_calendars: [{ id: "calendar-1", name: "India HO Calendar 2026" }],
  };

  const demoHrAdminAttendanceOperationOptions: HrAdminAttendanceOperationOptions = {
    attendance_statuses: [
      { value: "present", label: "Present" },
      { value: "absent", label: "Absent" },
      { value: "half_day", label: "Half Day" },
      { value: "late", label: "Late" },
      { value: "holiday", label: "Holiday" },
      { value: "weekly_off", label: "Weekly Off" },
      { value: "remote", label: "Remote" },
      { value: "unknown", label: "Unknown" },
    ],
    attendance_sources: [
      { value: "manual", label: "Manual" },
      { value: "web", label: "Web" },
      { value: "mobile", label: "Mobile" },
      { value: "biometric", label: "Biometric" },
      { value: "system", label: "System" },
    ],
    regularization_statuses: [
      { value: "draft", label: "Draft" },
      { value: "pending", label: "Pending" },
      { value: "approved", label: "Approved" },
      { value: "rejected", label: "Rejected" },
      { value: "cancelled", label: "Cancelled" },
    ],
    legal_entities: demoHrAdminPolicyOptions.legal_entities,
    branches: demoHrAdminPolicyOptions.branches,
    locations: demoHrAdminPolicyOptions.locations,
    employees: demoHrAdminPolicyOptions.employees,
    shifts: demoHrAdminPolicyOptions.shifts,
    holiday_calendars: demoHrAdminPolicyOptions.holiday_calendars,
  };

  const demoTenantNativeGovernance: HrAdminGovernanceFields = {
    source_kind: "tenant_native",
    source_pack_code: "",
    source_item_key: "",
    source_version: 1,
    delegation_mode: "",
    managed_by_platform: false,
    platform_locked_fields: [],
    governance_state: "tenant_native",
    governance_label: "Tenant-managed",
    edit_mode: "editable",
    can_edit_directly: true,
    can_detach_from_platform: false,
    requires_platform_change: false,
    is_detached_clone: false,
    locked_field_count: 0,
    lineage_summary: "Created and managed fully within the tenant workspace.",
  };

  const demoPlatformEditableGovernance: HrAdminGovernanceFields = {
    source_kind: "platform_pack",
    source_pack_code: "starter-baseline-pack",
    source_item_key: "platform-editable-item",
    source_version: 3,
    delegation_mode: "tenant_editable",
    managed_by_platform: true,
    platform_locked_fields: ["default_shift_id"],
    governance_state: "platform_editable",
    governance_label: "Platform managed, tenant editable",
    edit_mode: "editable",
    can_edit_directly: true,
    can_detach_from_platform: true,
    requires_platform_change: false,
    is_detached_clone: false,
    locked_field_count: 1,
    lineage_summary: "Managed by the platform baseline but tenant edits are allowed except for locked fields.",
  };

  const demoPlatformDetachRequiredGovernance: HrAdminGovernanceFields = {
    source_kind: "platform_pack",
    source_pack_code: "starter-baseline-pack",
    source_item_key: "platform-detach-item",
    source_version: 3,
    delegation_mode: "tenant_editable_after_clone",
    managed_by_platform: true,
    platform_locked_fields: ["start_time"],
    governance_state: "platform_clone_required",
    governance_label: "Detach before edit",
    edit_mode: "detach_required",
    can_edit_directly: false,
    can_detach_from_platform: true,
    requires_platform_change: false,
    is_detached_clone: false,
    locked_field_count: 1,
    lineage_summary: "Managed by the platform baseline and must be detached before tenant edits are allowed.",
  };

  const demoPlatformLockedGovernance: HrAdminGovernanceFields = {
    source_kind: "platform_pack",
    source_pack_code: "starter-baseline-pack",
    source_item_key: "platform-locked-item",
    source_version: 3,
    delegation_mode: "locked",
    managed_by_platform: true,
    platform_locked_fields: ["year", "holidays"],
    governance_state: "platform_locked",
    governance_label: "Platform locked",
    edit_mode: "blocked",
    can_edit_directly: false,
    can_detach_from_platform: true,
    requires_platform_change: true,
    is_detached_clone: false,
    locked_field_count: 2,
    lineage_summary: "Managed by the platform baseline and locked against tenant-side edits.",
  };

  const demoHrAdminShifts: HrAdminShift[] = [
    {
      id: "shift-1",
      code: "general-shift",
      name: "General Shift",
      start_time: "09:00:00",
      end_time: "18:00:00",
      working_hours: "08.50",
      break_minutes: 30,
      grace_in_minutes: 15,
      grace_out_minutes: 10,
      is_night_shift: false,
      is_flexible: false,
      weekly_off_days: ["saturday", "sunday"],
      is_active: true,
      ...demoPlatformDetachRequiredGovernance,
      source_item_key: "general-shift",
    },
    {
      id: "shift-2",
      code: "support-shift",
      name: "Support Shift",
      start_time: "12:00:00",
      end_time: "21:00:00",
      working_hours: "08.00",
      break_minutes: 45,
      grace_in_minutes: 10,
      grace_out_minutes: 10,
      is_night_shift: false,
      is_flexible: true,
      weekly_off_days: ["sunday"],
      is_active: true,
      ...demoTenantNativeGovernance,
    },
  ];

  const demoHrAdminEmployeeShiftAssignments: HrAdminEmployeeShiftAssignment[] = [
    {
      id: "esa-1",
      employee_id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
      employee: "Nisha Rao",
      employee_code: "EMP-0001",
      shift_id: "shift-1",
      shift: "General Shift",
      assignment_kind: "fixed",
      effective_from: "2026-01-01",
      effective_to: null,
      is_primary: true,
      config_snapshot: {
        rotation: {
          anchor_date: "2026-01-01",
          entries: [{ position: 0, shift_id: "shift-1", span_days: 7 }],
        },
      },
      scope_labels: ["Employee: EMP-0001", "Window: 2026-01-01 to open ended", "Primary fixed assignment", "Coverage: General Shift"],
      conflict_count: 0,
      has_blocking_conflict: false,
      conflict_summary: "No overlapping shift assignment detected for this employee and date window.",
    },
    {
      id: "esa-2",
      employee_id: "c52dd40a-f8f5-4651-bf69-4b9f4b0a0002",
      employee: "Karan Mehta",
      employee_code: "EMP-0002",
      shift_id: "shift-2",
      shift: "Flexible Tech Shift",
      assignment_kind: "weekly_rotation",
      effective_from: "2026-01-01",
      effective_to: null,
      is_primary: true,
      config_snapshot: {
        rotation: {
          anchor_date: "2026-01-01",
          entries: [
            { position: 0, shift_id: "shift-2", span_days: 7 },
            { position: 1, shift_id: "shift-3", span_days: 7 },
          ],
        },
      },
      scope_labels: ["Employee: EMP-0002", "Window: 2026-01-01 to open ended", "Primary weekly rotation assignment", "Coverage: Rotation: 2 steps"],
      conflict_count: 0,
      has_blocking_conflict: false,
      conflict_summary: "No overlapping shift assignment detected for this employee and date window.",
    },
  ];

  const demoHrAdminShiftRosterTemplates: HrAdminShiftRosterTemplate[] = [
    {
      id: "srt-1",
      code: "support-rotation",
      name: "Support rotation",
      description: "Weekly rotation between support and evening shift for the support pod.",
      status: "published",
      shift_id: "shift-2",
      shift: "Flexible Tech Shift",
      assignment_kind: "weekly_rotation",
      config_snapshot: {
        rotation: {
          anchor_date: "2026-01-01",
          entries: [
            { position: 0, shift_id: "shift-2", span_days: 7 },
            { position: 1, shift_id: "shift-3", span_days: 7 },
          ],
        },
      },
    },
    {
      id: "srt-2",
      code: "festival-override",
      name: "Festival override",
      description: "Temporary override template for high-volume service days.",
      status: "draft",
      shift_id: "shift-3",
      shift: "Support Shift",
      assignment_kind: "temporary_override",
      config_snapshot: {
        rotation: {
          anchor_date: "2026-10-20",
          entries: [{ position: 0, shift_id: "shift-3", span_days: 5 }],
        },
      },
    },
  ];

  const demoHrAdminShiftRosterRollouts: HrAdminShiftRosterRollout[] = [
    {
      id: "srr-1",
      template_id: "srt-1",
      template_name: "Support rotation",
      status: "completed",
      effective_from: "2026-06-16",
      effective_to: "2026-07-31",
      is_primary: true,
      target_count: 3,
      created_count: 2,
      skipped_count: 1,
      summary: "2 employee shift assignment(s) created and 1 skipped.",
      created_at: "2026-06-09T13:40:00+05:30",
      scope_labels: ["Department: People Operations", "Employees: 3 selected"],
    },
  ];

  const demoHrAdminHolidayCalendars: HrAdminHolidayCalendar[] = [
    {
      id: "calendar-1",
      code: "india-ho-2026",
      name: "India HO Calendar 2026",
      legal_entity_id: "le-1",
      legal_entity: "Northstar Foods Pvt Ltd",
      branch_id: "br-1",
      branch: "Bengaluru HO",
      location_id: "loc-1",
      location: "Bengaluru",
      year: 2026,
      is_active: true,
      ...demoPlatformLockedGovernance,
      source_item_key: "india-ho-2026",
      holidays: [
        { id: "hol-1", date: "2026-01-26", name: "Republic Day", description: "", holiday_type: "compulsory", is_optional: false },
        { id: "hol-2", date: "2026-08-15", name: "Independence Day", description: "", holiday_type: "compulsory", is_optional: false },
        { id: "hol-3", date: "2026-02-19", name: "Guru Ravidas Jayanti", description: "", holiday_type: "restricted", is_optional: true },
        { id: "hol-4", date: "2026-03-27", name: "Shab-e-Qadr", description: "", holiday_type: "restricted", is_optional: true },
      ],
    },
  ];

  const demoHrAdminLeaveTypes: HrAdminLeaveType[] = [
    {
      id: "lt-1",
      code: "casual-leave",
      name: "Casual Leave",
      short_code: "CL",
      category: "paid",
      unit: "day",
      color_code: "#0b6e4f",
      description: "Short planned personal leave.",
      is_active: true,
      requires_attachment: false,
      allow_negative_balance: false,
      is_approval_required: true,
      ...demoPlatformEditableGovernance,
      source_item_key: "casual-leave-type",
      platform_locked_fields: ["is_approval_required"],
    },
    {
      id: "lt-2",
      code: "sick-leave",
      name: "Sick Leave",
      short_code: "SL",
      category: "sick",
      unit: "day",
      color_code: "#d88c38",
      description: "Medical and wellness related leave.",
      is_active: true,
      requires_attachment: true,
      allow_negative_balance: false,
      is_approval_required: true,
      ...demoTenantNativeGovernance,
    },
  ];

  const demoHrAdminAttendancePolicies: HrAdminAttendancePolicy[] = [
    {
      id: "ap-1",
      code: "general-office",
      name: "General Office Policy",
      status: "active",
      attendance_unit: "day",
      default_shift_id: "shift-1",
      default_shift: "General Shift",
      holiday_calendar_id: "calendar-1",
      holiday_calendar: "India HO Calendar 2026",
      full_day_min_hours: "08.50",
      half_day_min_hours: "04.00",
      late_mark_after_minutes: 15,
      max_late_marks_in_period: 3,
      overtime_threshold_minutes: 30,
      allow_manual_entry: true,
      allow_web_checkin: true,
      allow_mobile_checkin: true,
      allow_geofenced_checkin: false,
      allow_regularization: true,
      require_regularization_reason: true,
      ...demoPlatformEditableGovernance,
      source_item_key: "general-office-policy",
      config_snapshot: {
        derivation: {
          enabled: true,
          auto_mark_holiday: true,
          auto_mark_weekly_off: true,
          missing_punch_status: "unknown",
          late_status_mode: "late",
          derive_overtime: true,
        },
      },
    },
  ];

  const demoHrAdminLeavePolicies: HrAdminLeavePolicy[] = [
    {
      id: "lp-1",
      leave_type_id: "lt-1",
      leave_type: "Casual Leave",
      code: "cl-standard",
      name: "CL Standard",
      status: "active",
      effective_from: "2026-01-01",
      effective_to: null,
      accrual_frequency: "monthly",
      annual_entitlement: "12.00",
      max_carry_forward: "3.00",
      max_consecutive_days: "5.00",
      min_days_per_request: "0.50",
      notice_days_required: 1,
      allow_half_day: true,
      allow_backdated_application: false,
      allow_weekend_holiday_overlap: false,
      sandwich_rule_enabled: false,
      is_probation_eligible: true,
      gender_restriction: "",
      marital_status_restriction: "",
      minimum_service_days: 0,
      ...demoPlatformEditableGovernance,
      source_item_key: "cl-standard-policy",
      platform_locked_fields: ["notice_days_required"],
      config_snapshot: {
        version: 1,
        approval: {
          default_route: "manager_only",
          escalation_route: "manager_then_hr",
          escalate_when_units_gte: "3.00",
          second_level_owner_employee_id: "emp-0002",
          hr_owner_employee_id: "emp-0001",
        },
        evidence: {
          attachment_required: false,
          attachment_label: "supporting document",
          required_when_units_gte: null,
          medical_certificate_when_units_gte: "2.00",
          approval_route_when_evidence_required: "manager_then_hr",
        },
        entitlement: {
          grant_mode: "scheduled",
          proration_mode: "by_join_month",
          policy_year_start_month: 4,
          policy_year_start_day: 1,
          carry_forward_mode: "limited",
          carry_forward_cap: "3.00",
          encashment_allowed: false,
          encashment_cap: null,
          probation_accrual_mode: "accrue",
        },
        operations: {
          reviewer_employee_id: "emp-0001",
          approval_required_for_encashment: true,
          approval_required_for_debit_adjustment: false,
          credit_adjustment_requires_approval_over_units: "2.00",
          debit_adjustment_requires_approval_over_units: "1.00",
          encashment_requires_approval_over_units: "1.00",
        },
        lifecycle: {
          allow_employee_withdraw_pending: true,
          withdraw_notice_hours_before_start: "24.00",
          withdraw_requires_attachment: false,
          withdraw_attachment_label: "withdrawal evidence",
          allow_employee_cancel_approved: true,
          cancel_approved_requires_reapproval: true,
          cancel_approval_route: "manager_then_hr",
          cancel_notice_hours_before_start: "24.00",
          cancel_requires_attachment: true,
          cancel_attachment_label: "medical certificate",
        },
        holiday_governance: {
          enabled: false,
          allowed_holiday_types: [],
          require_matching_holiday_dates: true,
          max_paid_units_per_period: null,
          count_pending_requests_towards_cap: true,
          paid_cap_exhaustion_action: "block",
        },
      },
    },
  ];

  const demoHrAdminLeavePolicyAssignments: HrAdminScopedAssignment[] = [
    {
      id: "lpa-1",
      policy_id: "lp-1",
      policy_name: "CL Standard",
      legal_entity_id: "le-1",
      legal_entity: "Northstar Foods Pvt Ltd",
      branch_id: "br-1",
      branch: "Bengaluru HO",
      department_id: "dep-1",
      department: "People Operations",
      grade_id: "gr-1",
      grade: "M1",
      employment_type_id: "et-1",
      employment_type: "Full Time",
      employee_id: null,
      employee: null,
      priority: 100,
      is_active: true,
    },
  ];

  const demoHrAdminLeaveBalances: HrAdminLeaveBalance[] = [
    {
      id: "lb-1",
      employee_id: "emp-0001",
      employee_name: "Nisha Rao",
      employee_code: "EMP-0001",
      leave_policy_id: "lp-1",
      leave_policy_name: "CL Standard",
      leave_type_id: "lt-1",
      leave_type_name: "Casual Leave",
      period_year: 2026,
      opening_balance: "0.00",
      accrued_amount: "12.00",
      carry_forward_amount: "0.00",
      consumed_amount: "2.00",
      reserved_amount: "1.00",
      encashed_amount: "0.00",
      adjustment_amount: "0.00",
      closing_balance: "9.00",
    },
    {
      id: "lb-2",
      employee_id: "emp-0002",
      employee_name: "Karan Mehta",
      employee_code: "EMP-0002",
      leave_policy_id: "lp-1",
      leave_policy_name: "CL Standard",
      leave_type_id: "lt-1",
      leave_type_name: "Casual Leave",
      period_year: 2026,
      opening_balance: "0.00",
      accrued_amount: "12.00",
      carry_forward_amount: "1.00",
      consumed_amount: "1.00",
      reserved_amount: "0.00",
      encashed_amount: "0.00",
      adjustment_amount: "0.50",
      closing_balance: "12.50",
    },
  ];

  const demoHrAdminLeaveBalanceTransactions: HrAdminLeaveBalanceTransaction[] = [
    {
      id: "lbt-1",
      leave_balance_id: "lb-1",
      employee_id: "emp-0001",
      employee_name: "Nisha Rao",
      employee_code: "EMP-0001",
      leave_policy_id: "lp-1",
      leave_policy_name: "CL Standard",
      status: "applied",
      action: "credit_adjustment",
      units: "1.00",
      effective_date: "2026-06-01",
      reason: "Manual carry-forward correction",
      performed_by_id: "emp-0001",
      performed_by_name: "Nisha Rao",
      reviewed_by_id: null,
      reviewed_by_name: null,
      reviewed_at: null,
      rejection_reason: "",
      approval_reason: null,
      reviewer_employee_id: null,
      reviewer_employee_name: null,
      can_current_actor_review: false,
      closing_balance_before: "8.00",
      closing_balance_after: "9.00",
      created_at: "2026-06-01T10:30:00Z",
    },
    {
      id: "lbt-2",
      leave_balance_id: "lb-2",
      employee_id: "emp-0002",
      employee_name: "Karan Mehta",
      employee_code: "EMP-0002",
      leave_policy_id: "lp-1",
      leave_policy_name: "CL Standard",
      status: "pending",
      action: "encashment",
      units: "0.50",
      effective_date: "2026-06-03",
      reason: "Quarter-end leave encashment",
      performed_by_id: "emp-0001",
      performed_by_name: "Nisha Rao",
      reviewed_by_id: null,
      reviewed_by_name: null,
      reviewed_at: null,
      rejection_reason: "",
      approval_reason: "Encashment requires approval under this leave policy.",
      reviewer_employee_id: "emp-0002",
      reviewer_employee_name: "Karan Mehta",
      can_current_actor_review: true,
      closing_balance_before: "13.00",
      closing_balance_after: "12.50",
      created_at: "2026-06-03T12:00:00Z",
    },
  ];

  const demoHrAdminAttendancePolicyAssignments: HrAdminScopedAssignment[] = [
    {
      id: "apa-1",
      policy_id: "ap-1",
      policy_name: "General Office Policy",
      legal_entity_id: "le-1",
      legal_entity: "Northstar Foods Pvt Ltd",
      branch_id: "br-1",
      branch: "Bengaluru HO",
      location_id: "loc-1",
      location: "Bengaluru",
      department_id: null,
      department: null,
      grade_id: null,
      grade: null,
      employment_type_id: "et-1",
      employment_type: "Full Time",
      employee_id: null,
      employee: null,
      priority: 100,
      is_active: true,
    },
  ];

  const demoHrAdminWorkflowTemplates: HrAdminWorkflowTemplate[] = [
    {
      id: "wt-1",
      code: "leave-approval-standard",
      name: "Leave Approval Standard",
      module: "leave",
      trigger_key: "leave_request_submission",
      description: "Default approval chain for leave requests.",
      status: "active",
      version: 1,
      is_system_seeded: true,
      effective_from: "2026-01-01",
      effective_to: null,
      condition_snapshot: {},
      steps: [
        {
          id: "wts-1",
          step_order: 1,
          name: "Reporting manager approval",
          mode: "sequential",
          actor_type: "manager",
          role_id: null,
          role: null,
          membership_id: null,
          membership: null,
          permission_key: "leave.approve",
          scope_type: "direct_reports",
          auto_approve_after_hours: 0,
          escalate_after_hours: 24,
          allow_delegate: true,
          allow_send_back: true,
          allow_comment: true,
          rule_snapshot: {},
        },
        {
          id: "wts-2",
          step_order: 2,
          name: "HR final review",
          mode: "sequential",
          actor_type: "role",
          role_id: "role-hr-admin",
          role: "HR Admin",
          membership_id: null,
          membership: null,
          permission_key: "leave.override",
          scope_type: "tenant_all",
          auto_approve_after_hours: 0,
          escalate_after_hours: 48,
          allow_delegate: true,
          allow_send_back: true,
          allow_comment: true,
          rule_snapshot: {},
        },
      ],
    },
    {
      id: "wt-2",
      code: "attendance-regularization-standard",
      name: "Attendance Regularization Standard",
      module: "attendance",
      trigger_key: "attendance_regularization_submission",
      description: "Review chain for missed punch or attendance correction requests.",
      status: "active",
      version: 1,
      is_system_seeded: true,
      effective_from: "2026-01-01",
      effective_to: null,
      condition_snapshot: {},
      steps: [
        {
          id: "wts-3",
          step_order: 1,
          name: "Manager approval",
          mode: "sequential",
          actor_type: "manager",
          role_id: null,
          role: null,
          membership_id: null,
          membership: null,
          permission_key: "attendance.regularization.approve",
          scope_type: "direct_reports",
          auto_approve_after_hours: 0,
          escalate_after_hours: 24,
          allow_delegate: true,
          allow_send_back: true,
          allow_comment: true,
          rule_snapshot: {},
        },
      ],
    },
  ];

  const demoHrAdminWorkflowTemplateAssignments: HrAdminWorkflowTemplateAssignment[] = [
    {
      id: "wta-1",
      template_id: "wt-1",
      template_name: "Leave Approval Standard",
      module: "leave",
      trigger_key: "leave_request_submission",
      legal_entity_id: "le-1",
      legal_entity: "Northstar Foods Pvt Ltd",
      branch_id: "br-1",
      branch: "Bengaluru HO",
      department_id: "dep-1",
      department: "People Operations",
      business_unit_id: "bu-1",
      business_unit: "Corporate",
      grade_id: "gr-1",
      grade: "M1",
      priority: 100,
      is_active: true,
    },
    {
      id: "wta-2",
      template_id: "wt-2",
      template_name: "Attendance Regularization Standard",
      module: "attendance",
      trigger_key: "attendance_regularization_submission",
      legal_entity_id: "le-1",
      legal_entity: "Northstar Foods Pvt Ltd",
      branch_id: "br-1",
      branch: "Bengaluru HO",
      department_id: null,
      department: null,
      business_unit_id: "bu-1",
      business_unit: "Corporate",
      grade_id: null,
      grade: null,
      priority: 100,
      is_active: true,
    },
  ];

  const demoHrAdminWorkflowTraces: HrAdminWorkflowTrace[] = [
    {
      id: "workflow-trace-leave-1",
      module: "leave",
      trigger_key: "leave_request_submission",
      subject_type: "leave_request",
      subject_identifier: "LR-2026-0042",
      subject_label: "Earned leave request",
      employee_id: "emp-42",
      employee_code: "EMP-0042",
      employee_name: "Riya Sharma",
      status: "pending",
      current_step_order: 2,
      current_step_name: "HR final review",
      current_actor_summary: "HR Admin",
      template_id: "wt-1",
      template_name: "Leave Approval Standard",
      initiated_by_identifier: "riya.sharma",
      submitted_at: "2026-06-07T09:10:00+05:30",
      completed_at: null,
      created_at: "2026-06-07T09:10:00+05:30",
      updated_at: "2026-06-07T12:35:00+05:30",
      total_steps: 2,
      completed_steps: 1,
      pending_steps: 1,
      overdue_steps: 1,
      assignment_count: 2,
      timeline_event_count: 6,
      steps: [
        {
          id: "workflow-trace-leave-step-1",
          step_order: 1,
          name: "Reporting manager approval",
          mode: "sequential",
          status: "approved",
          started_at: "2026-06-07T09:10:00+05:30",
          due_at: "2026-06-08T09:10:00+05:30",
          completed_at: "2026-06-07T12:35:00+05:30",
          resolved_action: "approve",
          resolution_comment: "Coverage confirmed by operations.",
          is_overdue: false,
          assignments: [
            {
              id: "workflow-trace-leave-assignment-1",
              actor_type: "manager",
              actor_identifier: "karan.mehta",
              actor_label: "Karan Mehta",
              role_id: null,
              role: null,
              membership_id: "membership-0002",
              membership: "Karan Mehta",
              is_delegated: false,
              delegated_from_identifier: "",
              responded_at: "2026-06-07T12:35:00+05:30",
            },
          ],
        },
        {
          id: "workflow-trace-leave-step-2",
          step_order: 2,
          name: "HR final review",
          mode: "sequential",
          status: "pending",
          started_at: "2026-06-07T12:35:00+05:30",
          due_at: "2026-06-09T12:35:00+05:30",
          completed_at: null,
          resolved_action: "",
          resolution_comment: "",
          is_overdue: true,
          assignments: [
            {
              id: "workflow-trace-leave-assignment-2",
              actor_type: "role",
              actor_identifier: "hr-admin",
              actor_label: "HR Admin",
              role_id: "role-hr-admin",
              role: "HR Admin",
              membership_id: null,
              membership: null,
              is_delegated: false,
              delegated_from_identifier: "",
              responded_at: null,
            },
          ],
        },
      ],
      timeline: [
        {
          id: "workflow-trace-leave-log-3",
          occurred_at: "2026-06-09T13:00:00+05:30",
          action: "escalate",
          actor_identifier: "system",
          title: "Escalate",
          detail: "SLA crossed for HR final review.",
          from_status: "pending",
          to_status: "pending",
          step_order: 2,
          step_name: "HR final review",
        },
        {
          id: "workflow-trace-leave-step-2-started",
          occurred_at: "2026-06-07T12:35:00+05:30",
          action: "step_started",
          actor_identifier: "",
          title: "Step 2 started",
          detail: "HR final review",
          from_status: "",
          to_status: "pending",
          step_order: 2,
          step_name: "HR final review",
        },
        {
          id: "workflow-trace-leave-log-2",
          occurred_at: "2026-06-07T12:35:00+05:30",
          action: "approve",
          actor_identifier: "karan.mehta",
          title: "Approve",
          detail: "Coverage confirmed by operations.",
          from_status: "pending",
          to_status: "pending",
          step_order: 1,
          step_name: "Reporting manager approval",
        },
        {
          id: "workflow-trace-leave-step-1-completed",
          occurred_at: "2026-06-07T12:35:00+05:30",
          action: "approve",
          actor_identifier: "",
          title: "Step 1 completed",
          detail: "Coverage confirmed by operations.",
          from_status: "",
          to_status: "approved",
          step_order: 1,
          step_name: "Reporting manager approval",
        },
        {
          id: "workflow-trace-leave-step-1-started",
          occurred_at: "2026-06-07T09:10:00+05:30",
          action: "step_started",
          actor_identifier: "",
          title: "Step 1 started",
          detail: "Reporting manager approval",
          from_status: "",
          to_status: "approved",
          step_order: 1,
          step_name: "Reporting manager approval",
        },
        {
          id: "workflow-trace-leave-log-1",
          occurred_at: "2026-06-07T09:10:00+05:30",
          action: "submit",
          actor_identifier: "riya.sharma",
          title: "Workflow submitted",
          detail: "Leave request entered approval.",
          from_status: "",
          to_status: "pending",
          step_order: null,
          step_name: "",
        },
      ],
    },
    {
      id: "workflow-trace-attendance-1",
      module: "attendance",
      trigger_key: "attendance_regularization_submission",
      subject_type: "attendance_regularization",
      subject_identifier: "REG-2026-0044",
      subject_label: "Missed punch regularization",
      employee_id: "emp-44",
      employee_code: "EMP-0044",
      employee_name: "Ishaan Verma",
      status: "rejected",
      current_step_order: 1,
      current_step_name: "Manager approval",
      current_actor_summary: "Karan Mehta",
      template_id: "wt-2",
      template_name: "Attendance Regularization Standard",
      initiated_by_identifier: "ishaan.verma",
      submitted_at: "2026-06-05T18:10:00+05:30",
      completed_at: "2026-06-06T10:05:00+05:30",
      created_at: "2026-06-05T18:10:00+05:30",
      updated_at: "2026-06-06T10:05:00+05:30",
      total_steps: 1,
      completed_steps: 0,
      pending_steps: 0,
      overdue_steps: 0,
      assignment_count: 1,
      timeline_event_count: 4,
      steps: [
        {
          id: "workflow-trace-attendance-step-1",
          step_order: 1,
          name: "Manager approval",
          mode: "sequential",
          status: "rejected",
          started_at: "2026-06-05T18:10:00+05:30",
          due_at: "2026-06-06T18:10:00+05:30",
          completed_at: "2026-06-06T10:05:00+05:30",
          resolved_action: "reject",
          resolution_comment: "Manager rejected because the correction overlapped a locked record.",
          is_overdue: false,
          assignments: [
            {
              id: "workflow-trace-attendance-assignment-1",
              actor_type: "manager",
              actor_identifier: "karan.mehta",
              actor_label: "Karan Mehta",
              role_id: null,
              role: null,
              membership_id: "membership-0002",
              membership: "Karan Mehta",
              is_delegated: false,
              delegated_from_identifier: "",
              responded_at: "2026-06-06T10:05:00+05:30",
            },
          ],
        },
      ],
      timeline: [
        {
          id: "workflow-trace-attendance-log-2",
          occurred_at: "2026-06-06T10:05:00+05:30",
          action: "reject",
          actor_identifier: "karan.mehta",
          title: "Reject",
          detail: "Correction overlapped a locked record.",
          from_status: "pending",
          to_status: "rejected",
          step_order: 1,
          step_name: "Manager approval",
        },
        {
          id: "workflow-trace-attendance-step-completed",
          occurred_at: "2026-06-06T10:05:00+05:30",
          action: "reject",
          actor_identifier: "",
          title: "Step 1 completed",
          detail: "Manager rejected because the correction overlapped a locked record.",
          from_status: "",
          to_status: "rejected",
          step_order: 1,
          step_name: "Manager approval",
        },
        {
          id: "workflow-trace-attendance-step-started",
          occurred_at: "2026-06-05T18:10:00+05:30",
          action: "step_started",
          actor_identifier: "",
          title: "Step 1 started",
          detail: "Manager approval",
          from_status: "",
          to_status: "rejected",
          step_order: 1,
          step_name: "Manager approval",
        },
        {
          id: "workflow-trace-attendance-log-1",
          occurred_at: "2026-06-05T18:10:00+05:30",
          action: "submit",
          actor_identifier: "ishaan.verma",
          title: "Workflow submitted",
          detail: "Attendance regularization entered approval.",
          from_status: "",
          to_status: "pending",
          step_order: null,
          step_name: "",
        },
      ],
    },
  ];

  const demoHrAdminWorkflowOptions: HrAdminWorkflowOptions = {
    workflow_modules: [
      { value: "leave", label: "Leave" },
      { value: "attendance", label: "Attendance" },
      { value: "lifecycle", label: "Lifecycle" },
      { value: "config", label: "Configuration" },
    ],
    workflow_statuses: [
      { value: "draft", label: "Draft" },
      { value: "active", label: "Active" },
      { value: "archived", label: "Archived" },
    ],
    workflow_step_modes: [
      { value: "sequential", label: "Sequential" },
      { value: "parallel", label: "Parallel" },
    ],
    workflow_actor_types: [
      { value: "manager", label: "Manager" },
      { value: "role", label: "Role" },
      { value: "membership", label: "Membership" },
      { value: "hr_owner", label: "HR Owner" },
      { value: "configured_user", label: "Configured User" },
    ],
    workflow_scope_types: [
      { value: "direct_reports", label: "Direct Reports" },
      { value: "department", label: "Department" },
      { value: "branch", label: "Branch" },
      { value: "legal_entity", label: "Legal Entity" },
      { value: "tenant_all", label: "Tenant Wide" },
    ],
    roles: demoHrAdminEmployeeAccessOptions.roles,
    memberships: [
      { id: "membership-0001", name: "Nisha Rao" },
      { id: "membership-0002", name: "Karan Mehta" },
      { id: "membership-0042", name: "Riya Sharma" },
    ],
    legal_entities: demoHrAdminPolicyOptions.legal_entities,
    branches: demoHrAdminPolicyOptions.branches,
    departments: demoHrAdminPolicyOptions.departments,
    business_units: [{ id: "bu-1", name: "Corporate" }],
    grades: demoHrAdminPolicyOptions.grades,
    templates: demoHrAdminWorkflowTemplates.map((item) => ({ id: item.id, name: item.name })),
    lifecycle_rule_options: {
      supported_rule_snapshot_fields: [
        "due_anchor",
        "due_anchor_candidates",
        "due_offset_days",
        "due_offset_unit",
        "non_working_weekdays",
      ],
      due_offset_units: [
        { value: "calendar_days", label: "Calendar Days" },
        { value: "business_days", label: "Business Days" },
      ],
      non_working_weekdays: [
        { value: "monday", label: "Monday" },
        { value: "tuesday", label: "Tuesday" },
        { value: "wednesday", label: "Wednesday" },
        { value: "thursday", label: "Thursday" },
        { value: "friday", label: "Friday" },
        { value: "saturday", label: "Saturday" },
        { value: "sunday", label: "Sunday" },
      ],
      common_due_anchors: [
        { value: "record_created_on", label: "Record Created On" },
        { value: "today", label: "Today" },
      ],
      trigger_presets: [
        {
          key: "onboarding",
          label: "Onboarding Trigger",
          match_terms: ["onboarding"],
          allowed_due_anchors: [
            { value: "today", label: "Today" },
            { value: "record_created_on", label: "Record Created On" },
            { value: "preboarding_started_on", label: "Preboarding Started On" },
            { value: "expected_joining_date", label: "Expected Joining Date" },
            { value: "actual_joining_date", label: "Actual Joining Date" },
            { value: "joining_date", label: "Joining Date" },
          ],
        },
        {
          key: "exit",
          label: "Exit Or Clearance Trigger",
          match_terms: ["exit", "clearance", "offboarding"],
          allowed_due_anchors: [
            { value: "today", label: "Today" },
            { value: "record_created_on", label: "Record Created On" },
            { value: "resignation_date", label: "Resignation Date" },
            { value: "proposed_last_working_date", label: "Proposed Last Working Date" },
            { value: "approved_last_working_date", label: "Approved Last Working Date" },
            { value: "last_working_date", label: "Last Working Date" },
            { value: "actual_exit_date", label: "Actual Exit Date" },
          ],
        },
        {
          key: "default",
          label: "Generic Lifecycle Trigger",
          match_terms: [],
          allowed_due_anchors: [
            { value: "today", label: "Today" },
            { value: "record_created_on", label: "Record Created On" },
            { value: "preboarding_started_on", label: "Preboarding Started On" },
            { value: "expected_joining_date", label: "Expected Joining Date" },
            { value: "actual_joining_date", label: "Actual Joining Date" },
            { value: "joining_date", label: "Joining Date" },
            { value: "resignation_date", label: "Resignation Date" },
            { value: "proposed_last_working_date", label: "Proposed Last Working Date" },
            { value: "approved_last_working_date", label: "Approved Last Working Date" },
            { value: "last_working_date", label: "Last Working Date" },
            { value: "actual_exit_date", label: "Actual Exit Date" },
          ],
        },
      ],
    },
  };

  const demoHrAdminDocumentOptions: HrAdminDocumentOptions = {
    document_category_types: [
      { value: "identity", label: "Identity" },
      { value: "address", label: "Address" },
      { value: "education", label: "Education" },
      { value: "bank", label: "Bank" },
      { value: "tax", label: "Tax" },
      { value: "contract", label: "Contract" },
      { value: "other", label: "Other" },
    ],
    verification_statuses: [
      { value: "pending", label: "Pending" },
      { value: "verified", label: "Verified" },
      { value: "rejected", label: "Rejected" },
      { value: "expired", label: "Expired" },
    ],
    employee_document_statuses: [
      { value: "active", label: "Active" },
      { value: "archived", label: "Archived" },
      { value: "replaced", label: "Replaced" },
    ],
    letter_types: [
      { value: "offer", label: "Offer Letter" },
      { value: "appointment", label: "Appointment Letter" },
      { value: "confirmation", label: "Confirmation Letter" },
      { value: "experience", label: "Experience Letter" },
    ],
    max_upload_size_bytes: 10 * 1024 * 1024,
    categories: [
      { id: "dc-1", name: "Aadhaar Card" },
      { id: "dc-2", name: "PAN Card" },
      { id: "dc-3", name: "Cancelled Cheque" },
    ],
    legal_entities: demoHrAdminPolicyOptions.legal_entities,
    branches: demoHrAdminPolicyOptions.branches,
    departments: demoHrAdminPolicyOptions.departments,
    grades: demoHrAdminPolicyOptions.grades,
    employment_types: demoHrAdminPolicyOptions.employment_types,
  };

  const demoHrAdminDocumentCategories: HrAdminDocumentCategory[] = [
    {
      id: "dc-1",
      code: "aadhaar-card",
      name: "Aadhaar Card",
      category_type: "identity",
      description: "Primary identity proof for India-based employees.",
      is_active: true,
      is_system_seeded: true,
      requires_expiry_date: false,
      requires_verification: true,
      allow_employee_upload: true,
      allow_multiple_files: false,
      visibility_rules: {},
    },
    {
      id: "dc-2",
      code: "pan-card",
      name: "PAN Card",
      category_type: "tax",
      description: "Permanent Account Number card for tax and payroll linkage.",
      is_active: true,
      is_system_seeded: true,
      requires_expiry_date: false,
      requires_verification: true,
      allow_employee_upload: true,
      allow_multiple_files: false,
      visibility_rules: {},
    },
    {
      id: "dc-3",
      code: "cancelled-cheque",
      name: "Cancelled Cheque",
      category_type: "bank",
      description: "Bank account proof for salary processing.",
      is_active: true,
      is_system_seeded: false,
      requires_expiry_date: false,
      requires_verification: true,
      allow_employee_upload: true,
      allow_multiple_files: false,
      visibility_rules: {},
    },
  ];

  const demoHrAdminDocumentRequirements: HrAdminDocumentRequirementRule[] = [
    {
      id: "dr-1",
      category_id: "dc-1",
      category_name: "Aadhaar Card",
      legal_entity_id: "le-1",
      legal_entity: "Northstar Foods Pvt Ltd",
      branch_id: "br-1",
      branch: "Bengaluru HO",
      department_id: null,
      department: null,
      grade_id: null,
      grade: null,
      employment_type_id: "et-1",
      employment_type: "Full Time",
      is_mandatory: true,
      required_within_days_of_joining: 0,
      priority: 100,
      is_active: true,
    },
    {
      id: "dr-2",
      category_id: "dc-3",
      category_name: "Cancelled Cheque",
      legal_entity_id: "le-1",
      legal_entity: "Northstar Foods Pvt Ltd",
      branch_id: "br-1",
      branch: "Bengaluru HO",
      department_id: "dep-1",
      department: "People Operations",
      grade_id: null,
      grade: null,
      employment_type_id: "et-1",
      employment_type: "Full Time",
      is_mandatory: true,
      required_within_days_of_joining: 3,
      priority: 120,
      is_active: true,
    },
  ];

  const demoHrAdminEmployeeDocuments: HrAdminEmployeeDocument[] = [
    {
      id: "ed-1",
      employee_id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
      employee_code: "EMP-0042",
      employee_name: "Riya Sharma",
      category_id: "dc-1",
      category_name: "Aadhaar Card",
      artifact_id: "artifact-1",
      previous_document_id: null,
      replaced_by_document_id: null,
      version_number: 1,
      title: "Riya Aadhaar Front and Back",
      file_name: "riya-aadhaar.pdf",
      file_url: "",
      file_path: "/secure/docs/riya-aadhaar.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 524288,
      status: "active",
      verification_status: "pending",
      document_number: "XXXX-XXXX-4421",
      issued_on: null,
      expires_on: null,
      expiry_state: "no_expiry",
      expiry_label: "No expiry",
      days_until_expiry: null,
      is_expired: false,
      is_expiring_soon: false,
      uploaded_by_identifier: "riya.sharma",
      verified_by_identifier: "",
      verified_at: null,
      rejection_reason: "",
      reupload_requested: false,
      reupload_requested_at: null,
      reupload_requested_by_identifier: "",
      version_history: [
        {
          id: "ed-1",
          version_number: 1,
          title: "Riya Aadhaar Front and Back",
          status: "active",
          verification_status: "pending",
          file_name: "riya-aadhaar.pdf",
          created_at: "2026-06-05T10:30:00+05:30",
        },
      ],
      review_history: [],
      created_at: "2026-06-05T10:30:00+05:30",
      updated_at: "2026-06-05T10:30:00+05:30",
    },
    {
      id: "ed-2",
      employee_id: "emp-0043",
      employee_code: "EMP-0043",
      employee_name: "Aman Verma",
      category_id: "dc-3",
      category_name: "Cancelled Cheque",
      artifact_id: "artifact-2",
      previous_document_id: null,
      replaced_by_document_id: null,
      version_number: 1,
      title: "Salary Account Cheque",
      file_name: "aman-cheque.jpg",
      file_url: "",
      file_path: "/secure/docs/aman-cheque.jpg",
      mime_type: "image/jpeg",
      file_size_bytes: 348160,
      status: "active",
      verification_status: "verified",
      document_number: "",
      issued_on: null,
      expires_on: "2026-06-28",
      expiry_state: "expiring_soon",
      expiry_label: "Expiring soon",
      days_until_expiry: 9,
      is_expired: false,
      is_expiring_soon: true,
      uploaded_by_identifier: "aman.verma",
      verified_by_identifier: "nisha.rao",
      verified_at: "2026-06-01T14:15:00+05:30",
      rejection_reason: "",
      reupload_requested: false,
      reupload_requested_at: null,
      reupload_requested_by_identifier: "",
      version_history: [
        {
          id: "ed-2",
          version_number: 1,
          title: "Salary Account Cheque",
          status: "active",
          verification_status: "verified",
          file_name: "aman-cheque.jpg",
          created_at: "2026-05-31T18:00:00+05:30",
        },
      ],
      review_history: [
        {
          id: "review-2",
          previous_status: "pending",
          new_status: "verified",
          actor_identifier: "nisha.rao",
          comment: "",
          created_at: "2026-06-01T14:15:00+05:30",
        },
      ],
      created_at: "2026-05-31T18:00:00+05:30",
      updated_at: "2026-06-01T14:15:00+05:30",
    },
    {
      id: "ed-3",
      employee_id: "emp-0044",
      employee_code: "EMP-0044",
      employee_name: "Meera Iyer",
      category_id: "dc-2",
      category_name: "PAN Card",
      artifact_id: "artifact-3",
      previous_document_id: "ed-3-v1",
      replaced_by_document_id: null,
      version_number: 2,
      title: "PAN Upload",
      file_name: "meera-pan.pdf",
      file_url: "",
      file_path: "/secure/docs/meera-pan.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 262144,
      status: "active",
      verification_status: "rejected",
      document_number: "ABCDE1234F",
      issued_on: null,
      expires_on: "2026-06-10",
      expiry_state: "expired",
      expiry_label: "Expired",
      days_until_expiry: -9,
      is_expired: true,
      is_expiring_soon: false,
      uploaded_by_identifier: "meera.iyer",
      verified_by_identifier: "nisha.rao",
      verified_at: "2026-06-03T11:40:00+05:30",
      rejection_reason: "Uploaded image is blurred. Please re-upload a clearer copy.",
      reupload_requested: true,
      reupload_requested_at: "2026-06-03T11:40:00+05:30",
      reupload_requested_by_identifier: "nisha.rao",
      version_history: [
        {
          id: "ed-3",
          version_number: 2,
          title: "PAN Upload",
          status: "active",
          verification_status: "rejected",
          file_name: "meera-pan.pdf",
          created_at: "2026-06-02T16:20:00+05:30",
        },
        {
          id: "ed-3-v1",
          version_number: 1,
          title: "PAN Upload Draft",
          status: "replaced",
          verification_status: "rejected",
          file_name: "meera-pan-old.pdf",
          created_at: "2026-06-01T12:10:00+05:30",
        },
      ],
      review_history: [
        {
          id: "review-3",
          previous_status: "pending",
          new_status: "rejected",
          actor_identifier: "nisha.rao",
          comment: "Uploaded image is blurred. Please re-upload a clearer copy.",
          created_at: "2026-06-03T11:40:00+05:30",
        },
      ],
      created_at: "2026-06-02T16:20:00+05:30",
      updated_at: "2026-06-03T11:40:00+05:30",
    },
  ];

  const demoHrAdminGeneratedLetters: HrAdminGeneratedLetter[] = [
    {
      id: "gl-1",
      employee_id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
      employee_code: "EMP-0042",
      employee_name: "Riya Sharma",
      artifact_id: "artifact-letter-1",
      letter_type: "confirmation",
      title: "Riya Confirmation Letter",
      template_code: "confirmation-standard",
      status: "active",
      issue_date: "2026-06-07",
      file_name: "riya-confirmation-letter-2026-06-07.txt",
      file_url: "/api/v1/hr-admin/generated-letters/gl-1/download/",
      file_path: "/secure/docs/riya-confirmation-letter-2026-06-07.txt",
      workflow_reference: "WF-CONF-0042",
      payload_snapshot: {
        generated_by_identifier: "EMP-0001",
        used_variables: ["employee_name", "designation", "legal_entity", "issue_date"],
      },
      rendered_text:
        "Dear Riya,\n\nThis confirms Riya Sharma as Assistant Manager at Northstar Foods Pvt Ltd effective 2026-06-07.\n\nRegards,\nPeople Operations",
      created_at: "2026-06-07T11:30:00+05:30",
      updated_at: "2026-06-07T11:30:00+05:30",
    },
    {
      id: "gl-2",
      employee_id: "emp-0043",
      employee_code: "EMP-0043",
      employee_name: "Aman Verma",
      artifact_id: "artifact-letter-2",
      letter_type: "experience",
      title: "Aman Experience Letter",
      template_code: "experience-standard",
      status: "active",
      issue_date: "2026-06-10",
      file_name: "aman-experience-letter-2026-06-10.txt",
      file_url: "/api/v1/hr-admin/generated-letters/gl-2/download/",
      file_path: "/secure/docs/aman-experience-letter-2026-06-10.txt",
      workflow_reference: "WF-EXP-0043",
      payload_snapshot: {
        generated_by_identifier: "EMP-0001",
        used_variables: ["employee_name", "department", "issue_date"],
      },
      rendered_text:
        "This is to certify that Aman Verma worked with Sales and completed all assigned responsibilities as of 2026-06-10.",
      created_at: "2026-06-10T16:10:00+05:30",
      updated_at: "2026-06-10T16:10:00+05:30",
    },
  ];

  const demoHrAdminLifecycleOptions: HrAdminLifecycleOptions = {
    onboarding_statuses: [
      { value: "not_started", label: "Not Started" },
      { value: "in_progress", label: "In Progress" },
      { value: "completed", label: "Completed" },
      { value: "blocked", label: "Blocked" },
      { value: "cancelled", label: "Cancelled" },
    ],
    probation_decisions: [
      { value: "pending", label: "Pending" },
      { value: "confirm", label: "Confirm" },
      { value: "extend", label: "Extend" },
      { value: "separate", label: "Separate" },
    ],
    movement_types: [
      { value: "transfer", label: "Transfer" },
      { value: "promotion", label: "Promotion" },
      { value: "designation_change", label: "Designation Change" },
      { value: "reporting_change", label: "Reporting Change" },
      { value: "grade_change", label: "Grade Change" },
      { value: "location_change", label: "Location Change" },
    ],
    lifecycle_event_statuses: [
      { value: "draft", label: "Draft" },
      { value: "pending", label: "Pending" },
      { value: "approved", label: "Approved" },
      { value: "rejected", label: "Rejected" },
      { value: "completed", label: "Completed" },
      { value: "cancelled", label: "Cancelled" },
    ],
    exit_statuses: [
      { value: "draft", label: "Draft" },
      { value: "pending_approval", label: "Pending Approval" },
      { value: "approved", label: "Approved" },
      { value: "clearance_in_progress", label: "Clearance In Progress" },
      { value: "completed", label: "Completed" },
      { value: "cancelled", label: "Cancelled" },
    ],
    employees: demoHrAdminEmployees.map((item) => ({ id: item.id, name: item.full_name, employee_code: item.employee_code })),
    legal_entities: demoHrAdminPolicyOptions.legal_entities,
    branches: demoHrAdminPolicyOptions.branches,
    locations: demoHrAdminPolicyOptions.locations,
    departments: demoHrAdminPolicyOptions.departments,
    business_units: [{ id: "bu-1", name: "Corporate" }],
    designations: [
      { id: "des-1", name: "HR Manager" },
      { id: "des-2", name: "Assistant Manager" },
      { id: "des-3", name: "Sales Executive" },
    ],
    grades: demoHrAdminPolicyOptions.grades,
    employment_types: demoHrAdminPolicyOptions.employment_types,
    managers: demoHrAdminEmployees.map((item) => ({ id: item.id, name: item.full_name, employee_code: item.employee_code })),
    lifecycle_owners: [
      { value: "identifier:karan.mehta", label: "Karan Mehta (EMP-0002)" },
      { value: "identifier:nisha.rao", label: "Nisha Rao (EMP-0001)" },
    ],
  };

  const demoHrAdminOnboardings: HrAdminOnboarding[] = [
    {
      id: "ob-1",
      employee_id: "emp-0044",
      employee_name: "Meera Iyer",
      employee_code: "EMP-0044",
      status: "in_progress",
      expected_joining_date: "2026-06-15",
      actual_joining_date: null,
      onboarding_template_code: "standard-office-joiner",
      owner_value: "identifier:nisha.rao",
      assigned_owner_identifier: "nisha.rao",
      workflow_reference: "wf-onboard-001",
      checklist_snapshot: [
        {
          code: "id-proof",
          label: "Collect identity proof",
          done: true,
          required: true,
          blocking: true,
          owner: "identifier:nisha.rao",
          owner_label: "Nisha Rao (EMP-0001)",
          owner_source_type: "manual",
          escalation_owner: "",
          auto_reassign_on_escalation: false,
          due_on: "2026-06-08",
          escalate_after_days: 2,
          escalates_on: "2026-06-10",
          is_overdue: false,
          is_escalation_due: false,
          is_escalated: false,
          escalated_at: "",
          notes: "",
          due_date_source: "",
          source_due_offset_unit: "",
          source_non_working_weekdays: [],
          source_template_code: "standard-office-joiner",
          source_template_name: "Standard Office Joiner",
          source_template_version: 1,
          source_step_id: "",
          source_step_order: 1,
          source_step_name: "Collect identity proof",
          source_due_anchor: "expected_joining_date",
          source_due_offset_days: -7,
          history: [],
          last_action_at: "",
          last_action_by: "",
        },
        {
          code: "bank-proof",
          label: "Collect bank proof",
          done: false,
          required: true,
          blocking: true,
          owner: "identifier:nisha.rao",
          owner_label: "Nisha Rao (EMP-0001)",
          owner_source_type: "manual",
          escalation_owner: "identifier:karan.mehta",
          auto_reassign_on_escalation: false,
          due_on: "2026-06-14",
          escalate_after_days: 1,
          escalates_on: "2026-06-15",
          is_overdue: false,
          is_escalation_due: false,
          is_escalated: false,
          escalated_at: "",
          notes: "",
          due_date_source: "",
          source_due_offset_unit: "calendar_days",
          source_non_working_weekdays: [],
          source_template_code: "standard-office-joiner",
          source_template_name: "Standard Office Joiner",
          source_template_version: 1,
          source_step_id: "",
          source_step_order: 2,
          source_step_name: "Collect bank proof",
          source_due_anchor: "expected_joining_date",
          source_due_offset_days: -1,
          history: [],
          last_action_at: "",
          last_action_by: "",
        },
      ],
      notes: "Laptop allocation pending.",
      preboarding_started_at: "2026-06-05T10:00:00+05:30",
      completed_at: null,
      is_rehire_journey: false,
      checklist_total_count: 2,
      checklist_completed_count: 1,
      checklist_open_count: 1,
      checklist_overdue_count: 0,
      checklist_escalation_due_count: 0,
      attention_state: "due_soon",
      attention_rank: 2,
      attention_item_count: 1,
      attention_summary: "1 onboarding item still open before joining date.",
      attention_due_on: "2026-06-14",
      next_due_on: "2026-06-14",
      next_escalation_on: "2026-06-15",
      required_document_count: 3,
      missing_required_document_count: 1,
      future_due_document_count: 0,
      missing_required_document_names: ["Cancelled Cheque"],
    },
    {
      id: "ob-2",
      employee_id: "emp-0043",
      employee_name: "Aman Verma",
      employee_code: "EMP-0043",
      status: "completed",
      expected_joining_date: "2026-05-20",
      actual_joining_date: "2026-05-20",
      onboarding_template_code: "standard-office-joiner",
      owner_value: "identifier:nisha.rao",
      assigned_owner_identifier: "nisha.rao",
      workflow_reference: "wf-onboard-0007",
      checklist_snapshot: [
        {
          code: "id-proof",
          label: "Collect identity proof",
          done: true,
          required: true,
          blocking: true,
          owner: "identifier:nisha.rao",
          owner_label: "Nisha Rao (EMP-0001)",
          owner_source_type: "manual",
          escalation_owner: "",
          auto_reassign_on_escalation: false,
          due_on: "2026-05-13",
          escalate_after_days: 2,
          escalates_on: "2026-05-15",
          is_overdue: false,
          is_escalation_due: false,
          is_escalated: false,
          escalated_at: "",
          notes: "",
          due_date_source: "",
          source_due_offset_unit: "",
          source_non_working_weekdays: [],
          source_template_code: "standard-office-joiner",
          source_template_name: "Standard Office Joiner",
          source_template_version: 1,
          source_step_id: "",
          source_step_order: 1,
          source_step_name: "Collect identity proof",
          source_due_anchor: "expected_joining_date",
          source_due_offset_days: -7,
          history: [],
          last_action_at: "",
          last_action_by: "",
        },
        {
          code: "bank-proof",
          label: "Collect bank proof",
          done: true,
          required: true,
          blocking: true,
          owner: "identifier:nisha.rao",
          owner_label: "Nisha Rao (EMP-0001)",
          owner_source_type: "manual",
          escalation_owner: "",
          auto_reassign_on_escalation: false,
          due_on: "2026-05-19",
          escalate_after_days: 1,
          escalates_on: "2026-05-20",
          is_overdue: false,
          is_escalation_due: false,
          is_escalated: false,
          escalated_at: "",
          notes: "",
          due_date_source: "",
          source_due_offset_unit: "calendar_days",
          source_non_working_weekdays: [],
          source_template_code: "standard-office-joiner",
          source_template_name: "Standard Office Joiner",
          source_template_version: 1,
          source_step_id: "",
          source_step_order: 2,
          source_step_name: "Collect bank proof",
          source_due_anchor: "expected_joining_date",
          source_due_offset_days: -1,
          history: [],
          last_action_at: "",
          last_action_by: "",
        },
      ],
      notes: "All joining tasks complete.",
      preboarding_started_at: "2026-05-10T09:00:00+05:30",
      completed_at: "2026-05-21T18:00:00+05:30",
      is_rehire_journey: false,
      checklist_total_count: 2,
      checklist_completed_count: 2,
      checklist_open_count: 0,
      checklist_overdue_count: 0,
      checklist_escalation_due_count: 0,
      attention_state: "on_track",
      attention_rank: 0,
      attention_item_count: 0,
      attention_summary: "Onboarding completed with no open checklist items.",
      attention_due_on: null,
      next_due_on: null,
      next_escalation_on: null,
      required_document_count: 3,
      missing_required_document_count: 0,
      future_due_document_count: 0,
      missing_required_document_names: [],
    },
  ];

  const demoHrAdminProbationReviews: HrAdminProbationReview[] = [
    {
      id: "pr-1",
      employee_id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
      employee_name: "Riya Sharma",
      employee_code: "EMP-0042",
      review_date: "2026-07-10",
      probation_end_date: "2026-07-15",
      decision: "pending",
      extension_end_date: null,
      owner_value: "identifier:karan.mehta",
      reviewer_identifier: "karan.mehta",
      workflow_reference: "wf-prob-001",
      remarks: "Manager feedback awaited.",
    },
    {
      id: "pr-2",
      employee_id: "emp-0043",
      employee_name: "Aman Verma",
      employee_code: "EMP-0043",
      review_date: "2026-05-30",
      probation_end_date: "2026-06-01",
      decision: "confirm",
      extension_end_date: null,
      owner_value: "identifier:nisha.rao",
      reviewer_identifier: "nisha.rao",
      workflow_reference: "wf-prob-0004",
      remarks: "Confirmed based on first quarter performance.",
    },
  ];

  const demoHrAdminMovements: HrAdminMovement[] = [
    {
      id: "mv-1",
      employee_id: "emp-0043",
      employee_name: "Aman Verma",
      employee_code: "EMP-0043",
      movement_type: "promotion",
      status: "pending",
      effective_date: "2026-07-01",
      reason: "Promotion to Senior Sales Executive.",
      workflow_reference: "wf-move-001",
      current_snapshot: { source: "hr-admin" },
      from_legal_entity_id: "le-1",
      from_legal_entity: "Northstar Foods Pvt Ltd",
      to_legal_entity_id: "le-1",
      to_legal_entity: "Northstar Foods Pvt Ltd",
      from_branch_id: "br-1",
      from_branch: "Bengaluru HO",
      to_branch_id: "br-1",
      to_branch: "Bengaluru HO",
      from_location_id: "loc-1",
      from_location: "Bengaluru",
      to_location_id: "loc-1",
      to_location: "Bengaluru",
      from_department_id: "dep-2",
      from_department: "Sales",
      to_department_id: "dep-2",
      to_department: "Sales",
      from_business_unit_id: "bu-1",
      from_business_unit: "Corporate",
      to_business_unit_id: "bu-1",
      to_business_unit: "Corporate",
      from_designation_id: "des-3",
      from_designation: "Sales Executive",
      to_designation_id: "des-2",
      to_designation: "Assistant Manager",
      from_grade_id: "gr-2",
      from_grade: "IC1",
      to_grade_id: "gr-1",
      to_grade: "M1",
      from_employment_type_id: "et-1",
      from_employment_type: "Full Time",
      to_employment_type_id: "et-1",
      to_employment_type: "Full Time",
      from_manager_id: "emp-0002",
      from_manager: "Karan Mehta",
      owner_value: "identifier:nisha.rao",
      to_manager_id: "emp-0001",
      to_manager: "Nisha Rao",
    },
  ];

  const demoHrAdminExits: HrAdminExit[] = [
    {
      id: "ex-1",
      employee_id: "emp-0044",
      employee_name: "Meera Iyer",
      employee_code: "EMP-0044",
      status: "pending_approval",
      resignation_date: "2026-06-04",
      notice_start_date: "2026-06-05",
      notice_end_date: "2026-07-04",
      proposed_last_working_date: "2026-07-04",
      approved_last_working_date: null,
      actual_exit_date: null,
      exit_reason: "Personal",
      exit_reason_detail: "Relocating to another city.",
      is_regrettable: true,
      rehire_eligible: true,
      workflow_reference: "wf-exit-001",
      clearance_status_snapshot: {
        workflow_template_code: "exit-clearance-standard",
        notes: "Standard exit checklist is underway.",
        items: [
          {
            code: "asset-return",
            label: "Return company assets",
            done: false,
            required: true,
            blocking: true,
            owner: "identifier:nisha.rao",
            owner_label: "Nisha Rao (EMP-0001)",
            owner_source_type: "manual",
            escalation_owner: "identifier:karan.mehta",
            auto_reassign_on_escalation: false,
            due_on: "2026-07-02",
            escalate_after_days: 1,
            escalates_on: "2026-07-03",
            is_overdue: false,
            is_escalation_due: false,
            is_escalated: false,
            escalated_at: "",
            notes: "",
            due_date_source: "",
            source_due_offset_unit: "business_days",
            source_non_working_weekdays: ["saturday", "sunday"],
            source_template_code: "exit-clearance-standard",
            source_template_name: "Exit Clearance Standard",
            source_template_version: 1,
            source_step_id: "",
            source_step_order: 1,
            source_step_name: "Return company assets",
            source_due_anchor: "approved_last_working_date",
            source_due_offset_days: -2,
            history: [],
            last_action_at: "",
            last_action_by: "",
          },
          {
            code: "finance-noc",
            label: "Finance no-dues check",
            done: false,
            required: true,
            blocking: true,
            owner: "identifier:karan.mehta",
            owner_label: "Karan Mehta (EMP-0002)",
            owner_source_type: "manual",
            escalation_owner: "",
            auto_reassign_on_escalation: false,
            due_on: "2026-07-04",
            escalate_after_days: 0,
            escalates_on: "2026-07-04",
            is_overdue: false,
            is_escalation_due: false,
            is_escalated: false,
            escalated_at: "",
            notes: "",
            due_date_source: "",
            source_due_offset_unit: "calendar_days",
            source_non_working_weekdays: [],
            source_template_code: "exit-clearance-standard",
            source_template_name: "Exit Clearance Standard",
            source_template_version: 1,
            source_step_id: "",
            source_step_order: 2,
            source_step_name: "Finance no-dues check",
            source_due_anchor: "approved_last_working_date",
            source_due_offset_days: 0,
            history: [],
            last_action_at: "",
            last_action_by: "",
          },
        ],
      },
      handover_notes: "Sales territory transition to be completed.",
      clearance_total_count: 2,
      clearance_completed_count: 0,
      clearance_open_count: 2,
      clearance_overdue_count: 0,
      clearance_escalation_due_count: 0,
      attention_state: "in_progress",
      attention_rank: 2,
      attention_item_count: 2,
      attention_summary: "2 clearance items still open before separation.",
      attention_due_on: "2026-07-02",
      next_due_on: "2026-07-02",
      next_escalation_on: "2026-07-03",
    },
  ];

  const demoHrAdminNotificationTemplates: HrAdminNotificationTemplate[] = [
    {
      id: "nt-1",
      code: "leave-manager-pending",
      name: "Leave Manager Pending",
      channel: "in_app",
      status: "active",
      subject_template: "",
      title_template: "New leave request pending approval",
      body_template: "A team member has submitted a leave request that needs your action.",
      metadata_template: {},
      is_system_seeded: true,
    },
    {
      id: "nt-2",
      code: "attendance-employee-updated",
      name: "Attendance Employee Updated",
      channel: "in_app",
      status: "active",
      subject_template: "",
      title_template: "Attendance regularization updated",
      body_template: "Your attendance regularization status has changed.",
      metadata_template: {},
      is_system_seeded: true,
    },
  ];

  const demoHrAdminNotificationEvents: HrAdminNotificationEventDefinition[] = [
    {
      id: "ne-1",
      code: "leave-manager-pending",
      name: "Leave Pending For Manager",
      module: "leave",
      trigger_key: "leave.request.manager_pending",
      audience_type: "manager",
      channel: "in_app",
      template_id: "nt-1",
      template_name: "Leave Manager Pending",
      role_id: null,
      role_name: null,
      membership_id: null,
      membership_name: null,
      is_active: true,
      priority: "normal",
      delivery_delay_minutes: 0,
      recipient_snapshot: {},
    },
    {
      id: "ne-2",
      code: "attendance-employee-updated",
      name: "Attendance Updated For Employee",
      module: "attendance",
      trigger_key: "attendance.regularization.employee_updated",
      audience_type: "employee",
      channel: "in_app",
      template_id: "nt-2",
      template_name: "Attendance Employee Updated",
      role_id: null,
      role_name: null,
      membership_id: null,
      membership_name: null,
      is_active: true,
      priority: "normal",
      delivery_delay_minutes: 0,
      recipient_snapshot: {},
    },
    {
      id: "ne-3",
      code: "documents-onboarding-attention",
      name: "Onboarding Document Attention",
      module: "documents",
      trigger_key: "documents.onboarding.attention_required",
      audience_type: "membership",
      channel: "in_app",
      template_id: null,
      template_name: null,
      role_id: null,
      role_name: null,
      membership_id: null,
      membership_name: null,
      is_active: true,
      priority: "high",
      delivery_delay_minutes: 0,
      recipient_snapshot: { routing: "lifecycle_owner_or_hr" },
    },
    {
      id: "ne-4",
      code: "documents-employee-upload-submitted",
      name: "Employee Document Upload Submitted",
      module: "documents",
      trigger_key: "documents.employee.upload_submitted",
      audience_type: "membership",
      channel: "in_app",
      template_id: null,
      template_name: null,
      role_id: null,
      role_name: null,
      membership_id: null,
      membership_name: null,
      is_active: true,
      priority: "normal",
      delivery_delay_minutes: 0,
      recipient_snapshot: { routing: "hr_owner" },
    },
    {
      id: "ne-5",
      code: "documents-employee-reupload-requested",
      name: "Employee Document Re-upload Requested",
      module: "documents",
      trigger_key: "documents.employee.reupload_requested",
      audience_type: "employee",
      channel: "in_app",
      template_id: null,
      template_name: null,
      role_id: null,
      role_name: null,
      membership_id: null,
      membership_name: null,
      is_active: true,
      priority: "high",
      delivery_delay_minutes: 0,
      recipient_snapshot: { routing: "employee_membership" },
    },
    {
      id: "ne-6",
      code: "documents-employee-expiry-attention",
      name: "Employee Document Expiry Attention",
      module: "documents",
      trigger_key: "documents.employee.expiry_attention",
      audience_type: "employee",
      channel: "in_app",
      template_id: null,
      template_name: null,
      role_id: null,
      role_name: null,
      membership_id: null,
      membership_name: null,
      is_active: true,
      priority: "high",
      delivery_delay_minutes: 0,
      recipient_snapshot: { routing: "employee_membership" },
    },
  ];

  const demoHrAdminNotifications: HrAdminNotification[] = [
    {
      id: "n-1",
      event_definition_id: "ne-1",
      event_definition_name: "Leave Pending For Manager",
      channel: "in_app",
      audience_type: "manager",
      subject_type: "leave_request",
      subject_identifier: "2016f1cf-6870-4e52-b604-b2082d4f10aa",
      recipient_membership_id: "membership-0002",
      recipient_membership_name: "Karan Mehta",
      recipient_role_id: null,
      recipient_role_name: null,
      recipient_identifier: "user-0002",
      recipient_address: "",
      title: "New leave request pending approval",
      subject: "",
      body: "Riya Sharma requested leave from 2026-06-21 to 2026-06-22.",
      status: "pending",
      priority: "normal",
      scheduled_for: "2026-06-07T10:00:00+05:30",
      sent_at: null,
      delivered_at: null,
      read_at: null,
      attempt_count: 0,
      max_attempts: 3,
      retry_backoff_minutes: 0,
      retry_limit_reached: false,
      can_retry: true,
      delivery_logs: [],
      payload: { leave_request_id: "2016f1cf-6870-4e52-b604-b2082d4f10aa" },
      created_at: "2026-06-07T10:00:00+05:30",
    },
    {
      id: "n-2",
      event_definition_id: "ne-2",
      event_definition_name: "Attendance Updated For Employee",
      channel: "in_app",
      audience_type: "employee",
      subject_type: "attendance_regularization",
      subject_identifier: "c89f5554-d7f9-4e56-ac5e-c8dfa0c8787c",
      recipient_membership_id: "membership-0042",
      recipient_membership_name: "Riya Sharma",
      recipient_role_id: null,
      recipient_role_name: null,
      recipient_identifier: "user-0042",
      recipient_address: "",
      title: "Attendance regularization updated",
      subject: "",
      body: "Your attendance regularization was approved.",
      status: "read",
      priority: "normal",
      scheduled_for: "2026-06-06T18:00:00+05:30",
      sent_at: "2026-06-06T18:00:00+05:30",
      delivered_at: "2026-06-06T18:00:00+05:30",
      read_at: "2026-06-06T18:10:00+05:30",
      attempt_count: 1,
      max_attempts: 3,
      retry_backoff_minutes: 0,
      retry_limit_reached: false,
      can_retry: true,
      delivery_logs: [
        {
          id: "ndl-1",
          channel: "in_app",
          status: "delivered",
          provider_name: "in_app_default",
          provider_reference: "",
          error_message: "",
          response_payload: { channel: "in_app", mode: "in_app" },
          created_at: "2026-06-06T18:00:00+05:30",
        },
      ],
      payload: { attendance_regularization_id: "c89f5554-d7f9-4e56-ac5e-c8dfa0c8787c", status: "approved" },
      created_at: "2026-06-06T18:00:00+05:30",
    },
    {
      id: "n-3",
      event_definition_id: "ne-5",
      event_definition_name: "Employee Document Re-upload Requested",
      channel: "in_app",
      audience_type: "employee",
      subject_type: "employee_document",
      subject_identifier: "doc-0042-reupload",
      recipient_membership_id: "membership-0042",
      recipient_membership_name: "Riya Sharma",
      recipient_role_id: null,
      recipient_role_name: null,
      recipient_identifier: "riya.sharma",
      recipient_address: "",
      title: "Re-upload requested: PAN Card",
      subject: "",
      body: "Please upload a fresh copy of PAN Card.",
      status: "pending",
      priority: "high",
      scheduled_for: "2026-06-09T11:20:00+05:30",
      sent_at: null,
      delivered_at: null,
      read_at: null,
      attempt_count: 0,
      max_attempts: 3,
      retry_backoff_minutes: 0,
      retry_limit_reached: false,
      can_retry: true,
      delivery_logs: [],
      payload: { document_id: "doc-0042-reupload", category_name: "PAN Card", reminder_source: "manual_action" },
      created_at: "2026-06-09T11:20:00+05:30",
    },
    {
      id: "n-4",
      event_definition_id: "ne-6",
      event_definition_name: "Employee Document Expiry Attention",
      channel: "in_app",
      audience_type: "employee",
      subject_type: "employee_document",
      subject_identifier: "doc-0042-expiry",
      recipient_membership_id: "membership-0042",
      recipient_membership_name: "Riya Sharma",
      recipient_role_id: null,
      recipient_role_name: null,
      recipient_identifier: "riya.sharma",
      recipient_address: "",
      title: "Document expiring soon: Driving Licence",
      subject: "",
      body: "Your document will expire soon. Upload a fresh copy before the deadline.",
      status: "sent",
      priority: "high",
      scheduled_for: "2026-06-19T09:00:00+05:30",
      sent_at: "2026-06-19T09:00:00+05:30",
      delivered_at: "2026-06-19T09:00:00+05:30",
      read_at: null,
      attempt_count: 1,
      max_attempts: 3,
      retry_backoff_minutes: 0,
      retry_limit_reached: false,
      can_retry: true,
      delivery_logs: [
        {
          id: "ndl-2",
          channel: "in_app",
          status: "delivered",
          provider_name: "in_app_default",
          provider_reference: "",
          error_message: "",
          response_payload: { channel: "in_app", mode: "in_app" },
          created_at: "2026-06-19T09:00:00+05:30",
        },
      ],
      payload: { document_id: "doc-0042-expiry", category_name: "Driving Licence", reminder_source: "system_scan", expiry_state: "expiring_soon" },
      created_at: "2026-06-19T09:00:00+05:30",
    },
  ];

  const demoHrAdminNotificationOptions: HrAdminNotificationOptions = {
    notification_channels: [
      { value: "in_app", label: "In-App" },
      { value: "email", label: "Email" },
      { value: "sms", label: "SMS" },
      { value: "push", label: "Push" },
      { value: "whatsapp", label: "WhatsApp" },
    ],
    notification_delivery_backends: [
      { value: "in_app_default", label: "In-App Default", supported_channels: ["in_app"] },
      { value: "email_smtp", label: "Email SMTP", supported_channels: ["email"] },
      { value: "console", label: "Console", supported_channels: ["email", "sms", "push", "whatsapp"] },
      { value: "sms_console", label: "SMS Console", supported_channels: ["sms"] },
      { value: "push_console", label: "Push Console", supported_channels: ["push"] },
      { value: "whatsapp_console", label: "WhatsApp Console", supported_channels: ["whatsapp"] },
    ],
    notification_delivery_authoring: {
      policy_fields: [
        {
          key: "max_attempts",
          label: "Max attempts",
          description: "Caps how many delivery attempts one notification can make before retry is blocked.",
          input_type: "number",
          default_value: 3,
          min_value: 1,
          max_value: 20,
        },
        {
          key: "retry_backoff_minutes",
          label: "Retry backoff minutes",
          description: "Delays queued retries when delivery is rescheduled instead of processed immediately.",
          input_type: "number",
          default_value: 0,
          min_value: 0,
          max_value: 1440,
        },
      ],
      provider_fields: [
        {
          backend_key: "email_smtp",
          key: "reply_to",
          label: "Reply-to email",
          description: "Optional reply-to address used by SMTP-style providers for recipient responses.",
          input_type: "text",
          default_value: "",
          placeholder: "support@example.local",
        },
        {
          backend_key: "console",
          key: "log_label",
          label: "Log label",
          description: "Short label to make console-delivered messages easier to scan during local development.",
          input_type: "text",
          default_value: "default",
          placeholder: "default",
        },
        {
          backend_key: "sms_console",
          key: "template_namespace",
          label: "Template namespace",
          description: "Namespace for SMS template routing once a real provider integration is introduced.",
          input_type: "text",
          default_value: "default",
          placeholder: "default",
        },
        {
          backend_key: "push_console",
          key: "app_segment",
          label: "App segment",
          description: "Logical push target or mobile app segment that future providers can use for routing.",
          input_type: "text",
          default_value: "employees",
          placeholder: "employees",
        },
        {
          backend_key: "whatsapp_console",
          key: "template_language",
          label: "Template language",
          description: "Default WhatsApp template language code for future provider-backed template sends.",
          input_type: "text",
          default_value: "en",
          placeholder: "en",
        },
      ],
      channel_hints: [
        {
          channel: "in_app",
          sender_identifier_label: "Workspace sender key",
          sender_identifier_placeholder: "nexora-hrms",
          sender_address_label: "Sender address",
          sender_address_placeholder: "Not required for in-app delivery",
          provider_config_example: {},
        },
        {
          channel: "email",
          sender_identifier_label: "From name or sender key",
          sender_identifier_placeholder: "nexora-hrms",
          sender_address_label: "From email",
          sender_address_placeholder: "notifications@example.local",
          provider_config_example: { reply_to: "support@example.local" },
        },
        {
          channel: "sms",
          sender_identifier_label: "SMS sender ID",
          sender_identifier_placeholder: "NEXORA",
          sender_address_label: "Sender address",
          sender_address_placeholder: "Optional callback or route address",
          provider_config_example: { template_namespace: "default" },
        },
        {
          channel: "push",
          sender_identifier_label: "Push app key",
          sender_identifier_placeholder: "nexora-mobile",
          sender_address_label: "Sender address",
          sender_address_placeholder: "Optional endpoint alias",
          provider_config_example: { app_segment: "employees" },
        },
        {
          channel: "whatsapp",
          sender_identifier_label: "WhatsApp business key",
          sender_identifier_placeholder: "nexora-wa",
          sender_address_label: "Sender address",
          sender_address_placeholder: "Optional business route address",
          provider_config_example: { template_language: "en" },
        },
      ],
    },
    notification_catalog_authoring: {
      template_channel_hints: [
        {
          channel: "in_app",
          subject_supported: false,
          title_supported: true,
          body_placeholder: "Your request was reviewed. Open the workspace to continue.",
          sample_variables: ["employee_name", "request_id", "status"],
          metadata_fields: [
            {
              key: "action_path",
              label: "Action path",
              description: "Relative workspace path that in-app notifications can deep-link into.",
              input_type: "text",
              default_value: "",
              placeholder: "/hr-admin/notifications",
            },
          ],
        },
        {
          channel: "email",
          subject_supported: true,
          title_supported: false,
          body_placeholder: "Hello {{ employee_name }},\n\nYour request status is now {{ status }}.",
          sample_variables: ["employee_name", "status", "effective_date"],
          metadata_fields: [
            {
              key: "reply_to_label",
              label: "Reply-to label",
              description: "Optional display label paired with reply-to handling for later provider integrations.",
              input_type: "text",
              default_value: "",
              placeholder: "HR Helpdesk",
            },
          ],
        },
        {
          channel: "sms",
          subject_supported: false,
          title_supported: false,
          body_placeholder: "Hi {{ employee_name }}, your request is {{ status }}.",
          sample_variables: ["employee_name", "status", "short_code"],
          metadata_fields: [
            {
              key: "sms_category",
              label: "SMS category",
              description: "Optional tag to separate OTP, transactional, or reminder style templates later.",
              input_type: "text",
              default_value: "transactional",
              placeholder: "transactional",
            },
          ],
        },
        {
          channel: "push",
          subject_supported: false,
          title_supported: true,
          body_placeholder: "{{ title }}\n{{ status_message }}",
          sample_variables: ["title", "status_message", "deep_link"],
          metadata_fields: [
            {
              key: "deep_link",
              label: "Deep link",
              description: "Mobile or web destination used by future push providers when a user opens the notification.",
              input_type: "text",
              default_value: "",
              placeholder: "nexora://employee/requests",
            },
          ],
        },
        {
          channel: "whatsapp",
          subject_supported: false,
          title_supported: false,
          body_placeholder: "Hello {{ employee_name }}, your document {{ document_name }} needs attention.",
          sample_variables: ["employee_name", "document_name", "deadline"],
          metadata_fields: [
            {
              key: "template_name",
              label: "Provider template name",
              description: "External WhatsApp template identifier for future approved-provider integrations.",
              input_type: "text",
              default_value: "",
              placeholder: "document_expiry_alert",
            },
          ],
        },
      ],
      event_module_hints: [
        {
          module: "leave",
          default_channel: "in_app",
          default_audience_type: "manager",
          trigger_examples: [
            {
              key: "leave.request.submitted",
              label: "Leave submitted",
              description: "Route a new leave request into the manager or HR approval queue.",
            },
            {
              key: "leave.request.decision_ready",
              label: "Leave decision ready",
              description: "Inform the employee that the request has been approved, rejected, or sent back.",
            },
          ],
        },
        {
          module: "attendance",
          default_channel: "in_app",
          default_audience_type: "manager",
          trigger_examples: [
            {
              key: "attendance.regularization.submitted",
              label: "Regularization submitted",
              description: "Alert the reviewer when an employee sends a new attendance correction request.",
            },
            {
              key: "attendance.regularization.decision_ready",
              label: "Regularization decision ready",
              description: "Inform the employee after the attendance review is completed.",
            },
          ],
        },
        {
          module: "lifecycle",
          default_channel: "in_app",
          default_audience_type: "custom",
          trigger_examples: [
            {
              key: "lifecycle.onboarding.attention_required",
              label: "Onboarding attention required",
              description: "Route missing onboarding work items to HR or the assigned lifecycle owner.",
            },
            {
              key: "lifecycle.exit.clearance_pending",
              label: "Exit clearance pending",
              description: "Remind owners and employees about open exit or clearance tasks.",
            },
          ],
        },
        {
          module: "documents",
          default_channel: "in_app",
          default_audience_type: "employee",
          trigger_examples: [
            {
              key: "documents.employee.upload_submitted",
              label: "Upload submitted",
              description: "Notify reviewers that a new employee document is waiting in the verification queue.",
            },
            {
              key: "documents.employee.reupload_requested",
              label: "Re-upload requested",
              description: "Tell the employee to upload a corrected document copy.",
            },
            {
              key: "documents.employee.expiry_attention",
              label: "Expiry attention",
              description: "Warn the employee that a document is expired or close to expiry.",
            },
          ],
        },
      ],
      audience_hints: [
        {
          audience_type: "employee",
          label: "Employee",
          description: "Target the employee tied to the event subject, such as a leave request owner or document owner.",
          role_supported: false,
          membership_supported: false,
          recipient_snapshot_example: { routing: "employee_membership" },
          recipient_snapshot_fields: [
            {
              key: "routing",
              label: "Routing key",
              description: "Optional explicit routing label used by downstream delivery logic and review tools.",
              input_type: "text",
              default_value: "employee_membership",
              placeholder: "employee_membership",
            },
          ],
        },
        {
          audience_type: "manager",
          label: "Manager",
          description: "Target the current reporting manager or designated approver connected to the event subject.",
          role_supported: false,
          membership_supported: false,
          recipient_snapshot_example: { routing: "reporting_manager" },
          recipient_snapshot_fields: [
            {
              key: "routing",
              label: "Routing key",
              description: "Use a stable label when manager routing should remain explicit in downstream review surfaces.",
              input_type: "text",
              default_value: "reporting_manager",
              placeholder: "reporting_manager",
            },
          ],
        },
        {
          audience_type: "role",
          label: "Role",
          description: "Target every active membership that currently holds the selected role in the tenant.",
          role_supported: true,
          membership_supported: false,
          recipient_snapshot_example: { routing: "tenant_role", scope: "active_memberships" },
          recipient_snapshot_fields: [
            {
              key: "routing",
              label: "Routing key",
              description: "Optional role-routing label for queue visibility and future provider analytics.",
              input_type: "text",
              default_value: "tenant_role",
              placeholder: "tenant_role",
            },
            {
              key: "scope",
              label: "Scope",
              description: "Optional scope label to describe who inside the role should be targeted.",
              input_type: "text",
              default_value: "active_memberships",
              placeholder: "active_memberships",
            },
          ],
        },
        {
          audience_type: "membership",
          label: "Membership",
          description: "Send directly to one named tenant membership when the delivery target should be fixed.",
          role_supported: false,
          membership_supported: true,
          recipient_snapshot_example: { routing: "fixed_membership" },
          recipient_snapshot_fields: [
            {
              key: "routing",
              label: "Routing key",
              description: "Optional fixed-target label kept with the event for review and troubleshooting.",
              input_type: "text",
              default_value: "fixed_membership",
              placeholder: "fixed_membership",
            },
          ],
        },
        {
          audience_type: "custom",
          label: "Custom",
          description: "Use custom routing when workflow owners, HR fallback, or event-specific resolution logic determines the final audience.",
          role_supported: true,
          membership_supported: true,
          recipient_snapshot_example: { routing: "workflow_owner_or_hr", fallback: "hr_admin" },
          recipient_snapshot_fields: [
            {
              key: "routing",
              label: "Routing key",
              description: "Describe the custom resolver that downstream delivery or review logic should interpret.",
              input_type: "text",
              default_value: "workflow_owner_or_hr",
              placeholder: "workflow_owner_or_hr",
            },
            {
              key: "fallback",
              label: "Fallback target",
              description: "Optional fallback label used when the primary custom audience cannot be resolved.",
              input_type: "text",
              default_value: "hr_admin",
              placeholder: "hr_admin",
            },
          ],
        },
      ],
    },
    notification_audience_types: [
      { value: "employee", label: "Employee" },
      { value: "manager", label: "Manager" },
      { value: "role", label: "Role" },
      { value: "membership", label: "Membership" },
      { value: "custom", label: "Custom" },
    ],
    notification_template_statuses: [
      { value: "draft", label: "Draft" },
      { value: "active", label: "Active" },
      { value: "archived", label: "Archived" },
    ],
    notification_priorities: [
      { value: "low", label: "Low" },
      { value: "normal", label: "Normal" },
      { value: "high", label: "High" },
      { value: "critical", label: "Critical" },
    ],
    notification_statuses: [
      { value: "pending", label: "Pending" },
      { value: "sent", label: "Sent" },
      { value: "delivered", label: "Delivered" },
      { value: "read", label: "Read" },
      { value: "failed", label: "Failed" },
      { value: "cancelled", label: "Cancelled" },
    ],
    notification_retry_states: [
      { value: "retry_ready", label: "Retry Ready" },
      { value: "retry_capped", label: "Retry Capped" },
      { value: "no_retry_needed", label: "No Retry Needed" },
    ],
    notification_subject_types: [
      { value: "leave_request", label: "Leave Request" },
      { value: "attendance_regularization", label: "Attendance Regularization" },
      { value: "employee_document", label: "Employee Document" },
    ],
    workflow_modules: [
      { value: "leave", label: "Leave" },
      { value: "attendance", label: "Attendance" },
      { value: "lifecycle", label: "Lifecycle" },
      { value: "documents", label: "Documents" },
    ],
    templates: demoHrAdminNotificationTemplates.map((item) => ({ id: item.id, name: item.name, channel: item.channel, status: item.status })),
    roles: demoHrAdminEmployeeAccessOptions.roles,
    memberships: [
      { id: "membership-0002", name: "Karan Mehta" },
      { id: "membership-0042", name: "Riya Sharma" },
    ],
    channel_configurations: [
      {
        id: "ncc-1",
        channel: "in_app",
        is_enabled: true,
        backend_key: "in_app_default",
        sender_identifier: "nexora-hrms",
        sender_address: "",
        provider_config: {},
        delivery_policy: {},
      },
      {
        id: "ncc-2",
        channel: "email",
        is_enabled: true,
        backend_key: "email_smtp",
        sender_identifier: "nexora-hrms",
        sender_address: "notifications@example.local",
        provider_config: {},
        delivery_policy: {},
      },
      {
        id: "ncc-3",
        channel: "sms",
        is_enabled: true,
        backend_key: "sms_console",
        sender_identifier: "nexora-hrms",
        sender_address: "",
        provider_config: {},
        delivery_policy: {},
      },
      {
        id: "ncc-4",
        channel: "push",
        is_enabled: true,
        backend_key: "push_console",
        sender_identifier: "nexora-hrms",
        sender_address: "",
        provider_config: {},
        delivery_policy: {},
      },
      {
        id: "ncc-5",
        channel: "whatsapp",
        is_enabled: true,
        backend_key: "whatsapp_console",
        sender_identifier: "nexora-hrms",
        sender_address: "",
        provider_config: {},
        delivery_policy: {},
      },
    ],
  };

  const demoHrAdminDashboard: HrAdminDashboard = {
    overview: {
      total_employees: demoHrAdminEmployees.length,
      active_employees: demoHrAdminEmployees.filter((item) => item.employment_status === "active").length,
      active_memberships: 4,
      configured_departments: demoHrAdminOrganizationSnapshot.summary.departments_count,
      active_branches: demoHrAdminOrganizationSnapshot.summary.branches_count,
      pending_approvals: 4,
    },
    workforce: {
      employment_status_breakdown: [
        { label: "Active", value: 4 },
        { label: "On Notice", value: 1 },
        { label: "Exited", value: 0 },
        { label: "Draft", value: 0 },
        { label: "Inactive", value: 0 },
      ],
      department_headcount: [
        { label: "Operations", value: 2 },
        { label: "People", value: 1 },
        { label: "Finance", value: 1 },
        { label: "Technology", value: 1 },
      ],
      joiners_this_month: 2,
      exits_this_month: 1,
      managers_with_reports: 2,
      employees_without_manager: 1,
    },
    operations: {
      pending_leave_requests: demoLeaveRequests.filter((item) => item.status === "pending").length,
      pending_regularizations: demoRegularizations.filter((item) => item.status === "pending").length,
      pending_onboardings: demoHrAdminOnboardings.filter((item) => item.status !== "completed" && item.status !== "cancelled").length,
      pending_probation_reviews: demoHrAdminProbationReviews.filter((item) => item.decision === "pending").length,
      open_exits: demoHrAdminExits.filter((item) => item.status !== "completed" && item.status !== "cancelled").length,
    },
    documents: {
      pending_verification: demoHrAdminEmployeeDocuments.filter((item) => item.verification_status === "pending").length,
      rejected_documents: demoHrAdminEmployeeDocuments.filter((item) => item.verification_status === "rejected").length,
      expiring_in_30_days: demoHrAdminEmployeeDocuments.filter((item) => item.is_expiring_soon).length,
      mandatory_requirement_rules: demoHrAdminDocumentRequirements.filter((item) => item.is_mandatory).length,
      active_document_categories: demoHrAdminDocumentCategories.filter((item) => item.is_active).length,
    },
    governance: {
      active_leave_policies: demoHrAdminLeavePolicies.filter((item) => item.status === "active").length,
      active_attendance_policies: demoHrAdminAttendancePolicies.filter((item) => item.status === "active").length,
      workflow_templates: demoHrAdminWorkflowTemplates.filter((item) => item.status === "active").length,
      active_notification_templates: demoHrAdminNotificationTemplates.filter((item) => item.status === "active").length,
      active_notification_events: demoHrAdminNotificationEvents.filter((item) => item.is_active).length,
    },
    delivery: {
      pending_notifications: demoHrAdminNotifications.filter((item) => item.status === "pending").length,
      sent_today: demoHrAdminNotifications.filter((item) => item.status === "sent" || item.status === "delivered" || item.status === "read").length,
      failed_notifications: demoHrAdminNotifications.filter((item) => item.status === "failed").length,
      documents_expiring_30_days: demoHrAdminEmployeeDocuments.filter((item) => item.is_expiring_soon).length,
      latest_activity_at: "2026-06-07T10:30:00+05:30",
    },
  };

  const buildDemoPayrollReadiness = (): HrAdminPayrollReadinessListResponse => {
    const periodStart = query.get("period_start") || "2026-09-01";
    const periodEnd = query.get("period_end") || "2026-09-30";
    const q = (query.get("q") || "").trim().toLowerCase();
    const status = query.get("status") || "all";
    const page = Math.max(Number(query.get("page") || "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.get("page_size") || "20") || 20, 1), 100);
    const warningsByCode: Record<string, string[]> = {
      "EMP-0042": ["1 leave request(s) pending approval in period.", "Missing primary bank account."],
      "EMP-0044": ["1 attendance regularization(s) pending approval in period."],
    };
    const blockersByCode: Record<string, string[]> = {
      "EMP-0043": ["Missing cost center.", "Missing primary bank account."],
    };
    const rows = demoHrAdminEmployees.map((employeeItem) => {
      const blockers = blockersByCode[employeeItem.employee_code] || [];
      const warnings = warningsByCode[employeeItem.employee_code] || [];
      const readinessStatus = blockers.length ? "blocked" : warnings.length ? "warning" : "ready";
      return {
        id: employeeItem.id,
        employee_code: employeeItem.employee_code,
        employee_name: employeeItem.full_name,
        work_email: employeeItem.work_email,
        readiness_status: readinessStatus,
        employment_status: employeeItem.employment_status,
        date_of_joining: employeeItem.date_of_joining,
        exit_date: employeeItem.employee_code === "EMP-0044" ? "2026-09-28" : null,
        legal_entity: employeeItem.legal_entity,
        branch: employeeItem.branch,
        location: employeeItem.location,
        department: employeeItem.department,
        business_unit: employeeItem.business_unit,
        cost_center: employeeItem.employee_code === "EMP-0043" ? null : employeeItem.cost_center,
        designation: employeeItem.designation,
        grade: employeeItem.grade,
        employment_type: employeeItem.employment_type,
        period_days: 30,
        working_days: 22,
        attendance_record_days: employeeItem.employee_code === "EMP-0043" ? 16 : 22,
        pending_leave_requests: employeeItem.employee_code === "EMP-0042" ? 1 : 0,
        pending_attendance_regularizations: employeeItem.employee_code === "EMP-0044" ? 1 : 0,
        unknown_attendance_records: employeeItem.employee_code === "EMP-0043" ? 2 : 0,
        has_primary_bank_account: employeeItem.employee_code !== "EMP-0042" && employeeItem.employee_code !== "EMP-0043",
        blockers,
        warnings,
        source_counts: {
          leave_requests: employeeItem.employee_code === "EMP-0042" ? 1 : 0,
          attendance_records: employeeItem.employee_code === "EMP-0043" ? 16 : 22,
          attendance_regularizations: employeeItem.employee_code === "EMP-0044" ? 1 : 0,
          lifecycle_events: employeeItem.employee_code === "EMP-0044" ? 1 : 0,
          documents: employeeItem.employee_code === "EMP-0043" ? 1 : 3,
          bank_accounts: employeeItem.employee_code !== "EMP-0042" && employeeItem.employee_code !== "EMP-0043" ? 1 : 0,
        },
      };
    });
    const searchedRows = rows.filter((item) => {
      if (!q) return true;
      return [
        item.employee_code,
        item.employee_name,
        item.work_email,
        item.legal_entity,
        item.branch,
        item.location,
        item.department,
        item.business_unit,
        item.cost_center,
        item.designation,
        item.grade,
        item.employment_type,
        item.employment_status,
      ].some((value) => (value || "").toLowerCase().includes(q));
    });
    const statusCounts = {
      all: searchedRows.length,
      ready: searchedRows.filter((item) => item.readiness_status === "ready").length,
      warning: searchedRows.filter((item) => item.readiness_status === "warning").length,
      blocked: searchedRows.filter((item) => item.readiness_status === "blocked").length,
    };
    const filteredRows = status === "all" ? searchedRows : searchedRows.filter((item) => item.readiness_status === status);
    const offset = (page - 1) * pageSize;

    return {
      period: {
        start: periodStart,
        end: periodEnd,
        label: "01 Sep 2026 - 30 Sep 2026",
        days: 30,
        working_days: 22,
      },
      configuration: {
        profile_key: "payroll.readiness_profile.v1",
        profile_name: "Source data readiness",
        version: 1,
        source: "demo",
        resolved_profile: {
          included_employment_statuses: ["active", "on_notice"],
          employee_required_fields: ["date_of_joining", "legal_entity", "branch", "location", "department", "cost_center", "employment_type"],
          bank_account: { required: true, severity: "warning" },
          pending_sources: { severity: "warning" },
        },
      },
      summary: {
        total_employees: searchedRows.length,
        ready: statusCounts.ready,
        warnings: statusCounts.warning,
        blocked: statusCounts.blocked,
        joiners: 0,
        exits: searchedRows.filter((item) => item.exit_date).length,
        pending_leave_requests: searchedRows.reduce((sum, item) => sum + item.pending_leave_requests, 0),
        pending_attendance_regularizations: searchedRows.reduce((sum, item) => sum + item.pending_attendance_regularizations, 0),
        missing_primary_bank_accounts: searchedRows.filter((item) => !item.has_primary_bank_account).length,
      },
      items: filteredRows.slice(offset, offset + pageSize),
      total_count: filteredRows.length,
      page,
      page_size: pageSize,
      has_next: offset + pageSize < filteredRows.length,
      has_previous: page > 1,
      status_counts: statusCounts,
    };
  };

  const buildDemoPayrollSetup = (): HrAdminPayrollSetupResponse => {
    const now = "2026-09-05T09:30:00+05:30";
    const coreCalendarId = "paycal-monthly-core";
    const leadershipCalendarId = "paycal-monthly-leadership";
    const staffPayGroupId = "paygroup-india-staff";
    const operationsPayGroupId = "paygroup-operations";
    const leadershipPayGroupId = "paygroup-leadership";
    const assignedEmployees = demoHrAdminEmployees.slice(0, 5);

    return {
      summary: {
        calendar_count: 2,
        active_calendar_count: 2,
        open_period_count: 1,
        active_pay_group_count: 3,
        assigned_employee_count: assignedEmployees.length,
        unassigned_employee_count: Math.max(demoHrAdminEmployees.length - assignedEmployees.length, 0),
      },
      calendars: [
        {
          id: coreCalendarId,
          code: "monthly-core",
          name: "Monthly Core Payroll",
          frequency: "monthly",
          frequency_label: "Monthly",
          timezone: "Asia/Kolkata",
          currency_code: "INR",
          period_start_day: 1,
          is_active: true,
          config_snapshot: {
            cutoff_day: 25,
            attendance_lock_day: 26,
            leave_lock_day: 26,
            proration_rule_key: "calendar-day-proration.v1",
          },
          active_pay_group_count: 2,
          open_period_count: 1,
          created_at: now,
          updated_at: now,
        },
        {
          id: leadershipCalendarId,
          code: "monthly-leadership",
          name: "Monthly Leadership Payroll",
          frequency: "monthly",
          frequency_label: "Monthly",
          timezone: "Asia/Kolkata",
          currency_code: "INR",
          period_start_day: 1,
          is_active: true,
          config_snapshot: {
            cutoff_day: 24,
            approval_policy_key: "leadership-maker-checker.v1",
            payout_batch_key: "executive-bank-file.v1",
          },
          active_pay_group_count: 1,
          open_period_count: 0,
          created_at: now,
          updated_at: now,
        },
      ],
      periods: [
        {
          id: "payperiod-sep-2026",
          calendar_id: coreCalendarId,
          calendar_name: "Monthly Core Payroll",
          code: "sep-2026",
          name: "September 2026",
          start_date: "2026-09-01",
          end_date: "2026-09-30",
          pay_date: "2026-10-01",
          status: "open",
          status_label: "Open",
          config_snapshot: { source_readiness_profile: "payroll.readiness_profile.v1" },
          created_at: now,
          updated_at: now,
        },
        {
          id: "payperiod-oct-2026",
          calendar_id: coreCalendarId,
          calendar_name: "Monthly Core Payroll",
          code: "oct-2026",
          name: "October 2026",
          start_date: "2026-10-01",
          end_date: "2026-10-31",
          pay_date: "2026-11-02",
          status: "draft",
          status_label: "Draft",
          config_snapshot: { source_readiness_profile: "payroll.readiness_profile.v1" },
          created_at: now,
          updated_at: now,
        },
      ],
      pay_groups: [
        {
          id: staffPayGroupId,
          calendar_id: coreCalendarId,
          calendar_name: "Monthly Core Payroll",
          code: "india-staff",
          name: "India Staff",
          status: "active",
          status_label: "Active",
          default_currency_code: "INR",
          legal_entity_id: demoHrAdminPolicyOptions.legal_entities[0]?.id ?? null,
          legal_entity: demoHrAdminPolicyOptions.legal_entities[0]?.name ?? null,
          branch_id: demoHrAdminPolicyOptions.branches[0]?.id ?? null,
          branch: demoHrAdminPolicyOptions.branches[0]?.name ?? null,
          location_id: demoHrAdminPolicyOptions.locations[0]?.id ?? null,
          location: demoHrAdminPolicyOptions.locations[0]?.name ?? null,
          department_id: null,
          department: null,
          employment_type_id: null,
          employment_type: null,
          config_snapshot: {
            earning_structure_key: "india.staff.earnings.v1",
            deduction_pack_key: "india.standard.deductions.v1",
            statutory_pack_key: "india-statutory.v1",
          },
          assignment_count: 3,
          created_at: now,
          updated_at: now,
        },
        {
          id: operationsPayGroupId,
          calendar_id: coreCalendarId,
          calendar_name: "Monthly Core Payroll",
          code: "operations",
          name: "Operations",
          status: "active",
          status_label: "Active",
          default_currency_code: "INR",
          legal_entity_id: demoHrAdminPolicyOptions.legal_entities[0]?.id ?? null,
          legal_entity: demoHrAdminPolicyOptions.legal_entities[0]?.name ?? null,
          branch_id: demoHrAdminPolicyOptions.branches[1]?.id ?? null,
          branch: demoHrAdminPolicyOptions.branches[1]?.name ?? null,
          location_id: demoHrAdminPolicyOptions.locations[1]?.id ?? null,
          location: demoHrAdminPolicyOptions.locations[1]?.name ?? null,
          department_id: demoHrAdminPolicyOptions.departments[0]?.id ?? null,
          department: demoHrAdminPolicyOptions.departments[0]?.name ?? null,
          employment_type_id: null,
          employment_type: null,
          config_snapshot: {
            earning_structure_key: "operations.shift-linked.v1",
            overtime_policy_key: "attendance-overtime.v1",
            approval_policy_key: "ops-payroll-checker.v1",
          },
          assignment_count: 1,
          created_at: now,
          updated_at: now,
        },
        {
          id: leadershipPayGroupId,
          calendar_id: leadershipCalendarId,
          calendar_name: "Monthly Leadership Payroll",
          code: "leadership",
          name: "Leadership",
          status: "active",
          status_label: "Active",
          default_currency_code: "INR",
          legal_entity_id: demoHrAdminPolicyOptions.legal_entities[0]?.id ?? null,
          legal_entity: demoHrAdminPolicyOptions.legal_entities[0]?.name ?? null,
          branch_id: null,
          branch: null,
          location_id: null,
          location: null,
          department_id: demoHrAdminPolicyOptions.departments[1]?.id ?? null,
          department: demoHrAdminPolicyOptions.departments[1]?.name ?? null,
          employment_type_id: demoHrAdminPolicyOptions.employment_types[0]?.id ?? null,
          employment_type: demoHrAdminPolicyOptions.employment_types[0]?.name ?? null,
          config_snapshot: {
            earning_structure_key: "leadership.comp.v1",
            deduction_pack_key: "india-leadership-deductions.v1",
            maker_checker_policy_key: "payroll.leadership.review.v1",
          },
          assignment_count: 1,
          created_at: now,
          updated_at: now,
        },
      ],
      assignments: assignedEmployees.map((employeeItem, index) => {
        const payGroupId = index === 3 ? operationsPayGroupId : index === 4 ? leadershipPayGroupId : staffPayGroupId;
        const payGroupName = payGroupId === operationsPayGroupId ? "Operations" : payGroupId === leadershipPayGroupId ? "Leadership" : "India Staff";
        const payGroupCode = payGroupId === operationsPayGroupId ? "operations" : payGroupId === leadershipPayGroupId ? "leadership" : "india-staff";
        return {
          id: `payassign-${employeeItem.employee_code.toLowerCase()}`,
          pay_group_id: payGroupId,
          pay_group_name: payGroupName,
          pay_group_code: payGroupCode,
          employee_id: employeeItem.id,
          employee_name: employeeItem.full_name,
          employee_code: employeeItem.employee_code,
          effective_from: "2026-09-01",
          effective_to: null,
          status: "active",
          status_label: "Active",
          config_snapshot: {
            assignment_source: "payroll-setup-demo",
            source_version: 1,
          },
          created_at: now,
          updated_at: now,
        };
      }),
      options: {
        payroll_frequencies: [
          { value: "monthly", label: "Monthly" },
          { value: "semi_monthly", label: "Semi Monthly" },
          { value: "biweekly", label: "Biweekly" },
          { value: "weekly", label: "Weekly" },
          { value: "custom", label: "Custom" },
        ],
        payroll_period_statuses: [
          { value: "draft", label: "Draft" },
          { value: "open", label: "Open" },
          { value: "locked", label: "Locked" },
          { value: "closed", label: "Closed" },
        ],
        pay_group_statuses: [
          { value: "draft", label: "Draft" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
          { value: "archived", label: "Archived" },
        ],
        legal_entities: demoHrAdminPolicyOptions.legal_entities,
        branches: demoHrAdminPolicyOptions.branches,
        locations: demoHrAdminPolicyOptions.locations,
        departments: demoHrAdminPolicyOptions.departments,
        employment_types: demoHrAdminPolicyOptions.employment_types,
        employees: demoHrAdminEmployees.map((employeeItem) => ({
          id: employeeItem.id,
          name: employeeItem.full_name,
          employee_code: employeeItem.employee_code,
        })),
      },
    };
  };

  const buildDemoSalarySetup = (): HrAdminSalarySetupResponse => {
    const now = "2026-09-05T09:30:00+05:30";
    const structureId = "salstruct-staff-standard";
    const leadershipStructureId = "salstruct-leadership";
    const versionId = "salver-staff-standard-v1";
    const leadershipVersionId = "salver-leadership-v1";
    const components = [
      {
        id: "salcomp-basic",
        code: "basic",
        name: "Basic",
        component_type: "earning",
        component_type_label: "Earning",
        value_type: "percentage",
        value_type_label: "Percentage",
        formula_ref: "",
        applicability_rule_ref: "all-active-employees.v1",
        rounding_rule_ref: "nearest-rupee.v1",
        accounting_mapping_ref: "payroll.salary.basic.v1",
        statutory_treatment_ref: "india.basic-pay.v1",
        is_taxable: true,
        is_proratable: true,
        payslip_visibility: "visible",
        status: "active",
        status_label: "Active",
        config_snapshot: { basis: "annual_ctc", default_percentage: "40.0000" },
        created_at: now,
        updated_at: now,
      },
      {
        id: "salcomp-hra",
        code: "hra",
        name: "House Rent Allowance",
        component_type: "earning",
        component_type_label: "Earning",
        value_type: "formula",
        value_type_label: "Formula",
        formula_ref: "hra.india.metro.v1",
        applicability_rule_ref: "location.metro.v1",
        rounding_rule_ref: "nearest-rupee.v1",
        accounting_mapping_ref: "payroll.salary.hra.v1",
        statutory_treatment_ref: "india.hra-tax.v1",
        is_taxable: true,
        is_proratable: true,
        payslip_visibility: "visible",
        status: "active",
        status_label: "Active",
        config_snapshot: { formula_inputs: ["basic", "location_type"] },
        created_at: now,
        updated_at: now,
      },
      {
        id: "salcomp-pf-employee",
        code: "pf-employee",
        name: "PF Employee",
        component_type: "deduction",
        component_type_label: "Deduction",
        value_type: "formula",
        value_type_label: "Formula",
        formula_ref: "india.pf.employee.v1",
        applicability_rule_ref: "india.pf.eligible.v1",
        rounding_rule_ref: "nearest-rupee.v1",
        accounting_mapping_ref: "payroll.liability.pf.v1",
        statutory_treatment_ref: "india.pf.v1",
        is_taxable: false,
        is_proratable: true,
        payslip_visibility: "visible",
        status: "active",
        status_label: "Active",
        config_snapshot: { cap_rule_ref: "india.pf.wage-cap.v1" },
        created_at: now,
        updated_at: now,
      },
      {
        id: "salcomp-special-allowance",
        code: "special-allowance",
        name: "Special Allowance",
        component_type: "earning",
        component_type_label: "Earning",
        value_type: "formula",
        value_type_label: "Formula",
        formula_ref: "residual.allowance.v1",
        applicability_rule_ref: "all-active-employees.v1",
        rounding_rule_ref: "nearest-rupee.v1",
        accounting_mapping_ref: "payroll.salary.allowance.v1",
        statutory_treatment_ref: "",
        is_taxable: true,
        is_proratable: true,
        payslip_visibility: "visible",
        status: "active",
        status_label: "Active",
        config_snapshot: { residual_after_components: ["basic", "hra", "pf-employer"] },
        created_at: now,
        updated_at: now,
      },
    ];

    return {
      summary: {
        component_count: components.length,
        active_component_count: components.length,
        structure_count: 2,
        active_structure_count: 2,
        active_version_count: 2,
        assigned_employee_count: 4,
      },
      components,
      structures: [
        {
          id: structureId,
          code: "staff-standard",
          name: "Staff Standard",
          pay_group_id: "paygroup-india-staff",
          pay_group_name: "India Staff",
          currency_code: "INR",
          status: "active",
          status_label: "Active",
          description: "Default staff compensation structure for monthly India payroll.",
          config_snapshot: {
            approval_policy_key: "salary.structure.review.v1",
            proration_rule_key: "calendar-day-proration.v1",
          },
          version_count: 1,
          assignment_count: 3,
          created_at: now,
          updated_at: now,
        },
        {
          id: leadershipStructureId,
          code: "leadership-comp",
          name: "Leadership Compensation",
          pay_group_id: "paygroup-leadership",
          pay_group_name: "Leadership",
          currency_code: "INR",
          status: "active",
          status_label: "Active",
          description: "Leadership salary structure with separate review governance.",
          config_snapshot: {
            approval_policy_key: "leadership.salary.review.v1",
            variable_pay_rule_key: "leadership.variable.v1",
          },
          version_count: 1,
          assignment_count: 1,
          created_at: now,
          updated_at: now,
        },
      ],
      versions: [
        {
          id: versionId,
          structure_id: structureId,
          structure_name: "Staff Standard",
          version: 1,
          effective_from: "2026-09-01",
          effective_to: null,
          status: "active",
          status_label: "Active",
          annual_ctc: "600000.00",
          currency_code: "INR",
          config_snapshot: { source_pack: "india-staff-salary.v1" },
          component_count: 4,
          assignment_count: 3,
          created_at: now,
          updated_at: now,
        },
        {
          id: leadershipVersionId,
          structure_id: leadershipStructureId,
          structure_name: "Leadership Compensation",
          version: 1,
          effective_from: "2026-09-01",
          effective_to: null,
          status: "active",
          status_label: "Active",
          annual_ctc: "1800000.00",
          currency_code: "INR",
          config_snapshot: { source_pack: "india-leadership-salary.v1" },
          component_count: 4,
          assignment_count: 1,
          created_at: now,
          updated_at: now,
        },
      ],
      structure_components: [
        { id: "saline-basic", structure_version_id: versionId, structure_name: "Staff Standard", component_id: "salcomp-basic", component_code: "basic", component_name: "Basic", component_type: "earning", value_type: "percentage", display_order: 10, amount: null, percentage: "40.0000", formula_ref: "", calculation_rule_ref: "percent-of-ctc.v1", is_active: true, config_snapshot: { basis: "annual_ctc" }, created_at: now, updated_at: now },
        { id: "saline-hra", structure_version_id: versionId, structure_name: "Staff Standard", component_id: "salcomp-hra", component_code: "hra", component_name: "House Rent Allowance", component_type: "earning", value_type: "formula", display_order: 20, amount: null, percentage: null, formula_ref: "hra.india.metro.v1", calculation_rule_ref: "formula-engine.v1", is_active: true, config_snapshot: { depends_on: ["basic"] }, created_at: now, updated_at: now },
        { id: "saline-pf", structure_version_id: versionId, structure_name: "Staff Standard", component_id: "salcomp-pf-employee", component_code: "pf-employee", component_name: "PF Employee", component_type: "deduction", value_type: "formula", display_order: 80, amount: null, percentage: null, formula_ref: "india.pf.employee.v1", calculation_rule_ref: "statutory-pack.v1", is_active: true, config_snapshot: { wage_cap_ref: "india.pf.wage-cap.v1" }, created_at: now, updated_at: now },
        { id: "saline-special", structure_version_id: versionId, structure_name: "Staff Standard", component_id: "salcomp-special-allowance", component_code: "special-allowance", component_name: "Special Allowance", component_type: "earning", value_type: "formula", display_order: 90, amount: null, percentage: null, formula_ref: "residual.allowance.v1", calculation_rule_ref: "residual-component.v1", is_active: true, config_snapshot: { residual: true }, created_at: now, updated_at: now },
      ],
      assignments: demoHrAdminEmployees.slice(0, 4).map((employeeItem, index) => ({
        id: `salary-assign-${employeeItem.employee_code.toLowerCase()}`,
        employee_id: employeeItem.id,
        employee_name: employeeItem.full_name,
        employee_code: employeeItem.employee_code,
        structure_version_id: index === 0 ? leadershipVersionId : versionId,
        structure_name: index === 0 ? "Leadership Compensation" : "Staff Standard",
        structure_version: 1,
        effective_from: "2026-09-01",
        effective_to: null,
        status: "active",
        status_label: "Active",
        annual_ctc: index === 0 ? "1800000.00" : "600000.00",
        annual_ctc_override: index === 2 ? "720000.00" : null,
        assignment_reason: index === 2 ? "Market correction" : "Initial payroll setup",
        config_snapshot: {
          assignment_source: "salary-setup-demo",
          source_version: 1,
        },
        created_at: now,
        updated_at: now,
      })),
      options: {
        component_types: [
          { value: "earning", label: "Earning" },
          { value: "deduction", label: "Deduction" },
          { value: "employer_contribution", label: "Employer Contribution" },
          { value: "reimbursement", label: "Reimbursement" },
          { value: "tax", label: "Tax" },
          { value: "informational", label: "Informational" },
        ],
        component_value_types: [
          { value: "fixed_amount", label: "Fixed Amount" },
          { value: "percentage", label: "Percentage" },
          { value: "formula", label: "Formula" },
          { value: "slab", label: "Slab" },
          { value: "external_input", label: "External Input" },
        ],
        config_statuses: [
          { value: "draft", label: "Draft" },
          { value: "active", label: "Active" },
          { value: "retired", label: "Retired" },
        ],
        pay_groups: [
          { id: "paygroup-india-staff", name: "India Staff" },
          { id: "paygroup-leadership", name: "Leadership" },
        ],
        employees: demoHrAdminEmployees.map((employeeItem) => ({
          id: employeeItem.id,
          name: employeeItem.full_name,
          employee_code: employeeItem.employee_code,
        })),
      },
    };
  };

  const buildDemoPayrollInputSnapshotSetup = (): HrAdminPayrollInputSnapshotSetupResponse => {
    const now = "2026-09-05T09:30:00+05:30";
    const runId = "payrun-sep-2026-core";
    const lockedRunId = "payrun-aug-2026-core";
    const selectedEmployees = demoHrAdminEmployees.slice(0, 5);
    const snapshots = selectedEmployees.map((employeeItem, index) => {
      const isBlocked = employeeItem.employee_code === "EMP-0043";
      const hasWarning = employeeItem.employee_code === "EMP-0042" || employeeItem.employee_code === "EMP-0044";
      const payGroupName = index === 3 ? "Operations" : index === 4 ? "Leadership" : "India Staff";
      const salaryStructureName = index === 4 ? "Leadership Compensation" : "Staff Standard";
      const blockers = isBlocked ? ["Missing primary bank account", "Cost center is not mapped"] : [];
      const warnings = hasWarning ? ["Pending leave or attendance approval in period"] : [];
      return {
        id: `snapshot-${employeeItem.employee_code.toLowerCase()}`,
        payroll_run_id: runId,
        payroll_run_name: "September 2026 Core Payroll",
        employee_id: employeeItem.id,
        employee_name: employeeItem.full_name,
        employee_code: employeeItem.employee_code,
        pay_group_assignment_id: `payassign-${employeeItem.employee_code.toLowerCase()}`,
        pay_group_name: payGroupName,
        salary_assignment_id: `salary-assign-${employeeItem.employee_code.toLowerCase()}`,
        salary_structure_name: salaryStructureName,
        salary_structure_version: 1,
        snapshot_status: isBlocked ? "blocked" : hasWarning ? "warning" : "ready",
        snapshot_status_label: isBlocked ? "Blocked" : hasWarning ? "Warning" : "Ready",
        period_start: "2026-09-01",
        period_end: "2026-09-30",
        source_collected_at: now,
        locked_at: null,
        input_profile_ref: "india.monthly.input.profile.v1",
        employee_snapshot: {
          employee_code: employeeItem.employee_code,
          employment_status: employeeItem.employment_status,
          date_of_joining: employeeItem.date_of_joining,
        },
        organization_snapshot: {
          legal_entity: employeeItem.legal_entity,
          branch: employeeItem.branch,
          location: employeeItem.location,
          department: employeeItem.department,
          cost_center: isBlocked ? null : employeeItem.cost_center,
        },
        salary_snapshot: {
          salary_structure: salaryStructureName,
          annual_ctc: index === 4 ? "1800000.00" : index === 2 ? "720000.00" : "600000.00",
          formula_pack_ref: index === 4 ? "india-leadership-salary.v1" : "india-staff-salary.v1",
        },
        attendance_snapshot: {
          working_days: 22,
          present_days: isBlocked ? 16 : 22,
          unknown_records: isBlocked ? 2 : 0,
          source_policy_ref: index === 3 ? "operations.shift-linked.v1" : "attendance.monthly.v1",
        },
        leave_snapshot: {
          paid_leave_days: employeeItem.employee_code === "EMP-0042" ? 1 : 0,
          pending_requests: employeeItem.employee_code === "EMP-0042" ? 1 : 0,
        },
        lifecycle_snapshot: {
          joiner: false,
          exit: employeeItem.employee_code === "EMP-0044",
          exit_date: employeeItem.employee_code === "EMP-0044" ? "2026-09-28" : null,
        },
        document_snapshot: {
          required_documents: 3,
          verified_documents: isBlocked ? 1 : 3,
          missing_required_count: isBlocked ? 2 : 0,
        },
        banking_snapshot: {
          primary_account: !isBlocked,
          bank_file_profile_ref: "india-bank-file.neft.v1",
        },
        validation_snapshot: {
          blockers,
          warnings,
          readiness_profile_ref: "payroll.readiness_profile.v1",
        },
        source_hash: `9f8c7b6a5d4e3f2${index}00112233445566778899aabbccddeeff00112233445566`,
        config_snapshot: {
          collection_policy_ref: "payroll.collection.default.v1",
          schema_ref: "payroll.input.snapshot.v1",
        },
        blockers,
        warnings,
        created_at: now,
        updated_at: now,
      };
    });
    const lockedSnapshots = selectedEmployees.slice(0, 3).map((employeeItem, index) => ({
      ...snapshots[index],
      id: `snapshot-aug-${employeeItem.employee_code.toLowerCase()}`,
      payroll_run_id: lockedRunId,
      payroll_run_name: "August 2026 Core Payroll",
      snapshot_status: "locked",
      snapshot_status_label: "Locked",
      period_start: "2026-08-01",
      period_end: "2026-08-31",
      locked_at: "2026-09-01T18:00:00+05:30",
      blockers: [],
      warnings: [],
      validation_snapshot: {
        blockers: [],
        warnings: [],
        readiness_profile_ref: "payroll.readiness_profile.v1",
      },
      source_hash: `ab8c7b6a5d4e3f2${index}00112233445566778899aabbccddeeff00112233445566`,
    }));

    return {
      summary: {
        run_count: 2,
        collecting_run_count: 1,
        inputs_locked_run_count: 1,
        snapshot_count: snapshots.length + lockedSnapshots.length,
        locked_snapshot_count: lockedSnapshots.length,
        blocked_snapshot_count: snapshots.filter((item) => item.snapshot_status === "blocked").length,
      },
      runs: [
        {
          id: runId,
          period_id: "payperiod-sep-2026",
          period_name: "September 2026",
          pay_group_id: "paygroup-india-staff",
          pay_group_name: "India Staff",
          code: "sep-2026-core",
          name: "September 2026 Core Payroll",
          status: "collecting_inputs",
          status_label: "Collecting Inputs",
          input_profile_ref: "india.monthly.input.profile.v1",
          snapshot_schema_ref: "payroll.input.snapshot.v1",
          locked_at: null,
          locked_by_name: null,
          final_locked_at: null,
          final_locked_by_name: null,
          config_snapshot: {
            collection_policy_ref: "payroll.collection.default.v1",
            source_cutoff_profile_ref: "india.monthly.cutoff.v1",
          },
          snapshot_count: snapshots.length,
          ready_count: snapshots.filter((item) => item.snapshot_status === "ready").length,
          warning_count: snapshots.filter((item) => item.snapshot_status === "warning").length,
          blocked_count: snapshots.filter((item) => item.snapshot_status === "blocked").length,
          locked_count: 0,
          created_at: now,
          updated_at: now,
        },
        {
          id: lockedRunId,
          period_id: "payperiod-aug-2026",
          period_name: "August 2026",
          pay_group_id: "paygroup-india-staff",
          pay_group_name: "India Staff",
          code: "aug-2026-core",
          name: "August 2026 Core Payroll",
          status: "inputs_locked",
          status_label: "Inputs Locked",
          input_profile_ref: "india.monthly.input.profile.v1",
          snapshot_schema_ref: "payroll.input.snapshot.v1",
          locked_at: "2026-09-01T18:00:00+05:30",
          locked_by_name: "Nisha Rao",
          final_locked_at: null,
          final_locked_by_name: null,
          config_snapshot: {
            collection_policy_ref: "payroll.collection.default.v1",
            source_cutoff_profile_ref: "india.monthly.cutoff.v1",
          },
          snapshot_count: lockedSnapshots.length,
          ready_count: 0,
          warning_count: 0,
          blocked_count: 0,
          locked_count: lockedSnapshots.length,
          created_at: now,
          updated_at: now,
        },
      ],
      snapshots: [...snapshots, ...lockedSnapshots],
      options: {
        payroll_run_statuses: [
          { value: "draft", label: "Draft" },
          { value: "collecting_inputs", label: "Collecting Inputs" },
          { value: "inputs_locked", label: "Inputs Locked" },
          { value: "calculated", label: "Calculated" },
          { value: "review", label: "Review" },
          { value: "approved", label: "Approved" },
          { value: "locked", label: "Locked" },
          { value: "cancelled", label: "Cancelled" },
        ],
        payroll_input_snapshot_statuses: [
          { value: "draft", label: "Draft" },
          { value: "ready", label: "Ready" },
          { value: "warning", label: "Warning" },
          { value: "blocked", label: "Blocked" },
          { value: "locked", label: "Locked" },
        ],
        periods: [
          { id: "payperiod-sep-2026", name: "September 2026" },
          { id: "payperiod-aug-2026", name: "August 2026" },
        ],
        pay_groups: [
          { id: "paygroup-india-staff", name: "India Staff" },
          { id: "paygroup-operations", name: "Operations" },
          { id: "paygroup-leadership", name: "Leadership" },
        ],
        employees: demoHrAdminEmployees.map((employeeItem) => ({
          id: employeeItem.id,
          name: employeeItem.full_name,
          employee_code: employeeItem.employee_code,
        })),
      },
    };
  };

  const buildDemoPayrollAdjustmentSetup = (): HrAdminPayrollAdjustmentSetupResponse => {
    const now = "2026-09-05T09:45:00+05:30";
    const inputSetup = buildDemoPayrollInputSnapshotSetup();
    const selectedRun = inputSetup.runs.find((item) => item.id === "payrun-aug-2026-core") ?? inputSetup.runs[0];
    const snapshots = inputSetup.snapshots.filter((item) => item.payroll_run_id === selectedRun.id);
    const adjustmentTemplates = [
      {
        id: "payadj-bonus-riya-aug",
        snapshot: snapshots[0],
        kind: "bonus",
        kind_label: "Bonus",
        status: "applied",
        status_label: "Applied",
        direction: "earning",
        direction_label: "Earning",
        component_code: "PERFORMANCE_BONUS",
        component_name: "Performance Bonus",
        amount: "7500.00",
        source_ref: "bonus:EMP-0001:aug-2026",
        reason: "Approved monthly performance bonus.",
        applied_at: now,
        approved_at: "2026-09-05T09:40:00+05:30",
        submitted_at: "2026-09-05T09:35:00+05:30",
      },
      {
        id: "payadj-reimb-aman-aug",
        snapshot: snapshots[1],
        kind: "reimbursement",
        kind_label: "Reimbursement",
        status: "approved",
        status_label: "Approved",
        direction: "reimbursement",
        direction_label: "Reimbursement",
        component_code: "TRAVEL_REIMB",
        component_name: "Travel Reimbursement",
        amount: "3200.00",
        source_ref: "expense:EMP-0002:TRV-2181",
        reason: "Approved field travel claim.",
        applied_at: null,
        approved_at: "2026-09-05T09:37:00+05:30",
        submitted_at: "2026-09-05T09:30:00+05:30",
      },
      {
        id: "payadj-loan-meera-aug",
        snapshot: snapshots[2],
        kind: "loan",
        kind_label: "Loan",
        status: "submitted",
        status_label: "Submitted",
        direction: "deduction",
        direction_label: "Deduction",
        component_code: "LOAN_RECOVERY",
        component_name: "Loan Recovery",
        amount: "2500.00",
        source_ref: "loan:EMP-0003:installment-02",
        reason: "Scheduled employee loan recovery.",
        applied_at: null,
        approved_at: null,
        submitted_at: "2026-09-05T09:28:00+05:30",
      },
      {
        id: "payadj-arrear-riya-aug",
        snapshot: snapshots[0],
        kind: "arrear",
        kind_label: "Arrear",
        status: "draft",
        status_label: "Draft",
        direction: "earning",
        direction_label: "Earning",
        component_code: "BASIC_ARREAR",
        component_name: "Basic Arrear",
        amount: "1800.00",
        source_ref: "arrear:EMP-0001:jul-2026",
        reason: "Backdated salary correction from prior cycle.",
        applied_at: null,
        approved_at: null,
        submitted_at: null,
      },
    ];
    const adjustments = adjustmentTemplates.map((item, index) => ({
      id: item.id,
      payroll_run_id: selectedRun.id,
      payroll_run_name: selectedRun.name,
      employee_id: item.snapshot.employee_id,
      employee_code: item.snapshot.employee_code,
      employee_name: item.snapshot.employee_name,
      input_snapshot_id: item.snapshot.id,
      salary_component_id: null,
      kind: item.kind,
      kind_label: item.kind_label,
      status: item.status,
      status_label: item.status_label,
      direction: item.direction,
      direction_label: item.direction_label,
      component_code: item.component_code,
      component_name: item.component_name,
      amount: item.amount,
      currency_code: "INR",
      effective_date: "2026-08-25",
      source_period_start: item.kind === "arrear" ? "2026-07-01" : "2026-08-01",
      source_period_end: item.kind === "arrear" ? "2026-07-31" : "2026-08-31",
      adjustment_profile_ref: "india.monthly.adjustments.v1",
      approval_profile_ref: "payroll.adjustment.approval.v1",
      source_ref: item.source_ref,
      reason: item.reason,
      submitted_at: item.submitted_at,
      submitted_by_name: item.submitted_at ? "Nisha Rao" : null,
      approved_at: item.approved_at,
      approved_by_name: item.approved_at ? "Nisha Rao" : null,
      rejected_at: null,
      rejected_by_name: null,
      applied_at: item.applied_at,
      applied_by_name: item.applied_at ? "Nisha Rao" : null,
      source_hash: `ef8c7b6a5d4e3f2${index}00112233445566778899aabbccddeeff00112233445566`,
      config_snapshot: {
        source_system_ref: item.kind === "reimbursement" ? "expense.claims.approved.v1" : "payroll.adjustment.manual.v1",
        calculation_consumption_ref: "payroll.adjustment.input.snapshot.v1",
      },
      created_at: now,
      updated_at: now,
    }));
    const totalAmount = adjustments.reduce((total, item) => total + Number(item.amount), 0);

    return {
      summary: {
        run_count: inputSetup.runs.length,
        adjustment_count: adjustments.length,
        draft_count: adjustments.filter((item) => item.status === "draft").length,
        submitted_count: adjustments.filter((item) => item.status === "submitted").length,
        approved_count: adjustments.filter((item) => item.status === "approved").length,
        applied_count: adjustments.filter((item) => item.status === "applied").length,
        total_amount: totalAmount.toFixed(2),
      },
      runs: inputSetup.runs,
      snapshots: inputSetup.snapshots,
      adjustments,
      options: {
        adjustment_kinds: [
          { value: "arrear", label: "Arrear" },
          { value: "bonus", label: "Bonus" },
          { value: "incentive", label: "Incentive" },
          { value: "reimbursement", label: "Reimbursement" },
          { value: "loan", label: "Loan" },
          { value: "advance", label: "Advance" },
          { value: "deduction", label: "Deduction" },
          { value: "correction", label: "Correction" },
          { value: "settlement", label: "Settlement" },
        ],
        adjustment_statuses: [
          { value: "draft", label: "Draft" },
          { value: "submitted", label: "Submitted" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
          { value: "applied", label: "Applied" },
          { value: "voided", label: "Voided" },
        ],
        adjustment_directions: [
          { value: "earning", label: "Earning" },
          { value: "deduction", label: "Deduction" },
          { value: "reimbursement", label: "Reimbursement" },
          { value: "employer_contribution", label: "Employer Contribution" },
          { value: "tax", label: "Tax" },
          { value: "informational", label: "Informational" },
        ],
        salary_components: [
          { id: "salcomp-performance-bonus", code: "PERFORMANCE_BONUS", name: "Performance Bonus", component_type: "earning" },
          { id: "salcomp-loan-recovery", code: "LOAN_RECOVERY", name: "Loan Recovery", component_type: "deduction" },
        ],
        employees: inputSetup.options.employees,
      },
    };
  };

  const buildDemoPayrollSettlementSetup = (): HrAdminPayrollSettlementSetupResponse => {
    const now = "2026-09-05T10:05:00+05:30";
    const inputSetup = buildDemoPayrollInputSnapshotSetup();
    const selectedRun = inputSetup.runs.find((item) => item.id === "payrun-aug-2026-core") ?? inputSetup.runs[0];
    const snapshot = inputSetup.snapshots.find((item) => item.payroll_run_id === selectedRun.id && item.employee_code === "EMP-0042")
      ?? inputSetup.snapshots.find((item) => item.payroll_run_id === selectedRun.id)
      ?? inputSetup.snapshots[0];
    const settlementId = "paysettle-riya-aug-2026";
    const settlementLines = [
      {
        id: "paysettleline-riya-final-salary",
        settlement_id: settlementId,
        salary_component_id: null,
        line_kind: "salary_proration",
        line_kind_label: "Salary Proration",
        direction: "earning",
        direction_label: "Earning",
        component_code: "FINAL_EARNED_SALARY",
        component_name: "Final Earned Salary",
        amount: "18000.00",
        currency_code: "INR",
        calculation_order: 70,
        source_ref: "settlement:EMP-0042:salary-proration",
        source_hash: "b18c7b6a5d4e3f200112233445566778899aabbccddeeff00112233445566",
        trace_snapshot: {
          dependencies: ["exit.actual_exit_date", "salary.monthly_gross", "payroll.period_days"],
          calculation: "configured salary proration until last working date",
        },
        config_snapshot: {
          formula_ref: "india.fnf.salary_proration.v1",
          proration_rule_ref: "calendar_day_proration.v1",
        },
        created_at: now,
        updated_at: now,
      },
      {
        id: "paysettleline-riya-leave-encashment",
        settlement_id: settlementId,
        salary_component_id: null,
        line_kind: "leave_encashment",
        line_kind_label: "Leave Encashment",
        direction: "earning",
        direction_label: "Earning",
        component_code: "LEAVE_ENCASHMENT",
        component_name: "Leave Encashment",
        amount: "6000.00",
        currency_code: "INR",
        calculation_order: 71,
        source_ref: "settlement:EMP-0042:leave-encashment",
        source_hash: "c28c7b6a5d4e3f200112233445566778899aabbccddeeff00112233445566",
        trace_snapshot: {
          dependencies: ["leave.balance.encashable_days", "salary.daily_basic"],
          calculation: "configured encashable leave payout",
        },
        config_snapshot: {
          leave_encashment_policy_ref: "india.leave.encashment.v1",
        },
        created_at: now,
        updated_at: now,
      },
      {
        id: "paysettleline-riya-gratuity",
        settlement_id: settlementId,
        salary_component_id: null,
        line_kind: "gratuity",
        line_kind_label: "Gratuity",
        direction: "earning",
        direction_label: "Earning",
        component_code: "GRATUITY_SETTLEMENT",
        component_name: "Gratuity Settlement",
        amount: "25000.00",
        currency_code: "INR",
        calculation_order: 72,
        source_ref: "settlement:EMP-0042:gratuity",
        source_hash: "d38c7b6a5d4e3f200112233445566778899aabbccddeeff00112233445566",
        trace_snapshot: {
          dependencies: ["lifecycle.service_years", "salary.basic_monthly"],
          calculation: "configured statutory gratuity placeholder",
        },
        config_snapshot: {
          statutory_pack_ref: "india.gratuity.placeholder.v1",
        },
        created_at: now,
        updated_at: now,
      },
      {
        id: "paysettleline-riya-notice-recovery",
        settlement_id: settlementId,
        salary_component_id: null,
        line_kind: "notice_recovery",
        line_kind_label: "Notice Recovery",
        direction: "deduction",
        direction_label: "Deduction",
        component_code: "NOTICE_RECOVERY",
        component_name: "Notice Recovery",
        amount: "5000.00",
        currency_code: "INR",
        calculation_order: 73,
        source_ref: "settlement:EMP-0042:notice-recovery",
        source_hash: "e48c7b6a5d4e3f200112233445566778899aabbccddeeff00112233445566",
        trace_snapshot: {
          dependencies: ["exit.notice_shortfall_days", "salary.daily_gross"],
          calculation: "configured notice shortfall recovery",
        },
        config_snapshot: {
          recovery_rule_ref: "india.notice_recovery.v1",
        },
        created_at: now,
        updated_at: now,
      },
      {
        id: "paysettleline-riya-loan-recovery",
        settlement_id: settlementId,
        salary_component_id: null,
        line_kind: "loan_recovery",
        line_kind_label: "Loan Recovery",
        direction: "deduction",
        direction_label: "Deduction",
        component_code: "LOAN_RECOVERY",
        component_name: "Loan Recovery",
        amount: "4000.00",
        currency_code: "INR",
        calculation_order: 74,
        source_ref: "settlement:EMP-0042:loan-recovery",
        source_hash: "f58c7b6a5d4e3f200112233445566778899aabbccddeeff00112233445566",
        trace_snapshot: {
          dependencies: ["loan.outstanding_principal"],
          calculation: "configured open loan recovery at exit",
        },
        config_snapshot: {
          loan_policy_ref: "india.loan.exit_recovery.v1",
        },
        created_at: now,
        updated_at: now,
      },
    ];
    const settlement = {
      id: settlementId,
      payroll_run_id: selectedRun.id,
      payroll_run_name: selectedRun.name,
      employee_id: snapshot.employee_id,
      employee_code: snapshot.employee_code,
      employee_name: snapshot.employee_name,
      exit_record_id: "exit-riya-aug-2026",
      input_snapshot_id: snapshot.id,
      status: "applied",
      status_label: "Applied",
      settlement_profile_ref: "india.full-final.settlement.v1",
      approval_profile_ref: "payroll.settlement.approval.v1",
      calculation_profile_ref: "india.monthly.calc.profile.v1",
      source_ref: "settlement:EMP-0042:aug-2026",
      reason: "Approved full-and-final package with earned salary, leave encashment, gratuity placeholder, and recoveries.",
      settlement_date: "2026-08-29",
      last_working_date: "2026-08-24",
      currency_code: "INR",
      totals_snapshot: {
        gross_dues: "49000.00",
        deductions: "9000.00",
        reimbursements: "0.00",
        employer_contributions: "0.00",
        taxes: "0.00",
        informational: "0.00",
        net_settlement: "40000.00",
        line_count: settlementLines.length,
      },
      source_hash: "a08c7b6a5d4e3f200112233445566778899aabbccddeeff00112233445566",
      config_snapshot: {
        settlement_engine_ref: "payroll.settlement.orchestration.v1",
        exit_source_ref: "employee_lifecycle.exit.v1",
      },
      submitted_at: "2026-09-05T09:40:00+05:30",
      submitted_by_name: "Nisha Rao",
      approved_at: "2026-09-05T09:55:00+05:30",
      approved_by_name: "Nisha Rao",
      rejected_at: null,
      rejected_by_name: null,
      applied_at: now,
      applied_by_name: "Nisha Rao",
      line_count: settlementLines.length,
      created_at: now,
      updated_at: now,
    };

    return {
      summary: {
        run_count: inputSetup.runs.length,
        settlement_count: 1,
        draft_count: 0,
        submitted_count: 0,
        approved_count: 0,
        applied_count: 1,
        line_count: settlementLines.length,
      },
      runs: inputSetup.runs,
      snapshots: inputSetup.snapshots,
      settlements: [settlement],
      lines: settlementLines,
      options: {
        settlement_statuses: [
          { value: "draft", label: "Draft" },
          { value: "submitted", label: "Submitted" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
          { value: "applied", label: "Applied" },
          { value: "voided", label: "Voided" },
        ],
        settlement_line_kinds: [
          { value: "salary_proration", label: "Salary Proration" },
          { value: "leave_encashment", label: "Leave Encashment" },
          { value: "notice_recovery", label: "Notice Recovery" },
          { value: "loan_recovery", label: "Loan Recovery" },
          { value: "advance_recovery", label: "Advance Recovery" },
          { value: "bonus", label: "Bonus" },
          { value: "arrear", label: "Arrear" },
          { value: "gratuity", label: "Gratuity" },
          { value: "statutory", label: "Statutory" },
          { value: "other", label: "Other" },
        ],
        settlement_directions: [
          { value: "earning", label: "Earning" },
          { value: "deduction", label: "Deduction" },
          { value: "reimbursement", label: "Reimbursement" },
          { value: "employer_contribution", label: "Employer Contribution" },
          { value: "tax", label: "Tax" },
          { value: "informational", label: "Informational" },
        ],
        salary_components: [
          { id: "salcomp-final-earned-salary", code: "FINAL_EARNED_SALARY", name: "Final Earned Salary", component_type: "earning" },
          { id: "salcomp-leave-encashment", code: "LEAVE_ENCASHMENT", name: "Leave Encashment", component_type: "earning" },
          { id: "salcomp-notice-recovery", code: "NOTICE_RECOVERY", name: "Notice Recovery", component_type: "deduction" },
        ],
        employees: inputSetup.options.employees,
        exit_records: [
          {
            id: "exit-riya-aug-2026",
            employee_id: snapshot.employee_id,
            employee_code: snapshot.employee_code,
            employee_name: snapshot.employee_name,
            status: "completed",
            last_working_date: "2026-08-24",
          },
        ],
      },
    };
  };

  const buildDemoPayrollRulesSetup = (): HrAdminPayrollRulesSetupResponse => {
    const now = "2026-09-05T09:30:00+05:30";
    const rules = [
      {
        id: "payrule-basic-pay",
        code: "basic-pay",
        name: "Basic Pay",
        rule_type: "formula",
        rule_type_label: "Formula",
        description: "Derives monthly basic pay from locked annual CTC and configured basic percentage.",
        tags: ["salary", "earning", "monthly"],
        config_snapshot: { owner: "payroll", component_ref: "basic" },
        version_count: 1,
        active_version_count: 1,
        evaluation_count: 4,
        created_at: now,
        updated_at: now,
      },
      {
        id: "payrule-hra-metro",
        code: "hra-india-metro",
        name: "HRA India Metro",
        rule_type: "formula",
        rule_type_label: "Formula",
        description: "Calculates metro HRA as the configured share of monthly basic pay.",
        tags: ["salary", "hra", "india"],
        config_snapshot: { statutory_treatment_ref: "india.hra-tax.v1" },
        version_count: 1,
        active_version_count: 1,
        evaluation_count: 3,
        created_at: now,
        updated_at: now,
      },
      {
        id: "payrule-pf-employee",
        code: "pf-employee-india",
        name: "PF Employee India",
        rule_type: "statutory",
        rule_type_label: "Statutory",
        description: "Applies the configured PF employee contribution cap.",
        tags: ["deduction", "pf", "india"],
        config_snapshot: { statutory_pack_ref: "india.pf.v1" },
        version_count: 1,
        active_version_count: 1,
        evaluation_count: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: "payrule-calendar-proration",
        code: "calendar-day-proration",
        name: "Calendar Day Proration",
        rule_type: "proration",
        rule_type_label: "Proration",
        description: "Prorates a monthly amount by paid days over period days.",
        tags: ["proration", "attendance"],
        config_snapshot: { proration_basis: "calendar_days" },
        version_count: 1,
        active_version_count: 1,
        evaluation_count: 2,
        created_at: now,
        updated_at: now,
      },
    ];
    const versions = [
      {
        id: "payrulever-basic-pay-v1",
        rule_id: "payrule-basic-pay",
        rule_code: "basic-pay",
        rule_name: "Basic Pay",
        rule_type: "formula",
        version: 1,
        status: "active",
        status_label: "Active",
        expression_language: "safe_expr_v1",
        expression_language_label: "Safe Expression V1",
        expression: "round_decimal(salary.annual_ctc * salary.basic_percentage / 12, 2)",
        effective_from: "2026-09-01",
        effective_to: null,
        input_schema: { required: ["salary.annual_ctc", "salary.basic_percentage"] },
        output_schema: { type: "decimal", currency: "INR" },
        rounding_rule_ref: "nearest-rupee.v1",
        config_snapshot: { component_ref: "basic" },
        evaluation_count: 4,
        created_at: now,
        updated_at: now,
      },
      {
        id: "payrulever-hra-v1",
        rule_id: "payrule-hra-metro",
        rule_code: "hra-india-metro",
        rule_name: "HRA India Metro",
        rule_type: "formula",
        version: 1,
        status: "active",
        status_label: "Active",
        expression_language: "safe_expr_v1",
        expression_language_label: "Safe Expression V1",
        expression: "round_decimal(salary.basic_monthly * 0.50, 2)",
        effective_from: "2026-09-01",
        effective_to: null,
        input_schema: { required: ["salary.basic_monthly"] },
        output_schema: { type: "decimal", currency: "INR" },
        rounding_rule_ref: "nearest-rupee.v1",
        config_snapshot: { statutory_treatment_ref: "india.hra-tax.v1" },
        evaluation_count: 3,
        created_at: now,
        updated_at: now,
      },
      {
        id: "payrulever-pf-v1",
        rule_id: "payrule-pf-employee",
        rule_code: "pf-employee-india",
        rule_name: "PF Employee India",
        rule_type: "statutory",
        version: 1,
        status: "active",
        status_label: "Active",
        expression_language: "safe_expr_v1",
        expression_language_label: "Safe Expression V1",
        expression: "round_decimal(min(salary.basic_monthly, 15000) * 0.12, 2)",
        effective_from: "2026-09-01",
        effective_to: null,
        input_schema: { required: ["salary.basic_monthly"] },
        output_schema: { type: "decimal", currency: "INR" },
        rounding_rule_ref: "nearest-rupee.v1",
        config_snapshot: { statutory_pack_ref: "india.pf.v1" },
        evaluation_count: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: "payrulever-proration-v1",
        rule_id: "payrule-calendar-proration",
        rule_code: "calendar-day-proration",
        rule_name: "Calendar Day Proration",
        rule_type: "proration",
        version: 1,
        status: "draft",
        status_label: "Draft",
        expression_language: "safe_expr_v1",
        expression_language_label: "Safe Expression V1",
        expression: "round_decimal(salary.monthly_amount * attendance.paid_days / attendance.period_days, 2)",
        effective_from: "2026-09-01",
        effective_to: null,
        input_schema: { required: ["salary.monthly_amount", "attendance.paid_days", "attendance.period_days"] },
        output_schema: { type: "decimal", currency: "INR" },
        rounding_rule_ref: "nearest-rupee.v1",
        config_snapshot: { proration_basis: "calendar_days" },
        evaluation_count: 2,
        created_at: now,
        updated_at: now,
      },
    ];
    const evaluations = [
      {
        id: "payruleeval-basic-riya",
        rule_version_id: "payrulever-basic-pay-v1",
        rule_code: "basic-pay",
        rule_name: "Basic Pay",
        rule_type: "formula",
        input_snapshot_id: "snapshot-aug-emp-0042",
        employee_code: "EMP-0042",
        employee_name: "Riya Sharma",
        expression: "round_decimal(salary.annual_ctc * salary.basic_percentage / 12, 2)",
        context_snapshot: {
          salary: { annual_ctc: "600000.00", basic_percentage: "0.40" },
          attendance: { paid_days: "31", period_days: "31" },
        },
        result_snapshot: { result: "20000.00" },
        trace_snapshot: {
          dependencies: ["salary.annual_ctc", "salary.basic_percentage"],
          trace: [
            { operation: "Mult", left: "600000.00", right: "0.40", result: "240000.0000" },
            { operation: "Div", left: "240000.0000", right: 12, result: "20000.0000" },
            { function: "round_decimal", result: "20000.00" },
          ],
          source_hash: "ab8c7b6a5d4e3f200112233445566778899aabbccddeeff00112233445566",
        },
        evaluated_by_name: "Nisha Rao",
        created_at: now,
        updated_at: now,
      },
      {
        id: "payruleeval-pf-riya",
        rule_version_id: "payrulever-pf-v1",
        rule_code: "pf-employee-india",
        rule_name: "PF Employee India",
        rule_type: "statutory",
        input_snapshot_id: "snapshot-aug-emp-0042",
        employee_code: "EMP-0042",
        employee_name: "Riya Sharma",
        expression: "round_decimal(min(salary.basic_monthly, 15000) * 0.12, 2)",
        context_snapshot: {
          salary: { basic_monthly: "20000.00" },
        },
        result_snapshot: { result: "1800.00" },
        trace_snapshot: {
          dependencies: ["salary.basic_monthly"],
          trace: [
            { function: "min", result: "15000" },
            { operation: "Mult", left: "15000", right: "0.12", result: "1800.00" },
            { function: "round_decimal", result: "1800.00" },
          ],
          source_hash: "ab8c7b6a5d4e3f200112233445566778899aabbccddeeff00112233445566",
        },
        evaluated_by_name: "Nisha Rao",
        created_at: now,
        updated_at: now,
      },
    ];

    return {
      summary: {
        rule_count: rules.length,
        active_version_count: versions.filter((item) => item.status === "active").length,
        draft_version_count: versions.filter((item) => item.status === "draft").length,
        formula_rule_count: rules.filter((item) => item.rule_type === "formula").length,
        evaluation_count: evaluations.length,
        locked_snapshot_count: 3,
      },
      rules,
      versions,
      evaluations,
      options: {
        rule_types: [
          { value: "formula", label: "Formula" },
          { value: "applicability", label: "Applicability" },
          { value: "rounding", label: "Rounding" },
          { value: "proration", label: "Proration" },
          { value: "validation", label: "Validation" },
          { value: "statutory", label: "Statutory" },
          { value: "accounting", label: "Accounting" },
        ],
        rule_version_statuses: [
          { value: "draft", label: "Draft" },
          { value: "active", label: "Active" },
          { value: "retired", label: "Retired" },
        ],
        expression_languages: [
          { value: "safe_expr_v1", label: "Safe Expression V1" },
        ],
        input_snapshots: [
          {
            id: "snapshot-aug-emp-0042",
            employee_code: "EMP-0042",
            employee_name: "Riya Sharma",
            payroll_run_name: "August 2026 Core Payroll",
            source_hash: "ab8c7b6a5d4e3f200112233445566778899aabbccddeeff00112233445566",
          },
          {
            id: "snapshot-aug-emp-0043",
            employee_code: "EMP-0043",
            employee_name: "Aman Verma",
            payroll_run_name: "August 2026 Core Payroll",
            source_hash: "ab8c7b6a5d4e3f210112233445566778899aabbccddeeff00112233445566",
          },
        ],
      },
    };
  };

  const buildDemoPayrollCalculationSetup = (): HrAdminPayrollCalculationSetupResponse => {
    const now = "2026-09-05T09:30:00+05:30";
    const inputSetup = buildDemoPayrollInputSnapshotSetup();
    const ruleSetup = buildDemoPayrollRulesSetup();
    const adjustmentSetup = buildDemoPayrollAdjustmentSetup();
    const calculationId = "paycalc-aug-2026-attempt-2";
    const priorCalculationId = "paycalc-aug-2026-attempt-1";
    const calculatedRunId = "payrun-aug-2026-core";
    const selectedRun = inputSetup.runs.find((item) => item.id === calculatedRunId) ?? inputSetup.runs[0];
    const lockedSnapshots = inputSetup.snapshots.filter((item) => item.payroll_run_id === calculatedRunId).slice(0, 2);
    const runs = inputSetup.runs.map((item) => (
      item.id === calculatedRunId
        ? { ...item, status: "calculated", status_label: "Calculated" }
        : item
    ));
    const selectedVersions = ruleSetup.versions.filter((item) => item.status === "active").slice(0, 3);
    const lineTemplates = [
      {
        ruleVersion: selectedVersions[0],
        component_code: "BASIC",
        component_name: "Basic Pay",
        line_type: "earning",
        calculation_order: 10,
        amount: "20000.00",
        dependencies: ["salary.annual_ctc", "salary.basic_percentage"],
        expression: "round_decimal(salary.annual_ctc * salary.basic_percentage / 12, 2)",
      },
      {
        ruleVersion: selectedVersions[1],
        component_code: "HRA",
        component_name: "HRA India Metro",
        line_type: "earning",
        calculation_order: 20,
        amount: "10000.00",
        dependencies: ["salary.basic_monthly"],
        expression: "round_decimal(salary.basic_monthly * 0.50, 2)",
      },
      {
        ruleVersion: selectedVersions[2],
        component_code: "PF_EMPLOYEE",
        component_name: "PF Employee India",
        line_type: "deduction",
        calculation_order: 30,
        amount: "1800.00",
        dependencies: ["salary.basic_monthly"],
        expression: "round_decimal(min(salary.basic_monthly, 15000) * 0.12, 2)",
      },
    ];
    const lines = lockedSnapshots.flatMap((snapshot, employeeIndex) => lineTemplates.map((template, lineIndex) => {
      const ruleVersion = template.ruleVersion;
      return {
        id: `paycalcline-${employeeIndex}-${lineIndex}`,
        calculation_id: calculationId,
        payroll_run_id: calculatedRunId,
        input_snapshot_id: snapshot.id,
        employee_id: snapshot.employee_id,
        employee_code: snapshot.employee_code,
        employee_name: snapshot.employee_name,
        rule_version_id: ruleVersion.id,
        rule_code: ruleVersion.rule_code,
        rule_name: ruleVersion.rule_name,
        rule_version: ruleVersion.version,
        adjustment_id: null,
        line_source: "rule",
        line_source_label: "Rule",
        component_code: template.component_code,
        component_name: template.component_name,
        line_type: template.line_type,
        calculation_order: template.calculation_order,
        amount: template.amount,
        currency_code: "INR",
        status: "calculated",
        status_label: "Calculated",
        expression: template.expression,
        source_hash: snapshot.source_hash,
        context_snapshot: {
          salary: {
            annual_ctc: snapshot.salary_snapshot.annual_ctc,
            basic_percentage: "0.40",
            basic_monthly: "20000.00",
          },
          attendance: snapshot.attendance_snapshot,
          components: {
            basic: "20000.00",
            hra: lineIndex > 1 ? "10000.00" : undefined,
          },
        },
        result_snapshot: { result: template.amount },
        trace_snapshot: {
          dependencies: template.dependencies,
          trace: [
            { function: "round_decimal", result: template.amount },
          ],
          source_hash: snapshot.source_hash,
          rule_code: ruleVersion.rule_code,
          rule_version: ruleVersion.version,
        },
        error_message: "",
        config_snapshot: {
          component_code: template.component_code,
          line_type: template.line_type,
          calculation_order: template.calculation_order,
          output_path: lineIndex === 0 ? "salary.basic_monthly" : "",
        },
        created_at: now,
        updated_at: now,
      };
    }));
    const appliedAdjustments = adjustmentSetup.adjustments.filter((item) => (
      item.payroll_run_id === calculatedRunId && item.status === "applied" && Boolean(item.input_snapshot_id)
    ));
    const adjustmentLines = appliedAdjustments.map((adjustment, index) => ({
      id: `paycalcline-adjustment-${adjustment.id}`,
      calculation_id: calculationId,
      payroll_run_id: calculatedRunId,
      input_snapshot_id: adjustment.input_snapshot_id ?? "",
      employee_id: adjustment.employee_id,
      employee_code: adjustment.employee_code,
      employee_name: adjustment.employee_name,
      rule_version_id: null,
      rule_code: "",
      rule_name: "",
      rule_version: null,
      adjustment_id: adjustment.id,
      line_source: "adjustment",
      line_source_label: "Adjustment",
      component_code: adjustment.component_code,
      component_name: adjustment.component_name,
      line_type: adjustment.direction,
      calculation_order: Number(adjustment.config_snapshot.calculation_order ?? 900) + index,
      amount: adjustment.amount,
      currency_code: adjustment.currency_code,
      status: "calculated",
      status_label: "Calculated",
      expression: "",
      source_hash: adjustment.source_hash,
      context_snapshot: {
        adjustment_id: adjustment.id,
        source_ref: adjustment.source_ref,
        effective_date: adjustment.effective_date,
        source_period_start: adjustment.source_period_start,
        source_period_end: adjustment.source_period_end,
      },
      result_snapshot: {
        result: adjustment.amount,
        direction: adjustment.direction,
      },
      trace_snapshot: {
        dependencies: ["payroll_adjustment.amount"],
        trace: [
          { source: "payroll_adjustment", amount: adjustment.amount, direction: adjustment.direction },
        ],
        adjustment_id: adjustment.id,
        adjustment_profile_ref: adjustment.adjustment_profile_ref,
      },
      error_message: "",
      config_snapshot: {
        ...adjustment.config_snapshot,
        line_source: "adjustment",
        adjustment_kind: adjustment.kind,
        adjustment_profile_ref: adjustment.adjustment_profile_ref,
        approval_profile_ref: adjustment.approval_profile_ref,
        source_ref: adjustment.source_ref,
      },
      created_at: now,
      updated_at: now,
    }));
    const allLines = [...lines, ...adjustmentLines];
    const calculation = {
      id: calculationId,
      payroll_run_id: calculatedRunId,
      payroll_run_name: selectedRun.name,
      payroll_run_status: "calculated",
      period_name: selectedRun.period_name,
      pay_group_name: selectedRun.pay_group_name,
      attempt_number: 2,
      status: "completed",
      status_label: "Completed",
      calculation_profile_ref: "india.monthly.calc.profile.v1",
      calculated_at: now,
      calculated_by_name: "Nisha Rao",
      rule_selection_snapshot: {
        period_start: "2026-08-01",
        period_end: "2026-08-31",
        rule_versions: selectedVersions.map((item, index) => ({
          rule_code: item.rule_code,
          rule_name: item.rule_name,
          rule_type: item.rule_type,
          version: item.version,
          calculation_order: (index + 1) * 10,
        })),
        applied_adjustments: appliedAdjustments.map((item) => ({
          adjustment_id: item.id,
          employee_id: item.employee_id,
          component_code: item.component_code,
          amount: item.amount,
          direction: item.direction,
          source_hash: item.source_hash,
        })),
      },
      totals_snapshot: {
        gross_earnings: "67500.00",
        employee_deductions: "3600.00",
        employer_contributions: "0.00",
        net_pay: "63900.00",
        employee_count: 2,
        line_count: allLines.length,
        error_count: 0,
      },
      error_snapshot: { error_count: 0, applied_adjustment_count: appliedAdjustments.length },
      config_snapshot: {
        calculation_profile: {
          rule_codes: selectedVersions.map((item) => item.rule_code),
        },
      },
      line_count: allLines.length,
      error_line_count: 0,
      created_at: now,
      updated_at: now,
    };
    const validationIssues = [
      {
        id: "payvalissue-source-warning-aug-2026",
        payroll_run_id: calculatedRunId,
        payroll_run_name: selectedRun.name,
        calculation_id: calculationId,
        input_snapshot_id: lockedSnapshots[0]?.id ?? null,
        employee_id: lockedSnapshots[0]?.employee_id ?? null,
        employee_code: lockedSnapshots[0]?.employee_code ?? "",
        employee_name: lockedSnapshots[0]?.employee_name ?? "",
        calculation_line_id: null,
        severity: "warning",
        severity_label: "Warning",
        category: "source_data",
        category_label: "Source Data",
        status: "open",
        status_label: "Open",
        issue_code: "SNAPSHOT_WARNINGS",
        title: "Snapshot has source-data warnings",
        detail: "Attendance and leave warning items were accepted for draft calculation review.",
        source_ref: `validation_snapshot:${lockedSnapshots[0]?.employee_code ?? "employee"}:warnings`,
        validation_profile_ref: "india.monthly.validation.profile.v1",
        source_hash: "7f1e9b4c0d2a6385b8d94d233a77291f44cb11a0c8a1f3ee145f1e4b9a982631",
        context_snapshot: {
          warnings: ["Pending attendance regularization accepted for calculation review"],
          source_hash: lockedSnapshots[0]?.source_hash ?? "",
        },
        config_snapshot: {
          validation_profile_ref: "india.monthly.validation.profile.v1",
          validation_profile: {
            require_locked_inputs: true,
            require_salary_payload: true,
            warn_snapshot_warnings: true,
            warn_pending_adjustments: true,
            warn_pending_settlements: true,
          },
        },
        created_at: now,
        updated_at: now,
      },
      {
        id: "payvalissue-statutory-profile-aug-2026",
        payroll_run_id: calculatedRunId,
        payroll_run_name: selectedRun.name,
        calculation_id: calculationId,
        input_snapshot_id: null,
        employee_id: null,
        employee_code: "",
        employee_name: "",
        calculation_line_id: null,
        severity: "warning",
        severity_label: "Warning",
        category: "statutory_setup",
        category_label: "Statutory Setup",
        status: "open",
        status_label: "Open",
        issue_code: "REQUIRED_STATUTORY_PROFILE_MISSING",
        title: "Required statutory profile needs review",
        detail: "India validation profile expects ESI profile confirmation before final approval.",
        source_ref: "payroll_run:aug-2026-core:statutory_profiles",
        validation_profile_ref: "india.monthly.validation.profile.v1",
        source_hash: "4b36c9e2f2c7ad90172f4f47b80420165f828596827092f36a1d64a9d33c2742",
        context_snapshot: {
          missing_statutory_refs: ["india.esi.v1"],
          available_statutory_refs: ["india.pf.v1", "india.hra-tax.v1"],
        },
        config_snapshot: {
          validation_profile_ref: "india.monthly.validation.profile.v1",
          validation_profile: {
            required_statutory_profile_refs: ["india.pf.v1", "india.esi.v1"],
            required_statutory_profile_severity: "warning",
          },
        },
        created_at: now,
        updated_at: now,
      },
    ];

    return {
      summary: {
        run_count: runs.length,
        calculable_run_count: 1,
        calculation_count: 2,
        completed_calculation_count: 1,
        failed_calculation_count: 0,
        line_count: allLines.length,
        error_line_count: 0,
        validation_issue_count: validationIssues.length,
        open_validation_issue_count: validationIssues.length,
        validation_warning_count: validationIssues.filter((item) => item.severity === "warning").length,
        validation_blocker_count: 0,
        latest_net_pay: "63900.00",
      },
      runs,
      calculations: [
        calculation,
        {
          ...calculation,
          id: priorCalculationId,
          attempt_number: 1,
          status: "superseded",
          status_label: "Superseded",
          calculated_at: "2026-09-05T08:45:00+05:30",
          line_count: allLines.length,
        },
      ],
      lines: allLines,
      validation_issues: validationIssues,
      options: {
        payroll_run_statuses: inputSetup.options.payroll_run_statuses,
        calculation_statuses: [
          { value: "draft", label: "Draft" },
          { value: "completed", label: "Completed" },
          { value: "failed", label: "Failed" },
          { value: "superseded", label: "Superseded" },
        ],
        line_statuses: [
          { value: "calculated", label: "Calculated" },
          { value: "error", label: "Error" },
          { value: "skipped", label: "Skipped" },
        ],
        line_sources: [
          { value: "rule", label: "Rule" },
          { value: "adjustment", label: "Adjustment" },
        ],
        validation_severities: [
          { value: "info", label: "Info" },
          { value: "warning", label: "Warning" },
          { value: "blocker", label: "Blocker" },
        ],
        validation_categories: [
          { value: "source_data", label: "Source Data" },
          { value: "salary_setup", label: "Salary Setup" },
          { value: "rule_setup", label: "Rule Setup" },
          { value: "statutory_setup", label: "Statutory Setup" },
          { value: "adjustment", label: "Adjustment" },
          { value: "settlement", label: "Settlement" },
          { value: "output_readiness", label: "Output Readiness" },
        ],
        validation_statuses: [
          { value: "open", label: "Open" },
          { value: "accepted", label: "Accepted" },
          { value: "resolved", label: "Resolved" },
        ],
        active_rule_versions: selectedVersions.map((item, index) => ({
          id: item.id,
          rule_code: item.rule_code,
          rule_name: item.rule_name,
          rule_type: item.rule_type,
          version: item.version,
          effective_from: item.effective_from,
          effective_to: item.effective_to,
          calculation_order: (index + 1) * 10,
        })),
      },
    };
  };

  const buildDemoPayrollReviewSetup = (): HrAdminPayrollReviewSetupResponse => {
    const now = "2026-09-05T10:10:00+05:30";
    const submittedAt = "2026-09-05T09:40:00+05:30";
    const approvedAt = "2026-09-05T09:55:00+05:30";
    const lockedAt = "2026-09-05T10:05:00+05:30";
    const calculationSetup = buildDemoPayrollCalculationSetup();
    const calculation = calculationSetup.calculations[0];
    const reviewId = "payreview-aug-2026-core";
    const primaryRunId = calculation.payroll_run_id;
    const selectedLine = calculationSetup.lines.find((item) => item.component_code === "PF_EMPLOYEE") ?? calculationSetup.lines[0];
    const runs = calculationSetup.runs.map((item) => (
      item.id === primaryRunId
        ? {
            ...item,
            status: "locked",
            status_label: "Locked",
            final_locked_at: lockedAt,
            final_locked_by_name: "Nisha Rao",
          }
        : item
    ));
    const review = {
      id: reviewId,
      payroll_run_id: primaryRunId,
      payroll_run_name: calculation.payroll_run_name,
      payroll_run_status: "locked",
      calculation_id: calculation.id,
      calculation_attempt_number: calculation.attempt_number,
      status: "locked",
      status_label: "Locked",
      review_profile_ref: "india.monthly.review.profile.v1",
      opened_at: "2026-09-05T09:32:00+05:30",
      opened_by_name: "Nisha Rao",
      submitted_at: submittedAt,
      submitted_by_name: "Nisha Rao",
      approved_at: approvedAt,
      approved_by_name: "Nisha Rao",
      locked_at: lockedAt,
      locked_by_name: "Nisha Rao",
      totals_snapshot: calculation.totals_snapshot,
      exception_summary_snapshot: {
        total: 2,
        open: 0,
        accepted: 1,
        resolved: 1,
        rejected: 0,
        blocker_open: 0,
        warning_open: 0,
        info_open: 0,
      },
      approval_snapshot: {
        latest_status: "approved",
        latest_decided_at: approvedAt,
        approval_profile_ref: "india.monthly.approval.profile.v1",
      },
      config_snapshot: {
        review_policy_ref: "payroll.review.no-hardcoding.v1",
        required_exception_decision: true,
        final_lock_immutability: true,
      },
      exception_count: 2,
      approval_count: 1,
      created_at: now,
      updated_at: now,
    };
    const exceptions = [
      {
        id: "payexception-variance-note",
        review_id: reviewId,
        payroll_run_id: primaryRunId,
        calculation_line_id: selectedLine?.id ?? null,
        input_snapshot_id: selectedLine?.input_snapshot_id ?? null,
        employee_id: selectedLine?.employee_id ?? null,
        employee_code: selectedLine?.employee_code ?? "EMP-0042",
        employee_name: selectedLine?.employee_name ?? "Riya Sharma",
        component_code: selectedLine?.component_code ?? "PF_EMPLOYEE",
        category: "statutory_review",
        severity: "warning",
        severity_label: "Warning",
        status: "accepted",
        status_label: "Accepted",
        title: "PF cap reviewed",
        detail: "The statutory rule used the configured contribution cap and trace dependencies from the locked input snapshot.",
        decision_reason: "Accepted after finance verified the active India PF rule pack reference.",
        decided_at: "2026-09-05T09:47:00+05:30",
        decided_by_name: "Nisha Rao",
        config_snapshot: {
          rule_pack_ref: "india.pf.v1",
          source_hash: selectedLine?.source_hash ?? "",
        },
        created_at: now,
        updated_at: now,
      },
      {
        id: "payexception-attendance-warning",
        review_id: reviewId,
        payroll_run_id: primaryRunId,
        calculation_line_id: null,
        input_snapshot_id: "snapshot-aug-emp-0043",
        employee_id: "emp-0043",
        employee_code: "EMP-0043",
        employee_name: "Aman Verma",
        component_code: null,
        category: "input_warning",
        severity: "info",
        severity_label: "Info",
        status: "resolved",
        status_label: "Resolved",
        title: "Attendance source warning resolved",
        detail: "The input warning was reconciled against the attendance source before final lock.",
        decision_reason: "Resolved with no payroll amount impact.",
        decided_at: "2026-09-05T09:50:00+05:30",
        decided_by_name: "Nisha Rao",
        config_snapshot: {
          input_profile_ref: "india.monthly.input.profile.v1",
          resolution_policy_ref: "payroll.exception-resolution.v1",
        },
        created_at: now,
        updated_at: now,
      },
    ];
    const approvals = [
      {
        id: "payapproval-aug-2026-core",
        review_id: reviewId,
        payroll_run_id: primaryRunId,
        approver_name: "Nisha Rao",
        status: "approved",
        status_label: "Approved",
        comment: "Finance controls, exception decisions, and calculation trace reviewed for final lock.",
        decided_at: approvedAt,
        approval_profile_ref: "india.monthly.approval.profile.v1",
        config_snapshot: {
          approval_step_ref: "finance.single-approver.v1",
          lock_after_approval: true,
        },
        created_at: now,
        updated_at: now,
      },
    ];

    return {
      summary: {
        run_count: runs.length,
        review_count: 1,
        open_review_count: 0,
        approved_review_count: 0,
        locked_review_count: 1,
        exception_count: exceptions.length,
        open_exception_count: 0,
        open_blocker_count: 0,
        approval_count: approvals.length,
        latest_net_pay: String(calculation.totals_snapshot.net_pay ?? "0.00"),
      },
      runs,
      calculations: calculationSetup.calculations,
      reviews: [review],
      exceptions,
      approvals,
      lines: calculationSetup.lines,
      options: {
        payroll_run_statuses: calculationSetup.options.payroll_run_statuses,
        review_statuses: [
          { value: "open", label: "Open" },
          { value: "ready_for_approval", label: "Ready For Approval" },
          { value: "approved", label: "Approved" },
          { value: "locked", label: "Locked" },
          { value: "rejected", label: "Rejected" },
        ],
        exception_statuses: [
          { value: "open", label: "Open" },
          { value: "accepted", label: "Accepted" },
          { value: "resolved", label: "Resolved" },
          { value: "rejected", label: "Rejected" },
        ],
        exception_severities: [
          { value: "info", label: "Info" },
          { value: "warning", label: "Warning" },
          { value: "blocker", label: "Blocker" },
        ],
        approval_statuses: [
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
        ],
      },
    };
  };

  const buildDemoPayrollOutputSetup = (): HrAdminPayrollOutputSetupResponse => {
    const now = "2026-09-05T10:25:00+05:30";
    const reviewSetup = buildDemoPayrollReviewSetup();
    const review = reviewSetup.reviews[0];
    const batchId = "payoutbatch-aug-2026-core";
    const outputProfileRef = "india.monthly.output.profile.v1";
    const payslipLines = reviewSetup.lines.reduce<Record<string, typeof reviewSetup.lines>>((groups, line) => {
      groups[line.employee_code] = [...(groups[line.employee_code] ?? []), line];
      return groups;
    }, {});
    const payslipArtifacts = Object.entries(payslipLines).slice(0, 2).map(([employeeCode, lines], index) => {
      const firstLine = lines[0];
      const artifactId = `payoutartifact-payslip-${employeeCode.toLowerCase()}`;
      const gross = lines
        .filter((line) => line.line_type === "earning")
        .reduce((total, line) => total + Number(line.amount), 0);
      const deductions = lines
        .filter((line) => line.line_type === "deduction" || line.line_type === "tax")
        .reduce((total, line) => total + Number(line.amount), 0);
      return {
        id: artifactId,
        output_batch_id: batchId,
        payroll_run_id: review.payroll_run_id,
        review_id: review.id,
        employee_id: firstLine.employee_id,
        employee_code: employeeCode,
        employee_name: firstLine.employee_name,
        input_snapshot_id: firstLine.input_snapshot_id,
        kind: "payslip",
        kind_label: "Payslip",
        status: "published",
        status_label: "Published",
        artifact_key: `payslip:${employeeCode}`,
        title: `Payslip - ${firstLine.employee_name}`,
        file_name: `aug-2026-core-${employeeCode}-payslip.html`,
        content_type: "text/html",
        storage_provider_ref: "payroll.storage.local.generated.v1",
        storage_key: `payroll/aug-2026-core/${outputProfileRef}/payslip/aug-2026-core-${employeeCode}-payslip.html`,
        mime_type: "text/html",
        file_size_bytes: 14624 + index * 418,
        checksum_sha256: `aa8b7a6f5e4d3c2b10${index}112233445566778899aabbccddeeff00112233445566`,
        is_downloadable: true,
        retention_policy_ref: "payroll.retention.7y.v1",
        download_url: `/api/v1/hr-admin/payroll-output-artifacts/${artifactId}/download/`,
        output_profile_ref: outputProfileRef,
        totals_snapshot: {
          gross_earnings: gross.toFixed(2),
          employee_deductions: deductions.toFixed(2),
          employer_contributions: "0.00",
          net_pay: (gross - deductions).toFixed(2),
        },
        line_snapshot: lines.map((line) => ({
          component_code: line.component_code,
          component_name: line.component_name,
          line_type: line.line_type,
          amount: line.amount,
          rule_code: line.rule_code,
          rule_version: line.rule_version,
          source_hash: line.source_hash,
        })),
        source_hash: `c8b7a6f5e4d3c2b10${index}112233445566778899aabbccddeeff00112233445566`,
        published_at: now,
        published_by_name: "Nisha Rao",
        config_snapshot: {
          artifact_template_ref: "payroll.payslip.template.india.v1",
          delivery_policy_ref: "employee.portal.publish.v1",
        },
        created_at: now,
        updated_at: now,
      };
    });
    const registerArtifact = {
      id: "payoutartifact-register-aug-2026-core",
      output_batch_id: batchId,
      payroll_run_id: review.payroll_run_id,
      review_id: review.id,
      employee_id: null,
      employee_code: null,
      employee_name: null,
      input_snapshot_id: null,
      kind: "register",
      kind_label: "Register",
      status: "published",
      status_label: "Published",
      artifact_key: "register:aug-2026-core",
      title: "Payroll Register - August 2026 Core Payroll",
      file_name: "aug-2026-core-payroll-register.csv",
      content_type: "text/csv",
      storage_provider_ref: "payroll.storage.local.generated.v1",
      storage_key: `payroll/aug-2026-core/${outputProfileRef}/register/aug-2026-core-payroll-register.csv`,
      mime_type: "text/csv",
      file_size_bytes: 9216,
      checksum_sha256: "bb8c7b6a5f4e3d2c10112233445566778899aabbccddeeff00112233445566",
      is_downloadable: true,
      retention_policy_ref: "payroll.retention.7y.v1",
      download_url: "/api/v1/hr-admin/payroll-output-artifacts/payoutartifact-register-aug-2026-core/download/",
      output_profile_ref: outputProfileRef,
      totals_snapshot: review.totals_snapshot,
      line_snapshot: payslipArtifacts.map((artifact) => ({
        employee_code: artifact.employee_code,
        employee_name: artifact.employee_name,
        source_hash: artifact.source_hash,
        ...artifact.totals_snapshot,
      })),
      source_hash: "d8c7b6a5f4e3d2c10112233445566778899aabbccddeeff00112233445566",
      published_at: now,
      published_by_name: "Nisha Rao",
      config_snapshot: {
        artifact_template_ref: "payroll.register.template.india.v1",
        finance_handoff_profile_ref: "finance.export.pending.v1",
      },
      created_at: now,
      updated_at: now,
    };
    const artifacts = [...payslipArtifacts, registerArtifact];
    const outputBatch = {
      id: batchId,
      payroll_run_id: review.payroll_run_id,
      payroll_run_name: review.payroll_run_name,
      review_id: review.id,
      review_status: review.status,
      status: "published",
      status_label: "Published",
      output_profile_ref: outputProfileRef,
      generated_at: "2026-09-05T10:18:00+05:30",
      generated_by_name: "Nisha Rao",
      published_at: now,
      published_by_name: "Nisha Rao",
      totals_snapshot: review.totals_snapshot,
      artifact_summary_snapshot: {
        artifact_count: artifacts.length,
        payslip_count: payslipArtifacts.length,
        register_count: 1,
        published_count: artifacts.length,
        voided_count: 0,
      },
      config_snapshot: {
        output_profile: {
          output_profile_ref: outputProfileRef,
          payslip_template_ref: "payroll.payslip.template.india.v1",
          register_template_ref: "payroll.register.template.india.v1",
        },
        review_id: review.id,
        calculation_id: review.calculation_id,
      },
      artifact_count: artifacts.length,
      payslip_count: payslipArtifacts.length,
      register_count: 1,
      published_artifact_count: artifacts.length,
      created_at: now,
      updated_at: now,
    };

    return {
      summary: {
        run_count: reviewSetup.runs.length,
        locked_review_count: reviewSetup.summary.locked_review_count,
        output_batch_count: 1,
        generated_batch_count: 0,
        published_batch_count: 1,
        artifact_count: artifacts.length,
        payslip_count: payslipArtifacts.length,
        register_count: 1,
        published_artifact_count: artifacts.length,
        latest_net_pay: String(review.totals_snapshot.net_pay ?? "0.00"),
      },
      runs: reviewSetup.runs,
      reviews: reviewSetup.reviews,
      output_batches: [outputBatch],
      artifacts,
      options: {
        output_batch_statuses: [
          { value: "generated", label: "Generated" },
          { value: "published", label: "Published" },
          { value: "superseded", label: "Superseded" },
        ],
        output_artifact_kinds: [
          { value: "payslip", label: "Payslip" },
          { value: "register", label: "Register" },
          { value: "bank_advice", label: "Bank Advice" },
          { value: "accounting_export", label: "Accounting Export" },
          { value: "statutory_report", label: "Statutory Report" },
        ],
        output_artifact_statuses: [
          { value: "generated", label: "Generated" },
          { value: "published", label: "Published" },
          { value: "voided", label: "Voided" },
        ],
      },
    };
  };

  const buildDemoPayrollFinanceHandoffSetup = (): HrAdminPayrollFinanceHandoffSetupResponse => {
    const now = "2026-09-05T11:10:00+05:30";
    const outputSetup = buildDemoPayrollOutputSetup();
    const batch = outputSetup.output_batches[0];
    const payslips = outputSetup.artifacts.filter((artifact) => artifact.kind === "payslip");
    const handoffId = "payhandoff-aug-2026-core";
    const handoffProfileRef = "india.monthly.finance.handoff.v1";
    const bankFileProfileRef = "india.bank.neft.profile.v1";
    const accountingExportProfileRef = "tally.accounting.export.v1";
    const statutoryPackRef = "india.statutory.summary.v1";
    const bankRows = payslips.map((artifact) => ({
      employee_code: artifact.employee_code,
      employee_name: artifact.employee_name,
      net_pay: String(artifact.totals_snapshot.net_pay ?? "0.00"),
      currency_code: "INR",
      source_artifact_id: artifact.id,
      source_hash: artifact.source_hash,
      banking_snapshot: {
        payout_account_ref: `${artifact.employee_code}-primary-bank`,
        validation_policy_ref: "payroll.bank.validation.v1",
      },
    }));
    const accountingRows = payslips.flatMap((artifact) => [
      {
        employee_code: artifact.employee_code,
        line_type: "earning",
        amount: String(artifact.totals_snapshot.gross_earnings ?? "0.00"),
        source_artifact_id: artifact.id,
        source_hash: artifact.source_hash,
      },
      {
        employee_code: artifact.employee_code,
        line_type: "deduction",
        amount: String(artifact.totals_snapshot.employee_deductions ?? "0.00"),
        source_artifact_id: artifact.id,
        source_hash: artifact.source_hash,
      },
      {
        employee_code: artifact.employee_code,
        line_type: "net_pay",
        amount: String(artifact.totals_snapshot.net_pay ?? "0.00"),
        source_artifact_id: artifact.id,
        source_hash: artifact.source_hash,
      },
    ]);
    const statutoryRows = payslips.flatMap((artifact) =>
      artifact.line_snapshot
        .filter((line) => line.line_type === "deduction" || line.line_type === "tax" || line.line_type === "employer_contribution")
        .map((line) => ({
          employee_code: artifact.employee_code,
          component_code: line.component_code,
          component_name: line.component_name,
          line_type: line.line_type,
          amount: String(line.amount ?? "0.00"),
          statutory_treatment_ref: "india.pf.employee.v1",
          source_hash: String(line.source_hash ?? artifact.source_hash),
        })),
    );
    const netPay = payslips.reduce((total, artifact) => total + Number(artifact.totals_snapshot.net_pay ?? 0), 0);
    const deductions = payslips.reduce((total, artifact) => total + Number(artifact.totals_snapshot.employee_deductions ?? 0), 0);
    const gross = payslips.reduce((total, artifact) => total + Number(artifact.totals_snapshot.gross_earnings ?? 0), 0);
    const financeArtifacts = [
      {
        id: "payhandoff-bank-advice-aug-2026-core",
        output_batch_id: batch.id,
        payroll_run_id: batch.payroll_run_id,
        review_id: batch.review_id,
        employee_id: null,
        employee_code: null,
        employee_name: null,
        input_snapshot_id: null,
        kind: "bank_advice",
        kind_label: "Bank Advice",
        status: "published",
        status_label: "Published",
        artifact_key: "finance:aug-2026-core:bank-advice",
        title: "Bank Advice - August 2026 Core Payroll",
        file_name: "aug-2026-core-bank-advice.csv",
        content_type: "text/csv",
        storage_provider_ref: "payroll.storage.local.generated.v1",
        storage_key: `payroll/aug-2026-core/${handoffProfileRef}/bank_advice/aug-2026-core-bank-advice.csv`,
        mime_type: "text/csv",
        file_size_bytes: 6240,
        checksum_sha256: "bf87118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
        is_downloadable: true,
        retention_policy_ref: "payroll.retention.7y.v1",
        download_url: "/api/v1/hr-admin/payroll-output-artifacts/payhandoff-bank-advice-aug-2026-core/download/",
        output_profile_ref: bankFileProfileRef,
        totals_snapshot: { net_pay: netPay.toFixed(2), employee_count: payslips.length },
        line_snapshot: bankRows,
        source_hash: "fa87118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
        published_at: now,
        published_by_name: "Nisha Rao",
        config_snapshot: { handoff_id: handoffId, handoff_profile_ref: handoffProfileRef, transmission_channel_ref: "bank.sftp.channel.primary.v1" },
        created_at: now,
        updated_at: now,
      },
      {
        id: "payhandoff-accounting-export-aug-2026-core",
        output_batch_id: batch.id,
        payroll_run_id: batch.payroll_run_id,
        review_id: batch.review_id,
        employee_id: null,
        employee_code: null,
        employee_name: null,
        input_snapshot_id: null,
        kind: "accounting_export",
        kind_label: "Accounting Export",
        status: "published",
        status_label: "Published",
        artifact_key: "finance:aug-2026-core:accounting-export",
        title: "Accounting Export - August 2026 Core Payroll",
        file_name: "aug-2026-core-accounting-export.csv",
        content_type: "text/csv",
        storage_provider_ref: "payroll.storage.local.generated.v1",
        storage_key: `payroll/aug-2026-core/${handoffProfileRef}/accounting_export/aug-2026-core-accounting-export.csv`,
        mime_type: "text/csv",
        file_size_bytes: 8144,
        checksum_sha256: "ac77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
        is_downloadable: true,
        retention_policy_ref: "payroll.retention.7y.v1",
        download_url: "/api/v1/hr-admin/payroll-output-artifacts/payhandoff-accounting-export-aug-2026-core/download/",
        output_profile_ref: accountingExportProfileRef,
        totals_snapshot: { gross_earnings: gross.toFixed(2), employee_deductions: deductions.toFixed(2), net_pay: netPay.toFixed(2), employee_count: payslips.length },
        line_snapshot: accountingRows,
        source_hash: "ab77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
        published_at: now,
        published_by_name: "Nisha Rao",
        config_snapshot: { handoff_id: handoffId, handoff_profile_ref: handoffProfileRef, ledger_mapping_ref: "finance.ledger.mapping.default.v1" },
        created_at: now,
        updated_at: now,
      },
      {
        id: "payhandoff-statutory-report-aug-2026-core",
        output_batch_id: batch.id,
        payroll_run_id: batch.payroll_run_id,
        review_id: batch.review_id,
        employee_id: null,
        employee_code: null,
        employee_name: null,
        input_snapshot_id: null,
        kind: "statutory_report",
        kind_label: "Statutory Report",
        status: "published",
        status_label: "Published",
        artifact_key: "finance:aug-2026-core:statutory-summary",
        title: "Statutory Summary - August 2026 Core Payroll",
        file_name: "aug-2026-core-statutory-summary.csv",
        content_type: "text/csv",
        storage_provider_ref: "payroll.storage.local.generated.v1",
        storage_key: `payroll/aug-2026-core/${handoffProfileRef}/statutory_report/aug-2026-core-statutory-summary.csv`,
        mime_type: "text/csv",
        file_size_bytes: 5368,
        checksum_sha256: "cd77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
        is_downloadable: true,
        retention_policy_ref: "payroll.retention.7y.v1",
        download_url: "/api/v1/hr-admin/payroll-output-artifacts/payhandoff-statutory-report-aug-2026-core/download/",
        output_profile_ref: statutoryPackRef,
        totals_snapshot: { statutory_total: deductions.toFixed(2), line_count: statutoryRows.length },
        line_snapshot: statutoryRows,
        source_hash: "cd77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
        published_at: now,
        published_by_name: "Nisha Rao",
        config_snapshot: { handoff_id: handoffId, handoff_profile_ref: handoffProfileRef, return_pack_ref: statutoryPackRef },
        created_at: now,
        updated_at: now,
      },
    ];
    const handoff = {
      id: handoffId,
      output_batch_id: batch.id,
      payroll_run_id: batch.payroll_run_id,
      payroll_run_name: batch.payroll_run_name,
      review_id: batch.review_id,
      status: "transmitted",
      status_label: "Transmitted",
      handoff_profile_ref: handoffProfileRef,
      bank_file_profile_ref: bankFileProfileRef,
      accounting_export_profile_ref: accountingExportProfileRef,
      statutory_pack_ref: statutoryPackRef,
      generated_at: "2026-09-05T10:55:00+05:30",
      generated_by_name: "Nisha Rao",
      transmitted_at: now,
      transmitted_by_name: "Nisha Rao",
      accepted_at: null,
      accepted_by_name: null,
      totals_snapshot: {
        gross_earnings: gross.toFixed(2),
        employee_deductions: deductions.toFixed(2),
        net_pay: netPay.toFixed(2),
        bank_advice_total: netPay.toFixed(2),
        statutory_total: deductions.toFixed(2),
        employee_count: payslips.length,
      },
      handoff_summary_snapshot: {
        artifact_count: financeArtifacts.length,
        bank_advice_count: 1,
        accounting_export_count: 1,
        statutory_report_count: 1,
        published_count: financeArtifacts.length,
        generated_count: 0,
      },
      config_snapshot: {
        finance_handoff_profile: {
          handoff_profile_ref: handoffProfileRef,
          bank_file_profile_ref: bankFileProfileRef,
          accounting_export_profile_ref: accountingExportProfileRef,
          statutory_pack_ref: statutoryPackRef,
        },
        source_output_batch_id: batch.id,
        source_output_profile_ref: batch.output_profile_ref,
      },
      artifact_count: financeArtifacts.length,
      created_at: now,
      updated_at: now,
    };

    return {
      summary: {
        published_output_batch_count: outputSetup.summary.published_batch_count,
        handoff_count: 1,
        generated_handoff_count: 0,
        transmitted_handoff_count: 1,
        accepted_handoff_count: 0,
        finance_artifact_count: financeArtifacts.length,
        latest_net_pay: netPay.toFixed(2),
      },
      output_batches: outputSetup.output_batches,
      handoffs: [handoff],
      artifacts: financeArtifacts,
      options: {
        handoff_statuses: [
          { value: "generated", label: "Generated" },
          { value: "transmitted", label: "Transmitted" },
          { value: "accepted", label: "Accepted" },
          { value: "failed", label: "Failed" },
        ],
        output_artifact_kinds: outputSetup.options.output_artifact_kinds,
        output_artifact_statuses: outputSetup.options.output_artifact_statuses,
      },
    };
  };

  const demoHrAdminNotificationDiagnostics: HrAdminNotificationDiagnostics = {
    overview: {
      total_templates: demoHrAdminNotificationTemplates.length,
      active_templates: demoHrAdminNotificationTemplates.filter((item) => item.status === "active").length,
      total_events: demoHrAdminNotificationEvents.length,
      active_events: demoHrAdminNotificationEvents.filter((item) => item.is_active).length,
      live_notifications: demoHrAdminNotifications.length,
      failed_notifications: demoHrAdminNotifications.filter((item) => item.status === "failed").length,
      preview_test_notifications: demoHrAdminNotifications.filter((item) => {
        const previewMode = item.payload?.preview_mode;
        return previewMode === "template_test_send" || previewMode === "event_test_send";
      }).length,
    },
    alerts: [
      {
        level: "medium",
        title: "Templates without linked events",
        description: "Some reusable templates are still not connected to any active event definitions.",
        href: "/hr-admin/notification-templates",
      },
      {
        level: "info",
        title: "Active events without test sends",
        description: "Use the preview and test flow to verify active routing before queue volume grows.",
        href: "/hr-admin/notification-events",
      },
    ],
    recommendations: [
      {
        category: "Catalog hygiene",
        title: "Connect unused templates",
        description: "Review templates that have no linked events and either archive them or wire them into routing rules.",
        href: "/hr-admin/notification-templates",
      },
      {
        category: "Verification",
        title: "Test active document events",
        description: "Document-heavy routing is active. Run preview/test sends on expiry and re-upload rules regularly.",
        href: "/hr-admin/notification-events",
      },
    ],
    channel_diagnostics: demoHrAdminNotificationOptions.notification_channels.map((channelOption) => {
      const configuration = demoHrAdminNotificationOptions.channel_configurations.find((item) => item.channel === channelOption.value);
      const items = demoHrAdminNotifications.filter((item) => item.channel === channelOption.value);
      const latestFailureLog = items
        .flatMap((item) => item.delivery_logs)
        .filter((item) => item.status === "failed" || Boolean(item.error_message))
        .sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
      const latestNotification = [...items].sort((left, right) => {
        const leftValue = left.delivery_logs[0]?.created_at || left.read_at || left.delivered_at || left.sent_at || left.created_at;
        const rightValue = right.delivery_logs[0]?.created_at || right.read_at || right.delivered_at || right.sent_at || right.created_at;
        return rightValue.localeCompare(leftValue);
      })[0];
      return {
        channel: channelOption.value,
        label: channelOption.label,
        is_enabled: configuration?.is_enabled ?? false,
        backend_key: configuration?.backend_key ?? "",
        sender_identifier: configuration?.sender_identifier ?? "",
        sender_address: configuration?.sender_address ?? "",
        live_notification_count: items.length,
        pending_notification_count: items.filter((item) => item.status === "pending").length,
        delivered_notification_count: items.filter((item) => item.status === "sent" || item.status === "delivered" || item.status === "read").length,
        read_notification_count: items.filter((item) => item.status === "read" || Boolean(item.read_at)).length,
        failed_notification_count: items.filter((item) => item.status === "failed").length,
        retry_ready_count: items.filter((item) => item.can_retry).length,
        retry_capped_count: items.filter((item) => item.retry_limit_reached).length,
        latest_notification_at:
          latestNotification?.delivery_logs[0]?.created_at ||
          latestNotification?.read_at ||
          latestNotification?.delivered_at ||
          latestNotification?.sent_at ||
          latestNotification?.created_at ||
          null,
        latest_failure_at: latestFailureLog?.created_at ?? null,
        latest_failure_message:
          latestFailureLog?.error_message ||
          (items.some((item) => item.status === "failed") ? "Notification is currently in failed state." : ""),
        provider_names: Array.from(
          new Set(items.flatMap((item) => item.delivery_logs.map((log) => log.provider_name)).filter(Boolean)),
        ),
      };
    }),
    template_diagnostics: demoHrAdminNotificationTemplates.map((item) => {
      const linkedEvents = demoHrAdminNotificationEvents.filter((event) => event.template_id === item.id);
      const liveNotifications = demoHrAdminNotifications.filter((notification) =>
        linkedEvents.some((event) => event.id === notification.event_definition_id),
      );
      return {
        template_id: item.id,
        template_name: item.name,
        template_code: item.code,
        channel: item.channel,
        status: item.status,
        linked_event_count: linkedEvents.length,
        active_event_count: linkedEvents.filter((event) => event.is_active).length,
        live_notification_count: liveNotifications.length,
        failed_notification_count: liveNotifications.filter((notification) => notification.status === "failed").length,
        last_notification_at: liveNotifications[0]?.created_at ?? null,
      };
    }),
    event_diagnostics: demoHrAdminNotificationEvents.map((item) => {
      const liveNotifications = demoHrAdminNotifications.filter((notification) => notification.event_definition_id === item.id);
      const testNotifications = demoHrAdminNotifications.filter(
        (notification) => notification.payload?.preview_mode === "event_test_send" && notification.payload?.event_code === item.code,
      );
      return {
        event_id: item.id,
        event_name: item.name,
        event_code: item.code,
        module: item.module,
        channel: item.channel,
        audience_type: item.audience_type,
        is_active: item.is_active,
        template_name: item.template_name,
        live_notification_count: liveNotifications.length,
        failed_notification_count: liveNotifications.filter((notification) => notification.status === "failed").length,
        test_notification_count: testNotifications.length,
        last_notification_at: liveNotifications[0]?.created_at ?? null,
      };
    }),
    recent_test_notifications: demoHrAdminNotifications.filter((item) => {
      const previewMode = item.payload?.preview_mode;
      return previewMode === "template_test_send" || previewMode === "event_test_send";
    }),
  };

  switch (pathname) {
    case "/hr-admin/dashboard/":
      return demoHrAdminDashboard as T;
    case "/hr-admin/payroll-readiness/":
      return buildDemoPayrollReadiness() as T;
    case "/hr-admin/payroll-setup/":
      return buildDemoPayrollSetup() as T;
    case "/hr-admin/salary-setup/":
      return buildDemoSalarySetup() as T;
    case "/hr-admin/payroll-input-snapshot-setup/":
      return buildDemoPayrollInputSnapshotSetup() as T;
    case "/hr-admin/payroll-adjustment-setup/":
      return buildDemoPayrollAdjustmentSetup() as T;
    case "/hr-admin/payroll-settlement-setup/":
      return buildDemoPayrollSettlementSetup() as T;
    case "/hr-admin/payroll-rules-setup/":
      return buildDemoPayrollRulesSetup() as T;
    case "/hr-admin/payroll-calculation-setup/":
      return buildDemoPayrollCalculationSetup() as T;
    case "/hr-admin/payroll-review-setup/":
      return buildDemoPayrollReviewSetup() as T;
    case "/hr-admin/payroll-output-setup/":
      return buildDemoPayrollOutputSetup() as T;
    case "/hr-admin/payroll-finance-handoff-setup/":
      return buildDemoPayrollFinanceHandoffSetup() as T;
    case "/hr-admin/notification-diagnostics/":
      return demoHrAdminNotificationDiagnostics as T;
    case "/hr-admin/attendance-operations/options/":
      return demoHrAdminAttendanceOperationOptions as T;
    case "/hr-admin/policy-options/":
      return demoHrAdminPolicyOptions as T;
    case "/hr-admin/workflow-options/":
      return demoHrAdminWorkflowOptions as T;
    case "/hr-admin/document-options/":
      return demoHrAdminDocumentOptions as T;
    case "/hr-admin/lifecycle-options/":
      return demoHrAdminLifecycleOptions as T;
    case "/hr-admin/lifecycle-queue/": {
      const q = (query.get("q") || "").trim().toLowerCase();
      const itemType = query.get("item_type") || "";
      const status = query.get("status") || "";
      const employeeId = query.get("employee_id") || "";
      const owner = (query.get("owner") || "").trim().toLowerCase();
      const primaryDateFrom = query.get("primary_date_from") || "";
      const primaryDateTo = query.get("primary_date_to") || "";
      const page = Math.max(Number(query.get("page") || "1") || 1, 1);
      const pageSize = Math.min(Math.max(Number(query.get("page_size") || "25") || 25, 1), 100);
      const statusLabels: Record<string, string> = {
        not_started: "Not Started",
        in_progress: "In Progress",
        completed: "Completed",
        blocked: "Blocked",
        cancelled: "Cancelled",
        pending: "Pending",
        confirm: "Confirm",
        extend: "Extend",
        separate: "Separate",
        draft: "Draft",
        approved: "Approved",
        rejected: "Rejected",
        pending_approval: "Pending Approval",
        clearance_in_progress: "Clearance In Progress",
      };
      const lifecycleItems = [
        ...demoHrAdminOnboardings.map((item) => ({
          id: item.id,
          item_type: "onboarding",
          item_label: "Onboarding",
          detail_href: `/hr-admin/onboardings/${item.id}/edit`,
          employee_id: item.employee_id,
          employee_name: item.employee_name,
          employee_code: item.employee_code,
          status: item.status,
          status_label: statusLabels[item.status] || item.status,
          primary_date: item.expected_joining_date,
          primary_date_label: "Expected joining",
          secondary_date: item.actual_joining_date,
          secondary_date_label: "Actual joining",
          owner_value: item.assigned_owner_identifier ? `identifier:${item.assigned_owner_identifier.toLowerCase()}` : "",
          owner_label: item.assigned_owner_identifier,
          workflow_reference: item.workflow_reference,
          summary: item.notes,
          document_attention_state:
            item.missing_required_document_count > 0 ? "blocked" : item.future_due_document_count > 0 ? "upcoming" : "clear",
          document_attention_summary:
            item.missing_required_document_count > 0
              ? `${item.missing_required_document_count} required missing`
              : item.future_due_document_count > 0
                ? `${item.future_due_document_count} upcoming`
                : "Documents are in a healthy state.",
          missing_required_document_count: item.missing_required_document_count,
          future_due_document_count: item.future_due_document_count,
          expired_document_count: 0,
          expiring_document_count: 0,
          attention_state: item.attention_state,
          attention_rank: item.attention_rank,
          attention_item_count: item.attention_item_count,
          attention_summary: item.attention_summary,
          attention_due_on: item.attention_due_on,
          next_due_on: item.next_due_on,
          next_escalation_on: item.next_escalation_on,
          created_at: item.preboarding_started_at || item.completed_at || `${item.expected_joining_date || "2026-01-01"}T09:00:00+05:30`,
        })),
        ...demoHrAdminProbationReviews.map((item) => ({
          id: item.id,
          item_type: "probation",
          item_label: "Probation review",
          detail_href: `/hr-admin/probation-reviews/${item.id}/edit`,
          employee_id: item.employee_id,
          employee_name: item.employee_name,
          employee_code: item.employee_code,
          status: item.decision,
          status_label: statusLabels[item.decision] || item.decision,
          primary_date: item.review_date,
          primary_date_label: "Review date",
          secondary_date: item.probation_end_date,
          secondary_date_label: "Probation end",
          owner_value: item.reviewer_identifier ? `identifier:${item.reviewer_identifier.toLowerCase()}` : "",
          owner_label: item.reviewer_identifier,
          workflow_reference: item.workflow_reference,
          summary: item.remarks,
          document_attention_state: "clear",
          document_attention_summary: "Documents are in a healthy state.",
          missing_required_document_count: 0,
          future_due_document_count: 0,
          expired_document_count: 0,
          expiring_document_count: 0,
          attention_state: "scheduled",
          attention_rank: 1,
          attention_item_count: item.decision === "pending" ? 1 : 0,
          attention_summary: item.decision === "pending" ? "Review decision is still pending." : "No open items",
          attention_due_on: item.review_date,
          next_due_on: item.review_date,
          next_escalation_on: null,
          created_at: `${item.review_date}T09:00:00+05:30`,
        })),
        ...demoHrAdminMovements.map((item) => ({
          id: item.id,
          item_type: "movement",
          item_label: "Movement",
          detail_href: `/hr-admin/movements/${item.id}/edit`,
          employee_id: item.employee_id,
          employee_name: item.employee_name,
          employee_code: item.employee_code,
          status: item.status,
          status_label: statusLabels[item.status] || item.status,
          primary_date: item.effective_date,
          primary_date_label: "Effective date",
          secondary_date: null,
          secondary_date_label: "",
          owner_value: item.owner_value,
          owner_label: item.to_manager || "",
          workflow_reference: item.workflow_reference,
          summary: item.reason || item.movement_type,
          document_attention_state: "clear",
          document_attention_summary: "Documents are in a healthy state.",
          missing_required_document_count: 0,
          future_due_document_count: 0,
          expired_document_count: 0,
          expiring_document_count: 0,
          attention_state: item.status === "completed" || item.status === "rejected" ? "clear" : "in_progress",
          attention_rank: item.status === "completed" || item.status === "rejected" ? 0 : 2,
          attention_item_count: item.status === "completed" || item.status === "rejected" ? 0 : 1,
          attention_summary: item.status === "completed" || item.status === "rejected" ? "No open items" : "Movement is still in progress.",
          attention_due_on: item.effective_date,
          next_due_on: item.effective_date,
          next_escalation_on: null,
          created_at: `${item.effective_date}T09:00:00+05:30`,
        })),
        ...demoHrAdminExits.map((item) => ({
          id: item.id,
          item_type: "exit",
          item_label: "Exit",
          detail_href: `/hr-admin/exits/${item.id}/edit`,
          employee_id: item.employee_id,
          employee_name: item.employee_name,
          employee_code: item.employee_code,
          status: item.status,
          status_label: statusLabels[item.status] || item.status,
          primary_date: item.proposed_last_working_date,
          primary_date_label: "Last working date",
          secondary_date: item.actual_exit_date,
          secondary_date_label: "Actual exit",
          owner_value: "",
          owner_label: "",
          workflow_reference: item.workflow_reference,
          summary: item.exit_reason_detail || item.handover_notes || item.exit_reason,
          document_attention_state: "clear",
          document_attention_summary: "Documents are in a healthy state.",
          missing_required_document_count: 0,
          future_due_document_count: 0,
          expired_document_count: 0,
          expiring_document_count: 0,
          attention_state: item.attention_state,
          attention_rank: item.attention_rank,
          attention_item_count: item.attention_item_count,
          attention_summary: item.attention_summary,
          attention_due_on: item.attention_due_on,
          next_due_on: item.next_due_on,
          next_escalation_on: item.next_escalation_on,
          created_at: `${item.resignation_date || item.proposed_last_working_date || "2026-01-01"}T09:00:00+05:30`,
        })),
      ];
      const filtered = lifecycleItems
        .filter((item) => !itemType || item.item_type === itemType)
        .filter((item) => !status || item.status === status)
        .filter((item) => !employeeId || item.employee_id === employeeId)
        .filter((item) => !owner || item.owner_value === owner)
        .filter((item) => !primaryDateFrom || !item.primary_date || item.primary_date >= primaryDateFrom)
        .filter((item) => !primaryDateTo || !item.primary_date || item.primary_date <= primaryDateTo)
        .filter((item) => {
          if (!q) return true;
          return [
            item.item_label,
            item.employee_name,
            item.employee_code,
            item.status,
            item.owner_label,
            item.workflow_reference,
            item.summary,
          ].some((value) => (value || "").toLowerCase().includes(q));
        })
        .sort((left, right) => right.created_at.localeCompare(left.created_at));
      const offset = (page - 1) * pageSize;
      return {
        items: filtered.slice(offset, offset + pageSize),
        total_count: filtered.length,
        page,
        page_size: pageSize,
        has_next: offset + pageSize < filtered.length,
        has_previous: page > 1,
      } as T;
    }
    case "/hr-admin/notification-options/":
      return demoHrAdminNotificationOptions as T;
    case "/hr-admin/notification-channel-configs/":
      return demoHrAdminNotificationOptions.channel_configurations as T;
    case "/hr-admin/leave-types/":
      return demoHrAdminLeaveTypes as T;
    case "/hr-admin/leave-policies/":
      return demoHrAdminLeavePolicies as T;
    case "/hr-admin/leave-policy-assignments/":
      return demoHrAdminLeavePolicyAssignments as T;
    case "/hr-admin/leave-balances/":
      return demoHrAdminLeaveBalances as T;
    case "/hr-admin/leave-balances/transactions/":
      return demoHrAdminLeaveBalanceTransactions as T;
    case "/hr-admin/attendance-policies/":
      return demoHrAdminAttendancePolicies as T;
    case "/hr-admin/shifts/":
      return demoHrAdminShifts as T;
    case "/hr-admin/employee-shift-assignments/":
      return demoHrAdminEmployeeShiftAssignments as T;
    case "/hr-admin/shift-roster-templates/":
      return demoHrAdminShiftRosterTemplates as T;
    case "/hr-admin/shift-roster-rollouts/":
      return demoHrAdminShiftRosterRollouts as T;
    case "/hr-admin/holiday-calendars/":
      return demoHrAdminHolidayCalendars as T;
    case "/hr-admin/attendance-policy-assignments/":
      return demoHrAdminAttendancePolicyAssignments as T;
    case "/hr-admin/workflow-templates/":
      return demoHrAdminWorkflowTemplates as T;
    case "/hr-admin/workflow-template-assignments/":
      return demoHrAdminWorkflowTemplateAssignments as T;
    case "/hr-admin/workflow-traces/": {
      const q = (query.get("q") || "").trim().toLowerCase();
      const moduleName = query.get("module") || "";
      const status = query.get("status") || "";
      const page = Math.max(Number(query.get("page") || "1") || 1, 1);
      const pageSize = Math.min(Math.max(Number(query.get("page_size") || "25") || 25, 1), 100);
      const moduleFiltered = demoHrAdminWorkflowTraces.filter((item) => !moduleName || moduleName === "all" || item.module === moduleName);
      const searched = moduleFiltered.filter((item) => {
        if (!q) return true;
        return [
          item.module,
          item.trigger_key,
          item.subject_type,
          item.subject_identifier,
          item.subject_label,
          item.employee_code,
          item.employee_name,
          item.status,
          item.current_step_name,
          item.current_actor_summary,
          item.initiated_by_identifier,
        ].some((value) => value.toLowerCase().includes(q));
      });
      const statusCounts = searched.reduce<Record<string, number>>(
        (counts, item) => {
          counts.all += 1;
          counts[item.status] = (counts[item.status] ?? 0) + 1;
          return counts;
        },
        { all: 0, draft: 0, pending: 0, in_progress: 0, approved: 0, rejected: 0, cancelled: 0, completed: 0 },
      );
      const filtered = searched.filter((item) => !status || status === "all" || item.status === status);
      const offset = (page - 1) * pageSize;
      return {
        items: filtered.slice(offset, offset + pageSize),
        total_count: filtered.length,
        page,
        page_size: pageSize,
        status_counts: statusCounts,
      } as T;
    }
    case "/hr-admin/document-categories/":
      return demoHrAdminDocumentCategories as T;
    case "/hr-admin/document-requirements/":
      return demoHrAdminDocumentRequirements as T;
    case "/hr-admin/generated-letters/": {
      const q = (query.get("q") || "").trim().toLowerCase();
      const employeeId = query.get("employee_id") || "";
      const letterType = query.get("letter_type") || "";
      const page = Math.max(Number(query.get("page") || "1") || 1, 1);
      const pageSize = Math.min(Math.max(Number(query.get("page_size") || "25") || 25, 1), 100);
      const filtered = demoHrAdminGeneratedLetters.filter((item) => {
        if (employeeId && item.employee_id !== employeeId) return false;
        if (letterType && item.letter_type !== letterType) return false;
        if (!q) return true;
        return [
          item.employee_name,
          item.employee_code,
          item.title,
          item.template_code,
          item.workflow_reference,
          item.rendered_text,
        ].some((value) => (value || "").toLowerCase().includes(q));
      });
      const offset = (page - 1) * pageSize;
      return {
        items: filtered.slice(offset, offset + pageSize),
        total_count: filtered.length,
        page,
        page_size: pageSize,
        has_next: offset + pageSize < filtered.length,
        has_previous: page > 1,
      } as T;
    }
    case "/hr-admin/notification-templates/":
      return demoHrAdminNotificationTemplates as T;
    case "/hr-admin/notification-events/":
      return demoHrAdminNotificationEvents as T;
    case "/hr-admin/employees/options/":
      return demoHrAdminEmployeeFormOptions as T;
    case "/hr-admin/employees/access/options/":
      return demoHrAdminEmployeeAccessOptions as T;
    case "/hr-admin/organization/options/":
      return demoHrAdminOrganizationFormOptions as T;
    case "/hr-admin/employees/":
      return demoHrAdminEmployees as T;
    case "/hr-admin/organization/":
      return demoHrAdminOrganizationSnapshot as T;
    case "/me/dashboard/":
      return demoDashboard as T;
    case "/me/notifications/": {
      const q = (query.get("q") || "").trim().toLowerCase();
      const status = query.get("status") || "";
      const channel = query.get("channel") || "";
      const priority = query.get("priority") || "";
      const subjectType = query.get("subject_type") || "";
      const employeeNotifications = demoHrAdminNotifications.filter(
        (item) => item.recipient_membership_id === "membership-0042" && item.audience_type !== "manager",
      );
      const filtered = employeeNotifications.filter((item) => {
        if (status && item.status !== status) return false;
        if (channel && item.channel !== channel) return false;
        if (priority && item.priority !== priority) return false;
        if (subjectType && item.subject_type !== subjectType) return false;
        if (!q) return true;
        return [
          item.title,
          item.subject,
          item.body,
          item.event_definition_name || "",
          item.subject_type,
          item.subject_identifier,
        ].some((value) => (value || "").toLowerCase().includes(q));
      });
      return paginateDemoItems(filtered) as T;
    }
    case "/me/document-center/": {
      const q = (query.get("q") || "").trim().toLowerCase();
      const verificationStatus = query.get("verification_status") || "";
      const categoryId = query.get("category_id") || "";
      const expiryFilter = query.get("expiry_filter") || "";
      const page = Math.max(Number(query.get("page") || "1") || 1, 1);
      const pageSize = Math.min(Math.max(Number(query.get("page_size") || "10") || 10, 1), 100);
      const employeeDocuments = [
        ...demoHrAdminEmployeeDocuments.filter((item) => item.employee_code === "EMP-0042"),
        {
          id: "ess-doc-2",
          employee_id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
          employee_code: "EMP-0042",
          employee_name: "Riya Sharma",
          category_id: "dc-3",
          category_name: "Cancelled Cheque",
          artifact_id: "artifact-ess-2",
          previous_document_id: "ess-doc-1",
          replaced_by_document_id: null,
          version_number: 2,
          title: "Salary account proof",
          file_name: "riya-cheque.pdf",
          file_url: "",
          file_path: "/secure/docs/riya-cheque.pdf",
          mime_type: "application/pdf",
          file_size_bytes: 286720,
          status: "active",
          verification_status: "rejected",
          document_number: "",
          issued_on: null,
          expires_on: "2026-06-24",
          expiry_state: "expiring_soon",
          expiry_label: "Expiring soon",
          days_until_expiry: 5,
          is_expired: false,
          is_expiring_soon: true,
          uploaded_by_identifier: "riya.sharma",
          verified_by_identifier: "nisha.rao",
          verified_at: "2026-06-09T11:20:00+05:30",
          rejection_reason: "Upload a clearer copy with the account holder name visible.",
          reupload_requested: true,
          reupload_requested_at: "2026-06-09T11:20:00+05:30",
          reupload_requested_by_identifier: "nisha.rao",
          version_history: [
            {
              id: "ess-doc-2",
              version_number: 2,
              title: "Salary account proof",
              status: "active",
              verification_status: "rejected",
              file_name: "riya-cheque.pdf",
              created_at: "2026-06-09T10:10:00+05:30",
            },
            {
              id: "ess-doc-1",
              version_number: 1,
              title: "Salary account proof",
              status: "replaced",
              verification_status: "rejected",
              file_name: "riya-cheque-old.pdf",
              created_at: "2026-06-07T09:00:00+05:30",
            },
          ],
          review_history: [
            {
              id: "ess-review-2",
              previous_status: "pending",
              new_status: "rejected",
              actor_identifier: "nisha.rao",
              comment: "Upload a clearer copy with the account holder name visible.",
              created_at: "2026-06-09T11:20:00+05:30",
            },
          ],
          created_at: "2026-06-09T10:10:00+05:30",
          updated_at: "2026-06-09T11:20:00+05:30",
        },
      ];
      const filtered = employeeDocuments.filter((item) => {
        if (verificationStatus && item.verification_status !== verificationStatus) return false;
        if (categoryId && item.category_id !== categoryId) return false;
        if (expiryFilter === "expiring" && !item.is_expiring_soon) return false;
        if (expiryFilter === "expired" && !item.is_expired) return false;
        if (expiryFilter === "missing_expiry" && item.expires_on) return false;
        if (!q) return true;
        return [
          item.category_name,
          item.title,
          item.document_number,
          item.file_name,
          item.rejection_reason,
        ].some((value) => (value || "").toLowerCase().includes(q));
      });
      const offset = (page - 1) * pageSize;
      return {
        summary: {
          required_document_count: 3,
          missing_required_document_count: 1,
          future_due_document_count: 0,
          missing_required_document_names: ["Cancelled Cheque"],
          future_due_document_names: [],
          total_documents: employeeDocuments.length,
          pending_documents: employeeDocuments.filter((item) => item.verification_status === "pending").length,
          verified_documents: employeeDocuments.filter((item) => item.verification_status === "verified").length,
          rejected_documents: employeeDocuments.filter((item) => item.verification_status === "rejected").length,
          expiring_documents: employeeDocuments.filter((item) => item.is_expiring_soon).length,
          expired_documents: employeeDocuments.filter((item) => item.is_expired).length,
        },
        requirement_items: [
          {
            category_id: "dc-1",
            category_code: "aadhaar-card",
            category_name: "Aadhaar Card",
            rule_id: "dr-ess-1",
            required_within_days_of_joining: 0,
            due_on: "2026-06-01",
            is_future_due: false,
            is_compliant: false,
            allow_employee_upload: true,
            requires_verification: true,
            requires_expiry_date: false,
            current_document_id: "ed-1",
            current_document_title: "Riya Aadhaar Front and Back",
            current_verification_status: "pending",
            current_expires_on: null,
            current_expiry_state: "no_expiry",
            current_expiry_label: "No expiry",
            current_days_until_expiry: null,
            current_is_expired: false,
            current_is_expiring_soon: false,
            current_rejection_reason: "",
            current_uploaded_at: "2026-06-05T10:30:00+05:30",
          },
          {
            category_id: "dc-2",
            category_code: "pan-card",
            category_name: "PAN Card",
            rule_id: "dr-ess-2",
            required_within_days_of_joining: 0,
            due_on: "2026-06-01",
            is_future_due: false,
            is_compliant: true,
            allow_employee_upload: true,
            requires_verification: true,
            requires_expiry_date: false,
            current_document_id: null,
            current_document_title: "",
            current_verification_status: "",
            current_expires_on: null,
            current_expiry_state: "no_document",
            current_expiry_label: "No document",
            current_days_until_expiry: null,
            current_is_expired: false,
            current_is_expiring_soon: false,
            current_rejection_reason: "",
            current_uploaded_at: null,
          },
          {
            category_id: "dc-3",
            category_code: "cancelled-cheque",
            category_name: "Cancelled Cheque",
            rule_id: "dr-ess-3",
            required_within_days_of_joining: 3,
            due_on: "2026-06-04",
            is_future_due: false,
            is_compliant: false,
            allow_employee_upload: true,
            requires_verification: true,
            requires_expiry_date: false,
            current_document_id: "ess-doc-2",
            current_document_title: "Salary account proof",
            current_verification_status: "rejected",
            current_expires_on: "2026-06-24",
            current_expiry_state: "expiring_soon",
            current_expiry_label: "Expiring soon",
            current_days_until_expiry: 5,
            current_is_expired: false,
            current_is_expiring_soon: true,
            current_rejection_reason: "Upload a clearer copy with the account holder name visible.",
            current_uploaded_at: "2026-06-09T10:10:00+05:30",
          },
        ],
        verification_statuses: demoHrAdminDocumentOptions.verification_statuses,
        categories: demoHrAdminDocumentOptions.categories,
        uploadable_categories: demoHrAdminDocumentOptions.categories,
        max_upload_size_bytes: demoHrAdminDocumentOptions.max_upload_size_bytes,
        items: filtered.slice(offset, offset + pageSize),
        total_count: filtered.length,
        page,
        page_size: pageSize,
        has_next: offset + pageSize < filtered.length,
        has_previous: page > 1,
      } as T;
    }
    case "/me/leave-requests/": {
      const status = query.get("status") || "";
      const filtered = status && status !== "all" ? demoLeaveRequests.filter((item) => item.status === status) : demoLeaveRequests;
      const statusCounts = {
        all: demoLeaveRequests.length,
        pending: demoLeaveRequests.filter((item) => item.status === "pending").length,
        approved: demoLeaveRequests.filter((item) => item.status === "approved").length,
        rejected: demoLeaveRequests.filter((item) => item.status === "rejected").length,
        withdrawn: demoLeaveRequests.filter((item) => item.status === "withdrawn").length,
        cancelled: demoLeaveRequests.filter((item) => item.status === "cancelled").length,
        partially_approved: demoLeaveRequests.filter((item) => item.status === "partially_approved").length,
      };
      return paginateDemoItems(filtered, { statusCounts }) as T;
    }
    case "/me/attendance-regularizations/": {
      const status = query.get("status") || "";
      const filtered = status && status !== "all" ? demoRegularizations.filter((item) => item.status === status) : demoRegularizations;
      const statusCounts = {
        all: demoRegularizations.length,
        pending: demoRegularizations.filter((item) => item.status === "pending").length,
        approved: demoRegularizations.filter((item) => item.status === "approved").length,
        rejected: demoRegularizations.filter((item) => item.status === "rejected").length,
      };
      return paginateDemoItems(filtered, { statusCounts }) as T;
    }
    case "/manager/team-summary/":
      return demoManagerSummary as T;
    case "/manager/notifications/": {
      const q = (query.get("q") || "").trim().toLowerCase();
      const status = query.get("status") || "";
      const channel = query.get("channel") || "";
      const priority = query.get("priority") || "";
      const subjectType = query.get("subject_type") || "";
      const managerNotifications = demoHrAdminNotifications.filter(
        (item) => item.recipient_membership_id === "membership-0002" || item.audience_type === "manager",
      );
      const filtered = managerNotifications.filter((item) => {
        if (status && item.status !== status) return false;
        if (channel && item.channel !== channel) return false;
        if (priority && item.priority !== priority) return false;
        if (subjectType && item.subject_type !== subjectType) return false;
        if (!q) return true;
        return [
          item.title,
          item.subject,
          item.body,
          item.event_definition_name || "",
          item.subject_type,
          item.subject_identifier,
        ].some((value) => (value || "").toLowerCase().includes(q));
      });
      return paginateDemoItems(filtered) as T;
    }
    case "/manager/leave-requests/pending/":
      return paginateDemoItems(demoLeaveRequests.filter((item) => item.status === "pending")) as T;
    case "/manager/attendance-regularizations/pending/":
      return paginateDemoItems(demoRegularizations.filter((item) => item.status === "pending")) as T;
    default:
      if (pathname !== "/hr-admin/employees/" && pathname.startsWith("/hr-admin/employees/")) {
        const employeePath = pathname.replace("/hr-admin/employees/", "").replace(/\/$/, "");
        if (employeePath.endsWith("/access")) {
          const employeeId = employeePath.replace(/\/access$/, "");
          return (demoHrAdminEmployeeAccessDetails[employeeId] ??
            demoHrAdminEmployeeAccessDetails["42f9eac1-4dc6-476f-8cd4-923e1e90f001"]) as T;
        }
        const employeeId = employeePath;
        const employee =
          demoHrAdminEmployeeDetails[employeeId] ??
          demoHrAdminEmployeeDetails["42f9eac1-4dc6-476f-8cd4-923e1e90f001"];
        return employee as T;
      }
      if (pathname.startsWith("/hr-admin/organization/")) {
        const parts = pathname.replace("/hr-admin/organization/", "").replace(/\/$/, "").split("/");
        const [section, itemId] = parts;
        if (section && itemId && section in demoHrAdminOrganizationSnapshot) {
          const items = (demoHrAdminOrganizationSnapshot as unknown as Record<string, Array<{ id: string }>>)[section] ?? [];
          const selected = items.find((item) => item.id === itemId) ?? items[0];
          return selected as T;
        }
      }
      if (pathname !== "/hr-admin/leave-types/" && pathname.startsWith("/hr-admin/leave-types/")) {
        const itemId = pathname.replace("/hr-admin/leave-types/", "").replace(/\/$/, "");
        return (demoHrAdminLeaveTypes.find((item) => item.id === itemId) ?? demoHrAdminLeaveTypes[0]) as T;
      }
      if (pathname !== "/hr-admin/leave-policies/" && pathname.startsWith("/hr-admin/leave-policies/")) {
        const itemId = pathname.replace("/hr-admin/leave-policies/", "").replace(/\/$/, "");
        return (demoHrAdminLeavePolicies.find((item) => item.id === itemId) ?? demoHrAdminLeavePolicies[0]) as T;
      }
      if (pathname !== "/hr-admin/attendance-policies/" && pathname.startsWith("/hr-admin/attendance-policies/")) {
        const itemId = pathname.replace("/hr-admin/attendance-policies/", "").replace(/\/$/, "");
        return (demoHrAdminAttendancePolicies.find((item) => item.id === itemId) ?? demoHrAdminAttendancePolicies[0]) as T;
      }
      if (pathname !== "/hr-admin/shifts/" && pathname.startsWith("/hr-admin/shifts/")) {
        const itemId = pathname.replace("/hr-admin/shifts/", "").replace(/\/$/, "");
        return (demoHrAdminShifts.find((item) => item.id === itemId) ?? demoHrAdminShifts[0]) as T;
      }
      if (pathname !== "/hr-admin/employee-shift-assignments/" && pathname.startsWith("/hr-admin/employee-shift-assignments/")) {
        const itemId = pathname.replace("/hr-admin/employee-shift-assignments/", "").replace(/\/$/, "");
        return (demoHrAdminEmployeeShiftAssignments.find((item) => item.id === itemId) ?? demoHrAdminEmployeeShiftAssignments[0]) as T;
      }
      if (pathname !== "/hr-admin/shift-roster-templates/" && pathname.startsWith("/hr-admin/shift-roster-templates/")) {
        const itemId = pathname.replace("/hr-admin/shift-roster-templates/", "").replace(/\/$/, "");
        return (demoHrAdminShiftRosterTemplates.find((item) => item.id === itemId) ?? demoHrAdminShiftRosterTemplates[0]) as T;
      }
      if (pathname !== "/hr-admin/holiday-calendars/" && pathname.startsWith("/hr-admin/holiday-calendars/")) {
        const itemId = pathname.replace("/hr-admin/holiday-calendars/", "").replace(/\/$/, "");
        return (demoHrAdminHolidayCalendars.find((item) => item.id === itemId) ?? demoHrAdminHolidayCalendars[0]) as T;
      }
      if (pathname !== "/hr-admin/attendance-records/" && pathname.startsWith("/hr-admin/attendance-records/")) {
        const itemId = pathname.replace("/hr-admin/attendance-records/", "").replace(/\/$/, "");
        return (demoHrAdminAttendanceRecords.find((item) => item.id === itemId) ?? demoHrAdminAttendanceRecords[0]) as T;
      }
      if (pathname !== "/hr-admin/attendance-regularizations/" && pathname.startsWith("/hr-admin/attendance-regularizations/")) {
        const itemId = pathname.replace("/hr-admin/attendance-regularizations/", "").replace(/\/$/, "");
        return (demoRegularizations.find((item) => item.id === itemId) ?? demoRegularizations[0]) as T;
      }
      if (pathname !== "/hr-admin/workflow-templates/" && pathname.startsWith("/hr-admin/workflow-templates/")) {
        const itemId = pathname.replace("/hr-admin/workflow-templates/", "").replace(/\/$/, "");
        return (demoHrAdminWorkflowTemplates.find((item) => item.id === itemId) ?? demoHrAdminWorkflowTemplates[0]) as T;
      }
      if (pathname !== "/hr-admin/document-categories/" && pathname.startsWith("/hr-admin/document-categories/")) {
        const itemId = pathname.replace("/hr-admin/document-categories/", "").replace(/\/$/, "");
        return (demoHrAdminDocumentCategories.find((item) => item.id === itemId) ?? demoHrAdminDocumentCategories[0]) as T;
      }
      if (pathname !== "/hr-admin/employee-documents/" && pathname.startsWith("/hr-admin/employee-documents/")) {
        const itemId = pathname.replace("/hr-admin/employee-documents/", "").replace(/\/$/, "");
        return (demoHrAdminEmployeeDocuments.find((item) => item.id === itemId) ?? demoHrAdminEmployeeDocuments[0]) as T;
      }
      if (pathname !== "/hr-admin/generated-letters/" && pathname.startsWith("/hr-admin/generated-letters/")) {
        const itemId = pathname.replace("/hr-admin/generated-letters/", "").replace(/\/$/, "");
        return (demoHrAdminGeneratedLetters.find((item) => item.id === itemId) ?? demoHrAdminGeneratedLetters[0]) as T;
      }
      if (pathname !== "/hr-admin/onboardings/" && pathname.startsWith("/hr-admin/onboardings/")) {
        const itemId = pathname.replace("/hr-admin/onboardings/", "").replace(/\/$/, "");
        return (demoHrAdminOnboardings.find((item) => item.id === itemId) ?? demoHrAdminOnboardings[0]) as T;
      }
      if (pathname !== "/hr-admin/probation-reviews/" && pathname.startsWith("/hr-admin/probation-reviews/")) {
        const itemId = pathname.replace("/hr-admin/probation-reviews/", "").replace(/\/$/, "");
        return (demoHrAdminProbationReviews.find((item) => item.id === itemId) ?? demoHrAdminProbationReviews[0]) as T;
      }
      if (pathname !== "/hr-admin/movements/" && pathname.startsWith("/hr-admin/movements/")) {
        const itemId = pathname.replace("/hr-admin/movements/", "").replace(/\/$/, "");
        return (demoHrAdminMovements.find((item) => item.id === itemId) ?? demoHrAdminMovements[0]) as T;
      }
      if (pathname !== "/hr-admin/exits/" && pathname.startsWith("/hr-admin/exits/")) {
        const itemId = pathname.replace("/hr-admin/exits/", "").replace(/\/$/, "");
        return (demoHrAdminExits.find((item) => item.id === itemId) ?? demoHrAdminExits[0]) as T;
      }
      if (pathname !== "/hr-admin/notification-templates/" && pathname.startsWith("/hr-admin/notification-templates/")) {
        const itemId = pathname.replace("/hr-admin/notification-templates/", "").replace(/\/$/, "");
        return (demoHrAdminNotificationTemplates.find((item) => item.id === itemId) ?? demoHrAdminNotificationTemplates[0]) as T;
      }
      if (pathname !== "/hr-admin/notification-events/" && pathname.startsWith("/hr-admin/notification-events/")) {
        const itemId = pathname.replace("/hr-admin/notification-events/", "").replace(/\/$/, "");
        return (demoHrAdminNotificationEvents.find((item) => item.id === itemId) ?? demoHrAdminNotificationEvents[0]) as T;
      }
      if (pathname !== "/hr-admin/notification-channel-configs/" && pathname.startsWith("/hr-admin/notification-channel-configs/")) {
        const itemId = pathname.replace("/hr-admin/notification-channel-configs/", "").replace(/\/$/, "");
        return (demoHrAdminNotificationOptions.channel_configurations.find((item) => item.id === itemId) ?? demoHrAdminNotificationOptions.channel_configurations[0]) as T;
      }
      if (pathname !== "/hr-admin/notifications/" && pathname.startsWith("/hr-admin/notifications/")) {
        const itemId = pathname.replace("/hr-admin/notifications/", "").replace(/\/$/, "");
        return (demoHrAdminNotifications.find((item) => item.id === itemId) ?? demoHrAdminNotifications[0]) as T;
      }
      if (pathname !== "/me/notifications/" && pathname.startsWith("/me/notifications/")) {
        const itemId = pathname.replace("/me/notifications/", "").replace(/\/$/, "");
        const items = demoHrAdminNotifications.filter((item) => item.recipient_membership_id === "membership-0042" && item.audience_type !== "manager");
        return (items.find((item) => item.id === itemId) ?? items[0]) as T;
      }
      if (pathname !== "/manager/notifications/" && pathname.startsWith("/manager/notifications/")) {
        const itemId = pathname.replace("/manager/notifications/", "").replace(/\/$/, "");
        const items = demoHrAdminNotifications.filter((item) => item.recipient_membership_id === "membership-0002" || item.audience_type === "manager");
        return (items.find((item) => item.id === itemId) ?? items[0]) as T;
      }
      if (pathname === "/hr-admin/attendance-records/") {
        const q = (query.get("q") || "").trim().toLowerCase();
        const status = query.get("status") || "";
        const source = query.get("source") || "";
        const lockState = query.get("lock_state") || "";
        const regularizedState = query.get("regularized_state") || "";
        const lateOnly = ["1", "true", "yes"].includes((query.get("late_only") || "").toLowerCase());
        const page = Math.max(Number(query.get("page") || "1") || 1, 1);
        const pageSize = Math.min(Math.max(Number(query.get("page_size") || "25") || 25, 1), 100);
        const filtered = demoHrAdminAttendanceRecords.filter((item) => {
          if (status && item.status !== status) return false;
          if (source && item.source !== source) return false;
          if (lockState === "locked" && !item.is_locked) return false;
          if (lockState === "open" && item.is_locked) return false;
          if (regularizedState === "regularized" && !item.is_regularized) return false;
          if (regularizedState === "not_regularized" && item.is_regularized) return false;
          if (lateOnly && item.late_minutes <= 0) return false;
          if (!q) return true;
          return [
            item.employee_name,
            item.employee_code,
            item.attendance_date,
            item.shift || "",
            item.source,
            item.status,
          ].some((value) => value.toLowerCase().includes(q));
        });
        const offset = (page - 1) * pageSize;
        return {
          items: filtered.slice(offset, offset + pageSize),
          total_count: filtered.length,
          page,
          page_size: pageSize,
          has_next: offset + pageSize < filtered.length,
          has_previous: page > 1,
        } as T;
      }
      if (pathname === "/hr-admin/attendance-regularizations/") {
        const q = (query.get("q") || "").trim().toLowerCase();
        const status = query.get("status") || "";
        const requestedStatus = query.get("requested_status") || "";
        const currentStatus = query.get("current_status") || "";
        const page = Math.max(Number(query.get("page") || "1") || 1, 1);
        const pageSize = Math.min(Math.max(Number(query.get("page_size") || "25") || 25, 1), 100);
        const filtered = demoRegularizations.filter((item) => {
          if (status && item.status !== status) return false;
          if (requestedStatus && item.requested_status !== requestedStatus) return false;
          if (currentStatus && item.current_status !== currentStatus) return false;
          if (!q) return true;
          return [
            item.employee_name || "",
            item.employee_code || "",
            item.attendance_date,
            item.shift || "",
            item.reason || "",
            item.status,
            item.requested_status,
            item.current_status,
          ].some((value) => value.toLowerCase().includes(q));
        });
        const offset = (page - 1) * pageSize;
        return {
          items: filtered.slice(offset, offset + pageSize),
          total_count: filtered.length,
          page,
          page_size: pageSize,
          has_next: offset + pageSize < filtered.length,
          has_previous: page > 1,
        } as T;
      }
      if (pathname === "/hr-admin/employee-documents/") {
        const q = (query.get("q") || "").trim().toLowerCase();
        const verificationStatus = query.get("verification_status") || "";
        const status = query.get("status") || "";
        const categoryId = query.get("category_id") || "";
        const expiryFilter = query.get("expiry_filter") || "";
        const page = Math.max(Number(query.get("page") || "1") || 1, 1);
        const pageSize = Math.min(Math.max(Number(query.get("page_size") || "25") || 25, 1), 100);
        const filtered = demoHrAdminEmployeeDocuments.filter((item) => {
          if (verificationStatus && item.verification_status !== verificationStatus) return false;
          if (status && item.status !== status) return false;
          if (categoryId && item.category_id !== categoryId) return false;
          if (expiryFilter === "expiring" && !item.is_expiring_soon) return false;
          if (expiryFilter === "expired" && !item.is_expired) return false;
          if (expiryFilter === "missing_expiry" && item.expires_on) return false;
          if (!q) return true;
          return [
            item.employee_name,
            item.employee_code,
            item.category_name,
            item.title,
            item.document_number,
            item.uploaded_by_identifier,
            item.verified_by_identifier,
            item.rejection_reason,
          ].some((value) => (value || "").toLowerCase().includes(q));
        });
        const offset = (page - 1) * pageSize;
        return {
          items: filtered.slice(offset, offset + pageSize),
          total_count: filtered.length,
          page,
          page_size: pageSize,
          has_next: offset + pageSize < filtered.length,
          has_previous: page > 1,
        } as T;
      }
      if (pathname === "/hr-admin/generated-letters/") {
        const q = (query.get("q") || "").trim().toLowerCase();
        const employeeId = query.get("employee_id") || "";
        const letterType = query.get("letter_type") || "";
        const page = Math.max(Number(query.get("page") || "1") || 1, 1);
        const pageSize = Math.min(Math.max(Number(query.get("page_size") || "25") || 25, 1), 100);
        const filtered = demoHrAdminGeneratedLetters.filter((item) => {
          if (employeeId && item.employee_id !== employeeId) return false;
          if (letterType && item.letter_type !== letterType) return false;
          if (!q) return true;
          return [
            item.employee_name,
            item.employee_code,
            item.title,
            item.template_code,
            item.workflow_reference,
            item.rendered_text,
          ].some((value) => (value || "").toLowerCase().includes(q));
        });
        const offset = (page - 1) * pageSize;
        return {
          items: filtered.slice(offset, offset + pageSize),
          total_count: filtered.length,
          page,
          page_size: pageSize,
          has_next: offset + pageSize < filtered.length,
          has_previous: page > 1,
        } as T;
      }
      if (pathname === "/hr-admin/onboardings/") {
        const q = (query.get("q") || "").trim().toLowerCase();
        const status = query.get("status") || "";
        const owner = query.get("owner") || "";
        const page = Math.max(Number(query.get("page") || "1") || 1, 1);
        const pageSize = Math.min(Math.max(Number(query.get("page_size") || "25") || 25, 1), 100);
        const filtered = demoHrAdminOnboardings.filter((item) => {
          if (status && item.status !== status) return false;
          if (owner && item.owner_value !== owner) return false;
          if (!q) return true;
          return [
            item.employee_name,
            item.employee_code,
            item.onboarding_template_code,
            item.assigned_owner_identifier,
            item.workflow_reference,
            item.notes,
            item.status,
          ].some((value) => (value || "").toLowerCase().includes(q));
        });
        const offset = (page - 1) * pageSize;
        return {
          items: filtered.slice(offset, offset + pageSize),
          total_count: filtered.length,
          page,
          page_size: pageSize,
          has_next: offset + pageSize < filtered.length,
          has_previous: page > 1,
        } as T;
      }
      if (pathname === "/hr-admin/probation-reviews/") {
        const q = (query.get("q") || "").trim().toLowerCase();
        const decision = query.get("decision") || "";
        const owner = query.get("owner") || "";
        const page = Math.max(Number(query.get("page") || "1") || 1, 1);
        const pageSize = Math.min(Math.max(Number(query.get("page_size") || "25") || 25, 1), 100);
        const filtered = demoHrAdminProbationReviews.filter((item) => {
          if (decision && item.decision !== decision) return false;
          if (owner && item.owner_value !== owner) return false;
          if (!q) return true;
          return [
            item.employee_name,
            item.employee_code,
            item.review_date,
            item.decision,
            item.reviewer_identifier,
            item.workflow_reference,
            item.remarks,
          ].some((value) => (value || "").toLowerCase().includes(q));
        });
        const offset = (page - 1) * pageSize;
        return {
          items: filtered.slice(offset, offset + pageSize),
          total_count: filtered.length,
          page,
          page_size: pageSize,
          has_next: offset + pageSize < filtered.length,
          has_previous: page > 1,
        } as T;
      }
      if (pathname === "/hr-admin/movements/") {
        const q = (query.get("q") || "").trim().toLowerCase();
        const status = query.get("status") || "";
        const movementType = query.get("movement_type") || "";
        const owner = query.get("owner") || "";
        const page = Math.max(Number(query.get("page") || "1") || 1, 1);
        const pageSize = Math.min(Math.max(Number(query.get("page_size") || "25") || 25, 1), 100);
        const filtered = demoHrAdminMovements.filter((item) => {
          if (status && item.status !== status) return false;
          if (movementType && item.movement_type !== movementType) return false;
          if (owner && item.owner_value !== owner) return false;
          if (!q) return true;
          return [
            item.employee_name,
            item.employee_code,
            item.movement_type,
            item.status,
            item.reason,
            item.workflow_reference,
            item.from_department || "",
            item.to_department || "",
            item.from_designation || "",
            item.to_designation || "",
          ].some((value) => (value || "").toLowerCase().includes(q));
        });
        const offset = (page - 1) * pageSize;
        return {
          items: filtered.slice(offset, offset + pageSize),
          total_count: filtered.length,
          page,
          page_size: pageSize,
          has_next: offset + pageSize < filtered.length,
          has_previous: page > 1,
        } as T;
      }
      if (pathname === "/hr-admin/exits/") {
        const q = (query.get("q") || "").trim().toLowerCase();
        const status = query.get("status") || "";
        const rehireEligible = (query.get("rehire_eligible") || "").toLowerCase();
        const page = Math.max(Number(query.get("page") || "1") || 1, 1);
        const pageSize = Math.min(Math.max(Number(query.get("page_size") || "25") || 25, 1), 100);
        const filtered = demoHrAdminExits.filter((item) => {
          if (status && item.status !== status) return false;
          if (rehireEligible === "yes" && !item.rehire_eligible) return false;
          if (rehireEligible === "no" && item.rehire_eligible) return false;
          if (!q) return true;
          return [
            item.employee_name,
            item.employee_code,
            item.exit_reason,
            item.exit_reason_detail,
            item.workflow_reference,
            item.handover_notes,
            item.status,
          ].some((value) => (value || "").toLowerCase().includes(q));
        });
        const offset = (page - 1) * pageSize;
        return {
          items: filtered.slice(offset, offset + pageSize),
          total_count: filtered.length,
          page,
          page_size: pageSize,
          has_next: offset + pageSize < filtered.length,
          has_previous: page > 1,
        } as T;
      }
      if (pathname === "/hr-admin/notifications/") {
        const q = (query.get("q") || "").trim().toLowerCase();
        const status = query.get("status") || "";
        const channel = query.get("channel") || "";
        const priority = query.get("priority") || "";
        const audienceType = query.get("audience_type") || "";
        const moduleFilter = query.get("module") || "";
        const subjectType = query.get("subject_type") || "";
        const retryState = query.get("retry_state") || "";
        const page = Math.max(Number(query.get("page") || "1") || 1, 1);
        const pageSize = Math.min(Math.max(Number(query.get("page_size") || "25") || 25, 1), 100);
        const filtered = demoHrAdminNotifications.filter((item) => {
          if (status && item.status !== status) return false;
          if (channel && item.channel !== channel) return false;
          if (priority && item.priority !== priority) return false;
          if (audienceType && item.audience_type !== audienceType) return false;
          if (moduleFilter) {
            const eventDefinition = demoHrAdminNotificationEvents.find((entry) => entry.id === item.event_definition_id);
            if ((eventDefinition?.module || "") !== moduleFilter) return false;
          }
          if (subjectType && item.subject_type !== subjectType) return false;
          if (retryState === "retry_ready" && !item.can_retry) return false;
          if (retryState === "retry_capped" && !item.retry_limit_reached) return false;
          if (retryState === "no_retry_needed" && (item.can_retry || item.retry_limit_reached)) return false;
          if (!q) return true;
          return [
            item.title || "",
            item.subject || "",
            item.body || "",
            item.subject_type,
            item.subject_identifier,
            item.recipient_membership_name || "",
            item.recipient_identifier || "",
            item.recipient_address || "",
            item.event_definition_name || "",
            item.status,
            item.channel,
            item.priority,
          ].some((value) => value.toLowerCase().includes(q));
        });
        const offset = (page - 1) * pageSize;
        return {
          items: filtered.slice(offset, offset + pageSize),
          total_count: filtered.length,
          page,
          page_size: pageSize,
          has_next: offset + pageSize < filtered.length,
          has_previous: page > 1,
        } as T;
      }
      return [] as T;
  }
}
