"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { createPortal } from "react-dom";

import { LeaveRequestLifecycleActions } from "@/app/ess/leave-request-lifecycle-actions";
import { ActionToast } from "@/components/patterns/action-toast";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceCalendar } from "@/components/patterns/workspace-calendar";
import { WorkspaceInformation } from "@/components/patterns/workspace-information";
import { WorkspaceStandardHeader, WorkspaceStandardPanel, WorkspaceFilterBar, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { EssLeaveRequestListResponse, EssLeaveTypeOption, LeaveBalance, LeaveRequestItem } from "@/lib/types";
import { type FieldErrors, hasFieldErrors, requireText, requireValue, validateDateOrder, validateUploadFile } from "@/lib/ui/validation";
import { clearMutationIdempotencyKey, mutationIdempotencyKey } from "@/lib/ui/mutation-idempotency";

type SearchParamValue = string | string[] | undefined;

type Props = {
  balances: LeaveBalance[];
  linkedDetail: LeaveRequestItem | null;
  currentParams: Record<string, SearchParamValue>;
  isDemo: boolean;
  leaveRequests: EssLeaveRequestListResponse;
  leaveTypes: EssLeaveTypeOption[];
  state: "demo" | "live";
};

type Feedback = {
  tone: "success" | "error";
  message: string;
};

type LeaveApplyField = "leave_type_id" | "start_date" | "end_date" | "attachment_file" | "attachment_reference" | "reason";

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "Not available";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(date.getUTCDate()).padStart(2, "0")} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  const iso = date.toISOString();
  return `${formatDate(iso.slice(0, 10))} ${iso.slice(11, 16)} UTC`;
}

function statusClass(status: string) {
  return `status status--${status}`;
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function statusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (["approved", "complete", "completed"].includes(status)) return "success";
  if (["pending", "partially_approved", "in_progress"].includes(status)) return "warning";
  if (["rejected", "cancelled", "withdrawn", "failed"].includes(status)) return "danger";
  if (["draft", "submitted"].includes(status)) return "info";
  return "neutral";
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
  params.delete("requestId");
  Object.entries(updates).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  const queryString = params.toString();
  return queryString ? `/ess/leave?${queryString}` : "/ess/leave";
}

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to submit leave request.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to submit leave request.");
}

function parseDateOnly(value: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetweenInclusive(startDate: Date, endDate: Date) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((endDate.getTime() - startDate.getTime()) / dayMs) + 1;
}

function estimateRequestedUnits(startDateValue: string, endDateValue: string, startPortion: string, endPortion: string) {
  const startDate = parseDateOnly(startDateValue);
  const endDate = parseDateOnly(endDateValue);
  if (!startDate || !endDate || endDate < startDate) {
    return { days: 0, calendarDays: 0, valid: false };
  }

  const calendarDays = daysBetweenInclusive(startDate, endDate);
  let days = calendarDays;

  if (calendarDays === 1) {
    if (startPortion === "full_day" && endPortion === "full_day") days = 1;
    else if (startPortion !== "full_day" && endPortion !== "full_day" && startPortion !== endPortion) days = 1;
    else days = 0.5;
  } else {
    if (startPortion !== "full_day") days -= 0.5;
    if (endPortion !== "full_day") days -= 0.5;
  }

  return { days: Math.max(0.5, days), calendarDays, valid: true };
}

function rangesOverlap(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  const startA = parseDateOnly(leftStart);
  const endA = parseDateOnly(leftEnd);
  const startB = parseDateOnly(rightStart);
  const endB = parseDateOnly(rightEnd);
  if (!startA || !endA || !startB || !endB) return false;
  return startA <= endB && startB <= endA;
}

function getRequestPeriod(item: LeaveRequestItem, today: Date) {
  const startDate = parseDateOnly(item.start_date);
  const endDate = parseDateOnly(item.end_date);
  if (!startDate || !endDate) return "all";
  if (startDate >= today) return "upcoming";
  if (endDate < today) return "past";
  return "current";
}

function isRequestInYear(item: LeaveRequestItem, year: number) {
  const startDate = parseDateOnly(item.start_date);
  const endDate = parseDateOnly(item.end_date);
  if (!startDate || !endDate) return false;
  return startDate <= new Date(Date.UTC(year, 11, 31)) && endDate >= new Date(Date.UTC(year, 0, 1));
}

function getCurrentApprovalStep(item: LeaveRequestItem) {
  return (item.approval_steps ?? []).find((step) => step.is_current) ?? null;
}

function getApprovalWaitingLabel(item: LeaveRequestItem) {
  if (!["pending", "partially_approved"].includes(item.status)) {
    return "";
  }
  const currentStep = getCurrentApprovalStep(item);
  if (!currentStep) {
    return "Pending approval from the configured approver";
  }
  return `Pending approval from ${currentStep.manager_name || currentStep.name || `Level ${currentStep.level} approver`}`;
}

function getRequestOwnerLabel(item: LeaveRequestItem) {
  const waitingLabel = getApprovalWaitingLabel(item);
  if (waitingLabel) return waitingLabel.replace(/^Pending approval from /, "");
  const lastDecision = [...(item.approval_steps ?? [])].reverse().find((step) => step.manager_name || step.name);
  return lastDecision?.manager_name || lastDecision?.name || "Not assigned";
}

function getPrimaryBalanceLabel(balance: LeaveBalance) {
  return `${balance.closing_balance} units available`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function formatUnitReason(value: string) {
  return value.replaceAll("_", " ");
}

function getUnitBreakdownSummary(item: LeaveRequestItem) {
  const breakdown = item.unit_breakdown;
  if (!breakdown?.days?.length) {
    return "Unit calculation details were not captured for this request.";
  }
  const counted = breakdown.days.filter((day) => day.counted).length;
  const excluded = breakdown.days.length - counted;
  if (breakdown.count_basis === "calendar_days") {
    return "This policy counts calendar days, so weekends and holidays remain chargeable.";
  }
  if (breakdown.count_basis === "sandwich_rule") {
    return "Sandwich rule is enabled, so weekly offs or holidays inside the selected range remain chargeable.";
  }
  return `${counted} working day${counted === 1 ? "" : "s"} counted, ${excluded} non-working day${excluded === 1 ? "" : "s"} excluded.`;
}

function LeaveUnitBreakdown({ item }: { item: LeaveRequestItem }) {
  const days = item.unit_breakdown?.days ?? [];
  return (
    <section className="ess-modal-section">
      <h3 className="section-heading-soft">Unit calculation</h3>
      <div className="notice">
        <strong>{item.unit_breakdown?.requested_units ?? item.requested_units} units requested</strong>
        <span className="muted">{getUnitBreakdownSummary(item)}</span>
      </div>
      {days.length ? (
        <div className="leave-unit-breakdown" aria-label="Leave unit calculation by date">
          {days.map((day) => (
            <div className={`leave-unit-breakdown__row ${day.counted ? "leave-unit-breakdown__row--counted" : "leave-unit-breakdown__row--excluded"}`} key={day.date}>
              <span>
                <strong>{formatDate(day.date)}</strong>
                <small>{day.day}</small>
              </span>
              <span>
                <strong>{day.units} units</strong>
                <small>{day.holiday_name || formatUnitReason(day.reason)}</small>
              </span>
              <span className={day.counted ? "status status--approved" : "status status--cancelled"}>
                {day.counted ? "Counted" : "Excluded"}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
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

function LeaveEvidence({ item }: { item: LeaveRequestItem }) {
  const attachments = item.attachments ?? [];
  if (!attachments.length && !item.attachment_reference) {
    return (
      <div className="notice">
        <strong>No evidence attached.</strong>
        <span className="muted">This request does not currently carry a supporting document.</span>
      </div>
    );
  }

  return (
    <div className="leave-evidence-list">
      {attachments.map((attachment) => (
        <a
          className="leave-evidence-item"
          href={`/api/me/leave-requests/${item.id}/attachments/${attachment.id}/download`}
          key={attachment.id}
        >
          <span>
            <strong>{attachment.file_name}</strong>
            <small>{attachment.action.replaceAll("_", " ")} • {attachment.file_size_bytes ? `${Math.ceil(attachment.file_size_bytes / 1024)} KB` : "Size pending"}</small>
          </span>
          <span className="button button--secondary">Download</span>
        </a>
      ))}
      {!attachments.length && item.attachment_reference ? (
        <div className="leave-evidence-item leave-evidence-item--static">
          <span>
            <strong>{item.attachment_reference}</strong>
            <small>Reference only</small>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function LeaveTimeline({ item }: { item: LeaveRequestItem }) {
  const isRejected = item.status === "rejected";
  const isCancelled = item.status === "cancelled";
  const isWithdrawn = item.status === "withdrawn";
  const hasDecision = Boolean(item.approved_at || item.rejection_reason || item.manager_comment || isRejected || item.status === "approved" || item.status === "partially_approved");
  const approvalSteps = item.approval_steps ?? [];
  const timeline = [
    {
      label: "Submitted",
      detail: item.reason || "Request sent to the configured approval route.",
      when: item.applied_at,
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
              detail: hasDecision
                ? (item.manager_comment || item.rejection_reason || `Request ${formatStatus(item.status)}.`)
                : "Your manager or configured approver still needs to review this request.",
              when: item.approved_at ?? (isRejected ? item.updated_at : null),
              state: hasDecision ? (isRejected ? "blocked" : "complete") : "current",
            },
          ]
    ),
  ];

  if (isCancelled || isWithdrawn) {
    timeline.push({
      label: isWithdrawn ? "Withdrawn" : "Cancelled",
      detail: isWithdrawn ? "Employee withdrew the pending request." : "Approved leave was cancelled.",
      when: item.cancelled_at ?? item.updated_at ?? null,
      state: "blocked",
    });
  }

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

function LeaveDecisionCard({ item }: { item: LeaveRequestItem }) {
  const decisionText = item.manager_comment || item.rejection_reason || "";
  const isOpen = item.status === "pending" || item.status === "partially_approved";
  const tone = item.status === "rejected" ? "blocked" : isOpen ? "current" : "complete";
  const waitingLabel = getApprovalWaitingLabel(item);

  return (
    <section className={`leave-decision-card leave-decision-card--${tone}`}>
      <div>
        <span className="detail-label">Approval status</span>
        <h3>{waitingLabel || formatStatus(item.status)}</h3>
        <p>{decisionText || (isOpen ? "The request is still moving through the configured approval route." : "No manager note was added.")}</p>
      </div>
      <span className={statusClass(item.status)}>{formatStatus(item.status)}</span>
    </section>
  );
}

function LeaveApplyModal({
  balances,
  isDemo,
  leaveRequests,
  leaveTypes,
  onClose,
  onSubmitted,
}: {
  onSubmitted: (requestId: string) => void;
  balances: LeaveBalance[];
  isDemo: boolean;
  leaveRequests: LeaveRequestItem[];
  leaveTypes: EssLeaveTypeOption[];
  onClose: () => void;
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id ?? "");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [startPortion, setStartPortion] = useState("full_day");
  const [endPortion, setEndPortion] = useState("full_day");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [evidenceReference, setEvidenceReference] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LeaveApplyField>>({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const selectedLeaveType = useMemo(
    () => leaveTypes.find((item) => item.id === leaveTypeId) ?? leaveTypes[0] ?? null,
    [leaveTypeId, leaveTypes],
  );
  const matchingBalance = useMemo(() => {
    if (!selectedLeaveType) return null;
    return balances.find((balance) => {
      const typeName = balance.leave_type.toLowerCase();
      return typeName === selectedLeaveType.name.toLowerCase() || typeName === selectedLeaveType.code.toLowerCase();
    }) ?? null;
  }, [balances, selectedLeaveType]);
  const requestEstimate = useMemo(
    () => estimateRequestedUnits(startDate, endDate, startPortion, endPortion),
    [endDate, endPortion, startDate, startPortion],
  );
  const overlappingRequest = useMemo(
    () => leaveRequests.find((request) => (
      ["approved", "pending", "partially_approved"].includes(request.status)
      && rangesOverlap(startDate, endDate, request.start_date, request.end_date)
    )) ?? null,
    [endDate, leaveRequests, startDate],
  );
  const attachmentRequired = Boolean(selectedLeaveType?.requires_attachment);
  const evidenceReady = !attachmentRequired || Boolean(selectedFile || evidenceReference.trim());
  const fileSizeLabel = selectedFile ? `${Math.max(1, Math.ceil(selectedFile.size / 1024))} KB` : null;

  function clearFieldError(field: LeaveApplyField) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submitLeave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setFeedback(null);
    setFieldErrors({});
    const formData = new FormData(form);
    const nextErrors: FieldErrors<LeaveApplyField> = {
      leave_type_id: requireValue(leaveTypeId, "Select a leave type before submitting."),
      start_date: requireValue(startDate, "Select the leave start date."),
      end_date: requireValue(endDate, "Select the leave end date.") ?? validateDateOrder(startDate, endDate, "End date must be the same as or after the start date."),
      attachment_file: validateUploadFile(selectedFile, {
        blockedTypeMessage: "This file type is not allowed for leave evidence. Upload a PDF, image, or document file.",
      }),
      attachment_reference: attachmentRequired && !selectedFile ? requireText(evidenceReference, "Upload evidence or enter an evidence reference for this leave type.") : undefined,
      reason: requireText(String(formData.get("reason") ?? ""), "Enter the reason for this leave request."),
    };
    if (hasFieldErrors(nextErrors)) {
      const message = "Review the highlighted leave fields and try again.";
      setFieldErrors(nextErrors);
      setFeedback({ tone: "error", message });
      setToast({ title: "Submission failed.", message, tone: "error" });
      submittingRef.current = false;
      return;
    }
    if (isDemo) {
      const message = "Leave requests are only available in live mode.";
      setFeedback({ tone: "error", message });
      setToast({ title: "Submission failed.", message, tone: "error" });
      submittingRef.current = false;
      return;
    }
    setSubmitting(true);
    const mutationScope = "ess.leave.submit";
    const idempotencyKey = mutationIdempotencyKey(mutationScope, {
      leave_type_id: leaveTypeId,
      start_date: startDate,
      end_date: endDate,
      start_day_portion: startPortion,
      end_day_portion: endPortion,
      reason: String(formData.get("reason") ?? ""),
      attachment_reference: evidenceReference,
      attachment: selectedFile ? [selectedFile.name, selectedFile.size, selectedFile.lastModified] : null,
    });
    let response: Response;
    try {
      response = await fetch("/api/me/leave-requests", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: formData,
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
    if (!response.ok) {
      setSubmitting(false);
      const message = getErrorMessage(payload);
      setFeedback({ tone: "error", message });
      setToast({ title: "Submission failed.", message, tone: "error" });
      submittingRef.current = false;
      return;
    }
    clearMutationIdempotencyKey(mutationScope);
    const message = "Leave request submitted. Refreshing your history.";
    setFeedback({ tone: "success", message });
    setToast({ title: "Submitted successfully.", message, tone: "success" });
    form.reset();
    // Keep the submission locked until the fresh authorized history read completes.
    onSubmitted(typeof payload.id === "string" ? payload.id : "");
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
      closeHref="/ess/leave"
      description="Choose the leave type and dates. Add evidence only when this policy asks for it."
      eyebrow="ESS leave"
      labelledBy="ess-apply-leave-modal"
      onClose={onClose}
      title="Apply leave"
    >
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
        <form className="leave-apply-layout" noValidate onSubmit={submitLeave}>
          <div className="form-grid leave-apply-form">
            <label className="form-field">
              <span className="muted">Leave type</span>
              <select aria-invalid={Boolean(fieldErrors.leave_type_id)} className="input-control" disabled={!leaveTypes.length} name="leave_type_id" onChange={(event) => { setLeaveTypeId(event.target.value); clearFieldError("leave_type_id"); }} required value={leaveTypeId}>
                {!leaveTypes.length ? <option value="">No leave types available</option> : null}
                {leaveTypes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              {fieldErrors.leave_type_id ? <span className="field-error-text" role="alert">{fieldErrors.leave_type_id}</span> : null}
            </label>
            <label className="form-field">
              <span className="muted">Start date</span>
              <input aria-invalid={Boolean(fieldErrors.start_date)} className="input-control" name="start_date" onChange={(event) => { setStartDate(event.target.value); clearFieldError("start_date"); }} required type="date" value={startDate} />
              {fieldErrors.start_date ? <span className="field-error-text" role="alert">{fieldErrors.start_date}</span> : null}
            </label>
            <label className="form-field">
              <span className="muted">End date</span>
              <input aria-invalid={Boolean(fieldErrors.end_date)} className="input-control" name="end_date" onChange={(event) => { setEndDate(event.target.value); clearFieldError("end_date"); }} required type="date" value={endDate} />
              {fieldErrors.end_date ? <span className="field-error-text" role="alert">{fieldErrors.end_date}</span> : null}
            </label>
            <label className="form-field">
              <span className="muted">Start day portion</span>
              <select className="input-control" name="start_day_portion" onChange={(event) => setStartPortion(event.target.value)} value={startPortion}>
                <option value="full_day">Full day</option>
                <option value="first_half">First half</option>
                <option value="second_half">Second half</option>
              </select>
            </label>
            <label className="form-field">
              <span className="muted">End day portion</span>
              <select className="input-control" name="end_day_portion" onChange={(event) => setEndPortion(event.target.value)} value={endPortion}>
                <option value="full_day">Full day</option>
                <option value="first_half">First half</option>
                <option value="second_half">Second half</option>
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Evidence file</span>
              <input
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                aria-invalid={Boolean(fieldErrors.attachment_file)}
                className="input-control"
                name="attachment_file"
                onChange={(event) => { setSelectedFile(event.target.files?.[0] ?? null); clearFieldError("attachment_file"); clearFieldError("attachment_reference"); }}
                type="file"
              />
              {fieldErrors.attachment_file ? <span className="field-error-text" role="alert">{fieldErrors.attachment_file}</span> : null}
            </label>
            <label className="form-field">
              <span className="muted">Evidence reference</span>
              <input
                className="input-control"
                name="attachment_reference"
                aria-invalid={Boolean(fieldErrors.attachment_reference)}
                onChange={(event) => { setEvidenceReference(event.target.value); clearFieldError("attachment_reference"); }}
                placeholder="Medical certificate, travel proof, or policy note"
                value={evidenceReference}
              />
              {fieldErrors.attachment_reference ? <span className="field-error-text" role="alert">{fieldErrors.attachment_reference}</span> : null}
            </label>
            <label className="form-field form-field--full">
              <span className="muted">Reason for leave</span>
              <textarea aria-invalid={Boolean(fieldErrors.reason)} className="input-control" name="reason" onChange={() => clearFieldError("reason")} required rows={3} />
              {fieldErrors.reason ? <span className="field-error-text" role="alert">{fieldErrors.reason}</span> : null}
            </label>
            {selectedFile ? (
              <div className="leave-file-preview form-field--full">
                <span>
                  <strong>{selectedFile.name}</strong>
                  <small>{fileSizeLabel} • Ready to upload</small>
                </span>
                <span className="queue-summary-chip">Evidence selected</span>
              </div>
            ) : null}
            {feedback ? (
              <div className={`notice ${feedback.tone === "success" ? "notice--success" : "notice--error"} form-field--full`} role={feedback.tone === "success" ? "status" : "alert"}>
                <strong>{feedback.tone === "success" ? "Submitted successfully." : "Submission failed."}</strong>
                <span className="muted">{feedback.message}</span>
              </div>
            ) : null}
            {!leaveTypes.length ? (
              <div className="notice form-field--full" role="status">
                <strong>No leave type is available.</strong>
                <span className="muted">Ask HR to assign a leave policy before submitting a request.</span>
              </div>
            ) : null}
            {attachmentRequired && !evidenceReady ? (
              <div className="notice form-field--full" role="status">
                <strong>Evidence required.</strong>
                <span className="muted">Upload a file or add a reference for this leave type.</span>
              </div>
            ) : null}
            <div className="form-actions-bar form-field--full">
              <span className="muted">After you submit, approval goes to your manager when required.</span>
              <AsyncActionButton
                className="button button--primary"
                disabled={submitting || !leaveTypes.length || !requestEstimate.valid || !evidenceReady}
                pending={submitting}
                pendingLabel="Submitting leave"
                type="submit"
              >
                Submit leave
              </AsyncActionButton>
            </div>
          </div>
          <aside className="leave-apply-summary" aria-label="Leave request summary">
            <div>
              <span className="detail-label">Request summary</span>
              <h3>{selectedLeaveType?.name ?? "Choose leave type"}</h3>
              <p>{requestEstimate.valid ? `${String(requestEstimate.calendarDays)} calendar days selected` : "Select a valid date range"}</p>
            </div>
            <div className="leave-summary-metrics">
              <DetailRow label="Available" value={matchingBalance?.closing_balance ?? "Not mapped"} />
              <DetailRow label="Balance after request" value={matchingBalance && requestEstimate.valid ? "Checked on submit" : "Pending"} />
              <DetailRow label="Calendar days" value={requestEstimate.valid ? String(requestEstimate.calendarDays) : "Pending"} />
              <DetailRow label="Evidence" value={attachmentRequired ? "Required" : "Optional"} />
            </div>
            <div className="leave-policy-helper">
              <strong>What happens next</strong>
              <span>{selectedLeaveType?.unit ? `Unit: ${selectedLeaveType.unit.replaceAll("_", " ")}.` : "Unit validation happens on submit."}</span>
              <span>{attachmentRequired ? "Evidence must be attached before submitting." : "Evidence is optional for this leave type."}</span>
              <span>{selectedLeaveType?.allow_negative_balance ? "This leave type permits negative balance; the assigned policy is checked on submit." : "Final balance check uses the mapped leave and attendance policy."}</span>
            </div>
            {!requestEstimate.valid ? (
              <div className="notice">
                <strong>Check dates.</strong>
                <span className="muted">End date must be the same as or after the start date.</span>
              </div>
            ) : null}
            {overlappingRequest ? (
              <div className="notice">
                <strong>Leave already exists in this range.</strong>
                <span className="muted">You already have {overlappingRequest.leave_type} from {formatDate(overlappingRequest.start_date)} to {formatDate(overlappingRequest.end_date)}. The server checks day portions and policy before accepting your request.</span>
              </div>
            ) : null}
            <div className="notice notice--success">
              <strong>Checked on submit</strong>
              <span className="muted">The system rechecks holidays, balance, policy limits, and approval route.</span>
            </div>
          </aside>
        </form>
    </HrAdminActionModal>
  );
}

function LeaveDetailModal({ isDemo, item, onClose, onCompleted }: { isDemo: boolean; item: LeaveRequestItem; onClose: () => void; onCompleted: () => void }) {
  return (
    <HrAdminActionModal
      className="accerio-dialog"
      explicitTabOrder
      closeHref="/ess/leave"
      description={`${formatDate(item.start_date)} to ${formatDate(item.end_date)} - ${item.requested_units} units`}
      eyebrow="Leave request detail"
      labelledBy={`ess-leave-request-${item.id}`}
      onClose={onClose}
      title={item.leave_type}
    >
        <LeaveDecisionCard item={item} />
        <section className="ess-modal-section">
          <h3 className="section-heading-soft">Timeline</h3>
          <LeaveTimeline item={item} />
        </section>
        <section className="ess-modal-section">
          <h3 className="section-heading-soft">Request details</h3>
          <div className="detail-grid">
            <DetailRow label="Request kind" value={item.request_action === "cancellation_request" ? "Cancellation awaiting approval" : "Leave application"} />
            <DetailRow label="Requested units" value={item.requested_units} />
            <DetailRow label="Approved units" value={item.approved_units} />
            <DetailRow label="Policy" value={item.policy_name || "Not mapped"} />
            <DetailRow label="Applied at" value={formatDateTime(item.applied_at)} />
            <DetailRow label="Reason" value={item.reason || "No reason provided."} />
            <DetailRow label="Attendance collision" value={item.attendance_collision_summary?.collision_count ? `${item.attendance_collision_summary.collision_count} payroll-impacting overlap` : item.attendance_collision_summary ? "No recorded collision" : "Not provided"} />
            <DetailRow label="Workflow" value={item.workflow_reference || "Not available"} />
          </div>
        </section>
        <LeaveUnitBreakdown item={item} />
        <section className="ess-modal-section">
          <h3 className="section-heading-soft">Evidence</h3>
          <LeaveEvidence item={item} />
        </section>
        <LeaveRequestLifecycleActions isDemo={isDemo} item={item} onCompleted={onCompleted} />
    </HrAdminActionModal>
  );
}

export function LeaveWorkspace({ balances, linkedDetail, currentParams, isDemo, leaveRequests, leaveTypes, state }: Props) {
  const [applyOpen, setApplyOpen] = useState(false);
  const [submissionSaved] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const id = sessionStorage.getItem("ess.leave.submitted-request");
      return Boolean(id && leaveRequests.items.some(item => item.id === id));
    } catch {
      return false;
    }
  });
  useEffect(() => {
    // Consume the verified one-shot flash; storage must not block the authoritative read.
    try { sessionStorage.removeItem("ess.leave.submitted-request"); } catch { /* Storage unavailable. */ }
  }, []);
  useEffect(() => {
    function openLinkedAction() {
      if (window.location.hash !== "#apply-leave") return;
      setApplyOpen(true);
      // Consume the launch intent so refresh does not reopen a dismissed form.
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
    }
    openLinkedAction();
    window.addEventListener("hashchange", openLinkedAction);
    return () => window.removeEventListener("hashchange", openLinkedAction);
  }, []);
  const [clickedRequest, setClickedRequest] = useState<LeaveRequestItem | null>(null);
  const [dismissedRequestId, setDismissedRequestId] = useState<string | null>(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyLeaveType, setHistoryLeaveType] = useState("all");
  const [historyPeriod, setHistoryPeriod] = useState("all");
  const status = normalizeParam(currentParams.status) ?? "all";
  const selectedRequestId = normalizeParam(currentParams.requestId);
  const page = leaveRequests.page;
  const tabs = ["all", "pending", "partially_approved", "approved", "rejected", "withdrawn", "cancelled"];
  const totalPages = Math.max(1, Math.ceil(leaveRequests.total_count / leaveRequests.page_size));
  const today = useMemo(() => parseDateOnly(new Date().toISOString().slice(0, 10)) ?? new Date(), []);
  const leaveTypeOptions = useMemo(
    () => Array.from(new Set(leaveRequests.items.map((item) => item.leave_type))).sort((left, right) => left.localeCompare(right)),
    [leaveRequests.items],
  );
  const visibleRequests = useMemo(() => {
    const normalizedQuery = historyQuery.trim().toLowerCase();
    return leaveRequests.items.filter((item) => {
      const matchesQuery = !normalizedQuery || [
        item.leave_type,
        item.leave_type_code,
        item.policy_name ?? "",
        item.status,
        item.reason,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesType = historyLeaveType === "all" || item.leave_type === historyLeaveType;
      const itemPeriod = getRequestPeriod(item, today);
      const matchesPeriod = historyPeriod === "all" || historyPeriod === itemPeriod || (historyPeriod === "this_year" && isRequestInYear(item, today.getUTCFullYear()));
      return matchesQuery && matchesType && matchesPeriod;
    });
  }, [historyLeaveType, historyPeriod, historyQuery, leaveRequests.items, today]);
  const filtersActive = Boolean(historyQuery.trim() || historyLeaveType !== "all" || historyPeriod !== "all");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedDay, setSelectedDay] = useState("");
  const [calendarVisible, setCalendarVisible] = useState(false);
  const monthStart = new Date(`${calendarMonth}-01T00:00:00Z`);
  const calendarDays = Number.isNaN(monthStart.getTime()) ? [] : Array.from({ length: new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate() }, (_, index) => {
    const date = `${calendarMonth}-${String(index + 1).padStart(2, "0")}`;
    const matches = visibleRequests.filter(item => item.start_date <= date && item.end_date >= date);
    return { date, number: index + 1, label: `${date}: ${matches.length} loaded request${matches.length === 1 ? "" : "s"}`,
      status: matches.length ? `${matches.length} request${matches.length === 1 ? "" : "s"}` : "No loaded requests",
      shortStatus: matches.length ? String(matches.length) : "—", finalized: false, selected: selectedDay === date, href: `#leave-day-details` };
  });
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const linkedRequest = selectedRequestId && selectedRequestId !== dismissedRequestId
    ? linkedDetail ?? leaveRequests.items.find((item) => item.id === selectedRequestId) ?? null
    : null;
  const selectedRequest = clickedRequest ?? linkedRequest;
  const modal = hydrated
    ? (
        <>
          {applyOpen ? createPortal(
            <LeaveApplyModal
              onSubmitted={(requestId) => {
                try {
                  if (requestId) sessionStorage.setItem("ess.leave.submitted-request", requestId);
                } catch {
                  // The saved request still appears in the fresh history if storage is unavailable.
                }
                const destination = new URL(window.location.href);
                destination.searchParams.set("status", "all");
                destination.searchParams.set("page", "1");
                destination.searchParams.delete("requestId");
                destination.hash = "";
                window.location.replace(destination.href);
              }}
              balances={balances}
              isDemo={isDemo}
              leaveRequests={leaveRequests.items}
              leaveTypes={leaveTypes}
              onClose={() => setApplyOpen(false)}
            />,
            document.body,
          ) : null}
          {selectedRequest ? createPortal(
            <LeaveDetailModal
              isDemo={isDemo}
              item={selectedRequest}
              onCompleted={() => {
                // Reconcile history and entitlement balances from one fresh SSR read.
                // A completed POST must not depend on a dropped client refresh transition.
                const destination = new URL(window.location.href);
                destination.searchParams.delete("requestId");
                window.location.replace(`${destination.pathname}${destination.search}${destination.hash}`);
              }}
              onClose={() => {
                setDismissedRequestId(selectedRequest.id);
                setClickedRequest(null);
              }}
            />,
            document.body,
          ) : null}
        </>
      )
    : null;

  return (
    <main className="shell shell--workspace ess-experience-shell ess-compact">
      <WorkspaceStandardHeader eyebrow={`${state === "live" ? "Employee" : "Demo"} / Time off`} title="Leave"
        description="Plan time away, check entitlements and follow your requests."
        actions={<><button className="button button--primary" onClick={(event) => { event.currentTarget.focus(); setApplyOpen(true); }} type="button">Apply leave</button><Link prefetch={false} className="button button--secondary" href="/ess">Overview</Link></>} />
      {hydrated && submissionSaved ? <div className="notice notice--success" role="status">Leave request submitted. Review its status in your history.</div> : null}
      <WorkspaceStandardPanel title="Your entitlements" description="Current policy balances. Contact HR for leave-year dates, expiry and applicable holidays.">
        <div className="workspace-summary-grid" aria-label="Leave balance cards">
          {balances.map((balance, index) => <article className="workspace-standard-panel workspace-summary-card" key={`${balance.leave_type}-${index}`}>
            <h3>{balance.leave_type}</h3><strong>{getPrimaryBalanceLabel(balance)}</strong><p>{balance.policy_name || "Policy not provided"}</p>
            <WorkspaceInformation fields={[["Used", balance.consumed_amount], ["Reserved", balance.reserved_amount]]} />
          </article>)}
          {!balances.length ? <p role="status">No leave balance is assigned yet. Ask HR to review your leave policies.</p> : null}
        </div>
      </WorkspaceStandardPanel>
      <WorkspaceStandardPanel title="My leave requests" description="Status totals cover all requests. Filters and calendar apply to this page.">
        <div>
          <div className="workspace-status-tabs">
            {tabs.map((tab) => (
              <a data-navigation-mode="document" aria-current={status === tab ? "page" : undefined} className={`workspace-status-tab ${status === tab ? "workspace-status-tab--active" : ""}`} href={buildHref(currentParams, { status: tab, page: "1" })} key={tab}>
                <span>{tab.replace("_", " ")}</span>
                <strong>{leaveRequests.status_counts[tab as keyof typeof leaveRequests.status_counts] ?? 0}</strong>
              </a>
            ))}
          </div>
          <div className="workspace-filter-disclosure">
            <div className="queue-toolbar__header">
              <span className="queue-summary-chip"><strong>{visibleRequests.length}</strong> shown</span>
            </div>
            <WorkspaceFilterBar>
              <label className="form-field">
                <span>Search this page</span>
                <input
                  className="input-control"
                  disabled={!hydrated}
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  placeholder="Type, policy, status, or reason"
                  value={historyQuery}
                />
              </label>
              <label className="form-field">
                <span>Type</span>
                <select disabled={!hydrated} className="input-control" onChange={(event) => setHistoryLeaveType(event.target.value)} value={historyLeaveType}>
                  <option value="all">All types</option>
                  {leaveTypeOptions.map((leaveType) => (
                    <option key={leaveType} value={leaveType}>{leaveType}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Dates on this page</span>
                <select disabled={!hydrated} className="input-control" onChange={(event) => setHistoryPeriod(event.target.value)} value={historyPeriod}>
                  <option value="all">All periods</option>
                  <option value="upcoming">Upcoming (UTC)</option>
                  <option value="past">Past (UTC)</option>
                  <option value="current">In progress (UTC)</option>
                  <option value="this_year">Calendar year (UTC)</option>
                </select>
              </label>
              <button
                className="button button--secondary"
                disabled={!filtersActive}
                onClick={() => {
                  setHistoryQuery("");
                  setHistoryLeaveType("all");
                  setHistoryPeriod("all");
                }}
                type="button"
              >
                Clear filters
              </button>
            </WorkspaceFilterBar>
          </div>
          <button className="button button--secondary" type="button" aria-expanded={calendarVisible} onClick={() => setCalendarVisible(!calendarVisible)}>{calendarVisible ? "Hide calendar" : "Show calendar"}</button>
          {calendarVisible ? <>
            <label className="form-field"><span>Calendar month</span><input className="input-control" type="month" value={calendarMonth} onChange={event => { if (/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) { setCalendarMonth(event.target.value); setSelectedDay(""); } }} /></label>
            <WorkspaceCalendar label="Leave request calendar" statusKey="Numbers count requests on this page, including withdrawn or cancelled requests. — No loaded request. Dates do not indicate chargeable units or holiday entitlement."
              offset={(monthStart.getUTCDay() + 6) % 7} days={calendarDays} onSelect={(event, date) => { if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); setSelectedDay(date); }} />
            <section id="leave-day-details" aria-label="Selected leave day" aria-live="polite"><h3>{selectedDay ? formatDate(selectedDay) : "Select a day"}</h3>
              {selectedDay ? visibleRequests.filter(item => item.start_date <= selectedDay && item.end_date >= selectedDay).map(item => <p key={item.id}><button className="button button--secondary" onClick={() => setClickedRequest(item)} type="button">{item.leave_type} · {formatStatus(item.status)}</button></p>) : null}
              {selectedDay && !visibleRequests.some(item => item.start_date <= selectedDay && item.end_date >= selectedDay) ? <p>No requests on this loaded page for this date.</p> : null}
            </section>
          </> : null}
          <div className="employee-directory-table-wrap" role="region" aria-label="Scrollable leave history" tabIndex={0}>
            <table className="workspace-table attendance-directory-table leave-request-table" aria-label="Leave request history">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Leave type</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Approver</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleRequests.length ? (
                  visibleRequests.map((request) => {
                    const waitingLabel = getApprovalWaitingLabel(request);
                    return (
                      <tr key={request.id}>
                        <td>
                          <div className="workspace-table__primary-cell">
                            <strong>{formatDate(request.start_date)}</strong>
                            <span>{formatDate(request.end_date)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="workspace-table__primary-cell">
                            <strong>{request.leave_type}</strong>
                            {request.request_action === "cancellation_request" ? <span>Cancellation awaiting approval</span> : null}
                            <span>{request.policy_name || "Policy pending"}</span>
                          </div>
                        </td>
                        <td>{request.requested_units} units</td>
                        <td><WorkspaceStatusBadge tone={statusTone(request.status)}>{formatStatus(request.status)}</WorkspaceStatusBadge></td>
                        <td>
                          <div className="workspace-table__primary-cell">
                            <strong>{getRequestOwnerLabel(request)}</strong>
                            <span>{waitingLabel || request.reason || "Decision history available"}</span>
                          </div>
                        </td>
                        <td>
                          <button
                            aria-label={`View ${request.leave_type} from ${request.start_date}`}
                            className="button button--secondary"
                            onClick={() => {
                              setDismissedRequestId(null);
                              setClickedRequest(request);
                            }}
                            type="button"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <div className="notice workspace-empty-state">
                        <strong>{leaveRequests.items.length ? "No requests match these filters." : "No leave requests in this view."}</strong>
                        <span className="muted">{leaveRequests.items.length ? "Clear filters or try another status tab." : "Try another status tab once more data is available."}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <PaginationBar
          navigationMode="document"
          firstHref={buildHref(currentParams, { page: "1" })}
          hasNext={leaveRequests.has_next}
          hasPrevious={leaveRequests.has_previous}
          lastHref={buildHref(currentParams, { page: String(totalPages) })}
          nextHref={buildHref(currentParams, { page: String(page + 1) })}
          page={leaveRequests.page}
          pageSize={leaveRequests.page_size}
          previousHref={buildHref(currentParams, { page: String(Math.max(1, page - 1)) })}
          totalCount={leaveRequests.total_count}
        />
      </WorkspaceStandardPanel>

      {modal}
    </main>
  );
}
