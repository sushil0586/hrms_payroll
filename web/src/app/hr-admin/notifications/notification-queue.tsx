"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { NotificationInlineReview } from "@/app/hr-admin/notifications/notification-inline-review";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { formatNotificationDateTime } from "@/lib/notification-observability";
import type { HrAdminEnumOption, HrAdminNotification } from "@/lib/types";

type Props = {
  items: HrAdminNotification[];
  notificationStatusOptions: HrAdminEnumOption[];
  notificationChannelOptions: HrAdminEnumOption[];
  notificationPriorityOptions: HrAdminEnumOption[];
  notificationRetryStateOptions: HrAdminEnumOption[];
  audienceTypeOptions: HrAdminEnumOption[];
  moduleOptions: HrAdminEnumOption[];
  subjectTypeOptions: HrAdminEnumOption[];
  currentFilters: {
    q: string;
    status: string;
    channel: string;
    priority: string;
    audience_type: string;
    module: string;
    subject_type: string;
    retry_state: string;
    page: number;
    page_size: number;
  };
  pagination: {
    total_count: number;
    page: number;
    page_size: number;
    has_next: boolean;
    has_previous: boolean;
  };
};

function buildQueryString(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === false) {
      return;
    }
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export function NotificationQueue({
  items,
  notificationStatusOptions,
  notificationChannelOptions,
  notificationPriorityOptions,
  notificationRetryStateOptions,
  audienceTypeOptions,
  moduleOptions,
  subjectTypeOptions,
  currentFilters,
  pagination,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const actionableItems = items.filter((item) => item.can_retry);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [search, setSearch] = useState(currentFilters.q);
  const [status, setStatus] = useState(currentFilters.status || "all");
  const [channel, setChannel] = useState(currentFilters.channel || "all");
  const [priority, setPriority] = useState(currentFilters.priority || "all");
  const [retryState, setRetryState] = useState(currentFilters.retry_state || "all");
  const [audienceType, setAudienceType] = useState(currentFilters.audience_type || "all");
  const [module, setModule] = useState(currentFilters.module || "all");
  const [subjectType, setSubjectType] = useState(currentFilters.subject_type || "all");
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));
  const actionableSelectedIds = selectedIds.filter((itemId) => actionableItems.some((item) => item.id === itemId));
  const allSelected = actionableItems.length > 0 && actionableSelectedIds.length === actionableItems.length;
  const selectedActionableCount = actionableSelectedIds.length;

  function toggleOne(itemId: string) {
    setSelectedIds((current) => (current.includes(itemId) ? current.filter((value) => value !== itemId) : [...current, itemId]));
  }

  function toggleAll() {
    setSelectedIds((current) => (current.length === actionableItems.length ? [] : actionableItems.map((item) => item.id)));
  }

  function goToPage(page: number) {
    router.push(
      `${pathname}${buildQueryString({
        q: search.trim() || undefined,
        status: status !== "all" ? status : undefined,
        channel: channel !== "all" ? channel : undefined,
        priority: priority !== "all" ? priority : undefined,
        retry_state: retryState !== "all" ? retryState : undefined,
        audience_type: audienceType !== "all" ? audienceType : undefined,
        module: module !== "all" ? module : undefined,
        subject_type: subjectType !== "all" ? subjectType : undefined,
        page,
        page_size: Number(pageSize) || currentFilters.page_size,
      })}`,
    );
  }

  async function handleBulkRetry() {
    setError("");
    setIsSubmittingBulk(true);
    const response = await fetch("/api/hr-admin/notifications/bulk-retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notification_ids: actionableSelectedIds, process_now: true }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail =
        payload && typeof payload === "object" && "detail" in payload ? String((payload as Record<string, unknown>).detail) : "Unable to retry selected notifications.";
      setError(detail);
      setIsSubmittingBulk(false);
      return;
    }
    setSelectedIds([]);
    setIsSubmittingBulk(false);
    router.refresh();
  }

  return (
    <section className="section queue-layout">
      <section aria-label="Notification queue toolbar" className="card panel queue-toolbar panel-card-soft" data-testid="notification-queue-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Notifications</h2>
            <p className="section-copy section-copy-soft">
              Filter event alerts, direct notifications, and delivery outcomes.
            </p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{pagination.total_count}</strong> total notifications</span>
            <span className="queue-summary-chip"><strong>{items.length}</strong> on this page</span>
            <span className="queue-summary-chip"><strong>{selectedActionableCount}</strong> selected</span>
            <span className="queue-summary-chip"><strong>{actionableItems.length}</strong> retry ready</span>
            <span className="queue-summary-chip"><strong>{notificationChannelOptions.length}</strong> channels</span>
          </div>
        </div>

        <div className="queue-toolbar__grid">
          <label className="form-field">
            <span className="muted">Search</span>
            <input
              className="input-control"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title, subject, recipient, event, subject reference"
              value={search}
            />
          </label>
          <label className="form-field">
            <span className="muted">Status</span>
            <select className="input-control" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="all">All statuses</option>
              {notificationStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Channel</span>
            <select className="input-control" onChange={(event) => setChannel(event.target.value)} value={channel}>
              <option value="all">All channels</option>
              {notificationChannelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Priority</span>
            <select className="input-control" onChange={(event) => setPriority(event.target.value)} value={priority}>
              <option value="all">All priorities</option>
              {notificationPriorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Audience type</span>
            <select className="input-control" onChange={(event) => setAudienceType(event.target.value)} value={audienceType}>
              <option value="all">All audience types</option>
              {audienceTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Retry state</span>
            <select className="input-control" onChange={(event) => setRetryState(event.target.value)} value={retryState}>
              <option value="all">All retry states</option>
              {notificationRetryStateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Module</span>
            <select className="input-control" onChange={(event) => setModule(event.target.value)} value={module}>
              <option value="all">All modules</option>
              {moduleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Subject type</span>
            <select className="input-control" onChange={(event) => setSubjectType(event.target.value)} value={subjectType}>
              <option value="all">All subject types</option>
              {subjectTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Rows per page</span>
            <select className="input-control" onChange={(event) => setPageSize(event.target.value)} value={pageSize}>
              {[10, 25, 50, 100].map((value) => (
                <option key={value} value={String(value)}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="queue-toolbar__actions">
          <button className="button button--secondary" disabled={isSubmittingBulk || selectedActionableCount === 0} onClick={handleBulkRetry} type="button">
            {isSubmittingBulk ? "Retrying..." : `Retry selected (${selectedActionableCount || 0})`}
          </button>
          <button className="button button--primary" onClick={() => goToPage(1)} type="button">
            Apply filters
          </button>
          <button
            className="button button--ghost"
            onClick={() => {
              setSearch("");
              setStatus("all");
              setChannel("all");
              setPriority("all");
              setRetryState("all");
              setAudienceType("all");
              setModule("all");
              setSubjectType("all");
              setPageSize("25");
              router.push(pathname);
            }}
            type="button"
          >
            Clear filters
          </button>
        </div>
        <div className="queue-toolbar__summary">
          <span className="queue-summary-chip"><strong>Page {pagination.page}</strong> shared state</span>
          <span className="queue-summary-chip"><strong>{notificationStatusOptions.length}</strong> statuses</span>
          <span className="queue-summary-chip"><strong>{notificationPriorityOptions.length}</strong> priorities</span>
        </div>
        {error ? (
          <div className="notice">
            <strong>Bulk retry failed.</strong>
            <span className="muted">{error}</span>
          </div>
        ) : null}
      </section>

      <div className="queue-list">
        {items.length ? (
          <article className="record-card panel-card-soft">
            <div className="record-card__header">
              <div className="record-card__title-block">
                <h3>Select notifications</h3>
                <p>Use selection to retry delivery in batches from the queue. Capped items stay visible but are not selectable.</p>
              </div>
              <div className="record-card__actions">
                <label className="checkbox-row">
                  <input checked={allSelected} disabled={actionableItems.length === 0} onChange={toggleAll} type="checkbox" />
                  <span>Select page</span>
                </label>
              </div>
            </div>
          </article>
        ) : null}
        {items.map((item) => (
          <article className="record-card panel-card-soft" key={item.id}>
            <div className="record-card__header">
              <div className="record-card__title-block">
                <h3>{item.title || item.event_definition_name || "Notification"}</h3>
                <p>{item.channel} • {item.subject_type} • {item.recipient_membership_name || item.recipient_identifier || "Unknown recipient"}</p>
              </div>
              <div className="record-card__actions">
                <label className="checkbox-row">
                  <input checked={selectedIds.includes(item.id)} disabled={!item.can_retry} onChange={() => toggleOne(item.id)} type="checkbox" />
                  <span>{item.can_retry ? "Select" : "Locked"}</span>
                </label>
                <span className="record-chip">{item.status}</span>
                <span className="record-chip">{item.priority}</span>
                <span className="record-chip">{`Attempts ${item.attempt_count}/${item.max_attempts}`}</span>
                {item.retry_limit_reached ? <span className="record-chip">Retry capped</span> : null}
                {item.subject_type === "employee_document" ? <span className="record-chip record-chip--accent">Document</span> : null}
                <Link className="button button--secondary" href={`/hr-admin/notifications/${item.id}/review`}>
                  Review
                </Link>
              </div>
            </div>

            {item.status === "failed" || item.retry_limit_reached ? (
              <div className="notice">
                <strong>{item.retry_limit_reached ? "Retry cap reached." : "Delivery failed."}</strong>
                <span className="muted">
                  {item.delivery_logs.find((log) => log.error_message)?.error_message || "Open review to inspect the latest provider response and recover the delivery path."}
                </span>
              </div>
            ) : null}

            <div className="record-card__details">
              <div>
                <span className="record-card__label">Event</span>
                <strong>{item.event_definition_name || "Direct send"}</strong>
              </div>
              <div>
                <span className="record-card__label">Scheduled</span>
                <strong>{item.scheduled_for || "Immediate"}</strong>
              </div>
              <div>
                <span className="record-card__label">Read at</span>
                <strong>{item.read_at || "Unread"}</strong>
              </div>
              <div>
                <span className="record-card__label">Recipient</span>
                <strong>{item.recipient_address || item.recipient_identifier || "Not available"}</strong>
              </div>
              <div>
                <span className="record-card__label">Retry policy</span>
                <strong>
                  {item.can_retry
                    ? item.retry_backoff_minutes > 0
                      ? `Open after ${item.retry_backoff_minutes} min backoff`
                      : "Retry available now"
                    : "Retry limit reached"}
                </strong>
              </div>
              <div>
                <span className="record-card__label">Latest activity</span>
                <strong>{formatNotificationDateTime(item.delivery_logs[0]?.created_at || item.read_at || item.delivered_at || item.sent_at || item.created_at)}</strong>
              </div>
            </div>

            {item.subject ? (
              <div className="record-card__notes">
                <strong>Subject context</strong>
                <p>{item.subject}</p>
              </div>
            ) : null}
            <NotificationInlineReview
              item={item}
              notificationPriorityOptions={notificationPriorityOptions}
              notificationStatusOptions={notificationStatusOptions}
            />
          </article>
        ))}

        {items.length === 0 ? (
          <div className="card panel panel-card-soft">
            <strong>No notifications match the current filters.</strong>
            <p className="muted">Try clearing one or more filters to widen the queue.</p>
          </div>
        ) : null}
      </div>

      <PaginationBar
        hasNext={pagination.has_next}
        hasPrevious={pagination.has_previous}
        onFirst={() => goToPage(1)}
        onLast={() => goToPage(Math.max(1, Math.ceil(pagination.total_count / pagination.page_size)))}
        onNext={() => goToPage(pagination.page + 1)}
        onPrevious={() => goToPage(pagination.page - 1)}
        page={pagination.page}
        pageSize={pagination.page_size}
        totalCount={pagination.total_count}
      />
    </section>
  );
}
