"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  HrAdminPayrollAdjustment,
  HrAdminPayrollInputSnapshot,
  HrAdminPayrollOutputArtifact,
  HrAdminPayrollOutputBatch,
  HrAdminPayrollRun,
  HrAdminPayrollRunException,
  HrAdminPayrollRunReview,
  HrAdminPayrollSettlement,
} from "@/lib/types";

const PAGE_SIZE = 10;

type CloseRow = {
  run: HrAdminPayrollRun;
  review: HrAdminPayrollRunReview | null;
  outputBatch: HrAdminPayrollOutputBatch | null;
  inputCoverage: number;
  openExceptions: number;
  openBlockers: number;
  pendingAdjustments: number;
  pendingSettlements: number;
  artifacts: HrAdminPayrollOutputArtifact[];
  state: "Ready" | "Needs action" | "Blocked";
  risk: "Low" | "Medium" | "High";
  blockerCategory: string;
  primaryAction: string;
  sourceHashes: string[];
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (["ready", "low", "published", "locked", "approved"].includes(normalized)) return "record-chip record-chip--success";
  if (["needs action", "medium", "generated", "review", "not_generated"].includes(normalized)) return "record-chip record-chip--warning";
  if (["blocked", "high", "failed"].includes(normalized)) return "record-chip record-chip--danger";
  return "record-chip";
}

function closeState(run: HrAdminPayrollRun, openBlockers: number, pendingAdjustments: number, pendingSettlements: number): CloseRow["state"] {
  if (run.blocked_count > 0 || openBlockers > 0) return "Blocked";
  if (pendingAdjustments > 0 || pendingSettlements > 0) return "Needs action";
  return "Ready";
}

function closeRisk(state: CloseRow["state"], warningInputs: number, openExceptions: number): CloseRow["risk"] {
  if (state === "Blocked") return "High";
  if (state === "Needs action" || warningInputs > 0 || openExceptions > 0) return "Medium";
  return "Low";
}

function blockerCategory(row: Pick<CloseRow, "run" | "openBlockers" | "pendingAdjustments" | "pendingSettlements" | "outputBatch">) {
  if (row.run.blocked_count > 0) return "Input blockers";
  if (row.openBlockers > 0) return "Review blockers";
  if (row.pendingAdjustments > 0) return "Pending adjustments";
  if (row.pendingSettlements > 0) return "Pending settlements";
  if (!row.outputBatch) return "Output pending";
  return "None";
}

function actionFor(category: string) {
  if (category === "Input blockers") return "Resolve blocked input snapshots";
  if (category === "Review blockers") return "Resolve payroll review blockers";
  if (category === "Pending adjustments") return "Apply or reject pending adjustments";
  if (category === "Pending settlements") return "Apply or void pending settlements";
  if (category === "Output pending") return "Generate payroll outputs after lock";
  return "Ready for close review";
}

export function PayrollCloseReadinessReportWorkspace({
  runs,
  snapshots,
  reviews,
  exceptions,
  adjustments,
  settlements,
  outputBatches,
  artifacts,
}: {
  runs: HrAdminPayrollRun[];
  snapshots: HrAdminPayrollInputSnapshot[];
  reviews: HrAdminPayrollRunReview[];
  exceptions: HrAdminPayrollRunException[];
  adjustments: HrAdminPayrollAdjustment[];
  settlements: HrAdminPayrollSettlement[];
  outputBatches: HrAdminPayrollOutputBatch[];
  artifacts: HrAdminPayrollOutputArtifact[];
}) {
  const [query, setQuery] = useState("");
  const [runId, setRunId] = useState("All");
  const [state, setState] = useState("All");
  const [risk, setRisk] = useState("All");
  const [category, setCategory] = useState("All");
  const [outputStatus, setOutputStatus] = useState("All");
  const [sortBy, setSortBy] = useState("risk");
  const [page, setPage] = useState(1);

  const rows = useMemo<CloseRow[]>(() => {
    return runs.map((run) => {
      const review = reviews.find((item) => item.payroll_run_id === run.id) ?? null;
      const runExceptions = exceptions.filter((item) => item.payroll_run_id === run.id);
      const openExceptions = runExceptions.filter((item) => item.status === "open").length;
      const openBlockers = runExceptions.filter((item) => item.status === "open" && ["blocker", "critical", "high"].includes(item.severity)).length;
      const pendingAdjustments = adjustments.filter((item) => item.payroll_run_id === run.id && !["applied", "rejected"].includes(item.status)).length;
      const pendingSettlements = settlements.filter((item) => item.payroll_run_id === run.id && !["applied", "voided", "rejected"].includes(item.status)).length;
      const outputBatch = outputBatches.find((item) => item.payroll_run_id === run.id) ?? null;
      const runArtifacts = artifacts.filter((item) => item.payroll_run_id === run.id);
      const inputCoverage = run.snapshot_count ? Math.round((run.locked_count / run.snapshot_count) * 100) : 0;
      const rowState = closeState(run, openBlockers, pendingAdjustments, pendingSettlements);
      const rowRisk = closeRisk(rowState, run.warning_count, openExceptions);
      const row = {
        run,
        review,
        outputBatch,
        inputCoverage,
        openExceptions,
        openBlockers,
        pendingAdjustments,
        pendingSettlements,
        artifacts: runArtifacts,
        state: rowState,
        risk: rowRisk,
        blockerCategory: "",
        primaryAction: "",
        sourceHashes: unique([
          ...snapshots.filter((snapshot) => snapshot.payroll_run_id === run.id).map((snapshot) => snapshot.source_hash),
          ...runArtifacts.map((artifact) => artifact.source_hash),
        ]),
      };
      row.blockerCategory = blockerCategory(row);
      row.primaryAction = actionFor(row.blockerCategory);
      return row;
    });
  }, [adjustments, artifacts, exceptions, outputBatches, reviews, runs, settlements, snapshots]);

  const states = ["All", "Ready", "Needs action", "Blocked"];
  const risks = ["All", "High", "Medium", "Low"];
  const categories = useMemo(() => ["All", ...unique(rows.map((row) => row.blockerCategory))], [rows]);
  const outputStatuses = useMemo(() => ["All", ...unique(rows.map((row) => row.outputBatch?.status ?? "not_generated"))], [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter((row) => {
      const outputState = row.outputBatch?.status ?? "not_generated";
      const matchesQuery =
        !normalizedQuery ||
        [
          row.run.name,
          row.run.code,
          row.run.status,
          row.state,
          row.risk,
          row.blockerCategory,
          row.primaryAction,
          row.review?.review_profile_ref,
          row.outputBatch?.output_profile_ref,
          row.sourceHashes.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (runId === "All" || row.run.id === runId) &&
        (state === "All" || row.state === state) &&
        (risk === "All" || row.risk === risk) &&
        (category === "All" || row.blockerCategory === category) &&
        (outputStatus === "All" || outputState === outputStatus)
      );
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "coverage") return left.inputCoverage - right.inputCoverage;
      if (sortBy === "run") return left.run.name.localeCompare(right.run.name);
      if (sortBy === "state") return left.state.localeCompare(right.state);
      if (sortBy === "blockers") return right.openBlockers - left.openBlockers || right.run.blocked_count - left.run.blocked_count;
      const scores = { High: 3, Medium: 2, Low: 1 };
      return scores[right.risk] - scores[left.risk] || right.openBlockers - left.openBlockers;
    });
  }, [category, outputStatus, query, risk, rows, runId, sortBy, state]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (runId !== "All") params.set("payroll_run_id", runId);
    if (state !== "All") params.set("close_readiness_state", state);
    if (risk !== "All") params.set("close_readiness_risk", risk);
    if (category !== "All") params.set("blocker_category", category);
    if (outputStatus !== "All") params.set("output_batch_status", outputStatus);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/payroll-close-readiness?${params.toString()}`;
  }, [category, outputStatus, query, risk, runId, sortBy, state]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Payroll close readiness report workspace">
      <div className="report-catalog-workspace payroll-close-readiness-report" data-testid="payroll-close-readiness-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft"><span>Payroll runs</span><strong>{filteredRows.length}</strong><small>{runs.length} total runs</small></article>
          <article className="metric-tile metric-tile-soft"><span>Ready to close</span><strong>{filteredRows.filter((row) => row.state === "Ready").length}</strong><small>All close gates clear</small></article>
          <article className="metric-tile metric-tile-soft"><span>Blocked runs</span><strong>{filteredRows.filter((row) => row.state === "Blocked").length}</strong><small>Input or review blockers</small></article>
          <article className="metric-tile metric-tile-soft"><span>Open blockers</span><strong>{filteredRows.reduce((sum, row) => sum + row.openBlockers + row.run.blocked_count, 0)}</strong><small>Blocking items</small></article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Payroll close readiness filters">
          <label><span>Search close readiness</span><input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search run, blocker, action, hash" /></label>
          <label><span>Payroll run</span><select aria-label="Payroll run" className="input-control" value={runId} onChange={(event) => updateFilter(() => setRunId(event.target.value))}><option value="All">All</option>{runs.map((run) => <option key={run.id} value={run.id}>{run.name}</option>)}</select></label>
          <label><span>Close readiness</span><select aria-label="Close readiness" className="input-control" value={state} onChange={(event) => updateFilter(() => setState(event.target.value))}>{states.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Risk</span><select aria-label="Risk" className="input-control" value={risk} onChange={(event) => updateFilter(() => setRisk(event.target.value))}>{risks.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Blocker category</span><select aria-label="Blocker category" className="input-control" value={category} onChange={(event) => updateFilter(() => setCategory(event.target.value))}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Output state</span><select aria-label="Output state" className="input-control" value={outputStatus} onChange={(event) => updateFilter(() => setOutputStatus(event.target.value))}>{outputStatuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Sort</span><select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}><option value="risk">Risk first</option><option value="blockers">Blockers first</option><option value="coverage">Lowest input coverage</option><option value="run">Payroll run</option><option value="state">Close readiness</option></select></label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.filter((row) => row.risk === "High").length}</strong> high risk</span>
          <span className="queue-summary-chip"><strong>{filteredRows.filter((row) => row.sourceHashes.length > 0).length}</strong> hash linked</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>Export filtered CSV</Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead><tr><th scope="col">Payroll run</th><th scope="col">Inputs</th><th scope="col">Review</th><th scope="col">Pending payroll inputs</th><th scope="col">Output</th><th scope="col">Close readiness</th><th scope="col">Evidence</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.run.id}>
                  <td><strong>{row.run.name}</strong><span>{row.run.period_name}</span><span className={statusClass(row.run.status)}>{row.run.status_label || titleCase(row.run.status)}</span></td>
                  <td><div className="payroll-register-stack"><strong>{row.inputCoverage}% locked</strong><span>{row.run.locked_count}/{row.run.snapshot_count} snapshots</span><span>{row.run.blocked_count} blocked, {row.run.warning_count} warning</span></div></td>
                  <td><div className="payroll-register-stack"><span>{row.openExceptions} open exceptions</span><span>{row.openBlockers} blockers</span><span>{row.review?.review_profile_ref ?? "No review opened"}</span></div></td>
                  <td><div className="payroll-register-stack"><span>{row.pendingAdjustments} adjustments</span><span>{row.pendingSettlements} settlements</span></div></td>
                  <td><div className="payroll-register-stack"><span className={statusClass(row.outputBatch?.status ?? "not_generated")}>{titleCase(row.outputBatch?.status ?? "not_generated")}</span><span>{row.artifacts.length} artifacts</span><span>{row.artifacts.filter((artifact) => artifact.status === "published").length} published</span></div></td>
                  <td><div className="payroll-register-stack"><span className={statusClass(row.state)}>{row.state}</span><span className={statusClass(row.risk)}>{row.risk}</span><span>{row.blockerCategory}</span><strong>{row.primaryAction}</strong></div></td>
                  <td><div className="payroll-register-stack"><span>{row.sourceHashes.length} hashes</span><code>{row.sourceHashes.slice(0, 2).join("|") || "hash.pending"}</code></div></td>
                  <td><div className="report-row-actions"><Link className="button button--secondary" href={`/hr-admin/payroll-review?runId=${row.run.id}`}>Review</Link><Link className="button button--ghost" href={`/hr-admin/payroll-calculations?runId=${row.run.id}`}>Control</Link></div></td>
                </tr>
              ))}
              {visibleRows.length === 0 ? <tr><td colSpan={8}><div className="empty-state">No payroll close readiness rows match the selected filters.</div></td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Payroll close readiness pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
