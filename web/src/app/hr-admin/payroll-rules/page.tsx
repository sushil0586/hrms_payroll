import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollRulesSetup } from "@/lib/api";
import type { HrAdminPayrollRuleDefinition, HrAdminPayrollRuleEvaluation, HrAdminPayrollRuleVersion } from "@/lib/types";
import { PayrollRuleOperationsPanel } from "./payroll-rule-operations-panel";

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

function StatusBadge({ status }: { status: string }) {
  return <span className={`readiness-badge readiness-badge--${status}`}>{titleCase(status)}</span>;
}

function RuleCatalog({
  rules,
  selectedRule,
}: {
  rules: HrAdminPayrollRuleDefinition[];
  selectedRule: HrAdminPayrollRuleDefinition | null;
}) {
  return (
    <aside className="payroll-setup-rail payroll-rule-catalog">
      <div className="payroll-setup-panel__header">
        <span className="workspace-card__eyebrow">Rules</span>
        <h2>Catalog</h2>
      </div>
      <div className="payroll-setup-card-list">
        {rules.map((rule) => (
          <Link
            className={`payroll-setup-mini-card payroll-rule-card ${selectedRule?.id === rule.id ? "is-selected" : ""}`}
            href={`/hr-admin/payroll-rules?ruleId=${rule.id}`}
            key={rule.id}
          >
            <div>
              <strong>{rule.name}</strong>
              <span>{rule.code}</span>
            </div>
            <StatusBadge status={rule.rule_type} />
            <div className="payroll-rule-card__tags">
              {rule.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
            </div>
            <span>{rule.active_version_count} active / {rule.evaluation_count} previews</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function SnapshotRows({ snapshot }: { snapshot: Record<string, unknown> }) {
  const entries = Object.entries(snapshot).slice(0, 5);
  if (!entries.length) {
    return <span className="muted">No metadata captured</span>;
  }
  return (
    <div className="payroll-rule-snapshot-list">
      {entries.map(([key, value]) => (
        <div className="detail-row" key={key}>
          <span className="detail-label">{titleCase(key)}</span>
          <span className="detail-value">{Array.isArray(value) ? value.join(", ") : String(value ?? "None")}</span>
        </div>
      ))}
    </div>
  );
}

function RuleDetail({
  rule,
  version,
  evaluations,
}: {
  rule: HrAdminPayrollRuleDefinition | null;
  version: HrAdminPayrollRuleVersion | null;
  evaluations: HrAdminPayrollRuleEvaluation[];
}) {
  if (!rule || !version) {
    return (
      <aside className="payroll-setup-detail-panel payroll-rule-detail-panel">
        <div className="payroll-setup-panel__header">
          <span className="workspace-card__eyebrow">Expression trace</span>
          <h2>No rule selected</h2>
        </div>
        <p className="section-copy section-copy-soft">Create or select a rule version to inspect expression metadata and preview traces.</p>
      </aside>
    );
  }

  const selectedEvaluations = evaluations.filter((item) => item.rule_version_id === version.id);
  const latestEvaluation = selectedEvaluations[0] ?? null;
  const dependencies = latestEvaluation?.trace_snapshot.dependencies;
  const dependencyList = Array.isArray(dependencies) ? dependencies.map(String) : [];

  return (
    <aside className="payroll-setup-detail-panel payroll-rule-detail-panel" aria-label={`${rule.name} expression detail`}>
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Expression trace</span>
          <h2>{rule.name}</h2>
          <p className="section-copy section-copy-soft">{rule.description || rule.code}</p>
        </div>
        <StatusBadge status={version.status} />
      </div>

      <div className="payroll-rule-expression-block">
        <span className="workspace-card__eyebrow">Safe expression</span>
        <code>{version.expression}</code>
      </div>

      <div className="detail-grid">
        <div className="detail-row"><span className="detail-label">Language</span><span className="detail-value">{version.expression_language_label}</span></div>
        <div className="detail-row"><span className="detail-label">Effective</span><span className="detail-value">{formatDate(version.effective_from)} - {formatDate(version.effective_to)}</span></div>
        <div className="detail-row"><span className="detail-label">Rounding</span><span className="detail-value">{version.rounding_rule_ref || "Expression controlled"}</span></div>
        <div className="detail-row"><span className="detail-label">Preview count</span><span className="detail-value">{version.evaluation_count}</span></div>
      </div>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Input schema</span>
        <SnapshotRows snapshot={version.input_schema} />
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Latest result</span>
        {latestEvaluation ? (
          <>
            <div className="detail-row">
              <span className="detail-label">Employee</span>
              <span className="detail-value">{latestEvaluation.employee_code || "Manual context"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Result</span>
              <span className="detail-value">{String(latestEvaluation.result_snapshot.result ?? "Not captured")}</span>
            </div>
            <div className="payroll-rule-dependency-row">
              {dependencyList.map((dependency) => <span key={dependency}>{dependency}</span>)}
            </div>
          </>
        ) : (
          <span className="muted">No evaluation trace has been stored for this version.</span>
        )}
      </section>
    </aside>
  );
}

export default async function HrAdminPayrollRulesPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const selectedRuleId = normalizeParam(currentParams.ruleId);
  const result = await getHrAdminPayrollRulesSetup();
  const setup = result.data;
  const selectedRule = setup.rules.find((item) => item.id === selectedRuleId) ?? setup.rules[0] ?? null;
  const selectedVersions = selectedRule ? setup.versions.filter((item) => item.rule_id === selectedRule.id) : setup.versions;
  const selectedVersion = selectedVersions[0] ?? null;

  return (
    <main className="shell shell--payroll-setup shell--payroll-rules">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll phase 2A" : "Demo payroll phase 2A"}
        title="Payroll Rules"
        description="Versioned formula and rule definitions with safe expressions, dependencies, previews, and trace output."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/payroll-inputs">
              Inputs
            </Link>
            <Link className="button button--secondary" href="/hr-admin/salary-setup">
              Salary Setup
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-setup">
              Payroll Setup
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-calculations">
              Calculations
            </Link>
          </>
        }
        pills={["Safe expressions", "Versioned", "Traceable"]}
        showPills
      />

      <section className="section section--tight">
        <div className="metric-grid-modern payroll-setup-metrics">
          <MetricTile className="metric-tile-soft" label="Rules" value={setup.summary.rule_count} trend={`${setup.summary.formula_rule_count} formulas`} />
          <MetricTile className="metric-tile-soft" label="Active versions" value={setup.summary.active_version_count} trend={`${setup.summary.draft_version_count} draft`} />
          <MetricTile className="metric-tile-soft" label="Previews" value={setup.summary.evaluation_count} trend="Stored traces" />
          <MetricTile className="metric-tile-soft" label="Locked snapshots" value={setup.summary.locked_snapshot_count} trend="Preview-ready inputs" />
        </div>
      </section>

      <section className="section section--tight">
        <div className="payroll-setup-workspace payroll-rule-workspace">
          <RuleCatalog rules={setup.rules} selectedRule={selectedRule} />

          <div className="payroll-setup-main-panel">
            <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
              <div>
                <span className="workspace-card__eyebrow">Rule versions</span>
                <h2>{selectedRule ? selectedRule.name : "All rules"}</h2>
              </div>
              <span className="payroll-setup-count">{selectedVersions.length} versions</span>
            </div>

            <div className="payroll-table-scroll">
              <table className="payroll-readiness-table payroll-setup-table payroll-rule-table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Type</th>
                    <th>Effective</th>
                    <th>Expression</th>
                    <th>Previews</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedVersions.map((version) => (
                    <tr className={selectedVersion?.id === version.id ? "is-selected" : ""} key={version.id}>
                      <td>
                        <strong>v{version.version}</strong>
                        <span>{version.rule_code}</span>
                      </td>
                      <td><StatusBadge status={version.status} /></td>
                      <td>{titleCase(version.rule_type)}</td>
                      <td>{formatDate(version.effective_from)} - {formatDate(version.effective_to)}</td>
                      <td><code>{version.expression}</code></td>
                      <td>{version.evaluation_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Preview inputs</span>
                  <h2>Locked snapshot options</h2>
                </div>
                <span className="payroll-setup-count">{setup.options.input_snapshots.length} snapshots</span>
              </div>
              <div className="payroll-rule-preview-grid">
                {setup.options.input_snapshots.map((snapshot) => (
                  <article className="payroll-rule-source-card" key={snapshot.id}>
                    <strong>{snapshot.employee_name}</strong>
                    <span>{snapshot.employee_code} / {snapshot.payroll_run_name}</span>
                    <code>{snapshot.source_hash}</code>
                  </article>
                ))}
              </div>
            </div>

            <div className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header">
                <span className="workspace-card__eyebrow">Stored traces</span>
                <h2>Recent evaluations</h2>
              </div>
              <div className="payroll-table-scroll payroll-table-scroll--compact">
                <table className="payroll-readiness-table payroll-setup-table payroll-rule-evaluation-table">
                  <thead>
                    <tr>
                      <th>Rule</th>
                      <th>Employee</th>
                      <th>Result</th>
                      <th>Dependencies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {setup.evaluations.map((evaluation) => {
                      const dependencies = evaluation.trace_snapshot.dependencies;
                      const dependencyText = Array.isArray(dependencies) ? dependencies.map(String).join(", ") : "Not captured";
                      return (
                        <tr key={evaluation.id}>
                          <td>
                            <strong>{evaluation.rule_name}</strong>
                            <span>{evaluation.rule_code}</span>
                          </td>
                          <td>{evaluation.employee_code || "Manual"}</td>
                          <td>{String(evaluation.result_snapshot.result ?? "Not captured")}</td>
                          <td>{dependencyText}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <RuleDetail rule={selectedRule} version={selectedVersion} evaluations={setup.evaluations} />
        </div>
      </section>

      <PayrollRuleOperationsPanel initialSetup={setup} selectedRule={selectedRule} selectedVersion={selectedVersion} />
    </main>
  );
}
