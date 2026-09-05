import type {
  HrAdminEnumOption,
  HrAdminNotification,
  HrAdminNotificationChannelConfiguration,
} from "@/lib/types";

type NotificationChannelSummary = {
  channel: string;
  label: string;
  total: number;
  pending: number;
  delivered: number;
  failed: number;
  read: number;
  retryReady: number;
  retryCapped: number;
  latestActivityAt: string | null;
  latestFailureAt: string | null;
  latestFailureMessage: string | null;
  providerNames: string[];
  configuration: HrAdminNotificationChannelConfiguration | null;
};

const PENDING_STATUSES = new Set(["pending", "queued", "scheduled", "processing"]);
const DELIVERED_STATUSES = new Set(["sent", "delivered", "read"]);
const FAILED_STATUSES = new Set(["failed", "error"]);

function sortIsoDescending(left: string | null, right: string | null) {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return right.localeCompare(left);
}

function getNotificationActivityAt(item: HrAdminNotification) {
  const latestLogAt = item.delivery_logs
    .map((log) => log.created_at)
    .sort((left, right) => sortIsoDescending(left, right))[0];
  return latestLogAt || item.read_at || item.delivered_at || item.sent_at || item.scheduled_for || item.created_at || null;
}

export function formatNotificationDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function buildNotificationChannelSummaries(args: {
  notifications: HrAdminNotification[];
  channelOptions: HrAdminEnumOption[];
  channelConfigurations?: HrAdminNotificationChannelConfiguration[];
}) {
  const { notifications, channelOptions, channelConfigurations = [] } = args;
  const configurationByChannel = new Map(channelConfigurations.map((item) => [item.channel, item]));
  const seeded = new Map<string, NotificationChannelSummary>();

  channelOptions.forEach((option) => {
    seeded.set(option.value, {
      channel: option.value,
      label: option.label,
      total: 0,
      pending: 0,
      delivered: 0,
      failed: 0,
      read: 0,
      retryReady: 0,
      retryCapped: 0,
      latestActivityAt: null,
      latestFailureAt: null,
      latestFailureMessage: null,
      providerNames: [],
      configuration: configurationByChannel.get(option.value) ?? null,
    });
  });

  notifications.forEach((item) => {
    const existing =
      seeded.get(item.channel) ??
      {
        channel: item.channel,
        label: item.channel.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
        total: 0,
        pending: 0,
        delivered: 0,
        failed: 0,
        read: 0,
        retryReady: 0,
        retryCapped: 0,
        latestActivityAt: null,
        latestFailureAt: null,
        latestFailureMessage: null,
        providerNames: [],
        configuration: configurationByChannel.get(item.channel) ?? null,
      };

    existing.total += 1;
    if (PENDING_STATUSES.has(item.status)) existing.pending += 1;
    if (DELIVERED_STATUSES.has(item.status)) existing.delivered += 1;
    if (FAILED_STATUSES.has(item.status)) existing.failed += 1;
    if (item.status === "read" || item.read_at) existing.read += 1;
    if (item.can_retry) existing.retryReady += 1;
    if (item.retry_limit_reached) existing.retryCapped += 1;

    const activityAt = getNotificationActivityAt(item);
    if (!existing.latestActivityAt || sortIsoDescending(existing.latestActivityAt, activityAt) > 0) {
      existing.latestActivityAt = activityAt;
    }

    item.delivery_logs.forEach((log) => {
      if (log.provider_name && !existing.providerNames.includes(log.provider_name)) {
        existing.providerNames.push(log.provider_name);
      }
      if (FAILED_STATUSES.has(log.status) || log.error_message) {
        if (!existing.latestFailureAt || sortIsoDescending(existing.latestFailureAt, log.created_at) > 0) {
          existing.latestFailureAt = log.created_at;
          existing.latestFailureMessage = log.error_message || "Provider reported a failed attempt.";
        }
      }
    });

    if (FAILED_STATUSES.has(item.status) && !existing.latestFailureAt) {
      existing.latestFailureAt = getNotificationActivityAt(item);
      existing.latestFailureMessage = "Notification is currently in failed state.";
    }

    seeded.set(item.channel, existing);
  });

  return Array.from(seeded.values()).sort((left, right) => {
    if (right.failed !== left.failed) return right.failed - left.failed;
    if (right.pending !== left.pending) return right.pending - left.pending;
    return left.label.localeCompare(right.label);
  });
}

export type { NotificationChannelSummary };
