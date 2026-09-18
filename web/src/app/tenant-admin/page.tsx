import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getTenantAdminConsole } from "@/lib/api";
import { requireSessionPermission, sessionHasAnyPermission } from "@/lib/workspace-access";

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function statusBadgeClass(status: string) {
  if (status === "ready" || status === "active" || status === "ok") {
    return "readiness-badge readiness-badge--ready";
  }
  if (status === "warning" || status === "near_limit") {
    return "readiness-badge readiness-badge--warning";
  }
  return "readiness-badge readiness-badge--blocked";
}

function openChangeRequestCount(data: Awaited<ReturnType<typeof getTenantAdminConsole>>["data"]) {
  return data.change_request_management.recent_requests.filter((request) =>
    ["submitted", "approved"].includes(request.status),
  ).length;
}

function activeSupportGrantCount(data: Awaited<ReturnType<typeof getTenantAdminConsole>>["data"]) {
  return data.support_access_management.recent_grants.filter((grant) =>
    ["requested", "approved", "active"].includes(grant.status),
  ).length;
}

function setupStepBadgeClass(status: "done" | "action" | "watch") {
  if (status === "done") {
    return "readiness-badge readiness-badge--ready";
  }
  if (status === "watch") {
    return "readiness-badge readiness-badge--warning";
  }
  return "readiness-badge readiness-badge--blocked";
}

function actionPriorityClass(priority: "high" | "medium" | "low") {
  if (priority === "high") {
    return "tenant-priority tenant-priority--high";
  }
  if (priority === "medium") {
    return "tenant-priority tenant-priority--medium";
  }
  return "tenant-priority tenant-priority--low";
}

export default async function TenantAdminConsolePage() {
  const sessionUser = await requireSessionPermission({
    permissionKeys: ["tenant.dashboard.view"],
    workspace: "tenant_admin",
    fallbackPath: "/",
  });
  const result = await getTenantAdminConsole();
  const data = result.data;
  const commercial = data.commercial_control;
  const blockers = data.governance_checks.filter((check) => check.status === "blocked");
  const warnings = data.governance_checks.filter((check) => check.status === "warning");
  const openRequests = openChangeRequestCount(data);
  const activeSupportGrants = activeSupportGrantCount(data);
  const setupSteps = [
    {
      label: "Confirm company profile",
      detail: `${data.tenant.legal_name || data.tenant.name} · ${data.tenant.country_code} · ${data.tenant.timezone}`,
      status: data.tenant.legal_name && data.tenant.country_code && data.tenant.timezone ? "done" : "action",
      href: "/tenant-admin/settings",
      action: "Review account",
      permissions: ["tenant.settings.view"],
    },
    {
      label: "Invite workspace owners",
      detail: `${data.summary.active_membership_count} active members across ${data.summary.role_count} roles`,
      status: data.summary.active_membership_count > 1 ? "done" : "action",
      href: "/tenant-admin/users",
      action: "Manage users",
      permissions: ["tenant.users.view", "tenant.users.manage"],
    },
    {
      label: "Resolve launch checks",
      detail: blockers.length ? `${blockers.length} blockers need action` : `${warnings.length} warnings to monitor`,
      status: blockers.length ? "action" : warnings.length ? "watch" : "done",
      href: "/tenant-admin/security-readiness",
      action: "Open security",
      permissions: ["tenant.security.view"],
    },
    {
      label: "Publish operating configuration",
      detail: `${data.configuration_health.published_count} published configs, ${data.configuration_health.draft_count} drafts`,
      status: data.configuration_health.published_count ? "done" : "action",
      href: "/tenant-admin/setup",
      action: "Open setup",
      permissions: ["tenant.setup.view"],
    },
    {
      label: "Validate audit evidence",
      detail: `${data.recent_audit_events.length} recent lifecycle events recorded`,
      status: data.recent_audit_events.length ? "done" : "watch",
      href: "/tenant-admin/trust-audit",
      action: "Open audit",
      permissions: ["tenant.audit.view", "tenant.audit.export"],
    },
  ] as const;
  const visibleSetupSteps = setupSteps.filter((step) => sessionHasAnyPermission(sessionUser, [...step.permissions]));
  const setupDoneCount = setupSteps.filter((step) => step.status === "done").length;
  const setupCompletion = Math.round((setupDoneCount / setupSteps.length) * 100);
  const nextStep =
    visibleSetupSteps.find((step) => step.status === "action") ??
    visibleSetupSteps.find((step) => step.status === "watch") ??
    visibleSetupSteps[0];
  const canOpenSetup = sessionHasAnyPermission(sessionUser, ["tenant.setup.view"]);
  const canOpenUsers = sessionHasAnyPermission(sessionUser, ["tenant.users.view", "tenant.users.manage"]);
  const canExportAudit = sessionHasAnyPermission(sessionUser, ["tenant.audit.export"]);
  const actionQueue = [
    nextStep
      ? {
          priority: nextStep.status === "action" ? "high" : "medium",
          action: nextStep.label,
          detail: nextStep.detail,
          owner: "Tenant Admin",
          due: nextStep.status === "action" ? "Today" : "This week",
          status: nextStep.status === "done" ? "ready" : nextStep.status === "watch" ? "review" : "pending",
          href: nextStep.href,
          label: nextStep.action,
        }
      : null,
    activeSupportGrants
      ? {
          priority: "high",
          action: "Review support access",
          detail: `${activeSupportGrants} support grant${activeSupportGrants === 1 ? "" : "s"} active or pending.`,
          owner: "Tenant Admin",
          due: "Today",
          status: "review",
          href: "/tenant-admin/support-access",
          label: "Review",
        }
      : null,
    openRequests
      ? {
          priority: "medium",
          action: "Review account change requests",
          detail: `${openRequests} plan or configuration request${openRequests === 1 ? "" : "s"} require tracking.`,
          owner: "Finance",
          due: "This week",
          status: "pending",
          href: "/tenant-admin/plan",
          label: "Open",
        }
      : null,
    canExportAudit
      ? {
          priority: "low",
          action: "Validate audit export",
          detail: `${data.recent_audit_events.length} recent lifecycle events recorded.`,
          owner: "Compliance",
          due: "This week",
          status: "ready",
          href: "/tenant-admin/trust-audit",
          label: "View",
        }
      : null,
  ].filter(Boolean) as Array<{
    priority: "high" | "medium" | "low";
    action: string;
    detail: string;
    owner: string;
    due: string;
    status: string;
    href: string;
    label: string;
  }>;
  const recentMembers = data.membership_management.recent_memberships.slice(0, 3);
  const previewRoles = data.role_management.roles.slice(0, 4);

  return (
    <main className="shell shell--workspace tenant-enterprise-page">
      <PageIntro
        eyebrow="Tenant Admin"
        title="Account Control Center"
        description="Manage your organization's users, access, setup, security, and subscription in one place."
        className="tenant-page-intro"
        actions={
          <>
            {canExportAudit ? (
              <a className="button button--secondary" href="/api/tenant-admin/commercial-support-audit/download">
                Download audit
              </a>
            ) : null}
            {canOpenSetup ? (
              <Link className="button button--secondary" href="/tenant-admin/settings">
                Request account change
              </Link>
            ) : null}
            {canOpenUsers ? (
              <Link className="button button--primary" href="/tenant-admin/users">
                Invite user
              </Link>
            ) : null}
          </>
        }
      />

      <section className="section tenant-enterprise-kpis" id="dashboard">
        <div className="tenant-status-card">
          <span className="tenant-status-card__icon" aria-hidden="true">▦</span>
          <div>
            <span className="metric-tile__label">Tenant Status</span>
            <strong>{data.tenant.name}</strong>
            <small>{data.tenant.code} · {data.tenant.country_code} · {data.tenant.timezone}</small>
          </div>
          <span className={statusBadgeClass(data.tenant.status)}>{titleCase(data.tenant.status)}</span>
        </div>
        <MetricTile label="Configuration Setup" value={`${setupCompletion}%`} trend={`${setupDoneCount} of ${setupSteps.length} required steps complete`} />
        <MetricTile label="Active Users" value={data.summary.active_membership_count} trend={`${data.summary.role_count} roles configured`} />
        <MetricTile
          label="Plan & Billing"
          value={titleCase(commercial.plan.plan_ref)}
          trend={data.seat_usage.limit_value ? `${data.seat_usage.current_value} of ${data.seat_usage.limit_value} users` : "Unlimited users"}
        />
      </section>

      <section className="section tenant-control-center tenant-control-center--dashboard" data-testid="tenant-admin-control-center">
        <article className="panel-card-soft tenant-console-panel tenant-action-queue">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Action Queue</span>
              <h2>Items that need your attention</h2>
            </div>
            <span className="record-chip">{actionQueue.length} open</span>
          </div>
          <div className="tenant-action-table" data-testid="tenant-next-action">
            <div className="tenant-action-table__head">
              <span>Priority</span>
              <span>Action</span>
              <span>Owner</span>
              <span>Due date</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {actionQueue.map((item) => (
              <div className="tenant-action-table__row" key={`${item.action}-${item.href}`}>
                <span className={actionPriorityClass(item.priority)}>{titleCase(item.priority)}</span>
                <div>
                  <strong>{item.action}</strong>
                  <small>{item.detail}</small>
                </div>
                <span>{item.owner}</span>
                <span>{item.due}</span>
                <span className={statusBadgeClass(item.status)}>{titleCase(item.status)}</span>
                <Link className="button button--secondary button--compact" href={item.href}>{item.label}</Link>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card-soft tenant-console-panel tenant-readiness-card">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Tenant Readiness</span>
              <h2>Complete these key items to ensure smooth operation.</h2>
            </div>
            <span className={statusBadgeClass(data.summary.commercial_can_launch ? "ready" : data.summary.status)}>
              {setupDoneCount} of {setupSteps.length} ready
            </span>
          </div>
          <div className="tenant-readiness-list">
            {visibleSetupSteps.slice(0, 4).map((step) => (
              <div className="tenant-readiness-item" key={step.label}>
                <span aria-hidden="true">{step.status === "done" ? "✓" : step.status === "watch" ? "!" : "•"}</span>
                <div>
                  <strong>{step.label}</strong>
                  <small>{step.detail}</small>
                </div>
                <span className={setupStepBadgeClass(step.status)}>{titleCase(step.status === "done" ? "ready" : step.status)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="section tenant-dashboard-preview-grid" data-testid="tenant-setup-guide">
        {canOpenUsers ? (
          <article className="panel-card-soft tenant-console-panel tenant-dashboard-preview">
            <div className="tenant-console-panel__header">
              <div>
                <span className="workspace-card__eyebrow">Recently Added Users</span>
                <h2>User Management</h2>
              </div>
              <Link className="button button--secondary button--compact" href="/tenant-admin/users">
                View all users
              </Link>
            </div>
            <div className="tenant-dashboard-table">
              <div className="tenant-dashboard-table__head">
                <span>User</span>
                <span>Email</span>
                <span>Roles</span>
                <span>Status</span>
              </div>
              {recentMembers.map((member) => (
                <div className="tenant-dashboard-table__row" key={member.id}>
                  <strong>{member.display_name || member.username}</strong>
                  <span>{member.email || member.username}</span>
                  <span>{member.roles.map((role) => role.name).join(", ") || "No role"}</span>
                  <span className={statusBadgeClass(member.membership_status)}>{titleCase(member.membership_status)}</span>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        <article className="panel-card-soft tenant-console-panel tenant-dashboard-preview">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Roles & Permissions</span>
              <h2>Access design</h2>
            </div>
            <Link className="button button--secondary button--compact" href="/tenant-admin/roles">
              Manage all roles
            </Link>
          </div>
          <div className="tenant-role-preview">
            <div className="tenant-role-preview__list">
              {previewRoles.map((role) => (
                <div className="tenant-role-preview__item" key={role.id}>
                  <div>
                    <strong>{role.name}</strong>
                    <span>{role.active_membership_count} assigned users</span>
                  </div>
                  <span className="record-chip">{role.is_system_role ? "System" : "Custom"}</span>
                </div>
              ))}
            </div>
            <div className="tenant-role-preview__matrix">
              <strong>Permission Matrix</strong>
              <span>Grouped permissions, protected system roles, and custom-role editing are available on the full Roles page.</span>
              <div className="tenant-permission-mini-grid" aria-hidden="true">
                <span>Module</span><span>View</span><span>Create</span><span>Edit</span><span>Delete</span>
                <span>User Management</span><span>✓</span><span>✓</span><span>✓</span><span>–</span>
                <span>Tenant Governance</span><span>✓</span><span>–</span><span>✓</span><span>–</span>
              </div>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
