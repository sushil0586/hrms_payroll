"use client";

import { useEffect, useState } from "react";

import { ActionToast } from "@/components/patterns/action-toast";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { useRefreshAfterMutation } from "@/lib/ui/use-refresh-after-mutation";

type Props = {
  endpoint: string;
  isReadAcknowledged: boolean;
};

export function PayslipReadReceiptAction({ endpoint, isReadAcknowledged }: Props) {
  const { isRefreshing, refresh } = useRefreshAfterMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);

  async function handleReadAcknowledgement() {
    if (isSubmitting || isRefreshing || isReadAcknowledged) return;
    setIsSubmitting(true);
    setError("");
    let response: Response;
    try {
      response = await fetch(endpoint, { method: "POST" });
    } catch {
      const message = "Unable to reach the server. Check your connection and retry.";
      setError(message);
      setToast({ title: "Action failed.", message, tone: "error" });
      setIsSubmitting(false);
      return;
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message =
        payload && typeof payload === "object" && "detail" in payload
          ? String((payload as Record<string, unknown>).detail)
          : "Unable to record read receipt.";
      setError(message);
      setToast({ title: "Action failed.", message, tone: "error" });
      setIsSubmitting(false);
      return;
    }
    setToast({ title: "Action saved.", message: "Payslip read receipt recorded.", tone: "success" });
    setIsSubmitting(false);
    refresh();
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <div className="record-card__actions">
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
      <AsyncActionButton className="button button--secondary" disabled={isReadAcknowledged} pending={isSubmitting || isRefreshing} pendingLabel={isRefreshing ? "Refreshing payslip" : "Saving read receipt"} onClick={handleReadAcknowledgement} type="button">{isReadAcknowledged ? "Read acknowledged" : "Mark as read"}</AsyncActionButton>
      {error ? <span className="muted">{error}</span> : null}
    </div>
  );
}
