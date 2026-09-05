import Link from "next/link";

import { ActionMenu } from "@/components/patterns/action-menu";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { WorkspaceCard } from "@/components/patterns/workspace-card";
import { getHrAdminNotificationDiagnostics, getHrAdminNotificationEvents, getHrAdminNotifications, getHrAdminNotificationOptions, getHrAdminNotificationTemplates } from "@/lib/api";

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

  return (
    <main className="shell">
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
        <div className="workspace-grid-modern" style={{ marginBottom: 16 }}>
          <WorkspaceCard
            eyebrow="Queue response"
            title="Failed delivery"
            description="Move directly into failed notifications and retry-ready queue review."
            href="/hr-admin/notifications?status=failed"
            cta="Open failed queue"
            className="workspace-card--compact"
            descriptionClassName="section-copy-soft"
            details={[
              { label: "Failed notifications", value: failedNotifications },
              { label: "Current view", value: "Delivery recovery" },
            ]}
          />
          <WorkspaceCard
            eyebrow="Channel health"
            title={riskiestChannel ? `${riskiestChannel.label} watch` : "Channel health"}
            description="Open delivery controls with recent queue pressure and provider recovery context already in view."
            href="/hr-admin/notification-delivery"
            cta="Open channel health"
            className="workspace-card--compact"
            descriptionClassName="section-copy-soft"
            details={[
              { label: "Failed tracked", value: riskiestChannel?.failed_notification_count ?? 0 },
              { label: "Retry capped", value: riskiestChannel?.retry_capped_count ?? 0 },
            ]}
          />
          <WorkspaceCard
            eyebrow="Catalog hygiene"
            title="Inactive templates"
            description="Review dormant content blocks and archive or reactivate them deliberately."
            href="/hr-admin/notification-templates?status=inactive"
            cta="Review templates"
            className="workspace-card--compact"
            descriptionClassName="section-copy-soft"
            details={[
              { label: "Inactive templates", value: inactiveTemplates },
              { label: "Current view", value: "Template cleanup" },
            ]}
          />
          <WorkspaceCard
            eyebrow="Verification"
            title="Untested active events"
            description="Open the live event catalog and verify active routing with preview and test-send flows."
            href="/hr-admin/notification-events?active=active"
            cta="Review active events"
            className="workspace-card--compact"
            descriptionClassName="section-copy-soft"
            details={[
              { label: "Untested active rules", value: activeEventsWithoutTests },
              { label: "Current view", value: "Routing validation" },
            ]}
          />
        </div>
        <div className="workspace-grid-modern">
          <WorkspaceCard
            eyebrow="Delivery"
            title="Delivery"
            description="Control enabled channels, backends, and sender defaults without leaving HR admin."
            href="/hr-admin/notification-delivery"
            cta="Open delivery"
            className="workspace-card--compact"
            descriptionClassName="section-copy-soft"
            details={[
              { label: "Configured channels", value: optionsResult.data.channel_configurations.length },
              { label: "Enabled now", value: enabledChannels },
            ]}
          />
          <WorkspaceCard
            eyebrow="Templates"
            title="Templates"
            description="Manage reusable content and placeholders."
            href="/hr-admin/notification-templates"
            cta="Manage templates"
            className="workspace-card--compact"
            descriptionClassName="section-copy-soft"
            details={[
              { label: "Templates", value: templatesResult.data.length },
              { label: "Draft or inactive focus", value: templatesResult.data.filter((item) => item.status !== "active").length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Events"
            title="Events"
            description="Adjust trigger routing and audiences."
            href="/hr-admin/notification-events"
            cta="Manage events"
            className="workspace-card--compact"
            descriptionClassName="section-copy-soft"
            details={[
              { label: "Active rules", value: activeEvents },
              { label: "Total events", value: eventsResult.data.length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Diagnostics"
            title="Diagnostics"
            description="See weak templates, noisy events, and recent test notifications in one control view."
            href="/hr-admin/notification-diagnostics"
            cta="Open diagnostics"
            className="workspace-card--compact"
            descriptionClassName="section-copy-soft"
            details={[
              { label: "Failed notifications", value: diagnosticsResult.data.overview.failed_notifications },
              { label: "Test sends", value: diagnosticsResult.data.overview.preview_test_notifications },
            ]}
          />
          <WorkspaceCard
            eyebrow="Queue"
            title="Queue"
            description="Inspect pending, sent, and failed delivery."
            href="/hr-admin/notifications"
            cta="Open queue"
            className="workspace-card--compact"
            descriptionClassName="section-copy-soft"
            details={[
              { label: "Review window total", value: notificationsResult.data.total_count },
              { label: "Current page", value: queuedNotifications },
            ]}
          />
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
