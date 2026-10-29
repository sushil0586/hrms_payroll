"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import type { HrAdminPayrollReadinessItem, HrAdminPayrollReadinessListResponse } from "@/lib/types";

type Filters = { q: string; status: string; period_start: string; period_end: string; page: number; page_size: number };

function titleCase(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase()); }
function badge(status: string) { return <span className={`readiness-badge readiness-badge--${status}`}>{titleCase(status)}</span>; }
function detailRow(label: string, value: string | number) { return <div className="detail-row"><span className="detail-label">{label}</span><span className="detail-value">{value}</span></div>; }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "Not mapped"; }

function Detail({ item }: { item: HrAdminPayrollReadinessItem | null }) {
  if (!item) return <aside className="payroll-readiness-detail-panel"><div className="payroll-readiness-detail-panel__header"><span className="workspace-card__eyebrow">Employee trace</span><h2>No employee selected</h2></div><p className="section-copy section-copy-soft">Select a row to inspect readiness, source counts, and open issues.</p></aside>;
  const issues = [...item.blockers, ...item.warnings];
  return <aside className="payroll-readiness-detail-panel" aria-label={`${item.employee_name} readiness detail`}>
    <div className="payroll-readiness-detail-panel__header"><span className="workspace-card__eyebrow">Employee trace</span><div><h2>{item.employee_name}</h2><p className="section-copy section-copy-soft">{item.employee_code} - {item.work_email || "No email"}</p></div>{badge(item.readiness_status)}</div>
    <div className="detail-grid">{detailRow("Legal entity", item.legal_entity || "Not mapped")}{detailRow("Branch", item.branch || "Not mapped")}{detailRow("Location", item.location || "Not mapped")}{detailRow("Department", item.department || "Not mapped")}{detailRow("Cost center", item.cost_center || "Not mapped")}{detailRow("Employment type", item.employment_type || "Not mapped")}{detailRow("Joining date", formatDate(item.date_of_joining))}{detailRow("Exit date", formatDate(item.exit_date))}</div>
    <div className="payroll-source-grid">{detailRow("Attendance records", item.source_counts.attendance_records ?? 0)}{detailRow("Leave requests", item.source_counts.leave_requests ?? 0)}{detailRow("Regularizations", item.source_counts.attendance_regularizations ?? 0)}{detailRow("Lifecycle events", item.source_counts.lifecycle_events ?? 0)}{detailRow("Documents", item.source_counts.documents ?? 0)}{detailRow("Bank accounts", item.source_counts.bank_accounts ?? 0)}</div>
    <div className="payroll-issue-stack">{issues.length ? issues.map((issue) => <div className="notice notice--compact" key={issue}><strong>{item.blockers.includes(issue) ? "Blocker" : "Warning"}</strong><span className="muted">{issue}</span></div>) : <div className="notice notice--compact notice--success"><strong>Ready</strong><span className="muted">No source-data issues for the selected profile.</span></div>}</div>
  </aside>;
}

export function PayrollReadinessEmployeesWorkspace({ initialData, initialFilters, initialEmployeeId }: { initialData: HrAdminPayrollReadinessListResponse; initialFilters: Filters; initialEmployeeId?: string }) {
  const regionRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (regionRef.current) regionRef.current.dataset.localUpdateHydrated = "true"; }, []);
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedId, setSelectedId] = useState(initialEmployeeId ?? initialData.items[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = useMemo(() => data.items.find((item) => item.id === selectedId) ?? data.items[0] ?? null, [data.items, selectedId]);

  async function load(next: Filters, employeeId?: string) {
    if (busy) return;
    setBusy(true); setError("");
    const params = new URLSearchParams({ tab: "employees", q: next.q, status: next.status, period_start: next.period_start, period_end: next.period_end, page: String(next.page), page_size: String(next.page_size) });
    try {
      const response = await fetch(`/api/hr-admin/payroll-readiness/workspace?${params}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as HrAdminPayrollReadinessListResponse | { detail?: string } | null;
      if (!response.ok || !payload || !("items" in payload)) { setError(payload && "detail" in payload && payload.detail ? payload.detail : "Payroll readiness could not be refreshed."); return; }
      setData(payload); setFilters(next); setSelectedId(employeeId && payload.items.some((item) => item.id === employeeId) ? employeeId : payload.items[0]?.id ?? "");
      window.history.pushState(null, "", `/hr-admin/payroll-readiness?${params}`);
    } catch { setError("Payroll readiness could not be confirmed. The current results are retained."); }
    finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void load({ ...filters, q: String(form.get("q") ?? "").trim(), period_start: String(form.get("period_start") ?? ""), period_end: String(form.get("period_end") ?? ""), page_size: Number(form.get("page_size") ?? 20), page: 1 });
  }

  const pages = Math.max(1, Math.ceil(data.total_count / Math.max(data.page_size, 1)));
  return <div className="payroll-readiness-workspace" data-local-update-hydrated="false" aria-busy={busy} ref={regionRef}>
    <div className="payroll-readiness-main-panel">
      <div className="payroll-toolbar"><div><span className="workspace-card__eyebrow">Employee table</span><h2>Payroll source review</h2></div><form className="payroll-filter-form" onSubmit={submit}><input aria-label="Search" className="input-control" defaultValue={filters.q} name="q" placeholder="Search employee, entity, cost center"/><input aria-label="Period start" className="input-control" defaultValue={filters.period_start} name="period_start" type="date"/><input aria-label="Period end" className="input-control" defaultValue={filters.period_end} name="period_end" type="date"/><select aria-label="Page size" className="input-control" defaultValue={String(filters.page_size)} name="page_size">{[10,20,50,100].map((size)=><option key={size} value={size}>{size} / page</option>)}</select><button className="button button--primary" disabled={busy} type="submit">{busy ? "Applying" : "Apply"}</button></form></div>
      <div className="status-tab-row" aria-label="Readiness status filters">{[{value:"all",label:"All"},{value:"ready",label:"Ready"},{value:"warning",label:"Warning"},{value:"blocked",label:"Blocked"}].map((tab)=><button className={`status-tab ${filters.status===tab.value?"status-tab--active":""}`} disabled={busy} key={tab.value} onClick={()=>void load({...filters,status:tab.value,page:1})} type="button"><span>{tab.label}</span><strong>{data.status_counts[tab.value]??0}</strong></button>)}</div>
      <WorkspaceTableScrollRegion label="Payroll readiness table 1" className="payroll-table-scroll workspace-table-region"><table className="payroll-readiness-table"><thead><tr><th>Employee</th><th>Status</th><th>Entity</th><th>Cost Center</th><th>Attendance</th><th>Pending</th><th>Bank</th></tr></thead><tbody>{data.items.map((item)=><tr className={selected?.id===item.id?"is-selected":""} key={item.id}><td><button className="button-link" onClick={()=>setSelectedId(item.id)} type="button"><strong>{item.employee_name}</strong><span>{item.employee_code}</span></button></td><td>{badge(item.readiness_status)}</td><td>{item.legal_entity||"Not mapped"}</td><td>{item.cost_center||"Not mapped"}</td><td>{item.attendance_record_days}/{item.working_days}</td><td>{item.pending_leave_requests+item.pending_attendance_regularizations}</td><td>{item.has_primary_bank_account?"Ready":"Missing"}</td></tr>)}</tbody></table></WorkspaceTableScrollRegion>
      {!data.items.length?<div className="notice notice--compact"><strong>No rows found.</strong><span className="muted">Adjust the search or status filter.</span></div>:null}
      <div className="pagination-bar"><button className="button button--secondary" disabled={busy||data.page<=1} onClick={()=>void load({...filters,page:1})} type="button">First</button><button className="button button--secondary" disabled={busy||!data.has_previous} onClick={()=>void load({...filters,page:data.page-1})} type="button">Previous</button><span>Page {data.page} of {pages} · {data.total_count} records</span><button className="button button--secondary" disabled={busy||!data.has_next} onClick={()=>void load({...filters,page:data.page+1})} type="button">Next</button><button className="button button--secondary" disabled={busy||data.page>=pages} onClick={()=>void load({...filters,page:pages})} type="button">Last</button></div>
      {error?<p className="form-status form-status--error" role="alert">{error}</p>:null}
    </div><Detail item={selected}/>
  </div>;
}
