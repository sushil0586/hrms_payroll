"use client";

import { ActionFeedbackReceipt } from "@/components/patterns/action-feedback-receipt";

import { formatWorkspaceDateTime } from "@/lib/ui/date-time-format";
import { useMemo, useState } from "react";

import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminOptionItem, LeaveRequestItem, PagedStatusCounts } from "@/lib/types";

import { WorkspaceFilterForm } from "@/components/patterns/workspace-filter-form";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";

type Props = {
  items: LeaveRequestItem[];
  currentFilters: {
    q: string;
    status: string;
    leave_type_code: string;
    from_date: string;
    to_date: string;
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
  statusCounts: PagedStatusCounts;
  leaveTypeOptions: HrAdminOptionItem[];
  selectedItem?: LeaveRequestItem | null;
  canApproveLeaveRequests: boolean;
  pending?: boolean;
  onApplyFilters?: (filters: Props["currentFilters"]) => void;
  onPage?: (page: number) => void;
  onReview?: (item: LeaveRequestItem) => void;
};

const REQUEST_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "partially_approved", label: "Partially approved" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "cancelled", label: "Cancelled" },
];

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

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}


function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getWaitingLabel(item: LeaveRequestItem) {
  if (!["pending", "partially_approved"].includes(item.status)) {
    return item.status === "approved"
      ? "Approved"
      : item.status === "rejected"
        ? "Rejected"
        : titleCase(item.status);
  }
  const currentStep = item.approval_steps?.find((step) => step.is_current) ?? item.approval_steps?.[0];
  if (currentStep?.manager_name) {
    return `Pending approval from ${currentStep.manager_name}`;
  }
  return "Pending approval from configured approver";
}

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" | "info" {
  if (status === "approved") return "success";
  if (status === "partially_approved") return "warning";
  if (status === "pending") return "warning";
  if (["rejected", "cancelled"].includes(status)) return "danger";
  if (status === "withdrawn") return "neutral";
  return "info";
}

function collisionTone(item: LeaveRequestItem): "success" | "warning" | "danger" {
  if (item.attendance_collision_summary?.payroll_blocking) return "danger";
  if ((item.attendance_collision_summary?.collision_count ?? 0) > 0) return "warning";
  return "success";
}

export function LeaveRequestQueue({ items, currentFilters, pagination, statusCounts, leaveTypeOptions, canApproveLeaveRequests, pending, onApplyFilters, onPage, onReview }: Props) {
  const [validationError, setValidationError] = useState("");
  const filterLeaveTypeOptions = useMemo(() => leaveTypeOptions.filter((item) => item.code).sort((a, b) => a.name.localeCompare(b.name)), [leaveTypeOptions]);
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const selectedItem = items.find(item => item.id === selectedId) ?? null;

  function pageHref(page: number) {
    return `/hr-admin/leave-requests${buildQueryString({ ...currentFilters, page })}`;
  }

  return (
    <section className="section queue-layout">
      <ActionFeedbackReceipt recordIds={items.map(item => item.id)} />
      <div className="attendance-summary-strip" role="group" aria-label="Leave request summary">
        <span><strong>{pagination.total_count}</strong> matching requests</span>
        <span><strong>{statusCounts.pending ?? 0}</strong> tenant pending</span>
        <span><strong>{statusCounts.approved ?? 0}</strong> tenant approved</span>
        <span><strong>{(statusCounts.rejected ?? 0) + (statusCounts.cancelled ?? 0)}</strong> tenant rejected / cancelled</span>
        <span><strong>{items.filter((item) => item.attendance_collision_summary?.payroll_blocking).length}</strong> payroll blocking on this page</span>
      </div>
      <section className="panel-card-soft attendance-queue-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Leave request queue</h2>
            <p className="section-copy section-copy-soft">Search requests, verify policy evidence, and see exactly where each approval is waiting.</p>
          </div>
          <div className="queue-toolbar__meta"><span className="queue-summary-chip"><strong>{pagination.total_count}</strong> matching</span><span className="queue-summary-chip"><strong>{selectedItem ? "1" : "0"}</strong> selected</span></div>
        </div>
        <WorkspaceFilterForm key={JSON.stringify(currentFilters)} action="/hr-admin/leave-requests" label="Leave request filters" className="workspace-filter-form--block" updateMode="scoped" onSubmit={event => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const from = String(data.get("from_date") || "");
          const to = String(data.get("to_date") || "");
          if (from && to && from > to) {
            event.preventDefault(); setValidationError("From date must be on or before to date.");
            event.currentTarget.querySelector<HTMLInputElement>('[name="to_date"]')?.focus();
          } else { setValidationError(""); onApplyFilters?.({ q: String(data.get("q") || ""), status: String(data.get("status") || ""), leave_type_code: String(data.get("leave_type_code") || ""), from_date: from, to_date: to, page: 1, page_size: currentFilters.page_size }); }
        }}>
        <input type="hidden" name="page_size" value={currentFilters.page_size} />
        <div className="workspace-filter-bar attendance-record-filter-bar">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" name="q" placeholder="Employee, code, leave type, reason, workflow" defaultValue={currentFilters.q} />
          </label>
          <label className="form-field">
            <span className="muted">Request status</span>
            <select className="input-control" name="status" defaultValue={currentFilters.status}>
              <option value="">All statuses</option>
              {REQUEST_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Leave type</span>
            <select className="input-control" name="leave_type_code" defaultValue={currentFilters.leave_type_code}>
              <option value="">All leave types</option>
              {filterLeaveTypeOptions.map((option) => <option key={option.id} value={option.code}>{option.name}</option>)}
            </select>
          </label>
          <details className="attendance-more-filters" open={Boolean(currentFilters.from_date || currentFilters.to_date)}>
            <summary className="button button--secondary">More filters</summary>
            <div className="attendance-more-filters__panel">
              <label className="form-field">
                <span className="muted">From date</span>
                <input className="input-control" name="from_date" type="date" defaultValue={currentFilters.from_date} />
              </label>
              <label className="form-field">
                <span className="muted">To date</span>
                <input className="input-control" name="to_date" type="date" defaultValue={currentFilters.to_date} />
              </label>
            </div>
          </details>
        </div>
        <div className="queue-toolbar__actions attendance-toolbar-actions">
          <button className="button button--primary" disabled={pending} type="submit">Apply filters</button>
          <button className="button button--ghost" type="button" onClick={() => onApplyFilters?.({ q: "", status: "", leave_type_code: "", from_date: "", to_date: "", page: 1, page_size: currentFilters.page_size })}>Clear filters</button>
          <button className="button button--secondary" onClick={() => window.print()} type="button">Print queue</button>
        </div>
        {validationError ? <p role="alert" className="notice notice--error">{validationError}</p> : null}
        </WorkspaceFilterForm>
      </section>

      <div className={`attendance-review-workbench${selectedItem ? " attendance-review-workbench--with-detail" : ""}`}>
        <section className="panel-card-soft attendance-directory-panel">
          <WorkspaceTableScrollRegion label="Leave requests table scroll" className="attendance-directory-table-wrap workspace-table-region">
            <table aria-label="Leave requests" className="workspace-table attendance-directory-table accerio-data-table">
              <thead>
                <tr>
                  <th scope="col">Employee</th>
                  <th scope="col">Leave</th>
                  <th scope="col">Window</th>
                  <th scope="col">Approval</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <tr aria-selected={isSelected} className={isSelected ? "is-selected" : ""} key={item.id} onClick={() => setSelectedId(item.id)}>
                      <td><strong>{item.employee_name || "Employee"}</strong><span>{item.employee_code || "No code"} · {item.department || "No department"}</span></td>
                      <td><strong>{item.leave_type}</strong><span>{item.requested_units} requested · {item.approved_units} approved</span></td>
                      <td><strong>{formatDate(item.start_date)}</strong><span>to {formatDate(item.end_date)}</span></td>
                      <td><strong>{getWaitingLabel(item)}</strong><span>{item.policy_name || "No policy linked"}</span></td>
                      <td><WorkspaceStatusBadge tone={statusTone(item.status)}>{titleCase(item.status)}</WorkspaceStatusBadge><span>{item.attendance_collision_summary?.collision_count ? `${item.attendance_collision_summary.collision_count} collision(s)` : "Collision clear"}</span></td>
                      <td><button className="button button--secondary button--compact" onClick={(event) => { focusActionTrigger(event); event.stopPropagation(); setSelectedId(item.id); }} type="button" aria-label={`Inspect leave request for ${item.employee_name || item.employee_code}`}>Inspect</button></td>
                    </tr>
                  );
                })}
                {items.length === 0 ? (
                  <tr><td colSpan={6}><strong>No leave requests match the current filters.</strong><span>Clear filters or check whether employees have submitted requests for the selected period.</span></td></tr>
                ) : null}
              </tbody>
            </table>
          </WorkspaceTableScrollRegion>
          <div className="panel-card-soft attendance-pagination-panel">
            <PaginationBar
              hasNext={pagination.has_next}
              hasPrevious={pagination.has_previous}
              firstHref={pageHref(1)}
              lastHref={pageHref(Math.max(1, Math.ceil(pagination.total_count / pagination.page_size)))}
              nextHref={pageHref(pagination.page + 1)}
              previousHref={pageHref(pagination.page - 1)} navigationMode="scoped"
              onFirst={() => onPage?.(1)} onLast={() => onPage?.(Math.max(1, Math.ceil(pagination.total_count / pagination.page_size)))} onNext={() => onPage?.(pagination.page + 1)} onPrevious={() => onPage?.(pagination.page - 1)} pending={pending}
              page={pagination.page}
              pageSize={pagination.page_size}
              totalCount={pagination.total_count}
            />
            <WorkspaceFilterForm key={`pagination:${JSON.stringify(currentFilters)}`} action="/hr-admin/leave-requests" label="Leave request pagination" className="workspace-filter-form--inline" updateMode="scoped" onSubmit={(event) => { event.preventDefault(); const value = Number(new FormData(event.currentTarget).get("page_size")); onApplyFilters?.({ ...currentFilters, page: 1, page_size: value }); }}>
              {Object.entries(currentFilters).filter(([key]) => !["page", "page_size"].includes(key)).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
              <label className="form-field attendance-pagination-rows">
                <span className="muted">Rows</span>
                <select className="input-control" name="page_size" defaultValue={currentFilters.page_size}>
                  {[10, 25, 50, 100].map((value) => <option key={value} value={String(value)}>{value}</option>)}
                </select>
              </label>
              <button className="button button--secondary" type="submit">Apply</button>
            </WorkspaceFilterForm>
          </div>
        </section>

        {selectedItem ? (
          <aside id="leave-request-detail" tabIndex={-1} className="panel-card-soft attendance-detail-drawer" aria-label="Leave request detail">
            <div className="queue-toolbar__header">
              <div>
                <h2 className="section-heading-soft">Leave request detail</h2>
                <p className="section-copy section-copy-soft">Focused policy, approval, collision, and balance context.</p>
              </div>
              <button className="button button--secondary button--compact" onClick={(event) => { focusActionTrigger(event); setSelectedId(""); }} type="button">Close</button>
            </div>
            <article className="record-card record-card--compact">
              <div className="record-card__header">
                <div>
                  <h3>{selectedItem.employee_name || selectedItem.employee_code || "Employee"}</h3>
                  <p className="section-copy section-copy-soft">{selectedItem.employee_code} · {selectedItem.leave_type} · {formatDate(selectedItem.start_date)} to {formatDate(selectedItem.end_date)}</p>
                </div>
                <WorkspaceStatusBadge tone={statusTone(selectedItem.status)}>{titleCase(selectedItem.status)}</WorkspaceStatusBadge>
              </div>
              <div className="record-card__eyebrow">
                <WorkspaceStatusBadge tone={collisionTone(selectedItem)}>{selectedItem.attendance_collision_summary?.collision_count ? "Collision review" : "Collision clear"}</WorkspaceStatusBadge>
                {selectedItem.attachments?.length ? <WorkspaceStatusBadge tone="info">{selectedItem.attachments.length} files</WorkspaceStatusBadge> : null}
              </div>
            </article>
            <div className="record-card__actions">
              {canApproveLeaveRequests && ["pending", "partially_approved"].includes(selectedItem.status) ? (
                <button data-leave-review-opener={selectedItem.id} className="button button--primary" onClick={() => onReview?.(selectedItem)} type="button">Review</button>
              ) : (
                <button className="button button--secondary" disabled title="Requires leave.requests.approve and a pending request" type="button">Review</button>
              )}
              <a data-navigation-mode="document" className="button button--secondary" href={`/hr-admin/leave-balances?q=${encodeURIComponent(selectedItem.employee_code || "")}`}>Open balance</a>
              <button className="button button--secondary" onClick={() => window.print()} type="button">Print</button>
            </div>
            <details className="record-card" open>
              <summary>Request</summary>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Policy</span><span className="detail-value">{selectedItem.policy_name || "No policy linked"}</span></div>
                <div className="detail-row"><span className="detail-label">Applied at</span><span className="detail-value">{formatWorkspaceDateTime(selectedItem.applied_at)}</span></div>
                <div className="detail-row"><span className="detail-label">Approved at</span><span className="detail-value">{formatWorkspaceDateTime(selectedItem.approved_at)}</span></div>
                <div className="detail-row"><span className="detail-label">Reason</span><span className="detail-value">{selectedItem.reason || "No reason captured"}</span></div>
                <div className="detail-row"><span className="detail-label">Manager note</span><span className="detail-value">{selectedItem.manager_comment || selectedItem.rejection_reason || "No decision note yet"}</span></div>
                <div className="detail-row"><span className="detail-label">Workflow</span><span className="detail-value">{selectedItem.workflow_reference || "Not linked"}</span></div>
              </div>
            </details>
            <details className="record-card" open>
              <summary>Approval track</summary>
              <div className="detail-grid">
                {(selectedItem.approval_steps ?? []).length ? selectedItem.approval_steps?.map((step) => (
                  <div className="detail-row" key={`${selectedItem.id}-${step.level}-${step.name}`}>
                    <span className="detail-label">Level {step.level} · {titleCase(step.status)}</span>
                    <span className="detail-value">{step.name}: {step.manager_name || "Configured approver"}{step.comment ? ` · ${step.comment}` : ""}</span>
                  </div>
                )) : <div className="detail-row"><span className="detail-label">Approval track</span><span className="detail-value">No workflow evidence attached to this request.</span></div>}
              </div>
            </details>
            <details className="record-card" open>
              <summary>Attendance collision</summary>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">State</span><span className="detail-value">{selectedItem.attendance_collision_summary?.status ?? "Clear"}</span></div>
                <div className="detail-row"><span className="detail-label">Severity</span><span className="detail-value">{selectedItem.attendance_collision_summary?.severity ?? "none"}</span></div>
                <div className="detail-row"><span className="detail-label">Payroll blocking</span><span className="detail-value">{selectedItem.attendance_collision_summary?.payroll_blocking ? "Yes" : "No"}</span></div>
                {(selectedItem.attendance_collision_summary?.collisions ?? []).map((collision) => (
                  <div className="detail-row" key={`${collision.attendance_record_id}-${collision.date}`}>
                    <span className="detail-label">{collision.date}</span>
                    <span className="detail-value">{collision.message}</span>
                  </div>
                ))}
              </div>
            </details>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
