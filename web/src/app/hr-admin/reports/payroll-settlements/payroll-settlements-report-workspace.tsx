"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HrAdminPayrollRun, HrAdminPayrollSettlement, HrAdminPayrollSettlementLine } from "@/lib/types";

const PAGE_SIZE = 10;

type SettlementRow = HrAdminPayrollSettlement & {
  approvalState: "Applied" | "Approved" | "Rejected" | "Submitted" | "Draft";
  netRisk: "High" | "Medium" | "Low";
  lineKinds: string[];
  grossDues: number;
  deductions: number;
  taxes: number;
  reimbursements: number;
  netSettlement: number;
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

function approvalState(item: HrAdminPayrollSettlement): SettlementRow["approvalState"] {
  if (item.applied_at) return "Applied";
  if (item.approved_at) return "Approved";
  if (item.rejected_at) return "Rejected";
  if (item.status === "submitted") return "Submitted";
  return "Draft";
}

function netRisk(value: unknown): SettlementRow["netRisk"] {
  const absoluteAmount = Math.abs(numberValue(value));
  if (absoluteAmount >= 100000) return "High";
  if (absoluteAmount >= 25000) return "Medium";
  return "Low";
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (["applied", "approved", "success", "low"].includes(normalized)) return "record-chip record-chip--success";
  if (["submitted", "draft", "pending", "medium"].includes(normalized)) return "record-chip record-chip--warning";
  if (["rejected", "voided", "failed", "high"].includes(normalized)) return "record-chip record-chip--danger";
  return "record-chip";
}

function toReportRow(item: HrAdminPayrollSettlement, linesBySettlement: Map<string, HrAdminPayrollSettlementLine[]>): SettlementRow {
  const itemLines = linesBySettlement.get(item.id) ?? [];
  const netSettlement = numberValue(item.totals_snapshot.net_settlement);
  return {
    ...item,
    approvalState: approvalState(item),
    netRisk: netRisk(netSettlement),
    lineKinds: unique(itemLines.map((line) => line.line_kind)),
    grossDues: numberValue(item.totals_snapshot.gross_dues),
    deductions: numberValue(item.totals_snapshot.deductions),
    taxes: numberValue(item.totals_snapshot.taxes),
    reimbursements: numberValue(item.totals_snapshot.reimbursements),
    netSettlement,
  };
}

export function PayrollSettlementsReportWorkspace({
  runs,
  settlements,
  lines,
}: {
  runs: HrAdminPayrollRun[];
  settlements: HrAdminPayrollSettlement[];
  lines: HrAdminPayrollSettlementLine[];
}) {
  const [query, setQuery] = useState("");
  const [runId, setRunId] = useState("All");
  const [status, setStatus] = useState("All");
  const [approval, setApproval] = useState("All");
  const [risk, setRisk] = useState("All");
  const [lineKind, setLineKind] = useState("All");
  const [sortBy, setSortBy] = useState("net_desc");
  const [page, setPage] = useState(1);

  const linesBySettlement = useMemo(() => {
    const map = new Map<string, HrAdminPayrollSettlementLine[]>();
    for (const line of lines) {
      map.set(line.settlement_id, [...(map.get(line.settlement_id) ?? []), line]);
    }
    return map;
  }, [lines]);

  const rows = useMemo(() => settlements.map((settlement) => toReportRow(settlement, linesBySettlement)), [linesBySettlement, settlements]);
  const statuses = useMemo(() => ["All", ...unique(rows.map((row) => row.status))], [rows]);
  const lineKinds = useMemo(() => ["All", ...unique(lines.map((line) => line.line_kind))], [lines]);
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
          row.status,
          row.approvalState,
          row.settlement_profile_ref,
          row.approval_profile_ref,
          row.calculation_profile_ref,
          row.source_ref,
          row.reason,
          row.source_hash,
          row.lineKinds.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return (
        matchesQuery &&
        (runId === "All" || row.payroll_run_id === runId) &&
        (status === "All" || row.status === status) &&
        (approval === "All" || row.approvalState === approval) &&
        (risk === "All" || row.netRisk === risk) &&
        (lineKind === "All" || row.lineKinds.includes(lineKind))
      );
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "settlement_date") return right.settlement_date.localeCompare(left.settlement_date);
      if (sortBy === "employee") return left.employee_name.localeCompare(right.employee_name);
      if (sortBy === "run") return left.payroll_run_name.localeCompare(right.payroll_run_name);
      if (sortBy === "status") return left.status.localeCompare(right.status);
      if (sortBy === "risk") {
        const scores = { High: 3, Medium: 2, Low: 1 };
        return scores[right.netRisk] - scores[left.netRisk] || right.netSettlement - left.netSettlement;
      }
      return right.netSettlement - left.netSettlement;
    });
  }, [approval, lineKind, query, risk, rows, runId, sortBy, status]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const totalNet = filteredRows.reduce((sum, row) => sum + row.netSettlement, 0);
  const totalDeductions = filteredRows.reduce((sum, row) => sum + row.deductions + row.taxes, 0);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (runId !== "All") params.set("payroll_run_id", runId);
    if (status !== "All") params.set("status", status);
    if (approval !== "All") params.set("approval_state", approval);
    if (risk !== "All") params.set("net_amount_risk", risk);
    if (lineKind !== "All") params.set("line_kind", lineKind);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/payroll-settlements?${params.toString()}`;
  }, [approval, lineKind, query, risk, runId, sortBy, status]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Payroll settlements report workspace">
      <div className="report-catalog-workspace payroll-settlements-report" data-testid="payroll-settlements-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft"><span>Settlements</span><strong>{filteredRows.length}</strong><small>{settlements.length} total packages</small></article>
          <article className="metric-tile metric-tile-soft"><span>Applied packages</span><strong>{filteredRows.filter((row) => row.approvalState === "Applied").length}</strong><small>Payroll-consumed packages</small></article>
          <article className="metric-tile metric-tile-soft"><span>Net settlement</span><strong>{formatMoney(totalNet)}</strong><small>Filtered payable value</small></article>
          <article className="metric-tile metric-tile-soft"><span>Recoveries/taxes</span><strong>{formatMoney(totalDeductions)}</strong><small>Filtered deductions</small></article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Payroll settlement filters">
          <label><span>Search settlements</span><input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search employee, run, source, hash" /></label>
          <label><span>Payroll run</span><select aria-label="Payroll run" className="input-control" value={runId} onChange={(event) => updateFilter(() => setRunId(event.target.value))}><option value="All">All</option>{runs.map((run) => <option key={run.id} value={run.id}>{run.name}</option>)}</select></label>
          <label><span>Status</span><select aria-label="Status" className="input-control" value={status} onChange={(event) => updateFilter(() => setStatus(event.target.value))}>{statuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Approval state</span><select aria-label="Approval state" className="input-control" value={approval} onChange={(event) => updateFilter(() => setApproval(event.target.value))}>{approvals.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Net amount risk</span><select aria-label="Net amount risk" className="input-control" value={risk} onChange={(event) => updateFilter(() => setRisk(event.target.value))}>{risks.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Line kind</span><select aria-label="Line kind" className="input-control" value={lineKind} onChange={(event) => updateFilter(() => setLineKind(event.target.value))}>{lineKinds.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Sort</span><select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}><option value="net_desc">Net high to low</option><option value="settlement_date">Settlement newest</option><option value="employee">Employee</option><option value="run">Payroll run</option><option value="status">Status</option><option value="risk">Risk first</option></select></label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.filter((row) => row.netRisk === "High").length}</strong> high value</span>
          <span className="queue-summary-chip"><strong>{filteredRows.filter((row) => Boolean(row.source_hash)).length}</strong> hash linked</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>Export filtered CSV</Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead><tr><th scope="col">Employee</th><th scope="col">Run</th><th scope="col">Package</th><th scope="col">Settlement value</th><th scope="col">Approval</th><th scope="col">Lines</th><th scope="col">Evidence</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.employee_name}</strong><span>{row.employee_code}</span><span>Last working {formatDate(row.last_working_date)}</span></td>
                  <td><div className="payroll-register-stack"><span>{row.payroll_run_name}</span><code>{row.payroll_run_id}</code></div></td>
                  <td><div className="payroll-register-stack"><span className={statusClass(row.status)}>{row.status_label || titleCase(row.status)}</span><span>{row.reason || "No reason captured"}</span><span>Settlement {formatDate(row.settlement_date)}</span></div></td>
                  <td><div className="payroll-register-stack"><strong>{formatMoney(row.netSettlement, row.currency_code)}</strong><span>Gross {formatMoney(row.grossDues, row.currency_code)}</span><span>Recoveries {formatMoney(row.deductions + row.taxes, row.currency_code)}</span><span className={statusClass(row.netRisk)}>{row.netRisk}</span></div></td>
                  <td><div className="payroll-register-stack"><span className={statusClass(row.approvalState)}>{row.approvalState}</span><span>Submitted {formatDate(row.submitted_at)}</span><span>Applied {formatDate(row.applied_at)}</span><span>{row.approved_by_name ?? row.rejected_by_name ?? row.submitted_by_name ?? "Owner pending"}</span></div></td>
                  <td><div className="payroll-register-stack"><strong>{row.line_count} lines</strong><span>{row.lineKinds.length ? row.lineKinds.map(titleCase).join(", ") : "No line kinds"}</span></div></td>
                  <td><div className="payroll-register-stack"><code>{row.source_hash || "hash.pending"}</code><code>{row.source_ref || "source.pending"}</code><span>{row.settlement_profile_ref}</span><span>{row.approval_profile_ref}</span></div></td>
                  <td><div className="report-row-actions"><Link className="button button--secondary" href={`/hr-admin/payroll-settlements?runId=${row.payroll_run_id}&settlementId=${row.id}`}>Review</Link><Link className="button button--ghost" href={`/hr-admin/payroll-settlements?runId=${row.payroll_run_id}`}>Run</Link></div></td>
                </tr>
              ))}
              {visibleRows.length === 0 ? <tr><td colSpan={8}><div className="empty-state">No payroll settlement rows match the selected filters.</div></td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Payroll settlements pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
