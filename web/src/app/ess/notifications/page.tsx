import Link from "next/link";
import { getEssNotifications } from "@/lib/api";
import { EmployeeNotificationInbox } from "./employee-notification-inbox";
import {
  WorkspaceStandardHeader,
  WorkspaceStandardPanel,
} from "@/components/patterns/workspace-standard";
import { PaginationBar } from "@/components/patterns/pagination-bar";
type Params = Record<string, string | string[] | undefined>;
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<Params>;
}) {
  const params = (await searchParams) ?? {};
  const first = (key: string) =>
    Array.isArray(params[key]) ? params[key][0] : params[key];
  const rawPage = Number(first("page"));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const option = (key: string, allowed: string[]) => {
    const value = first(key) ?? "";
    return allowed.includes(value) ? value : "";
  };
  const channel = option("channel", [
    "in_app",
    "email",
    "sms",
    "push",
    "whatsapp",
  ]);
  const priority = option("priority", ["low", "normal", "high", "critical"]);
  const requestedSize = Number(first("page_size"));
  const pageSize = [10, 25, 50, 100].includes(requestedSize)
    ? requestedSize
    : 10;
  const q = first("q") ?? "";
  const status = option("status", [
    "pending",
    "sent",
    "delivered",
    "read",
    "failed",
    "cancelled",
  ]);
  const subject = option("subject_type", [
    "leave_request",
    "attendance_regularization",
    "employee_document",
    "employee_onboarding",
    "payroll_payslip",
  ]);
  let result = await getEssNotifications({
    page,
    page_size: pageSize,
    q,
    status,
    channel,
    priority,
    subject_type: subject,
  });
  const last = Math.max(
    1,
    Math.ceil(result.data.total_count / result.data.page_size),
  );
  if (page > last)
    result = await getEssNotifications({
      page: last,
      page_size: pageSize,
      q,
      status,
      channel,
      priority,
      subject_type: subject,
    });
  const data = result.data;
  const href = (p: number) => {
    const scoped = new URLSearchParams({ page: String(p), page_size: String(pageSize) });
    Object.entries({ q, status, channel, priority, subject_type: subject }).forEach(([key, value]) => {
      if (value) scoped.set(key, value);
    });
    return `/ess/notifications?${scoped}`;
  };
  return (
    <main className="shell shell--workspace ess-compact accerio-page">
      <WorkspaceStandardHeader
        eyebrow="Employee inbox"
        title="Notifications"
        description="Your messages and updates. Delivery status is separate from whether you have read a message."
        actions={
          <Link
            prefetch={false}
            className="button button--secondary"
            href="/ess/requests"
          >
            My Requests
          </Link>
        }
      />
      <WorkspaceStandardPanel
        title="Inbox"
        description="Find a message, review its details and open the related employee service."
      >
        <form method="get" className="workspace-filter-bar">
          <label className="form-field">
            Search notifications
            <input
              className="input-control"
              name="q"
              defaultValue={q}
              type="search"
            />
          </label>
          <label className="form-field">
            Delivery status
            <select
              className="input-control"
              name="status"
              defaultValue={status}
            >
              <option value="">All statuses</option>
              {[
                "pending",
                "sent",
                "delivered",
                "read",
                "failed",
                "cancelled",
              ].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Category
            <select
              className="input-control"
              name="subject_type"
              defaultValue={subject}
            >
              <option value="">All categories</option>
              {[
                "leave_request",
                "attendance_regularization",
                "employee_document",
                "employee_onboarding",
                "payroll_payslip",
              ].map((v) => (
                <option key={v} value={v}>
                  {v.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Channel
            <select
              className="input-control"
              name="channel"
              defaultValue={channel}
            >
              <option value="">All channels</option>
              {["in_app", "email", "sms", "push", "whatsapp"].map((v) => (
                <option key={v} value={v}>
                  {v.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Priority
            <select
              className="input-control"
              name="priority"
              defaultValue={priority}
            >
              <option value="">All priorities</option>
              {["low", "normal", "high", "critical"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Rows per page
            <select
              className="input-control"
              name="page_size"
              defaultValue={String(pageSize)}
            >
              {[10, 25, 50, 100].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <button className="button button--primary" type="submit">
            Apply filters
          </button>
          <Link
            prefetch={false}
            className="button button--ghost"
            href="/ess/notifications"
          >
            Clear filters
          </Link>
        </form>
        <EmployeeNotificationInbox
          closeHref={href(data.page)}
          emptyMessage={q || status || channel || priority || subject ? "No notifications match your filters." : "No notifications yet."}
          key={JSON.stringify(data)}
          items={data.items}
        />
        <PaginationBar
          navigationMode="document"
          firstHref={href(1)}
          lastHref={href(last)}
          previousHref={href(Math.max(1, data.page - 1))}
          nextHref={href(data.page + 1)}
          page={data.page}
          pageSize={data.page_size}
          totalCount={data.total_count}
          hasNext={data.has_next}
          hasPrevious={data.has_previous}
        />
      </WorkspaceStandardPanel>
    </main>
  );
}
