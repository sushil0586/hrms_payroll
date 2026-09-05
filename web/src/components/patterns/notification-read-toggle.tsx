"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  endpoint: string;
  isRead: boolean;
};

export function NotificationReadToggle({ endpoint, isRead }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleToggle() {
    setIsSubmitting(true);
    setError("");
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read_at: isRead ? null : new Date().toISOString() }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(
        payload && typeof payload === "object" && "detail" in payload
          ? String((payload as Record<string, unknown>).detail)
          : "Unable to update read state.",
      );
      setIsSubmitting(false);
      return;
    }
    router.refresh();
    setIsSubmitting(false);
  }

  return (
    <div className="record-card__actions">
      <button className="button button--secondary" disabled={isSubmitting} onClick={handleToggle} type="button">
        {isSubmitting ? "Saving..." : isRead ? "Mark unread" : "Mark read"}
      </button>
      {error ? <span className="muted">{error}</span> : null}
    </div>
  );
}
