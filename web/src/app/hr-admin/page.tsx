import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { WorkspaceCard } from "@/components/patterns/workspace-card";
import { getLaunchConfigChecks, launchConfigSummary, type LaunchConfigSeverity } from "@/lib/launch-config-checks";
import { hrAdminModuleMetadata } from "@/lib/ui/module-metadata";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { getHrAdminDashboard } from "@/lib/api";
import type { HrAdminDashboard, HrAdminLaunchAuditModule } from "@/lib/types";

const launchAuditStatusLabel = {
  ready: "Ready",
  warning: "Warnings",
  blocked: "Blocked",
};

function launchAuditChipClass(status: HrAdminLaunchAuditModule["status"]) {
  if (status === "ready") {
    return "hr-admin-launch-audit__chip hr-admin-launch-audit__chip--ready";
  }
  if (status === "blocked") {
    return "hr-admin-launch-audit__chip hr-admin-launch-audit__chip--blocked";
  }
  return "hr-admin-launch-audit__chip hr-admin-launch-audit__chip--warning";
}

function launchConfigChipClass(status: LaunchConfigSeverity) {
  if (status === "ready") {
    return "hr-admin-launch-audit__chip hr-admin-launch-audit__chip--ready";
  }
  if (status === "blocked") {
    return "hr-admin-launch-audit__chip hr-admin-launch-audit__chip--blocked";
  }
  return "hr-admin-launch-audit__chip hr-admin-launch-audit__chip--warning";
}

function actionStatus(value: number) {
  if (value > 0) {
    return "warning" as const;
  }
  return "ready" as const;
}

function buildHrAdminActions(dashboard: HrAdminDashboard) {
  return [
    {
      label: "Payroll readiness",
      value: dashboard.operations.pending_leave_requests + dashboard.operations.pending_regularizations,
      detail: "Clear leave and attendance inputs before payroll close.",
      href: "/hr-admin/payroll-readiness",
      action: "Open readiness",
      status: actionStatus(dashboard.operations.pending_leave_requests + dashboard.operations.pending_regularizations),
    },
    {
      label: "Lifecycle queue",
      value: dashboard.operations.pending_onboardings + dashboard.operations.open_exits + dashboard.operations.pending_probation_reviews,
      detail: "Joiner, exit, and probation items needing HR action.",
      href: "/hr-admin/lifecycle",
      action: "Review lifecycle",
      status: actionStatus(dashboard.operations.pending_onboardings + dashboard.operations.open_exits + dashboard.operations.pending_probation_reviews),
    },
    {
      label: "Document review",
      value: dashboard.documents.pending_verification + dashboard.documents.rejected_documents,
      detail: "Pending and rejected employee documents.",
      href: "/hr-admin/employee-documents",
      action: "Review documents",
      status: actionStatus(dashboard.documents.pending_verification + dashboard.documents.rejected_documents),
    },
    {
      label: "Attendance exceptions",
      value: dashboard.operations.pending_regularizations,
      detail: "Regularizations waiting for review.",
      href: "/hr-admin/attendance-regularizations",
      action: "Open attendance",
      status: actionStatus(dashboard.operations.pending_regularizations),
    },
    {
      label: "Notifications",
      value: dashboard.delivery.failed_notifications + dashboard.delivery.pending_notifications,
      detail: "Failed and pending delivery events.",
      href: "/hr-admin/notification-delivery",
      action: "Open delivery",
      status: dashboard.delivery.failed_notifications ? "blocked" as const : actionStatus(dashboard.delivery.pending_notifications),
    },
    {
      label: "Launch blockers",
      value: dashboard.launch_audit.blocker_count + dashboard.launch_audit.remediation_assignment_summary.open_count,
      detail: "Release blockers and open remediation assignments.",
      href: "/hr-admin/launch-remediation",
      action: "Resolve launch",
      status: dashboard.launch_audit.blocker_count ? "blocked" as const : actionStatus(dashboard.launch_audit.remediation_assignment_summary.open_count),
    },
  ];
}

export default async function HrAdminLandingPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const dashboardResult = await getHrAdminDashboard();

  const dashboard = dashboardResult.data;
  const state = dashboardResult.state;
  const activeEmployees = dashboard.overview.active_employees;
  const launchAudit = dashboard.launch_audit;
  const launchAuditModules = launchAudit.modules.slice(0, 8);
  const launchAuditActions = launchAudit.release_actions.slice(0, 4);
  const launchConfigChecks = getLaunchConfigChecks();
  const configSummary = launchConfigSummary(launchConfigChecks);
  const commandActions = buildHrAdminActions(dashboard);
  const openCommandCount = commandActions.filter((action) => action.status !== "ready").length;
  const tenantReadinessItems = [
    {
      label: "Payroll readiness",
      detail: "Leave, attendance, and employee source data",
      status: commandActions[0].status,
      value: commandActions[0].value,
      href: "/hr-admin/payroll-readiness",
    },
    {
      label: "Document verification",
      detail: "Employee documents pending or rejected",
      status: commandActions[2].status,
      value: commandActions[2].value,
      href: "/hr-admin/employee-documents",
    },
    {
      label: "Launch guardrails",
      detail: `${configSummary.ready} ready, ${configSummary.warnings} warnings, ${configSummary.blocked} blockers`,
      status: configSummary.status,
      value: configSummary.blocked + configSummary.warnings,
      href: "/hr-admin/launch-remediation",
    },
    {
      label: "Notification delivery",
      detail: "Failed and pending delivery events",
      status: commandActions[4].status,
      value: commandActions[4].value,
      href: "/hr-admin/notification-delivery",
    },
  ];
  const focusWorkspaces = [
    {
      eyebrow: hrAdminModuleMetadata.employees.eyebrow,
      title: hrAdminModuleMetadata.employees.title,
      description: "Maintain employee records, access readiness, reporting lines, and payroll-critical profile data.",
      href: hrAdminModuleMetadata.employees.href,
      cta: "Open employees",
      details: [
        { label: "Profiles", value: dashboard.overview.total_employees },
        { label: "Active", value: activeEmployees },
        { label: "Managers", value: dashboard.workforce.managers_with_reports },
      ],
    },
    {
      eyebrow: hrAdminModuleMetadata.payroll.eyebrow,
      title: "Payroll Control",
      description: "Track payroll readiness, input blockers, review exceptions, output publication, and finance handoff.",
      href: hrAdminModuleMetadata.payroll.href,
      cta: "Open payroll",
      details: [
        { label: "Input blockers", value: commandActions[0].value },
        { label: "Launch status", value: launchAuditStatusLabel[launchAudit.status] },
        { label: "Open actions", value: openCommandCount },
      ],
    },
    {
      eyebrow: hrAdminModuleMetadata.attendance.eyebrow,
      title: hrAdminModuleMetadata.attendance.title,
      description: "Resolve attendance exceptions, review regularizations, and keep shifts and calendars ready.",
      href: hrAdminModuleMetadata.attendance.href,
      cta: "Open attendance",
      details: [
        { label: "Regularizations", value: dashboard.operations.pending_regularizations },
        { label: "Policies", value: dashboard.governance.active_attendance_policies },
        { label: "Layer", value: "Time ops" },
      ],
    },
    {
      eyebrow: hrAdminModuleMetadata.reports.eyebrow,
      title: hrAdminModuleMetadata.reports.title,
      description: "Open workforce, compliance, payroll, and audit reports without changing master data.",
      href: hrAdminModuleMetadata.reports.href,
      cta: "Open reports",
      details: [
        { label: "Approvals", value: dashboard.overview.pending_approvals },
        { label: "Documents", value: dashboard.documents.pending_verification },
        { label: "Delivery issues", value: dashboard.delivery.failed_notifications },
      ],
    },
  ];

  return (
    <main className="shell hr-admin-enterprise-dashboard">
      <PageIntro
        eyebrow="HR Admin"
        title="People Operations Control Center"
        description="Prioritize workforce, payroll, attendance, document, and launch-readiness work from one calm operating view."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/payroll-readiness">
              Resolve payroll blockers
            </Link>
            <Link className="button button--secondary" href="/hr-admin/employees">
              Open employees
            </Link>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
          </>
        }
        pills={[
          state === "live" ? "Live workspace" : "Demo workspace",
          `${openCommandCount} active signals`,
          `${launchAudit.passed_gate_count}/${launchAudit.gate_count} launch gates`,
        ]}
        showPills
      />

      <section className="section hr-admin-kpi-strip">
        <div className="metric-grid-modern hr-admin-kpi-strip__grid">
          <MetricTile label="Tenant status" value={launchAuditStatusLabel[launchAudit.status]} trend={`${launchAudit.blocker_count} blockers, ${launchAudit.warning_count} warnings`} />
          <MetricTile label="Active employees" value={activeEmployees} trend={`${dashboard.overview.total_employees} total profiles`} />
          <MetricTile label="Configuration setup" value={`${launchAudit.passed_gate_count}/${launchAudit.gate_count}`} trend="Launch gates passed" />
          <MetricTile label="Action queue" value={openCommandCount} trend="Signals needing review" />
        </div>
      </section>

      <section className="section hr-admin-control-center" data-testid="hr-admin-control-center">
        <article className="panel-card-soft hr-admin-control-card hr-admin-control-card--primary">
          <div className="hr-admin-control-card__header">
            <div>
              <span className="workspace-card__eyebrow">Action queue</span>
              <h2>Items that need your attention</h2>
            </div>
            <span className="queue-summary-chip"><strong>{openCommandCount}</strong> active signals</span>
          </div>
          <div className="hr-admin-command-list">
            {commandActions.map((item) => (
              <div className="hr-admin-command-row" key={item.label}>
                <span className={launchAuditChipClass(item.status)}>{launchAuditStatusLabel[item.status]}</span>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
                <span className="record-chip">{item.value}</span>
                <Link className="button button--secondary" href={item.href}>{item.action}</Link>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card-soft hr-admin-control-card">
          <div className="hr-admin-control-card__header">
            <div>
              <span className="workspace-card__eyebrow">Tenant readiness</span>
              <h2>Operational readiness</h2>
            </div>
            <span className={launchAuditChipClass(launchAudit.status)}>{launchAuditStatusLabel[launchAudit.status]}</span>
          </div>
          <div className="hr-admin-readiness-list">
            {tenantReadinessItems.map((item) => (
              <Link className="hr-admin-readiness-row" href={item.href} key={item.label}>
                <span className={launchAuditChipClass(item.status)}>{launchAuditStatusLabel[item.status]}</span>
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </div>
                <span className="record-chip">{item.value}</span>
              </Link>
            ))}
          </div>
          <div className="detail-grid hr-admin-mini-detail-grid">
            <div className="detail-row">
              <span>Pending approvals</span>
              <strong>{dashboard.overview.pending_approvals}</strong>
            </div>
            <div className="detail-row">
              <span>Expiring documents</span>
              <strong>{dashboard.documents.expiring_in_30_days}</strong>
            </div>
            <div className="detail-row">
              <span>Sent today</span>
              <strong>{dashboard.delivery.sent_today}</strong>
            </div>
            <div className="detail-row">
              <span>Managers mapped</span>
              <strong>{dashboard.workforce.managers_with_reports}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="section hr-admin-secondary-grid">
        <div className="hr-admin-launch-audit panel-card-soft">
          <div className="hr-admin-launch-audit__header">
            <div>
              <span className="workspace-card__eyebrow">Launch audit</span>
              <h2>Launch readiness posture</h2>
            </div>
            <div className="hr-admin-launch-audit__summary">
              <span className={launchAuditChipClass(launchAudit.status)}>{launchAuditStatusLabel[launchAudit.status]}</span>
              <span className="queue-summary-chip"><strong>{launchAudit.remediation_assignment_summary.open_count}</strong> open assignments</span>
              <span className="queue-summary-chip"><strong>{launchAudit.blocker_count}</strong> blockers</span>
              <span className="queue-summary-chip"><strong>{launchAudit.warning_count}</strong> warnings</span>
              <Link className="button button--secondary" href="/hr-admin/launch-remediation">
                View assignments
              </Link>
              <a className="button button--secondary" href="/api/hr-admin/saas-launch-audit/download">
                Download audit
              </a>
            </div>
          </div>

          <div className="hr-admin-launch-audit__modules">
            {launchAuditModules.slice(0, 4).map((module) => (
              <article className="hr-admin-launch-audit__module" key={module.module_ref}>
                <div>
                  <span className={launchAuditChipClass(module.status)}>{launchAuditStatusLabel[module.status]}</span>
                  <strong>{module.label}</strong>
                </div>
                <span>{module.passed_gate_count}/{module.gate_count} gates</span>
                <span>{module.blocker_count} blockers</span>
                <span>{module.warning_count} warnings</span>
              </article>
            ))}
          </div>

          {launchAuditActions.length ? (
            <div className="hr-admin-launch-audit__actions">
              {launchAuditActions.map((action) => (
                <article className="hr-admin-launch-audit__action" key={action.ref}>
                  <div>
                    <span className={launchAuditChipClass(action.status)}>{launchAuditStatusLabel[action.status]}</span>
                    <strong>{action.label}</strong>
                    <small>{action.module_label} - {action.owner_role_ref} - {action.sla_days}d</small>
                  </div>
                  <span>{String(action.value)}</span>
                  <Link className="button button--secondary" href={action.action_href}>
                    {action.action_label}
                  </Link>
                </article>
              ))}
            </div>
          ) : null}

          <div className="hr-admin-launch-audit__evidence">
            {launchAudit.evidence_refs.slice(0, 4).map((evidenceRef) => (
              <code key={evidenceRef}>{evidenceRef}</code>
            ))}
          </div>
        </div>

        <div className="launch-config-guard panel-card-soft">
          <div className="launch-config-guard__header">
            <div>
              <span className="workspace-card__eyebrow">Launch guardrails</span>
              <h2>Production-safe settings</h2>
            </div>
            <div className="hr-admin-launch-audit__summary">
              <span className={launchConfigChipClass(configSummary.status)}>{launchAuditStatusLabel[configSummary.status]}</span>
              <span className="queue-summary-chip"><strong>{configSummary.ready}</strong> ready</span>
              <span className="queue-summary-chip"><strong>{configSummary.warnings}</strong> warnings</span>
              <span className="queue-summary-chip"><strong>{configSummary.blocked}</strong> blockers</span>
            </div>
          </div>
          <div className="launch-config-guard__grid">
            {launchConfigChecks.slice(0, 4).map((check) => (
              <article className="launch-config-guard__item" key={check.ref}>
                <span className={launchConfigChipClass(check.severity)}>{launchAuditStatusLabel[check.severity]}</span>
                <strong>{check.label}</strong>
                <span>{check.detail}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="hr-admin-section-heading">
          <div>
            <span className="workspace-card__eyebrow">Focused workspaces</span>
            <h2>Open the right workspace</h2>
          </div>
          <Link className="button button--secondary" href="/hr-admin/reports">
            View all reports
          </Link>
        </div>
        <div className="workspace-grid-modern hr-admin-workspace-grid">
          {focusWorkspaces.map((workspace) => (
            <WorkspaceCard
              cta={workspace.cta}
              description={workspace.description}
              details={workspace.details}
              eyebrow={workspace.eyebrow}
              href={workspace.href}
              key={workspace.title}
              title={workspace.title}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
