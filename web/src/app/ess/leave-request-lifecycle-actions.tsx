"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { LeaveRequestItem } from "@/lib/types";

type Props = {
  item: LeaveRequestItem;
  isDemo: boolean;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to update leave request.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to update leave request.");
}

export function LeaveRequestLifecycleActions({ item, isDemo }: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [attachmentReference, setAttachmentReference] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<"withdraw" | "cancel" | null>(null);

  async function runAction(action: "withdraw" | "cancel") {
    setError("");
    if (isDemo) {
      setError("Lifecycle actions are only available in live mode.");
      return;
    }
    setIsSubmitting(action);
    const response = await fetch(`/api/me/leave-requests/${item.id}/${action}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason,
        attachment_reference: attachmentReference,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(null);
      return;
    }
    setIsSubmitting(null);
    router.refresh();
  }

  const showWithdraw = item.can_withdraw || item.withdraw_block_reason;
  const showCancel = item.can_cancel || item.cancel_block_reason;
  const needsAttachment = (item.can_withdraw && item.withdraw_requires_attachment) || (item.can_cancel && item.cancel_requires_attachment);
  const cancelLabel = item.cancel_requires_reapproval ? "Submit cancellation request" : "Cancel approved leave";

  if (!showWithdraw && !showCancel) {
    return null;
  }

  return (
    <div className="stack">
      <h3 className="section-heading-soft">Lifecycle actions</h3>
      <p className="section-copy section-copy-soft">Use the policy-governed lifecycle actions below when this request needs to be pulled back or cancelled.</p>

      <label className="form-field">
        <span className="muted">Reason</span>
        <input className="input-control" value={reason} onChange={(event) => setReason(event.target.value)} />
      </label>

      {needsAttachment ? (
        <label className="form-field">
          <span className="muted">
            Attachment reference
            {item.can_withdraw && item.withdraw_requires_attachment ? ` (${item.withdraw_attachment_label})` : ""}
            {item.can_cancel && item.cancel_requires_attachment ? ` (${item.cancel_attachment_label})` : ""}
          </span>
          <input className="input-control" value={attachmentReference} onChange={(event) => setAttachmentReference(event.target.value)} />
        </label>
      ) : null}

      {item.can_withdraw ? (
        <button className="button button--secondary" disabled={Boolean(isSubmitting)} onClick={() => runAction("withdraw")} type="button">
          {isSubmitting === "withdraw" ? "Withdrawing..." : "Withdraw request"}
        </button>
      ) : item.withdraw_block_reason ? (
        <div className="notice">
          <strong>Withdraw unavailable.</strong>
          <span className="muted">{item.withdraw_block_reason}</span>
        </div>
      ) : null}

      {item.can_cancel ? (
        <button className="button button--secondary" disabled={Boolean(isSubmitting)} onClick={() => runAction("cancel")} type="button">
          {isSubmitting === "cancel" ? "Saving..." : cancelLabel}
        </button>
      ) : item.cancel_block_reason ? (
        <div className="notice">
          <strong>Cancel unavailable.</strong>
          <span className="muted">{item.cancel_block_reason}</span>
        </div>
      ) : null}

      {error ? (
        <div className="notice">
          <strong>Action failed.</strong>
          <span className="muted">{error}</span>
        </div>
      ) : null}
    </div>
  );
}
