import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getTenantAdminConsole } from "@/lib/api";
import { TenantChangeRequestActions } from "../tenant-change-request-actions";

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
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

export default async function TenantAdminPlanPage() {
  const result = await getTenantAdminConsole();
  const data = result.data;
  const commercial = data.commercial_control;

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={result.state === "live" ? "Live plan control" : "Demo plan control"}
        title="Plans And Subscription"
        description="Review commercial posture and request plan or configuration changes."
        actions={
          <>
            <Link className="button button--primary" href="/tenant-admin">
              Back to dashboard
            </Link>
            <a className="button button--secondary" href="/api/tenant-admin/commercial-support-audit/download">
              Download audit
            </a>
          </>
        }
        pills={[data.tenant.code, commercial.plan.edition, commercial.subscription.status]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Plan" value={titleCase(commercial.plan.plan_ref)} trend={commercial.plan.edition} />
          <MetricTile label="Subscription" value={titleCase(commercial.subscription.status)} trend={commercial.subscription.billing_provider_ref || "Provider pending"} />
          <MetricTile label="Seat usage" value={`${data.seat_usage.current_value}/${data.seat_usage.limit_value || "unlimited"}`} trend={titleCase(data.seat_usage.status)} />
          <MetricTile label="Requests" value={data.change_request_management.recent_requests.length} trend="Recent changes" />
        </div>
      </section>

      <section className="section tenant-console-grid">
        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Commercial profile</span>
              <h2>Current subscription</h2>
            </div>
            <span className="record-chip">{titleCase(commercial.subscription.status)}</span>
          </div>
          <div className="tenant-console-detail-grid">
            <div className="detail-row">
              <span>Plan ref</span>
              <strong>{commercial.plan.plan_ref}</strong>
            </div>
            <div className="detail-row">
              <span>Edition</span>
              <strong>{commercial.plan.edition}</strong>
            </div>
            <div className="detail-row">
              <span>Billing provider</span>
              <strong>{commercial.subscription.billing_provider_ref || "Not connected"}</strong>
            </div>
            <div className="detail-row">
              <span>Last audit event</span>
              <strong>{formatDateTime(data.recent_audit_events[0]?.occurred_at ?? null)}</strong>
            </div>
          </div>
        </div>

        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Usage evidence</span>
              <h2>Recent meter snapshots</h2>
            </div>
            <span className="record-chip">{data.recent_usage_snapshots.length} rows</span>
          </div>
          <div className="tenant-console-list">
            {data.recent_usage_snapshots.slice(0, 6).map((snapshot) => (
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
            {!data.recent_usage_snapshots.length ? <p className="tenant-console-empty">No usage snapshots recorded yet.</p> : null}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="panel-card-soft tenant-console-panel">
          <TenantChangeRequestActions data={data} />
        </div>
      </section>
    </main>
  );
}
