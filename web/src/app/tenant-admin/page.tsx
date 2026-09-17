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

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not recorded";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
  const lastAudit = data.recent_audit_events[0]?.occurred_at ?? null;
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
  const visibleSetupDoneCount = visibleSetupSteps.filter((step) => step.status === "done").length;
  const setupCompletion = Math.round((setupDoneCount / setupSteps.length) * 100);
  const controlCards = [
    {
      label: "Users",
      value: data.summary.active_membership_count,
      detail: `${data.summary.role_count} roles configured`,
      href: "/tenant-admin/users",
      action: "Manage users",
      permissions: ["tenant.users.view", "tenant.users.manage"],
    },
    {
      label: "Plan",
      value: titleCase(commercial.plan.plan_ref),
      detail: `${data.seat_usage.current_value}/${data.seat_usage.limit_value || "unlimited"} seats`,
      href: "/tenant-admin/plan",
      action: "Review plan",
      permissions: ["tenant.plan.view"],
    },
    {
      label: "Support",
      value: activeSupportGrants,
      detail: activeSupportGrants ? "Active or pending grants" : "No active support grants",
      href: "/tenant-admin/support-access",
      action: "Open support",
      permissions: ["tenant.support_access.request", "tenant.support_access.approve"],
    },
    {
      label: "Audit",
      value: data.recent_audit_events.length,
      detail: `Last event ${formatDateTime(lastAudit)}`,
      href: "/tenant-admin/trust-audit",
      action: "Review audit",
      permissions: ["tenant.audit.view", "tenant.audit.export"],
    },
  ];
  const visibleControlCards = controlCards.filter((item) => sessionHasAnyPermission(sessionUser, item.permissions));
  const nextStep =
    visibleSetupSteps.find((step) => step.status === "action") ??
    visibleSetupSteps.find((step) => step.status === "watch") ??
    visibleSetupSteps[0];
  const canOpenSetup = sessionHasAnyPermission(sessionUser, ["tenant.setup.view"]);
  const canOpenUsers = sessionHasAnyPermission(sessionUser, ["tenant.users.view", "tenant.users.manage"]);
  const canExportAudit = sessionHasAnyPermission(sessionUser, ["tenant.audit.export"]);
  const canReviewBlockers = sessionHasAnyPermission(sessionUser, ["tenant.security.view"]);

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={result.state === "live" ? "Live tenant console" : "Demo tenant console"}
        title="Tenant Admin Console"
        description="Start here to see the account state, the next launch action, and the focused pages that need attention."
        className="page-header-surface page-header-surface--compact"
        actions={
          <>
            {canOpenSetup ? (
              <Link className="button button--primary" href="/tenant-admin/setup">
                Continue setup
              </Link>
            ) : null}
            {canOpenUsers ? (
              <Link className="button button--secondary" href="/tenant-admin/users">
                Manage users
              </Link>
            ) : null}
            {canExportAudit ? (
              <a className="button button--secondary" href="/api/tenant-admin/commercial-support-audit/download">
                Download audit
              </a>
            ) : null}
          </>
        }
        pills={[data.tenant.code, commercial.plan.edition, commercial.subscription.status]}
        showPills
      />

      <section className="tenant-identity-strip" aria-label="Selected tenant">
        <div>
          <span>Selected tenant</span>
          <h2>{data.tenant.name}</h2>
        </div>
        <span className={statusBadgeClass(data.tenant.status)}>{titleCase(data.tenant.status)}</span>
      </section>

      <section className="section" id="dashboard">
        <div className="metric-grid-modern">
          <MetricTile label="Account posture" value={titleCase(data.summary.status)} trend={`${data.summary.blocked_check_count} blockers`} />
          <MetricTile label="Setup" value={`${setupCompletion}%`} trend={`${setupDoneCount}/${setupSteps.length} steps ready`} />
          <MetricTile label="Plan" value={titleCase(commercial.plan.plan_ref)} trend={commercial.subscription.billing_provider_ref || "Provider pending"} />
          <MetricTile label="Seats" value={`${data.seat_usage.current_value}/${data.seat_usage.limit_value || "unlimited"}`} trend={titleCase(data.seat_usage.status)} />
          <MetricTile label="Open requests" value={openRequests} trend="Plan and configuration" />
        </div>
      </section>

      <section className="section tenant-control-center" data-testid="tenant-admin-control-center">
        <article className="panel-card-soft tenant-console-panel tenant-control-card tenant-control-card--primary">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Control center</span>
              <h2>Start here</h2>
            </div>
            <span className={statusBadgeClass(data.summary.commercial_can_launch ? "ready" : data.summary.status)}>
              {data.summary.commercial_can_launch ? "Can launch" : titleCase(data.summary.status)}
            </span>
          </div>
          <div className="tenant-next-action" data-testid="tenant-next-action">
            <div>
              <span>Next action</span>
              <strong>{nextStep?.label ?? "No pending action"}</strong>
              <p>{nextStep?.detail ?? "You have view access to this tenant dashboard."}</p>
            </div>
            {nextStep ? <Link className="button button--primary" href={nextStep.href}>{nextStep.action}</Link> : null}
          </div>
          <div className="tenant-control-action-list">
            {visibleControlCards.map((item) => (
              <div className="tenant-control-action" key={item.label}>
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

        <article className="panel-card-soft tenant-console-panel tenant-control-card">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Account state</span>
              <h2>Readiness snapshot</h2>
            </div>
            <span className={statusBadgeClass(data.summary.status)}>{titleCase(data.summary.status)}</span>
          </div>
          <div className="tenant-console-detail-grid">
            <div className="detail-row">
              <span>Warnings</span>
              <strong>{warnings.length}</strong>
            </div>
            <div className="detail-row">
              <span>Published configs</span>
              <strong>{data.configuration_health.published_count}</strong>
            </div>
            <div className="detail-row">
              <span>Active members</span>
              <strong>{data.summary.active_membership_count}</strong>
            </div>
            <div className="detail-row">
              <span>Subscription</span>
              <strong>{titleCase(commercial.subscription.status)}</strong>
            </div>
          </div>
          <div className="form-actions-bar">
            <span className="muted">Open each focused page to complete account, access, support, and evidence tasks.</span>
            {canReviewBlockers ? <Link className="button button--primary" href="/tenant-admin/security-readiness">Review blockers</Link> : null}
          </div>
        </article>
      </section>

      <section className="section" data-testid="tenant-setup-guide">
        <article className="panel-card-soft tenant-console-panel tenant-setup-guide">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Launch progress</span>
              <h2>Setup guide</h2>
            </div>
            <span className={statusBadgeClass(data.summary.commercial_can_launch ? "ready" : data.summary.status)}>
              {setupCompletion}% complete
            </span>
          </div>
          <div className="tenant-setup-guide__body">
            <div className="tenant-setup-guide__summary">
              <strong>{visibleSetupDoneCount} of {visibleSetupSteps.length} visible launch steps complete</strong>
              <span>Each action opens the focused page where your role has access.</span>
            </div>
            <div className="tenant-setup-step-list">
              {visibleSetupSteps.map((step, index) => (
                <div className="tenant-setup-step" key={step.label}>
                  <div className="tenant-setup-step__index">{index + 1}</div>
                  <div>
                    <strong>{step.label}</strong>
                    <span>{step.detail}</span>
                  </div>
                  <span className={setupStepBadgeClass(step.status)}>{titleCase(step.status)}</span>
                  <Link className="button button--secondary" href={step.href}>{step.action}</Link>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
