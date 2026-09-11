"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HrAdminPayrollAdjustment, HrAdminPayrollRun } from "@/lib/types";

const PAGE_SIZE = 10;

type AdjustmentRow = HrAdminPayrollAdjustment & {
  approvalState: "Applied" | "Approved" | "Rejected" | "Submitted" | "Draft";
  amountRisk: "High" | "Medium" | "Low";
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function numberValue(value: unknown) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatMoney(value: unknown, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numberValue(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function approvalState(item: HrAdminPayrollAdjustment): AdjustmentRow["approvalState"] {
  if (item.applied_at) return "Applied";
  if (item.approved_at) return "Approved";
  if (item.rejected_at) return "Rejected";
  if (item.status === "submitted") return "Submitted";
  return "Draft";
}

function amountRisk(value: unknown): AdjustmentRow["amountRisk"] {
  const absoluteAmount = Math.abs(numberValue(value));
  if (absoluteAmount >= 100000) return "High";
  if (absoluteAmount >= 25000) return "Medium";
  return "Low";
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (["applied", "approved", "success", "low"].includes(normalized)) return "record-chip record-chip--success";
  if (["submitted", "draft", "pending", "medium"].includes(normalized)) return "record-chip record-chip--warning";
  if (["rejected", "failed", "high"].includes(normalized)) return "record-chip record-chip--danger";
  return "record-chip";
}

function toReportRow(item: HrAdminPayrollAdjustment): AdjustmentRow {
  return {
    ...item,
    approvalState: approvalState(item),
    amountRisk: amountRisk(item.amount),
  };
}

export function PayrollAdjustmentsReportWorkspace({
  runs,
  adjustments,
}: {
  runs: HrAdminPayrollRun[];
  adjustments: HrAdminPayrollAdjustment[];
}) {
  const [query, setQuery] = useState("");
  const [runId, setRunId] = useState("All");
  const [kind, setKind] = useState("All");
  const [direction, setDirection] = useState("All");
  const [status, setStatus] = useState("All");
  const [approval, setApproval] = useState("All");
  const [risk, setRisk] = useState("All");
  const [sortBy, setSortBy] = useState("amount_desc");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => adjustments.map(toReportRow), [adjustments]);
  const kinds = useMemo(() => ["All", ...unique(rows.map((row) => row.kind))], [rows]);
  const directions = useMemo(() => ["All", ...unique(rows.map((row) => row.direction))], [rows]);
  const statuses = useMemo(() => ["All", ...unique(rows.map((row) => row.status))], [rows]);
  const approvals = ["All", "Applied", "Approved", "Rejected", "Submitted", "Draft"];
  const risks = ["All", "High", "Medium", "Low"];

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          row.employee_code,
          row.employee_name,
          row.payroll_run_name,
          row.component_code,
          row.component_name,
          row.kind,
          row.direction,
          row.status,
          row.approvalState,
          row.adjustment_profile_ref,
          row.approval_profile_ref,
          row.source_ref,
          row.reason,
          row.source_hash,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return (
        matchesQuery &&
        (runId === "All" || row.payroll_run_id === runId) &&
        (kind === "All" || row.kind === kind) &&
        (direction === "All" || row.direction === direction) &&
        (status === "All" || row.status === status) &&
        (approval === "All" || row.approvalState === approval) &&
        (risk === "All" || row.amountRisk === risk)
      );
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "effective_date") return right.effective_date.localeCompare(left.effective_date);
      if (sortBy === "employee") return left.employee_name.localeCompare(right.employee_name);
      if (sortBy === "run") return left.payroll_run_name.localeCompare(right.payroll_run_name);
      if (sortBy === "status") return left.status.localeCompare(right.status);
      if (sortBy === "risk") {
        const scores = { High: 3, Medium: 2, Low: 1 };
        return scores[right.amountRisk] - scores[left.amountRisk] || numberValue(right.amount) - numberValue(left.amount);
      }
      return numberValue(right.amount) - numberValue(left.amount);
    });
  }, [approval, direction, kind, query, risk, rows, runId, sortBy, status]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const totalAmount = filteredRows.reduce((sum, row) => sum + numberValue(row.amount), 0);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (runId !== "All") params.set("payroll_run_id", runId);
    if (kind !== "All") params.set("kind", kind);
    if (direction !== "All") params.set("direction", direction);
    if (status !== "All") params.set("status", status);
    if (approval !== "All") params.set("approval_state", approval);
    if (risk !== "All") params.set("amount_risk", risk);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/payroll-adjustments?${params.toString()}`;
  }, [approval, direction, kind, query, risk, runId, sortBy, status]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Payroll adjustments report workspace">
      <div className="report-catalog-workspace payroll-adjustments-report" data-testid="payroll-adjustments-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft"><span>Adjustments</span><strong>{filteredRows.length}</strong><small>{adjustments.length} total rows</small></article>
          <article className="metric-tile metric-tile-soft"><span>Submitted</span><strong>{filteredRows.filter((row) => row.approvalState === "Submitted").length}</strong><small>Awaiting approval</small></article>
          <article className="metric-tile metric-tile-soft"><span>Approved/applied</span><strong>{filteredRows.filter((row) => ["Approved", "Applied"].includes(row.approvalState)).length}</strong><small>Ready for payroll effect</small></article>
          <article className="metric-tile metric-tile-soft"><span>Total amount</span><strong>{formatMoney(totalAmount)}</strong><small>Filtered adjustments</small></article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Payroll adjustment filters">
          <label><span>Search adjustments</span><input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search employee, run, source, hash" /></label>
          <label><span>Payroll run</span><select aria-label="Payroll run" className="input-control" value={runId} onChange={(event) => updateFilter(() => setRunId(event.target.value))}><option value="All">All</option>{runs.map((run) => <option key={run.id} value={run.id}>{run.name}</option>)}</select></label>
          <label><span>Kind</span><select aria-label="Kind" className="input-control" value={kind} onChange={(event) => updateFilter(() => setKind(event.target.value))}>{kinds.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Direction</span><select aria-label="Direction" className="input-control" value={direction} onChange={(event) => updateFilter(() => setDirection(event.target.value))}>{directions.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Status</span><select aria-label="Status" className="input-control" value={status} onChange={(event) => updateFilter(() => setStatus(event.target.value))}>{statuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Approval state</span><select aria-label="Approval state" className="input-control" value={approval} onChange={(event) => updateFilter(() => setApproval(event.target.value))}>{approvals.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Amount risk</span><select aria-label="Amount risk" className="input-control" value={risk} onChange={(event) => updateFilter(() => setRisk(event.target.value))}>{risks.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Sort</span><select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}><option value="amount_desc">Amount high to low</option><option value="effective_date">Effective newest</option><option value="employee">Employee</option><option value="run">Payroll run</option><option value="status">Status</option><option value="risk">Risk first</option></select></label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.filter((row) => row.amountRisk === "High").length}</strong> high value</span>
          <span className="queue-summary-chip"><strong>{filteredRows.filter((row) => Boolean(row.source_hash)).length}</strong> hash linked</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>Export filtered CSV</Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead><tr><th scope="col">Employee</th><th scope="col">Run</th><th scope="col">Adjustment</th><th scope="col">Amount</th><th scope="col">Approval</th><th scope="col">Timeline</th><th scope="col">Evidence</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.employee_name}</strong><span>{row.employee_code}</span><span>{row.component_code}</span></td>
                  <td><div className="payroll-register-stack"><span>{row.payroll_run_name}</span><code>{row.payroll_run_id}</code></div></td>
                  <td><div className="payroll-register-stack"><strong>{row.component_name}</strong><span>{row.kind_label || titleCase(row.kind)}</span><span>{row.reason || "No reason captured"}</span></div></td>
                  <td><div className="payroll-register-stack"><strong>{formatMoney(row.amount, row.currency_code)}</strong><span>{row.direction_label || titleCase(row.direction)}</span><span className={statusClass(row.amountRisk)}>{row.amountRisk}</span></div></td>
                  <td><div className="payroll-register-stack"><span className={statusClass(row.approvalState)}>{row.approvalState}</span><span>{row.status_label || titleCase(row.status)}</span><span>{row.approved_by_name ?? row.rejected_by_name ?? row.submitted_by_name ?? "Owner pending"}</span></div></td>
                  <td><div className="payroll-register-stack"><span>Effective {formatDate(row.effective_date)}</span><span>Submitted {formatDate(row.submitted_at)}</span><span>Applied {formatDate(row.applied_at)}</span></div></td>
                  <td><div className="payroll-register-stack"><code>{row.source_hash || "hash.pending"}</code><code>{row.source_ref || "source.pending"}</code><span>{row.adjustment_profile_ref}</span><span>{row.approval_profile_ref}</span></div></td>
                  <td><div className="report-row-actions"><Link className="button button--secondary" href={`/hr-admin/payroll-adjustments?runId=${row.payroll_run_id}&adjustmentId=${row.id}`}>Review</Link><Link className="button button--ghost" href={`/hr-admin/payroll-adjustments?runId=${row.payroll_run_id}`}>Run</Link></div></td>
                </tr>
              ))}
              {visibleRows.length === 0 ? <tr><td colSpan={8}><div className="empty-state">No payroll adjustment rows match the selected filters.</div></td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Payroll adjustments pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
