"use client";
import { documentUploadSnapshot, useDocumentUploadDraft } from "@/lib/ui/use-document-upload-draft";
import { storedEmployeeDocument } from "@/lib/ui/document-upload-result";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";


import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { ActionToast } from "@/components/patterns/action-toast";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { AsyncDownloadButton } from "@/components/patterns/async-download-button";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { UploadProgressStatus } from "@/components/patterns/upload-progress";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceFilterBar, WorkspaceStatusBadge, WorkspaceStandardPanel } from "@/components/patterns/workspace-standard";
import { WorkspaceInformation } from "@/components/patterns/workspace-information";
import { essDocumentDate } from "@/lib/ui/employee-document-format";
import type { EssDocumentCenterResponse, EssDocumentRequirementItem, HrAdminEmployeeDocument } from "@/lib/types";
import { uploadFormData, type UploadProgress } from "@/lib/ui/upload-form-data";
import {
  hasFieldErrors,
  requireText,
  requireValue,
  validateDateNotFuture,
  validateDateNotPast,
  validateDateOrder,
  validateUploadFile,
  type FieldErrors,
} from "@/lib/ui/validation";

type Props = {
  data: EssDocumentCenterResponse;
  uploadReceipt?: { id: string; status: "pending" | "verified" };
  currentFilters: {
    q: string;
    verification_status: string;
    category_id: string;
    expiry_filter: string;
    page: number;
    page_size: number;
  };
};

type UploadFormValue = {
  category_id: string;
  title: string;
  document_number: string;
  issued_on: string;
  expires_on: string;
  file: File | null;
};

type UploadFeedback = {
  tone: "success" | "error";
  message: string;
};

type UploadFieldErrors = FieldErrors<keyof UploadFormValue>;

const INITIAL_UPLOAD_VALUE: UploadFormValue = {
  category_id: "",
  title: "",
  document_number: "",
  issued_on: "",
  expires_on: "",
  file: null,
};

function buildQueryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
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

const formatDate = essDocumentDate;

function extractError(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Unable to upload employee document.";
  }
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) {
      return String(value[0]);
    }
    if (typeof value === "string") {
      return value;
    }
  }
  return "Unable to upload employee document.";
}

function validateUploadForm(
  formValue: UploadFormValue,
  selectedRequirement: EssDocumentRequirementItem | undefined,
  maxUploadSizeBytes: number,
) {
  const errors: UploadFieldErrors = {};
  errors.category_id = requireValue(formValue.category_id, "Select the document category before uploading.");
  errors.title = requireText(formValue.title, "Enter a clear document title.");
  errors.file = validateUploadFile(formValue.file, {
    blockedTypeMessage: "Executable or script files are not allowed. Upload a PDF, image, or document file.",
    maxSizeBytes: maxUploadSizeBytes,
    maxSizeMessage: `File is too large. Maximum upload size is ${formatFileSize(maxUploadSizeBytes)}.`,
    requiredMessage: "Attach the file HR needs.",
  });
  errors.expires_on =
    (selectedRequirement?.requires_expiry_date ? requireValue(formValue.expires_on, "Enter the expiry date for this document category.") : undefined) ??
    validateDateOrder(formValue.issued_on, formValue.expires_on, "Expiry date cannot be earlier than issued on date.") ??
    validateDateNotPast(formValue.expires_on, "Expiry date cannot be in the past for a fresh upload.");
  errors.issued_on = validateDateNotFuture(formValue.issued_on, "Issued on date cannot be in the future.");

  return errors;
}


function getRequirementStatus(item: EssDocumentRequirementItem) {
  if (item.current_rejection_reason) {
    return "Returned by HR";
  }
  if (item.current_is_expired) {
    return "Expired";
  }
  if (item.current_is_expiring_soon) {
    return "Expiring soon";
  }
  if (!item.current_document_id) {
    return item.is_future_due ? "Future due" : "Missing";
  }
  if (item.is_compliant) {
    return "Complete";
  }
  return "Pending review";
}

function getRequirementSummary(item: EssDocumentRequirementItem) {
  if (item.current_rejection_reason) {
    return item.current_rejection_reason;
  }
  if (!item.current_document_id) {
    return item.due_on ? `Due ${item.due_on}` : "Upload this document when HR asks for it.";
  }
  if (item.current_is_expired) {
    return "Upload a renewed copy so HR can verify it again.";
  }
  if (item.current_is_expiring_soon) {
    return "Renew this document before it expires.";
  }
  if (item.is_compliant) {
    return "No action needed right now.";
  }
  return item.current_review_status_label || "HR review is pending.";
}

function requirementTone(item: EssDocumentRequirementItem) {
  if (item.is_future_due && !item.current_document_id) return "neutral";
  if (item.is_compliant) return "success";
  if (item.current_rejection_reason || item.current_is_expired || !item.current_document_id) return "danger";
  if (item.current_is_expiring_soon) return "warning";
  return "info";
}

function documentTone(item: HrAdminEmployeeDocument) {
  if (item.reupload_requested || item.verification_status === "rejected") return "danger";
  if (item.verification_status === "verified") return "success";
  if (item.expiry_label?.toLowerCase().includes("expir")) return "warning";
  return "info";
}

function DocumentDetailModal({ item, onClose }: { item: HrAdminEmployeeDocument; onClose: () => void }) {
  return (
    <HrAdminActionModal
      className="accerio-dialog"
      explicitTabOrder
      closeHref="/ess/documents"
      description={`${item.category_name} - Uploaded ${formatDate(item.created_at)}`}
      eyebrow="Document detail"
      footer={(
        <>
          {item.artifact_id ? <AsyncDownloadButton href={`/api/me/employee-documents/${item.id}/download`} fileName={item.file_name || "employee-document"}>Download file</AsyncDownloadButton> : null}
          <button className="button button--primary" onClick={onClose} type="button">Close</button>
        </>
      )}
      labelledBy="ess-document-detail-title"
      onClose={onClose}
      title={item.title}
    >
        <section className="ess-modal-section">
          <div className="ess-documents-detail-header">
            <div>
              <span className="workspace-card__eyebrow">Current review</span>
              <h3>{item.review_status_label || item.verification_status}</h3>
            </div>
            <WorkspaceStatusBadge tone={documentTone(item)}>{item.review_status_label || item.verification_status}</WorkspaceStatusBadge>
          </div>
          <WorkspaceInformation fields={[["Version", `v${item.version_number}`], ["Document number", item.document_number || "Not set"], ["File name", item.file_name || "Not available"], ["File size", formatFileSize(item.file_size_bytes)], ["Issued on", formatDate(item.issued_on)], ["Expires on", item.expires_on || "No expiry"], ["Expiry state", item.expiry_label], ["Review owner", item.review_owner_label || "Not assigned"], ["Review status", item.review_status_label || item.verification_status]]} />
        </section>

        {!item.artifact_id ? <p className="notice">No stored file is available for this record.</p> : null}
        <details className="ess-document-versions"><summary tabIndex={0}>Category file history ({item.version_history.length})</summary>
          <ul>{item.version_history.map((version) => <li key={version.id}>v{version.version_number} · {version.title} · {version.status}</li>)}</ul>
        </details>
        {item.rejection_reason ? (
          <section className="ess-modal-section">
            <div className="notice">
              <strong>Re-upload requested.</strong>
              <span className="muted">{item.rejection_reason}</span>
            </div>
          </section>
        ) : null}

        <section className="ess-modal-section">
          <div className="ess-documents-detail-header">
            <div>
              <span className="workspace-card__eyebrow">Audit trail</span>
              <h3>Review history</h3>
            </div>
            <span className="queue-summary-chip"><strong>{item.review_history.length}</strong> steps</span>
          </div>
          {item.review_history.length ? (
            <div className="queue-list ess-documents-audit-list">
              {item.review_history.map((review) => (
                <div className="detail-row" key={review.id}>
                  <span className="detail-label">{formatDate(review.created_at)}</span>
                  <span className="detail-value">{review.previous_status} → {review.new_status} by {review.actor_identifier || "System"}{review.comment ? ` • ${review.comment}` : ""}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="notice">
              <strong>No HR review yet.</strong>
              <span className="muted">This file has not received a verification decision.</span>
            </div>
          )}
        </section>
    </HrAdminActionModal>
  );
}

function UploadDocumentModal({
  data,
  feedback,
  fieldErrors,
  formValue,
  isSubmitting,
  dirty,
  progress,
  onClose,
  onFieldChange,
  onSubmit,
  selectedRequirement,
}: {
  data: EssDocumentCenterResponse;
  feedback: UploadFeedback | null;
  fieldErrors: UploadFieldErrors;
  formValue: UploadFormValue;
  isSubmitting: boolean;
  dirty: boolean;
  progress: UploadProgress | null;
  onClose: () => void;
  onFieldChange: <Key extends keyof UploadFormValue>(key: Key, value: UploadFormValue[Key]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  selectedRequirement: EssDocumentRequirementItem | undefined;
}) {
  const canSubmit = Boolean(formValue.category_id && formValue.title.trim() && formValue.file && !isSubmitting);
  const formId = "ess-document-upload-form";
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (feedback?.tone === "error") errorRef.current?.focus(); }, [feedback]);

  return (
    <HrAdminActionModal
      className="accerio-dialog document-upload-dialog"
      busy={isSubmitting}
      dirty={dirty}
      explicitTabOrder
      closeHref="/ess/documents"
      description="Required fields are marked with *."
      eyebrow="Employee documents"
      footer={(
        <>
          {data.uploadable_categories.length === 0 ? <span className="muted">No self-upload categories are available right now.</span> : null}
          <button className="button button--secondary" disabled={isSubmitting} onClick={() => window.dispatchEvent(new CustomEvent("hr-admin-modal:request-close"))} type="button">Cancel</button>
          <AsyncActionButton className="button button--primary" disabled={!canSubmit || data.uploadable_categories.length === 0} form={formId} pending={isSubmitting} pendingLabel="Uploading document" type="submit">
            Submit for review
          </AsyncActionButton>
        </>
      )}
      labelledBy="ess-document-upload-title"
      onClose={onClose}
      title={selectedRequirement?.current_document_id && !selectedRequirement.is_compliant ? "Replace document" : "Upload document"}
    >

        {selectedRequirement ? (
          <div className="notice notice--quiet">
            <strong>{selectedRequirement.category_name}</strong>
            <span className="muted">
              {selectedRequirement.requires_expiry_date ? "Expiry date is expected for this document. " : ""}
              {selectedRequirement.requires_verification ? "HR verification is required after upload." : "This document can be accepted automatically."}
            </span>
          </div>
        ) : null}

        {selectedRequirement?.current_document_id && !selectedRequirement.is_compliant ? <p className="section-copy">This creates a new version. The previous record is retained, and the new file follows the category review policy.</p> : null}
        <form className="ess-document-modal-form" id={formId} noValidate onSubmit={onSubmit}>
          <div className="form-field">
            <label className="muted" htmlFor="ess-upload-1">Category <strong aria-hidden="true">*</strong></label>
            <select id="ess-upload-1"
              aria-label="Category"
              aria-invalid={Boolean(fieldErrors.category_id)} aria-describedby={fieldErrors.category_id ? "ess-upload-1-error" : undefined}
              className="input-control"
              disabled={data.uploadable_categories.length === 0 || isSubmitting}
              required
              value={formValue.category_id}
              onChange={(event) => onFieldChange("category_id", event.target.value)}
            >
              <option value="">Select category</option>
              {data.uploadable_categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            {fieldErrors.category_id ? <span id="ess-upload-1-error" className="field-error-text">{fieldErrors.category_id}</span> : null}
          </div>
          <div className="form-field">
            <label className="muted" htmlFor="ess-upload-2">Title <strong aria-hidden="true">*</strong></label>
            <input id="ess-upload-2"
              aria-label="Title"
              aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? "ess-upload-2-error" : undefined}
              className="input-control"
              disabled={isSubmitting}
              placeholder="Aadhaar card, PAN card, bank proof..."
              required
              maxLength={255} value={formValue.title}
              onChange={(event) => onFieldChange("title", event.target.value)}
            />
            {fieldErrors.title ? <span id="ess-upload-2-error" className="field-error-text">{fieldErrors.title}</span> : null}
          </div>
          <div className="form-field">
            <label className="muted" htmlFor="ess-upload-3">Document number</label>
            <input id="ess-upload-3" className="input-control" disabled={isSubmitting} maxLength={120} value={formValue.document_number} onChange={(event) => onFieldChange("document_number", event.target.value)} />
          </div>
          <div className="form-field">
            <label className="muted" htmlFor="ess-upload-4">Issued on</label>
            <input id="ess-upload-4"
              aria-label="Issued on"
              aria-invalid={Boolean(fieldErrors.issued_on)} aria-describedby={fieldErrors.issued_on ? "ess-upload-4-error" : undefined}
              className="input-control"
              disabled={isSubmitting}
              type="date"
              value={formValue.issued_on}
              onChange={(event) => onFieldChange("issued_on", event.target.value)}
            />
            {fieldErrors.issued_on ? <span id="ess-upload-4-error" className="field-error-text">{fieldErrors.issued_on}</span> : null}
          </div>
          <div className="form-field">
            <label className="muted" htmlFor="ess-upload-5">Expires on</label>
            <input id="ess-upload-5"
              aria-label="Expires on"
              aria-invalid={Boolean(fieldErrors.expires_on)} aria-describedby={fieldErrors.expires_on ? "ess-upload-5-error" : undefined}
              className="input-control"
              disabled={isSubmitting}
              type="date"
              value={formValue.expires_on}
              onChange={(event) => onFieldChange("expires_on", event.target.value)}
            />
            {fieldErrors.expires_on ? <span id="ess-upload-5-error" className="field-error-text">{fieldErrors.expires_on}</span> : null}
          </div>
          <div className="form-field form-field--full">
            <label className="muted" htmlFor="ess-upload-6">File <strong aria-hidden="true">*</strong></label>
            <input id="ess-upload-6"
              aria-label="File"
              aria-invalid={Boolean(fieldErrors.file)} aria-describedby={fieldErrors.file ? "ess-upload-6-error" : undefined}
              className="input-control"
              disabled={isSubmitting || data.uploadable_categories.length === 0}
              required
              type="file"
              onChange={(event) => onFieldChange("file", event.target.files?.[0] ?? null)}
            />
            <span className="muted">Maximum upload size: {formatFileSize(data.max_upload_size_bytes)}. The server checks category file rules on submission.</span>
            {formValue.file ? <span className="field-help-text">Selected: {formValue.file.name} · {formValue.file.size === 0 ? "0 B" : formatFileSize(formValue.file.size)}</span> : null}
            {fieldErrors.file ? <span id="ess-upload-6-error" className="field-error-text">{fieldErrors.file}</span> : null}
          </div>

          {feedback ? (
            <div ref={errorRef} tabIndex={-1} className={`notice ${feedback.tone === "success" ? "notice--success" : "notice--error"}`} role={feedback.tone === "success" ? "status" : "alert"}>
              <strong>{feedback.tone === "success" ? "Upload submitted." : "Review before continuing."}</strong>
              <span className="muted">{feedback.message}</span>
            </div>
          ) : null}
          <UploadProgressStatus awaitingConfirmation progress={progress} />

          {!canSubmit && data.uploadable_categories.length > 0 ? (
            <div className="notice notice--quiet">
              <strong>Before submitting</strong>
              <span className="muted">Select a category, enter a title, and attach the file HR needs.</span>
            </div>
          ) : null}
        </form>
    </HrAdminActionModal>
  );
}

function RequirementDetailModal({
  currentDocument,
  item,
  onClose,
  onUpload,
}: {
  currentDocument: HrAdminEmployeeDocument | undefined;
  item: EssDocumentRequirementItem;
  onClose: () => void;
  onUpload: () => void;
}) {
  return (
    <HrAdminActionModal
      className="accerio-dialog"
      explicitTabOrder
      closeHref="/ess/documents"
      description={getRequirementSummary(item)}
      eyebrow="Required document"
      footer={(
        <>
          {currentDocument?.artifact_id ? <AsyncDownloadButton href={`/api/me/employee-documents/${item.current_document_id}/download`} fileName={currentDocument?.file_name || "employee-document"}>Download</AsyncDownloadButton> : null}
          <button className="button button--secondary" onClick={onClose} type="button">Close</button>
          {item.allow_employee_upload ? (
            <button className="button button--primary" onClick={onUpload} type="button">
              {item.current_document_id && !item.is_compliant ? "Replace" : "Upload"}
            </button>
          ) : null}
        </>
      )}
      labelledBy="ess-requirement-detail-title"
      onClose={onClose}
      title={item.category_name}
    >
        <div className="ess-document-requirement-detail">
          {item.current_document_id && !currentDocument ? <p className="notice">The current file is outside this history page. Use history filters to locate its file details.</p> : null}
          {currentDocument && !currentDocument.artifact_id ? <p className="notice">No stored file is available for the current record.</p> : null}
          <section className="ess-modal-section">
            <div className="ess-documents-detail-header">
              <div>
                <span className="workspace-card__eyebrow">Current state</span>
                <h3>{getRequirementStatus(item)}</h3>
              </div>
              <WorkspaceStatusBadge tone={requirementTone(item)}>{getRequirementStatus(item)}</WorkspaceStatusBadge>
            </div>
            <WorkspaceInformation fields={[["Current file", item.current_document_title || "Not uploaded"], ["Verification", item.current_review_status_label || item.current_verification_status || "Pending upload"], ["Due on", item.due_on || "No deadline"], ["Expiry required", item.requires_expiry_date ? "Yes" : "No"], ["Uploaded at", formatDate(item.current_uploaded_at)], ["Expiry state", item.current_expiry_label], ["HR verification", item.requires_verification ? "Required" : "Auto accepted"], ["Future due", item.is_future_due ? "Yes" : "No"]]} />
          </section>

          {item.current_rejection_reason ? (
            <section className="ess-modal-section">
              <div className="notice">
                <strong>Latest review note.</strong>
                <span className="muted">{item.current_rejection_reason}</span>
              </div>
            </section>
          ) : null}

          {currentDocument ? (
            <section className="ess-modal-section">
              <div className="ess-documents-detail-header">
                <div>
                  <span className="workspace-card__eyebrow">Uploaded file</span>
                  <h3>{currentDocument.title}</h3>
                </div>
                <span className="queue-summary-chip"><strong>v{currentDocument.version_number}</strong> version</span>
              </div>
              <WorkspaceInformation fields={[["Document number", currentDocument.document_number || "Not set"], ["File name", currentDocument.file_name || "Not available"], ["File size", formatFileSize(currentDocument.file_size_bytes)], ["Issued on", formatDate(currentDocument.issued_on)], ["Expires on", currentDocument.expires_on || "No expiry"], ["Review owner", currentDocument.review_owner_label || "Not assigned"]]} />
            </section>
          ) : null}
        </div>
    </HrAdminActionModal>
  );
}

export function EmployeeDocumentCenter({ data, currentFilters, uploadReceipt }: Props) {
  const pathname = usePathname();
  const [search, setSearch] = useState(currentFilters.q);
  const [verificationStatus, setVerificationStatus] = useState(currentFilters.verification_status || "all");
  const [categoryId, setCategoryId] = useState(currentFilters.category_id || "all");
  const [expiryFilter, setExpiryFilter] = useState(currentFilters.expiry_filter || "all");
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));
  const [formValue, setFormValue] = useState<UploadFormValue>({
    ...INITIAL_UPLOAD_VALUE,
    category_id: data.uploadable_categories[0]?.id ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [feedback, setFeedback] = useState<UploadFeedback | null>(null);
  const [pageFeedback, setPageFeedback] = useState<UploadFeedback | null>(() => {
    if (!uploadReceipt) return null;
    const saved = data.items.find((item) => item.id === uploadReceipt.id);
    const status = saved?.verification_status ?? uploadReceipt.status;
    return { tone: "success", message: `${saved ? `${saved.file_name} · v${saved.version_number}. ` : "Document stored. History follows the current filters. "}${status === "verified" ? "Accepted automatically by the category policy." : "Submitted for HR verification."}` };
  });
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<UploadFieldErrors>({});
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadBaseline, setUploadBaseline] = useState("");
  const uploadDirty = isUploadOpen && documentUploadSnapshot(formValue) !== uploadBaseline;
  const uploadGuard = useDocumentUploadDraft(uploadDirty, isSubmitting);
  const receiptRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (pageFeedback?.tone === "success") receiptRef.current?.focus(); }, [pageFeedback]);
  const [selectedDocument, setSelectedDocument] = useState<HrAdminEmployeeDocument | null>(null);
  const [selectedRequirementDetail, setSelectedRequirementDetail] = useState<EssDocumentRequirementItem | null>(null);
  const selectedRequirement = data.requirement_items.find((item) => item.category_id === formValue.category_id);
  const reuploadItems = data.requirement_items.filter((item) => item.current_rejection_reason && !item.is_compliant);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const uploadInFlight = useRef(false);
  const modal = mounted
    ? (
        <>
          {isUploadOpen ? createPortal(
            <UploadDocumentModal
              data={data}
              feedback={feedback}
              fieldErrors={fieldErrors}
              formValue={formValue}
              isSubmitting={isSubmitting}
              dirty={uploadDirty}
              progress={uploadProgress}
              onClose={() => setIsUploadOpen(false)}
              onFieldChange={updateUploadField}
              onSubmit={handleUpload}
              selectedRequirement={selectedRequirement}
            />,
            document.body,
          ) : null}

          {selectedDocument ? createPortal(
            <DocumentDetailModal item={selectedDocument} onClose={() => setSelectedDocument(null)} />,
            document.body,
          ) : null}

          {selectedRequirementDetail ? createPortal(
            <RequirementDetailModal
              currentDocument={data.items.find((item) => item.id === selectedRequirementDetail.current_document_id)}
              item={selectedRequirementDetail}
              onClose={() => setSelectedRequirementDetail(null)}
              onUpload={() => {
                setSelectedRequirementDetail(null);
                openUpload(selectedRequirementDetail);
              }}
            />,
            document.body,
          ) : null}
        </>
      )
    : null;

  function openUpload(requirement?: EssDocumentRequirementItem) {
    setFeedback(null);
    setPageFeedback(null);
    setFieldErrors({});
    const initial = {
      ...INITIAL_UPLOAD_VALUE,
      category_id: requirement?.category_id ?? data.uploadable_categories[0]?.id ?? "",
      title: requirement?.current_document_title || requirement?.category_name || "",
    };
    setFormValue(initial);
    setUploadBaseline(documentUploadSnapshot(initial));
    setIsUploadOpen(true);
  }

  function goToPage(page: number, apply = false) {
    const filters = apply ? {
      q: search.trim(), verification_status: verificationStatus !== "all" ? verificationStatus : "",
      category_id: categoryId !== "all" ? categoryId : "", expiry_filter: expiryFilter !== "all" ? expiryFilter : "",
      page_size: Number(pageSize) || currentFilters.page_size,
    } : currentFilters;
    window.location.assign(new URL(`${pathname}${buildQueryString({ ...filters, page })}`, window.location.origin));
  }

  function updateUploadField<Key extends keyof UploadFormValue>(key: Key, value: UploadFormValue[Key]) {
    setFeedback(null);
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadInFlight.current) return;
    setFeedback(null);
    setPageFeedback(null);

    const nextFieldErrors = validateUploadForm(formValue, selectedRequirement, data.max_upload_size_bytes);
    if (hasFieldErrors(nextFieldErrors)) {
      const message = "Review the highlighted document fields and try again.";
      setFieldErrors(nextFieldErrors);
      setFeedback({ tone: "error", message });
      setToast({ title: "Upload failed.", message, tone: "error" });
      return;
    }

    setFieldErrors({});
    uploadInFlight.current = true;
    setIsSubmitting(true);
    setUploadProgress({ loaded: 0, total: formValue.file?.size ?? null });

    const body = new FormData();
    body.set("category_id", formValue.category_id);
    if (selectedRequirement?.current_document_id && !selectedRequirement.is_compliant) {
      body.set("replace_document_id", selectedRequirement.current_document_id);
    }
    body.set("title", formValue.title);
    body.set("document_number", formValue.document_number);
    if (formValue.issued_on) body.set("issued_on", formValue.issued_on);
    if (formValue.expires_on) body.set("expires_on", formValue.expires_on);
    if (formValue.file) body.set("file", formValue.file);

    let storedDocument: HrAdminEmployeeDocument | null = null;
    try {
      const response = await uploadFormData("/api/me/employee-documents", body, { onProgress: setUploadProgress });
      if (!response.ok) {
        const message = response.status >= 500 ? "Upload outcome could not be confirmed. Check document history before retrying; your draft is retained." : extractError(response.payload);
        const fields: UploadFieldErrors = {};
        if (response.payload && typeof response.payload === "object") for (const [key, value] of Object.entries(response.payload)) {
          if (["category_id", "title", "document_number", "issued_on", "expires_on", "file"].includes(key)) fields[key as keyof UploadFormValue] = Array.isArray(value) ? String(value[0]) : String(value);
        }
        setFieldErrors(fields);
        setFeedback({ tone: "error", message });
        setToast({ title: "Upload failed.", message, tone: "error" });
        return;
      }
      storedDocument = storedEmployeeDocument(response.payload);
      if (!storedDocument) throw new Error("Unconfirmed storage acknowledgement");
    } catch {
      const message = "Upload outcome could not be confirmed. Check document history before retrying; your draft is retained.";
      setFeedback({ tone: "error", message });
      setToast({ title: "Upload failed.", message, tone: "error" });
      return;
    } finally {
      uploadInFlight.current = false;
      setIsSubmitting(false);
      setUploadProgress(null);
    }

    setFormValue({
      ...INITIAL_UPLOAD_VALUE,
      category_id: data.uploadable_categories[0]?.id ?? "",
    });
    setIsUploadOpen(false);
    setFeedback(null);
    const message = `${storedDocument?.file_name || "Document"} · v${storedDocument?.version_number ?? 1}. ${storedDocument?.verification_status === "verified" ? "Accepted automatically by the category policy." : "Submitted for HR verification."}`;
    setPageFeedback({ tone: "success", message });
    setToast({ title: "Document uploaded successfully.", message, tone: "success" });
    const query = new URLSearchParams(window.location.search);
    query.set("uploaded_document", storedDocument!.id);
    query.set("upload_result", storedDocument!.verification_status);
    uploadGuard.complete(`${pathname}?${query.toString()}`);
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <fieldset className="queue-list ess-document-center" disabled={!mounted} data-hydrated={mounted} aria-label="Employee documents">
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
      <WorkspaceStandardPanel title="Document status" description="Track your assigned requirements and HR review." actions={<button className="button button--primary" disabled={data.uploadable_categories.length === 0} onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); openUpload(); }} type="button">Upload document</button>}>
        <div>
        {data.uploadable_categories.length === 0 ? <p className="ess-section-note">Employee uploads are unavailable for your assigned categories.</p> : null}
        {pageFeedback ? (
          <div ref={receiptRef} tabIndex={-1} className={`notice ${pageFeedback.tone === "success" ? "notice--success" : "notice--error"}`} role={pageFeedback.tone === "success" ? "status" : "alert"}>
            <strong>{pageFeedback.tone === "success" ? "Document uploaded successfully." : "Document upload failed."}</strong>
            <span className="muted">{pageFeedback.message}</span>
          </div>
        ) : null}
        <div className="attendance-summary-strip" aria-label="All your documents">
          <span><strong>{data.summary.missing_required_document_count}</strong> missing required</span>
          <span><strong>{data.summary.pending_documents}</strong> pending review</span>
          <span><strong>{data.summary.expired_documents}</strong> expired</span>
          <span><strong>{data.summary.total_documents}</strong> uploaded in total</span>
        </div>
        </div>
      </WorkspaceStandardPanel>

      <WorkspaceStandardPanel title="Required documents" description="Review each assigned requirement and upload where permitted.">
          {data.requirement_items.length === 0 ? <p className="ess-empty">No document requirements are assigned.</p> : null}
          {reuploadItems.length > 0 ? (
            <div className="notice">
              <strong>Re-upload requested.</strong>
              <span className="muted">
                {reuploadItems.length === 1
                  ? `${reuploadItems[0].category_name} needs a fresh upload after HR review.`
                  : `${reuploadItems.length} documents need a fresh upload after HR review.`}
              </span>
            </div>
          ) : null}
            <WorkspaceTableScrollRegion className="workspace-table-scroll workspace-table-region" label="Document records table">
              <table className="workspace-table " aria-label="Required documents">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Status</th>
                    <th>Due / expiry</th>
                    <th>Current file</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.requirement_items.map((item) => (
                    <tr key={item.rule_id}>
                      <td className="workspace-table__primary-cell">
                        <div>
                          <strong>{item.category_name}</strong>
                          <span>{item.requires_verification ? "Review required" : "Auto accepted"}{item.is_future_due ? " - Future due" : ""}</span>
                        </div>
                      </td>
                      <td>
                        <WorkspaceStatusBadge tone={requirementTone(item)}>{getRequirementStatus(item)}</WorkspaceStatusBadge>
                        <span className="workspace-table__secondary">{!item.allow_employee_upload && !item.current_document_id ? "HR upload required" : item.current_rejection_reason ? "Re-upload requested" : item.current_review_status_label || item.current_verification_status || "Pending upload"}</span>
                      </td>
                      <td>
                        <strong>{item.due_on || "No deadline"}</strong>
                        <span className="workspace-table__secondary">{item.current_expiry_label || (item.requires_expiry_date ? "Expiry required" : "No expiry required")}</span>
                      </td>
                      <td>
                        <strong>{item.current_document_title || "Not uploaded"}</strong>
                        <span className="workspace-table__secondary">{item.current_uploaded_at ? `Uploaded ${formatDate(item.current_uploaded_at)}` : getRequirementSummary(item)}</span>
                      </td>
                      <td>
                        <span className="table-actions">
                          <button className="button button--secondary" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); setSelectedRequirementDetail(item); }} type="button">View</button>
                          {item.allow_employee_upload ? (
                            <button className="button button--primary" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); openUpload(item); }} type="button">
                              {item.current_document_id && !item.is_compliant ? "Replace" : "Upload"}
                            </button>
                          ) : null}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </WorkspaceTableScrollRegion>
      </WorkspaceStandardPanel>

      <section className="queue-list">
        <WorkspaceStandardPanel title="Document history" description="Search submitted files, download copies and review HR comments.">
          <p className="section-copy">{data.total_count} matching documents · {data.items.length} on this page. Filters apply to history; requirements and summary cover your assigned documents.</p>
          <WorkspaceFilterBar >
              <label className="form-field">
                <span className="muted">Search</span>
                <input className="input-control" onChange={(event) => setSearch(event.target.value)} placeholder="Category, title, file, note" value={search} />
              </label>
              <label className="form-field">
                <span className="muted">Verification</span>
                <select className="input-control" onChange={(event) => setVerificationStatus(event.target.value)} value={verificationStatus}>
                  <option value="all">All verification states</option>
                  {data.verification_statuses.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Category</span>
                <select className="input-control" onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
                  <option value="all">All categories</option>
                  {data.categories.map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Expiry focus</span>
                <select className="input-control" onChange={(event) => setExpiryFilter(event.target.value)} value={expiryFilter}>
                  <option value="all">All documents</option>
                  <option value="expiring">Expiring soon</option>
                  <option value="expired">Expired</option>
                  <option value="missing_expiry">Missing expiry</option>
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Rows per page</span>
                <select className="input-control" onChange={(event) => setPageSize(event.target.value)} value={pageSize}>
                  {[5, 10, 25].map((value) => (
                    <option key={value} value={String(value)}>{value}</option>
                  ))}
                </select>
              </label>
              <button className="button button--primary" onClick={() => goToPage(1, true)} type="button">Apply filters</button>
              <button
                className="button button--ghost"
                onClick={() => {
                  setSearch("");
                  setVerificationStatus("all");
                  setCategoryId("all");
                  setExpiryFilter("all");
                  setPageSize("10");
                  window.location.assign(pathname);
                }}
                type="button"
              >
                Clear filters
              </button>
          </WorkspaceFilterBar>

          <WorkspaceTableScrollRegion className="workspace-table-scroll workspace-table-region" label="Document records table">
            <table className="workspace-table " aria-label="Document history">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Category</th>
                  <th>Review</th>
                  <th>Expiry</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td className="workspace-table__primary-cell">
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.file_name || "File not recorded"} - v{item.version_number}</span>
                      </div>
                    </td>
                    <td>
                      <strong>{item.category_name}</strong>
                      <span className="workspace-table__secondary">{item.status}</span>
                    </td>
                    <td>
                      <WorkspaceStatusBadge tone={documentTone(item)}>{item.review_status_label || item.verification_status}</WorkspaceStatusBadge>
                      <span className="workspace-table__secondary">{item.reupload_requested ? "Re-upload requested" : item.review_owner_label || "Not assigned"}</span>
                    </td>
                    <td>
                      <strong>{item.expiry_label}</strong>
                      <span className="workspace-table__secondary">{item.expires_on ? formatDate(item.expires_on) : "No expiry"}</span>
                    </td>
                    <td>{formatDate(item.created_at)}</td>
                    <td>
                      <span className="table-actions">
                        <button className="button button--secondary" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); setSelectedDocument(item); }} type="button">Review</button>
                        {item.artifact_id ? <AsyncDownloadButton className="button button--ghost" href={`/api/me/employee-documents/${item.id}/download`} fileName={item.file_name || "employee-document"}>Download</AsyncDownloadButton> : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </WorkspaceTableScrollRegion>
          {data.items.length === 0 ? (
              <div className="notice workspace-empty-state">
                <strong>{currentFilters.q || currentFilters.verification_status || currentFilters.category_id || currentFilters.expiry_filter ? "No documents match the current filters." : "No documents uploaded yet."}</strong>
                <span className="muted">{currentFilters.q || currentFilters.verification_status || currentFilters.category_id || currentFilters.expiry_filter ? "Clear one or more filters to review the full submission history." : "Check your requirements and upload where permitted."}</span>
              </div>
            ) : null}
        </WorkspaceStandardPanel>

        <PaginationBar
          hasNext={data.has_next}
          hasPrevious={data.has_previous}
          onFirst={() => goToPage(1)}
          onLast={() => goToPage(Math.max(1, Math.ceil(data.total_count / data.page_size)))}
          onNext={() => goToPage(data.page + 1)}
          onPrevious={() => goToPage(data.page - 1)}
          page={data.page}
          pageSize={data.page_size}
          totalCount={data.total_count}
        />
      </section>

      {modal}
    </fieldset>
  );
}
