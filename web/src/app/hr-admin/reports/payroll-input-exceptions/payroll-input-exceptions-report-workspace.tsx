"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HrAdminPayrollInputSnapshot, HrAdminPayrollRun } from "@/lib/types";

const PAGE_SIZE = 10;

type PayrollInputExceptionRow = HrAdminPayrollInputSnapshot & {
  runStatus: string;
  issueType: "Blocked" | "Warning" | "Ready";
  issueCount: number;
  lockState: "Locked" | "Unlocked";
  attendanceDays: string;
  readinessRisk: "High" | "Medium" | "Low";
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (["ready", "locked", "low"].includes(normalized)) return "record-chip record-chip--success";
  if (["warning", "unlocked", "medium"].includes(normalized)) return "record-chip record-chip--warning";
  if (["blocked", "high"].includes(normalized)) return "record-chip record-chip--danger";
  return "record-chip";
}

function snapshotNumber(snapshot: Record<string, unknown>, key: string) {
  const value = snapshot[key];
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function toReportRow(snapshot: HrAdminPayrollInputSnapshot, runsById: Map<string, HrAdminPayrollRun>): PayrollInputExceptionRow {
  const blockerCount = snapshot.blockers.length;
  const warningCount = snapshot.warnings.length;
  const issueType = blockerCount > 0 ? "Blocked" : warningCount > 0 ? "Warning" : "Ready";
  const readinessRisk = blockerCount > 0 ? "High" : warningCount > 0 ? "Medium" : "Low";
  return {
    ...snapshot,
    runStatus: runsById.get(snapshot.payroll_run_id)?.status ?? "unknown",
    issueType,
    issueCount: blockerCount + warningCount,
    lockState: snapshot.locked_at ? "Locked" : "Unlocked",
    attendanceDays: `${snapshotNumber(snapshot.attendance_snapshot, "present_days")}/${snapshotNumber(snapshot.attendance_snapshot, "working_days")}`,
    readinessRisk,
  };
}

export function PayrollInputExceptionsReportWorkspace({
  runs,
  snapshots,
}: {
  runs: HrAdminPayrollRun[];
  snapshots: HrAdminPayrollInputSnapshot[];
}) {
  const [query, setQuery] = useState("");
  const [runId, setRunId] = useState("All");
  const [status, setStatus] = useState("All");
  const [payGroup, setPayGroup] = useState("All");
  const [lockState, setLockState] = useState("All");
  const [issueType, setIssueType] = useState("All");
  const [sortBy, setSortBy] = useState("risk");
  const [page, setPage] = useState(1);

  const runsById = useMemo(() => new Map(runs.map((run) => [run.id, run])), [runs]);
  const rows = useMemo(() => snapshots.map((snapshot) => toReportRow(snapshot, runsById)), [runsById, snapshots]);
  const statuses = useMemo(() => ["All", ...unique(rows.map((item) => item.snapshot_status))], [rows]);
  const payGroups = useMemo(() => ["All", ...unique(rows.map((item) => item.pay_group_name ?? ""))], [rows]);
  const issueTypes = ["All", "Blocked", "Warning", "Ready"];
  const lockStates = ["All", "Locked", "Unlocked"];

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          item.employee_code,
          item.employee_name,
          item.payroll_run_name,
          item.pay_group_name,
          item.salary_structure_name,
          item.snapshot_status,
          item.issueType,
          item.readinessRisk,
          item.source_hash,
          item.blockers.join(" "),
          item.warnings.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (runId === "All" || item.payroll_run_id === runId) &&
        (status === "All" || item.snapshot_status === status) &&
        (payGroup === "All" || item.pay_group_name === payGroup) &&
        (lockState === "All" || item.lockState === lockState) &&
        (issueType === "All" || item.issueType === issueType)
      );
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "employee") return left.employee_name.localeCompare(right.employee_name);
      if (sortBy === "run") return left.payroll_run_name.localeCompare(right.payroll_run_name);
      if (sortBy === "status") return left.snapshot_status.localeCompare(right.snapshot_status);
      if (sortBy === "locked") return left.lockState.localeCompare(right.lockState);
      const riskScore = { High: 3, Medium: 2, Low: 1 };
      return riskScore[right.readinessRisk] - riskScore[left.readinessRisk] || right.issueCount - left.issueCount;
    });
  }, [issueType, lockState, payGroup, query, rows, runId, sortBy, status]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (runId !== "All") params.set("payroll_run_id", runId);
    if (status !== "All") params.set("snapshot_status", status);
    if (payGroup !== "All") params.set("pay_group", payGroup);
    if (lockState !== "All") params.set("lock_state", lockState);
    if (issueType !== "All") params.set("issue_type", issueType);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/payroll-input-exceptions?${params.toString()}`;
  }, [issueType, lockState, payGroup, query, runId, sortBy, status]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Payroll input exceptions report workspace">
      <div className="report-catalog-workspace payroll-input-exceptions-report" data-testid="payroll-input-exceptions-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Snapshots</span>
            <strong>{filteredRows.length}</strong>
            <small>{snapshots.length} total snapshots</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Blocked inputs</span>
            <strong>{filteredRows.filter((item) => item.issueType === "Blocked").length}</strong>
            <small>Stop close</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Warning inputs</span>
            <strong>{filteredRows.filter((item) => item.issueType === "Warning").length}</strong>
            <small>Review before lock</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Locked snapshots</span>
            <strong>{filteredRows.filter((item) => item.lockState === "Locked").length}</strong>
            <small>Immutable evidence</small>
          </article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Payroll input exception filters">
          <label>
            <span>Search inputs</span>
            <input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search employee, run, issue, hash" />
          </label>
          <label>
            <span>Payroll run</span>
            <select aria-label="Payroll run" className="input-control" value={runId} onChange={(event) => updateFilter(() => setRunId(event.target.value))}>
              <option value="All">All</option>
              {runs.map((run) => <option key={run.id} value={run.id}>{run.name}</option>)}
            </select>
          </label>
          <label>
            <span>Snapshot status</span>
            <select aria-label="Snapshot status" className="input-control" value={status} onChange={(event) => updateFilter(() => setStatus(event.target.value))}>
              {statuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
            </select>
          </label>
          <label>
            <span>Pay group</span>
            <select aria-label="Pay group" className="input-control" value={payGroup} onChange={(event) => updateFilter(() => setPayGroup(event.target.value))}>
              {payGroups.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Lock state</span>
            <select aria-label="Lock state" className="input-control" value={lockState} onChange={(event) => updateFilter(() => setLockState(event.target.value))}>
              {lockStates.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Issue type</span>
            <select aria-label="Issue type" className="input-control" value={issueType} onChange={(event) => updateFilter(() => setIssueType(event.target.value))}>
              {issueTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}>
              <option value="risk">Risk first</option>
              <option value="employee">Employee</option>
              <option value="run">Payroll run</option>
              <option value="status">Snapshot status</option>
              <option value="locked">Lock state</option>
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.filter((item) => item.readinessRisk === "High").length}</strong> high risk</span>
          <span className="queue-summary-chip"><strong>{filteredRows.filter((item) => item.source_hash).length}</strong> source hashed</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>Export filtered CSV</Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead>
              <tr>
                <th scope="col">Employee</th>
                <th scope="col">Run</th>
                <th scope="col">Readiness</th>
                <th scope="col">Inputs</th>
                <th scope="col">Lock</th>
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
                    <span>{item.pay_group_name || "No pay group"}</span>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{item.payroll_run_name}</span>
                      <span>{formatDate(item.period_start)} - {formatDate(item.period_end)}</span>
                      <span className={statusClass(item.runStatus)}>{titleCase(item.runStatus)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(item.readinessRisk)}>{item.readinessRisk}</span>
                      <span className={statusClass(item.snapshot_status)}>{titleCase(item.snapshot_status)}</span>
                      <span>{item.issueCount} issues</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{item.salary_structure_name || "Salary missing"}</span>
                      <span>Attendance {item.attendanceDays}</span>
                      <span>{item.blockers[0] || item.warnings[0] || "No blockers or warnings"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(item.lockState)}>{item.lockState}</span>
                      <span>{formatDate(item.locked_at)}</span>
                      <span>{item.input_profile_ref}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <code>{item.source_hash || "source.hash.pending"}</code>
                      <span>{formatDate(item.source_collected_at)}</span>
                      <span>{item.salary_structure_version ? `Salary v${item.salary_structure_version}` : "Version pending"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="report-row-actions">
                      <Link className="button button--secondary" href={`/hr-admin/payroll-inputs?runId=${item.payroll_run_id}&snapshotId=${item.id}`}>
                        Review
                      </Link>
                      <Link className="button button--ghost" href={`/hr-admin/payroll-inputs?runId=${item.payroll_run_id}`}>
                        Run
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">No payroll input exception rows match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Payroll input exceptions pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
