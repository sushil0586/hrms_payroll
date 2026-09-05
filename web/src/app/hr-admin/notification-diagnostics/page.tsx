import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminNotificationDiagnostics } from "@/lib/api";
import { formatNotificationDateTime } from "@/lib/notification-observability";

export default async function HrAdminNotificationDiagnosticsPage() {
  const result = await getHrAdminNotificationDiagnostics();
  const inactiveTemplates = result.data.template_diagnostics.filter((item) => item.status !== "active").length;
  const unlinkedTemplates = result.data.template_diagnostics.filter((item) => item.linked_event_count === 0).length;
  const activeEventsWithoutTests = result.data.event_diagnostics.filter((item) => item.is_active && item.test_notification_count === 0).length;
  const documentEvents = result.data.event_diagnostics.filter((item) => item.module === "documents").length;
  const channelsWithFailures = result.data.channel_diagnostics.filter((item) => item.failed_notification_count > 0).length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live diagnostics" : "Demo diagnostics"}
        title="Notification diagnostics"
        description="See which templates and events are active, producing volume, failing delivery, or attracting test activity."
        actions={<Link className="button button--secondary" href="/hr-admin/notifications-admin">Back to notifications</Link>}
        pills={["Catalog health", "Template usage", "Event diagnostics", "Test activity"]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Templates" value={result.data.overview.total_templates} trend={`${result.data.overview.active_templates} active`} />
          <MetricTile label="Events" value={result.data.overview.total_events} trend={`${result.data.overview.active_events} active`} />
          <MetricTile label="Live notifications" value={result.data.overview.live_notifications} trend="Tracked delivery volume" />
          <MetricTile label="Failed notifications" value={result.data.overview.failed_notifications} trend="Attention needed" />
          <MetricTile label="Channels with failures" value={channelsWithFailures} trend="Delivery routing watchlist" />
          <MetricTile label="Preview and test sends" value={result.data.overview.preview_test_notifications} trend="Authoring verification activity" />
        </div>
      </section>

      <section className="section">
        <div className="workspace-grid-modern">
          <article className="workspace-card workspace-card--compact">
            <div className="workspace-card__eyebrow">Queue focus</div>
            <h2 className="workspace-card__title">Failed delivery</h2>
            <p className="section-copy-soft">Jump straight into failed notifications and bulk retry candidates.</p>
            <div className="workspace-card__detail-grid">
              <div className="workspace-card__detail"><span>Failures</span><strong>{result.data.overview.failed_notifications}</strong></div>
              <div className="workspace-card__detail"><span>Action</span><strong>Recovery queues</strong></div>
            </div>
            <div className="record-card__actions">
              <Link className="button button--primary" href="/hr-admin/notifications?status=failed">Open failed queue</Link>
              <Link className="button button--secondary" href="/hr-admin/notifications?retry_state=retry_ready">Retry ready</Link>
              <Link className="button button--ghost" href="/hr-admin/notifications?retry_state=retry_capped">Retry capped</Link>
            </div>
          </article>
          <article className="workspace-card workspace-card--compact">
            <div className="workspace-card__eyebrow">Template hygiene</div>
            <h2 className="workspace-card__title">Catalog cleanup</h2>
            <p className="section-copy-soft">Review inactive or unlinked templates before the content library drifts.</p>
            <div className="workspace-card__detail-grid">
              <div className="workspace-card__detail"><span>Inactive</span><strong>{inactiveTemplates}</strong></div>
              <div className="workspace-card__detail"><span>Unlinked</span><strong>{unlinkedTemplates}</strong></div>
            </div>
            <div className="record-card__actions">
              <Link className="button button--primary" href="/hr-admin/notification-templates?status=inactive">Inactive templates</Link>
              <Link className="button button--secondary" href="/hr-admin/notification-templates?source=custom">Custom templates</Link>
            </div>
          </article>
          <article className="workspace-card workspace-card--compact">
            <div className="workspace-card__eyebrow">Event verification</div>
            <h2 className="workspace-card__title">Test active rules</h2>
            <p className="section-copy-soft">Focus on live events that have not yet been validated through preview or test-send flows.</p>
            <div className="workspace-card__detail-grid">
              <div className="workspace-card__detail"><span>Untested active</span><strong>{activeEventsWithoutTests}</strong></div>
              <div className="workspace-card__detail"><span>Document events</span><strong>{documentEvents}</strong></div>
            </div>
            <div className="record-card__actions">
              <Link className="button button--primary" href="/hr-admin/notification-events?active=active">Active events</Link>
              <Link className="button button--secondary" href="/hr-admin/notification-events?module=documents">Document events</Link>
            </div>
          </article>
        </div>
      </section>

      <section className="section">
        <article className="record-card">
          <div className="record-card__header">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Channel diagnostics</h2>
              </div>
              <p className="section-copy">Backend-backed delivery health across in-app, email, SMS, push, and WhatsApp routing.</p>
            </div>
          </div>
          <div className="stack-list">
            {result.data.channel_diagnostics.map((item) => (
              <div className="detail-grid" key={item.channel}>
                <div className="detail-row"><span className="detail-label">Channel</span><span className="detail-value">{item.label}</span></div>
                <div className="detail-row"><span className="detail-label">Routing</span><span className="detail-value">{item.is_enabled ? `Enabled via ${item.backend_key}` : "Disabled"}</span></div>
                <div className="detail-row"><span className="detail-label">Tracked notifications</span><span className="detail-value">{item.live_notification_count}</span></div>
                <div className="detail-row"><span className="detail-label">Pending</span><span className="detail-value">{item.pending_notification_count}</span></div>
                <div className="detail-row"><span className="detail-label">Failures</span><span className="detail-value">{item.failed_notification_count}</span></div>
                <div className="detail-row"><span className="detail-label">Retry capped</span><span className="detail-value">{item.retry_capped_count}</span></div>
                <div className="detail-row"><span className="detail-label">Providers</span><span className="detail-value">{item.provider_names.join(", ") || "No provider attempts yet"}</span></div>
                <div className="detail-row"><span className="detail-label">Last activity</span><span className="detail-value">{formatNotificationDateTime(item.latest_notification_at)}</span></div>
                <div className="detail-row"><span className="detail-label">Latest failure</span><span className="detail-value">{item.latest_failure_message || "No failure recorded"}</span></div>
                <div className="detail-row">
                  <span className="detail-label">Action</span>
                  <span className="detail-value">
                    <span className="record-card__actions">
                      <Link className="button button--secondary" href={`/hr-admin/notifications?channel=${item.channel}`}>
                        Open queue
                      </Link>
                      <Link className="button button--ghost" href={`/hr-admin/notifications?channel=${item.channel}&retry_state=retry_ready`}>
                        Retry ready
                      </Link>
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="section queue-layout">
        <div className="queue-list">
          <article className="record-card">
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Alerts</h2>
                </div>
                <p className="section-copy">High-signal issues that deserve immediate attention.</p>
              </div>
            </div>
            {result.data.alerts.length ? (
              <div className="stack-list">
                {result.data.alerts.map((item, index) => (
                  <div className="notice" key={`${item.title}-${index}`}>
                    <strong>{item.title}</strong>
                    <span className="muted">{item.description}</span>
                    <div className="record-card__actions">
                      <span className={`record-chip${item.level === "medium" ? " record-chip--accent" : ""}`}>{item.level}</span>
                      <Link className="button button--secondary" href={item.href}>Open</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="notice">
                <strong>No alerts right now.</strong>
                <span className="muted">Current diagnostics do not show any urgent notification catalog issues.</span>
              </div>
            )}
          </article>

          <article className="record-card">
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Recommendations</h2>
                </div>
                <p className="section-copy">Suggested next actions based on current catalog usage and delivery health.</p>
              </div>
            </div>
            <div className="stack-list">
              {result.data.recommendations.map((item, index) => (
                <div className="detail-grid" key={`${item.title}-${index}`}>
                  <div className="detail-row"><span className="detail-label">Category</span><span className="detail-value">{item.category}</span></div>
                  <div className="detail-row"><span className="detail-label">Recommendation</span><span className="detail-value">{item.title}</span></div>
                  <div className="detail-row"><span className="detail-label">Reason</span><span className="detail-value">{item.description}</span></div>
                  <div className="detail-row">
                    <span className="detail-label">Action</span>
                    <span className="detail-value">
                      <Link className="button button--secondary" href={item.href}>Open</Link>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="section queue-layout">
        <div className="queue-list">
          <article className="record-card">
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Template diagnostics</h2>
                </div>
                <p className="section-copy">Look for templates with no linked events, inactive usage, or repeated delivery failures.</p>
              </div>
            </div>
            <div className="stack-list">
              {result.data.template_diagnostics.map((item) => (
                <div className="detail-grid" key={item.template_id}>
                  <div className="detail-row"><span className="detail-label">Template</span><span className="detail-value">{item.template_name}</span></div>
                  <div className="detail-row"><span className="detail-label">Channel</span><span className="detail-value">{item.channel}</span></div>
                  <div className="detail-row"><span className="detail-label">Status</span><span className="detail-value">{item.status}</span></div>
                  <div className="detail-row"><span className="detail-label">Linked events</span><span className="detail-value">{item.linked_event_count}</span></div>
                  <div className="detail-row"><span className="detail-label">Active events</span><span className="detail-value">{item.active_event_count}</span></div>
                  <div className="detail-row"><span className="detail-label">Live notifications</span><span className="detail-value">{item.live_notification_count}</span></div>
                  <div className="detail-row"><span className="detail-label">Failures</span><span className="detail-value">{item.failed_notification_count}</span></div>
                  <div className="detail-row"><span className="detail-label">Last activity</span><span className="detail-value">{item.last_notification_at || "No activity yet"}</span></div>
                  <div className="detail-row">
                    <span className="detail-label">Action</span>
                    <span className="detail-value">
                      <Link href={`/hr-admin/notification-templates/${item.template_id}/edit`}>Edit template</Link>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="record-card">
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Event diagnostics</h2>
                </div>
                <p className="section-copy">Identify noisy or underused event rules and see where test-send activity is concentrated.</p>
              </div>
            </div>
            <div className="stack-list">
              {result.data.event_diagnostics.map((item) => (
                <div className="detail-grid" key={item.event_id}>
                  <div className="detail-row"><span className="detail-label">Event</span><span className="detail-value">{item.event_name}</span></div>
                  <div className="detail-row"><span className="detail-label">Module</span><span className="detail-value">{item.module}</span></div>
                  <div className="detail-row"><span className="detail-label">Channel</span><span className="detail-value">{item.channel}</span></div>
                  <div className="detail-row"><span className="detail-label">Audience</span><span className="detail-value">{item.audience_type}</span></div>
                  <div className="detail-row"><span className="detail-label">Template</span><span className="detail-value">{item.template_name || "Direct content"}</span></div>
                  <div className="detail-row"><span className="detail-label">Live notifications</span><span className="detail-value">{item.live_notification_count}</span></div>
                  <div className="detail-row"><span className="detail-label">Failures</span><span className="detail-value">{item.failed_notification_count}</span></div>
                  <div className="detail-row"><span className="detail-label">Test sends</span><span className="detail-value">{item.test_notification_count}</span></div>
                  <div className="detail-row">
                    <span className="detail-label">Action</span>
                    <span className="detail-value">
                      <Link href={`/hr-admin/notification-events/${item.event_id}/edit`}>Edit event</Link>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="record-card">
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Recent test notifications</h2>
                </div>
                <p className="section-copy">Quick access to the latest preview-origin notifications for review and troubleshooting.</p>
              </div>
            </div>
            {result.data.recent_test_notifications.length ? (
              <div className="stack-list">
                {result.data.recent_test_notifications.map((item) => (
                  <div className="detail-grid" key={item.id}>
                    <div className="detail-row"><span className="detail-label">Title</span><span className="detail-value">{item.title || item.event_definition_name || "Notification"}</span></div>
                    <div className="detail-row"><span className="detail-label">Status</span><span className="detail-value">{item.status}</span></div>
                    <div className="detail-row"><span className="detail-label">Channel</span><span className="detail-value">{item.channel}</span></div>
                    <div className="detail-row"><span className="detail-label">Recipient</span><span className="detail-value">{item.recipient_membership_name || item.recipient_identifier || "Unknown"}</span></div>
                    <div className="detail-row"><span className="detail-label">Created</span><span className="detail-value">{item.created_at}</span></div>
                    <div className="detail-row">
                      <span className="detail-label">Review</span>
                      <span className="detail-value"><Link href={`/hr-admin/notifications/${item.id}/review`}>Open notification</Link></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="notice">
                <strong>No test activity yet.</strong>
                <span className="muted">Use the preview and test panels inside templates or events to start building diagnostics history.</span>
              </div>
            )}
          </article>
        </div>
      </section>
    </main>
  );
}
