"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

import { LeaveRequestLifecycleActions } from "@/app/ess/leave-request-lifecycle-actions";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { PageIntro } from "@/components/patterns/page-intro";
import type { EssLeaveRequestListResponse, EssLeaveTypeOption, LeaveBalance, LeaveRequestItem } from "@/lib/types";

type SearchParamValue = string | string[] | undefined;

type Props = {
  balances: LeaveBalance[];
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

function formatDate(value: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function statusClass(status: string) {
  return `status status--${status}`;
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
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
  return queryString ? `/ess/leave?${queryString}` : "/ess/leave";
}

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to submit leave request.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to submit leave request.");
}

function parseNumeric(value: string | null | undefined) {
  const parsed = Number(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatUnits(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function parseDateOnly(value: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetweenInclusive(startDate: Date, endDate: Date) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((endDate.getTime() - startDate.getTime()) / dayMs) + 1;
}

function countWeekendDays(startDate: Date, endDate: Date) {
  const dayMs = 24 * 60 * 60 * 1000;
  let count = 0;
  for (let cursor = startDate.getTime(); cursor <= endDate.getTime(); cursor += dayMs) {
    const day = new Date(cursor).getDay();
    if (day === 0 || day === 6) count += 1;
  }
  return count;
}

function estimateRequestedUnits(startDateValue: string, endDateValue: string, startPortion: string, endPortion: string) {
  const startDate = parseDateOnly(startDateValue);
  const endDate = parseDateOnly(endDateValue);
  if (!startDate || !endDate || endDate < startDate) {
    return { days: 0, weekendDays: 0, valid: false };
  }

  const calendarDays = daysBetweenInclusive(startDate, endDate);
  const weekendDays = countWeekendDays(startDate, endDate);
  let days = calendarDays;

  if (calendarDays === 1) {
    if (startPortion === "full_day" && endPortion === "full_day") days = 1;
    else if (startPortion !== "full_day" && endPortion !== "full_day" && startPortion !== endPortion) days = 1;
    else days = 0.5;
  } else {
    if (startPortion !== "full_day") days -= 0.5;
    if (endPortion !== "full_day") days -= 0.5;
  }

  return { days: Math.max(0.5, days), weekendDays, valid: true };
}

function rangesOverlap(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  const startA = parseDateOnly(leftStart);
  const endA = parseDateOnly(leftEnd);
  const startB = parseDateOnly(rightStart);
  const endB = parseDateOnly(rightEnd);
  if (!startA || !endA || !startB || !endB) return false;
  return startA <= endB && startB <= endA;
}

function getRequestTimestamp(item: LeaveRequestItem) {
  const value = item.updated_at ?? item.approved_at ?? item.applied_at ?? item.created_at ?? item.start_date;
  return new Date(value).getTime();
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
  return startDate.getFullYear() === year || endDate.getFullYear() === year;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
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
  const timeline = [
    {
      label: "Submitted",
      detail: item.reason || "Request sent to the configured approval route.",
      when: item.applied_at,
      state: "complete",
    },
    {
      label: hasDecision ? "Manager decision" : "Awaiting decision",
      detail: hasDecision
        ? (item.manager_comment || item.rejection_reason || `Request ${formatStatus(item.status)}.`)
        : "Your manager or configured approver still needs to review this request.",
      when: item.approved_at ?? (isRejected ? item.updated_at : null),
      state: hasDecision ? (isRejected ? "blocked" : "complete") : "current",
    },
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
  const isOpen = item.status === "pending";
  const tone = item.status === "rejected" ? "blocked" : isOpen ? "current" : "complete";

  return (
    <section className={`leave-decision-card leave-decision-card--${tone}`}>
      <div>
        <span className="detail-label">Manager decision</span>
        <h3>{isOpen ? "Waiting for review" : formatStatus(item.status)}</h3>
        <p>{decisionText || (isOpen ? "No decision has been recorded yet." : "No manager note was added.")}</p>
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
}: {
  balances: LeaveBalance[];
  isDemo: boolean;
  leaveRequests: LeaveRequestItem[];
  leaveTypes: EssLeaveTypeOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  useEscapeClose(onClose);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id ?? "");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [startPortion, setStartPortion] = useState("full_day");
  const [endPortion, setEndPortion] = useState("full_day");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [evidenceReference, setEvidenceReference] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
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
  const balanceAvailable = parseNumeric(matchingBalance?.closing_balance);
  const balanceAfter = selectedLeaveType?.allow_negative_balance ? balanceAvailable - requestEstimate.days : Math.max(0, balanceAvailable - requestEstimate.days);
  const hasBalanceRisk = Boolean(selectedLeaveType && !selectedLeaveType.allow_negative_balance && requestEstimate.valid && requestEstimate.days > balanceAvailable);
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

  async function submitLeave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setFeedback(null);
    if (isDemo) {
      setFeedback({ tone: "error", message: "Leave requests are only available in live mode." });
      submittingRef.current = false;
      return;
    }
    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    let response: Response;
    try {
      response = await fetch("/api/me/leave-requests", {
        method: "POST",
        body: formData,
      });
    } catch {
      setFeedback({ tone: "error", message: "Unable to reach the server. Check your connection and try again." });
      setSubmitting(false);
      submittingRef.current = false;
      return;
    }
    const payload = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) {
      setFeedback({ tone: "error", message: getErrorMessage(payload) });
      submittingRef.current = false;
      return;
    }
    setFeedback({ tone: "success", message: "Leave request submitted." });
    event.currentTarget.reset();
    router.refresh();
    window.setTimeout(onClose, 650);
  }

  return (
    <div className="modal-shell" role="presentation">
      <div aria-label="Apply leave" aria-modal="true" className="modal ess-leave-modal" role="dialog">
        <div className="modal__header">
          <div>
            <h2>Apply leave</h2>
            <p>Choose the leave type and dates. Add evidence only when this policy asks for it.</p>
          </div>
          <button aria-label="Close apply leave dialog" className="button button--secondary" onClick={onClose} type="button">Close</button>
        </div>
        <form className="leave-apply-layout" onSubmit={submitLeave}>
          <div className="form-grid leave-apply-form">
            <label className="form-field">
              <span className="muted">Leave type</span>
              <select className="input-control" disabled={!leaveTypes.length} name="leave_type_id" onChange={(event) => setLeaveTypeId(event.target.value)} required value={leaveTypeId}>
                {!leaveTypes.length ? <option value="">No leave types available</option> : null}
                {leaveTypes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Start date</span>
              <input className="input-control" name="start_date" onChange={(event) => setStartDate(event.target.value)} required type="date" value={startDate} />
            </label>
            <label className="form-field">
              <span className="muted">End date</span>
              <input className="input-control" name="end_date" onChange={(event) => setEndDate(event.target.value)} required type="date" value={endDate} />
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
                className="input-control"
                name="attachment_file"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
            <label className="form-field">
              <span className="muted">Evidence reference</span>
              <input
                className="input-control"
                name="attachment_reference"
                onChange={(event) => setEvidenceReference(event.target.value)}
                placeholder="Medical certificate, travel proof, or policy note"
                value={evidenceReference}
              />
            </label>
            <label className="form-field form-field--full">
              <span className="muted">Reason for leave</span>
              <textarea className="input-control" name="reason" required rows={3} />
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
              <div className={`notice ${feedback.tone === "success" ? "notice--success" : ""} form-field--full`} role="status">
                <strong>{feedback.tone === "success" ? "Submitted." : "Submission failed."}</strong>
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
              <button className="button button--primary" disabled={submitting || !leaveTypes.length || !requestEstimate.valid || !evidenceReady} type="submit">
                {submitting ? "Submitting..." : "Submit leave"}
              </button>
            </div>
          </div>
          <aside className="leave-apply-summary" aria-label="Leave request summary">
            <div>
              <span className="detail-label">Request summary</span>
              <h3>{selectedLeaveType?.name ?? "Choose leave type"}</h3>
              <p>{requestEstimate.valid ? `${formatUnits(requestEstimate.days)} estimated leave units` : "Select a valid date range"}</p>
            </div>
            <div className="leave-summary-metrics">
              <DetailRow label="Available" value={matchingBalance ? formatUnits(balanceAvailable) : "Not mapped"} />
              <DetailRow label="Balance after request" value={matchingBalance && requestEstimate.valid ? formatUnits(balanceAfter) : "Pending"} />
              <DetailRow label="Weekend days" value={requestEstimate.valid ? String(requestEstimate.weekendDays) : "Pending"} />
              <DetailRow label="Evidence" value={attachmentRequired ? "Required" : "Optional"} />
            </div>
            <div className="leave-policy-helper">
              <strong>What happens next</strong>
              <span>{selectedLeaveType?.unit ? `Unit: ${selectedLeaveType.unit.replaceAll("_", " ")}.` : "Unit validation happens on submit."}</span>
              <span>{attachmentRequired ? "Evidence must be attached before submitting." : "Evidence is optional for this leave type."}</span>
              <span>{selectedLeaveType?.allow_negative_balance ? "This leave type can be requested even without available balance." : "The request should stay within available balance."}</span>
            </div>
            {!requestEstimate.valid ? (
              <div className="notice">
                <strong>Check dates.</strong>
                <span className="muted">End date must be the same as or after the start date.</span>
              </div>
            ) : null}
            {hasBalanceRisk ? (
              <div className="notice">
                <strong>Balance may be low.</strong>
                <span className="muted">The request is above the current balance and may be blocked or rejected.</span>
              </div>
            ) : null}
            {overlappingRequest ? (
              <div className="notice">
                <strong>Possible overlap.</strong>
                <span className="muted">You already have {overlappingRequest.leave_type} from {formatDate(overlappingRequest.start_date)} to {formatDate(overlappingRequest.end_date)}.</span>
              </div>
            ) : null}
            <div className="notice notice--success">
              <strong>Checked on submit</strong>
              <span className="muted">The system rechecks holidays, balance, policy limits, and approval route.</span>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

function LeaveDetailModal({ isDemo, item, onClose }: { isDemo: boolean; item: LeaveRequestItem; onClose: () => void }) {
  useEscapeClose(onClose);

  return (
    <div className="modal-shell" role="presentation">
      <div aria-label="Leave request detail" aria-modal="true" className="modal ess-leave-modal ess-leave-modal--wide" role="dialog">
        <div className="modal__header">
          <div>
            <h2>{item.leave_type}</h2>
            <p>{formatDate(item.start_date)} to {formatDate(item.end_date)} • {item.requested_units} units</p>
          </div>
          <button aria-label="Close leave request detail" className="button button--secondary" onClick={onClose} type="button">Close</button>
        </div>
        <LeaveDecisionCard item={item} />
        <section className="ess-modal-section">
          <h3 className="section-heading-soft">Timeline</h3>
          <LeaveTimeline item={item} />
        </section>
        <section className="ess-modal-section">
          <h3 className="section-heading-soft">Request details</h3>
          <div className="detail-grid">
            <DetailRow label="Requested units" value={item.requested_units} />
            <DetailRow label="Approved units" value={item.approved_units} />
            <DetailRow label="Policy" value={item.policy_name || "Not mapped"} />
            <DetailRow label="Applied at" value={formatDateTime(item.applied_at)} />
            <DetailRow label="Reason" value={item.reason || "No reason provided."} />
            <DetailRow label="Workflow" value={item.workflow_reference || "Not available"} />
          </div>
        </section>
        <section className="ess-modal-section">
          <h3 className="section-heading-soft">Evidence</h3>
          <LeaveEvidence item={item} />
        </section>
        <LeaveRequestLifecycleActions isDemo={isDemo} item={item} />
      </div>
    </div>
  );
}

export function LeaveWorkspace({ balances, currentParams, isDemo, leaveRequests, leaveTypes, state }: Props) {
  const [applyOpen, setApplyOpen] = useState(false);
  const [clickedRequest, setClickedRequest] = useState<LeaveRequestItem | null>(null);
  const [dismissedRequestId, setDismissedRequestId] = useState<string | null>(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyLeaveType, setHistoryLeaveType] = useState("all");
  const [historyPeriod, setHistoryPeriod] = useState("all");
  const status = normalizeParam(currentParams.status) ?? "all";
  const selectedRequestId = normalizeParam(currentParams.requestId);
  const page = Math.max(Number(normalizeParam(currentParams.page) || String(leaveRequests.page)) || leaveRequests.page, 1);
  const tabs = ["all", "pending", "approved", "rejected", "withdrawn", "cancelled"];
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
      const matchesPeriod = historyPeriod === "all" || historyPeriod === itemPeriod || (historyPeriod === "this_year" && isRequestInYear(item, today.getFullYear()));
      return matchesQuery && matchesType && matchesPeriod;
    });
  }, [historyLeaveType, historyPeriod, historyQuery, leaveRequests.items, today]);
  const upcomingRequest = useMemo(
    () => leaveRequests.items
      .filter((item) => ["approved", "partially_approved", "pending"].includes(item.status))
      .filter((item) => {
        const startDate = parseDateOnly(item.start_date);
        return Boolean(startDate && startDate >= today);
      })
      .sort((left, right) => left.start_date.localeCompare(right.start_date))[0] ?? null,
    [leaveRequests.items, today],
  );
  const recentDecision = useMemo(
    () => leaveRequests.items
      .filter((item) => item.status !== "pending")
      .sort((left, right) => getRequestTimestamp(right) - getRequestTimestamp(left))[0] ?? null,
    [leaveRequests.items],
  );
  const attachmentCount = leaveRequests.items.reduce((total, item) => total + (item.attachments?.length ?? 0) + (item.attachment_reference ? 1 : 0), 0);
  const pendingCount = leaveRequests.status_counts.pending ?? 0;
  const filtersActive = Boolean(historyQuery.trim() || historyLeaveType !== "all" || historyPeriod !== "all");
  const linkedRequest = selectedRequestId && selectedRequestId !== dismissedRequestId
    ? leaveRequests.items.find((item) => item.id === selectedRequestId) ?? null
    : null;
  const selectedRequest = clickedRequest ?? linkedRequest;
  const modal = typeof document !== "undefined"
    ? (
        <>
          {applyOpen ? createPortal(
            <LeaveApplyModal
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
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={state === "live" ? "Live ESS" : "Demo ESS"}
        title="Leave"
        description="Review balances and track leave requests. Use focused dialogs for apply, evidence, and lifecycle actions."
        actions={
          <>
            <button className="button button--primary" onClick={() => setApplyOpen(true)} type="button">Apply leave</button>
            <Link className="button button--secondary" href="/ess">Overview</Link>
          </>
        }
        pills={["Single responsibility", `${leaveRequests.status_counts.pending ?? 0} pending`, `${balances.length} balances`]}
        showPills
      />

      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-heading-soft">Balances</h2>
            <p className="section-copy section-copy-soft">Available, used, and reserved balances from mapped leave policies.</p>
          </div>
        </div>
        <div className="workspace-grid-modern balance-grid">
          {balances.length ? (
            balances.map((balance) => (
              <article className="workspace-card workspace-card--compact" key={balance.leave_type}>
                <h3>{balance.leave_type}</h3>
                <p className="muted">{balance.policy_name}</p>
                <div className="tableish__meta">
                  <span>Available: {balance.closing_balance}</span>
                  <span>Used: {balance.consumed_amount}</span>
                  <span>Reserved: {balance.reserved_amount}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="notice">
              <strong>No leave balance is assigned yet.</strong>
              <span className="muted">Ask HR to assign the right leave policies for your role.</span>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="leave-history-snapshot" aria-label="Leave history snapshot">
          <article className="leave-history-card">
            <span className="detail-label">Upcoming leave</span>
            <strong>{upcomingRequest ? formatDate(upcomingRequest.start_date) : "None planned"}</strong>
            <small>{upcomingRequest ? `${upcomingRequest.leave_type} • ${formatStatus(upcomingRequest.status)}` : "Approved or pending future leave appears here."}</small>
          </article>
          <article className="leave-history-card">
            <span className="detail-label">Waiting for review</span>
            <strong>{pendingCount}</strong>
            <small>{pendingCount === 1 ? "Request needs manager action." : "Requests need manager action."}</small>
          </article>
          <article className="leave-history-card">
            <span className="detail-label">Recent decision</span>
            <strong>{recentDecision ? formatStatus(recentDecision.status) : "No decision yet"}</strong>
            <small>{recentDecision ? `${recentDecision.leave_type} • ${formatDateTime(recentDecision.updated_at ?? recentDecision.approved_at ?? recentDecision.applied_at)}` : "Manager decisions will appear after approval."}</small>
          </article>
          <article className="leave-history-card">
            <span className="detail-label">Evidence files</span>
            <strong>{attachmentCount}</strong>
            <small>Files or references attached in this loaded view.</small>
          </article>
        </div>
        <article className="record-card panel-card-soft">
          <div className="section-header">
            <div>
              <h2 className="section-heading-soft">Leave requests</h2>
              <p className="section-copy section-copy-soft">Track submitted requests and open details only when needed.</p>
            </div>
            <button className="button button--secondary" onClick={() => setApplyOpen(true)} type="button">New request</button>
          </div>
          <div className="toolbar">
            <div className="tabbar">
              {tabs.map((tab) => (
                <Link className={`tab ${status === tab ? "tab--active" : ""}`} href={buildHref(currentParams, { status: tab, page: "1" })} key={tab}>
                  <span>{tab.replace("_", " ")}</span>
                  <span>{leaveRequests.status_counts[tab as keyof typeof leaveRequests.status_counts] ?? 0}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="leave-history-toolbar">
            <div>
              <span className="detail-label">Refine current view</span>
              <p className="section-copy section-copy-soft">Use filters for the loaded records. Status tabs and pagination still control the full history.</p>
            </div>
            <span className="queue-summary-chip">{visibleRequests.length} shown</span>
          </div>
          <div className="leave-history-filters">
            <label className="form-field">
              <span className="muted">Search leave history</span>
              <input
                className="input-control"
                onChange={(event) => setHistoryQuery(event.target.value)}
                placeholder="Type, policy, status, or reason"
                value={historyQuery}
              />
            </label>
            <label className="form-field">
              <span className="muted">Type filter</span>
              <select className="input-control" onChange={(event) => setHistoryLeaveType(event.target.value)} value={historyLeaveType}>
                <option value="all">All types</option>
                {leaveTypeOptions.map((leaveType) => (
                  <option key={leaveType} value={leaveType}>{leaveType}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Period filter</span>
              <select className="input-control" onChange={(event) => setHistoryPeriod(event.target.value)} value={historyPeriod}>
                <option value="all">All periods</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
                <option value="this_year">This year</option>
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
          </div>
          <div className="leave-request-grid">
            {visibleRequests.length ? (
              visibleRequests.map((request) => (
                <button
                  className="leave-request-card"
                  key={request.id}
                  onClick={() => {
                    setDismissedRequestId(null);
                    setClickedRequest(request);
                  }}
                  type="button"
                >
                  <span className="leave-request-card__main">
                    <strong>{request.leave_type}</strong>
                    <small>{formatDate(request.start_date)} to {formatDate(request.end_date)} • {request.requested_units} units</small>
                    <span className="muted">{request.reason || "No reason provided."}</span>
                  </span>
                  <span className="leave-request-card__side">
                    <span className={statusClass(request.status)}>{formatStatus(request.status)}</span>
                    <span className="queue-summary-chip">{request.attachments?.length ?? 0} files</span>
                  </span>
                </button>
              ))
            ) : (
              <div className="notice">
                <strong>{leaveRequests.items.length ? "No requests match these filters." : "No leave requests in this view."}</strong>
                <span className="muted">{leaveRequests.items.length ? "Clear filters or try another status tab." : "Try another status tab once more data is available."}</span>
              </div>
            )}
          </div>
        </article>
        <PaginationBar
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
      </section>

      {modal}
    </main>
  );
}
