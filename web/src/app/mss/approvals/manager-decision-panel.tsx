"use client";

import { useFeedbackFocus } from "@/lib/ui/use-feedback-focus";
import { mutationErrorMessage, networkMutationMessage } from "@/lib/ui/api-error-message";

import { useEffect, useRef, useState } from "react";

import { ActionToast } from "@/components/patterns/action-toast";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { leaveDecisionMessage } from "@/lib/ui/leave-decision-message";
import { requireText } from "@/lib/ui/validation";
import { useRefreshAfterMutation } from "@/lib/ui/use-refresh-after-mutation";
import { clearMutationIdempotencyKey, mutationIdempotencyKey } from "@/lib/ui/mutation-idempotency";

type Props = {
  itemId: string;
  kind: "leave" | "attendance";
  status: string;
  state: "live" | "demo";
  title: string;
  description: string;
  employeeReason?: string | null;
  requestAction?: string;
  canDecide?: boolean;
  onCompleted?: () => void;
};

function getErrorMessage(payload: unknown, status: number) {
  return mutationErrorMessage(payload, status, 'Unable to record this decision. Refresh the request and review its current approval step.');
}

function getEndpoint(kind: "leave" | "attendance", itemId: string, action: "approve" | "reject") {
  if (kind === "leave") {
    return `/api/manager/leave-requests/${itemId}/${action}`;
  }
  return `/api/manager/attendance-regularizations/${itemId}/${action}`;
}

export function ManagerDecisionPanel({
  itemId,
  kind,
  status,
  state,
  title,
  description,
  employeeReason,
  requestAction,
  canDecide = true,
  onCompleted,
}: Props) {
  const { isRefreshing, refresh } = useRefreshAfterMutation();
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [commentError, setCommentError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);
  const isSubmittingRef = useRef(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const feedbackRef = useFeedbackFocus(error, Boolean(isSubmitting), Boolean(commentError));
  const isPending = status === "pending" || status === "partially_approved";
  const isCancellationRequest = requestAction === "cancellation_request";
  const actionLocked = Boolean(successMessage);

  async function handleDecision(action: "approve" | "reject") {
    if (isSubmittingRef.current || isRefreshing) {
      return;
    }
    isSubmittingRef.current = true;
    setError("");
    setCommentError("");
    setSuccessMessage("");

    const nextCommentError = action === "reject" ? requireText(comment, "Enter a decision note before rejecting this request.") : undefined;
    if (nextCommentError) {
      setCommentError(nextCommentError);
      commentRef.current?.focus();
      const message = "Review the highlighted decision note and try again.";
      setError(message);
      setToast({ title: "Action needs attention.", message, tone: "error" });
      isSubmittingRef.current = false;
      return;
    }

    if (!canDecide) {
      const message = kind === "leave" ? "Leave approval permission is required." : "Attendance review permission is required.";
      setError(message);
      setToast({ title: "Action needs attention.", message, tone: "error" });
      isSubmittingRef.current = false;
      return;
    }

    if (state === "demo") {
      const message = "Approvals are unavailable in demo mode. Sign in as an authorized manager to record a decision.";
      setError(message);
      setToast({ title: "Approval unavailable.", message, tone: "error" });
      isSubmittingRef.current = false;
      return;
    }

    setIsSubmitting(true);
    setPendingAction(action);
    const mutationScope = `mss.${kind}.${action}.${itemId}`;
    const requestPayload = { comment };
    const idempotencyKey = mutationIdempotencyKey(mutationScope, requestPayload);
    let response: Response;
    try {
      response = await fetch(getEndpoint(kind, itemId, action), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(requestPayload),
      });
    } catch {
      const message = networkMutationMessage;
      setError(message);
      setToast({ title: "Action needs attention.", message, tone: "error" });
      setIsSubmitting(false);
      setPendingAction(null);
      isSubmittingRef.current = false;
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = getErrorMessage(payload, response.status);
      setError(message);
      setToast({ title: "Action needs attention.", message, tone: "error" });
      setIsSubmitting(false);
      setPendingAction(null);
      isSubmittingRef.current = false;
      return;
    }
    clearMutationIdempotencyKey(mutationScope);
    const message = kind === "leave"
      ? leaveDecisionMessage(payload, action, isCancellationRequest)
      : action === "approve" ? "Attendance regularization approved." : "Attendance regularization rejected.";
    setSuccessMessage(message);
    setToast({ title: "Action saved.", message, tone: "success" });
    setComment("");
    setIsSubmitting(false);
    setPendingAction(null);
    isSubmittingRef.current = false;
    onCompleted?.();
    refresh();
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), toast.tone === "error" ? 8000 : 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <div className="manager-decision-panel">
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
      <div className="manager-decision-panel__header">
        <div>
          <h3>{title}</h3>
          <p className="section-copy section-copy-soft">{description}</p>
        </div>
        <span className="queue-summary-chip">
          <strong>{status.replaceAll("_", " ")}</strong> current status
        </span>
      </div>
      {employeeReason ? (
        <div className="notice">
          <strong>{isCancellationRequest ? "Cancellation reason" : "Employee reason"}</strong>
          <span className="muted">{employeeReason}</span>
        </div>
      ) : null}
      <label className="form-field">
        <span className="muted">Decision note</span>
        <textarea
          ref={commentRef}
          aria-describedby={commentError ? `mss-${itemId}-comment-error` : undefined}
          className="input-control"
          disabled={isSubmitting || isRefreshing || actionLocked || !isPending || !canDecide}
          aria-invalid={Boolean(commentError)}
          onChange={(event) => {
            setComment(event.target.value);
            setCommentError("");
            setError("");
            setToast(null);
          }}
          rows={4}
          value={comment}
        />
        {commentError ? <span className="field-error-text" id={`mss-${itemId}-comment-error`}>{commentError}</span> : null}
      </label>
      {error ? (
        <div ref={feedbackRef} tabIndex={-1} className="notice notice--error" role="alert">
          <strong>Action needs attention.</strong>
          <span className="muted">{error}</span>
        </div>
      ) : null}
      {successMessage ? (
        <div className="notice notice--success" role="status">
          <strong>Action saved.</strong>
          <span className="muted">{successMessage}</span>
        </div>
      ) : null}
      {!isPending ? (
        <div className="notice">
          <strong>This request is already resolved.</strong>
          <span className="muted">Only pending items can be actioned from the MSS inbox.</span>
        </div>
      ) : null}
      {!canDecide ? (
        <div className="notice">
          <strong>Read-only approval view.</strong>
          <span className="muted">
            {kind === "leave"
              ? "Approve or reject requires leave approval permission."
              : "Approve or reject requires attendance review permission."}
          </span>
        </div>
      ) : null}
      <div className="form-actions-bar">
        <span className="muted">
          {state === "demo"
            ? "Demo mode shows the action flow without mutating real workflow data."
            : "Approvals refresh the MSS queue immediately after the manager decision is recorded."}
        </span>
        <div className="form-actions-bar__buttons">
          <AsyncActionButton
            className="button button--primary"
            disabled={isSubmitting || actionLocked || !isPending || !canDecide}
            onClick={() => handleDecision("approve")}
            pending={pendingAction === "approve" || isRefreshing}
            pendingLabel={isRefreshing ? "Refreshing approval queue" : isCancellationRequest ? "Approving cancellation" : "Approving request"}
            type="button"
          >
            {isCancellationRequest ? "Approve cancellation" : "Approve request"}
          </AsyncActionButton>
          <AsyncActionButton
            className="button button--secondary"
            disabled={isSubmitting || actionLocked || !isPending || !canDecide}
            onClick={() => handleDecision("reject")}
            pending={pendingAction === "reject" || isRefreshing}
            pendingLabel={isRefreshing ? "Refreshing approval queue" : isCancellationRequest ? "Rejecting cancellation" : "Rejecting request"}
            type="button"
          >
            {isCancellationRequest ? "Reject cancellation" : "Reject request"}
          </AsyncActionButton>
        </div>
      </div>
    </div>
  );
}
