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

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getWaitingLabel(item: AttendanceRegularizationItem) {
  if (item.status !== "pending") {
    return item.status === "approved" ? "Approved" : item.status === "rejected" ? "Rejected" : titleCase(item.status);
  }
  const currentStep = item.approval_steps?.find((step) => step.is_current) ?? item.approval_steps?.[0];
  if (currentStep?.manager_name) {
    return `Pending approval from ${currentStep.manager_name}`;
  }
  return "Pending approval from configured approver";
}

export function AttendanceRegularizationQueue({
  items,
  regularizationStatusOptions,
  attendanceStatusOptions,
  currentFilters,
  pagination,
  canReviewRegularizations = true,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(currentFilters.q);
  const [status, setStatus] = useState(currentFilters.status || "all");
  const [requestedStatus, setRequestedStatus] = useState(currentFilters.requested_status || "all");
  const [currentStatus, setCurrentStatus] = useState(currentFilters.current_status || "all");
  const [fromDate, setFromDate] = useState(currentFilters.from_date);
  const [toDate, setToDate] = useState(currentFilters.to_date);
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));

  function goToPage(page: number) {
    router.push(`${pathname}${buildQueryString({
      q: search.trim() || undefined,
      status: status !== "all" ? status : undefined,
      requested_status: requestedStatus !== "all" ? requestedStatus : undefined,
      current_status: currentStatus !== "all" ? currentStatus : undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
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
                  <span className="record-chip record-chip--accent">{titleCase(item.status)}</span>
                  <span className="record-chip">{titleCase(item.current_status)} to {titleCase(item.requested_status)}</span>
                  <span className="record-chip">{item.approval_steps?.length ?? 0} approval steps</span>
                </div>
                <p className="section-copy section-copy-soft">{item.employee_code} • {item.attendance_date} • {item.shift || "No shift"}</p>
              </div>
              {canReviewRegularizations ? (
                <div className="record-card__actions">
                  <Link className="button button--secondary" href={`/hr-admin/attendance-regularizations/${item.id}/review`}>
                    Review request
                  </Link>
                </div>
              ) : null}
            </div>
            <div className="notice notice--quiet">
              <strong>{getWaitingLabel(item)}</strong>
              <span className="muted">{item.shift ? `Shift: ${item.shift}` : "No shift is assigned to this attendance record."}</span>
            </div>
            <div className="detail-grid">
              <div className="detail-row"><span className="detail-label">Applied at</span><span className="detail-value">{formatDateTime(item.applied_at)}</span></div>
              <div className="detail-row"><span className="detail-label">Reason</span><span className="detail-value">{item.reason || "No reason"}</span></div>
              <div className="detail-row"><span className="detail-label">Manager comment</span><span className="detail-value">{item.manager_comment || "None"}</span></div>
              <div className="detail-row"><span className="detail-label">Workflow reference</span><span className="detail-value">{item.workflow_reference || "Not linked"}</span></div>
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
            {canReviewRegularizations ? (
              <AttendanceRegularizationInlineReview item={item} />
            ) : (
              <div className="notice"><strong>Read-only regularization view.</strong><span className="muted">Approvals and rejections require attendance regularization review permission.</span></div>
            )}
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
