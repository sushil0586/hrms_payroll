import Link from "next/link";

import { NotificationRetryAction } from "@/app/hr-admin/notifications/notification-retry-action";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminNotification } from "@/lib/api";
import { formatNotificationDateTime } from "@/lib/notification-observability";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminNotificationReviewPage({ params }: PageProps) {
  const { itemId } = await params;
  const result = await getHrAdminNotification(itemId);
  const item = result.data;
  const latestLog = [...item.delivery_logs].sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
  const latestFailureLog = [...item.delivery_logs]
    .filter((log) => log.status === "failed" || log.status === "error" || Boolean(log.error_message))
    .sort((left, right) => right.created_at.localeCompare(left.created_at))[0];

  return (
    <main className="shell">
      <PageIntro
        actions={<Link className="button button--secondary" href="/hr-admin/notifications">Back to queue</Link>}
        description="Inspect one notification payload and its current state."
        eyebrow={result.state === "live" ? "Live notification mode" : "Demo notification mode"}
        pills={[item.status, item.channel, item.priority]}
        title="Notification review"
      />

      <section className="section">
        <article className="record-card">
          <div className="record-card__header">
            <div className="record-card__title-block">
              <h3>{item.title || "Untitled"}</h3>
              <p>{item.event_definition_name || "Direct notification"} • {item.subject_type}</p>
            </div>
            <div className="record-card__actions">
              <span className="record-chip">{item.status}</span>
              <span className="record-chip">{item.channel}</span>
            </div>
          </div>

          <div className="record-card__details">
            <div>
              <span className="record-card__label">Recipient</span>
              <strong>{item.recipient_membership_name || item.recipient_identifier || item.recipient_address || "Unknown"}</strong>
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
              <span className="record-card__label">Subject</span>
              <strong>{item.subject || "None"}</strong>
            </div>
          </div>

          <div className="record-card__notes">
            <strong>Body</strong>
            <p>{item.body || "No body content"}</p>
          </div>

          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip">
              <strong>{item.attempt_count}</strong> / {item.max_attempts} attempts
            </span>
            <span className="queue-summary-chip">
              <strong>{item.retry_backoff_minutes}</strong> min backoff
            </span>
            <span className="queue-summary-chip">
              <strong>{item.can_retry ? "Retry open" : "Retry capped"}</strong>
            </span>
          </div>

          {item.status === "failed" || item.retry_limit_reached || latestFailureLog ? (
            <div className="notice">
              <strong>Delivery attention needed.</strong>
              <span className="muted">
                {latestFailureLog?.error_message || (item.retry_limit_reached ? "Retry limit has been reached for this notification." : "The latest delivery attempt did not complete cleanly.")}{" "}
                {latestFailureLog?.created_at ? `Last failed attempt was logged ${formatNotificationDateTime(latestFailureLog.created_at)}.` : ""}
              </span>
            </div>
          ) : null}

          <NotificationRetryAction itemId={item.id} canRetry={item.can_retry} retryLimitReached={item.retry_limit_reached} />

          <div className="record-card__details">
            <div>
              <span className="record-card__label">Created</span>
              <strong>{formatNotificationDateTime(item.created_at)}</strong>
            </div>
            <div>
              <span className="record-card__label">Sent</span>
              <strong>{formatNotificationDateTime(item.sent_at)}</strong>
            </div>
            <div>
              <span className="record-card__label">Delivered</span>
              <strong>{formatNotificationDateTime(item.delivered_at)}</strong>
            </div>
            <div>
              <span className="record-card__label">Latest provider</span>
              <strong>{latestLog?.provider_name || "No provider activity yet"}</strong>
            </div>
          </div>

          <div className="notice">
            <strong>Payload</strong>
            <span className="muted">
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(item.payload, null, 2)}</pre>
            </span>
          </div>
        </article>
      </section>

      <section className="section">
        <article className="card panel panel-card-soft">
          <div className="queue-toolbar__header">
            <div>
              <h2 className="section-heading-soft">Delivery log</h2>
              <p className="section-copy section-copy-soft">
                Review backend and provider outcomes for this notification across recent delivery attempts.
              </p>
            </div>
            <div className="queue-toolbar__meta">
              <span className="queue-summary-chip">
                <strong>{item.delivery_logs.length}</strong> attempts
              </span>
              <span className="queue-summary-chip">
                <strong>{item.max_attempts}</strong> max attempts
              </span>
            </div>
          </div>

          {item.delivery_logs.length ? (
            <div className="stack-list">
              {item.delivery_logs.map((log) => (
                <article className="record-card" key={log.id}>
                  <div className="record-card__header">
                    <div className="record-card__title-block">
                      <h3>{log.provider_name || "Delivery backend"}</h3>
                      <p>
                        {log.channel} • {log.created_at}
                      </p>
                    </div>
                    <div className="record-card__actions">
                      <span className="record-chip">{log.status}</span>
                    </div>
                  </div>

                  <div className="record-card__details">
                    <div>
                      <span className="record-card__label">Provider reference</span>
                      <strong>{log.provider_reference || "Not provided"}</strong>
                    </div>
                    <div>
                      <span className="record-card__label">Channel</span>
                      <strong>{log.channel}</strong>
                    </div>
                    <div>
                      <span className="record-card__label">Logged</span>
                      <strong>{formatNotificationDateTime(log.created_at)}</strong>
                    </div>
                  </div>

                  {log.error_message ? (
                    <div className="notice">
                      <strong>Delivery error</strong>
                      <span className="muted">{log.error_message}</span>
                    </div>
                  ) : null}

                  <div className="notice">
                    <strong>Provider response</strong>
                    <span className="muted">
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(log.response_payload, null, 2)}</pre>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="notice">
              <strong>No delivery attempts yet.</strong>
              <span className="muted">This notification has not been processed by a delivery backend yet.</span>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
