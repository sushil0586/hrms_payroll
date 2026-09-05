"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { HrAdminEmployeeDocument, HrAdminEnumOption } from "@/lib/types";

type Props = {
  item: HrAdminEmployeeDocument;
  verificationStatusOptions: HrAdminEnumOption[];
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to update employee document.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to update employee document.");
}

export function EmployeeDocumentInlineReview({ item, verificationStatusOptions }: Props) {
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
    const response = await fetch(`/api/hr-admin/employee-documents/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verification_status: nextVerificationStatus,
        rejection_reason: reviewNote,
        reupload_requested: nextReuploadRequested,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }
    setVerificationStatus(nextVerificationStatus);
    setReuploadRequested(nextReuploadRequested);
    setSuccessMessage("Document review updated.");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <div className="inline-review-panel">
      <div className="inline-review-panel__header">
        <div>
          <h3>Quick review</h3>
          <p className="section-copy section-copy-soft">Update the verification outcome in place, or open the full review page.</p>
        </div>
        <Link className="button button--secondary" href={`/hr-admin/employee-documents/${item.id}/review`}>
          Full review
        </Link>
      </div>
      <div className="form-grid">
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
                {option.label}
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
        <span className="muted">Quick review updates the queue immediately.</span>
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
