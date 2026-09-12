import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import type {
  HrAdminPayrollCalculationLine,
  HrAdminAttendanceRecordListResponse,
  HrAdminAttendanceRegularizationListResponse,
  HrAdminLeaveBalance,
  HrAdminPayrollFinanceHandoffSetupResponse,
  HrAdminPayrollAdjustmentSetupResponse,
  HrAdminPayrollInputSnapshot,
  HrAdminPayrollInputSnapshotSetupResponse,
  HrAdminPayrollOutputArtifact,
  HrAdminPayrollOutputSetupResponse,
  HrAdminPayrollReviewSetupResponse,
  HrAdminPayrollSettlementSetupResponse,
  HrAdminPayrollStatutoryFilingCalendar,
  HrAdminPayrollStatutorySetupResponse,
  HrAdminEmployeeListItem,
  HrAdminEmployeeDocumentListResponse,
  HrAdminLifecycleQueueItem,
  HrAdminLifecycleQueueListResponse,
} from "@/lib/types";

import {
  getHrAdminAttendanceRecords,
  getHrAdminAttendanceRegularizations,
  getHrAdminEmployeeDocuments,
  getHrAdminEmployees,
  getHrAdminLifecycleQueue,
  getHrAdminLeaveBalances,
  getHrAdminNotifications,
  getHrAdminPayrollAdjustmentSetup,
  getHrAdminPayrollInputSnapshotSetup,
  getHrAdminPayrollOutputSetup,
  getHrAdminPayrollReviewSetup,
  getHrAdminPayrollSettlementSetup,
  getMssApprovalInbox,
} from "@/lib/api";
import { actorTokenHash, appendBackendReportExportAudit, appendReportExportAudit, type ReportExportAuditInput } from "@/lib/report-export-audit-store";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;
const DEMO_DATA_ENABLED = process.env.HRMS_ENABLE_DEMO_DATA === "true";

type Props = { params: Promise<{ reportKey: string }> };

type UpstreamResult<T> = { ok: boolean; status: number; data: T | null; detail: string };
type ExportFilters = Record<string, string>;
type ExportAuditContext = {
  actorDisplay: string;
  token: string;
  request: NextRequest;
};

const REPORT_EVIDENCE_COLUMNS: Record<string, string[]> = {
  "document-compliance": [
    "employee_code",
    "employee_name",
    "category",
    "title",
    "document_number",
    "file_name",
    "mime_type",
    "file_size_bytes",
    "status",
    "verification_status",
    "issued_on",
    "expires_on",
    "expiry_state",
    "expiry_label",
    "days_until_expiry",
    "is_expired",
    "is_expiring_soon",
    "reupload_requested",
    "uploaded_by_identifier",
    "verified_by_identifier",
    "verified_at",
    "rejection_reason",
    "version_number",
    "review_history_count",
    "artifact_available",
    "compliance_risk",
  ],
  "lifecycle-queue": [
    "item_type",
    "item_label",
    "employee_code",
    "employee_name",
    "status",
    "status_label",
    "primary_date_label",
    "primary_date",
    "secondary_date_label",
    "secondary_date",
    "owner_value",
    "owner_label",
    "workflow_reference",
    "summary",
    "detail_href",
    "document_attention_state",
    "document_attention_summary",
    "missing_required_document_count",
    "future_due_document_count",
    "expired_document_count",
    "expiring_document_count",
    "attention_state",
    "attention_rank",
    "attention_item_count",
    "attention_summary",
    "attention_due_on",
    "next_due_on",
    "next_escalation_on",
    "bulk_status_warning",
    "created_at",
    "lifecycle_risk",
  ],
  "lifecycle-aging": [
    "item_type",
    "item_label",
    "employee_code",
    "employee_name",
    "status",
    "status_label",
    "owner_value",
    "owner_label",
    "workflow_reference",
    "created_at",
    "primary_date_label",
    "primary_date",
    "next_due_on",
    "next_escalation_on",
    "age_days",
    "age_bucket",
    "days_overdue",
    "sla_state",
    "sla_risk",
    "owner_gap",
    "document_blocker_count",
    "document_attention_state",
    "attention_rank",
    "attention_summary",
    "detail_href",
  ],
  "attendance-register": [
    "employee_code",
    "employee_name",
    "department",
    "designation",
    "attendance_date",
    "status",
    "source",
    "shift",
    "holiday",
    "check_in_at",
    "check_out_at",
    "work_duration_hours",
    "overtime_hours",
    "late_minutes",
    "early_exit_minutes",
    "is_regularized",
    "is_locked",
    "exception_type",
    "payroll_readiness",
    "notes",
    "detail_href",
  ],
  "leave-balance": [
    "employee_code",
    "employee_name",
    "leave_policy_name",
    "leave_type_name",
    "period_year",
    "opening_balance",
    "accrued_amount",
    "carry_forward_amount",
    "consumed_amount",
    "reserved_amount",
    "encashed_amount",
    "adjustment_amount",
    "closing_balance",
    "available_after_reserved",
    "utilization_percent",
    "liability_state",
    "liability_risk",
  ],
  "attendance-exceptions": [
    "employee_code",
    "employee_name",
    "department",
    "designation",
    "attendance_date",
    "current_status",
    "requested_status",
    "status",
    "shift",
    "actual_check_in_at",
    "actual_check_out_at",
    "requested_check_in_at",
    "requested_check_out_at",
    "reason",
    "manager_comment",
    "workflow_reference",
    "applied_at",
    "resolved_at",
    "aging_days",
    "sla_state",
    "sla_risk",
    "payroll_impact",
    "detail_href",
  ],
  "payroll-input-exceptions": [
    "employee_code",
    "employee_name",
    "payroll_run_name",
    "payroll_run_id",
    "run_status",
    "pay_group_name",
    "salary_structure_name",
    "salary_structure_version",
    "snapshot_status",
    "issue_type",
    "readiness_risk",
    "blocker_count",
    "warning_count",
    "issue_count",
    "lock_state",
    "locked_at",
    "period_start",
    "period_end",
    "attendance_present_days",
    "attendance_working_days",
    "attendance_days",
    "input_profile_ref",
    "source_collected_at",
    "source_hash",
    "first_blocker",
    "first_warning",
    "detail_href",
  ],
  "payroll-review-exceptions": [
    "payroll_run_name",
    "payroll_run_id",
    "review_id",
    "review_status",
    "review_profile_ref",
    "exception_id",
    "employee_code",
    "employee_name",
    "component_code",
    "category",
    "severity",
    "severity_label",
    "status",
    "status_label",
    "title",
    "detail",
    "decision_state",
    "decision_reason",
    "decided_at",
    "decided_by_name",
    "calculation_line_id",
    "input_snapshot_id",
    "exception_age_days",
    "review_exception_risk",
    "detail_href",
  ],
  "payroll-adjustments": [
    "employee_code",
    "employee_name",
    "payroll_run_name",
    "payroll_run_id",
    "component_code",
    "component_name",
    "kind",
    "kind_label",
    "direction",
    "direction_label",
    "status",
    "status_label",
    "approval_state",
    "amount",
    "currency_code",
    "amount_risk",
    "effective_date",
    "source_period_start",
    "source_period_end",
    "adjustment_profile_ref",
    "approval_profile_ref",
    "source_ref",
    "reason",
    "submitted_at",
    "approved_at",
    "rejected_at",
    "applied_at",
    "source_hash",
    "detail_href",
  ],
  "payroll-settlements": [
    "employee_code",
    "employee_name",
    "payroll_run_name",
    "payroll_run_id",
    "status",
    "status_label",
    "approval_state",
    "settlement_profile_ref",
    "approval_profile_ref",
    "calculation_profile_ref",
    "source_ref",
    "reason",
    "settlement_date",
    "last_working_date",
    "gross_dues",
    "deductions",
    "taxes",
    "reimbursements",
    "net_settlement",
    "currency_code",
    "net_amount_risk",
    "line_count",
    "line_kinds",
    "submitted_at",
    "approved_at",
    "rejected_at",
    "applied_at",
    "source_hash",
    "detail_href",
  ],
  "payroll-close-readiness": [
    "payroll_run_name",
    "payroll_run_id",
    "run_status",
    "input_lock_coverage_percent",
    "blocked_input_count",
    "warning_input_count",
    "open_review_exception_count",
    "open_review_blocker_count",
    "pending_adjustment_count",
    "pending_settlement_count",
    "output_batch_status",
    "output_artifact_count",
    "published_artifact_count",
    "close_readiness_state",
    "close_readiness_risk",
    "blocker_category",
    "primary_action",
    "evidence_summary",
    "source_hashes",
    "detail_href",
  ],
};

function evidenceColumnsForReport(reportKey: string, rows: Array<Record<string, unknown>>) {
  return Object.keys(rows[0] ?? {}).length ? Object.keys(rows[0] ?? {}) : REPORT_EVIDENCE_COLUMNS[reportKey] ?? [];
}

function toCsv(rows: Array<Record<string, unknown>>, headers?: string[]) {
  const csvHeaders = headers?.length ? headers : Object.keys(rows[0] ?? {});
  if (!csvHeaders.length) {
    return "message\nNo data available\n";
  }
  if (!rows.length) {
    const escapeHeader = (value: string) => `"${value.replace(/"/g, '""')}"`;
    return `${csvHeaders.map(escapeHeader).join(",")}\n`;
  }

  const escapeValue = (value: unknown) => {
    const raw = value == null ? "" : String(value);
    return `"${raw.replace(/"/g, '""')}"`;
  };

  const headerLine = csvHeaders.map(escapeValue).join(",");
  const lines = rows.map((row) => csvHeaders.map((header) => escapeValue(row[header])).join(","));
  return [headerLine, ...lines].join("\n");
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function upstreamJson<T>(path: string, token: string): Promise<UpstreamResult<T>> {
  if (!API_BASE_URL) {
    return { ok: false, status: 503, data: null, detail: "HRMS_API_BASE_URL is not configured." };
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Token ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    return {
      ok: false,
      status: response.status,
      data: null,
      detail: stringValue((payload as { detail?: unknown }).detail) || `Live API request failed with status ${response.status}.`,
    };
  }
  return { ok: true, status: response.status, data: (await response.json()) as T, detail: "" };
}

function artifactMatchesFiling(artifact: HrAdminPayrollOutputArtifact, filing: HrAdminPayrollStatutoryFilingCalendar) {
  if (artifact.kind !== "statutory_report") return false;
  const configCode = stringValue(artifact.config_snapshot.statutory_filing_calendar_code);
  if (configCode) return configCode === filing.code;
  return artifact.line_snapshot.some((rawLine) => {
    const line = rawLine as Record<string, unknown>;
    const lineCode = stringValue(line.filing_code || line.filing_calendar_code);
    if (lineCode) return lineCode === filing.code;
    return [line.statutory_type, line.component_code, line.statutory_component_code, line.component_name]
      .map((value) => stringValue(value).toLowerCase())
      .join(" ")
      .includes(filing.statutory_type.toLowerCase());
  });
}

function normalizedFilters(request: NextRequest) {
  const filters: ExportFilters = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    if (value && value !== "All") filters[key] = value;
  });
  return filters;
}

function rowMatchesQuery(row: Record<string, unknown>, query: string) {
  if (!query) return true;
  return Object.values(row).join(" ").toLowerCase().includes(query.toLowerCase());
}

function applyExportFilters(reportKey: string, rows: Array<Record<string, unknown>>, filters: ExportFilters) {
  const query = filters.q ?? "";
  return rows.filter((row) => {
    if (!rowMatchesQuery(row, query)) return false;
    if (reportKey === "challan-reconciliation") {
      if (filters.payment_status && row.payment_status !== filters.payment_status) return false;
      if (filters.provider_ref && row.provider_ref !== filters.provider_ref) return false;
    }
    if (reportKey === "statutory-filing-status") {
      if (filters.due_status && row.due_status !== filters.due_status) return false;
      if (filters.provider_ref && row.provider_ref !== filters.provider_ref) return false;
    }
    if (reportKey === "provider-filing-receipts") {
      if (filters.delivery_status && row.delivery_status !== filters.delivery_status) return false;
      if (filters.provider_status && row.provider_status !== filters.provider_status) return false;
      if (filters.provider_ref && row.provider_ref !== filters.provider_ref) return false;
    }
    if (reportKey === "payroll-register") {
      if (filters.batch_status && row.batch_status !== filters.batch_status) return false;
      if (filters.artifact_status && row.artifact_status !== filters.artifact_status) return false;
    }
    if (reportKey === "salary-variance") {
      if (filters.variance_band && row.variance_band !== filters.variance_band) return false;
    }
    if (reportKey === "bank-advice") {
      if (filters.handoff_status && row.handoff_status !== filters.handoff_status) return false;
      if (filters.delivery_status && row.delivery_status !== filters.delivery_status) return false;
      if (filters.provider_ref && row.provider_ref !== filters.provider_ref) return false;
    }
    if (reportKey === "workforce") {
      if (filters.employment_status && row.employment_status !== filters.employment_status) return false;
      if (filters.department && row.department !== filters.department) return false;
      if (filters.manager_view === "managers" && numberValue(row.direct_reports_count) <= 0) return false;
      if (filters.manager_view === "needs_reassignment" && row.reporting_manager) return false;
    }
    if (reportKey === "document-compliance") {
      if (filters.verification_status && row.verification_status !== filters.verification_status) return false;
      if (filters.status && row.status !== filters.status) return false;
      if (filters.category && row.category !== filters.category) return false;
      if (filters.expiry_focus === "expiring" && row.is_expiring_soon !== true) return false;
      if (filters.expiry_focus === "expired" && row.is_expired !== true) return false;
      if (filters.expiry_focus === "missing_expiry" && row.expires_on) return false;
    }
    if (reportKey === "lifecycle-queue") {
      if (filters.item_type && row.item_type !== filters.item_type) return false;
      if (filters.status && row.status !== filters.status) return false;
      if (filters.owner && row.owner_value !== filters.owner) return false;
      if (filters.attention_state && row.attention_state !== filters.attention_state) return false;
      if (filters.document_attention_state && row.document_attention_state !== filters.document_attention_state) return false;
    }
    if (reportKey === "lifecycle-aging") {
      if (filters.item_type && row.item_type !== filters.item_type) return false;
      if (filters.status && row.status !== filters.status) return false;
      if (filters.owner && row.owner_value !== filters.owner) return false;
      if (filters.age_bucket && row.age_bucket !== filters.age_bucket) return false;
      if (filters.sla_risk && row.sla_risk !== filters.sla_risk) return false;
      if (filters.escalation === "scheduled" && !row.next_escalation_on) return false;
      if (filters.escalation === "missing" && row.next_escalation_on) return false;
    }
    if (reportKey === "attendance-register") {
      if (filters.status && row.status !== filters.status) return false;
      if (filters.source && row.source !== filters.source) return false;
      if (filters.department && row.department !== filters.department) return false;
      if (filters.lock_state === "locked" && row.is_locked !== true) return false;
      if (filters.lock_state === "unlocked" && row.is_locked !== false) return false;
      if (filters.regularized_state === "regularized" && row.is_regularized !== true) return false;
      if (filters.regularized_state === "pending" && row.is_regularized !== false) return false;
      if (filters.exception_type && row.exception_type !== filters.exception_type) return false;
    }
    if (reportKey === "leave-balance") {
      if (filters.leave_policy && row.leave_policy_name !== filters.leave_policy) return false;
      if (filters.leave_type && row.leave_type_name !== filters.leave_type) return false;
      if (filters.period_year && String(row.period_year) !== filters.period_year) return false;
      if (filters.liability_risk && row.liability_risk !== filters.liability_risk) return false;
    }
    if (reportKey === "attendance-exceptions") {
      if (filters.status && row.status !== filters.status) return false;
      if (filters.requested_status && row.requested_status !== filters.requested_status) return false;
      if (filters.current_status && row.current_status !== filters.current_status) return false;
      if (filters.sla_risk && row.sla_risk !== filters.sla_risk) return false;
      if (filters.payroll_impact && row.payroll_impact !== filters.payroll_impact) return false;
    }
    if (reportKey === "payroll-input-exceptions") {
      if (filters.payroll_run_id && row.payroll_run_id !== filters.payroll_run_id) return false;
      if (filters.snapshot_status && row.snapshot_status !== filters.snapshot_status) return false;
      if (filters.pay_group && row.pay_group_name !== filters.pay_group) return false;
      if (filters.lock_state && row.lock_state !== filters.lock_state) return false;
      if (filters.issue_type && row.issue_type !== filters.issue_type) return false;
    }
    if (reportKey === "payroll-review-exceptions") {
      if (filters.payroll_run_id && row.payroll_run_id !== filters.payroll_run_id) return false;
      if (filters.severity && row.severity !== filters.severity) return false;
      if (filters.status && row.status !== filters.status) return false;
      if (filters.category && row.category !== filters.category) return false;
      if (filters.decision_state && row.decision_state !== filters.decision_state) return false;
    }
    if (reportKey === "payroll-adjustments") {
      if (filters.payroll_run_id && row.payroll_run_id !== filters.payroll_run_id) return false;
      if (filters.kind && row.kind !== filters.kind) return false;
      if (filters.direction && row.direction !== filters.direction) return false;
      if (filters.status && row.status !== filters.status) return false;
      if (filters.approval_state && row.approval_state !== filters.approval_state) return false;
      if (filters.amount_risk && row.amount_risk !== filters.amount_risk) return false;
    }
    if (reportKey === "payroll-settlements") {
      if (filters.payroll_run_id && row.payroll_run_id !== filters.payroll_run_id) return false;
      if (filters.status && row.status !== filters.status) return false;
      if (filters.approval_state && row.approval_state !== filters.approval_state) return false;
      if (filters.net_amount_risk && row.net_amount_risk !== filters.net_amount_risk) return false;
      if (filters.line_kind && !String(row.line_kinds ?? "").split("|").includes(filters.line_kind)) return false;
    }
    if (reportKey === "payroll-close-readiness") {
      if (filters.payroll_run_id && row.payroll_run_id !== filters.payroll_run_id) return false;
      if (filters.close_readiness_state && row.close_readiness_state !== filters.close_readiness_state) return false;
      if (filters.close_readiness_risk && row.close_readiness_risk !== filters.close_readiness_risk) return false;
      if (filters.blocker_category && row.blocker_category !== filters.blocker_category) return false;
      if (filters.output_batch_status && row.output_batch_status !== filters.output_batch_status) return false;
    }
    return true;
  });
}

const COMPLIANCE_SOURCE_ENDPOINTS = [
  "/hr-admin/payroll-statutory-setup/",
  "/hr-admin/payroll-finance-handoff-setup/",
];
const PAYROLL_REGISTER_SOURCE_ENDPOINTS = ["/hr-admin/payroll-output-setup/"];
const SALARY_VARIANCE_SOURCE_ENDPOINTS = ["/hr-admin/payroll-review-setup/"];
const BANK_ADVICE_SOURCE_ENDPOINTS = ["/hr-admin/payroll-finance-handoff-setup/"];
const WORKFORCE_SOURCE_ENDPOINTS = ["/hr-admin/employees/"];
const DOCUMENT_COMPLIANCE_SOURCE_ENDPOINTS = ["/hr-admin/employee-documents/"];
const LIFECYCLE_QUEUE_SOURCE_ENDPOINTS = ["/hr-admin/lifecycle-queue/"];
const ATTENDANCE_REGISTER_SOURCE_ENDPOINTS = ["/hr-admin/attendance-records/"];
const LEAVE_BALANCE_SOURCE_ENDPOINTS = ["/hr-admin/leave-balances/"];
const ATTENDANCE_EXCEPTIONS_SOURCE_ENDPOINTS = ["/hr-admin/attendance-regularizations/"];
const PAYROLL_INPUT_EXCEPTIONS_SOURCE_ENDPOINTS = ["/hr-admin/payroll-input-snapshot-setup/"];
const PAYROLL_REVIEW_EXCEPTIONS_SOURCE_ENDPOINTS = ["/hr-admin/payroll-review-setup/"];
const PAYROLL_ADJUSTMENTS_SOURCE_ENDPOINTS = ["/hr-admin/payroll-adjustment-setup/"];
const PAYROLL_SETTLEMENTS_SOURCE_ENDPOINTS = ["/hr-admin/payroll-settlement-setup/"];
const PAYROLL_CLOSE_READINESS_SOURCE_ENDPOINTS = [
  "/hr-admin/payroll-input-snapshot-setup/",
  "/hr-admin/payroll-review-setup/",
  "/hr-admin/payroll-adjustment-setup/",
  "/hr-admin/payroll-settlement-setup/",
  "/hr-admin/payroll-output-setup/",
];

function sourceEndpointsForReport(reportKey: string) {
  if (reportKey === "workforce") return WORKFORCE_SOURCE_ENDPOINTS;
  if (reportKey === "document-compliance") return DOCUMENT_COMPLIANCE_SOURCE_ENDPOINTS;
  if (reportKey === "lifecycle-queue" || reportKey === "lifecycle-aging") return LIFECYCLE_QUEUE_SOURCE_ENDPOINTS;
  if (reportKey === "attendance-register") return ATTENDANCE_REGISTER_SOURCE_ENDPOINTS;
  if (reportKey === "leave-balance") return LEAVE_BALANCE_SOURCE_ENDPOINTS;
  if (reportKey === "attendance-exceptions") return ATTENDANCE_EXCEPTIONS_SOURCE_ENDPOINTS;
  if (reportKey === "payroll-input-exceptions") return PAYROLL_INPUT_EXCEPTIONS_SOURCE_ENDPOINTS;
  if (reportKey === "payroll-review-exceptions") return PAYROLL_REVIEW_EXCEPTIONS_SOURCE_ENDPOINTS;
  if (reportKey === "payroll-adjustments") return PAYROLL_ADJUSTMENTS_SOURCE_ENDPOINTS;
  if (reportKey === "payroll-settlements") return PAYROLL_SETTLEMENTS_SOURCE_ENDPOINTS;
  if (reportKey === "payroll-close-readiness") return PAYROLL_CLOSE_READINESS_SOURCE_ENDPOINTS;
  if (reportKey === "payroll-register") return PAYROLL_REGISTER_SOURCE_ENDPOINTS;
  if (reportKey === "salary-variance") return SALARY_VARIANCE_SOURCE_ENDPOINTS;
  if (reportKey === "bank-advice") return BANK_ADVICE_SOURCE_ENDPOINTS;
  return COMPLIANCE_SOURCE_ENDPOINTS;
}

function requestIdentifier(request: NextRequest) {
  return request.headers.get("x-request-id") || createHash("sha256").update(`${Date.now()}:${Math.random()}`).digest("hex").slice(0, 24);
}

async function recordExportAudit({
  auditContext,
  checksum,
  contentType,
  exportType,
  filters,
  reportKey,
  rows,
  sourceEndpoints,
}: {
  auditContext?: ExportAuditContext;
  checksum: string;
  contentType: string;
  exportType: "csv" | "manifest";
  filters: ExportFilters;
  reportKey: string;
  rows: Array<Record<string, unknown>>;
  sourceEndpoints: string[];
}) {
  if (!auditContext) return;
  const evidenceColumns = evidenceColumnsForReport(reportKey, rows);
  const auditRecord: ReportExportAuditInput = {
    tenant_ref: "current-workspace",
    actor_display: auditContext.actorDisplay || "HR admin",
    actor_token_hash: actorTokenHash(auditContext.token),
    report_key: reportKey,
    export_type: exportType,
    filters,
    row_count: rows.length,
    checksum_sha256: checksum,
    content_type: contentType,
    source_endpoints: sourceEndpoints,
    evidence_columns: evidenceColumns,
    request_identifier: requestIdentifier(auditContext.request),
    user_agent: auditContext.request.headers.get("user-agent") || "",
  };
  if (API_BASE_URL) {
    await appendBackendReportExportAudit(API_BASE_URL, auditContext.token, auditRecord).catch(() => undefined);
    await appendReportExportAudit(auditRecord);
    return;
  }
  await appendReportExportAudit(auditRecord);
}

async function reportResponse(reportKey: string, rows: Array<Record<string, unknown>>, filters: ExportFilters = {}, auditContext?: ExportAuditContext) {
  const evidenceColumns = evidenceColumnsForReport(reportKey, rows);
  const csv = toCsv(rows, evidenceColumns);
  const filterSnapshot = JSON.stringify(filters);
  const checksum = createHash("sha256").update(csv).digest("hex");
  const sourceEndpoints = sourceEndpointsForReport(reportKey);
  await recordExportAudit({
    auditContext,
    checksum,
    contentType: "text/csv",
    exportType: "csv",
    filters,
    reportKey,
    rows,
    sourceEndpoints,
  });
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${reportKey}.csv"`,
      "X-HRMS-Generated-At": new Date().toISOString(),
      "X-HRMS-Report-Filters": filterSnapshot,
      "X-HRMS-Report-Checksum": checksum,
      "X-HRMS-Report-Key": reportKey,
      "X-HRMS-Source-Row-Count": String(rows.length),
    },
  });
}

async function manifestResponse(reportKey: string, rows: Array<Record<string, unknown>>, filters: ExportFilters = {}, auditContext?: ExportAuditContext) {
  const evidenceColumns = evidenceColumnsForReport(reportKey, rows);
  const csv = toCsv(rows, evidenceColumns);
  const checksum = createHash("sha256").update(csv).digest("hex");
  const sourceEndpoints = sourceEndpointsForReport(reportKey);
  await recordExportAudit({
    auditContext,
    checksum,
    contentType: "application/json",
    exportType: "manifest",
    filters,
    reportKey,
    rows,
    sourceEndpoints,
  });
  return NextResponse.json(
    {
      report_key: reportKey,
      export_schema_version: "hrms.report.export.manifest.v1",
      generated_at: new Date().toISOString(),
      filters,
      row_count: rows.length,
      csv_checksum_sha256: checksum,
      csv_content_type: "text/csv",
      source_endpoints: sourceEndpoints,
      evidence_columns: evidenceColumns,
    },
    {
      headers: {
        "X-HRMS-Generated-At": new Date().toISOString(),
        "X-HRMS-Report-Checksum": checksum,
        "X-HRMS-Report-Filters": JSON.stringify(filters),
        "X-HRMS-Report-Key": reportKey,
        "X-HRMS-Source-Row-Count": String(rows.length),
      },
    },
  );
}

async function exportResponse(request: NextRequest, reportKey: string, rows: Array<Record<string, unknown>>, filters: ExportFilters = {}, auditContext?: ExportAuditContext) {
  if (request.nextUrl.searchParams.get("format") === "manifest") {
    return manifestResponse(reportKey, rows, filters, auditContext);
  }
  return reportResponse(reportKey, rows, filters, auditContext);
}

async function getComplianceExportRows(reportKey: string, token: string) {
  if (!["challan-reconciliation", "statutory-filing-status", "provider-filing-receipts"].includes(reportKey)) {
    return null;
  }

  const [statutoryResult, handoffResult] = await Promise.all([
    upstreamJson<HrAdminPayrollStatutorySetupResponse>("/hr-admin/payroll-statutory-setup/", token),
    upstreamJson<HrAdminPayrollFinanceHandoffSetupResponse>("/hr-admin/payroll-finance-handoff-setup/", token),
  ]);

  if (!statutoryResult.ok) return { error: statutoryResult };
  if (!handoffResult.ok) return { error: handoffResult };

  const statutory = statutoryResult.data;
  const handoff = handoffResult.data;
  if (!statutory || !handoff) return { error: { ok: false, status: 502, data: null, detail: "Live report source data is unavailable." } };

  if (reportKey === "provider-filing-receipts") {
    return {
      rows: handoff.deliveries.map((delivery) => {
        const callbacks = handoff.callback_events.filter((event) => event.provider_delivery_id === delivery.id);
        const retries = handoff.retry_events.filter((event) => event.provider_delivery_id === delivery.id);
        const jobs = handoff.provider_jobs.filter((job) => job.provider_delivery_id === delivery.id);
        return {
          artifact_title: delivery.output_artifact_title,
          artifact_kind: delivery.artifact_kind,
          delivery_status: delivery.status,
          provider_status: callbacks[0]?.provider_status || "callback.pending",
          provider_ref: delivery.provider_ref,
          channel_ref: delivery.channel_ref,
          external_reference: delivery.external_reference || "receipt.pending",
          submitted_at: delivery.submitted_at || "",
          acknowledged_at: delivery.acknowledged_at || "",
          reconciled_at: delivery.reconciled_at || "",
          attempt_count: delivery.attempt_count,
          callback_count: callbacks.length,
          retry_count: retries.length,
          job_count: jobs.length,
          payload_checksum_sha256: delivery.payload_checksum_sha256 || callbacks[0]?.payload_checksum_sha256 || "checksum.pending",
          failure_code: delivery.failure_code || callbacks[0]?.failure_code || retries[0]?.failure_code || "",
          failure_reason: delivery.failure_reason || callbacks[0]?.failure_reason || retries[0]?.failure_reason || "",
        };
      }),
    };
  }

  const registrationsByType = new Map(statutory.employer_registrations.map((registration) => [registration.statutory_type, registration]));
  if (reportKey === "statutory-filing-status") {
    return {
      rows: statutory.filing_calendars.map((filing) => {
        const artifacts = handoff.artifacts.filter((artifact) => artifactMatchesFiling(artifact, filing));
        const registration = registrationsByType.get(filing.statutory_type);
        return {
          filing_code: filing.code,
          filing_name: filing.name,
          filing_type_ref: filing.filing_type_ref,
          statutory_type: filing.statutory_type,
          filing_frequency: filing.filing_frequency,
          period_start: filing.period_start,
          period_end: filing.period_end,
          due_date: filing.due_date,
          due_status: filing.status === "acknowledged" || filing.status === "filed" ? "Acknowledged" : filing.is_overdue ? "Overdue" : filing.is_due ? "Due" : "Open",
          status: filing.status,
          is_due: filing.is_due,
          is_overdue: filing.is_overdue,
          employer_registration_number: filing.employer_registration_number || registration?.registration_number || "",
          filing_authority_ref: filing.filing_authority_ref || registration?.filing_authority_ref || "",
          provider_ref: filing.provider_ref || registration?.provider_ref || "",
          output_profile_ref: filing.output_profile_ref,
          source_hash: filing.source_hash || artifacts[0]?.source_hash || "",
          artifact_count: artifacts.length,
          published_artifact_count: artifacts.filter((artifact) => artifact.status === "published").length,
        };
      }),
    };
  }

  return {
    rows: statutory.filing_calendars.map((filing) => {
      const artifacts = handoff.artifacts.filter((artifact) => artifactMatchesFiling(artifact, filing));
      const matchedLines = artifacts.flatMap((artifact) => artifact.line_snapshot.map((rawLine) => ({ artifact, line: rawLine as Record<string, unknown> })));
      const registration = registrationsByType.get(filing.statutory_type);
      const amount = matchedLines.reduce((sum, item) => sum + numberValue(item.line.amount), 0);
      return {
        filing_code: filing.code,
        filing_name: filing.name,
        filing_type_ref: filing.filing_type_ref,
        statutory_type: filing.statutory_type,
        period_start: filing.period_start,
        period_end: filing.period_end,
        due_date: filing.due_date,
        payment_status: !matchedLines.length ? "Pending artifact" : "Mapped",
        amount,
        employer_registration_number: filing.employer_registration_number || registration?.registration_number || "",
        filing_authority_ref: filing.filing_authority_ref || registration?.filing_authority_ref || "",
        provider_ref: filing.provider_ref || registration?.provider_ref || "",
        artifact_count: artifacts.length,
        source_hash: matchedLines[0]?.line.source_hash || matchedLines[0]?.artifact.source_hash || filing.source_hash || "",
      };
    }),
  };
}

async function getPayrollRegisterExportRows(reportKey: string, token: string) {
  if (reportKey !== "payroll-register") return null;

  const outputResult = await upstreamJson<HrAdminPayrollOutputSetupResponse>("/hr-admin/payroll-output-setup/", token);
  if (!outputResult.ok) return { error: outputResult };

  const output = outputResult.data;
  if (!output) return { error: { ok: false, status: 502, data: null, detail: "Live payroll register source data is unavailable." } };

  const batchById = new Map(output.output_batches.map((batch) => [batch.id, batch]));
  return {
    rows: output.artifacts
      .filter((artifact) => artifact.kind === "register")
      .map((artifact) => {
        const batch = batchById.get(artifact.output_batch_id);
        return {
          payroll_run_name: batch?.payroll_run_name || artifact.title,
          output_batch_id: artifact.output_batch_id,
          artifact_id: artifact.id,
          artifact_key: artifact.artifact_key,
          file_name: artifact.file_name,
          batch_status: batch?.status || "",
          artifact_status: artifact.status,
          published_at: artifact.published_at || "",
          gross_earnings: numberValue(artifact.totals_snapshot.gross_earnings),
          employee_deductions: numberValue(artifact.totals_snapshot.employee_deductions),
          net_pay: numberValue(artifact.totals_snapshot.net_pay),
          output_profile_ref: artifact.output_profile_ref,
          storage_provider_ref: artifact.storage_provider_ref,
          storage_object_version: artifact.storage_object_version,
          checksum_sha256: artifact.checksum_sha256,
          source_hash: artifact.source_hash,
          is_downloadable: artifact.is_downloadable,
        };
      }),
  };
}

function calculationLineAmount(line: HrAdminPayrollCalculationLine) {
  return numberValue(line.amount);
}

function baselineNetPayForLines(lines: HrAdminPayrollCalculationLine[]) {
  for (const line of lines) {
    const baseline = line.context_snapshot.previous_net_pay ?? line.context_snapshot.baseline_net_pay ?? line.context_snapshot.prior_period_net_pay;
    if (baseline !== undefined && baseline !== null && Number.isFinite(Number(baseline))) return Number(baseline);
  }
  return null;
}

async function getSalaryVarianceExportRows(reportKey: string, token: string) {
  if (reportKey !== "salary-variance") return null;

  const reviewResult = await upstreamJson<HrAdminPayrollReviewSetupResponse>("/hr-admin/payroll-review-setup/", token);
  if (!reviewResult.ok) return { error: reviewResult };

  const reviewSetup = reviewResult.data;
  if (!reviewSetup) return { error: { ok: false, status: 502, data: null, detail: "Live salary variance source data is unavailable." } };

  const reviewByCalculationId = new Map(reviewSetup.reviews.map((review) => [review.calculation_id, review]));
  const grouped = new Map<string, HrAdminPayrollCalculationLine[]>();
  for (const line of reviewSetup.lines) {
    const key = `${line.calculation_id}:${line.employee_id}`;
    grouped.set(key, [...(grouped.get(key) ?? []), line]);
  }

  return {
    rows: Array.from(grouped.values()).map((group) => {
      const first = group[0];
      const review = reviewByCalculationId.get(first.calculation_id) ?? null;
      const gross_earnings = group
        .filter((line) => line.line_type === "earning" || line.line_type === "gross" || calculationLineAmount(line) > 0)
        .reduce((sum, line) => sum + Math.max(0, calculationLineAmount(line)), 0);
      const employee_deductions = Math.abs(
        group
          .filter((line) => line.line_type === "deduction" || calculationLineAmount(line) < 0)
          .reduce((sum, line) => sum + calculationLineAmount(line), 0),
      );
      const explicitNet = group.find((line) => line.line_type === "net_pay" || line.component_code.toLowerCase() === "net_pay");
      const current_net_pay = explicitNet ? calculationLineAmount(explicitNet) : gross_earnings - employee_deductions;
      const baseline_net_pay = baselineNetPayForLines(group);
      const variance_amount = baseline_net_pay == null ? null : current_net_pay - baseline_net_pay;
      const variance_percent = baseline_net_pay == null || baseline_net_pay === 0 || variance_amount == null ? null : (variance_amount / baseline_net_pay) * 100;
      const variance_band =
        variance_amount == null
          ? "Baseline pending"
          : variance_amount > 0
            ? "Increase"
            : variance_amount < 0
              ? "Decrease"
              : "No change";

      return {
        employee_code: first.employee_code,
        employee_name: first.employee_name,
        payroll_run_name: review?.payroll_run_name ?? first.payroll_run_id,
        payroll_run_id: first.payroll_run_id,
        review_id: review?.id ?? "",
        review_status: review?.status ?? "",
        calculation_id: first.calculation_id,
        gross_earnings,
        employee_deductions,
        current_net_pay,
        baseline_net_pay,
        variance_amount,
        variance_percent,
        variance_band,
        calculation_line_count: group.length,
        source_hash: first.source_hash,
      };
    }),
  };
}

async function getBankAdviceExportRows(reportKey: string, token: string) {
  if (reportKey !== "bank-advice") return null;

  const handoffResult = await upstreamJson<HrAdminPayrollFinanceHandoffSetupResponse>("/hr-admin/payroll-finance-handoff-setup/", token);
  if (!handoffResult.ok) return { error: handoffResult };

  const handoffSetup = handoffResult.data;
  if (!handoffSetup) return { error: { ok: false, status: 502, data: null, detail: "Live bank advice source data is unavailable." } };

  const handoffByBatchId = new Map(handoffSetup.handoffs.map((handoff) => [handoff.output_batch_id, handoff]));
  const deliveryByArtifactId = new Map(handoffSetup.deliveries.map((delivery) => [delivery.output_artifact_id, delivery]));
  return {
    rows: handoffSetup.artifacts
      .filter((artifact) => artifact.kind === "bank_advice")
      .map((artifact) => {
        const handoff = handoffByBatchId.get(artifact.output_batch_id) ?? null;
        const delivery = deliveryByArtifactId.get(artifact.id) ?? null;
        return {
          payroll_run_name: handoff?.payroll_run_name ?? artifact.title,
          payroll_run_id: artifact.payroll_run_id,
          handoff_id: handoff?.id ?? "",
          handoff_status: handoff?.status ?? "",
          bank_file_profile_ref: handoff?.bank_file_profile_ref ?? "",
          handoff_profile_ref: handoff?.handoff_profile_ref ?? "",
          artifact_id: artifact.id,
          artifact_key: artifact.artifact_key,
          file_name: artifact.file_name,
          artifact_status: artifact.status,
          bank_advice_total: numberValue(artifact.totals_snapshot.bank_advice_total ?? artifact.totals_snapshot.net_pay),
          employee_count: numberValue(artifact.totals_snapshot.employee_count ?? artifact.line_snapshot.length),
          provider_ref: delivery?.provider_ref ?? "",
          delivery_status: delivery?.status ?? "pending",
          external_reference: delivery?.external_reference ?? "",
          submitted_at: delivery?.submitted_at ?? "",
          acknowledged_at: delivery?.acknowledged_at ?? "",
          reconciled_at: delivery?.reconciled_at ?? "",
          payload_checksum_sha256: delivery?.payload_checksum_sha256 ?? "",
          checksum_sha256: artifact.checksum_sha256,
          source_hash: artifact.source_hash,
        };
      }),
  };
}

async function getWorkforceExportRows(reportKey: string, token: string) {
  if (reportKey !== "workforce") return null;

  const employeeResult = await upstreamJson<HrAdminEmployeeListItem[]>("/hr-admin/employees/", token);
  if (!employeeResult.ok) return { error: employeeResult };

  const employees = employeeResult.data;
  if (!employees) return { error: { ok: false, status: 502, data: null, detail: "Live workforce source data is unavailable." } };

  return {
    rows: employees.map((item) => ({
      employee_code: item.employee_code,
      full_name: item.full_name,
      work_email: item.work_email,
      phone_number: item.phone_number,
      employment_status: item.employment_status,
      date_of_joining: item.date_of_joining,
      legal_entity: item.legal_entity,
      branch: item.branch,
      location: item.location,
      business_unit: item.business_unit,
      department: item.department,
      cost_center: item.cost_center,
      designation: item.designation,
      grade: item.grade,
      employment_type: item.employment_type,
      reporting_manager: item.reporting_manager,
      has_access: item.has_access,
      membership_status: item.membership_status,
      assigned_role_count: item.assigned_role_count,
      direct_reports_count: item.direct_reports_count,
      manager_coverage_status: item.reporting_manager || item.direct_reports_count > 0 ? "Mapped" : "Needs reassignment",
      access_coverage_status: item.has_access ? "Provisioned" : "Pending",
    })),
  };
}

async function getDocumentComplianceExportRows(reportKey: string, token: string) {
  if (reportKey !== "document-compliance") return null;

  const documentResult = await upstreamJson<HrAdminEmployeeDocumentListResponse>("/hr-admin/employee-documents/?page=1&page_size=500", token);
  if (!documentResult.ok) return { error: documentResult };

  const documents = documentResult.data;
  if (!documents) return { error: { ok: false, status: 502, data: null, detail: "Live document compliance source data is unavailable." } };

  return {
    rows: documents.items.map((item) => ({
      employee_code: item.employee_code,
      employee_name: item.employee_name,
      category: item.category_name,
      title: item.title,
      document_number: item.document_number,
      file_name: item.file_name,
      mime_type: item.mime_type,
      file_size_bytes: item.file_size_bytes,
      status: item.status,
      verification_status: item.verification_status,
      issued_on: item.issued_on,
      expires_on: item.expires_on,
      expiry_state: item.expiry_state,
      expiry_label: item.expiry_label,
      days_until_expiry: item.days_until_expiry,
      is_expired: item.is_expired,
      is_expiring_soon: item.is_expiring_soon,
      reupload_requested: item.reupload_requested,
      uploaded_by_identifier: item.uploaded_by_identifier,
      verified_by_identifier: item.verified_by_identifier,
      verified_at: item.verified_at,
      rejection_reason: item.rejection_reason,
      version_number: item.version_number,
      review_history_count: item.review_history.length,
      artifact_available: Boolean(item.artifact_id),
      compliance_risk:
        item.is_expired || item.verification_status === "rejected"
          ? "High"
          : item.is_expiring_soon || item.verification_status === "pending"
            ? "Medium"
            : "Low",
    })),
  };
}

function lifecycleRisk(item: { attention_rank: number; document_attention_state: string; bulk_status_warning: string }) {
  if (item.attention_rank >= 80 || item.document_attention_state === "blocked" || item.bulk_status_warning) return "High";
  if (item.attention_rank >= 40 || item.document_attention_state === "warning" || item.document_attention_state === "upcoming") return "Medium";
  return "Low";
}

function dateOnly(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function daysSince(value: string | null | undefined) {
  const date = dateOnly(value);
  if (!date) return 0;
  const today = dateOnly(new Date().toISOString()) ?? new Date();
  return Math.max(0, Math.floor((today.getTime() - date.getTime()) / 86_400_000));
}

function daysOverdue(value: string | null | undefined) {
  const date = dateOnly(value);
  if (!date) return 0;
  const today = dateOnly(new Date().toISOString()) ?? new Date();
  return Math.max(0, Math.floor((today.getTime() - date.getTime()) / 86_400_000));
}

function lifecycleAgeBucket(ageDays: number) {
  if (ageDays >= 30) return "30+ days";
  if (ageDays >= 15) return "15-29 days";
  if (ageDays >= 8) return "8-14 days";
  return "0-7 days";
}

function lifecycleSlaState(item: HrAdminLifecycleQueueItem) {
  const overdue = daysOverdue(item.next_due_on ?? item.attention_due_on);
  if (overdue > 0) return "Overdue";
  if (item.next_escalation_on) return "Escalation scheduled";
  if (!item.owner_value) return "Owner missing";
  if (item.document_attention_state === "blocked") return "Document blocked";
  return "On track";
}

function lifecycleSlaRisk(item: HrAdminLifecycleQueueItem) {
  const overdue = daysOverdue(item.next_due_on ?? item.attention_due_on);
  if (overdue >= 3 || item.document_attention_state === "blocked" || !item.owner_value) return "High";
  if (overdue > 0 || item.next_escalation_on || item.attention_rank >= 40 || item.document_attention_state === "warning") return "Medium";
  return "Low";
}

async function getLifecycleQueueExportRows(reportKey: string, token: string) {
  if (reportKey !== "lifecycle-queue" && reportKey !== "lifecycle-aging") return null;

  const lifecycleResult = await upstreamJson<HrAdminLifecycleQueueListResponse>("/hr-admin/lifecycle-queue/?page=1&page_size=500", token);
  if (!lifecycleResult.ok) return { error: lifecycleResult };

  const lifecycle = lifecycleResult.data;
  if (!lifecycle) return { error: { ok: false, status: 502, data: null, detail: "Live lifecycle queue source data is unavailable." } };

  if (reportKey === "lifecycle-aging") {
    return {
      rows: lifecycle.items.map((item) => {
        const ageDays = daysSince(item.created_at);
        const overdue = daysOverdue(item.next_due_on ?? item.attention_due_on);
        return {
          item_type: item.item_type,
          item_label: item.item_label,
          employee_code: item.employee_code,
          employee_name: item.employee_name,
          status: item.status,
          status_label: item.status_label,
          owner_value: item.owner_value,
          owner_label: item.owner_label,
          workflow_reference: item.workflow_reference,
          created_at: item.created_at,
          primary_date_label: item.primary_date_label,
          primary_date: item.primary_date,
          next_due_on: item.next_due_on,
          next_escalation_on: item.next_escalation_on,
          age_days: ageDays,
          age_bucket: lifecycleAgeBucket(ageDays),
          days_overdue: overdue,
          sla_state: lifecycleSlaState(item),
          sla_risk: lifecycleSlaRisk(item),
          owner_gap: !item.owner_value,
          document_blocker_count: item.missing_required_document_count + item.expired_document_count,
          document_attention_state: item.document_attention_state,
          attention_rank: item.attention_rank,
          attention_summary: item.attention_summary,
          detail_href: item.detail_href,
        };
      }),
    };
  }

  return {
    rows: lifecycle.items.map((item) => ({
      item_type: item.item_type,
      item_label: item.item_label,
      employee_code: item.employee_code,
      employee_name: item.employee_name,
      status: item.status,
      status_label: item.status_label,
      primary_date_label: item.primary_date_label,
      primary_date: item.primary_date,
      secondary_date_label: item.secondary_date_label,
      secondary_date: item.secondary_date,
      owner_value: item.owner_value,
      owner_label: item.owner_label,
      workflow_reference: item.workflow_reference,
      summary: item.summary,
      detail_href: item.detail_href,
      document_attention_state: item.document_attention_state,
      document_attention_summary: item.document_attention_summary,
      missing_required_document_count: item.missing_required_document_count,
      future_due_document_count: item.future_due_document_count,
      expired_document_count: item.expired_document_count,
      expiring_document_count: item.expiring_document_count,
      attention_state: item.attention_state,
      attention_rank: item.attention_rank,
      attention_item_count: item.attention_item_count,
      attention_summary: item.attention_summary,
      attention_due_on: item.attention_due_on,
      next_due_on: item.next_due_on,
      next_escalation_on: item.next_escalation_on,
      bulk_status_warning: item.bulk_status_warning,
      created_at: item.created_at,
      lifecycle_risk: lifecycleRisk(item),
    })),
  };
}

function attendanceExceptionType(item: {
  late_minutes: number;
  early_exit_minutes: number;
  status: string;
  is_regularized: boolean;
}) {
  if (item.status === "absent") return "Absent";
  if (item.late_minutes > 0 && item.early_exit_minutes > 0) return "Late and early exit";
  if (item.late_minutes > 0) return "Late";
  if (item.early_exit_minutes > 0) return "Early exit";
  if (item.is_regularized) return "Regularized";
  return "Clear";
}

function attendancePayrollReadiness(item: {
  is_locked: boolean;
  status: string;
  late_minutes: number;
  early_exit_minutes: number;
  is_regularized: boolean;
}) {
  if (!item.is_locked) return "Open";
  if (item.status === "absent" || item.late_minutes > 0 || item.early_exit_minutes > 0) {
    return item.is_regularized ? "Ready with regularization" : "Exception review";
  }
  return "Ready";
}

async function getAttendanceRegisterExportRows(reportKey: string, token: string) {
  if (reportKey !== "attendance-register") return null;

  const attendanceResult = await upstreamJson<HrAdminAttendanceRecordListResponse>("/hr-admin/attendance-records/?page=1&page_size=500", token);
  if (!attendanceResult.ok) return { error: attendanceResult };

  const attendance = attendanceResult.data;
  if (!attendance) return { error: { ok: false, status: 502, data: null, detail: "Live attendance record source data is unavailable." } };

  return {
    rows: attendance.items.map((item) => ({
      employee_code: item.employee_code,
      employee_name: item.employee_name,
      department: item.department,
      designation: item.designation,
      attendance_date: item.attendance_date,
      status: item.status,
      source: item.source,
      shift: item.shift,
      holiday: item.holiday,
      check_in_at: item.check_in_at,
      check_out_at: item.check_out_at,
      work_duration_hours: item.work_duration_hours,
      overtime_hours: item.overtime_hours,
      late_minutes: item.late_minutes,
      early_exit_minutes: item.early_exit_minutes,
      is_regularized: item.is_regularized,
      is_locked: item.is_locked,
      exception_type: attendanceExceptionType(item),
      payroll_readiness: attendancePayrollReadiness(item),
      notes: item.notes,
      detail_href: `/hr-admin/attendance-records/${item.id}/edit`,
    })),
  };
}

function availableLeaveUnits(item: HrAdminLeaveBalance) {
  return Number(item.closing_balance) - Number(item.reserved_amount);
}

function leaveUtilizationPercent(item: HrAdminLeaveBalance) {
  const earned = Number(item.opening_balance) + Number(item.accrued_amount) + Number(item.carry_forward_amount) + Number(item.adjustment_amount);
  if (!earned) return 0;
  return Math.round((Number(item.consumed_amount) / earned) * 100);
}

function leaveLiabilityRisk(item: HrAdminLeaveBalance) {
  const available = availableLeaveUnits(item);
  if (available < 0) return "High";
  if (Number(item.reserved_amount) > 0 || available <= 2) return "Medium";
  return "Low";
}

function leaveLiabilityState(item: HrAdminLeaveBalance) {
  const available = availableLeaveUnits(item);
  if (available < 0) return "Overdrawn";
  if (Number(item.reserved_amount) > 0) return "Reserved";
  if (available <= 2) return "Low balance";
  return "Healthy";
}

async function getLeaveBalanceExportRows(reportKey: string, token: string) {
  if (reportKey !== "leave-balance") return null;

  const leaveResult = await upstreamJson<HrAdminLeaveBalance[]>("/hr-admin/leave-balances/", token);
  if (!leaveResult.ok) return { error: leaveResult };

  const balances = leaveResult.data;
  if (!balances) return { error: { ok: false, status: 502, data: null, detail: "Live leave balance source data is unavailable." } };

  return {
    rows: balances.map((item) => ({
      employee_code: item.employee_code,
      employee_name: item.employee_name,
      leave_policy_name: item.leave_policy_name,
      leave_type_name: item.leave_type_name,
      period_year: item.period_year,
      opening_balance: item.opening_balance,
      accrued_amount: item.accrued_amount,
      carry_forward_amount: item.carry_forward_amount,
      consumed_amount: item.consumed_amount,
      reserved_amount: item.reserved_amount,
      encashed_amount: item.encashed_amount,
      adjustment_amount: item.adjustment_amount,
      closing_balance: item.closing_balance,
      available_after_reserved: availableLeaveUnits(item).toFixed(2),
      utilization_percent: leaveUtilizationPercent(item),
      liability_state: leaveLiabilityState(item),
      liability_risk: leaveLiabilityRisk(item),
    })),
  };
}

function attendanceExceptionAgingDays(appliedAt: string | null, createdAt: string, resolvedAt?: string | null) {
  const start = dateOnly(appliedAt ?? createdAt);
  const end = dateOnly(resolvedAt ?? new Date().toISOString());
  if (!start || !end) return 0;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}

function attendanceExceptionSlaRisk(status: string, agingDays: number) {
  if (status === "pending" && agingDays >= 3) return "High";
  if (status === "pending" || agingDays >= 2) return "Medium";
  return "Low";
}

function attendanceExceptionSlaState(status: string, agingDays: number) {
  if (status === "pending" && agingDays >= 3) return "Overdue";
  if (status === "pending") return "Pending review";
  if (status === "applied") return "Resolved";
  if (status === "rejected") return "Rejected";
  return "Tracked";
}

function attendanceExceptionPayrollImpact(currentStatus: string, requestedStatus: string) {
  if (currentStatus === requestedStatus) return "No status change";
  if ([currentStatus, requestedStatus].includes("absent")) return "LOP impact";
  if ([currentStatus, requestedStatus].includes("half_day")) return "Partial day impact";
  return "Attendance correction";
}

async function getAttendanceExceptionsExportRows(reportKey: string, token: string) {
  if (reportKey !== "attendance-exceptions") return null;

  const regularizationResult = await upstreamJson<HrAdminAttendanceRegularizationListResponse>("/hr-admin/attendance-regularizations/?page=1&page_size=500", token);
  if (!regularizationResult.ok) return { error: regularizationResult };

  const regularizations = regularizationResult.data;
  if (!regularizations) return { error: { ok: false, status: 502, data: null, detail: "Live attendance regularization source data is unavailable." } };

  return {
    rows: regularizations.items.map((item) => {
      const agingDays = attendanceExceptionAgingDays(item.applied_at, item.created_at, item.resolved_at);
      return {
        employee_code: item.employee_code,
        employee_name: item.employee_name,
        department: item.department,
        designation: item.designation,
        attendance_date: item.attendance_date,
        current_status: item.current_status,
        requested_status: item.requested_status,
        status: item.status,
        shift: item.shift,
        actual_check_in_at: item.actual_check_in_at,
        actual_check_out_at: item.actual_check_out_at,
        requested_check_in_at: item.requested_check_in_at,
        requested_check_out_at: item.requested_check_out_at,
        reason: item.reason,
        manager_comment: item.manager_comment,
        workflow_reference: item.workflow_reference,
        applied_at: item.applied_at,
        resolved_at: item.resolved_at,
        aging_days: agingDays,
        sla_state: attendanceExceptionSlaState(item.status, agingDays),
        sla_risk: attendanceExceptionSlaRisk(item.status, agingDays),
        payroll_impact: attendanceExceptionPayrollImpact(item.current_status, item.requested_status),
        detail_href: `/hr-admin/attendance-regularizations/${item.id}/review`,
      };
    }),
  };
}

function snapshotIssueType(snapshot: HrAdminPayrollInputSnapshot) {
  if (snapshot.blockers.length > 0) return "Blocked";
  if (snapshot.warnings.length > 0) return "Warning";
  return "Ready";
}

async function getPayrollInputExceptionsExportRows(reportKey: string, token: string) {
  if (reportKey !== "payroll-input-exceptions") return null;

  const inputResult = await upstreamJson<HrAdminPayrollInputSnapshotSetupResponse>("/hr-admin/payroll-input-snapshot-setup/", token);
  if (!inputResult.ok) return { error: inputResult };

  const inputSetup = inputResult.data;
  if (!inputSetup) return { error: { ok: false, status: 502, data: null, detail: "Live payroll input exception source data is unavailable." } };

  const runsById = new Map(inputSetup.runs.map((run) => [run.id, run]));
  return {
    rows: inputSetup.snapshots.map((snapshot) => {
      const run = runsById.get(snapshot.payroll_run_id);
      const issueType = snapshotIssueType(snapshot);
      const attendancePresentDays = numberValue(snapshot.attendance_snapshot.present_days);
      const attendanceWorkingDays = numberValue(snapshot.attendance_snapshot.working_days);
      return {
        employee_code: snapshot.employee_code,
        employee_name: snapshot.employee_name,
        payroll_run_name: snapshot.payroll_run_name,
        payroll_run_id: snapshot.payroll_run_id,
        run_status: run?.status ?? "unknown",
        pay_group_name: snapshot.pay_group_name ?? "",
        salary_structure_name: snapshot.salary_structure_name ?? "",
        salary_structure_version: snapshot.salary_structure_version ?? "",
        snapshot_status: snapshot.snapshot_status,
        issue_type: issueType,
        readiness_risk: issueType === "Blocked" ? "High" : issueType === "Warning" ? "Medium" : "Low",
        blocker_count: snapshot.blockers.length,
        warning_count: snapshot.warnings.length,
        issue_count: snapshot.blockers.length + snapshot.warnings.length,
        lock_state: snapshot.locked_at ? "Locked" : "Unlocked",
        locked_at: snapshot.locked_at ?? "",
        period_start: snapshot.period_start,
        period_end: snapshot.period_end,
        attendance_present_days: attendancePresentDays,
        attendance_working_days: attendanceWorkingDays,
        attendance_days: `${attendancePresentDays}/${attendanceWorkingDays}`,
        input_profile_ref: snapshot.input_profile_ref,
        source_collected_at: snapshot.source_collected_at,
        source_hash: snapshot.source_hash,
        first_blocker: snapshot.blockers[0] ?? "",
        first_warning: snapshot.warnings[0] ?? "",
        detail_href: `/hr-admin/payroll-inputs?runId=${snapshot.payroll_run_id}&snapshotId=${snapshot.id}`,
      };
    }),
  };
}

function exceptionAgeDays(createdAt: string, decidedAt: string | null) {
  const start = dateOnly(createdAt);
  const end = dateOnly(decidedAt ?? new Date().toISOString());
  if (!start || !end) return 0;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}

function reviewExceptionRisk(severity: string, status: string, ageDays: number) {
  if (status === "open" && ["critical", "blocker", "high"].includes(severity.toLowerCase())) return "High";
  if (status === "open" && ageDays >= 2) return "High";
  if (status === "open" || ["warning", "medium"].includes(severity.toLowerCase())) return "Medium";
  return "Low";
}

function reviewExceptionDecisionState(status: string, decidedAt: string | null) {
  if (decidedAt) return "Decided";
  if (status === "resolved" || status === "waived" || status === "approved") return "Closed";
  return "Pending";
}

async function getPayrollReviewExceptionsExportRows(reportKey: string, token: string) {
  if (reportKey !== "payroll-review-exceptions") return null;

  const reviewResult = await upstreamJson<HrAdminPayrollReviewSetupResponse>("/hr-admin/payroll-review-setup/", token);
  if (!reviewResult.ok) return { error: reviewResult };

  const reviewSetup = reviewResult.data;
  if (!reviewSetup) return { error: { ok: false, status: 502, data: null, detail: "Live payroll review exception source data is unavailable." } };

  const reviewById = new Map(reviewSetup.reviews.map((review) => [review.id, review]));
  return {
    rows: reviewSetup.exceptions.map((exception) => {
      const review = reviewById.get(exception.review_id);
      const ageDays = exceptionAgeDays(exception.created_at, exception.decided_at);
      const decisionState = reviewExceptionDecisionState(exception.status, exception.decided_at);
      return {
        payroll_run_name: review?.payroll_run_name ?? "",
        payroll_run_id: exception.payroll_run_id,
        review_id: exception.review_id,
        review_status: review?.status ?? "",
        review_profile_ref: review?.review_profile_ref ?? "",
        exception_id: exception.id,
        employee_code: exception.employee_code ?? "",
        employee_name: exception.employee_name ?? "",
        component_code: exception.component_code ?? "",
        category: exception.category,
        severity: exception.severity,
        severity_label: exception.severity_label,
        status: exception.status,
        status_label: exception.status_label,
        title: exception.title,
        detail: exception.detail,
        decision_state: decisionState,
        decision_reason: exception.decision_reason,
        decided_at: exception.decided_at ?? "",
        decided_by_name: exception.decided_by_name ?? "",
        calculation_line_id: exception.calculation_line_id ?? "",
        input_snapshot_id: exception.input_snapshot_id ?? "",
        exception_age_days: ageDays,
        review_exception_risk: reviewExceptionRisk(exception.severity, exception.status, ageDays),
        detail_href: `/hr-admin/payroll-review?reviewId=${exception.review_id}&exceptionId=${exception.id}`,
      };
    }),
  };
}

function adjustmentApprovalState(status: string, approvedAt: string | null, rejectedAt: string | null, appliedAt: string | null) {
  if (appliedAt) return "Applied";
  if (approvedAt) return "Approved";
  if (rejectedAt) return "Rejected";
  if (status === "submitted") return "Submitted";
  return "Draft";
}

function adjustmentAmountRisk(amount: unknown) {
  const absoluteAmount = Math.abs(numberValue(amount));
  if (absoluteAmount >= 100000) return "High";
  if (absoluteAmount >= 25000) return "Medium";
  return "Low";
}

function payrollAdjustmentReportRow(adjustment: HrAdminPayrollAdjustmentSetupResponse["adjustments"][number]) {
  return {
    employee_code: adjustment.employee_code,
    employee_name: adjustment.employee_name,
    payroll_run_name: adjustment.payroll_run_name,
    payroll_run_id: adjustment.payroll_run_id,
    component_code: adjustment.component_code,
    component_name: adjustment.component_name,
    kind: adjustment.kind,
    kind_label: adjustment.kind_label,
    direction: adjustment.direction,
    direction_label: adjustment.direction_label,
    status: adjustment.status,
    status_label: adjustment.status_label,
    approval_state: adjustmentApprovalState(adjustment.status, adjustment.approved_at, adjustment.rejected_at, adjustment.applied_at),
    amount: numberValue(adjustment.amount),
    currency_code: adjustment.currency_code,
    amount_risk: adjustmentAmountRisk(adjustment.amount),
    effective_date: adjustment.effective_date,
    source_period_start: adjustment.source_period_start ?? "",
    source_period_end: adjustment.source_period_end ?? "",
    adjustment_profile_ref: adjustment.adjustment_profile_ref,
    approval_profile_ref: adjustment.approval_profile_ref,
    source_ref: adjustment.source_ref,
    reason: adjustment.reason,
    submitted_at: adjustment.submitted_at ?? "",
    approved_at: adjustment.approved_at ?? "",
    rejected_at: adjustment.rejected_at ?? "",
    applied_at: adjustment.applied_at ?? "",
    source_hash: adjustment.source_hash,
    detail_href: `/hr-admin/payroll-adjustments?runId=${adjustment.payroll_run_id}&adjustmentId=${adjustment.id}`,
  };
}

async function getPayrollAdjustmentsExportRows(reportKey: string, token: string) {
  if (reportKey !== "payroll-adjustments") return null;

  const adjustmentResult = await upstreamJson<HrAdminPayrollAdjustmentSetupResponse>("/hr-admin/payroll-adjustment-setup/", token);
  if (!adjustmentResult.ok) return { error: adjustmentResult };

  const adjustmentSetup = adjustmentResult.data;
  if (!adjustmentSetup) return { error: { ok: false, status: 502, data: null, detail: "Live payroll adjustment source data is unavailable." } };

  return {
    rows: adjustmentSetup.adjustments.map(payrollAdjustmentReportRow),
  };
}

function settlementApprovalState(status: string, approvedAt: string | null, rejectedAt: string | null, appliedAt: string | null) {
  if (appliedAt) return "Applied";
  if (approvedAt) return "Approved";
  if (rejectedAt) return "Rejected";
  if (status === "submitted") return "Submitted";
  return "Draft";
}

function settlementNetRisk(value: unknown) {
  const absoluteAmount = Math.abs(numberValue(value));
  if (absoluteAmount >= 100000) return "High";
  if (absoluteAmount >= 25000) return "Medium";
  return "Low";
}

function payrollSettlementReportRow(
  settlement: HrAdminPayrollSettlementSetupResponse["settlements"][number],
  lines: HrAdminPayrollSettlementSetupResponse["lines"],
) {
  const settlementLines = lines.filter((line) => line.settlement_id === settlement.id);
  const lineKinds = Array.from(new Set(settlementLines.map((line) => line.line_kind).filter(Boolean))).sort();
  return {
    employee_code: settlement.employee_code,
    employee_name: settlement.employee_name,
    payroll_run_name: settlement.payroll_run_name,
    payroll_run_id: settlement.payroll_run_id,
    status: settlement.status,
    status_label: settlement.status_label,
    approval_state: settlementApprovalState(settlement.status, settlement.approved_at, settlement.rejected_at, settlement.applied_at),
    settlement_profile_ref: settlement.settlement_profile_ref,
    approval_profile_ref: settlement.approval_profile_ref,
    calculation_profile_ref: settlement.calculation_profile_ref,
    source_ref: settlement.source_ref,
    reason: settlement.reason,
    settlement_date: settlement.settlement_date,
    last_working_date: settlement.last_working_date ?? "",
    gross_dues: numberValue(settlement.totals_snapshot.gross_dues),
    deductions: numberValue(settlement.totals_snapshot.deductions),
    taxes: numberValue(settlement.totals_snapshot.taxes),
    reimbursements: numberValue(settlement.totals_snapshot.reimbursements),
    net_settlement: numberValue(settlement.totals_snapshot.net_settlement),
    currency_code: settlement.currency_code,
    net_amount_risk: settlementNetRisk(settlement.totals_snapshot.net_settlement),
    line_count: settlement.line_count,
    line_kinds: lineKinds.join("|"),
    submitted_at: settlement.submitted_at ?? "",
    approved_at: settlement.approved_at ?? "",
    rejected_at: settlement.rejected_at ?? "",
    applied_at: settlement.applied_at ?? "",
    source_hash: settlement.source_hash,
    detail_href: `/hr-admin/payroll-settlements?runId=${settlement.payroll_run_id}&settlementId=${settlement.id}`,
  };
}

async function getPayrollSettlementsExportRows(reportKey: string, token: string) {
  if (reportKey !== "payroll-settlements") return null;

  const settlementResult = await upstreamJson<HrAdminPayrollSettlementSetupResponse>("/hr-admin/payroll-settlement-setup/", token);
  if (!settlementResult.ok) return { error: settlementResult };

  const settlementSetup = settlementResult.data;
  if (!settlementSetup) return { error: { ok: false, status: 502, data: null, detail: "Live payroll settlement source data is unavailable." } };

  return {
    rows: settlementSetup.settlements.map((settlement) => payrollSettlementReportRow(settlement, settlementSetup.lines)),
  };
}

type CloseReadinessSources = {
  inputSetup: HrAdminPayrollInputSnapshotSetupResponse;
  reviewSetup: HrAdminPayrollReviewSetupResponse;
  adjustmentSetup: HrAdminPayrollAdjustmentSetupResponse;
  settlementSetup: HrAdminPayrollSettlementSetupResponse;
  outputSetup: HrAdminPayrollOutputSetupResponse;
};

function closeReadinessState(blockers: {
  blockedInputs: number;
  openBlockers: number;
  pendingAdjustments: number;
  pendingSettlements: number;
}) {
  if (blockers.blockedInputs > 0 || blockers.openBlockers > 0) return "Blocked";
  if (blockers.pendingAdjustments > 0 || blockers.pendingSettlements > 0) return "Needs action";
  return "Ready";
}

function closeReadinessRisk(state: string, warningInputs: number, openExceptions: number) {
  if (state === "Blocked") return "High";
  if (state === "Needs action" || warningInputs > 0 || openExceptions > 0) return "Medium";
  return "Low";
}

function closeBlockerCategory(row: {
  blockedInputs: number;
  openBlockers: number;
  pendingAdjustments: number;
  pendingSettlements: number;
  outputStatus: string;
}) {
  if (row.blockedInputs > 0) return "Input blockers";
  if (row.openBlockers > 0) return "Review blockers";
  if (row.pendingAdjustments > 0) return "Pending adjustments";
  if (row.pendingSettlements > 0) return "Pending settlements";
  if (!row.outputStatus || row.outputStatus === "not_generated") return "Output pending";
  return "None";
}

function payrollCloseReadinessRows({ inputSetup, reviewSetup, adjustmentSetup, settlementSetup, outputSetup }: CloseReadinessSources) {
  const reviewExceptionsByRun = new Map<string, HrAdminPayrollReviewSetupResponse["exceptions"]>();
  for (const exception of reviewSetup.exceptions) {
    reviewExceptionsByRun.set(exception.payroll_run_id, [...(reviewExceptionsByRun.get(exception.payroll_run_id) ?? []), exception]);
  }
  const adjustmentsByRun = new Map<string, HrAdminPayrollAdjustmentSetupResponse["adjustments"]>();
  for (const adjustment of adjustmentSetup.adjustments) {
    adjustmentsByRun.set(adjustment.payroll_run_id, [...(adjustmentsByRun.get(adjustment.payroll_run_id) ?? []), adjustment]);
  }
  const settlementsByRun = new Map<string, HrAdminPayrollSettlementSetupResponse["settlements"]>();
  for (const settlement of settlementSetup.settlements) {
    settlementsByRun.set(settlement.payroll_run_id, [...(settlementsByRun.get(settlement.payroll_run_id) ?? []), settlement]);
  }
  const outputBatchByRun = new Map(outputSetup.output_batches.map((batch) => [batch.payroll_run_id, batch]));
  const artifactsByRun = new Map<string, HrAdminPayrollOutputSetupResponse["artifacts"]>();
  for (const artifact of outputSetup.artifacts) {
    artifactsByRun.set(artifact.payroll_run_id, [...(artifactsByRun.get(artifact.payroll_run_id) ?? []), artifact]);
  }

  return inputSetup.runs.map((run) => {
    const exceptions = reviewExceptionsByRun.get(run.id) ?? [];
    const pendingAdjustments = (adjustmentsByRun.get(run.id) ?? []).filter((item) => !["applied", "rejected"].includes(item.status)).length;
    const pendingSettlements = (settlementsByRun.get(run.id) ?? []).filter((item) => !["applied", "voided", "rejected"].includes(item.status)).length;
    const outputBatch = outputBatchByRun.get(run.id);
    const artifacts = artifactsByRun.get(run.id) ?? [];
    const openExceptions = exceptions.filter((item) => item.status === "open").length;
    const openBlockers = exceptions.filter((item) => item.status === "open" && ["blocker", "critical", "high"].includes(item.severity)).length;
    const state = closeReadinessState({
      blockedInputs: run.blocked_count,
      openBlockers,
      pendingAdjustments,
      pendingSettlements,
    });
    const risk = closeReadinessRisk(state, run.warning_count, openExceptions);
    const blockerCategory = closeBlockerCategory({
      blockedInputs: run.blocked_count,
      openBlockers,
      pendingAdjustments,
      pendingSettlements,
      outputStatus: outputBatch?.status ?? "not_generated",
    });
    const inputLockCoverage = run.snapshot_count ? Math.round((run.locked_count / run.snapshot_count) * 100) : 0;
    const sourceHashes = [
      ...inputSetup.snapshots.filter((snapshot) => snapshot.payroll_run_id === run.id).map((snapshot) => snapshot.source_hash),
      ...artifacts.map((artifact) => artifact.source_hash),
    ].filter(Boolean);
    return {
      payroll_run_name: run.name,
      payroll_run_id: run.id,
      run_status: run.status,
      input_lock_coverage_percent: inputLockCoverage,
      blocked_input_count: run.blocked_count,
      warning_input_count: run.warning_count,
      open_review_exception_count: openExceptions,
      open_review_blocker_count: openBlockers,
      pending_adjustment_count: pendingAdjustments,
      pending_settlement_count: pendingSettlements,
      output_batch_status: outputBatch?.status ?? "not_generated",
      output_artifact_count: artifacts.length,
      published_artifact_count: artifacts.filter((artifact) => artifact.status === "published").length,
      close_readiness_state: state,
      close_readiness_risk: risk,
      blocker_category: blockerCategory,
      primary_action:
        blockerCategory === "Input blockers"
          ? "Resolve blocked input snapshots"
          : blockerCategory === "Review blockers"
            ? "Resolve payroll review blockers"
            : blockerCategory === "Pending adjustments"
              ? "Apply or reject pending adjustments"
              : blockerCategory === "Pending settlements"
                ? "Apply or void pending settlements"
                : blockerCategory === "Output pending"
                  ? "Generate payroll outputs after lock"
                  : "Ready for close review",
      evidence_summary: `${run.locked_count}/${run.snapshot_count} inputs locked; ${openBlockers} blockers; ${pendingAdjustments} adjustments; ${pendingSettlements} settlements; ${artifacts.length} artifacts`,
      source_hashes: sourceHashes.slice(0, 8).join("|"),
      detail_href: `/hr-admin/payroll-review?runId=${run.id}`,
    };
  });
}

async function getPayrollCloseReadinessExportRows(reportKey: string, token: string) {
  if (reportKey !== "payroll-close-readiness") return null;

  const [inputResult, reviewResult, adjustmentResult, settlementResult, outputResult] = await Promise.all([
    upstreamJson<HrAdminPayrollInputSnapshotSetupResponse>("/hr-admin/payroll-input-snapshot-setup/", token),
    upstreamJson<HrAdminPayrollReviewSetupResponse>("/hr-admin/payroll-review-setup/", token),
    upstreamJson<HrAdminPayrollAdjustmentSetupResponse>("/hr-admin/payroll-adjustment-setup/", token),
    upstreamJson<HrAdminPayrollSettlementSetupResponse>("/hr-admin/payroll-settlement-setup/", token),
    upstreamJson<HrAdminPayrollOutputSetupResponse>("/hr-admin/payroll-output-setup/", token),
  ]);
  const failedResult = [inputResult, reviewResult, adjustmentResult, settlementResult, outputResult].find((result) => !result.ok);
  if (failedResult) return { error: failedResult };
  if (!inputResult.data || !reviewResult.data || !adjustmentResult.data || !settlementResult.data || !outputResult.data) {
    return { error: { ok: false, status: 502, data: null, detail: "Live payroll close readiness source data is unavailable." } };
  }

  return {
    rows: payrollCloseReadinessRows({
      inputSetup: inputResult.data,
      reviewSetup: reviewResult.data,
      adjustmentSetup: adjustmentResult.data,
      settlementSetup: settlementResult.data,
      outputSetup: outputResult.data,
    }),
  };
}

async function getDemoRows(reportKey: string) {
  switch (reportKey) {
    case "workforce": {
      const result = await getHrAdminEmployees();
      return result.data.map((item) => ({
        employee_code: item.employee_code,
        full_name: item.full_name,
        work_email: item.work_email,
        phone_number: item.phone_number,
        employment_status: item.employment_status,
        date_of_joining: item.date_of_joining,
        department: item.department,
        designation: item.designation,
        branch: item.branch,
        location: item.location,
        reporting_manager: item.reporting_manager,
      }));
    }
    case "pending-approvals": {
      const result = await getMssApprovalInbox();
      const leaveRows = result.pendingLeave.items.map((item) => ({
        request_type: "leave",
        request_id: item.id,
        employee_code: item.employee_code,
        employee_name: item.employee_name,
        department: item.department,
        designation: item.designation,
        status: item.status,
        request_label: item.leave_type,
        start_date: item.start_date,
        end_date: item.end_date,
        requested_units: item.requested_units,
        reason: item.reason,
        submitted_at: item.created_at,
      }));
      const regularizationRows = result.pendingRegularizations.items.map((item) => ({
        request_type: "attendance_regularization",
        request_id: item.id,
        employee_code: item.employee_code,
        employee_name: item.employee_name,
        department: item.department,
        designation: item.designation,
        status: item.status,
        request_label: item.requested_status,
        start_date: item.attendance_date,
        end_date: item.attendance_date,
        requested_units: "",
        reason: item.reason,
        submitted_at: item.created_at,
      }));
      return [...leaveRows, ...regularizationRows];
    }
    case "document-compliance": {
      const result = await getHrAdminEmployeeDocuments();
      return result.data.items.map((item) => ({
        employee_code: item.employee_code,
        employee_name: item.employee_name,
        category: item.category_name,
        title: item.title,
        document_number: item.document_number,
        status: item.status,
        verification_status: item.verification_status,
        issued_on: item.issued_on,
        expires_on: item.expires_on,
        verified_at: item.verified_at,
        rejection_reason: item.rejection_reason,
      }));
    }
    case "notification-queue": {
      const result = await getHrAdminNotifications();
      return result.data.items.map((item) => ({
        notification_id: item.id,
        event_definition: item.event_definition_name,
        channel: item.channel,
        audience_type: item.audience_type,
        subject_type: item.subject_type,
        subject_identifier: item.subject_identifier,
        recipient_identifier: item.recipient_identifier,
        recipient_address: item.recipient_address,
        status: item.status,
        priority: item.priority,
        scheduled_for: item.scheduled_for,
        sent_at: item.sent_at,
        delivered_at: item.delivered_at,
        read_at: item.read_at,
        title: item.title,
        subject: item.subject,
      }));
    }
    case "lifecycle-queue": {
      const result = await getHrAdminLifecycleQueue();
      return result.data.items.map((item) => ({
        item_type: item.item_type,
        item_label: item.item_label,
        employee_code: item.employee_code,
        employee_name: item.employee_name,
        status: item.status,
        status_label: item.status_label,
        primary_date_label: item.primary_date_label,
        primary_date: item.primary_date,
        secondary_date_label: item.secondary_date_label,
        secondary_date: item.secondary_date,
        owner_value: item.owner_value,
        owner_label: item.owner_label,
        workflow_reference: item.workflow_reference,
        summary: item.summary,
        detail_href: item.detail_href,
      }));
    }
    case "attendance-register": {
      const result = await getHrAdminAttendanceRecords({ page: 1, page_size: 500 });
      return result.data.items.map((item) => ({
        employee_code: item.employee_code,
        employee_name: item.employee_name,
        department: item.department,
        designation: item.designation,
        attendance_date: item.attendance_date,
        status: item.status,
        source: item.source,
        shift: item.shift,
        holiday: item.holiday,
        check_in_at: item.check_in_at,
        check_out_at: item.check_out_at,
        work_duration_hours: item.work_duration_hours,
        overtime_hours: item.overtime_hours,
        late_minutes: item.late_minutes,
        early_exit_minutes: item.early_exit_minutes,
        is_regularized: item.is_regularized,
        is_locked: item.is_locked,
        exception_type: attendanceExceptionType(item),
        payroll_readiness: attendancePayrollReadiness(item),
        notes: item.notes,
        detail_href: `/hr-admin/attendance-records/${item.id}/edit`,
      }));
    }
    case "leave-balance": {
      const result = await getHrAdminLeaveBalances();
      return result.data.map((item) => ({
        employee_code: item.employee_code,
        employee_name: item.employee_name,
        leave_policy_name: item.leave_policy_name,
        leave_type_name: item.leave_type_name,
        period_year: item.period_year,
        opening_balance: item.opening_balance,
        accrued_amount: item.accrued_amount,
        carry_forward_amount: item.carry_forward_amount,
        consumed_amount: item.consumed_amount,
        reserved_amount: item.reserved_amount,
        encashed_amount: item.encashed_amount,
        adjustment_amount: item.adjustment_amount,
        closing_balance: item.closing_balance,
        available_after_reserved: availableLeaveUnits(item).toFixed(2),
        utilization_percent: leaveUtilizationPercent(item),
        liability_state: leaveLiabilityState(item),
        liability_risk: leaveLiabilityRisk(item),
      }));
    }
    case "attendance-exceptions": {
      const result = await getHrAdminAttendanceRegularizations({ page: 1, page_size: 500 });
      return result.data.items.map((item) => {
        const agingDays = attendanceExceptionAgingDays(item.applied_at, item.created_at, item.resolved_at);
        return {
          employee_code: item.employee_code,
          employee_name: item.employee_name,
          department: item.department,
          designation: item.designation,
          attendance_date: item.attendance_date,
          current_status: item.current_status,
          requested_status: item.requested_status,
          status: item.status,
          shift: item.shift,
          actual_check_in_at: item.actual_check_in_at,
          actual_check_out_at: item.actual_check_out_at,
          requested_check_in_at: item.requested_check_in_at,
          requested_check_out_at: item.requested_check_out_at,
          reason: item.reason,
          manager_comment: item.manager_comment,
          workflow_reference: item.workflow_reference,
          applied_at: item.applied_at,
          resolved_at: item.resolved_at,
          aging_days: agingDays,
          sla_state: attendanceExceptionSlaState(item.status, agingDays),
          sla_risk: attendanceExceptionSlaRisk(item.status, agingDays),
          payroll_impact: attendanceExceptionPayrollImpact(item.current_status, item.requested_status),
          detail_href: `/hr-admin/attendance-regularizations/${item.id}/review`,
        };
      });
    }
    case "payroll-input-exceptions": {
      const result = await getHrAdminPayrollInputSnapshotSetup();
      const runsById = new Map(result.data.runs.map((run) => [run.id, run]));
      return result.data.snapshots.map((snapshot) => {
        const run = runsById.get(snapshot.payroll_run_id);
        const issueType = snapshotIssueType(snapshot);
        const attendancePresentDays = numberValue(snapshot.attendance_snapshot.present_days);
        const attendanceWorkingDays = numberValue(snapshot.attendance_snapshot.working_days);
        return {
          employee_code: snapshot.employee_code,
          employee_name: snapshot.employee_name,
          payroll_run_name: snapshot.payroll_run_name,
          payroll_run_id: snapshot.payroll_run_id,
          run_status: run?.status ?? "unknown",
          pay_group_name: snapshot.pay_group_name ?? "",
          salary_structure_name: snapshot.salary_structure_name ?? "",
          salary_structure_version: snapshot.salary_structure_version ?? "",
          snapshot_status: snapshot.snapshot_status,
          issue_type: issueType,
          readiness_risk: issueType === "Blocked" ? "High" : issueType === "Warning" ? "Medium" : "Low",
          blocker_count: snapshot.blockers.length,
          warning_count: snapshot.warnings.length,
          issue_count: snapshot.blockers.length + snapshot.warnings.length,
          lock_state: snapshot.locked_at ? "Locked" : "Unlocked",
          locked_at: snapshot.locked_at ?? "",
          period_start: snapshot.period_start,
          period_end: snapshot.period_end,
          attendance_present_days: attendancePresentDays,
          attendance_working_days: attendanceWorkingDays,
          attendance_days: `${attendancePresentDays}/${attendanceWorkingDays}`,
          input_profile_ref: snapshot.input_profile_ref,
          source_collected_at: snapshot.source_collected_at,
          source_hash: snapshot.source_hash,
          first_blocker: snapshot.blockers[0] ?? "",
          first_warning: snapshot.warnings[0] ?? "",
          detail_href: `/hr-admin/payroll-inputs?runId=${snapshot.payroll_run_id}&snapshotId=${snapshot.id}`,
        };
      });
    }
    case "payroll-review-exceptions": {
      const result = await getHrAdminPayrollReviewSetup();
      const reviewById = new Map(result.data.reviews.map((review) => [review.id, review]));
      return result.data.exceptions.map((exception) => {
        const review = reviewById.get(exception.review_id);
        const ageDays = exceptionAgeDays(exception.created_at, exception.decided_at);
        const decisionState = reviewExceptionDecisionState(exception.status, exception.decided_at);
        return {
          payroll_run_name: review?.payroll_run_name ?? "",
          payroll_run_id: exception.payroll_run_id,
          review_id: exception.review_id,
          review_status: review?.status ?? "",
          review_profile_ref: review?.review_profile_ref ?? "",
          exception_id: exception.id,
          employee_code: exception.employee_code ?? "",
          employee_name: exception.employee_name ?? "",
          component_code: exception.component_code ?? "",
          category: exception.category,
          severity: exception.severity,
          severity_label: exception.severity_label,
          status: exception.status,
          status_label: exception.status_label,
          title: exception.title,
          detail: exception.detail,
          decision_state: decisionState,
          decision_reason: exception.decision_reason,
          decided_at: exception.decided_at ?? "",
          decided_by_name: exception.decided_by_name ?? "",
          calculation_line_id: exception.calculation_line_id ?? "",
          input_snapshot_id: exception.input_snapshot_id ?? "",
          exception_age_days: ageDays,
          review_exception_risk: reviewExceptionRisk(exception.severity, exception.status, ageDays),
          detail_href: `/hr-admin/payroll-review?reviewId=${exception.review_id}&exceptionId=${exception.id}`,
        };
      });
    }
    case "payroll-adjustments": {
      const result = await getHrAdminPayrollAdjustmentSetup();
      return result.data.adjustments.map(payrollAdjustmentReportRow);
    }
    case "payroll-settlements": {
      const result = await getHrAdminPayrollSettlementSetup();
      return result.data.settlements.map((settlement) => payrollSettlementReportRow(settlement, result.data.lines));
    }
    case "payroll-close-readiness": {
      const [inputSetup, reviewSetup, adjustmentSetup, settlementSetup, outputSetup] = await Promise.all([
        getHrAdminPayrollInputSnapshotSetup(),
        getHrAdminPayrollReviewSetup(),
        getHrAdminPayrollAdjustmentSetup(),
        getHrAdminPayrollSettlementSetup(),
        getHrAdminPayrollOutputSetup(),
      ]);
      return payrollCloseReadinessRows({
        inputSetup: inputSetup.data,
        reviewSetup: reviewSetup.data,
        adjustmentSetup: adjustmentSetup.data,
        settlementSetup: settlementSetup.data,
        outputSetup: outputSetup.data,
      });
    }
    default:
      return null;
  }
}

export async function GET(request: NextRequest, { params }: Props) {
  const { reportKey } = await params;
  const filters = normalizedFilters(request);

  if (API_BASE_URL) {
    const token = request.cookies.get("hrms_access_token")?.value;
    if (!token) {
      return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
    }
    const auditContext = {
      actorDisplay: request.cookies.get("hrms_user_name")?.value || "HR admin",
      request,
      token,
    };

    const complianceExport = await getComplianceExportRows(reportKey, token);
    if (complianceExport) {
      if ("error" in complianceExport) {
        const exportError = complianceExport.error;
        if (exportError) {
          return NextResponse.json({ detail: exportError.detail }, { status: exportError.status });
        }
      }
      return exportResponse(request, reportKey, applyExportFilters(reportKey, complianceExport.rows, filters), filters, auditContext);
    }

    const payrollRegisterExport = await getPayrollRegisterExportRows(reportKey, token);
    if (payrollRegisterExport) {
      if ("error" in payrollRegisterExport) {
        const exportError = payrollRegisterExport.error;
        if (exportError) {
          return NextResponse.json({ detail: exportError.detail }, { status: exportError.status });
        }
      }
      return exportResponse(request, reportKey, applyExportFilters(reportKey, payrollRegisterExport.rows, filters), filters, auditContext);
    }

    const salaryVarianceExport = await getSalaryVarianceExportRows(reportKey, token);
    if (salaryVarianceExport) {
      if ("error" in salaryVarianceExport) {
        const exportError = salaryVarianceExport.error;
        if (exportError) {
          return NextResponse.json({ detail: exportError.detail }, { status: exportError.status });
        }
      }
      return exportResponse(request, reportKey, applyExportFilters(reportKey, salaryVarianceExport.rows, filters), filters, auditContext);
    }

    const bankAdviceExport = await getBankAdviceExportRows(reportKey, token);
    if (bankAdviceExport) {
      if ("error" in bankAdviceExport) {
        const exportError = bankAdviceExport.error;
        if (exportError) {
          return NextResponse.json({ detail: exportError.detail }, { status: exportError.status });
        }
      }
      return exportResponse(request, reportKey, applyExportFilters(reportKey, bankAdviceExport.rows, filters), filters, auditContext);
    }

    const workforceExport = await getWorkforceExportRows(reportKey, token);
    if (workforceExport) {
      if ("error" in workforceExport) {
        const exportError = workforceExport.error;
        if (exportError) {
          return NextResponse.json({ detail: exportError.detail }, { status: exportError.status });
        }
      }
      return exportResponse(request, reportKey, applyExportFilters(reportKey, workforceExport.rows, filters), filters, auditContext);
    }

    const documentComplianceExport = await getDocumentComplianceExportRows(reportKey, token);
    if (documentComplianceExport) {
      if ("error" in documentComplianceExport) {
        const exportError = documentComplianceExport.error;
        if (exportError) {
          return NextResponse.json({ detail: exportError.detail }, { status: exportError.status });
        }
      }
      return exportResponse(request, reportKey, applyExportFilters(reportKey, documentComplianceExport.rows, filters), filters, auditContext);
    }

    const lifecycleQueueExport = await getLifecycleQueueExportRows(reportKey, token);
    if (lifecycleQueueExport) {
      if ("error" in lifecycleQueueExport) {
        const exportError = lifecycleQueueExport.error;
        if (exportError) {
          return NextResponse.json({ detail: exportError.detail }, { status: exportError.status });
        }
      }
      return exportResponse(request, reportKey, applyExportFilters(reportKey, lifecycleQueueExport.rows, filters), filters, auditContext);
    }

    const attendanceRegisterExport = await getAttendanceRegisterExportRows(reportKey, token);
    if (attendanceRegisterExport) {
      if ("error" in attendanceRegisterExport) {
        const exportError = attendanceRegisterExport.error;
        if (exportError) {
          return NextResponse.json({ detail: exportError.detail }, { status: exportError.status });
        }
      }
      return exportResponse(request, reportKey, applyExportFilters(reportKey, attendanceRegisterExport.rows, filters), filters, auditContext);
    }

    const leaveBalanceExport = await getLeaveBalanceExportRows(reportKey, token);
    if (leaveBalanceExport) {
      if ("error" in leaveBalanceExport) {
        const exportError = leaveBalanceExport.error;
        if (exportError) {
          return NextResponse.json({ detail: exportError.detail }, { status: exportError.status });
        }
      }
      return exportResponse(request, reportKey, applyExportFilters(reportKey, leaveBalanceExport.rows, filters), filters, auditContext);
    }

    const attendanceExceptionsExport = await getAttendanceExceptionsExportRows(reportKey, token);
    if (attendanceExceptionsExport) {
      if ("error" in attendanceExceptionsExport) {
        const exportError = attendanceExceptionsExport.error;
        if (exportError) {
          return NextResponse.json({ detail: exportError.detail }, { status: exportError.status });
        }
      }
      return exportResponse(request, reportKey, applyExportFilters(reportKey, attendanceExceptionsExport.rows, filters), filters, auditContext);
    }

    const payrollInputExceptionsExport = await getPayrollInputExceptionsExportRows(reportKey, token);
    if (payrollInputExceptionsExport) {
      if ("error" in payrollInputExceptionsExport) {
        const exportError = payrollInputExceptionsExport.error;
        if (exportError) {
          return NextResponse.json({ detail: exportError.detail }, { status: exportError.status });
        }
      }
      return exportResponse(request, reportKey, applyExportFilters(reportKey, payrollInputExceptionsExport.rows, filters), filters, auditContext);
    }

    const payrollReviewExceptionsExport = await getPayrollReviewExceptionsExportRows(reportKey, token);
    if (payrollReviewExceptionsExport) {
      if ("error" in payrollReviewExceptionsExport) {
        const exportError = payrollReviewExceptionsExport.error;
        if (exportError) {
          return NextResponse.json({ detail: exportError.detail }, { status: exportError.status });
        }
      }
      return exportResponse(request, reportKey, applyExportFilters(reportKey, payrollReviewExceptionsExport.rows, filters), filters, auditContext);
    }

    const payrollAdjustmentsExport = await getPayrollAdjustmentsExportRows(reportKey, token);
    if (payrollAdjustmentsExport) {
      if ("error" in payrollAdjustmentsExport) {
        const exportError = payrollAdjustmentsExport.error;
        if (exportError) {
          return NextResponse.json({ detail: exportError.detail }, { status: exportError.status });
        }
      }
      return exportResponse(request, reportKey, applyExportFilters(reportKey, payrollAdjustmentsExport.rows, filters), filters, auditContext);
    }

    const payrollSettlementsExport = await getPayrollSettlementsExportRows(reportKey, token);
    if (payrollSettlementsExport) {
      if ("error" in payrollSettlementsExport) {
        const exportError = payrollSettlementsExport.error;
        if (exportError) {
          return NextResponse.json({ detail: exportError.detail }, { status: exportError.status });
        }
      }
      return exportResponse(request, reportKey, applyExportFilters(reportKey, payrollSettlementsExport.rows, filters), filters, auditContext);
    }

    const payrollCloseReadinessExport = await getPayrollCloseReadinessExportRows(reportKey, token);
    if (payrollCloseReadinessExport) {
      if ("error" in payrollCloseReadinessExport) {
        const exportError = payrollCloseReadinessExport.error;
        if (exportError) {
          return NextResponse.json({ detail: exportError.detail }, { status: exportError.status });
        }
      }
      return exportResponse(request, reportKey, applyExportFilters(reportKey, payrollCloseReadinessExport.rows, filters), filters, auditContext);
    }

    const upstream = await fetch(`${API_BASE_URL}/hr-admin/reports/exports/${reportKey}/`, {
      headers: {
        Authorization: `Token ${token}`,
      },
      cache: "no-store",
    });

    if (upstream.ok) {
      const body = await upstream.text();
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") || "text/csv",
          "Content-Disposition":
            upstream.headers.get("Content-Disposition") || `attachment; filename="${reportKey}.csv"`,
        },
      });
    }

    if (!DEMO_DATA_ENABLED) {
      const payload = await upstream.json().catch(() => ({ detail: "Live report export failed." }));
      return NextResponse.json(
        { detail: payload.detail || "Live report export failed." },
        { status: upstream.status },
      );
    }
  }

  const rows = await getDemoRows(reportKey);
  if (!rows) {
    return NextResponse.json({ detail: "Unknown report export." }, { status: 404 });
  }

  return exportResponse(request, reportKey, rows, filters);
}
