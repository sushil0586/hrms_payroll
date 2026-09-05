"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { PaginationBar } from "@/components/patterns/pagination-bar";
import type { EssDocumentCenterResponse } from "@/lib/types";

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
  const [error, setError] = useState("");
  const selectedRequirement = data.requirement_items.find((item) => item.category_id === formValue.category_id);
  const reuploadItems = data.items.filter((item) => item.reupload_requested);

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

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
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
      setError(extractError(payload));
      setIsSubmitting(false);
      return;
    }

    setFormValue({
      ...INITIAL_UPLOAD_VALUE,
      category_id: data.uploadable_categories[0]?.id ?? "",
    });
    router.refresh();
  }

  return (
    <div className="stack">
      <section className="section">
        <section className="form-shell-card">
          <div className="form-shell-card__intro">
            <h2>Upload required document</h2>
            <p className="section-copy">
              Submit the current file for review. Upload rules, verification needs, and expiry requirements come from the HR document setup.
            </p>
          </div>

          <form className="form-grid" onSubmit={handleUpload}>
            <label className="form-field">
              <span className="muted">Category</span>
              <select className="input-control" disabled={data.uploadable_categories.length === 0 || isSubmitting} required value={formValue.category_id} onChange={(event) => updateUploadField("category_id", event.target.value)}>
                <option value="">Select category</option>
                {data.uploadable_categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Title</span>
              <input className="input-control" disabled={isSubmitting} required value={formValue.title} onChange={(event) => updateUploadField("title", event.target.value)} />
            </label>
            <label className="form-field">
              <span className="muted">Document number</span>
              <input className="input-control" disabled={isSubmitting} value={formValue.document_number} onChange={(event) => updateUploadField("document_number", event.target.value)} />
            </label>
            <label className="form-field">
              <span className="muted">Issued on</span>
              <input className="input-control" disabled={isSubmitting} type="date" value={formValue.issued_on} onChange={(event) => updateUploadField("issued_on", event.target.value)} />
            </label>
            <label className="form-field">
              <span className="muted">Expires on</span>
              <input className="input-control" disabled={isSubmitting} type="date" value={formValue.expires_on} onChange={(event) => updateUploadField("expires_on", event.target.value)} />
            </label>
            <label className="form-field form-field--full">
              <span className="muted">File</span>
              <input className="input-control" disabled={isSubmitting || data.uploadable_categories.length === 0} required type="file" onChange={(event) => updateUploadField("file", event.target.files?.[0] ?? null)} />
              <span className="muted">Maximum upload size: {formatFileSize(data.max_upload_size_bytes)}.</span>
            </label>
            <div className="form-shell-card__actions form-shell-card__actions--start form-shell-card__actions--flush">
              <button className="button button--primary" disabled={isSubmitting || data.uploadable_categories.length === 0} type="submit">
                {isSubmitting ? "Uploading..." : "Upload document"}
              </button>
              {data.uploadable_categories.length === 0 ? <span className="muted">No self-upload categories are available right now.</span> : null}
            </div>
          </form>

          {error ? (
            <div className="notice">
              <strong>Upload failed.</strong>
              <span className="muted">{error}</span>
            </div>
          ) : null}
        </section>
      </section>

      <section className="section">
        <div className="queue-list">
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
                    <span className={`record-chip ${item.is_compliant ? "record-chip--accent" : ""}`}>{item.is_compliant ? "Compliant" : "Action needed"}</span>
                    <span className="record-chip">{item.requires_verification ? "Review required" : "Auto accepted"}</span>
                    {item.is_future_due ? <span className="record-chip">Future due</span> : null}
                    {item.current_document_id ? <span className="record-chip">v{data.items.find((entry) => entry.id === item.current_document_id)?.version_number || 1}</span> : null}
                    {item.current_rejection_reason ? <span className="record-chip">Re-upload</span> : null}
                    {item.current_is_expired ? <span className="record-chip">Expired</span> : null}
                    {!item.current_is_expired && item.current_is_expiring_soon ? <span className="record-chip">Expiring</span> : null}
                  </div>
                </div>
                <div className="record-card__actions">
                  {item.current_document_id ? <Link className="button button--ghost" href={`/api/me/employee-documents/${item.current_document_id}/download`}>Download</Link> : null}
                </div>
              </div>
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

      <section className="section queue-layout">
        <section className="queue-toolbar panel-card-soft">
          <div className="queue-toolbar__header">
            <div>
              <h2 className="section-heading-soft">Document history</h2>
              <p className="section-copy section-copy-soft">Track review progress, rejections, and previously submitted files.</p>
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
                  {item.artifact_id ? <Link className="button button--ghost" href={`/api/me/employee-documents/${item.id}/download`}>Download</Link> : null}
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Document number</span><span className="detail-value">{item.document_number || "Not set"}</span></div>
                <div className="detail-row"><span className="detail-label">File size</span><span className="detail-value">{formatFileSize(item.file_size_bytes)}</span></div>
                <div className="detail-row"><span className="detail-label">Expires on</span><span className="detail-value">{item.expires_on || "No expiry"}</span></div>
                <div className="detail-row"><span className="detail-label">Expiry state</span><span className="detail-value">{item.expiry_label}</span></div>
                <div className="detail-row"><span className="detail-label">Reviewer</span><span className="detail-value">{item.verified_by_identifier || "Pending review"}</span></div>
                <div className="detail-row"><span className="detail-label">Days to expiry</span><span className="detail-value">{item.days_until_expiry ?? "Not tracked"}</span></div>
                <div className="detail-row"><span className="detail-label">Review steps</span><span className="detail-value">{item.review_history.length}</span></div>
                <div className="detail-row"><span className="detail-label">Prior versions</span><span className="detail-value">{Math.max(0, item.version_history.length - 1)}</span></div>
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
    </div>
  );
}
