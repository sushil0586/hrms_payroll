"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { PaginationBar } from "@/components/patterns/pagination-bar";
import type { HrAdminAttendanceRecord, HrAdminEnumOption } from "@/lib/types";

type Props = {
  items: HrAdminAttendanceRecord[];
  state: "live" | "demo";
  statusOptions: HrAdminEnumOption[];
  sourceOptions: HrAdminEnumOption[];
  currentFilters: {
    q: string;
    status: string;
    source: string;
    lock_state: string;
    regularized_state: string;
    late_only: boolean;
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

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to run bulk attendance action.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to run bulk attendance action.");
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

export function AttendanceRecordBulkManager({
  items,
  state,
  statusOptions,
  sourceOptions,
  currentFilters,
  pagination,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState(currentFilters.q);
  const [statusFilter, setStatusFilter] = useState(currentFilters.status || "all");
  const [sourceFilter, setSourceFilter] = useState(currentFilters.source || "all");
  const [lockFilter, setLockFilter] = useState(currentFilters.lock_state || "all");
  const [regularizedFilter, setRegularizedFilter] = useState(currentFilters.regularized_state || "all");
  const [lateOnly, setLateOnly] = useState(currentFilters.late_only);
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));
  const [bulkStatus, setBulkStatus] = useState(statusOptions[0]?.value ?? "present");

  const allSelected = items.length > 0 && selectedIds.length === items.length;

  function toggleOne(itemId: string) {
    setSelectedIds((current) => (current.includes(itemId) ? current.filter((value) => value !== itemId) : [...current, itemId]));
  }

  function toggleAll() {
    setSelectedIds((current) => (current.length === items.length ? [] : items.map((item) => item.id)));
  }

  function goToPage(page: number) {
    router.push(`${pathname}${buildQueryString({
      q: search.trim() || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      source: sourceFilter !== "all" ? sourceFilter : undefined,
      lock_state: lockFilter !== "all" ? lockFilter : undefined,
      regularized_state: regularizedFilter !== "all" ? regularizedFilter : undefined,
      late_only: lateOnly || undefined,
      page,
      page_size: Number(pageSize) || currentFilters.page_size,
    })}`);
  }

  function applyFilters() {
    goToPage(1);
  }

  async function handleBulkAction(action: "lock" | "unlock" | "set_status" | "mark_regularized" | "clear_regularized") {
    if (state !== "live") {
      setError("Bulk actions are disabled in demo mode.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    const body: { action: string; record_ids: string[]; status?: string } = {
      action,
      record_ids: selectedIds,
    };
    if (action === "set_status") {
      body.status = bulkStatus;
    }
    const response = await fetch("/api/hr-admin/attendance-records/bulk-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }
    setSelectedIds([]);
    router.refresh();
  }

  return (
    <section className="section queue-layout">
      <section className="queue-toolbar panel-card-soft">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Attendance records</h2>
            <p className="section-copy section-copy-soft">Narrow the daily attendance window, then apply bulk actions.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{pagination.total_count}</strong> total rows</span>
            <span className="queue-summary-chip"><strong>{items.length}</strong> on this page</span>
            <span className="queue-summary-chip"><strong>{selectedIds.length}</strong> selected</span>
          </div>
        </div>
        <div className="queue-toolbar__grid">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" onChange={(event) => setSearch(event.target.value)} placeholder="Employee, code, shift, source, date" value={search} />
          </label>
          <label className="form-field">
            <span className="muted">Status</span>
            <select className="input-control" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="all">All statuses</option>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Source</span>
            <select className="input-control" onChange={(event) => setSourceFilter(event.target.value)} value={sourceFilter}>
              <option value="all">All sources</option>
              {sourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Lock state</span>
            <select className="input-control" onChange={(event) => setLockFilter(event.target.value)} value={lockFilter}>
              <option value="all">All rows</option>
              <option value="locked">Locked only</option>
              <option value="open">Open only</option>
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Regularization state</span>
            <select className="input-control" onChange={(event) => setRegularizedFilter(event.target.value)} value={regularizedFilter}>
              <option value="all">All rows</option>
              <option value="regularized">Regularized only</option>
              <option value="not_regularized">Not regularized</option>
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Rows per page</span>
            <select className="input-control" onChange={(event) => setPageSize(event.target.value)} value={pageSize}>
              {[10, 25, 50, 100].map((value) => <option key={value} value={String(value)}>{value}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Late-only focus</span>
            <label className="toggle-inline">
              <input checked={lateOnly} onChange={(event) => setLateOnly(event.target.checked)} type="checkbox" />
              <span className="detail-value">Only show rows with late minutes</span>
            </label>
          </label>
        </div>
        <div className="queue-toolbar__actions">
          <button className="button button--primary" onClick={applyFilters} type="button">
            Apply filters
          </button>
          <button className="button button--ghost" onClick={() => {
            setSearch("");
            setStatusFilter("all");
            setSourceFilter("all");
            setLockFilter("all");
            setRegularizedFilter("all");
            setLateOnly(false);
            setPageSize("25");
            router.push(pathname);
          }} type="button">
            Clear filters
          </button>
          <button className="button button--secondary" disabled={items.length === 0} onClick={toggleAll} type="button">
            {allSelected ? "Clear selection" : "Select page"}
          </button>
          <button className="button button--primary" disabled={isSubmitting || selectedIds.length === 0} onClick={() => handleBulkAction("lock")} type="button">
            {isSubmitting ? "Saving..." : `Lock (${selectedIds.length || 0})`}
          </button>
          <button className="button button--secondary" disabled={isSubmitting || selectedIds.length === 0} onClick={() => handleBulkAction("unlock")} type="button">
            Unlock ({selectedIds.length || 0})
          </button>
        </div>
        <div className="queue-toolbar__grid">
          <label className="form-field">
            <span className="muted">Bulk attendance status</span>
            <select className="input-control" onChange={(event) => setBulkStatus(event.target.value)} value={bulkStatus}>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <div className="form-field">
            <span className="muted">Bulk actions</span>
            <div className="queue-toolbar__actions">
              <button className="button button--secondary" disabled={isSubmitting || selectedIds.length === 0} onClick={() => handleBulkAction("set_status")} type="button">
                Set status ({selectedIds.length || 0})
              </button>
              <button className="button button--secondary" disabled={isSubmitting || selectedIds.length === 0} onClick={() => handleBulkAction("mark_regularized")} type="button">
                Mark regularized
              </button>
              <button className="button button--ghost" disabled={isSubmitting || selectedIds.length === 0} onClick={() => handleBulkAction("clear_regularized")} type="button">
                Clear regularized
              </button>
            </div>
          </div>
        </div>
        <div className="queue-toolbar__summary">
          <span className="queue-summary-chip"><strong>Page {pagination.page}</strong> shared state</span>
          <span className="queue-summary-chip"><strong>{selectedIds.length}</strong> selected</span>
        </div>
        {error ? <div className="notice"><strong>Bulk action failed.</strong><span className="muted">{error}</span></div> : null}
      </section>

      <div className="queue-list">
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <article className="record-card panel-card-soft" key={item.id}>
              <div className="record-card__header">
                <div className="record-card__title-wrap">
                  <div className="record-card__title">
                    <label className="toggle-inline">
                      <input checked={isSelected} onChange={() => toggleOne(item.id)} type="checkbox" />
                      <h2>{item.employee_name}</h2>
                    </label>
                  </div>
                  <div className="record-card__eyebrow">
                    <span className={`record-chip record-chip--accent`}>{item.status}</span>
                    <span className="record-chip">{item.source}</span>
                    <span className="record-chip">{item.is_locked ? "locked" : "open"}</span>
                    {item.is_regularized ? <span className="record-chip">regularized</span> : null}
                  </div>
                  <p className="section-copy section-copy-soft">{item.employee_code} • {item.attendance_date} • {item.shift || "No shift"}</p>
                </div>
                <div className="record-card__actions">
                  <button className="button button--secondary" disabled={items.length === 0} onClick={toggleAll} type="button">
                    {allSelected ? "Clear page selection" : "Select page"}
                  </button>
                  <Link className="button button--secondary" href={`/hr-admin/attendance-records/${item.id}/edit`}>Edit record</Link>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Check in</span><span className="detail-value">{item.check_in_at ? new Date(item.check_in_at).toLocaleString("en-IN") : "Not marked"}</span></div>
                <div className="detail-row"><span className="detail-label">Check out</span><span className="detail-value">{item.check_out_at ? new Date(item.check_out_at).toLocaleString("en-IN") : "Not marked"}</span></div>
                <div className="detail-row"><span className="detail-label">Late minutes</span><span className="detail-value">{item.late_minutes}</span></div>
                <div className="detail-row"><span className="detail-label">Regularized</span><span className="detail-value">{item.is_regularized ? "Yes" : "No"}</span></div>
              </div>
            </article>
          );
        })}
        {items.length === 0 ? (
          <div className="record-card panel-card-soft">
            <strong>No attendance rows match the current filters.</strong>
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
