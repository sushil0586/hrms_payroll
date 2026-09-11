"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HrAdminLifecycleQueueItem } from "@/lib/types";

const PAGE_SIZE = 10;

type AgingRow = HrAdminLifecycleQueueItem & {
  ageDays: number;
  ageBucket: string;
  daysOverdue: number;
  slaState: string;
  slaRisk: "High" | "Medium" | "Low";
  ownerGap: boolean;
  documentBlockerCount: number;
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function dateOnly(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function daysSince(value: string | null | undefined) {
  const date = dateOnly(value);
  if (!date) return 0;
  const today = dateOnly(new Date().toISOString()) ?? new Date();
  return Math.max(0, Math.floor((today.getTime() - date.getTime()) / 86_400_000));
}

function daysOverdue(value: string | null | undefined) {
  const date = dateOnly(value);
  if (!date) return 0;
  const today = dateOnly(new Date().toISOString()) ?? new Date();
  return Math.max(0, Math.floor((today.getTime() - date.getTime()) / 86_400_000));
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function ageBucket(ageDays: number) {
  if (ageDays >= 30) return "30+ days";
  if (ageDays >= 15) return "15-29 days";
  if (ageDays >= 8) return "8-14 days";
  return "0-7 days";
}

function slaState(item: HrAdminLifecycleQueueItem) {
  const overdue = daysOverdue(item.next_due_on ?? item.attention_due_on);
  if (overdue > 0) return "Overdue";
  if (item.next_escalation_on) return "Escalation scheduled";
  if (!item.owner_value) return "Owner missing";
  if (item.document_attention_state === "blocked") return "Document blocked";
  return "On track";
}

function slaRisk(item: HrAdminLifecycleQueueItem): AgingRow["slaRisk"] {
  const overdue = daysOverdue(item.next_due_on ?? item.attention_due_on);
  if (overdue >= 3 || item.document_attention_state === "blocked" || !item.owner_value) return "High";
  if (overdue > 0 || item.next_escalation_on || item.attention_rank >= 40 || item.document_attention_state === "warning") return "Medium";
  return "Low";
}

function statusClass(status: string) {
  if (["completed", "confirmed", "approved", "closed", "clear", "low", "on track"].includes(status.toLowerCase())) return "record-chip record-chip--success";
  if (["pending", "in_progress", "warning", "upcoming", "medium", "escalation scheduled"].includes(status.toLowerCase())) return "record-chip record-chip--warning";
  if (["blocked", "overdue", "rejected", "high", "owner missing", "document blocked"].includes(status.toLowerCase())) return "record-chip record-chip--danger";
  return "record-chip";
}

function toAgingRow(item: HrAdminLifecycleQueueItem): AgingRow {
  const ageDays = daysSince(item.created_at);
  return {
    ...item,
    ageDays,
    ageBucket: ageBucket(ageDays),
    daysOverdue: daysOverdue(item.next_due_on ?? item.attention_due_on),
    slaState: slaState(item),
    slaRisk: slaRisk(item),
    ownerGap: !item.owner_value,
    documentBlockerCount: item.missing_required_document_count + item.expired_document_count,
  };
}

export function LifecycleAgingReportWorkspace({ items }: { items: HrAdminLifecycleQueueItem[] }) {
  const [query, setQuery] = useState("");
  const [itemType, setItemType] = useState("All");
  const [status, setStatus] = useState("All");
  const [owner, setOwner] = useState("All");
  const [bucket, setBucket] = useState("All");
  const [risk, setRisk] = useState("All");
  const [escalation, setEscalation] = useState("All");
  const [sortBy, setSortBy] = useState("overdue");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => items.map(toAgingRow), [items]);
  const itemTypes = useMemo(() => ["All", ...unique(rows.map((item) => item.item_type))], [rows]);
  const statuses = useMemo(() => ["All", ...unique(rows.map((item) => item.status))], [rows]);
  const owners = useMemo(() => ["All", ...unique(rows.map((item) => item.owner_value))], [rows]);
  const buckets = ["All", "0-7 days", "8-14 days", "15-29 days", "30+ days"];
  const risks = ["All", "High", "Medium", "Low"];

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          item.item_type,
          item.item_label,
          item.employee_code,
          item.employee_name,
          item.status,
          item.status_label,
          item.owner_value,
          item.owner_label,
          item.workflow_reference,
          item.slaState,
          item.slaRisk,
          item.attention_summary,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (itemType === "All" || item.item_type === itemType) &&
        (status === "All" || item.status === status) &&
        (owner === "All" || item.owner_value === owner) &&
        (bucket === "All" || item.ageBucket === bucket) &&
        (risk === "All" || item.slaRisk === risk) &&
        (escalation === "All" || (escalation === "scheduled" ? Boolean(item.next_escalation_on) : !item.next_escalation_on))
      );
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "age") return right.ageDays - left.ageDays;
      if (sortBy === "employee") return left.employee_name.localeCompare(right.employee_name);
      if (sortBy === "type") return left.item_type.localeCompare(right.item_type);
      if (sortBy === "owner") return String(left.owner_label ?? "").localeCompare(String(right.owner_label ?? ""));
      if (sortBy === "escalation") return String(left.next_escalation_on ?? "9999-12-31").localeCompare(String(right.next_escalation_on ?? "9999-12-31"));
      return right.daysOverdue - left.daysOverdue || right.attention_rank - left.attention_rank;
    });
  }, [bucket, escalation, itemType, owner, query, risk, rows, sortBy, status]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (itemType !== "All") params.set("item_type", itemType);
    if (status !== "All") params.set("status", status);
    if (owner !== "All") params.set("owner", owner);
    if (bucket !== "All") params.set("age_bucket", bucket);
    if (risk !== "All") params.set("sla_risk", risk);
    if (escalation !== "All") params.set("escalation", escalation);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/lifecycle-aging?${params.toString()}`;
  }, [bucket, escalation, itemType, owner, query, risk, sortBy, status]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Lifecycle aging report workspace">
      <div className="report-catalog-workspace lifecycle-aging-report" data-testid="lifecycle-aging-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Aging records</span>
            <strong>{filteredRows.length}</strong>
            <small>{items.length} total lifecycle records</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Overdue items</span>
            <strong>{filteredRows.filter((item) => item.daysOverdue > 0).length}</strong>
            <small>SLA date has passed</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Escalations</span>
            <strong>{filteredRows.filter((item) => item.next_escalation_on).length}</strong>
            <small>Escalation date scheduled</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>High SLA risk</span>
            <strong>{filteredRows.filter((item) => item.slaRisk === "High").length}</strong>
            <small>Owner, overdue, or document blocker</small>
          </article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Lifecycle aging filters">
          <label>
            <span>Search aging</span>
            <input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search employee, owner, workflow, SLA" />
          </label>
          <label>
            <span>Lifecycle type</span>
            <select aria-label="Lifecycle type" className="input-control" value={itemType} onChange={(event) => updateFilter(() => setItemType(event.target.value))}>
              {itemTypes.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select aria-label="Status" className="input-control" value={status} onChange={(event) => updateFilter(() => setStatus(event.target.value))}>
              {statuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
            </select>
          </label>
          <label>
            <span>Owner</span>
            <select aria-label="Owner" className="input-control" value={owner} onChange={(event) => updateFilter(() => setOwner(event.target.value))}>
              {owners.map((item) => <option key={item} value={item}>{item || "Unassigned"}</option>)}
            </select>
          </label>
          <label>
            <span>Age bucket</span>
            <select aria-label="Age bucket" className="input-control" value={bucket} onChange={(event) => updateFilter(() => setBucket(event.target.value))}>
              {buckets.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>SLA risk</span>
            <select aria-label="SLA risk" className="input-control" value={risk} onChange={(event) => updateFilter(() => setRisk(event.target.value))}>
              {risks.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Escalation</span>
            <select aria-label="Escalation" className="input-control" value={escalation} onChange={(event) => updateFilter(() => setEscalation(event.target.value))}>
              <option value="All">All</option>
              <option value="scheduled">Scheduled</option>
              <option value="missing">Missing</option>
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}>
              <option value="overdue">Overdue first</option>
              <option value="age">Oldest first</option>
              <option value="employee">Employee</option>
              <option value="type">Lifecycle type</option>
              <option value="owner">Owner</option>
              <option value="escalation">Escalation date</option>
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.filter((item) => item.ageBucket === "30+ days").length}</strong> aged 30+ days</span>
          <span className="queue-summary-chip"><strong>{filteredRows.filter((item) => item.ownerGap).length}</strong> owner gaps</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>Export filtered CSV</Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead>
              <tr>
                <th scope="col">Employee</th>
                <th scope="col">Lifecycle</th>
                <th scope="col">Age</th>
                <th scope="col">SLA</th>
                <th scope="col">Owner</th>
                <th scope="col">Evidence</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((item) => (
                <tr key={`${item.item_type}-${item.id}`}>
                  <td>
                    <strong>{item.employee_name}</strong>
                    <span>{item.employee_code}</span>
                    <code>{item.workflow_reference || "workflow.pending"}</code>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{item.item_label}</span>
                      <span className={statusClass(item.status)}>{item.status_label || titleCase(item.status)}</span>
                      <span>{item.primary_date_label}: {formatDate(item.primary_date)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(item.ageBucket)}>{item.ageBucket}</span>
                      <span>{item.ageDays} days open</span>
                      <span>Created {formatDate(item.created_at)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(item.slaRisk)}>{item.slaRisk}</span>
                      <span>{item.slaState}</span>
                      <span>{item.daysOverdue} days overdue</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{item.owner_label || "Unassigned"}</span>
                      <span>{item.owner_value || "No owner ref"}</span>
                      <span>Escalates {formatDate(item.next_escalation_on)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{item.attention_summary || "No active SLA pressure."}</span>
                      <span>{item.documentBlockerCount} document blockers</span>
                      <span className={statusClass(item.document_attention_state)}>{titleCase(item.document_attention_state || "clear")}</span>
                    </div>
                  </td>
                  <td>
                    <div className="report-row-actions">
                      <Link className="button button--secondary" href={item.detail_href}>
                        Open
                      </Link>
                      <Link className="button button--ghost" href={`/hr-admin/lifecycle?q=${encodeURIComponent(item.employee_code)}`}>
                        Queue
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">No lifecycle aging rows match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Lifecycle aging pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
