import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollInputSnapshots, getHrAdminPayrollInputSnapshotSetup } from "@/lib/api";
import type { HrAdminPayrollInputSnapshot, HrAdminPayrollRun } from "@/lib/types";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { PayrollCycleJourney } from "../payroll-cycle-journey";
import { PayrollWorkflowGuide } from "../payroll-workflow-guide";
import { PayrollInputOperationsPanel } from "./payroll-input-operations-panel";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};
type PageSize = 10 | 25 | 50;

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
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
    pageSize,
    totalPages,
  };
}

function inputHref(currentParams: Record<string, SearchParamValue>, overrides: Record<string, string | number | undefined>) {
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
  return `/hr-admin/payroll-inputs${query ? `?${query}` : ""}`;
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
            href={inputHref(currentParams, { [pageSizeParam]: size, [pageParam]: 1 })}
            key={size}
          >
            {size}
          </Link>
        ))}
      </div>
      <div className="payroll-setup-pagination__actions">
        <Link aria-disabled={page === 1} className="button button--secondary button--compact" href={inputHref(currentParams, { [pageParam]: 1 })}>First</Link>
        <Link aria-disabled={page === 1} className="button button--secondary button--compact" href={inputHref(currentParams, { [pageParam]: Math.max(1, page - 1) })}>Previous</Link>
        <Link aria-disabled={page === totalPages} className="button button--secondary button--compact" href={inputHref(currentParams, { [pageParam]: Math.min(totalPages, page + 1) })}>Next</Link>
        <Link aria-disabled={page === totalPages} className="button button--secondary button--compact" href={inputHref(currentParams, { [pageParam]: totalPages })}>Last</Link>
      </div>
    </nav>
  );
}

function CompactSnapshotRows({ snapshot }: { snapshot: Record<string, unknown> }) {
  const entries = Object.entries(snapshot).slice(0, 4);
  if (!entries.length) {
    return <span className="muted">Empty snapshot</span>;
  }
  return (
    <div className="payroll-input-source-list">
      {entries.map(([key, value]) => (
        <div className="detail-row" key={key}>
          <span className="detail-label">{titleCase(key)}</span>
          <span className="detail-value">{String(value ?? "Missing")}</span>
        </div>
      ))}
    </div>
  );
}

function RunRail({
  currentParams,
  page,
  pageSize,
  runs,
  selectedRun,
}: {
  currentParams: Record<string, SearchParamValue>;
  page: number;
  pageSize: PageSize;
  runs: HrAdminPayrollRun[];
  selectedRun: HrAdminPayrollRun | null;
}) {
  const pagedRuns = paginate(runs, page, pageSize);

  return (
    <aside className="payroll-setup-rail payroll-input-run-rail">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Runs</span>
          <h2>Input control</h2>
        </div>
        <span className="payroll-setup-count">{runs.length}</span>
      </div>
      <div className="payroll-setup-card-list">
        {pagedRuns.items.map((run) => (
          <Link
            className={`payroll-setup-mini-card payroll-input-run-card ${selectedRun?.id === run.id ? "is-selected" : ""}`}
            href={inputHref(currentParams, { runId: run.id, snapshotId: undefined, snapshotPage: 1 })}
            key={run.id}
          >
            <div>
              <strong>{run.name}</strong>
              <span>{run.period_name} / {run.pay_group_name || "All groups"}</span>
            </div>
            <StatusBadge status={run.status} />
            <div className="payroll-input-run-card__counts">
              <span>{run.snapshot_count} snapshots</span>
              <span>{run.locked_count} locked</span>
              <span>{run.blocked_count} blocked</span>
            </div>
            <code>{run.input_profile_ref}</code>
            {selectedRun?.id === run.id ? <span className="payroll-rule-selected-marker">Selected run</span> : null}
          </Link>
        ))}
      </div>
      {runs.length > pageSize ? (
        <PaginationControls
          ariaLabel="payroll input run pagination"
          currentParams={currentParams}
          page={pagedRuns.page}
          pageParam="runPage"
          pageSize={pagedRuns.pageSize}
          pageSizeParam="runSize"
          totalPages={pagedRuns.totalPages}
        />
      ) : null}
    </aside>
  );
}

function SnapshotCard({
  currentParams,
  selected,
  snapshot,
}: {
  currentParams: Record<string, SearchParamValue>;
  selected: boolean;
  snapshot: HrAdminPayrollInputSnapshot;
}) {
  const issueCount = snapshot.blockers.length + snapshot.warnings.length;

  return (
    <article className={`payroll-input-snapshot-card ${selected ? "is-selected" : ""}`}>
      <div className="payroll-input-snapshot-card__header">
        <div>
          <h3>{snapshot.employee_name}</h3>
          <p>{snapshot.employee_code} / {snapshot.pay_group_name || "No pay group"}</p>
        </div>
        <StatusBadge status={snapshot.snapshot_status} />
      </div>
      <div className="payroll-input-snapshot-card__meta">
        <span><strong>Salary</strong>{snapshot.salary_structure_name || "Missing"}</span>
        <span><strong>Attendance</strong>{String(snapshot.attendance_snapshot.present_days ?? 0)}/{String(snapshot.attendance_snapshot.working_days ?? 0)}</span>
        <span><strong>Issues</strong>{issueCount}</span>
      </div>
      <div className="payroll-input-snapshot-card__footer">
        <code>{snapshot.source_hash.slice(0, 16)}</code>
        <Link
          className="button button--secondary button--compact"
          href={inputHref(currentParams, { runId: snapshot.payroll_run_id, snapshotId: snapshot.id })}
        >
          Inspect
        </Link>
      </div>
      {selected ? <span className="payroll-rule-selected-marker">Selected for detail</span> : null}
    </article>
  );
}

function SnapshotDetail({ snapshot }: { snapshot: HrAdminPayrollInputSnapshot | null }) {
  if (!snapshot) {
    return (
      <aside className="payroll-setup-detail-panel payroll-input-detail-panel">
        <div className="payroll-setup-panel__header">
          <span className="workspace-card__eyebrow">Snapshot trace</span>
          <h2>No employee selected</h2>
        </div>
        <p className="section-copy section-copy-soft">Select a snapshot to inspect locked source families.</p>
      </aside>
    );
  }

  const issueList = [...snapshot.blockers, ...snapshot.warnings];
  const sourceFamilies = [
    { label: "Employee", snapshot: snapshot.employee_snapshot },
    { label: "Organization", snapshot: snapshot.organization_snapshot },
    { label: "Salary", snapshot: snapshot.salary_snapshot },
    { label: "Attendance", snapshot: snapshot.attendance_snapshot },
    { label: "Leave", snapshot: snapshot.leave_snapshot },
    { label: "Lifecycle", snapshot: snapshot.lifecycle_snapshot },
    { label: "Documents", snapshot: snapshot.document_snapshot },
    { label: "Banking", snapshot: snapshot.banking_snapshot },
  ];

  return (
    <aside className="payroll-setup-detail-panel payroll-input-detail-panel" aria-label={`${snapshot.employee_name} payroll input snapshot`}>
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Snapshot trace</span>
          <h2>{snapshot.employee_name}</h2>
          <p className="section-copy section-copy-soft">{snapshot.employee_code} / {snapshot.pay_group_name || "No pay group"}</p>
        </div>
        <StatusBadge status={snapshot.snapshot_status} />
      </div>

      <div className="detail-grid">
        <div className="detail-row"><span className="detail-label">Period</span><span className="detail-value">{formatDate(snapshot.period_start)} - {formatDate(snapshot.period_end)}</span></div>
        <div className="detail-row"><span className="detail-label">Salary</span><span className="detail-value">{snapshot.salary_structure_name || "Missing"}</span></div>
        <div className="detail-row"><span className="detail-label">Collected</span><span className="detail-value">{formatDate(snapshot.source_collected_at)}</span></div>
        <div className="detail-row"><span className="detail-label">Locked</span><span className="detail-value">{formatDate(snapshot.locked_at)}</span></div>
      </div>

      <div className="payroll-input-hash-block">
        <span className="workspace-card__eyebrow">Source hash</span>
        <code>{snapshot.source_hash}</code>
      </div>

      <div className="payroll-issue-stack">
        {issueList.length ? (
          issueList.map((issue) => (
            <div className="notice notice--compact" key={issue}>
              <strong>{snapshot.blockers.includes(issue) ? "Blocker" : "Warning"}</strong>
              <span className="muted">{issue}</span>
            </div>
          ))
        ) : (
          <div className="notice notice--compact notice--success">
            <strong>Ready</strong>
            <span className="muted">No blockers or warnings in this snapshot.</span>
          </div>
        )}
      </div>

      <div className="payroll-input-source-grid">
        {sourceFamilies.map((family) => (
          <section className="payroll-input-source-card" key={family.label}>
            <span className="workspace-card__eyebrow">{family.label}</span>
            <CompactSnapshotRows snapshot={family.snapshot} />
          </section>
        ))}
      </div>
    </aside>
  );
}

export default async function HrAdminPayrollInputsPage({ searchParams }: PageProps) {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["payroll.inputs.view", "payroll.inputs.manage"], fallbackPath: "/hr-admin" });
  const canManageInputs = sessionHasPermission(sessionUser, "payroll.inputs.manage");
  const canLockInputs = sessionHasPermission(sessionUser, "payroll.lock");
  const currentParams = (await searchParams) ?? {};
  const selectedRunId = normalizeParam(currentParams.runId);
  const selectedSnapshotId = normalizeParam(currentParams.snapshotId);
  const runPage = parsePositiveInteger(currentParams.runPage, 1);
  const runSize = normalizePageSize(currentParams.runSize);
  const snapshotPage = parsePositiveInteger(currentParams.snapshotPage, 1);
  const snapshotSize = normalizePageSize(currentParams.snapshotSize);
  const result = await getHrAdminPayrollInputSnapshotSetup();
  const selectedRunSnapshotsResult = selectedRunId
    ? await getHrAdminPayrollInputSnapshots({ payroll_run_id: selectedRunId })
    : null;
  const setup = selectedRunSnapshotsResult
    ? {
        ...result.data,
        snapshots: [
          ...selectedRunSnapshotsResult.data,
          ...result.data.snapshots.filter((snapshot) => !selectedRunSnapshotsResult.data.some((selected) => selected.id === snapshot.id)),
        ],
      }
    : result.data;
  const selectedRun = setup.runs.find((item) => item.id === selectedRunId) ?? setup.runs[0] ?? null;
  const visibleSnapshots = selectedRun
    ? setup.snapshots.filter((item) => item.payroll_run_id === selectedRun.id)
    : setup.snapshots;
  const pagedSnapshots = paginate(visibleSnapshots, snapshotPage, snapshotSize);
  const selectedSnapshot =
    visibleSnapshots.find((item) => item.id === selectedSnapshotId) ??
    visibleSnapshots[0] ??
    null;

  return (
    <main className="shell shell--payroll-setup shell--payroll-inputs">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll phase 1C" : "Demo payroll phase 1C"}
        title="Payroll Inputs"
        description="Immutable period snapshots across employee, organization, salary, attendance, leave, lifecycle, documents, and banking."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/payroll-readiness">
              Readiness
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-setup">
              Payroll Setup
            </Link>
            <Link className="button button--secondary" href="/hr-admin/salary-setup">
              Salary Setup
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-rules">
              Rules
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-calculations">
              Calculations
            </Link>
          </>
        }
        pills={["Snapshot based", "Input locked", "Rule referenced"]}
        showPills
      />

      <PayrollCycleJourney
        current="inputs"
        selectedRunName={selectedRun?.name}
        selectedRunStatus={selectedRun?.status}
        primaryMetricLabel="snapshots"
        primaryMetricValue={selectedRun?.snapshot_count ?? setup.summary.snapshot_count}
        secondaryMetricLabel="locked"
        secondaryMetricValue={selectedRun?.locked_count ?? setup.summary.locked_snapshot_count}
      />

      <PayrollWorkflowGuide
        title="Input snapshot review"
        description="Choose one payroll run, inspect employee source snapshots, then lock inputs only after blockers are clear."
        steps={[
          { label: "Select run", detail: "Scope the period and pay group snapshot set." },
          { label: "Inspect employee", detail: "Open one snapshot to verify source evidence." },
          { label: "Lock inputs", detail: "Use operations after warnings and blockers are understood." },
        ]}
      />

      <section className="section section--tight">
        <div className="metric-grid-modern payroll-setup-metrics">
          <MetricTile className="metric-tile-soft" label="Runs" value={setup.summary.run_count} trend={`${setup.summary.collecting_run_count} collecting`} />
          <MetricTile className="metric-tile-soft" label="Snapshots" value={setup.summary.snapshot_count} trend="Period scoped" />
          <MetricTile className="metric-tile-soft" label="Locked inputs" value={setup.summary.locked_snapshot_count} trend={`${setup.summary.inputs_locked_run_count} locked runs`} />
          <MetricTile className="metric-tile-soft" label="Blocked" value={setup.summary.blocked_snapshot_count} trend="Must clear before lock" />
        </div>
      </section>

      <section className="section section--tight">
        <div className="payroll-setup-workspace payroll-input-workspace">
          <RunRail currentParams={currentParams} page={runPage} pageSize={runSize} runs={setup.runs} selectedRun={selectedRun} />

          <div className="payroll-setup-main-panel">
            <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
              <div>
                <span className="workspace-card__eyebrow">Employee snapshots</span>
                <h2>{selectedRun ? selectedRun.name : "All payroll runs"}</h2>
              </div>
              {selectedRun ? <StatusBadge status={selectedRun.status} /> : null}
            </div>

            <div className="payroll-input-snapshot-list">
              {pagedSnapshots.items.length ? (
                pagedSnapshots.items.map((snapshot) => (
                  <SnapshotCard
                    currentParams={currentParams}
                    key={snapshot.id}
                    selected={selectedSnapshot?.id === snapshot.id}
                    snapshot={snapshot}
                  />
                ))
              ) : (
                <div className="payroll-setup-empty-state">
                  <strong>No input snapshots</strong>
                  <span>Collect and lock inputs from the actions panel before calculation.</span>
                </div>
              )}
            </div>

            {visibleSnapshots.length > snapshotSize ? (
              <PaginationControls
                ariaLabel="payroll input snapshot pagination"
                currentParams={currentParams}
                page={pagedSnapshots.page}
                pageParam="snapshotPage"
                pageSize={pagedSnapshots.pageSize}
                pageSizeParam="snapshotSize"
                totalPages={pagedSnapshots.totalPages}
              />
            ) : null}

            <div className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Run guardrails</span>
                  <h2>Lock readiness</h2>
                </div>
                <span className="payroll-setup-count">{visibleSnapshots.length} employees</span>
              </div>
              <div className="payroll-input-lock-grid">
                <div className="detail-row"><span className="detail-label">Input profile</span><span className="detail-value">{selectedRun?.input_profile_ref || "Not selected"}</span></div>
                <div className="detail-row"><span className="detail-label">Snapshot schema</span><span className="detail-value">{selectedRun?.snapshot_schema_ref || "Not selected"}</span></div>
                <div className="detail-row"><span className="detail-label">Ready</span><span className="detail-value">{selectedRun?.ready_count ?? 0}</span></div>
                <div className="detail-row"><span className="detail-label">Warnings</span><span className="detail-value">{selectedRun?.warning_count ?? 0}</span></div>
                <div className="detail-row"><span className="detail-label">Blocked</span><span className="detail-value">{selectedRun?.blocked_count ?? 0}</span></div>
                <div className="detail-row"><span className="detail-label">Locked</span><span className="detail-value">{selectedRun?.locked_count ?? 0}</span></div>
              </div>
            </div>
          </div>

          <SnapshotDetail snapshot={selectedSnapshot} />
        </div>
      </section>

      <PayrollInputOperationsPanel
        initialSetup={setup}
        selectedRun={selectedRun}
        selectedSnapshot={selectedSnapshot}
        canManageInputs={canManageInputs}
        canLockInputs={canLockInputs}
      />
    </main>
  );
}
