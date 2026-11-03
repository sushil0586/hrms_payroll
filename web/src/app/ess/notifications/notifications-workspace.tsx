"use client";

import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";

import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceFilterForm } from "@/components/patterns/workspace-filter-form";
import { WorkspaceStandardHeader, WorkspaceStandardPanel } from "@/components/patterns/workspace-standard";
import type { HrAdminNotificationListResponse } from "@/lib/types";
import { ScopedResourceError, useScopedWorkspaceResource } from "@/lib/ui/use-scoped-workspace-resource";

import { EmployeeNotificationInbox } from "./employee-notification-inbox";

export type NotificationQuery = { page: number; page_size: number; q: string; status: string; channel: string; priority: string; subject_type: string };
const subscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function queryFromLocation(): NotificationQuery {
  const params = new URLSearchParams(window.location.search);
  const positive = (key: string, fallback: number) => { const value = Number(params.get(key)); return Number.isSafeInteger(value) && value > 0 ? value : fallback; };
  const size = positive("page_size", 10);
  return { page: positive("page", 1), page_size: [10, 25, 50, 100].includes(size) ? size : 10, q: params.get("q") || "", status: params.get("status") || "", channel: params.get("channel") || "", priority: params.get("priority") || "", subject_type: params.get("subject_type") || "" };
}

function href(query: NotificationQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== "" && !(key === "page" && value === 1) && !(key === "page_size" && value === 10)) params.set(key, String(value)); });
  return `/ess/notifications${params.size ? `?${params}` : ""}`;
}

export function NotificationsWorkspace({ initialData, initialQuery }: { initialData: HrAdminNotificationListResponse; initialQuery: NotificationQuery }) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const request = useCallback(async (query: NotificationQuery, signal: AbortSignal) => {
    const encode = (value: NotificationQuery) => new URLSearchParams(Object.entries(value).map(([key, item]) => [key, String(item)]));
    const read = async (value: NotificationQuery) => {
      const response = await fetch(`/api/me/notifications?${encode(value)}`, { cache: "no-store", signal });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) throw new ScopedResourceError("Your session has expired.", 401);
      if (!response.ok || !payload || typeof payload !== "object" || !Array.isArray((payload as HrAdminNotificationListResponse).items)) throw new ScopedResourceError(typeof payload.detail === "string" ? payload.detail : "Notifications could not be updated.", response.status);
      return payload as HrAdminNotificationListResponse;
    };
    const data = await read(query);
    const last = Math.max(1, Math.ceil(data.total_count / data.page_size));
    return query.page > last ? read({ ...query, page: last }) : data;
  }, []);
  const resolve = useCallback((query: NotificationQuery, data: HrAdminNotificationListResponse) => ({ ...query, page: data.page, page_size: data.page_size }), []);
  const historyHref = useCallback((query: NotificationQuery) => href(query), []);
  const resource = useScopedWorkspaceResource({ initialData, initialQuery, request, resolveQuery: resolve, historyHref, readHistoryQuery: queryFromLocation, fallbackError: "Notifications could not be updated. The last confirmed inbox is still shown." });
  const data = resource.data;
  const query = resource.query;
  const last = Math.max(1, Math.ceil(data.total_count / data.page_size));
  const filtered = Boolean(query.q || query.status || query.channel || query.priority || query.subject_type);
  const apply = (formData: FormData) => void resource.load({ page: 1, page_size: Number(formData.get("page_size") || 10), q: String(formData.get("q") || ""), status: String(formData.get("status") || ""), channel: String(formData.get("channel") || ""), priority: String(formData.get("priority") || ""), subject_type: String(formData.get("subject_type") || "") });
  const pageQuery = (page: number) => ({ ...query, page });

  return <main className="shell shell--workspace ess-experience-shell ess-compact accerio-page" data-hydrated={hydrated}>
    <WorkspaceStandardHeader eyebrow="Employee self service" title="Notifications" description="Your messages and updates. Delivery status is separate from whether you have read a message." actions={<Link prefetch={false} className="button button--secondary" href="/ess/requests">My Requests</Link>} />
    <WorkspaceStandardPanel title="Inbox" description="Find a message, review its details and open the related employee service.">
      <div aria-busy={resource.isPending}>
        <WorkspaceFilterForm key={JSON.stringify(query)} action="/ess/notifications" className="workspace-filter-bar" onSubmit={(event) => { event.preventDefault(); apply(new FormData(event.currentTarget)); }} pending={resource.isPending} updateMode="scoped">
          <label className="form-field">Search notifications<input className="input-control" name="q" defaultValue={query.q} type="search" /></label>
          <label className="form-field">Delivery status<select className="input-control" name="status" defaultValue={query.status}><option value="">All statuses</option>{["pending", "sent", "delivered", "read", "failed", "cancelled"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="form-field">Category<select className="input-control" name="subject_type" defaultValue={query.subject_type}><option value="">All categories</option>{["leave_request", "attendance_regularization", "employee_document", "employee_onboarding", "payroll_payslip"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
          <label className="form-field">Channel<select className="input-control" name="channel" defaultValue={query.channel}><option value="">All channels</option>{["in_app", "email", "sms", "push", "whatsapp"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
          <label className="form-field">Priority<select className="input-control" name="priority" defaultValue={query.priority}><option value="">All priorities</option>{["low", "normal", "high", "critical"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="form-field">Rows per page<select className="input-control" name="page_size" defaultValue={String(query.page_size)}>{[10, 25, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <button className="button button--primary" disabled={resource.isPending} type="submit">Apply filters</button>
          <a className="button button--ghost" data-navigation-mode="local" href="/ess/notifications" onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); void resource.load({ page: 1, page_size: 10, q: "", status: "", channel: "", priority: "", subject_type: "" }); }}>Clear filters</a>
        </WorkspaceFilterForm>
        {resource.error ? <div className="notice notice--error" role="alert"><p>{resource.error}</p><button className="button button--secondary" disabled={resource.isPending} onClick={() => void resource.load(query, "none")} type="button">Retry inbox</button></div> : null}
        <EmployeeNotificationInbox closeHref={href(query)} emptyMessage={filtered ? "No notifications match your filters." : "No notifications yet."} items={data.items} key={JSON.stringify(query)} />
        <PaginationBar navigationMode="scoped" pending={resource.isPending} firstHref={href(pageQuery(1))} lastHref={href(pageQuery(last))} previousHref={href(pageQuery(Math.max(1, data.page - 1)))} nextHref={href(pageQuery(data.page + 1))} page={data.page} pageSize={data.page_size} totalCount={data.total_count} hasNext={data.has_next} hasPrevious={data.has_previous} onFirst={() => void resource.load(pageQuery(1))} onLast={() => void resource.load(pageQuery(last))} onPrevious={() => void resource.load(pageQuery(Math.max(1, data.page - 1)))} onNext={() => void resource.load(pageQuery(data.page + 1))} />
      </div>
    </WorkspaceStandardPanel>
  </main>;
}
