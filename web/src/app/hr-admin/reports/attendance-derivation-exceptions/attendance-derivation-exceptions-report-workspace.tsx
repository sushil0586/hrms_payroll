"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HrAdminAttendanceRecord } from "@/lib/types";

const PAGE_SIZE = 10;

type DerivationRow = {
  record: HrAdminAttendanceRecord;
  risk: "High" | "Medium" | "Low";
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (["present", "clear", "low", "ready", "false"].includes(normalized)) return "record-chip record-chip--success";
  if (["late", "half_day", "medium", "warning"].includes(normalized)) return "record-chip record-chip--warning";
  if (["absent", "high", "conflict", "true"].includes(normalized)) return "record-chip record-chip--danger";
  return "record-chip";
}

function derivationRisk(item: HrAdminAttendanceRecord): DerivationRow["risk"] {
  const summary = item.derivation_summary;
  if (summary.leave_collision_count > 0 || summary.payroll_impact.payroll_impacting || item.status === "absent") return "High";
  if (summary.warnings.length > 0 || item.status === "late" || item.status === "half_day" || item.late_minutes > 0 || item.early_exit_minutes > 0) return "Medium";
  return "Low";
}

function isException(item: HrAdminAttendanceRecord) {
  const summary = item.derivation_summary;
  return (
    summary.warnings.length > 0 ||
    summary.payroll_impact.payroll_impacting ||
    summary.leave_collision_count > 0 ||
    ["absent", "late", "half_day"].includes(item.status) ||
    !summary.schedule_day_type
  );
}

export function AttendanceDerivationExceptionsReportWorkspace({ items }: { items: HrAdminAttendanceRecord[] }) {
  const [query, setQuery] = useState("");
  const [derivedStatus, setDerivedStatus] = useState("All");
  const [risk, setRisk] = useState("All");
  const [department, setDepartment] = useState("All");
  const [payrollImpacting, setPayrollImpacting] = useState("All");
  const [leaveCollision, setLeaveCollision] = useState("All");
  const [sortBy, setSortBy] = useState("risk");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => items.filter(isException).map((record) => ({ record, risk: derivationRisk(record) })), [items]);
  const derivedStatuses = useMemo(() => ["All", ...unique(rows.map((row) => row.record.derivation_summary.status))], [rows]);
  const departments = useMemo(() => ["All", ...unique(rows.map((row) => row.record.department ?? ""))], [rows]);
  const risks = ["All", "High", "Medium", "Low"];

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter((row) => {
      const item = row.record;
      const summary = item.derivation_summary;
      const matchesQuery =
        !normalizedQuery ||
        [
          item.employee_code,
          item.employee_name,
          item.department,
          item.designation,
          item.attendance_date,
          item.status,
          summary.status,
          summary.schedule_day_type ?? "",
          summary.schedule_resolution_source ?? "",
          summary.shift_name ?? "",
          summary.reasons.join(" "),
          summary.warnings.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (derivedStatus === "All" || summary.status === derivedStatus) &&
        (risk === "All" || row.risk === risk) &&
        (department === "All" || item.department === department) &&
        (payrollImpacting === "All" || String(summary.payroll_impact.payroll_impacting) === payrollImpacting) &&
        (leaveCollision === "All" || (leaveCollision === "present" ? summary.leave_collision_count > 0 : summary.leave_collision_count === 0))
      );
    });
    const riskScore = { High: 3, Medium: 2, Low: 1 };
    return nextRows.sort((left, right) => {
      if (sortBy === "date") return right.record.attendance_date.localeCompare(left.record.attendance_date);
      if (sortBy === "employee") return left.record.employee_name.localeCompare(right.record.employee_name);
      if (sortBy === "status") return left.record.derivation_summary.status.localeCompare(right.record.derivation_summary.status);
      if (sortBy === "late") return right.record.derivation_summary.late_minutes - left.record.derivation_summary.late_minutes;
      if (sortBy === "lop") return Number(right.record.derivation_summary.payroll_impact.lop_units) - Number(left.record.derivation_summary.payroll_impact.lop_units);
      return riskScore[right.risk] - riskScore[left.risk] || right.record.attendance_date.localeCompare(left.record.attendance_date);
    });
  }, [department, derivedStatus, leaveCollision, payrollImpacting, query, risk, rows, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (derivedStatus !== "All") params.set("derived_status", derivedStatus);
    if (risk !== "All") params.set("exception_risk", risk);
    if (department !== "All") params.set("department", department);
    if (payrollImpacting !== "All") params.set("payroll_impacting", payrollImpacting);
    if (leaveCollision !== "All") params.set("leave_collision", leaveCollision);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/attendance-derivation-exceptions?${params.toString()}`;
  }, [department, derivedStatus, leaveCollision, payrollImpacting, query, risk, sortBy]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Attendance derivation exceptions report workspace">
      <div className="report-catalog-workspace attendance-derivation-exceptions-report" data-testid="attendance-derivation-exceptions-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft"><span>Derivation exceptions</span><strong>{filteredRows.length}</strong><small>{rows.length} total rows</small></article>
          <article className="metric-tile metric-tile-soft"><span>Payroll impacting</span><strong>{filteredRows.filter((row) => row.record.derivation_summary.payroll_impact.payroll_impacting).length}</strong><small>Needs payroll review</small></article>
          <article className="metric-tile metric-tile-soft"><span>Warnings</span><strong>{filteredRows.filter((row) => row.record.derivation_summary.warnings.length > 0).length}</strong><small>Resolver warnings</small></article>
          <article className="metric-tile metric-tile-soft"><span>Leave collisions</span><strong>{filteredRows.reduce((sum, row) => sum + row.record.derivation_summary.leave_collision_count, 0)}</strong><small>Linked overlaps</small></article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Attendance derivation exception filters">
          <label><span>Search derivations</span><input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search employee, status, reason, warning" /></label>
          <label><span>Derived status</span><select aria-label="Derived status" className="input-control" value={derivedStatus} onChange={(event) => updateFilter(() => setDerivedStatus(event.target.value))}>{derivedStatuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Risk</span><select aria-label="Risk" className="input-control" value={risk} onChange={(event) => updateFilter(() => setRisk(event.target.value))}>{risks.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Department</span><select aria-label="Department" className="input-control" value={department} onChange={(event) => updateFilter(() => setDepartment(event.target.value))}>{departments.map((item) => <option key={item} value={item}>{item || "Unassigned"}</option>)}</select></label>
          <label><span>Payroll impact</span><select aria-label="Payroll impact" className="input-control" value={payrollImpacting} onChange={(event) => updateFilter(() => setPayrollImpacting(event.target.value))}><option value="All">All</option><option value="true">Impacting</option><option value="false">Not impacting</option></select></label>
          <label><span>Leave collision</span><select aria-label="Leave collision" className="input-control" value={leaveCollision} onChange={(event) => updateFilter(() => setLeaveCollision(event.target.value))}><option value="All">All</option><option value="present">Present</option><option value="none">None</option></select></label>
          <label><span>Sort</span><select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}><option value="risk">Risk first</option><option value="date">Newest date</option><option value="employee">Employee</option><option value="status">Derived status</option><option value="late">Late minutes</option><option value="lop">LOP units</option></select></label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.filter((row) => row.risk === "High").length}</strong> high risk</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>Export filtered CSV</Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead><tr><th scope="col">Employee</th><th scope="col">Derivation</th><th scope="col">Schedule</th><th scope="col">Work time</th><th scope="col">Payroll impact</th><th scope="col">Evidence</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {visibleRows.map(({ record, risk: rowRisk }) => {
                const summary = record.derivation_summary;
                return (
                  <tr key={record.id}>
                    <td><strong>{record.employee_name}</strong><span>{record.employee_code}</span><span>{record.department || "No department"}</span></td>
                    <td><div className="payroll-register-stack"><span className={statusClass(summary.status)}>{titleCase(summary.status)}</span><span>{record.attendance_date}</span><span className={statusClass(rowRisk)}>{rowRisk}</span></div></td>
                    <td><div className="payroll-register-stack"><span>{summary.schedule_day_type ? titleCase(summary.schedule_day_type) : "Missing schedule"}</span><span>{summary.schedule_resolution_source || "No resolver source"}</span><span>{summary.shift_name || record.shift || "No shift"}</span></div></td>
                    <td><div className="payroll-register-stack"><span>{summary.worked_hours} worked / {summary.expected_hours} expected</span><span>{summary.late_minutes} late minutes</span><span>{summary.early_exit_minutes} early exit minutes</span></div></td>
                    <td><div className="payroll-register-stack"><span className={statusClass(String(summary.payroll_impact.payroll_impacting))}>{summary.payroll_impact.payroll_impacting ? "Payroll impacting" : "Not payroll impacting"}</span><span>{summary.payroll_impact.payable_units} payable units</span><span>{summary.payroll_impact.lop_units} LOP units</span><span>{summary.leave_collision_count} leave collisions</span></div></td>
                    <td><div className="payroll-register-stack"><span>{summary.reasons[0] ?? "No reason captured"}</span><span>{summary.warnings[0] ?? "No warning"}</span><code>{summary.schedule_contract_ref ?? "contract.none"}</code></div></td>
                    <td><div className="report-row-actions"><Link className="button button--secondary" href={`/hr-admin/attendance-records/${record.id}/edit`}>Review</Link><Link className="button button--ghost" href={`/hr-admin/reports/attendance-register?status=${encodeURIComponent(record.status)}`}>Register</Link></div></td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 ? <tr><td colSpan={7}><div className="empty-state">No attendance derivation exception rows match the selected filters.</div></td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Attendance derivation exceptions pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
