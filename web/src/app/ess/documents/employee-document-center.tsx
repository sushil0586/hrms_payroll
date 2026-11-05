"use client";
import { documentUploadSnapshot, useDocumentUploadDraft } from "@/lib/ui/use-document-upload-draft";
import { storedEmployeeDocument } from "@/lib/ui/document-upload-result";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";


import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { WorkspaceFilterForm } from "@/components/patterns/workspace-filter-form";
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
import { ScopedResourceError, useScopedWorkspaceResource } from "@/lib/ui/use-scoped-workspace-resource";
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
    sort: string;
    page: number;
    page_size: number;
  };
};

type DocumentCenterFilters = Props["currentFilters"];

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

function filtersFromSearchParams(params: URLSearchParams, fallback: DocumentCenterFilters): DocumentCenterFilters {
  const requestedPage = Number(params.get("page") || "1");
  const requestedSize = Number(params.get("page_size") || String(fallback.page_size));
  const verificationStatus = params.get("verification_status") || "";
  const categoryId = params.get("category_id") || "";
  const expiryFilter = params.get("expiry_filter") || "";
  const sort = params.get("sort") || "uploaded_desc";
  return {
    q: params.get("q") || "",
    verification_status: ["pending", "verified", "rejected", "expired"].includes(verificationStatus) ? verificationStatus : "",
    category_id: /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|dc-\d+)$/i.test(categoryId) ? categoryId : "",
    expiry_filter: ["expired", "expiring", "missing_expiry"].includes(expiryFilter) ? expiryFilter : "",
    sort: ["uploaded_desc", "uploaded_asc", "title_asc", "title_desc", "category_asc", "category_desc", "status_asc", "status_desc", "expiry_asc", "expiry_desc"].includes(sort) ? sort : "uploaded_desc",
    page: Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    page_size: [5, 10, 25].includes(requestedSize) ? requestedSize : fallback.page_size,
  };
}

function documentCenterQuery(filters: DocumentCenterFilters) {
  return buildQueryString({
    ...filters,
    page: filters.page === 1 ? undefined : filters.page,
    page_size: filters.page_size === 10 ? undefined : filters.page_size,
  });
}

function documentCenterHref(filters: DocumentCenterFilters) {
  return `/ess/documents${documentCenterQuery(filters)}`;
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

function documentCenterError(payload: unknown) {
  if (payload && typeof payload === "object" && typeof (payload as { detail?: unknown }).detail === "string") {
    return String((payload as { detail: string }).detail);
  }
  return "Document history could not be updated. Your current results are still available.";
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
    maxSizeBytes: selectedRequirement?.max_upload_size_bytes ?? maxUploadSizeBytes,
    maxSizeMessage: `File is too large. Maximum upload size is ${formatFileSize(selectedRequirement?.max_upload_size_bytes ?? maxUploadSizeBytes)}.`,
    requiredMessage: "Attach the file HR needs.",
  });
  if (formValue.file && selectedRequirement?.accepted_mime_types?.length && !selectedRequirement.accepted_mime_types.includes(formValue.file.type.toLowerCase())) {
    errors.file = `This category accepts: ${selectedRequirement.accepted_mime_types.join(", ")}.`;
  }
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
  if (item.malware_scan_status === "quarantined" || item.malware_scan_status === "error") return "danger";
  if (item.malware_scan_status === "pending") return "warning";
  if (item.reupload_requested || item.verification_status === "rejected") return "danger";
  if (item.verification_status === "verified") return "success";
  if (item.expiry_label?.toLowerCase().includes("expir")) return "warning";
  return "info";
}

function documentReviewLabel(item: HrAdminEmployeeDocument) {
  if (item.malware_scan_status === "quarantined") return "Quarantined";
  if (item.malware_scan_status === "error") return "Security scan unavailable";
  if (item.malware_scan_status === "pending") return "Security scan pending";
  if (item.reupload_requested || item.verification_status === "rejected") return "Returned";
  if (item.verification_status === "verified") return "Verified";
  if (item.verification_status === "expired") return "Expired";
  if (item.verification_status === "pending") return "Pending review";
  return item.verification_status.replaceAll("_", " ");
}

function DocumentDetailModal({ item, onClose, onWithdraw }: { item: HrAdminEmployeeDocument; onClose: () => void; onWithdraw: (item: HrAdminEmployeeDocument) => void }) {
  return (
    <HrAdminActionModal
      className="accerio-dialog"
      explicitTabOrder
      closeHref="/ess/documents"
      description={`${item.category_name} - Uploaded ${formatDate(item.created_at)}`}
      eyebrow="Document detail"
      footer={(
        <>
          {item.status === "pending_replacement" && item.verification_status === "pending" ? <button className="button button--danger" onClick={() => onWithdraw(item)} type="button">Withdraw replacement</button> : null}
          {item.is_downloadable ? <AsyncDownloadButton href={`/api/me/employee-documents/${item.id}/download`} fileName={item.file_name || "employee-document"}>Download file</AsyncDownloadButton> : null}
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
            <WorkspaceStatusBadge tone={documentTone(item)}>{documentReviewLabel(item)}</WorkspaceStatusBadge>
          </div>
          <WorkspaceInformation fields={[["Version", `v${item.version_number}`], ["Document number", item.document_number || "Not set"], ["File name", item.file_name || "Not available"], ["File size", formatFileSize(item.file_size_bytes)], ["Security scan", item.malware_scan_status.replaceAll("_", " ")], ["Issued on", formatDate(item.issued_on)], ["Expires on", item.expires_on || "No expiry"], ["Expiry state", item.expiry_label], ["Review owner", item.review_owner_label || "Not assigned"], ["Review status", item.review_status_label || item.verification_status]]} />
        </section>

        {!item.is_downloadable ? <p className="notice" role="alert">{item.malware_scan_status === "quarantined" ? "This file is quarantined and cannot be opened." : item.malware_scan_status === "pending" || item.malware_scan_status === "error" ? "This file is held until its security scan completes successfully." : "No stored file is available for this record."}</p> : null}
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
  const replacementUnavailable = Boolean(
    selectedRequirement?.current_document_id &&
      (selectedRequirement.pending_replacement_id || selectedRequirement.replacement_policy !== "allowed"),
  );
  const canSubmit = Boolean(formValue.category_id && formValue.title.trim() && formValue.file && !isSubmitting && !replacementUnavailable);
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
      title={selectedRequirement?.current_document_id ? "Replace document" : "Upload document"}
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

        {selectedRequirement?.current_document_id ? <p className="section-copy">This creates a new version. The current approved file remains authoritative until HR approves the replacement.</p> : null}
        {replacementUnavailable ? <div className="notice notice--warning" role="status"><strong>Employee replacement unavailable.</strong><span>{selectedRequirement?.pending_replacement_id ? "A replacement is already awaiting HR review." : selectedRequirement?.replacement_policy === "hr_only" ? "This category can only be replaced by HR." : "Replacement is disabled for this category."}</span></div> : null}
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
              accept={selectedRequirement?.accepted_mime_types?.length ? selectedRequirement.accepted_mime_types.join(",") : undefined}
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
          {currentDocument?.is_downloadable ? <AsyncDownloadButton href={`/api/me/employee-documents/${item.current_document_id}/download`} fileName={currentDocument?.file_name || "employee-document"}>Download</AsyncDownloadButton> : null}
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
          {currentDocument && !currentDocument.is_downloadable ? <p className="notice">No stored file is available for the current record.</p> : null}
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

export function EmployeeDocumentCenter({ data: initialData, currentFilters, uploadReceipt }: Props) {
  const router = useRouter();
  const initialFilters = useRef(currentFilters);
  const [search, setSearch] = useState(currentFilters.q);
  const [verificationStatus, setVerificationStatus] = useState(currentFilters.verification_status || "all");
  const [categoryId, setCategoryId] = useState(currentFilters.category_id || "all");
  const [expiryFilter, setExpiryFilter] = useState(currentFilters.expiry_filter || "all");
  const [sort, setSort] = useState(currentFilters.sort || "uploaded_desc");
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));
  const requestDocumentCenter = useCallback(async (filters: DocumentCenterFilters, signal: AbortSignal) => {
    const response = await fetch(`/api/me/document-center${documentCenterQuery(filters)}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) throw new ScopedResourceError("Your session has expired.", 401);
    if (!response.ok || !payload || typeof payload !== "object" || !Array.isArray((payload as EssDocumentCenterResponse).items)) {
      throw new ScopedResourceError(documentCenterError(payload), response.status);
    }
    return payload as EssDocumentCenterResponse;
  }, []);
  const historyHref = useCallback((filters: DocumentCenterFilters) => `${window.location.pathname}${documentCenterQuery(filters)}`, []);
  const readHistoryQuery = useCallback(() => filtersFromSearchParams(new URLSearchParams(window.location.search), initialFilters.current), []);
  const resolveDocumentCenterQuery = useCallback((filters: DocumentCenterFilters, data: EssDocumentCenterResponse) => ({
    ...filters,
    page: data.page,
    page_size: data.page_size,
  }), []);
  const syncFilterControls = useCallback((filters: DocumentCenterFilters) => {
    setSearch(filters.q);
    setVerificationStatus(filters.verification_status || "all");
    setCategoryId(filters.category_id || "all");
    setExpiryFilter(filters.expiry_filter || "all");
    setSort(filters.sort || "uploaded_desc");
    setPageSize(String(filters.page_size));
  }, []);
  const onUnauthorized = useCallback(() => router.replace("/login"), [router]);
  const {
    data: centerData,
    query: appliedFilters,
    isPending: isFiltering,
    error: filterError,
    load: loadDocumentCenter,
  } = useScopedWorkspaceResource({
    initialData,
    initialQuery: currentFilters,
    request: requestDocumentCenter,
    resolveQuery: resolveDocumentCenterQuery,
    historyHref,
    readHistoryQuery,
    onApplied: syncFilterControls,
    onUnauthorized,
    fallbackError: "Document history could not be updated. Your current results are still available.",
  });
  const [formValue, setFormValue] = useState<UploadFormValue>({
    ...INITIAL_UPLOAD_VALUE,
    category_id: initialData.uploadable_categories[0]?.id ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [feedback, setFeedback] = useState<UploadFeedback | null>(null);
  const [pageFeedback, setPageFeedback] = useState<UploadFeedback | null>(() => {
    if (!uploadReceipt) return null;
    const saved = initialData.items.find((item) => item.id === uploadReceipt.id);
    const status = saved?.verification_status ?? uploadReceipt.status;
    return { tone: "success", message: `${saved ? `${saved.file_name} · v${saved.version_number}. ` : "Document stored. History follows the current filters. "}${status === "verified" ? "Accepted automatically by the category policy." : "Submitted for HR verification."}` };
  });
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<UploadFieldErrors>({});
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadBaseline, setUploadBaseline] = useState("");
  const uploadDirty = isUploadOpen && documentUploadSnapshot(formValue) !== uploadBaseline;
  useDocumentUploadDraft(uploadDirty, isSubmitting);
  const receiptRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (pageFeedback?.tone === "success") receiptRef.current?.focus(); }, [pageFeedback]);
  const [selectedDocument, setSelectedDocument] = useState<HrAdminEmployeeDocument | null>(null);
  const [withdrawDocument, setWithdrawDocument] = useState<HrAdminEmployeeDocument | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [selectedRequirementDetail, setSelectedRequirementDetail] = useState<EssDocumentRequirementItem | null>(null);
  const selectedRequirement = centerData.requirement_items.find((item) => item.category_id === formValue.category_id);
  const reuploadItems = centerData.requirement_items.filter((item) => item.current_rejection_reason);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const uploadInFlight = useRef(false);
  const uploadIdempotencyKey = useRef(`ess-document-upload:${crypto.randomUUID()}`);
  const modal = mounted
    ? (
        <>
          {isUploadOpen ? createPortal(
            <UploadDocumentModal
              data={centerData}
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
            <DocumentDetailModal item={selectedDocument} onClose={() => setSelectedDocument(null)} onWithdraw={(item) => { setSelectedDocument(null); setWithdrawDocument(item); }} />,
            document.body,
          ) : null}

          {withdrawDocument ? createPortal(
            <HrAdminActionModal
              className="accerio-dialog accerio-dialog--compact"
              closeHref="/ess/documents"
              description="The approved document remains active. Only this pending replacement will be withdrawn."
              eyebrow="Confirm withdrawal"
              footer={<><button className="button button--secondary" disabled={isWithdrawing} onClick={() => setWithdrawDocument(null)} type="button">Keep replacement</button><button className="button button--danger" disabled={isWithdrawing} onClick={handleWithdrawReplacement} type="button">{isWithdrawing ? "Withdrawing…" : "Withdraw replacement"}</button></>}
              labelledBy="withdraw-document-title"
              onClose={() => { if (!isWithdrawing) setWithdrawDocument(null); }}
              title="Withdraw pending replacement?"
            ><p>This removes the candidate from HR review and records an audit event. The previously approved file is not changed.</p></HrAdminActionModal>,
            document.body,
          ) : null}

          {selectedRequirementDetail ? createPortal(
            <RequirementDetailModal
              currentDocument={centerData.items.find((item) => item.id === selectedRequirementDetail.current_document_id)}
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
      category_id: requirement?.category_id ?? centerData.uploadable_categories[0]?.id ?? "",
      title: requirement?.current_document_title || requirement?.category_name || "",
    };
    setFormValue(initial);
    setUploadBaseline(documentUploadSnapshot(initial));
    setIsUploadOpen(true);
  }

  async function handleWithdrawReplacement() {
    if (!withdrawDocument || isWithdrawing) return;
    setIsWithdrawing(true);
    try {
      const result = await fetch(`/api/me/employee-documents/${withdrawDocument.id}/withdraw`, { method: "POST" });
      const payload = await result.json().catch(() => ({}));
      if (!result.ok) throw new Error(String(payload.detail || "The replacement could not be withdrawn."));
      setWithdrawDocument(null);
      setSelectedDocument(null);
      const message = "The pending replacement was withdrawn. Your approved document remains active.";
      setPageFeedback({ tone: "success", message });
      setToast({ title: "Replacement withdrawn.", message, tone: "success" });
      await loadDocumentCenter(appliedFilters, "none");
    } catch (error) {
      setToast({ title: "Withdrawal failed.", message: error instanceof Error ? error.message : "The replacement could not be withdrawn.", tone: "error" });
    } finally {
      setIsWithdrawing(false);
    }
  }

  function draftFilters(page = 1): DocumentCenterFilters {
    return {
      q: search.trim(),
      verification_status: verificationStatus !== "all" ? verificationStatus : "",
      category_id: categoryId !== "all" ? categoryId : "",
      expiry_filter: expiryFilter !== "all" ? expiryFilter : "",
      sort,
      page_size: Number(pageSize) || appliedFilters.page_size,
      page,
    };
  }

  function goToPage(page: number) {
    if (isFiltering) return;
    void loadDocumentCenter({ ...appliedFilters, page });
  }

  function updateUploadField<Key extends keyof UploadFormValue>(key: Key, value: UploadFormValue[Key]) {
    uploadIdempotencyKey.current = `ess-document-upload:${crypto.randomUUID()}`;
    setFeedback(null);
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadInFlight.current) return;
    setFeedback(null);
    setPageFeedback(null);

    const nextFieldErrors = validateUploadForm(formValue, selectedRequirement, centerData.max_upload_size_bytes);
    if (hasFieldErrors(nextFieldErrors)) {
      const message = "Review the highlighted document fields and try again.";
      setFieldErrors(nextFieldErrors);
      setFeedback({ tone: "error", message });
      return;
    }

    setFieldErrors({});
    uploadInFlight.current = true;
    setIsSubmitting(true);
    setUploadProgress({ loaded: 0, total: formValue.file?.size ?? null });

    const body = new FormData();
    body.set("category_id", formValue.category_id);
    if (selectedRequirement?.current_document_id) {
      body.set("replace_document_id", selectedRequirement.current_document_id);
    }
    body.set("title", formValue.title);
    body.set("document_number", formValue.document_number);
    if (formValue.issued_on) body.set("issued_on", formValue.issued_on);
    if (formValue.expires_on) body.set("expires_on", formValue.expires_on);
    if (formValue.file) body.set("file", formValue.file);

    let storedDocument: HrAdminEmployeeDocument | null = null;
    try {
      const response = await uploadFormData("/api/me/employee-documents", body, {
        onProgress: setUploadProgress,
        headers: { "Idempotency-Key": uploadIdempotencyKey.current },
      });
      if (!response.ok) {
        const message = response.status >= 500 ? "Upload outcome could not be confirmed. Check document history before retrying; your draft is retained." : extractError(response.payload);
        const fields: UploadFieldErrors = {};
        if (response.payload && typeof response.payload === "object") for (const [key, value] of Object.entries(response.payload)) {
          if (["category_id", "title", "document_number", "issued_on", "expires_on", "file"].includes(key)) fields[key as keyof UploadFormValue] = Array.isArray(value) ? String(value[0]) : String(value);
        }
        setFieldErrors(fields);
        setFeedback({
          tone: "error",
          message: Object.keys(fields).length > 0 ? "Review the highlighted document fields and try again." : message,
        });
        if (response.status >= 500) setToast({ title: "Upload failed.", message, tone: "error" });
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
      category_id: centerData.uploadable_categories[0]?.id ?? "",
    });
    setIsUploadOpen(false);
    setFeedback(null);
    const message = `${storedDocument?.file_name || "Document"} · v${storedDocument?.version_number ?? 1}. ${storedDocument?.verification_status === "verified" ? "Accepted automatically by the category policy." : "Submitted for HR verification."}`;
    setPageFeedback({ tone: "success", message });
    setToast({ title: "Document uploaded successfully.", message, tone: "success" });
    const query = new URLSearchParams(documentCenterQuery(appliedFilters).replace(/^\?/, ""));
    query.set("uploaded_document", storedDocument!.id);
    query.set("upload_result", storedDocument!.verification_status);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${query.toString()}`);
    await loadDocumentCenter(appliedFilters, "none");
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <fieldset className="queue-list ess-document-center" disabled={!mounted} data-hydrated={mounted} aria-label="Employee documents">
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
      {pageFeedback ? (
          <div ref={receiptRef} tabIndex={-1} className={`notice ${pageFeedback.tone === "success" ? "notice--success" : "notice--error"}`} role={pageFeedback.tone === "success" ? "status" : "alert"}>
            <strong>{pageFeedback.tone === "success" ? "Document uploaded successfully." : "Document upload failed."}</strong>
            <span className="muted">{pageFeedback.message}</span>
          </div>
      ) : null}
      <WorkspaceStandardPanel title="Document status" description="Track your assigned requirements and HR review." actions={<button className="button button--primary" disabled={centerData.uploadable_categories.length === 0} onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); openUpload(); }} type="button">Upload document</button>}>
        <div>
        {centerData.uploadable_categories.length === 0 ? <p className="ess-section-note">Employee uploads are unavailable for your assigned categories.</p> : null}
        <div className="attendance-summary-strip" aria-label="All your documents">
          <span><strong>{centerData.summary.missing_required_document_count}</strong> missing required</span>
          <span><strong>{centerData.summary.pending_documents}</strong> pending review</span>
          <span><strong>{centerData.summary.expired_documents}</strong> expired</span>
          <span><strong>{centerData.summary.total_documents}</strong> uploaded in total</span>
        </div>
        </div>
      </WorkspaceStandardPanel>

      <WorkspaceStandardPanel title="Required documents" description="Review each assigned requirement and upload where permitted.">
          {centerData.requirement_items.length === 0 ? <p className="ess-empty">No document requirements are assigned.</p> : null}
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
                  {centerData.requirement_items.map((item) => (
                    <tr key={item.rule_id}>
                      <td className="workspace-table__primary-cell">
                        <div>
                          <strong>{item.category_name}</strong>
                          <span>{item.requires_verification ? "Review required" : "Auto accepted"}{item.is_future_due ? " - Future due" : ""}</span>
                        </div>
                      </td>
                      <td>
                        <WorkspaceStatusBadge tone={requirementTone(item)}>{getRequirementStatus(item)}</WorkspaceStatusBadge>
                        <span className="workspace-table__secondary">{item.pending_replacement_id ? "Replacement pending HR review" : !item.allow_employee_upload && !item.current_document_id ? "HR upload required" : item.current_rejection_reason ? "Re-upload requested" : item.current_review_status_label || item.current_verification_status || "Pending upload"}</span>
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
                            <button className="button button--primary" disabled={Boolean(item.pending_replacement_id || (item.current_document_id && item.replacement_policy !== "allowed"))} onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); openUpload(item); }} type="button">
                              {item.pending_replacement_id ? "Under review" : item.current_document_id && item.replacement_policy === "hr_only" ? "HR managed" : item.current_document_id && item.replacement_policy === "prohibited" ? "Replacement unavailable" : item.current_document_id ? "Replace" : "Upload"}
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

      <section className="queue-list" aria-busy={isFiltering} data-updating={isFiltering}>
        <WorkspaceStandardPanel title="Document history" description="Search submitted files, download copies and review HR comments.">
          <p className="section-copy" aria-live="polite">{centerData.total_count} matching documents · {centerData.items.length} on this page. Filters apply to history; requirements and summary cover your assigned documents.</p>
          {isFiltering ? <div className="notice notice--quiet" role="status"><strong>Updating document history…</strong><span className="muted">The rest of the Documents workspace remains available.</span></div> : null}
          {filterError ? <div className="notice notice--error" role="alert"><strong>Document history was not updated.</strong><span>{filterError}</span></div> : null}
          <WorkspaceFilterForm
            action="/ess/documents"
            label="Document history filters"
            onSubmit={(event) => {
              event.preventDefault();
              void loadDocumentCenter(draftFilters(1));
            }}
            pending={isFiltering}
            updateMode="scoped"
          >
            <WorkspaceFilterBar>
              <label className="form-field">
                <span className="muted">Search</span>
                <input className="input-control" disabled={isFiltering} name="q" onChange={(event) => setSearch(event.target.value)} placeholder="Category, title, file, note" value={search} />
              </label>
              <label className="form-field">
                <span className="muted">Verification</span>
                <select className="input-control" disabled={isFiltering} name="verification_status" onChange={(event) => setVerificationStatus(event.target.value)} value={verificationStatus}>
                  <option value="all">All verification states</option>
                  {centerData.verification_statuses.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Category</span>
                <select className="input-control" disabled={isFiltering} name="category_id" onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
                  <option value="all">All categories</option>
                  {centerData.categories.map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Expiry focus</span>
                <select className="input-control" disabled={isFiltering} name="expiry_filter" onChange={(event) => setExpiryFilter(event.target.value)} value={expiryFilter}>
                  <option value="all">All documents</option>
                  <option value="expiring">Expiring soon</option>
                  <option value="expired">Expired</option>
                  <option value="missing_expiry">Missing expiry</option>
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Sort by</span>
                <select className="input-control" disabled={isFiltering} name="sort" onChange={(event) => setSort(event.target.value)} value={sort}>
                  <option value="uploaded_desc">Newest upload</option><option value="uploaded_asc">Oldest upload</option><option value="title_asc">Title A-Z</option><option value="title_desc">Title Z-A</option><option value="category_asc">Category A-Z</option><option value="category_desc">Category Z-A</option><option value="status_asc">Verification status A-Z</option><option value="status_desc">Verification status Z-A</option><option value="expiry_asc">Expiry earliest</option><option value="expiry_desc">Expiry latest</option>
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Rows per page</span>
                <select className="input-control" disabled={isFiltering} name="page_size" onChange={(event) => setPageSize(event.target.value)} value={pageSize}>
                  {[5, 10, 25].map((value) => (
                    <option key={value} value={String(value)}>{value}</option>
                  ))}
                </select>
              </label>
              <button className="button button--primary" disabled={isFiltering} type="submit">{isFiltering ? "Applying…" : "Apply filters"}</button>
              <button
                className="button button--ghost"
                disabled={isFiltering}
                onClick={() => {
                  setSearch("");
                  setVerificationStatus("all");
                  setCategoryId("all");
                  setExpiryFilter("all");
                  setSort("uploaded_desc");
                  setPageSize("10");
                  void loadDocumentCenter({ q: "", verification_status: "", category_id: "", expiry_filter: "", sort: "uploaded_desc", page: 1, page_size: 10 });
                }}
                type="button"
              >
                Clear filters
              </button>
            </WorkspaceFilterBar>
          </WorkspaceFilterForm>

          <WorkspaceTableScrollRegion className="workspace-table-scroll workspace-table-region" label="Document records table">
            <table className="workspace-table " aria-label="Document history">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Expiry</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {centerData.items.map((item) => (
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
                      <WorkspaceStatusBadge tone={documentTone(item)}>{documentReviewLabel(item)}</WorkspaceStatusBadge>
                      <span className="workspace-table__secondary">{item.reupload_requested ? "Re-upload requested" : item.review_owner_label || "Not assigned"}</span>
                    </td>
                    <td>
                      <strong>{item.expiry_label}</strong>
                      <span className="workspace-table__secondary">{item.expires_on ? formatDate(item.expires_on) : "No expiry"}</span>
                    </td>
                    <td>{formatDate(item.created_at)}</td>
                    <td>
                      <span className="table-actions">
                        <button className="button button--secondary" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); setSelectedDocument(item); }} type="button">View</button>
                        {item.is_downloadable ? <AsyncDownloadButton className="button button--ghost" href={`/api/me/employee-documents/${item.id}/download`} fileName={item.file_name || "employee-document"}>Download</AsyncDownloadButton> : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </WorkspaceTableScrollRegion>
          {centerData.items.length === 0 ? (
              <div className="notice workspace-empty-state">
                <strong>{appliedFilters.q || appliedFilters.verification_status || appliedFilters.category_id || appliedFilters.expiry_filter ? "No documents match the current filters." : "No documents uploaded yet."}</strong>
                <span className="muted">{appliedFilters.q || appliedFilters.verification_status || appliedFilters.category_id || appliedFilters.expiry_filter ? "Clear one or more filters to review the full submission history." : "Check your requirements and upload where permitted."}</span>
              </div>
            ) : null}
        </WorkspaceStandardPanel>

        {centerData.total_count > 0 ? <PaginationBar
          hasNext={!isFiltering && centerData.has_next}
          hasPrevious={!isFiltering && centerData.has_previous}
          firstHref={documentCenterHref({ ...appliedFilters, page: 1 })}
          lastHref={documentCenterHref({ ...appliedFilters, page: Math.max(1, Math.ceil(centerData.total_count / centerData.page_size)) })}
          navigationMode="scoped"
          nextHref={documentCenterHref({ ...appliedFilters, page: centerData.page + 1 })}
          onFirst={() => goToPage(1)}
          onLast={() => goToPage(Math.max(1, Math.ceil(centerData.total_count / centerData.page_size)))}
          onNext={() => goToPage(centerData.page + 1)}
          onPrevious={() => goToPage(centerData.page - 1)}
          page={centerData.page}
          pageSize={centerData.page_size}
          pending={isFiltering}
          previousHref={documentCenterHref({ ...appliedFilters, page: centerData.page - 1 })}
          totalCount={centerData.total_count}
        /> : null}
      </section>

      {modal}
    </fieldset>
  );
}
