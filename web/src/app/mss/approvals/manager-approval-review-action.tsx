"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

import { ManagerDecisionPanel } from "@/app/mss/approvals/manager-decision-panel";
import type { AttendanceRegularizationItem, LeaveRequestItem } from "@/lib/types";

type Props =
  | {
      canDecide: boolean;
      item: LeaveRequestItem;
      kind: "leave";
      state: "live" | "demo";
      variant?: "primary" | "secondary" | "ghost";
    }
  | {
      canDecide: boolean;
      item: AttendanceRegularizationItem;
      kind: "attendance";
      state: "live" | "demo";
      variant?: "primary" | "secondary" | "ghost";
    };

function formatDate(value: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function requestActionLabel(requestAction?: string) {
  return requestAction === "cancellation_request" ? "Cancellation request" : "Leave request";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function LeaveEvidenceList({ item }: { item: LeaveRequestItem }) {
  const attachments = item.attachments ?? [];
  if (!attachments.length && !item.attachment_reference) {
    return (
      <div className="notice notice--compact">
        <strong>No evidence attached.</strong>
        <span className="muted">This request does not include a supporting document or reference.</span>
      </div>
    );
  }

  return (
    <div className="leave-evidence-list">
      {attachments.map((attachment) => (
        <a
          className="leave-evidence-item"
          href={`/api/manager/leave-requests/${item.id}/attachments/${attachment.id}/download`}
          key={attachment.id}
        >
          <span>
            <strong>{attachment.file_name}</strong>
            <small>{attachment.label || attachment.action.replaceAll("_", " ")}</small>
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

function LeaveReviewModal({
  canDecide,
  item,
  onClose,
  state,
}: {
  canDecide: boolean;
  item: LeaveRequestItem;
  onClose: () => void;
  state: "live" | "demo";
}) {
  const isCancellationRequest = item.request_action === "cancellation_request";

  return (
    <div className="modal-shell" role="presentation">
      <div aria-label="Leave approval review" aria-modal="true" className="modal mss-approval-modal" role="dialog">
        <div className="modal__header">
          <div>
            <span className="eyebrow">{requestActionLabel(item.request_action)}</span>
            <h2>Review leave approval</h2>
            <p className="section-copy section-copy-soft">Confirm dates, reason, and policy context before deciding.</p>
          </div>
          <button aria-label="Close leave approval review" className="button button--secondary" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="mss-approval-modal__body">
          <div className="mss-approval-modal-summary">
            <article>
              <span>Employee</span>
              <strong>{item.employee_name || "Unknown"}</strong>
              <small>{item.employee_code || "No employee code"}</small>
            </article>
            <article>
              <span>Leave period</span>
              <strong>{formatDate(item.start_date)}</strong>
              <small>to {formatDate(item.end_date)}</small>
            </article>
            <article>
              <span>Units</span>
              <strong>{item.requested_units}</strong>
              <small>{titleCase(item.status)}</small>
            </article>
          </div>

          <section className="ess-modal-section">
            <h3>Request context</h3>
            <div className="detail-grid">
              <DetailRow label="Request type" value={requestActionLabel(item.request_action)} />
              <DetailRow label="Department" value={item.department || "Not mapped"} />
              <DetailRow label="Designation" value={item.designation || "Not mapped"} />
              <DetailRow label="Leave type" value={item.leave_type} />
              <DetailRow label="Date range" value={`${formatDate(item.start_date)} to ${formatDate(item.end_date)}`} />
              <DetailRow label="Applied at" value={formatDateTime(item.applied_at)} />
              <DetailRow
                label={isCancellationRequest ? "Cancellation reason" : "Employee reason"}
                value={item.reason || "No reason provided."}
              />
              {item.cancel_requires_reapproval ? (
                <DetailRow
                  label="Cancellation route"
                  value={item.cancel_approval_route ? titleCase(item.cancel_approval_route) : "Uses the original leave route"}
                />
              ) : null}
            </div>
          </section>

          <section className="ess-modal-section">
            <h3>Evidence</h3>
            <LeaveEvidenceList item={item} />
          </section>

          <ManagerDecisionPanel
            canDecide={canDecide}
            description="Capture the manager decision after reviewing the full leave context."
            employeeReason={item.reason}
            itemId={item.id}
            kind="leave"
            requestAction={item.request_action}
            state={state}
            status={item.status}
            title={isCancellationRequest ? "Cancellation decision" : "Leave decision"}
          />
        </div>
      </div>
    </div>
  );
}

function AttendanceReviewModal({
  canDecide,
  item,
  onClose,
  state,
}: {
  canDecide: boolean;
  item: AttendanceRegularizationItem;
  onClose: () => void;
  state: "live" | "demo";
}) {
  return (
    <div className="modal-shell" role="presentation">
      <div aria-label="Attendance approval review" aria-modal="true" className="modal mss-approval-modal" role="dialog">
        <div className="modal__header">
          <div>
            <span className="eyebrow">Attendance regularization</span>
            <h2>Review attendance approval</h2>
            <p className="section-copy section-copy-soft">Verify the requested correction and payroll impact before deciding.</p>
          </div>
          <button aria-label="Close attendance approval review" className="button button--secondary" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="mss-approval-modal__body">
          <div className="mss-approval-modal-summary">
            <article>
              <span>Employee</span>
              <strong>{item.employee_name || "Unknown"}</strong>
              <small>{item.employee_code || "No employee code"}</small>
            </article>
            <article>
              <span>Attendance date</span>
              <strong>{formatDate(item.attendance_date)}</strong>
              <small>{titleCase(item.status)}</small>
            </article>
            <article>
              <span>Correction</span>
              <strong>{titleCase(item.requested_status)}</strong>
              <small>from {titleCase(item.current_status)}</small>
            </article>
          </div>

          <section className="ess-modal-section">
            <h3>Correction context</h3>
            <div className="detail-grid">
              <DetailRow label="Employee" value={`${item.employee_name || "Unknown"} (${item.employee_code || "N/A"})`} />
              <DetailRow label="Attendance date" value={formatDate(item.attendance_date)} />
              <DetailRow label="Current status" value={titleCase(item.current_status)} />
              <DetailRow label="Requested status" value={titleCase(item.requested_status)} />
              <DetailRow label="Actual check-in" value={formatDateTime(item.actual_check_in_at)} />
              <DetailRow label="Requested check-in" value={formatDateTime(item.requested_check_in_at)} />
              <DetailRow label="Applied at" value={formatDateTime(item.applied_at)} />
              <DetailRow label="Reason" value={item.reason || "No reason provided."} />
            </div>
          </section>

          <ManagerDecisionPanel
            canDecide={canDecide}
            description="Approve or reject the attendance exception with a manager note."
            employeeReason={item.reason}
            itemId={item.id}
            kind="attendance"
            state={state}
            status={item.status}
            title="Regularization decision"
          />
        </div>
      </div>
    </div>
  );
}

export function ManagerApprovalReviewAction(props: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonClass = props.variant === "primary"
    ? "button button--primary"
    : props.variant === "secondary"
      ? "button button--secondary"
      : "button button--ghost";
  const modal = isOpen && typeof document !== "undefined"
    ? createPortal(
        props.kind === "leave" ? (
          <LeaveReviewModal canDecide={props.canDecide} item={props.item} onClose={() => setIsOpen(false)} state={props.state} />
        ) : (
          <AttendanceReviewModal canDecide={props.canDecide} item={props.item} onClose={() => setIsOpen(false)} state={props.state} />
        ),
        document.body,
      )
    : null;

  return (
    <>
      <button className={buttonClass} onClick={() => setIsOpen(true)} type="button">
        Review
      </button>
      {modal}
    </>
  );
}
