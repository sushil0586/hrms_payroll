"use client";


import { MetricTile } from "@/components/patterns/metric-tile";
import { AsyncDownloadButton } from "@/components/patterns/async-download-button";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { WorkspaceFilterForm } from "@/components/patterns/workspace-filter-form";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";

import { availableLeaveUnits as availableAfterReserved, leaveUtilizationPercent as utilizationPercent, leaveBalanceState as liabilityState, leaveRiskAssessment as liabilityRisk } from "@/lib/ui/leave-balance-presentation";
import type { HrAdminLeaveBalance } from "@/lib/types";

const PAGE_SIZE = 10;

type LeaveReportRow = HrAdminLeaveBalance & {
  availableAfterReserved: number;
  utilizationPercent: number;
  liabilityState: string;
  liabilityRisk: string;
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function numeric(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusClass(status: string) {
  if (["no reservations"].includes(status.toLowerCase())) return "record-chip record-chip--success";
  if (["reserved"].includes(status.toLowerCase())) return "record-chip record-chip--warning";
  if (["negative available"].includes(status.toLowerCase())) return "record-chip record-chip--danger";
  return "record-chip";
}

function toReportRow(item: HrAdminLeaveBalance): LeaveReportRow {
  return {
    ...item,
    availableAfterReserved: availableAfterReserved(item),
    utilizationPercent: utilizationPercent(item),
    liabilityState: liabilityState(item),
    liabilityRisk: liabilityRisk(),
  };
}

function formatUnits(value: string | number) {
  return Number(value).toFixed(2);
}

export function LeaveBalanceReportWorkspace({ items }: { items: HrAdminLeaveBalance[] }) {
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const policy = params.get("leave_policy") ?? "All";
  const leaveType = params.get("leave_type") ?? "All";
  const periodYear = params.get("period_year") ?? "All";
  const risk = params.get("liability_risk") ?? "All";
  const state = params.get("liability_state") ?? "All";
  const sortBy = params.get("sort") ?? "risk";
  const parsedPage = Number(params.get("page"));
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  function pageHref(value: number) {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(value));
    return `/hr-admin/reports/leave-balance?${next}`;
  }

  const rows = useMemo(() => items.map(toReportRow), [items]);
  const policies = useMemo(() => ["All", ...unique(rows.map((item) => item.leave_policy_name))], [rows]);
  const leaveTypes = useMemo(() => ["All", ...unique(rows.map((item) => item.leave_type_name))], [rows]);
  const years = useMemo(() => ["All", ...unique(rows.map((item) => String(item.period_year)))], [rows]);
  const states = ["All", "Negative available", "Reserved", "No reservations"];

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
        (risk === "All" || item.liabilityRisk === risk) &&
        (state === "All" || item.liabilityState === state)
      );
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "employee") return left.employee_name.localeCompare(right.employee_name);
      if (sortBy === "policy") return left.leave_policy_name.localeCompare(right.leave_policy_name);
      if (sortBy === "closing") return numeric(right.closing_balance) - numeric(left.closing_balance);
      if (sortBy === "utilization") return right.utilizationPercent - left.utilizationPercent;
      if (sortBy === "reserved") return numeric(right.reserved_amount) - numeric(left.reserved_amount);
      const score: Record<string, number> = { "Negative available": 3, Reserved: 2, "No reservations": 1 };
      return score[right.liabilityState] - score[left.liabilityState];
    });
  }, [leaveType, periodYear, policy, query, risk, state, rows, sortBy]);

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
    if (state !== "All") params.set("liability_state", state);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/leave-balance?${params.toString()}`;
  }, [leaveType, periodYear, policy, query, risk, state, sortBy]);
  const manifestHref = `${exportHref}&format=manifest`;

  return (
    <section className="section section--tight" aria-label="Leave balance report workspace">
      <div className="report-catalog-workspace leave-balance-report" data-testid="leave-balance-report">
        <div className="report-command-panel">
          <div>
            <span className="workspace-card__eyebrow">Leave balance</span>
            <h2>Balance quantities and utilization</h2>
            <p className="section-copy section-copy-soft">Amounts use each policy’s configured unit. Quantities are not added across policies or years.</p>
          </div>
          <div className="report-command-panel__actions">
            <AsyncDownloadButton href={exportHref} fileName="report.csv">Export filtered CSV</AsyncDownloadButton>
            <AsyncDownloadButton className="button button--ghost" href={manifestHref} fileName="report-manifest.json">Manifest</AsyncDownloadButton>
            <button className="button button--ghost" onClick={() => window.print()} type="button">Print report</button>
          </div>
        </div>

        <div className="workspace-metric-grid" role="group" aria-label="Leave balance summary">
          <MetricTile label="Balance rows" value={filteredRows.length} trend={`${items.length} total employee-policy rows`} />
          <MetricTile label="Policies represented" value={new Set(filteredRows.map(item => item.leave_policy_id)).size} trend="Distinct policies in this view" />
          <MetricTile label="Balances with reservations" value={filteredRows.filter(item => numeric(item.reserved_amount) > 0).length} trend="Rows with reserved quantities" />
          <MetricTile label="Negative available" value={filteredRows.filter((item) => item.liabilityState === "Negative available").length} trend="Rows below zero after reservations" />
        </div>

        {risk !== "All" ? <p className="notice" role="status">Legacy risk filter is not assessed. Clear filters to review factual balance states.</p> : null}
        <WorkspaceFilterForm action="/hr-admin/reports/leave-balance" label="Leave balance filters" className="workspace-filter-form--block">
          {risk !== "All" ? <input type="hidden" name="liability_risk" value={risk} /> : null}
          <div className="report-filter-panel__header">
            <div>
              <strong>Filter balance ledger</strong>
              <span>Review exact quantities within the relevant policy and year; states describe recorded balances.</span>
            </div>
            <a data-navigation-mode="document" className="button button--ghost" href="/hr-admin/reports/leave-balance">Clear filters</a>
          </div>
          <div className="report-filter-grid">
            <label className="report-filter-field">
              <span>Search leave</span>
              <input className="input-control" type="search" name="q" defaultValue={query} placeholder="Search employee, policy, leave type" />
            </label>
            <label className="report-filter-field">
              <span>Leave policy</span>
              <select aria-label="Leave policy" className="input-control" name="leave_policy" defaultValue={policy}>
                {policies.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="report-filter-field">
              <span>Leave type</span>
              <select aria-label="Leave type" className="input-control" name="leave_type" defaultValue={leaveType}>
                {leaveTypes.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="report-filter-field">
              <span>Period year</span>
              <select aria-label="Period year" className="input-control" name="period_year" defaultValue={periodYear}>
                {years.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="report-filter-field">
              <span>Balance state</span>
              <select aria-label="Balance state" className="input-control" name="liability_state" defaultValue={state}>
                {states.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="report-filter-field">
              <span>Sort</span>
              <select aria-label="Sort" className="input-control" name="sort" defaultValue={sortBy}>
                <option value="risk">Negative available first</option>
                <option value="employee">Employee</option>
                <option value="policy">Policy</option>
                <option value="closing">Closing balance</option>
                <option value="utilization">Utilization</option>
                <option value="reserved">Reserved units</option>
              </select>
            </label>
          </div>
          <div className="report-filter-form-actions"><button className="button button--primary" type="submit">Apply filters</button></div>
        </WorkspaceFilterForm>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.filter((item) => item.liabilityState === "Negative available").length}</strong> negative available</span>
          <span className="queue-summary-chip"><strong>{filteredRows.filter((item) => numeric(item.encashed_amount) > 0).length}</strong> encashed</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
        </div>

        <WorkspaceTableScrollRegion className="report-catalog-table-wrap workspace-table-region" label="Leave balance report table scroll">
          <table aria-label="Leave balance report" className="data-table workspace-data-table report-catalog-table payroll-register-table">
            <thead>
              <tr>
                <th scope="col">Employee</th>
                <th scope="col">Policy</th>
                <th scope="col">Entitlement</th>
                <th scope="col">Usage</th>
                <th scope="col">Balance quantities</th>
                <th scope="col">Balance state</th>
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
                      <span className={statusClass(item.liabilityState)}>{item.liabilityState}</span>
                      <span>Adjustment {formatUnits(item.adjustment_amount)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="report-row-actions">
                      <a data-navigation-mode="document" className="button button--secondary" href={`/hr-admin/leave-balances?q=${encodeURIComponent(item.employee_code)}`}>
                        Open
                      </a>
                      <a data-navigation-mode="document" className="button button--ghost" href={`/hr-admin/leave-balances?leave_policy_id=${encodeURIComponent(item.leave_policy_id)}`}>
                        Policy
                      </a>
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
        </WorkspaceTableScrollRegion>

        <div className="pagination-bar" role="group" aria-label="Leave balance pagination">
          <a data-navigation-mode="document" className="button button--secondary" aria-disabled={currentPage === 1} href={currentPage > 1 ? pageHref(currentPage - 1) : undefined}>Previous</a>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <a data-navigation-mode="document" className="button button--secondary" aria-disabled={currentPage === pageCount} href={currentPage < pageCount ? pageHref(currentPage + 1) : undefined}>Next</a>
        </div>
      </div>
    </section>
  );
}
