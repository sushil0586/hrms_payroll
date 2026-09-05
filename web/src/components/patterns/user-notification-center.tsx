import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { NotificationReadToggle } from "@/components/patterns/notification-read-toggle";
import { PageIntro } from "@/components/patterns/page-intro";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import type { HrAdminNotification, HrAdminNotificationListResponse } from "@/lib/types";

type SearchParamValue = string | string[] | undefined;

type Props = {
  actions: React.ReactNode;
  apiEndpointBase: string;
  basePath: string;
  crossWorkspaceHref: string;
  crossWorkspaceLabel: string;
  currentParams: Record<string, SearchParamValue>;
  data: HrAdminNotificationListResponse;
  state: "live" | "demo";
  workspace: "ess" | "mss";
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(
  basePath: string,
  currentParams: Record<string, SearchParamValue>,
  updates: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  Object.entries(currentParams).forEach(([key, value]) => {
    const normalized = normalizeParam(value);
    if (normalized) {
      params.set(key, normalized);
    }
  });
  Object.entries(updates).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  });
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

function resolveSelectedItem(items: HrAdminNotification[], selectedId?: string) {
  if (selectedId) {
    const selected = items.find((item) => item.id === selectedId);
    if (selected) {
      return selected;
    }
  }
  return items[0] ?? null;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function resolveSourceHref(item: HrAdminNotification, workspace: "ess" | "mss") {
  const leaveId = item.subject_identifier || String(item.payload?.leave_request_id || "");
  const regularizationId = item.subject_identifier || String(item.payload?.attendance_regularization_id || "");
  if (item.subject_type === "leave_request") {
    return workspace === "mss"
      ? `/mss/approvals?queue=leave&leaveId=${encodeURIComponent(leaveId)}`
      : `/ess?leaveId=${encodeURIComponent(leaveId)}`;
  }
  if (item.subject_type === "attendance_regularization") {
    return workspace === "mss"
      ? `/mss/approvals?queue=attendance&regId=${encodeURIComponent(regularizationId)}`
      : `/ess?regId=${encodeURIComponent(regularizationId)}`;
  }
  if (item.subject_type === "employee_document") {
    return workspace === "mss" ? "/hr-admin/employee-documents" : "/ess/documents";
  }
  return "";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

export function UserNotificationCenter({
  actions,
  apiEndpointBase,
  basePath,
  crossWorkspaceHref,
  crossWorkspaceLabel,
  currentParams,
  data,
  state,
  workspace,
}: Props) {
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const channel = normalizeParam(currentParams.channel) ?? "";
  const priority = normalizeParam(currentParams.priority) ?? "";
  const subjectType = normalizeParam(currentParams.subject_type) ?? "";
  const page = Math.max(Number(normalizeParam(currentParams.page) || String(data.page)) || data.page, 1);
  const pageSize = Math.max(Number(normalizeParam(currentParams.page_size) || String(data.page_size)) || data.page_size, 1);
  const selected = resolveSelectedItem(data.items, normalizeParam(currentParams.itemId));
  const totalPages = Math.max(1, Math.ceil(data.total_count / data.page_size));
  const unreadOnPage = data.items.filter((item) => !item.read_at).length;
  const highPriorityOnPage = data.items.filter((item) => item.priority === "high" || item.priority === "critical").length;
  const failedOnPage = data.items.filter((item) => item.status === "failed").length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={state === "live" ? "Live notifications" : "Demo notifications"}
        title="Notifications"
        description={workspace === "mss" ? "Manager alerts, approval nudges, and queue follow-up." : "Personal alerts, document prompts, and request updates."}
        actions={actions}
        pills={[
          `${data.total_count} in view`,
          `${unreadOnPage} unread on page`,
          workspace === "mss" ? "Manager inbox" : "Employee inbox",
        ]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Notifications" value={data.total_count} trend="Current filtered view" />
          <MetricTile label="Unread on page" value={unreadOnPage} trend="Needs review" />
          <MetricTile label="High priority" value={highPriorityOnPage} trend="Escalated attention" />
          <MetricTile label="Failed on page" value={failedOnPage} trend="Delivery exceptions" />
        </div>
      </section>

      <section className="section queue-layout">
        <section className="card panel queue-toolbar panel-card-soft">
          <div className="queue-toolbar__header">
            <div>
              <h2 className="section-heading-soft">Inbox filters</h2>
              <p className="section-copy section-copy-soft">
                Search titles, bodies, and source references, then open one notification at a time with a stable read-state flow.
              </p>
            </div>
            <div className="queue-toolbar__meta">
              <span className="queue-summary-chip"><strong>{data.total_count}</strong> matching</span>
              <span className="queue-summary-chip"><strong>{data.items.length}</strong> on this page</span>
              <span className="queue-summary-chip"><strong>{pageSize}</strong> rows per page</span>
            </div>
          </div>

          <form className="queue-toolbar__grid" method="get">
            <label className="form-field">
              <span className="muted">Search</span>
              <input className="input-control" defaultValue={q} name="q" placeholder="Title, body, event, or reference" />
            </label>
            <label className="form-field">
              <span className="muted">Status</span>
              <select className="input-control" defaultValue={status} name="status">
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="read">Read</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Channel</span>
              <select className="input-control" defaultValue={channel} name="channel">
                <option value="">All channels</option>
                <option value="in_app">In app</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Priority</span>
              <select className="input-control" defaultValue={priority} name="priority">
                <option value="">All priorities</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Subject type</span>
              <select className="input-control" defaultValue={subjectType} name="subject_type">
                <option value="">All subjects</option>
                <option value="leave_request">Leave request</option>
                <option value="attendance_regularization">Attendance regularization</option>
                <option value="employee_document">Employee document</option>
                <option value="employee_onboarding">Onboarding</option>
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Rows per page</span>
              <select className="input-control" defaultValue={String(pageSize)} name="page_size">
                {[10, 25, 50].map((value) => (
                  <option key={value} value={String(value)}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <div className="queue-toolbar__actions">
              <button className="button button--primary" type="submit">
                Apply filters
              </button>
              <Link className="button button--ghost" href={basePath}>
                Clear filters
              </Link>
            </div>
          </form>
          <div className="queue-toolbar__summary">
            <span className="queue-summary-chip"><strong>Page {data.page}</strong> inbox state</span>
            <span className="queue-summary-chip"><strong>{crossWorkspaceLabel}</strong> connected workspace</span>
          </div>
        </section>

        <div className="queue-list">
          <article className="record-card panel-card-soft">
            <div className="record-card__header">
              <div className="record-card__title-block">
                <h3>Inbox list</h3>
                <p>Open one notification at a time, then update read state or jump back to the related workflow.</p>
              </div>
            </div>
            <div className="tableish">
              {data.items.length ? (
                data.items.map((item) => (
                  <Link
                    className={`tableish__row ${selected?.id === item.id ? "tableish__row--active" : ""}`}
                    href={buildHref(basePath, currentParams, { itemId: item.id })}
                    key={item.id}
                  >
                    <div className="tableish__head">
                      <strong>{item.title || item.event_definition_name || "Notification"}</strong>
                      <span className="record-chip">{item.status}</span>
                    </div>
                    <div className="tableish__meta">
                      <span>{item.channel}</span>
                      <span>{item.priority}</span>
                      <span>{item.event_definition_name || item.subject_type}</span>
                    </div>
                    <span className="muted">{item.body || item.subject || "No body content."}</span>
                  </Link>
                ))
              ) : (
                <div className="notice">
                  <strong>No notifications match the current filters.</strong>
                  <span className="muted">Try clearing one or more filters to widen the inbox view.</span>
                </div>
              )}
            </div>
          </article>

          <article className="record-card panel-card-soft">
            <div>
              <h2 className="section-heading-soft">Notification detail</h2>
              <p className="section-copy section-copy-soft">Inspect message body, delivery state, and the linked operational context.</p>
            </div>
            {selected ? (
              <div className="stack">
                <div className="detail-grid">
                  <DetailRow label="Title" value={selected.title || selected.event_definition_name || "Notification"} />
                  <DetailRow label="Status" value={selected.status} />
                  <DetailRow label="Priority" value={selected.priority} />
                  <DetailRow label="Channel" value={selected.channel} />
                  <DetailRow label="Event" value={selected.event_definition_name || "Direct delivery"} />
                  <DetailRow label="Subject type" value={selected.subject_type || "Not tagged"} />
                  <DetailRow label="Created" value={formatDateTime(selected.created_at)} />
                  <DetailRow label="Read at" value={formatDateTime(selected.read_at)} />
                </div>

                <div className="record-card__notes">
                  <strong>Body</strong>
                  <p>{selected.body || selected.subject || "No body content was recorded for this notification."}</p>
                </div>

                <div className="record-card__actions">
                  <NotificationReadToggle endpoint={`${apiEndpointBase}/${selected.id}`} isRead={Boolean(selected.read_at)} />
                  {resolveSourceHref(selected, workspace) ? (
                    <Link className="button button--ghost" href={resolveSourceHref(selected, workspace)}>
                      Open source
                    </Link>
                  ) : null}
                  <Link className="button button--ghost" href={crossWorkspaceHref}>
                    Open {crossWorkspaceLabel}
                  </Link>
                </div>

                {selected.delivery_logs.length ? (
                  <div className="stack-list">
                    {selected.delivery_logs.map((log) => (
                      <div className="detail-grid" key={log.id}>
                        <div className="detail-row"><span className="detail-label">Provider</span><span className="detail-value">{log.provider_name}</span></div>
                        <div className="detail-row"><span className="detail-label">Status</span><span className="detail-value">{log.status}</span></div>
                        <div className="detail-row"><span className="detail-label">Logged</span><span className="detail-value">{formatDateTime(log.created_at)}</span></div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="notice">
                <strong>No notification selected.</strong>
                <span className="muted">Choose a notification from the inbox list to inspect it in detail.</span>
              </div>
            )}
          </article>
        </div>
      </section>

      <PaginationBar
        firstHref={buildHref(basePath, currentParams, { itemId: undefined, page: "1" })}
        hasNext={data.has_next}
        hasPrevious={data.has_previous}
        lastHref={buildHref(basePath, currentParams, { itemId: undefined, page: String(totalPages) })}
        nextHref={buildHref(basePath, currentParams, { itemId: undefined, page: String(page + 1) })}
        page={data.page}
        pageSize={data.page_size}
        previousHref={buildHref(basePath, currentParams, { itemId: undefined, page: String(Math.max(1, page - 1)) })}
        totalCount={data.total_count}
      />
    </main>
  );
}
