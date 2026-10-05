"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

import { PaginationBar } from "@/components/patterns/pagination-bar";
import { PageIntro } from "@/components/patterns/page-intro";
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
  const message = item.manager_comment || item.rejection_reason || (isOpen ? "Waiting for manager review." : "No manager note was added.");

  return (
    <section className={`attendance-decision-card attendance-decision-card--${tone}`}>
      <div>
        <span className="detail-label">Manager decision</span>
        <h3>{isOpen ? "Waiting for review" : formatStatus(item.status)}</h3>
        <p>{message}</p>
      </div>
      <span className={statusClass(item.status)}>{formatStatus(item.status)}</span>
    </section>
  );
}

function AttendanceTimeline({ item }: { item: AttendanceRegularizationItem }) {
  const hasDecision = Boolean(item.resolved_at || item.manager_comment || item.rejection_reason || item.status !== "pending");
  const timeline = [
    {
      label: "Submitted",
      detail: item.reason || "Regularization sent for manager review.",
      when: item.applied_at ?? item.created_at,
      state: "complete",
    },
    {
      label: hasDecision ? "Manager decision" : "Awaiting decision",
      detail: hasDecision ? (item.manager_comment || item.rejection_reason || `Request ${formatStatus(item.status)}.`) : "Your manager still needs to review this correction.",
      when: item.resolved_at ?? null,
      state: hasDecision ? (item.status === "rejected" ? "blocked" : "complete") : "current",
    },
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
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const selectedRecord = attendanceRecords.find((record) => record.id === selectedRecordId) ?? null;
  const hasTimeOrderRisk = Boolean(checkIn && checkOut && new Date(checkOut) < new Date(checkIn));
  const canSubmit = Boolean(selectedRecord && !selectedRecord.is_locked && !hasTimeOrderRisk && reason.trim());

  async function submitRegularization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setFeedback(null);
    if (!canSubmit) {
      setFeedback({
        tone: "error",
        message: selectedRecord?.is_locked
          ? "This attendance record is locked. Contact HR before payroll close."
          : hasTimeOrderRisk
            ? "Requested check-out cannot be earlier than requested check-in."
            : "Add a clear reason before submitting the correction.",
      });
      submittingRef.current = false;
      return;
    }
    if (isDemo) {
      setFeedback({ tone: "error", message: "Attendance regularizations are only available in live mode." });
      submittingRef.current = false;
      return;
    }
    const formData = new FormData(event.currentTarget);
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
    setFeedback({ tone: "success", message: "Attendance regularization submitted." });
    event.currentTarget.reset();
    router.refresh();
    window.setTimeout(onClose, 650);
  }

  return (
    <div className="modal-shell" role="presentation">
      <div aria-label="Regularize attendance" aria-modal="true" className="modal ess-attendance-modal" role="dialog">
        <div className="modal__header">
          <div>
            <h2>Regularize attendance</h2>
            <p>Choose the day that needs correction, explain what changed, and send it for approval.</p>
          </div>
          <button aria-label="Close regularize attendance dialog" className="button button--secondary" onClick={onClose} type="button">Close</button>
        </div>
        <form className="attendance-regularize-layout" onSubmit={submitRegularization}>
          <div className="form-grid attendance-regularize-form">
            <label className="form-field form-field--full">
              <span className="muted">Attendance record</span>
              <select className="input-control" name="attendance_record_id" onChange={(event) => setSelectedRecordId(event.target.value)} required value={selectedRecordId}>
                {!attendanceRecords.length ? <option value="">No days available for correction</option> : null}
                {attendanceRecords.map((record) => (
                  <option disabled={record.is_locked} key={record.id} value={record.id}>{formatRecordLabel(record)}</option>
                ))}
              </select>
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
              <input className="input-control" name="requested_check_in_at" onChange={(event) => setCheckIn(event.target.value)} type="datetime-local" value={checkIn} />
            </label>
            <label className="form-field">
              <span className="muted">Requested check-out</span>
              <input className="input-control" name="requested_check_out_at" onChange={(event) => setCheckOut(event.target.value)} type="datetime-local" value={checkOut} />
            </label>
            <label className="form-field form-field--full">
              <span className="muted">Reason</span>
              <textarea className="input-control" name="reason" onChange={(event) => setReason(event.target.value)} required rows={3} value={reason} />
            </label>
            {feedback ? (
              <div className={`notice ${feedback.tone === "success" ? "notice--success" : ""} form-field--full`} role="status">
                <strong>{feedback.tone === "success" ? "Submitted." : "Submission failed."}</strong>
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
              <button className="button button--primary" disabled={submitting || !canSubmit} type="submit">
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
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={state === "live" ? "Live ESS" : "Demo ESS"}
        title="Attendance"
        description="Review today, submit corrections in a focused dialog, and track manager decisions."
        actions={
          <>
            <button className="button button--primary" onClick={() => setRegularizeOpen(true)} type="button">Regularize attendance</button>
            <Link className="button button--secondary" href="/ess">Overview</Link>
          </>
        }
        pills={["Single responsibility", formatStatus(dashboard.attendance.today.status), `${dashboard.attendance.pending_regularizations_count} pending`]}
        showPills
      />

      <section className="section attendance-summary-grid">
        <article className="record-card panel-card-soft ess-today-card">
          <div className="section-header">
            <div>
              <h2 className="section-heading-soft">Today</h2>
              <p className="section-copy section-copy-soft">Current attendance state for the day.</p>
            </div>
            <span className={statusClass(dashboard.attendance.today.status)}>{formatStatus(dashboard.attendance.today.status)}</span>
          </div>
          <div className="detail-grid">
            <DetailRow label="Date" value={formatDate(dashboard.attendance.today.date)} />
            <DetailRow label="Shift" value={dashboard.attendance.today.shift || "Not assigned"} />
            <DetailRow label="Check-in" value={formatDateTime(dashboard.attendance.today.check_in_at)} />
            <DetailRow label="Check-out" value={formatDateTime(dashboard.attendance.today.check_out_at)} />
          </div>
        </article>
        <article className="record-card panel-card-soft ess-today-card">
          <div className="section-header">
            <div>
              <h2 className="section-heading-soft">Monthly summary</h2>
              <p className="section-copy section-copy-soft">Attendance progress for the active month.</p>
            </div>
          </div>
          <div className="attendance-metric-grid">
            <DetailRow label="Present" value={String(dashboard.attendance.month_to_date.present_days)} />
            <DetailRow label="Absent" value={String(dashboard.attendance.month_to_date.absent_days)} />
            <DetailRow label="Late" value={String(dashboard.attendance.month_to_date.late_days)} />
            <DetailRow label="Hours" value={String(dashboard.attendance.month_to_date.work_duration_hours)} />
          </div>
        </article>
        <article className="record-card panel-card-soft ess-today-card">
          <div className="section-header">
            <div>
              <h2 className="section-heading-soft">Correction queue</h2>
              <p className="section-copy section-copy-soft">What needs attention before attendance is payroll-safe.</p>
            </div>
          </div>
          <div className="attendance-action-panel">
            <div>
              <span className="detail-label">Pending fixes</span>
              <strong>{dashboard.attendance.pending_regularizations_count}</strong>
              <small>Open manager decisions or employee corrections.</small>
            </div>
            <button className="button button--primary" onClick={() => setRegularizeOpen(true)} type="button">New correction</button>
          </div>
        </article>
      </section>

      <section className="section">
        <article className="record-card panel-card-soft">
          <div className="section-header">
            <div>
              <h2 className="section-heading-soft">Regularizations</h2>
              <p className="section-copy section-copy-soft">Track correction requests and open details only when needed.</p>
            </div>
            <button className="button button--secondary" onClick={() => setRegularizeOpen(true)} type="button">New correction</button>
          </div>
          <div className="toolbar">
            <div className="tabbar">
              {tabs.map((tab) => (
                <Link className={`tab ${status === tab ? "tab--active" : ""}`} href={buildHref(currentParams, { status: tab, regId: undefined, page: "1" })} key={tab}>
                  <span>{formatStatus(tab)}</span>
                  <span>{regularizations.status_counts[tab as keyof typeof regularizations.status_counts] ?? 0}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="leave-history-toolbar">
            <div>
              <span className="detail-label">Refine current view</span>
              <p className="section-copy section-copy-soft">Search loaded records by date, status, reason, or manager note.</p>
            </div>
            <span className="queue-summary-chip">{visibleRegularizations.length} shown</span>
          </div>
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
          <div className="leave-request-grid">
            {visibleRegularizations.length ? (
              visibleRegularizations.map((item) => (
                <button
                  className="leave-request-card"
                  key={item.id}
                  onClick={() => {
                    setDismissedRegularizationId(null);
                    setClickedRegularization(item);
                  }}
                  type="button"
                >
                  <span className="leave-request-card__main">
                    <strong>{formatDate(item.attendance_date)}</strong>
                    <small>{formatStatus(item.current_status)} to {formatStatus(item.requested_status)}</small>
                    <span className="muted">{item.reason || "No reason provided."}</span>
                  </span>
                  <span className="leave-request-card__side">
                    <span className={statusClass(item.status)}>{formatStatus(item.status)}</span>
                    <span className="queue-summary-chip">{formatDateTime(item.applied_at ?? item.created_at)}</span>
                  </span>
                </button>
              ))
            ) : (
              <div className="notice">
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
