"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceFilterBar, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminOptionItem, LeaveRequestItem, PagedStatusCounts } from "@/lib/types";

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
};

const REQUEST_STATUS_OPTIONS = [
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
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
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
  if (["approved", "partially_approved"].includes(status)) return "success";
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

export function LeaveRequestQueue({ items, currentFilters, pagination, statusCounts, leaveTypeOptions, selectedItem: initialSelectedItem, canApproveLeaveRequests }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentFilters.q);
  const [status, setStatus] = useState(currentFilters.status || "all");
  const [leaveTypeCode, setLeaveTypeCode] = useState(currentFilters.leave_type_code || "all");
  const [fromDate, setFromDate] = useState(currentFilters.from_date);
  const [toDate, setToDate] = useState(currentFilters.to_date);
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));
  const [selectedItemId, setSelectedItemId] = useState(initialSelectedItem?.id ?? items[0]?.id ?? "");
  const filterLeaveTypeOptions = useMemo(() => leaveTypeOptions.filter((item) => item.code).sort((a, b) => a.name.localeCompare(b.name)), [leaveTypeOptions]);
  const selectedItem = useMemo(
    () => initialSelectedItem && initialSelectedItem.id === selectedItemId ? initialSelectedItem : items.find((item) => item.id === selectedItemId) ?? null,
    [initialSelectedItem, items, selectedItemId],
  );

  function selectedHref(itemId?: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (itemId) params.set("selectedLeave", itemId);
    else params.delete("selectedLeave");
    const query = params.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  }

  function overrideHref(itemId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("selectedLeave", itemId);
    params.set("overrideLeave", itemId);
    const query = params.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  }

  function goToPage(page: number) {
    router.push(`${pathname}${buildQueryString({
      q: search.trim() || undefined,
      status: status !== "all" ? status : undefined,
      leave_type_code: leaveTypeCode !== "all" ? leaveTypeCode : undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      page,
      page_size: Number(pageSize) || currentFilters.page_size,
    })}`);
  }

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setLeaveTypeCode("all");
    setFromDate("");
    setToDate("");
    setPageSize("25");
    router.push(pathname);
  }

  return (
    <section className="section queue-layout">
      <div className="attendance-summary-strip" aria-label="Leave request summary">
        <span><strong>{pagination.total_count}</strong> requests</span>
        <span><strong>{statusCounts.pending ?? 0}</strong> pending</span>
        <span><strong>{statusCounts.approved ?? 0}</strong> approved</span>
        <span><strong>{(statusCounts.rejected ?? 0) + (statusCounts.cancelled ?? 0)}</strong> closed exceptions</span>
        <span><strong>{items.filter((item) => item.attendance_collision_summary?.payroll_blocking).length}</strong> payroll blocking</span>
      </div>
      <section className="queue-toolbar panel-card-soft">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Leave request queue</h2>
            <p className="section-copy section-copy-soft">Search requests, verify policy evidence, and see exactly where each approval is waiting.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{pagination.total_count}</strong> matching requests</span>
            <span className="queue-summary-chip"><strong>{statusCounts.pending ?? 0}</strong> pending</span>
            <span className="queue-summary-chip"><strong>{statusCounts.approved ?? 0}</strong> approved</span>
          </div>
        </div>
        <WorkspaceFilterBar className="attendance-record-filter-bar">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" onChange={(event) => setSearch(event.target.value)} placeholder="Employee, code, leave type, reason, workflow" value={search} />
          </label>
          <label className="form-field">
            <span className="muted">Request status</span>
            <select className="input-control" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="all">All statuses</option>
              {REQUEST_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Leave type</span>
            <select className="input-control" onChange={(event) => setLeaveTypeCode(event.target.value)} value={leaveTypeCode}>
              <option value="all">All leave types</option>
              {filterLeaveTypeOptions.map((option) => <option key={option.id} value={option.code}>{option.name}</option>)}
            </select>
          </label>
          <details className="attendance-more-filters">
            <summary className="button button--secondary">More filters</summary>
            <div className="attendance-more-filters__panel">
              <label className="form-field">
                <span className="muted">From date</span>
                <input className="input-control" onChange={(event) => setFromDate(event.target.value)} type="date" value={fromDate} />
              </label>
              <label className="form-field">
                <span className="muted">To date</span>
                <input className="input-control" onChange={(event) => setToDate(event.target.value)} type="date" value={toDate} />
              </label>
            </div>
          </details>
        </WorkspaceFilterBar>
        <div className="queue-toolbar__actions attendance-toolbar-actions">
          <button className="button button--primary" onClick={() => goToPage(1)} type="button">Apply filters</button>
          <button className="button button--ghost" onClick={clearFilters} type="button">Clear filters</button>
          <button className="button button--secondary" onClick={() => window.print()} type="button">Print queue</button>
        </div>
      </section>

      <div className={`attendance-review-workbench${selectedItem ? " attendance-review-workbench--with-detail" : ""}`}>
        <section className="panel-card-soft attendance-directory-panel">
          <div className="attendance-directory-table-wrap">
            <table className="workspace-table attendance-directory-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave</th>
                  <th>Window</th>
                  <th>Approval</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <tr aria-selected={isSelected} className={isSelected ? "is-selected" : ""} key={item.id} onClick={() => setSelectedItemId(item.id)}>
                      <td><strong>{item.employee_name || "Employee"}</strong><span>{item.employee_code || "No code"} · {item.department || "No department"}</span></td>
                      <td><strong>{item.leave_type}</strong><span>{item.requested_units} requested · {item.approved_units} approved</span></td>
                      <td><strong>{formatDate(item.start_date)}</strong><span>to {formatDate(item.end_date)}</span></td>
                      <td><strong>{getWaitingLabel(item)}</strong><span>{item.policy_name || "No policy linked"}</span></td>
                      <td><WorkspaceStatusBadge tone={statusTone(item.status)}>{titleCase(item.status)}</WorkspaceStatusBadge><span>{item.attendance_collision_summary?.collision_count ? `${item.attendance_collision_summary.collision_count} collision(s)` : "Collision clear"}</span></td>
                      <td><button className="button button--secondary button--compact" onClick={(event) => {
                        event.stopPropagation();
                        setSelectedItemId(item.id);
                        router.push(selectedHref(item.id));
                      }} type="button">Inspect</button></td>
                    </tr>
                  );
                })}
                {items.length === 0 ? (
                  <tr><td colSpan={6}><strong>No leave requests match the current filters.</strong><span>Clear filters or check whether employees have submitted requests for the selected period.</span></td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="panel-card-soft attendance-pagination-panel">
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
            <div className="attendance-pagination-panel__controls">
              <label className="form-field attendance-pagination-rows">
                <span className="muted">Rows</span>
                <select className="input-control" onChange={(event) => setPageSize(event.target.value)} value={pageSize}>
                  {[10, 25, 50, 100].map((value) => <option key={value} value={String(value)}>{value}</option>)}
                </select>
              </label>
              <button className="button button--secondary" onClick={() => goToPage(1)} type="button">Apply</button>
            </div>
          </div>
        </section>

        {selectedItem ? (
          <aside className="panel-card-soft attendance-detail-drawer" aria-label="Leave request detail">
            <div className="queue-toolbar__header">
              <div>
                <h2 className="section-heading-soft">Leave request detail</h2>
                <p className="section-copy section-copy-soft">Focused policy, approval, collision, and balance context.</p>
              </div>
              <button className="button button--secondary button--compact" onClick={() => {
                setSelectedItemId("");
                router.push(selectedHref());
              }} type="button">Close</button>
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
                <Link className="button button--primary" href={overrideHref(selectedItem.id)}>Review</Link>
              ) : (
                <button className="button button--secondary" disabled title="Requires leave.requests.approve and a pending request" type="button">Review</button>
              )}
              <Link className="button button--secondary" href={`/hr-admin/leave-balances?q=${encodeURIComponent(selectedItem.employee_code || "")}`}>Open balance</Link>
              <button className="button button--secondary" onClick={() => window.print()} type="button">Print</button>
            </div>
            <details className="record-card" open>
              <summary>Request</summary>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Policy</span><span className="detail-value">{selectedItem.policy_name || "No policy linked"}</span></div>
                <div className="detail-row"><span className="detail-label">Applied at</span><span className="detail-value">{formatDateTime(selectedItem.applied_at)}</span></div>
                <div className="detail-row"><span className="detail-label">Approved at</span><span className="detail-value">{formatDateTime(selectedItem.approved_at)}</span></div>
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
