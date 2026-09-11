"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HrAdminPayrollCalculationLine, HrAdminPayrollRunReview } from "@/lib/types";

type VarianceBand = "All" | "Increase" | "Decrease" | "No change" | "Baseline pending";

type SalaryVarianceRow = {
  employeeCode: string;
  employeeName: string;
  payrollRunName: string;
  reviewId: string | null;
  calculationId: string;
  gross: number;
  deductions: number;
  netPay: number;
  baselineNetPay: number | null;
  varianceAmount: number | null;
  variancePercent: number | null;
  band: Exclude<VarianceBand, "All">;
  sourceHash: string;
};

const PAGE_SIZE = 8;

function formatMoney(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value: number | null) {
  if (value == null) return "Baseline pending";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function amount(line: HrAdminPayrollCalculationLine) {
  return Number(line.amount ?? 0);
}

function readBaselineNetPay(lines: HrAdminPayrollCalculationLine[]) {
  for (const line of lines) {
    const snapshot = line.context_snapshot as Record<string, unknown>;
    const baseline = snapshot.previous_net_pay ?? snapshot.baseline_net_pay ?? snapshot.prior_period_net_pay;
    if (baseline !== undefined && baseline !== null && Number.isFinite(Number(baseline))) {
      return Number(baseline);
    }
  }
  return null;
}

function buildRows(lines: HrAdminPayrollCalculationLine[], reviews: HrAdminPayrollRunReview[]): SalaryVarianceRow[] {
  const reviewByCalculationId = new Map(reviews.map((review) => [review.calculation_id, review]));
  const grouped = new Map<string, HrAdminPayrollCalculationLine[]>();

  lines.forEach((line) => {
    const key = `${line.calculation_id}:${line.employee_id}`;
    grouped.set(key, [...(grouped.get(key) ?? []), line]);
  });

  return Array.from(grouped.values()).map((group) => {
    const first = group[0];
    const review = reviewByCalculationId.get(first.calculation_id) ?? null;
    const gross = group
      .filter((line) => line.line_type === "earning" || line.line_type === "gross" || Number(line.amount) > 0)
      .reduce((sum, line) => sum + Math.max(0, amount(line)), 0);
    const deductions = Math.abs(
      group
        .filter((line) => line.line_type === "deduction" || Number(line.amount) < 0)
        .reduce((sum, line) => sum + amount(line), 0),
    );
    const explicitNet = group.find((line) => line.line_type === "net_pay" || line.component_code.toLowerCase() === "net_pay");
    const netPay = explicitNet ? amount(explicitNet) : gross - deductions;
    const baselineNetPay = readBaselineNetPay(group);
    const varianceAmount = baselineNetPay == null ? null : netPay - baselineNetPay;
    const variancePercent = baselineNetPay == null || baselineNetPay === 0 || varianceAmount == null ? null : (varianceAmount / baselineNetPay) * 100;
    const band =
      varianceAmount == null
        ? "Baseline pending"
        : varianceAmount > 0
          ? "Increase"
          : varianceAmount < 0
            ? "Decrease"
            : "No change";

    return {
      employeeCode: first.employee_code,
      employeeName: first.employee_name,
      payrollRunName: review?.payroll_run_name ?? first.payroll_run_id,
      reviewId: review?.id ?? null,
      calculationId: first.calculation_id,
      gross,
      deductions,
      netPay,
      baselineNetPay,
      varianceAmount,
      variancePercent,
      band,
      sourceHash: first.source_hash,
    };
  });
}

function bandClass(band: SalaryVarianceRow["band"]) {
  if (band === "Increase") return "record-chip record-chip--warning";
  if (band === "Decrease") return "record-chip";
  if (band === "No change") return "record-chip record-chip--success";
  return "record-chip record-chip--danger";
}

export function SalaryVarianceReportWorkspace({
  lines,
  reviews,
}: {
  lines: HrAdminPayrollCalculationLine[];
  reviews: HrAdminPayrollRunReview[];
}) {
  const [query, setQuery] = useState("");
  const [band, setBand] = useState<VarianceBand>("All");
  const [sortBy, setSortBy] = useState("variance_abs_desc");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => buildRows(lines, reviews), [lines, reviews]);
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter((row) => {
      const matchesBand = band === "All" || row.band === band;
      const matchesQuery =
        !normalizedQuery ||
        [row.employeeCode, row.employeeName, row.payrollRunName, row.sourceHash, row.band]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesBand && matchesQuery;
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "net_pay_desc") return right.netPay - left.netPay;
      if (sortBy === "employee") return left.employeeName.localeCompare(right.employeeName);
      if (sortBy === "run_name") return left.payrollRunName.localeCompare(right.payrollRunName);
      return Math.abs(right.varianceAmount ?? 0) - Math.abs(left.varianceAmount ?? 0);
    });
  }, [band, query, rows, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const totalCurrentNet = filteredRows.reduce((sum, row) => sum + row.netPay, 0);
  const totalVariance = filteredRows.reduce((sum, row) => sum + (row.varianceAmount ?? 0), 0);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (band !== "All") params.set("variance_band", band);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/salary-variance?${params.toString()}`;
  }, [band, query, sortBy]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Salary variance report workspace">
      <div className="report-catalog-workspace salary-variance-report" data-testid="salary-variance-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Employees compared</span>
            <strong>{filteredRows.length}</strong>
            <small>{rows.length} calculation rows</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Current net pay</span>
            <strong>{formatMoney(totalCurrentNet)}</strong>
            <small>Filtered total</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Variance amount</span>
            <strong>{formatMoney(totalVariance)}</strong>
            <small>Configured baselines only</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Baseline pending</span>
            <strong>{filteredRows.filter((row) => row.band === "Baseline pending").length}</strong>
            <small>No prior-period value</small>
          </article>
        </div>

        <div className="report-catalog-toolbar salary-variance-toolbar" aria-label="Salary variance filters">
          <label>
            <span>Search variance</span>
            <input
              className="input-control"
              type="search"
              value={query}
              onChange={(event) => updateFilter(() => setQuery(event.target.value))}
              placeholder="Search employee, run, hash"
            />
          </label>
          <label>
            <span>Variance band</span>
            <select className="input-control" value={band} onChange={(event) => updateFilter(() => setBand(event.target.value as VarianceBand))}>
              <option>All</option>
              <option>Increase</option>
              <option>Decrease</option>
              <option>No change</option>
              <option>Baseline pending</option>
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}>
              <option value="variance_abs_desc">Largest variance</option>
              <option value="net_pay_desc">Net pay high to low</option>
              <option value="employee">Employee</option>
              <option value="run_name">Run name</option>
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip">
            <strong>{filteredRows.filter((row) => row.band === "Increase").length}</strong> increases
          </span>
          <span className="queue-summary-chip">
            <strong>{filteredRows.filter((row) => row.band === "Decrease").length}</strong> decreases
          </span>
          <span className="queue-summary-chip">
            <strong>{currentPage}</strong> of {pageCount} pages
          </span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>
            Export filtered CSV
          </Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>
            Manifest
          </Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table salary-variance-table">
            <thead>
              <tr>
                <th scope="col">Employee</th>
                <th scope="col">Payroll run</th>
                <th scope="col">Gross</th>
                <th scope="col">Deductions</th>
                <th scope="col">Current net</th>
                <th scope="col">Baseline net</th>
                <th scope="col">Variance</th>
                <th scope="col">Evidence</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={`${row.calculationId}:${row.employeeCode}`}>
                  <td>
                    <strong>{row.employeeName}</strong>
                    <span>{row.employeeCode}</span>
                  </td>
                  <td>{row.payrollRunName}</td>
                  <td>{formatMoney(row.gross)}</td>
                  <td>{formatMoney(row.deductions)}</td>
                  <td>{formatMoney(row.netPay)}</td>
                  <td>{row.baselineNetPay == null ? "Baseline pending" : formatMoney(row.baselineNetPay)}</td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={bandClass(row.band)}>{row.band}</span>
                      <span>{row.varianceAmount == null ? "Pending" : formatMoney(row.varianceAmount)}</span>
                      <span>{formatPercent(row.variancePercent)}</span>
                    </div>
                  </td>
                  <td>
                    <code>{row.sourceHash.slice(0, 16)}</code>
                  </td>
                  <td>
                    <div className="report-row-actions">
                      <Link className="button button--secondary" href={row.reviewId ? `/hr-admin/payroll-review?reviewId=${row.reviewId}` : "/hr-admin/payroll-review"}>
                        Open
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">No salary variance rows match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Salary variance pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Previous
          </button>
          <span>
            Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
          </span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
