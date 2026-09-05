"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { NotificationRetryAction } from "@/app/hr-admin/notifications/notification-retry-action";
import type { HrAdminEnumOption, HrAdminNotification } from "@/lib/types";

type Props = {
  item: HrAdminNotification;
  notificationStatusOptions: HrAdminEnumOption[];
  notificationPriorityOptions: HrAdminEnumOption[];
};

type ReadState = "keep" | "mark_read" | "mark_unread";

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to update notification.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to update notification.");
}

export function NotificationInlineReview({
  item,
  notificationStatusOptions,
  notificationPriorityOptions,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(item.status);
  const [priority, setPriority] = useState(item.priority);
  const [readState, setReadState] = useState<ReadState>("keep");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave() {
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);
    const payload: Record<string, string | null> = {
      status,
      priority,
    };
    if (readState === "mark_read") {
      payload.read_at = new Date().toISOString();
    }
    if (readState === "mark_unread") {
      payload.read_at = null;
    }
    const response = await fetch(`/api/hr-admin/notifications/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(result));
      setIsSubmitting(false);
      return;
    }
    setSuccessMessage("Notification review updated.");
    setReadState("keep");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <div className="inline-review-panel">
      <div className="inline-review-panel__header">
        <div>
          <h3>Quick review</h3>
          <p className="section-copy section-copy-soft">
            Adjust delivery status and urgency in place, or open the full review page for payload details.
          </p>
        </div>
        <Link className="button button--secondary" href={`/hr-admin/notifications/${item.id}/review`}>
          Full review
        </Link>
      </div>
      <div className="form-grid">
        <label className="form-field">
          <span className="muted">Status</span>
          <select className="input-control" disabled={isSubmitting} onChange={(event) => setStatus(event.target.value)} value={status}>
            {notificationStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span className="muted">Priority</span>
          <select className="input-control" disabled={isSubmitting} onChange={(event) => setPriority(event.target.value)} value={priority}>
            {notificationPriorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span className="muted">Read state</span>
          <select className="input-control" disabled={isSubmitting} onChange={(event) => setReadState(event.target.value as ReadState)} value={readState}>
            <option value="keep">{item.read_at ? "Keep as read" : "Keep as unread"}</option>
            <option value="mark_read">Mark as read now</option>
            <option value="mark_unread">Clear read state</option>
          </select>
        </label>
      </div>
      {error ? (
        <div className="notice">
          <strong>Save failed.</strong>
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
        <span className="muted">Quick review keeps notification triage in queue.</span>
        <div className="form-actions-bar__buttons">
          <NotificationRetryAction compact itemId={item.id} canRetry={item.can_retry} retryLimitReached={item.retry_limit_reached} />
          <button className="button button--primary" disabled={isSubmitting} onClick={handleSave} type="button">
            {isSubmitting ? "Saving..." : "Save review"}
          </button>
        </div>
      </div>
    </div>
  );
}
