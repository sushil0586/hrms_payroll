"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { LeaveRequestItem } from "@/lib/types";

type Props = {
  closeHref: string;
  item: LeaveRequestItem;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to update leave request.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to update leave request.");
}

export function LeaveRequestOverrideForm({ closeHref, item }: Props) {
  const router = useRouter();
  const [comment, setComment] = useState(item.manager_comment || item.rejection_reason || "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<"approve" | "reject" | "">("");
  const submittingRef = useRef(false);
  const canDecide = ["pending", "partially_approved"].includes(item.status);

  async function submitDecision(action: "approve" | "reject") {
    if (submittingRef.current) return;
    if (action === "reject" && !comment.trim()) {
      setError("A decision note is required when rejecting a leave request.");
      return;
    }
    submittingRef.current = true;
    setError("");
    setIsSubmitting(action);
    let response: Response;
    try {
      response = await fetch(`/api/hr-admin/leave-requests/${item.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
    } catch {
      setError("Unable to reach the server. Check your connection and try again.");
      setIsSubmitting("");
      submittingRef.current = false;
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting("");
      submittingRef.current = false;
      return;
    }
    setIsSubmitting("");
    submittingRef.current = false;
    router.push(closeHref);
    router.refresh();
  }

  return (
    <div className="inline-review-panel">
      <div className="record-card record-card--compact">
        <div className="record-card__header">
          <div>
            <h3>{item.employee_name || item.employee_code || "Employee"}</h3>
            <p className="section-copy section-copy-soft">{item.leave_type} · {item.start_date} to {item.end_date}</p>
          </div>
          <span className="queue-summary-chip">{item.status.replaceAll("_", " ")}</span>
        </div>
      </div>
      <div className="notice">
        <strong>HR override approval.</strong>
        <span className="muted">Use only when the configured approver cannot complete the pending step. The decision is audited under your HR account.</span>
      </div>
      <label className="form-field">
        <span className="muted">Decision note {isSubmitting === "reject" ? "*" : ""}</span>
        <textarea
          className="input-control"
          disabled={!canDecide || Boolean(isSubmitting)}
          onChange={(event) => setComment(event.target.value)}
          rows={5}
          value={comment}
        />
      </label>
      {error ? (
        <div className="notice notice--error" role="alert">
          <strong>Action failed.</strong>
          <span className="muted">{error}</span>
        </div>
      ) : null}
      {!canDecide ? (
        <div className="notice">
          <strong>No pending approval step.</strong>
          <span className="muted">Only pending or partially approved leave requests can be overridden.</span>
        </div>
      ) : null}
      <div className="form-actions-bar">
        <span className="muted">Existing leave balance, workflow, notification, and audit rules still run.</span>
        <div className="form-actions-bar__buttons">
          <button className="button button--secondary" disabled={!canDecide || Boolean(isSubmitting)} onClick={() => submitDecision("reject")} type="button">
            {isSubmitting === "reject" ? "Saving..." : "Reject"}
          </button>
          <button className="button button--primary" disabled={!canDecide || Boolean(isSubmitting)} onClick={() => submitDecision("approve")} type="button">
            {isSubmitting === "approve" ? "Saving..." : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}
