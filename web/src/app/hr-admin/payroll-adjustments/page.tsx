import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollAdjustmentSetup } from "@/lib/api";
import type { HrAdminPayrollAdjustment, HrAdminPayrollRun } from "@/lib/types";
import { PayrollAdjustmentActionsPanel } from "./payroll-adjustment-actions-panel";

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
        <h2>Adjustment runs</h2>
      </div>
      <div className="payroll-setup-card-list">
        {runs.map((run) => (
          <Link
            className={`payroll-setup-mini-card payroll-adjustment-run-card ${selectedRun?.id === run.id ? "is-selected" : ""}`}
            href={`/hr-admin/payroll-adjustments?runId=${run.id}`}
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

function AdjustmentDetail({ adjustment }: { adjustment: HrAdminPayrollAdjustment | null }) {
  if (!adjustment) {
    return (
      <aside className="payroll-setup-detail-panel payroll-adjustment-detail-panel">
        <div className="payroll-setup-panel__header">
          <span className="workspace-card__eyebrow">Adjustment detail</span>
          <h2>No adjustment selected</h2>
        </div>
        <p className="section-copy section-copy-soft">Select a one-time payroll input to inspect approval state, profile references, and source evidence.</p>
      </aside>
    );
  }

  return (
    <aside className="payroll-setup-detail-panel payroll-adjustment-detail-panel" aria-label={`${adjustment.component_name} payroll adjustment`}>
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Adjustment detail</span>
          <h2>{adjustment.component_name}</h2>
          <p className="section-copy section-copy-soft">{adjustment.employee_name} / {adjustment.employee_code}</p>
        </div>
        <StatusBadge status={adjustment.status} />
      </div>

      <div className="payroll-output-net-block payroll-adjustment-amount-block">
        <span className="workspace-card__eyebrow">Adjustment amount</span>
        <strong>{formatMoney(adjustment.amount, adjustment.currency_code)}</strong>
        <span>{adjustment.kind_label} / {adjustment.direction_label}</span>
      </div>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Approval timeline</span>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Submitted</span><span className="detail-value">{formatDate(adjustment.submitted_at)}</span></div>
          <div className="detail-row"><span className="detail-label">Approved</span><span className="detail-value">{formatDate(adjustment.approved_at)}</span></div>
          <div className="detail-row"><span className="detail-label">Applied</span><span className="detail-value">{formatDate(adjustment.applied_at)}</span></div>
          <div className="detail-row"><span className="detail-label">Effective</span><span className="detail-value">{formatDate(adjustment.effective_date)}</span></div>
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Configuration</span>
        <div className="payroll-rule-snapshot-list">
          <div className="detail-row"><span className="detail-label">Adjustment profile</span><span className="detail-value">{adjustment.adjustment_profile_ref}</span></div>
          <div className="detail-row"><span className="detail-label">Approval profile</span><span className="detail-value">{adjustment.approval_profile_ref || "None"}</span></div>
          <div className="detail-row"><span className="detail-label">Source ref</span><span className="detail-value">{adjustment.source_ref || "None"}</span></div>
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Source hash</span>
        <code>{adjustment.source_hash}</code>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Reason</span>
        <p className="section-copy section-copy-soft">{adjustment.reason || "No reason captured."}</p>
      </section>
    </aside>
  );
}

export default async function HrAdminPayrollAdjustmentsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const selectedRunId = normalizeParam(currentParams.runId);
  const selectedAdjustmentId = normalizeParam(currentParams.adjustmentId);
  const result = await getHrAdminPayrollAdjustmentSetup();
  const setup = result.data;
  const selectedRun = setup.runs.find((item) => item.id === selectedRunId) ?? setup.runs.find((item) => item.status === "inputs_locked") ?? setup.runs[0] ?? null;
  const visibleAdjustments = selectedRun ? setup.adjustments.filter((item) => item.payroll_run_id === selectedRun.id) : setup.adjustments;
  const selectedAdjustment = visibleAdjustments.find((item) => item.id === selectedAdjustmentId) ?? visibleAdjustments[0] ?? null;

  return (
    <main className="shell shell--payroll-setup shell--payroll-adjustments">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll phase 4A" : "Demo payroll phase 4A"}
        title="Payroll Adjustments"
        description="Control one-time payroll inputs for arrears, bonuses, reimbursements, loans, advances, deductions, corrections, and settlement preparation."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/payroll-inputs">
              Inputs
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-calculations">
              Calculations
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-settlements">
              Settlements
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-review">
              Review
            </Link>
          </>
        }
        pills={["Approval controlled", "Source hashed", "Settlement ready"]}
        showPills
      />

      <section className="section section--tight">
        <div className="metric-grid-modern payroll-setup-metrics">
          <MetricTile className="metric-tile-soft" label="Adjustments" value={setup.summary.adjustment_count} trend={`${setup.summary.applied_count} applied`} />
          <MetricTile className="metric-tile-soft" label="Submitted" value={setup.summary.submitted_count} trend={`${setup.summary.approved_count} approved`} />
          <MetricTile className="metric-tile-soft" label="Draft" value={setup.summary.draft_count} trend="Needs review" />
          <MetricTile className="metric-tile-soft" label="Total value" value={formatMoney(setup.summary.total_amount)} trend="All directions" />
        </div>
      </section>

      <section className="section section--tight">
        <div className="payroll-setup-workspace payroll-adjustment-workspace">
          <RunRail runs={setup.runs} selectedRun={selectedRun} />

          <div className="payroll-setup-main-panel">
            <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
              <div>
                <span className="workspace-card__eyebrow">Adjustment control</span>
                <h2>{selectedRun?.name ?? "No payroll run"}</h2>
              </div>
              {selectedRun ? <StatusBadge status={selectedRun.status} /> : null}
            </div>

            <div className="payroll-calc-total-grid payroll-adjustment-total-grid">
              <article>
                <span>Total value</span>
                <strong>{formatMoney(visibleAdjustments.reduce((sum, item) => sum + Number(item.amount), 0))}</strong>
              </article>
              <article>
                <span>Applied</span>
                <strong>{visibleAdjustments.filter((item) => item.status === "applied").length}</strong>
              </article>
              <article>
                <span>Approved</span>
                <strong>{visibleAdjustments.filter((item) => item.status === "approved").length}</strong>
              </article>
              <article>
                <span>Pending</span>
                <strong>{visibleAdjustments.filter((item) => item.status === "draft" || item.status === "submitted").length}</strong>
              </article>
            </div>

            <section className="payroll-setup-assignment-panel payroll-adjustment-profile-panel">
              <div className="payroll-setup-panel__header">
                <span className="workspace-card__eyebrow">Config scope</span>
                <h2>Adjustment input controls</h2>
              </div>
              <div className="payroll-output-handoff-grid payroll-adjustment-control-grid">
                <article>
                  <strong>One-time inputs</strong>
                  <span>Bonus, arrear, reimbursement, loan, advance, deduction, correction, and settlement kinds are configured by type.</span>
                </article>
                <article>
                  <strong>Approval profile</strong>
                  <span>Each adjustment can carry a dedicated approval profile reference.</span>
                </article>
                <article>
                  <strong>Calculation prep</strong>
                  <span>Applied adjustments are source-hashed and consumed by draft payroll calculations.</span>
                </article>
              </div>
            </section>

            <PayrollAdjustmentActionsPanel setup={setup} selectedRun={selectedRun} selectedAdjustment={selectedAdjustment} />

            <div className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Adjustment register</span>
                  <h2>One-time payroll inputs</h2>
                </div>
                <span className="payroll-setup-count">{visibleAdjustments.length} records</span>
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-adjustment-table">
                  <thead>
                    <tr>
                      <th>Adjustment</th>
                      <th>Employee</th>
                      <th>Kind</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Profile</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAdjustments.map((adjustment) => (
                      <tr className={selectedAdjustment?.id === adjustment.id ? "is-selected" : ""} key={adjustment.id}>
                        <td>
                          <Link href={`/hr-admin/payroll-adjustments?runId=${adjustment.payroll_run_id}&adjustmentId=${adjustment.id}`}>
                            <strong>{adjustment.component_name}</strong>
                            <span>{adjustment.component_code}</span>
                          </Link>
                        </td>
                        <td>
                          <strong>{adjustment.employee_name}</strong>
                          <span>{adjustment.employee_code}</span>
                        </td>
                        <td><StatusBadge status={adjustment.kind} /></td>
                        <td>{formatMoney(adjustment.amount, adjustment.currency_code)}</td>
                        <td><StatusBadge status={adjustment.status} /></td>
                        <td><code>{adjustment.adjustment_profile_ref}</code></td>
                        <td><code>{adjustment.source_hash.slice(0, 12)}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <AdjustmentDetail adjustment={selectedAdjustment} />
        </div>
      </section>
    </main>
  );
}
