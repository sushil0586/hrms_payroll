"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ActionToast } from "@/components/patterns/action-toast";

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
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);

  async function handleRetry() {
    if (!canRetry) {
      return;
    }
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);
    let response: Response;
    try {
      response = await fetch(`/api/hr-admin/notifications/${itemId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ process_now: true }),
      });
    } catch {
      const message = "Unable to reach the server. Check your connection and try again.";
      setError(message);
      setToast({ title: "Retry failed.", message, tone: "error" });
      setIsSubmitting(false);
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = getErrorMessage(payload);
      setError(message);
      setToast({ title: "Retry failed.", message, tone: "error" });
      setIsSubmitting(false);
      return;
    }
    const message = "Notification delivery retried.";
    setSuccessMessage(message);
    setToast({ title: "Action saved.", message, tone: "success" });
    setIsSubmitting(false);
    window.setTimeout(() => router.refresh(), 900);
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <div className={compact ? "inline-retry-action" : "stack-list"}>
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
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
        <div className="notice notice--error" role="alert">
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
