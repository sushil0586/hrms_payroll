"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  itemId: string;
  kind: "leave" | "attendance";
  status: string;
  state: "live" | "demo";
  title: string;
  description: string;
  employeeReason?: string | null;
  requestAction?: string;
};

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) {
      return String(value[0]);
    }
  }
  return String((payload as Record<string, unknown>).detail || fallback);
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
}: Props) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPending = status === "pending";
  const isCancellationRequest = requestAction === "cancellation_request";

  async function handleDecision(action: "approve" | "reject") {
    setError("");
    setSuccessMessage("");

    if (state === "demo") {
      setSuccessMessage(
        action === "approve"
          ? "Demo approval captured. Live workflow updates will run once this page is connected to a signed-in manager."
          : "Demo rejection captured. Live workflow updates will run once this page is connected to a signed-in manager.",
      );
      return;
    }

    setIsSubmitting(true);
    const response = await fetch(getEndpoint(kind, itemId, action), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(
        getErrorMessage(
          payload,
          kind === "leave" ? "Unable to update leave request." : "Unable to update attendance regularization.",
        ),
      );
      setIsSubmitting(false);
      return;
    }
    setSuccessMessage(
      action === "approve"
        ? isCancellationRequest
          ? "Cancellation request approved."
          : "Request approved."
        : isCancellationRequest
          ? "Cancellation request rejected."
          : "Request rejected.",
    );
    setComment("");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <div className="manager-decision-panel">
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
          className="input-control"
          disabled={isSubmitting || !isPending}
          onChange={(event) => setComment(event.target.value)}
          rows={4}
          value={comment}
        />
      </label>
      {error ? (
        <div className="notice">
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
      {!isPending ? (
        <div className="notice">
          <strong>This request is already resolved.</strong>
          <span className="muted">Only pending items can be actioned from the MSS inbox.</span>
        </div>
      ) : null}
      <div className="form-actions-bar">
        <span className="muted">
          {state === "demo"
            ? "Demo mode shows the action flow without mutating real workflow data."
            : "Approvals refresh the MSS queue immediately after the manager decision is recorded."}
        </span>
        <div className="form-actions-bar__buttons">
          <button
            className="button button--primary"
            disabled={isSubmitting || !isPending}
            onClick={() => handleDecision("approve")}
            type="button"
          >
            {isSubmitting ? "Saving..." : isCancellationRequest ? "Approve cancellation" : "Approve request"}
          </button>
          <button
            className="button button--secondary"
            disabled={isSubmitting || !isPending}
            onClick={() => handleDecision("reject")}
            type="button"
          >
            {isCancellationRequest ? "Reject cancellation" : "Reject request"}
          </button>
        </div>
      </div>
    </div>
  );
}
