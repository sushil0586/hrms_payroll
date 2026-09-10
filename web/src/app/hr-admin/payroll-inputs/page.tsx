import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollInputSnapshotSetup } from "@/lib/api";
import type { HrAdminPayrollInputSnapshot, HrAdminPayrollRun } from "@/lib/types";
import { PayrollInputOperationsPanel } from "./payroll-input-operations-panel";

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

function RunRail({ runs, selectedRun }: { runs: HrAdminPayrollRun[]; selectedRun: HrAdminPayrollRun | null }) {
  return (
    <aside className="payroll-setup-rail payroll-input-run-rail">
      <div className="payroll-setup-panel__header">
        <span className="workspace-card__eyebrow">Runs</span>
        <h2>Input control</h2>
      </div>
      <div className="payroll-setup-card-list">
        {runs.map((run) => (
          <Link
            className={`payroll-setup-mini-card payroll-input-run-card ${selectedRun?.id === run.id ? "is-selected" : ""}`}
            href={`/hr-admin/payroll-inputs?runId=${run.id}`}
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
          </Link>
        ))}
      </div>
    </aside>
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
  const currentParams = (await searchParams) ?? {};
  const selectedRunId = normalizeParam(currentParams.runId);
  const selectedSnapshotId = normalizeParam(currentParams.snapshotId);
  const result = await getHrAdminPayrollInputSnapshotSetup();
  const setup = result.data;
  const selectedRun = setup.runs.find((item) => item.id === selectedRunId) ?? setup.runs[0] ?? null;
  const visibleSnapshots = selectedRun
    ? setup.snapshots.filter((item) => item.payroll_run_id === selectedRun.id)
    : setup.snapshots;
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
          <RunRail runs={setup.runs} selectedRun={selectedRun} />

          <div className="payroll-setup-main-panel">
            <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
              <div>
                <span className="workspace-card__eyebrow">Employee snapshots</span>
                <h2>{selectedRun ? selectedRun.name : "All payroll runs"}</h2>
              </div>
              {selectedRun ? <StatusBadge status={selectedRun.status} /> : null}
            </div>

            <div className="payroll-table-scroll">
              <table className="payroll-readiness-table payroll-setup-table payroll-input-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Status</th>
                    <th>Pay group</th>
                    <th>Salary</th>
                    <th>Attendance</th>
                    <th>Issues</th>
                    <th>Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSnapshots.map((snapshot) => (
                    <tr className={selectedSnapshot?.id === snapshot.id ? "is-selected" : ""} key={snapshot.id}>
                      <td>
                        <Link href={`/hr-admin/payroll-inputs?runId=${snapshot.payroll_run_id}&snapshotId=${snapshot.id}`}>
                          <strong>{snapshot.employee_name}</strong>
                          <span>{snapshot.employee_code}</span>
                        </Link>
                      </td>
                      <td><StatusBadge status={snapshot.snapshot_status} /></td>
                      <td>{snapshot.pay_group_name || "Missing"}</td>
                      <td>{snapshot.salary_structure_name || "Missing"}</td>
                      <td>{String(snapshot.attendance_snapshot.present_days ?? 0)}/{String(snapshot.attendance_snapshot.working_days ?? 0)}</td>
                      <td>{snapshot.blockers.length + snapshot.warnings.length}</td>
                      <td><code>{snapshot.source_hash.slice(0, 10)}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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

      <PayrollInputOperationsPanel initialSetup={setup} selectedRun={selectedRun} selectedSnapshot={selectedSnapshot} />
    </main>
  );
}
