"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormSection } from "@/components/patterns/form-section";
import type {
  HrAdminDocumentOptions,
  HrAdminEmployeeDocument,
  HrAdminEmployeeDocumentWriteInput,
} from "@/lib/types";

type Props = {
  document: HrAdminEmployeeDocument;
  initialValue: HrAdminEmployeeDocumentWriteInput;
  options: HrAdminDocumentOptions;
  itemId: string;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to update employee document.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to update employee document.");
}

function formatFileSize(fileSizeBytes: number) {
  if (fileSizeBytes <= 0) {
    return "Not available";
  }
  if (fileSizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(fileSizeBytes / 1024))} KB`;
  }
  return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmployeeDocumentReviewForm({ document, initialValue, options, itemId }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextValue: HrAdminEmployeeDocumentWriteInput = {
      title: String(formData.get("title") ?? ""),
      status: String(formData.get("status") ?? initialValue.status),
      verification_status: String(formData.get("verification_status") ?? initialValue.verification_status),
      document_number: String(formData.get("document_number") ?? ""),
      issued_on: String(formData.get("issued_on") ?? "") || null,
      expires_on: String(formData.get("expires_on") ?? "") || null,
      reupload_requested: String(formData.get("reupload_requested") ?? "false") === "true",
      rejection_reason: String(formData.get("rejection_reason") ?? ""),
    };
    setError("");
    setIsSubmitting(true);
    const response = await fetch(`/api/hr-admin/employee-documents/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextValue),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }
    router.push("/hr-admin/employee-documents");
    router.refresh();
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__intro">
          <h2>Document review and verification</h2>
          <p className="section-copy">
            Update the submission metadata, verify the document, and leave a clear review note for the employee or HR team.
          </p>
        </div>

        <FormSection description="Review the submission context before changing its status or verification state." title="Document context">
          <article className="record-card">
            <div className="record-card__header">
              <div className="record-card__title-block">
                <h3>{document.title}</h3>
                <p>{document.employee_name} ({document.employee_code}) • {document.category_name}</p>
              </div>
              <div className="record-card__actions">
                <span className="record-chip">{document.verification_status}</span>
                <span className="record-chip">{document.status}</span>
              </div>
            </div>
            <div className="record-card__details">
              <div><span className="record-card__label">File</span><strong>{document.file_name}</strong></div>
              <div><span className="record-card__label">Stored artifact</span><strong>{document.artifact_id || "Not linked"}</strong></div>
              <div><span className="record-card__label">Version</span><strong>v{document.version_number}</strong></div>
              <div><span className="record-card__label">Uploaded by</span><strong>{document.uploaded_by_identifier || "Unknown"}</strong></div>
              <div><span className="record-card__label">Issued on</span><strong>{document.issued_on || "Not set"}</strong></div>
              <div><span className="record-card__label">Expires on</span><strong>{document.expires_on || "No expiry"}</strong></div>
              <div><span className="record-card__label">Mime type</span><strong>{document.mime_type || "Unknown"}</strong></div>
              <div><span className="record-card__label">File size</span><strong>{formatFileSize(document.file_size_bytes)}</strong></div>
              <div><span className="record-card__label">Re-upload</span><strong>{document.reupload_requested ? "Requested" : "Not requested"}</strong></div>
            </div>
            {document.artifact_id ? (
              <div className="form-shell-card__actions form-shell-card__actions--start">
                <a className="button button--ghost" href={`/api/hr-admin/employee-documents/${itemId}/download`}>Download current file</a>
              </div>
            ) : null}
          </article>
        </FormSection>

        <FormSection description="Adjust the review outcome and document metadata in one structured panel." title="Review details">
          <div className="form-grid">
            <label className="form-field"><span className="muted">Title</span><input className="input-control" name="title" defaultValue={initialValue.title} /></label>
            <label className="form-field"><span className="muted">Status</span><select className="input-control" name="status" defaultValue={initialValue.status}>{options.employee_document_statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="form-field"><span className="muted">Verification status</span><select className="input-control" name="verification_status" defaultValue={initialValue.verification_status}>{options.verification_statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="form-field"><span className="muted">Document number</span><input className="input-control" name="document_number" defaultValue={initialValue.document_number} /></label>
            <label className="form-field"><span className="muted">Issued on</span><input className="input-control" name="issued_on" type="date" defaultValue={initialValue.issued_on ?? ""} /></label>
            <label className="form-field"><span className="muted">Expires on</span><input className="input-control" name="expires_on" type="date" defaultValue={initialValue.expires_on ?? ""} /></label>
            <label className="form-field"><span className="muted">Re-upload requested</span><select className="input-control" name="reupload_requested" defaultValue={String(initialValue.reupload_requested)}><option value="false">No</option><option value="true">Yes</option></select></label>
            <label className="form-field form-field--full"><span className="muted">Rejection reason or review note</span><textarea className="input-control" name="rejection_reason" rows={4} defaultValue={initialValue.rejection_reason} /></label>
          </div>
        </FormSection>

        <FormSection description="Version lineage is preserved when a document is replaced after rejection or re-upload requests." title="Version history">
          <div className="queue-list">
            {document.version_history.map((entry) => (
              <article className="record-card" key={entry.id}>
                <div className="record-card__header">
                  <div className="record-card__title-block">
                    <h3>Version {entry.version_number}</h3>
                    <p>{entry.file_name}</p>
                  </div>
                  <div className="record-card__actions">
                    <span className="record-chip">{entry.verification_status}</span>
                    <span className="record-chip">{entry.status}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </FormSection>

        <FormSection description="Each verification decision stays attached to the document for operational traceability." title="Review history">
          <div className="queue-list">
            {document.review_history.length ? document.review_history.map((entry) => (
              <article className="record-card" key={entry.id}>
                <div className="detail-grid">
                  <div className="detail-row"><span className="detail-label">Change</span><span className="detail-value">{entry.previous_status || "new"} to {entry.new_status}</span></div>
                  <div className="detail-row"><span className="detail-label">Actor</span><span className="detail-value">{entry.actor_identifier || "Unknown"}</span></div>
                  <div className="detail-row"><span className="detail-label">At</span><span className="detail-value">{entry.created_at}</span></div>
                  <div className="detail-row"><span className="detail-label">Comment</span><span className="detail-value">{entry.comment || "No comment"}</span></div>
                </div>
              </article>
            )) : (
              <div className="notice">
                <strong>No review history yet.</strong>
                <span className="muted">The first verification action will appear here.</span>
              </div>
            )}
          </div>
        </FormSection>

        {error ? (
          <div className="notice">
            <strong>Save failed.</strong>
            <span className="muted">{error}</span>
          </div>
        ) : null}

        <div className="form-shell-card__actions">
          <button className="button button--primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : "Save review"}
          </button>
          <button className="button button--secondary" onClick={() => router.back()} type="button">
            Cancel
          </button>
        </div>
      </section>
    </form>
  );
}
