"use client";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";


import { useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { attendanceRecordToFormValue } from "@/app/hr-admin/attendance-records/form-values";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { AttendanceRecordFilterForm } from "./attendance-record-filters";
import { attendanceQueueHref, type AttendanceRecordFilters } from "./filter-contract";
import type {
  HrAdminAttendanceOperationOptions,
  HrAdminAttendanceRecord,
  HrAdminEnumOption,
  HrAdminOptionItem,
} from "@/lib/types";
import { useRefreshAfterMutation } from "@/lib/ui/use-refresh-after-mutation";
import { AttendanceRecordForm } from "./attendance-record-form";

type Props = {
  items: HrAdminAttendanceRecord[];
  state: "live" | "demo";
  statusOptions: HrAdminEnumOption[];
  sourceOptions: HrAdminEnumOption[];
  shiftOptions: HrAdminOptionItem[];
  recordOptions: HrAdminAttendanceOperationOptions;
  editRecord?: HrAdminAttendanceRecord | null;
  currentFilters: AttendanceRecordFilters;
  validationError?: string;
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
  validationError = "",
  pagination,
  canManageRecords = true,
}: Props) {
  const { isRefreshing, refresh } = useRefreshAfterMutation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scope = JSON.stringify(currentFilters);
  const [selection, setSelection] = useState<{scope: string; ids: string[]}>({scope, ids: []});
  const [inspection, setInspection] = useState({scope, id: ""});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkStatus, setBulkStatus] = useState(statusOptions[0]?.value ?? "present");
  const submittingRef = useRef(false);
  const selectedIds = useMemo(() => selection.scope === scope ? selection.ids.filter(id => items.some(item => item.id === id)) : [], [items, scope, selection]);
  const selectedItem = inspection.scope === scope ? items.find(item => item.id === inspection.id) ?? null : null;
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  function setSelectedIds(next: string[] | ((ids: string[]) => string[])) {
    setSelection(previous => {
      const visible = previous.scope === scope ? previous.ids.filter(id => items.some(item => item.id === id)) : [];
      return {scope, ids: typeof next === "function" ? next(visible) : next};
    });
  }
  function setSelectedItemId(id: string) { setInspection({scope, id}); }
  const editRecordId = searchParams.get("editRecord") ?? "";
  const modalEditRecord = canManageRecords && editRecordId ? editRecord : null;
  const lateOnPage = items.filter((item) => item.late_minutes > 0).length;
  const lockedOnPage = items.filter((item) => item.is_locked).length;
  const regularizedOnPage = items.filter((item) => item.is_regularized).length;
  const totalPages = Math.max(1, Math.ceil(pagination.total_count / pagination.page_size));

  function queueHref(overrides: Record<string, string | number | boolean | undefined> = {}) {
    return attendanceQueueHref(pathname, currentFilters, overrides);
  }
  function goToPage(page: number) { window.location.assign(queueHref({page})); }
  function toggleOne(itemId: string) {
    setSelectedIds((current) => (current.includes(itemId) ? current.filter((value) => value !== itemId) : [...current, itemId]));
  }

  function toggleAll() {
    setSelectedIds((current) => (current.length === items.length ? [] : items.map((item) => item.id)));
  }

  async function handleBulkAction(action: "lock" | "unlock" | "set_status" | "mark_regularized" | "clear_regularized") {
    if (submittingRef.current || isRefreshing) return;
    if (!selectedIds.length) { setError("Select records on the current page before running an action."); return; }
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
    setSuccess("");
    setIsSubmitting(true);
    const body: { action: string; record_ids: string[]; status?: string } = {
      action,
      record_ids: selectedIds.filter(id => items.some(item => item.id === id)),
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
    setSuccess(`${Number(payload.updated_count) || 0} attendance records updated. Refreshing this view.`);
    setSelectedIds([]);
    setIsSubmitting(false);
    submittingRef.current = false;
    refresh();
  }

  return (
    <section className="section queue-layout attendance-records-workbench">
      {!validationError ? <div className="attendance-summary-strip" aria-label="Attendance record summary">
        <span><strong>{pagination.total_count}</strong> records</span>
        <span><strong>{items.length}</strong> on page</span>
        <span><strong>{lateOnPage}</strong> late on page</span>
        <span><strong>{regularizedOnPage}</strong> regularized on page</span>
        <span><strong>{lockedOnPage}</strong> locked on page</span>
      </div> : null}

      <section aria-label="Attendance records toolbar" className="panel-card-soft attendance-queue-toolbar workspace-list-card" data-testid="attendance-records-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Attendance records</h2>
            <p className="section-copy section-copy-soft">Filter daily rows, inspect exceptions, and apply permitted bulk actions.</p>
          </div>
          {!validationError ? <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{items.length}</strong> in this view</span>
            <span className="queue-summary-chip"><strong>{selectedIds.length}</strong> selected</span>
          </div> : null}
        </div>
        <AttendanceRecordFilterForm key={scope} filters={currentFilters} statusOptions={statusOptions} sourceOptions={sourceOptions} shiftOptions={shiftOptions} />
        {validationError ? <div className="notice notice--error" role="alert">{validationError}</div> : null}
        <div className="queue-toolbar__actions attendance-toolbar-actions">
          {canManageRecords ? (
            <button className="button button--secondary" disabled={items.length === 0 || Boolean(validationError) || isSubmitting || isRefreshing} onClick={toggleAll} type="button">
              {allSelected ? "Clear page" : "Select page"}
            </button>
          ) : null}
        </div>
        {canManageRecords ? (
          <div className="attendance-bulk-panel workspace-action-panel">
            <label className="form-field">
              <span className="muted">Bulk status</span>
              <select className="input-control" onChange={(event) => setBulkStatus(event.target.value)} value={bulkStatus}>
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <div className="attendance-bulk-panel__actions">
              <AsyncActionButton className="button button--primary" disabled={selectedIds.length === 0} pending={isSubmitting || isRefreshing} pendingLabel={isRefreshing ? "Refreshing records" : "Updating records"} onClick={() => handleBulkAction("set_status")} type="button">
                Set status ({selectedIds.length || 0})
              </AsyncActionButton>
              <AsyncActionButton className="button button--secondary" disabled={selectedIds.length === 0} pending={isSubmitting || isRefreshing} pendingLabel={isRefreshing ? "Refreshing records" : "Locking records"} onClick={() => handleBulkAction("lock")} type="button">Lock</AsyncActionButton>
              <AsyncActionButton className="button button--secondary" disabled={selectedIds.length === 0} pending={isSubmitting || isRefreshing} pendingLabel={isRefreshing ? "Refreshing records" : "Unlocking records"} onClick={() => handleBulkAction("unlock")} type="button">Unlock</AsyncActionButton>
              <AsyncActionButton className="button button--secondary" disabled={selectedIds.length === 0} pending={isSubmitting || isRefreshing} pendingLabel={isRefreshing ? "Refreshing records" : "Marking records regularized"} onClick={() => handleBulkAction("mark_regularized")} type="button">Mark regularized</AsyncActionButton>
              <AsyncActionButton className="button button--ghost" disabled={selectedIds.length === 0} pending={isSubmitting || isRefreshing} pendingLabel={isRefreshing ? "Refreshing records" : "Clearing regularization"} onClick={() => handleBulkAction("clear_regularized")} type="button">Clear regularized</AsyncActionButton>
            </div>
          </div>
        ) : (
          <div className="notice"><strong>Read-only attendance view.</strong><span className="muted">Record edits and bulk actions require attendance record management permission.</span></div>
        )}
        {success ? <div className="notice" role="status">{success}</div> : null}
        {error ? <div className="notice notice--error" role="alert"><strong>Bulk action failed.</strong><span className="muted">{error}</span></div> : null}
      </section>

      {!validationError ? <div className={`attendance-review-workbench${selectedItem ? " attendance-review-workbench--with-detail" : ""}`}>
        <section className="panel-card-soft attendance-directory-panel workspace-list-card">
          <WorkspaceTableScrollRegion label="Attendance records, scroll for more columns" className="attendance-directory-table-wrap workspace-table-region">
            <table aria-label="Attendance records" className="workspace-table attendance-directory-table workspace-data-table">
              <thead>
                <tr>
                  <th scope="col">Employee</th>
                  <th scope="col">Date and shift</th>
                  <th scope="col">Status</th>
                  <th scope="col">Time</th>
                  <th scope="col">State</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isRowSelected = selectedItem?.id === item.id;
                  const isChecked = selectedIds.includes(item.id);
                  return (
                    <tr
                      className={isRowSelected ? "is-selected" : ""}
                      data-record-id={item.id}
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <td>
                        <div className="workspace-table__primary-cell">
                          {canManageRecords ? (
                            <input
                              aria-label={`Select ${item.employee_name}, ${item.attendance_date}`}
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
                        <button className="button button--secondary button--compact" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent);
                          triggerEvent.stopPropagation();
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
          </WorkspaceTableScrollRegion>
        </section>

        {selectedItem ? (
          <aside className="panel-card-soft attendance-detail-drawer" aria-label="Attendance record detail">
            <div className="queue-toolbar__header">
              <div>
                <h2 className="section-heading-soft">Attendance detail</h2>
                <p className="section-copy section-copy-soft">Focused context for the selected record.</p>
              </div>
              <button className="button button--secondary button--compact" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); setSelectedItemId(""); }} type="button">Close</button>
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
                <a data-navigation-mode="document" className="button button--primary" href={queueHref({ editRecord: selectedItem.id })}>Edit record</a>
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
      </div> : null}

      {!validationError ? <div className="panel-card-soft attendance-pagination-panel workspace-pagination">
        <span className="queue-summary-chip"><strong>{pagination.total_count ? ((pagination.page - 1) * pagination.page_size) + 1 : 0}-{Math.min(pagination.page * pagination.page_size, pagination.total_count)}</strong> of {pagination.total_count} records</span>
        <span className="queue-summary-chip"><strong>Page {pagination.page}</strong> of {totalPages}</span>
        <form key={scope} action={pathname} method="get" data-navigation-mode="document" aria-label="Attendance pagination" className="workspace-page-size-form">
          {Object.entries(currentFilters).filter(([key,value]) => key !== "page" && key !== "page_size" && value !== "" && value !== false).map(([key,value]) => <input key={key} type="hidden" name={key} value={String(value)}/>)}
          <input type="hidden" name="page" value="1"/>
          <label className="form-field attendance-pagination-rows"><span className="muted">Rows</span><select className="input-control" name="page_size" defaultValue={String(currentFilters.page_size)}>{[10,25,50,100].map(value=><option key={value} value={value}>{value}</option>)}</select></label>
          <button className="button button--secondary" type="submit">Apply</button>
        </form>
        {totalPages > 1 ? (
          <div className="attendance-pagination-panel__controls">
            <button className="button button--secondary" disabled={!pagination.has_previous} onClick={() => goToPage(1)} type="button">First</button>
            <button className="button button--secondary" disabled={!pagination.has_previous} onClick={() => goToPage(pagination.page - 1)} type="button">Previous</button>
            <button className="button button--secondary" disabled={!pagination.has_next} onClick={() => goToPage(pagination.page + 1)} type="button">Next</button>
            <button className="button button--secondary" disabled={!pagination.has_next} onClick={() => goToPage(totalPages)} type="button">Last</button>
          </div>
        ) : null}
      </div> : null}

      {modalEditRecord ? (
        <HrAdminActionModal
          documentNavigation
          className="attendance-record-edit-modal"
          closeHref={queueHref({ editRecord: undefined })}
          eyebrow="Attendance record"
          labelledBy="attendance-record-edit-modal-title"
          title={`Edit ${modalEditRecord.employee_name}`}
          description="Update record interpretation, timing and lock state."
        >
          <AttendanceRecordForm
            documentNavigation
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
