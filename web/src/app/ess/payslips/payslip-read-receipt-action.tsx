"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ActionToast } from "@/components/patterns/action-toast";

type Props = {
  endpoint: string;
  isReadAcknowledged: boolean;
};

export function PayslipReadReceiptAction({ endpoint, isReadAcknowledged }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);

  async function handleReadAcknowledgement() {
    setIsSubmitting(true);
    setError("");
    const response = await fetch(endpoint, { method: "POST" });
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
    window.setTimeout(() => router.refresh(), 900);
    setIsSubmitting(false);
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <div className="record-card__actions">
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
      <button className="button button--secondary" disabled={isSubmitting || isReadAcknowledged} onClick={handleReadAcknowledgement} type="button">
        {isSubmitting ? "Saving..." : isReadAcknowledged ? "Read acknowledged" : "Mark as read"}
      </button>
      {error ? <span className="muted">{error}</span> : null}
    </div>
  );
}
