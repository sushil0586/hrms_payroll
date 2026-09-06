"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  endpoint: string;
  isReadAcknowledged: boolean;
};

export function PayslipReadReceiptAction({ endpoint, isReadAcknowledged }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleReadAcknowledgement() {
    setIsSubmitting(true);
    setError("");
    const response = await fetch(endpoint, { method: "POST" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(
        payload && typeof payload === "object" && "detail" in payload
          ? String((payload as Record<string, unknown>).detail)
          : "Unable to record read receipt.",
      );
      setIsSubmitting(false);
      return;
    }
    router.refresh();
    setIsSubmitting(false);
  }

  return (
    <div className="record-card__actions">
      <button className="button button--secondary" disabled={isSubmitting || isReadAcknowledged} onClick={handleReadAcknowledgement} type="button">
        {isSubmitting ? "Saving..." : isReadAcknowledged ? "Read acknowledged" : "Mark as read"}
      </button>
      {error ? <span className="muted">{error}</span> : null}
    </div>
  );
}
