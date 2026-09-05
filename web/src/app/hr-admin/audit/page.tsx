import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import {
  getHrAdminAttendanceRegularizations,
  getHrAdminEmployeeDocuments,
  getHrAdminExits,
  getHrAdminNotifications,
  getHrAdminOnboardings,
} from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

type AuditEvent = {
  id: string;
  occurredAt: string;
  actor: string;
  source: "attendance_approval" | "document_review" | "onboarding_history" | "exit_clearance" | "notification_delivery";
  title: string;
  detail: string;
  href: string;
  recordLabel: string;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function safeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function buildDocumentEvents() {
  return (document: Awaited<ReturnType<typeof getHrAdminEmployeeDocuments>>["data"]["items"][number]) =>
    document.review_history.map((entry) => ({
      id: `document-${document.id}-${entry.id}`,
      occurredAt: entry.created_at,
      actor: entry.actor_identifier || "system",
      source: "document_review" as const,
      title: `${document.category_name}: ${entry.new_status}`,
      detail: entry.comment || `${entry.previous_status} to ${entry.new_status}`,
      href: `/hr-admin/employee-documents/${document.id}/review`,
      recordLabel: `${document.employee_code} • ${document.title}`,
    }));
}

function buildOnboardingEvents() {
  return (item: Awaited<ReturnType<typeof getHrAdminOnboardings>>["data"]["items"][number]) =>
    item.checklist_snapshot.flatMap((workItem) =>
      workItem.history.map((entry, index) => ({
        id: `onboarding-${item.id}-${workItem.code}-${index}`,
        occurredAt: safeString(entry.at) || item.actual_joining_date || item.expected_joining_date || "",
        actor: safeString(entry.by) || "system",
        source: "onboarding_history" as const,
        title: `${item.employee_code}: ${workItem.label || workItem.code}`,
        detail: safeString(entry.note) || safeString(entry.action) || "Checklist history update.",
        href: `/hr-admin/onboardings/${item.id}/edit`,
        recordLabel: `${item.employee_name} • ${item.workflow_reference || "Workflow not linked"}`,
      })),
    );
}

function buildExitEvents() {
  return (item: Awaited<ReturnType<typeof getHrAdminExits>>["data"]["items"][number]) =>
    item.clearance_status_snapshot.items.flatMap((workItem) =>
      workItem.history.map((entry, index) => ({
        id: `exit-${item.id}-${workItem.code}-${index}`,
        occurredAt: safeString(entry.at) || item.actual_exit_date || item.notice_end_date || "",
        actor: safeString(entry.by) || "system",
        source: "exit_clearance" as const,
        title: `${item.employee_code}: ${workItem.label || workItem.code}`,
        detail: safeString(entry.note) || safeString(entry.action) || "Clearance history update.",
        href: `/hr-admin/exits/${item.id}/edit`,
        recordLabel: `${item.employee_name} • ${item.workflow_reference || "Workflow not linked"}`,
      })),
    );
}

function buildNotificationEvents() {
  return (item: Awaited<ReturnType<typeof getHrAdminNotifications>>["data"]["items"][number]) =>
    item.delivery_logs.map((log) => ({
      id: `notification-${item.id}-${log.id}`,
      occurredAt: log.created_at,
      actor: log.provider_name || "delivery backend",
      source: "notification_delivery" as const,
      title: item.title || item.event_definition_name || "Notification delivery",
      detail: log.error_message || `${log.channel} ${log.status}`,
      href: `/hr-admin/notifications/${item.id}/review`,
      recordLabel: `${item.channel} • ${item.recipient_membership_name || item.recipient_identifier || "Unknown recipient"}`,
    }));
}

function buildAttendanceApprovalEvents() {
  return (item: Awaited<ReturnType<typeof getHrAdminAttendanceRegularizations>>["data"]["items"][number]) => {
    const events: AuditEvent[] = [];

    if (item.applied_at) {
      events.push({
        id: `regularization-applied-${item.id}`,
        occurredAt: item.applied_at,
        actor: item.employee_name || item.employee_code || "employee",
        source: "attendance_approval",
        title: `${item.employee_code}: regularization submitted`,
        detail: item.reason || `Requested ${item.requested_status} from ${item.current_status}.`,
        href: `/hr-admin/attendance-regularizations/${item.id}/review`,
        recordLabel: `${item.attendance_date} • ${item.shift || "No shift"} • ${item.workflow_reference || "Workflow not linked"}`,
      });
    }

    if ((item.manager_comment || item.rejection_reason || item.status !== "pending") && (item.resolved_at || item.applied_at)) {
      events.push({
        id: `regularization-decision-${item.id}`,
        occurredAt: item.resolved_at || item.applied_at || "",
        actor: "reviewer",
        source: "attendance_approval",
        title: `${item.employee_code}: regularization ${item.status}`,
        detail: item.manager_comment || item.rejection_reason || `Status moved to ${item.status}.`,
        href: `/hr-admin/attendance-regularizations/${item.id}/review`,
        recordLabel: `${item.attendance_date} • ${item.requested_status} requested`,
      });
    }

    return events;
  };
}

export default async function HrAdminAuditPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const source = normalizeParam(currentParams.source) ?? "all";
  const q = (normalizeParam(currentParams.q) ?? "").trim().toLowerCase();

  const [attendanceResult, documentsResult, onboardingsResult, exitsResult, notificationsResult] = await Promise.all([
    getHrAdminAttendanceRegularizations({ page: 1, page_size: 50 }),
    getHrAdminEmployeeDocuments({ page: 1, page_size: 50 }),
    getHrAdminOnboardings({ page: 1, page_size: 25 }),
    getHrAdminExits({ page: 1, page_size: 25 }),
    getHrAdminNotifications({ page: 1, page_size: 50 }),
  ]);

  const state =
    attendanceResult.state === "live" &&
    documentsResult.state === "live" &&
    onboardingsResult.state === "live" &&
    exitsResult.state === "live" &&
    notificationsResult.state === "live"
      ? "live"
      : "demo";

  const events = [
    ...attendanceResult.data.items.flatMap(buildAttendanceApprovalEvents()),
    ...documentsResult.data.items.flatMap(buildDocumentEvents()),
    ...onboardingsResult.data.items.flatMap(buildOnboardingEvents()),
    ...exitsResult.data.items.flatMap(buildExitEvents()),
    ...notificationsResult.data.items.flatMap(buildNotificationEvents()),
  ]
    .filter((item) => item.occurredAt)
    .filter((item) => {
      if (source !== "all" && item.source !== source) {
        return false;
      }
      if (!q) {
        return true;
      }
      return [item.title, item.detail, item.actor, item.recordLabel].some((value) => value.toLowerCase().includes(q));
    })
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());

  const visibleEvents = events.slice(0, 60);
  const attendanceApprovalCount = events.filter((item) => item.source === "attendance_approval").length;
  const documentEventCount = events.filter((item) => item.source === "document_review").length;
  const onboardingEventCount = events.filter((item) => item.source === "onboarding_history").length;
  const exitEventCount = events.filter((item) => item.source === "exit_clearance").length;
  const notificationEventCount = events.filter((item) => item.source === "notification_delivery").length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={state === "live" ? "Live audit view" : "Demo audit view"}
        title="Audit center"
        description="Review recent document decisions, lifecycle work-item history, and notification delivery activity in one trust-layer timeline."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--ghost" href="/hr-admin/notifications-admin">
              Notifications
            </Link>
          </>
        }
        pills={["Cross-module history", "Recent workflow trace", "Delivery visibility"]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Recent events" value={events.length} trend="Current filtered timeline" />
          <MetricTile label="Approval actions" value={attendanceApprovalCount} trend="Regularization review trace" />
          <MetricTile label="Document reviews" value={documentEventCount} trend="Verification decisions" />
          <MetricTile label="Onboarding actions" value={onboardingEventCount} trend="Checklist history" />
          <MetricTile label="Exit actions" value={exitEventCount} trend="Clearance history" />
          <MetricTile label="Delivery logs" value={notificationEventCount} trend="Notification attempts" />
        </div>
      </section>

      <section className="section queue-layout">
        <section className="card panel queue-toolbar panel-card-soft">
          <div className="queue-toolbar__header">
            <div>
              <h2 className="section-heading-soft">Audit filters</h2>
              <p className="section-copy section-copy-soft">
                Narrow the timeline by source or search across actors, record labels, and action notes.
              </p>
            </div>
            <div className="queue-toolbar__meta">
              <span className="queue-summary-chip"><strong>{visibleEvents.length}</strong> visible</span>
              <span className="queue-summary-chip"><strong>{events.length}</strong> matching</span>
              <span className="queue-summary-chip"><strong>60</strong> max shown</span>
            </div>
          </div>

          <form className="queue-toolbar__grid" method="get">
            <label className="form-field">
              <span className="muted">Search</span>
              <input className="input-control" defaultValue={normalizeParam(currentParams.q) ?? ""} name="q" placeholder="Actor, record, note, or title" />
            </label>
            <label className="form-field">
              <span className="muted">Source</span>
              <select className="input-control" defaultValue={source} name="source">
                <option value="all">All sources</option>
                <option value="attendance_approval">Attendance approval</option>
                <option value="document_review">Document review</option>
                <option value="onboarding_history">Onboarding history</option>
                <option value="exit_clearance">Exit clearance</option>
                <option value="notification_delivery">Notification delivery</option>
              </select>
            </label>
            <div className="queue-toolbar__actions">
              <button className="button button--primary" type="submit">
                Apply filters
              </button>
              <Link className="button button--ghost" href="/hr-admin/audit">
                Clear filters
              </Link>
            </div>
          </form>
        </section>

        <div className="queue-list">
          {visibleEvents.length ? (
            visibleEvents.map((event) => (
              <article className="record-card panel-card-soft" key={event.id}>
                <div className="record-card__header">
                  <div className="record-card__title-block">
                    <h3>{event.title}</h3>
                    <p>{event.recordLabel}</p>
                  </div>
                  <div className="record-card__actions">
                    <span className="record-chip">{event.source.replaceAll("_", " ")}</span>
                    <Link className="button button--secondary" href={event.href}>
                      Open source
                    </Link>
                  </div>
                </div>
                <div className="detail-grid">
                  <div className="detail-row"><span className="detail-label">Actor</span><span className="detail-value">{event.actor}</span></div>
                  <div className="detail-row"><span className="detail-label">Occurred</span><span className="detail-value">{formatDateTime(event.occurredAt)}</span></div>
                  <div className="detail-row"><span className="detail-label">Detail</span><span className="detail-value">{event.detail}</span></div>
                </div>
              </article>
            ))
          ) : (
            <div className="card panel panel-card-soft">
              <strong>No audit events match the current filters.</strong>
              <p className="muted">Clear one or more filters to review recent lifecycle, document, and delivery activity.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
