import Link from "next/link";
import type { ReactNode } from "react";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollRulesSetup } from "@/lib/api";
import type { HrAdminPayrollRuleDefinition, HrAdminPayrollRuleEvaluation, HrAdminPayrollRulesSetupResponse, HrAdminPayrollRuleVersion } from "@/lib/types";
import { PayrollRuleOperationsPanel } from "./payroll-rule-operations-panel";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

type PayrollRuleTab = "overview" | "rules" | "versions" | "trace" | "actions";
type PageSize = 10 | 25 | 50;
type PayrollRuleInputSnapshot = HrAdminPayrollRulesSetupResponse["options"]["input_snapshots"][number];

const RULE_TABS: Array<{ key: PayrollRuleTab; label: string; detail: string }> = [
  { key: "overview", label: "Overview", detail: "Rule engine summary" },
  { key: "rules", label: "Rules", detail: "Definitions and tags" },
  { key: "versions", label: "Versions", detail: "Expressions and dates" },
  { key: "trace", label: "Trace", detail: "Snapshots and previews" },
  { key: "actions", label: "Setup Actions", detail: "Create and edit rules" },
];

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeTab(value: SearchParamValue): PayrollRuleTab {
  const raw = normalizeParam(value);
  return RULE_TABS.some((tab) => tab.key === raw) ? (raw as PayrollRuleTab) : "overview";
}

function parsePositiveInteger(value: SearchParamValue, fallback: number) {
  const parsed = Number.parseInt(normalizeParam(value) ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePageSize(value: SearchParamValue): PageSize {
  const parsed = parsePositiveInteger(value, 10);
  return parsed === 25 || parsed === 50 ? parsed : 10;
}

function paginate<T>(items: T[], page: number, pageSize: PageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    pageSize,
  };
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

function ruleHref(currentParams: Record<string, SearchParamValue>, overrides: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(currentParams)) {
    const normalized = normalizeParam(value);
    if (normalized) {
      params.set(key, normalized);
    }
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return `/hr-admin/payroll-rules${query ? `?${query}` : ""}`;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`readiness-badge readiness-badge--${status}`}>{titleCase(status)}</span>;
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="payroll-setup-empty-state">
      <strong>{title}</strong>
      <span>{detail}</span>
      {action}
    </div>
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

function PaginationControls({
  ariaLabel,
  currentParams,
  page,
  pageParam,
  pageSize,
  pageSizeParam,
  totalPages,
}: {
  ariaLabel: string;
  currentParams: Record<string, SearchParamValue>;
  page: number;
  pageParam: string;
  pageSize: PageSize;
  pageSizeParam: string;
  totalPages: number;
}) {
  return (
    <nav aria-label={ariaLabel} className="payroll-setup-pagination">
      <span>{page} of {totalPages}</span>
      <div className="payroll-setup-pagination__sizes">
        {[10, 25, 50].map((size) => (
          <Link
            aria-current={pageSize === size ? "page" : undefined}
            className="button button--secondary button--compact"
            href={ruleHref(currentParams, { [pageSizeParam]: size, [pageParam]: 1 })}
            key={size}
          >
            {size}
          </Link>
        ))}
      </div>
      <div className="payroll-setup-pagination__actions">
        <Link aria-disabled={page === 1} className="button button--secondary button--compact" href={ruleHref(currentParams, { [pageParam]: 1 })}>First</Link>
        <Link aria-disabled={page === 1} className="button button--secondary button--compact" href={ruleHref(currentParams, { [pageParam]: Math.max(1, page - 1) })}>Previous</Link>
        <Link aria-disabled={page === totalPages} className="button button--secondary button--compact" href={ruleHref(currentParams, { [pageParam]: Math.min(totalPages, page + 1) })}>Next</Link>
        <Link aria-disabled={page === totalPages} className="button button--secondary button--compact" href={ruleHref(currentParams, { [pageParam]: totalPages })}>Last</Link>
      </div>
    </nav>
  );
}

function PayrollRuleTabs({ activeTab, currentParams }: { activeTab: PayrollRuleTab; currentParams: Record<string, SearchParamValue> }) {
  return (
    <nav aria-label="Payroll rule sections" className="payroll-setup-tabs">
      {RULE_TABS.map((tab) => (
        <Link
          aria-current={activeTab === tab.key ? "page" : undefined}
          className={`payroll-setup-tab${activeTab === tab.key ? " payroll-setup-tab--active" : ""}`}
          href={ruleHref(currentParams, { tab: tab.key })}
          key={tab.key}
        >
          <strong>{tab.label}</strong>
          <span>{tab.detail}</span>
        </Link>
      ))}
    </nav>
  );
}

function PayrollRuleWorkbenchGuide({
  title,
  detail,
  steps,
}: {
  title: string;
  detail: string;
  steps: Array<{ label: string; value: string }>;
}) {
  return (
    <section className="payroll-rule-workbench-guide" aria-label={title}>
      <div>
        <span className="workspace-card__eyebrow">Workbench guide</span>
        <h2>{title}</h2>
        <p className="section-copy section-copy-soft">{detail}</p>
      </div>
      <div className="payroll-rule-workbench-guide__steps">
        {steps.map((step, index) => (
          <div key={step.label}>
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
            <small>{step.value}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function RuleRail({
  currentParams,
  page,
  pageSize,
  rules,
  selectedRule,
}: {
  currentParams: Record<string, SearchParamValue>;
  page: number;
  pageSize: PageSize;
  rules: HrAdminPayrollRuleDefinition[];
  selectedRule: HrAdminPayrollRuleDefinition | null;
}) {
  const paged = paginate(rules, page, pageSize);

  return (
    <aside className="payroll-setup-rail payroll-rule-catalog">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Rules</span>
          <h2>Catalog</h2>
        </div>
        <span className="payroll-setup-count">{rules.length}</span>
      </div>
      <div className="payroll-setup-card-list">
        {paged.items.map((rule) => (
          <Link
            className={`payroll-setup-mini-card payroll-rule-card ${selectedRule?.id === rule.id ? "is-selected" : ""}`}
            href={ruleHref(currentParams, { tab: "versions", ruleId: rule.id, versionId: undefined })}
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
      {rules.length > pageSize ? (
        <PaginationControls
          ariaLabel="rule catalog pagination"
          currentParams={currentParams}
          page={paged.page}
          pageParam="ruleRailPage"
          pageSize={paged.pageSize}
          pageSizeParam="ruleRailSize"
          totalPages={paged.totalPages}
        />
      ) : null}
    </aside>
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

function RuleTable({
  currentParams,
  page,
  pageSize,
  rules,
  selectedRule,
}: {
  currentParams: Record<string, SearchParamValue>;
  page: number;
  pageSize: PageSize;
  rules: HrAdminPayrollRuleDefinition[];
  selectedRule: HrAdminPayrollRuleDefinition | null;
}) {
  const paged = paginate(rules, page, pageSize);

  return (
    <section className="payroll-setup-main-panel">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Definitions</span>
          <h2>Rule catalog</h2>
          <p className="section-copy section-copy-soft">Review formula, statutory, and proration rules before editing versions.</p>
        </div>
        <Link className="button button--primary" href={ruleHref(currentParams, { tab: "actions" }) + "#payroll-rule-definition-form"}>
          New rule
        </Link>
      </div>

      <div className="payroll-table-scroll">
        <table className="payroll-readiness-table payroll-setup-table payroll-rule-table">
          <thead>
            <tr>
              <th>Rule</th>
              <th>Type</th>
              <th>Active</th>
              <th>Versions</th>
              <th>Previews</th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {paged.items.length ? (
              paged.items.map((rule) => (
                <tr className={selectedRule?.id === rule.id ? "is-selected" : ""} key={rule.id}>
                  <td>
                    <Link href={ruleHref(currentParams, { tab: "versions", ruleId: rule.id })}>
                      <strong>{rule.name}</strong>
                      <span>{rule.code}</span>
                    </Link>
                  </td>
                  <td><StatusBadge status={rule.rule_type} /></td>
                  <td>{rule.active_version_count}</td>
                  <td>{rule.version_count}</td>
                  <td>{rule.evaluation_count}</td>
                  <td>
                    <div className="payroll-rule-card__tags">
                      {rule.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>
                  <EmptyState title="No rules yet" detail="Create rule definitions before adding effective-dated versions." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls
        ariaLabel="rules pagination"
        currentParams={currentParams}
        page={paged.page}
        pageParam="rulePage"
        pageSize={paged.pageSize}
        pageSizeParam="ruleSize"
        totalPages={paged.totalPages}
      />
    </section>
  );
}

function VersionTable({
  currentParams,
  page,
  pageSize,
  selectedRule,
  selectedVersion,
  versions,
}: {
  currentParams: Record<string, SearchParamValue>;
  page: number;
  pageSize: PageSize;
  selectedRule: HrAdminPayrollRuleDefinition | null;
  selectedVersion: HrAdminPayrollRuleVersion | null;
  versions: HrAdminPayrollRuleVersion[];
}) {
  const paged = paginate(versions, page, pageSize);

  return (
    <section className="payroll-setup-main-panel">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Rule versions</span>
          <h2>{selectedRule ? selectedRule.name : "All versions"}</h2>
          <p className="section-copy section-copy-soft">Validate expression status, effective dates, language, rounding, and preview coverage.</p>
        </div>
        <Link className="button button--primary" href={ruleHref(currentParams, { tab: "actions" }) + "#payroll-rule-version-form"}>
          New version
        </Link>
      </div>

      {versions.length ? (
        <>
          <div className="payroll-rule-version-list" aria-label="Rule version drilldown list">
            {paged.items.map((version) => (
              <article className={`payroll-rule-version-card${selectedVersion?.id === version.id ? " is-selected" : ""}`} key={version.id}>
                <div className="payroll-rule-version-card__header">
                  <div>
                    <span className="workspace-card__eyebrow">Version {version.version}</span>
                    <h3>
                      <strong>{version.rule_name}</strong>
                    </h3>
                    <p>{version.rule_code} / {titleCase(version.rule_type)}</p>
                  </div>
                  <StatusBadge status={version.status} />
                </div>
                <div className="payroll-rule-version-card__meta">
                  <div><span>Effective</span><strong>{formatDate(version.effective_from)} - {formatDate(version.effective_to)}</strong></div>
                  <div><span>Language</span><strong>{version.expression_language_label}</strong></div>
                  <div><span>Previews</span><strong>{version.evaluation_count}</strong></div>
                </div>
                <code>{version.expression}</code>
                <div className="record-card__actions">
                  <Link className="button button--secondary button--compact" href={ruleHref(currentParams, { tab: "versions", ruleId: version.rule_id, versionId: version.id })}>
                    Inspect
                  </Link>
                  <Link className="button button--primary button--compact" href={ruleHref(currentParams, { tab: "actions", ruleId: version.rule_id, versionId: version.id }) + "#payroll-rule-version-form"}>
                    Edit
                  </Link>
                </div>
                {selectedVersion?.id === version.id ? <span className="payroll-rule-selected-marker">Selected for detail</span> : null}
              </article>
            ))}
          </div>
          <PaginationControls
            ariaLabel="versions pagination"
            currentParams={currentParams}
            page={paged.page}
            pageParam="versionPage"
            pageSize={paged.pageSize}
            pageSizeParam="versionSize"
            totalPages={paged.totalPages}
          />
        </>
      ) : (
        <EmptyState title="No versions yet" detail="Create an active version before this rule can participate in calculations." />
      )}
    </section>
  );
}

function TraceWorkspace({
  currentParams,
  evaluations,
  evaluationPage,
  evaluationSize,
  selectedEvaluation,
  snapshotPage,
  snapshotSize,
  snapshots,
}: {
  currentParams: Record<string, SearchParamValue>;
  evaluations: HrAdminPayrollRuleEvaluation[];
  evaluationPage: number;
  evaluationSize: PageSize;
  selectedEvaluation: HrAdminPayrollRuleEvaluation | null;
  snapshotPage: number;
  snapshotSize: PageSize;
  snapshots: PayrollRuleInputSnapshot[];
}) {
  const pagedEvaluations = paginate(evaluations, evaluationPage, evaluationSize);
  const pagedSnapshots = paginate(snapshots, snapshotPage, snapshotSize);

  return (
    <div className="payroll-rule-trace-workspace">
      <div className="payroll-rule-review-stack">
        <section className="payroll-setup-main-panel">
          <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
            <div>
              <span className="workspace-card__eyebrow">Preview inputs</span>
              <h2>Locked snapshot options</h2>
              <p className="section-copy section-copy-soft">Use immutable payroll input snapshots when previewing formula behavior.</p>
            </div>
            <span className="payroll-setup-count">{snapshots.length} snapshots</span>
          </div>
          {snapshots.length ? (
            <>
              <div className="payroll-rule-preview-grid">
                {pagedSnapshots.items.map((snapshot) => (
                  <article className="payroll-rule-source-card" key={snapshot.id}>
                    <strong>{snapshot.employee_name}</strong>
                    <span>{snapshot.employee_code} / {snapshot.payroll_run_name}</span>
                    <code>{snapshot.source_hash}</code>
                  </article>
                ))}
              </div>
              <PaginationControls
                ariaLabel="snapshots pagination"
                currentParams={currentParams}
                page={pagedSnapshots.page}
                pageParam="snapshotPage"
                pageSize={pagedSnapshots.pageSize}
                pageSizeParam="snapshotSize"
                totalPages={pagedSnapshots.totalPages}
              />
            </>
          ) : (
            <EmptyState title="No locked snapshots" detail="Lock payroll inputs before using trace previews." />
          )}
        </section>

        <section className="payroll-setup-main-panel">
          <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
            <div>
              <span className="workspace-card__eyebrow">Stored traces</span>
              <h2>Recent evaluations</h2>
              <p className="section-copy section-copy-soft">Review prior preview results and dependency traces without opening setup forms.</p>
            </div>
            <span className="payroll-setup-count">{evaluations.length} traces</span>
          </div>

          {evaluations.length ? (
            <>
              <div className="payroll-rule-evaluation-list" aria-label="Evaluation drilldown list">
                {pagedEvaluations.items.map((evaluation) => {
                    const dependencies = evaluation.trace_snapshot.dependencies;
                    const dependencyList = Array.isArray(dependencies) ? dependencies.map(String).slice(0, 4) : [];
                    return (
                      <article className={`payroll-rule-evaluation-card${selectedEvaluation?.id === evaluation.id ? " is-selected" : ""}`} key={evaluation.id}>
                        <div className="payroll-rule-evaluation-card__header">
                          <div>
                            <span className="workspace-card__eyebrow">{evaluation.employee_code || "Manual context"}</span>
                            <h3>{evaluation.rule_name}</h3>
                            <p>{evaluation.rule_code} / {titleCase(evaluation.rule_type)}</p>
                          </div>
                          <Link className="button button--secondary button--compact" href={ruleHref(currentParams, { tab: "trace", evaluationId: evaluation.id })}>
                            Inspect
                          </Link>
                        </div>
                        <div className="payroll-rule-evaluation-card__meta">
                          <div><span>Result</span><strong>{String(evaluation.result_snapshot.result ?? "Not captured")}</strong></div>
                          <div><span>Employee</span><strong>{evaluation.employee_name || evaluation.employee_code || "Manual"}</strong></div>
                          <div><span>Evaluated</span><strong>{formatDate(evaluation.created_at)}</strong></div>
                        </div>
                        <div className="payroll-rule-dependency-row">
                          {dependencyList.length ? dependencyList.map((dependency) => <span key={dependency}>{dependency}</span>) : <span>No dependencies captured</span>}
                        </div>
                        {selectedEvaluation?.id === evaluation.id ? <span className="payroll-rule-selected-marker">Selected for detail</span> : null}
                      </article>
                    );
                  })}
              </div>
              <PaginationControls
                ariaLabel="evaluations pagination"
                currentParams={currentParams}
                page={pagedEvaluations.page}
                pageParam="evaluationPage"
                pageSize={pagedEvaluations.pageSize}
                pageSizeParam="evaluationSize"
                totalPages={pagedEvaluations.totalPages}
              />
            </>
          ) : (
            <EmptyState title="No traces yet" detail="Preview rule versions to capture trace evidence." />
          )}
        </section>
      </div>

      <aside className="payroll-setup-detail-panel payroll-rule-trace-detail" aria-label="Evaluation trace detail">
        <div className="payroll-setup-panel__header">
          <span className="workspace-card__eyebrow">Trace detail</span>
          <h2>{selectedEvaluation ? selectedEvaluation.rule_name : "Select a trace"}</h2>
          <p className="section-copy section-copy-soft">
            {selectedEvaluation ? "Inspect the saved expression, inputs, result, and dependencies for this evaluation." : "Choose Inspect on an evaluation to review the full trace without crowding the list."}
          </p>
        </div>
        {selectedEvaluation ? (
          <>
            <div className="payroll-rule-expression-block">
              <span className="workspace-card__eyebrow">Expression</span>
              <code>{selectedEvaluation.expression}</code>
            </div>
            <section className="payroll-rule-source-card">
              <span className="workspace-card__eyebrow">Context</span>
              <SnapshotRows snapshot={selectedEvaluation.context_snapshot} />
            </section>
            <section className="payroll-rule-source-card">
              <span className="workspace-card__eyebrow">Result</span>
              <SnapshotRows snapshot={selectedEvaluation.result_snapshot} />
            </section>
            <section className="payroll-rule-source-card">
              <span className="workspace-card__eyebrow">Trace</span>
              <SnapshotRows snapshot={selectedEvaluation.trace_snapshot} />
            </section>
          </>
        ) : (
          <EmptyState title="No trace selected" detail="Open a stored evaluation to review its saved payload." />
        )}
      </aside>
    </div>
  );
}

export default async function HrAdminPayrollRulesPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const activeTab = normalizeTab(currentParams.tab);
  const selectedRuleId = normalizeParam(currentParams.ruleId);
  const selectedVersionId = normalizeParam(currentParams.versionId);
  const selectedEvaluationId = normalizeParam(currentParams.evaluationId);
  const rulePage = parsePositiveInteger(currentParams.rulePage, 1);
  const ruleSize = normalizePageSize(currentParams.ruleSize);
  const ruleRailPage = parsePositiveInteger(currentParams.ruleRailPage, 1);
  const ruleRailSize = normalizePageSize(currentParams.ruleRailSize);
  const versionPage = parsePositiveInteger(currentParams.versionPage, 1);
  const versionSize = normalizePageSize(currentParams.versionSize);
  const evaluationPage = parsePositiveInteger(currentParams.evaluationPage, 1);
  const evaluationSize = normalizePageSize(currentParams.evaluationSize);
  const snapshotPage = parsePositiveInteger(currentParams.snapshotPage, 1);
  const snapshotSize = normalizePageSize(currentParams.snapshotSize);

  const result = await getHrAdminPayrollRulesSetup();
  const setup = result.data;
  const selectedRule = setup.rules.find((item) => item.id === selectedRuleId) ?? setup.rules[0] ?? null;
  const selectedVersions = selectedRule ? setup.versions.filter((item) => item.rule_id === selectedRule.id) : setup.versions;
  const selectedVersion = selectedVersions.find((item) => item.id === selectedVersionId) ?? selectedVersions[0] ?? setup.versions[0] ?? null;
  const selectedEvaluation = setup.evaluations.find((item) => item.id === selectedEvaluationId) ?? setup.evaluations[0] ?? null;
  const activeRules = setup.rules.filter((rule) => rule.active_version_count > 0).length;

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
            <Link className="button button--secondary" href="/hr-admin/salary-setup">
              Salary Setup
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-setup">
              Payroll Setup
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-calculations">
              Calculations
            </Link>
            <Link className="button button--primary" href={ruleHref(currentParams, { tab: "actions" }) + "#payroll-rule-definition-form"}>
              Add rule
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
        <PayrollRuleTabs activeTab={activeTab} currentParams={currentParams} />
      </section>

      {activeTab === "overview" ? (
        <section className="section section--tight">
          <div className="payroll-setup-overview-grid">
            <article className="payroll-setup-summary-card">
              <span className="workspace-card__eyebrow">Current posture</span>
              <h2>Rule engine summary</h2>
              <p className="section-copy section-copy-soft">Keep formulas versioned, traceable, and linked to locked payroll input snapshots before calculation.</p>
              <div className="payroll-setup-summary-card__actions">
                <Link className="button button--primary" href={ruleHref(currentParams, { tab: "versions" })}>
                  Review versions
                </Link>
                <Link className="button button--secondary" href={ruleHref(currentParams, { tab: "trace" })}>
                  Open trace
                </Link>
              </div>
            </article>
            <article className="payroll-setup-summary-card">
              <span className="workspace-card__eyebrow">Coverage</span>
              <div className="payroll-setup-summary-grid">
                <div><strong>{activeRules}</strong><span>rules with active versions</span></div>
                <div><strong>{setup.summary.draft_version_count}</strong><span>draft versions</span></div>
                <div><strong>{setup.summary.evaluation_count}</strong><span>stored evaluations</span></div>
                <div><strong>{setup.summary.locked_snapshot_count}</strong><span>locked snapshots</span></div>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {activeTab === "rules" ? (
        <section className="section section--tight">
          <RuleTable currentParams={currentParams} page={rulePage} pageSize={ruleSize} rules={setup.rules} selectedRule={selectedRule} />
        </section>
      ) : null}

      {activeTab === "versions" ? (
        <section className="section section--tight">
          <PayrollRuleWorkbenchGuide
            title="Rule version review"
            detail="Pick a rule, inspect the active expression, then edit only when the selected version is correct."
            steps={[
              { label: "Choose rule", value: "Use the left catalog to scope versions." },
              { label: "Inspect version", value: "Review expression, status, and dates." },
              { label: "Trace or edit", value: "Use detail before changing setup." },
            ]}
          />
          <div className="payroll-setup-workspace payroll-rule-workspace">
            <RuleRail currentParams={currentParams} page={ruleRailPage} pageSize={ruleRailSize} rules={setup.rules} selectedRule={selectedRule} />
            <VersionTable currentParams={currentParams} page={versionPage} pageSize={versionSize} selectedRule={selectedRule} selectedVersion={selectedVersion} versions={selectedVersions} />
            <RuleDetail rule={selectedRule} version={selectedVersion} evaluations={setup.evaluations} />
          </div>
        </section>
      ) : null}

      {activeTab === "trace" ? (
        <section className="section section--tight">
          <PayrollRuleWorkbenchGuide
            title="Rule trace review"
            detail="Use locked input snapshots and stored evaluations to prove formula behavior without opening setup forms."
            steps={[
              { label: "Check inputs", value: "Confirm locked snapshots exist." },
              { label: "Inspect trace", value: "Open saved evaluations one at a time." },
              { label: "Validate evidence", value: "Compare context, result, and dependencies." },
            ]}
          />
          <TraceWorkspace currentParams={currentParams} evaluationPage={evaluationPage} evaluationSize={evaluationSize} evaluations={setup.evaluations} selectedEvaluation={selectedEvaluation} snapshotPage={snapshotPage} snapshotSize={snapshotSize} snapshots={setup.options.input_snapshots} />
        </section>
      ) : null}

      {activeTab === "actions" ? (
        <PayrollRuleOperationsPanel initialSetup={setup} selectedRule={selectedRule} selectedVersion={selectedVersion} />
      ) : null}
    </main>
  );
}
