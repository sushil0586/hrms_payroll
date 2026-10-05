"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { NotificationReadToggle } from "@/components/patterns/notification-read-toggle";
import type { HrAdminNotification } from "@/lib/types";

type Props = {
  endpoint: string;
  item: HrAdminNotification;
  sourceHref: string;
  variant?: "primary" | "secondary" | "ghost";
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function useEscapeClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
}

export function UserNotificationDetailAction({ endpoint, item, sourceHref, variant = "secondary" }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  useEscapeClose(isOpen, () => setIsOpen(false));

  const title = item.title || item.event_definition_name || "Notification";
  const attempts = `${item.attempt_count}/${item.max_attempts}`;
  const modal = isOpen && typeof document !== "undefined"
    ? createPortal(
        <div className="modal-shell" role="presentation">
          <div aria-label={`Notification detail for ${title}`} aria-modal="true" className="modal user-notification-modal" role="dialog">
            <div className="modal__header">
              <div>
                <span className="workspace-card__eyebrow">Notification detail</span>
                <h2>{title}</h2>
                <p className="section-copy section-copy-soft">
                  {titleCase(item.channel)} / {titleCase(item.priority)} / {titleCase(item.status)}
                </p>
              </div>
              <button className="button button--secondary" onClick={() => setIsOpen(false)} type="button">
                Close
              </button>
            </div>

            <div className="user-notification-modal-summary">
              <article>
                <span>Status</span>
                <strong>{titleCase(item.status)}</strong>
              </article>
              <article>
                <span>Priority</span>
                <strong>{titleCase(item.priority)}</strong>
              </article>
              <article>
                <span>Attempts</span>
                <strong>{attempts}</strong>
              </article>
            </div>

            <div className="user-notification-modal-actions">
              <NotificationReadToggle endpoint={endpoint} isRead={Boolean(item.read_at)} />
              {sourceHref ? (
                <Link className="button button--primary" href={sourceHref}>
                  Open source
                </Link>
              ) : null}
            </div>

            <div className="user-notification-modal-grid">
              <section className="ess-modal-section">
                <span className="workspace-card__eyebrow">Message</span>
                <div className="record-card__notes">
                  <strong>{item.subject || title}</strong>
                  <p>{item.body || "No body content was recorded for this notification."}</p>
                </div>
              </section>

              <section className="ess-modal-section">
                <span className="workspace-card__eyebrow">Delivery</span>
                <div className="detail-grid">
                  <DetailRow label="Channel" value={titleCase(item.channel)} />
                  <DetailRow label="Recipient" value={item.recipient_identifier || item.recipient_address || "Not available"} />
                  <DetailRow label="Scheduled" value={formatDateTime(item.scheduled_for)} />
                  <DetailRow label="Sent" value={formatDateTime(item.sent_at)} />
                  <DetailRow label="Delivered" value={formatDateTime(item.delivered_at)} />
                  <DetailRow label="Read" value={formatDateTime(item.read_at)} />
                </div>
              </section>

              <section className="ess-modal-section">
                <span className="workspace-card__eyebrow">Source workflow</span>
                <div className="detail-grid">
                  <DetailRow label="Event" value={item.event_definition_name || "Direct delivery"} />
                  <DetailRow label="Subject type" value={item.subject_type || "Not tagged"} />
                  <DetailRow label="Reference" value={item.subject_identifier || "Not available"} />
                  <DetailRow label="Created" value={formatDateTime(item.created_at)} />
                </div>
              </section>

              <section className="ess-modal-section">
                <span className="workspace-card__eyebrow">Provider logs</span>
                {item.delivery_logs.length ? (
                  <div className="stack-list">
                    {item.delivery_logs.map((log) => (
                      <div className="detail-grid" key={log.id}>
                        <DetailRow label="Provider" value={log.provider_name || "Not available"} />
                        <DetailRow label="Status" value={titleCase(log.status)} />
                        <DetailRow label="Logged" value={formatDateTime(log.created_at)} />
                        <DetailRow label="Message" value={log.error_message || log.provider_reference || "No provider message"} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="section-copy section-copy-soft">No provider logs were attached to this notification.</p>
                )}
              </section>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button className={`button button--${variant}`} onClick={() => setIsOpen(true)} type="button">
        Review notification
      </button>

      {modal}
    </>
  );
}
