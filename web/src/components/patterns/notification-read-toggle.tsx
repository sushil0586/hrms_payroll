"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ActionToast } from "@/components/patterns/action-toast";

type Props = {
  endpoint: string;
  isRead: boolean;
};

export function NotificationReadToggle({ endpoint, isRead }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);

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
      const message =
        payload && typeof payload === "object" && "detail" in payload
          ? String((payload as Record<string, unknown>).detail)
          : "Unable to update read state.";
      setError(message);
      setToast({ title: "Action failed.", message, tone: "error" });
      setIsSubmitting(false);
      return;
    }
    setToast({ title: "Action saved.", message: isRead ? "Notification marked unread." : "Notification marked read.", tone: "success" });
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
      <button className="button button--secondary" disabled={isSubmitting} onClick={handleToggle} type="button">
        {isSubmitting ? "Saving..." : isRead ? "Mark unread" : "Mark read"}
      </button>
      {error ? <span className="muted">{error}</span> : null}
    </div>
  );
}
