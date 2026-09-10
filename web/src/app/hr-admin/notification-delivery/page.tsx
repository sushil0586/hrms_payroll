import Link from "next/link";

import { NotificationDeliveryManager } from "@/app/hr-admin/notification-delivery/notification-delivery-manager";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminNotificationDiagnostics, getHrAdminNotificationOptions } from "@/lib/api";
import { formatNotificationDateTime } from "@/lib/notification-observability";

export default async function HrAdminNotificationDeliveryPage() {
  const [result, diagnosticsResult] = await Promise.all([
    getHrAdminNotificationOptions(),
    getHrAdminNotificationDiagnostics({ scope: "delivery" }),
  ]);
  const enabledChannels = result.data.channel_configurations.filter((item) => item.is_enabled).length;
  const emailEnabled = result.data.channel_configurations.some((item) => item.channel === "email" && item.is_enabled);
  const channelSummaries = diagnosticsResult.data.channel_diagnostics;
  const channelsWithFailures = channelSummaries.filter((item) => item.failed_notification_count > 0).length;
  const retryCapped = channelSummaries.reduce((sum, item) => sum + item.retry_capped_count, 0);

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live delivery control" : "Demo delivery control"}
        title="Notification delivery"
        description="Configure tenant routing for in-app, email, SMS, push, and WhatsApp delivery."
        actions={<Link className="button button--secondary" href="/hr-admin/notifications-admin">Back to notifications</Link>}
        pills={[`${enabledChannels} enabled channels`, `${result.data.notification_delivery_backends.length} backend options`]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Configured channels" value={result.data.channel_configurations.length} trend="Tenant delivery paths" />
          <MetricTile label="Enabled channels" value={enabledChannels} trend="Currently routable" />
          <MetricTile label="Channels with failures" value={channelsWithFailures} trend="Recent delivery risk" />
          <MetricTile label="Retry capped items" value={retryCapped} trend="Needs operator recovery" />
          <MetricTile label="Backend options" value={result.data.notification_delivery_backends.length} trend="Extensible provider keys" />
          <MetricTile label="Email readiness" value={emailEnabled ? 1 : 0} trend={emailEnabled ? "Email channel enabled" : "Email channel disabled"} />
        </div>
      </section>

      <section className="section">
        <div className="notice">
          <strong>Operator note.</strong>
          <span className="muted">
            These channel settings shape how `process_notifications` delivers queued notifications now, while keeping the backend extensible for real provider integrations later.
          </span>
        </div>
      </section>

      <section className="section">
        <article className="card panel panel-card-soft">
          <div className="queue-toolbar__header">
            <div>
              <h2 className="section-heading-soft">Channel health</h2>
              <p className="section-copy section-copy-soft">
                Review recent queue pressure, failed attempts, and retry exposure before changing backend routing.
              </p>
            </div>
            <div className="queue-toolbar__meta">
              <span className="queue-summary-chip">
                <strong>{diagnosticsResult.data.overview.live_notifications}</strong> tracked notifications
              </span>
              <span className="queue-summary-chip">
                <strong>{channelsWithFailures}</strong> channels with failures
              </span>
              <span className="queue-summary-chip">
                <strong>{retryCapped}</strong> retry capped
              </span>
            </div>
          </div>

          <div className="stack-list">
            {channelSummaries.map((summary) => (
              <article className="record-card" key={summary.channel}>
                <div className="record-card__header">
                  <div className="record-card__title-block">
                    <h3>{summary.label}</h3>
                    <p>
                      {summary.is_enabled ? "Enabled" : "Disabled"} • {summary.backend_key || "No backend mapped yet"}
                    </p>
                  </div>
                  <div className="record-card__actions">
                    <span className="record-chip">{summary.live_notification_count} tracked</span>
                    {summary.failed_notification_count ? <span className="record-chip">{summary.failed_notification_count} failed</span> : null}
                    {summary.retry_capped_count ? <span className="record-chip">Retry capped {summary.retry_capped_count}</span> : null}
                    <Link className="button button--secondary" href={`/hr-admin/notifications?channel=${summary.channel}`}>
                      Open queue
                    </Link>
                    <Link className="button button--ghost" href={`/hr-admin/notifications?channel=${summary.channel}&status=failed`}>
                      Failed only
                    </Link>
                    <Link className="button button--ghost" href={`/hr-admin/notifications?channel=${summary.channel}&retry_state=retry_ready`}>
                      Retry ready
                    </Link>
                  </div>
                </div>

                <div className="record-card__details">
                  <div>
                    <span className="record-card__label">Pending</span>
                    <strong>{summary.pending_notification_count}</strong>
                  </div>
                  <div>
                    <span className="record-card__label">Delivered or read</span>
                    <strong>{summary.delivered_notification_count}</strong>
                  </div>
                  <div>
                    <span className="record-card__label">Retry ready</span>
                    <strong>{summary.retry_ready_count}</strong>
                  </div>
                  <div>
                    <span className="record-card__label">Last activity</span>
                    <strong>{formatNotificationDateTime(summary.latest_notification_at)}</strong>
                  </div>
                </div>

                {summary.provider_names.length ? (
                  <div className="record-card__notes">
                    <strong>Observed providers</strong>
                    <p>{summary.provider_names.join(", ")}</p>
                  </div>
                ) : null}

                {summary.latest_failure_message ? (
                  <div className="notice">
                    <strong>Latest failure.</strong>
                    <span className="muted">
                      {summary.latest_failure_message}{" "}
                      {summary.latest_failure_at ? `Logged ${formatNotificationDateTime(summary.latest_failure_at)}.` : ""}
                    </span>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </article>
      </section>

      <NotificationDeliveryManager options={result.data} />
    </main>
  );
}
