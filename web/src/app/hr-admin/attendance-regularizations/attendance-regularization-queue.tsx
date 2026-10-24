"use client";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";


import { formatWorkspaceDateTime } from "@/lib/ui/date-time-format";

import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

import { AttendanceRegularizationInlineReview } from "@/app/hr-admin/attendance-regularizations/attendance-regularization-inline-review";
import { AttendanceRegularizationReviewForm } from "@/app/hr-admin/attendance-regularizations/attendance-regularization-review-form";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import { WorkspaceFilterForm } from "@/components/patterns/workspace-filter-form";
import { attendanceDateError } from "../attendance-records/filter-contract";
import type { AttendanceRegularizationItem, HrAdminEnumOption } from "@/lib/types";

type Props = {
  items: AttendanceRegularizationItem[];
  regularizationStatusOptions: HrAdminEnumOption[];
  attendanceStatusOptions: HrAdminEnumOption[];
  reviewItem?: AttendanceRegularizationItem | null;
  currentFilters: {
    q: string;
    status: string;
    requested_status: string;
    current_status: string;
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
  canReviewRegularizations?: boolean;
};

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
  return value ? formatWorkspaceDateTime(value, "Asia/Kolkata") : "Not available";
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(status: string) {
  if (status === "approved") return "success";
  if (status === "rejected" || status === "cancelled") return "danger";
  if (status === "pending") return "warning";
  return "neutral";
}

function getWaitingLabel(item: AttendanceRegularizationItem) {
  if (item.status !== "pending") {
    return item.status === "approved" ? "Approved" : item.status === "rejected" ? "Rejected" : titleCase(item.status);
  }
  const currentStep = item.approval_steps?.find((step) => step.is_current) ?? item.approval_steps?.[0];
  if (currentStep?.manager_name) return `Pending approval from ${currentStep.manager_name}`;
  return "Pending approval from configured approver";
}

export function AttendanceRegularizationQueue({
  items,
  regularizationStatusOptions,
  attendanceStatusOptions,
  reviewItem,
  currentFilters,
  pagination,
  canReviewRegularizations = true,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reviewRegularizationId = searchParams.get("reviewRegularization") ?? "";
  const scope = JSON.stringify(currentFilters);
  const [selection, setSelection] = useState({scope, id: ""});
  const selectedItemId = selection.scope === scope ? selection.id : "";
  const setSelectedItemId = (id: string) => setSelection({scope, id});
  const [filterError, setFilterError] = useState("");
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const modalReviewItem = canReviewRegularizations && reviewRegularizationId ? reviewItem : null;
  const numericPageSize = currentFilters.page_size;
  const totalPages = Math.max(1, Math.ceil(pagination.total_count / Math.max(numericPageSize, 1)));
  const pageStart = pagination.total_count === 0 ? 0 : ((pagination.page - 1) * numericPageSize) + 1;
  const pageEnd = pagination.total_count === 0 ? 0 : Math.min(pagination.page * numericPageSize, pagination.total_count);
  const pendingCount = items.filter((item) => item.status === "pending").length;
  const approvedCount = items.filter((item) => item.status === "approved").length;
  const rejectedCount = items.filter((item) => item.status === "rejected").length;

  function currentQueueHref(params: Record<string, string | number | boolean | undefined> = {}) {
    return `${pathname}${buildQueryString({
      ...currentFilters,
      ...params,
    })}`;
  }

  function goToPage(page: number) {
    window.location.assign(currentQueueHref({ page, reviewRegularization: undefined }));
  }
  return (
    <section className="section queue-layout attendance-regularization-layout">
      <div className="hr-employee-summary-strip attendance-summary-strip">
        <span><strong>{pagination.total_count}</strong> requests</span>
        <span><strong>{pendingCount}</strong> pending on page</span>
        <span><strong>{approvedCount}</strong> approved on page</span>
        <span><strong>{rejectedCount}</strong> rejected on page</span>
        <span><strong>{regularizationStatusOptions.length}</strong> statuses</span>
      </div>

      <section className="queue-toolbar panel-card-soft attendance-queue-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Regularizations</h2>
            <p className="section-copy section-copy-soft">Search, filter, and review correction requests.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{items.length}</strong> in this view</span>
            <span className="queue-summary-chip"><strong>{items.length}</strong> on this page</span>
          </div>
        </div>
        <WorkspaceFilterForm key={scope} action={pathname} label="Regularization filters" className="workspace-filter-form--three" onSubmit={event => {
          const data = new FormData(event.currentTarget);
          const error = attendanceDateError(String(data.get("from_date") || ""), String(data.get("to_date") || ""));
          setFilterError(error); if(error) { event.preventDefault(); event.currentTarget.querySelector<HTMLInputElement>('[name="to_date"]')?.focus(); }
        }}>
          <input type="hidden" name="page" value="1"/><input type="hidden" name="page_size" value={currentFilters.page_size}/>
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" name="q" defaultValue={currentFilters.q} />
          </label>
          <label className="form-field">
            <span className="muted">Request status</span>
            <select className="input-control" name="status" defaultValue={currentFilters.status}>
              <option value="">All request statuses</option>
              {regularizationStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Requested status</span>
            <select className="input-control" name="requested_status" defaultValue={currentFilters.requested_status}>
              <option value="">All requested statuses</option>
              {attendanceStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <details className="directory-more-filters attendance-more-filters" open={Boolean(currentFilters.current_status || currentFilters.from_date || currentFilters.to_date) || undefined}>
            <summary className="button button--secondary button--compact">More filters</summary>
            <div className="directory-more-filters__panel attendance-more-filters__panel">
              <label className="form-field">
                <span className="muted">Current status</span>
                <select className="input-control" name="current_status" defaultValue={currentFilters.current_status}>
                  <option value="">All current statuses</option>
                  {attendanceStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">From date</span>
                <input className="input-control" type="date" name="from_date" defaultValue={currentFilters.from_date} />
              </label>
              <label className="form-field">
                <span className="muted">To date</span>
                <input className="input-control" type="date" name="to_date" defaultValue={currentFilters.to_date} />
              </label>
            </div>
          </details>

        <div className="workspace-filter-actions">
          <button className="button button--primary" type="submit">Apply filters</button>
          <a className="button button--secondary" href={pathname}>Clear filters</a>
        </div>
        </WorkspaceFilterForm>
        {filterError ? <p className="notice notice--error" role="alert">{filterError}</p> : null}
      </section>

      <div className={`attendance-review-workbench${selectedItem ? " attendance-review-workbench--with-detail" : ""}`}>
        <article className="record-card panel-card-soft attendance-directory-panel">
          <WorkspaceTableScrollRegion label="Attendance regularizations, scroll for more columns" className="employee-directory-table-wrap attendance-directory-table-wrap workspace-table-region">
            {items.length ? (
              <table className="workspace-data-table employee-directory-table attendance-directory-table">
                <thead>
                  <tr>
                    <th scope="col">Employee</th>
                    <th scope="col">Attendance</th>
                    <th scope="col">Status</th>
                    <th scope="col">Requested</th>
                    <th scope="col">Workflow</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    return (
                      <tr className={isSelected ? "employee-directory-table__row--active" : ""} key={item.id}>
                        <td>
                          <button className="document-table-title-button" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); setSelectedItemId(item.id); }} type="button">
                            <strong>{item.employee_name || "Unknown employee"}</strong>
                            <small>{item.employee_code || "No code"} · {item.department || "Unassigned"}</small>
                          </button>
                        </td>
                        <td>
                          <strong>{item.attendance_date}</strong>
                          <small>{item.shift || "No shift"}</small>
                        </td>
                        <td>
                          <WorkspaceStatusBadge tone={statusTone(item.status)}>{titleCase(item.status)}</WorkspaceStatusBadge>
                          <small>{titleCase(item.current_status)}</small>
                        </td>
                        <td>
                          <strong>{titleCase(item.requested_status)}</strong>
                          <small>{item.reason || "No reason"}</small>
                        </td>
                        <td>
                          <strong>{item.workflow_reference || "Not linked"}</strong>
                          <small>{item.approval_steps?.length ?? 0} approval steps</small>
                        </td>
                        <td>
                          <button className="button button--secondary button--compact" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); setSelectedItemId(item.id); }} type="button">Inspect</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="notice">
                <strong>No regularizations match the current filters.</strong>
                <span className="muted">Try clearing one or more filters to widen the queue.</span>
              </div>
            )}
          </WorkspaceTableScrollRegion>
        </article>

        {selectedItem ? (
          <article className="record-card panel-card-soft employee-detail-drawer attendance-detail-drawer">
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <h2 className="section-heading-soft">Regularization detail</h2>
                <p className="section-copy section-copy-soft">Focused detail for the selected correction request.</p>
              </div>
              <div className="record-card__actions">
                <button className="button button--ghost button--compact" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); setSelectedItemId(""); }} type="button">Close</button>
                {canReviewRegularizations ? (
                  <Link className="button button--secondary button--compact" href={currentQueueHref({ reviewRegularization: selectedItem.id })}>Review request</Link>
                ) : (
                  <button className="button button--secondary button--compact" disabled title="Requires attendance.regularization.review permission." type="button">Review request</button>
                )}
              </div>
            </div>
            <div className="document-detail-identity">
              <div>
                <h3>{selectedItem.employee_name || "Unknown employee"}</h3>
                <p>{selectedItem.employee_code || "No code"} · {selectedItem.attendance_date} · {selectedItem.shift || "No shift"}</p>
              </div>
              <WorkspaceStatusBadge tone={statusTone(selectedItem.status)}>{titleCase(selectedItem.status)}</WorkspaceStatusBadge>
            </div>
            <div className="notice notice--quiet">
              <strong>{getWaitingLabel(selectedItem)}</strong>
              <span className="muted">{selectedItem.shift ? `Shift: ${selectedItem.shift}` : "No shift is assigned to this attendance record."}</span>
            </div>
            <div className="employee-detail-stack detail-grid-soft">
              <details className="employee-detail-section" open>
                <summary>Request</summary>
                <div className="employee-detail-section__grid">
                  <div className="detail-row"><span className="detail-label">Employee</span><span className="detail-value">{selectedItem.employee_name} ({selectedItem.employee_code})</span></div>
                  <div className="detail-row"><span className="detail-label">Department</span><span className="detail-value">{selectedItem.department || "Unassigned"}</span></div>
                  <div className="detail-row"><span className="detail-label">Current to requested</span><span className="detail-value">{titleCase(selectedItem.current_status)} to {titleCase(selectedItem.requested_status)}</span></div>
                  <div className="detail-row"><span className="detail-label">Applied at</span><span className="detail-value">{formatDateTime(selectedItem.applied_at)}</span></div>
                  <div className="detail-row"><span className="detail-label">Reason</span><span className="detail-value">{selectedItem.reason || "No reason"}</span></div>
                  <div className="detail-row"><span className="detail-label">Workflow</span><span className="detail-value">{selectedItem.workflow_reference || "Not linked"}</span></div>
                </div>
              </details>
              <details className="employee-detail-section" open>
                <summary>Times and comments</summary>
                <div className="employee-detail-section__grid">
                  <div className="detail-row"><span className="detail-label">Actual check in</span><span className="detail-value">{formatDateTime(selectedItem.actual_check_in_at)}</span></div>
                  <div className="detail-row"><span className="detail-label">Requested check in</span><span className="detail-value">{formatDateTime(selectedItem.requested_check_in_at)}</span></div>
                  <div className="detail-row"><span className="detail-label">Actual check out</span><span className="detail-value">{formatDateTime(selectedItem.actual_check_out_at)}</span></div>
                  <div className="detail-row"><span className="detail-label">Requested check out</span><span className="detail-value">{formatDateTime(selectedItem.requested_check_out_at)}</span></div>
                  <div className="detail-row"><span className="detail-label">Manager comment</span><span className="detail-value">{selectedItem.manager_comment || "None"}</span></div>
                  <div className="detail-row"><span className="detail-label">Rejection note</span><span className="detail-value">{selectedItem.rejection_reason || "None"}</span></div>
                </div>
              </details>
            </div>
            {canReviewRegularizations ? (
              <AttendanceRegularizationInlineReview item={selectedItem} reviewHref={currentQueueHref({ reviewRegularization: selectedItem.id })} />
            ) : (
              <div className="notice"><strong>Read-only regularization view.</strong><span className="muted">Approvals and rejections require attendance regularization review permission.</span></div>
            )}
          </article>
        ) : null}
      </div>

      <section className="card panel pagination-panel attendance-pagination-panel">
        <div className="pagination-bar">
          <div className="pagination-bar__summary">
            <span className="queue-summary-chip"><strong>{pageStart}-{pageEnd}</strong> of {pagination.total_count} requests</span>
            <span className="queue-summary-chip"><strong>Page {pagination.page}</strong> of {totalPages}</span>
            <label className="lifecycle-page-size-control">
              <span>Rows</span>
              <select className="input-control" onChange={(event) => window.location.assign(currentQueueHref({page: 1, page_size: Number(event.target.value)}))} value={currentFilters.page_size}>
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

      {modalReviewItem ? (
        <HrAdminActionModal documentNavigation
          className="attendance-review-modal"
          closeHref={currentQueueHref({ reviewRegularization: undefined })}
          description="Review and decide this correction request without leaving the queue."
          eyebrow="Attendance review"
          labelledBy="attendance-review-modal-title"
          title={`Review ${modalReviewItem.employee_name || "regularization"}`}
        >
          <AttendanceRegularizationReviewForm
            compact
            cancelHref={currentQueueHref({ reviewRegularization: undefined })}
            item={modalReviewItem}
            successHref={currentQueueHref({ reviewRegularization: undefined })}
          />
        </HrAdminActionModal>
      ) : null}
    </section>
  );
}
