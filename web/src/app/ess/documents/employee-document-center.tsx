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

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
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
  return "HR review is pending.";
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
              <span className="workspace-card__eyebrow">Review status</span>
              <h3>{item.verification_status}</h3>
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
            <DetailRow label="Reviewer" value={item.verified_by_identifier || "Pending review"} />
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
  const selectedRequirement = data.requirement_items.find((item) => item.category_id === formValue.category_id);
  const reuploadItems = data.items.filter((item) => item.reupload_requested);
  const missingRequirements = data.requirement_items.filter((item) => !item.current_document_id && !item.is_future_due);
  const expiringRequirements = data.requirement_items.filter((item) => item.current_is_expired || item.current_is_expiring_soon);
  const pendingReviewItems = data.items.filter((item) => item.verification_status === "pending");
  const completedRequirements = data.requirement_items.filter((item) => item.is_compliant);
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

    const response = await fetch("/api/me/employee-documents", {
      method: "POST",
      body,
    });
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
    setFeedback({ tone: "success", message: "Your document has been sent to HR for verification." });
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <div className="stack ess-documents-center">
      <section className="section section--tight">
        <div className="ess-documents-action-band panel-card-soft">
          <div>
            <span className="workspace-card__eyebrow">Next document task</span>
            <h2>{reuploadItems.length ? "Replace the documents HR returned" : "Upload only when a requirement needs action"}</h2>
            <p className="section-copy section-copy-soft">
              Keep the workspace simple: review what HR needs here, then use a focused upload dialog for the actual file.
            </p>
          </div>
          <button className="button button--primary" disabled={data.uploadable_categories.length === 0} onClick={() => openUpload()} type="button">Upload document</button>
        </div>
      </section>

      <section className="section section--tight">
        <div className="ess-documents-readiness-band panel-card-soft">
          <article className={missingRequirements.length ? "is-attention" : "is-complete"}>
            <span>Missing uploads</span>
            <strong>{missingRequirements.length}</strong>
            <p>{missingRequirements.length ? missingRequirements.map((item) => item.category_name).slice(0, 2).join(", ") : "All required uploads exist."}</p>
          </article>
          <article className={reuploadItems.length ? "is-attention" : "is-complete"}>
            <span>Returned by HR</span>
            <strong>{reuploadItems.length}</strong>
            <p>{reuploadItems.length ? "Read the note before replacing." : "No corrections requested."}</p>
          </article>
          <article className={expiringRequirements.length ? "is-warning" : "is-complete"}>
            <span>Expiry focus</span>
            <strong>{expiringRequirements.length}</strong>
            <p>{expiringRequirements.length ? "Renew before compliance is blocked." : "No urgent renewals."}</p>
          </article>
          <article>
            <span>HR review</span>
            <strong>{pendingReviewItems.length}</strong>
            <p>{pendingReviewItems.length ? "Files are waiting for HR." : `${pluralize(completedRequirements.length, "requirement")} complete.`}</p>
          </article>
        </div>
      </section>

      <section className="section section--tight">
        <div className="ess-documents-workspace">
          <section className="ess-documents-requirements panel-card-soft">
            <div className="ess-documents-panel-header">
              <div>
                <span className="workspace-card__eyebrow">What HR needs</span>
                <h2>Required documents</h2>
              </div>
              <span className="queue-summary-chip"><strong>{data.requirement_items.length}</strong> items</span>
            </div>
            <div className="queue-list ess-documents-requirement-list">
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
          {data.requirement_items.map((item) => (
            <article className="record-card panel-card-soft" key={item.rule_id}>
              <div className="record-card__header">
                <div className="record-card__title-wrap">
                  <div className="record-card__title">
                    <h2>{item.category_name}</h2>
                  </div>
                  <div className="record-card__eyebrow">
                    <span className={`record-chip ${item.is_compliant ? "record-chip--accent" : ""}`}>{getRequirementStatus(item)}</span>
                    <span className="record-chip">{item.requires_verification ? "Review required" : "Auto accepted"}</span>
                    {item.is_future_due ? <span className="record-chip">Future due</span> : null}
                    {item.current_document_id ? <span className="record-chip">v{data.items.find((entry) => entry.id === item.current_document_id)?.version_number || 1}</span> : null}
                    {item.current_rejection_reason ? <span className="record-chip">Re-upload</span> : null}
                    {item.current_is_expired ? <span className="record-chip">Expired</span> : null}
                    {!item.current_is_expired && item.current_is_expiring_soon ? <span className="record-chip">Expiring</span> : null}
                  </div>
                </div>
                <div className="record-card__actions">
                  {item.allow_employee_upload ? (
                    <button className="button button--primary" onClick={() => openUpload(item)} type="button">
                      {item.current_document_id && !item.is_compliant ? "Replace" : "Upload"}
                    </button>
                  ) : null}
                  {item.current_document_id ? <Link className="button button--ghost" href={`/api/me/employee-documents/${item.current_document_id}/download`}>Download</Link> : null}
                </div>
              </div>
              <p className="section-copy section-copy-soft ess-documents-requirement-summary">{getRequirementSummary(item)}</p>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Current file</span><span className="detail-value">{item.current_document_title || "Not uploaded"}</span></div>
                <div className="detail-row"><span className="detail-label">Verification</span><span className="detail-value">{item.current_verification_status || "Pending upload"}</span></div>
                <div className="detail-row"><span className="detail-label">Due on</span><span className="detail-value">{item.due_on || "No deadline"}</span></div>
                <div className="detail-row"><span className="detail-label">Expiry required</span><span className="detail-value">{item.requires_expiry_date ? "Yes" : "No"}</span></div>
                <div className="detail-row"><span className="detail-label">Uploaded at</span><span className="detail-value">{formatDate(item.current_uploaded_at)}</span></div>
                <div className="detail-row"><span className="detail-label">Expiry state</span><span className="detail-value">{item.current_expiry_label}</span></div>
              </div>
              {item.current_rejection_reason ? (
                <div className="notice">
                  <strong>Latest review note.</strong>
                  <span className="muted">{item.current_rejection_reason}</span>
                </div>
              ) : null}
            </article>
          ))}
            </div>
          </section>

          <aside className="ess-documents-guidance panel-card-soft">
            <span className="workspace-card__eyebrow">Upload checklist</span>
            <h2>Before sending a file</h2>
            <div className="ess-documents-checklist">
              <div><strong>Clear file</strong><span>All corners, names, dates, and numbers should be readable.</span></div>
              <div><strong>Correct category</strong><span>Upload PAN under PAN, bank proof under bank proof, and so on.</span></div>
              <div><strong>Expiry date</strong><span>Add expiry when HR tracks renewal dates for the document.</span></div>
              <div><strong>Re-upload note</strong><span>If HR rejected a file, read the review note before replacing it.</span></div>
            </div>
          </aside>
        </div>
      </section>

      <section className="section section--tight queue-layout ess-documents-history">
        <section className="queue-toolbar panel-card-soft">
          <div className="queue-toolbar__header">
            <div>
              <h2 className="section-heading-soft">Document history</h2>
              <p className="section-copy section-copy-soft">Search submitted files, download a copy, and review HR comments.</p>
            </div>
            <div className="queue-toolbar__meta">
              <span className="queue-summary-chip"><strong>{data.total_count}</strong> total records</span>
              <span className="queue-summary-chip"><strong>{data.items.length}</strong> on this page</span>
            </div>
          </div>
          <div className="queue-toolbar__grid">
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
          </div>
          <div className="queue-toolbar__actions">
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
        </section>

        <div className="queue-list">
          {data.items.map((item) => (
            <article className="record-card panel-card-soft" key={item.id}>
              <div className="record-card__header">
                <div className="record-card__title-wrap">
                  <div className="record-card__title">
                    <h2>{item.title}</h2>
                  </div>
                  <div className="record-card__eyebrow">
                    <span className="record-chip">v{item.version_number}</span>
                    <span className="record-chip record-chip--accent">{item.category_name}</span>
                    <span className="record-chip">{item.verification_status}</span>
                    <span className="record-chip">{item.status}</span>
                    {item.reupload_requested ? <span className="record-chip">Re-upload</span> : null}
                    {item.is_expired ? <span className="record-chip">Expired</span> : null}
                    {!item.is_expired && item.is_expiring_soon ? <span className="record-chip">Expiring</span> : null}
                  </div>
                  <p className="section-copy section-copy-soft">{item.file_name} • Uploaded {formatDate(item.created_at)}</p>
                </div>
                <div className="record-card__actions">
                  <button className="button button--secondary" onClick={() => setSelectedDocument(item)} type="button">Review</button>
                  {item.artifact_id ? <Link className="button button--ghost" href={`/api/me/employee-documents/${item.id}/download`}>Download</Link> : null}
                </div>
              </div>
              {item.rejection_reason ? (
                <div className="notice">
                  <strong>Re-upload requested.</strong>
                  <span className="muted">{item.rejection_reason}</span>
                </div>
              ) : null}
            </article>
          ))}
          {data.items.length === 0 ? (
            <div className="card panel">
              <strong>No documents match the current filters.</strong>
              <p className="muted">Clear one or more filters to review the full submission history.</p>
            </div>
          ) : null}
        </div>

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
