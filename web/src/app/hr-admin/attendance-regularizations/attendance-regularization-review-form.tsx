"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { AttendanceRegularizationItem } from "@/lib/types";

type Props = {
  item: AttendanceRegularizationItem;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to update attendance regularization.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to update attendance regularization.");
}

function formatDateTime(value: string | null, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export function AttendanceRegularizationReviewForm({ item }: Props) {
  const router = useRouter();
  const [comment, setComment] = useState(item.status === "approved" ? item.manager_comment || "" : item.rejection_reason || item.manager_comment || "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDecision(action: "approve" | "reject") {
    setError("");
    setIsSubmitting(true);
    const response = await fetch(`/api/hr-admin/attendance-regularizations/${item.id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }
    router.push("/hr-admin/attendance-regularizations");
    router.refresh();
  }

  return (
    <section className="section form-layout-modern">
      <article className="record-card">
        <div className="record-card__title-wrap">
          <div className="record-card__title">
            <h2>Request context</h2>
          </div>
          <p className="section-copy">Review the attendance shift, requested changes, and workflow details before taking an action.</p>
        </div>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Employee</span><span className="detail-value">{item.employee_name} ({item.employee_code})</span></div>
          <div className="detail-row"><span className="detail-label">Department</span><span className="detail-value">{item.department || "Unassigned"}</span></div>
          <div className="detail-row"><span className="detail-label">Attendance date</span><span className="detail-value">{item.attendance_date}</span></div>
          <div className="detail-row"><span className="detail-label">Shift</span><span className="detail-value">{item.shift || "No shift"}</span></div>
          <div className="detail-row"><span className="detail-label">Current to requested</span><span className="detail-value">{item.current_status} to {item.requested_status}</span></div>
          <div className="detail-row"><span className="detail-label">Current status</span><span className={`detail-value status status--${item.status}`}>{item.status}</span></div>
          <div className="detail-row"><span className="detail-label">Actual check in</span><span className="detail-value">{formatDateTime(item.actual_check_in_at, "None")}</span></div>
          <div className="detail-row"><span className="detail-label">Requested check in</span><span className="detail-value">{formatDateTime(item.requested_check_in_at, "No change")}</span></div>
          <div className="detail-row"><span className="detail-label">Actual check out</span><span className="detail-value">{formatDateTime(item.actual_check_out_at, "None")}</span></div>
          <div className="detail-row"><span className="detail-label">Requested check out</span><span className="detail-value">{formatDateTime(item.requested_check_out_at, "No change")}</span></div>
          <div className="detail-row"><span className="detail-label">Applied at</span><span className="detail-value">{formatDateTime(item.applied_at, "Not submitted")}</span></div>
          <div className="detail-row"><span className="detail-label">Workflow reference</span><span className="detail-value">{item.workflow_reference || "Not linked"}</span></div>
        </div>
      </article>

      <form className="form-shell-card" onSubmit={(event) => event.preventDefault()}>
        <div className="form-shell-card__header">
          <div>
            <h2>HR review decision</h2>
            <p className="section-copy">Capture the final HR note that explains the approval or rejection outcome.</p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip"><strong>{item.status}</strong> current request status</span>
          </div>
        </div>
        <div className="notice">
          <strong>Employee reason</strong>
          <span className="muted">{item.reason || "No reason provided."}</span>
        </div>
        {item.manager_comment ? (
          <div className="notice">
            <strong>Existing manager comment</strong>
            <span className="muted">{item.manager_comment}</span>
          </div>
        ) : null}
        {item.rejection_reason ? (
          <div className="notice">
            <strong>Existing rejection note</strong>
            <span className="muted">{item.rejection_reason}</span>
          </div>
        ) : null}
        <label className="form-field">
          <span className="muted">HR decision note</span>
          <textarea className="input-control" rows={5} value={comment} onChange={(event) => setComment(event.target.value)} />
        </label>
        {error ? <div className="notice"><strong>Action failed.</strong><span className="muted">{error}</span></div> : null}
        <div className="form-actions-bar">
          <span className="muted">Approvals update the attendance regularization queue immediately.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting || item.status !== "pending"} onClick={() => handleDecision("approve")} type="button">
              {isSubmitting ? "Saving..." : "Approve request"}
            </button>
            <button className="button button--secondary" disabled={isSubmitting || item.status !== "pending"} onClick={() => handleDecision("reject")} type="button">
              Reject request
            </button>
            <button className="button button--ghost" onClick={() => router.back()} type="button">
              Back
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
