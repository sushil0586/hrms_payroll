"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { HrAdminEmployeeDocument, HrAdminEnumOption } from "@/lib/types";

type Props = {
  item: HrAdminEmployeeDocument;
  verificationStatusOptions: HrAdminEnumOption[];
  onSaved?: (message: string) => void;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to update employee document.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to update employee document.");
}

function humanizeStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function nextOutcomeText(status: string, reuploadRequested: boolean) {
  if (status === "verified") {
    return "Employee will see the document as verified.";
  }
  if (status === "rejected" || reuploadRequested) {
    return "Employee will see a correction request and can upload a replacement.";
  }
  if (status === "expired") {
    return "Employee will see that a renewed document is required.";
  }
  return "Document stays in the HR verification queue.";
}

export function EmployeeDocumentInlineReview({ item, verificationStatusOptions, onSaved }: Props) {
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState(item.verification_status);
  const [reviewNote, setReviewNote] = useState(item.rejection_reason || "");
  const [reuploadRequested, setReuploadRequested] = useState(item.reupload_requested);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave(overrides?: { verificationStatus?: string; reuploadRequested?: boolean }) {
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);
    const nextVerificationStatus = overrides?.verificationStatus ?? verificationStatus;
    const nextReuploadRequested = overrides?.reuploadRequested ?? reuploadRequested;
    let response: Response;
    try {
      response = await fetch(`/api/hr-admin/employee-documents/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verification_status: nextVerificationStatus,
          rejection_reason: reviewNote,
          reupload_requested: nextReuploadRequested,
        }),
      });
    } catch {
      setError("Unable to reach the server. Check your connection and try again.");
      setIsSubmitting(false);
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }
    setVerificationStatus(nextVerificationStatus);
    setReuploadRequested(nextReuploadRequested);
    const message = "Document review updated.";
    setSuccessMessage(message);
    setIsSubmitting(false);
    onSaved?.(message);
    router.refresh();
  }

  return (
    <div className="inline-review-panel document-inline-review-panel">
      <div className="inline-review-panel__header">
        <div>
          <h3>Quick review</h3>
          <p className="section-copy section-copy-soft">Update outcome and follow-up without leaving the queue.</p>
        </div>
        <Link className="button button--secondary" href={`/hr-admin/employee-documents/${item.id}/review`}>
          Full review
        </Link>
      </div>
      <div className="document-inline-status">
        <div>
          <span>Current</span>
          <strong>{item.review_status_label}</strong>
        </div>
        <div>
          <span>After save</span>
          <strong>{nextOutcomeText(verificationStatus, reuploadRequested)}</strong>
        </div>
      </div>
      <div className="form-grid document-inline-review-grid">
        <label className="form-field">
          <span className="muted">Verification status</span>
          <select
            className="input-control"
            disabled={isSubmitting}
            onChange={(event) => setVerificationStatus(event.target.value)}
            value={verificationStatus}
          >
            {verificationStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label || humanizeStatus(option.value)}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field form-field--full">
          <span className="muted">Review note</span>
          <textarea
            className="input-control"
            disabled={isSubmitting}
            onChange={(event) => setReviewNote(event.target.value)}
            rows={4}
            value={reviewNote}
          />
        </label>
        <label className="form-field form-field--full">
          <span className="muted">Re-upload requested</span>
          <select
            className="input-control"
            disabled={isSubmitting}
            onChange={(event) => setReuploadRequested(event.target.value === "true")}
            value={String(reuploadRequested)}
          >
            <option value="false">No follow-up requested</option>
            <option value="true">Request a replacement upload</option>
          </select>
        </label>
      </div>
      {error ? (
        <div className="notice notice--error" role="alert">
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
        <span className="muted">Queue updates immediately after save.</span>
        <div className="form-actions-bar__buttons">
          <button
            className="button button--ghost"
            disabled={isSubmitting}
            onClick={() => handleSave({ verificationStatus: "rejected", reuploadRequested: true })}
            type="button"
          >
            Request re-upload
          </button>
          <button className="button button--primary" disabled={isSubmitting} onClick={() => handleSave()} type="button">
            {isSubmitting ? "Saving..." : "Save review"}
          </button>
        </div>
      </div>
    </div>
  );
}
