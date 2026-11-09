"use client";

import { useRef, useState } from "react";
import { useActionFeedback } from "@/components/patterns/action-feedback-provider";
import { rememberActionSuccess } from "@/components/patterns/action-feedback-receipt";
import { mutationErrorMessage } from "@/lib/ui/api-error-message";

import type { AttendanceRegularizationItem } from "@/lib/types";

type Props = {
  item: AttendanceRegularizationItem;
  reviewHref: string;
  onOpenReview?: () => void;
  onReconcile?: () => Promise<boolean>;
};


export function AttendanceRegularizationInlineReview({ item, reviewHref, onOpenReview, onReconcile }: Props) {
  const [comment, setComment] = useState(item.status === "approved" ? item.manager_comment || "" : item.rejection_reason || item.manager_comment || "");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const feedback = useActionFeedback();
  const [accepted, setAccepted] = useState(false);

  async function handleDecision(action: "approve" | "reject") {
    if (submittingRef.current || accepted) {
      return;
    }
    if (action === "reject" && !comment.trim()) {
      setError("Enter a decision note before rejecting this request.");
      return;
    }
    submittingRef.current = true;
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);
    let response: Response;
    try {
      response = await fetch(`/api/hr-admin/attendance-regularizations/${item.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
    } catch {
      setError("Unable to reach the server. Check your connection and try again.");
      setIsSubmitting(false);
      submittingRef.current = false;
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(mutationErrorMessage(payload, response.status, "Unable to update attendance regularization."));
      setIsSubmitting(false);
      submittingRef.current = false;
      return;
    }
    setAccepted(true);
    let reconciled = !onReconcile;
    try { if (onReconcile) reconciled = await onReconcile(); } catch { /* Accepted write remains locked. */ }
    if (!reconciled) {
      setError("The decision was accepted, but the queue could not be confirmed. Do not submit it again; retry the queue read.");
      setIsSubmitting(false);
      return;
    }
    const message = action === "approve" ? "Regularization approved." : "Regularization rejected.";
    setSuccessMessage(message);
    feedback?.success("Action saved.", message);
    setIsSubmitting(false); submittingRef.current = false;
  }

  return (
    <div className="inline-review-panel">
      <div className="inline-review-panel__header">
        <div>
          <h3>Quick review</h3>
          <p className="section-copy section-copy-soft">Approve or reject in queue, or open the full review screen.</p>
        </div>
        {onOpenReview ? <button className="button button--secondary" onClick={onOpenReview} type="button">Full review</button> : <a className="button button--secondary" href={reviewHref}>Full review</a>}
      </div>
      <label className="form-field">
        <span className="muted">Decision note</span>
        <textarea
          className="input-control"
          disabled={isSubmitting || accepted || item.status !== "pending"}
          onChange={(event) => setComment(event.target.value)}
          rows={4}
          value={comment}
        />
      </label>
      {error ? (
        <div className="notice notice--error" role="alert">
          <strong>Action failed.</strong>
          <span className="muted">{error}</span>
        </div>
      ) : null}
      {successMessage ? (
        <div className="notice">
          <strong>Action saved.</strong>
          <span className="muted">{successMessage}</span>
        </div>
      ) : null}
      <div className="form-actions-bar">
        <span className="muted">Queue decisions refresh in place after save.</span>
        <div className="form-actions-bar__buttons">
          <button
            className="button button--primary"
            disabled={isSubmitting || accepted || item.status !== "pending"}
            onClick={() => handleDecision("approve")}
            type="button"
          >
            {isSubmitting ? "Saving..." : "Approve"}
          </button>
          <button
            className="button button--secondary"
            disabled={isSubmitting || accepted || item.status !== "pending"}
            onClick={() => handleDecision("reject")}
            type="button"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
