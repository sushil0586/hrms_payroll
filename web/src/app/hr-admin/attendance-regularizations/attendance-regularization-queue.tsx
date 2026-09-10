"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { AttendanceRegularizationInlineReview } from "@/app/hr-admin/attendance-regularizations/attendance-regularization-inline-review";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import type { AttendanceRegularizationItem, HrAdminEnumOption } from "@/lib/types";

type Props = {
  items: AttendanceRegularizationItem[];
  regularizationStatusOptions: HrAdminEnumOption[];
  attendanceStatusOptions: HrAdminEnumOption[];
  currentFilters: {
    q: string;
    status: string;
    requested_status: string;
    current_status: string;
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

function formatDateTime(value: string | null) {
  if (!value) return "Not submitted";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export function AttendanceRegularizationQueue({
  items,
  regularizationStatusOptions,
  attendanceStatusOptions,
  currentFilters,
  pagination,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(currentFilters.q);
  const [status, setStatus] = useState(currentFilters.status || "all");
  const [requestedStatus, setRequestedStatus] = useState(currentFilters.requested_status || "all");
  const [currentStatus, setCurrentStatus] = useState(currentFilters.current_status || "all");
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));

  function goToPage(page: number) {
    router.push(`${pathname}${buildQueryString({
      q: search.trim() || undefined,
      status: status !== "all" ? status : undefined,
      requested_status: requestedStatus !== "all" ? requestedStatus : undefined,
      current_status: currentStatus !== "all" ? currentStatus : undefined,
      page,
      page_size: Number(pageSize) || currentFilters.page_size,
    })}`);
  }

  function applyFilters() {
    goToPage(1);
  }

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setRequestedStatus("all");
    setCurrentStatus("all");
    setPageSize("25");
    router.push(pathname);
  }

  return (
    <section className="section queue-layout">
      <section className="queue-toolbar panel-card-soft">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Regularizations</h2>
            <p className="section-copy section-copy-soft">Search, filter, and review correction requests.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{pagination.total_count}</strong> total requests</span>
            <span className="queue-summary-chip"><strong>{items.length}</strong> on this page</span>
          </div>
        </div>
        <div className="queue-toolbar__grid">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" onChange={(event) => setSearch(event.target.value)} placeholder="Employee, code, date, shift, reason" value={search} />
          </label>
          <label className="form-field">
            <span className="muted">Request status</span>
            <select className="input-control" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="all">All request statuses</option>
              {regularizationStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Requested attendance status</span>
            <select className="input-control" onChange={(event) => setRequestedStatus(event.target.value)} value={requestedStatus}>
              <option value="all">All requested statuses</option>
              {attendanceStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Current attendance status</span>
            <select className="input-control" onChange={(event) => setCurrentStatus(event.target.value)} value={currentStatus}>
              <option value="all">All current statuses</option>
              {attendanceStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
          <button className="button button--primary" onClick={applyFilters} type="button">Apply filters</button>
          <button className="button button--ghost" onClick={clearFilters} type="button">Clear filters</button>
        </div>
        <div className="queue-toolbar__summary">
          <span className="queue-summary-chip"><strong>Page {pagination.page}</strong> shared state</span>
          <span className="queue-summary-chip"><strong>{regularizationStatusOptions.length}</strong> request statuses</span>
        </div>
      </section>

      <div className="queue-list">
        {items.map((item) => (
          <article className="record-card panel-card-soft" key={item.id}>
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>{item.employee_name}</h2>
                </div>
                <div className="record-card__eyebrow">
                  <span className="record-chip record-chip--accent">{item.status}</span>
                  <span className="record-chip">{item.current_status} to {item.requested_status}</span>
                </div>
                <p className="section-copy section-copy-soft">{item.employee_code} • {item.attendance_date} • {item.shift || "No shift"}</p>
              </div>
              <div className="record-card__actions">
                <Link className="button button--secondary" href={`/hr-admin/attendance-regularizations/${item.id}/review`}>
                  Review request
                </Link>
              </div>
            </div>
            <div className="detail-grid">
              <div className="detail-row"><span className="detail-label">Applied at</span><span className="detail-value">{formatDateTime(item.applied_at)}</span></div>
              <div className="detail-row"><span className="detail-label">Reason</span><span className="detail-value">{item.reason || "No reason"}</span></div>
              <div className="detail-row"><span className="detail-label">Manager comment</span><span className="detail-value">{item.manager_comment || "None"}</span></div>
              <div className="detail-row"><span className="detail-label">Workflow reference</span><span className="detail-value">{item.workflow_reference || "Not linked"}</span></div>
            </div>
            <AttendanceRegularizationInlineReview item={item} />
          </article>
        ))}
        {items.length === 0 ? (
          <div className="record-card panel-card-soft">
            <strong>No regularizations match the current filters.</strong>
            <p className="muted">Try clearing one or more filters to widen the queue.</p>
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
