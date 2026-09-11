"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HrAdminLifecycleQueueItem } from "@/lib/types";

const PAGE_SIZE = 10;

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (["completed", "confirmed", "approved", "closed", "clear", "low"].includes(status.toLowerCase())) return "record-chip record-chip--success";
  if (["pending", "in_progress", "warning", "upcoming", "medium"].includes(status.toLowerCase())) return "record-chip record-chip--warning";
  if (["blocked", "overdue", "rejected", "high"].includes(status.toLowerCase())) return "record-chip record-chip--danger";
  return "record-chip";
}

function lifecycleRisk(item: HrAdminLifecycleQueueItem) {
  if (item.attention_rank >= 80 || item.document_attention_state === "blocked" || item.bulk_status_warning) return "High";
  if (item.attention_rank >= 40 || item.document_attention_state === "warning" || item.document_attention_state === "upcoming") return "Medium";
  return "Low";
}

export function LifecycleQueueReportWorkspace({ items }: { items: HrAdminLifecycleQueueItem[] }) {
  const [query, setQuery] = useState("");
  const [itemType, setItemType] = useState("All");
  const [status, setStatus] = useState("All");
  const [owner, setOwner] = useState("All");
  const [attentionState, setAttentionState] = useState("All");
  const [documentAttentionState, setDocumentAttentionState] = useState("All");
  const [sortBy, setSortBy] = useState("attention");
  const [page, setPage] = useState(1);

  const itemTypes = useMemo(() => ["All", ...unique(items.map((item) => item.item_type))], [items]);
  const statuses = useMemo(() => ["All", ...unique(items.map((item) => item.status))], [items]);
  const owners = useMemo(() => ["All", ...unique(items.map((item) => item.owner_value))], [items]);
  const attentionStates = useMemo(() => ["All", ...unique(items.map((item) => item.attention_state))], [items]);
  const documentAttentionStates = useMemo(() => ["All", ...unique(items.map((item) => item.document_attention_state))], [items]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = items.filter((item) => {
      const matchesType = itemType === "All" || item.item_type === itemType;
      const matchesStatus = status === "All" || item.status === status;
      const matchesOwner = owner === "All" || item.owner_value === owner;
      const matchesAttention = attentionState === "All" || item.attention_state === attentionState;
      const matchesDocumentAttention = documentAttentionState === "All" || item.document_attention_state === documentAttentionState;
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
          item.summary,
          item.document_attention_summary,
          item.attention_summary,
          item.bulk_status_warning,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesType && matchesStatus && matchesOwner && matchesAttention && matchesDocumentAttention && matchesQuery;
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "employee") return left.employee_name.localeCompare(right.employee_name);
      if (sortBy === "type") return left.item_type.localeCompare(right.item_type);
      if (sortBy === "status") return left.status.localeCompare(right.status);
      if (sortBy === "owner") return String(left.owner_label ?? "").localeCompare(String(right.owner_label ?? ""));
      if (sortBy === "due_date") return String(left.next_due_on ?? left.primary_date ?? "9999-12-31").localeCompare(String(right.next_due_on ?? right.primary_date ?? "9999-12-31"));
      return right.attention_rank - left.attention_rank;
    });
  }, [attentionState, documentAttentionState, itemType, items, owner, query, sortBy, status]);

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
    if (attentionState !== "All") params.set("attention_state", attentionState);
    if (documentAttentionState !== "All") params.set("document_attention_state", documentAttentionState);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/lifecycle-queue?${params.toString()}`;
  }, [attentionState, documentAttentionState, itemType, owner, query, sortBy, status]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Lifecycle queue report workspace">
      <div className="report-catalog-workspace lifecycle-queue-report" data-testid="lifecycle-queue-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Lifecycle records</span>
            <strong>{filteredRows.length}</strong>
            <small>{items.length} total records</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>High risk</span>
            <strong>{filteredRows.filter((item) => lifecycleRisk(item) === "High").length}</strong>
            <small>Attention required</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Owner gaps</span>
            <strong>{filteredRows.filter((item) => !item.owner_value).length}</strong>
            <small>Unassigned records</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Document blockers</span>
            <strong>{filteredRows.filter((item) => item.document_attention_state === "blocked").length}</strong>
            <small>Required docs missing</small>
          </article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Lifecycle queue filters">
          <label>
            <span>Search lifecycle</span>
            <input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search employee, owner, workflow, notes" />
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
            <span>Lifecycle attention</span>
            <select aria-label="Lifecycle attention" className="input-control" value={attentionState} onChange={(event) => updateFilter(() => setAttentionState(event.target.value))}>
              {attentionStates.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
            </select>
          </label>
          <label>
            <span>Document attention</span>
            <select aria-label="Document attention" className="input-control" value={documentAttentionState} onChange={(event) => updateFilter(() => setDocumentAttentionState(event.target.value))}>
              {documentAttentionStates.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}>
              <option value="attention">Attention rank</option>
              <option value="employee">Employee</option>
              <option value="type">Lifecycle type</option>
              <option value="status">Status</option>
              <option value="owner">Owner</option>
              <option value="due_date">Due date</option>
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{itemTypes.length - 1}</strong> lifecycle types</span>
          <span className="queue-summary-chip"><strong>{filteredRows.filter((item) => item.next_due_on).length}</strong> due dates</span>
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
                <th scope="col">Owner</th>
                <th scope="col">Dates</th>
                <th scope="col">Attention</th>
                <th scope="col">Documents</th>
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
                      <span>{item.summary || "No summary"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{item.owner_label || "Unassigned"}</span>
                      <span>{item.owner_value || "No owner ref"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{item.primary_date_label}: {formatDate(item.primary_date)}</span>
                      <span>{item.secondary_date_label || "Secondary"}: {formatDate(item.secondary_date)}</span>
                      <span>Next due: {formatDate(item.next_due_on)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(lifecycleRisk(item))}>{lifecycleRisk(item)}</span>
                      <span>{titleCase(item.attention_state || "clear")}</span>
                      <span>{item.attention_summary || "No active lifecycle pressure."}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(item.document_attention_state)}>{titleCase(item.document_attention_state || "clear")}</span>
                      <span>{item.missing_required_document_count} missing / {item.expired_document_count} expired</span>
                      <span>{item.expiring_document_count} expiring / {item.future_due_document_count} upcoming</span>
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
                    <div className="empty-state">No lifecycle queue rows match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Lifecycle queue pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
