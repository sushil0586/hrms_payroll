import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { WorkspaceCard } from "@/components/patterns/workspace-card";
import { hrAdminModuleMetadata } from "@/lib/ui/module-metadata";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  getHrAdminAttendancePolicies,
  getHrAdminDashboard,
  getHrAdminDocumentCategories,
  getHrAdminEmployees,
  getHrAdminLeaveTypes,
  getHrAdminNotificationTemplates,
  getHrAdminOnboardings,
  getHrAdminOrganizationSnapshot,
  getHrAdminWorkflowTemplates,
} from "@/lib/api";
import type { HrAdminLaunchAuditModule } from "@/lib/types";

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

export default async function HrAdminLandingPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const [dashboardResult, employeesResult, organizationResult, leaveTypesResult, attendancePoliciesResult, workflowTemplatesResult, documentCategoriesResult, onboardingsResult, notificationTemplatesResult] = await Promise.all([
    getHrAdminDashboard(),
    getHrAdminEmployees(),
    getHrAdminOrganizationSnapshot(),
    getHrAdminLeaveTypes(),
    getHrAdminAttendancePolicies(),
    getHrAdminWorkflowTemplates(),
    getHrAdminDocumentCategories(),
    getHrAdminOnboardings({ page: 1, page_size: 1 }),
    getHrAdminNotificationTemplates(),
  ]);

  const dashboard = dashboardResult.data;
  const employees = employeesResult.data;
  const organization = organizationResult.data;
  const state =
    dashboardResult.state === "live" &&
    employeesResult.state === "live" &&
    organizationResult.state === "live" &&
    leaveTypesResult.state === "live" &&
    attendancePoliciesResult.state === "live" &&
    workflowTemplatesResult.state === "live" &&
    documentCategoriesResult.state === "live" &&
    onboardingsResult.state === "live" &&
    notificationTemplatesResult.state === "live"
      ? "live"
      : "demo";
  const activeEmployees = employees.filter((employee) => employee.employment_status === "active").length;
  const launchAudit = dashboard.launch_audit;
  const launchAuditModules = launchAudit.modules.slice(0, 8);
  const launchAuditActions = launchAudit.release_actions.slice(0, 4);

  return (
    <main className="shell">
      <PageIntro
        eyebrow={state === "live" ? "Live admin" : "Demo admin"}
        title="Control center"
        description="People, policy, workflow, and review controls in one place."
        actions={
          <>
          <Link className="button button--primary" href="/hr-admin/lifecycle">
            Lifecycle
          </Link>
          <Link className="button button--secondary" href="/hr-admin/employee-documents">
            Documents
          </Link>
          <Link className="button button--secondary" href="/hr-admin/reports">
            Reports
          </Link>
          </>
        }
        pills={[
          "Live queues",
          "Guided actions",
          "Short headers",
        ]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Employees in workspace" value={dashboard.overview.total_employees} trend="People coverage snapshot" />
          <MetricTile label="Active employees" value={dashboard.overview.active_employees || activeEmployees} trend="Healthy operating baseline" />
          <MetricTile label="Departments configured" value={organization.summary.departments_count} trend="Org structure depth" />
          <MetricTile label="Pending approvals" value={dashboard.overview.pending_approvals} trend="Cross-module action load" />
          <MetricTile label="Launch audit" value={launchAuditStatusLabel[launchAudit.status]} trend={`${launchAudit.passed_gate_count}/${launchAudit.gate_count} gates passed`} />
        </div>
      </section>

      <section className="section">
        <div className="hr-admin-launch-audit panel-card-soft">
          <div className="hr-admin-launch-audit__header">
            <div>
              <span className="workspace-card__eyebrow">SaaS launch audit</span>
              <h2>{launchAudit.audit_profile_ref}</h2>
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
            {launchAuditModules.map((module) => (
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
            {launchAudit.evidence_refs.map((evidenceRef) => (
              <code key={evidenceRef}>{evidenceRef}</code>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="workspace-grid-modern">
          <WorkspaceCard
            eyebrow={hrAdminModuleMetadata.attendance.eyebrow}
            title={hrAdminModuleMetadata.attendance.title}
            description={hrAdminModuleMetadata.attendance.description}
            href={hrAdminModuleMetadata.attendance.href}
            cta="Explore attendance"
            details={[
              { label: "Attendance policies", value: attendancePoliciesResult.data.length },
              { label: "Operational layer", value: "Shifts and calendars" },
            ]}
          />

          <WorkspaceCard
            eyebrow={hrAdminModuleMetadata.reports.eyebrow}
            title={hrAdminModuleMetadata.reports.title}
            description={hrAdminModuleMetadata.reports.description}
            href={hrAdminModuleMetadata.reports.href}
            cta="Explore reports"
            details={[
              { label: "Pending approvals", value: dashboard.overview.pending_approvals },
              { label: "Document reviews", value: dashboard.documents.pending_verification },
              { label: "Failed notifications", value: dashboard.delivery.failed_notifications },
            ]}
          />

          <WorkspaceCard
            eyebrow={hrAdminModuleMetadata.payroll.eyebrow}
            title={hrAdminModuleMetadata.payroll.title}
            description={hrAdminModuleMetadata.payroll.description}
            href={hrAdminModuleMetadata.payroll.href}
            cta="Open readiness"
            details={[
              { label: "Source checks", value: "Employee, leave, attendance" },
              { label: "Configuration", value: "Tenant profile" },
              { label: "Phase", value: "0" },
            ]}
          />

          <WorkspaceCard
            eyebrow={hrAdminModuleMetadata.employees.eyebrow}
            title={hrAdminModuleMetadata.employees.title}
            description={hrAdminModuleMetadata.employees.description}
            href={hrAdminModuleMetadata.employees.href}
            cta="Explore employees"
            details={[
              { label: "Profiles loaded", value: employees.length },
              { label: "Active employees", value: activeEmployees },
              { label: "Preview", value: employees[0]?.full_name || "No records yet" },
            ]}
          />

          <WorkspaceCard
            eyebrow={hrAdminModuleMetadata.organization.eyebrow}
            title={hrAdminModuleMetadata.organization.title}
            description={hrAdminModuleMetadata.organization.description}
            href={hrAdminModuleMetadata.organization.href}
            cta="Explore organization"
            details={[
              { label: "Legal entities", value: organization.summary.legal_entities_count },
              { label: "Branches", value: organization.summary.branches_count },
              { label: "Employment types", value: organization.summary.employment_types_count },
            ]}
          />

          <WorkspaceCard
            eyebrow={hrAdminModuleMetadata.policies.eyebrow}
            title={hrAdminModuleMetadata.policies.title}
            description={hrAdminModuleMetadata.policies.description}
            href={hrAdminModuleMetadata.policies.href}
            cta="Explore policies"
            details={[
              { label: "Leave types", value: leaveTypesResult.data.length },
              { label: "Attendance policies", value: attendancePoliciesResult.data.length },
            ]}
          />

          <WorkspaceCard
            eyebrow={hrAdminModuleMetadata.workflows.eyebrow}
            title={hrAdminModuleMetadata.workflows.title}
            description={hrAdminModuleMetadata.workflows.description}
            href={hrAdminModuleMetadata.workflows.href}
            cta="Explore workflows"
            details={[
              { label: "Workflow templates", value: workflowTemplatesResult.data.length },
              { label: "Approval steps", value: workflowTemplatesResult.data.reduce((sum, item) => sum + item.steps.length, 0) },
            ]}
          />

          <WorkspaceCard
            eyebrow={hrAdminModuleMetadata.documents.eyebrow}
            title={hrAdminModuleMetadata.documents.title}
            description={hrAdminModuleMetadata.documents.description}
            href={hrAdminModuleMetadata.documents.href}
            cta="Explore documents"
            details={[
              { label: "Document categories", value: documentCategoriesResult.data.length },
              { label: "Upload governance", value: "Configured by category" },
            ]}
          />

          <WorkspaceCard
            eyebrow={hrAdminModuleMetadata.lifecycle.eyebrow}
            title={hrAdminModuleMetadata.lifecycle.title}
            description={hrAdminModuleMetadata.lifecycle.description}
            href={hrAdminModuleMetadata.lifecycle.href}
            cta="Explore lifecycle"
            details={[
              { label: "Active onboardings", value: onboardingsResult.data.total_count },
              { label: "Coverage", value: "Join to exit" },
            ]}
          />

          <WorkspaceCard
            eyebrow={hrAdminModuleMetadata.notifications.eyebrow}
            title={hrAdminModuleMetadata.notifications.title}
            description={hrAdminModuleMetadata.notifications.description}
            href={hrAdminModuleMetadata.notifications.href}
            cta="Explore notifications"
            details={[
              { label: "Templates", value: notificationTemplatesResult.data.length },
              { label: "Mode", value: "Event-driven" },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
