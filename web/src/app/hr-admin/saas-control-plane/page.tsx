import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminSaasCommercialControl } from "@/lib/api";
import type { HrAdminSaasCommercialUsageLimit } from "@/lib/types";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { CommercialLifecycleActions } from "./commercial-lifecycle-actions";

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function statusBadgeClass(status: string) {
  if (status === "ok" || status === "active" || status === "unlimited") {
    return "readiness-badge readiness-badge--ready";
  }
  if (status === "near_limit" || status === "trialing") {
    return "readiness-badge readiness-badge--warning";
  }
  return "readiness-badge readiness-badge--blocked";
}

function usageProgress(item: HrAdminSaasCommercialUsageLimit) {
  if (item.limit_value <= 0) {
    return 100;
  }
  return Math.min(Math.round((item.current_value / item.limit_value) * 100), 100);
}

function formatDateTime(value: string) {
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

export default async function HrAdminSaasControlPlanePage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });
  const result = await getHrAdminSaasCommercialControl();
  const data = result.data;

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={result.state === "live" ? "Live control plane" : "Demo control plane"}
        title="SaaS Control Plane"
        description="Tenant plan, edition, entitlement, and usage-limit readiness."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin">
              Control center
            </Link>
            <Link className="button button--primary" href="/hr-admin/launch-remediation">
              Launch remediation
            </Link>
          </>
        }
        pills={[data.profile_ref, data.subscription.billing_provider_ref || "billing provider pending", data.plan.edition]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Launch commercial gate" value={data.summary.can_launch ? "Ready" : "Blocked"} trend={`${data.summary.missing_required_entitlement_count} missing entitlements`} />
          <MetricTile label="Plan" value={titleCase(data.plan.plan_ref || "Missing")} trend={`Edition ${titleCase(data.plan.edition)}`} />
          <MetricTile label="Subscription" value={titleCase(data.subscription.status)} trend={data.subscription.billing_provider_ref || "No provider ref"} />
          <MetricTile label="Usage exceptions" value={data.summary.exceeded_usage_limit_count} trend={`${data.summary.near_usage_limit_count} near limit`} />
          <MetricTile label="Entitlements" value={`${data.summary.enabled_entitlement_count}/${data.summary.entitlement_count}`} trend={`${data.summary.required_entitlement_count} required for launch`} />
          <MetricTile label="Enforcement scopes" value={data.enforcement.scope_count} trend={`${data.enforcement.blocking_scope_count} blocked`} />
        </div>
      </section>

      <section className="section saas-control-grid">
        <div className="saas-control-stack">
          <div className="panel-card-soft saas-control-panel">
            <div className="saas-control-panel__header">
              <div>
                <span className="workspace-card__eyebrow">Tenant commercial state</span>
                <h2>{data.tenant.name}</h2>
              </div>
              <span className={statusBadgeClass(data.summary.can_launch ? "ok" : "blocked")}>{data.summary.can_launch ? "Ready" : "Blocked"}</span>
            </div>
            <div className="saas-tenant-grid">
              <div className="detail-row">
                <span>Tenant</span>
                <strong>{data.tenant.code}</strong>
              </div>
              <div className="detail-row">
                <span>Status</span>
                <strong>{titleCase(data.tenant.status)}</strong>
              </div>
              <div className="detail-row">
                <span>Profile source</span>
                <strong>{titleCase(data.profile_source)}</strong>
              </div>
              <div className="detail-row">
                <span>Plan configured</span>
                <strong>{data.plan.configured ? "Yes" : "No"}</strong>
              </div>
            </div>
            <CommercialLifecycleActions control={data} />
          </div>

          <div className="panel-card-soft saas-control-panel">
            <div className="saas-control-panel__header">
              <div>
                <span className="workspace-card__eyebrow">Enforcement scopes</span>
                <h2>API access policy</h2>
              </div>
              <span className={statusBadgeClass(data.enforcement.blocking_scope_count ? "blocked" : "ok")}>
                {data.enforcement.enabled ? `${data.enforcement.blocking_scope_count} blocked` : "Disabled"}
              </span>
            </div>
            <div className="saas-enforcement-list">
              {data.enforcement.scopes.map((scope) => (
                <div className="saas-enforcement-row" key={scope.scope_ref}>
                  <div>
                    <strong>{scope.label}</strong>
                    <span>{scope.entitlements.join(", ") || "No entitlement refs"}</span>
                    {scope.blocking_reasons.length || scope.exceeded_usage_limits.length ? (
                      <span>
                        {[...scope.blocking_reasons, ...scope.exceeded_usage_limits].join(", ")}
                      </span>
                    ) : null}
                  </div>
                  <div className="saas-enforcement-row__meta">
                    <span>{scope.methods.join("/") || "All methods"}</span>
                    <span className={statusBadgeClass(scope.allowed ? "ok" : "blocked")}>{scope.allowed ? "Allowed" : "Blocked"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel-card-soft saas-control-panel">
          <div className="saas-control-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Required entitlements</span>
              <h2>Launch scope</h2>
            </div>
            <span className={statusBadgeClass(data.missing_required_entitlements.length ? "blocked" : "ok")}>
              {data.missing_required_entitlements.length ? "Blocked" : "Ready"}
            </span>
          </div>
          <div className="saas-entitlement-list">
            {data.entitlements.map((item) => {
              const isRequired = data.required_entitlements.includes(item.entitlement_ref);
              return (
                <div className="saas-entitlement-row" key={item.entitlement_ref}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.entitlement_ref}</span>
                  </div>
                  <div className="saas-entitlement-row__meta">
                    {isRequired ? <span className="record-chip">Required</span> : null}
                    <span className={statusBadgeClass(item.enabled ? "ok" : "blocked")}>{item.enabled ? "Enabled" : "Disabled"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="panel-card-soft saas-control-panel">
          <div className="saas-control-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Usage limits</span>
              <h2>Metered headroom</h2>
            </div>
            <span className={statusBadgeClass(data.exceeded_usage_limits.length ? "blocked" : "ok")}>
              {data.exceeded_usage_limits.length ? "Limit exceeded" : "Within limits"}
            </span>
          </div>
          <div className="saas-usage-grid">
            {data.usage_limits.map((item) => (
              <article className="saas-usage-card" key={item.meter_ref}>
                <div className="saas-usage-card__header">
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.meter_ref}</span>
                  </div>
                  <span className={statusBadgeClass(item.status)}>{titleCase(item.status)}</span>
                </div>
                <div className="saas-usage-card__meter" aria-label={`${item.label} usage`}>
                  <span style={{ width: `${usageProgress(item)}%` }} />
                </div>
                <div className="saas-usage-card__numbers">
                  <span>{item.current_value} used</span>
                  <strong>{item.limit_value > 0 ? `${item.remaining_value} left of ${item.limit_value}` : "Unlimited"}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section saas-history-grid">
        <div className="panel-card-soft saas-control-panel">
          <div className="saas-control-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Usage snapshot ledger</span>
              <h2>Recent meter evidence</h2>
            </div>
            <span className="record-chip">{data.recent_usage_snapshots.length} rows</span>
          </div>
          <div className="saas-history-list">
            {data.recent_usage_snapshots.length ? (
              data.recent_usage_snapshots.slice(0, 6).map((snapshot) => (
                <div className="saas-history-row" key={snapshot.id}>
                  <div>
                    <strong>{snapshot.label}</strong>
                    <span>{snapshot.meter_ref}</span>
                  </div>
                  <div>
                    <strong>{snapshot.current_value}/{snapshot.limit_value || "unlimited"}</strong>
                    <span>{formatDateTime(snapshot.recorded_at)}</span>
                  </div>
                  <span className={statusBadgeClass(snapshot.status)}>{titleCase(snapshot.status)}</span>
                </div>
              ))
            ) : (
              <p className="muted-text">No usage snapshots recorded yet.</p>
            )}
          </div>
        </div>

        <div className="panel-card-soft saas-control-panel">
          <div className="saas-control-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Commercial audit history</span>
              <h2>Lifecycle evidence</h2>
            </div>
            <span className="record-chip">{data.recent_audit_events.length} events</span>
          </div>
          <div className="saas-history-list">
            {data.recent_audit_events.length ? (
              data.recent_audit_events.slice(0, 5).map((event) => (
                <div className="saas-history-row" key={event.id}>
                  <div>
                    <strong>{titleCase(event.event_type)}</strong>
                    <span>{event.source_ref}</span>
                  </div>
                  <div>
                    <strong>{titleCase(event.plan_ref || "unconfigured")}</strong>
                    <span>{event.actor_identifier || "system"} - {formatDateTime(event.occurred_at)}</span>
                  </div>
                  <span className={statusBadgeClass(event.subscription_status)}>{titleCase(event.subscription_status)}</span>
                </div>
              ))
            ) : (
              <p className="muted-text">No commercial audit events recorded yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
