"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

import { ActionToast } from "@/components/patterns/action-toast";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { type FieldErrors, hasFieldErrors, requireText, requireValue, validateDateOrder } from "@/lib/ui/validation";
import type {
  AttendanceRegularizationItem,
  EmployeeDashboard,
  EssAttendanceRecordOption,
  EssAttendanceRegularizationListResponse,
} from "@/lib/types";

type SearchParamValue = string | string[] | undefined;

type Props = {
  attendanceRecords: EssAttendanceRecordOption[];
  currentParams: Record<string, SearchParamValue>;
  dashboard: EmployeeDashboard;
  isDemo: boolean;
  regularizations: EssAttendanceRegularizationListResponse;
  state: "demo" | "live";
};

type Feedback = {
  tone: "success" | "error";
  message: string;
};

type AttendanceRegularizationField = "attendance_record_id" | "requested_check_out_at" | "reason";

function formatDate(value: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function statusClass(status: string) {
  return `status status--${status}`;
}

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(currentParams: Record<string, SearchParamValue>, updates: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(currentParams).forEach(([key, value]) => {
    const normalized = normalizeParam(value);
    if (normalized) params.set(key, normalized);
  });
  Object.entries(updates).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  const queryString = params.toString();
  return queryString ? `/ess/attendance?${queryString}` : "/ess/attendance";
}

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to submit attendance regularization.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to submit attendance regularization.");
}

function formatRecordLabel(record: EssAttendanceRecordOption) {
  return `${formatDate(record.attendance_date)} - ${formatStatus(record.status)}${record.shift ? ` - ${record.shift}` : ""}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function getCurrentApprovalStep(item: AttendanceRegularizationItem) {
  return (item.approval_steps ?? []).find((step) => step.is_current) ?? null;
}

function getApprovalWaitingLabel(item: AttendanceRegularizationItem) {
  if (item.status !== "pending") {
    return "";
  }
  const currentStep = getCurrentApprovalStep(item);
  if (!currentStep) {
    return "Pending approval from the configured approver";
  }
  return `Pending approval from ${currentStep.manager_name || currentStep.name || `Level ${currentStep.level} approver`}`;
}

function getRegularizationOwnerLabel(item: AttendanceRegularizationItem) {
  const waitingLabel = getApprovalWaitingLabel(item);
  if (waitingLabel) return waitingLabel.replace(/^Pending approval from /, "");
  const lastDecision = [...(item.approval_steps ?? [])].reverse().find((step) => step.manager_name || step.name);
  return lastDecision?.manager_name || lastDecision?.name || "Not assigned";
}

function useEscapeClose(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}

function AttendanceDecisionCard({ item }: { item: AttendanceRegularizationItem }) {
  const isOpen = item.status === "pending";
  const tone = item.status === "rejected" ? "blocked" : isOpen ? "current" : "complete";
  const waitingLabel = getApprovalWaitingLabel(item);
  const message = item.manager_comment || item.rejection_reason || (isOpen ? "The correction is still moving through the configured approval route." : "No manager note was added.");

  return (
    <section className={`attendance-decision-card attendance-decision-card--${tone}`}>
      <div>
        <span className="detail-label">Approval status</span>
        <h3>{waitingLabel || formatStatus(item.status)}</h3>
        <p>{message}</p>
      </div>
      <span className={statusClass(item.status)}>{formatStatus(item.status)}</span>
    </section>
  );
}

function AttendanceTimeline({ item }: { item: AttendanceRegularizationItem }) {
  const hasDecision = Boolean(item.resolved_at || item.manager_comment || item.rejection_reason || item.status !== "pending");
  const approvalSteps = item.approval_steps ?? [];
  const timeline = [
    {
      label: "Submitted",
      detail: item.reason || "Regularization sent for manager review.",
      when: item.applied_at ?? item.created_at,
      state: "complete",
    },
    ...(
      approvalSteps.length
        ? approvalSteps.map((step) => ({
            label: `Level ${step.level}: ${step.name}`,
            detail: [
              step.manager_name ? `Approver: ${step.manager_name}` : "Approver not assigned",
              step.comment ? `Note: ${step.comment}` : null,
            ].filter(Boolean).join(" • "),
            when: step.acted_at,
            state: step.status === "rejected" ? "blocked" : step.is_current ? "current" : step.status === "approved" ? "complete" : "pending",
          }))
        : [
            {
              label: hasDecision ? "Manager decision" : "Awaiting decision",
              detail: hasDecision ? (item.manager_comment || item.rejection_reason || `Request ${formatStatus(item.status)}.`) : "Your manager still needs to review this correction.",
              when: item.resolved_at ?? null,
              state: hasDecision ? (item.status === "rejected" ? "blocked" : "complete") : "current",
            },
          ]
    ),
  ];

  return (
    <ol className="leave-timeline">
      {timeline.map((step) => (
        <li className={`leave-timeline__item leave-timeline__item--${step.state}`} key={step.label}>
          <span className="leave-timeline__dot" aria-hidden="true" />
          <span>
            <strong>{step.label}</strong>
            <small>{formatDateTime(step.when)}</small>
            <em>{step.detail}</em>
          </span>
        </li>
      ))}
    </ol>
  );
}

function AttendanceRegularizationModal({
  attendanceRecords,
  isDemo,
  onClose,
}: {
  attendanceRecords: EssAttendanceRecordOption[];
  isDemo: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  useEscapeClose(onClose);
  const defaultAttendanceRecord = attendanceRecords.find((record) => !record.is_locked)?.id ?? attendanceRecords[0]?.id ?? "";
  const [selectedRecordId, setSelectedRecordId] = useState(defaultAttendanceRecord);
  const [requestedStatus, setRequestedStatus] = useState("present");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<AttendanceRegularizationField>>({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const selectedRecord = attendanceRecords.find((record) => record.id === selectedRecordId) ?? null;
  const hasTimeOrderRisk = Boolean(checkIn && checkOut && new Date(checkOut) < new Date(checkIn));
  const isSubmitBlocked = submitting || !attendanceRecords.length || Boolean(selectedRecord?.is_locked) || !reason.trim() || hasTimeOrderRisk;

  function clearFieldError(field: AttendanceRegularizationField) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submitRegularization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setFeedback(null);
    setFieldErrors({});
    const nextErrors: FieldErrors<AttendanceRegularizationField> = {
      attendance_record_id: requireValue(selectedRecordId, "Select the attendance day that needs correction."),
      requested_check_out_at: validateDateOrder(checkIn, checkOut, "Requested check-out cannot be earlier than requested check-in."),
      reason: requireText(reason, "Enter the reason for this attendance correction."),
    };
    if (selectedRecord?.is_locked) {
      nextErrors.attendance_record_id = "This attendance record is locked. Contact HR before payroll close.";
    }
    if (hasFieldErrors(nextErrors)) {
      const message = "Review the highlighted attendance fields and try again.";
      setFieldErrors(nextErrors);
      setFeedback({ tone: "error", message });
      setToast({ title: "Submission failed.", message, tone: "error" });
      submittingRef.current = false;
      return;
    }
    if (isDemo) {
      const message = "Attendance regularizations are only available in live mode.";
      setFeedback({ tone: "error", message });
      setToast({ title: "Submission failed.", message, tone: "error" });
      submittingRef.current = false;
      return;
    }
    const formData = new FormData(form);
    setSubmitting(true);
    let response: Response;
    try {
      response = await fetch("/api/me/attendance-regularizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendance_record_id: String(formData.get("attendance_record_id") ?? ""),
          requested_status: String(formData.get("requested_status") ?? "present"),
          requested_check_in_at: String(formData.get("requested_check_in_at") ?? "") || null,
          requested_check_out_at: String(formData.get("requested_check_out_at") ?? "") || null,
          reason: String(formData.get("reason") ?? ""),
        }),
      });
    } catch {
      const message = "Unable to reach the server. Check your connection and try again.";
      setFeedback({ tone: "error", message });
      setToast({ title: "Submission failed.", message, tone: "error" });
      setSubmitting(false);
      submittingRef.current = false;
      return;
    }
    const payload = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) {
      const message = getErrorMessage(payload);
      setFeedback({ tone: "error", message });
      setToast({ title: "Submission failed.", message, tone: "error" });
      submittingRef.current = false;
      return;
    }
    const message = "Attendance regularization submitted.";
    setFeedback({ tone: "success", message });
    setToast({ title: "Submitted successfully.", message, tone: "success" });
    form.reset();
    submittingRef.current = false;
    window.setTimeout(() => {
      onClose();
      router.refresh();
    }, 900);
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <div className="modal-shell" role="presentation">
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
      <div aria-label="Regularize attendance" aria-modal="true" className="modal ess-attendance-modal" role="dialog">
        <div className="modal__header">
          <div>
            <h2>Regularize attendance</h2>
            <p>Choose the day that needs correction, explain what changed, and send it for approval.</p>
          </div>
          <button aria-label="Close regularize attendance dialog" className="button button--secondary" onClick={onClose} type="button">Close</button>
        </div>
        <form className="attendance-regularize-layout" noValidate onSubmit={submitRegularization}>
          <div className="form-grid attendance-regularize-form">
            <label className="form-field form-field--full">
              <span className="muted">Attendance record</span>
              <select aria-invalid={Boolean(fieldErrors.attendance_record_id)} className="input-control" name="attendance_record_id" onChange={(event) => { setSelectedRecordId(event.target.value); clearFieldError("attendance_record_id"); }} required value={selectedRecordId}>
                {!attendanceRecords.length ? <option value="">No days available for correction</option> : null}
                {attendanceRecords.map((record) => (
                  <option disabled={record.is_locked} key={record.id} value={record.id}>{formatRecordLabel(record)}</option>
                ))}
              </select>
              {fieldErrors.attendance_record_id ? <span className="field-error-text" role="alert">{fieldErrors.attendance_record_id}</span> : null}
            </label>
            <label className="form-field">
              <span className="muted">Requested status</span>
              <select className="input-control" name="requested_status" onChange={(event) => setRequestedStatus(event.target.value)} value={requestedStatus}>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="half_day">Half day</option>
                <option value="late">Late</option>
                <option value="remote">Remote</option>
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Requested check-in</span>
              <input className="input-control" name="requested_check_in_at" onChange={(event) => { setCheckIn(event.target.value); clearFieldError("requested_check_out_at"); }} type="datetime-local" value={checkIn} />
            </label>
            <label className="form-field">
              <span className="muted">Requested check-out</span>
              <input aria-invalid={Boolean(fieldErrors.requested_check_out_at)} className="input-control" name="requested_check_out_at" onChange={(event) => { setCheckOut(event.target.value); clearFieldError("requested_check_out_at"); }} type="datetime-local" value={checkOut} />
              {fieldErrors.requested_check_out_at ? <span className="field-error-text" role="alert">{fieldErrors.requested_check_out_at}</span> : null}
            </label>
            <label className="form-field form-field--full">
              <span className="muted">Reason</span>
              <textarea aria-invalid={Boolean(fieldErrors.reason)} className="input-control" name="reason" onChange={(event) => { setReason(event.target.value); clearFieldError("reason"); }} required rows={3} value={reason} />
              {fieldErrors.reason ? <span className="field-error-text" role="alert">{fieldErrors.reason}</span> : null}
            </label>
            {feedback ? (
              <div className={`notice ${feedback.tone === "success" ? "notice--success" : "notice--error"} form-field--full`} role={feedback.tone === "success" ? "status" : "alert"}>
                <strong>{feedback.tone === "success" ? "Submitted successfully." : "Submission failed."}</strong>
                <span className="muted">{feedback.message}</span>
              </div>
            ) : null}
            {!attendanceRecords.length ? (
              <div className="notice form-field--full" role="status">
                <strong>No attendance day is available.</strong>
                <span className="muted">Ask HR to generate attendance records before requesting a correction.</span>
              </div>
            ) : null}
            {selectedRecord?.is_locked ? (
              <div className="notice form-field--full" role="status">
                <strong>Record locked.</strong>
                <span className="muted">Payroll or attendance cutoff has locked this day. Contact HR for changes.</span>
              </div>
            ) : null}
            {!reason.trim() ? (
              <div className="notice form-field--full" role="status">
                <strong>Reason required.</strong>
                <span className="muted">Explain the correction clearly so your manager can approve it without follow-up.</span>
              </div>
            ) : null}
            <div className="form-actions-bar form-field--full">
              <span className="muted">After you submit, your manager receives this correction for approval.</span>
              <button className="button button--primary" disabled={isSubmitBlocked} type="submit">
                {submitting ? "Submitting..." : "Submit correction"}
              </button>
            </div>
          </div>
          <aside className="attendance-regularize-summary" aria-label="Attendance regularization summary">
            <span className="detail-label">Request summary</span>
            <h3>{selectedRecord ? formatDate(selectedRecord.attendance_date) : "Choose attendance record"}</h3>
            <div className="leave-summary-metrics">
              <DetailRow label="Current status" value={selectedRecord ? formatStatus(selectedRecord.status) : "Pending"} />
              <DetailRow label="Requested" value={formatStatus(requestedStatus)} />
              <DetailRow label="Shift" value={selectedRecord?.shift ?? "Not assigned"} />
              <DetailRow label="Locked" value={selectedRecord?.is_locked ? "Yes" : "No"} />
            </div>
            <div className="leave-policy-helper">
              <strong>Before you submit</strong>
              <span>Use this for a missed punch, wrong day status, late entry, or remote-work correction.</span>
              <span>Manager approval is required before HR or payroll uses the correction.</span>
            </div>
            {hasTimeOrderRisk ? (
              <div className="notice">
                <strong>Check time order.</strong>
                <span className="muted">Requested check-out is earlier than requested check-in.</span>
              </div>
            ) : null}
          </aside>
        </form>
      </div>
    </div>
  );
}

function AttendanceDetailModal({ item, onClose }: { item: AttendanceRegularizationItem; onClose: () => void }) {
  useEscapeClose(onClose);

  return (
    <div className="modal-shell" role="presentation">
      <div aria-label="Regularization detail" aria-modal="true" className="modal ess-attendance-modal ess-attendance-modal--wide" role="dialog">
        <div className="modal__header">
          <div>
            <h2>{formatDate(item.attendance_date)}</h2>
            <p>{formatStatus(item.current_status)} to {formatStatus(item.requested_status)} • {formatStatus(item.status)}</p>
          </div>
          <button aria-label="Close regularization detail" className="button button--secondary" onClick={onClose} type="button">Close</button>
        </div>
        <AttendanceDecisionCard item={item} />
        <section className="ess-modal-section">
          <h3 className="section-heading-soft">Timeline</h3>
          <AttendanceTimeline item={item} />
        </section>
        <section className="ess-modal-section">
          <h3 className="section-heading-soft">Correction details</h3>
          <div className="detail-grid">
            <DetailRow label="Attendance date" value={formatDate(item.attendance_date)} />
            <DetailRow label="Current status" value={formatStatus(item.current_status)} />
            <DetailRow label="Requested status" value={formatStatus(item.requested_status)} />
            <DetailRow label="Actual check-in" value={formatDateTime(item.actual_check_in_at)} />
            <DetailRow label="Requested check-in" value={formatDateTime(item.requested_check_in_at)} />
            <DetailRow label="Actual check-out" value={formatDateTime(item.actual_check_out_at)} />
            <DetailRow label="Requested check-out" value={formatDateTime(item.requested_check_out_at)} />
            <DetailRow label="Reason" value={item.reason || "No reason provided."} />
            <DetailRow label="Workflow" value={item.workflow_reference || "Not available"} />
          </div>
        </section>
      </div>
    </div>
  );
}

export function AttendanceWorkspace({ attendanceRecords, currentParams, dashboard, isDemo, regularizations, state }: Props) {
  const [regularizeOpen, setRegularizeOpen] = useState(false);
  const [clickedRegularization, setClickedRegularization] = useState<AttendanceRegularizationItem | null>(null);
  const [dismissedRegularizationId, setDismissedRegularizationId] = useState<string | null>(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const status = normalizeParam(currentParams.status) ?? "all";
  const selectedRegularizationId = normalizeParam(currentParams.regId);
  const page = Math.max(Number(normalizeParam(currentParams.page) || String(regularizations.page)) || regularizations.page, 1);
  const tabs = ["all", "pending", "approved", "rejected"];
  const totalPages = Math.max(1, Math.ceil(regularizations.total_count / regularizations.page_size));
  const linkedRegularization = selectedRegularizationId && selectedRegularizationId !== dismissedRegularizationId
    ? regularizations.items.find((item) => item.id === selectedRegularizationId) ?? null
    : null;
  const selectedRegularization = clickedRegularization ?? linkedRegularization;
  const normalizedQuery = historyQuery.trim().toLowerCase();
  const visibleRegularizations = regularizations.items.filter((item) => {
    if (!normalizedQuery) return true;
    return [
      item.attendance_date,
      item.current_status,
      item.requested_status,
      item.status,
      item.reason,
      item.manager_comment ?? "",
      item.rejection_reason ?? "",
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  });
  const pendingCount = regularizations.status_counts.pending ?? 0;
  const approvedCount = regularizations.status_counts.approved ?? 0;
  const rejectedCount = regularizations.status_counts.rejected ?? 0;
  const unlockedRecordCount = attendanceRecords.filter((record) => !record.is_locked).length;
  const modal = typeof document !== "undefined"
    ? (
        <>
          {regularizeOpen ? createPortal(
            <AttendanceRegularizationModal
              attendanceRecords={attendanceRecords}
              isDemo={isDemo}
              onClose={() => setRegularizeOpen(false)}
            />,
            document.body,
          ) : null}
          {selectedRegularization ? createPortal(
            <AttendanceDetailModal
              item={selectedRegularization}
              onClose={() => {
                setDismissedRegularizationId(selectedRegularization.id);
                setClickedRegularization(null);
              }}
            />,
            document.body,
          ) : null}
        </>
      )
    : null;

  return (
    <main className="shell shell--workspace ess-experience-shell">
      <section className="workspace-control-header">
        <div className="workspace-control-header__copy">
          <span className="workspace-control-header__eyebrow">{state === "live" ? "Live ESS" : "Demo ESS"} / Attendance</span>
          <h1>Attendance</h1>
          <p>Review today, request corrections, and track every approval decision from one workspace.</p>
        </div>
        <div className="workspace-control-header__actions">
          <button className="button button--primary" onClick={() => setRegularizeOpen(true)} type="button">Regularize attendance</button>
          <Link className="button button--secondary" href="/ess">Overview</Link>
        </div>
        <div className="workspace-control-header__metrics" aria-label="Attendance summary">
          <span className="queue-summary-chip"><strong>{formatStatus(dashboard.attendance.today.status)}</strong> today</span>
          <span className="queue-summary-chip"><strong>{pendingCount}</strong> pending</span>
          <span className="queue-summary-chip"><strong>{approvedCount}</strong> approved</span>
          <span className="queue-summary-chip"><strong>{unlockedRecordCount}</strong> days editable</span>
        </div>
      </section>

      <section className="workspace-section">
        <div className="workspace-section__header">
          <div>
            <h2>Attendance snapshot</h2>
            <p>Today, month-to-date, and correction readiness for your active attendance calendar.</p>
          </div>
          <span className={statusClass(dashboard.attendance.today.status)}>{formatStatus(dashboard.attendance.today.status)}</span>
        </div>
        <div className="workspace-summary-grid attendance-summary-grid">
          <article className="workspace-summary-card">
            <div>
              <span className="workspace-summary-card__icon" aria-hidden="true">TD</span>
              <h3>Today</h3>
            </div>
            <strong>{formatStatus(dashboard.attendance.today.status)}</strong>
            <p>{formatDate(dashboard.attendance.today.date)} • {dashboard.attendance.today.shift || "Shift not assigned"}</p>
            <div className="workspace-summary-card__meta">
              <span>In: {formatDateTime(dashboard.attendance.today.check_in_at)}</span>
              <span>Out: {formatDateTime(dashboard.attendance.today.check_out_at)}</span>
            </div>
          </article>
          <article className="workspace-summary-card">
            <div>
              <span className="workspace-summary-card__icon" aria-hidden="true">MT</span>
              <h3>Month to date</h3>
            </div>
            <strong>{dashboard.attendance.month_to_date.present_days} present</strong>
            <p>{dashboard.attendance.month_to_date.work_duration_hours} hours recorded this month.</p>
            <div className="workspace-summary-card__meta">
              <span>Absent: {dashboard.attendance.month_to_date.absent_days}</span>
              <span>Late: {dashboard.attendance.month_to_date.late_days}</span>
            </div>
          </article>
          <article className="workspace-summary-card">
            <div>
              <span className="workspace-summary-card__icon" aria-hidden="true">FX</span>
              <h3>Correction queue</h3>
            </div>
            <strong>{pendingCount} pending</strong>
            <p>Corrections need manager approval before HR or payroll can use them.</p>
            <div className="workspace-summary-card__meta">
              <span>Approved: {approvedCount}</span>
              <span>Rejected: {rejectedCount}</span>
              <span>Editable days: {unlockedRecordCount}</span>
            </div>
          </article>
        </div>
      </section>

      <section className="workspace-section">
        <article className="workspace-data-panel attendance-requests-panel">
          <div className="workspace-data-panel__header">
            <div>
              <h2>Regularizations</h2>
              <p>Track correction requests, approval owner, manager notes, and final decisions.</p>
            </div>
            <button className="button button--secondary" onClick={() => setRegularizeOpen(true)} type="button">New correction</button>
          </div>
          <div className="workspace-status-tabs">
            {tabs.map((tab) => (
              <Link className={`workspace-status-tab ${status === tab ? "workspace-status-tab--active" : ""}`} href={buildHref(currentParams, { status: tab, regId: undefined, page: "1" })} key={tab}>
                <span>{formatStatus(tab)}</span>
                <strong>{regularizations.status_counts[tab as keyof typeof regularizations.status_counts] ?? 0}</strong>
              </Link>
            ))}
          </div>
          <details className="workspace-filter-disclosure" open={Boolean(historyQuery.trim())}>
            <summary>
              <span>Filters</span>
              <small>{visibleRegularizations.length} shown from the loaded page</small>
            </summary>
            <div className="attendance-history-filter">
              <label className="form-field">
                <span className="muted">Search regularizations</span>
                <input
                  className="input-control"
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  placeholder="Date, status, reason, or manager note"
                  value={historyQuery}
                />
              </label>
              <button className="button button--secondary" disabled={!historyQuery.trim()} onClick={() => setHistoryQuery("")} type="button">Clear search</button>
            </div>
          </details>
          <div className="workspace-table attendance-request-table" role="table" aria-label="Attendance regularization history">
            <div className="workspace-table__row workspace-table__row--head" role="row">
              <span role="columnheader">Date</span>
              <span role="columnheader">Correction</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Submitted</span>
              <span role="columnheader">Approver</span>
              <span role="columnheader">Actions</span>
            </div>
            {visibleRegularizations.length ? (
              visibleRegularizations.map((item) => {
                const waitingLabel = getApprovalWaitingLabel(item);
                return (
                  <div
                    className="workspace-table__row attendance-request-row"
                    key={item.id}
                    role="row"
                  >
                    <span role="cell">
                      <strong>{formatDate(item.attendance_date)}</strong>
                      <small>{item.workflow_reference || "Workflow pending"}</small>
                    </span>
                    <span role="cell">
                      <strong>{formatStatus(item.current_status)} to {formatStatus(item.requested_status)}</strong>
                      <small>{item.reason || "No reason provided."}</small>
                    </span>
                    <span role="cell">
                      <span className={statusClass(item.status)}>{formatStatus(item.status)}</span>
                    </span>
                    <span role="cell">{formatDateTime(item.applied_at ?? item.created_at)}</span>
                    <span role="cell">
                      <strong>{getRegularizationOwnerLabel(item)}</strong>
                      <small>{waitingLabel || item.manager_comment || item.rejection_reason || "Decision history available"}</small>
                    </span>
                    <span role="cell">
                      <button
                        className="button button--secondary"
                        onClick={() => {
                          setDismissedRegularizationId(null);
                          setClickedRegularization(item);
                        }}
                        type="button"
                      >
                        View
                      </button>
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="notice workspace-empty-state">
                <strong>{regularizations.items.length ? "No regularizations match this search." : "No regularizations in this view."}</strong>
                <span className="muted">{regularizations.items.length ? "Clear search or try another status tab." : "Try another status tab once more data is available."}</span>
              </div>
            )}
          </div>
        </article>
        <PaginationBar
          firstHref={buildHref(currentParams, { regId: undefined, page: "1" })}
          hasNext={regularizations.has_next}
          hasPrevious={regularizations.has_previous}
          lastHref={buildHref(currentParams, { regId: undefined, page: String(totalPages) })}
          nextHref={buildHref(currentParams, { regId: undefined, page: String(page + 1) })}
          page={regularizations.page}
          pageSize={regularizations.page_size}
          previousHref={buildHref(currentParams, { regId: undefined, page: String(Math.max(1, page - 1)) })}
          totalCount={regularizations.total_count}
        />
      </section>

      {modal}
    </main>
  );
}
