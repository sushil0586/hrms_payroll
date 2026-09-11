"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HrAdminAttendanceRecord } from "@/lib/types";

const PAGE_SIZE = 10;

type AttendanceReportRow = HrAdminAttendanceRecord & {
  exceptionType: string;
  payrollReadiness: string;
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

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (["present", "approved", "locked", "ready", "clear", "ready with regularization"].includes(status.toLowerCase())) return "record-chip record-chip--success";
  if (["late", "half_day", "pending", "manual", "regularized", "open", "exception review"].includes(status.toLowerCase())) return "record-chip record-chip--warning";
  if (["absent", "rejected", "high", "late and early exit", "early exit"].includes(status.toLowerCase())) return "record-chip record-chip--danger";
  return "record-chip";
}

function exceptionType(item: HrAdminAttendanceRecord) {
  if (item.status === "absent") return "Absent";
  if (item.late_minutes > 0 && item.early_exit_minutes > 0) return "Late and early exit";
  if (item.late_minutes > 0) return "Late";
  if (item.early_exit_minutes > 0) return "Early exit";
  if (item.is_regularized) return "Regularized";
  return "Clear";
}

function payrollReadiness(item: HrAdminAttendanceRecord) {
  if (!item.is_locked) return "Open";
  if (item.status === "absent" || item.late_minutes > 0 || item.early_exit_minutes > 0) {
    return item.is_regularized ? "Ready with regularization" : "Exception review";
  }
  return "Ready";
}

function toReportRow(item: HrAdminAttendanceRecord): AttendanceReportRow {
  return {
    ...item,
    exceptionType: exceptionType(item),
    payrollReadiness: payrollReadiness(item),
  };
}

export function AttendanceRegisterReportWorkspace({ items }: { items: HrAdminAttendanceRecord[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [source, setSource] = useState("All");
  const [department, setDepartment] = useState("All");
  const [lockState, setLockState] = useState("All");
  const [regularizedState, setRegularizedState] = useState("All");
  const [exception, setException] = useState("All");
  const [sortBy, setSortBy] = useState("date_desc");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => items.map(toReportRow), [items]);
  const statuses = useMemo(() => ["All", ...unique(rows.map((item) => item.status))], [rows]);
  const sources = useMemo(() => ["All", ...unique(rows.map((item) => item.source))], [rows]);
  const departments = useMemo(() => ["All", ...unique(rows.map((item) => item.department ?? ""))], [rows]);
  const exceptions = useMemo(() => ["All", ...unique(rows.map((item) => item.exceptionType))], [rows]);

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
          item.status,
          item.source,
          item.shift,
          item.holiday,
          item.exceptionType,
          item.payrollReadiness,
          item.notes,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (status === "All" || item.status === status) &&
        (source === "All" || item.source === source) &&
        (department === "All" || item.department === department) &&
        (lockState === "All" || (lockState === "locked" ? item.is_locked : !item.is_locked)) &&
        (regularizedState === "All" || (regularizedState === "regularized" ? item.is_regularized : !item.is_regularized)) &&
        (exception === "All" || item.exceptionType === exception)
      );
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "employee") return left.employee_name.localeCompare(right.employee_name);
      if (sortBy === "department") return String(left.department ?? "").localeCompare(String(right.department ?? ""));
      if (sortBy === "late") return right.late_minutes - left.late_minutes;
      if (sortBy === "overtime") return Number(right.overtime_hours) - Number(left.overtime_hours);
      if (sortBy === "readiness") return left.payrollReadiness.localeCompare(right.payrollReadiness);
      return right.attendance_date.localeCompare(left.attendance_date);
    });
  }, [department, exception, lockState, query, regularizedState, rows, sortBy, source, status]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status !== "All") params.set("status", status);
    if (source !== "All") params.set("source", source);
    if (department !== "All") params.set("department", department);
    if (lockState !== "All") params.set("lock_state", lockState);
    if (regularizedState !== "All") params.set("regularized_state", regularizedState);
    if (exception !== "All") params.set("exception_type", exception);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/attendance-register?${params.toString()}`;
  }, [department, exception, lockState, query, regularizedState, sortBy, source, status]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Daily attendance register report workspace">
      <div className="report-catalog-workspace attendance-register-report" data-testid="attendance-register-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Attendance rows</span>
            <strong>{filteredRows.length}</strong>
            <small>{items.length} total records</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Late marks</span>
            <strong>{filteredRows.filter((item) => item.late_minutes > 0).length}</strong>
            <small>Rows with late minutes</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Regularized</span>
            <strong>{filteredRows.filter((item) => item.is_regularized).length}</strong>
            <small>Approved correction rows</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Payroll ready</span>
            <strong>{filteredRows.filter((item) => item.payrollReadiness.startsWith("Ready")).length}</strong>
            <small>Locked or resolved records</small>
          </article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Attendance register filters">
          <label>
            <span>Search attendance</span>
            <input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search employee, department, status, notes" />
          </label>
          <label>
            <span>Status</span>
            <select aria-label="Status" className="input-control" value={status} onChange={(event) => updateFilter(() => setStatus(event.target.value))}>
              {statuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
            </select>
          </label>
          <label>
            <span>Source</span>
            <select aria-label="Source" className="input-control" value={source} onChange={(event) => updateFilter(() => setSource(event.target.value))}>
              {sources.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
            </select>
          </label>
          <label>
            <span>Department</span>
            <select aria-label="Department" className="input-control" value={department} onChange={(event) => updateFilter(() => setDepartment(event.target.value))}>
              {departments.map((item) => <option key={item} value={item}>{item || "Unassigned"}</option>)}
            </select>
          </label>
          <label>
            <span>Lock state</span>
            <select aria-label="Lock state" className="input-control" value={lockState} onChange={(event) => updateFilter(() => setLockState(event.target.value))}>
              <option value="All">All</option>
              <option value="locked">Locked</option>
              <option value="unlocked">Unlocked</option>
            </select>
          </label>
          <label>
            <span>Regularization</span>
            <select aria-label="Regularization" className="input-control" value={regularizedState} onChange={(event) => updateFilter(() => setRegularizedState(event.target.value))}>
              <option value="All">All</option>
              <option value="regularized">Regularized</option>
              <option value="pending">Pending</option>
            </select>
          </label>
          <label>
            <span>Exception</span>
            <select aria-label="Exception" className="input-control" value={exception} onChange={(event) => updateFilter(() => setException(event.target.value))}>
              {exceptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}>
              <option value="date_desc">Date newest</option>
              <option value="employee">Employee</option>
              <option value="department">Department</option>
              <option value="late">Late minutes</option>
              <option value="overtime">Overtime hours</option>
              <option value="readiness">Payroll readiness</option>
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.filter((item) => item.is_locked).length}</strong> locked</span>
          <span className="queue-summary-chip"><strong>{filteredRows.filter((item) => item.exceptionType !== "Clear").length}</strong> exceptions</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>Export filtered CSV</Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead>
              <tr>
                <th scope="col">Employee</th>
                <th scope="col">Date</th>
                <th scope="col">Status</th>
                <th scope="col">Punches</th>
                <th scope="col">Exception</th>
                <th scope="col">Payroll</th>
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
                      <span>{item.holiday || "No holiday"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(item.status)}>{titleCase(item.status)}</span>
                      <span>{titleCase(item.source)}</span>
                      <span>{item.notes || "No notes"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>In: {formatDateTime(item.check_in_at)}</span>
                      <span>Out: {formatDateTime(item.check_out_at)}</span>
                      <span>{item.work_duration_hours} hrs / OT {item.overtime_hours}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(item.exceptionType)}>{item.exceptionType}</span>
                      <span>{item.late_minutes} late minutes</span>
                      <span>{item.early_exit_minutes} early-exit minutes</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(item.payrollReadiness)}>{item.payrollReadiness}</span>
                      <span>{item.is_locked ? "Locked" : "Unlocked"}</span>
                      <span>{item.is_regularized ? "Regularized" : "Not regularized"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="report-row-actions">
                      <Link className="button button--secondary" href={`/hr-admin/attendance-records/${item.id}/edit`}>
                        Open
                      </Link>
                      <Link className="button button--ghost" href={`/hr-admin/attendance-records?q=${encodeURIComponent(item.employee_code)}`}>
                        Records
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">No attendance register rows match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Attendance register pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
