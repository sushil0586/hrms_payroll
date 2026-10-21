"use client";

import { useFeedbackFocus } from "@/lib/ui/use-feedback-focus";
import { mutationErrorMessage, networkMutationMessage } from "@/lib/ui/api-error-message";

import { useSearchParams } from "next/navigation";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { useEffect, useRef, useState } from "react";

import { rememberActionSuccess } from "@/components/patterns/action-feedback-receipt";
import { leaveDecisionMessage } from "@/lib/ui/leave-decision-message";
import type { LeaveRequestItem } from "@/lib/types";

type Props = {
  closeHref: string;
  item: LeaveRequestItem;
};

function getErrorMessage(payload: unknown, status: number) {
  return mutationErrorMessage(payload, status, 'Unable to record the HR decision. Refresh the request and review its current approval step.');
}

export function LeaveRequestOverrideForm({ closeHref, item }: Props) {
  const [comment, setComment] = useState(item.manager_comment || item.rejection_reason || "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<"approve" | "reject" | "">("");
  const submittingRef = useRef(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const [commentError, setCommentError] = useState("");
  const feedbackRef = useFeedbackFocus(error, Boolean(isSubmitting), Boolean(commentError));
  const canDecide = ["pending", "partially_approved"].includes(item.status);

  async function submitDecision(action: "approve" | "reject") {
    if (submittingRef.current) return;
    if (action === "reject" && !comment.trim()) {
      const message = "A decision note is required when rejecting a leave request.";
      setError(message);
      setCommentError(message);
      commentRef.current?.focus();
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
      setError(networkMutationMessage);
      setIsSubmitting("");
      submittingRef.current = false;
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload, response.status));
      setIsSubmitting("");
      submittingRef.current = false;
      return;
    }
    // A fresh document commits both the decision and its filtered return scope.
    // push + refresh can refresh the old override URL before navigation commits.
    rememberActionSuccess(closeHref, item.id, "HR decision recorded.", leaveDecisionMessage(payload, action, item.request_action === "cancellation_request"));
    window.location.assign(closeHref);
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
          ref={commentRef}
          aria-invalid={Boolean(commentError)}
          aria-describedby={commentError ? `hr-${item.id}-comment-error` : undefined}
          className="input-control"
          disabled={!canDecide || Boolean(isSubmitting)}
          onChange={(event) => { setComment(event.target.value); setCommentError(""); setError(""); }}
          rows={5}
          value={comment}
        />
        {commentError ? <span className="field-error-text" id={`hr-${item.id}-comment-error`}>{commentError}</span> : null}
      </label>
      {error ? (
        <div ref={feedbackRef} tabIndex={-1} className="notice notice--error" role="alert">
          <strong>Action needs attention.</strong>
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

/** URL-owned presentation; opening/authorization still comes from the server page. */
export function LeaveRequestReviewDialog({ closeHref, item }: Props) {
  const params = useSearchParams();
  const open = params.get("overrideLeave") === item.id;
  const wasOpen = useRef(open);
  useEffect(() => {
    if (!open && wasOpen.current) {
      document.querySelector<HTMLElement>(`[data-leave-review-opener="${item.id}"]`)?.focus({ preventScroll: true });
    }
    wasOpen.current = open;
  }, [open, item.id]);
  if (!open) return null;
  return <HrAdminActionModal
    className="accerio-dialog"
    closeHref={closeHref}
    onClose={() => {
      // Closing changes presentation only. Native history updates Next search
      // params immediately, avoiding a server navigation that can retain a
      // stale modal while the filtered RSC transition commits in WebKit.
      window.history.replaceState(null, "", closeHref);
    }}
    explicitTabOrder
    description="Approve or reject the current pending leave step when HR must act for an unavailable approver."
    eyebrow="HR override"
    labelledBy="leave-request-override-title"
    title="Review leave request"
  ><LeaveRequestOverrideForm closeHref={closeHref} item={item} /></HrAdminActionModal>;
}
