import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getTenantAdminConsole } from "@/lib/api";

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

export default async function TenantAdminSettingsPage() {
  const result = await getTenantAdminConsole();
  const data = result.data;
  const commercial = data.commercial_control;

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={result.state === "live" ? "Live account settings" : "Demo account settings"}
        title="Tenant Settings"
        description="Review tenant-owned account profile, platform-owned identifiers, and configuration posture."
        actions={
          <>
            <Link className="button button--primary" href="/tenant-admin">
              Back to dashboard
            </Link>
            <Link className="button button--secondary" href="/tenant-admin/setup">
              Setup guide
            </Link>
            <Link
              className="button button--secondary"
              href="/tenant-admin/plan?request_type=configuration_change&target_ref=tenant.account.profile&title=Update%20tenant%20account%20profile&description=Request%20a%20platform-reviewed%20tenant%20profile%20change."
            >
              Request account change
            </Link>
          </>
        }
        pills={[data.tenant.code, data.tenant.country_code, data.tenant.timezone]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Tenant status" value={titleCase(data.tenant.status)} trend={titleCase(data.tenant.onboarding_status)} />
          <MetricTile label="Plan" value={titleCase(commercial.plan.plan_ref)} trend={commercial.subscription.status} />
          <MetricTile label="Configs" value={data.configuration_health.published_count} trend={`${data.configuration_health.draft_count} drafts`} />
          <MetricTile label="Governance" value={titleCase(data.summary.status)} trend={`${data.summary.blocked_check_count} blockers`} />
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
              <span>Tenant code</span>
              <strong>{data.tenant.code}</strong>
            </div>
            <div className="detail-row">
              <span>Country</span>
              <strong>{data.tenant.country_code}</strong>
            </div>
            <div className="detail-row">
              <span>Timezone</span>
              <strong>{data.tenant.timezone}</strong>
            </div>
          </div>
          <p className="tenant-console-empty">Tenant identifiers are platform-governed. Use Request account change for legal-name, code, timezone, or activation updates.</p>
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
                  </div>
                </div>
              ))
            ) : (
              <p className="tenant-console-empty">No tenant configurations published yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
