import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import {
  getHrAdminAttendanceRecords,
  getHrAdminAttendanceRegularizations,
  getHrAdminLeaveRequests,
  getHrAdminPayrollAdjustmentSetup,
  getHrAdminPayrollInputSnapshotSetup,
  getHrAdminShiftRosterRollouts,
} from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (["ready", "low", "complete", "completed", "clear"].includes(normalized)) return "record-chip record-chip--success";
  if (["warning", "medium", "pending", "watch"].includes(normalized)) return "record-chip record-chip--warning";
  if (["blocked", "high", "conflict", "critical"].includes(normalized)) return "record-chip record-chip--danger";
  return "record-chip";
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function percent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

type JourneyStep = {
  label: string;
  status: string;
  summary: string;
  remediation: string;
  clearance: string;
  primaryHref: string;
  primaryLabel: string;
  reportHref?: string;
  reportLabel?: string;
};

type ReadinessItem = {
  label: string;
  status: string;
  detail: string;
  action: string;
  href: string;
};

function JourneyCard({ step }: { step: JourneyStep }) {
  return (
    <article className="payroll-input-source-card">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">{step.label}</span>
          <h2>{step.summary}</h2>
        </div>
        <span className={statusClass(step.status)}>{titleCase(step.status)}</span>
      </div>
      <div className="payroll-rule-snapshot-list" aria-label={`${step.label} clearance details`}>
        <div className="detail-row">
          <span className="detail-label">Clearance</span>
          <span className="detail-value">{step.clearance}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Action</span>
          <span className="detail-value">{step.remediation}</span>
        </div>
      </div>
      <div className="report-row-actions">
        <Link className="button button--secondary" href={step.primaryHref}>{step.primaryLabel}</Link>
        {step.reportHref ? <Link className="button button--ghost" href={step.reportHref}>{step.reportLabel ?? "Report"}</Link> : null}
      </div>
    </article>
  );
}

export default async function TimeToPayrollControlPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const [rolloutsResult, leaveResult, attendanceResult, regularizationResult, payrollInputResult, adjustmentResult] = await Promise.all([
    getHrAdminShiftRosterRollouts({ page: 1, page_size: 500 }),
    getHrAdminLeaveRequests({ page: 1, page_size: 500 }),
    getHrAdminAttendanceRecords({ page: 1, page_size: 500 }),
    getHrAdminAttendanceRegularizations({ page: 1, page_size: 500 }),
    getHrAdminPayrollInputSnapshotSetup(),
    getHrAdminPayrollAdjustmentSetup({ include_all_runs: true, adjustment_page_size: 100, snapshot_page_size: 100, post_lock_page_size: 100 }),
  ]);

  const rollouts = rolloutsResult.data.items;
  const leaveRequests = leaveResult.data.items;
  const attendanceRecords = attendanceResult.data.items;
  const regularizations = regularizationResult.data.items;
  const payrollSetup = payrollInputResult.data;
  const adjustmentSetup = adjustmentResult.data;

  const skippedRosterRows = rollouts.reduce((sum, item) => sum + item.skipped_count, 0);
  const leaveCollisionCount = leaveRequests.reduce((sum, item) => sum + (item.attendance_collision_summary?.collision_count ?? 0), 0);
  const payrollBlockingLeaveCount = leaveRequests.filter((item) => item.attendance_collision_summary?.payroll_blocking).length;
  const derivationExceptionCount = attendanceRecords.filter((item) => {
    const summary = item.derivation_summary;
    return summary.warnings.length > 0 || summary.payroll_impact.payroll_impacting || summary.leave_collision_count > 0 || ["absent", "late", "half_day"].includes(item.status) || !summary.schedule_day_type;
  }).length;
  const pendingRegularizations = regularizations.filter((item) => item.status === "pending").length;
  const reconciliationFindings = payrollSetup.snapshots.reduce((sum, item) => sum + item.reconciliation_summary.finding_count, 0);
  const highReconciliationFindings = payrollSetup.snapshots.reduce((sum, item) => sum + item.reconciliation_summary.high_count, 0);
  const postLockImpacts = adjustmentSetup.summary.post_lock_impact_count;
  const lockedPercent = percent(payrollSetup.summary.locked_snapshot_count, payrollSetup.summary.snapshot_count);
  const readinessItems: ReadinessItem[] = [
    {
      label: "Roster evidence",
      status: rollouts.length ? "ready" : "pending",
      detail: rollouts.length ? `${rollouts.length} rollout runs available for audit.` : "No roster rollout evidence is available yet.",
      action: rollouts.length ? "Review rollout evidence" : "Create or preview the first roster rollout",
      href: rollouts.length ? "/hr-admin/reports/roster-rollout-audit" : "/hr-admin/shift-roster-templates",
    },
    {
      label: "Attendance baseline",
      status: attendanceRecords.length ? "ready" : "pending",
      detail: attendanceRecords.length ? `${attendanceRecords.length} attendance records available for derivation review.` : "No attendance records are available for this control view yet.",
      action: attendanceRecords.length ? "Review attendance records" : "Open attendance operations",
      href: "/hr-admin/attendance-records",
    },
    {
      label: "Leave evidence",
      status: leaveRequests.length ? "ready" : "pending",
      detail: leaveRequests.length ? `${leaveRequests.length} leave requests available for collision checks.` : "No leave requests are available for collision checks yet.",
      action: leaveRequests.length ? "Review leave queue" : "Open leave requests",
      href: "/hr-admin/leave-requests",
    },
    {
      label: "Payroll input snapshot",
      status: payrollSetup.summary.snapshot_count ? "ready" : "pending",
      detail: payrollSetup.summary.snapshot_count ? `${payrollSetup.summary.snapshot_count} snapshots available, ${lockedPercent}% locked.` : "No payroll input snapshots have been collected yet.",
      action: payrollSetup.summary.snapshot_count ? "Open payroll inputs" : "Collect payroll inputs",
      href: "/hr-admin/payroll-inputs",
    },
    {
      label: "Arrears posture",
      status: postLockImpacts || adjustmentSetup.summary.adjustment_count ? "ready" : "clear",
      detail: postLockImpacts || adjustmentSetup.summary.adjustment_count ? `${postLockImpacts} post-lock candidates and ${adjustmentSetup.summary.adjustment_count} adjustments available.` : "No post-lock arrears evidence exists yet.",
      action: postLockImpacts ? "Review arrears candidates" : "Open adjustment workspace",
      href: "/hr-admin/payroll-adjustments?tab=actions",
    },
  ];

  const state =
    rolloutsResult.state === "live" &&
    leaveResult.state === "live" &&
    attendanceResult.state === "live" &&
    regularizationResult.state === "live" &&
    payrollInputResult.state === "live" &&
    adjustmentResult.state === "live"
      ? "live"
      : "demo";

  const steps: JourneyStep[] = [
    {
      label: "Roster",
      status: skippedRosterRows ? "warning" : "ready",
      summary: `${rollouts.length} rollout runs, ${skippedRosterRows} skipped rows`,
      remediation: skippedRosterRows ? "Open the rollout audit, correct skipped employee scope or overlapping assignments, then rerun preview before apply." : "Roster rollout has no skipped rows in the current evidence set.",
      clearance: skippedRosterRows ? "Skipped rollout rows must be explained or corrected before payroll input lock." : "Ready for attendance derivation.",
      primaryHref: "/hr-admin/shift-roster-templates",
      primaryLabel: "Manage roster",
      reportHref: "/hr-admin/reports/roster-rollout-audit",
      reportLabel: "Roster audit",
    },
    {
      label: "Leave",
      status: payrollBlockingLeaveCount ? "blocked" : leaveCollisionCount ? "warning" : "ready",
      summary: `${leaveCollisionCount} collision rows, ${payrollBlockingLeaveCount} blocking requests`,
      remediation: payrollBlockingLeaveCount ? "Resolve payroll-blocking leave collisions by confirming attendance, correcting leave units, or rejecting invalid requests." : leaveCollisionCount ? "Review collision rows and confirm whether attendance or leave should win before payroll close." : "No leave-attendance collision is blocking payroll in the current evidence set.",
      clearance: payrollBlockingLeaveCount ? "Blocking leave collisions must be cleared before final payroll lock." : "Ready for payroll reconciliation.",
      primaryHref: "/hr-admin/leave-requests",
      primaryLabel: "Review leave",
      reportHref: "/hr-admin/reports/leave-attendance-collisions",
      reportLabel: "Collision report",
    },
    {
      label: "Attendance",
      status: derivationExceptionCount || pendingRegularizations ? "warning" : "ready",
      summary: `${derivationExceptionCount} derivation exceptions, ${pendingRegularizations} pending regularizations`,
      remediation: pendingRegularizations ? "Approve or reject pending regularizations, then review derivation exceptions for payroll-impacting LOP or payable-unit changes." : derivationExceptionCount ? "Review derivation exceptions and recompute attendance after schedule or punch corrections." : "Attendance derivation has no exception rows in the current evidence set.",
      clearance: derivationExceptionCount || pendingRegularizations ? "Attendance exceptions should be cleared or accepted before input collection." : "Ready for payroll input collection.",
      primaryHref: "/hr-admin/attendance-records",
      primaryLabel: "Review records",
      reportHref: "/hr-admin/reports/attendance-derivation-exceptions",
      reportLabel: "Derivation report",
    },
    {
      label: "Payroll Inputs",
      status: highReconciliationFindings ? "blocked" : reconciliationFindings ? "warning" : "ready",
      summary: `${reconciliationFindings} reconciliation findings, ${lockedPercent}% locked`,
      remediation: highReconciliationFindings ? "Open input exceptions, correct the source mismatch, then recollect the snapshot before locking payroll inputs." : reconciliationFindings ? "Review reconciliation warnings and document accepted differences before payroll review." : "Payroll input reconciliation is clear in the current evidence set.",
      clearance: highReconciliationFindings ? "High-risk reconciliation findings block payroll input lock." : "Ready for payroll review.",
      primaryHref: "/hr-admin/payroll-inputs",
      primaryLabel: "Open inputs",
      reportHref: "/hr-admin/reports/payroll-input-exceptions",
      reportLabel: "Input report",
    },
    {
      label: "Arrears",
      status: postLockImpacts ? "warning" : "ready",
      summary: `${postLockImpacts} post-lock candidates, ${adjustmentSetup.summary.adjustment_count} adjustments`,
      remediation: postLockImpacts ? "Review post-lock candidates, create arrear adjustments for accepted impacts, and keep source evidence linked." : "No post-lock source changes need arrear action in the current evidence set.",
      clearance: postLockImpacts ? "Accepted candidates should become payroll adjustments before close sign-off." : "Ready for close sign-off.",
      primaryHref: "/hr-admin/payroll-adjustments?tab=actions",
      primaryLabel: "Create adjustment",
      reportHref: "/hr-admin/reports/payroll-adjustments",
      reportLabel: "Adjustment report",
    },
  ];

  const blockerCount = steps.filter((step) => step.status === "blocked").length;
  const warningCount = steps.filter((step) => step.status === "warning").length;
  const overallStatus = blockerCount ? "blocked" : warningCount ? "warning" : "ready";
  const nextAction = steps.find((step) => step.status === "blocked") ?? steps.find((step) => step.status === "warning") ?? steps[steps.length - 1];

  return (
    <main className="shell shell--payroll-setup" data-testid="time-to-payroll-control">
      <PageIntro
        eyebrow={state === "live" ? "Live time to payroll" : "Demo time to payroll"}
        title="Time to Payroll Control"
        description="One operational view from roster and leave through attendance derivation, payroll input reconciliation, and post-lock arrears."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/attendance-operations">Attendance operations</Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-inputs">Payroll inputs</Link>
            <Link className="button button--primary" href={nextAction.primaryHref}>{nextAction.primaryLabel}</Link>
          </>
        }
        pills={["Roster to payroll", "Exception guided", "Audit linked"]}
        showPills
      />

      <section className="section section--tight">
        <div className="metric-grid-modern payroll-setup-metrics">
          <MetricTile className="metric-tile-soft" label="Journey status" value={titleCase(overallStatus)} trend={`${blockerCount} blockers / ${warningCount} warnings`} />
          <MetricTile className="metric-tile-soft" label="Payroll findings" value={reconciliationFindings} trend={`${highReconciliationFindings} high risk`} />
          <MetricTile className="metric-tile-soft" label="Attendance exceptions" value={derivationExceptionCount} trend={`${pendingRegularizations} pending corrections`} />
          <MetricTile className="metric-tile-soft" label="Post-lock impacts" value={postLockImpacts} trend="Arrears candidates" />
        </div>
      </section>

      <section className="section section--tight" aria-labelledby="time-to-payroll-readiness">
        <div className="payroll-setup-main-panel">
          <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
            <div>
              <span className="workspace-card__eyebrow">Empty-state readiness</span>
              <h2 id="time-to-payroll-readiness">Close readiness starter</h2>
              <p className="section-copy section-copy-soft">Use this checklist when a tenant has little or no payroll-cycle evidence yet.</p>
            </div>
            <span className={statusClass(readinessItems.some((item) => item.status === "pending") ? "pending" : "ready")}>
              {readinessItems.some((item) => item.status === "pending") ? "Setup Needed" : "Evidence Ready"}
            </span>
          </div>
          <div className="payroll-input-source-grid" data-testid="time-to-payroll-readiness-grid">
            {readinessItems.map((item) => (
              <article className="payroll-input-source-card" key={item.label}>
                <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                  <div>
                    <span className="workspace-card__eyebrow">{item.label}</span>
                    <h2>{item.detail}</h2>
                  </div>
                  <span className={statusClass(item.status)}>{titleCase(item.status)}</span>
                </div>
                <div className="report-row-actions">
                  <Link className="button button--secondary" href={item.href}>{item.action}</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="payroll-setup-workspace">
          <div className="payroll-setup-main-panel">
            <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
              <div>
                <span className="workspace-card__eyebrow">Control journey</span>
                <h2>Roster to payroll close path</h2>
                <p className="section-copy section-copy-soft">Each stage links to the operating screen and the report evidence needed for close review.</p>
              </div>
              <span className={statusClass(overallStatus)}>{titleCase(overallStatus)}</span>
            </div>
            <div className="payroll-input-source-grid" data-testid="time-to-payroll-journey-grid">
              {steps.map((step) => <JourneyCard key={step.label} step={step} />)}
            </div>
          </div>

          <aside className="payroll-setup-detail-panel payroll-input-detail-panel">
            <div className="payroll-setup-panel__header">
              <span className="workspace-card__eyebrow">{nextAction.label}</span>
              <h2>Next action</h2>
            </div>
            <div className="payroll-output-net-block payroll-adjustment-amount-block">
              <span className="workspace-card__eyebrow">Recommended focus</span>
              <strong>{nextAction.summary}</strong>
              <span>{nextAction.status === "ready" ? "Journey is ready for payroll close review." : "Clear this stage before final payroll lock."}</span>
            </div>
            <section className="payroll-rule-source-card">
              <span className="workspace-card__eyebrow">Clearance plan</span>
              <strong>{nextAction.clearance}</strong>
              <p className="section-copy section-copy-soft">{nextAction.remediation}</p>
              <div className="report-row-actions">
                <Link className="button button--primary" href={nextAction.primaryHref}>{nextAction.primaryLabel}</Link>
                {nextAction.reportHref ? <Link className="button button--secondary" href={nextAction.reportHref}>{nextAction.reportLabel ?? "Report"}</Link> : null}
              </div>
            </section>
            <section className="payroll-rule-source-card">
              <span className="workspace-card__eyebrow">Evidence links</span>
              <div className="payroll-rule-snapshot-list">
                <div className="detail-row"><span className="detail-label">Roster</span><Link className="detail-value" href="/hr-admin/reports/roster-rollout-audit">Rollout audit</Link></div>
                <div className="detail-row"><span className="detail-label">Leave</span><Link className="detail-value" href="/hr-admin/reports/leave-attendance-collisions">Collision report</Link></div>
                <div className="detail-row"><span className="detail-label">Attendance</span><Link className="detail-value" href="/hr-admin/reports/attendance-derivation-exceptions">Derivation exceptions</Link></div>
                <div className="detail-row"><span className="detail-label">Payroll</span><Link className="detail-value" href="/hr-admin/reports/payroll-input-exceptions">Input exceptions</Link></div>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
