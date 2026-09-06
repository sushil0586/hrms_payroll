import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollCalculationSetup } from "@/lib/api";
import type { HrAdminPayrollCalculationLine, HrAdminPayrollRun, HrAdminPayrollRunCalculation, HrAdminPayrollValidationIssue } from "@/lib/types";

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
    return "Open";
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

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function annualizationSnapshot(line: HrAdminPayrollCalculationLine) {
  return recordValue(line.config_snapshot.annualization);
}

function snapshotText(value: unknown) {
  if (Array.isArray(value)) {
    return `${value.length} items`;
  }
  if (value && typeof value === "object") {
    return "Configured";
  }
  return String(value ?? "None");
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`readiness-badge readiness-badge--${status}`}>{titleCase(status)}</span>;
}

function lineSourceDetail(line: HrAdminPayrollCalculationLine) {
  if (line.line_source === "adjustment") {
    return line.config_snapshot.source_ref ? String(line.config_snapshot.source_ref) : "Applied payroll adjustment";
  }
  if (line.line_source === "statutory") {
    return String(line.config_snapshot.statutory_treatment_ref ?? line.config_snapshot.statutory_component_code ?? "Configured statutory component");
  }

  return line.rule_version ? `${line.rule_code} v${line.rule_version}` : line.rule_code;
}

function lineExpressionDetail(line: HrAdminPayrollCalculationLine) {
  if (line.line_source === "adjustment") {
    return String(line.config_snapshot.calculation_consumption_ref ?? line.config_snapshot.source_ref ?? line.source_hash);
  }
  if (line.line_source === "statutory") {
    return String(line.config_snapshot.wage_base_path ?? line.config_snapshot.statutory_treatment_ref ?? line.source_hash);
  }

  return line.expression;
}

function sourceBlockLabel(line: HrAdminPayrollCalculationLine) {
  if (line.line_source === "adjustment") {
    return "Adjustment source";
  }
  if (line.line_source === "statutory") {
    return "Statutory basis";
  }
  return "Formula used";
}

function RunRail({ runs, selectedRun }: { runs: HrAdminPayrollRun[]; selectedRun: HrAdminPayrollRun | null }) {
  return (
    <aside className="payroll-setup-rail payroll-calc-run-rail">
      <div className="payroll-setup-panel__header">
        <span className="workspace-card__eyebrow">Runs</span>
        <h2>Calculation queue</h2>
      </div>
      <div className="payroll-setup-card-list">
        {runs.map((run) => (
          <Link
            className={`payroll-setup-mini-card payroll-calc-run-card ${selectedRun?.id === run.id ? "is-selected" : ""}`}
            href={`/hr-admin/payroll-calculations?runId=${run.id}`}
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
              <span>{run.blocked_count} blocked</span>
            </div>
            <code>{run.snapshot_schema_ref}</code>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function CalculationDetail({ line }: { line: HrAdminPayrollCalculationLine | null }) {
  if (!line) {
    return (
      <aside className="payroll-setup-detail-panel payroll-calc-detail-panel">
        <div className="payroll-setup-panel__header">
          <span className="workspace-card__eyebrow">Line trace</span>
          <h2>No line selected</h2>
        </div>
        <p className="section-copy section-copy-soft">Select a calculation line to inspect its source, inputs, result, and source hash.</p>
      </aside>
    );
  }

  const dependencies = line.trace_snapshot.dependencies;
  const dependencyList = Array.isArray(dependencies) ? dependencies.map(String) : [];
  const annualization = annualizationSnapshot(line);
  const capEvidence = Array.isArray(annualization?.declaration_cap_evidence)
    ? annualization.declaration_cap_evidence
    : [];
  const regimeComparisons = Array.isArray(annualization?.regime_comparisons)
    ? annualization.regime_comparisons.map(recordValue).filter((item): item is Record<string, unknown> => Boolean(item))
    : [];

  return (
    <aside className="payroll-setup-detail-panel payroll-calc-detail-panel" aria-label={`${line.component_name} calculation trace`}>
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Line trace</span>
          <h2>{line.component_name}</h2>
          <p className="section-copy section-copy-soft">{line.employee_name} / {line.employee_code}</p>
        </div>
        <StatusBadge status={line.status} />
      </div>

      <div className="payroll-calc-amount-block">
        <span className="workspace-card__eyebrow">Calculated amount</span>
        <strong>{formatMoney(line.amount, line.currency_code)}</strong>
        <span>{titleCase(line.line_type)} / {line.component_code}</span>
      </div>

      <div className="payroll-rule-expression-block">
        <span className="workspace-card__eyebrow">{sourceBlockLabel(line)}</span>
        <code>{lineExpressionDetail(line)}</code>
      </div>

      <div className="detail-grid">
        <div className="detail-row"><span className="detail-label">Line source</span><span className="detail-value"><StatusBadge status={line.line_source} /></span></div>
        <div className="detail-row"><span className="detail-label">Source detail</span><span className="detail-value">{lineSourceDetail(line)}</span></div>
        <div className="detail-row"><span className="detail-label">Order</span><span className="detail-value">{line.calculation_order}</span></div>
        <div className="detail-row"><span className="detail-label">Source</span><span className="detail-value"><code>{line.source_hash.slice(0, 16)}</code></span></div>
        <div className="detail-row"><span className="detail-label">Result</span><span className="detail-value">{String(line.result_snapshot.result ?? line.amount)}</span></div>
      </div>

      {annualization ? (
        <section className="payroll-calc-annualization-card">
          <span className="workspace-card__eyebrow">TDS annualization</span>
          <div className="payroll-calc-annualization-grid">
            <div><span>FY</span><strong>{snapshotText(annualization.financial_year_code)}</strong></div>
            <div><span>Annual wage</span><strong>{formatMoney(annualization.annualized_wage_base, line.currency_code)}</strong></div>
            <div><span>Declarations</span><strong>{formatMoney(annualization.declaration_adjustment, line.currency_code)}</strong></div>
            <div><span>Taxable</span><strong>{formatMoney(annualization.taxable_annual_amount, line.currency_code)}</strong></div>
            <div><span>Annual tax</span><strong>{formatMoney(annualization.annual_tax, line.currency_code)}</strong></div>
            <div><span>Periods</span><strong>{snapshotText(annualization.remaining_period_count)}</strong></div>
          </div>
          <div className="payroll-calc-cap-row">
            <span>{capEvidence.length} cap rules consumed</span>
            <code>{snapshotText(annualization.selected_tax_regime ?? annualization.tax_regime)}</code>
          </div>
          {regimeComparisons.length ? (
            <div className="payroll-calc-regime-list">
              <span className="workspace-card__eyebrow">Regime comparison</span>
              {regimeComparisons.map((projection) => (
                <div className={projection.is_selected ? "is-selected" : ""} key={String(projection.tax_regime ?? "")}>
                  <span>{titleCase(String(projection.tax_regime ?? "regime"))}</span>
                  <strong>{formatMoney(projection.period_tax_amount, line.currency_code)}</strong>
                  <code>{snapshotText(projection.period_tax_delta)}</code>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Dependencies</span>
        <div className="payroll-rule-dependency-row">
          {dependencyList.length ? dependencyList.map((dependency) => <span key={dependency}>{dependency}</span>) : <span>No dependencies captured</span>}
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Configuration</span>
        <div className="payroll-rule-snapshot-list">
          {Object.entries(line.config_snapshot).slice(0, 5).map(([key, value]) => (
            <div className="detail-row" key={key}>
              <span className="detail-label">{titleCase(key)}</span>
              <span className="detail-value">{snapshotText(value)}</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function ValidationIssueRegister({ issues }: { issues: HrAdminPayrollValidationIssue[] }) {
  const categoryCounts = issues.reduce<Record<string, number>>((counts, issue) => {
    counts[issue.category_label] = (counts[issue.category_label] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <section className="payroll-calc-validation-panel">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Calculation validation</span>
          <h2>Issue register</h2>
        </div>
        <span className="payroll-setup-count">{issues.length} open checks</span>
      </div>

      {issues.length ? (
        <>
          <div className="payroll-calc-validation-category-row">
            {Object.entries(categoryCounts).map(([category, count]) => (
              <span key={category}>{category}: {count}</span>
            ))}
          </div>
          <div className="payroll-calc-validation-list">
            {issues.map((issue) => (
              <article className="payroll-calc-validation-card" key={issue.id}>
                <div>
                  <strong>{issue.title}</strong>
                  <span>{issue.issue_code}</span>
                </div>
                <div>
                  <strong>{issue.employee_name || "Run level"}</strong>
                  <span>{issue.employee_code || issue.payroll_run_name}</span>
                </div>
                <div className="payroll-calc-validation-card__badges">
                  <StatusBadge status={issue.severity} />
                  <StatusBadge status={issue.category} />
                  <StatusBadge status={issue.status} />
                </div>
                <code>{issue.validation_profile_ref}</code>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="section-copy section-copy-soft">No open calculation validation issues for this payroll run.</p>
      )}
    </section>
  );
}

export default async function HrAdminPayrollCalculationsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const selectedRunId = normalizeParam(currentParams.runId);
  const selectedCalculationId = normalizeParam(currentParams.calculationId);
  const selectedLineId = normalizeParam(currentParams.lineId);
  const result = await getHrAdminPayrollCalculationSetup();
  const setup = result.data;
  const selectedRun = setup.runs.find((item) => item.id === selectedRunId) ?? setup.runs.find((item) => item.status === "calculated") ?? setup.runs[0] ?? null;
  const visibleCalculations = selectedRun
    ? setup.calculations.filter((item) => item.payroll_run_id === selectedRun.id)
    : setup.calculations;
  const selectedCalculation =
    visibleCalculations.find((item) => item.id === selectedCalculationId) ??
    visibleCalculations[0] ??
    null;
  const visibleLines = selectedCalculation
    ? setup.lines.filter((item) => item.calculation_id === selectedCalculation.id)
    : setup.lines;
  const selectedLine = visibleLines.find((item) => item.id === selectedLineId) ?? visibleLines.find((item) => item.component_code === "TDS") ?? visibleLines[0] ?? null;
  const totals = selectedCalculation?.totals_snapshot ?? {};
  const visibleValidationIssues = setup.validation_issues.filter((issue) => {
    if (issue.status !== "open") {
      return false;
    }
    if (selectedRun && issue.payroll_run_id !== selectedRun.id) {
      return false;
    }
    return !selectedCalculation || issue.calculation_id === selectedCalculation.id || issue.calculation_id === null;
  });

  return (
    <main className="shell shell--payroll-setup shell--payroll-calculations">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll phase 4E" : "Demo payroll phase 4E"}
        title="Payroll Calculations"
        description="Draft payroll calculations from locked input snapshots, active rule versions, approved adjustments, and configurable pre-calculation validation."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/payroll-inputs">
              Inputs
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-rules">
              Rules
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-adjustments">
              Adjustments
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-settlements">
              Settlements
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-review">
              Review
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-setup">
              Payroll Setup
            </Link>
            <Link className="button button--secondary" href="/hr-admin/salary-setup">
              Salary Setup
            </Link>
          </>
        }
        pills={["Draft calculation", "Rule traced", "Adjustment sourced", "Validation gated"]}
        showPills
      />

      <section className="section section--tight">
        <div className="metric-grid-modern payroll-setup-metrics">
          <MetricTile className="metric-tile-soft" label="Calculable runs" value={setup.summary.calculable_run_count} trend={`${setup.summary.run_count} total runs`} />
          <MetricTile className="metric-tile-soft" label="Calculations" value={setup.summary.calculation_count} trend={`${setup.summary.completed_calculation_count} completed`} />
          <MetricTile className="metric-tile-soft" label="Lines" value={setup.summary.line_count} trend={`${setup.summary.error_line_count} errors`} />
          <MetricTile className="metric-tile-soft" label="Validation" value={setup.summary.open_validation_issue_count} trend={`${setup.summary.validation_warning_count} warnings / ${setup.summary.validation_blocker_count} blockers`} />
          <MetricTile className="metric-tile-soft" label="Latest net pay" value={formatMoney(setup.summary.latest_net_pay)} trend="Draft total" />
        </div>
      </section>

      <section className="section section--tight">
        <div className="payroll-setup-workspace payroll-calc-workspace">
          <RunRail runs={setup.runs} selectedRun={selectedRun} />

          <div className="payroll-setup-main-panel">
            <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
              <div>
                <span className="workspace-card__eyebrow">Calculation attempts</span>
                <h2>{selectedRun ? selectedRun.name : "All payroll runs"}</h2>
              </div>
              {selectedRun ? <StatusBadge status={selectedRun.status} /> : null}
            </div>

            <div className="payroll-calc-total-grid">
              <article>
                <span>Gross earnings</span>
                <strong>{formatMoney(totals.gross_earnings)}</strong>
              </article>
              <article>
                <span>Deductions</span>
                <strong>{formatMoney(totals.employee_deductions)}</strong>
              </article>
              <article>
                <span>Net pay</span>
                <strong>{formatMoney(totals.net_pay)}</strong>
              </article>
              <article>
                <span>Employees</span>
                <strong>{String(totals.employee_count ?? 0)}</strong>
              </article>
            </div>

            <ValidationIssueRegister issues={visibleValidationIssues} />

            <div className="payroll-table-scroll payroll-table-scroll--compact">
              <table className="payroll-readiness-table payroll-setup-table payroll-calc-attempt-table">
                <thead>
                  <tr>
                    <th>Attempt</th>
                    <th>Status</th>
                    <th>Profile</th>
                    <th>Lines</th>
                    <th>Net pay</th>
                    <th>Calculated</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCalculations.map((calculation) => (
                    <tr className={selectedCalculation?.id === calculation.id ? "is-selected" : ""} key={calculation.id}>
                      <td>
                        <Link href={`/hr-admin/payroll-calculations?runId=${calculation.payroll_run_id}&calculationId=${calculation.id}`}>
                          <strong>Attempt {calculation.attempt_number}</strong>
                          <span>{calculation.period_name}</span>
                        </Link>
                      </td>
                      <td><StatusBadge status={calculation.status} /></td>
                      <td><code>{calculation.calculation_profile_ref}</code></td>
                      <td>{calculation.line_count}</td>
                      <td>{formatMoney(calculation.totals_snapshot.net_pay)}</td>
                      <td>{formatDate(calculation.calculated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Calculation lines</span>
                  <h2>{selectedCalculation ? `Attempt ${selectedCalculation.attempt_number}` : "Latest attempt"}</h2>
                </div>
                <span className="payroll-setup-count">{visibleLines.length} lines</span>
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-calc-line-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Component</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Source</th>
                      <th>Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLines.map((line) => (
                      <tr className={selectedLine?.id === line.id ? "is-selected" : ""} key={line.id}>
                        <td>
                          <Link href={`/hr-admin/payroll-calculations?runId=${line.payroll_run_id}&calculationId=${line.calculation_id}&lineId=${line.id}`}>
                            <strong>{line.employee_name}</strong>
                            <span>{line.employee_code}</span>
                          </Link>
                        </td>
                        <td>
                          <Link href={`/hr-admin/payroll-calculations?runId=${line.payroll_run_id}&calculationId=${line.calculation_id}&lineId=${line.id}`}>
                            <strong>{line.component_name}</strong>
                            <span>{line.component_code}</span>
                          </Link>
                        </td>
                        <td><StatusBadge status={line.line_type} /></td>
                        <td>{formatMoney(line.amount, line.currency_code)}</td>
                        <td>
                          <StatusBadge status={line.line_source} />
                          <span>{lineSourceDetail(line)}</span>
                        </td>
                        <td><code>{line.source_hash.slice(0, 10)}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <CalculationDetail line={selectedLine} />
        </div>
      </section>
    </main>
  );
}
