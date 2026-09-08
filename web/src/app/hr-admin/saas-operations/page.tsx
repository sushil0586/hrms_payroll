import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminSaasOperationalHealth } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function statusBadgeClass(status: string) {
  if (status === "ready" || status === "active" || status === "ok") {
    return "readiness-badge readiness-badge--ready";
  }
  if (status === "warning" || status === "near_limit" || status === "queued") {
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

export default async function HrAdminSaasOperationsPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });
  const result = await getHrAdminSaasOperationalHealth();
  const data = result.data;

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={result.state === "live" ? "Live operations" : "Demo operations"}
        title="SaaS Operations"
        description="Tenant health, queue posture, support activity, and commercial evidence."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/saas-control-plane">
              Control plane
            </Link>
            <Link className="button button--secondary" href="/hr-admin/saas-resilience">
              Resilience
            </Link>
            <Link className="button button--secondary" href="/hr-admin/saas-sla-operations">
              SLA ops
            </Link>
            <Link className="button button--primary" href="/hr-admin/launch-remediation">
              Launch remediation
            </Link>
          </>
        }
        pills={[data.profile_ref, data.tenant.code, titleCase(data.summary.status)]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Operations posture" value={titleCase(data.summary.status)} trend={`${data.summary.blocked_signal_count} blocked signals`} />
          <MetricTile label="Open remediation" value={data.summary.open_remediation_count} trend={`${data.summary.overdue_remediation_count} overdue`} />
          <MetricTile label="Resilience" value={titleCase(data.summary.resilience_status)} trend={`${data.summary.resilience_blocker_count} blockers`} />
          <MetricTile label="SLA ops" value={titleCase(data.summary.sla_status)} trend={`${data.summary.sla_open_incident_count} open incidents`} />
          <MetricTile label="Notifications" value={data.summary.failed_notification_count} trend={`${data.summary.pending_notification_count} pending`} />
          <MetricTile label="Provider queue" value={data.summary.queued_provider_job_count} trend={`${data.summary.dead_lettered_provider_job_count} dead-lettered`} />
          <MetricTile label="Support sessions" value={data.summary.active_support_session_count} trend={`${data.summary.expired_support_grant_count} expired grants`} />
          <MetricTile label="Tenant changes" value={data.summary.pending_change_request_count} trend="Awaiting decision" />
        </div>
      </section>

      <section className="section saas-history-grid">
        <div className="panel-card-soft saas-control-panel">
          <div className="saas-control-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Health signals</span>
              <h2>Operational triage</h2>
            </div>
            <span className={statusBadgeClass(data.summary.status)}>{titleCase(data.summary.status)}</span>
          </div>
          <div className="saas-history-list">
            {data.signals.map((signal) => (
              <div className="saas-history-row" key={signal.ref}>
                <div>
                  <strong>{signal.label}</strong>
                  <span>{signal.detail}</span>
                </div>
                <div>
                  <strong>{String(signal.value)}</strong>
                  <span>{signal.owner_role_ref}</span>
                </div>
                <Link className={statusBadgeClass(signal.status)} href={signal.href}>
                  {titleCase(signal.status)}
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card-soft saas-control-panel">
          <div className="saas-control-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Launch posture</span>
              <h2>{data.launch_audit.audit_profile_ref}</h2>
            </div>
            <span className={statusBadgeClass(data.launch_audit.status)}>{titleCase(data.launch_audit.status)}</span>
          </div>
          <div className="tenant-console-detail-grid">
            <div className="detail-row">
              <span>Blockers</span>
              <strong>{data.launch_audit.blocker_count}</strong>
            </div>
            <div className="detail-row">
              <span>Warnings</span>
              <strong>{data.launch_audit.warning_count}</strong>
            </div>
            <div className="detail-row">
              <span>Commercial plan</span>
              <strong>{titleCase(data.commercial_control.plan.plan_ref || "missing")}</strong>
            </div>
            <div className="detail-row">
              <span>Subscription</span>
              <strong>{titleCase(data.commercial_control.subscription.status)}</strong>
            </div>
            <div className="detail-row">
              <span>Resilience</span>
              <strong>{titleCase(data.resilience_readiness.summary.status)}</strong>
            </div>
            <div className="detail-row">
              <span>Backup cadence</span>
              <strong>{data.resilience_readiness.backup.frequency_hours}h</strong>
            </div>
            <div className="detail-row">
              <span>SLA incidents</span>
              <strong>{data.sla_operations.summary.open_incident_count}</strong>
            </div>
            <div className="detail-row">
              <span>SLA breaches</span>
              <strong>{data.sla_operations.summary.breached_incident_count}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="section tenant-console-grid">
        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Delivery health</span>
              <h2>Notifications and provider jobs</h2>
            </div>
            <span className={statusBadgeClass(data.summary.failed_notification_count || data.summary.dead_lettered_provider_job_count ? "blocked" : "ready")}>
              {data.summary.failed_notification_count || data.summary.dead_lettered_provider_job_count ? "Watch" : "Ready"}
            </span>
          </div>
          <div className="tenant-console-detail-grid">
            <div className="detail-row">
              <span>Notifications sent today</span>
              <strong>{data.notification_delivery.sent_today_count}</strong>
            </div>
            <div className="detail-row">
              <span>Failed notifications</span>
              <strong>{data.notification_delivery.failed_count}</strong>
            </div>
            <div className="detail-row">
              <span>Running provider jobs</span>
              <strong>{data.summary.running_provider_job_count}</strong>
            </div>
            <div className="detail-row">
              <span>Stale provider jobs</span>
              <strong>{data.provider_queue.stale_job_count}</strong>
            </div>
          </div>
        </div>

        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Support and tenant requests</span>
              <h2>Tenant-owned operations</h2>
            </div>
            <span className="record-chip">{data.support_access.active_session_count} active sessions</span>
          </div>
          <div className="tenant-console-detail-grid">
            <div className="detail-row">
              <span>Expired runtime grants</span>
              <strong>{data.support_access.expired_runtime_grant_count}</strong>
            </div>
            <div className="detail-row">
              <span>Pending change requests</span>
              <strong>{data.tenant_change_requests.pending_count}</strong>
            </div>
            <div className="detail-row">
              <span>Commercial events</span>
              <strong>{data.summary.commercial_event_count}</strong>
            </div>
            <div className="detail-row">
              <span>Usage snapshots</span>
              <strong>{data.summary.usage_snapshot_count}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="section saas-history-grid">
        <div className="panel-card-soft saas-control-panel">
          <div className="saas-control-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Commercial audit</span>
              <h2>Recent lifecycle events</h2>
            </div>
            <span className="record-chip">{data.recent_commercial_events.length} events</span>
          </div>
          <div className="saas-history-list">
            {data.recent_commercial_events.slice(0, 5).map((event) => (
              <div className="saas-history-row" key={event.id}>
                <div>
                  <strong>{titleCase(event.event_type)}</strong>
                  <span>{event.source_ref}</span>
                </div>
                <div>
                  <strong>{event.actor_identifier || "system"}</strong>
                  <span>{formatDateTime(event.occurred_at)}</span>
                </div>
                <span className="record-chip">{event.source_hash.slice(0, 8)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card-soft saas-control-panel">
          <div className="saas-control-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Usage evidence</span>
              <h2>Recent meter snapshots</h2>
            </div>
            <span className="record-chip">{data.recent_usage_snapshots.length} rows</span>
          </div>
          <div className="saas-history-list">
            {data.recent_usage_snapshots.slice(0, 5).map((snapshot) => (
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
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
