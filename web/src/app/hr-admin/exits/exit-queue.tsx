"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceDataTable, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminEnumOption, HrAdminExit } from "@/lib/types";

type Props = {
  items: HrAdminExit[];
  exitStatusOptions: HrAdminEnumOption[];
  currentFilters: {
    q: string;
    status: string;
    rehire_eligible: string;
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

export function ExitQueue({ items, exitStatusOptions, currentFilters, pagination }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(currentFilters.q);
  const [status, setStatus] = useState(currentFilters.status || "all");
  const [rehireEligible, setRehireEligible] = useState(currentFilters.rehire_eligible || "all");
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));

  function goToPage(page: number) {
    router.push(
      `${pathname}${buildQueryString({
        q: search.trim() || undefined,
        status: status !== "all" ? status : undefined,
        rehire_eligible: rehireEligible !== "all" ? rehireEligible : undefined,
        page,
        page_size: Number(pageSize) || currentFilters.page_size,
      })}`,
    );
  }

  function queueHref(params: Record<string, string | number | boolean | undefined>) {
    return `${pathname}${buildQueryString({
      q: search.trim() || undefined,
      status: status !== "all" ? status : undefined,
      rehire_eligible: rehireEligible !== "all" ? rehireEligible : undefined,
      page: pagination.page,
      page_size: Number(pageSize) || currentFilters.page_size,
      ...params,
    })}`;
  }

  function statusTone(value: string) {
    if (value === "completed" || value === "closed") return "success";
    if (value === "cancelled" || value === "blocked") return "danger";
    if (value === "active" || value === "pending") return "info";
    return "neutral";
  }

  return (
    <section className="section queue-layout lifecycle-queue-layout">
      <section className="card panel queue-toolbar panel-card-soft lifecycle-queue-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Exits</h2>
            <p className="section-copy section-copy-soft">
              Track resignation progress, final dates, and rehire readiness.
            </p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{pagination.total_count}</strong> total exits</span>
            <span className="queue-summary-chip"><strong>{items.length}</strong> on this page</span>
            <span className="queue-summary-chip"><strong>{items.filter((item) => item.rehire_eligible).length}</strong> rehire ready here</span>
          </div>
        </div>

        <div className="queue-toolbar__grid">
          <label className="form-field">
            <span className="muted">Search</span>
            <input
              className="input-control"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Employee, code, exit reason, handover"
              value={search}
            />
          </label>
          <label className="form-field">
            <span className="muted">Status</span>
            <select className="input-control" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="all">All statuses</option>
              {exitStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Rehire eligibility</span>
            <select className="input-control" onChange={(event) => setRehireEligible(event.target.value)} value={rehireEligible}>
              <option value="all">All records</option>
              <option value="yes">Rehire eligible</option>
              <option value="no">Not eligible</option>
            </select>
          </label>
        </div>

        <div className="queue-toolbar__actions">
          <button className="button button--primary" onClick={() => goToPage(1)} type="button">
            Apply filters
          </button>
          <button
            className="button button--ghost"
            onClick={() => {
              setSearch("");
              setStatus("all");
              setRehireEligible("all");
              setPageSize("25");
              router.push(pathname);
            }}
            type="button"
          >
            Clear filters
          </button>
        </div>
        <div className="queue-toolbar__summary">
          <span className="queue-summary-chip"><strong>Page {pagination.page}</strong> shared state</span>
          <span className="queue-summary-chip"><strong>{exitStatusOptions.length}</strong> statuses</span>
        </div>
      </section>

      <WorkspaceDataTable ariaLabel="Exit records" className="lifecycle-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Status</th>
            <th>Exit reason</th>
            <th>Last working day</th>
            <th>Clearance</th>
            <th>Rehire</th>
            <th>Attention</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td><strong>{item.employee_name}</strong><span>{item.employee_code} · {item.workflow_reference || "No workflow"}</span></td>
            <td><WorkspaceStatusBadge tone={statusTone(item.status)}>{item.status}</WorkspaceStatusBadge></td>
            <td><strong>{item.exit_reason || "No reason"}</strong><span>{item.exit_reason_detail || item.handover_notes || "No detail"}</span></td>
            <td><strong>{item.approved_last_working_date || item.proposed_last_working_date || "Pending"}</strong><span>Notice end {item.notice_end_date || "Not set"}</span></td>
            <td><strong>{item.clearance_completed_count}/{item.clearance_total_count}</strong><span>{item.clearance_open_count} open, {item.clearance_overdue_count} overdue</span></td>
            <td><WorkspaceStatusBadge tone={item.rehire_eligible ? "success" : "neutral"}>{item.rehire_eligible ? "Eligible" : "No rehire"}</WorkspaceStatusBadge></td>
            <td><strong>{item.attention_state || "on_track"}</strong><span>{item.attention_summary || "Exit work is on track."}</span></td>
            <td><Link className="button button--secondary" href={queueHref({ editExit: item.id })}>Edit</Link></td>
          </tr>
        ))}
        </tbody>
      </WorkspaceDataTable>
      <div className="lifecycle-pagination-row">
        <label className="form-field form-field--inline">
          <span className="muted">Rows</span>
          <select className="input-control" onChange={(event) => setPageSize(event.target.value)} value={pageSize}>
            {[10, 25, 50, 100].map((value) => (
              <option key={value} value={String(value)}>
                {value}
              </option>
            ))}
          </select>
        </label>

        {items.length === 0 ? (
          <div className="card panel panel-card-soft">
            <strong>No exit records match the current filters.</strong>
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
