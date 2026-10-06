"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { PaginationBar } from "@/components/patterns/pagination-bar";
import type { EssDocumentCenterResponse, EssDocumentRequirementItem, HrAdminEmployeeDocument } from "@/lib/types";

type Props = {
  data: EssDocumentCenterResponse;
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

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

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

function useEscapeClose(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
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

function DocumentDetailModal({ item, onClose }: { item: HrAdminEmployeeDocument; onClose: () => void }) {
  useEscapeClose(onClose);

  return (
    <div className="modal-shell" role="presentation">
      <div aria-label="Document detail" aria-modal="true" className="modal ess-document-modal ess-document-modal--wide" role="dialog">
        <div className="modal__header">
          <div>
            <h2>{item.title}</h2>
            <p>{item.category_name} • Uploaded {formatDate(item.created_at)}</p>
          </div>
          <button aria-label="Close document detail" className="button button--secondary" onClick={onClose} type="button">Close</button>
        </div>

        <section className="ess-modal-section">
          <div className="ess-documents-detail-header">
            <div>
              <span className="workspace-card__eyebrow">Current review</span>
              <h3>{item.review_status_label || item.verification_status}</h3>
            </div>
            <div className="record-card__actions">
              {item.artifact_id ? <Link className="button button--secondary" href={`/api/me/employee-documents/${item.id}/download`}>Download file</Link> : null}
            </div>
          </div>
          <div className="detail-grid">
            <DetailRow label="Version" value={`v${item.version_number}`} />
            <DetailRow label="Document number" value={item.document_number || "Not set"} />
            <DetailRow label="File name" value={item.file_name || "Not available"} />
            <DetailRow label="File size" value={formatFileSize(item.file_size_bytes)} />
            <DetailRow label="Issued on" value={formatDate(item.issued_on)} />
            <DetailRow label="Expires on" value={item.expires_on || "No expiry"} />
            <DetailRow label="Expiry state" value={item.expiry_label} />
            <DetailRow label="Review owner" value={item.review_owner_label || "Not assigned"} />
            <DetailRow label="Review status" value={item.review_status_label || item.verification_status} />
          </div>
        </section>

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
      </div>
    </div>
  );
}

function UploadDocumentModal({
  data,
  feedback,
  formValue,
  isSubmitting,
  onClose,
  onFieldChange,
  onSubmit,
  selectedRequirement,
}: {
  data: EssDocumentCenterResponse;
  feedback: UploadFeedback | null;
  formValue: UploadFormValue;
  isSubmitting: boolean;
  onClose: () => void;
  onFieldChange: <Key extends keyof UploadFormValue>(key: Key, value: UploadFormValue[Key]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  selectedRequirement: EssDocumentRequirementItem | undefined;
}) {
  useEscapeClose(onClose);
  const canSubmit = Boolean(formValue.category_id && formValue.title.trim() && formValue.file && !isSubmitting);

  return (
    <div className="modal-shell" role="presentation">
      <div aria-label="Upload document" aria-modal="true" className="modal ess-document-modal" role="dialog">
        <div className="modal__header">
          <div>
            <h2>{selectedRequirement?.current_document_id && !selectedRequirement.is_compliant ? "Replace document" : "Upload document"}</h2>
            <p>Choose the document type, attach the latest file, and send it to HR for review.</p>
          </div>
          <button aria-label="Close upload document dialog" className="button button--secondary" onClick={onClose} type="button">Close</button>
        </div>

        {selectedRequirement ? (
          <div className="notice notice--quiet">
            <strong>{selectedRequirement.category_name}</strong>
            <span className="muted">
              {selectedRequirement.requires_expiry_date ? "Expiry date is expected for this document. " : ""}
              {selectedRequirement.requires_verification ? "HR verification is required after upload." : "This document can be accepted automatically."}
            </span>
          </div>
        ) : null}

        <form className="ess-document-modal-form" onSubmit={onSubmit}>
          <label className="form-field">
            <span className="muted">Category</span>
            <select className="input-control" disabled={data.uploadable_categories.length === 0 || isSubmitting} required value={formValue.category_id} onChange={(event) => onFieldChange("category_id", event.target.value)}>
              <option value="">Select category</option>
              {data.uploadable_categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Title</span>
            <input className="input-control" disabled={isSubmitting} placeholder="Aadhaar card, PAN card, bank proof..." required value={formValue.title} onChange={(event) => onFieldChange("title", event.target.value)} />
          </label>
          <label className="form-field">
            <span className="muted">Document number</span>
            <input className="input-control" disabled={isSubmitting} value={formValue.document_number} onChange={(event) => onFieldChange("document_number", event.target.value)} />
          </label>
          <label className="form-field">
            <span className="muted">Issued on</span>
            <input className="input-control" disabled={isSubmitting} type="date" value={formValue.issued_on} onChange={(event) => onFieldChange("issued_on", event.target.value)} />
          </label>
          <label className="form-field">
            <span className="muted">Expires on</span>
            <input className="input-control" disabled={isSubmitting} type="date" value={formValue.expires_on} onChange={(event) => onFieldChange("expires_on", event.target.value)} />
          </label>
          <label className="form-field form-field--full">
            <span className="muted">File</span>
            <input className="input-control" disabled={isSubmitting || data.uploadable_categories.length === 0} required type="file" onChange={(event) => onFieldChange("file", event.target.files?.[0] ?? null)} />
            <span className="muted">Maximum upload size: {formatFileSize(data.max_upload_size_bytes)}.</span>
          </label>

          {feedback ? (
            <div className={`notice ${feedback.tone === "success" ? "notice--success" : ""}`}>
              <strong>{feedback.tone === "success" ? "Upload submitted." : "Upload failed."}</strong>
              <span className="muted">{feedback.message}</span>
            </div>
          ) : null}

          {!canSubmit && data.uploadable_categories.length > 0 ? (
            <div className="notice notice--quiet">
              <strong>Before submitting</strong>
              <span className="muted">Select a category, enter a title, and attach the file HR needs.</span>
            </div>
          ) : null}

          <div className="ess-document-modal-actions">
            {data.uploadable_categories.length === 0 ? <span className="muted">No self-upload categories are available right now.</span> : null}
            <button className="button button--primary" disabled={!canSubmit || data.uploadable_categories.length === 0} type="submit">
              {isSubmitting ? "Uploading..." : "Submit for review"}
            </button>
          </div>
        </form>
      </div>
    </div>
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
  useEscapeClose(onClose);

  return (
    <div className="modal-shell" role="presentation">
      <div aria-label="Required document detail" aria-modal="true" className="modal ess-document-modal ess-document-modal--wide" role="dialog">
        <div className="modal__header">
          <div>
            <span className="workspace-card__eyebrow">Required document</span>
            <h2>{item.category_name}</h2>
            <p>{getRequirementSummary(item)}</p>
          </div>
          <button aria-label="Close required document detail" className="button button--secondary" onClick={onClose} type="button">Close</button>
        </div>

        <div className="ess-document-requirement-detail">
          <section className="ess-modal-section">
            <div className="ess-documents-detail-header">
              <div>
                <span className="workspace-card__eyebrow">Current state</span>
                <h3>{getRequirementStatus(item)}</h3>
              </div>
              <div className="record-card__actions">
                {item.allow_employee_upload ? (
                  <button className="button button--primary" onClick={onUpload} type="button">
                    {item.current_document_id && !item.is_compliant ? "Replace" : "Upload"}
                  </button>
                ) : null}
                {item.current_document_id ? <Link className="button button--secondary" href={`/api/me/employee-documents/${item.current_document_id}/download`}>Download</Link> : null}
              </div>
            </div>
            <div className="detail-grid">
              <DetailRow label="Current file" value={item.current_document_title || "Not uploaded"} />
              <DetailRow label="Verification" value={item.current_review_status_label || item.current_verification_status || "Pending upload"} />
              <DetailRow label="Due on" value={item.due_on || "No deadline"} />
              <DetailRow label="Expiry required" value={item.requires_expiry_date ? "Yes" : "No"} />
              <DetailRow label="Uploaded at" value={formatDate(item.current_uploaded_at)} />
              <DetailRow label="Expiry state" value={item.current_expiry_label} />
              <DetailRow label="HR verification" value={item.requires_verification ? "Required" : "Auto accepted"} />
              <DetailRow label="Future due" value={item.is_future_due ? "Yes" : "No"} />
            </div>
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
              <div className="detail-grid">
                <DetailRow label="Document number" value={currentDocument.document_number || "Not set"} />
                <DetailRow label="File name" value={currentDocument.file_name || "Not available"} />
                <DetailRow label="File size" value={formatFileSize(currentDocument.file_size_bytes)} />
                <DetailRow label="Issued on" value={formatDate(currentDocument.issued_on)} />
                <DetailRow label="Expires on" value={currentDocument.expires_on || "No expiry"} />
                <DetailRow label="Review owner" value={currentDocument.review_owner_label || "Not assigned"} />
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function EmployeeDocumentCenter({ data, currentFilters }: Props) {
  const router = useRouter();
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
  const [feedback, setFeedback] = useState<UploadFeedback | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<HrAdminEmployeeDocument | null>(null);
  const [selectedRequirementDetail, setSelectedRequirementDetail] = useState<EssDocumentRequirementItem | null>(null);
  const selectedRequirement = data.requirement_items.find((item) => item.category_id === formValue.category_id);
  const reuploadItems = data.items.filter((item) => item.reupload_requested);
  const modal = typeof document !== "undefined"
    ? (
        <>
          {isUploadOpen ? createPortal(
            <UploadDocumentModal
              data={data}
              feedback={feedback}
              formValue={formValue}
              isSubmitting={isSubmitting}
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
    setFormValue({
      ...INITIAL_UPLOAD_VALUE,
      category_id: requirement?.category_id ?? data.uploadable_categories[0]?.id ?? "",
      title: requirement?.current_document_title || requirement?.category_name || "",
    });
    setIsUploadOpen(true);
  }

  function goToPage(page: number) {
    router.push(`${pathname}${buildQueryString({
      q: search.trim() || undefined,
      verification_status: verificationStatus !== "all" ? verificationStatus : undefined,
      category_id: categoryId !== "all" ? categoryId : undefined,
      expiry_filter: expiryFilter !== "all" ? expiryFilter : undefined,
      page,
      page_size: Number(pageSize) || currentFilters.page_size,
    })}`);
  }

  function updateUploadField<Key extends keyof UploadFormValue>(key: Key, value: UploadFormValue[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

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

    let response: Response;
    try {
      response = await fetch("/api/me/employee-documents", {
        method: "POST",
        body,
      });
    } catch {
      setFeedback({ tone: "error", message: "Unable to reach the server. Check your connection and try again." });
      setIsSubmitting(false);
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFeedback({ tone: "error", message: extractError(payload) });
      setIsSubmitting(false);
      return;
    }

    setFormValue({
      ...INITIAL_UPLOAD_VALUE,
      category_id: data.uploadable_categories[0]?.id ?? "",
    });
    setIsSubmitting(false);
    setIsUploadOpen(false);
    setFeedback({ tone: "success", message: "Your document has been sent to HR for verification." });
    router.refresh();
  }

  return (
    <div className="stack ess-documents-center">
      <section className="workspace-section ess-documents-status-section">
        <div className="workspace-section__header">
          <div>
            <h2>Document status</h2>
            <p>Current compliance, upload, and renewal focus from your mapped HR document rules.</p>
          </div>
          <div className="ess-documents-status-actions">
            <span className="queue-summary-chip"><strong>{data.summary.total_documents}</strong> uploaded</span>
            <button className="button button--primary" disabled={data.uploadable_categories.length === 0} onClick={() => openUpload()} type="button">Upload document</button>
          </div>
        </div>
        <div className="workspace-summary-grid metric-grid-modern">
          <article className="workspace-summary-card metric-tile metric-tile-soft">
            <div><span className="workspace-summary-card__icon" aria-hidden="true">RD</span><h3>Required</h3></div>
            <strong>{data.summary.required_document_count}</strong>
            <p>Required documents mapped to your profile</p>
          </article>
          <article className="workspace-summary-card metric-tile metric-tile-soft">
            <div><span className="workspace-summary-card__icon" aria-hidden="true">MS</span><h3>Missing now</h3></div>
            <strong>{data.summary.missing_required_document_count}</strong>
            <p>Needs your upload</p>
          </article>
          <article className="workspace-summary-card metric-tile metric-tile-soft">
            <div><span className="workspace-summary-card__icon" aria-hidden="true">EX</span><h3>Expiring soon</h3></div>
            <strong>{data.summary.expiring_documents}</strong>
            <p>Review before deadline</p>
          </article>
          <article className="workspace-summary-card metric-tile metric-tile-soft">
            <div><span className="workspace-summary-card__icon" aria-hidden="true">ER</span><h3>Expired</h3></div>
            <strong>{data.summary.expired_documents}</strong>
            <p>Replace immediately</p>
          </article>
        </div>
      </section>

      <section className="workspace-section">
        <div className="ess-documents-workspace">
          <section className="ess-documents-requirements workspace-data-panel">
            <div className="ess-documents-panel-header">
              <div>
                <span className="workspace-card__eyebrow">What HR needs</span>
                <h2>Required documents</h2>
                <p>Use the row actions to inspect a requirement or upload the correct file.</p>
              </div>
              <div className="ess-documents-panel-actions">
                <span className="queue-summary-chip"><strong>{data.requirement_items.length}</strong> items</span>
              </div>
            </div>
            <div className="ess-documents-checklist ess-documents-checklist--inline" aria-label="Upload checklist">
              <div><strong>Clear file</strong><span>Readable corners, names, dates, and numbers.</span></div>
              <div><strong>Correct category</strong><span>Upload each file under the matching document type.</span></div>
              <div><strong>Expiry date</strong><span>Add expiry when HR tracks renewals.</span></div>
              <div><strong>Re-upload note</strong><span>Read HR comments before replacing a returned file.</span></div>
            </div>
            <div className="ess-document-requirement-table workspace-table" role="table" aria-label="Required documents">
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
          <div className="workspace-table__row workspace-table__row--head ess-document-requirement-row" role="row">
            <span role="columnheader">Document</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Due / expiry</span>
            <span role="columnheader">Current file</span>
            <span role="columnheader">Actions</span>
          </div>
          {data.requirement_items.map((item) => (
            <div className="workspace-table__row ess-document-requirement-row" key={item.rule_id} role="row">
              <span role="cell">
                <strong>{item.category_name}</strong>
                <small>{item.requires_verification ? "Review required" : "Auto accepted"}{item.is_future_due ? " • Future due" : ""}</small>
              </span>
              <span role="cell">
                <span className={`record-chip ${item.is_compliant ? "record-chip--accent" : ""}`}>{getRequirementStatus(item)}</span>
                <small>{item.current_rejection_reason ? "Re-upload requested" : item.current_review_status_label || item.current_verification_status || "Pending upload"}</small>
              </span>
              <span role="cell">
                <strong>{item.due_on || "No deadline"}</strong>
                <small>{item.current_expiry_label || (item.requires_expiry_date ? "Expiry required" : "No expiry required")}</small>
              </span>
              <span role="cell">
                <strong>{item.current_document_title || "Not uploaded"}</strong>
                <small>{item.current_uploaded_at ? `Uploaded ${formatDate(item.current_uploaded_at)}` : getRequirementSummary(item)}</small>
              </span>
              <span role="cell">
                <span className="ess-document-row-actions">
                  <button className="button button--secondary" onClick={() => setSelectedRequirementDetail(item)} type="button">View</button>
                  {item.allow_employee_upload ? (
                    <button className="button button--primary" onClick={() => openUpload(item)} type="button">
                      {item.current_document_id && !item.is_compliant ? "Replace" : "Upload"}
                    </button>
                  ) : null}
                </span>
              </span>
            </div>
          ))}
            </div>
          </section>
        </div>
      </section>

      <section className="workspace-section ess-documents-history">
        <section className="workspace-data-panel">
          <div className="workspace-data-panel__header">
            <div>
              <h2>Document history</h2>
              <p>Search submitted files, download a copy, and review HR comments.</p>
            </div>
            <div className="queue-toolbar__meta">
              <span className="queue-summary-chip"><strong>{data.total_count}</strong> total records</span>
              <span className="queue-summary-chip"><strong>{data.items.length}</strong> on this page</span>
            </div>
          </div>
          <details className="workspace-filter-disclosure" open>
            <summary>
              <span>Filters</span>
              <small>{data.items.length} shown from the loaded page</small>
            </summary>
            <div className="ess-document-filter-grid">
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
              <button className="button button--primary" onClick={() => goToPage(1)} type="button">Apply filters</button>
              <button
                className="button button--ghost"
                onClick={() => {
                  setSearch("");
                  setVerificationStatus("all");
                  setCategoryId("all");
                  setExpiryFilter("all");
                  setPageSize("10");
                  router.push(pathname);
                }}
                type="button"
              >
                Clear filters
              </button>
            </div>
          </details>

          <div className="workspace-table ess-document-history-table" role="table" aria-label="Document history">
            <div className="workspace-table__row workspace-table__row--head" role="row">
              <span role="columnheader">Document</span>
              <span role="columnheader">Category</span>
              <span role="columnheader">Review</span>
              <span role="columnheader">Expiry</span>
              <span role="columnheader">Uploaded</span>
              <span role="columnheader">Actions</span>
            </div>
            {data.items.map((item) => (
              <div className="workspace-table__row ess-document-history-row" key={item.id} role="row">
                <span role="cell">
                  <strong>{item.title}</strong>
                  <small>{item.file_name || "File name pending"} • v{item.version_number}</small>
                </span>
                <span role="cell">
                  <strong>{item.category_name}</strong>
                  <small>{item.status}</small>
                </span>
                <span role="cell">
                  <strong>{item.review_status_label || item.verification_status}</strong>
                  <small>{item.reupload_requested ? "Re-upload requested" : item.review_owner_label || "Owner pending"}</small>
                </span>
                <span role="cell">
                  <strong>{item.expiry_label}</strong>
                  <small>{item.expires_on ? formatDate(item.expires_on) : "No expiry"}</small>
                </span>
                <span role="cell">{formatDate(item.created_at)}</span>
                <span role="cell">
                  <span className="ess-document-history-actions">
                    <button className="button button--secondary" onClick={() => setSelectedDocument(item)} type="button">Review</button>
                    {item.artifact_id ? <Link className="button button--ghost" href={`/api/me/employee-documents/${item.id}/download`}>Download</Link> : null}
                  </span>
                </span>
              </div>
            ))}
            {data.items.length === 0 ? (
              <div className="notice workspace-empty-state">
                <strong>No documents match the current filters.</strong>
                <span className="muted">Clear one or more filters to review the full submission history.</span>
              </div>
            ) : null}
          </div>
        </section>

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
    </div>
  );
}
