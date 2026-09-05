"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { EmployeeDocumentInlineReview } from "@/app/hr-admin/employee-documents/employee-document-inline-review";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import type { HrAdminEmployeeDocument, HrAdminEnumOption, HrAdminOptionItem } from "@/lib/types";

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
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(currentFilters.q);
  const [verificationStatus, setVerificationStatus] = useState(currentFilters.verification_status || "all");
  const [recordStatus, setRecordStatus] = useState(currentFilters.status || "all");
  const [categoryId, setCategoryId] = useState(currentFilters.category_id || "all");
  const [expiryFilter, setExpiryFilter] = useState(currentFilters.expiry_filter || "all");
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");

  const actionableItems = items.filter((item) => item.is_expired || item.is_expiring_soon || item.expiry_state === "no_expiry");
  const actionableIds = actionableItems.map((item) => item.id);
  const allActionableSelected = actionableIds.length > 0 && actionableIds.every((id) => selectedIds.includes(id));

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
      page_size: Number(pageSize) || currentFilters.page_size,
    })}`);
  }

  async function sendReminder() {
    if (selectedIds.length === 0) {
      return;
    }
    setActionError("");
    setActionNotice("");
    setIsSubmittingReminder(true);
    const response = await fetch("/api/hr-admin/employee-documents/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_ids: selectedIds }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setActionError(String((payload as { detail?: string }).detail || "Unable to send document reminders."));
      setIsSubmittingReminder(false);
      return;
    }
    setActionNotice(
      `${payload.reminder_count || 0} reminder${payload.reminder_count === 1 ? "" : "s"} sent, ${payload.skipped_count || 0} skipped.`,
    );
    setSelectedIds([]);
    setIsSubmittingReminder(false);
    router.refresh();
  }

  return (
    <section className="section queue-layout">
      <section className="queue-toolbar panel-card-soft">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Documents</h2>
            <p className="section-copy section-copy-soft">Search by employee, category, reviewer, or expiry.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{pagination.total_count}</strong> total records</span>
            <span className="queue-summary-chip"><strong>{items.length}</strong> on this page</span>
            <span className="queue-summary-chip"><strong>{categories.length}</strong> categories configured</span>
          </div>
        </div>
        <div className="queue-toolbar__grid">
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
          <label className="form-field">
            <span className="muted">Rows per page</span>
            <select className="input-control" onChange={(event) => setPageSize(event.target.value)} value={pageSize}>
              {[10, 25, 50, 100].map((value) => <option key={value} value={String(value)}>{value}</option>)}
            </select>
          </label>
        </div>
        <div className="queue-toolbar__actions">
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
            router.push(pathname);
          }} type="button">Clear filters</button>
          <button className="button button--secondary" disabled={actionableItems.length === 0} onClick={toggleActionablePage} type="button">
            {allActionableSelected ? "Clear selection" : "Select page"}
          </button>
          <button className="button button--secondary" disabled={isSubmittingReminder || selectedIds.length === 0} onClick={sendReminder} type="button">
            {isSubmittingReminder ? "Sending..." : `Send reminder (${selectedIds.length || 0})`}
          </button>
        </div>
        <div className="queue-toolbar__summary">
          <span className="queue-summary-chip"><strong>Page {pagination.page}</strong> shared state</span>
          <span className="queue-summary-chip"><strong>{verificationStatusOptions.length}</strong> verification outcomes</span>
          <span className="queue-summary-chip"><strong>{selectedIds.length}</strong> selected</span>
        </div>
        {actionNotice ? <div className="notice"><strong>Reminder action complete.</strong><span className="muted">{actionNotice}</span></div> : null}
        {actionError ? <div className="notice"><strong>Reminder action failed.</strong><span className="muted">{actionError}</span></div> : null}
      </section>

      <div className="queue-list">
        {items.map((item) => (
          <article className="record-card panel-card-soft" key={item.id}>
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <label className="record-card__title">
                  <input
                    checked={selectedIds.includes(item.id)}
                    disabled={!(item.is_expired || item.is_expiring_soon || item.expiry_state === "no_expiry")}
                    onChange={() => toggleOne(item.id)}
                    type="checkbox"
                  />
                  <h2>{item.title}</h2>
                </label>
                <div className="record-card__eyebrow">
                  <span className="record-chip">v{item.version_number}</span>
                  <span className="record-chip record-chip--accent">{item.category_name}</span>
                  <span className="record-chip">{item.verification_status}</span>
                  <span className="record-chip">{item.status}</span>
                  {item.reupload_requested ? <span className="record-chip">Re-upload</span> : null}
                  {item.is_expired ? <span className="record-chip">Expired</span> : null}
                  {!item.is_expired && item.is_expiring_soon ? <span className="record-chip">Expiring</span> : null}
                </div>
                <p className="section-copy section-copy-soft">{item.employee_name} ({item.employee_code}) • Uploaded by {item.uploaded_by_identifier || "Unknown"}</p>
              </div>
              <div className="record-card__actions">
                {item.artifact_id ? <Link className="button button--ghost" href={`/api/hr-admin/employee-documents/${item.id}/download`}>Download</Link> : null}
                <Link className="button button--secondary" href={`/hr-admin/employee-documents/${item.id}/review`}>Review</Link>
              </div>
            </div>
            <div className="detail-grid">
              <div className="detail-row"><span className="detail-label">Verification</span><span className="detail-value">{item.verification_status}</span></div>
              <div className="detail-row"><span className="detail-label">Record status</span><span className="detail-value">{item.status}</span></div>
              <div className="detail-row"><span className="detail-label">Uploaded by</span><span className="detail-value">{item.uploaded_by_identifier || "Unknown"}</span></div>
              <div className="detail-row"><span className="detail-label">Expires on</span><span className="detail-value">{item.expires_on || "No expiry"}</span></div>
              <div className="detail-row"><span className="detail-label">Expiry state</span><span className="detail-value">{item.expiry_label}</span></div>
              <div className="detail-row"><span className="detail-label">File type</span><span className="detail-value">{item.mime_type || "Unknown"}</span></div>
              <div className="detail-row"><span className="detail-label">File size</span><span className="detail-value">{formatFileSize(item.file_size_bytes)}</span></div>
              <div className="detail-row"><span className="detail-label">Days to expiry</span><span className="detail-value">{item.days_until_expiry ?? "Not tracked"}</span></div>
              <div className="detail-row"><span className="detail-label">Previous version</span><span className="detail-value">{item.previous_document_id ? "Available" : "Original upload"}</span></div>
              <div className="detail-row"><span className="detail-label">Review steps</span><span className="detail-value">{item.review_history.length}</span></div>
            </div>
            {item.rejection_reason ? <div className="notice"><strong>Latest review note.</strong><span className="muted">{item.rejection_reason}</span></div> : null}
            <EmployeeDocumentInlineReview item={item} verificationStatusOptions={verificationStatusOptions} />
          </article>
        ))}
        {items.length === 0 ? (
          <div className="card panel">
            <strong>No employee documents match the current filters.</strong>
            <p className="muted">Try clearing one or more filters to widen the review queue.</p>
          </div>
        ) : null}
      </div>

      <PaginationBar
        hasNext={pagination.has_next}
        hasPrevious={pagination.has_previous}
        onFirst={() => goToPage(1)}
        onLast={() => goToPage(Math.max(1, Math.ceil(pagination.total_count / pagination.page_size)))}
        onNext={() => goToPage(pagination.page + 1)}
        onPrevious={() => goToPage(pagination.page - 1)}
        page={pagination.page}
        pageSize={pagination.page_size}
        totalCount={pagination.total_count}
      />
    </section>
  );
}
