"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

export function AttendanceRegularizationInlineReview({ item }: Props) {
  const router = useRouter();
  const [comment, setComment] = useState(item.status === "approved" ? item.manager_comment || "" : item.rejection_reason || item.manager_comment || "");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDecision(action: "approve" | "reject") {
    setError("");
    setSuccessMessage("");
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
    setSuccessMessage(action === "approve" ? "Regularization approved." : "Regularization rejected.");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <div className="inline-review-panel">
      <div className="inline-review-panel__header">
        <div>
          <h3>Quick review</h3>
          <p className="section-copy section-copy-soft">Approve or reject in queue, or open the full review screen.</p>
        </div>
        <Link className="button button--secondary" href={`/hr-admin/attendance-regularizations/${item.id}/review`}>
          Full review
        </Link>
      </div>
      <label className="form-field">
        <span className="muted">Decision note</span>
        <textarea
          className="input-control"
          disabled={isSubmitting || item.status !== "pending"}
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
      <div className="form-actions-bar">
        <span className="muted">Queue decisions refresh in place after save.</span>
        <div className="form-actions-bar__buttons">
          <button
            className="button button--primary"
            disabled={isSubmitting || item.status !== "pending"}
            onClick={() => handleDecision("approve")}
            type="button"
          >
            {isSubmitting ? "Saving..." : "Approve"}
          </button>
          <button
            className="button button--secondary"
            disabled={isSubmitting || item.status !== "pending"}
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
