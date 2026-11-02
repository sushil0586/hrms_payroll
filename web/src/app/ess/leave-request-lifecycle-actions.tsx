"use client";

import { apiFieldErrors, mutationErrorMessage, networkMutationMessage } from "@/lib/ui/api-error-message";

import { useEffect, useRef, useState } from "react";

import { ActionToast, ERROR_TOAST_DURATION_MS, SUCCESS_TOAST_DURATION_MS } from "@/components/patterns/action-toast";
import { rememberActionSuccess } from "@/components/patterns/action-feedback-receipt";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { hasFieldErrors, requireText, validateUploadFile, type FieldErrors } from "@/lib/ui/validation";
import { useFeedbackFocus } from "@/lib/ui/use-feedback-focus";
import { useValidationFocus } from "@/lib/ui/use-validation-focus";
import type { LeaveRequestItem } from "@/lib/types";

function formatFileSize(fileSizeBytes: number) {
  if (fileSizeBytes === 0) return "0 B";
  if (fileSizeBytes < 1024) return `${fileSizeBytes} B`;
  if (fileSizeBytes < 1024 * 1024) return `${(fileSizeBytes / 1024).toFixed(1)} KB`;
  return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  item: LeaveRequestItem;
  isDemo: boolean;
  onCompleted?: () => void | Promise<void>;
};

function getErrorMessage(payload: unknown, status: number) {
  return mutationErrorMessage(payload, status, 'Unable to update the leave request. Refresh its status and review the policy guidance.');
}

export function LeaveRequestLifecycleActions({ item, isDemo, onCompleted }: Props) {
  const [reason, setReason] = useState("");
  const [attachmentReference, setAttachmentReference] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<"withdraw" | "cancel" | null>(null);
  const isSubmittingRef = useRef(false);
  const idempotencyKeys = useRef({
    withdraw: `leave-withdraw:${crypto.randomUUID()}`,
    cancel: `leave-cancel:${crypto.randomUUID()}`,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<"attachment_file" | "attachment_reference">>({});
  const panelRef = useValidationFocus<"attachment_file" | "attachment_reference", HTMLElement>(fieldErrors);
  const feedbackRef = useFeedbackFocus(error, Boolean(isSubmitting), hasFieldErrors(fieldErrors));

  function resetIdempotencyKeys() {
    idempotencyKeys.current = {
      withdraw: `leave-withdraw:${crypto.randomUUID()}`,
      cancel: `leave-cancel:${crypto.randomUUID()}`,
    };
  }

  async function runAction(action: "withdraw" | "cancel") {
    if (isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;
    setError("");
    setFieldErrors({});
    const requiresEvidence = action === "withdraw" ? item.withdraw_requires_attachment : item.cancel_requires_attachment;
    const nextErrors = {
      attachment_reference: requiresEvidence && !attachmentFile ? requireText(attachmentReference, "Upload evidence or enter an evidence reference before submitting this action.") : undefined,
      attachment_file: validateUploadFile(attachmentFile, { blockedTypeMessage: "This file type is not allowed for leave evidence. Choose a document or image." }),
    };
    if (hasFieldErrors(nextErrors)) {
      setFieldErrors(nextErrors);
      setError("Review the highlighted evidence fields and try again.");
      isSubmittingRef.current = false;
      return;
    }
    if (isDemo) {
      const message = "Lifecycle actions are only available in live mode.";
      setError(message);
      setToast({ title: "Action needs attention.", message, tone: "error" });
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
        headers: { "Idempotency-Key": idempotencyKeys.current[action] },
        body,
      });
    } catch {
      const message = networkMutationMessage;
      setError(message);
      setToast({ title: "Action needs attention.", message, tone: "error" });
      setIsSubmitting(null);
      isSubmittingRef.current = false;
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFieldErrors(apiFieldErrors(payload, ["attachment_file", "attachment_reference"]));
      const message = getErrorMessage(payload, response.status);
      setError(message);
      setToast({ title: "Action needs attention.", message, tone: "error" });
      setIsSubmitting(null);
      isSubmittingRef.current = false;
      return;
    }
    const successMessage = action === "withdraw" ? "Leave request withdrawn." : item.cancel_requires_reapproval ? "Cancellation request submitted." : "Approved leave cancelled.";
    setToast({
      title: "Action saved.",
      message: successMessage,
      tone: "success",
    });
    if (onCompleted) {
      try {
        await onCompleted();
        rememberActionSuccess("/ess/leave", item.id, "Leave request updated.", successMessage);
        resetIdempotencyKeys();
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "The action was saved, but updated leave data could not be loaded. Do not submit it again.";
        setError(message);
        setToast({ title: "Refresh needed.", message, tone: "error" });
      }
      setIsSubmitting(null);
      isSubmittingRef.current = false;
      return;
    }
    setIsSubmitting(null);
    isSubmittingRef.current = false;
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), toast.tone === "error" ? ERROR_TOAST_DURATION_MS : SUCCESS_TOAST_DURATION_MS);
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
    <section ref={panelRef} className="ess-modal-section leave-lifecycle-panel">
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
      <h3 className="section-heading-soft">Lifecycle actions</h3>
      <p className="section-copy section-copy-soft">Use the policy-governed lifecycle actions below when this request needs to be pulled back or cancelled.</p>

      <div className="leave-lifecycle-panel__form">
        <label className="form-field">
          <span className="muted">Reason</span>
          <input className="input-control" value={reason} onChange={(event) => { setReason(event.target.value); resetIdempotencyKeys(); }} />
        </label>

        {needsAttachment ? (
          <label className="form-field">
            <span className="muted">
              Attachment reference
              {item.can_withdraw && item.withdraw_requires_attachment ? ` (${item.withdraw_attachment_label})` : ""}
              {item.can_cancel && item.cancel_requires_attachment ? ` (${item.cancel_attachment_label})` : ""}
            </span>
            <input className="input-control" aria-invalid={Boolean(fieldErrors.attachment_reference)} aria-describedby={fieldErrors.attachment_reference ? `lifecycle-${item.id}-reference-error` : undefined} value={attachmentReference} onChange={(event) => { setAttachmentReference(event.target.value); resetIdempotencyKeys(); setError(""); setToast(null); setFieldErrors(current => ({...current, attachment_reference: undefined})); }} />
            {fieldErrors.attachment_reference ? <span className="field-error-text" id={`lifecycle-${item.id}-reference-error`}>{fieldErrors.attachment_reference}</span> : null}
          </label>
        ) : null}

        {needsAttachment ? (
          <label className="form-field">
            <span className="muted">Evidence file</span>
            <input className="input-control" aria-invalid={Boolean(fieldErrors.attachment_file)} aria-describedby={fieldErrors.attachment_file ? `lifecycle-${item.id}-file-error` : undefined} onChange={(event) => { setAttachmentFile(event.target.files?.[0] ?? null); resetIdempotencyKeys(); setError(""); setToast(null); setFieldErrors({}); }} type="file" />
            {fieldErrors.attachment_file ? <span className="field-error-text" id={`lifecycle-${item.id}-file-error`}>{fieldErrors.attachment_file}</span> : null}
          </label>
        ) : null}

        {attachmentFile ? (
          <div className="leave-file-preview form-field--full" role="status" aria-live="polite">
            <span>
              <strong>{attachmentFile.name}</strong>
              <small>{formatFileSize(attachmentFile.size)} • Ready to upload</small>
            </span>
            <span className="queue-summary-chip">Evidence selected</span>
          </div>
        ) : null}
      </div>

      <div className="leave-lifecycle-panel__actions">
        {item.can_withdraw ? (
          <AsyncActionButton className="button button--secondary" disabled={Boolean(isSubmitting && isSubmitting !== "withdraw")} pending={isSubmitting === "withdraw"} pendingLabel="Withdrawing request" onClick={() => runAction("withdraw")} type="button">Withdraw request</AsyncActionButton>
        ) : item.withdraw_block_reason ? (
          <div className="notice">
            <strong>Withdraw unavailable.</strong>
            <span className="muted">{item.withdraw_block_reason}</span>
          </div>
        ) : null}

        {item.can_cancel ? (
          <AsyncActionButton className="button button--secondary" disabled={Boolean(isSubmitting && isSubmitting !== "cancel")} pending={isSubmitting === "cancel"} pendingLabel="Saving cancellation" onClick={() => runAction("cancel")} type="button">{cancelLabel}</AsyncActionButton>
        ) : item.cancel_block_reason ? (
          <div className="notice">
            <strong>Cancel unavailable.</strong>
            <span className="muted">{item.cancel_block_reason}</span>
          </div>
        ) : null}
      </div>

      {error ? (
        <div ref={feedbackRef} tabIndex={-1} className="notice notice--error" role="alert">
          <strong>Action needs attention.</strong>
          <span className="muted">{error}</span>
        </div>
      ) : null}
    </section>
  );
}
