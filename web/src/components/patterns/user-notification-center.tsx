import Link from "next/link";
import type { ReactNode } from "react";

import { PaginationBar } from "@/components/patterns/pagination-bar";
import { UserNotificationDetailAction } from "@/components/patterns/user-notification-detail-action";
import type { HrAdminNotification, HrAdminNotificationListResponse } from "@/lib/types";

type SearchParamValue = string | string[] | undefined;

type Props = {
  actions: ReactNode;
  apiEndpointBase: string;
  basePath: string;
  crossWorkspaceHref: string;
  crossWorkspaceLabel: string;
  currentParams: Record<string, SearchParamValue>;
  data: HrAdminNotificationListResponse;
  state: "live" | "demo";
  workspace: "ess" | "mss";
  title?: string;
  description?: string;
  workspacePill?: string;
  filterTitle?: string;
  filterDescription?: string;
  actionEyebrow?: string;
  actionTitle?: string;
  actionDescription?: string;
  listTitle?: string;
  listDescription?: string;
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
  if (item.subject_type === "payroll_payslip") {
    return workspace === "mss" ? "/hr-admin/payroll-outputs" : "/ess/payslips";
  }
  return "";
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function summarizeMessage(item: HrAdminNotification) {
  return item.body || item.subject || "No body content.";
}

function SummaryCard({ label, value, hint }: { label: string; value: ReactNode; hint: string }) {
  return (
    <article className="workspace-summary-card metric-tile user-notification-metric">
      <div className="workspace-summary-card__meta">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
    </article>
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
  title,
  description,
  workspacePill,
  filterTitle = "Inbox filters",
  filterDescription = "Search your messages, then open one item to review source context and read state.",
  actionTitle = "Review messages that need action",
  actionDescription = "Keep this page focused on finding alerts. Open a notification only when you need the full message, delivery trail, or source workflow.",
  listTitle = "Inbox list",
  listDescription = "Open one notification at a time and jump to the related workflow when needed.",
}: Props) {
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const channel = normalizeParam(currentParams.channel) ?? "";
  const priority = normalizeParam(currentParams.priority) ?? "";
  const subjectType = normalizeParam(currentParams.subject_type) ?? "";
  const page = Math.max(Number(normalizeParam(currentParams.page) || String(data.page)) || data.page, 1);
  const pageSize = Math.max(Number(normalizeParam(currentParams.page_size) || String(data.page_size)) || data.page_size, 1);
  const totalPages = Math.max(1, Math.ceil(data.total_count / data.page_size));
  const unreadOnPage = data.items.filter((item) => !item.read_at).length;
  const highPriorityOnPage = data.items.filter((item) => item.priority === "high" || item.priority === "critical").length;
  const failedOnPage = data.items.filter((item) => item.status === "failed").length;

  return (
    <main className={`shell shell--workspace user-notification-shell user-notification-shell--${workspace}`}>
      <header className="workspace-control-header">
        <div className="workspace-control-header__copy">
          <span className="workspace-control-header__eyebrow">{state === "live" ? "Live notifications" : "Demo notifications"}</span>
          <h1>{title ?? "Notifications"}</h1>
          <p>{description ?? (workspace === "mss" ? "Manager alerts, approval nudges, and queue follow-up." : "Personal alerts, document prompts, and request updates.")}</p>
          <div className="workspace-control-header__metrics">
            <span>{data.total_count} in view</span>
            <span>{unreadOnPage} unread on page</span>
            <span>{workspacePill ?? (workspace === "mss" ? "Manager inbox" : "Employee inbox")}</span>
          </div>
        </div>
        <div className="workspace-control-header__actions">
          {actions}
        </div>
      </header>

      <section className="workspace-summary-grid user-notification-summary-grid" aria-label="Notification metrics">
        <SummaryCard label="Notifications" value={data.total_count} hint="Current filtered view" />
        <SummaryCard label="Unread on page" value={unreadOnPage} hint="Needs review" />
        <SummaryCard label="High priority" value={highPriorityOnPage} hint="Escalated attention" />
        <SummaryCard label="Failed on page" value={failedOnPage} hint="Delivery exceptions" />
      </section>

      <section className="workspace-section queue-layout user-notification-center">
        <section className="workspace-data-panel queue-toolbar user-notification-filters">
          <div className="workspace-data-panel__header queue-toolbar__header">
            <div>
              <h2 className="section-heading-soft">{filterTitle}</h2>
              <p className="section-copy section-copy-soft">
                {filterDescription}
              </p>
            </div>
            <div className="queue-toolbar__meta">
              <span className="queue-summary-chip"><strong>{data.total_count}</strong> matching</span>
              <span className="queue-summary-chip"><strong>{data.items.length}</strong> on this page</span>
              <span className="queue-summary-chip"><strong>{pageSize}</strong> rows per page</span>
            </div>
          </div>

          <details className="workspace-filter-disclosure user-notification-filter-disclosure" open>
            <summary>Refine notification inbox</summary>
            <form className="workspace-filter-disclosure__content queue-toolbar__grid" method="get">
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
                  <option value="payroll_payslip">Payroll payslip</option>
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
          </details>
          <div className="queue-toolbar__summary">
            <span className="queue-summary-chip"><strong>Page {data.page}</strong> inbox state</span>
            <span className="queue-summary-chip"><strong>{crossWorkspaceLabel}</strong> connected workspace</span>
          </div>
        </section>

        <div className="queue-list user-notification-grid">
          <article className="workspace-data-panel record-card user-notification-list">
            <div className="workspace-data-panel__header record-card__header">
              <div className="record-card__title-block">
                <h3>{listTitle}</h3>
                <p>{listDescription}</p>
              </div>
            </div>
            <div className="user-notification-inline-guidance" aria-label="Notification review guidance">
              <strong>{actionTitle}</strong>
              <span>{actionDescription}</span>
              <Link className="button button--ghost" href={crossWorkspaceHref}>
                Open {crossWorkspaceLabel}
              </Link>
            </div>
            <div className="workspace-table tableish">
              {data.items.length ? (
                <div className="workspace-table__row workspace-table__row--head user-notification-row user-notification-row--head">
                  <span>Message</span>
                  <span>Priority</span>
                  <span>Delivery</span>
                  <span>Received</span>
                  <span>Actions</span>
                </div>
              ) : null}
              {data.items.length ? (
                data.items.map((item) => (
                  <article
                    className="workspace-table__row user-notification-row"
                    key={item.id}
                  >
                    <div className="user-notification-row__message">
                      <strong>{item.title || item.event_definition_name || "Notification"}</strong>
                      <span>{summarizeMessage(item)}</span>
                    </div>
                    <span className={`record-chip record-chip--${item.priority}`}>{titleCase(item.priority)}</span>
                    <div className="user-notification-row__delivery">
                      <span className={`record-chip record-chip--${item.status}`}>{titleCase(item.status)}</span>
                      <small>{titleCase(item.channel)}</small>
                    </div>
                    <span className="muted">{formatDateTime(item.created_at)}</span>
                    <div className="table-actions">
                      <UserNotificationDetailAction endpoint={`${apiEndpointBase}/${item.id}`} item={item} sourceHref={resolveSourceHref(item, workspace)} />
                    </div>
                  </article>
                ))
              ) : (
                <div className="notice user-notification-empty">
                  <strong>No notifications match the current filters.</strong>
                  <span className="muted">Clear filters or widen the search to review the full inbox.</span>
                  <Link className="button button--secondary" href={basePath}>
                    Clear filters
                  </Link>
                </div>
              )}
            </div>
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
