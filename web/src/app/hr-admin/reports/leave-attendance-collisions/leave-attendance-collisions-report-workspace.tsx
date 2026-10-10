"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { LeaveRequestItem } from "@/lib/types";

const PAGE_SIZE = 10;

type CollisionRow = {
  employee_code: string;
  employee_name: string;
  department: string;
  designation: string;
  leave_request_id: string;
  leave_type: string;
  leave_type_code: string;
  policy_name: string;
  leave_status: string;
  leave_start_date: string;
  leave_end_date: string;
  approved_units: string;
  collision_date: string;
  leave_units: string;
  attendance_record_id: string;
  attendance_status: string;
  shift: string;
  check_in_at: string;
  check_out_at: string;
  severity: string;
  payroll_blocking: boolean;
  message: string;
  workflow_reference: string;
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (["clear", "none", "approved", "low", "false"].includes(normalized)) return "record-chip record-chip--success";
  if (["medium", "partially_approved", "pending"].includes(normalized)) return "record-chip record-chip--warning";
  if (["high", "conflict", "blocked", "true"].includes(normalized)) return "record-chip record-chip--danger";
  return "record-chip";
}

function toRows(items: LeaveRequestItem[]): CollisionRow[] {
  return items.flatMap((item) => {
    const summary = item.attendance_collision_summary;
    const severity = summary?.severity ?? "none";
    const payrollBlocking = summary?.payroll_blocking ?? false;
    return (summary?.collisions ?? []).map((collision) => ({
      employee_code: item.employee_code ?? "",
      employee_name: item.employee_name ?? "",
      department: item.department ?? "",
      designation: item.designation ?? "",
      leave_request_id: item.id,
      leave_type: item.leave_type,
      leave_type_code: item.leave_type_code,
      policy_name: item.policy_name ?? "",
      leave_status: item.status,
      leave_start_date: item.start_date,
      leave_end_date: item.end_date,
      approved_units: item.approved_units,
      collision_date: collision.date,
      leave_units: collision.leave_units,
      attendance_record_id: collision.attendance_record_id,
      attendance_status: collision.attendance_status,
      shift: collision.shift ?? "",
      check_in_at: collision.check_in_at ?? "",
      check_out_at: collision.check_out_at ?? "",
      severity,
      payroll_blocking: payrollBlocking,
      message: collision.message,
      workflow_reference: item.workflow_reference,
    }));
  });
}

export function LeaveAttendanceCollisionsReportWorkspace({ items }: { items: LeaveRequestItem[] }) {
  const [query, setQuery] = useState("");
  const [leaveStatus, setLeaveStatus] = useState("All");
  const [severity, setSeverity] = useState("All");
  const [blocking, setBlocking] = useState("All");
  const [leaveType, setLeaveType] = useState("All");
  const [attendanceStatus, setAttendanceStatus] = useState("All");
  const [sortBy, setSortBy] = useState("severity");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => toRows(items), [items]);
  const leaveStatuses = useMemo(() => ["All", ...unique(rows.map((row) => row.leave_status))], [rows]);
  const severities = useMemo(() => ["All", ...unique(rows.map((row) => row.severity))], [rows]);
  const leaveTypes = useMemo(() => ["All", ...unique(rows.map((row) => row.leave_type))], [rows]);
  const attendanceStatuses = useMemo(() => ["All", ...unique(rows.map((row) => row.attendance_status))], [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          row.employee_code,
          row.employee_name,
          row.department,
          row.designation,
          row.leave_type,
          row.policy_name,
          row.leave_status,
          row.collision_date,
          row.attendance_status,
          row.shift,
          row.severity,
          row.message,
          row.workflow_reference,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (leaveStatus === "All" || row.leave_status === leaveStatus) &&
        (severity === "All" || row.severity === severity) &&
        (blocking === "All" || String(row.payroll_blocking) === blocking) &&
        (leaveType === "All" || row.leave_type === leaveType) &&
        (attendanceStatus === "All" || row.attendance_status === attendanceStatus)
      );
    });
    const severityScore: Record<string, number> = { high: 3, medium: 2, none: 1 };
    return nextRows.sort((left, right) => {
      if (sortBy === "employee") return left.employee_name.localeCompare(right.employee_name);
      if (sortBy === "date") return right.collision_date.localeCompare(left.collision_date);
      if (sortBy === "leave_type") return left.leave_type.localeCompare(right.leave_type);
      if (sortBy === "attendance_status") return left.attendance_status.localeCompare(right.attendance_status);
      return (severityScore[right.severity] ?? 0) - (severityScore[left.severity] ?? 0) || Number(right.payroll_blocking) - Number(left.payroll_blocking);
    });
  }, [attendanceStatus, blocking, leaveStatus, leaveType, query, rows, severity, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (leaveStatus !== "All") params.set("leave_status", leaveStatus);
    if (severity !== "All") params.set("severity", severity);
    if (blocking !== "All") params.set("payroll_blocking", blocking);
    if (leaveType !== "All") params.set("leave_type", leaveType);
    if (attendanceStatus !== "All") params.set("attendance_status", attendanceStatus);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/leave-attendance-collisions?${params.toString()}`;
  }, [attendanceStatus, blocking, leaveStatus, leaveType, query, severity, sortBy]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Leave-attendance collision report workspace">
      <div className="report-catalog-workspace leave-attendance-collisions-report" data-testid="leave-attendance-collisions-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft"><span>Collisions</span><strong>{filteredRows.length}</strong><small>{rows.length} total rows</small></article>
          <article className="metric-tile metric-tile-soft"><span>Payroll blocking</span><strong>{filteredRows.filter((row) => row.payroll_blocking).length}</strong><small>Needs payroll review</small></article>
          <article className="metric-tile metric-tile-soft"><span>High severity</span><strong>{filteredRows.filter((row) => row.severity === "high").length}</strong><small>Approved leave overlap</small></article>
          <article className="metric-tile metric-tile-soft"><span>Employees</span><strong>{unique(filteredRows.map((row) => row.employee_code)).length}</strong><small>Impacted population</small></article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Leave attendance collision filters">
          <label><span>Search collisions</span><input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search employee, leave, status, shift" /></label>
          <label><span>Leave status</span><select aria-label="Leave status" className="input-control" value={leaveStatus} onChange={(event) => updateFilter(() => setLeaveStatus(event.target.value))}>{leaveStatuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Severity</span><select aria-label="Severity" className="input-control" value={severity} onChange={(event) => updateFilter(() => setSeverity(event.target.value))}>{severities.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Payroll blocking</span><select aria-label="Payroll blocking" className="input-control" value={blocking} onChange={(event) => updateFilter(() => setBlocking(event.target.value))}><option value="All">All</option><option value="true">Blocking</option><option value="false">Not blocking</option></select></label>
          <label><span>Leave type</span><select aria-label="Leave type" className="input-control" value={leaveType} onChange={(event) => updateFilter(() => setLeaveType(event.target.value))}>{leaveTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Attendance status</span><select aria-label="Attendance status" className="input-control" value={attendanceStatus} onChange={(event) => updateFilter(() => setAttendanceStatus(event.target.value))}>{attendanceStatuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Sort</span><select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}><option value="severity">Severity first</option><option value="date">Newest collision date</option><option value="employee">Employee</option><option value="leave_type">Leave type</option><option value="attendance_status">Attendance status</option></select></label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.filter((row) => row.payroll_blocking).length}</strong> payroll blocking</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>Export filtered CSV</Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead><tr><th scope="col">Employee</th><th scope="col">Leave</th><th scope="col">Attendance</th><th scope="col">Payroll risk</th><th scope="col">Evidence</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={`${row.leave_request_id}-${row.attendance_record_id}-${row.collision_date}`}>
                  <td><strong>{row.employee_name}</strong><span>{row.employee_code}</span><span>{row.department || "No department"}</span></td>
                  <td><div className="payroll-register-stack"><strong>{row.leave_type}</strong><span>{row.leave_start_date} to {row.leave_end_date}</span><span>{row.approved_units} approved units</span><span className={statusClass(row.leave_status)}>{titleCase(row.leave_status)}</span></div></td>
                  <td><div className="payroll-register-stack"><strong>{row.collision_date}</strong><span>{titleCase(row.attendance_status)}</span><span>{row.shift || "No shift"}</span><span>{row.check_in_at || "No in"} / {row.check_out_at || "No out"}</span></div></td>
                  <td><div className="payroll-register-stack"><span className={statusClass(row.severity)}>{titleCase(row.severity)}</span><span className={statusClass(String(row.payroll_blocking))}>{row.payroll_blocking ? "Payroll blocking" : "Not blocking"}</span><span>{row.leave_units} leave units</span></div></td>
                  <td><div className="payroll-register-stack"><code>{row.workflow_reference}</code><code>{row.attendance_record_id}</code><span>{row.message}</span></div></td>
                  <td><div className="report-row-actions"><Link className="button button--secondary" href={`/hr-admin/leave-requests/${row.leave_request_id}/review`}>Review</Link><Link className="button button--ghost" href={`/hr-admin/attendance-records/${row.attendance_record_id}/edit`}>Attendance</Link></div></td>
                </tr>
              ))}
              {visibleRows.length === 0 ? <tr><td colSpan={6}><div className="empty-state">No leave-attendance collision rows match the selected filters.</div></td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Leave attendance collisions pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
