"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HrAdminPayrollRunException, HrAdminPayrollRunReview } from "@/lib/types";

const PAGE_SIZE = 10;

type ReviewExceptionRow = HrAdminPayrollRunException & {
  payrollRunName: string;
  reviewStatus: string;
  reviewProfileRef: string;
  decisionState: "Pending" | "Decided" | "Closed";
  ageDays: number;
  risk: "High" | "Medium" | "Low";
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

function ageDays(createdAt: string, decidedAt: string | null) {
  const start = dateOnly(createdAt);
  const end = dateOnly(decidedAt ?? new Date().toISOString());
  if (!start || !end) return 0;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}

function decisionState(status: string, decidedAt: string | null): ReviewExceptionRow["decisionState"] {
  if (decidedAt) return "Decided";
  if (["resolved", "waived", "approved"].includes(status)) return "Closed";
  return "Pending";
}

function risk(severity: string, status: string, age: number): ReviewExceptionRow["risk"] {
  const normalizedSeverity = severity.toLowerCase();
  if (status === "open" && ["critical", "blocker", "high"].includes(normalizedSeverity)) return "High";
  if (status === "open" && age >= 2) return "High";
  if (status === "open" || ["warning", "medium"].includes(normalizedSeverity)) return "Medium";
  return "Low";
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
  if (["resolved", "approved", "waived", "closed", "decided", "low"].includes(normalized)) return "record-chip record-chip--success";
  if (["warning", "medium", "pending", "open"].includes(normalized)) return "record-chip record-chip--warning";
  if (["critical", "blocker", "high", "failed"].includes(normalized)) return "record-chip record-chip--danger";
  return "record-chip";
}

function toReportRow(exception: HrAdminPayrollRunException, reviewsById: Map<string, HrAdminPayrollRunReview>): ReviewExceptionRow {
  const review = reviewsById.get(exception.review_id);
  const age = ageDays(exception.created_at, exception.decided_at);
  return {
    ...exception,
    payrollRunName: review?.payroll_run_name ?? "Run pending",
    reviewStatus: review?.status ?? "unknown",
    reviewProfileRef: review?.review_profile_ref ?? "profile.pending",
    decisionState: decisionState(exception.status, exception.decided_at),
    ageDays: age,
    risk: risk(exception.severity, exception.status, age),
  };
}

export function PayrollReviewExceptionsReportWorkspace({
  reviews,
  exceptions,
}: {
  reviews: HrAdminPayrollRunReview[];
  exceptions: HrAdminPayrollRunException[];
}) {
  const [query, setQuery] = useState("");
  const [runId, setRunId] = useState("All");
  const [severity, setSeverity] = useState("All");
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("All");
  const [decision, setDecision] = useState("All");
  const [sortBy, setSortBy] = useState("risk");
  const [page, setPage] = useState(1);

  const reviewsById = useMemo(() => new Map(reviews.map((review) => [review.id, review])), [reviews]);
  const rows = useMemo(() => exceptions.map((exception) => toReportRow(exception, reviewsById)), [exceptions, reviewsById]);
  const severities = useMemo(() => ["All", ...unique(rows.map((row) => row.severity))], [rows]);
  const statuses = useMemo(() => ["All", ...unique(rows.map((row) => row.status))], [rows]);
  const categories = useMemo(() => ["All", ...unique(rows.map((row) => row.category))], [rows]);
  const decisions = ["All", "Pending", "Decided", "Closed"];

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          row.payrollRunName,
          row.employee_code,
          row.employee_name,
          row.component_code,
          row.category,
          row.severity,
          row.status,
          row.title,
          row.detail,
          row.decision_reason,
          row.decided_by_name,
          row.reviewProfileRef,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (runId === "All" || row.payroll_run_id === runId) &&
        (severity === "All" || row.severity === severity) &&
        (status === "All" || row.status === status) &&
        (category === "All" || row.category === category) &&
        (decision === "All" || row.decisionState === decision)
      );
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "employee") return String(left.employee_name ?? "").localeCompare(String(right.employee_name ?? ""));
      if (sortBy === "run") return left.payrollRunName.localeCompare(right.payrollRunName);
      if (sortBy === "status") return left.status.localeCompare(right.status);
      if (sortBy === "age") return right.ageDays - left.ageDays;
      const riskScore = { High: 3, Medium: 2, Low: 1 };
      return riskScore[right.risk] - riskScore[left.risk] || right.ageDays - left.ageDays;
    });
  }, [category, decision, query, rows, runId, severity, sortBy, status]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (runId !== "All") params.set("payroll_run_id", runId);
    if (severity !== "All") params.set("severity", severity);
    if (status !== "All") params.set("status", status);
    if (category !== "All") params.set("category", category);
    if (decision !== "All") params.set("decision_state", decision);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/payroll-review-exceptions?${params.toString()}`;
  }, [category, decision, query, runId, severity, sortBy, status]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Payroll review exceptions report workspace">
      <div className="report-catalog-workspace payroll-review-exceptions-report" data-testid="payroll-review-exceptions-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft"><span>Exceptions</span><strong>{filteredRows.length}</strong><small>{exceptions.length} total exceptions</small></article>
          <article className="metric-tile metric-tile-soft"><span>Open exceptions</span><strong>{filteredRows.filter((row) => row.status === "open").length}</strong><small>Need review action</small></article>
          <article className="metric-tile metric-tile-soft"><span>High risk</span><strong>{filteredRows.filter((row) => row.risk === "High").length}</strong><small>Blocks approval</small></article>
          <article className="metric-tile metric-tile-soft"><span>Decided</span><strong>{filteredRows.filter((row) => row.decisionState !== "Pending").length}</strong><small>Decision evidence</small></article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Payroll review exception filters">
          <label><span>Search exceptions</span><input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search run, employee, component, decision" /></label>
          <label><span>Payroll run</span><select aria-label="Payroll run" className="input-control" value={runId} onChange={(event) => updateFilter(() => setRunId(event.target.value))}><option value="All">All</option>{reviews.map((review) => <option key={review.id} value={review.payroll_run_id}>{review.payroll_run_name}</option>)}</select></label>
          <label><span>Severity</span><select aria-label="Severity" className="input-control" value={severity} onChange={(event) => updateFilter(() => setSeverity(event.target.value))}>{severities.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Status</span><select aria-label="Status" className="input-control" value={status} onChange={(event) => updateFilter(() => setStatus(event.target.value))}>{statuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Category</span><select aria-label="Category" className="input-control" value={category} onChange={(event) => updateFilter(() => setCategory(event.target.value))}>{categories.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Decision state</span><select aria-label="Decision state" className="input-control" value={decision} onChange={(event) => updateFilter(() => setDecision(event.target.value))}>{decisions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Sort</span><select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}><option value="risk">Risk first</option><option value="age">Oldest exception</option><option value="employee">Employee</option><option value="run">Payroll run</option><option value="status">Status</option></select></label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.filter((row) => row.decisionState === "Pending").length}</strong> pending</span>
          <span className="queue-summary-chip"><strong>{filteredRows.filter((row) => row.calculation_line_id).length}</strong> line linked</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>Export filtered CSV</Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead><tr><th scope="col">Exception</th><th scope="col">Employee</th><th scope="col">Run</th><th scope="col">Severity</th><th scope="col">Decision</th><th scope="col">Evidence</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.title}</strong><span>{titleCase(row.category)}</span><span>{row.detail || "No detail"}</span></td>
                  <td><strong>{row.employee_name ?? "Run level"}</strong><span>{row.employee_code ?? row.component_code ?? "No employee"}</span><span>{row.component_code ?? "Run level exception"}</span></td>
                  <td><div className="payroll-register-stack"><span>{row.payrollRunName}</span><span className={statusClass(row.reviewStatus)}>{titleCase(row.reviewStatus)}</span><code>{row.reviewProfileRef}</code></div></td>
                  <td><div className="payroll-register-stack"><span className={statusClass(row.risk)}>{row.risk}</span><span className={statusClass(row.severity)}>{row.severity_label || titleCase(row.severity)}</span><span>{row.ageDays} days aging</span></div></td>
                  <td><div className="payroll-register-stack"><span className={statusClass(row.decisionState)}>{row.decisionState}</span><span>{row.decision_reason || "Decision pending"}</span><span>{row.decided_by_name ?? "No decision owner"}</span></div></td>
                  <td><div className="payroll-register-stack"><span>{formatDate(row.decided_at)}</span><code>{row.calculation_line_id ?? row.input_snapshot_id ?? "evidence.pending"}</code><span>{row.status_label || titleCase(row.status)}</span></div></td>
                  <td><div className="report-row-actions"><Link className="button button--secondary" href={`/hr-admin/payroll-review?reviewId=${row.review_id}&exceptionId=${row.id}`}>Review</Link><Link className="button button--ghost" href={`/hr-admin/payroll-review?reviewId=${row.review_id}`}>Queue</Link></div></td>
                </tr>
              ))}
              {visibleRows.length === 0 ? <tr><td colSpan={7}><div className="empty-state">No payroll review exception rows match the selected filters.</div></td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Payroll review exceptions pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
