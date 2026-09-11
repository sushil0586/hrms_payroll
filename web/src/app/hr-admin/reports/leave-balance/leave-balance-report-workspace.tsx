"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HrAdminLeaveBalance } from "@/lib/types";

const PAGE_SIZE = 10;

type LeaveReportRow = HrAdminLeaveBalance & {
  availableAfterReserved: number;
  utilizationPercent: number;
  liabilityState: string;
  liabilityRisk: "High" | "Medium" | "Low";
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function numeric(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function availableAfterReserved(item: HrAdminLeaveBalance) {
  return numeric(item.closing_balance) - numeric(item.reserved_amount);
}

function utilizationPercent(item: HrAdminLeaveBalance) {
  const earned = numeric(item.opening_balance) + numeric(item.accrued_amount) + numeric(item.carry_forward_amount) + numeric(item.adjustment_amount);
  if (!earned) return 0;
  return Math.round((numeric(item.consumed_amount) / earned) * 100);
}

function liabilityRisk(item: HrAdminLeaveBalance): LeaveReportRow["liabilityRisk"] {
  const available = availableAfterReserved(item);
  if (available < 0) return "High";
  if (numeric(item.reserved_amount) > 0 || available <= 2) return "Medium";
  return "Low";
}

function liabilityState(item: HrAdminLeaveBalance) {
  const available = availableAfterReserved(item);
  if (available < 0) return "Overdrawn";
  if (numeric(item.reserved_amount) > 0) return "Reserved";
  if (available <= 2) return "Low balance";
  return "Healthy";
}

function statusClass(status: string) {
  if (["healthy", "low"].includes(status.toLowerCase())) return "record-chip record-chip--success";
  if (["reserved", "low balance", "medium"].includes(status.toLowerCase())) return "record-chip record-chip--warning";
  if (["overdrawn", "high"].includes(status.toLowerCase())) return "record-chip record-chip--danger";
  return "record-chip";
}

function toReportRow(item: HrAdminLeaveBalance): LeaveReportRow {
  return {
    ...item,
    availableAfterReserved: availableAfterReserved(item),
    utilizationPercent: utilizationPercent(item),
    liabilityState: liabilityState(item),
    liabilityRisk: liabilityRisk(item),
  };
}

function formatUnits(value: string | number) {
  return Number(value).toFixed(2);
}

export function LeaveBalanceReportWorkspace({ items }: { items: HrAdminLeaveBalance[] }) {
  const [query, setQuery] = useState("");
  const [policy, setPolicy] = useState("All");
  const [leaveType, setLeaveType] = useState("All");
  const [periodYear, setPeriodYear] = useState("All");
  const [risk, setRisk] = useState("All");
  const [sortBy, setSortBy] = useState("risk");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => items.map(toReportRow), [items]);
  const policies = useMemo(() => ["All", ...unique(rows.map((item) => item.leave_policy_name))], [rows]);
  const leaveTypes = useMemo(() => ["All", ...unique(rows.map((item) => item.leave_type_name))], [rows]);
  const years = useMemo(() => ["All", ...unique(rows.map((item) => String(item.period_year)))], [rows]);
  const risks = ["All", "High", "Medium", "Low"];

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          item.employee_code,
          item.employee_name,
          item.leave_policy_name,
          item.leave_type_name,
          item.period_year,
          item.liabilityState,
          item.liabilityRisk,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (policy === "All" || item.leave_policy_name === policy) &&
        (leaveType === "All" || item.leave_type_name === leaveType) &&
        (periodYear === "All" || String(item.period_year) === periodYear) &&
        (risk === "All" || item.liabilityRisk === risk)
      );
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "employee") return left.employee_name.localeCompare(right.employee_name);
      if (sortBy === "policy") return left.leave_policy_name.localeCompare(right.leave_policy_name);
      if (sortBy === "closing") return numeric(right.closing_balance) - numeric(left.closing_balance);
      if (sortBy === "utilization") return right.utilizationPercent - left.utilizationPercent;
      if (sortBy === "reserved") return numeric(right.reserved_amount) - numeric(left.reserved_amount);
      const score = { High: 3, Medium: 2, Low: 1 };
      return score[right.liabilityRisk] - score[left.liabilityRisk];
    });
  }, [leaveType, periodYear, policy, query, risk, rows, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (policy !== "All") params.set("leave_policy", policy);
    if (leaveType !== "All") params.set("leave_type", leaveType);
    if (periodYear !== "All") params.set("period_year", periodYear);
    if (risk !== "All") params.set("liability_risk", risk);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/leave-balance?${params.toString()}`;
  }, [leaveType, periodYear, policy, query, risk, sortBy]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Leave balance report workspace">
      <div className="report-catalog-workspace leave-balance-report" data-testid="leave-balance-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Balance rows</span>
            <strong>{filteredRows.length}</strong>
            <small>{items.length} total employee-policy rows</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Closing liability</span>
            <strong>{formatUnits(filteredRows.reduce((sum, item) => sum + numeric(item.closing_balance), 0))}</strong>
            <small>Total closing units</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Reserved units</span>
            <strong>{formatUnits(filteredRows.reduce((sum, item) => sum + numeric(item.reserved_amount), 0))}</strong>
            <small>Leave already reserved</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>High liability risk</span>
            <strong>{filteredRows.filter((item) => item.liabilityRisk === "High").length}</strong>
            <small>Overdrawn balances</small>
          </article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Leave balance filters">
          <label>
            <span>Search leave</span>
            <input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search employee, policy, leave type" />
          </label>
          <label>
            <span>Leave policy</span>
            <select aria-label="Leave policy" className="input-control" value={policy} onChange={(event) => updateFilter(() => setPolicy(event.target.value))}>
              {policies.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Leave type</span>
            <select aria-label="Leave type" className="input-control" value={leaveType} onChange={(event) => updateFilter(() => setLeaveType(event.target.value))}>
              {leaveTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Period year</span>
            <select aria-label="Period year" className="input-control" value={periodYear} onChange={(event) => updateFilter(() => setPeriodYear(event.target.value))}>
              {years.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Liability risk</span>
            <select aria-label="Liability risk" className="input-control" value={risk} onChange={(event) => updateFilter(() => setRisk(event.target.value))}>
              {risks.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}>
              <option value="risk">Risk first</option>
              <option value="employee">Employee</option>
              <option value="policy">Policy</option>
              <option value="closing">Closing balance</option>
              <option value="utilization">Utilization</option>
              <option value="reserved">Reserved units</option>
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.filter((item) => item.liabilityState === "Overdrawn").length}</strong> overdrawn</span>
          <span className="queue-summary-chip"><strong>{filteredRows.filter((item) => numeric(item.encashed_amount) > 0).length}</strong> encashed</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>Export filtered CSV</Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead>
              <tr>
                <th scope="col">Employee</th>
                <th scope="col">Policy</th>
                <th scope="col">Entitlement</th>
                <th scope="col">Usage</th>
                <th scope="col">Liability</th>
                <th scope="col">Risk</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.employee_name}</strong>
                    <span>{item.employee_code}</span>
                    <span>{item.period_year}</span>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{item.leave_policy_name}</span>
                      <span>{item.leave_type_name}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>Opening {formatUnits(item.opening_balance)}</span>
                      <span>Accrued {formatUnits(item.accrued_amount)}</span>
                      <span>Carry forward {formatUnits(item.carry_forward_amount)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>Consumed {formatUnits(item.consumed_amount)}</span>
                      <span>Reserved {formatUnits(item.reserved_amount)}</span>
                      <span>{item.utilizationPercent}% utilization</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>Closing {formatUnits(item.closing_balance)}</span>
                      <span>Available {formatUnits(item.availableAfterReserved)}</span>
                      <span>Encashed {formatUnits(item.encashed_amount)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(item.liabilityRisk)}>{item.liabilityRisk}</span>
                      <span className={statusClass(item.liabilityState)}>{item.liabilityState}</span>
                      <span>Adjustment {formatUnits(item.adjustment_amount)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="report-row-actions">
                      <Link className="button button--secondary" href={`/hr-admin/leave-balances?q=${encodeURIComponent(item.employee_code)}`}>
                        Open
                      </Link>
                      <Link className="button button--ghost" href={`/hr-admin/leave-balances?leave_policy_id=${encodeURIComponent(item.leave_policy_id)}`}>
                        Policy
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">No leave balance rows match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Leave balance pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
