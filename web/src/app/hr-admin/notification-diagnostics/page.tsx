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
    <main className="shell notification-shell">
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
        <article className="record-card notification-catalog-panel">
          <div className="section-header-row">
            <div>
              <h2 className="section-heading-soft">Channel diagnostics</h2>
              <p className="section-copy-soft">Compare delivery health across in-app, email, SMS, push, and WhatsApp routing.</p>
            </div>
            <span className="queue-summary-chip">
              <strong>{channelsWithFailures}</strong> with failures
            </span>
          </div>
          <div className="notification-table-scroll">
            <table className="notification-catalog-table notification-diagnostics-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Routing</th>
                  <th>Tracked</th>
                  <th>Pending</th>
                  <th>Failed</th>
                  <th>Retry capped</th>
                  <th>Last activity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.data.channel_diagnostics.map((item) => (
                  <tr key={item.channel}>
                    <td data-label="Channel">
                      <strong>{item.label}</strong>
                      <span>{item.provider_names.join(", ") || "No provider attempts yet"}</span>
                      {item.latest_failure_message ? <span className="notification-table-note">{item.latest_failure_message}</span> : null}
                    </td>
                    <td data-label="Routing">{item.is_enabled ? `Enabled via ${item.backend_key}` : "Disabled"}</td>
                    <td data-label="Tracked">{item.live_notification_count}</td>
                    <td data-label="Pending">{item.pending_notification_count}</td>
                    <td data-label="Failed">
                      <span className={`record-chip${item.failed_notification_count ? " record-chip--danger" : ""}`}>{item.failed_notification_count}</span>
                    </td>
                    <td data-label="Retry capped">{item.retry_capped_count}</td>
                    <td data-label="Last activity">{formatNotificationDateTime(item.latest_notification_at)}</td>
                    <td data-label="Actions">
                      <div className="notification-row-actions">
                        <Link className="button button--secondary" href={`/hr-admin/notifications?channel=${item.channel}`}>
                          Queue
                        </Link>
                        <Link className="button button--ghost" href={`/hr-admin/notifications?channel=${item.channel}&retry_state=retry_ready`}>
                          Retry ready
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            <div className="section-header-row">
              <div>
                <h2 className="section-heading-soft">Recommendations</h2>
                <p className="section-copy-soft">Suggested next actions based on current catalog usage and delivery health.</p>
              </div>
            </div>
            <div className="notification-compact-list">
              {result.data.recommendations.map((item, index) => (
                <Link className="notification-compact-row" href={item.href} key={`${item.title}-${index}`}>
                  <span className="record-chip record-chip--accent">{item.category}</span>
                  <span className="notification-compact-row__body">
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </span>
                  <span className="button button--secondary">Open</span>
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="section queue-layout">
        <div className="queue-list">
          <article className="record-card">
            <div className="section-header-row">
              <div>
                <h2 className="section-heading-soft">Template diagnostics</h2>
                <p className="section-copy-soft">Look for templates with no linked events, inactive usage, or repeated delivery failures.</p>
              </div>
            </div>
            <div className="notification-table-scroll">
              <table className="notification-catalog-table notification-diagnostics-table">
                <thead>
                  <tr>
                    <th>Template</th>
                    <th>Channel</th>
                    <th>Status</th>
                    <th>Events</th>
                    <th>Live</th>
                    <th>Failures</th>
                    <th>Last activity</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.template_diagnostics.map((item) => (
                    <tr key={item.template_id}>
                      <td data-label="Template"><strong>{item.template_name}</strong></td>
                      <td data-label="Channel"><span className="record-chip record-chip--accent">{item.channel}</span></td>
                      <td data-label="Status"><span className={`record-chip${item.status === "active" ? "" : " record-chip--accent"}`}>{item.status}</span></td>
                      <td data-label="Events">{item.active_event_count}/{item.linked_event_count}</td>
                      <td data-label="Live">{item.live_notification_count}</td>
                      <td data-label="Failures">{item.failed_notification_count}</td>
                      <td data-label="Last activity">{item.last_notification_at || "No activity yet"}</td>
                      <td data-label="Action">
                        <Link className="button button--secondary" href={`/hr-admin/notification-templates/${item.template_id}/edit`}>
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="record-card">
            <div className="section-header-row">
              <div>
                <h2 className="section-heading-soft">Event diagnostics</h2>
                <p className="section-copy-soft">Identify noisy or underused event rules and see where test-send activity is concentrated.</p>
              </div>
            </div>
            <div className="notification-table-scroll">
              <table className="notification-catalog-table notification-diagnostics-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Route</th>
                    <th>Audience</th>
                    <th>Template</th>
                    <th>Live</th>
                    <th>Failures</th>
                    <th>Tests</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.event_diagnostics.map((item) => (
                    <tr key={item.event_id}>
                      <td data-label="Event"><strong>{item.event_name}</strong></td>
                      <td data-label="Route">
                        <div className="notification-cell-chips">
                          <span className="record-chip record-chip--accent">{item.module}</span>
                          <span className="record-chip">{item.channel}</span>
                        </div>
                      </td>
                      <td data-label="Audience">{item.audience_type}</td>
                      <td data-label="Template">{item.template_name || "Direct content"}</td>
                      <td data-label="Live">{item.live_notification_count}</td>
                      <td data-label="Failures">{item.failed_notification_count}</td>
                      <td data-label="Tests">{item.test_notification_count}</td>
                      <td data-label="Action">
                        <Link className="button button--secondary" href={`/hr-admin/notification-events/${item.event_id}/edit`}>
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="record-card">
            <div className="section-header-row">
              <div>
                <h2 className="section-heading-soft">Recent test notifications</h2>
                <p className="section-copy-soft">Quick access to the latest preview-origin notifications for review and troubleshooting.</p>
              </div>
            </div>
            {result.data.recent_test_notifications.length ? (
              <div className="notification-table-scroll">
                <table className="notification-catalog-table notification-diagnostics-table">
                  <thead>
                    <tr>
                      <th>Notification</th>
                      <th>Status</th>
                      <th>Channel</th>
                      <th>Recipient</th>
                      <th>Created</th>
                      <th>Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.recent_test_notifications.map((item) => (
                      <tr key={item.id}>
                        <td data-label="Notification"><strong>{item.title || item.event_definition_name || "Notification"}</strong></td>
                        <td data-label="Status"><span className="record-chip">{item.status}</span></td>
                        <td data-label="Channel">{item.channel}</td>
                        <td data-label="Recipient">{item.recipient_membership_name || item.recipient_identifier || "Unknown"}</td>
                        <td data-label="Created">{item.created_at}</td>
                        <td data-label="Review">
                          <Link className="button button--secondary" href={`/hr-admin/notifications/${item.id}/review`}>
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
