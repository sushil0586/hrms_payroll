import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollSettlementSetup } from "@/lib/api";
import type { HrAdminPayrollRun, HrAdminPayrollSettlement, HrAdminPayrollSettlementLine } from "@/lib/types";
import { PayrollSettlementActionsPanel } from "./payroll-settlement-actions-panel";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) {
    return "Pending";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(value: unknown, currency = "INR") {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`readiness-badge readiness-badge--${status}`}>{titleCase(status)}</span>;
}

function RunRail({ runs, selectedRun }: { runs: HrAdminPayrollRun[]; selectedRun: HrAdminPayrollRun | null }) {
  return (
    <aside className="payroll-setup-rail payroll-adjustment-rail">
      <div className="payroll-setup-panel__header">
        <span className="workspace-card__eyebrow">Runs</span>
        <h2>Settlement runs</h2>
      </div>
      <div className="payroll-setup-card-list">
        {runs.map((run) => (
          <Link
            className={`payroll-setup-mini-card payroll-adjustment-run-card ${selectedRun?.id === run.id ? "is-selected" : ""}`}
            href={`/hr-admin/payroll-settlements?runId=${run.id}`}
            key={run.id}
          >
            <div>
              <strong>{run.name}</strong>
              <span>{run.period_name} / {run.pay_group_name || "All groups"}</span>
            </div>
            <StatusBadge status={run.status} />
            <div className="payroll-input-run-card__counts">
              <span>{run.snapshot_count} inputs</span>
              <span>{run.locked_count} locked</span>
            </div>
            <code>{run.input_profile_ref}</code>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function SettlementDetail({
  settlement,
  lines,
}: {
  settlement: HrAdminPayrollSettlement | null;
  lines: HrAdminPayrollSettlementLine[];
}) {
  if (!settlement) {
    return (
      <aside className="payroll-setup-detail-panel payroll-adjustment-detail-panel">
        <div className="payroll-setup-panel__header">
          <span className="workspace-card__eyebrow">Settlement detail</span>
          <h2>No settlement selected</h2>
        </div>
        <p className="section-copy section-copy-soft">Select a settlement package to inspect final dues, recoveries, approval state, and source evidence.</p>
      </aside>
    );
  }

  const dependencies = Array.from(new Set(lines.flatMap((line) => {
    const rawDependencies = line.trace_snapshot.dependencies;
    return Array.isArray(rawDependencies) ? rawDependencies.map(String) : [];
  })));

  return (
    <aside className="payroll-setup-detail-panel payroll-adjustment-detail-panel" aria-label={`${settlement.employee_name} payroll settlement`}>
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Settlement detail</span>
          <h2>{settlement.employee_name}</h2>
          <p className="section-copy section-copy-soft">{settlement.employee_code} / {formatDate(settlement.last_working_date)}</p>
        </div>
        <StatusBadge status={settlement.status} />
      </div>

      <div className="payroll-output-net-block payroll-adjustment-amount-block">
        <span className="workspace-card__eyebrow">Net settlement</span>
        <strong>{formatMoney(settlement.totals_snapshot.net_settlement, settlement.currency_code)}</strong>
        <span>{settlement.line_count} configured lines</span>
      </div>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Final dues</span>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Gross dues</span><span className="detail-value">{formatMoney(settlement.totals_snapshot.gross_dues, settlement.currency_code)}</span></div>
          <div className="detail-row"><span className="detail-label">Recoveries</span><span className="detail-value">{formatMoney(settlement.totals_snapshot.deductions, settlement.currency_code)}</span></div>
          <div className="detail-row"><span className="detail-label">Settlement date</span><span className="detail-value">{formatDate(settlement.settlement_date)}</span></div>
          <div className="detail-row"><span className="detail-label">Applied</span><span className="detail-value">{formatDate(settlement.applied_at)}</span></div>
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Configuration</span>
        <div className="payroll-rule-snapshot-list">
          <div className="detail-row"><span className="detail-label">Settlement profile</span><span className="detail-value">{settlement.settlement_profile_ref}</span></div>
          <div className="detail-row"><span className="detail-label">Approval profile</span><span className="detail-value">{settlement.approval_profile_ref || "None"}</span></div>
          <div className="detail-row"><span className="detail-label">Calculation profile</span><span className="detail-value">{settlement.calculation_profile_ref || "None"}</span></div>
          <div className="detail-row"><span className="detail-label">Source ref</span><span className="detail-value">{settlement.source_ref}</span></div>
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Trace dependencies</span>
        <div className="payroll-rule-dependency-row">
          {dependencies.length ? dependencies.map((dependency) => <span key={dependency}>{dependency}</span>) : <span>No dependencies captured</span>}
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Source hash</span>
        <code>{settlement.source_hash}</code>
      </section>
    </aside>
  );
}

export default async function HrAdminPayrollSettlementsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const selectedRunId = normalizeParam(currentParams.runId);
  const selectedSettlementId = normalizeParam(currentParams.settlementId);
  const result = await getHrAdminPayrollSettlementSetup();
  const setup = result.data;
  const settlementRunId = setup.settlements[0]?.payroll_run_id;
  const selectedRun = setup.runs.find((item) => item.id === selectedRunId) ?? setup.runs.find((item) => item.id === settlementRunId) ?? setup.runs[0] ?? null;
  const visibleSettlements = selectedRun ? setup.settlements.filter((item) => item.payroll_run_id === selectedRun.id) : setup.settlements;
  const selectedSettlement = visibleSettlements.find((item) => item.id === selectedSettlementId) ?? visibleSettlements[0] ?? null;
  const visibleLines = selectedSettlement ? setup.lines.filter((item) => item.settlement_id === selectedSettlement.id) : setup.lines;

  return (
    <main className="shell shell--payroll-setup shell--payroll-adjustments">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll phase 4C" : "Demo payroll phase 4C"}
        title="Payroll Settlements"
        description="Orchestrate full-and-final packages from exit data, earned salary, leave encashment, recoveries, statutory placeholders, and approval evidence."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/payroll-adjustments">
              Adjustments
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-calculations">
              Calculations
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-review">
              Review
            </Link>
          </>
        }
        pills={["Exit sourced", "Approval controlled", "Adjustment applied"]}
        showPills
      />

      <section className="section section--tight">
        <div className="metric-grid-modern payroll-setup-metrics">
          <MetricTile className="metric-tile-soft" label="Settlements" value={setup.summary.settlement_count} trend={`${setup.summary.applied_count} applied`} />
          <MetricTile className="metric-tile-soft" label="Submitted" value={setup.summary.submitted_count} trend={`${setup.summary.approved_count} approved`} />
          <MetricTile className="metric-tile-soft" label="Lines" value={setup.summary.line_count} trend="Settlement components" />
          <MetricTile className="metric-tile-soft" label="Net settlement" value={formatMoney(selectedSettlement?.totals_snapshot.net_settlement)} trend="Selected package" />
        </div>
      </section>

      <section className="section section--tight">
        <div className="payroll-setup-workspace payroll-adjustment-workspace">
          <RunRail runs={setup.runs} selectedRun={selectedRun} />

          <div className="payroll-setup-main-panel">
            <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
              <div>
                <span className="workspace-card__eyebrow">Settlement control</span>
                <h2>{selectedRun?.name ?? "No payroll run"}</h2>
              </div>
              {selectedRun ? <StatusBadge status={selectedRun.status} /> : null}
            </div>

            <div className="payroll-calc-total-grid payroll-adjustment-total-grid">
              <article>
                <span>Gross dues</span>
                <strong>{formatMoney(selectedSettlement?.totals_snapshot.gross_dues)}</strong>
              </article>
              <article>
                <span>Recoveries</span>
                <strong>{formatMoney(selectedSettlement?.totals_snapshot.deductions)}</strong>
              </article>
              <article>
                <span>Net settlement</span>
                <strong>{formatMoney(selectedSettlement?.totals_snapshot.net_settlement)}</strong>
              </article>
              <article>
                <span>Applied packages</span>
                <strong>{visibleSettlements.filter((item) => item.status === "applied").length}</strong>
              </article>
            </div>

            <section className="payroll-setup-assignment-panel payroll-adjustment-profile-panel">
              <div className="payroll-setup-panel__header">
                <span className="workspace-card__eyebrow">Config scope</span>
                <h2>Full-and-final orchestration</h2>
              </div>
              <div className="payroll-output-handoff-grid payroll-adjustment-control-grid">
                <article>
                  <strong>Exit source</strong>
                  <span>Settlement packages link to lifecycle exit records and locked payroll snapshots.</span>
                </article>
                <article>
                  <strong>Line composition</strong>
                  <span>Earned salary, leave encashment, recoveries, gratuity, arrears, and statutory lines are configured by kind.</span>
                </article>
                <article>
                  <strong>Calculation input</strong>
                  <span>Applied settlement lines generate applied payroll adjustments for draft calculation consumption.</span>
                </article>
              </div>
            </section>

            <PayrollSettlementActionsPanel setup={setup} selectedRun={selectedRun} selectedSettlement={selectedSettlement} />

            <div className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Settlement register</span>
                  <h2>Full-and-final packages</h2>
                </div>
                <span className="payroll-setup-count">{visibleSettlements.length} packages</span>
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-adjustment-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Status</th>
                      <th>Last working</th>
                      <th>Gross dues</th>
                      <th>Recoveries</th>
                      <th>Net</th>
                      <th>Profile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSettlements.map((settlement) => (
                      <tr className={selectedSettlement?.id === settlement.id ? "is-selected" : ""} key={settlement.id}>
                        <td>
                          <Link href={`/hr-admin/payroll-settlements?runId=${settlement.payroll_run_id}&settlementId=${settlement.id}`}>
                            <strong>{settlement.employee_name}</strong>
                            <span>{settlement.employee_code}</span>
                          </Link>
                        </td>
                        <td><StatusBadge status={settlement.status} /></td>
                        <td>{formatDate(settlement.last_working_date)}</td>
                        <td>{formatMoney(settlement.totals_snapshot.gross_dues, settlement.currency_code)}</td>
                        <td>{formatMoney(settlement.totals_snapshot.deductions, settlement.currency_code)}</td>
                        <td>{formatMoney(settlement.totals_snapshot.net_settlement, settlement.currency_code)}</td>
                        <td><code>{settlement.settlement_profile_ref}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Settlement lines</span>
                  <h2>{selectedSettlement ? selectedSettlement.employee_name : "Selected package"}</h2>
                </div>
                <span className="payroll-setup-count">{visibleLines.length} lines</span>
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-adjustment-table payroll-settlement-line-table">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Kind</th>
                      <th>Direction</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLines.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <strong>{line.component_name}</strong>
                          <span>{line.component_code}</span>
                        </td>
                        <td><StatusBadge status={line.line_kind} /></td>
                        <td><StatusBadge status={line.direction} /></td>
                        <td>{formatMoney(line.amount, line.currency_code)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <SettlementDetail settlement={selectedSettlement} lines={visibleLines} />
        </div>
      </section>
    </main>
  );
}
