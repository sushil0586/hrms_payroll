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

export default async function TenantAdminConsolePage() {
  const result = await getTenantAdminConsole();
  const data = result.data;
  const commercial = data.commercial_control;

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
