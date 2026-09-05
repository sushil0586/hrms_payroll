"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  itemId: string;
  canRetry?: boolean;
  retryLimitReached?: boolean;
  compact?: boolean;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to retry notification delivery.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to retry notification delivery.");
}

export function NotificationRetryAction({ itemId, canRetry = true, retryLimitReached = false, compact = false }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleRetry() {
    if (!canRetry) {
      return;
    }
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);
    const response = await fetch(`/api/hr-admin/notifications/${itemId}/retry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ process_now: true }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }
    setSuccessMessage("Notification delivery retried.");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <div className={compact ? "inline-retry-action" : "stack-list"}>
      <button className="button button--secondary" disabled={isSubmitting || !canRetry} onClick={handleRetry} type="button">
        {isSubmitting ? "Retrying..." : retryLimitReached ? "Retry limit reached" : "Retry delivery"}
      </button>
      {!canRetry && retryLimitReached ? (
        <div className="notice">
          <strong>Retry capped.</strong>
          <span className="muted">The channel delivery policy has already reached its maximum retry attempts.</span>
        </div>
      ) : null}
      {error ? (
        <div className="notice">
          <strong>Retry failed.</strong>
          <span className="muted">{error}</span>
        </div>
      ) : null}
      {successMessage ? (
        <div className="notice">
          <strong>Action saved.</strong>
          <span className="muted">{successMessage}</span>
        </div>
      ) : null}
    </div>
  );
}
