import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getTenantAdminConsole } from "@/lib/api";
import { TenantChangeRequestActions } from "./tenant-change-request-actions";
import { TenantMembershipActions } from "./tenant-membership-actions";
import { TenantSupportAccessActions } from "./tenant-support-access-actions";

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
  const result = await getTenantAdminConsole();
  const data = result.data;
  const commercial = data.commercial_control;
  const blockers = data.governance_checks.filter((check) => check.status === "blocked");
  const warnings = data.governance_checks.filter((check) => check.status === "warning");
  const openRequests = openChangeRequestCount(data);
  const activeSupportGrants = activeSupportGrantCount(data);
  const tenantActions = [
    {
      label: "Governance blockers",
      value: blockers.length,
      detail: blockers.length ? "Resolve blocked checks before customer launch." : "No blocking tenant checks.",
      href: "/tenant-admin/security-readiness",
      action: "Review security",
    },
    {
      label: "Seat usage",
      value: `${data.seat_usage.current_value}/${data.seat_usage.limit_value || "unlimited"}`,
      detail: `${titleCase(data.seat_usage.status)} usage posture.`,
      href: "/tenant-admin",
      action: "Manage members",
    },
    {
      label: "Change queue",
      value: openRequests,
      detail: openRequests ? "Commercial or configuration requests need owner action." : "No open change requests.",
      href: "/tenant-admin",
      action: "Open queue",
    },
    {
      label: "Support access",
      value: activeSupportGrants,
      detail: activeSupportGrants ? "Review active or approved support access." : "No active support access grants.",
      href: "/tenant-admin/trust-audit?event_group=support",
      action: "Audit access",
    },
  ];
  const setupSteps = [
    {
      label: "Confirm company profile",
      detail: `${data.tenant.legal_name || data.tenant.name} · ${data.tenant.country_code} · ${data.tenant.timezone}`,
      status: data.tenant.legal_name && data.tenant.country_code && data.tenant.timezone ? "done" : "action",
      href: "/tenant-admin",
      action: "Review account",
    },
    {
      label: "Invite workspace owners",
      detail: `${data.summary.active_membership_count} active members across ${data.summary.role_count} roles`,
      status: data.summary.active_membership_count > 1 ? "done" : "action",
      href: "/tenant-admin",
      action: "Manage members",
    },
    {
      label: "Resolve launch checks",
      detail: blockers.length ? `${blockers.length} blockers need action` : `${warnings.length} warnings to monitor`,
      status: blockers.length ? "action" : warnings.length ? "watch" : "done",
      href: "/tenant-admin/security-readiness",
      action: "Open security",
    },
    {
      label: "Publish operating configuration",
      detail: `${data.configuration_health.published_count} published configs, ${data.configuration_health.draft_count} drafts`,
      status: data.configuration_health.published_count ? "done" : "action",
      href: "/hr-admin/payroll-setup",
      action: "Open setup",
    },
    {
      label: "Validate audit evidence",
      detail: `${data.recent_audit_events.length} recent lifecycle events recorded`,
      status: data.recent_audit_events.length ? "done" : "watch",
      href: "/tenant-admin/trust-audit",
      action: "Open audit",
    },
  ] as const;
  const setupDoneCount = setupSteps.filter((step) => step.status === "done").length;
  const setupCompletion = Math.round((setupDoneCount / setupSteps.length) * 100);

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={result.state === "live" ? "Live tenant console" : "Demo tenant console"}
        title="Tenant Admin Console"
        description="Account posture, seats, configuration health, and commercial readiness."
        actions={
          <>
            <a className="button button--primary" href="/api/tenant-admin/commercial-support-audit/download">
              Download audit
            </a>
            <Link className="button button--secondary" href="/tenant-admin/trust-audit">
              Trust audit
            </Link>
            <Link className="button button--secondary" href="/tenant-admin/security-readiness">
              Security
            </Link>
            <Link className="button button--secondary" href="/">
              Workspaces
            </Link>
          </>
        }
        pills={[data.tenant.code, commercial.plan.edition, commercial.subscription.status]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Account posture" value={titleCase(data.summary.status)} trend={`${data.summary.blocked_check_count} blockers`} />
          <MetricTile label="Plan" value={titleCase(commercial.plan.plan_ref)} trend={commercial.subscription.billing_provider_ref || "Provider pending"} />
          <MetricTile label="Seats" value={`${data.seat_usage.current_value}/${data.seat_usage.limit_value || "unlimited"}`} trend={titleCase(data.seat_usage.status)} />
          <MetricTile label="Roles" value={data.summary.role_count} trend={`${data.summary.active_membership_count} active members`} />
          <MetricTile label="Configs" value={data.configuration_health.published_count} trend={`${data.configuration_health.draft_count} drafts`} />
        </div>
      </section>

      <section className="section" data-testid="tenant-setup-guide">
        <article className="panel-card-soft tenant-console-panel tenant-setup-guide">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Guided setup</span>
              <h2>Tenant launch guide</h2>
            </div>
            <span className={statusBadgeClass(data.summary.commercial_can_launch ? "ready" : data.summary.status)}>
              {setupCompletion}% complete
            </span>
          </div>
          <div className="tenant-setup-guide__body">
            <div className="tenant-setup-guide__summary">
              <strong>{setupDoneCount} of {setupSteps.length} launch steps complete</strong>
              <span>
                Start here after tenant creation. Each item links to the workspace where the tenant admin or HR admin
                can finish the setup evidence.
              </span>
            </div>
            <div className="tenant-setup-step-list">
              {setupSteps.map((step, index) => (
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

      <section className="section tenant-control-center" data-testid="tenant-admin-control-center">
        <article className="panel-card-soft tenant-console-panel tenant-control-card tenant-control-card--primary">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Control center</span>
              <h2>Owner command queue</h2>
            </div>
            <span className={statusBadgeClass(data.summary.status)}>{titleCase(data.summary.status)}</span>
          </div>
          <div className="tenant-control-action-list">
            {tenantActions.map((item) => (
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
              <span className="workspace-card__eyebrow">Launch posture</span>
              <h2>Readiness snapshot</h2>
            </div>
            <span className={statusBadgeClass(data.summary.commercial_can_launch ? "ready" : data.summary.status)}>
              {data.summary.commercial_can_launch ? "Can launch" : titleCase(data.summary.status)}
            </span>
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
            <span className="muted">Use trust, security, and audit evidence before inviting a pilot customer admin.</span>
            <Link className="button button--primary" href="/tenant-admin/trust-audit">Open trust audit</Link>
          </div>
        </article>
      </section>

      <section className="section tenant-console-grid">
        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Tenant account</span>
              <h2>{data.tenant.name}</h2>
            </div>
            <span className={statusBadgeClass(data.tenant.status)}>{titleCase(data.tenant.status)}</span>
          </div>
          <div className="tenant-console-detail-grid">
            <div className="detail-row">
              <span>Legal name</span>
              <strong>{data.tenant.legal_name || data.tenant.name}</strong>
            </div>
            <div className="detail-row">
              <span>Country</span>
              <strong>{data.tenant.country_code}</strong>
            </div>
            <div className="detail-row">
              <span>Timezone</span>
              <strong>{data.tenant.timezone}</strong>
            </div>
            <div className="detail-row">
              <span>Onboarding</span>
              <strong>{titleCase(data.tenant.onboarding_status)}</strong>
            </div>
          </div>
        </div>

        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Governance checks</span>
              <h2>Self-service readiness</h2>
            </div>
            <span className={statusBadgeClass(data.summary.status)}>{titleCase(data.summary.status)}</span>
          </div>
          <div className="tenant-console-list">
            {data.governance_checks.map((check) => (
              <div className="tenant-console-row" key={check.ref}>
                <div>
                  <strong>{check.label}</strong>
                  <span>{String(check.value)}</span>
                </div>
                <span className={statusBadgeClass(check.status)}>{titleCase(check.status)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="panel-card-soft tenant-console-panel">
          <TenantMembershipActions data={data} />
        </div>
      </section>

      <section className="section">
        <div className="panel-card-soft tenant-console-panel">
          <TenantChangeRequestActions data={data} />
        </div>
      </section>

      <section className="section">
        <div className="panel-card-soft tenant-console-panel">
          <TenantSupportAccessActions data={data} />
        </div>
      </section>

      <section className="section tenant-console-grid">
        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Role coverage</span>
              <h2>Seat ownership</h2>
            </div>
            <span className="record-chip">{data.summary.active_membership_count} active</span>
          </div>
          <div className="tenant-console-list">
            {data.role_coverage.map((role) => (
              <div className="tenant-console-row" key={role.role_ref}>
                <div>
                  <strong>{role.label}</strong>
                  <span>{role.role_ref}</span>
                </div>
                <span className="record-chip">{role.active_membership_count} seats</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Configuration health</span>
              <h2>Published posture</h2>
            </div>
            <span className="record-chip">{data.configuration_health.tenant_configuration_count} configs</span>
          </div>
          <div className="tenant-console-list">
            {data.configuration_health.recent_configurations.length ? (
              data.configuration_health.recent_configurations.map((config) => (
                <div className="tenant-console-row" key={config.key}>
                  <div>
                    <strong>{config.name}</strong>
                    <span>{config.key}</span>
                  </div>
                  <div className="tenant-console-row__meta">
                    <span>{titleCase(config.status)}</span>
                    <span>{formatDateTime(config.updated_at)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="tenant-console-empty">No tenant configurations published yet.</p>
            )}
          </div>
        </div>
      </section>

      <section className="section tenant-console-grid">
        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Usage evidence</span>
              <h2>Recent meter snapshots</h2>
            </div>
            <span className="record-chip">{data.recent_usage_snapshots.length} rows</span>
          </div>
          <div className="tenant-console-list">
            {data.recent_usage_snapshots.slice(0, 4).map((snapshot) => (
              <div className="tenant-console-row" key={snapshot.id}>
                <div>
                  <strong>{snapshot.label}</strong>
                  <span>{snapshot.meter_ref}</span>
                </div>
                <div className="tenant-console-row__meta">
                  <span>{snapshot.current_value}/{snapshot.limit_value || "unlimited"}</span>
                  <span>{formatDateTime(snapshot.recorded_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Commercial audit</span>
              <h2>Recent lifecycle events</h2>
            </div>
            <span className="record-chip">{data.recent_audit_events.length} events</span>
          </div>
          <div className="tenant-console-list">
            {data.recent_audit_events.slice(0, 4).map((event) => (
              <div className="tenant-console-row" key={event.id}>
                <div>
                  <strong>{titleCase(event.event_type)}</strong>
                  <span>{event.source_ref}</span>
                </div>
                <div className="tenant-console-row__meta">
                  <span>{event.actor_identifier || "system"}</span>
                  <span>{formatDateTime(event.occurred_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
