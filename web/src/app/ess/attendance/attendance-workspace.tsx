"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type MouseEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";

import { WorkspaceCalendar } from "@/components/patterns/workspace-calendar";
import { EssFields } from "../ess-profile-summary";

import { ActionToast } from "@/components/patterns/action-toast";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceStandardHeader, WorkspaceStandardPanel, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import { type FieldErrors, hasFieldErrors, requireText, requireValue, validateDateOrder } from "@/lib/ui/validation";
import { clearMutationIdempotencyKey, mutationIdempotencyKey } from "@/lib/ui/mutation-idempotency";
import type {
  AttendanceRegularizationItem,
  EssAttendanceMonth,
  EssAttendanceRecordOption,
  EssAttendanceRegularizationListResponse,
} from "@/lib/types";

type SearchParamValue = string | string[] | undefined;

type Props = {
  invalidMonth: boolean;
  linkedRequest: AttendanceRegularizationItem | null;
  attendance: EssAttendanceMonth;
  currentParams: Record<string, SearchParamValue>;
  isDemo: boolean;
  regularizations: EssAttendanceRegularizationListResponse;
};

type Feedback = {
  tone: "success" | "error";
  message: string;
};

type AttendanceRegularizationField = "attendance_record_id" | "requested_check_out_at" | "reason";

const subscribeToHydration = () => () => undefined;
const clientHydrationSnapshot = () => true;
const serverHydrationSnapshot = () => false;

function scrollAttendanceTable(event: ReactKeyboardEvent<HTMLDivElement>) {
  const region = event.currentTarget;
  if (event.target !== region || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || region.scrollWidth <= region.clientWidth) return;
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  region.scrollBy({ left: (event.key === "ArrowRight" ? 1 : -1) * Math.max(80, Math.round(region.clientWidth * 0.7)), behavior: "instant" });
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fullMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day} ${monthNames[Number(month) - 1]} ${year}`;
}

// Assemble numeric parts ourselves: Safari's locale punctuation/day-period text
// differs from Node ICU and otherwise causes React hydration to discard the tree.
function attendanceTimestamp(value: string | null | undefined, zone: string) {
  if (!value) return "Not recorded";
  const instant = new Date(value);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(instant).map((part) => [part.type, part.value]));
  const wall = new Date(0);
  wall.setUTCFullYear(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  wall.setUTCHours(Number(parts.hour), Number(parts.minute), 0, 0);
  const offset = Math.round((wall.getTime() - Math.floor(instant.getTime() / 60_000) * 60_000) / 60_000);
  const absolute = Math.abs(offset);
  const offsetLabel = offset === 0 ? "UTC" : `UTC${offset < 0 ? "-" : "+"}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
  return `${parts.day.padStart(2, "0")} ${monthNames[Number(parts.month) - 1]} ${parts.year}, ${parts.hour.padStart(2, "0")}:${parts.minute.padStart(2, "0")} ${offsetLabel}`;
}

function formatDateTime(value: string | null | undefined) {
  return attendanceTimestamp(value, "UTC");
}

const calendarStatusCode: Record<string, string> = { present: "P", absent: "A", half_day: "½", late: "L", remote: "R", weekly_off: "Off", holiday: "H", on_leave: "Lv", unknown: "?" };

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function statusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (["approved", "present", "regularized"].includes(status)) return "success";
  if (["pending", "late", "half_day", "open"].includes(status)) return "warning";
  if (["rejected", "absent", "locked"].includes(status)) return "danger";
  if (["remote", "submitted"].includes(status)) return "info";
  return "neutral";
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

function getDerivationReason(record: EssAttendanceRecordOption | null) {
  return record?.derivation_summary?.reasons?.[0] || "Choose a day to review the attendance derivation.";
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
  initialRecordId,
  onSubmitted,
}: {
  initialRecordId?: string;
  onSubmitted: () => void;
  attendanceRecords: EssAttendanceRecordOption[];
  isDemo: boolean;
  onClose: () => void;
}) {
  const defaultAttendanceRecord = initialRecordId || (attendanceRecords.find((record) => !record.is_locked)?.id ?? attendanceRecords[0]?.id ?? "");
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
  const selectedPayrollImpact = selectedRecord?.derivation_summary?.payroll_impact;
  const hasTimeOrderRisk = Boolean(checkIn && checkOut && new Date(`${checkOut}Z`) < new Date(`${checkIn}Z`));
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
      requested_check_out_at: validateDateOrder(checkIn ? `${checkIn}Z` : "", checkOut ? `${checkOut}Z` : "", "Requested check-out cannot be earlier than requested check-in."),
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
    const requestPayload = {
      attendance_record_id: String(formData.get("attendance_record_id") ?? ""),
      requested_status: String(formData.get("requested_status") ?? "present"),
      requested_check_in_at: checkIn ? `${checkIn}Z` : null,
      requested_check_out_at: checkOut ? `${checkOut}Z` : null,
      reason: String(formData.get("reason") ?? ""),
    };
    const mutationScope = "ess.attendance.regularization.submit";
    const idempotencyKey = mutationIdempotencyKey(mutationScope, requestPayload);
    setSubmitting(true);
    let response: Response;
    try {
      response = await fetch("/api/me/attendance-regularizations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(requestPayload),
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
    clearMutationIdempotencyKey(mutationScope);
    const message = "Attendance regularization submitted.";
    setFeedback({ tone: "success", message });
    setToast({ title: "Submitted successfully.", message, tone: "success" });
    form.reset();
    submittingRef.current = false;
    onSubmitted();
    onClose();
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <HrAdminActionModal
      className="accerio-dialog"
      explicitTabOrder
      closeHref="/ess/attendance"
      description="Choose the day, explain the correction and submit for approval. Requested times use UTC, regardless of your browser timezone."
      eyebrow="ESS attendance"
      labelledBy="ess-attendance-regularize-modal"
      onClose={onClose}
      title="Regularize attendance"
    >
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
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
              <AsyncActionButton
                className="button button--primary"
                disabled={isSubmitBlocked}
                pending={submitting}
                pendingLabel="Submitting correction"
                type="submit"
              >
                Submit correction
              </AsyncActionButton>
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
              <DetailRow label="Why this status" value={getDerivationReason(selectedRecord)} />
              <DetailRow
                label="Payroll impact"
                value={selectedPayrollImpact ? `Payable ${selectedPayrollImpact.payable_units} / LOP ${selectedPayrollImpact.lop_units}` : "Pending"}
              />
              <DetailRow
                label="Leave collision"
                value={selectedRecord?.derivation_summary?.leave_collision_count ? `${selectedRecord.derivation_summary.leave_collision_count} overlapping leave request` : "Clear"}
              />
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
    </HrAdminActionModal>
  );
}

function AttendanceDetailModal({ item, onClose }: { item: AttendanceRegularizationItem; onClose: () => void }) {
  return (
    <HrAdminActionModal
      className="accerio-dialog"
      explicitTabOrder
      closeHref="/ess/attendance"
      description={`${formatStatus(item.current_status)} to ${formatStatus(item.requested_status)} - ${formatStatus(item.status)}`}
      eyebrow="Regularization detail"
      labelledBy={`ess-attendance-regularization-${item.id}`}
      onClose={onClose}
      title={formatDate(item.attendance_date)}
    >
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
    </HrAdminActionModal>
  );
}

export function AttendanceWorkspace({ invalidMonth, linkedRequest: linkedDetail, attendance: initialAttendance, currentParams, isDemo, regularizations: initialRegularizations }: Props) {
  const router = useRouter();
  const correctionActionRef = useRef<HTMLButtonElement | null>(null);
  const refreshVersion = useRef(0);
  const [fresh, setFresh] = useState<{ source: EssAttendanceMonth; attendance: EssAttendanceMonth; regularizations: EssAttendanceRegularizationListResponse } | null>(null);
  const attendance = fresh?.source === initialAttendance ? fresh.attendance : initialAttendance;
  const regularizations = fresh?.source === initialAttendance ? fresh.regularizations : initialRegularizations;
  const [refreshingSource, setRefreshingSource] = useState<EssAttendanceMonth | null>(null);
  const isRefreshing = refreshingSource === initialAttendance;
  const [refreshFailure, setRefreshFailure] = useState<{ source: EssAttendanceMonth; message: string } | null>(null);
  const refreshError = refreshFailure?.source === initialAttendance ? refreshFailure.message : null;
  const hydrated = useSyncExternalStore(subscribeToHydration, clientHydrationSnapshot, serverHydrationSnapshot);
  const [regularizeOpen, setRegularizeOpen] = useState(false);
  const [initialRecordId, setInitialRecordId] = useState<string>();
  const [clickedRegularization, setClickedRegularization] = useState<AttendanceRegularizationItem | null>(null);
  const [dismissedRequestId, setDismissedRequestId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "list" ? "list" : "calendar";
  const params = { ...currentParams, ...Object.fromEntries(searchParams.entries()), month: attendance.month };
  const href = (updates: Record<string, string | undefined>) => buildHref(params, updates);
  const eligible = attendance.days.filter((day) => day.can_regularize && day.derivation_summary).map((day) => ({ ...day, derivation_summary: day.derivation_summary! }));
  const dayParam = searchParams.get("day");
  const selectedDate = dayParam?.startsWith(`${attendance.month}-`) && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) && dayParam >= attendance.period_start && dayParam <= attendance.period_end ? dayParam : (attendance.today.startsWith(`${attendance.month}-`) ? attendance.today : attendance.days[0]?.attendance_date ?? attendance.period_start);
  const selectedDay = attendance.days.find((day) => day.attendance_date === selectedDate) ?? null;
  const linkedRequest = (linkedDetail?.id !== dismissedRequestId ? linkedDetail : null) ?? regularizations.items.find((item) => item.id === normalizeParam(currentParams.regId) && item.id !== dismissedRequestId) ?? null;
  const selectedRequest = clickedRegularization ?? linkedRequest;
  const pending = regularizations.status_counts.pending ?? 0;
  const status = normalizeParam(currentParams.status) ?? "all";
  const dateTime = (value: string | null) => attendanceTimestamp(value, attendance.timezone);
  const offset = (new Date(`${attendance.period_start}T00:00:00Z`).getUTCDay() + 6) % 7;
  const dayCount = Number(attendance.period_end.slice(8));
  const periodLabel = `${fullMonthNames[Number(attendance.month.slice(5)) - 1]} ${attendance.month.slice(0, 4)}`;
  function adjacentMonth(delta: number) {
    const date = new Date(`${attendance.period_start}T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + delta);
    return date.toISOString().slice(0, 7);
  }
  async function refreshRecords() {
    const version = ++refreshVersion.current;
    setRefreshingSource(initialAttendance);
    setRefreshFailure(null);
    try {
      const recordsQuery = new URLSearchParams({ month: attendance.month, page: String(attendance.page), page_size: String(attendance.page_size) });
      const historyQuery = new URLSearchParams({ status, page: String(regularizations.page), page_size: String(regularizations.page_size) });
      const results = await Promise.all([
        fetch(`/api/me/attendance-records?${recordsQuery}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) }),
        fetch(`/api/me/attendance-regularizations?${historyQuery}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) }),
      ]);
      if (results.some((result) => result.status === 401)) { router.replace("/login"); return; }
      if (results.some((result) => !result.ok)) throw new Error("Refresh failed");
      const [nextAttendance, nextHistory] = await Promise.all(results.map((result) => result.json()));
      if (version !== refreshVersion.current) return;
      setFresh({ source: initialAttendance, attendance: nextAttendance as EssAttendanceMonth, regularizations: nextHistory as EssAttendanceRegularizationListResponse });
    } catch {
      if (version !== refreshVersion.current) return;
      setRefreshFailure({ source: initialAttendance, message: "The correction was submitted, but updated records could not be loaded. Showing the last loaded records. Retry refresh; do not resubmit the correction." });
    } finally {
      if (version === refreshVersion.current) setRefreshingSource((source) => source === initialAttendance ? null : source);
    }
  }
  function selectLocal(event: MouseEvent<HTMLAnchorElement>, updates: Record<string, string>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const target = href(updates);
    if (`${window.location.pathname}${window.location.search}` !== target) window.history.pushState(null, "", target);
  }
  function requestCorrection(id?: string, opener?: HTMLButtonElement) {
    (opener ?? correctionActionRef.current)?.focus();
    setInitialRecordId(id);
    setRegularizeOpen(true);
  }
  useEffect(() => {
    function openLinkedAction() {
      if (window.location.hash !== "#regularize-attendance") return;
      if (eligible.length && !isRefreshing && !refreshError) { correctionActionRef.current?.focus(); setRegularizeOpen(true); }
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
    }
    openLinkedAction();
    window.addEventListener("hashchange", openLinkedAction);
    return () => window.removeEventListener("hashchange", openLinkedAction);
  }, [eligible.length, isRefreshing, refreshError]);

  return (
    <main className="shell shell--workspace ess-experience-shell ess-compact ess-attendance">
      <WorkspaceStandardHeader title="Attendance" description="Review your recorded days and request an authorized correction." actions={<><button className="button button--primary" disabled={!eligible.length || isDemo || isRefreshing || Boolean(refreshError)} ref={correctionActionRef} onClick={(event) => requestCorrection(undefined, event.currentTarget)} type="button">Regularize attendance</button><a data-navigation-mode="document" className="button button--secondary" href="/ess">Overview</a></>} />
      <p className="sr-only" id="ess-attendance-table-scroll-help">When this table region is focused, use Left and Right arrow keys to scroll its columns.</p>
      {invalidMonth ? <p className="notice notice--error" role="alert">The requested month is invalid. Showing the current tenant month; choose a month below to continue.</p> : null}
      {isRefreshing ? <p role="status" className="notice">Refreshing attendance and correction history…</p> : null}
      {refreshError ? <div role="alert" className="notice notice--error"><p>{refreshError}</p><button className="button button--secondary" disabled={isRefreshing} onClick={() => void refreshRecords()} type="button">Retry refresh</button></div> : null}
      {submitted ? <p className="notice notice--success" role="status">Attendance regularization submitted. Track the approval in Regularizations below.</p> : null}
      {isDemo ? <p className="notice">Preview mode. Corrections are unavailable.</p> : null}
      <div className="attendance-summary-strip" aria-label="Attendance period summary">
        <span><strong>{attendance.summary.recorded_days}</strong> recorded days</span>
        <span><strong>{attendance.summary.worked_hours}</strong> recorded hours</span>
        <span><strong>{attendance.summary.locked_days}</strong> finalized days</span>
        <span><strong>{attendance.summary.pending_corrections}</strong> awaiting approval in this period</span>
      </div>
      <WorkspaceStandardPanel title="Attendance period" description={`${formatDate(attendance.period_start)} – ${formatDate(attendance.period_end)} · Times: ${attendance.timezone} · Today: ${formatDate(attendance.today)}`}>
        <form data-navigation-mode="document" action="/ess/attendance" method="get" className="ess-attendance-toolbar">
          <label>Month<input className="input-control" name="month" type="month" min="0001-01" max="9999-12" required defaultValue={attendance.month} key={attendance.month} /></label>
          <input type="hidden" name="view" value={view} />
          <label>Rows per page<select className="input-control" name="page_size" defaultValue={attendance.page_size} key={attendance.page_size}>{[5, 10, 20, 31].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
          <button className="button button--secondary" type="submit">Show period</button>
          <a data-navigation-mode="document" className="button button--secondary" href="/ess/attendance">Current period</a>
        </form>
        <nav className="ess-attendance-toolbar" aria-label="Attendance view and month">
          {attendance.month !== "0001-01" ? <a data-navigation-mode="document" href={href({ month: adjacentMonth(-1), day: undefined, page: "1" })}>Previous month</a> : null}
          <strong>{periodLabel}</strong>
          {attendance.month !== "9999-12" ? <a data-navigation-mode="document" href={href({ month: adjacentMonth(1), day: undefined, page: "1" })}>Next month</a> : null}
          <a data-navigation-mode="document" href={href({ view: "calendar" })} onClick={(event) => selectLocal(event, { view: "calendar" })} aria-current={view === "calendar" ? "page" : undefined}>Calendar</a>
          <a data-navigation-mode="document" href={href({ view: "list" })} onClick={(event) => selectLocal(event, { view: "list" })} aria-current={view === "list" ? "page" : undefined}>List</a>
        </nav>
        {!attendance.days.length ? <p className="ess-empty" role="status">No attendance records in this period. Missing days are not inferred as absences.</p> : null}
        {view === "calendar" ? <WorkspaceCalendar offset={offset} onSelect={(event, day) => selectLocal(event, { day })} days={Array.from({ length: dayCount }, (_, index) => {
          const day = `${attendance.month}-${String(index + 1).padStart(2, "0")}`;
          const record = attendance.days.find((item) => item.attendance_date === day);
          return { date: day, number: index + 1, status: record ? formatStatus(record.status) : "No record", shortStatus: record ? calendarStatusCode[record.status] ?? "?" : "—", finalized: Boolean(record?.is_locked), selected: day === selectedDate, href: href({ day }), label: `${day}: ${record ? formatStatus(record.status) : "No record"}${record?.is_locked ? ", finalized" : ""}` };
        })} /> : <>
          <div className="workspace-table-scroll" role="region" aria-label="Attendance records" aria-describedby="ess-attendance-table-scroll-help" onKeyDown={scrollAttendanceTable} tabIndex={0}><table className="workspace-table ess-attendance-table" aria-label="Attendance days"><thead><tr><th scope="col">Day</th><th scope="col">Status</th><th scope="col">Shift</th><th scope="col">Recorded hours</th><th scope="col">Protection</th></tr></thead><tbody>{attendance.items.map((day) => <tr key={day.id} className={day.attendance_date === selectedDate ? "is-selected" : ""}><th scope="row"><a data-navigation-mode="document" onClick={(event) => selectLocal(event, { day: day.attendance_date })} aria-current={day.attendance_date === selectedDate ? "date" : undefined} href={href({ day: day.attendance_date })}>{formatDate(day.attendance_date)}</a></th><td>{formatStatus(day.status)}</td><td>{day.shift || "Not recorded"}</td><td>{day.work_duration_hours}</td><td>{day.is_locked ? "Finalized" : "Not finalized"}</td></tr>)}</tbody></table></div>
          <div aria-label="Attendance pagination"><PaginationBar navigationMode="document" page={attendance.page} pageSize={attendance.page_size} totalCount={attendance.total_count} hasNext={attendance.has_next} hasPrevious={attendance.has_previous} firstHref={href({ page: "1" })} lastHref={href({ page: String(attendance.total_pages) })} previousHref={href({ page: String(Math.max(1, attendance.page - 1)) })} nextHref={href({ page: String(attendance.page + 1) })} /></div>
        </>}
      </WorkspaceStandardPanel>
      <WorkspaceStandardPanel title={`Day details · ${formatDate(selectedDate)}`} description="Recorded attendance values; raw punches cannot be edited here.">
        {selectedDay ? <>
          <EssFields fields={[["Status", formatStatus(selectedDay.status)], ["Shift", selectedDay.shift], ["Recorded check-in", dateTime(selectedDay.check_in_at)], ["Recorded check-out", dateTime(selectedDay.check_out_at)], ["Working hours", selectedDay.work_duration_hours], ["Overtime recorded (hours)", selectedDay.overtime_hours], ["Late (minutes)", String(selectedDay.late_minutes)], ["Early exit (minutes)", String(selectedDay.early_exit_minutes)], ["Holiday", selectedDay.holiday || selectedDay.derivation_summary?.holiday_name], ["Schedule context", selectedDay.derivation_summary?.schedule_day_type ? formatStatus(selectedDay.derivation_summary.schedule_day_type) : "Historical schedule context unavailable"], ["Protection", selectedDay.is_locked ? "Finalized / read only" : "Not finalized"], ["Regularized", selectedDay.is_regularized ? "Yes" : "No"]]} />
          {selectedDay.derivation_summary ? <div className="ess-section-note"><strong>Current policy context for this date</strong><ul>{[...selectedDay.derivation_summary.reasons, ...selectedDay.derivation_summary.warnings].map((reason, index) => <li key={index}>{reason}</li>)}</ul></div> : <p className="ess-section-note">Finalized values are shown as stored. Current policy is not used to reconstruct historical explanations.</p>}
          <p className="ess-section-note">Raw punch history is unavailable. These are the recorded daily check-in and check-out values. Overtime shown here is recorded time, not a payment entitlement.</p>
          {selectedDay.can_regularize && !isDemo ? <button disabled={isRefreshing || Boolean(refreshError)} className="button button--secondary" onClick={(event) => requestCorrection(selectedDay.id, event.currentTarget)} type="button">Request correction for this day</button> : <p className="ess-section-note" role="note">{selectedDay.regularization_unavailable_reason || "Corrections are unavailable in preview mode."}</p>}
        </> : <p className="ess-empty">No attendance record for this day. A correction requires an existing eligible record.</p>}
        {!eligible.length ? <p className="ess-section-note">No eligible records in this period. Finalized days and requests awaiting approval cannot be resubmitted.</p> : null}
      </WorkspaceStandardPanel>
      <WorkspaceStandardPanel title="Regularizations" description={`All periods · ${pending} awaiting approval. View request details and the recorded decision.`}>
        <nav className="ess-attendance-toolbar" aria-label="Regularization status">{["all", "pending", "approved", "rejected"].map((item) => <a data-navigation-mode="document" key={item} href={href({ status: item, reg_page: "1", regId: undefined })} aria-current={status === item ? "page" : undefined}>{formatStatus(item)} ({regularizations.status_counts[item as keyof typeof regularizations.status_counts] ?? 0})</a>)}</nav>
        <div className="workspace-table-scroll" role="region" aria-label="Correction history" aria-describedby="ess-attendance-table-scroll-help" onKeyDown={scrollAttendanceTable} tabIndex={0}><table className="workspace-table ess-attendance-table" aria-label="Attendance regularization history"><thead><tr><th scope="col">Day</th><th scope="col">Requested status</th><th scope="col">Approval status</th><th scope="col">Approver / note</th><th scope="col">Details</th></tr></thead><tbody>{regularizations.items.map((item) => <tr key={item.id}><th scope="row">{formatDate(item.attendance_date)}</th><td>{formatStatus(item.requested_status)}</td><td><WorkspaceStatusBadge tone={statusTone(item.status)}>{formatStatus(item.status)}</WorkspaceStatusBadge></td><td>{getRegularizationOwnerLabel(item)}<br />{item.manager_comment || item.rejection_reason || getApprovalWaitingLabel(item)}</td><td><button className="button button--secondary" type="button" onClick={(event) => { event.currentTarget.focus(); setDismissedRequestId(null); setClickedRegularization(item); }}>View</button></td></tr>)}</tbody></table></div>
        {!regularizations.items.length ? <p className="ess-empty">No regularizations in this view.</p> : null}
        <div aria-label="Regularization pagination"><PaginationBar navigationMode="document" page={regularizations.page} pageSize={regularizations.page_size} totalCount={regularizations.total_count} hasNext={regularizations.has_next} hasPrevious={regularizations.has_previous} firstHref={href({ reg_page: "1", regId: undefined })} lastHref={href({ reg_page: String(Math.max(1, Math.ceil(regularizations.total_count / regularizations.page_size))), regId: undefined })} previousHref={href({ reg_page: String(Math.max(1, regularizations.page - 1)), regId: undefined })} nextHref={href({ reg_page: String(regularizations.page + 1), regId: undefined })} /></div>
      </WorkspaceStandardPanel>
      {hydrated && regularizeOpen ? createPortal(<AttendanceRegularizationModal attendanceRecords={eligible} initialRecordId={initialRecordId} isDemo={isDemo} onClose={() => setRegularizeOpen(false)} onSubmitted={() => { setSubmitted(true); void refreshRecords(); }} />, document.body) : null}
      {hydrated && selectedRequest ? createPortal(<AttendanceDetailModal item={selectedRequest} onClose={() => { setDismissedRequestId(selectedRequest.id); setClickedRegularization(null); }} />, document.body) : null}
    </main>
  );
}
