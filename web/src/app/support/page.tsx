import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getSupportSessionTenantConsole } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not set";
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

function statusBadgeClass(status: string) {
  if (status === "ready" || status === "active" || status === "ok" || status === "support_session_allowed") {
    return "readiness-badge readiness-badge--ready";
  }
  if (status === "warning" || status === "near_limit" || status === "requested" || status === "approved") {
    return "readiness-badge readiness-badge--warning";
  }
  return "readiness-badge readiness-badge--blocked";
}

export default async function SupportConsolePage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const tenantCode = normalizeParam(currentParams.tenant_code) || "northstar-foods";
  const scopeRef = normalizeParam(currentParams.scope_ref) || "configuration_health";
  const sessionRef = normalizeParam(currentParams.session_ref) || "support-session-demo-001";
  const result = await getSupportSessionTenantConsole({
    tenant_code: tenantCode,
    scope_ref: scopeRef,
    session_ref: sessionRef,
  });
  const data = result.data;
  const account = data.account;
  const configurationHealth = data.configuration_health;
  const grant = data.support_session.grant;

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={result.state === "live" ? "Live support session" : "Demo support session"}
        title="Support Console"
        description="Scoped tenant posture for approved, time-boxed support sessions."
        actions={
          <>
            <Link className="button button--secondary" href="/">
              Workspaces
            </Link>
            <Link className="button button--secondary" href={`/support/domain-snapshot?tenant_code=${tenantCode}&session_ref=${sessionRef}&domain_ref=payroll_providers`}>
              Domain snapshot
            </Link>
            <Link className="button button--primary" href="/tenant-admin">
              Tenant console
            </Link>
          </>
        }
        pills={[data.tenant.code, titleCase(data.support_session.code), `${data.granted_sections.length} scopes`]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Session" value={data.support_session.allowed ? "Allowed" : "Denied"} trend={titleCase(data.support_session.required_scope_ref)} />
          <MetricTile label="Tenant" value={data.tenant.name} trend={data.tenant.code} />
          <MetricTile
            label="Agent"
            value={data.support_session.actor_identifier || "Unknown"}
            trend={grant?.support_agent_identifier || "Grant pending"}
            valueClassName="support-session-metric-value"
            trendClassName="support-session-metric-trend"
          />
          <MetricTile label="Expires" value={formatDateTime(data.support_session.access_expires_at)} trend={data.support_session.session_ref} />
        </div>
      </section>

      <section className="section support-session-grid">
        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Runtime enforcement</span>
              <h2>Support session gate</h2>
            </div>
            <span className={statusBadgeClass(data.support_session.code)}>{titleCase(data.support_session.code)}</span>
          </div>
          <div className="tenant-console-list">
            <div className="tenant-console-row">
              <div>
                <strong>{grant?.reason || data.support_session.detail}</strong>
                <span>{data.support_session.detail}</span>
              </div>
              <span className="record-chip support-session-method-chip">{data.support_session.method}</span>
            </div>
            <div className="support-session-scopes">
              {data.granted_sections.map((scope) => (
                <span className="record-chip" key={scope}>
                  {titleCase(scope)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Account posture</span>
              <h2>{account ? titleCase(account.summary.status) : "Not granted"}</h2>
            </div>
            <span className={statusBadgeClass(account?.summary.status || "blocked")}>{account ? "Granted" : "Hidden"}</span>
          </div>
          {account ? (
            <div className="tenant-console-detail-grid">
              <div className="detail-row">
                <span>Seats</span>
                <strong>{account.seat_usage.current_value}/{account.seat_usage.limit_value || "unlimited"}</strong>
              </div>
              <div className="detail-row">
                <span>Plan</span>
                <strong>{titleCase(account.commercial_control.plan.plan_ref)}</strong>
              </div>
              <div className="detail-row">
                <span>Subscription</span>
                <strong>{titleCase(account.commercial_control.subscription.status)}</strong>
              </div>
              <div className="detail-row">
                <span>Roles</span>
                <strong>{account.role_coverage.length}</strong>
              </div>
            </div>
          ) : (
            <p className="tenant-console-empty">Account scope is not included in this support session.</p>
          )}
        </div>
      </section>

      <section className="section support-session-grid">
        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Configuration health</span>
              <h2>{configurationHealth ? "Published posture" : "Not granted"}</h2>
            </div>
            <span className="record-chip">{configurationHealth ? `${configurationHealth.tenant_configuration_count} configs` : "Hidden"}</span>
          </div>
          <div className="tenant-console-list">
            {configurationHealth?.recent_configurations.length ? (
              configurationHealth.recent_configurations.map((config) => (
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
              <p className="tenant-console-empty">Configuration scope is not available for this session.</p>
            )}
          </div>
        </div>

        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Commercial evidence</span>
              <h2>{data.commercial_evidence ? "Audit-visible" : "Not granted"}</h2>
            </div>
            <span className="record-chip">{data.commercial_evidence?.recent_audit_events.length ?? 0} events</span>
          </div>
          <div className="tenant-console-list">
            {data.commercial_evidence?.recent_audit_events.length ? (
              data.commercial_evidence.recent_audit_events.slice(0, 4).map((event) => (
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
              ))
            ) : (
              <p className="tenant-console-empty">Commercial evidence scope is not available for this session.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
