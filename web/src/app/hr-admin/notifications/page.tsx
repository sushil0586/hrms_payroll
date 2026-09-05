import Link from "next/link";

import { NotificationQueue } from "@/app/hr-admin/notifications/notification-queue";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminNotificationOptions, getHrAdminNotifications } from "@/lib/api";
import { buildNotificationChannelSummaries } from "@/lib/notification-observability";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminNotificationsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "25") || 25, 1), 100);
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const channel = normalizeParam(currentParams.channel) ?? "";
  const priority = normalizeParam(currentParams.priority) ?? "";
  const audienceType = normalizeParam(currentParams.audience_type) ?? "";
  const moduleFilter = normalizeParam(currentParams.module) ?? "";
  const subjectType = normalizeParam(currentParams.subject_type) ?? "";
  const retryState = normalizeParam(currentParams.retry_state) ?? "";

  const [result, optionsResult] = await Promise.all([
    getHrAdminNotifications({
      page,
      page_size: pageSize,
      q,
      status: status || undefined,
      channel: channel || undefined,
      priority: priority || undefined,
      audience_type: audienceType || undefined,
      module: moduleFilter || undefined,
      subject_type: subjectType || undefined,
      retry_state: retryState || undefined,
    }),
    getHrAdminNotificationOptions(),
  ]);
  const documentNotifications = result.data.items.filter((item) => item.subject_type === "employee_document").length;
  const failedNotifications = result.data.items.filter((item) => item.status === "failed").length;
  const retryCappedNotifications = result.data.items.filter((item) => item.retry_limit_reached).length;
  const channelSummaries = buildNotificationChannelSummaries({
    notifications: result.data.items,
    channelOptions: optionsResult.data.notification_channels,
  });
  const activeFailureChannels = channelSummaries.filter((item) => item.failed > 0).length;

  return (
    <main className="shell">
      <PageIntro
        actions={<Link className="button button--secondary" href="/hr-admin/notifications-admin">Back to notifications</Link>}
        description="Inspect generated notifications across modules and review their delivery lifecycle."
        eyebrow={result.state === "live" && optionsResult.state === "live" ? "Live notification mode" : "Demo notification mode"}
        pills={[
          `${result.data.total_count} notifications`,
          `${result.data.items.filter((item) => !item.read_at).length} unread on this page`,
        ]}
        title="Notification queue"
      />
      <section className="section">
        <div className="metrics-grid">
          <MetricTile label="Queue size" trend="Current filtered result" value={result.data.total_count} />
          <MetricTile label="Visible" trend="This page" value={result.data.items.length} />
          <MetricTile label="Failed on page" trend="Immediate recovery view" value={failedNotifications} />
          <MetricTile label="Retry capped" trend="Manual recovery needed" value={retryCappedNotifications} />
          <MetricTile label="Document notifications" trend="This page" value={documentNotifications} />
          <MetricTile label="Channels with failures" trend="Current page signal" value={activeFailureChannels} />
          <MetricTile label="Channels" trend="Available filter options" value={optionsResult.data.notification_channels.length} />
        </div>
      </section>
      <NotificationQueue
        items={result.data.items}
        notificationStatusOptions={optionsResult.data.notification_statuses}
        notificationChannelOptions={optionsResult.data.notification_channels}
        notificationPriorityOptions={optionsResult.data.notification_priorities}
        notificationRetryStateOptions={optionsResult.data.notification_retry_states}
        audienceTypeOptions={optionsResult.data.notification_audience_types}
        moduleOptions={optionsResult.data.workflow_modules}
        subjectTypeOptions={optionsResult.data.notification_subject_types}
        currentFilters={{
          q,
          status,
          channel,
          priority,
          audience_type: audienceType,
          module: moduleFilter,
          subject_type: subjectType,
          retry_state: retryState,
          page,
          page_size: pageSize,
        }}
        pagination={{
          total_count: result.data.total_count,
          page: result.data.page,
          page_size: result.data.page_size,
          has_next: result.data.has_next,
          has_previous: result.data.has_previous,
        }}
      />
    </main>
  );
}
