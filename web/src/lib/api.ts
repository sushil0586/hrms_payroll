import type {
  AttendanceRegularizationItem,
  EmployeeDashboard,
  EssAttendanceRegularizationListResponse,
  EssDocumentCenterResponse,
  EssLeaveRequestListResponse,
  EssPayrollPayslipListResponse,
  EssStatutoryDeclarationListResponse,
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
  HrAdminPayrollOutputArtifact,
  HrAdminPayrollOutputSetupResponse,
  HrAdminPayrollProviderConnectionSetupResponse,
  HrAdminPayrollReviewSetupResponse,
  HrAdminPayrollSettlementSetupResponse,
  HrAdminPayrollStatutorySetupResponse,
  HrAdminPayrollReadinessListResponse,
  HrAdminLaunchRemediationListResponse,
  HrAdminSaasCommercialControl,
  HrAdminSaasOperationalHealth,
  HrAdminSaasResilienceReadiness,
  HrAdminSaasSlaOperations,
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
  SupportSessionDomainSnapshot,
  SupportSessionTenantConsole,
  TenantAdminConsole,
  TenantAdminEnterpriseSecurityReadiness,
  TenantAdminTrustAuditReview,
} from "@/lib/types";
import { API_BASE_URL, BEARER_TOKEN, DEMO_DATA_ENABLED } from "@/lib/runtime-flags";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type ApiState = "live" | "demo";
const LOGIN_PATH = "/login";

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
    redirect(LOGIN_PATH);
  }

  try {
    const result = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Authorization: `Token ${token}`,
      },
      cache: "no-store",
    });

    if (result.status === 401) {
      redirect(LOGIN_PATH);
    }

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

export async function getEssPayrollPayslips(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  year?: string;
}) {
  return apiGet<EssPayrollPayslipListResponse>(`/me/payroll-payslips/${buildQueryString(params ?? {})}`);
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

export async function getTenantAdminConsole() {
  return apiGet<TenantAdminConsole>("/tenant-admin/console/");
}

export async function getTenantAdminTrustAuditReview(params?: {
  event_group?: string;
  event_type?: string;
  actor?: string;
  source_ref?: string;
  support_session_ref?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}) {
  return apiGet<TenantAdminTrustAuditReview>(`/tenant-admin/trust-audit/${buildQueryString({
    event_group: params?.event_group || "all",
    event_type: params?.event_type || "",
    actor: params?.actor || "",
    source_ref: params?.source_ref || "",
    support_session_ref: params?.support_session_ref || "",
    date_from: params?.date_from || "",
    date_to: params?.date_to || "",
    page: params?.page || 1,
    page_size: params?.page_size || 12,
  })}`);
}

export async function getTenantAdminEnterpriseSecurityReadiness() {
  return apiGet<TenantAdminEnterpriseSecurityReadiness>("/tenant-admin/security-readiness/");
}

export async function getSupportSessionTenantConsole(params?: {
  tenant_code?: string;
  scope_ref?: string;
  session_ref?: string;
}) {
  return apiGet<SupportSessionTenantConsole>(`/support/tenant-console/${buildQueryString({
    tenant_code: params?.tenant_code || "northstar-foods",
    scope_ref: params?.scope_ref || "read_only_account",
    session_ref: params?.session_ref || "support-session-demo-001",
  })}`);
}

export async function getSupportSessionDomainSnapshot(params?: {
  tenant_code?: string;
  domain_ref?: string;
  session_ref?: string;
}) {
  return apiGet<SupportSessionDomainSnapshot>(`/support/domain-snapshot/${buildQueryString({
    tenant_code: params?.tenant_code || "northstar-foods",
    domain_ref: params?.domain_ref || "payroll_providers",
    session_ref: params?.session_ref || "support-session-demo-001",
  })}`);
}

export async function getHrAdminLaunchRemediations(params?: {
  q?: string;
  status?: string;
  severity?: string;
  owner_role_ref?: string;
  module_ref?: string;
  due_state?: string;
  page?: number;
  page_size?: number;
}) {
  return apiGet<HrAdminLaunchRemediationListResponse>(`/hr-admin/launch-remediations/${buildQueryString(params ?? {})}`);
}

export async function getHrAdminSaasCommercialControl() {
  return apiGet<HrAdminSaasCommercialControl>("/hr-admin/saas-control-plane/");
}

export async function getHrAdminSaasOperationalHealth() {
  return apiGet<HrAdminSaasOperationalHealth>("/hr-admin/saas-operational-health/");
}

export async function getHrAdminSaasResilienceReadiness() {
  return apiGet<HrAdminSaasResilienceReadiness>("/hr-admin/saas-resilience/");
}

export async function getHrAdminSaasSlaOperations() {
  return apiGet<HrAdminSaasSlaOperations>("/hr-admin/saas-sla-operations/");
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

export async function getHrAdminPayrollStatutorySetup() {
  return apiGet<HrAdminPayrollStatutorySetupResponse>("/hr-admin/payroll-statutory-setup/");
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

export async function getHrAdminPayrollProviderConnectionSetup() {
  return apiGet<HrAdminPayrollProviderConnectionSetupResponse>("/hr-admin/payroll-provider-connection-setup/");
}

export async function getEssStatutoryDeclarations(params?: {
  q?: string;
  status?: string;
  financial_year?: string;
  page?: number;
  page_size?: number;
}) {
  return apiGet<EssStatutoryDeclarationListResponse>(`/me/statutory-declarations/${buildQueryString(params ?? {})}`);
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
    {
      id: "nt-3",
      code: "payroll-payslip-published",
      name: "Payroll Payslip Published",
      channel: "in_app",
      status: "active",
      subject_template: "",
      title_template: "Payslip published",
      body_template: "Your payslip is ready in employee self-service.",
      metadata_template: { action_path: "/ess/payslips" },
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
    {
      id: "ne-7",
      code: "payroll-payslip-published",
      name: "Payroll Payslip Published",
      module: "payroll",
      trigger_key: "payroll_payslip_published",
      audience_type: "employee",
      channel: "in_app",
      template_id: "nt-3",
      template_name: "Payroll Payslip Published",
      role_id: null,
      role_name: null,
      membership_id: null,
      membership_name: null,
      is_active: true,
      priority: "normal",
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
    {
      id: "n-5",
      event_definition_id: "ne-7",
      event_definition_name: "Payroll Payslip Published",
      channel: "in_app",
      audience_type: "employee",
      subject_type: "payroll_payslip",
      subject_identifier: "payoutartifact-payslip-emp-0042",
      recipient_membership_id: "membership-0042",
      recipient_membership_name: "Riya Sharma",
      recipient_role_id: null,
      recipient_role_name: null,
      recipient_identifier: "riya.sharma",
      recipient_address: "",
      title: "Payslip published",
      subject: "",
      body: "Your August 2026 payslip is ready in employee self-service.",
      status: "delivered",
      priority: "normal",
      scheduled_for: "2026-09-05T10:25:00+05:30",
      sent_at: "2026-09-05T10:25:00+05:30",
      delivered_at: "2026-09-05T10:25:00+05:30",
      read_at: null,
      attempt_count: 1,
      max_attempts: 3,
      retry_backoff_minutes: 0,
      retry_limit_reached: false,
      can_retry: true,
      delivery_logs: [
        {
          id: "ndl-3",
          channel: "in_app",
          status: "delivered",
          provider_name: "in_app_default",
          provider_reference: "payoutartifact-payslip-emp-0042-notification",
          error_message: "",
          response_payload: { channel: "in_app", mode: "in_app", source: "payroll_publish" },
          created_at: "2026-09-05T10:25:00+05:30",
        },
      ],
      payload: {
        artifact_id: "payoutartifact-payslip-emp-0042",
        payroll_run_id: "payrun-aug-2026-core",
        download_strategy_ref: "payroll.download.stream.local.v1",
        action_path: "/ess/payslips",
      },
      created_at: "2026-09-05T10:25:00+05:30",
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
      { value: "payroll_payslip", label: "Payroll Payslip" },
    ],
    workflow_modules: [
      { value: "leave", label: "Leave" },
      { value: "attendance", label: "Attendance" },
      { value: "lifecycle", label: "Lifecycle" },
      { value: "documents", label: "Documents" },
      { value: "payroll", label: "Payroll" },
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
    launch_audit: {
      audit_profile_ref: "hrms.saas_launch_audit.v1",
      audit_profile_source: "platform_default",
      status: "warning",
      module_count: 13,
      gate_count: 51,
      passed_gate_count: 45,
      blocker_count: 0,
      warning_count: 6,
      release_blocker_refs: [],
      release_warning_refs: [
        "employees.primary_bank",
        "leave.pending_requests",
        "attendance.pending_regularizations",
        "documents.pending_verification",
        "notifications.failed",
        "provider.rehearsal_ready",
      ],
      release_actions: [
        {
          ref: "employees.primary_bank",
          label: "Primary bank coverage",
          module_ref: "employee_master",
          module_label: "Employee master",
          severity: "warning",
          status: "warning",
          owner_role_ref: "hr-admin",
          action_href: "/hr-admin/employees",
          action_label: "Review employees",
          sla_days: 3,
          value: "4/5",
          evidence_ref: "",
        },
        {
          ref: "leave.pending_requests",
          label: "Pending requests",
          module_ref: "leave_governance",
          module_label: "Leave governance",
          severity: "warning",
          status: "warning",
          owner_role_ref: "hr-admin",
          action_href: "/hr-admin/policies",
          action_label: "Review leave policy",
          sla_days: 3,
          value: 2,
          evidence_ref: "",
        },
        {
          ref: "attendance.pending_regularizations",
          label: "Pending regularizations",
          module_ref: "attendance_governance",
          module_label: "Attendance governance",
          severity: "warning",
          status: "warning",
          owner_role_ref: "hr-admin",
          action_href: "/hr-admin/attendance-operations",
          action_label: "Review attendance",
          sla_days: 3,
          value: 2,
          evidence_ref: "",
        },
        {
          ref: "provider.rehearsal_ready",
          label: "Ready rehearsal",
          module_ref: "provider_launch_history",
          module_label: "Provider launch history",
          severity: "warning",
          status: "warning",
          owner_role_ref: "payroll-admin",
          action_href: "/hr-admin/payroll-providers",
          action_label: "Resolve provider blockers",
          sla_days: 2,
          value: "missing",
          evidence_ref: "payroll.provider_launch_readiness.audit_pack.v1",
        },
      ],
      remediation_assignments: [
        {
          id: "launch-remediation-primary-bank",
          gate_ref: "employees.primary_bank",
          module_ref: "employee_master",
          module_label: "Employee master",
          label: "Primary bank coverage",
          severity: "warning",
          status: "open",
          owner_role_ref: "hr-admin",
          assigned_to_identifier: "",
          action_href: "/hr-admin/employees",
          action_label: "Review employees",
          sla_days: 3,
          current_value: "4/5",
          evidence_ref: "",
          first_seen_at: "2026-09-07T10:30:00+05:30",
          last_seen_at: "2026-09-07T10:30:00+05:30",
          due_at: "2026-09-10T10:30:00+05:30",
          due_source_ref: "launch_audit.sla_days",
          due_state: "scheduled",
          days_until_due: 3,
          is_overdue: false,
          is_due_soon: false,
          acknowledged_at: null,
          acknowledged_by_identifier: "",
          reminder_sent_at: null,
          reminder_count: 0,
          escalated_at: null,
          escalated_by_identifier: "",
          escalation_owner_role_ref: "",
          ignored_at: null,
          ignored_by_identifier: "",
          resolved_at: null,
          resolution_note: "",
          action_history: [],
          source_hash: "demo-launch-remediation-primary-bank",
        },
        {
          id: "launch-remediation-provider-ready",
          gate_ref: "provider.rehearsal_ready",
          module_ref: "provider_launch_history",
          module_label: "Provider launch history",
          label: "Ready rehearsal",
          severity: "warning",
          status: "open",
          owner_role_ref: "payroll-admin",
          assigned_to_identifier: "payroll.launch.owner@example.com",
          action_href: "/hr-admin/payroll-providers",
          action_label: "Resolve provider blockers",
          sla_days: 2,
          current_value: "missing",
          evidence_ref: "payroll.provider_launch_readiness.audit_pack.v1",
          first_seen_at: "2026-09-07T10:30:00+05:30",
          last_seen_at: "2026-09-07T10:30:00+05:30",
          due_at: "2026-09-09T10:30:00+05:30",
          due_source_ref: "manual_override",
          due_state: "scheduled",
          days_until_due: 2,
          is_overdue: false,
          is_due_soon: false,
          acknowledged_at: "2026-09-07T10:35:00+05:30",
          acknowledged_by_identifier: "nisha.rao",
          reminder_sent_at: "2026-09-07T10:45:00+05:30",
          reminder_count: 1,
          escalated_at: null,
          escalated_by_identifier: "",
          escalation_owner_role_ref: "hr-admin",
          ignored_at: null,
          ignored_by_identifier: "",
          resolved_at: null,
          resolution_note: "Provider launch rehearsal is queued for release manager review.",
          action_history: [
            {
              action: "acknowledge",
              actor_identifier: "nisha.rao",
              recorded_at: "2026-09-07T10:35:00+05:30",
            },
          ],
          source_hash: "demo-launch-remediation-provider-ready",
        },
      ],
      remediation_assignment_summary: {
        open_count: 6,
        opened_count: 6,
        updated_count: 0,
        closed_count: 0,
      },
      evidence_refs: [
        "docs.phase0_release_quality_baseline.v1",
        "docs.hrms_module_wise_vertical_coverage.v1",
        "payroll.provider_launch_readiness.audit_pack.v1",
      ],
      modules: [
        {
          module_ref: "tenant_foundation",
          label: "Tenant foundation",
          status: "ready",
          gate_count: 4,
          passed_gate_count: 4,
          blocker_count: 0,
          warning_count: 0,
          gates: [],
          owner_role_ref: "platform-owner",
          action_href: "/hr-admin",
          action_label: "Review tenant setup",
          sla_days: 2,
        },
        {
          module_ref: "iam_workspace_access",
          label: "IAM workspace access",
          status: "ready",
          gate_count: 5,
          passed_gate_count: 5,
          blocker_count: 0,
          warning_count: 0,
          gates: [],
          owner_role_ref: "security-admin",
          action_href: "/hr-admin/employees",
          action_label: "Review workspace access",
          sla_days: 2,
        },
        {
          module_ref: "organization_master",
          label: "Organization master",
          status: "ready",
          gate_count: 5,
          passed_gate_count: 5,
          blocker_count: 0,
          warning_count: 0,
          gates: [],
          owner_role_ref: "hr-admin",
          action_href: "/hr-admin/organization",
          action_label: "Review organization",
          sla_days: 3,
        },
        {
          module_ref: "employee_master",
          label: "Employee master",
          status: "warning",
          gate_count: 5,
          passed_gate_count: 4,
          blocker_count: 0,
          warning_count: 1,
          gates: [],
          owner_role_ref: "hr-admin",
          action_href: "/hr-admin/employees",
          action_label: "Review employees",
          sla_days: 3,
        },
        {
          module_ref: "ess_mss_workspaces",
          label: "ESS and MSS workspaces",
          status: "ready",
          gate_count: 3,
          passed_gate_count: 3,
          blocker_count: 0,
          warning_count: 0,
          gates: [],
          owner_role_ref: "hr-admin",
          action_href: "/hr-admin/employees",
          action_label: "Review workspace roles",
          sla_days: 3,
        },
        {
          module_ref: "leave_governance",
          label: "Leave governance",
          status: "warning",
          gate_count: 4,
          passed_gate_count: 3,
          blocker_count: 0,
          warning_count: 1,
          gates: [],
          owner_role_ref: "hr-admin",
          action_href: "/hr-admin/policies",
          action_label: "Review leave policy",
          sla_days: 3,
        },
        {
          module_ref: "attendance_governance",
          label: "Attendance governance",
          status: "warning",
          gate_count: 3,
          passed_gate_count: 2,
          blocker_count: 0,
          warning_count: 1,
          gates: [],
          owner_role_ref: "hr-admin",
          action_href: "/hr-admin/attendance-operations",
          action_label: "Review attendance",
          sla_days: 3,
        },
        {
          module_ref: "lifecycle_workflows",
          label: "Lifecycle workflows",
          status: "ready",
          gate_count: 3,
          passed_gate_count: 3,
          blocker_count: 0,
          warning_count: 0,
          gates: [],
          owner_role_ref: "hr-admin",
          action_href: "/hr-admin/lifecycle",
          action_label: "Review lifecycle",
          sla_days: 4,
        },
        {
          module_ref: "documents_compliance",
          label: "Documents compliance",
          status: "warning",
          gate_count: 4,
          passed_gate_count: 3,
          blocker_count: 0,
          warning_count: 1,
          gates: [],
          owner_role_ref: "compliance-admin",
          action_href: "/hr-admin/documents",
          action_label: "Review documents",
          sla_days: 4,
        },
        {
          module_ref: "notifications_delivery",
          label: "Notifications delivery",
          status: "warning",
          gate_count: 3,
          passed_gate_count: 2,
          blocker_count: 0,
          warning_count: 1,
          gates: [],
          owner_role_ref: "operations-admin",
          action_href: "/hr-admin/notifications-admin",
          action_label: "Review delivery",
          sla_days: 2,
        },
        {
          module_ref: "saas_commercial_control",
          label: "SaaS commercial control",
          status: "ready",
          gate_count: 5,
          passed_gate_count: 5,
          blocker_count: 0,
          warning_count: 0,
          gates: [],
          owner_role_ref: "platform-owner",
          action_href: "/hr-admin/saas-control-plane",
          action_label: "Review plan",
          sla_days: 2,
        },
        {
          module_ref: "payroll_core",
          label: "Payroll core",
          status: "ready",
          gate_count: 5,
          passed_gate_count: 5,
          blocker_count: 0,
          warning_count: 0,
          gates: [],
          owner_role_ref: "payroll-admin",
          action_href: "/hr-admin/payroll-setup",
          action_label: "Review payroll setup",
          sla_days: 3,
        },
        {
          module_ref: "provider_launch_history",
          label: "Provider launch history",
          status: "warning",
          gate_count: 2,
          passed_gate_count: 1,
          blocker_count: 0,
          warning_count: 1,
          gates: [],
          owner_role_ref: "payroll-admin",
          action_href: "/hr-admin/payroll-providers",
          action_label: "Run provider rehearsal",
          sla_days: 2,
        },
      ],
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

  const buildDemoPayrollStatutorySetup = (): HrAdminPayrollStatutorySetupResponse => {
    const now = "2026-09-05T11:35:00+05:30";
    const riya = demoHrAdminEmployees.find((item) => item.employee_code === "EMP-0042") ?? demoHrAdminEmployees[0];
    const aarav = demoHrAdminEmployees.find((item) => item.employee_code === "EMP-0043") ?? demoHrAdminEmployees[1] ?? riya;
    const packId = "statpack-india-fy2026";
    const profileId = "statprofile-emp-0042-fy2026";
    const aaravProfileId = "statprofile-emp-0043-fy2026";
    const declarationId = "statdecl-emp-0042-fy2026";
    const aaravDeclarationId = "statdecl-emp-0043-fy2026";
    const components = [
      {
        id: "statcomp-epf-employee",
        statutory_pack_id: packId,
        statutory_pack_name: "India FY 2026 Statutory Pack",
        salary_component_id: "salcomp-pf-employee",
        salary_component_name: "PF Employee",
        code: "epf-employee",
        name: "Employee Provident Fund",
        statutory_type: "provident_fund",
        statutory_type_label: "Provident Fund",
        contribution_owner: "employee",
        contribution_owner_label: "Employee",
        calculation_method: "percentage",
        calculation_method_label: "Percentage",
        wage_base_ref: "payroll.wage_base.pf_basic.v1",
        statutory_treatment_ref: "india.epf.employee.v1",
        registration_ref: "india.epfo.establishment.default.v1",
        applicability_profile_ref: "india.epf.standard.v1",
        rounding_rule_ref: "payroll.rounding.nearest_rupee.v1",
        formula_ref: "",
        status: "active",
        status_label: "Active",
        config_snapshot: { ceiling_rule_ref: "india.epf.wage_ceiling.v1", registration_source: "tenant_statutory_pack" },
        slab_count: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: "statcomp-pt-maharashtra",
        statutory_pack_id: packId,
        statutory_pack_name: "India FY 2026 Statutory Pack",
        salary_component_id: "salcomp-professional-tax",
        salary_component_name: "Professional Tax",
        code: "pt-mh",
        name: "Maharashtra Professional Tax",
        statutory_type: "professional_tax",
        statutory_type_label: "Professional Tax",
        contribution_owner: "employee",
        contribution_owner_label: "Employee",
        calculation_method: "slab",
        calculation_method_label: "Slab",
        wage_base_ref: "payroll.wage_base.gross_monthly.v1",
        statutory_treatment_ref: "india.professional_tax.mh.v1",
        registration_ref: "india.pt.maharashtra.default.v1",
        applicability_profile_ref: "state:MH",
        rounding_rule_ref: "payroll.rounding.nearest_rupee.v1",
        formula_ref: "",
        status: "active",
        status_label: "Active",
        config_snapshot: { state_code: "MH", frequency: "monthly" },
        slab_count: 2,
        created_at: now,
        updated_at: now,
      },
    ];
    const slabs = [
      {
        id: "statslab-epf-ceiling",
        statutory_component_id: components[0].id,
        statutory_component_name: components[0].name,
        statutory_type: "provident_fund",
        code: "epf-12-percent-ceiling",
        name: "EPF 12 Percent With Wage Ceiling",
        slab_order: 10,
        effective_from: "2026-04-01",
        effective_to: null,
        min_amount: "0.00",
        max_amount: null,
        employee_rate_percent: "12.0000",
        employer_rate_percent: "12.0000",
        fixed_employee_amount: "0.00",
        fixed_employer_amount: "0.00",
        wage_ceiling_amount: "15000.00",
        state_code: "",
        applicability_profile_ref: "india.epf.standard.v1",
        status: "active",
        status_label: "Active",
        config_snapshot: { wage_basis: "basic_pay", cap_behavior: "apply_monthly_ceiling" },
        created_at: now,
        updated_at: now,
      },
      {
        id: "statslab-pt-mh-standard",
        statutory_component_id: components[1].id,
        statutory_component_name: components[1].name,
        statutory_type: "professional_tax",
        code: "pt-mh-standard",
        name: "MH Professional Tax Standard Slab",
        slab_order: 20,
        effective_from: "2026-04-01",
        effective_to: null,
        min_amount: "10000.00",
        max_amount: null,
        employee_rate_percent: "0.0000",
        employer_rate_percent: "0.0000",
        fixed_employee_amount: "200.00",
        fixed_employer_amount: "0.00",
        wage_ceiling_amount: null,
        state_code: "MH",
        applicability_profile_ref: "india.pt.mh.standard.v1",
        status: "active",
        status_label: "Active",
        config_snapshot: { month_override: { February: "300.00" } },
        created_at: now,
        updated_at: now,
      },
    ];
    const declarationItems = [
      {
        id: "statdeclitem-emp-0042-lic",
        declaration_id: declarationId,
        employee_id: riya.id,
        employee_name: riya.full_name,
        employee_code: riya.employee_code,
        financial_year_code: "FY2026-27",
        item_kind: "investment",
        item_kind_label: "Investment",
        section_code: "80C",
        component_code: "LIC",
        name: "Life Insurance Premium",
        declared_amount: "60000.00",
        verified_amount: "55000.00",
        proof_status: "verified",
        proof_status_label: "Verified",
        proof_document_ref: "employee-document:lic-premium-fy2026",
        proof_artifact_key: "tax-proofs/EMP-0042/FY2026-27/lic-premium.pdf",
        proof_submitted_at: "2026-08-30T13:15:00+05:30",
        verified_at: "2026-09-02T16:20:00+05:30",
        verified_by_name: "Nisha Rao",
        rejected_at: null,
        rejected_by_name: null,
        rejection_reason: "",
        source_ref: "tax-proof:EMP-0042:lic",
        source_hash: "8f7a6b5c4d3e20112233445566778899aabbccddeeff00112233445566778899",
        config_snapshot: { proof_type_ref: "insurance.receipt.v1", max_limit_ref: "india.80c.aggregate.v1" },
        created_at: "2026-08-30T13:10:00+05:30",
        updated_at: now,
      },
      {
        id: "statdeclitem-emp-0042-hra",
        declaration_id: declarationId,
        employee_id: riya.id,
        employee_name: riya.full_name,
        employee_code: riya.employee_code,
        financial_year_code: "FY2026-27",
        item_kind: "exemption",
        item_kind_label: "Exemption",
        section_code: "HRA",
        component_code: "RENT",
        name: "House Rent Exemption",
        declared_amount: "120000.00",
        verified_amount: "120000.00",
        proof_status: "not_required",
        proof_status_label: "Not Required",
        proof_document_ref: "",
        proof_artifact_key: "",
        proof_submitted_at: null,
        verified_at: "2026-09-02T16:20:00+05:30",
        verified_by_name: "Nisha Rao",
        rejected_at: null,
        rejected_by_name: null,
        rejection_reason: "",
        source_ref: "tax-proof:EMP-0042:rent",
        source_hash: "7f7a6b5c4d3e20112233445566778899aabbccddeeff00112233445566778890",
        config_snapshot: { city_category_ref: "metro", landlord_pan_required: false },
        created_at: "2026-08-30T13:12:00+05:30",
        updated_at: now,
      },
      {
        id: "statdeclitem-emp-0043-80c",
        declaration_id: aaravDeclarationId,
        employee_id: aarav.id,
        employee_name: aarav.full_name,
        employee_code: aarav.employee_code,
        financial_year_code: "FY2026-27",
        item_kind: "investment",
        item_kind_label: "Investment",
        section_code: "80C",
        component_code: "PPF",
        name: "Public Provident Fund",
        declared_amount: "50000.00",
        verified_amount: "0.00",
        proof_status: "submitted",
        proof_status_label: "Submitted",
        proof_document_ref: "employee-document:ppf-fy2026",
        proof_artifact_key: "tax-proofs/EMP-0043/FY2026-27/ppf.pdf",
        proof_submitted_at: "2026-09-01T12:05:00+05:30",
        verified_at: null,
        verified_by_name: null,
        rejected_at: null,
        rejected_by_name: null,
        rejection_reason: "",
        source_ref: "tax-proof:EMP-0043:ppf",
        source_hash: "6f7a6b5c4d3e20112233445566778899aabbccddeeff00112233445566778891",
        config_snapshot: { proof_type_ref: "investment.statement.v1" },
        created_at: "2026-09-01T12:05:00+05:30",
        updated_at: now,
      },
    ];
    const declarations = [
      {
        id: declarationId,
        employee_id: riya.id,
        employee_name: riya.full_name,
        employee_code: riya.employee_code,
        employee_statutory_profile_id: profileId,
        statutory_pack_id: packId,
        statutory_pack_name: "India FY 2026 Statutory Pack",
        financial_year_code: "FY2026-27",
        declaration_profile_ref: "india.tax.declaration.fy2026.v1",
        proof_window_ref: "india.tax.proof-window.fy2026.v1",
        status: "locked",
        status_label: "Locked",
        tax_regime: "old",
        tax_regime_label: "Old Regime",
        declared_total_amount: "180000.00",
        verified_total_amount: "175000.00",
        submitted_at: "2026-08-30T13:15:00+05:30",
        submitted_by_name: "Riya Sharma",
        verified_at: "2026-09-02T16:20:00+05:30",
        verified_by_name: "Nisha Rao",
        rejected_at: null,
        rejected_by_name: null,
        locked_at: "2026-09-05T10:30:00+05:30",
        locked_by_name: "Nisha Rao",
        rejection_reason: "",
        source_ref: "employee.tax.declaration:EMP-0042:fy2026",
        source_hash: "9f7a6b5c4d3e20112233445566778899aabbccddeeff00112233445566778899",
        config_snapshot: { submission_channel_ref: "ess.tax_declaration.v1", payroll_consumption_ref: "payroll.calc.statutory.fy2026.v1" },
        item_count: 2,
        submitted_item_count: 0,
        verified_item_count: 1,
        rejected_item_count: 0,
        created_at: "2026-08-30T13:10:00+05:30",
        updated_at: now,
      },
      {
        id: aaravDeclarationId,
        employee_id: aarav.id,
        employee_name: aarav.full_name,
        employee_code: aarav.employee_code,
        employee_statutory_profile_id: aaravProfileId,
        statutory_pack_id: packId,
        statutory_pack_name: "India FY 2026 Statutory Pack",
        financial_year_code: "FY2026-27",
        declaration_profile_ref: "india.tax.declaration.fy2026.v1",
        proof_window_ref: "india.tax.proof-window.fy2026.v1",
        status: "submitted",
        status_label: "Submitted",
        tax_regime: "new",
        tax_regime_label: "New Regime",
        declared_total_amount: "50000.00",
        verified_total_amount: "0.00",
        submitted_at: "2026-09-01T12:05:00+05:30",
        submitted_by_name: aarav.full_name,
        verified_at: null,
        verified_by_name: null,
        rejected_at: null,
        rejected_by_name: null,
        locked_at: null,
        locked_by_name: null,
        rejection_reason: "",
        source_ref: "employee.tax.declaration:EMP-0043:fy2026",
        source_hash: "5f7a6b5c4d3e20112233445566778899aabbccddeeff00112233445566778892",
        config_snapshot: { submission_channel_ref: "ess.tax_declaration.v1" },
        item_count: 1,
        submitted_item_count: 1,
        verified_item_count: 0,
        rejected_item_count: 0,
        created_at: "2026-09-01T12:05:00+05:30",
        updated_at: now,
      },
    ];
    const employeeProfiles = [
      {
        id: profileId,
        employee_id: riya.id,
        employee_name: riya.full_name,
        employee_code: riya.employee_code,
        statutory_pack_id: packId,
        statutory_pack_name: "India FY 2026 Statutory Pack",
        profile_ref: "payroll.employee_statutory.india.standard.v1",
        effective_from: "2026-04-01",
        effective_to: null,
        status: "active",
        status_label: "Active",
        pan_number: "ABCDE1234F",
        uan_number: "123456789012",
        pf_number: "MH/BAN/12345/678",
        esi_number: "",
        pf_applicable: true,
        esi_applicable: false,
        professional_tax_state: "MH",
        lwf_state: "MH",
        tax_regime: "old",
        tax_regime_label: "Old Regime",
        declaration_status: "locked",
        declaration_status_label: "Locked",
        previous_employment_income: "120000.00",
        previous_employment_tax_deducted: "8000.00",
        source_ref: "employee.tax.profile:EMP-0042:fy2026",
        source_hash: "4f7a6b5c4d3e20112233445566778899aabbccddeeff00112233445566778893",
        config_snapshot: { proof_window_ref: "india.tax.proof-window.fy2026.v1" },
        created_at: "2026-08-25T09:15:00+05:30",
        updated_at: now,
      },
      {
        id: aaravProfileId,
        employee_id: aarav.id,
        employee_name: aarav.full_name,
        employee_code: aarav.employee_code,
        statutory_pack_id: packId,
        statutory_pack_name: "India FY 2026 Statutory Pack",
        profile_ref: "payroll.employee_statutory.india.standard.v1",
        effective_from: "2026-04-01",
        effective_to: null,
        status: "active",
        status_label: "Active",
        pan_number: "PQRST1234F",
        uan_number: "123456789013",
        pf_number: "MH/BAN/12345/679",
        esi_number: "",
        pf_applicable: true,
        esi_applicable: false,
        professional_tax_state: "MH",
        lwf_state: "MH",
        tax_regime: "new",
        tax_regime_label: "New Regime",
        declaration_status: "proofs_pending",
        declaration_status_label: "Proofs Pending",
        previous_employment_income: "0.00",
        previous_employment_tax_deducted: "0.00",
        source_ref: "employee.tax.profile:EMP-0043:fy2026",
        source_hash: "3f7a6b5c4d3e20112233445566778899aabbccddeeff00112233445566778894",
        config_snapshot: { proof_window_ref: "india.tax.proof-window.fy2026.v1" },
        created_at: "2026-08-26T09:15:00+05:30",
        updated_at: now,
      },
    ];
    const employerRegistrations = [
      {
        id: "statreg-mh-pt-main",
        statutory_pack_id: packId,
        statutory_pack_name: "India FY 2026 Statutory Pack",
        statutory_component_id: components[1].id,
        statutory_component_name: components[1].name,
        statutory_type: "professional_tax",
        legal_entity_id: demoHrAdminPolicyOptions.legal_entities[0]?.id ?? null,
        legal_entity_name: demoHrAdminPolicyOptions.legal_entities[0]?.name ?? null,
        branch_id: demoHrAdminPolicyOptions.branches[0]?.id ?? null,
        branch_name: demoHrAdminPolicyOptions.branches[0]?.name ?? null,
        location_id: demoHrAdminPolicyOptions.locations[0]?.id ?? null,
        location_name: demoHrAdminPolicyOptions.locations[0]?.name ?? null,
        code: "mh-pt-main-registration",
        name: "Maharashtra PT Main Registration",
        registration_type_ref: "india.professional_tax.maharashtra.ptrc",
        registration_number: "PTRC/MAH/99881",
        employer_identifier: "TAN-MUM-4455",
        jurisdiction_ref: "country:IN/state:MH",
        filing_authority_ref: "maharashtra-pt-department",
        provider_ref: "clear-statutory",
        status: "active",
        status_label: "Active",
        effective_from: "2026-04-01",
        effective_to: null,
        source_ref: "tenant-onboarding:statutory-registration",
        source_hash: "2f7a6b5c4d3e20112233445566778899aabbccddeeff00112233445566778895",
        config_snapshot: { portal_profile_ref: "mh.pt.portal.default.v1", challan_profile_ref: "india.pt.mh.challan.v1" },
        filing_calendar_count: 2,
        open_filing_calendar_count: 1,
        created_at: "2026-08-20T09:15:00+05:30",
        updated_at: now,
      },
      {
        id: "statreg-epfo-main",
        statutory_pack_id: packId,
        statutory_pack_name: "India FY 2026 Statutory Pack",
        statutory_component_id: components[0].id,
        statutory_component_name: components[0].name,
        statutory_type: "provident_fund",
        legal_entity_id: demoHrAdminPolicyOptions.legal_entities[0]?.id ?? null,
        legal_entity_name: demoHrAdminPolicyOptions.legal_entities[0]?.name ?? null,
        branch_id: null,
        branch_name: null,
        location_id: null,
        location_name: null,
        code: "epfo-main-establishment",
        name: "EPFO Main Establishment",
        registration_type_ref: "india.epfo.establishment",
        registration_number: "MH/BAN/12345",
        employer_identifier: "EPFO-EST-12345",
        jurisdiction_ref: "country:IN",
        filing_authority_ref: "epfo",
        provider_ref: "clear-statutory",
        status: "active",
        status_label: "Active",
        effective_from: "2026-04-01",
        effective_to: null,
        source_ref: "tenant-onboarding:epfo",
        source_hash: "1f7a6b5c4d3e20112233445566778899aabbccddeeff00112233445566778896",
        config_snapshot: { portal_profile_ref: "epfo.establishment.default.v1" },
        filing_calendar_count: 1,
        open_filing_calendar_count: 1,
        created_at: "2026-08-20T09:15:00+05:30",
        updated_at: now,
      },
    ];
    const filingCalendars = [
      {
        id: "statfiling-mh-pt-aug-2026",
        statutory_pack_id: packId,
        statutory_pack_name: "India FY 2026 Statutory Pack",
        statutory_component_id: components[1].id,
        statutory_component_name: components[1].name,
        statutory_type: "professional_tax",
        employer_registration_id: employerRegistrations[0].id,
        employer_registration_name: employerRegistrations[0].name,
        employer_registration_number: employerRegistrations[0].registration_number,
        code: "mh-pt-aug-2026-return",
        name: "Maharashtra PT August 2026 Return",
        filing_type_ref: "india.professional_tax.maharashtra.monthly_return",
        filing_frequency: "monthly",
        filing_frequency_label: "Monthly",
        period_start: "2026-08-01",
        period_end: "2026-08-31",
        due_date: "2026-09-20",
        grace_due_date: "2026-09-25",
        filing_window_start: "2026-09-01",
        filing_window_end: "2026-09-25",
        status: "upcoming",
        status_label: "Upcoming",
        filing_authority_ref: "maharashtra-pt-department",
        provider_ref: "clear-statutory",
        output_profile_ref: "india.pt.mh.return.file.v1",
        source_ref: "statutory-calendar-seed:fy2026",
        source_hash: "0f7a6b5c4d3e20112233445566778899aabbccddeeff00112233445566778897",
        config_snapshot: { challan_profile_ref: "india.pt.mh.challan.v1" },
        days_until_due: 20,
        is_due: false,
        is_overdue: false,
        created_at: "2026-08-20T09:15:00+05:30",
        updated_at: now,
      },
      {
        id: "statfiling-epfo-aug-2026",
        statutory_pack_id: packId,
        statutory_pack_name: "India FY 2026 Statutory Pack",
        statutory_component_id: components[0].id,
        statutory_component_name: components[0].name,
        statutory_type: "provident_fund",
        employer_registration_id: employerRegistrations[1].id,
        employer_registration_name: employerRegistrations[1].name,
        employer_registration_number: employerRegistrations[1].registration_number,
        code: "epfo-aug-2026-ecr",
        name: "EPFO August 2026 ECR",
        filing_type_ref: "india.epfo.ecr.monthly",
        filing_frequency: "monthly",
        filing_frequency_label: "Monthly",
        period_start: "2026-08-01",
        period_end: "2026-08-31",
        due_date: "2026-09-15",
        grace_due_date: null,
        filing_window_start: "2026-09-01",
        filing_window_end: "2026-09-15",
        status: "due",
        status_label: "Due",
        filing_authority_ref: "epfo",
        provider_ref: "clear-statutory",
        output_profile_ref: "india.epfo.ecr.file.v1",
        source_ref: "statutory-calendar-seed:fy2026",
        source_hash: "ef7a6b5c4d3e20112233445566778899aabbccddeeff00112233445566778898",
        config_snapshot: { payment_profile_ref: "india.epfo.payment.v1" },
        days_until_due: 10,
        is_due: true,
        is_overdue: false,
        created_at: "2026-08-20T09:15:00+05:30",
        updated_at: now,
      },
    ];

    return {
      summary: {
        pack_count: 1,
        active_pack_count: 1,
        statutory_component_count: components.length,
        active_statutory_component_count: components.length,
        slab_count: slabs.length,
        employee_profile_count: employeeProfiles.length,
        active_employee_profile_count: employeeProfiles.length,
        pf_applicable_employee_count: employeeProfiles.filter((item) => item.pf_applicable).length,
        esi_applicable_employee_count: employeeProfiles.filter((item) => item.esi_applicable).length,
        declared_tax_profile_count: employeeProfiles.filter((item) => item.tax_regime !== "not_declared").length,
        declaration_count: declarations.length,
        submitted_declaration_count: declarations.filter((item) => item.status === "submitted").length,
        verified_declaration_count: declarations.filter((item) => item.status === "verified").length,
        locked_declaration_count: declarations.filter((item) => item.status === "locked").length,
        declaration_item_count: declarationItems.length,
        verified_declaration_item_count: declarationItems.filter((item) => item.proof_status === "verified").length,
        employer_registration_count: employerRegistrations.length,
        active_employer_registration_count: employerRegistrations.filter((item) => item.status === "active").length,
        filing_calendar_count: filingCalendars.length,
        due_filing_calendar_count: filingCalendars.filter((item) => item.is_due).length,
        overdue_filing_calendar_count: filingCalendars.filter((item) => item.is_overdue).length,
        acknowledged_filing_calendar_count: filingCalendars.filter((item) => item.status === "acknowledged").length,
      },
      packs: [
        {
          id: packId,
          code: "india-fy-2026",
          name: "India FY 2026 Statutory Pack",
          country_code: "IN",
          jurisdiction_ref: "country:IN",
          status: "active",
          status_label: "Active",
          effective_from: "2026-04-01",
          effective_to: "2027-03-31",
          currency_code: "INR",
          statutory_profile_ref: "payroll.statutory.india.fy2026.v1",
          validation_profile_ref: "payroll.statutory.validation.india.fy2026.v1",
          config_snapshot: { financial_year: "2026-27", configurable: true },
          component_count: components.length,
          active_component_count: components.length,
          employee_profile_count: employeeProfiles.length,
          created_at: now,
          updated_at: now,
        },
      ],
      statutory_components: components,
      slabs,
      employer_registrations: employerRegistrations,
      filing_calendars: filingCalendars,
      employee_profiles: employeeProfiles,
      declarations,
      declaration_items: declarationItems,
      options: {
        config_statuses: [
          { value: "draft", label: "Draft" },
          { value: "active", label: "Active" },
          { value: "retired", label: "Retired" },
        ],
        statutory_component_types: [
          { value: "provident_fund", label: "Provident Fund" },
          { value: "professional_tax", label: "Professional Tax" },
          { value: "income_tax", label: "Income Tax" },
        ],
        contribution_owners: [
          { value: "employee", label: "Employee" },
          { value: "employer", label: "Employer" },
          { value: "both", label: "Both" },
        ],
        calculation_methods: [
          { value: "fixed_amount", label: "Fixed Amount" },
          { value: "percentage", label: "Percentage" },
          { value: "slab", label: "Slab" },
          { value: "formula", label: "Formula" },
        ],
        payroll_frequencies: [
          { value: "monthly", label: "Monthly" },
          { value: "semi_monthly", label: "Semi Monthly" },
          { value: "weekly", label: "Weekly" },
          { value: "bi_weekly", label: "Bi Weekly" },
        ],
        tax_regimes: [
          { value: "not_declared", label: "Not Declared" },
          { value: "old", label: "Old Regime" },
          { value: "new", label: "New Regime" },
        ],
        declaration_statuses: [
          { value: "not_declared", label: "Not Declared" },
          { value: "declared", label: "Declared" },
          { value: "proofs_pending", label: "Proofs Pending" },
          { value: "verified", label: "Verified" },
          { value: "locked", label: "Locked" },
        ],
        statutory_declaration_statuses: [
          { value: "draft", label: "Draft" },
          { value: "submitted", label: "Submitted" },
          { value: "verified", label: "Verified" },
          { value: "rejected", label: "Rejected" },
          { value: "locked", label: "Locked" },
        ],
        statutory_declaration_item_kinds: [
          { value: "investment", label: "Investment" },
          { value: "exemption", label: "Exemption" },
          { value: "deduction", label: "Deduction" },
          { value: "rebate", label: "Rebate" },
          { value: "previous_employment", label: "Previous Employment" },
        ],
        statutory_proof_statuses: [
          { value: "not_required", label: "Not Required" },
          { value: "pending", label: "Pending" },
          { value: "submitted", label: "Submitted" },
          { value: "verified", label: "Verified" },
          { value: "rejected", label: "Rejected" },
        ],
        statutory_filing_statuses: [
          { value: "draft", label: "Draft" },
          { value: "upcoming", label: "Upcoming" },
          { value: "due", label: "Due" },
          { value: "filed", label: "Filed" },
          { value: "acknowledged", label: "Acknowledged" },
          { value: "overdue", label: "Overdue" },
          { value: "waived", label: "Waived" },
        ],
        salary_components: [
          { id: "salcomp-pf-employee", code: "PF_EMPLOYEE", name: "PF Employee", component_type: "deduction" },
          { id: "salcomp-professional-tax", code: "PT", name: "Professional Tax", component_type: "tax" },
        ],
        employees: demoHrAdminEmployees.map((employeeItem) => ({
          id: employeeItem.id,
          name: employeeItem.full_name,
          employee_code: employeeItem.employee_code,
        })),
        legal_entities: demoHrAdminPolicyOptions.legal_entities,
        branches: demoHrAdminPolicyOptions.branches,
        locations: demoHrAdminPolicyOptions.locations,
      },
    };
  };

  const buildDemoEssStatutoryDeclarations = (): EssStatutoryDeclarationListResponse => {
    const setup = buildDemoPayrollStatutorySetup();
    const declarations = setup.declarations
      .filter((item) => item.employee_code === "EMP-0042")
      .map((item) => ({
        ...item,
        items: setup.declaration_items
          .filter((proofItem) => proofItem.declaration_id === item.id)
          .map(({ employee_id, employee_name, employee_code, verified_by_name, rejected_by_name, ...proofItem }) => proofItem),
      }))
      .map(({ employee_id, employee_name, employee_code, submitted_by_name, verified_by_name, rejected_by_name, locked_by_name, ...item }) => item);
    const profile = setup.employee_profiles.find((item) => item.employee_code === "EMP-0042") ?? null;
    return {
      summary: {
        declaration_count: declarations.length,
        draft_declaration_count: declarations.filter((item) => item.status === "draft").length,
        submitted_declaration_count: declarations.filter((item) => item.status === "submitted").length,
        verified_declaration_count: declarations.filter((item) => item.status === "verified").length,
        locked_declaration_count: declarations.filter((item) => item.status === "locked").length,
        declaration_item_count: declarations.reduce((total, item) => total + item.items.length, 0),
        submitted_item_count: declarations.reduce((total, item) => total + item.items.filter((proof) => proof.proof_status === "submitted").length, 0),
        verified_item_count: declarations.reduce((total, item) => total + item.items.filter((proof) => proof.proof_status === "verified").length, 0),
        rejected_item_count: declarations.reduce((total, item) => total + item.items.filter((proof) => proof.proof_status === "rejected").length, 0),
        declared_total_amount: declarations.reduce((total, item) => total + Number(item.declared_total_amount), 0).toFixed(2),
        verified_total_amount: declarations.reduce((total, item) => total + Number(item.verified_total_amount), 0).toFixed(2),
        available_financial_years: [...new Set(declarations.map((item) => item.financial_year_code))],
      },
      profile,
      items: declarations,
      total_count: declarations.length,
      page: 1,
      page_size: 10,
      has_next: false,
      has_previous: false,
      options: {
        statutory_declaration_statuses: setup.options.statutory_declaration_statuses,
        statutory_declaration_item_kinds: setup.options.statutory_declaration_item_kinds,
        statutory_proof_statuses: setup.options.statutory_proof_statuses,
        tax_regimes: setup.options.tax_regimes,
        proof_upload_categories: [
          { id: "doccat-tax-proof", name: "Tax Proof Uploads" },
          { id: "doccat-rent-proof", name: "Rent Receipts" },
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
    const statutoryTdsLines = lockedSnapshots.slice(0, 1).map((snapshot, index) => ({
      id: `paycalcline-statutory-tds-${index}`,
      calculation_id: calculationId,
      payroll_run_id: calculatedRunId,
      input_snapshot_id: snapshot.id,
      employee_id: snapshot.employee_id,
      employee_code: snapshot.employee_code,
      employee_name: snapshot.employee_name,
      rule_version_id: null,
      rule_code: "",
      rule_name: "",
      rule_version: null,
      adjustment_id: null,
      line_source: "statutory",
      line_source_label: "Statutory",
      component_code: "TDS",
      component_name: "Tax Deducted At Source",
      line_type: "tax",
      calculation_order: 45,
      amount: "500.00",
      currency_code: "INR",
      status: "calculated",
      status_label: "Calculated",
      expression: "",
      source_hash: "8f5c7d41d1c4ee89312f0d45a1c9f4e1c2b3a470b9a8c7e6d5f4a3b2c1d0e9f8",
      context_snapshot: {
        wage_base_path: "salary.basic_monthly",
        wage_base: "20000.00",
        statutory_profile: {
          profile_ref: "india.employee.tax.profile.fy2026.v1",
          tax_regime: "old",
          declaration_status: "verified",
        },
      },
      result_snapshot: { result: "500.00" },
      trace_snapshot: {
        dependencies: ["salary.basic_monthly", "employee_statutory_profile", "employee_statutory_declarations"],
        trace: [
          {
            source: "payroll_statutory_tds_annualization",
            financial_year_code: "FY2026-27",
            selected_tax_regime: "old",
            annualized_wage_base: "240000.00",
            declaration_adjustment: "50000.00",
            taxable_annual_amount: "190000.00",
            annual_tax: "4000.00",
            remaining_period_count: "8",
          },
        ],
        source_hash: "8f5c7d41d1c4ee89312f0d45a1c9f4e1c2b3a470b9a8c7e6d5f4a3b2c1d0e9f8",
      },
      error_message: "",
      config_snapshot: {
        line_source: "statutory",
        statutory_pack_code: "india-tds-annualized-fy2026",
        statutory_component_code: "tds-annualized",
        statutory_type: "tax_deducted_at_source",
        wage_base_path: "salary.basic_monthly",
        annualization: {
          financial_year_code: "FY2026-27",
          tax_regime: "old",
          selected_tax_regime: "old",
          tax_regime_selection_mode: "profile",
          period_wage_base: "20000.00",
          annualization_multiplier: "12",
          annualized_wage_base: "240000.00",
          previous_employment_income: "0.00",
          declaration_adjustment: "50000.00",
          taxable_annual_amount: "190000.00",
          annual_tax: "4000.00",
          previous_employment_tax_deducted: "0.00",
          remaining_tax: "4000.00",
          remaining_period_count: "8",
          period_tax_amount: "500.00",
          declaration_cap_evidence: [
            {
              cap_ref: "old-regime-section-80c",
              raw_amount: "75000.00",
              capped_amount: "50000.00",
              max_amount: "50000.00",
              section_codes: ["80C"],
              component_codes: ["ELSS"],
            },
          ],
          regime_comparisons: [
            {
              tax_regime: "old",
              is_selected: true,
              annualized_wage_base: "240000.00",
              declaration_adjustment: "50000.00",
              taxable_annual_amount: "190000.00",
              annual_tax: "4000.00",
              remaining_tax: "4000.00",
              remaining_period_count: "8",
              period_tax_amount: "500.00",
              period_tax_delta: "0.00",
            },
            {
              tax_regime: "new",
              is_selected: false,
              annualized_wage_base: "240000.00",
              declaration_adjustment: "0.00",
              taxable_annual_amount: "240000.00",
              annual_tax: "0.00",
              remaining_tax: "0.00",
              remaining_period_count: "8",
              period_tax_amount: "0.00",
              period_tax_delta: "-500.00",
            },
          ],
        },
      },
      created_at: now,
      updated_at: now,
    }));
    const allLines = [...lines, ...adjustmentLines, ...statutoryTdsLines];
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
        statutory_components: [
          {
            statutory_pack_code: "india-tds-annualized-fy2026",
            statutory_component_code: "tds-annualized",
            statutory_type: "tax_deducted_at_source",
            contribution_owner: "employee",
            calculation_method: "slab",
            wage_base_path: "salary.basic_monthly",
            statutory_treatment_ref: "india.tds.annualized.v1",
            calculation_order: 45,
          },
        ],
      },
      totals_snapshot: {
        gross_earnings: "67500.00",
        employee_deductions: "4100.00",
        employer_contributions: "0.00",
        net_pay: "63400.00",
        employee_count: 2,
        line_count: allLines.length,
        error_count: 0,
      },
      error_snapshot: { error_count: 0, applied_adjustment_count: appliedAdjustments.length, statutory_component_count: 1, statutory_line_count: statutoryTdsLines.length },
      config_snapshot: {
        calculation_profile: {
          rule_codes: selectedVersions.map((item) => item.rule_code),
          statutory_profile: {
            enabled: true,
            pack_codes: ["india-tds-annualized-fy2026"],
            component_codes: ["tds-annualized"],
          },
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
        latest_net_pay: "63400.00",
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
          { value: "statutory", label: "Statutory" },
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

  const buildDemoPayrollAccessSummary = (overrides: Partial<HrAdminPayrollOutputArtifact["access_summary"]> = {}) => ({
    published_event_count: 1,
    notification_count: 0,
    signed_url_issued_count: 0,
    download_count: 0,
    read_acknowledgement_count: 0,
    revoked_event_count: 0,
    active_signed_grant_count: 0,
    revoked_signed_grant_count: 0,
    expired_signed_grant_count: 0,
    latest_downloaded_at: null,
    first_read_at: null,
    latest_notification_at: null,
    latest_signed_grant_expires_at: null,
    latest_revoked_at: null,
    is_read_acknowledged: false,
    ...overrides,
  });

  const buildDemoPayrollAccessEvents = ({
    artifactId,
    checksum,
    storageObjectVersion,
    storageProviderRef,
    downloadStrategyRef,
    includeNotification = false,
    now,
  }: {
    artifactId: string;
    checksum: string;
    storageObjectVersion: string;
    storageProviderRef: string;
    downloadStrategyRef: string;
    includeNotification?: boolean;
    now: string;
  }) => [
    {
      id: `${artifactId}-event-published`,
      event_type: "published",
      status: "recorded",
      event_profile_ref: "payroll.artifact_access.profile.default.v1",
      source_channel_ref: "hr_admin.payroll_outputs.v1",
      actor_identifier: "nisha.rao",
      notification_id: null,
      signed_access_grant_id: null,
      request_identifier: "",
      storage_provider_ref: storageProviderRef,
      storage_object_version: storageObjectVersion,
      download_strategy_ref: downloadStrategyRef,
      checksum_sha256: checksum,
      read_at: null,
      created_at: now,
      metadata_snapshot: { artifact_id: artifactId },
    },
    ...(includeNotification
      ? [{
          id: `${artifactId}-event-notified`,
          event_type: "notified",
          status: "recorded",
          event_profile_ref: "payroll.artifact_access.profile.default.v1",
          source_channel_ref: "employee.portal.v1",
          actor_identifier: "nisha.rao",
          notification_id: `${artifactId}-notification`,
          signed_access_grant_id: null,
          request_identifier: "",
          storage_provider_ref: storageProviderRef,
          storage_object_version: storageObjectVersion,
          download_strategy_ref: downloadStrategyRef,
          checksum_sha256: checksum,
          read_at: null,
          created_at: now,
          metadata_snapshot: { channel: "in_app", trigger_key: "payroll_payslip_published" },
        }]
      : []),
  ];

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
    const payslipArtifacts = Object.entries(payslipLines).map(([employeeCode, lines], index) => {
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
        storage_object_version: `local-payslip-${index + 1}-v1`,
        mime_type: "text/html",
        file_size_bytes: 14624 + index * 418,
        checksum_sha256: `aa8b7a6f5e4d3c2b10${index}112233445566778899aabbccddeeff00112233445566`,
        is_downloadable: true,
        download_strategy_ref: "payroll.download.stream.local.v1",
        supports_signed_url: false,
        signed_url_expires_in_seconds: 900,
        retention_policy_ref: "payroll.retention.7y.v1",
        download_url: `/api/v1/hr-admin/payroll-output-artifacts/${artifactId}/download/`,
        signed_download_url: null,
        signed_download_expires_at: null,
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
        access_summary: buildDemoPayrollAccessSummary({
          notification_count: 1,
          latest_notification_at: now,
        }),
        access_events: buildDemoPayrollAccessEvents({
          artifactId,
          checksum: `aa8b7a6f5e4d3c2b10${index}112233445566778899aabbccddeeff00112233445566`,
          storageObjectVersion: `local-payslip-${index + 1}-v1`,
          storageProviderRef: "payroll.storage.local.generated.v1",
          downloadStrategyRef: "payroll.download.stream.local.v1",
          includeNotification: true,
          now,
        }),
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
      storage_object_version: "local-register-v1",
      mime_type: "text/csv",
      file_size_bytes: 9216,
      checksum_sha256: "bb8c7b6a5f4e3d2c10112233445566778899aabbccddeeff00112233445566",
      is_downloadable: true,
      download_strategy_ref: "payroll.download.stream.local.v1",
      supports_signed_url: false,
      signed_url_expires_in_seconds: 900,
      retention_policy_ref: "payroll.retention.7y.v1",
      download_url: "/api/v1/hr-admin/payroll-output-artifacts/payoutartifact-register-aug-2026-core/download/",
      signed_download_url: null,
      signed_download_expires_at: null,
      output_profile_ref: outputProfileRef,
      totals_snapshot: review.totals_snapshot,
      line_snapshot: payslipArtifacts.map((artifact) => ({
        employee_code: artifact.employee_code,
        employee_name: artifact.employee_name,
        source_hash: artifact.source_hash,
        ...artifact.totals_snapshot,
      })),
      access_summary: buildDemoPayrollAccessSummary(),
      access_events: buildDemoPayrollAccessEvents({
        artifactId: "payoutartifact-register-aug-2026-core",
        checksum: "bb8c7b6a5f4e3d2c10112233445566778899aabbccddeeff00112233445566",
        storageObjectVersion: "local-register-v1",
        storageProviderRef: "payroll.storage.local.generated.v1",
        downloadStrategyRef: "payroll.download.stream.local.v1",
        now,
      }),
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

  const buildDemoPayrollProviderConnectionSetup = (): HrAdminPayrollProviderConnectionSetupResponse => {
    const now = "2026-09-05T11:10:00+05:30";
    const connections = [
      {
        id: "pay-provider-bank-sandbox",
        provider_ref: "payroll.provider.bank.sandbox.v1",
        provider_name: "Bank payout sandbox",
        provider_kind: "bank",
        provider_kind_label: "Bank",
        environment_ref: "sandbox",
        status: "active",
        status_label: "Active",
        adapter_ref: "payroll.provider_adapter.bank.sandbox.v1",
        sandbox_adapter_ref: "payroll.provider_adapter.bank.sandbox.v1",
        channel_ref: "bank.sftp.channel.primary.v1",
        credential_ref: "bank-sandbox-credential",
        credential_profile_ref: "bank.credentials.sandbox.v1",
        credential_required: true,
        callback_profile_ref: "bank.sftp.callback.v1",
        callback_verification_ref: "bank.sftp.callback.hmac.v1",
        retry_policy_ref: "payroll.delivery.retry.bank.v1",
        certification_status: "passed",
        certification_status_label: "Passed",
        certification_profile_ref: "bank.neft.certification.v1",
        certified_at: now,
        certified_by_name: "Nisha Rao",
        last_tested_at: now,
        last_tested_by_name: "Nisha Rao",
        created_by_name: "Nisha Rao",
        updated_by_name: "Nisha Rao",
      },
      {
        id: "pay-provider-accounting-sandbox",
        provider_ref: "payroll.provider.accounting.sandbox.v1",
        provider_name: "Accounting ledger sandbox",
        provider_kind: "accounting",
        provider_kind_label: "Accounting",
        environment_ref: "sandbox",
        status: "certified",
        status_label: "Certified",
        adapter_ref: "payroll.provider_adapter.accounting.sandbox.v1",
        sandbox_adapter_ref: "payroll.provider_adapter.accounting.sandbox.v1",
        channel_ref: "tally.import.channel.v1",
        credential_ref: "",
        credential_profile_ref: "tally.credentials.sandbox.v1",
        credential_required: false,
        callback_profile_ref: "tally.import.callback.manual.v1",
        callback_verification_ref: "tally.import.audit.v1",
        retry_policy_ref: "payroll.delivery.retry.standard.v1",
        certification_status: "passed",
        certification_status_label: "Passed",
        certification_profile_ref: "tally.import.certification.v1",
        certified_at: now,
        certified_by_name: "Nisha Rao",
        last_tested_at: now,
        last_tested_by_name: "Nisha Rao",
        created_by_name: "Nisha Rao",
        updated_by_name: "Nisha Rao",
      },
      {
        id: "pay-provider-clear-statutory",
        provider_ref: "clear-statutory.portal.v1",
        provider_name: "Clear statutory sandbox",
        provider_kind: "statutory",
        provider_kind_label: "Statutory",
        environment_ref: "sandbox",
        status: "sandbox_ready",
        status_label: "Sandbox Ready",
        adapter_ref: "payroll.provider_adapter.statutory.sandbox.v1",
        sandbox_adapter_ref: "payroll.provider_adapter.statutory.sandbox.v1",
        channel_ref: "clear-statutory.api.challan.v1",
        credential_ref: "clear-statutory-sandbox-credential",
        credential_profile_ref: "clear-statutory.credentials.sandbox.v1",
        credential_required: true,
        callback_profile_ref: "clear-statutory.callback.v1",
        callback_verification_ref: "clear-statutory.callback.hmac.v1",
        retry_policy_ref: "payroll.delivery.retry.statutory.v1",
        certification_status: "pending",
        certification_status_label: "Pending",
        certification_profile_ref: "clear-statutory.pt.challan.receipt.v1",
        certified_at: null,
        certified_by_name: null,
        last_tested_at: "2026-09-05T10:45:00+05:30",
        last_tested_by_name: "Nisha Rao",
        created_by_name: "Nisha Rao",
        updated_by_name: "Nisha Rao",
      },
    ].map((connection) => {
      const artifactKind = connection.provider_kind === "bank"
        ? "bank_advice"
        : connection.provider_kind === "accounting"
          ? "accounting_export"
          : "statutory_report";
      const schemaMappingProfileRef = `payroll.provider_mapping.${connection.provider_kind}.${artifactKind}.default.v1`;
      const gates = [
        { ref: "adapter_configured", label: "Adapter configured", passed: Boolean(connection.adapter_ref), value: connection.adapter_ref },
        { ref: "channel_configured", label: "Channel configured", passed: Boolean(connection.channel_ref), value: connection.channel_ref },
        {
          ref: "credential_reference_configured",
          label: "Credential reference configured",
          passed: connection.credential_required ? Boolean(connection.credential_ref) : true,
          value: connection.credential_ref || "not_required",
        },
        {
          ref: "callback_contract_configured",
          label: "Callback contract configured",
          passed: Boolean(connection.callback_profile_ref && connection.callback_verification_ref),
          value: connection.callback_verification_ref,
        },
        { ref: "retry_policy_configured", label: "Retry policy configured", passed: Boolean(connection.retry_policy_ref), value: connection.retry_policy_ref },
        { ref: "certification_passed", label: "Certification passed", passed: connection.certification_status === "passed", value: connection.certification_status },
      ];
      return {
        ...connection,
        readiness_snapshot: {
          provider_ref: connection.provider_ref,
          provider_kind: connection.provider_kind,
          environment_ref: connection.environment_ref,
          readiness_profile_ref: `payroll.provider_connection.${connection.provider_kind}.readiness.v1`,
          gates,
          ready_gate_count: gates.filter((gate) => gate.passed).length,
          total_gate_count: gates.length,
          blocking_gate_refs: gates.filter((gate) => !gate.passed).map((gate) => gate.ref),
          active_allowed: gates.every((gate) => gate.passed),
          credential_required: connection.credential_required,
          uses_credential_ref: Boolean(connection.credential_ref),
          updated_at: now,
        },
        certification_snapshot: {
          latest_result: connection.certification_status,
          certification_profile_ref: connection.certification_profile_ref,
          provider_ref: connection.provider_ref,
          adapter_ref: connection.adapter_ref,
          channel_ref: connection.channel_ref,
          tested_at: connection.last_tested_at,
          tested_by: connection.last_tested_by_name || "",
          evidence_hash: `${connection.id}-evidence-hash`,
          evidence_snapshot: {
            test_pack_ref: `payroll.provider_connection.${connection.provider_kind}.certification_pack.v1`,
            sandbox_delivery_count: connection.certification_status === "passed" ? 3 : 2,
            callback_verified: connection.certification_status === "passed",
            replay_guard_checked: true,
          },
        },
        config_snapshot: {
          provider_route: {
            provider_ref: connection.provider_ref,
            adapter_ref: connection.adapter_ref,
            channel_ref: connection.channel_ref,
            credential_ref: connection.credential_ref,
            credential_required: connection.credential_required,
            credential_profile_ref: connection.credential_profile_ref,
            callback_profile_ref: connection.callback_profile_ref,
            callback_verification_ref: connection.callback_verification_ref,
            retry_policy_ref: connection.retry_policy_ref,
            certification_profile_ref: connection.certification_profile_ref,
            schema_mapping_profile_ref: schemaMappingProfileRef,
            adapter_contract: {
              contract_profile_ref: `payroll.provider_contract.${connection.provider_kind}.sandbox_adapter.v1`,
              enforcement_mode: "warn",
              expected_adapter_ref: connection.adapter_ref,
              expected_provider_ref: connection.provider_ref,
              response_snapshot_required_fields: ["adapter_ref", "response_schema_ref", "domain_contract_ref"],
            },
          },
          onboarding_profile_ref: `payroll.provider_connection.${connection.provider_kind}.onboarding.v1`,
        },
        created_at: now,
        updated_at: now,
      };
    });
    const schemaMappingPacks = connections.map((connection) => {
      const providerRoute = connection.config_snapshot.provider_route as Record<string, unknown>;
      const artifactKind = connection.provider_kind === "bank"
        ? "bank_advice"
        : connection.provider_kind === "accounting"
          ? "accounting_export"
          : "statutory_report";
      const baseTransforms: Record<string, unknown>[] = [
        { source_path: "provider_ref", target_path: "provider.provider_ref", required: true, value_type: "string" },
        { source_path: "external_reference", target_path: "submission.external_reference", required: true, value_type: "string" },
        { source_path: "idempotency_key", target_path: "submission.idempotency_key", required: true, value_type: "string" },
        { source_path: "artifact_snapshot.file_name", target_path: "file.name", required: true, value_type: "string" },
        { source_path: "artifact_snapshot.checksum_sha256", target_path: "file.checksum_sha256", required: true, value_type: "string" },
        { source_path: "artifact_snapshot.file_size_bytes", target_path: "file.size_bytes", required: true, value_type: "integer" },
      ];
      const transforms = artifactKind === "bank_advice"
        ? [...baseTransforms, { source_path: "artifact_snapshot.totals_snapshot.net_pay", target_path: "payment.total_amount", required: true, value_type: "decimal_string" }]
        : artifactKind === "statutory_report"
          ? [...baseTransforms, { source_path: "artifact_snapshot.config_snapshot.filing_type_ref", target_path: "filing.filing_type_ref", required: false, value_type: "string" }]
          : [...baseTransforms, { source_path: "artifact_snapshot.totals_snapshot.gross_earnings", target_path: "ledger.gross_earnings", required: false, value_type: "decimal_string" }];
      const validations: Record<string, unknown>[] = [
        { path: "provider.provider_ref", required: true, gate_ref: "provider_ref_mapped" },
        { path: "submission.external_reference", required: true, gate_ref: "external_reference_mapped" },
        { path: "submission.idempotency_key", required: true, gate_ref: "idempotency_key_mapped" },
        { path: "file.name", required: true, gate_ref: "file_name_mapped" },
        { path: "file.checksum_sha256", required: true, gate_ref: "file_checksum_mapped" },
      ];
      return {
        id: `${connection.id}-mapping-pack`,
        provider_connection_id: connection.id,
        provider_ref: connection.provider_ref,
        provider_kind: connection.provider_kind,
        provider_kind_label: connection.provider_kind_label,
        environment_ref: connection.environment_ref,
        artifact_kind: artifactKind,
        artifact_kind_label: artifactKind.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase()),
        mapping_profile_ref: String(providerRoute.schema_mapping_profile_ref),
        version: 1,
        status: "active",
        status_label: "Active",
        source_schema_ref: `payroll.internal.${artifactKind}.submission.v1`,
        target_schema_ref: `${connection.provider_ref}.${artifactKind}.payload.v1`,
        transform_profile_ref: "payroll.provider_mapping.transform.safe_paths.v1",
        validation_profile_ref: "payroll.provider_mapping.validation.standard.v1",
        enforcement_mode: "warn",
        transform_rules: transforms,
        validation_rules: validations,
        sample_request_snapshot: {
          provider_ref: connection.provider_ref,
          external_reference: `SIM-${artifactKind}-2026-09`,
          idempotency_key: `${connection.id}-mapping-simulation`,
          artifact_snapshot: {
            file_name: `${artifactKind}.csv`,
            checksum_sha256: "sample-checksum-sha256",
            file_size_bytes: 2048,
            totals_snapshot: {
              net_pay: "125000.25",
              gross_earnings: "150000.00",
            },
            config_snapshot: {
              bank_file_profile_ref: "india.neft.v2",
              filing_type_ref: "monthly_return",
              employer_registration_number: "REG-001",
            },
            line_snapshot: [
              { employee_code: "EMP-001", employee_name: "Asha Mehta", net_pay: "1000.25", cost_center_code: "CC-ENG" },
              { employee_code: "EMP-002", employee_name: "Ravi Shah", net_pay: "500.50", cost_center_code: "CC-OPS" },
            ],
          },
        },
        sample_output_snapshot: {
          status: "passed",
          provider_payload_preview_ref: `${connection.provider_ref}.${artifactKind}.sample_payload.v1`,
        },
        evidence_snapshot: {
          source: "payroll_provider_schema_mapping_demo.v1",
          provider_ref: connection.provider_ref,
          artifact_kind: artifactKind,
          lifecycle_profile_ref: "payroll.provider_schema_mapping_pack.lifecycle.v1",
          last_lifecycle_action: "activated",
          last_lifecycle_actor: "Nisha Rao",
          last_lifecycle_at: now,
          lifecycle_history: [
            {
              action: "created",
              actor_name: "Nisha Rao",
              reason: "Default provider onboarding blueprint.",
              recorded_at: now,
            },
            {
              action: "activated",
              actor_name: "Nisha Rao",
              reason: "Sandbox provider schema certified.",
              recorded_at: now,
            },
          ],
        },
        source_hash: `${connection.id}-schema-mapping-hash`,
        created_by_name: "Nisha Rao",
        updated_by_name: "Nisha Rao",
        created_at: now,
        updated_at: now,
      };
    });
    if (schemaMappingPacks[0]) {
      schemaMappingPacks.push({
        ...schemaMappingPacks[0],
        id: `${schemaMappingPacks[0].id}-draft-v2`,
        version: 2,
        status: "draft",
        status_label: "Draft",
        target_schema_ref: "razorpayx.bank_advice.payload.v2",
        enforcement_mode: "strict",
        transform_rules: [
          ...schemaMappingPacks[0].transform_rules,
          {
            mode: "copy",
            source_path: "artifact_snapshot.config_snapshot.bank_file_profile_ref",
            target_path: "bank.file_profile_ref",
            required: false,
            value_type: "string",
            gate_ref: "bank_file_profile_ref",
          },
          {
            mode: "expand_rows",
            source_path: "artifact_snapshot.line_snapshot",
            target_path: "payment.employee_rows",
            required: true,
            gate_ref: "employee_payment_rows",
            row_mappings: [
              { source_path: "employee_code", target_path: "employee.code", required: true, value_type: "string", gate_ref: "employee_code" },
              { source_path: "employee_name", target_path: "employee.name", required: true, value_type: "string", gate_ref: "employee_name" },
              { source_path: "net_pay", target_path: "amount.net_pay", required: true, value_type: "decimal_string", gate_ref: "net_pay" },
              { source_path: "cost_center_code", target_path: "accounting.cost_center_code", required: false, value_type: "string", gate_ref: "cost_center" },
            ],
          },
          {
            mode: "group_rows",
            source_path: "artifact_snapshot.line_snapshot",
            target_path: "payment.cost_center_groups",
            group_by_path: "cost_center_code",
            group_key_target_path: "cost_center_code",
            rows_target_path: "employees",
            required: true,
            gate_ref: "cost_center_payment_groups",
            row_mappings: [
              { source_path: "employee_code", target_path: "employee_code", required: true, value_type: "string", gate_ref: "employee_code" },
              { source_path: "net_pay", target_path: "net_pay", required: true, value_type: "decimal_string", gate_ref: "net_pay" },
            ],
            aggregate_rules: [
              { operation: "sum", source_path: "net_pay", target_path: "totals.net_pay", value_type: "decimal_string" },
              { operation: "count", target_path: "totals.employee_count", value_type: "integer" },
            ],
          },
        ],
        evidence_snapshot: {
          source: "payroll_provider_schema_mapping_demo.v1",
          provider_ref: schemaMappingPacks[0].provider_ref,
          artifact_kind: schemaMappingPacks[0].artifact_kind,
          lifecycle_profile_ref: "payroll.provider_schema_mapping_pack.lifecycle.v1",
          last_lifecycle_action: "cloned",
          last_lifecycle_actor: "Nisha Rao",
          last_lifecycle_at: now,
          lifecycle_history: [
            {
              action: "cloned",
              actor_name: "Nisha Rao",
              reason: "Provider sandbox v2 schema trial.",
              recorded_at: now,
            },
          ],
        },
        source_hash: `${schemaMappingPacks[0].id}-schema-mapping-v2-hash`,
      });
    }
    const draftSchemaMappingPack = schemaMappingPacks.find((item) => item.status === "draft");
    const activeSchemaMappingPack = draftSchemaMappingPack
      ? schemaMappingPacks.find((item) =>
          item.status === "active"
          && item.provider_ref === draftSchemaMappingPack.provider_ref
          && item.artifact_kind === draftSchemaMappingPack.artifact_kind
        )
      : null;
    const schemaMappingSimulations = draftSchemaMappingPack
      ? [
          {
            id: `${draftSchemaMappingPack.id}-simulation-run-001`,
            mapping_pack_id: draftSchemaMappingPack.id,
            baseline_mapping_pack_id: activeSchemaMappingPack?.id ?? null,
            provider_connection_id: draftSchemaMappingPack.provider_connection_id,
            provider_ref: draftSchemaMappingPack.provider_ref,
            provider_kind: draftSchemaMappingPack.provider_kind,
            provider_kind_label: draftSchemaMappingPack.provider_kind_label,
            environment_ref: draftSchemaMappingPack.environment_ref,
            artifact_kind: draftSchemaMappingPack.artifact_kind,
            artifact_kind_label: draftSchemaMappingPack.artifact_kind_label,
            mapping_profile_ref: draftSchemaMappingPack.mapping_profile_ref,
            mapping_pack_version: draftSchemaMappingPack.version,
            baseline_mapping_pack_version: activeSchemaMappingPack?.version ?? 0,
            simulation_profile_ref: "payroll.provider_schema_mapping_pack.simulation.v1",
            comparison_profile_ref: "payroll.provider_schema_mapping_pack.comparison.v1",
            status: "passed",
            status_label: "Passed",
            comparison_status: "changed",
            gate_count: 24,
            passed_gate_count: 24,
            blocker_count: 0,
            changed_path_count: 0,
            added_path_count: 17,
            removed_path_count: 0,
            request_snapshot: draftSchemaMappingPack.sample_request_snapshot,
            provider_payload_snapshot: {
              provider: { provider_ref: draftSchemaMappingPack.provider_ref },
              submission: {
                external_reference: `SIM-${draftSchemaMappingPack.artifact_kind}-2026-09`,
                idempotency_key: `${draftSchemaMappingPack.id}-simulation`,
              },
              file: {
                name: `${draftSchemaMappingPack.artifact_kind}.csv`,
                checksum_sha256: "sample-checksum-sha256",
                size_bytes: 2048,
              },
              payment: {
                total_amount: "125000.25",
                employee_rows: [
                  {
                    employee: { code: "EMP-001", name: "Asha Mehta" },
                    amount: { net_pay: "1000.25" },
                    accounting: { cost_center_code: "CC-ENG" },
                  },
                  {
                    employee: { code: "EMP-002", name: "Ravi Shah" },
                    amount: { net_pay: "500.50" },
                    accounting: { cost_center_code: "CC-OPS" },
                  },
                ],
                cost_center_groups: [
                  {
                    cost_center_code: "CC-ENG",
                    employees: [{ employee_code: "EMP-001", net_pay: "1000.25" }],
                    totals: { net_pay: "1000.25", employee_count: 1 },
                  },
                  {
                    cost_center_code: "CC-OPS",
                    employees: [{ employee_code: "EMP-002", net_pay: "500.50" }],
                    totals: { net_pay: "500.50", employee_count: 1 },
                  },
                ],
              },
              bank: { file_profile_ref: "india.neft.v2" },
            },
            baseline_payload_snapshot: {
              provider: { provider_ref: draftSchemaMappingPack.provider_ref },
              submission: {
                external_reference: `SIM-${draftSchemaMappingPack.artifact_kind}-2026-09`,
                idempotency_key: `${draftSchemaMappingPack.id}-simulation`,
              },
              file: {
                name: `${draftSchemaMappingPack.artifact_kind}.csv`,
                checksum_sha256: "sample-checksum-sha256",
                size_bytes: 2048,
              },
              payment: { total_amount: "125000.25" },
            },
            gate_snapshot: [
              { ref: "provider_ref_mapped", passed: true, required: true },
              { ref: "bank_file_profile_ref", passed: true, required: false },
              { ref: "employee_payment_rows", passed: true, required: true },
              { ref: "cost_center_payment_groups", passed: true, required: true },
            ],
            blocking_gate_refs: [],
            comparison_snapshot: {
              comparison_profile_ref: "payroll.provider_schema_mapping_pack.comparison.v1",
              status: "changed",
              mapping_pack_id: draftSchemaMappingPack.id,
              baseline_mapping_pack_id: activeSchemaMappingPack?.id ?? "",
              changed_path_count: 0,
              added_path_count: 17,
              removed_path_count: 0,
              unchanged_path_count: 9,
              diffs: [
                {
                  path: "bank.file_profile_ref",
                  change_type: "added",
                  baseline_value: null,
                  candidate_value: "india.neft.v2",
                },
                {
                  path: "payment.employee_rows[0].employee.code",
                  change_type: "added",
                  baseline_value: null,
                  candidate_value: "EMP-001",
                },
                {
                  path: "payment.cost_center_groups[0].totals.net_pay",
                  change_type: "added",
                  baseline_value: null,
                  candidate_value: "1000.25",
                },
              ],
            },
            evidence_snapshot: {
              source: "payroll_provider_schema_mapping_pack_simulation_demo.v1",
              persisted: true,
              baseline_source_hash: activeSchemaMappingPack?.source_hash ?? "",
            },
            source_hash: `${draftSchemaMappingPack.id}-simulation-hash`,
            simulated_by_name: "Nisha Rao",
            simulated_at: now,
            created_at: now,
            updated_at: now,
          },
        ]
      : [];
    const certificationRuns = connections.map((connection, index) => {
      const passed = connection.certification_status === "passed";
      const scenarioCount = connection.provider_kind === "statutory" ? 3 : 2;
      const scenarioResults = Array.from({ length: scenarioCount }, (_, scenarioIndex) => {
        const scenarioRef = connection.provider_kind === "statutory"
          ? ["statutory_return_upload", "statutory_challan_receipt", "statutory_callback_replay_guard"][scenarioIndex]
          : connection.provider_kind === "accounting"
            ? ["accounting_export_submission", "accounting_audit_acknowledgement"][scenarioIndex]
            : ["bank_advice_submission", "bank_callback_contract"][scenarioIndex];
        const scenarioPassed = passed || scenarioIndex < scenarioCount - 1;
        return {
          scenario_ref: scenarioRef,
          label: scenarioRef.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase()),
          status: scenarioPassed ? "passed" : "failed",
          artifact_kind: connection.provider_kind === "bank" ? "bank_advice" : connection.provider_kind === "accounting" ? "accounting_export" : "statutory_report",
          route_key: scenarioRef,
          expected_provider_status: scenarioIndex === 1 ? "acknowledged" : "submitted",
          provider_status: scenarioPassed ? (scenarioIndex === 1 ? "acknowledged" : "submitted") : "failed",
          adapter_ref: connection.sandbox_adapter_ref,
          channel_ref: connection.channel_ref,
          adapter_contract_validation: {
            request: {
              contract_profile_ref: `payroll.provider_contract.${connection.provider_kind}.certification_adapter.v1`,
              enforcement_mode: "strict",
              status: "passed",
              blocking_gate_refs: [],
            },
            result: {
              contract_profile_ref: `payroll.provider_contract.${connection.provider_kind}.certification_adapter.v1`,
              enforcement_mode: "strict",
              status: scenarioPassed ? "passed" : "blocked",
              blocking_gate_refs: scenarioPassed ? [] : ["provider_status_allowed"],
            },
          },
          provider_batch_ref: `CERT-${connection.id}-${scenarioIndex + 1}`,
          certification_evidence_refs: scenarioPassed ? [`sandbox://${connection.provider_kind}/${scenarioRef}`] : [],
          failure_code: scenarioPassed ? "" : "sandbox_certification_contract_failed",
          failure_reason: scenarioPassed ? "" : "Sandbox provider returned a non-matching certification status.",
        };
      });
      const passedCount = scenarioResults.filter((item) => item.status === "passed").length;
      const failedCount = scenarioResults.length - passedCount;
      return {
        id: `${connection.id}-cert-run-${index + 1}`,
        provider_connection_id: connection.id,
        provider_ref: connection.provider_ref,
        provider_kind: connection.provider_kind,
        provider_kind_label: connection.provider_kind_label,
        environment_ref: connection.environment_ref,
        run_profile_ref: "payroll.provider_connection.certification_run.sandbox.v1",
        certification_profile_ref: connection.certification_profile_ref,
        scenario_profile_ref: `payroll.provider_connection.${connection.provider_kind}.certification_scenarios.v1`,
        status: failedCount === 0 ? "passed" : "failed",
        status_label: failedCount === 0 ? "Passed" : "Failed",
        scenario_count: scenarioResults.length,
        passed_count: passedCount,
        failed_count: failedCount,
        blocker_count: failedCount,
        started_at: connection.last_tested_at,
        completed_at: connection.last_tested_at,
        requested_by_name: "Nisha Rao",
        executed_by_name: connection.last_tested_by_name,
        request_snapshot: {
          provider_ref: connection.provider_ref,
          adapter_ref: connection.adapter_ref,
          sandbox_adapter_ref: connection.sandbox_adapter_ref,
          scenario_refs: scenarioResults.map((item) => item.scenario_ref),
        },
        response_snapshot: {
          adapter_ref: connection.sandbox_adapter_ref,
          scenario_count: scenarioResults.length,
          passed_count: passedCount,
          failed_count: failedCount,
        },
        evidence_snapshot: {
          test_pack_ref: `payroll.provider_connection.${connection.provider_kind}.certification_pack.v1`,
          provider_ref: connection.provider_ref,
          sandbox_delivery_count: scenarioResults.length,
          callback_verified: scenarioResults.some((item) => item.scenario_ref.includes("callback") && item.status === "passed"),
          replay_guard_checked: scenarioResults.some((item) => item.scenario_ref.includes("replay") && item.status === "passed"),
          scenario_results: scenarioResults,
          evidence_refs: scenarioResults.flatMap((item) => item.certification_evidence_refs),
        },
        error_snapshot: failedCount
          ? {
              failed_scenario_refs: scenarioResults.filter((item) => item.status === "failed").map((item) => item.scenario_ref),
            }
          : {},
        source_hash: `${connection.id}-cert-run-hash`,
        created_at: connection.last_tested_at ?? now,
        updated_at: connection.last_tested_at ?? now,
      };
    });
    const adapterRegistryAdapters = [
      {
        adapter_ref: "payroll.provider_adapter.manual.v1",
        source_ref: "builtin",
        loader_ref: "apps.payroll.providers:ManualPayrollProviderAdapter",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        capabilities: { adapter_family: "provider", is_manual: true, is_sandbox: false, is_http_json: false, is_production_pack: false, requires_route_config: false },
      },
      {
        adapter_ref: "payroll.provider_adapter.http_json.v1",
        source_ref: "builtin",
        loader_ref: "apps.payroll.providers:HttpJsonPayrollProviderAdapter",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        capabilities: { adapter_family: "provider", is_manual: false, is_sandbox: false, is_http_json: true, is_production_pack: false, requires_route_config: true },
      },
      ...connections.map((connection) => ({
        adapter_ref: connection.adapter_ref,
        source_ref: "builtin",
        loader_ref: `apps.payroll.providers:${connection.provider_kind}Adapter`,
        status: "ready",
        required_by_connection: true,
        blocking_gate_refs: [],
        capabilities: {
          adapter_family: connection.provider_kind,
          supported_artifact_kinds: [
            connection.provider_kind === "bank"
              ? "bank_advice"
              : connection.provider_kind === "accounting"
                ? "accounting_export"
                : "statutory_report",
          ],
          is_manual: false,
          is_sandbox: connection.adapter_ref.endsWith(".sandbox.v1"),
          is_http_json: false,
          is_production_pack: false,
          requires_route_config: false,
        },
      })),
      ...[
        ["payroll.provider_adapter.bank.production_pack.v1", "bank", "bank_advice"],
        ["payroll.provider_adapter.accounting.production_pack.v1", "accounting", "accounting_export"],
        ["payroll.provider_adapter.statutory.production_pack.v1", "statutory", "statutory_report"],
      ].map(([adapterRef, family, artifactKind]) => ({
        adapter_ref: adapterRef,
        source_ref: "builtin",
        loader_ref: `apps.payroll.providers:${family}ProductionPackAdapter`,
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        capabilities: {
          adapter_family: family,
          supported_artifact_kinds: [artifactKind],
          is_manual: false,
          is_sandbox: false,
          is_http_json: false,
          is_production_pack: true,
          requires_route_config: true,
        },
      })),
      {
        adapter_ref: "payroll.provider_adapter.bank.live_payout.v1",
        source_ref: "builtin",
        loader_ref: "apps.payroll.providers:BankPayrollProviderLivePayoutAdapter",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        capabilities: {
          adapter_family: "bank",
          supported_artifact_kinds: ["bank_advice"],
          is_manual: false,
          is_sandbox: false,
          is_http_json: false,
          is_production_pack: false,
          is_bank_live_payout: true,
          requires_route_config: true,
        },
      },
      {
        adapter_ref: "payroll.provider_adapter.accounting.live_journal.v1",
        source_ref: "builtin",
        loader_ref: "apps.payroll.providers:AccountingPayrollProviderLiveJournalAdapter",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        capabilities: {
          adapter_family: "accounting",
          supported_artifact_kinds: ["accounting_export"],
          is_manual: false,
          is_sandbox: false,
          is_http_json: false,
          is_production_pack: false,
          is_bank_live_payout: false,
          is_accounting_live_journal: true,
          requires_route_config: true,
        },
      },
      {
        adapter_ref: "payroll.provider_adapter.statutory.live_filing.v1",
        source_ref: "builtin",
        loader_ref: "apps.payroll.providers:StatutoryPayrollProviderLiveFilingAdapter",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        capabilities: {
          adapter_family: "statutory",
          supported_artifact_kinds: ["statutory_report"],
          is_manual: false,
          is_sandbox: false,
          is_http_json: false,
          is_production_pack: false,
          is_bank_live_payout: false,
          is_accounting_live_journal: false,
          is_statutory_live_filing: true,
          requires_route_config: true,
        },
      },
      {
        adapter_ref: "tenant.bank.live-sdk.adapter.v1",
        source_ref: "settings.PAYROLL_PROVIDER_ADAPTERS",
        loader_ref: "tenant_integrations.payroll.bank:LiveBankAdapter",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        capabilities: { adapter_family: "bank", supported_artifact_kinds: ["bank_advice"], is_manual: false, is_sandbox: false, is_http_json: false, is_production_pack: false, is_bank_live_payout: false, requires_route_config: true },
      },
    ];
    const adapterRegistry = {
      registry_profile_ref: "payroll.provider_adapter_registry.readiness.v1",
      adapter_count: adapterRegistryAdapters.length,
      ready_adapter_count: adapterRegistryAdapters.filter((item) => item.status === "ready").length,
      blocked_adapter_count: adapterRegistryAdapters.filter((item) => item.status !== "ready").length,
      configured_adapter_count: adapterRegistryAdapters.filter((item) => item.source_ref === "settings.PAYROLL_PROVIDER_ADAPTERS").length,
      builtin_adapter_count: adapterRegistryAdapters.filter((item) => item.source_ref === "builtin").length,
      production_pack_adapter_count: adapterRegistryAdapters.filter((item) => Boolean(item.capabilities.is_production_pack)).length,
      required_adapter_count: adapterRegistryAdapters.filter((item) => item.required_by_connection).length,
      blocked_adapter_refs: adapterRegistryAdapters.filter((item) => item.status !== "ready").map((item) => item.adapter_ref),
      adapters: adapterRegistryAdapters,
    };
    const clientRegistryClients = [
      {
        client_ref: "payroll.provider_client.bank.fixture.v1",
        source_ref: "builtin",
        loader_ref: "apps.payroll.providers:BankPayrollProviderFixtureClient",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        capabilities: {
          client_family: "bank",
          supported_adapter_refs: ["payroll.provider_adapter.bank.live_payout.v1"],
          supported_artifact_kinds: ["bank_advice"],
          implemented_methods: ["submit_payout"],
          expected_methods: ["submit_payout", "__call__"],
          is_fixture_client: true,
          is_live_provider_client: false,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
        },
      },
      {
        client_ref: "payroll.provider_client.accounting.fixture.v1",
        source_ref: "builtin",
        loader_ref: "apps.payroll.providers:AccountingPayrollProviderFixtureClient",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        capabilities: {
          client_family: "accounting",
          supported_adapter_refs: ["payroll.provider_adapter.accounting.live_journal.v1"],
          supported_artifact_kinds: ["accounting_export"],
          implemented_methods: ["post_journal"],
          expected_methods: ["post_journal", "submit_journal", "__call__"],
          is_fixture_client: true,
          is_live_provider_client: false,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
        },
      },
      {
        client_ref: "payroll.provider_client.bank.sdk_http.v1",
        source_ref: "builtin",
        loader_ref: "apps.payroll.providers:BankPayrollProviderSdkHttpClient",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        capabilities: {
          client_family: "bank",
          supported_adapter_refs: ["payroll.provider_adapter.bank.live_payout.v1"],
          supported_artifact_kinds: ["bank_advice"],
          implemented_methods: ["submit_payout"],
          expected_methods: ["submit_payout", "__call__"],
          is_fixture_client: false,
          is_live_provider_client: true,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
        },
      },
      {
        client_ref: "payroll.provider_client.bank.razorpayx_http.v1",
        source_ref: "builtin",
        loader_ref: "apps.payroll.providers:BankRazorpayXHttpPayrollProviderClient",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        capabilities: {
          client_family: "bank",
          supported_adapter_refs: ["payroll.provider_adapter.bank.live_payout.v1"],
          supported_artifact_kinds: ["bank_advice"],
          implemented_methods: ["submit_payout"],
          expected_methods: ["submit_payout", "__call__"],
          is_fixture_client: false,
          is_live_provider_client: true,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
        },
      },
      {
        client_ref: "payroll.provider_client.accounting.sdk_http.v1",
        source_ref: "builtin",
        loader_ref: "apps.payroll.providers:AccountingPayrollProviderSdkHttpClient",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        capabilities: {
          client_family: "accounting",
          supported_adapter_refs: ["payroll.provider_adapter.accounting.live_journal.v1"],
          supported_artifact_kinds: ["accounting_export"],
          implemented_methods: ["post_journal"],
          expected_methods: ["post_journal", "submit_journal", "__call__"],
          is_fixture_client: false,
          is_live_provider_client: true,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
        },
      },
      {
        client_ref: "payroll.provider_client.accounting.tallyprime_http.v1",
        source_ref: "builtin",
        loader_ref: "apps.payroll.providers:AccountingTallyPrimeHttpPayrollProviderClient",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        capabilities: {
          client_family: "accounting",
          supported_adapter_refs: ["payroll.provider_adapter.accounting.live_journal.v1"],
          supported_artifact_kinds: ["accounting_export"],
          implemented_methods: ["post_journal"],
          expected_methods: ["post_journal", "submit_journal", "__call__"],
          is_fixture_client: false,
          is_live_provider_client: true,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
        },
      },
      {
        client_ref: "payroll.provider_client.statutory.sdk_http.v1",
        source_ref: "builtin",
        loader_ref: "apps.payroll.providers:StatutoryPayrollProviderSdkHttpClient",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        capabilities: {
          client_family: "statutory",
          supported_adapter_refs: ["payroll.provider_adapter.statutory.live_filing.v1"],
          supported_artifact_kinds: ["statutory_report"],
          implemented_methods: ["submit_filing", "upload_filing"],
          expected_methods: ["submit_filing", "upload_filing", "__call__"],
          is_fixture_client: false,
          is_live_provider_client: true,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
        },
      },
      {
        client_ref: "payroll.provider_client.statutory.epfo_ecr_http.v1",
        source_ref: "builtin",
        loader_ref: "apps.payroll.providers:StatutoryEpfoEcrHttpPayrollProviderClient",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        capabilities: {
          client_family: "statutory",
          supported_adapter_refs: ["payroll.provider_adapter.statutory.live_filing.v1"],
          supported_artifact_kinds: ["statutory_report"],
          implemented_methods: ["submit_filing", "upload_filing"],
          expected_methods: ["submit_filing", "upload_filing", "__call__"],
          is_fixture_client: false,
          is_live_provider_client: true,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
        },
      },
      {
        client_ref: "payroll.provider_client.statutory.fixture.v1",
        source_ref: "builtin",
        loader_ref: "apps.payroll.providers:StatutoryPayrollProviderFixtureClient",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        capabilities: {
          client_family: "statutory",
          supported_adapter_refs: ["payroll.provider_adapter.statutory.live_filing.v1"],
          supported_artifact_kinds: ["statutory_report"],
          implemented_methods: ["submit_filing"],
          expected_methods: ["submit_filing", "upload_filing", "__call__"],
          is_fixture_client: true,
          is_live_provider_client: false,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
        },
      },
      {
        client_ref: "tenant.bank.live-sdk.client.v1",
        source_ref: "settings.PAYROLL_BANK_PAYOUT_CLIENTS",
        loader_ref: "tenant_integrations.payroll.bank:LiveBankClient",
        status: "ready",
        required_by_connection: true,
        blocking_gate_refs: [],
        capabilities: {
          client_family: "bank",
          supported_adapter_refs: ["payroll.provider_adapter.bank.live_payout.v1"],
          supported_artifact_kinds: ["bank_advice"],
          implemented_methods: ["submit_payout"],
          expected_methods: ["submit_payout", "__call__"],
          is_fixture_client: false,
          is_live_provider_client: true,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
        },
      },
    ];
    const clientRegistry = {
      registry_profile_ref: "payroll.provider_client_registry.readiness.v1",
      client_count: clientRegistryClients.length,
      ready_client_count: clientRegistryClients.filter((item) => item.status === "ready").length,
      blocked_client_count: clientRegistryClients.filter((item) => item.status !== "ready").length,
      configured_client_count: clientRegistryClients.filter((item) => item.source_ref.startsWith("settings.")).length,
      builtin_client_count: clientRegistryClients.filter((item) => item.source_ref === "builtin").length,
      fixture_client_count: clientRegistryClients.filter((item) => Boolean(item.capabilities.is_fixture_client)).length,
      required_client_count: clientRegistryClients.filter((item) => item.required_by_connection).length,
      blocked_client_refs: clientRegistryClients.filter((item) => item.status !== "ready").map((item) => item.client_ref),
      clients: clientRegistryClients,
    };
    const packageRegistryPackages = [
      {
        package_ref: "payroll.provider_package.bank.fixture.v1",
        source_ref: "builtin",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        manifest: {
          package_profile_ref: "payroll.provider_package_manifest.bank.fixture.v1",
          provider_kind: "bank",
          adapter_ref: "payroll.provider_adapter.bank.live_payout.v1",
          client_ref: "payroll.provider_client.bank.fixture.v1",
          required_route_config_refs: ["bank_payout_adapter.client_ref", "bank_payout_adapter.debit_account_ref", "bank_payout_adapter.payment_date"],
          certification_scenario_refs: ["bank_payout_acknowledged", "bank_payout_partial_acceptance", "bank_payout_idempotent_replay"],
          evidence_path_refs: ["bank_payout.utr_refs", "bank_payout.transaction_refs", "bank_payout.evidence_refs"],
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
        },
        capabilities: {
          provider_kind: "bank",
          adapter_ref: "payroll.provider_adapter.bank.live_payout.v1",
          client_ref: "payroll.provider_client.bank.fixture.v1",
          certification_fixture_client_ref: "payroll.provider_client.bank.fixture.v1",
          supported_artifact_kinds: ["bank_advice"],
          supported_transport_modes: ["api"],
          certification_scenario_count: 3,
          evidence_path_count: 3,
          required_route_config_count: 3,
          is_fixture_package: true,
          sandbox_ready: true,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
          storage_policy_ref_count: 1,
        },
      },
      {
        package_ref: "payroll.provider_package.accounting.fixture.v1",
        source_ref: "builtin",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        manifest: {
          package_profile_ref: "payroll.provider_package_manifest.accounting.fixture.v1",
          provider_kind: "accounting",
          adapter_ref: "payroll.provider_adapter.accounting.live_journal.v1",
          client_ref: "payroll.provider_client.accounting.fixture.v1",
          required_route_config_refs: ["accounting_journal_adapter.client_ref", "accounting_journal_adapter.company_ref", "accounting_journal_adapter.posting_date"],
          certification_scenario_refs: ["accounting_journal_posted", "accounting_journal_period_closed", "accounting_journal_idempotent_replay"],
          evidence_path_refs: ["accounting_journal.voucher_refs", "accounting_journal.document_refs", "accounting_journal.evidence_refs"],
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
        },
        capabilities: {
          provider_kind: "accounting",
          adapter_ref: "payroll.provider_adapter.accounting.live_journal.v1",
          client_ref: "payroll.provider_client.accounting.fixture.v1",
          certification_fixture_client_ref: "payroll.provider_client.accounting.fixture.v1",
          supported_artifact_kinds: ["accounting_export"],
          supported_transport_modes: ["api"],
          certification_scenario_count: 3,
          evidence_path_count: 3,
          required_route_config_count: 3,
          is_fixture_package: true,
          sandbox_ready: true,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
          storage_policy_ref_count: 1,
        },
      },
      {
        package_ref: "payroll.provider_package.bank.sdk_http.v1",
        source_ref: "builtin",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        manifest: {
          package_profile_ref: "payroll.provider_package_manifest.bank.sdk_http.v1",
          provider_kind: "bank",
          adapter_ref: "payroll.provider_adapter.bank.live_payout.v1",
          client_ref: "payroll.provider_client.bank.sdk_http.v1",
          certification_fixture_client_ref: "payroll.provider_client.bank.fixture.v1",
          required_route_config_refs: ["provider_package_ref", "bank_payout_adapter.client_ref", "bank_payout_adapter.endpoint_url", "bank_payout_adapter.transport_ref", "bank_payout_adapter.auth_scheme", "bank_payout_adapter.debit_account_ref", "bank_payout_adapter.payment_date"],
          certification_scenario_refs: ["bank_sdk_http_acknowledged", "bank_sdk_http_provider_timeout", "bank_sdk_http_idempotent_replay"],
          evidence_path_refs: ["bank_payout.provider_response.sdk_client.response_status_code", "bank_payout.utr_refs", "bank_payout.transaction_refs", "bank_payout.evidence_refs"],
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
        },
        capabilities: {
          provider_kind: "bank",
          adapter_ref: "payroll.provider_adapter.bank.live_payout.v1",
          client_ref: "payroll.provider_client.bank.sdk_http.v1",
          certification_fixture_client_ref: "payroll.provider_client.bank.fixture.v1",
          supported_artifact_kinds: ["bank_advice"],
          supported_transport_modes: ["api"],
          certification_scenario_count: 3,
          evidence_path_count: 4,
          required_route_config_count: 7,
          is_fixture_package: false,
          sandbox_ready: false,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
          storage_policy_ref_count: 1,
        },
      },
      {
        package_ref: "payroll.provider_package.bank.razorpayx_http.v1",
        source_ref: "builtin",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        manifest: {
          package_profile_ref: "payroll.provider_package_manifest.bank.razorpayx_http.v1",
          package_module_ref: "payroll.provider_package_module.bank.razorpayx_http.v1",
          vendor_profile_ref: "payroll.provider_vendor.bank.razorpayx.v1",
          provider_contract_ref: "payroll.provider_contract.bank.razorpayx_payout.v1",
          provider_kind: "bank",
          adapter_ref: "payroll.provider_adapter.bank.live_payout.v1",
          client_ref: "payroll.provider_client.bank.razorpayx_http.v1",
          certification_fixture_client_ref: "payroll.provider_client.bank.fixture.v1",
          required_route_config_refs: [
            "provider_package_ref",
            "bank_payout_adapter.client_ref",
            "bank_payout_adapter.endpoint_url",
            "bank_payout_adapter.transport_ref",
            "bank_payout_adapter.auth_scheme",
            "bank_payout_adapter.debit_account_ref",
            "bank_payout_adapter.payment_date",
            "bank_payout_adapter.payout_profile_ref",
            "bank_payout_adapter.payment_operation_ref",
          ],
          certification_scenario_refs: [
            "razorpayx_http_payout_accepted",
            "razorpayx_http_partial_failure",
            "razorpayx_http_idempotent_replay",
            "razorpayx_http_callback_reconcile",
          ],
          evidence_path_refs: [
            "bank_payout.provider_response.sdk_client.response_status_code",
            "bank_payout.provider_response.sdk_client.package_module_ref",
            "bank_payout.provider_response.package_module.provider_contract_ref",
            "bank_payout.utr_refs",
            "bank_payout.transaction_refs",
            "bank_payout.evidence_refs",
          ],
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
        },
        capabilities: {
          provider_kind: "bank",
          package_module_ref: "payroll.provider_package_module.bank.razorpayx_http.v1",
          vendor_profile_ref: "payroll.provider_vendor.bank.razorpayx.v1",
          provider_contract_ref: "payroll.provider_contract.bank.razorpayx_payout.v1",
          adapter_ref: "payroll.provider_adapter.bank.live_payout.v1",
          client_ref: "payroll.provider_client.bank.razorpayx_http.v1",
          certification_fixture_client_ref: "payroll.provider_client.bank.fixture.v1",
          supported_artifact_kinds: ["bank_advice"],
          supported_transport_modes: ["api"],
          certification_scenario_count: 4,
          evidence_path_count: 6,
          required_route_config_count: 9,
          is_fixture_package: false,
          sandbox_ready: false,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
          storage_policy_ref_count: 1,
        },
      },
      {
        package_ref: "payroll.provider_package.accounting.sdk_http.v1",
        source_ref: "builtin",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        manifest: {
          package_profile_ref: "payroll.provider_package_manifest.accounting.sdk_http.v1",
          provider_kind: "accounting",
          adapter_ref: "payroll.provider_adapter.accounting.live_journal.v1",
          client_ref: "payroll.provider_client.accounting.sdk_http.v1",
          certification_fixture_client_ref: "payroll.provider_client.accounting.fixture.v1",
          required_route_config_refs: ["provider_package_ref", "accounting_journal_adapter.client_ref", "accounting_journal_adapter.endpoint_url", "accounting_journal_adapter.transport_ref", "accounting_journal_adapter.auth_scheme", "accounting_journal_adapter.company_ref", "accounting_journal_adapter.posting_date"],
          certification_scenario_refs: ["accounting_sdk_http_posted", "accounting_sdk_http_period_closed", "accounting_sdk_http_idempotent_replay"],
          evidence_path_refs: ["accounting_journal.provider_response.sdk_client.response_status_code", "accounting_journal.voucher_refs", "accounting_journal.document_refs", "accounting_journal.evidence_refs"],
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
        },
        capabilities: {
          provider_kind: "accounting",
          adapter_ref: "payroll.provider_adapter.accounting.live_journal.v1",
          client_ref: "payroll.provider_client.accounting.sdk_http.v1",
          certification_fixture_client_ref: "payroll.provider_client.accounting.fixture.v1",
          supported_artifact_kinds: ["accounting_export"],
          supported_transport_modes: ["api"],
          certification_scenario_count: 3,
          evidence_path_count: 4,
          required_route_config_count: 7,
          is_fixture_package: false,
          sandbox_ready: false,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
          storage_policy_ref_count: 1,
        },
      },
      {
        package_ref: "payroll.provider_package.accounting.tallyprime_http.v1",
        source_ref: "builtin",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        manifest: {
          package_profile_ref: "payroll.provider_package_manifest.accounting.tallyprime_http.v1",
          package_module_ref: "payroll.provider_package_module.accounting.tallyprime_http.v1",
          vendor_profile_ref: "payroll.provider_vendor.accounting.tallyprime.v1",
          provider_contract_ref: "payroll.provider_contract.accounting.tallyprime_journal_import.v1",
          provider_kind: "accounting",
          adapter_ref: "payroll.provider_adapter.accounting.live_journal.v1",
          client_ref: "payroll.provider_client.accounting.tallyprime_http.v1",
          certification_fixture_client_ref: "payroll.provider_client.accounting.fixture.v1",
          required_route_config_refs: [
            "provider_package_ref",
            "accounting_journal_adapter.client_ref",
            "accounting_journal_adapter.endpoint_url",
            "accounting_journal_adapter.transport_ref",
            "accounting_journal_adapter.auth_scheme",
            "accounting_journal_adapter.company_ref",
            "accounting_journal_adapter.books_ref",
            "accounting_journal_adapter.posting_date",
            "accounting_journal_adapter.journal_operation_ref",
          ],
          certification_scenario_refs: [
            "tallyprime_http_journal_import_posted",
            "tallyprime_http_period_closed",
            "tallyprime_http_idempotent_replay",
            "tallyprime_http_voucher_reconcile",
          ],
          evidence_path_refs: [
            "accounting_journal.provider_response.sdk_client.response_status_code",
            "accounting_journal.provider_response.sdk_client.response_body_checksum_sha256",
            "accounting_journal.provider_response.sdk_client.package_module_ref",
            "accounting_journal.voucher_refs",
            "accounting_journal.document_refs",
            "accounting_journal.evidence_refs",
          ],
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
        },
        capabilities: {
          package_module_ref: "payroll.provider_package_module.accounting.tallyprime_http.v1",
          vendor_profile_ref: "payroll.provider_vendor.accounting.tallyprime.v1",
          provider_contract_ref: "payroll.provider_contract.accounting.tallyprime_journal_import.v1",
          provider_kind: "accounting",
          adapter_ref: "payroll.provider_adapter.accounting.live_journal.v1",
          client_ref: "payroll.provider_client.accounting.tallyprime_http.v1",
          certification_fixture_client_ref: "payroll.provider_client.accounting.fixture.v1",
          supported_artifact_kinds: ["accounting_export"],
          supported_transport_modes: ["api", "file_export"],
          certification_scenario_count: 4,
          evidence_path_count: 6,
          required_route_config_count: 9,
          is_fixture_package: false,
          sandbox_ready: false,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
          storage_policy_ref_count: 1,
        },
      },
      {
        package_ref: "payroll.provider_package.statutory.sdk_http.v1",
        source_ref: "builtin",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        manifest: {
          package_profile_ref: "payroll.provider_package_manifest.statutory.sdk_http.v1",
          provider_kind: "statutory",
          adapter_ref: "payroll.provider_adapter.statutory.live_filing.v1",
          client_ref: "payroll.provider_client.statutory.sdk_http.v1",
          certification_fixture_client_ref: "payroll.provider_client.statutory.fixture.v1",
          required_route_config_refs: [
            "provider_package_ref",
            "statutory_filing_adapter.client_ref",
            "statutory_filing_adapter.endpoint_url",
            "statutory_filing_adapter.transport_ref",
            "statutory_filing_adapter.auth_scheme",
            "statutory_filing_adapter.authority_ref",
            "statutory_filing_adapter.registration_ref",
            "statutory_filing_adapter.filing_type_ref",
          ],
          certification_scenario_refs: [
            "statutory_sdk_http_receipt",
            "statutory_sdk_http_schema_rejected",
            "statutory_sdk_http_idempotent_replay",
          ],
          evidence_path_refs: [
            "statutory_filing.provider_response.sdk_client.response_status_code",
            "statutory_filing.receipt_refs",
            "statutory_filing.challan_refs",
            "statutory_filing.acknowledgement_refs",
            "statutory_filing.evidence_refs",
          ],
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
        },
        capabilities: {
          provider_kind: "statutory",
          adapter_ref: "payroll.provider_adapter.statutory.live_filing.v1",
          client_ref: "payroll.provider_client.statutory.sdk_http.v1",
          certification_fixture_client_ref: "payroll.provider_client.statutory.fixture.v1",
          supported_artifact_kinds: ["statutory_report"],
          supported_transport_modes: ["api", "portal_automation"],
          certification_scenario_count: 3,
          evidence_path_count: 5,
          required_route_config_count: 8,
          is_fixture_package: false,
          sandbox_ready: false,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
          storage_policy_ref_count: 1,
        },
      },
      {
        package_ref: "payroll.provider_package.statutory.epfo_ecr_http.v1",
        source_ref: "builtin",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        manifest: {
          package_profile_ref: "payroll.provider_package_manifest.statutory.epfo_ecr_http.v1",
          package_module_ref: "payroll.provider_package_module.statutory.epfo_ecr_http.v1",
          vendor_profile_ref: "payroll.provider_vendor.statutory.epfo.v1",
          provider_contract_ref: "payroll.provider_contract.statutory.epfo_ecr_upload.v1",
          provider_kind: "statutory",
          adapter_ref: "payroll.provider_adapter.statutory.live_filing.v1",
          client_ref: "payroll.provider_client.statutory.epfo_ecr_http.v1",
          certification_fixture_client_ref: "payroll.provider_client.statutory.fixture.v1",
          required_route_config_refs: [
            "provider_package_ref",
            "statutory_filing_adapter.client_ref",
            "statutory_filing_adapter.endpoint_url",
            "statutory_filing_adapter.transport_ref",
            "statutory_filing_adapter.auth_scheme",
            "statutory_filing_adapter.authority_ref",
            "statutory_filing_adapter.registration_ref",
            "statutory_filing_adapter.filing_type_ref",
            "statutory_filing_adapter.filing_calendar_ref",
          ],
          certification_scenario_refs: [
            "epfo_ecr_http_receipt",
            "epfo_ecr_http_challan_generated",
            "epfo_ecr_http_schema_rejected",
            "epfo_ecr_http_idempotent_replay",
          ],
          evidence_path_refs: [
            "statutory_filing.provider_response.sdk_client.response_status_code",
            "statutory_filing.provider_response.sdk_client.response_body_checksum_sha256",
            "statutory_filing.provider_response.sdk_client.package_module_ref",
            "statutory_filing.receipt_refs",
            "statutory_filing.challan_refs",
            "statutory_filing.acknowledgement_refs",
            "statutory_filing.evidence_refs",
          ],
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
        },
        capabilities: {
          package_module_ref: "payroll.provider_package_module.statutory.epfo_ecr_http.v1",
          vendor_profile_ref: "payroll.provider_vendor.statutory.epfo.v1",
          provider_contract_ref: "payroll.provider_contract.statutory.epfo_ecr_upload.v1",
          provider_kind: "statutory",
          adapter_ref: "payroll.provider_adapter.statutory.live_filing.v1",
          client_ref: "payroll.provider_client.statutory.epfo_ecr_http.v1",
          certification_fixture_client_ref: "payroll.provider_client.statutory.fixture.v1",
          supported_artifact_kinds: ["statutory_report"],
          supported_transport_modes: ["api", "portal_automation"],
          certification_scenario_count: 4,
          evidence_path_count: 7,
          required_route_config_count: 9,
          is_fixture_package: false,
          sandbox_ready: false,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
          storage_policy_ref_count: 1,
        },
      },
      {
        package_ref: "payroll.provider_package.statutory.fixture.v1",
        source_ref: "builtin",
        status: "ready",
        required_by_connection: false,
        blocking_gate_refs: [],
        manifest: {
          package_profile_ref: "payroll.provider_package_manifest.statutory.fixture.v1",
          provider_kind: "statutory",
          adapter_ref: "payroll.provider_adapter.statutory.live_filing.v1",
          client_ref: "payroll.provider_client.statutory.fixture.v1",
          required_route_config_refs: ["statutory_filing_adapter.client_ref", "statutory_filing_adapter.authority_ref", "statutory_filing_adapter.registration_ref", "statutory_filing_adapter.filing_type_ref"],
          certification_scenario_refs: ["statutory_filing_receipt", "statutory_filing_schema_rejected", "statutory_filing_idempotent_replay"],
          evidence_path_refs: ["statutory_filing.receipt_refs", "statutory_filing.challan_refs", "statutory_filing.acknowledgement_refs", "statutory_filing.evidence_refs"],
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
        },
        capabilities: {
          provider_kind: "statutory",
          adapter_ref: "payroll.provider_adapter.statutory.live_filing.v1",
          client_ref: "payroll.provider_client.statutory.fixture.v1",
          certification_fixture_client_ref: "payroll.provider_client.statutory.fixture.v1",
          supported_artifact_kinds: ["statutory_report"],
          supported_transport_modes: ["api", "portal_automation"],
          certification_scenario_count: 3,
          evidence_path_count: 4,
          required_route_config_count: 4,
          is_fixture_package: true,
          sandbox_ready: true,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
          storage_policy_ref_count: 1,
        },
      },
      {
        package_ref: "tenant.bank.live-sdk.package.v1",
        source_ref: "settings.PAYROLL_PROVIDER_PACKAGES",
        status: "ready",
        required_by_connection: true,
        blocking_gate_refs: [],
        manifest: {
          package_profile_ref: "tenant.provider_package_manifest.bank.live.v1",
          provider_kind: "bank",
          adapter_ref: "payroll.provider_adapter.bank.live_payout.v1",
          client_ref: "tenant.bank.live-sdk.client.v1",
          certification_fixture_client_ref: "payroll.provider_client.bank.fixture.v1",
          required_route_config_refs: ["bank_payout_adapter.client_ref", "bank_payout_adapter.debit_account_ref", "bank_payout_adapter.payment_date"],
          certification_scenario_refs: ["bank_payout_acknowledged", "bank_payout_partial_acceptance", "bank_payout_idempotent_replay"],
          evidence_path_refs: ["bank_payout.utr_refs", "bank_payout.transaction_refs", "bank_payout.evidence_refs"],
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
        },
        capabilities: {
          provider_kind: "bank",
          adapter_ref: "payroll.provider_adapter.bank.live_payout.v1",
          client_ref: "tenant.bank.live-sdk.client.v1",
          certification_fixture_client_ref: "payroll.provider_client.bank.fixture.v1",
          supported_artifact_kinds: ["bank_advice"],
          supported_transport_modes: ["api"],
          certification_scenario_count: 3,
          evidence_path_count: 3,
          required_route_config_count: 3,
          is_fixture_package: false,
          sandbox_ready: true,
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
          storage_policy_refs: ["payroll.storage.policy.default.v1"],
          storage_policy_ref_count: 1,
        },
      },
    ];
    const packageRegistry = {
      registry_profile_ref: "payroll.provider_package_registry.readiness.v1",
      package_count: packageRegistryPackages.length,
      ready_package_count: packageRegistryPackages.filter((item) => item.status === "ready").length,
      blocked_package_count: packageRegistryPackages.filter((item) => item.status !== "ready").length,
      configured_package_count: packageRegistryPackages.filter((item) => item.source_ref === "settings.PAYROLL_PROVIDER_PACKAGES").length,
      builtin_package_count: packageRegistryPackages.filter((item) => item.source_ref === "builtin").length,
      fixture_package_count: packageRegistryPackages.filter((item) => Boolean(item.capabilities.is_fixture_package)).length,
      required_package_count: packageRegistryPackages.filter((item) => item.required_by_connection).length,
      blocked_package_refs: packageRegistryPackages.filter((item) => item.status !== "ready").map((item) => item.package_ref),
      packages: packageRegistryPackages,
    };
    const storagePolicyRegistryPolicies = [
      {
        storage_policy_ref: "payroll.storage.policy.default.v1",
        source_ref: "builtin",
        status: "ready",
        required_by_package: true,
        blocking_gate_refs: [],
        policy: {
          storage_policy_ref: "payroll.storage.policy.default.v1",
          enabled: true,
          allowed_provider_families: [],
          allowed_provider_refs: [],
          allowed_credential_refs: [],
          allowed_bucket_names: [],
          allowed_container_names: [],
          allowed_retention_policy_refs: [],
          allowed_encryption_refs: [],
          allowed_endpoint_hosts: [],
          required_key_prefix: "",
          require_encryption_ref: false,
          require_private_endpoint: false,
          require_runtime_credentials: false,
          lifecycle_policy_ref: "",
          malware_scan_profile_ref: "",
          durability_policy_ref: "",
          metadata: {},
        },
        control_verification: {
          verification_profile_ref: "payroll.storage_control_verification.v1",
          verification_mode: "declaration",
          status: "ready",
          control_count: 0,
          verified_control_count: 0,
          blocked_control_count: 0,
          blocked_control_refs: [],
          controls: [],
        },
        capabilities: {
          allowed_provider_family_count: 0,
          allowed_provider_ref_count: 0,
          allowed_credential_ref_count: 0,
          allowed_bucket_count: 0,
          allowed_container_count: 0,
          allowed_retention_policy_count: 0,
          allowed_encryption_ref_count: 0,
          allowed_endpoint_host_count: 0,
          requires_encryption_ref: false,
          requires_private_endpoint: false,
          requires_runtime_credentials: false,
          requires_lifecycle_policy: false,
          requires_malware_scan: false,
          requires_durability_policy: false,
          max_file_size_bytes: 0,
          control_verification_count: 0,
          verified_control_count: 0,
          blocked_control_count: 0,
          secret_material_policy_ref: "payroll.storage_secret_material.reference_only.v1",
        },
      },
      {
        storage_policy_ref: "payroll.storage.policy.strict-runtime.v1",
        source_ref: "settings.PAYROLL_ARTIFACT_STORAGE_POLICIES",
        status: "ready",
        required_by_package: false,
        blocking_gate_refs: [],
        policy: {
          storage_policy_ref: "payroll.storage.policy.strict-runtime.v1",
          enabled: true,
          allowed_provider_families: ["s3"],
          allowed_provider_refs: ["payroll.storage.s3.private.v1"],
          allowed_credential_refs: ["tenant:northstar:secret/payroll-s3-runtime"],
          allowed_bucket_names: ["tenant-payroll-private"],
          allowed_retention_policy_refs: ["payroll.retention.10y.v1"],
          allowed_encryption_refs: ["tenant-managed-kms/payroll"],
          allowed_endpoint_hosts: ["tenant-payroll-private.s3.ap-south-1.amazonaws.com"],
          required_key_prefix: "tenant-payroll",
          require_encryption_ref: true,
          require_private_endpoint: true,
          require_runtime_credentials: true,
          lifecycle_policy_ref: "payroll.lifecycle.retention.10y.v1",
          malware_scan_profile_ref: "payroll.malware.scan.sync.v1",
          durability_policy_ref: "payroll.durability.multi-region.v1",
          metadata: { iam_policy_ref: "tenant-payroll-artifact-writer" },
        },
        control_verification: {
          verification_profile_ref: "payroll.storage_control_verification.strict.v1",
          verification_mode: "strict",
          status: "ready",
          control_count: 5,
          verified_control_count: 5,
          blocked_control_count: 0,
          blocked_control_refs: [],
          controls: [
            { control_kind: "kms_encryption", control_ref: "tenant-managed-kms/payroll", status: "verified", verified: true },
            { control_kind: "lifecycle", control_ref: "payroll.lifecycle.retention.10y.v1", status: "verified", verified: true },
            { control_kind: "malware_scan", control_ref: "payroll.malware.scan.sync.v1", status: "verified", verified: true },
            { control_kind: "durability", control_ref: "payroll.durability.multi-region.v1", status: "verified", verified: true },
            { control_kind: "iam", control_ref: "tenant-payroll-artifact-writer", status: "verified", verified: true },
          ],
        },
        capabilities: {
          allowed_provider_family_count: 1,
          allowed_provider_ref_count: 1,
          allowed_credential_ref_count: 1,
          allowed_bucket_count: 1,
          allowed_container_count: 0,
          allowed_retention_policy_count: 1,
          allowed_encryption_ref_count: 1,
          allowed_endpoint_host_count: 1,
          requires_encryption_ref: true,
          requires_private_endpoint: true,
          requires_runtime_credentials: true,
          requires_lifecycle_policy: true,
          requires_malware_scan: true,
          requires_durability_policy: true,
          max_file_size_bytes: 100000,
          control_verification_count: 5,
          verified_control_count: 5,
          blocked_control_count: 0,
          secret_material_policy_ref: "payroll.storage_secret_material.reference_only.v1",
        },
      },
      {
        storage_policy_ref: "payroll.storage.policy.disabled.v1",
        source_ref: "settings.PAYROLL_ARTIFACT_STORAGE_POLICIES",
        status: "blocked",
        required_by_package: false,
        blocking_gate_refs: ["storage_policy_disabled", "raw_storage_credentials_not_allowed"],
        policy: {
          storage_policy_ref: "payroll.storage.policy.disabled.v1",
          enabled: false,
          metadata: { secret_key: "[redacted]" },
        },
        control_verification: {
          verification_profile_ref: "payroll.storage_control_verification.v1",
          verification_mode: "strict",
          status: "blocked",
          control_count: 1,
          verified_control_count: 0,
          blocked_control_count: 1,
          blocked_control_refs: ["payroll.malware.scan.failed.v1"],
          controls: [
            {
              control_kind: "malware_scan",
              control_ref: "payroll.malware.scan.failed.v1",
              status: "blocked",
              verified: false,
              failure_code: "malware_scan_profile_unavailable",
              evidence_snapshot: { secret_key: "[redacted]" },
            },
          ],
        },
        capabilities: {
          allowed_provider_family_count: 0,
          allowed_provider_ref_count: 0,
          allowed_credential_ref_count: 0,
          allowed_bucket_count: 0,
          allowed_container_count: 0,
          allowed_retention_policy_count: 0,
          allowed_encryption_ref_count: 0,
          allowed_endpoint_host_count: 0,
          requires_encryption_ref: false,
          requires_private_endpoint: false,
          requires_runtime_credentials: false,
          requires_lifecycle_policy: false,
          requires_malware_scan: false,
          requires_durability_policy: false,
          max_file_size_bytes: 0,
          control_verification_count: 1,
          verified_control_count: 0,
          blocked_control_count: 1,
          secret_material_policy_ref: "payroll.storage_secret_material.reference_only.v1",
        },
      },
    ];
    const storagePolicyRegistry = {
      registry_profile_ref: "payroll.storage_policy_registry.readiness.v1",
      storage_policy_count: storagePolicyRegistryPolicies.length,
      ready_storage_policy_count: storagePolicyRegistryPolicies.filter((item) => item.status === "ready").length,
      blocked_storage_policy_count: storagePolicyRegistryPolicies.filter((item) => item.status !== "ready").length,
      configured_storage_policy_count: storagePolicyRegistryPolicies.filter((item) => item.source_ref === "settings.PAYROLL_ARTIFACT_STORAGE_POLICIES").length,
      builtin_storage_policy_count: storagePolicyRegistryPolicies.filter((item) => item.source_ref === "builtin").length,
      required_storage_policy_count: storagePolicyRegistryPolicies.filter((item) => item.required_by_package).length,
      blocked_storage_policy_refs: storagePolicyRegistryPolicies.filter((item) => item.status !== "ready").map((item) => item.storage_policy_ref),
      policies: storagePolicyRegistryPolicies,
    };
    const launchRehearsalLanes = [
      {
        provider_kind: "bank",
        status: "blocked",
        connection_count: 1,
        launch_ready_connection_count: 1,
        route_count: 0,
        adapter_ref: "payroll.provider_adapter.bank.live_payout.v1",
        client_ref: "payroll.provider_client.bank.razorpayx_http.v1",
        package_ref: "payroll.provider_package.bank.razorpayx_http.v1",
        storage_policy_refs: ["payroll.storage.policy.default.v1"],
        blocked_storage_policy_refs: [],
        provider_connection_enforcement: "warn",
        package_module_ref: "payroll.provider_package_module.bank.razorpayx_http.v1",
        vendor_profile_ref: "payroll.provider_vendor.bank.razorpayx.v1",
        provider_contract_ref: "payroll.provider_contract.bank.razorpayx_payout.v1",
        blocking_gate_refs: ["provider_route_present", "finance_handoff_gate_enforced"],
      },
      {
        provider_kind: "accounting",
        status: "blocked",
        connection_count: 1,
        launch_ready_connection_count: 1,
        route_count: 0,
        adapter_ref: "payroll.provider_adapter.accounting.live_journal.v1",
        client_ref: "payroll.provider_client.accounting.tallyprime_http.v1",
        package_ref: "payroll.provider_package.accounting.tallyprime_http.v1",
        storage_policy_refs: ["payroll.storage.policy.default.v1"],
        blocked_storage_policy_refs: [],
        provider_connection_enforcement: "warn",
        package_module_ref: "payroll.provider_package_module.accounting.tallyprime_http.v1",
        vendor_profile_ref: "payroll.provider_vendor.accounting.tallyprime.v1",
        provider_contract_ref: "payroll.provider_contract.accounting.tallyprime_journal_import.v1",
        blocking_gate_refs: ["provider_route_present", "finance_handoff_gate_enforced"],
      },
      {
        provider_kind: "statutory",
        status: "blocked",
        connection_count: 1,
        launch_ready_connection_count: 0,
        route_count: 0,
        adapter_ref: "payroll.provider_adapter.statutory.live_filing.v1",
        client_ref: "payroll.provider_client.statutory.epfo_ecr_http.v1",
        package_ref: "payroll.provider_package.statutory.epfo_ecr_http.v1",
        storage_policy_refs: ["payroll.storage.policy.default.v1"],
        blocked_storage_policy_refs: [],
        provider_connection_enforcement: "certified",
        package_module_ref: "payroll.provider_package_module.statutory.epfo_ecr_http.v1",
        vendor_profile_ref: "payroll.provider_vendor.statutory.epfo.v1",
        provider_contract_ref: "payroll.provider_contract.statutory.epfo_ecr_upload.v1",
        blocking_gate_refs: ["provider_connection_launch_ready", "provider_route_present"],
      },
    ];
    const launchRehearsal = {
      rehearsal_profile_ref: "payroll.provider_launch_rehearsal.v1",
      status: "blocked",
      required_provider_kinds: ["bank", "accounting", "statutory"],
      lane_count: launchRehearsalLanes.length,
      ready_lane_count: launchRehearsalLanes.filter((item) => item.status === "ready").length,
      blocked_lane_count: launchRehearsalLanes.filter((item) => item.status !== "ready").length,
      required_package_count: launchRehearsalLanes.filter((item) => item.package_ref).length,
      ready_required_package_count: launchRehearsalLanes.filter((item) => item.package_ref && !item.blocking_gate_refs.includes("provider_package_ready")).length,
      launch_blocker_count: launchRehearsalLanes.reduce((count, item) => count + item.blocking_gate_refs.length, 0),
      launch_blocking_gate_refs: launchRehearsalLanes.flatMap((item) => item.blocking_gate_refs.map((gate) => `${item.provider_kind}:${gate}`)),
      registry_snapshot: {
        adapter_registry_status: "blocked",
        client_registry_status: "blocked",
        package_registry_status: packageRegistry.blocked_package_count ? "blocked" : "ready",
        storage_policy_registry_status: storagePolicyRegistry.blocked_storage_policy_count ? "blocked" : "ready",
      },
      lanes: launchRehearsalLanes,
    };
    const launchRehearsalRuns = [
      {
        id: "launch-rehearsal-demo-001",
        rehearsal_profile_ref: "payroll.provider_launch_rehearsal.v1",
        audit_pack_ref: "payroll.provider_launch_readiness.audit_pack.v1",
        generated_by_ref: "hr_admin.payroll_providers.launch_rehearsal.v1",
        status: "blocked",
        status_label: "Blocked",
        can_launch: false,
        ready_lane_count: launchRehearsal.ready_lane_count,
        blocked_lane_count: launchRehearsal.blocked_lane_count,
        launch_blocker_count: launchRehearsal.launch_blocker_count,
        release_blocker_refs: launchRehearsal.launch_blocking_gate_refs,
        audit_pack_snapshot: {
          audit_pack_ref: "payroll.provider_launch_readiness.audit_pack.v1",
          status: "blocked",
          can_launch: false,
          summary: {
            ready_lane_count: launchRehearsal.ready_lane_count,
            blocked_lane_count: launchRehearsal.blocked_lane_count,
            launch_blocker_count: launchRehearsal.launch_blocker_count,
          },
          release_blockers: launchRehearsal.launch_blocking_gate_refs.map((ref) => ({ ref })),
          evidence_checksum_sha256: "a42e4db8a107af213d779cab931bfde4524719730fd07d279d03245c618d03d2",
        },
        evidence_checksum_sha256: "a42e4db8a107af213d779cab931bfde4524719730fd07d279d03245c618d03d2",
        generated_at: "2026-09-07T09:45:00+05:30",
        generated_by_name: "Nisha Rao",
        source_hash: "c08f81839955b4c9a7c1854748e7f438f9613fb2d2ea6b23c80ac0c771a7a35b",
        created_at: "2026-09-07T09:45:00+05:30",
        updated_at: "2026-09-07T09:45:00+05:30",
      },
    ];
    return {
      summary: {
        connection_count: connections.length,
        active_connection_count: connections.filter((item) => item.status === "active").length,
        certified_connection_count: connections.filter((item) => item.certification_status === "passed").length,
        sandbox_ready_connection_count: connections.filter((item) => item.status === "sandbox_ready").length,
        blocked_connection_count: connections.filter((item) => item.status === "blocked").length,
        credential_required_count: connections.filter((item) => item.credential_required).length,
        active_allowed_count: connections.filter((item) => item.readiness_snapshot.active_allowed).length,
        certification_run_count: certificationRuns.length,
        passed_certification_run_count: certificationRuns.filter((item) => item.status === "passed").length,
        failed_certification_run_count: certificationRuns.filter((item) => item.status === "failed").length,
        schema_mapping_pack_count: schemaMappingPacks.length,
        active_schema_mapping_pack_count: schemaMappingPacks.filter((item) => item.status === "active").length,
        draft_schema_mapping_pack_count: schemaMappingPacks.filter((item) => item.status === "draft").length,
        archived_schema_mapping_pack_count: schemaMappingPacks.filter((item) => item.status === "archived").length,
        strict_schema_mapping_pack_count: schemaMappingPacks.filter((item) => item.enforcement_mode === "strict").length,
        schema_mapping_simulation_count: schemaMappingSimulations.length,
        passed_schema_mapping_simulation_count: schemaMappingSimulations.filter((item) => item.status === "passed").length,
        blocked_schema_mapping_simulation_count: schemaMappingSimulations.filter((item) => item.status === "blocked").length,
        changed_schema_mapping_simulation_count: schemaMappingSimulations.filter((item) => item.comparison_status === "changed").length,
        adapter_registry_count: adapterRegistry.adapter_count,
        ready_adapter_registry_count: adapterRegistry.ready_adapter_count,
        blocked_adapter_registry_count: adapterRegistry.blocked_adapter_count,
        configured_adapter_registry_count: adapterRegistry.configured_adapter_count,
        production_pack_adapter_registry_count: adapterRegistry.production_pack_adapter_count,
        client_registry_count: clientRegistry.client_count,
        ready_client_registry_count: clientRegistry.ready_client_count,
        blocked_client_registry_count: clientRegistry.blocked_client_count,
        configured_client_registry_count: clientRegistry.configured_client_count,
        fixture_client_registry_count: clientRegistry.fixture_client_count,
        package_registry_count: packageRegistry.package_count,
        ready_package_registry_count: packageRegistry.ready_package_count,
        blocked_package_registry_count: packageRegistry.blocked_package_count,
        configured_package_registry_count: packageRegistry.configured_package_count,
        fixture_package_registry_count: packageRegistry.fixture_package_count,
        storage_policy_registry_count: storagePolicyRegistry.storage_policy_count,
        ready_storage_policy_registry_count: storagePolicyRegistry.ready_storage_policy_count,
        blocked_storage_policy_registry_count: storagePolicyRegistry.blocked_storage_policy_count,
        configured_storage_policy_registry_count: storagePolicyRegistry.configured_storage_policy_count,
        required_storage_policy_registry_count: storagePolicyRegistry.required_storage_policy_count,
        launch_rehearsal_status: launchRehearsal.status,
        launch_rehearsal_ready_lane_count: launchRehearsal.ready_lane_count,
        launch_rehearsal_blocked_lane_count: launchRehearsal.blocked_lane_count,
        launch_rehearsal_blocker_count: launchRehearsal.launch_blocker_count,
        launch_rehearsal_run_count: launchRehearsalRuns.length,
        ready_launch_rehearsal_run_count: launchRehearsalRuns.filter((item) => item.status === "ready").length,
        blocked_launch_rehearsal_run_count: launchRehearsalRuns.filter((item) => item.status === "blocked").length,
        latest_launch_rehearsal_status: launchRehearsalRuns[0]?.status ?? "",
        latest_launch_rehearsal_checksum: launchRehearsalRuns[0]?.evidence_checksum_sha256 ?? "",
        bank_connection_count: connections.filter((item) => item.provider_kind === "bank").length,
        accounting_connection_count: connections.filter((item) => item.provider_kind === "accounting").length,
        statutory_connection_count: connections.filter((item) => item.provider_kind === "statutory").length,
      },
      connections,
      certification_runs: certificationRuns,
      schema_mapping_packs: schemaMappingPacks,
      schema_mapping_simulations: schemaMappingSimulations,
      launch_rehearsals: launchRehearsalRuns,
      adapter_registry: adapterRegistry,
      client_registry: clientRegistry,
      package_registry: packageRegistry,
      storage_policy_registry: storagePolicyRegistry,
      launch_rehearsal: launchRehearsal,
      options: {
        provider_kinds: [
          { value: "bank", label: "Bank" },
          { value: "accounting", label: "Accounting" },
          { value: "statutory", label: "Statutory" },
          { value: "other", label: "Other" },
        ],
        connection_statuses: [
          { value: "draft", label: "Draft" },
          { value: "configured", label: "Configured" },
          { value: "sandbox_ready", label: "Sandbox Ready" },
          { value: "certified", label: "Certified" },
          { value: "active", label: "Active" },
          { value: "blocked", label: "Blocked" },
          { value: "archived", label: "Archived" },
        ],
        certification_statuses: [
          { value: "not_started", label: "Not Started" },
          { value: "pending", label: "Pending" },
          { value: "passed", label: "Passed" },
          { value: "failed", label: "Failed" },
          { value: "expired", label: "Expired" },
        ],
        certification_run_statuses: [
          { value: "queued", label: "Queued" },
          { value: "running", label: "Running" },
          { value: "passed", label: "Passed" },
          { value: "failed", label: "Failed" },
          { value: "skipped", label: "Skipped" },
        ],
        schema_mapping_pack_statuses: [
          { value: "draft", label: "Draft" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
          { value: "archived", label: "Archived" },
        ],
        launch_rehearsal_statuses: [
          { value: "ready", label: "Ready" },
          { value: "blocked", label: "Blocked" },
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
    const statutoryFilingRows = statutoryRows.map((row) => ({
      ...row,
      filing_calendar_code: "mh-pt-aug-2026",
      filing_type_ref: "india.pt.mh.monthly.return.v1",
      statutory_component_code: String(row.component_code ?? "").toLowerCase().replaceAll("_", "-"),
      employer_registration_number: "PTRC-2712-2026",
      authority_ref: "india.maharashtra.professional-tax.v1",
      provider_ref: "clear-statutory.portal.v1",
    }));
    const netPay = payslips.reduce((total, artifact) => total + Number(artifact.totals_snapshot.net_pay ?? 0), 0);
    const deductions = payslips.reduce((total, artifact) => total + Number(artifact.totals_snapshot.employee_deductions ?? 0), 0);
    const gross = payslips.reduce((total, artifact) => total + Number(artifact.totals_snapshot.gross_earnings ?? 0), 0);
    const statutoryFilingTotal = statutoryFilingRows.reduce((total, row) => total + Number(row.amount ?? 0), 0);
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
        storage_object_version: "local-bank-advice-v1",
        mime_type: "text/csv",
        file_size_bytes: 6240,
        checksum_sha256: "bf87118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
        is_downloadable: true,
        download_strategy_ref: "payroll.download.stream.local.v1",
        supports_signed_url: false,
        signed_url_expires_in_seconds: 900,
        retention_policy_ref: "payroll.retention.7y.v1",
        download_url: "/api/v1/hr-admin/payroll-output-artifacts/payhandoff-bank-advice-aug-2026-core/download/",
        signed_download_url: null,
        signed_download_expires_at: null,
        output_profile_ref: bankFileProfileRef,
        totals_snapshot: { net_pay: netPay.toFixed(2), employee_count: payslips.length },
        line_snapshot: bankRows,
        access_summary: buildDemoPayrollAccessSummary(),
        access_events: buildDemoPayrollAccessEvents({
          artifactId: "payhandoff-bank-advice-aug-2026-core",
          checksum: "bf87118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
          storageObjectVersion: "local-bank-advice-v1",
          storageProviderRef: "payroll.storage.local.generated.v1",
          downloadStrategyRef: "payroll.download.stream.local.v1",
          now,
        }),
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
        storage_object_version: "local-accounting-export-v1",
        mime_type: "text/csv",
        file_size_bytes: 8144,
        checksum_sha256: "ac77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
        is_downloadable: true,
        download_strategy_ref: "payroll.download.stream.local.v1",
        supports_signed_url: false,
        signed_url_expires_in_seconds: 900,
        retention_policy_ref: "payroll.retention.7y.v1",
        download_url: "/api/v1/hr-admin/payroll-output-artifacts/payhandoff-accounting-export-aug-2026-core/download/",
        signed_download_url: null,
        signed_download_expires_at: null,
        output_profile_ref: accountingExportProfileRef,
        totals_snapshot: { gross_earnings: gross.toFixed(2), employee_deductions: deductions.toFixed(2), net_pay: netPay.toFixed(2), employee_count: payslips.length },
        line_snapshot: accountingRows,
        access_summary: buildDemoPayrollAccessSummary(),
        access_events: buildDemoPayrollAccessEvents({
          artifactId: "payhandoff-accounting-export-aug-2026-core",
          checksum: "ac77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
          storageObjectVersion: "local-accounting-export-v1",
          storageProviderRef: "payroll.storage.local.generated.v1",
          downloadStrategyRef: "payroll.download.stream.local.v1",
          now,
        }),
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
        storage_object_version: "local-statutory-report-v1",
        mime_type: "text/csv",
        file_size_bytes: 5368,
        checksum_sha256: "cd77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
        is_downloadable: true,
        download_strategy_ref: "payroll.download.stream.local.v1",
        supports_signed_url: false,
        signed_url_expires_in_seconds: 900,
        retention_policy_ref: "payroll.retention.7y.v1",
        download_url: "/api/v1/hr-admin/payroll-output-artifacts/payhandoff-statutory-report-aug-2026-core/download/",
        signed_download_url: null,
        signed_download_expires_at: null,
        output_profile_ref: statutoryPackRef,
        totals_snapshot: { statutory_total: deductions.toFixed(2), line_count: statutoryRows.length },
        line_snapshot: statutoryRows,
        access_summary: buildDemoPayrollAccessSummary(),
        access_events: buildDemoPayrollAccessEvents({
          artifactId: "payhandoff-statutory-report-aug-2026-core",
          checksum: "cd77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
          storageObjectVersion: "local-statutory-report-v1",
          storageProviderRef: "payroll.storage.local.generated.v1",
          downloadStrategyRef: "payroll.download.stream.local.v1",
          now,
        }),
        source_hash: "cd77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
        published_at: now,
        published_by_name: "Nisha Rao",
        config_snapshot: { handoff_id: handoffId, handoff_profile_ref: handoffProfileRef, return_pack_ref: statutoryPackRef },
        created_at: now,
        updated_at: now,
      },
      {
        id: "payhandoff-mh-pt-return-aug-2026-core",
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
        artifact_key: "finance:aug-2026-core:mh-pt-return",
        title: "Maharashtra PT August 2026 Return",
        file_name: "aug-2026-core-mh-pt-return.csv",
        content_type: "text/csv",
        storage_provider_ref: "payroll.storage.local.generated.v1",
        storage_key: `payroll/aug-2026-core/${handoffProfileRef}/statutory_report/aug-2026-core-mh-pt-return.csv`,
        storage_object_version: "local-mh-pt-return-v1",
        mime_type: "text/csv",
        file_size_bytes: 4824,
        checksum_sha256: "de77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
        is_downloadable: true,
        download_strategy_ref: "payroll.download.stream.local.v1",
        supports_signed_url: false,
        signed_url_expires_in_seconds: 900,
        retention_policy_ref: "payroll.retention.7y.v1",
        download_url: "/api/v1/hr-admin/payroll-output-artifacts/payhandoff-mh-pt-return-aug-2026-core/download/",
        signed_download_url: null,
        signed_download_expires_at: null,
        output_profile_ref: "india.pt.mh.return.file.v1",
        totals_snapshot: { statutory_total: statutoryFilingTotal.toFixed(2), line_count: statutoryFilingRows.length },
        line_snapshot: statutoryFilingRows,
        access_summary: buildDemoPayrollAccessSummary(),
        access_events: buildDemoPayrollAccessEvents({
          artifactId: "payhandoff-mh-pt-return-aug-2026-core",
          checksum: "de77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
          storageObjectVersion: "local-mh-pt-return-v1",
          storageProviderRef: "payroll.storage.local.generated.v1",
          downloadStrategyRef: "payroll.download.stream.local.v1",
          now,
        }),
        source_hash: "de77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
        published_at: now,
        published_by_name: "Nisha Rao",
        config_snapshot: {
          handoff_id: handoffId,
          handoff_profile_ref: handoffProfileRef,
          artifact_subtype: "statutory_return",
          statutory_filing_calendar_id: "payroll-statutory-filing-mh-pt-aug-2026",
          statutory_filing_calendar_code: "mh-pt-aug-2026",
          employer_registration_id: "payroll-statutory-registration-mh-pt",
          employer_registration_number: "PTRC-2712-2026",
          filing_type_ref: "india.pt.mh.monthly.return.v1",
          filing_authority_ref: "india.maharashtra.professional-tax.v1",
          provider_ref: "clear-statutory.portal.v1",
          output_profile_ref: "india.pt.mh.return.file.v1",
          source_hashes: statutoryFilingRows.map((row) => row.source_hash),
        },
        created_at: now,
        updated_at: now,
      },
      {
        id: "payhandoff-mh-pt-challan-aug-2026-core",
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
        artifact_key: "finance:aug-2026-core:mh-pt-challan",
        title: "Maharashtra PT August 2026 Challan",
        file_name: "aug-2026-core-mh-pt-challan.csv",
        content_type: "text/csv",
        storage_provider_ref: "payroll.storage.local.generated.v1",
        storage_key: `payroll/aug-2026-core/${handoffProfileRef}/statutory_report/aug-2026-core-mh-pt-challan.csv`,
        storage_object_version: "local-mh-pt-challan-v1",
        mime_type: "text/csv",
        file_size_bytes: 2148,
        checksum_sha256: "ef77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
        is_downloadable: true,
        download_strategy_ref: "payroll.download.stream.local.v1",
        supports_signed_url: false,
        signed_url_expires_in_seconds: 900,
        retention_policy_ref: "payroll.retention.7y.v1",
        download_url: "/api/v1/hr-admin/payroll-output-artifacts/payhandoff-mh-pt-challan-aug-2026-core/download/",
        signed_download_url: null,
        signed_download_expires_at: null,
        output_profile_ref: "india.pt.mh.challan.file.v1",
        totals_snapshot: { statutory_total: statutoryFilingTotal.toFixed(2), line_count: 1 },
        line_snapshot: [{
          filing_calendar_code: "mh-pt-aug-2026",
          filing_type_ref: "india.pt.mh.monthly.return.v1",
          employer_registration_number: "PTRC-2712-2026",
          authority_ref: "india.maharashtra.professional-tax.v1",
          provider_ref: "clear-statutory.portal.v1",
          payable_amount: statutoryFilingTotal.toFixed(2),
          source_row_count: statutoryFilingRows.length,
          source_hashes: statutoryFilingRows.map((row) => row.source_hash),
        }],
        access_summary: buildDemoPayrollAccessSummary(),
        access_events: buildDemoPayrollAccessEvents({
          artifactId: "payhandoff-mh-pt-challan-aug-2026-core",
          checksum: "ef77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
          storageObjectVersion: "local-mh-pt-challan-v1",
          storageProviderRef: "payroll.storage.local.generated.v1",
          downloadStrategyRef: "payroll.download.stream.local.v1",
          now,
        }),
        source_hash: "ef77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
        published_at: now,
        published_by_name: "Nisha Rao",
        config_snapshot: {
          handoff_id: handoffId,
          handoff_profile_ref: handoffProfileRef,
          artifact_subtype: "statutory_challan",
          statutory_filing_calendar_id: "payroll-statutory-filing-mh-pt-aug-2026",
          statutory_filing_calendar_code: "mh-pt-aug-2026",
          employer_registration_id: "payroll-statutory-registration-mh-pt",
          employer_registration_number: "PTRC-2712-2026",
          filing_type_ref: "india.pt.mh.monthly.return.v1",
          filing_authority_ref: "india.maharashtra.professional-tax.v1",
          provider_ref: "clear-statutory.portal.v1",
          output_profile_ref: "india.pt.mh.challan.file.v1",
          source_hashes: statutoryFilingRows.map((row) => row.source_hash),
        },
        created_at: now,
        updated_at: now,
      },
    ];
    const deliveryRoutes: Record<string, Record<string, string | boolean | Record<string, unknown>>> = {
      bank_advice: {
        provider_ref: "payroll.provider.bank.live.v1",
        channel_ref: "payroll.channel.bank.live-api.v1",
        retry_policy_ref: "payroll.delivery.retry.bank.v1",
        adapter_ref: "payroll.provider_adapter.bank.live_payout.v1",
        submission_mode: "api",
        submission_profile_ref: "bank.live.neft.submit.v1",
        request_schema_ref: "bank.live.neft.request.v1",
        response_schema_ref: "bank.live.neft.response.v1",
        callback_profile_ref: "bank.live.callback.v1",
        callback_verification_ref: "bank.live.callback.hmac.v1",
        credential_ref: "tenant.bank-live.runtime.v1",
        credential_required: true,
        credential_profile_ref: "bank.credentials.live.v1",
        bank_payout_adapter: {
          adapter_profile_ref: "bank.live.payout.profile.v1",
          client_ref: "tenant.bank.live-sdk.client.v1",
          payout_profile_ref: "bank.live.neft.payout.v1",
          payment_operation_ref: "bank.neft.bulk_payout.v1",
          payment_network_ref: "neft",
          debit_account_ref: "tenant.bank.debit_account.payroll.v1",
          payment_date: "2026-09-30",
          failure_taxonomy_ref: "bank.live.failure_taxonomy.v1",
          partial_acceptance_policy_ref: "payroll.bank_payout.partial_acceptance.review_required.v1",
          idempotency_strategy_ref: "payroll.bank_payout.idempotency.handoff_artifact_sha256.v1",
          checksum_policy_ref: "payroll.bank_payout.checksum.sha256_required.v1",
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
          requires_credential_ref: true,
          failure_categories: {
            BANK_TIMEOUT: "provider_timeout",
            DUPLICATE_BATCH: "duplicate_batch",
          },
        },
        certification_profile_ref: "bank-neft.utr.certificate.v1",
        certification_required: false,
      },
      accounting_export: {
        provider_ref: "payroll.provider.accounting.live.v1",
        channel_ref: "payroll.channel.accounting.live-api.v1",
        retry_policy_ref: "payroll.delivery.retry.standard.v1",
        adapter_ref: "payroll.provider_adapter.accounting.live_journal.v1",
        submission_mode: "api",
        submission_profile_ref: "accounting.live.journal.submit.v1",
        request_schema_ref: "accounting.live.journal.request.v1",
        response_schema_ref: "accounting.live.journal.response.v1",
        callback_profile_ref: "accounting.live.callback.manual.v1",
        callback_verification_ref: "accounting.live.callback.audit.v1",
        credential_ref: "tenant.accounting-live.runtime.v1",
        credential_required: true,
        credential_profile_ref: "accounting.credentials.live.v1",
        accounting_journal_adapter: {
          adapter_profile_ref: "accounting.live.journal.profile.v1",
          client_ref: "tenant.accounting.live-sdk.client.v1",
          ledger_profile_ref: "accounting.live.ledger.profile.v1",
          posting_profile_ref: "accounting.live.monthly-payroll.posting.v1",
          journal_operation_ref: "accounting.ledger.journal.post.v1",
          company_ref: "tenant.accounting.company.primary.v1",
          books_ref: "tenant.accounting.books.payroll.v1",
          posting_date: "2026-09-30",
          failure_taxonomy_ref: "accounting.live.failure_taxonomy.v1",
          balancing_policy_ref: "payroll.accounting_journal.balancing.required.v1",
          idempotency_strategy_ref: "payroll.accounting_journal.idempotency.handoff_artifact_sha256.v1",
          checksum_policy_ref: "payroll.accounting_journal.checksum.sha256_required.v1",
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
          requires_credential_ref: true,
          failure_categories: {
            LEDGER_TIMEOUT: "provider_timeout",
            PERIOD_CLOSED: "closed_period",
          },
        },
        certification_profile_ref: "tally.import.audit.v1",
        certification_required: false,
      },
      statutory_report: {
        provider_ref: "payroll.provider.statutory.live.v1",
        channel_ref: "payroll.channel.statutory.live-api.v1",
        retry_policy_ref: "payroll.delivery.retry.statutory.v1",
        adapter_ref: "payroll.provider_adapter.statutory.live_filing.v1",
        submission_mode: "api",
        submission_profile_ref: "statutory.live.epfo.ecr.submit.v1",
        request_schema_ref: "statutory.live.epfo.ecr.request.v1",
        response_schema_ref: "statutory.live.epfo.ecr.response.v1",
        callback_profile_ref: "statutory.live.callback.v1",
        callback_verification_ref: "statutory.live.callback.hmac.v1",
        credential_ref: "tenant.statutory-live.runtime.v1",
        credential_required: true,
        credential_profile_ref: "statutory.credentials.live.v1",
        statutory_filing_adapter: {
          adapter_profile_ref: "statutory.live.filing.profile.v1",
          client_ref: "tenant.statutory.live-sdk.client.v1",
          filing_profile_ref: "statutory.live.epfo.ecr.profile.v1",
          filing_operation_ref: "statutory.epfo.ecr.upload.v1",
          filing_type_ref: "india.epfo.ecr.monthly.v1",
          authority_ref: "india.epfo.portal.v1",
          registration_ref: "EPFO-MH-ACME-001",
          filing_calendar_ref: "epfo-aug-2026",
          due_date: "2026-09-15",
          failure_taxonomy_ref: "statutory.live.failure_taxonomy.v1",
          receipt_policy_ref: "payroll.statutory_filing.receipt.required.v1",
          idempotency_strategy_ref: "payroll.statutory_filing.idempotency.handoff_artifact_sha256.v1",
          checksum_policy_ref: "payroll.statutory_filing.checksum.sha256_required.v1",
          secret_material_policy_ref: "payroll.provider_secret_material.reference_only.v1",
          requires_credential_ref: true,
          failure_categories: {
            PORTAL_TIMEOUT: "provider_timeout",
            INVALID_ECR: "schema_rejected",
          },
        },
        certification_profile_ref: "statutory.portal.receipt.v1",
        certification_required: true,
      },
      "statutory_report:statutory_return": {
        provider_ref: "clear-statutory.portal.v1",
        channel_ref: "clear-statutory.api.return.v1",
        retry_policy_ref: "payroll.delivery.retry.statutory.v1",
        adapter_ref: "clear-statutory.return.adapter.v1",
        submission_mode: "api",
        submission_profile_ref: "clear-statutory.pt.return.submit.v1",
        request_schema_ref: "clear-statutory.pt.return.request.v1",
        response_schema_ref: "clear-statutory.pt.return.response.v1",
        callback_profile_ref: "clear-statutory.callback.v1",
        callback_verification_ref: "clear-statutory.callback.hmac.v1",
        certification_profile_ref: "clear-statutory.pt.return.certificate.v1",
        certification_required: true,
      },
      "statutory_report:statutory_challan": {
        provider_ref: "clear-statutory.portal.v1",
        channel_ref: "clear-statutory.api.challan.v1",
        retry_policy_ref: "payroll.delivery.retry.statutory.v1",
        provider_connection_policy: {
          policy_ref: "payroll.provider_connection.policy.default.v1",
          enforcement_mode: "certified",
        },
        retry_policy: {
          max_attempts: 3,
          backoff_seconds: 900,
          failure_taxonomy_ref: "clear-statutory.failure.taxonomy.v1",
          failure_categories: {
            CLEAR_TIMEOUT: "transient_gateway",
          },
        },
        execution_adapter: {
          worker_profile_ref: "clear-statutory.retry.worker.v1",
          adapter_ref: "payroll.provider_adapter.statutory.sandbox.v1",
          execution_mode: "manual_requeue",
          execution_strategy_ref: "clear-statutory.challan.retry.manual.v1",
          dispatch_mode: "submitted_then_callback",
        },
        adapter_ref: "payroll.provider_adapter.statutory.sandbox.v1",
        submission_mode: "api",
        submission_profile_ref: "clear-statutory.pt.challan.submit.v1",
        request_schema_ref: "clear-statutory.pt.challan.request.v1",
        response_schema_ref: "clear-statutory.pt.challan.response.v1",
        callback_profile_ref: "clear-statutory.callback.v1",
        callback_verification_ref: "clear-statutory.callback.hmac.v1",
        credential_ref: "clear-statutory-sandbox-credential",
        credential_required: true,
        credential_profile_ref: "clear-statutory.credentials.sandbox.v1",
        certification_profile_ref: "clear-statutory.pt.challan.receipt.v1",
        certification_required: true,
      },
    };
    const providerDeliveries = financeArtifacts.map((artifact, index) => {
      const artifactSubtype = typeof artifact.config_snapshot.artifact_subtype === "string" ? artifact.config_snapshot.artifact_subtype : "";
      const routeKey = artifactSubtype ? `${artifact.kind}:${artifactSubtype}` : artifact.kind;
      const route = deliveryRoutes[routeKey] ?? deliveryRoutes[artifact.kind] ?? deliveryRoutes.accounting_export;
      const productionAdapter = route.production_adapter && typeof route.production_adapter === "object"
        ? route.production_adapter
        : {};
      const bankPayoutAdapter = route.bank_payout_adapter && typeof route.bank_payout_adapter === "object"
        ? route.bank_payout_adapter
        : {};
      const accountingJournalAdapter = route.accounting_journal_adapter && typeof route.accounting_journal_adapter === "object"
        ? route.accounting_journal_adapter
        : {};
      const statutoryFilingAdapter = route.statutory_filing_adapter && typeof route.statutory_filing_adapter === "object"
        ? route.statutory_filing_adapter
        : {};
      const providerKind = String(route.provider_ref).includes("bank")
        ? "bank"
        : String(route.provider_ref).includes("accounting") || String(route.provider_ref).includes("tally")
          ? "accounting"
          : String(route.provider_ref).includes("statutory") || String(route.provider_ref).includes("clear")
            ? "statutory"
            : "provider";
      const schemaMappingContract = {
        mapping_pack_id: `demo-mapping-${artifact.id}`,
        mapping_profile_ref: `payroll.provider_mapping.${providerKind}.${artifact.kind}.default.v1`,
        version: 1,
        provider_ref: String(route.provider_ref),
        provider_kind: providerKind,
        artifact_kind: artifact.kind,
        source_schema_ref: `payroll.internal.${artifact.kind}.submission.v1`,
        target_schema_ref: `${String(route.provider_ref)}.${artifact.kind}.payload.v1`,
        transform_profile_ref: "payroll.provider_mapping.transform.safe_paths.v1",
        validation_profile_ref: "payroll.provider_mapping.validation.standard.v1",
        enforcement_mode: "warn",
        source_hash: `${artifact.id}-mapping-hash`,
      };
      const providerConnectionGate = {
        policy_ref: "payroll.provider_connection.policy.default.v1",
        enforcement_mode: routeKey === "statutory_report:statutory_challan" ? "certified" : "warn",
        required: routeKey === "statutory_report:statutory_challan",
        provider_ref: String(route.provider_ref),
        matched: route.provider_ref === "clear-statutory.portal.v1",
        provider_connection_id: route.provider_ref === "clear-statutory.portal.v1" ? "pay-provider-clear-statutory" : "",
        provider_name: route.provider_ref === "clear-statutory.portal.v1" ? "Clear statutory sandbox" : "",
        provider_kind: artifact.kind === "accounting_export" ? "accounting" : artifact.kind === "bank_advice" ? "bank" : "statutory",
        environment_ref: "sandbox",
        status: routeKey === "statutory_report:statutory_challan" ? "sandbox_ready" : route.provider_ref === "clear-statutory.portal.v1" ? "certified" : "not_configured",
        certification_status: routeKey === "statutory_report:statutory_challan" ? "pending" : route.provider_ref === "clear-statutory.portal.v1" ? "passed" : "not_started",
        active_allowed: routeKey !== "statutory_report:statutory_challan" && route.provider_ref === "clear-statutory.portal.v1",
        ready_gate_count: routeKey === "statutory_report:statutory_challan" ? 5 : route.provider_ref === "clear-statutory.portal.v1" ? 6 : 0,
        total_gate_count: 6,
        blocking_gate_refs: routeKey === "statutory_report:statutory_challan" ? ["certification_passed"] : [],
        mismatch_refs: [],
      };
      const failedRetryDemo = artifactSubtype === "statutory_challan";
      const externalReference = `ACK-AUG-2026-${String(index + 1).padStart(2, "0")}`;
      const certificationRequired = Boolean(route.certification_required);
      const deliveryStatus = failedRetryDemo ? "failed" : "reconciled";
      const deliveryStatusLabel = failedRetryDemo ? "Failed" : "Reconciled";
      const failureCode = failedRetryDemo ? "CLEAR_TIMEOUT" : "";
      const failureReason = failedRetryDemo ? "Provider timeout while submitting challan receipt request." : "";
      const callbackSignaturePolicy = providerKind === "statutory"
        ? {
            signature_algorithm_ref: "payroll.callback.signature.rsa_sha256.v1",
            signature_adapter_ref: "payroll.provider_signature_adapter.rsa_sha256_public_key.v1",
            signature_key_ref: `payroll.callback_signature_key.${providerKind}.public_key.v1`,
            signature_key_resolution_mode: "runtime",
            signature_key_material_field: "public_key",
            require_runtime_signature_key: true,
            signature_encoding: "base64",
          }
        : {
            signature_algorithm_ref: "payroll.callback.signature.sha256.v1",
            signature_adapter_ref: "payroll.provider_signature_adapter.deterministic_sha256.v1",
            signature_key_ref: `payroll.callback_signature_key.${providerKind}.configured.v1`,
            signature_key_resolution_mode: "reference",
            require_runtime_signature_key: false,
            signature_encoding: "hex",
          };
      const submissionContract = {
        adapter_ref: String(route.adapter_ref),
        provider_ref: String(route.provider_ref),
        channel_ref: String(route.channel_ref),
        route_key: routeKey,
        submission_mode: String(route.submission_mode),
        submission_profile_ref: String(route.submission_profile_ref),
        request_schema_ref: String(route.request_schema_ref),
        response_schema_ref: String(route.response_schema_ref),
        callback_profile_ref: String(route.callback_profile_ref),
        callback_verification_ref: String(route.callback_verification_ref),
        callback_security_policy: {
          security_policy_ref: `payroll.callback_security.${providerKind}.standard.v1`,
          enforcement_mode: "warn",
          ...callbackSignaturePolicy,
          signature_material_fields: [
            "provider_ref",
            "external_reference",
            "idempotency_key",
            "payload_checksum_sha256",
            "artifact_checksum_sha256",
            "callback_verification_ref",
          ],
          secret_rotation_ref: `payroll.callback_secret_rotation.${providerKind}.standard.v1`,
          replay_window_seconds: 900,
          timestamp_required: false,
          source_ip_required: false,
          allowed_ip_refs: [`payroll.provider_ip_allowlist.${providerKind}.managed.v1`],
          rate_limit_policy_ref: `payroll.callback_rate_limit.${providerKind}.standard.v1`,
          rate_limit_window_seconds: 60,
          rate_limit_max_events: 60,
        },
        certification_profile_ref: String(route.certification_profile_ref),
        certification_required: certificationRequired,
        provider_connection_gate: providerConnectionGate,
        schema_mapping: schemaMappingContract,
        production_adapter: productionAdapter,
        bank_payout_adapter: bankPayoutAdapter,
        accounting_journal_adapter: accountingJournalAdapter,
        statutory_filing_adapter: statutoryFilingAdapter,
        idempotency_key: `demo-${artifact.id}-${artifact.checksum_sha256.slice(0, 12)}`,
        ...(artifact.kind === "statutory_report" ? {
          statutory_context: {
            artifact_subtype: artifactSubtype,
            statutory_filing_calendar_id: artifact.config_snapshot.statutory_filing_calendar_id ?? "",
            statutory_filing_calendar_code: artifact.config_snapshot.statutory_filing_calendar_code ?? "",
            filing_type_ref: artifact.config_snapshot.filing_type_ref ?? "",
            filing_authority_ref: artifact.config_snapshot.filing_authority_ref ?? "",
            employer_registration_id: artifact.config_snapshot.employer_registration_id ?? "",
            employer_registration_number: artifact.config_snapshot.employer_registration_number ?? "",
            output_profile_ref: artifact.output_profile_ref,
          },
        } : {}),
      };
      return {
        id: `paydelivery-${artifact.id}`,
        handoff_id: handoffId,
        output_artifact_id: artifact.id,
        output_artifact_title: artifact.title,
        output_batch_id: batch.id,
        payroll_run_id: batch.payroll_run_id,
        review_id: batch.review_id,
        artifact_kind: artifact.kind,
        artifact_kind_label: artifact.kind_label,
        status: deliveryStatus,
        status_label: deliveryStatusLabel,
        provider_ref: String(route.provider_ref),
        channel_ref: String(route.channel_ref),
        external_reference: externalReference,
        retry_policy_ref: String(route.retry_policy_ref),
        attempt_count: failedRetryDemo ? 2 : 1,
        submitted_at: now,
        submitted_by_name: "Nisha Rao",
        acknowledged_at: failedRetryDemo ? null : now,
        acknowledged_by_name: failedRetryDemo ? null : "Nisha Rao",
        reconciled_at: failedRetryDemo ? null : now,
        reconciled_by_name: failedRetryDemo ? null : "Nisha Rao",
        failure_code: failureCode,
        failure_reason: failureReason,
        payload_checksum_sha256: artifact.checksum_sha256,
        request_snapshot: {
          file_name: artifact.file_name,
          storage_key: artifact.storage_key,
          file_size_bytes: artifact.file_size_bytes,
          checksum_sha256: artifact.checksum_sha256,
          submission_contract: submissionContract,
        },
        response_snapshot: {
          acknowledgement_profile_ref: "india.monthly.provider.ack.v1",
          callback_profile_ref: submissionContract.callback_profile_ref,
          callback_verification_ref: submissionContract.callback_verification_ref,
          response_schema_ref: submissionContract.response_schema_ref,
          provider_status: deliveryStatus,
          provider_batch_ref: artifact.kind === "bank_advice"
            ? "BANK-LIVE-BATCH-2026-08"
            : artifact.kind === "accounting_export"
              ? "LEDGER-LIVE-BATCH-2026-08"
              : artifact.kind === "statutory_report" && !artifactSubtype
                ? "STAT-LIVE-BATCH-2026-08"
                : "BANK-ACK-2026-08",
          external_reference: externalReference,
          failure_code: failureCode,
          failure_reason: failureReason,
          ...(artifact.kind === "bank_advice" ? {
            adapter_ref: submissionContract.adapter_ref,
            adapter_family: "bank",
            dispatch_mode: "bank_live_payout",
            domain_contract_ref: "payroll.provider_contract.bank_payout.live.v1",
            bank_payout: {
              client_ref: bankPayoutAdapter.client_ref,
              payout_profile_ref: bankPayoutAdapter.payout_profile_ref,
              payment_operation_ref: bankPayoutAdapter.payment_operation_ref,
              payment_network_ref: bankPayoutAdapter.payment_network_ref,
              debit_account_ref: bankPayoutAdapter.debit_account_ref,
              payment_date: bankPayoutAdapter.payment_date,
              total_amount: netPay.toFixed(2),
              payout_row_count: bankRows.length,
              accepted_count: bankRows.length,
              rejected_count: 0,
              utr_refs: ["UTR-AUG-2026-001"],
              transaction_refs: bankRows.map((row, rowIndex) => ({
                employee_code: row.employee_code,
                transaction_ref: `TXN-AUG-2026-${String(rowIndex + 1).padStart(3, "0")}`,
              })),
              evidence_refs: ["bank://ack/BANK-LIVE-BATCH-2026-08"],
              failure_taxonomy_ref: bankPayoutAdapter.failure_taxonomy_ref,
              failure_category_ref: "",
              partial_acceptance_policy_ref: bankPayoutAdapter.partial_acceptance_policy_ref,
              idempotency_strategy_ref: bankPayoutAdapter.idempotency_strategy_ref,
              checksum_policy_ref: bankPayoutAdapter.checksum_policy_ref,
              secret_material_policy_ref: bankPayoutAdapter.secret_material_policy_ref,
              credential_snapshot: {
                credential_ref: String(route.credential_ref ?? ""),
                provider_ref: String(route.provider_ref),
                source_ref: "secret-manager",
                resolved: true,
                metadata: {
                  environment: "production",
                  rotation_policy_ref: "payroll.secret.rotation.15d.v1",
                },
              },
              request_gates: [
                { ref: "credential_resolved", passed: true, value: String(route.credential_ref ?? "") },
                { ref: "client_ref_configured", passed: true, value: bankPayoutAdapter.client_ref },
                { ref: "debit_account_ref_configured", passed: true, value: bankPayoutAdapter.debit_account_ref },
                { ref: "payout_total_mapped", passed: true, value: netPay.toFixed(2) },
                { ref: "payout_rows_mapped", passed: true, value: bankRows.length },
              ],
            },
          } : {}),
          ...(artifact.kind === "accounting_export" ? {
            adapter_ref: submissionContract.adapter_ref,
            adapter_family: "accounting",
            dispatch_mode: "accounting_live_journal",
            domain_contract_ref: "payroll.provider_contract.accounting_journal.live.v1",
            accounting_journal: {
              client_ref: accountingJournalAdapter.client_ref,
              ledger_profile_ref: accountingJournalAdapter.ledger_profile_ref,
              posting_profile_ref: accountingJournalAdapter.posting_profile_ref,
              journal_operation_ref: accountingJournalAdapter.journal_operation_ref,
              company_ref: accountingJournalAdapter.company_ref,
              books_ref: accountingJournalAdapter.books_ref,
              posting_date: accountingJournalAdapter.posting_date,
              total_amount: gross.toFixed(2),
              journal_row_count: accountingRows.length,
              posted_count: accountingRows.length,
              rejected_count: 0,
              voucher_refs: ["VCH-AUG-2026-001"],
              document_refs: ["DOC-AUG-2026-001"],
              evidence_refs: ["ledger://journal/LEDGER-LIVE-BATCH-2026-08"],
              failure_taxonomy_ref: accountingJournalAdapter.failure_taxonomy_ref,
              failure_category_ref: "",
              balancing_policy_ref: accountingJournalAdapter.balancing_policy_ref,
              idempotency_strategy_ref: accountingJournalAdapter.idempotency_strategy_ref,
              checksum_policy_ref: accountingJournalAdapter.checksum_policy_ref,
              secret_material_policy_ref: accountingJournalAdapter.secret_material_policy_ref,
              credential_snapshot: {
                credential_ref: String(route.credential_ref ?? ""),
                provider_ref: String(route.provider_ref),
                source_ref: "secret-manager",
                resolved: true,
                metadata: {
                  environment: "production",
                  rotation_policy_ref: "payroll.secret.rotation.30d.v1",
                },
              },
              request_gates: [
                { ref: "credential_resolved", passed: true, value: String(route.credential_ref ?? "") },
                { ref: "client_ref_configured", passed: true, value: accountingJournalAdapter.client_ref },
                { ref: "company_ref_configured", passed: true, value: accountingJournalAdapter.company_ref },
                { ref: "journal_total_mapped", passed: true, value: gross.toFixed(2) },
                { ref: "journal_rows_mapped", passed: true, value: accountingRows.length },
              ],
            },
          } : {}),
          ...(artifact.kind === "statutory_report" && !artifactSubtype ? {
            adapter_ref: submissionContract.adapter_ref,
            adapter_family: "statutory",
            dispatch_mode: "statutory_live_filing",
            domain_contract_ref: "payroll.provider_contract.statutory_filing.live.v1",
            statutory_filing: {
              client_ref: statutoryFilingAdapter.client_ref,
              filing_profile_ref: statutoryFilingAdapter.filing_profile_ref,
              filing_operation_ref: statutoryFilingAdapter.filing_operation_ref,
              filing_type_ref: statutoryFilingAdapter.filing_type_ref,
              authority_ref: statutoryFilingAdapter.authority_ref,
              registration_ref: statutoryFilingAdapter.registration_ref,
              filing_calendar_ref: statutoryFilingAdapter.filing_calendar_ref,
              due_date: statutoryFilingAdapter.due_date,
              total_amount: statutoryFilingTotal.toFixed(2),
              filing_row_count: statutoryRows.length,
              accepted_count: statutoryRows.length,
              rejected_count: 0,
              receipt_refs: ["RCPT-EPFO-AUG-2026-001"],
              challan_refs: ["CHLN-EPFO-AUG-2026-001"],
              acknowledgement_refs: ["ACK-EPFO-AUG-2026-001"],
              evidence_refs: ["statutory://receipt/STAT-LIVE-BATCH-2026-08"],
              failure_taxonomy_ref: statutoryFilingAdapter.failure_taxonomy_ref,
              failure_category_ref: "",
              receipt_policy_ref: statutoryFilingAdapter.receipt_policy_ref,
              idempotency_strategy_ref: statutoryFilingAdapter.idempotency_strategy_ref,
              checksum_policy_ref: statutoryFilingAdapter.checksum_policy_ref,
              secret_material_policy_ref: statutoryFilingAdapter.secret_material_policy_ref,
              credential_snapshot: {
                credential_ref: String(route.credential_ref ?? ""),
                provider_ref: String(route.provider_ref),
                source_ref: "secret-manager",
                resolved: true,
                metadata: {
                  environment: "production",
                  rotation_policy_ref: "payroll.secret.rotation.30d.v1",
                },
              },
              request_gates: [
                { ref: "credential_resolved", passed: true, value: String(route.credential_ref ?? "") },
                { ref: "client_ref_configured", passed: true, value: statutoryFilingAdapter.client_ref },
                { ref: "authority_ref_configured", passed: true, value: statutoryFilingAdapter.authority_ref },
                { ref: "registration_ref_configured", passed: true, value: statutoryFilingAdapter.registration_ref },
                { ref: "filing_total_mapped", passed: true, value: statutoryFilingTotal.toFixed(2) },
                { ref: "filing_rows_mapped", passed: true, value: statutoryRows.length },
              ],
            },
          } : {}),
        },
        reconciliation_snapshot: {
          certification_profile_ref: submissionContract.certification_profile_ref,
          callback_verification_ref: submissionContract.callback_verification_ref,
          checksum_matched: true,
          payload_checksum_sha256: artifact.checksum_sha256,
          artifact_checksum_sha256: artifact.checksum_sha256,
          line_count: artifact.line_snapshot.length,
        },
        config_snapshot: {
          provider_route: { ...route, provider_connection_gate: providerConnectionGate },
          submission_contract: submissionContract,
          certification_evidence: {
            status: failedRetryDemo ? "pending_retry" : certificationRequired ? "recorded" : "not_required",
            certification_profile_ref: submissionContract.certification_profile_ref,
            provider_ref: submissionContract.provider_ref,
            adapter_ref: submissionContract.adapter_ref,
            external_reference: externalReference,
            evidence_refs: failedRetryDemo
              ? []
              : artifact.kind === "statutory_report" && !artifactSubtype
                ? [
                    "statutory://receipt/STAT-LIVE-BATCH-2026-08",
                    "RCPT-EPFO-AUG-2026-001",
                    "CHLN-EPFO-AUG-2026-001",
                    "ACK-EPFO-AUG-2026-001",
                  ]
                : certificationRequired
                  ? [`clear://certificates/${artifact.id}.pdf`]
                  : [],
          },
          retry_state: failedRetryDemo ? {
            state: "scheduled",
            retry_policy_ref: String(route.retry_policy_ref),
            next_attempt_number: 3,
            failure_taxonomy_ref: "clear-statutory.failure.taxonomy.v1",
            failure_category_ref: "transient_gateway",
            scheduled_for: "2026-09-06T11:30:00+05:30",
          } : undefined,
          handoff_profile_ref: handoffProfileRef,
        },
        created_at: now,
        updated_at: now,
      };
    });
    const callbackEvents = providerDeliveries
      .filter((delivery) => delivery.artifact_kind === "statutory_report" && delivery.status === "reconciled")
      .map((delivery, index) => {
        const contract = delivery.request_snapshot.submission_contract;
        const payloadChecksum = `cb77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff0${index}`;
        const callbackSecurity = {
          security_policy_ref: contract.callback_security_policy.security_policy_ref,
          enforcement_mode: contract.callback_security_policy.enforcement_mode,
          received_at: now,
          source_ip: "203.0.113.10",
          passed: true,
          blocking_gate_refs: [],
          gates: [
            {
              ref: "callback_signature_matched",
              passed: true,
              algorithm_ref: contract.callback_security_policy.signature_algorithm_ref,
              adapter_ref: contract.callback_security_policy.signature_adapter_ref,
              callback_verification_ref: contract.callback_verification_ref,
              signature_material_fields: contract.callback_security_policy.signature_material_fields,
              signature_material_hash_sha256: "cb77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeffaa",
            },
            {
              ref: "callback_replay_window",
              passed: true,
              mode: "bounded",
              replay_window_seconds: contract.callback_security_policy.replay_window_seconds,
              event_timestamp: now,
              event_age_seconds: 4,
            },
            {
              ref: "callback_source_policy",
              passed: true,
              mode: "referenced_policy",
              source_ip: "203.0.113.10",
              allowed_ip_refs: contract.callback_security_policy.allowed_ip_refs,
              configured: true,
            },
            {
              ref: "callback_rate_limit",
              passed: true,
              rate_limit_policy_ref: contract.callback_security_policy.rate_limit_policy_ref,
              window_seconds: contract.callback_security_policy.rate_limit_window_seconds,
              max_events: contract.callback_security_policy.rate_limit_max_events,
              observed_events: 1,
            },
          ],
        };
        return {
          id: `paycallback-${delivery.id}`,
          provider_delivery_id: delivery.id,
          handoff_id: handoffId,
          output_artifact_id: delivery.output_artifact_id,
          output_artifact_title: delivery.output_artifact_title,
          provider_ref: delivery.provider_ref,
          external_reference: delivery.external_reference,
          external_event_id: `evt-clear-aug-2026-${String(index + 1).padStart(2, "0")}`,
          idempotency_key: `${contract.idempotency_key}:callback:${index + 1}`,
          callback_profile_ref: contract.callback_profile_ref,
          callback_verification_ref: contract.callback_verification_ref,
          status: "processed",
          status_label: "Processed",
          provider_status: "reconciled",
          provider_status_label: "Reconciled",
          payload_checksum_sha256: payloadChecksum,
          signature: `sig-${payloadChecksum.slice(0, 24)}`,
          verification_snapshot: {
            signature_valid: true,
            verification_mode: "provider_signature_adapter",
            callback_verification_ref: contract.callback_verification_ref,
            signature_adapter: {
              signature_profile_ref: "payroll.provider_callback.signature.framework.v1",
              signature_algorithm_ref: contract.callback_security_policy.signature_algorithm_ref,
              signature_adapter_ref: contract.callback_security_policy.signature_adapter_ref,
              callback_verification_ref: contract.callback_verification_ref,
              signature_material_fields: contract.callback_security_policy.signature_material_fields,
              signature_material_hash_sha256: "cb77118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeffaa",
              signature_encoding: contract.callback_security_policy.signature_encoding,
              signature_digest_format: "hex",
              compare_mode: "constant_time",
              key_material_mode: contract.callback_security_policy.signature_adapter_ref === "payroll.provider_signature_adapter.rsa_sha256_public_key.v1" ? "runtime_public_key_ref" : "none",
              signature_key_ref: contract.callback_security_policy.signature_key_ref,
              signature_key_resolution_mode: contract.callback_security_policy.signature_key_resolution_mode,
              credential_snapshot: contract.callback_security_policy.signature_adapter_ref === "payroll.provider_signature_adapter.rsa_sha256_public_key.v1"
                ? {
                    credential_ref: contract.callback_security_policy.signature_key_ref,
                    provider_ref: contract.provider_ref,
                    source_ref: "demo-public-key-manager",
                    use_sandbox: true,
                    metadata: {
                      kid: "clear-statutory-rsa-2026-08",
                      rotation_policy_ref: "payroll.public_key.rotation.180d.v1",
                    },
                    resolved: true,
                    material_field_ref: "public_key",
                  }
                : undefined,
              signature_valid: true,
            },
            callback_security: callbackSecurity,
          },
          payload_snapshot: {
            provider_batch_ref: "CLEAR-PT-AUG-2026",
            certification_evidence_refs: [`clear://certificates/${delivery.output_artifact_id}.pdf`],
          },
          processing_snapshot: {
            delivery_id: delivery.id,
            handoff_id: handoffId,
            delivery_status: "reconciled",
            handoff_status: "accepted",
            processed_at: now,
          },
          received_at: now,
          processed_at: now,
          failure_code: "",
          failure_reason: "",
          created_at: now,
          updated_at: now,
        };
      });
    const retryEvents = providerDeliveries
      .filter((delivery) => delivery.status === "failed" || delivery.status === "rejected")
      .map((delivery) => ({
        id: `payretry-${delivery.id}`,
        provider_delivery_id: delivery.id,
        handoff_id: handoffId,
        output_artifact_id: delivery.output_artifact_id,
        output_artifact_title: delivery.output_artifact_title,
        status: "scheduled",
        status_label: "Scheduled",
        retry_policy_ref: delivery.retry_policy_ref,
        failure_taxonomy_ref: "clear-statutory.failure.taxonomy.v1",
        failure_category_ref: "transient_gateway",
        retry_reason: "Retry challan submission after provider timeout",
        attempt_number: delivery.attempt_count + 1,
        scheduled_for: "2026-09-06T11:30:00+05:30",
        executed_at: null,
        requested_by_name: "Nisha Rao",
        executed_by_name: null,
        decision_snapshot: {
          eligible: true,
          state: "scheduled",
          max_attempts: 3,
          current_attempt_count: delivery.attempt_count,
          next_attempt_number: delivery.attempt_count + 1,
          backoff_seconds: 900,
          failure_code: delivery.failure_code,
          failure_reason: delivery.failure_reason,
        },
        request_snapshot: {
          provider_delivery_id: delivery.id,
          provider_ref: delivery.provider_ref,
          channel_ref: delivery.channel_ref,
          requested_for: "2026-09-06T11:30:00+05:30",
        },
        response_snapshot: {},
        failure_code: delivery.failure_code,
        failure_reason: delivery.failure_reason,
        created_at: now,
        updated_at: now,
      }));
    const providerJobs = [
      ...providerDeliveries.map((delivery) => ({
        id: `payjob-submit-${delivery.id}`,
        job_kind: "provider_submission",
        job_kind_label: "Provider Submission",
        status: "completed",
        status_label: "Completed",
        queue_policy_ref: `payroll.provider_queue.${delivery.artifact_kind}.standard.v1`,
        worker_profile_ref: `payroll.provider_worker.${delivery.artifact_kind}.standard.v1`,
        idempotency_key: `provider-submission:${delivery.id}`,
        provider_ref: delivery.provider_ref,
        provider_delivery_id: delivery.id,
        provider_connection_id: null,
        retry_event_id: null,
        callback_event_id: null,
        certification_run_id: null,
        priority: 100,
        attempt_count: 1,
        max_attempts: 3,
        scheduled_for: "2026-09-05T11:00:00+05:30",
        leased_at: "2026-09-05T11:00:10+05:30",
        leased_until: "2026-09-05T11:05:10+05:30",
        lease_owner_ref: "payroll.provider_worker.demo.v1",
        heartbeat_at: "2026-09-05T11:00:25+05:30",
        heartbeat_count: 1,
        recovery_count: 0,
        last_recovered_at: null,
        started_at: "2026-09-05T11:00:10+05:30",
        completed_at: "2026-09-05T11:00:35+05:30",
        requested_by_name: "Nisha Rao",
        executed_by_name: "Nisha Rao",
        request_snapshot: {
          provider_delivery_id: delivery.id,
          provider_ref: delivery.provider_ref,
          queue_policy: {
            queue_policy_ref: `payroll.provider_queue.${delivery.artifact_kind}.standard.v1`,
            worker_profile_ref: `payroll.provider_worker.${delivery.artifact_kind}.standard.v1`,
            max_attempts: 3,
            lease_seconds: 300,
            heartbeat_seconds: 60,
            max_recoveries: 3,
            stale_recovery_backoff_seconds: 60,
          },
        },
        lease_snapshot: {
          lease_owner_ref: "payroll.provider_worker.demo.v1",
          worker_profile_ref: `payroll.provider_worker.${delivery.artifact_kind}.standard.v1`,
          attempt_number: 1,
          heartbeat_profile_ref: "payroll.provider_queue.heartbeat.standard.v1",
          heartbeat_count: 1,
          last_heartbeat_at: "2026-09-05T11:00:25+05:30",
        },
        response_snapshot: {
          provider_delivery_id: delivery.id,
          provider_delivery_status: delivery.status,
          completed_at: "2026-09-05T11:00:35+05:30",
        },
        failure_code: "",
        failure_reason: "",
        created_at: now,
        updated_at: now,
      })),
      ...retryEvents.map((event) => ({
        id: `payjob-retry-${event.id}`,
        job_kind: "provider_retry",
        job_kind_label: "Provider Retry",
        status: "queued",
        status_label: "Queued",
        queue_policy_ref: "payroll.provider_queue.provider_retry.standard.v1",
        worker_profile_ref: "payroll.provider_worker.provider_retry.standard.v1",
        idempotency_key: `provider-retry:${event.id}`,
        provider_ref: String(event.request_snapshot.provider_ref ?? ""),
        provider_delivery_id: event.provider_delivery_id,
        provider_connection_id: null,
        retry_event_id: event.id,
        callback_event_id: null,
        certification_run_id: null,
        priority: 80,
        attempt_count: 0,
        max_attempts: 3,
        scheduled_for: event.scheduled_for,
        leased_at: null,
        leased_until: null,
        lease_owner_ref: "",
        heartbeat_at: null,
        heartbeat_count: 0,
        recovery_count: 1,
        last_recovered_at: "2026-09-05T11:20:00+05:30",
        started_at: null,
        completed_at: null,
        requested_by_name: event.requested_by_name,
        executed_by_name: null,
        request_snapshot: {
          retry_event_id: event.id,
          provider_delivery_id: event.provider_delivery_id,
          queue_policy: {
            queue_policy_ref: "payroll.provider_queue.provider_retry.standard.v1",
            worker_profile_ref: "payroll.provider_worker.provider_retry.standard.v1",
            max_attempts: 3,
            lease_seconds: 300,
            heartbeat_seconds: 60,
            max_recoveries: 3,
            stale_recovery_backoff_seconds: 60,
            backoff_seconds: 900,
          },
        },
        lease_snapshot: {},
        response_snapshot: {
          queue_runtime_profile_ref: "payroll.provider_queue.runtime.standard.v1",
          last_runtime_event: "stale_lease_recovered",
          runtime_events: [
            {
              event_type: "stale_lease_recovered",
              recorded_at: "2026-09-05T11:20:00+05:30",
              evidence: {
                recovery_owner_ref: "payroll.provider_worker.demo.v1",
                previous_lease_owner_ref: "payroll.provider_worker.retry.v1",
                recovery_count: 1,
                next_scheduled_for: event.scheduled_for,
              },
            },
          ],
        },
        failure_code: "provider_job_stale_lease_recovered",
        failure_reason: "Provider queue job lease expired before completion and was recovered for a future attempt.",
        created_at: now,
        updated_at: now,
      })),
      ...callbackEvents.map((event) => ({
        id: `payjob-callback-${event.id}`,
        job_kind: "callback_reconciliation",
        job_kind_label: "Callback Reconciliation",
        status: "completed",
        status_label: "Completed",
        queue_policy_ref: "payroll.provider_queue.callback_reconciliation.standard.v1",
        worker_profile_ref: "payroll.provider_worker.callback_reconciliation.standard.v1",
        idempotency_key: `callback-reconciliation:${event.id}`,
        provider_ref: event.provider_ref,
        provider_delivery_id: event.provider_delivery_id,
        provider_connection_id: null,
        retry_event_id: null,
        callback_event_id: event.id,
        certification_run_id: null,
        priority: 90,
        attempt_count: 1,
        max_attempts: 3,
        scheduled_for: event.received_at,
        leased_at: event.received_at,
        leased_until: event.processed_at,
        lease_owner_ref: "payroll.provider_worker.demo.v1",
        heartbeat_at: event.received_at,
        heartbeat_count: 1,
        recovery_count: 0,
        last_recovered_at: null,
        started_at: event.received_at,
        completed_at: event.processed_at,
        requested_by_name: null,
        executed_by_name: "Nisha Rao",
        request_snapshot: {
          callback_event_id: event.id,
          provider_delivery_id: event.provider_delivery_id,
          queue_policy: {
            queue_policy_ref: "payroll.provider_queue.callback_reconciliation.standard.v1",
            worker_profile_ref: "payroll.provider_worker.callback_reconciliation.standard.v1",
            max_attempts: 3,
            lease_seconds: 300,
            heartbeat_seconds: 60,
            max_recoveries: 3,
            stale_recovery_backoff_seconds: 60,
          },
        },
        lease_snapshot: {
          lease_owner_ref: "payroll.provider_worker.demo.v1",
          attempt_number: 1,
          heartbeat_profile_ref: "payroll.provider_queue.heartbeat.standard.v1",
          heartbeat_count: 1,
        },
        response_snapshot: {
          callback_event_id: event.id,
          callback_event_status: event.status,
          provider_delivery_status: event.provider_status,
        },
        failure_code: "",
        failure_reason: "",
        created_at: now,
        updated_at: now,
      })),
    ];
    const providerAuditPackChecksum = "a67118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00";
    const providerAuditPackArtifact = {
      id: "payhandoff-provider-audit-pack-aug-2026-core",
      output_batch_id: batch.id,
      payroll_run_id: batch.payroll_run_id,
      review_id: batch.review_id,
      employee_id: null,
      employee_code: null,
      employee_name: null,
      input_snapshot_id: null,
      kind: "provider_audit_pack",
      kind_label: "Provider Audit Pack",
      status: "published",
      status_label: "Published",
      artifact_key: "finance:aug-2026-core:provider-audit-pack:a67118811bb",
      title: "Provider Audit Pack - August 2026 Core Payroll",
      file_name: "aug-2026-core-provider-audit-pack-a67118811bb.json",
      content_type: "application/json",
      storage_provider_ref: "payroll.storage.local.generated.v1",
      storage_key: `payroll/aug-2026-core/${handoffProfileRef}/provider_audit_pack/aug-2026-core-provider-audit-pack-a67118811bb.json`,
      storage_object_version: "local-provider-audit-pack-v1",
      mime_type: "application/json",
      file_size_bytes: 18420,
      checksum_sha256: providerAuditPackChecksum,
      is_downloadable: true,
      download_strategy_ref: "payroll.download.stream.local.v1",
      supports_signed_url: false,
      signed_url_expires_in_seconds: 900,
      retention_policy_ref: "payroll.retention.provider_audit.10y.v1",
      download_url: "/api/v1/hr-admin/payroll-output-artifacts/payhandoff-provider-audit-pack-aug-2026-core/download/",
      signed_download_url: null,
      signed_download_expires_at: null,
      output_profile_ref: "payroll.provider_audit_pack.standard.v1",
      totals_snapshot: {
        artifact_count: financeArtifacts.length,
        delivery_count: providerDeliveries.length,
        callback_event_count: callbackEvents.length,
        retry_event_count: retryEvents.length,
        provider_job_count: providerJobs.length,
        reconciled_delivery_count: providerDeliveries.filter((delivery) => delivery.status === "reconciled").length,
        failed_delivery_count: providerDeliveries.filter((delivery) => delivery.status === "failed").length,
        recovered_job_count: providerJobs.filter((job) => job.recovery_count > 0).length,
        evidence_checksum_sha256: providerAuditPackChecksum,
      },
      line_snapshot: [
        { section: "artifacts", record_count: financeArtifacts.length },
        { section: "provider_deliveries", record_count: providerDeliveries.length },
        { section: "provider_callback_events", record_count: callbackEvents.length },
        { section: "provider_retry_events", record_count: retryEvents.length },
        { section: "provider_jobs", record_count: providerJobs.length },
      ],
      access_summary: buildDemoPayrollAccessSummary(),
      access_events: buildDemoPayrollAccessEvents({
        artifactId: "payhandoff-provider-audit-pack-aug-2026-core",
        checksum: providerAuditPackChecksum,
        storageObjectVersion: "local-provider-audit-pack-v1",
        storageProviderRef: "payroll.storage.local.generated.v1",
        downloadStrategyRef: "payroll.download.stream.local.v1",
        now,
      }),
      source_hash: "a68118811bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00",
      published_at: now,
      published_by_name: "Nisha Rao",
      config_snapshot: {
        handoff_id: handoffId,
        handoff_profile_ref: handoffProfileRef,
        audit_pack_profile_ref: "payroll.provider_audit_pack.standard.v1",
        audit_pack_schema_ref: "payroll.provider_audit_pack.schema.v1",
        evidence_checksum_sha256: providerAuditPackChecksum,
        lock_profile_ref: "payroll.provider_audit_pack.locked_artifact.v1",
        evidence_snapshot: {
          evidence_counts: {
            artifact_count: financeArtifacts.length,
            delivery_count: providerDeliveries.length,
            callback_event_count: callbackEvents.length,
            retry_event_count: retryEvents.length,
            provider_job_count: providerJobs.length,
          },
          provider_refs: [...new Set(providerDeliveries.map((delivery) => delivery.provider_ref))],
          runtime_profile_refs: [
            ...new Set(providerJobs.map((job) => {
              const responseSnapshot = job.response_snapshot as Record<string, unknown>;
              const leaseSnapshot = job.lease_snapshot as Record<string, unknown>;
              return String(responseSnapshot.queue_runtime_profile_ref ?? leaseSnapshot.heartbeat_profile_ref ?? "");
            }).filter(Boolean)),
          ],
        },
      },
      created_at: now,
      updated_at: now,
    };
    const handoffArtifacts = [...financeArtifacts, providerAuditPackArtifact];
    const reconciledDeliveryCount = providerDeliveries.filter((delivery) => delivery.status === "reconciled").length;
    const failedDeliveryCount = providerDeliveries.filter((delivery) => delivery.status === "failed").length;
    const handoff = {
      id: handoffId,
      output_batch_id: batch.id,
      payroll_run_id: batch.payroll_run_id,
      payroll_run_name: batch.payroll_run_name,
      review_id: batch.review_id,
      status: failedDeliveryCount ? "failed" : "accepted",
      status_label: failedDeliveryCount ? "Failed" : "Accepted",
      handoff_profile_ref: handoffProfileRef,
      bank_file_profile_ref: bankFileProfileRef,
      accounting_export_profile_ref: accountingExportProfileRef,
      statutory_pack_ref: statutoryPackRef,
      generated_at: "2026-09-05T10:55:00+05:30",
      generated_by_name: "Nisha Rao",
      transmitted_at: now,
      transmitted_by_name: "Nisha Rao",
      accepted_at: failedDeliveryCount ? null : now,
      accepted_by_name: failedDeliveryCount ? null : "Nisha Rao",
      totals_snapshot: {
        gross_earnings: gross.toFixed(2),
        employee_deductions: deductions.toFixed(2),
        net_pay: netPay.toFixed(2),
        bank_advice_total: netPay.toFixed(2),
        statutory_total: deductions.toFixed(2),
        employee_count: payslips.length,
      },
      handoff_summary_snapshot: {
        artifact_count: handoffArtifacts.length,
        bank_advice_count: 1,
        accounting_export_count: 1,
        statutory_report_count: 1,
        statutory_filing_artifact_count: financeArtifacts.filter((artifact) =>
          artifact.kind === "statutory_report" &&
          (artifact.config_snapshot.artifact_subtype === "statutory_return" || artifact.config_snapshot.artifact_subtype === "statutory_challan"),
        ).length,
        statutory_filing_count: 1,
        published_count: financeArtifacts.length,
        generated_count: 0,
        delivery_count: providerDeliveries.length,
        submitted_delivery_count: 0,
        acknowledged_delivery_count: 0,
        reconciled_delivery_count: reconciledDeliveryCount,
        failed_delivery_count: failedDeliveryCount,
        rejected_delivery_count: 0,
        provider_callback_event_count: callbackEvents.length,
        processed_provider_callback_event_count: callbackEvents.length,
        rejected_provider_callback_event_count: 0,
        provider_retry_event_count: retryEvents.length,
        scheduled_provider_retry_event_count: retryEvents.filter((event) => event.status === "scheduled").length,
        executed_provider_retry_event_count: 0,
        dead_lettered_provider_retry_event_count: 0,
        provider_job_count: providerJobs.length,
        provider_audit_pack_count: 1,
        queued_provider_job_count: providerJobs.filter((job) => job.status === "queued").length,
        running_provider_job_count: providerJobs.filter((job) => job.status === "leased" || job.status === "running").length,
        completed_provider_job_count: providerJobs.filter((job) => job.status === "completed").length,
        dead_lettered_provider_job_count: providerJobs.filter((job) => job.status === "dead_lettered").length,
        recovered_provider_job_count: providerJobs.filter((job) => job.recovery_count > 0).length,
        heartbeat_provider_job_count: providerJobs.filter((job) => job.heartbeat_count > 0).length,
        stale_provider_job_count: 0,
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
      artifact_count: handoffArtifacts.length,
      created_at: now,
      updated_at: now,
    };

    return {
      summary: {
        published_output_batch_count: outputSetup.summary.published_batch_count,
        handoff_count: 1,
        generated_handoff_count: 0,
        transmitted_handoff_count: 0,
        accepted_handoff_count: failedDeliveryCount ? 0 : 1,
        submitted_delivery_count: 0,
        reconciled_delivery_count: reconciledDeliveryCount,
        failed_delivery_count: failedDeliveryCount,
        rejected_delivery_count: 0,
        provider_callback_event_count: callbackEvents.length,
        processed_provider_callback_event_count: callbackEvents.length,
        rejected_provider_callback_event_count: 0,
        provider_retry_event_count: retryEvents.length,
        scheduled_provider_retry_event_count: retryEvents.filter((event) => event.status === "scheduled").length,
        executed_provider_retry_event_count: 0,
        dead_lettered_provider_retry_event_count: 0,
        provider_job_count: providerJobs.length,
        queued_provider_job_count: providerJobs.filter((job) => job.status === "queued").length,
        running_provider_job_count: providerJobs.filter((job) => job.status === "leased" || job.status === "running").length,
        completed_provider_job_count: providerJobs.filter((job) => job.status === "completed").length,
        dead_lettered_provider_job_count: providerJobs.filter((job) => job.status === "dead_lettered").length,
        recovered_provider_job_count: providerJobs.filter((job) => job.recovery_count > 0).length,
        heartbeat_provider_job_count: providerJobs.filter((job) => job.heartbeat_count > 0).length,
        stale_provider_job_count: 0,
        finance_artifact_count: financeArtifacts.length,
        provider_audit_pack_count: 1,
        statutory_filing_artifact_count: financeArtifacts.filter((artifact) =>
          artifact.kind === "statutory_report" &&
          (artifact.config_snapshot.artifact_subtype === "statutory_return" || artifact.config_snapshot.artifact_subtype === "statutory_challan"),
        ).length,
        statutory_filing_count: 1,
        latest_net_pay: netPay.toFixed(2),
      },
      output_batches: outputSetup.output_batches,
      handoffs: [handoff],
      artifacts: handoffArtifacts,
      deliveries: providerDeliveries,
      callback_events: callbackEvents,
      retry_events: retryEvents,
      provider_jobs: providerJobs,
      options: {
        handoff_statuses: [
          { value: "generated", label: "Generated" },
          { value: "transmitted", label: "Transmitted" },
          { value: "accepted", label: "Accepted" },
          { value: "failed", label: "Failed" },
        ],
        output_artifact_kinds: outputSetup.options.output_artifact_kinds,
        output_artifact_statuses: outputSetup.options.output_artifact_statuses,
        provider_delivery_statuses: [
          { value: "queued", label: "Queued" },
          { value: "submitted", label: "Submitted" },
          { value: "acknowledged", label: "Acknowledged" },
          { value: "rejected", label: "Rejected" },
          { value: "failed", label: "Failed" },
          { value: "reconciled", label: "Reconciled" },
        ],
        provider_callback_event_statuses: [
          { value: "received", label: "Received" },
          { value: "processed", label: "Processed" },
          { value: "replayed", label: "Replayed" },
          { value: "rejected", label: "Rejected" },
        ],
        provider_retry_event_statuses: [
          { value: "scheduled", label: "Scheduled" },
          { value: "executed", label: "Executed" },
          { value: "dead_lettered", label: "Dead-lettered" },
          { value: "skipped", label: "Skipped" },
        ],
        provider_job_kinds: [
          { value: "provider_submission", label: "Provider Submission" },
          { value: "provider_retry", label: "Provider Retry" },
          { value: "provider_certification", label: "Provider Certification" },
          { value: "callback_reconciliation", label: "Callback Reconciliation" },
        ],
        provider_job_statuses: [
          { value: "queued", label: "Queued" },
          { value: "leased", label: "Leased" },
          { value: "running", label: "Running" },
          { value: "completed", label: "Completed" },
          { value: "failed", label: "Failed" },
          { value: "dead_lettered", label: "Dead-lettered" },
          { value: "skipped", label: "Skipped" },
          { value: "canceled", label: "Canceled" },
        ],
      },
    };
  };

  const buildDemoEssPayrollPayslips = (): EssPayrollPayslipListResponse => {
    const outputSetup = buildDemoPayrollOutputSetup();
    let payslips = outputSetup.artifacts
      .filter((artifact) => artifact.kind === "payslip" && artifact.status === "published" && artifact.employee_code === "EMP-0042")
      .map((artifact) => ({
        id: artifact.id,
        payroll_run_id: artifact.payroll_run_id,
        payroll_run_name: outputSetup.output_batches.find((batch) => batch.id === artifact.output_batch_id)?.payroll_run_name ?? "August 2026 Core Payroll",
        period_name: "August 2026",
        period_start_date: "2026-08-01",
        period_end_date: "2026-08-31",
        pay_date: "2026-09-05",
        title: artifact.title,
        file_name: artifact.file_name,
        mime_type: artifact.mime_type,
        file_size_bytes: artifact.file_size_bytes,
        checksum_sha256: artifact.checksum_sha256,
        storage_provider_ref: artifact.storage_provider_ref,
        storage_object_version: artifact.storage_object_version,
        download_strategy_ref: artifact.download_strategy_ref,
        supports_signed_url: artifact.supports_signed_url,
        signed_url_expires_in_seconds: artifact.signed_url_expires_in_seconds,
        retention_policy_ref: artifact.retention_policy_ref,
        download_url: `/api/v1/me/payroll-payslips/${artifact.id}/download/`,
        signed_download_url: artifact.signed_download_url,
        signed_download_expires_at: artifact.signed_download_expires_at,
        totals_snapshot: artifact.totals_snapshot,
        line_snapshot: artifact.line_snapshot,
        access_summary: artifact.access_summary,
        access_events: artifact.access_events,
        source_hash: artifact.source_hash,
        published_at: artifact.published_at,
        published_by_name: artifact.published_by_name,
        created_at: artifact.created_at,
        updated_at: artifact.updated_at,
      }));
    if (payslips.length === 0) {
      const now = "2026-09-05T10:25:00+05:30";
      const lineSnapshot = [
        {
          component_code: "BASIC",
          component_name: "Basic Pay",
          line_type: "earning",
          amount: "20000.00",
          rule_code: "basic-pay",
          rule_version: 1,
          source_hash: "ab8c7b6a5d4e3f200112233445566778899aabbccddeeff00112233445566",
        },
        {
          component_code: "HRA",
          component_name: "HRA India Metro",
          line_type: "earning",
          amount: "10000.00",
          rule_code: "hra-india-metro",
          rule_version: 1,
          source_hash: "ab8c7b6a5d4e3f200112233445566778899aabbccddeeff00112233445566",
        },
        {
          component_code: "PF_EMPLOYEE",
          component_name: "PF Employee India",
          line_type: "deduction",
          amount: "1800.00",
          rule_code: "pf-employee-india",
          rule_version: 1,
          source_hash: "ab8c7b6a5d4e3f200112233445566778899aabbccddeeff00112233445566",
        },
      ];
      payslips = [
        {
          id: "payoutartifact-payslip-emp-0042",
          payroll_run_id: "payrun-aug-2026-core",
          payroll_run_name: "August 2026 Core Payroll",
          period_name: "August 2026",
          period_start_date: "2026-08-01",
          period_end_date: "2026-08-31",
          pay_date: "2026-09-05",
          title: "Payslip - Riya Sharma",
          file_name: "aug-2026-core-EMP-0042-payslip.html",
          mime_type: "text/html",
          file_size_bytes: 15460,
          checksum_sha256: "aa8b7a6f5e4d3c2b1042112233445566778899aabbccddeeff00112233445566",
          storage_provider_ref: "payroll.storage.local.generated.v1",
          storage_object_version: "local-payslip-emp-0042-v1",
          download_strategy_ref: "payroll.download.stream.local.v1",
          supports_signed_url: false,
          signed_url_expires_in_seconds: 900,
          retention_policy_ref: "payroll.retention.7y.v1",
          download_url: "/api/v1/me/payroll-payslips/payoutartifact-payslip-emp-0042/download/",
          signed_download_url: null,
          signed_download_expires_at: null,
          totals_snapshot: {
            gross_earnings: "30000.00",
            employee_deductions: "1800.00",
            employer_contributions: "0.00",
            net_pay: "28200.00",
          },
          line_snapshot: lineSnapshot,
          access_summary: buildDemoPayrollAccessSummary({
            notification_count: 1,
            latest_notification_at: now,
          }),
          access_events: buildDemoPayrollAccessEvents({
            artifactId: "payoutartifact-payslip-emp-0042",
            checksum: "aa8b7a6f5e4d3c2b1042112233445566778899aabbccddeeff00112233445566",
            storageObjectVersion: "local-payslip-emp-0042-v1",
            storageProviderRef: "payroll.storage.local.generated.v1",
            downloadStrategyRef: "payroll.download.stream.local.v1",
            includeNotification: true,
            now,
          }),
          source_hash: "c8b7a6f5e4d3c2b1042112233445566778899aabbccddeeff00112233445566",
          published_at: now,
          published_by_name: "Nisha Rao",
          created_at: now,
          updated_at: now,
        },
      ];
    }
    const latest = payslips[0] ?? null;
    return {
      summary: {
        published_payslip_count: payslips.length,
        downloadable_payslip_count: payslips.filter((item) => Boolean(item.download_url)).length,
        latest_net_pay: String(latest?.totals_snapshot.net_pay ?? "0.00"),
        latest_pay_date: latest?.pay_date ?? null,
        latest_period_name: latest?.period_name ?? "",
        available_years: latest?.pay_date ? [new Date(latest.pay_date).getFullYear()] : [],
      },
      items: payslips,
      total_count: payslips.length,
      page: 1,
      page_size: 10,
      has_next: false,
      has_previous: false,
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
  const buildDemoLaunchRemediations = (): HrAdminLaunchRemediationListResponse => {
    const q = (query.get("q") || "").toLowerCase();
    const statusFilter = query.get("status") || "open";
    const severity = query.get("severity") || "";
    const ownerRoleRef = query.get("owner_role_ref") || "";
    const moduleRef = query.get("module_ref") || "";
    const dueState = query.get("due_state") || "";
    const allItems = demoHrAdminDashboard.launch_audit.remediation_assignments;
    const filteredItems = allItems.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesSeverity = !severity || item.severity === severity;
      const matchesOwner = !ownerRoleRef || item.owner_role_ref === ownerRoleRef;
      const matchesModule = !moduleRef || item.module_ref === moduleRef;
      const matchesDueState = !dueState || item.due_state === dueState;
      const matchesQuery =
        !q ||
        item.gate_ref.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.module_label.toLowerCase().includes(q) ||
        item.owner_role_ref.toLowerCase().includes(q) ||
        item.assigned_to_identifier.toLowerCase().includes(q);
      return matchesStatus && matchesSeverity && matchesOwner && matchesModule && matchesDueState && matchesQuery;
    });
    const paginated = paginateDemoItems(filteredItems);
    const owners = Array.from(new Set(allItems.map((item) => item.owner_role_ref).filter(Boolean))).sort();
    const modules = Array.from(new Map(allItems.map((item) => [item.module_ref, { module_ref: item.module_ref, module_label: item.module_label }])).values()).sort((left, right) =>
      left.module_label.localeCompare(right.module_label),
    );
    return {
      summary: {
        open_count: allItems.filter((item) => item.status === "open").length,
        closed_count: allItems.filter((item) => item.status === "closed").length,
        ignored_count: allItems.filter((item) => item.status === "ignored").length,
        blocker_count: allItems.filter((item) => item.status === "open" && item.severity === "blocker").length,
        warning_count: allItems.filter((item) => item.status === "open" && item.severity === "warning").length,
        overdue_count: allItems.filter((item) => item.status === "open" && item.is_overdue).length,
        due_soon_count: allItems.filter((item) => item.status === "open" && item.is_due_soon).length,
        unscheduled_count: allItems.filter((item) => item.status === "open" && item.due_state === "unscheduled").length,
        escalated_count: allItems.filter((item) => item.status === "open" && item.escalated_at).length,
        owner_count: owners.length,
        module_count: modules.length,
      },
      filters: {
        status: statusFilter,
        severity,
        owner_role_ref: ownerRoleRef,
        module_ref: moduleRef,
        due_state: dueState,
        q,
      },
      options: {
        statuses: ["open", "closed", "ignored"],
        severities: ["blocker", "warning"],
        due_states: ["overdue", "due_soon", "scheduled", "unscheduled"],
        owners,
        modules,
      },
      ...paginated,
    };
  };
  const buildDemoSaasCommercialControl = (): HrAdminSaasCommercialControl => ({
    profile_ref: "saas.commercial_profile.v1",
    profile_source: "platform_default",
    profile_name: "SaaS commercial control plane",
    version: 1,
    tenant: {
      id: "tenant-northstar-foods",
      code: "northstar-foods",
      name: "Northstar Foods",
      status: "active",
      subscription_plan: "growth",
    },
    subscription: {
      status: "active",
      billing_provider_ref: "manual_billing.v1",
      billing_account_ref: "",
      current_period_end: "",
      active_statuses: ["active", "trialing"],
      status_options: ["trialing", "active", "past_due", "suspended", "canceled"],
    },
    plan: {
      plan_ref: "growth",
      edition: "growth",
      configured: true,
    },
    available_plans: [
      { plan_ref: "starter", edition: "starter", label: "Starter" },
      { plan_ref: "growth", edition: "growth", label: "Growth" },
      { plan_ref: "enterprise", edition: "enterprise", label: "Enterprise" },
    ],
    summary: {
      entitlement_count: 9,
      enabled_entitlement_count: 9,
      required_entitlement_count: 5,
      missing_required_entitlement_count: 0,
      usage_meter_count: 4,
      exceeded_usage_limit_count: 0,
      near_usage_limit_count: 0,
      can_launch: true,
    },
    entitlements: [
      { entitlement_ref: "core_hr", label: "Core HR", enabled: true },
      { entitlement_ref: "ess", label: "Employee self service", enabled: true },
      { entitlement_ref: "mss", label: "Manager self service", enabled: true },
      { entitlement_ref: "leave", label: "Leave", enabled: true },
      { entitlement_ref: "attendance", label: "Attendance", enabled: true },
      { entitlement_ref: "documents", label: "Documents", enabled: true },
      { entitlement_ref: "notifications", label: "Notifications", enabled: true },
      { entitlement_ref: "payroll", label: "Payroll", enabled: true },
      { entitlement_ref: "payroll_provider_integrations", label: "Payroll provider integrations", enabled: true },
    ],
    usage_limits: [
      { meter_ref: "active_employees", label: "Active Employees", current_value: demoHrAdminDashboard.overview.active_employees, limit_value: 500, remaining_value: 495, status: "ok" },
      { meter_ref: "active_memberships", label: "Active Memberships", current_value: demoHrAdminDashboard.overview.active_memberships, limit_value: 750, remaining_value: 746, status: "ok" },
      { meter_ref: "payroll_runs_per_month", label: "Payroll Runs Per Month", current_value: 0, limit_value: 12, remaining_value: 12, status: "ok" },
      { meter_ref: "provider_connections", label: "Provider Connections", current_value: 3, limit_value: 6, remaining_value: 3, status: "ok" },
    ],
    required_entitlements: ["core_hr", "ess", "mss", "payroll", "payroll_provider_integrations"],
    missing_required_entitlements: [],
    exceeded_usage_limits: [],
    blocking_usage_limits: ["active_employees", "active_memberships", "payroll_runs_per_month", "provider_connections"],
    enforcement: {
      enabled: true,
      scope_count: 2,
      blocking_scope_count: 0,
      scopes: [
        {
          scope_ref: "payroll_core",
          label: "Payroll core",
          enabled: true,
          entitlements: ["payroll"],
          blocking_usage_limits: ["active_employees", "active_memberships", "payroll_runs_per_month"],
          path_prefixes: ["/api/v1/hr-admin/payroll", "/api/v1/hr-admin/salary", "/api/v1/hr-admin/employee-statutory"],
          methods: ["GET", "POST", "PATCH", "DELETE"],
          missing_entitlements: [],
          exceeded_usage_limits: [],
          blocking_reasons: [],
          allowed: true,
        },
        {
          scope_ref: "payroll_provider_integrations",
          label: "Payroll provider integrations",
          enabled: true,
          entitlements: ["payroll", "payroll_provider_integrations"],
          blocking_usage_limits: ["provider_connections"],
          path_prefixes: ["/api/v1/hr-admin/payroll-provider", "/api/v1/hr-admin/payroll-finance"],
          methods: ["GET", "POST", "PATCH", "DELETE"],
          missing_entitlements: [],
          exceeded_usage_limits: [],
          blocking_reasons: [],
          allowed: true,
        },
      ],
    },
    recent_usage_snapshots: [
      {
        id: "usage-snapshot-active-employees",
        profile_ref: "saas.commercial_profile.v1",
        profile_source: "platform_default",
        plan_ref: "growth",
        subscription_status: "active",
        meter_ref: "active_employees",
        label: "Active Employees",
        current_value: demoHrAdminDashboard.overview.active_employees,
        limit_value: 500,
        remaining_value: 495,
        status: "ok",
        source_ref: "saas.commercial_control.lifecycle_update.v1",
        actor_identifier: "nisha.rao",
        recorded_at: "2026-09-07T09:30:00Z",
        source_hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
      {
        id: "usage-snapshot-provider-connections",
        profile_ref: "saas.commercial_profile.v1",
        profile_source: "platform_default",
        plan_ref: "growth",
        subscription_status: "active",
        meter_ref: "provider_connections",
        label: "Provider Connections",
        current_value: 3,
        limit_value: 6,
        remaining_value: 3,
        status: "ok",
        source_ref: "saas.commercial_control.lifecycle_update.v1",
        actor_identifier: "nisha.rao",
        recorded_at: "2026-09-07T09:30:00Z",
        source_hash: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
    ],
    recent_audit_events: [
      {
        id: "commercial-audit-subscription-updated",
        event_type: "subscription_updated",
        actor_identifier: "nisha.rao",
        source_ref: "saas.commercial_control.lifecycle_update.v1",
        profile_ref: "saas.commercial_profile.v1",
        profile_source: "platform_default",
        plan_ref: "growth",
        subscription_status: "active",
        occurred_at: "2026-09-07T09:30:00Z",
        previous_state: {},
        new_state: {},
        usage_snapshot: [],
        enforcement_snapshot: {
          enabled: true,
          scope_count: 2,
          blocking_scope_count: 0,
          scopes: [],
        },
        event_snapshot: { updated_fields: ["subscription_plan", "status"], usage_snapshot_count: 4 },
        source_hash: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      },
    ],
  });
  const buildDemoTenantAdminConsole = (): TenantAdminConsole => {
    const commercialControl = buildDemoSaasCommercialControl();
    return {
      tenant: {
        id: "tenant-northstar-foods",
        code: "northstar-foods",
        name: "Northstar Foods",
        legal_name: "Northstar Foods Private Limited",
        status: "active",
        subscription_plan: "growth",
        country_code: "IN",
        timezone: "Asia/Kolkata",
        is_sandbox: false,
        go_live_at: null,
        onboarding_status: "active",
      },
      summary: {
        status: "ready",
        blocked_check_count: 0,
        warning_check_count: 0,
        active_membership_count: demoHrAdminDashboard.overview.active_memberships,
        role_count: 4,
        published_configuration_count: 8,
        commercial_can_launch: true,
      },
      commercial_control: commercialControl,
      seat_usage: commercialControl.usage_limits.find((item) => item.meter_ref === "active_memberships") ?? commercialControl.usage_limits[0],
      membership_status_counts: { active: demoHrAdminDashboard.overview.active_memberships },
      role_coverage: [
        { role_ref: "tenant-admin", label: "Tenant Admin", active_membership_count: 1, is_system_role: true },
        { role_ref: "hr-admin", label: "HR Admin", active_membership_count: 1, is_system_role: true },
        { role_ref: "manager", label: "Manager", active_membership_count: 1, is_system_role: true },
        { role_ref: "employee", label: "Employee", active_membership_count: 2, is_system_role: true },
      ],
      configuration_health: {
        tenant_configuration_count: 11,
        published_count: 8,
        draft_count: 3,
        archived_count: 0,
        system_definition_count: 18,
        recent_configurations: [
          {
            key: "saas.commercial_profile.v1",
            name: "SaaS commercial profile",
            category: "security",
            status: "published",
            version: 3,
            updated_at: "2026-09-07T09:30:00Z",
          },
          {
            key: "hrms.saas_launch_audit_profile.v1",
            name: "HRMS SaaS launch audit profile",
            category: "security",
            status: "published",
            version: 2,
            updated_at: "2026-09-07T09:20:00Z",
          },
        ],
      },
      governance_checks: [
        { ref: "tenant.status.active", label: "Tenant active", status: "ready", value: "active" },
        { ref: "commercial.plan.configured", label: "Plan configured", status: "ready", value: "growth" },
        { ref: "commercial.subscription.active", label: "Subscription active", status: "ready", value: "active" },
        { ref: "commercial.seats.within_limit", label: "Seats within limit", status: "ready", value: "ok" },
        { ref: "commercial.audit.history", label: "Commercial audit history", status: "ready", value: 1 },
      ],
      membership_management: {
        status_options: [
          { value: "invited", label: "Invited" },
          { value: "active", label: "Active" },
          { value: "suspended", label: "Suspended" },
          { value: "revoked", label: "Revoked" },
        ],
        role_options: [
          { id: "role-tenant-admin", code: "tenant-admin", name: "Tenant Admin", is_system_role: true },
          { id: "role-hr-admin", code: "hr-admin", name: "HR Admin", is_system_role: true },
          { id: "role-manager", code: "manager", name: "Manager", is_system_role: true },
          { id: "role-employee", code: "employee", name: "Employee", is_system_role: true },
        ],
        recent_memberships: [
          {
            id: "membership-tenant-owner",
            user_id: "user-tenant-owner",
            username: "tenant.owner",
            email: "owner@northstar.example",
            display_name: "Tenant Owner",
            first_name: "Tenant",
            last_name: "Owner",
            phone_number: "",
            is_user_active: true,
            membership_status: "active",
            is_default_membership: true,
            employee_code: "",
            role_ids: ["role-tenant-admin"],
            roles: [{ id: "role-tenant-admin", code: "tenant-admin", name: "Tenant Admin", is_primary: true, is_system_role: true }],
            created_at: "2026-09-07T09:00:00Z",
            updated_at: "2026-09-07T09:35:00Z",
          },
          {
            id: "membership-hr-admin",
            user_id: "user-hr-admin",
            username: "nisha.rao",
            email: "nisha.rao@northstar.example",
            display_name: "Nisha Rao",
            first_name: "Nisha",
            last_name: "Rao",
            phone_number: "",
            is_user_active: true,
            membership_status: "active",
            is_default_membership: true,
            employee_code: "EMP-0001",
            role_ids: ["role-hr-admin"],
            roles: [{ id: "role-hr-admin", code: "hr-admin", name: "HR Admin", is_primary: true, is_system_role: true }],
            created_at: "2026-09-07T09:00:00Z",
            updated_at: "2026-09-07T09:30:00Z",
          },
        ],
        available_actions: [
          { value: "invite", label: "Invite member" },
          { value: "activate", label: "Activate" },
          { value: "suspend", label: "Suspend" },
          { value: "revoke", label: "Revoke" },
          { value: "update_roles", label: "Update roles" },
        ],
      },
      change_request_management: {
        enabled: true,
        profile_source: "platform_default",
        request_type_options: [
          {
            value: "plan_change",
            label: "Plan change",
            description: "Request a plan, subscription status, or commercial period update.",
            target_ref_required: false,
            allowed_payload_fields: ["subscription_plan", "status", "current_period_end"],
          },
          {
            value: "billing_contact",
            label: "Billing contact",
            description: "Request billing contact or billing reference updates.",
            target_ref_required: false,
            allowed_payload_fields: ["primary_email", "primary_phone", "billing_provider_ref", "billing_account_ref"],
          },
          {
            value: "configuration_change",
            label: "Configuration change",
            description: "Request a tenant configuration review or controlled setting change.",
            target_ref_required: true,
            allowed_payload_fields: ["configuration_key", "change_summary", "requested_value_ref"],
          },
        ],
        status_options: [
          { value: "submitted", label: "Submitted" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
          { value: "applied", label: "Applied" },
          { value: "canceled", label: "Canceled" },
        ],
        action_options: [
          { value: "approve", label: "Approve" },
          { value: "reject", label: "Reject" },
          { value: "cancel", label: "Cancel" },
          { value: "apply", label: "Mark applied" },
        ],
        recent_requests: [
          {
            id: "change-request-enterprise-plan",
            request_type: "plan_change",
            status: "submitted",
            title: "Move to enterprise plan",
            description: "Preparing for multi-country payroll rollout.",
            target_ref: "",
            requested_by_identifier: "tenant.owner",
            decided_by_identifier: "",
            applied_by_identifier: "",
            requested_payload: { subscription_plan: "enterprise" },
            current_snapshot: { plan: { plan_ref: "growth", edition: "growth" } },
            decision_note: "",
            action_history: [{ action: "submit", actor_identifier: "tenant.owner", occurred_at: "2026-09-07T09:45:00Z" }],
            requested_at: "2026-09-07T09:45:00Z",
            decided_at: null,
            applied_at: null,
            source_ref: "saas.tenant_admin.change_request.v1",
            source_hash: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          },
        ],
      },
      support_access_management: {
        enabled: true,
        profile_source: "platform_default",
        max_duration_minutes: 120,
        scope_options: [
          { value: "read_only_account", label: "Account posture", description: "Read tenant account, seat, and plan posture." },
          { value: "commercial_evidence", label: "Commercial evidence", description: "Read usage-meter and commercial audit evidence." },
          { value: "configuration_health", label: "Configuration health", description: "Read tenant configuration health and refs." },
          { value: "payroll_support", label: "Payroll support", description: "Read payroll support evidence through existing role gates." },
        ],
        status_options: [
          { value: "requested", label: "Requested" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
          { value: "active", label: "Active" },
          { value: "ended", label: "Ended" },
          { value: "revoked", label: "Revoked" },
          { value: "expired", label: "Expired" },
        ],
        action_options: [
          { value: "approve", label: "Approve" },
          { value: "reject", label: "Reject" },
          { value: "start", label: "Start session" },
          { value: "end", label: "End session" },
          { value: "revoke", label: "Revoke" },
        ],
        recent_grants: [
          {
            id: "support-grant-payroll-close",
            status: "requested",
            support_agent_identifier: "support.agent@example.com",
            reason: "Investigate payroll close configuration warning.",
            scope_refs: ["read_only_account", "configuration_health"],
            requested_duration_minutes: 45,
            approved_duration_minutes: 0,
            requested_by_identifier: "tenant.owner",
            approved_by_identifier: "",
            revoked_by_identifier: "",
            started_by_identifier: "",
            ended_by_identifier: "",
            requested_at: "2026-09-07T10:00:00Z",
            approved_at: null,
            access_starts_at: null,
            access_expires_at: null,
            started_at: null,
            ended_at: null,
            revoked_at: null,
            decision_note: "",
            session_ref: "",
            action_history: [{ action: "request", actor_identifier: "tenant.owner", occurred_at: "2026-09-07T10:00:00Z" }],
            request_snapshot: { max_duration_minutes: 120 },
            source_ref: "saas.support_access.grant.v1",
            source_hash: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          },
        ],
      },
      recent_usage_snapshots: commercialControl.recent_usage_snapshots,
      recent_audit_events: commercialControl.recent_audit_events,
    };
  };

  const buildDemoTenantAdminTrustAuditReview = (): TenantAdminTrustAuditReview => {
    const consolePayload = buildDemoTenantAdminConsole();
    const commercialEvent = consolePayload.recent_audit_events[0];
    const events = [
      {
        ...commercialEvent,
        event_type: "support_access_session_checked",
        actor_identifier: "support.agent@example.com",
        source_ref: "saas.support_access.runtime.v1",
        occurred_at: "2026-09-07T10:16:00Z",
        event_snapshot: {
          support_access_runtime: {
            session_ref: "support-session-demo-001",
            required_scope_ref: "payroll_support",
            method: "GET",
          },
        },
        event_group_refs: ["all", "support"],
        support_session_ref: "support-session-demo-001",
      },
      {
        ...commercialEvent,
        event_type: "support_access_approved",
        actor_identifier: "tenant.owner",
        source_ref: "saas.support_access.grant.v1",
        occurred_at: "2026-09-07T10:05:00Z",
        event_snapshot: {
          support_access_grant: {
            session_ref: "support-session-demo-001",
            scope_refs: ["read_only_account", "configuration_health", "payroll_support"],
          },
        },
        event_group_refs: ["all", "support", "tenant_admin"],
        support_session_ref: "support-session-demo-001",
      },
      {
        ...commercialEvent,
        event_type: "tenant_change_request_submitted",
        actor_identifier: "tenant.owner",
        source_ref: "saas.tenant_change_request.v1",
        occurred_at: "2026-09-07T09:45:00Z",
        event_snapshot: { request_type: "plan_change", title: "Move to enterprise plan" },
        event_group_refs: ["all", "tenant_admin"],
        support_session_ref: "",
      },
      {
        ...commercialEvent,
        event_type: "subscription_updated",
        actor_identifier: "nisha.rao",
        source_ref: "saas.commercial_control.lifecycle.v1",
        occurred_at: "2026-09-07T09:30:00Z",
        event_snapshot: { updated_fields: ["subscription_plan", "status"], usage_snapshot_count: 4 },
        event_group_refs: ["all", "commercial"],
        support_session_ref: "",
      },
    ];
    return {
      profile_ref: "saas.tenant_trust_audit_review.v1",
      profile_source: "platform_default",
      generated_at: "2026-09-07T10:30:00Z",
      tenant: {
        id: consolePayload.tenant.id,
        code: consolePayload.tenant.code,
        name: consolePayload.tenant.name,
        status: consolePayload.tenant.status,
        subscription_plan: consolePayload.tenant.subscription_plan,
        timezone: consolePayload.tenant.timezone,
      },
      summary: {
        status: "ready",
        total_event_count: events.length,
        visible_event_count: events.length,
        event_type_count: 4,
        source_ref_count: 4,
        support_session_count: 1,
        configured_group_count: 4,
        page: 1,
        page_size: 12,
      },
      filters: {
        event_group: "all",
        event_type: "",
        actor: "",
        source_ref: "",
        support_session_ref: "",
        date_from: "",
        date_to: "",
      },
      options: {
        event_groups: [
          { group_ref: "all", label: "All events", event_types: [] },
          { group_ref: "commercial", label: "Commercial lifecycle", event_types: ["subscription_updated", "usage_snapshot_recorded"] },
          { group_ref: "tenant_admin", label: "Tenant admin actions", event_types: ["tenant_change_request_submitted", "support_access_approved"] },
          { group_ref: "support", label: "Support access", event_types: ["support_access_session_checked", "support_access_approved"] },
        ],
        event_types: ["subscription_updated", "support_access_approved", "support_access_session_checked", "tenant_change_request_submitted"],
        source_refs: ["saas.commercial_control.lifecycle.v1", "saas.support_access.grant.v1", "saas.support_access.runtime.v1", "saas.tenant_change_request.v1"],
        support_session_refs: ["support-session-demo-001"],
      },
      events,
      total_count: events.length,
      page: 1,
      page_size: 12,
      has_next: false,
      has_previous: false,
    };
  };

  const buildDemoTenantAdminEnterpriseSecurityReadiness = (): TenantAdminEnterpriseSecurityReadiness => {
    const consolePayload = buildDemoTenantAdminConsole();
    const checks: TenantAdminEnterpriseSecurityReadiness["checks"] = [
      {
        ref: "mfa.enforced",
        label: "MFA enforcement",
        status: "ready",
        severity: "blocker",
        passed: true,
        value: true,
        detail: "MFA is enforced for tenant access.",
        action_label: "Review MFA",
        action_href: "/tenant-admin/security-readiness",
        owner_role_ref: "security-admin",
      },
      {
        ref: "mfa.methods",
        label: "MFA method catalog",
        status: "ready",
        severity: "blocker",
        passed: true,
        value: ["totp", "webauthn"],
        detail: "MFA methods satisfy the tenant minimum.",
        action_label: "Review MFA",
        action_href: "/tenant-admin/security-readiness",
        owner_role_ref: "security-admin",
      },
      {
        ref: "sso.enabled",
        label: "SSO enabled",
        status: "ready",
        severity: "blocker",
        passed: true,
        value: true,
        detail: "SSO is enabled for tenant authentication.",
        action_label: "Review SSO",
        action_href: "/tenant-admin/security-readiness",
        owner_role_ref: "security-admin",
      },
      {
        ref: "sso.certificate_window",
        label: "Certificate rotation window",
        status: "warning",
        severity: "warning",
        passed: false,
        value: "2026-09-28T10:30:00Z",
        detail: "SSO certificate rotation is inside the configured warning window.",
        action_label: "Review SSO",
        action_href: "/tenant-admin/security-readiness",
        owner_role_ref: "security-admin",
      },
      {
        ref: "scim.deprovisioning",
        label: "SCIM deprovisioning",
        status: "ready",
        severity: "blocker",
        passed: true,
        value: true,
        detail: "SCIM deprovisioning is enabled.",
        action_label: "Review SCIM",
        action_href: "/tenant-admin/security-readiness",
        owner_role_ref: "security-admin",
      },
      {
        ref: "session.idle_timeout",
        label: "Idle session timeout",
        status: "ready",
        severity: "blocker",
        passed: true,
        value: "30m / 60m",
        detail: "Idle timeout satisfies the tenant limit.",
        action_label: "Review sessions",
        action_href: "/tenant-admin/security-readiness",
        owner_role_ref: "security-admin",
      },
      {
        ref: "audit.customer_export",
        label: "Customer audit export",
        status: "ready",
        severity: "blocker",
        passed: true,
        value: true,
        detail: "Customer audit export is enabled.",
        action_label: "Review audit",
        action_href: "/tenant-admin/security-readiness",
        owner_role_ref: "compliance-admin",
      },
      {
        ref: "data.encryption_at_rest",
        label: "Encryption at rest",
        status: "ready",
        severity: "blocker",
        passed: true,
        value: true,
        detail: "Encryption at rest is enabled.",
        action_label: "Review data protection",
        action_href: "/tenant-admin/security-readiness",
        owner_role_ref: "security-admin",
      },
    ];
    return {
      profile_ref: "saas.enterprise_security_readiness.v1",
      security_profile_ref: "saas.enterprise_security_profile.v1",
      profile_source: "platform_default",
      generated_at: "2026-09-07T10:30:00Z",
      tenant: {
        id: consolePayload.tenant.id,
        code: consolePayload.tenant.code,
        name: consolePayload.tenant.name,
        status: consolePayload.tenant.status,
        subscription_plan: consolePayload.tenant.subscription_plan,
        timezone: consolePayload.tenant.timezone,
      },
      summary: {
        status: "warning",
        check_count: 8,
        passed_check_count: 7,
        blocker_count: 0,
        warning_count: 1,
        mfa_ready: true,
        sso_ready: false,
        scim_ready: true,
        session_ready: true,
        audit_ready: true,
        data_protection_ready: true,
        launch_blocker_refs: [],
      },
      mfa: {
        required: true,
        enforced: true,
        allowed_methods: ["totp", "webauthn"],
        exempt_role_refs: ["break_glass_admin"],
        minimum_method_count: 1,
        evidence_ref: "security.mfa.policy.northstar.v1",
        owner_role_ref: "security-admin",
      },
      sso: {
        required: true,
        enabled: true,
        provider_ref: "idp.northstar.workforce",
        protocol: "saml",
        allowed_protocols: ["saml", "oidc"],
        metadata_ref: "idp.metadata.northstar.saml.v1",
        last_tested_at: "2026-09-07T09:20:00Z",
        test_interval_days: 30,
        certificate_rotation_due_at: "2026-09-28T10:30:00Z",
        certificate_warning_days: 30,
      },
      scim: {
        required: true,
        enabled: true,
        provider_ref: "idp.northstar.scim",
        last_sync_at: "2026-09-07T10:10:00Z",
        sync_interval_hours: 24,
        error_count: 0,
        max_error_count: 0,
        deprovisioning_enabled: true,
      },
      session: {
        idle_timeout_minutes: 30,
        max_idle_timeout_minutes: 60,
        absolute_timeout_hours: 8,
        max_absolute_timeout_hours: 12,
        device_trust_required: true,
        device_trust_enabled: true,
      },
      audit: {
        retention_days: 3650,
        minimum_retention_days: 2555,
        customer_export_enabled: true,
        immutable_export_ref: "audit.export.immutable.northstar.v1",
      },
      data_protection: {
        encryption_at_rest: true,
        encryption_in_transit: true,
        customer_managed_key_ref: "kms.customer.northstar.v1",
        data_residency_ref: "data.residency.in-west.v1",
      },
      checks,
    };
  };

  const buildDemoSupportSessionTenantConsole = (): SupportSessionTenantConsole => {
    const consolePayload = buildDemoTenantAdminConsole();
    const grant = {
      ...consolePayload.support_access_management.recent_grants[0],
      status: "active",
      approved_duration_minutes: 45,
      approved_by_identifier: "tenant.owner",
      started_by_identifier: "support.agent@example.com",
      approved_at: "2026-09-07T10:05:00Z",
      access_starts_at: "2026-09-07T10:05:00Z",
      access_expires_at: "2026-09-07T10:50:00Z",
      started_at: "2026-09-07T10:06:00Z",
      session_ref: "support-session-demo-001",
      action_history: [
        { action: "request", actor_identifier: "tenant.owner", occurred_at: "2026-09-07T10:00:00Z" },
        { action: "approve", actor_identifier: "tenant.owner", occurred_at: "2026-09-07T10:05:00Z" },
        { action: "start", actor_identifier: "support.agent@example.com", occurred_at: "2026-09-07T10:06:00Z" },
      ],
    };
    return {
      support_session: {
        allowed: true,
        detail: "Support session allowed.",
        code: "support_session_allowed",
        tenant_code: consolePayload.tenant.code,
        actor_identifier: "support.agent@example.com",
        required_scope_ref: "configuration_health",
        request_path: "/api/v1/support/tenant-console/",
        method: "GET",
        grant,
        scope_refs: ["read_only_account", "configuration_health"],
        session_ref: "support-session-demo-001",
        access_expires_at: "2026-09-07T10:50:00Z",
      },
      tenant: {
        id: consolePayload.tenant.id,
        code: consolePayload.tenant.code,
        name: consolePayload.tenant.name,
      },
      granted_sections: ["configuration_health", "read_only_account"],
      account: {
        summary: consolePayload.summary,
        commercial_control: {
          profile_ref: consolePayload.commercial_control.profile_ref,
          profile_source: consolePayload.commercial_control.profile_source,
          subscription: consolePayload.commercial_control.subscription,
          plan: consolePayload.commercial_control.plan,
          summary: consolePayload.commercial_control.summary,
        },
        seat_usage: consolePayload.seat_usage,
        role_coverage: consolePayload.role_coverage,
        governance_checks: consolePayload.governance_checks,
      },
      configuration_health: consolePayload.configuration_health,
      commercial_evidence: null,
      payroll_support: null,
    };
  };

  const buildDemoSupportSessionDomainSnapshot = (): SupportSessionDomainSnapshot => {
    const consolePayload = buildDemoTenantAdminConsole();
    const operationalHealth = buildDemoSaasOperationalHealth();
    const grant = {
      ...consolePayload.support_access_management.recent_grants[0],
      status: "active",
      approved_duration_minutes: 45,
      approved_by_identifier: "tenant.owner",
      started_by_identifier: "support.agent@example.com",
      approved_at: "2026-09-07T10:05:00Z",
      access_starts_at: "2026-09-07T10:05:00Z",
      access_expires_at: "2026-09-07T10:50:00Z",
      started_at: "2026-09-07T10:06:00Z",
      session_ref: "support-session-demo-001",
      scope_refs: ["read_only_account", "configuration_health", "commercial_evidence", "payroll_support"],
    };
    const availableDomains = [
      { domain_ref: "tenant_account", label: "Tenant account", description: "Tenant account, plan, seats, and role posture.", scope_ref: "read_only_account", profile_source: "platform_default" },
      { domain_ref: "commercial_control", label: "Commercial control", description: "Subscription, entitlements, usage limits, and evidence counters.", scope_ref: "commercial_evidence", profile_source: "platform_default" },
      { domain_ref: "configuration_health", label: "Configuration health", description: "Published tenant configuration and governance health.", scope_ref: "configuration_health", profile_source: "platform_default" },
      { domain_ref: "sla_operations", label: "SLA operations", description: "Incident, SLA, and operational signal posture.", scope_ref: "configuration_health", profile_source: "platform_default" },
      { domain_ref: "resilience_readiness", label: "Resilience readiness", description: "Backup, restore, and retention readiness evidence.", scope_ref: "configuration_health", profile_source: "platform_default" },
      { domain_ref: "payroll_readiness", label: "Payroll readiness", description: "Payroll setup, calendar, rules, and open-run posture.", scope_ref: "payroll_support", profile_source: "platform_default" },
      { domain_ref: "payroll_outputs", label: "Payroll outputs", description: "Output batch and artifact aggregate posture.", scope_ref: "payroll_support", profile_source: "platform_default" },
      { domain_ref: "payroll_handoff", label: "Payroll handoff", description: "Finance handoff and provider delivery aggregate posture.", scope_ref: "payroll_support", profile_source: "platform_default" },
      { domain_ref: "payroll_providers", label: "Payroll providers", description: "Provider connections, jobs, retries, and rehearsal posture.", scope_ref: "payroll_support", profile_source: "platform_default" },
    ];
    return {
      support_session: {
        allowed: true,
        detail: "Support session allowed.",
        code: "support_session_allowed",
        tenant_code: consolePayload.tenant.code,
        actor_identifier: "support.agent@example.com",
        required_scope_ref: "payroll_support",
        request_path: "/api/v1/support/domain-snapshot/",
        method: "GET",
        grant,
        scope_refs: grant.scope_refs,
        session_ref: "support-session-demo-001",
        access_expires_at: "2026-09-07T10:50:00Z",
      },
      tenant: {
        id: consolePayload.tenant.id,
        code: consolePayload.tenant.code,
        name: consolePayload.tenant.name,
      },
      domain: availableDomains.find((item) => item.domain_ref === "payroll_providers") || availableDomains[0],
      available_domains: availableDomains,
      snapshot: {
        summary: {
          provider_connection_count: 4,
          active_provider_connection_count: 3,
          provider_job_count: 18,
          queued_provider_job_count: operationalHealth.provider_queue.job_status_counts.queued || 0,
          dead_lettered_provider_job_count: 0,
          retry_event_count: 5,
          dead_lettered_retry_event_count: 0,
          launch_rehearsal_count: 2,
          ready_launch_rehearsal_count: 1,
        },
        connection_status_counts: { active: 3, draft: 1 },
        provider_job_status_counts: { queued: operationalHealth.provider_queue.job_status_counts.queued || 0, completed: 12, running: 2 },
        retry_event_status_counts: { scheduled: 3, executed: 2 },
        launch_rehearsal_status_counts: { ready: 1, blocked: 1 },
      },
    };
  };

  const buildDemoSaasResilienceReadiness = (): HrAdminSaasResilienceReadiness => {
    const tenantConsole = buildDemoTenantAdminConsole();
    return {
      profile_ref: "saas.resilience_readiness.v1",
      resilience_profile_ref: "saas.resilience_profile.v1",
      profile_source: "published",
      generated_at: "2026-09-07T10:20:00Z",
      tenant: {
        id: tenantConsole.tenant.id,
        code: tenantConsole.tenant.code,
        name: tenantConsole.tenant.name,
        status: tenantConsole.tenant.status,
        subscription_plan: tenantConsole.tenant.subscription_plan,
        timezone: tenantConsole.tenant.timezone,
      },
      summary: {
        status: "warning",
        check_count: 12,
        passed_check_count: 10,
        blocker_count: 0,
        warning_count: 2,
        backup_ready: true,
        restore_ready: true,
        retention_ready: true,
      },
      backup: {
        enabled: true,
        required: true,
        frequency_hours: 12,
        grace_hours: 2,
        recovery_point_objective_minutes: 720,
        last_successful_backup_at: "2026-09-07T05:15:00Z",
        last_backup_status: "succeeded",
        encryption_required: true,
        encryption_enabled: true,
        offsite_required: true,
        offsite_copy_enabled: true,
        runbook_ref: "runbook.backup.northstar.v1",
      },
      restore: {
        required: true,
        restore_test_interval_days: 30,
        grace_days: 3,
        last_restore_test_at: "2026-08-25T08:30:00Z",
        last_restore_test_status: "passed",
        runbook_ref: "runbook.restore.northstar.v1",
      },
      retention: {
        default_retention_days: 2555,
        minimum_default_retention_days: 365,
        payroll_retention_days: 3650,
        minimum_payroll_retention_days: 2555,
        audit_retention_days: 3650,
        minimum_audit_retention_days: 2555,
        support_session_retention_days: 365,
        minimum_support_session_retention_days: 180,
        deletion_policy_ref: "data.deletion.northstar.v1",
        legal_hold_policy_ref: "legal_hold.northstar.v1",
      },
      evidence: {
        storage_policy_ref: "storage.policy.encrypted_offsite.v1",
        backup_job_ref: "backup.job.daily.northstar.v1",
        restore_test_ref: "restore.test.latest.northstar.v1",
        retention_policy_ref: "retention.policy.northstar.v1",
        last_evidence_at: "2026-09-07T05:20:00Z",
      },
      checks: [
        {
          ref: "backup.profile_enabled",
          label: "Backup profile enabled",
          status: "ready",
          severity: "blocker",
          passed: true,
          value: true,
          detail: "Backup controls are enabled for this tenant.",
          action_label: "Review backup",
          action_href: "/hr-admin/saas-resilience",
        },
        {
          ref: "backup.latest_successful",
          label: "Latest backup evidence",
          status: "ready",
          severity: "blocker",
          passed: true,
          value: "2026-09-07T05:15:00Z",
          detail: "Latest successful backup is inside the configured recovery window.",
          action_label: "Review backup",
          action_href: "/hr-admin/saas-resilience",
        },
        {
          ref: "backup.recovery_point_objective",
          label: "Recovery point objective",
          status: "ready",
          severity: "blocker",
          passed: true,
          value: "12h / 720m",
          detail: "Backup cadence satisfies the configured RPO.",
          action_label: "Review backup",
          action_href: "/hr-admin/saas-resilience",
        },
        {
          ref: "backup.encryption",
          label: "Encrypted backup storage",
          status: "ready",
          severity: "blocker",
          passed: true,
          value: true,
          detail: "Backup encryption evidence is present.",
          action_label: "Review backup",
          action_href: "/hr-admin/saas-resilience",
        },
        {
          ref: "backup.offsite_copy",
          label: "Offsite backup copy",
          status: "ready",
          severity: "blocker",
          passed: true,
          value: true,
          detail: "Offsite copy evidence is present.",
          action_label: "Review backup",
          action_href: "/hr-admin/saas-resilience",
        },
        {
          ref: "restore.last_test",
          label: "Restore test evidence",
          status: "ready",
          severity: "blocker",
          passed: true,
          value: "2026-08-25T08:30:00Z",
          detail: "Latest restore test is successful and inside the configured interval.",
          action_label: "Review restore test",
          action_href: "/hr-admin/saas-resilience",
        },
        {
          ref: "retention.default_window",
          label: "Default retention window",
          status: "ready",
          severity: "blocker",
          passed: true,
          value: "2555d / 365d",
          detail: "Default retention meets the tenant minimum.",
          action_label: "Review retention",
          action_href: "/hr-admin/saas-resilience",
        },
        {
          ref: "retention.payroll_window",
          label: "Payroll retention window",
          status: "ready",
          severity: "blocker",
          passed: true,
          value: "3650d / 2555d",
          detail: "Payroll retention meets the tenant minimum.",
          action_label: "Review retention",
          action_href: "/hr-admin/saas-resilience",
        },
        {
          ref: "retention.audit_window",
          label: "Audit retention window",
          status: "ready",
          severity: "blocker",
          passed: true,
          value: "3650d / 2555d",
          detail: "Audit retention meets the tenant minimum.",
          action_label: "Review retention",
          action_href: "/hr-admin/saas-resilience",
        },
        {
          ref: "retention.support_session_window",
          label: "Support session retention",
          status: "ready",
          severity: "blocker",
          passed: true,
          value: "365d / 180d",
          detail: "Support-session retention meets the tenant minimum.",
          action_label: "Review retention",
          action_href: "/hr-admin/saas-resilience",
        },
        {
          ref: "retention.policy_refs",
          label: "Deletion and legal hold policy refs",
          status: "ready",
          severity: "blocker",
          passed: true,
          value: {
            deletion_policy_ref: "data.deletion.northstar.v1",
            legal_hold_policy_ref: "legal_hold.northstar.v1",
          },
          detail: "Deletion and legal-hold policy references are configured.",
          action_label: "Review retention",
          action_href: "/hr-admin/saas-resilience",
        },
        {
          ref: "evidence.runbook_refs",
          label: "Runbook and retention evidence refs",
          status: "warning",
          severity: "warning",
          passed: false,
          value: {
            backup_runbook_ref: "runbook.backup.northstar.v1",
            restore_runbook_ref: "runbook.restore.northstar.v1",
            retention_policy_ref: "retention.policy.northstar.v1",
          },
          detail: "Evidence owner review is due before production launch.",
          action_label: "Review retention",
          action_href: "/hr-admin/saas-resilience",
        },
      ],
    };
  };

  const buildDemoSaasSlaOperations = (): HrAdminSaasSlaOperations => {
    const tenantConsole = buildDemoTenantAdminConsole();
    return {
      profile_ref: "saas.sla_operations.v1",
      sla_profile_ref: "saas.sla_profile.v1",
      profile_source: "published",
      generated_at: "2026-09-07T10:20:00Z",
      tenant: {
        id: tenantConsole.tenant.id,
        code: tenantConsole.tenant.code,
        name: tenantConsole.tenant.name,
        status: tenantConsole.tenant.status,
        subscription_plan: tenantConsole.tenant.subscription_plan,
        timezone: tenantConsole.tenant.timezone,
      },
      summary: {
        status: "warning",
        signal_count: 5,
        blocked_signal_count: 0,
        warning_signal_count: 2,
        incident_count: 3,
        open_incident_count: 2,
        breached_incident_count: 0,
        at_risk_incident_count: 1,
        failed_notification_count: 0,
        stale_provider_job_count: 0,
        expired_support_grant_count: 0,
        overdue_remediation_count: 0,
      },
      incident_targets: {
        critical: { response_minutes: 15, resolution_minutes: 120, owner_role_ref: "platform-owner" },
        high: { response_minutes: 30, resolution_minutes: 240, owner_role_ref: "operations-admin" },
        medium: { response_minutes: 120, resolution_minutes: 720, owner_role_ref: "operations-admin" },
        low: { response_minutes: 480, resolution_minutes: 1440, owner_role_ref: "support-admin" },
      },
      impact_options: {
        payroll: { label: "Payroll" },
        notifications: { label: "Notifications" },
        provider_queue: { label: "Provider queue" },
        support_access: { label: "Support access" },
        tenant_admin: { label: "Tenant admin" },
      },
      operational_thresholds: {
        failed_notifications: { max_count: 0, severity: "blocker", owner_role_ref: "operations-admin", href: "/hr-admin/notification-diagnostics" },
        stale_provider_jobs: { max_count: 0, severity: "blocker", owner_role_ref: "payroll-admin", href: "/hr-admin/payroll-handoff" },
        expired_support_grants: { max_count: 0, severity: "warning", owner_role_ref: "tenant-admin", href: "/tenant-admin" },
        overdue_remediations: { max_count: 0, severity: "blocker", owner_role_ref: "release-manager", href: "/hr-admin/launch-remediation" },
      },
      status_counts: { open: 1, acknowledged: 1, resolved: 1 },
      severity_counts: { high: 1, medium: 1, low: 1 },
      impact_counts: { payroll: 1, provider_queue: 1, notifications: 1, tenant_admin: 1 },
      health_signals: [
        {
          ref: "incident.response_resolution",
          label: "Incident SLA",
          status: "warning",
          value: 0,
          detail: "2 open incidents, 1 at risk.",
          href: "/hr-admin/saas-sla-operations",
          owner_role_ref: "operations-admin",
        },
        {
          ref: "operational.failed_notifications",
          label: "Failed Notifications",
          status: "ready",
          value: 0,
          detail: "Configured threshold is 0.",
          href: "/hr-admin/notification-diagnostics",
          owner_role_ref: "operations-admin",
        },
        {
          ref: "operational.stale_provider_jobs",
          label: "Stale Provider Jobs",
          status: "ready",
          value: 0,
          detail: "Configured threshold is 0.",
          href: "/hr-admin/payroll-handoff",
          owner_role_ref: "payroll-admin",
        },
        {
          ref: "operational.expired_support_grants",
          label: "Expired Support Grants",
          status: "ready",
          value: 0,
          detail: "Configured threshold is 0.",
          href: "/tenant-admin",
          owner_role_ref: "tenant-admin",
        },
        {
          ref: "operational.overdue_remediations",
          label: "Overdue Remediations",
          status: "ready",
          value: 0,
          detail: "Configured threshold is 0.",
          href: "/hr-admin/launch-remediation",
          owner_role_ref: "release-manager",
        },
      ],
      incidents: [
        {
          id: "inc-001",
          incident_ref: "inc-payroll-handoff-001",
          title: "Payroll handoff delay",
          description: "Finance handoff waiting on provider retry review.",
          severity: "high",
          status: "acknowledged",
          impact_refs: ["payroll", "provider_queue"],
          impact_labels: ["Payroll", "Provider queue"],
          owner_role_ref: "payroll-admin",
          detected_at: "2026-09-07T07:50:00Z",
          acknowledged_at: "2026-09-07T08:05:00Z",
          mitigated_at: null,
          resolved_at: null,
          target_response_minutes: 30,
          target_resolution_minutes: 240,
          response_due_at: "2026-09-07T08:20:00Z",
          resolution_due_at: "2026-09-07T11:50:00Z",
          response_state: "met",
          resolution_state: "at_risk",
          breached: false,
          at_risk: true,
          action_history: [{ action: "acknowledged", actor: "nisha.rao", at: "2026-09-07T08:05:00Z" }],
          incident_snapshot: { provider_ref: "bank.fixture", retry_state: "scheduled" },
          source_ref: "saas.incident.record.v1",
          source_hash: "8b9f0a1f2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccdde",
          created_at: "2026-09-07T07:50:00Z",
          updated_at: "2026-09-07T08:05:00Z",
        },
        {
          id: "inc-002",
          incident_ref: "inc-notifications-001",
          title: "Notification channel degradation",
          description: "Email channel latency crossed warning threshold for tenant onboarding messages.",
          severity: "medium",
          status: "open",
          impact_refs: ["notifications", "tenant_admin"],
          impact_labels: ["Notifications", "Tenant admin"],
          owner_role_ref: "operations-admin",
          detected_at: "2026-09-07T09:25:00Z",
          acknowledged_at: null,
          mitigated_at: null,
          resolved_at: null,
          target_response_minutes: 120,
          target_resolution_minutes: 720,
          response_due_at: "2026-09-07T11:25:00Z",
          resolution_due_at: "2026-09-07T21:25:00Z",
          response_state: "open",
          resolution_state: "open",
          breached: false,
          at_risk: false,
          action_history: [],
          incident_snapshot: { channel_ref: "email.primary", latency_minutes: 18 },
          source_ref: "saas.incident.record.v1",
          source_hash: "1b9f0a1f2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddf",
          created_at: "2026-09-07T09:25:00Z",
          updated_at: "2026-09-07T09:25:00Z",
        },
        {
          id: "inc-003",
          incident_ref: "inc-support-access-001",
          title: "Support grant cleanup completed",
          description: "Expired support grants reviewed and closed.",
          severity: "low",
          status: "resolved",
          impact_refs: ["support_access"],
          impact_labels: ["Support access"],
          owner_role_ref: "support-admin",
          detected_at: "2026-09-06T12:00:00Z",
          acknowledged_at: "2026-09-06T12:20:00Z",
          mitigated_at: "2026-09-06T13:00:00Z",
          resolved_at: "2026-09-06T13:15:00Z",
          target_response_minutes: 480,
          target_resolution_minutes: 1440,
          response_due_at: "2026-09-06T20:00:00Z",
          resolution_due_at: "2026-09-07T12:00:00Z",
          response_state: "met",
          resolution_state: "met",
          breached: false,
          at_risk: false,
          action_history: [{ action: "resolved", actor: "support.ops@example.com", at: "2026-09-06T13:15:00Z" }],
          incident_snapshot: { expired_grants: 2 },
          source_ref: "saas.incident.record.v1",
          source_hash: "2b9f0a1f2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccdd0",
          created_at: "2026-09-06T12:00:00Z",
          updated_at: "2026-09-06T13:15:00Z",
        },
      ],
    };
  };

  const buildDemoSaasOperationalHealth = (): HrAdminSaasOperationalHealth => {
    const commercialControl = buildDemoSaasCommercialControl();
    const tenantConsole = buildDemoTenantAdminConsole();
    const resilienceReadiness = buildDemoSaasResilienceReadiness();
    const slaOperations = buildDemoSaasSlaOperations();
    return {
      profile_ref: "saas.operational_health.v1",
      generated_at: "2026-09-07T10:20:00Z",
      tenant: {
        id: tenantConsole.tenant.id,
        code: tenantConsole.tenant.code,
        name: tenantConsole.tenant.name,
        status: tenantConsole.tenant.status,
        subscription_plan: tenantConsole.tenant.subscription_plan,
        timezone: tenantConsole.tenant.timezone,
      },
      summary: {
        status: "warning",
        signal_count: 9,
        blocked_signal_count: 0,
        warning_signal_count: 5,
        ready_signal_count: 4,
        open_remediation_count: demoHrAdminDashboard.launch_audit.remediation_assignment_summary.open_count,
        overdue_remediation_count: 0,
        failed_notification_count: demoHrAdminDashboard.delivery.failed_notifications,
        pending_notification_count: demoHrAdminDashboard.delivery.pending_notifications,
        resilience_status: resilienceReadiness.summary.status,
        resilience_blocker_count: resilienceReadiness.summary.blocker_count,
        resilience_warning_count: resilienceReadiness.summary.warning_count,
        sla_status: slaOperations.summary.status,
        sla_open_incident_count: slaOperations.summary.open_incident_count,
        sla_breached_incident_count: slaOperations.summary.breached_incident_count,
        queued_provider_job_count: 1,
        running_provider_job_count: 0,
        stale_provider_job_count: 0,
        dead_lettered_provider_job_count: 0,
        dead_lettered_provider_retry_event_count: 0,
        active_support_session_count: 1,
        expired_support_grant_count: 0,
        pending_change_request_count: tenantConsole.change_request_management.recent_requests.length,
        commercial_event_count: commercialControl.recent_audit_events.length,
        usage_snapshot_count: commercialControl.recent_usage_snapshots.length,
      },
      signals: [
        {
          ref: "launch.blockers",
          label: "Launch blockers",
          status: demoHrAdminDashboard.launch_audit.blocker_count ? "blocked" : "warning",
          value: demoHrAdminDashboard.launch_audit.blocker_count,
          detail: `${demoHrAdminDashboard.launch_audit.warning_count} warnings remain across ${demoHrAdminDashboard.launch_audit.module_count} modules.`,
          href: "/hr-admin/launch-remediation",
          owner_role_ref: "release-manager",
        },
        {
          ref: "commercial.control",
          label: "Commercial control",
          status: "ready",
          value: commercialControl.summary.exceeded_usage_limit_count,
          detail: `${commercialControl.summary.missing_required_entitlement_count} required entitlements missing.`,
          href: "/hr-admin/saas-control-plane",
          owner_role_ref: "hr-admin",
        },
        {
          ref: "resilience.readiness",
          label: "Backup and retention",
          status: resilienceReadiness.summary.status,
          value: resilienceReadiness.summary.blocker_count,
          detail: `${resilienceReadiness.summary.warning_count} warnings across backup, restore, and retention checks.`,
          href: "/hr-admin/saas-resilience",
          owner_role_ref: "platform-owner",
        },
        {
          ref: "sla.operations",
          label: "SLA operations",
          status: slaOperations.summary.status,
          value: slaOperations.summary.breached_incident_count,
          detail: `${slaOperations.summary.open_incident_count} open incidents, ${slaOperations.summary.warning_signal_count} warning signals.`,
          href: "/hr-admin/saas-sla-operations",
          owner_role_ref: "operations-admin",
        },
        {
          ref: "notification.delivery",
          label: "Notification delivery",
          status: demoHrAdminDashboard.delivery.failed_notifications ? "blocked" : "warning",
          value: demoHrAdminDashboard.delivery.failed_notifications,
          detail: `${demoHrAdminDashboard.delivery.pending_notifications} notifications are pending delivery.`,
          href: "/hr-admin/notification-diagnostics",
          owner_role_ref: "hr-admin",
        },
        {
          ref: "provider.queue",
          label: "Provider queue",
          status: "warning",
          value: 0,
          detail: "1 jobs queued, 0 retry events dead-lettered.",
          href: "/hr-admin/payroll-handoff",
          owner_role_ref: "payroll-admin",
        },
        {
          ref: "support.sessions",
          label: "Support sessions",
          status: "warning",
          value: 1,
          detail: "0 approved or active grants have passed expiry.",
          href: "/tenant-admin",
          owner_role_ref: "tenant-admin",
        },
        {
          ref: "tenant.change_requests",
          label: "Tenant change requests",
          status: "warning",
          value: tenantConsole.change_request_management.recent_requests.length,
          detail: "Submitted or approved tenant-owned changes awaiting decision/application.",
          href: "/tenant-admin",
          owner_role_ref: "tenant-admin",
        },
        {
          ref: "remediation.sla",
          label: "Remediation SLA",
          status: demoHrAdminDashboard.launch_audit.remediation_assignment_summary.open_count ? "warning" : "ready",
          value: 0,
          detail: `${demoHrAdminDashboard.launch_audit.remediation_assignment_summary.open_count} launch remediation assignments are open.`,
          href: "/hr-admin/launch-remediation",
          owner_role_ref: "release-manager",
        },
      ],
      launch_audit: {
        audit_profile_ref: demoHrAdminDashboard.launch_audit.audit_profile_ref,
        status: demoHrAdminDashboard.launch_audit.status,
        blocker_count: demoHrAdminDashboard.launch_audit.blocker_count,
        warning_count: demoHrAdminDashboard.launch_audit.warning_count,
        release_blocker_refs: demoHrAdminDashboard.launch_audit.release_blocker_refs,
        release_warning_refs: demoHrAdminDashboard.launch_audit.release_warning_refs,
      },
      commercial_control: {
        profile_ref: commercialControl.profile_ref,
        profile_source: commercialControl.profile_source,
        summary: commercialControl.summary,
        subscription: commercialControl.subscription,
        plan: commercialControl.plan,
        exceeded_usage_limits: commercialControl.exceeded_usage_limits,
      },
      resilience_readiness: {
        profile_ref: resilienceReadiness.profile_ref,
        resilience_profile_ref: resilienceReadiness.resilience_profile_ref,
        profile_source: resilienceReadiness.profile_source,
        summary: resilienceReadiness.summary,
        backup: resilienceReadiness.backup,
        restore: resilienceReadiness.restore,
        retention: resilienceReadiness.retention,
      },
      sla_operations: {
        profile_ref: slaOperations.profile_ref,
        sla_profile_ref: slaOperations.sla_profile_ref,
        profile_source: slaOperations.profile_source,
        summary: slaOperations.summary,
        health_signals: slaOperations.health_signals,
        incidents: slaOperations.incidents,
      },
      notification_delivery: {
        pending_count: demoHrAdminDashboard.delivery.pending_notifications,
        failed_count: demoHrAdminDashboard.delivery.failed_notifications,
        sent_today_count: demoHrAdminDashboard.delivery.sent_today,
        latest_activity_at: demoHrAdminDashboard.delivery.latest_activity_at,
      },
      provider_queue: {
        job_status_counts: { queued: 1 },
        retry_status_counts: { scheduled: 1 },
        stale_job_count: 0,
        dead_lettered_job_count: 0,
        dead_lettered_retry_event_count: 0,
      },
      support_access: {
        active_session_count: 1,
        expired_runtime_grant_count: 0,
        status_counts: { active: 1, requested: 1 },
        recent_grants: tenantConsole.support_access_management.recent_grants,
      },
      tenant_change_requests: {
        pending_count: tenantConsole.change_request_management.recent_requests.length,
        status_counts: { submitted: tenantConsole.change_request_management.recent_requests.length },
      },
      recent_commercial_events: commercialControl.recent_audit_events,
      recent_usage_snapshots: commercialControl.recent_usage_snapshots,
    };
  };

  switch (pathname) {
    case "/support/tenant-console/":
      return buildDemoSupportSessionTenantConsole() as T;
    case "/support/domain-snapshot/":
      return buildDemoSupportSessionDomainSnapshot() as T;
    case "/tenant-admin/console/":
      return buildDemoTenantAdminConsole() as T;
    case "/tenant-admin/trust-audit/":
      return buildDemoTenantAdminTrustAuditReview() as T;
    case "/tenant-admin/security-readiness/":
      return buildDemoTenantAdminEnterpriseSecurityReadiness() as T;
    case "/hr-admin/dashboard/":
      return demoHrAdminDashboard as T;
    case "/hr-admin/saas-control-plane/":
      return buildDemoSaasCommercialControl() as T;
    case "/hr-admin/saas-operational-health/":
      return buildDemoSaasOperationalHealth() as T;
    case "/hr-admin/saas-resilience/":
      return buildDemoSaasResilienceReadiness() as T;
    case "/hr-admin/saas-sla-operations/":
      return buildDemoSaasSlaOperations() as T;
    case "/hr-admin/launch-remediations/":
      return buildDemoLaunchRemediations() as T;
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
    case "/hr-admin/payroll-statutory-setup/":
      return buildDemoPayrollStatutorySetup() as T;
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
    case "/hr-admin/payroll-provider-connection-setup/":
      return buildDemoPayrollProviderConnectionSetup() as T;
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
    case "/me/statutory-declarations/":
      return buildDemoEssStatutoryDeclarations() as T;
    case "/me/payroll-payslips/":
      return buildDemoEssPayrollPayslips() as T;
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
