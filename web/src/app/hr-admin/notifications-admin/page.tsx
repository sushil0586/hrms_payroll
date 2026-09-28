import Link from "next/link";

import { ActionMenu } from "@/components/patterns/action-menu";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminNotificationDiagnostics, getHrAdminNotificationEvents, getHrAdminNotifications, getHrAdminNotificationOptions, getHrAdminNotificationTemplates } from "@/lib/api";

import { OperationsGovernanceStrip } from "../operations-governance-strip";

export default async function HrAdminNotificationsAdminPage() {
  const [templatesResult, eventsResult, notificationsResult, optionsResult, diagnosticsResult] = await Promise.all([
    getHrAdminNotificationTemplates(),
    getHrAdminNotificationEvents(),
    getHrAdminNotifications(),
    getHrAdminNotificationOptions(),
    getHrAdminNotificationDiagnostics(),
  ]);
  const state =
    templatesResult.state === "live" &&
    eventsResult.state === "live" &&
    notificationsResult.state === "live" &&
    optionsResult.state === "live" &&
    diagnosticsResult.state === "live"
      ? "live"
      : "demo";

  const activeEvents = eventsResult.data.filter((item) => item.is_active).length;
  const queuedNotifications = notificationsResult.data.items.length;
  const enabledChannels = optionsResult.data.channel_configurations.filter((item) => item.is_enabled).length;
  const failedNotifications = diagnosticsResult.data.overview.failed_notifications;
  const activeEventsWithoutTests = diagnosticsResult.data.event_diagnostics.filter((item) => item.is_active && item.test_notification_count === 0).length;
  const inactiveTemplates = diagnosticsResult.data.template_diagnostics.filter((item) => item.status !== "active").length;
  const channelSummaries = diagnosticsResult.data.channel_diagnostics;
  const riskiestChannel =
    channelSummaries.find((item) => item.failed_notification_count > 0 || item.retry_capped_count > 0) ?? channelSummaries[0] ?? null;
  const healthyEnabledChannels = channelSummaries.filter((item) => item.is_enabled && item.failed_notification_count === 0).length;
  const attentionItems = [
    {
      eyebrow: "Queue response",
      title: "Failed delivery",
      description: "Retry failed notifications and inspect provider messages.",
      href: "/hr-admin/notifications?status=failed",
      cta: "Open failed queue",
      count: failedNotifications,
      tone: failedNotifications ? "blocked" : "ready",
    },
    {
      eyebrow: "Channel health",
      title: riskiestChannel ? `${riskiestChannel.label} watch` : "Channel health",
      description: "Review channel pressure, retry caps, and routing health.",
      href: "/hr-admin/notification-delivery",
      cta: "Open delivery",
      count: riskiestChannel?.failed_notification_count ?? 0,
      tone: (riskiestChannel?.failed_notification_count ?? 0) ? "blocked" : "ready",
    },
    {
      eyebrow: "Catalog hygiene",
      title: "Inactive templates",
      description: "Clean up templates that cannot be used by active events.",
      href: "/hr-admin/notification-templates?status=inactive",
      cta: "Review templates",
      count: inactiveTemplates,
      tone: inactiveTemplates ? "warning" : "ready",
    },
    {
      eyebrow: "Verification",
      title: "Untested active events",
      description: "Validate live rules with preview and test-send coverage.",
      href: "/hr-admin/notification-events?active=active",
      cta: "Review events",
      count: activeEventsWithoutTests,
      tone: activeEventsWithoutTests ? "warning" : "ready",
    },
  ];
  const workspaces = [
    {
      title: "Delivery",
      description: "Channel settings, backend providers, sender identity, and failure recovery.",
      href: "/hr-admin/notification-delivery",
      cta: "Open delivery",
      value: `${enabledChannels}/${optionsResult.data.channel_configurations.length}`,
      label: "enabled",
    },
    {
      title: "Templates",
      description: "Reusable message content, placeholder readiness, and custom/system mix.",
      href: "/hr-admin/notification-templates",
      cta: "Manage templates",
      value: templatesResult.data.length,
      label: "templates",
    },
    {
      title: "Events",
      description: "Trigger routing, audience rules, channel priority, and linked templates.",
      href: "/hr-admin/notification-events",
      cta: "Manage events",
      value: activeEvents,
      label: "active rules",
    },
    {
      title: "Diagnostics",
      description: "Catalog weak spots, test-send history, channel failures, and next actions.",
      href: "/hr-admin/notification-diagnostics",
      cta: "Open diagnostics",
      value: diagnosticsResult.data.overview.preview_test_notifications,
      label: "test sends",
    },
    {
      title: "Queue",
      description: "Pending, sent, failed, and retry-ready notification activity.",
      href: "/hr-admin/notifications",
      cta: "Open queue",
      value: notificationsResult.data.total_count,
      label: "tracked",
    },
  ];

  return (
    <main className="shell notification-shell">
      <PageIntro
        eyebrow={state === "live" ? "Live notifications" : "Demo notifications"}
        title="Notifications"
        description="Templates, triggers, and queue visibility."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin">
              Admin
            </Link>
            <ActionMenu
              label="Open"
              items={[
                { href: "/hr-admin/notification-delivery", title: "Delivery", description: "Configure tenant channel routing and providers." },
                { href: "/hr-admin/notification-templates", title: "Templates", description: "Manage reusable message content." },
                { href: "/hr-admin/notification-events", title: "Events", description: "Adjust routing and trigger rules." },
                { href: "/hr-admin/notification-diagnostics", title: "Diagnostics", description: "Inspect template, event, and test-send health." },
                { href: "/hr-admin/notifications", title: "Queue", description: "Review generated delivery activity." },
                { href: "/hr-admin/audit", title: "Audit center", description: "Inspect timeline, document review, and delivery history." },
              ]}
            />
          </>
        }
        pills={["Delivery", "Templates", "Events", "Queue"]}
        showPills
      />

      <OperationsGovernanceStrip
        current="notifications"
        title="Notification operations control"
        description="Use this page to manage tenant-facing communication reliability: channels, reusable content, trigger rules, queue failures, diagnostics, and audit-ready recovery paths."
        metrics={[
          { label: "enabled channels", value: enabledChannels, tone: enabledChannels ? "ready" : "warning" },
          { label: "failed delivery", value: failedNotifications, tone: failedNotifications ? "blocked" : "ready" },
          { label: "untested active", value: activeEventsWithoutTests, tone: activeEventsWithoutTests ? "warning" : "ready" },
          { label: "source", value: state === "live" ? "Live" : "Demo", tone: state === "live" ? "ready" : "warning" },
        ]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Enabled channels" value={enabledChannels} trend="Tenant delivery paths" />
          <MetricTile label="Notification templates" value={templatesResult.data.length} trend="Reusable content blocks" />
          <MetricTile label="Active notification events" value={activeEvents} trend="Live trigger rules" />
          <MetricTile label="Notifications in review window" value={notificationsResult.data.total_count} trend="Recent queue volume" />
          <MetricTile label="Healthy enabled channels" value={healthyEnabledChannels} trend="No recent failures seen" />
          <MetricTile label="Preview and test sends" value={diagnosticsResult.data.overview.preview_test_notifications} trend="Catalog verification activity" />
          <MetricTile label="Queued on current page" value={queuedNotifications} trend={`Page ${notificationsResult.data.page}`} />
        </div>
      </section>

      <section className="section">
        <div className="notification-admin-layout">
          <article className="card panel panel-card-soft">
            <div className="section-header-row">
              <div>
                <h2 className="section-heading-soft">Needs attention</h2>
                <p className="section-copy-soft">Start here when delivery health changes or diagnostics flags a weak spot.</p>
              </div>
              <span className="queue-summary-chip">
                <strong>{failedNotifications + activeEventsWithoutTests + inactiveTemplates}</strong> signals
              </span>
            </div>
            <div className="notification-admin-action-list">
              {attentionItems.map((item) => (
                <Link className="notification-admin-action-row" href={item.href} key={item.title}>
                  <span className={`record-chip${item.tone === "blocked" ? " record-chip--danger" : item.tone === "warning" ? " record-chip--accent" : ""}`}>
                    {item.count}
                  </span>
                  <span className="notification-admin-action-row__body">
                    <span className="detail-label">{item.eyebrow}</span>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </span>
                  <span className="button button--secondary">{item.cta}</span>
                </Link>
              ))}
            </div>
          </article>

          <article className="card panel panel-card-soft">
            <div className="section-header-row">
              <div>
                <h2 className="section-heading-soft">Workspaces</h2>
                <p className="section-copy-soft">One purpose per page: configure, author, route, diagnose, or recover delivery.</p>
              </div>
            </div>
            <div className="notification-admin-workspace-list">
              {workspaces.map((item) => (
                <Link className="notification-admin-workspace-row" href={item.href} key={item.title}>
                  <span className="notification-admin-workspace-row__metric">
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </span>
                  <span className="notification-admin-workspace-row__body">
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </span>
                  <span className="button button--ghost">{item.cta}</span>
                </Link>
              ))}
            </div>
          </article>
        </div>
        <div className="notice" style={{ marginTop: 16 }}>
          <strong>Document expiry automation.</strong>
          <span className="muted">
            Schedule `backend/.venv/bin/python manage.py send_document_expiry_reminders` to trigger the
            `documents.employee.expiry_attention` event automatically for expired or expiring files.
          </span>
        </div>
      </section>
    </main>
  );
}
