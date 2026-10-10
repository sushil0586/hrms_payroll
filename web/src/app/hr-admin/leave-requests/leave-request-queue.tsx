"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { PaginationBar } from "@/components/patterns/pagination-bar";
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

export function LeaveRequestQueue({ items, currentFilters, pagination, statusCounts, leaveTypeOptions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(currentFilters.q);
  const [status, setStatus] = useState(currentFilters.status || "all");
  const [leaveTypeCode, setLeaveTypeCode] = useState(currentFilters.leave_type_code || "all");
  const [fromDate, setFromDate] = useState(currentFilters.from_date);
  const [toDate, setToDate] = useState(currentFilters.to_date);
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));
  const filterLeaveTypeOptions = useMemo(() => leaveTypeOptions.filter((item) => item.code).sort((a, b) => a.name.localeCompare(b.name)), [leaveTypeOptions]);

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
        <div className="queue-toolbar__grid">
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
          <label className="form-field">
            <span className="muted">From date</span>
            <input className="input-control" onChange={(event) => setFromDate(event.target.value)} type="date" value={fromDate} />
          </label>
          <label className="form-field">
            <span className="muted">To date</span>
            <input className="input-control" onChange={(event) => setToDate(event.target.value)} type="date" value={toDate} />
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
          <button className="button button--ghost" onClick={clearFilters} type="button">Clear filters</button>
          <button className="button button--secondary" onClick={() => window.print()} type="button">Print queue</button>
        </div>
      </section>

      <div className="queue-list">
        {items.map((item) => (
          <article className="record-card panel-card-soft" key={item.id}>
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>{item.employee_name || item.employee_code || "Employee"}</h2>
                </div>
                <div className="record-card__eyebrow">
                  <span className="record-chip record-chip--accent">{titleCase(item.status)}</span>
                  <span className="record-chip">{item.leave_type}</span>
                  <span className="record-chip">{item.requested_units} units</span>
                  {item.attachments?.length ? <span className="record-chip">{item.attachments.length} files</span> : null}
                </div>
                <p className="section-copy section-copy-soft">{item.employee_code} • {item.department || "No department"} • {formatDate(item.start_date)} to {formatDate(item.end_date)}</p>
              </div>
              <div className="record-card__actions">
                <Link className="button button--secondary" href={`/hr-admin/leave-balances?q=${encodeURIComponent(item.employee_code || "")}`}>Open balance</Link>
              </div>
            </div>
            <div className="notice notice--quiet">
              <strong>{getWaitingLabel(item)}</strong>
              <span className="muted">{item.policy_name ? `Policy: ${item.policy_name}` : "No policy linked"}.</span>
            </div>
            <div className="detail-grid">
              <div className="detail-row"><span className="detail-label">Applied at</span><span className="detail-value">{formatDateTime(item.applied_at)}</span></div>
              <div className="detail-row"><span className="detail-label">Approved at</span><span className="detail-value">{formatDateTime(item.approved_at)}</span></div>
              <div className="detail-row"><span className="detail-label">Approved units</span><span className="detail-value">{item.approved_units}</span></div>
              <div className="detail-row"><span className="detail-label">Reason</span><span className="detail-value">{item.reason || "No reason captured"}</span></div>
              <div className="detail-row"><span className="detail-label">Attendance collision</span><span className="detail-value">{item.attendance_collision_summary?.collision_count ? `${item.attendance_collision_summary.collision_count} payroll-impacting overlap` : "Clear"}</span></div>
              <div className="detail-row"><span className="detail-label">Manager note</span><span className="detail-value">{item.manager_comment || item.rejection_reason || "No decision note yet"}</span></div>
              <div className="detail-row"><span className="detail-label">Workflow</span><span className="detail-value">{item.workflow_reference || "Not linked"}</span></div>
            </div>
            <div className="queue-list queue-list--compact">
              {(item.approval_steps ?? []).length ? item.approval_steps?.map((step) => (
                <div className="detail-row" key={`${item.id}-${step.level}-${step.name}`}>
                  <span className="detail-label">Level {step.level} • {titleCase(step.status)}</span>
                  <span className="detail-value">{step.name}: {step.manager_name || "Configured approver"}{step.comment ? ` • ${step.comment}` : ""}</span>
                </div>
              )) : (
                <div className="detail-row">
                  <span className="detail-label">Approval track</span>
                  <span className="detail-value">No workflow evidence attached to this request.</span>
                </div>
              )}
            </div>
          </article>
        ))}
        {items.length === 0 ? (
          <div className="record-card panel-card-soft">
            <strong>No leave requests match the current filters.</strong>
            <p className="muted">Clear one or more filters, or check whether employees have submitted requests for the selected period.</p>
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
