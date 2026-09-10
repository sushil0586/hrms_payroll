import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import type {
  HrAdminPayrollFinanceHandoffSetupResponse,
  HrAdminPayrollOutputArtifact,
  HrAdminPayrollStatutoryFilingCalendar,
  HrAdminPayrollStatutorySetupResponse,
} from "@/lib/types";

import {
  getHrAdminEmployeeDocuments,
  getHrAdminEmployees,
  getHrAdminLifecycleQueue,
  getHrAdminNotifications,
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

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    return "message\nNo data available\n";
  }

  const headers = Object.keys(rows[0]);
  const escapeValue = (value: unknown) => {
    const raw = value == null ? "" : String(value);
    return `"${raw.replace(/"/g, '""')}"`;
  };

  const headerLine = headers.map(escapeValue).join(",");
  const lines = rows.map((row) => headers.map((header) => escapeValue(row[header])).join(","));
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
    return true;
  });
}

const COMPLIANCE_SOURCE_ENDPOINTS = [
  "/hr-admin/payroll-statutory-setup/",
  "/hr-admin/payroll-finance-handoff-setup/",
];

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
    evidence_columns: Object.keys(rows[0] ?? {}),
    request_identifier: requestIdentifier(auditContext.request),
    user_agent: auditContext.request.headers.get("user-agent") || "",
  };
  if (API_BASE_URL) {
    await appendBackendReportExportAudit(API_BASE_URL, auditContext.token, auditRecord).catch(() => appendReportExportAudit(auditRecord));
    return;
  }
  await appendReportExportAudit(auditRecord);
}

async function reportResponse(reportKey: string, rows: Array<Record<string, unknown>>, filters: ExportFilters = {}, auditContext?: ExportAuditContext) {
  const csv = toCsv(rows);
  const filterSnapshot = JSON.stringify(filters);
  const checksum = createHash("sha256").update(csv).digest("hex");
  await recordExportAudit({
    auditContext,
    checksum,
    contentType: "text/csv",
    exportType: "csv",
    filters,
    reportKey,
    rows,
    sourceEndpoints: COMPLIANCE_SOURCE_ENDPOINTS,
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
  const csv = toCsv(rows);
  const checksum = createHash("sha256").update(csv).digest("hex");
  await recordExportAudit({
    auditContext,
    checksum,
    contentType: "application/json",
    exportType: "manifest",
    filters,
    reportKey,
    rows,
    sourceEndpoints: COMPLIANCE_SOURCE_ENDPOINTS,
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
      source_endpoints: COMPLIANCE_SOURCE_ENDPOINTS,
      evidence_columns: Object.keys(rows[0] ?? {}),
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
