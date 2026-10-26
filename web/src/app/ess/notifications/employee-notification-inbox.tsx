"use client";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";

import Link from "next/link";
import { useState } from "react";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import {
  WorkspaceDataTable,
  WorkspaceStatusBadge,
} from "@/components/patterns/workspace-standard";
import { WorkspaceInformation } from "@/components/patterns/workspace-information";
import { NotificationReadToggle } from "@/components/patterns/notification-read-toggle";
import type { HrAdminNotification } from "@/lib/types";
function source(item: HrAdminNotification) {
  const id = item.subject_identifier;
  if (item.subject_type === "leave_request" && /^[0-9a-f-]{36}$/i.test(id))
    return `/ess/leave?requestId=${encodeURIComponent(id)}`;
  // Attendance date is not part of the notification contract; its canonical detail resolves the request.
  if (
    item.subject_type === "attendance_regularization" &&
    /^[0-9a-f-]{36}$/i.test(id)
  )
    return `/ess/attendance?regId=${encodeURIComponent(id)}`;
  if (item.subject_type === "employee_document") return "/ess/documents";
  if (item.subject_type === "payroll_payslip") return "/ess/payslips";
  return "";
}
function utcTimestamp(value: string | null) {
  return value
    ? new Date(value).toISOString().replace("T", " ").slice(0, 16)
    : null;
}

export function EmployeeNotificationInbox({
  closeHref,
  emptyMessage,
  items,
}: {
  closeHref: string;
  emptyMessage: string;
  items: HrAdminNotification[];
}) {
  const [records, setRecords] = useState(items);
  const [selected, setSelected] = useState<string | null>(null);
  const item = records.find((row) => row.id === selected);
  return (
    <>
      <p role="status">
        {records.filter((row) => !row.read_at).length} unread on this page
      </p>
      {records.length ? (
        <WorkspaceDataTable
          scrollLabel="Notification table, scroll horizontally for actions"
          ariaLabel="Employee notifications"
        >
          <thead>
            <tr>
              <th>Message</th>
              <th>Read state</th>
              <th>Delivery</th>
              <th>Created (UTC)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {records.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.title || row.subject || "Notification"}</strong>
                  <p>{row.subject_type.replaceAll("_", " ") || "General"}</p>
                </td>
                <td>
                  <WorkspaceStatusBadge tone={row.read_at ? "neutral" : "info"}>
                    {row.read_at ? "Read" : "Unread"}
                  </WorkspaceStatusBadge>
                </td>
                <td>
                  {row.status} · {row.channel.replaceAll("_", " ")}
                </td>
                <td>
                  <time dateTime={row.created_at}>
                    {new Date(row.created_at)
                      .toISOString()
                      .replace("T", " ")
                      .slice(0, 16)}
                  </time>
                </td>
                <td>
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={(triggerEvent) => { focusActionTrigger(triggerEvent);
                      setSelected(row.id);
                     }}
                    aria-label={`Review notification: ${row.title || row.subject || "Notification"}`}
                  >
                    Review notification
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </WorkspaceDataTable>
      ) : (
        <p role="status">{emptyMessage}</p>
      )}
      {item ? (
        <HrAdminActionModal
          className="accerio-dialog"
          labelledBy="employee-notification-title"
          title={item.title || item.subject || "Notification"}
          closeHref={closeHref}
          onClose={() => setSelected(null)}
          footer={
            <>
              <NotificationReadToggle
                key={item.id}
                endpoint={`/api/me/notifications/${item.id}`}
                isRead={Boolean(item.read_at)}
                onSaved={(readAt) =>
                  setRecords((current) =>
                    current.map((row) =>
                      row.id === item.id ? { ...row, read_at: readAt } : row,
                    ),
                  )
                }
              />
              {source(item) ? (
                <Link
                  prefetch={false}
                  className="button button--primary"
                  href={source(item)}
                >
                  Open source
                </Link>
              ) : null}
            </>
          }
        >
          <p>{item.body || "No message content was recorded."}</p>
          <WorkspaceInformation
            fields={[
              ["Category", item.subject_type],
              ["Priority", item.priority],
              ["Delivery status", item.status],
              ["Channel", item.channel.replaceAll("_", " ")],
              ["Read state", item.read_at ? "Read" : "Unread"],
              ["Created (UTC)", utcTimestamp(item.created_at)],
              ["Read (UTC)", utcTimestamp(item.read_at)],
              ["Reference", item.subject_identifier],
            ]}
          />
          {item.status === "failed" ? (
            <p role="status">
              Delivery failed. Provider retry is restricted to authorized
              administrators; marking read does not retry delivery.
            </p>
          ) : null}
        </HrAdminActionModal>
      ) : null}
    </>
  );
}
