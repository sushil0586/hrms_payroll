"use client";

import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";




import { AsyncDownloadButton } from "@/components/patterns/async-download-button";
import { useEffect, useMemo, useState } from "react";

import {useSearchParams} from "next/navigation";
import {selectLifecycleReport,lifecyclePriority as lifecycleRisk} from "@/lib/lifecycle-report";
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


export function LifecycleQueueReportWorkspace({ items, asOf }: { items: HrAdminLifecycleQueueItem[]; asOf:string }) {
  const searchParams=useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q")??"");
  const [itemType, setItemType] = useState(searchParams.get("item_type")??"All");
  const [status, setStatus] = useState(searchParams.get("status")??"All");
  const [owner, setOwner] = useState(searchParams.get("owner")??"All");
  const [attentionState, setAttentionState] = useState(searchParams.get("attention_state")??"All");
  const [documentAttentionState, setDocumentAttentionState] = useState(searchParams.get("document_attention_state")??"All");
  const [sortBy, setSortBy] = useState(searchParams.get("sort")??"attention");
  const [page, setPage] = useState(Math.max(1,Number(searchParams.get("page"))||1));

  const itemTypes = useMemo(() => ["All", ...unique(items.map((item) => item.item_type))], [items]);
  const statuses = useMemo(() => ["All", ...unique(items.map((item) => item.status))], [items]);
  const owners = useMemo(() => ["All", ...unique(items.map((item) => item.owner_value))], [items]);
  const attentionStates = useMemo(() => ["All", ...unique(items.map((item) => item.attention_state))], [items]);
  const documentAttentionStates = useMemo(() => ["All", ...unique(items.map((item) => item.document_attention_state))], [items]);

  const filteredRows=useMemo(()=>selectLifecycleReport(items,"lifecycle-queue",{q:query,item_type:itemType,status,owner,attention_state:attentionState,document_attention_state:documentAttentionState,sort:sortBy},asOf),[items,asOf,query,itemType,status,owner,attentionState,documentAttentionState,sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();params.set("as_of",asOf);
    if (query.trim()) params.set("q", query.trim());
    if (itemType !== "All") params.set("item_type", itemType);
    if (status !== "All") params.set("status", status);
    if (owner !== "All") params.set("owner", owner);
    if (attentionState !== "All") params.set("attention_state", attentionState);
    if (documentAttentionState !== "All") params.set("document_attention_state", documentAttentionState);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/lifecycle-queue?${params.toString()}`;
  }, [asOf,attentionState, documentAttentionState, itemType, owner, query, sortBy, status]);
  const manifestHref = `${exportHref}&format=manifest`;
  useEffect(()=>{const url=new URL(exportHref,window.location.origin);url.pathname=window.location.pathname;url.searchParams.set('page',String(currentPage));window.history.replaceState(null,'',url);},[exportHref,currentPage]);

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  function clearFilters() {
    setQuery("");
    setItemType("All");
    setStatus("All");
    setOwner("All");
    setAttentionState("All");
    setDocumentAttentionState("All");
    setSortBy("attention");
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Lifecycle queue report workspace">
      <div className="report-catalog-workspace lifecycle-queue-report" data-testid="lifecycle-queue-report">
        <div className="report-command-panel">
          <div className="report-command-panel__actions">
            <AsyncDownloadButton href={exportHref} fileName="report.csv">Export filtered CSV</AsyncDownloadButton>
            <AsyncDownloadButton className="button button--ghost" href={manifestHref} fileName="report-manifest.json">Manifest</AsyncDownloadButton>
            <button className="button button--ghost" onClick={() => window.print()} type="button">Print current page</button>
          </div>
        </div>

        <div className="attendance-summary-strip payroll-run-summary-strip payroll-setup-metrics">
          <article>
            <span>Lifecycle records</span>
            <strong>{filteredRows.length}</strong>
            <small>{items.length} collected records</small>
          </article>
          <article>
            <span>High attention priority</span>
            <strong>{filteredRows.filter((item) => lifecycleRisk(item) === "High").length}</strong>
            <small>Includes readiness warnings</small>
          </article>
          <article>
            <span>Owner gaps</span>
            <strong>{filteredRows.filter((item) => !item.owner_value).length}</strong>
            <small>Unassigned records</small>
          </article>
          <article>
            <span>Document blockers</span>
            <strong>{filteredRows.filter((item) => item.document_attention_state === "blocked").length}</strong>
            <small>Required docs missing</small>
          </article>
        </div>

        <div className="report-filter-panel" aria-label="Lifecycle queue filters">
          <div className="report-filter-panel__header">
            <div>
              <strong>Filter lifecycle queue</strong>
              <span>Narrow by lifecycle type, owner, attention state, or document blocker pressure.</span>
            </div>
            <button className="button button--ghost" onClick={clearFilters} type="button">Clear filters</button>
          </div>
          <div className="report-filter-grid report-filter-grid--lifecycle">
            <label className="report-filter-field report-filter-field--wide">
              <span>Search lifecycle</span>
              <input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search employee, owner, workflow, notes" />
            </label>
            <label className="report-filter-field">
              <span>Lifecycle type</span>
              <select aria-label="Lifecycle type" className="input-control" value={itemType} onChange={(event) => updateFilter(() => setItemType(event.target.value))}>
                {itemTypes.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
              </select>
            </label>
            <label className="report-filter-field">
              <span>Status</span>
              <select aria-label="Status" className="input-control" value={status} onChange={(event) => updateFilter(() => setStatus(event.target.value))}>
                {statuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
              </select>
            </label>
            <label className="report-filter-field">
              <span>Owner</span>
              <select aria-label="Owner" className="input-control" value={owner} onChange={(event) => updateFilter(() => setOwner(event.target.value))}>
                {owners.map((item) => <option key={item} value={item}>{item || "Unassigned"}</option>)}
              </select>
            </label>
            <label className="report-filter-field">
              <span>Lifecycle attention</span>
              <select aria-label="Lifecycle attention" className="input-control" value={attentionState} onChange={(event) => updateFilter(() => setAttentionState(event.target.value))}>
                {attentionStates.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
              </select>
            </label>
            <label className="report-filter-field">
              <span>Document attention</span>
              <select aria-label="Document attention" className="input-control" value={documentAttentionState} onChange={(event) => updateFilter(() => setDocumentAttentionState(event.target.value))}>
                {documentAttentionStates.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
              </select>
            </label>
            <label className="report-filter-field">
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
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{itemTypes.length - 1}</strong> lifecycle types</span>
          <span className="queue-summary-chip"><strong>{filteredRows.filter((item) => item.next_due_on).length}</strong> due dates</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
        </div>

        <WorkspaceTableScrollRegion label="Lifecycle queue report table 1" className="report-catalog-table-wrap workspace-table-region">
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
                    {item.workflow_reference ? <code>{item.workflow_reference}</code> : <span>No workflow linked</span>}
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{item.item_label}</span>
                      <span className={statusClass(item.status)}>{item.status_label || titleCase(item.status)}</span>
                      <span>{item.summary || "No summary"}</span>
                    </div>
                  </td>
                  <td className="lifecycle-report-owner">
                    <div className="payroll-register-stack">
                      <span>{item.owner_label || "Unassigned"}</span>
                      {item.owner_value ? <span>{item.owner_value}</span> : null}
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
                      <a data-navigation-mode="document" className="button button--secondary" href={item.detail_href+(item.detail_href.includes("?")?"&":"?")+new URLSearchParams({returnTo:`/hr-admin/reports/lifecycle-queue?${searchParams.toString()}`})}>
                        Open
                      </a>
                      <a data-navigation-mode="document" className="button button--ghost" href={`/hr-admin/lifecycle?q=${encodeURIComponent(item.employee_code)}`}>
                        Queue
                      </a>
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
        </WorkspaceTableScrollRegion>

        <div className="pagination-bar" aria-label="Lifecycle queue pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
