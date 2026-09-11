"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { AttendanceRegularizationItem } from "@/lib/types";

const PAGE_SIZE = 10;

type AttendanceExceptionRow = AttendanceRegularizationItem & {
  agingDays: number;
  slaState: string;
  slaRisk: "High" | "Medium" | "Low";
  payrollImpact: string;
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

function agingDays(appliedAt: string | null, createdAt: string, resolvedAt?: string | null) {
  const start = dateOnly(appliedAt ?? createdAt);
  const end = dateOnly(resolvedAt ?? new Date().toISOString());
  if (!start || !end) return 0;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function slaRisk(status: string, age: number): AttendanceExceptionRow["slaRisk"] {
  if (status === "pending" && age >= 3) return "High";
  if (status === "pending" || age >= 2) return "Medium";
  return "Low";
}

function slaState(status: string, age: number) {
  if (status === "pending" && age >= 3) return "Overdue";
  if (status === "pending") return "Pending review";
  if (status === "applied") return "Resolved";
  if (status === "rejected") return "Rejected";
  return "Tracked";
}

function payrollImpact(currentStatus: string, requestedStatus: string) {
  if (currentStatus === requestedStatus) return "No status change";
  if ([currentStatus, requestedStatus].includes("absent")) return "LOP impact";
  if ([currentStatus, requestedStatus].includes("half_day")) return "Partial day impact";
  return "Attendance correction";
}

function statusClass(status: string) {
  if (["applied", "resolved", "low", "no status change"].includes(status.toLowerCase())) return "record-chip record-chip--success";
  if (["pending", "pending review", "medium", "attendance correction", "partial day impact"].includes(status.toLowerCase())) return "record-chip record-chip--warning";
  if (["rejected", "overdue", "high", "lop impact"].includes(status.toLowerCase())) return "record-chip record-chip--danger";
  return "record-chip";
}

function toReportRow(item: AttendanceRegularizationItem): AttendanceExceptionRow {
  const age = agingDays(item.applied_at, item.created_at, item.resolved_at);
  return {
    ...item,
    agingDays: age,
    slaState: slaState(item.status, age),
    slaRisk: slaRisk(item.status, age),
    payrollImpact: payrollImpact(item.current_status, item.requested_status),
  };
}

export function AttendanceExceptionsReportWorkspace({ items }: { items: AttendanceRegularizationItem[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [requestedStatus, setRequestedStatus] = useState("All");
  const [currentStatus, setCurrentStatus] = useState("All");
  const [risk, setRisk] = useState("All");
  const [impact, setImpact] = useState("All");
  const [sortBy, setSortBy] = useState("aging");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => items.map(toReportRow), [items]);
  const statuses = useMemo(() => ["All", ...unique(rows.map((item) => item.status))], [rows]);
  const requestedStatuses = useMemo(() => ["All", ...unique(rows.map((item) => item.requested_status))], [rows]);
  const currentStatuses = useMemo(() => ["All", ...unique(rows.map((item) => item.current_status))], [rows]);
  const impacts = useMemo(() => ["All", ...unique(rows.map((item) => item.payrollImpact))], [rows]);
  const risks = ["All", "High", "Medium", "Low"];

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          item.employee_code,
          item.employee_name,
          item.department,
          item.designation,
          item.attendance_date,
          item.current_status,
          item.requested_status,
          item.status,
          item.shift,
          item.reason,
          item.manager_comment,
          item.workflow_reference,
          item.slaState,
          item.slaRisk,
          item.payrollImpact,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (status === "All" || item.status === status) &&
        (requestedStatus === "All" || item.requested_status === requestedStatus) &&
        (currentStatus === "All" || item.current_status === currentStatus) &&
        (risk === "All" || item.slaRisk === risk) &&
        (impact === "All" || item.payrollImpact === impact)
      );
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "employee") return String(left.employee_name ?? "").localeCompare(String(right.employee_name ?? ""));
      if (sortBy === "date") return right.attendance_date.localeCompare(left.attendance_date);
      if (sortBy === "status") return left.status.localeCompare(right.status);
      if (sortBy === "impact") return left.payrollImpact.localeCompare(right.payrollImpact);
      const score = { High: 3, Medium: 2, Low: 1 };
      return right.agingDays - left.agingDays || score[right.slaRisk] - score[left.slaRisk];
    });
  }, [currentStatus, impact, query, requestedStatus, risk, rows, sortBy, status]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status !== "All") params.set("status", status);
    if (requestedStatus !== "All") params.set("requested_status", requestedStatus);
    if (currentStatus !== "All") params.set("current_status", currentStatus);
    if (risk !== "All") params.set("sla_risk", risk);
    if (impact !== "All") params.set("payroll_impact", impact);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/attendance-exceptions?${params.toString()}`;
  }, [currentStatus, impact, query, requestedStatus, risk, sortBy, status]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Attendance exceptions SLA report workspace">
      <div className="report-catalog-workspace attendance-exceptions-report" data-testid="attendance-exceptions-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Exception rows</span>
            <strong>{filteredRows.length}</strong>
            <small>{items.length} total requests</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Pending review</span>
            <strong>{filteredRows.filter((item) => item.status === "pending").length}</strong>
            <small>Awaiting decision</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Overdue SLA</span>
            <strong>{filteredRows.filter((item) => item.slaState === "Overdue").length}</strong>
            <small>Pending 3+ days</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Payroll impact</span>
            <strong>{filteredRows.filter((item) => item.payrollImpact !== "No status change").length}</strong>
            <small>May affect payroll inputs</small>
          </article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Attendance exception filters">
          <label>
            <span>Search exceptions</span>
            <input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search employee, reason, workflow, status" />
          </label>
          <label>
            <span>Request status</span>
            <select aria-label="Request status" className="input-control" value={status} onChange={(event) => updateFilter(() => setStatus(event.target.value))}>
              {statuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
            </select>
          </label>
          <label>
            <span>Requested status</span>
            <select aria-label="Requested status" className="input-control" value={requestedStatus} onChange={(event) => updateFilter(() => setRequestedStatus(event.target.value))}>
              {requestedStatuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
            </select>
          </label>
          <label>
            <span>Current status</span>
            <select aria-label="Current status" className="input-control" value={currentStatus} onChange={(event) => updateFilter(() => setCurrentStatus(event.target.value))}>
              {currentStatuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
            </select>
          </label>
          <label>
            <span>SLA risk</span>
            <select aria-label="SLA risk" className="input-control" value={risk} onChange={(event) => updateFilter(() => setRisk(event.target.value))}>
              {risks.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Payroll impact</span>
            <select aria-label="Payroll impact" className="input-control" value={impact} onChange={(event) => updateFilter(() => setImpact(event.target.value))}>
              {impacts.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}>
              <option value="aging">Aging first</option>
              <option value="employee">Employee</option>
              <option value="date">Attendance date</option>
              <option value="status">Request status</option>
              <option value="impact">Payroll impact</option>
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.filter((item) => item.slaRisk === "High").length}</strong> high risk</span>
          <span className="queue-summary-chip"><strong>{filteredRows.filter((item) => item.workflow_reference).length}</strong> workflow linked</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>Export filtered CSV</Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead>
              <tr>
                <th scope="col">Employee</th>
                <th scope="col">Attendance</th>
                <th scope="col">Correction</th>
                <th scope="col">SLA</th>
                <th scope="col">Payroll</th>
                <th scope="col">Evidence</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.employee_name}</strong>
                    <span>{item.employee_code}</span>
                    <span>{item.department || "No department"} / {item.designation || "No designation"}</span>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{formatDate(item.attendance_date)}</span>
                      <span>{item.shift || "No shift"}</span>
                      <span className={statusClass(item.status)}>{titleCase(item.status)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{titleCase(item.current_status)} to {titleCase(item.requested_status)}</span>
                      <span>Actual in {formatDateTime(item.actual_check_in_at)}</span>
                      <span>Requested in {formatDateTime(item.requested_check_in_at)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(item.slaRisk)}>{item.slaRisk}</span>
                      <span>{item.slaState}</span>
                      <span>{item.agingDays} days aging</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(item.payrollImpact)}>{item.payrollImpact}</span>
                      <span>Applied {formatDateTime(item.applied_at)}</span>
                      <span>Resolved {formatDateTime(item.resolved_at)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{item.reason || "No reason"}</span>
                      <span>{item.manager_comment || "No manager comment"}</span>
                      <code>{item.workflow_reference || "workflow.pending"}</code>
                    </div>
                  </td>
                  <td>
                    <div className="report-row-actions">
                      <Link className="button button--secondary" href={`/hr-admin/attendance-regularizations/${item.id}/review`}>
                        Review
                      </Link>
                      <Link className="button button--ghost" href={`/hr-admin/attendance-regularizations?q=${encodeURIComponent(item.employee_code ?? "")}`}>
                        Queue
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">No attendance exception rows match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Attendance exceptions pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
