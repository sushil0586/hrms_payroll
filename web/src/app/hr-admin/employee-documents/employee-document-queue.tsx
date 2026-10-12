"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { EmployeeDocumentInlineReview } from "@/app/hr-admin/employee-documents/employee-document-inline-review";
import { employeeDocumentToFormValue } from "@/app/hr-admin/employee-documents/form-values";
import { EmployeeDocumentReviewForm } from "@/app/hr-admin/employee-documents/employee-document-review-form";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { WorkspaceFilterBar, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminDocumentOptions, HrAdminEmployeeDocument, HrAdminEnumOption, HrAdminOptionItem } from "@/lib/types";

type Props = {
  items: HrAdminEmployeeDocument[];
  verificationStatusOptions: HrAdminEnumOption[];
  recordStatusOptions: HrAdminEnumOption[];
  categories: HrAdminOptionItem[];
  currentFilters: {
    q: string;
    verification_status: string;
    status: string;
    category_id: string;
    expiry_filter: string;
    page: number;
    page_size: number;
  };
  pagination: {
    total_count: number;
    page: number;
    page_size: number;
    has_next: boolean;
    has_previous: boolean;
  };
  canVerifyDocuments: boolean;
  canExportDocuments: boolean;
  canManageDocuments: boolean;
  documentOptions: HrAdminDocumentOptions;
  reviewDocument?: HrAdminEmployeeDocument | null;
  initialActionNotice?: string;
  initialActionNoticeTitle?: string;
  summary: {
    categoriesConfigured: number;
    expiredOnPage: number;
    expiringOnPage: number;
  };
};

function formatFileSize(fileSizeBytes: number) {
  if (fileSizeBytes <= 0) {
    return "Not available";
  }
  if (fileSizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(fileSizeBytes / 1024))} KB`;
  }
  return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function humanizeStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function verificationTone(status: string) {
  if (status === "verified") return "success";
  if (status === "rejected" || status === "expired") return "danger";
  if (status === "pending") return "warning";
  return "neutral";
}

function reviewStateClass(item: HrAdminEmployeeDocument) {
  if (item.verification_status === "verified") return "document-review-state document-review-state--success";
  if (item.verification_status === "rejected" || item.reupload_requested || item.is_expired) return "document-review-state document-review-state--danger";
  return "document-review-state document-review-state--warning";
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === false) {
      return;
    }
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export function EmployeeDocumentQueue({
  items,
  verificationStatusOptions,
  recordStatusOptions,
  categories,
  currentFilters,
  pagination,
  canVerifyDocuments,
  canExportDocuments,
  canManageDocuments,
  documentOptions,
  reviewDocument,
  initialActionNotice = "",
  initialActionNoticeTitle = "Action complete.",
  summary,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reviewDocumentId = searchParams.get("reviewDocument") ?? "";
  const [search, setSearch] = useState(currentFilters.q);
  const [verificationStatus, setVerificationStatus] = useState(currentFilters.verification_status || "all");
  const [recordStatus, setRecordStatus] = useState(currentFilters.status || "all");
  const [categoryId, setCategoryId] = useState(currentFilters.category_id || "all");
  const [expiryFilter, setExpiryFilter] = useState(currentFilters.expiry_filter || "all");
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState(initialActionNotice);
  const [actionNoticeTitle, setActionNoticeTitle] = useState(initialActionNoticeTitle);
  const [completedReviewIds, setCompletedReviewIds] = useState<string[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(items[0]?.id ?? "");

  const actionableItems = items.filter((item) => item.is_expired || item.is_expiring_soon || item.expiry_state === "no_expiry");
  const actionableIds = actionableItems.map((item) => item.id);
  const pendingReviewCount = items.filter((item) => item.verification_status === "pending").length;
  const employeeFollowUpCount = items.filter((item) => item.reupload_requested || item.verification_status === "rejected" || item.is_expired).length;
  const allActionableSelected = actionableIds.length > 0 && actionableIds.every((id) => selectedIds.includes(id));
  const selectedDocument = items.find((item) => item.id === selectedDocumentId) ?? null;
  const modalReviewDocument = canVerifyDocuments && reviewDocumentId ? reviewDocument : null;
  const numericPageSize = Number(pageSize) || currentFilters.page_size;
  const totalPages = Math.max(1, Math.ceil(pagination.total_count / Math.max(numericPageSize, 1)));
  const pageStart = pagination.total_count === 0 ? 0 : ((pagination.page - 1) * numericPageSize) + 1;
  const pageEnd = pagination.total_count === 0 ? 0 : Math.min(pagination.page * numericPageSize, pagination.total_count);
  const displayActionNotice = actionNotice || initialActionNotice;
  const displayActionNoticeTitle = actionNotice ? actionNoticeTitle : initialActionNoticeTitle;

  function toggleOne(itemId: string) {
    setSelectedIds((current) => (current.includes(itemId) ? current.filter((value) => value !== itemId) : [...current, itemId]));
  }

  function toggleActionablePage() {
    setSelectedIds((current) =>
      allActionableSelected ? current.filter((id) => !actionableIds.includes(id)) : [...new Set([...current, ...actionableIds])]
    );
  }

  function goToPage(page: number) {
    router.push(`${pathname}${buildQueryString({
      q: search.trim() || undefined,
      verification_status: verificationStatus !== "all" ? verificationStatus : undefined,
      status: recordStatus !== "all" ? recordStatus : undefined,
      category_id: categoryId !== "all" ? categoryId : undefined,
      expiry_filter: expiryFilter !== "all" ? expiryFilter : undefined,
      page,
      page_size: numericPageSize,
    })}`);
  }

  function currentQueueHref(params: Record<string, string | number | boolean | undefined> = {}) {
    return `${pathname}${buildQueryString({
      q: search.trim() || undefined,
      verification_status: verificationStatus !== "all" ? verificationStatus : undefined,
      status: recordStatus !== "all" ? recordStatus : undefined,
      category_id: categoryId !== "all" ? categoryId : undefined,
      expiry_filter: expiryFilter !== "all" ? expiryFilter : undefined,
      page: pagination.page,
      page_size: numericPageSize,
      ...params,
    })}`;
  }

  function openReviewModal(itemId: string) {
    router.push(currentQueueHref({ reviewDocument: itemId }));
  }

  async function sendReminder() {
    if (selectedIds.length === 0) {
      return;
    }
    setActionError("");
    setActionNotice("");
    setIsSubmittingReminder(true);
    let response: Response;
    try {
      response = await fetch("/api/hr-admin/employee-documents/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_ids: selectedIds }),
      });
    } catch {
      setActionError("Unable to reach the server. Check your connection and try again.");
      setIsSubmittingReminder(false);
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setActionError(String((payload as { detail?: string }).detail || "Unable to send document reminders."));
      setIsSubmittingReminder(false);
      return;
    }
    setActionNotice(
      `${payload.reminder_count || 0} reminder${payload.reminder_count === 1 ? "" : "s"} sent, ${payload.skipped_count || 0} skipped.`,
    );
    setActionNoticeTitle("Reminder action complete.");
    setSelectedIds([]);
    setIsSubmittingReminder(false);
    router.refresh();
  }

  return (
    <section className="section queue-layout document-queue-layout">
      <div className="hr-employee-summary-strip document-summary-strip">
        <span><strong>{pagination.total_count}</strong> documents</span>
        <span><strong>{summary.categoriesConfigured}</strong> categories</span>
        <span><strong>{pendingReviewCount}</strong> pending review</span>
        <span><strong>{employeeFollowUpCount}</strong> need follow-up</span>
        <span><strong>{summary.expiringOnPage}</strong> expiring</span>
        <span><strong>{summary.expiredOnPage}</strong> expired</span>
      </div>

      <section className="queue-toolbar panel-card-soft document-queue-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Review queue</h2>
            <p className="section-copy section-copy-soft">Filter employee files, select expiry-risk records, and send reminders.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{items.length}</strong> in this view</span>
            <span className="queue-summary-chip"><strong>{selectedIds.length}</strong> selected</span>
            <span className="queue-summary-chip"><strong>{items.length}</strong> on this page</span>
          </div>
        </div>
        <WorkspaceFilterBar className="queue-toolbar__grid document-filter-grid">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" onChange={(event) => setSearch(event.target.value)} placeholder="Employee, category, title, number, reviewer" value={search} />
          </label>
          <label className="form-field">
            <span className="muted">Verification status</span>
            <select className="input-control" onChange={(event) => setVerificationStatus(event.target.value)} value={verificationStatus}>
              <option value="all">All verification statuses</option>
              {verificationStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Record status</span>
            <select className="input-control" onChange={(event) => setRecordStatus(event.target.value)} value={recordStatus}>
              <option value="all">All record statuses</option>
              {recordStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <details className="directory-more-filters document-more-filters">
            <summary className="button button--secondary button--compact">More filters</summary>
            <div className="directory-more-filters__panel document-more-filters__panel">
              <label className="form-field">
                <span className="muted">Category</span>
                <select className="input-control" onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
                  <option value="all">All categories</option>
                  {categories.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
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
            </div>
          </details>
        </WorkspaceFilterBar>
        <div className="queue-toolbar__actions document-toolbar-actions">
          <button className="button button--primary" onClick={() => goToPage(1)} type="button">Apply filters</button>
          <button className="button button--ghost" onClick={() => {
            setSearch("");
            setVerificationStatus("all");
            setRecordStatus("all");
            setCategoryId("all");
            setExpiryFilter("all");
            setPageSize("25");
            setSelectedIds([]);
            setActionError("");
            setActionNotice("");
            setActionNoticeTitle("Action complete.");
            router.push(pathname);
          }} type="button">Clear filters</button>
          {canManageDocuments ? (
            <>
              <button className="button button--secondary" disabled={actionableItems.length === 0} onClick={toggleActionablePage} type="button">
                {allActionableSelected ? "Clear selection" : "Select page"}
              </button>
              <button className="button button--secondary" disabled={isSubmittingReminder || selectedIds.length === 0} onClick={sendReminder} type="button">
                {isSubmittingReminder ? "Sending..." : `Send reminder (${selectedIds.length || 0})`}
              </button>
            </>
          ) : null}
        </div>
        {!canManageDocuments ? <div className="notice"><strong>Read-only document queue.</strong><span className="muted">Reminder actions require documents.manage.</span></div> : null}
        {displayActionNotice ? <div className="notice"><strong>{displayActionNoticeTitle}</strong><span className="muted">{displayActionNotice}</span></div> : null}
        {actionError ? <div className="notice notice--error" role="alert"><strong>Reminder action failed.</strong><span className="muted">{actionError}</span></div> : null}
      </section>

      <div className={`document-review-workbench${selectedDocument ? " document-review-workbench--with-detail" : ""}`}>
        <article className="record-card panel-card-soft document-directory-panel">
          <div className="employee-directory-table-wrap document-directory-table-wrap">
            {items.length ? (
              <table className="employee-directory-table document-directory-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Employee</th>
                    <th>Verification</th>
                    <th>Expiry</th>
                    <th>Owner</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isSelected = selectedDocument?.id === item.id;
                    const isActionable = item.is_expired || item.is_expiring_soon || item.expiry_state === "no_expiry";
                    return (
                      <tr className={isSelected ? "employee-directory-table__row--active" : ""} key={item.id}>
                        <td>
                          <div className="document-table-title-cell">
                            <input
                              aria-label={`Select ${item.title} for reminder follow-up`}
                              checked={selectedIds.includes(item.id)}
                              disabled={!isActionable}
                              onChange={() => toggleOne(item.id)}
                              type="checkbox"
                            />
                            <button className="document-table-title-button" onClick={() => setSelectedDocumentId(item.id)} type="button">
                              <strong>{item.title}</strong>
                              <small>{item.category_name} · v{item.version_number}</small>
                            </button>
                          </div>
                        </td>
                        <td>
                          <strong>{item.employee_name}</strong>
                          <small>{item.employee_code}</small>
                        </td>
                        <td>
                          <WorkspaceStatusBadge tone={verificationTone(item.verification_status)}>{humanizeStatus(item.verification_status)}</WorkspaceStatusBadge>
                          <small>{humanizeStatus(item.status)}</small>
                        </td>
                        <td>
                          <strong>{item.expires_on || "No expiry"}</strong>
                          <small>{item.expiry_label}</small>
                        </td>
                        <td>
                          <strong>{item.review_owner_label}</strong>
                          <small>{item.uploaded_by_identifier || "Unknown uploader"}</small>
                        </td>
                        <td>
                          <button className="button button--secondary button--compact" onClick={() => setSelectedDocumentId(item.id)} type="button">
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="notice">
                <strong>No employee documents match the current filters.</strong>
                <span className="muted">Try clearing one or more filters to widen the review queue.</span>
              </div>
            )}
          </div>
        </article>

        {selectedDocument ? (
          <article className="record-card panel-card-soft employee-detail-drawer document-detail-drawer">
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <h2 className="section-heading-soft">Document detail</h2>
                <p className="section-copy section-copy-soft">Focused review context for the selected file.</p>
              </div>
              <div className="record-card__actions">
                <button className="button button--ghost button--compact" onClick={() => setSelectedDocumentId("")} type="button">Close</button>
                {canExportDocuments && selectedDocument.artifact_id ? <Link className="button button--ghost button--compact" href={`/api/hr-admin/employee-documents/${selectedDocument.id}/download`}>Download</Link> : null}
                {canVerifyDocuments ? (
                  <button className="button button--secondary button--compact" onClick={() => openReviewModal(selectedDocument.id)} type="button">Review</button>
                ) : (
                  <button className="button button--secondary button--compact" disabled title="Requires documents.verify permission." type="button">Review</button>
                )}
              </div>
            </div>

            <div className="document-detail-identity">
              <div>
                <h3>{selectedDocument.title}</h3>
                <p>{selectedDocument.employee_name} ({selectedDocument.employee_code}) · {selectedDocument.category_name}</p>
              </div>
              <WorkspaceStatusBadge tone={verificationTone(selectedDocument.verification_status)}>{humanizeStatus(selectedDocument.verification_status)}</WorkspaceStatusBadge>
            </div>

            <div className={reviewStateClass(selectedDocument)}>
              <div>
                <span className="document-review-state__label">Current review state</span>
                <strong>{selectedDocument.review_status_label}</strong>
              </div>
              <span>{selectedDocument.reupload_requested ? "Employee replacement upload requested." : `Owner: ${selectedDocument.review_owner_label}`}</span>
            </div>

            <div className="employee-detail-stack detail-grid-soft">
              <details className="employee-detail-section" open>
                <summary>Profile</summary>
                <div className="employee-detail-section__grid">
                  <div className="detail-row"><span className="detail-label">Employee</span><span className="detail-value">{selectedDocument.employee_name} ({selectedDocument.employee_code})</span></div>
                  <div className="detail-row"><span className="detail-label">Document</span><span className="detail-value">{selectedDocument.title}</span></div>
                  <div className="detail-row"><span className="detail-label">Category</span><span className="detail-value">{selectedDocument.category_name}</span></div>
                  <div className="detail-row"><span className="detail-label">Document number</span><span className="detail-value">{selectedDocument.document_number || "Not set"}</span></div>
                  <div className="detail-row"><span className="detail-label">Uploaded by</span><span className="detail-value">{selectedDocument.uploaded_by_identifier || "Unknown"}</span></div>
                </div>
              </details>
              <details className="employee-detail-section" open>
                <summary>Status and expiry</summary>
                <div className="employee-detail-section__grid">
                  <div className="detail-row"><span className="detail-label">Verification</span><span className="detail-value">{humanizeStatus(selectedDocument.verification_status)}</span></div>
                  <div className="detail-row"><span className="detail-label">Record status</span><span className="detail-value">{humanizeStatus(selectedDocument.status)}</span></div>
                  <div className="detail-row"><span className="detail-label">Issued on</span><span className="detail-value">{selectedDocument.issued_on || "Not set"}</span></div>
                  <div className="detail-row"><span className="detail-label">Expires on</span><span className="detail-value">{selectedDocument.expires_on || "No expiry"}</span></div>
                  <div className="detail-row"><span className="detail-label">Expiry state</span><span className="detail-value">{selectedDocument.expiry_label}</span></div>
                  <div className="detail-row"><span className="detail-label">Days to expiry</span><span className="detail-value">{selectedDocument.days_until_expiry ?? "Not tracked"}</span></div>
                </div>
              </details>
              <details className="employee-detail-section">
                <summary>File and history</summary>
                <div className="employee-detail-section__grid">
                  <div className="detail-row"><span className="detail-label">File</span><span className="detail-value">{selectedDocument.file_name}</span></div>
                  <div className="detail-row"><span className="detail-label">File type</span><span className="detail-value">{selectedDocument.mime_type || "Unknown"}</span></div>
                  <div className="detail-row"><span className="detail-label">File size</span><span className="detail-value">{formatFileSize(selectedDocument.file_size_bytes)}</span></div>
                  <div className="detail-row"><span className="detail-label">Artifact</span><span className="detail-value">{selectedDocument.artifact_id || "Not linked"}</span></div>
                  <div className="detail-row"><span className="detail-label">Previous version</span><span className="detail-value">{selectedDocument.previous_document_id ? "Available" : "Original upload"}</span></div>
                  <div className="detail-row"><span className="detail-label">Review steps</span><span className="detail-value">{selectedDocument.review_history.length}</span></div>
                </div>
              </details>
            </div>

            {selectedDocument.rejection_reason ? <div className="notice"><strong>Latest review note.</strong><span className="muted">{selectedDocument.rejection_reason}</span></div> : null}
            {canVerifyDocuments && !completedReviewIds.includes(selectedDocument.id) ? (
              <EmployeeDocumentInlineReview
                item={selectedDocument}
                onSaved={(message) => {
                  setCompletedReviewIds((current) => [...new Set([...current, selectedDocument.id])]);
                  setActionNotice(message);
                  setActionNoticeTitle("Review action complete.");
                }}
                onOpenFullReview={() => openReviewModal(selectedDocument.id)}
                reviewHref={currentQueueHref({ reviewDocument: selectedDocument.id })}
                verificationStatusOptions={verificationStatusOptions}
              />
            ) : null}
          </article>
        ) : null}
      </div>

      <section className="card panel pagination-panel document-pagination-panel">
        <div className="pagination-bar">
          <div className="pagination-bar__summary">
            <span className="queue-summary-chip"><strong>{pageStart}-{pageEnd}</strong> of {pagination.total_count} documents</span>
            <span className="queue-summary-chip"><strong>Page {pagination.page}</strong> of {totalPages}</span>
            <label className="document-page-size-control lifecycle-page-size-control">
              <span>Rows</span>
              <select className="input-control" onChange={(event) => setPageSize(event.target.value)} value={pageSize}>
                {[10, 25, 50, 100].map((value) => <option key={value} value={String(value)}>{value}</option>)}
              </select>
            </label>
            <button className="button button--secondary button--compact" onClick={() => goToPage(1)} type="button">Apply</button>
          </div>
          {totalPages > 1 ? (
            <div className="pagination-bar__actions">
              <button className="button button--secondary" disabled={!pagination.has_previous} onClick={() => goToPage(1)} type="button">First</button>
              <button className="button button--secondary" disabled={!pagination.has_previous} onClick={() => goToPage(pagination.page - 1)} type="button">Previous</button>
              <button className="button button--secondary" disabled={!pagination.has_next} onClick={() => goToPage(pagination.page + 1)} type="button">Next</button>
              <button className="button button--secondary" disabled={!pagination.has_next} onClick={() => goToPage(totalPages)} type="button">Last</button>
            </div>
          ) : null}
        </div>
      </section>
      {modalReviewDocument ? (
        <HrAdminActionModal
          className="document-review-modal"
          closeHref={currentQueueHref({ reviewDocument: undefined })}
          description="Review and update this document without leaving the queue."
          eyebrow="Document review"
          labelledBy="document-review-modal-title"
          title={`Review ${modalReviewDocument.title}`}
        >
          <EmployeeDocumentReviewForm
            compact
            cancelHref={currentQueueHref({ reviewDocument: undefined })}
            document={modalReviewDocument}
            initialValue={employeeDocumentToFormValue(modalReviewDocument)}
            itemId={modalReviewDocument.id}
            options={documentOptions}
            successHref={currentQueueHref({ reviewDocument: undefined, review_saved: 1 })}
          />
        </HrAdminActionModal>
      ) : null}
    </section>
  );
}
