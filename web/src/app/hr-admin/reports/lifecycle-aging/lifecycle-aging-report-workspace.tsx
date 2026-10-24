"use client";

import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";




import { AsyncDownloadButton } from "@/components/patterns/async-download-button";
import { useEffect, useMemo, useState } from "react";

import {useSearchParams} from "next/navigation";
import {selectLifecycleReport,lifecycleDaysSince as daysSince,lifecycleAgeBucket as ageBucket,lifecycleSlaState as slaState,lifecycleSlaRisk as slaRisk} from "@/lib/lifecycle-report";
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

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (["completed", "confirmed", "approved", "closed", "clear", "low", "on track"].includes(status.toLowerCase())) return "record-chip record-chip--success";
  if (["pending", "in_progress", "warning", "upcoming", "medium", "escalation scheduled"].includes(status.toLowerCase())) return "record-chip record-chip--warning";
  if (["blocked", "overdue", "rejected", "high", "owner missing", "document blocked"].includes(status.toLowerCase())) return "record-chip record-chip--danger";
  return "record-chip";
}

function toAgingRow(item: HrAdminLifecycleQueueItem, asOf:string): AgingRow {
  const ageDays = daysSince(item.created_at,asOf);
  return {
    ...item,
    ageDays,
    ageBucket: ageBucket(ageDays),
    daysOverdue: daysSince(item.next_due_on ?? item.attention_due_on,asOf),
    slaState: slaState(item,asOf),
    slaRisk: slaRisk(item,asOf),
    ownerGap: !item.owner_value,
    documentBlockerCount: item.missing_required_document_count + item.expired_document_count,
  };
}

export function LifecycleAgingReportWorkspace({ items, asOf }: { items: HrAdminLifecycleQueueItem[]; asOf:string }) {
  const searchParams=useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q")??"");
  const [itemType, setItemType] = useState(searchParams.get("item_type")??"All");
  const [status, setStatus] = useState(searchParams.get("status")??"All");
  const [owner, setOwner] = useState(searchParams.get("owner")??"All");
  const [bucket, setBucket] = useState(searchParams.get("age_bucket")??"All");
  const [risk, setRisk] = useState(searchParams.get("sla_risk")??"All");
  const [escalation, setEscalation] = useState(searchParams.get("escalation")??"All");
  const [sortBy, setSortBy] = useState(searchParams.get("sort")??"overdue");
  const [page, setPage] = useState(Math.max(1,Number(searchParams.get("page"))||1));

  const rows = useMemo(() => items.map(item=>toAgingRow(item,asOf)), [items,asOf]);
  const itemTypes = useMemo(() => ["All", ...unique(rows.map((item) => item.item_type))], [rows]);
  const statuses = useMemo(() => ["All", ...unique(rows.map((item) => item.status))], [rows]);
  const owners = useMemo(() => ["All", ...unique(rows.map((item) => item.owner_value))], [rows]);
  const buckets = ["All", "0-7 days", "8-14 days", "15-29 days", "30+ days"];
  const risks = ["All", "High", "Medium", "Low"];

  const filteredRows=useMemo(()=>selectLifecycleReport(items,"lifecycle-aging",{q:query,item_type:itemType,status,owner,age_bucket:bucket,sla_risk:risk,escalation,sort:sortBy},asOf).map(item=>toAgingRow(item,asOf)),[items,asOf,query,itemType,status,owner,bucket,risk,escalation,sortBy]);

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
    if (bucket !== "All") params.set("age_bucket", bucket);
    if (risk !== "All") params.set("sla_risk", risk);
    if (escalation !== "All") params.set("escalation", escalation);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/lifecycle-aging?${params.toString()}`;
  }, [asOf,bucket, escalation, itemType, owner, query, risk, sortBy, status]);
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
    setBucket("All");
    setRisk("All");
    setEscalation("All");
    setSortBy("overdue");
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Lifecycle aging report workspace">
      <div className="report-catalog-workspace lifecycle-aging-report" data-testid="lifecycle-aging-report">
        <div className="report-command-panel">
          <div className="report-command-panel__actions">
            <AsyncDownloadButton href={exportHref} fileName="report.csv">Export filtered CSV</AsyncDownloadButton>
            <AsyncDownloadButton className="button button--ghost" href={manifestHref} fileName="report-manifest.json">Manifest</AsyncDownloadButton>
            <button className="button button--ghost" onClick={() => window.print()} type="button">Print current page</button>
          </div>
        </div>

        <div className="attendance-summary-strip payroll-run-summary-strip payroll-setup-metrics">
          <article>
            <span>Aging records</span>
            <strong>{filteredRows.length}</strong>
            <small>{items.length} total lifecycle records</small>
          </article>
          <article>
            <span>Overdue items</span>
            <strong>{filteredRows.filter((item) => item.daysOverdue > 0).length}</strong>
            <small>SLA date has passed</small>
          </article>
          <article>
            <span>Escalations</span>
            <strong>{filteredRows.filter((item) => item.next_escalation_on).length}</strong>
            <small>Escalation date scheduled</small>
          </article>
          <article>
            <span>High SLA risk</span>
            <strong>{filteredRows.filter((item) => item.slaRisk === "High").length}</strong>
            <small>Owner, overdue, or document blocker</small>
          </article>
        </div>

        <div className="report-filter-panel" aria-label="Lifecycle aging filters">
          <div className="report-filter-panel__header">
            <div>
              <strong>Filter SLA aging</strong>
              <span>Use age, risk, owner, and escalation filters to prepare a focused exception review.</span>
            </div>
            <button className="button button--ghost" onClick={clearFilters} type="button">Clear filters</button>
          </div>
          <div className="report-filter-grid report-filter-grid--lifecycle">
            <label className="report-filter-field report-filter-field--wide">
              <span>Search aging</span>
              <input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search employee, owner, workflow, SLA" />
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
              <span>Age bucket</span>
              <select aria-label="Age bucket" className="input-control" value={bucket} onChange={(event) => updateFilter(() => setBucket(event.target.value))}>
                {buckets.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="report-filter-field">
              <span>SLA risk</span>
              <select aria-label="SLA risk" className="input-control" value={risk} onChange={(event) => updateFilter(() => setRisk(event.target.value))}>
                {risks.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="report-filter-field">
              <span>Escalation</span>
              <select aria-label="Escalation" className="input-control" value={escalation} onChange={(event) => updateFilter(() => setEscalation(event.target.value))}>
                <option value="All">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="missing">Missing</option>
              </select>
            </label>
            <label className="report-filter-field">
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
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.filter((item) => item.ageBucket === "30+ days").length}</strong> aged 30+ days</span>
          <span className="queue-summary-chip"><strong>{filteredRows.filter((item) => item.ownerGap).length}</strong> owner gaps</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
        </div>

        <WorkspaceTableScrollRegion label="Lifecycle aging report table 1" className="report-catalog-table-wrap workspace-table-region">
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
                    {item.workflow_reference ? <code>{item.workflow_reference}</code> : <span>No workflow linked</span>}
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
                  <td className="lifecycle-report-owner">
                    <div className="payroll-register-stack">
                      <span>{item.owner_label || "Unassigned"}</span>
                      {item.owner_value ? <span>{item.owner_value}</span> : null}
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
                      <a data-navigation-mode="document" className="button button--secondary" href={item.detail_href+(item.detail_href.includes("?")?"&":"?")+new URLSearchParams({returnTo:`/hr-admin/reports/lifecycle-aging?${searchParams.toString()}`})}>
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
                    <div className="empty-state">No lifecycle aging rows match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </WorkspaceTableScrollRegion>

        <div className="pagination-bar" aria-label="Lifecycle aging pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
