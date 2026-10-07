"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ActionToast } from "@/components/patterns/action-toast";
import type { LeaveRequestItem } from "@/lib/types";

type Props = {
  item: LeaveRequestItem;
  isDemo: boolean;
  onCompleted?: () => void;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to update leave request.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to update leave request.");
}

export function LeaveRequestLifecycleActions({ item, isDemo, onCompleted }: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [attachmentReference, setAttachmentReference] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<"withdraw" | "cancel" | null>(null);
  const isSubmittingRef = useRef(false);

  async function runAction(action: "withdraw" | "cancel") {
    if (isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;
    setError("");
    if (isDemo) {
      const message = "Lifecycle actions are only available in live mode.";
      setError(message);
      setToast({ title: "Action failed.", message, tone: "error" });
      isSubmittingRef.current = false;
      return;
    }
    setIsSubmitting(action);
    const body = new FormData();
    body.set("reason", reason);
    body.set("attachment_reference", attachmentReference);
    if (attachmentFile) {
      body.set("attachment_file", attachmentFile);
    }
    let response: Response;
    try {
      response = await fetch(`/api/me/leave-requests/${item.id}/${action}/`, {
        method: "POST",
        body,
      });
    } catch {
      const message = "Unable to reach the server. Check your connection and try again.";
      setError(message);
      setToast({ title: "Action failed.", message, tone: "error" });
      setIsSubmitting(null);
      isSubmittingRef.current = false;
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = getErrorMessage(payload);
      setError(message);
      setToast({ title: "Action failed.", message, tone: "error" });
      setIsSubmitting(null);
      isSubmittingRef.current = false;
      return;
    }
    setToast({
      title: "Action saved.",
      message: action === "withdraw" ? "Leave request withdrawn." : item.cancel_requires_reapproval ? "Cancellation request submitted." : "Approved leave cancelled.",
      tone: "success",
    });
    setIsSubmitting(null);
    isSubmittingRef.current = false;
    onCompleted?.();
    window.setTimeout(() => router.refresh(), 900);
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const showWithdraw = item.can_withdraw || item.withdraw_block_reason;
  const showCancel = item.can_cancel || item.cancel_block_reason;
  const needsAttachment = (item.can_withdraw && item.withdraw_requires_attachment) || (item.can_cancel && item.cancel_requires_attachment);
  const cancelLabel = item.cancel_requires_reapproval ? "Submit cancellation request" : "Cancel approved leave";

  if (!showWithdraw && !showCancel) {
    return null;
  }

  return (
    <section className="ess-modal-section leave-lifecycle-panel">
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
      <h3 className="section-heading-soft">Lifecycle actions</h3>
      <p className="section-copy section-copy-soft">Use the policy-governed lifecycle actions below when this request needs to be pulled back or cancelled.</p>

      <div className="leave-lifecycle-panel__form">
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

        {needsAttachment ? (
          <label className="form-field">
            <span className="muted">Evidence file</span>
            <input className="input-control" onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)} type="file" />
          </label>
        ) : null}
      </div>

      <div className="leave-lifecycle-panel__actions">
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
      </div>

      {error ? (
        <div className="notice notice--error" role="alert">
          <strong>Action failed.</strong>
          <span className="muted">{error}</span>
        </div>
      ) : null}
    </section>
  );
}
