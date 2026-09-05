"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { PaginationBar } from "@/components/patterns/pagination-bar";
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

  return (
    <section className="section queue-layout">
      <section className="card panel queue-toolbar panel-card-soft">
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
          <label className="form-field">
            <span className="muted">Rows per page</span>
            <select className="input-control" onChange={(event) => setPageSize(event.target.value)} value={pageSize}>
              {[10, 25, 50, 100].map((value) => (
                <option key={value} value={String(value)}>
                  {value}
                </option>
              ))}
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

      <div className="queue-list">
        {items.map((item) => (
          <article className="record-card panel-card-soft" key={item.id}>
            <div className="record-card__header">
              <div className="record-card__title-block">
                <h3>{item.employee_name}</h3>
                <p>{item.employee_code} • {item.exit_reason || "No exit reason"}</p>
              </div>
              <div className="record-card__actions">
                <span className="record-chip">{item.status}</span>
                <span className="record-chip">{item.attention_state || "on_track"}</span>
                <span className="record-chip">{item.rehire_eligible ? "Rehire eligible" : "No rehire"}</span>
                <Link className="button button--secondary" href={`/hr-admin/exits/${item.id}/edit`}>
                  Edit
                </Link>
              </div>
            </div>

            <div className="record-card__details">
              <div>
                <span className="record-card__label">Resignation date</span>
                <strong>{item.resignation_date || "TBD"}</strong>
              </div>
              <div>
                <span className="record-card__label">Approved LWD</span>
                <strong>{item.approved_last_working_date || "Pending"}</strong>
              </div>
              <div>
                <span className="record-card__label">Notice end</span>
                <strong>{item.notice_end_date || "Not set"}</strong>
              </div>
              <div>
                <span className="record-card__label">Workflow reference</span>
                <strong>{item.workflow_reference || "Not linked"}</strong>
              </div>
              <div>
                <span className="record-card__label">Clearance progress</span>
                <strong>{item.clearance_completed_count}/{item.clearance_total_count} complete</strong>
              </div>
              <div>
                <span className="record-card__label">Next due</span>
                <strong>{item.next_due_on || "None"}</strong>
              </div>
              <div>
                <span className="record-card__label">Next escalation</span>
                <strong>{item.next_escalation_on || "None"}</strong>
              </div>
            </div>

            <div className="record-card__notes">
              <strong>{item.attention_summary || "Exit work is on track."}</strong>
              <p className="muted" style={{ margin: "6px 0 0" }}>
                {item.clearance_open_count} open, {item.clearance_overdue_count} overdue, {item.clearance_escalation_due_count} escalation due.
              </p>
              {item.handover_notes ? <p>{item.handover_notes}</p> : null}
            </div>
          </article>
        ))}

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
