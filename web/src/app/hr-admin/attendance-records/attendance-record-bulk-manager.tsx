"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { attendanceRecordToFormValue } from "@/app/hr-admin/attendance-records/form-values";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { WorkspaceFilterBar, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type {
  HrAdminAttendanceOperationOptions,
  HrAdminAttendanceRecord,
  HrAdminEnumOption,
  HrAdminOptionItem,
} from "@/lib/types";
import { AttendanceRecordForm } from "./attendance-record-form";

type Props = {
  items: HrAdminAttendanceRecord[];
  state: "live" | "demo";
  statusOptions: HrAdminEnumOption[];
  sourceOptions: HrAdminEnumOption[];
  shiftOptions: HrAdminOptionItem[];
  recordOptions: HrAdminAttendanceOperationOptions;
  editRecord?: HrAdminAttendanceRecord | null;
  currentFilters: {
    q: string;
    status: string;
    source: string;
    shift_id: string;
    lock_state: string;
    regularized_state: string;
    from_date: string;
    to_date: string;
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
  canManageRecords?: boolean;
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
    if (value === undefined || value === "" || value === false) return;
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function formatDateTime(value: string | null) {
  if (!value) return "Not marked";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${value}T00:00:00+05:30`));
}

function formatLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getDerivationReason(item: HrAdminAttendanceRecord) {
  return item.derivation_summary?.reasons?.[0] || "Attendance status is awaiting derivation evidence.";
}

function badgeTone(value: string, locked = false): "success" | "warning" | "danger" | "neutral" | "info" {
  if (locked) return "neutral";
  const normalized = value.toLowerCase();
  if (["present", "approved", "regularized"].includes(normalized)) return "success";
  if (["absent", "missing", "error"].includes(normalized)) return "danger";
  if (["late", "half_day", "pending"].includes(normalized)) return "warning";
  return "info";
}

export function AttendanceRecordBulkManager({
  items,
  state,
  statusOptions,
  sourceOptions,
  shiftOptions,
  recordOptions,
  editRecord = null,
  currentFilters,
  pagination,
  canManageRecords = true,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState(currentFilters.q);
  const [statusFilter, setStatusFilter] = useState(currentFilters.status || "all");
  const [sourceFilter, setSourceFilter] = useState(currentFilters.source || "all");
  const [shiftFilter, setShiftFilter] = useState(currentFilters.shift_id || "all");
  const [lockFilter, setLockFilter] = useState(currentFilters.lock_state || "all");
  const [regularizedFilter, setRegularizedFilter] = useState(currentFilters.regularized_state || "all");
  const [fromDate, setFromDate] = useState(currentFilters.from_date);
  const [toDate, setToDate] = useState(currentFilters.to_date);
  const [lateOnly, setLateOnly] = useState(currentFilters.late_only);
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));
  const [bulkStatus, setBulkStatus] = useState(statusOptions[0]?.value ?? "present");
  const submittingRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const editRecordId = searchParams.get("editRecord") ?? "";
  const modalEditRecord = canManageRecords && editRecordId ? editRecord : null;
  const lateOnPage = items.filter((item) => item.late_minutes > 0).length;
  const lockedOnPage = items.filter((item) => item.is_locked).length;
  const regularizedOnPage = items.filter((item) => item.is_regularized).length;
  const totalPages = Math.max(1, Math.ceil(pagination.total_count / pagination.page_size));

  function queueHref(overrides: Record<string, string | number | boolean | undefined> = {}) {
    return `${pathname}${buildQueryString({
      q: currentFilters.q || undefined,
      status: currentFilters.status || undefined,
      source: currentFilters.source || undefined,
      shift_id: currentFilters.shift_id || undefined,
      lock_state: currentFilters.lock_state || undefined,
      regularized_state: currentFilters.regularized_state || undefined,
      from_date: currentFilters.from_date || undefined,
      to_date: currentFilters.to_date || undefined,
      late_only: currentFilters.late_only || undefined,
      page: currentFilters.page,
      page_size: currentFilters.page_size,
      ...overrides,
    })}`;
  }

  function buildFilterHref(page: number, nextPageSize = pageSize, nextSearch = search) {
    return `${pathname}${buildQueryString({
      q: nextSearch.trim() || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      source: sourceFilter !== "all" ? sourceFilter : undefined,
      shift_id: shiftFilter !== "all" ? shiftFilter : undefined,
      lock_state: lockFilter !== "all" ? lockFilter : undefined,
      regularized_state: regularizedFilter !== "all" ? regularizedFilter : undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      late_only: lateOnly || undefined,
      page,
      page_size: Number(nextPageSize) || currentFilters.page_size,
    })}`;
  }

  function goToPage(page: number) {
    router.push(buildFilterHref(page));
  }

  function applyFilters() {
    const nextSearch = searchInputRef.current?.value ?? search;
    setSearch(nextSearch);
    router.push(buildFilterHref(1, pageSize, nextSearch));
  }

  function applyPageSize() {
    router.push(buildFilterHref(1, pageSize));
  }

  function toggleOne(itemId: string) {
    setSelectedIds((current) => (current.includes(itemId) ? current.filter((value) => value !== itemId) : [...current, itemId]));
  }

  function toggleAll() {
    setSelectedIds((current) => (current.length === items.length ? [] : items.map((item) => item.id)));
  }

  async function handleBulkAction(action: "lock" | "unlock" | "set_status" | "mark_regularized" | "clear_regularized") {
    if (submittingRef.current) return;
    submittingRef.current = true;
    if (state !== "live") {
      setError("Bulk actions are disabled in demo mode.");
      submittingRef.current = false;
      return;
    }
    if (!canManageRecords) {
      setError("You need attendance record management permission to run bulk actions.");
      submittingRef.current = false;
      return;
    }
    setError("");
    setIsSubmitting(true);
    const body: { action: string; record_ids: string[]; status?: string } = {
      action,
      record_ids: selectedIds,
    };
    if (action === "set_status") body.status = bulkStatus;
    let response: Response;
    try {
      response = await fetch("/api/hr-admin/attendance-records/bulk-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      setError("Unable to reach the server. Check your connection and try again.");
      setIsSubmitting(false);
      submittingRef.current = false;
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      submittingRef.current = false;
      return;
    }
    setSelectedIds([]);
    setIsSubmitting(false);
    submittingRef.current = false;
    router.refresh();
  }

  return (
    <section className="section queue-layout attendance-records-workbench">
      <div className="attendance-summary-strip" aria-label="Attendance record summary">
        <span><strong>{pagination.total_count}</strong> records</span>
        <span><strong>{items.length}</strong> on page</span>
        <span><strong>{lateOnPage}</strong> late</span>
        <span><strong>{regularizedOnPage}</strong> regularized</span>
        <span><strong>{lockedOnPage}</strong> locked</span>
      </div>

      <section aria-label="Attendance records toolbar" className="panel-card-soft attendance-queue-toolbar" data-testid="attendance-records-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Attendance records</h2>
            <p className="section-copy section-copy-soft">Filter daily rows, inspect exceptions, and apply permitted bulk actions.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{items.length}</strong> in this view</span>
            <span className="queue-summary-chip"><strong>{selectedIds.length}</strong> selected</span>
          </div>
        </div>
        <WorkspaceFilterBar className="attendance-record-filter-bar">
          <label className="form-field">
            <span className="muted">Search</span>
            <input ref={searchInputRef} className="input-control" onChange={(event) => setSearch(event.target.value)} placeholder="Employee, code, shift, source, date" value={search} />
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
          <details className="attendance-more-filters">
            <summary className="button button--secondary">More filters</summary>
            <div className="attendance-more-filters__panel">
              <label className="form-field">
                <span className="muted">Shift</span>
                <select aria-label="Shift" className="input-control" onChange={(event) => setShiftFilter(event.target.value)} value={shiftFilter}>
                  <option value="all">All shifts</option>
                  {shiftOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
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
                <span className="muted">Regularization</span>
                <select className="input-control" onChange={(event) => setRegularizedFilter(event.target.value)} value={regularizedFilter}>
                  <option value="all">All rows</option>
                  <option value="regularized">Regularized only</option>
                  <option value="not_regularized">Not regularized</option>
                </select>
              </label>
              <label className="form-field">
                <span className="muted">From date</span>
                <input className="input-control" onChange={(event) => setFromDate(event.target.value)} type="date" value={fromDate} />
              </label>
              <label className="form-field">
                <span className="muted">To date</span>
                <input className="input-control" onChange={(event) => setToDate(event.target.value)} type="date" value={toDate} />
              </label>
              <label className="form-field">
                <span className="muted">Late focus</span>
                <label className="toggle-inline">
                  <input checked={lateOnly} onChange={(event) => setLateOnly(event.target.checked)} type="checkbox" />
                  <span className="detail-value">Late rows only</span>
                </label>
              </label>
            </div>
          </details>
        </WorkspaceFilterBar>
        <div className="queue-toolbar__actions attendance-toolbar-actions">
          <button className="button button--primary" onClick={applyFilters} type="button">Apply filters</button>
          <button className="button button--ghost" onClick={() => {
            setSearch("");
            setStatusFilter("all");
            setSourceFilter("all");
            setShiftFilter("all");
            setLockFilter("all");
            setRegularizedFilter("all");
            setFromDate("");
            setToDate("");
            setLateOnly(false);
            setPageSize("25");
            router.push(pathname);
          }} type="button">
            Clear filters
          </button>
          {canManageRecords ? (
            <button className="button button--secondary" disabled={items.length === 0} onClick={toggleAll} type="button">
              {allSelected ? "Clear page" : "Select page"}
            </button>
          ) : null}
        </div>
        {canManageRecords ? (
          <div className="attendance-bulk-panel">
            <label className="form-field">
              <span className="muted">Bulk status</span>
              <select className="input-control" onChange={(event) => setBulkStatus(event.target.value)} value={bulkStatus}>
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <div className="attendance-bulk-panel__actions">
              <button className="button button--primary" disabled={isSubmitting || selectedIds.length === 0} onClick={() => handleBulkAction("set_status")} type="button">
                Set status ({selectedIds.length || 0})
              </button>
              <button className="button button--secondary" disabled={isSubmitting || selectedIds.length === 0} onClick={() => handleBulkAction("lock")} type="button">Lock</button>
              <button className="button button--secondary" disabled={isSubmitting || selectedIds.length === 0} onClick={() => handleBulkAction("unlock")} type="button">Unlock</button>
              <button className="button button--secondary" disabled={isSubmitting || selectedIds.length === 0} onClick={() => handleBulkAction("mark_regularized")} type="button">Mark regularized</button>
              <button className="button button--ghost" disabled={isSubmitting || selectedIds.length === 0} onClick={() => handleBulkAction("clear_regularized")} type="button">Clear regularized</button>
            </div>
          </div>
        ) : (
          <div className="notice"><strong>Read-only attendance view.</strong><span className="muted">Record edits and bulk actions require attendance record management permission.</span></div>
        )}
        {error ? <div className="notice notice--error" role="alert"><strong>Bulk action failed.</strong><span className="muted">{error}</span></div> : null}
      </section>

      <div className={`attendance-review-workbench${selectedItem ? " attendance-review-workbench--with-detail" : ""}`}>
        <section className="panel-card-soft attendance-directory-panel">
          <div className="attendance-directory-table-wrap">
            <table className="workspace-table attendance-directory-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date and shift</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>State</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isRowSelected = selectedItem?.id === item.id;
                  const isChecked = selectedIds.includes(item.id);
                  return (
                    <tr
                      aria-selected={isRowSelected}
                      className={isRowSelected ? "is-selected" : ""}
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <td>
                        <div className="workspace-table__primary-cell">
                          {canManageRecords ? (
                            <input
                              aria-label={`Select ${item.employee_name}`}
                              checked={isChecked}
                              onChange={() => toggleOne(item.id)}
                              onClick={(event) => event.stopPropagation()}
                              type="checkbox"
                            />
                          ) : null}
                          <div>
                            <strong>{item.employee_name}</strong>
                            <span>{item.employee_code}</span>
                          </div>
                        </div>
                      </td>
                      <td><strong>{formatDate(item.attendance_date)}</strong><span>{item.shift || "No shift"}</span></td>
                      <td><WorkspaceStatusBadge tone={badgeTone(item.status)}>{formatLabel(item.status)}</WorkspaceStatusBadge><span>{formatLabel(item.source)}</span></td>
                      <td><strong>{item.work_duration_hours} hrs</strong><span>{item.late_minutes ? `${item.late_minutes} min late` : "No late mark"}</span></td>
                      <td>
                        <WorkspaceStatusBadge tone={badgeTone(item.is_regularized ? "regularized" : "open", item.is_locked)}>{item.is_locked ? "Locked" : "Open"}</WorkspaceStatusBadge>
                        <span>{item.is_regularized ? "Regularized" : "Not regularized"}</span>
                      </td>
                      <td>
                        <button className="button button--secondary button--compact" onClick={(event) => {
                          event.stopPropagation();
                          setSelectedItemId(item.id);
                        }} type="button">
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <strong>No attendance rows match the current filters.</strong>
                      <span>Try clearing one or more filters to widen the queue.</span>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {selectedItem ? (
          <aside className="panel-card-soft attendance-detail-drawer" aria-label="Attendance record detail">
            <div className="queue-toolbar__header">
              <div>
                <h2 className="section-heading-soft">Attendance detail</h2>
                <p className="section-copy section-copy-soft">Focused context for the selected record.</p>
              </div>
              <button className="button button--secondary button--compact" onClick={() => setSelectedItemId("")} type="button">Close</button>
            </div>
            <article className="record-card record-card--compact">
              <div className="record-card__header">
                <div>
                  <h3>{selectedItem.employee_name}</h3>
                  <p className="section-copy section-copy-soft">{selectedItem.employee_code} · {formatDate(selectedItem.attendance_date)}</p>
                </div>
                <WorkspaceStatusBadge tone={badgeTone(selectedItem.status)}>{formatLabel(selectedItem.status)}</WorkspaceStatusBadge>
              </div>
              <div className="record-card__eyebrow">
                <WorkspaceStatusBadge tone={selectedItem.is_locked ? "neutral" : "success"}>{selectedItem.is_locked ? "Locked" : "Open"}</WorkspaceStatusBadge>
                <WorkspaceStatusBadge tone={selectedItem.is_regularized ? "success" : "neutral"}>{selectedItem.is_regularized ? "Regularized" : "Not regularized"}</WorkspaceStatusBadge>
                {selectedItem.late_minutes ? <WorkspaceStatusBadge tone="warning">{selectedItem.late_minutes} min late</WorkspaceStatusBadge> : null}
              </div>
            </article>
            <div className="record-card__actions">
              {canManageRecords ? (
                <Link className="button button--primary" href={queueHref({ editRecord: selectedItem.id })}>Edit record</Link>
              ) : (
                <button className="button button--secondary" disabled title="Requires attendance.records.manage permission." type="button">Edit record</button>
              )}
            </div>
            <details className="record-card" open>
              <summary>Timing</summary>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Check in</span><span className="detail-value">{formatDateTime(selectedItem.check_in_at)}</span></div>
                <div className="detail-row"><span className="detail-label">Check out</span><span className="detail-value">{formatDateTime(selectedItem.check_out_at)}</span></div>
                <div className="detail-row"><span className="detail-label">Work duration</span><span className="detail-value">{selectedItem.work_duration_hours}</span></div>
                <div className="detail-row"><span className="detail-label">Overtime</span><span className="detail-value">{selectedItem.overtime_hours}</span></div>
                <div className="detail-row"><span className="detail-label">Early exit</span><span className="detail-value">{selectedItem.early_exit_minutes} minutes</span></div>
              </div>
            </details>
            <details className="record-card" open>
              <summary>Derivation</summary>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Reason</span><span className="detail-value">{getDerivationReason(selectedItem)}</span></div>
                <div className="detail-row"><span className="detail-label">Expected hours</span><span className="detail-value">{selectedItem.derivation_summary.expected_hours}</span></div>
                <div className="detail-row"><span className="detail-label">Payable / LOP</span><span className="detail-value">{selectedItem.derivation_summary.payroll_impact.payable_units} / {selectedItem.derivation_summary.payroll_impact.lop_units}</span></div>
                <div className="detail-row"><span className="detail-label">Leave collision</span><span className="detail-value">{selectedItem.derivation_summary.leave_collision_count ? `${selectedItem.derivation_summary.leave_collision_count} overlap` : "Clear"}</span></div>
              </div>
            </details>
          </aside>
        ) : null}
      </div>

      <div className="panel-card-soft attendance-pagination-panel">
        <span className="queue-summary-chip"><strong>{pagination.total_count ? ((pagination.page - 1) * pagination.page_size) + 1 : 0}-{Math.min(pagination.page * pagination.page_size, pagination.total_count)}</strong> of {pagination.total_count} records</span>
        <span className="queue-summary-chip"><strong>Page {pagination.page}</strong> of {totalPages}</span>
        <label className="form-field attendance-pagination-rows">
          <span className="muted">Rows</span>
          <select className="input-control" onChange={(event) => setPageSize(event.target.value)} value={pageSize}>
            {[10, 25, 50, 100].map((value) => <option key={value} value={String(value)}>{value}</option>)}
          </select>
        </label>
        <button className="button button--secondary" onClick={applyPageSize} type="button">Apply</button>
        {totalPages > 1 ? (
          <div className="attendance-pagination-panel__controls">
            <button className="button button--secondary" disabled={!pagination.has_previous} onClick={() => goToPage(1)} type="button">First</button>
            <button className="button button--secondary" disabled={!pagination.has_previous} onClick={() => goToPage(pagination.page - 1)} type="button">Previous</button>
            <button className="button button--secondary" disabled={!pagination.has_next} onClick={() => goToPage(pagination.page + 1)} type="button">Next</button>
            <button className="button button--secondary" disabled={!pagination.has_next} onClick={() => goToPage(totalPages)} type="button">Last</button>
          </div>
        ) : null}
      </div>

      {modalEditRecord ? (
        <HrAdminActionModal
          className="attendance-record-edit-modal"
          closeHref={queueHref({ editRecord: undefined })}
          eyebrow="Attendance record"
          labelledBy="attendance-record-edit-modal-title"
          title={`Edit ${modalEditRecord.employee_name}`}
          description="Update record interpretation, timing and lock state."
          tabs={["Record", "State"]}
        >
          <AttendanceRecordForm
            compact
            cancelHref={queueHref({ editRecord: undefined })}
            successHref={queueHref({ editRecord: undefined })}
            initialValue={attendanceRecordToFormValue(modalEditRecord)}
            itemId={modalEditRecord.id}
            options={recordOptions}
          />
        </HrAdminActionModal>
      ) : null}
    </section>
  );
}
