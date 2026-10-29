"use client";

import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";

import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceFilterForm } from "@/components/patterns/workspace-filter-form";
import { WorkspaceStandardHeader, WorkspaceStandardPanel } from "@/components/patterns/workspace-standard";
import type { AttendanceRegularizationItem, EssAttendanceRegularizationListResponse, EssLeaveRequestListResponse, LeaveRequestItem } from "@/lib/types";
import { ScopedResourceError, useScopedWorkspaceResource } from "@/lib/ui/use-scoped-workspace-resource";

import { RequestHistory } from "./request-history";

export type RequestQuery = { type: "leave" | "attendance"; status: string; page: number };
type RequestData = (EssLeaveRequestListResponse | EssAttendanceRegularizationListResponse) & { items: (LeaveRequestItem | AttendanceRegularizationItem)[] };
const subscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function fromLocation(): RequestQuery {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type") === "attendance" ? "attendance" : "leave";
  const page = Number(params.get("page") || 1);
  return { type, status: params.get("status") || "all", page: Number.isSafeInteger(page) && page > 0 ? page : 1 };
}

function href(query: RequestQuery) {
  const params = new URLSearchParams({ type: query.type, status: query.status });
  if (query.page > 1) params.set("page", String(query.page));
  return `/ess/requests?${params}`;
}

export function RequestsWorkspace({ initialData, initialQuery }: { initialData: RequestData; initialQuery: RequestQuery }) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const request = useCallback(async (query: RequestQuery, signal: AbortSignal) => {
    const read = async (value: RequestQuery) => {
      const response = await fetch(`/api/me/request-history?${new URLSearchParams({ type: value.type, status: value.status, page: String(value.page) })}`, { cache: "no-store", signal });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) throw new ScopedResourceError("Your session has expired.", 401);
      if (!response.ok || !payload || typeof payload !== "object" || !Array.isArray(payload.items)) throw new ScopedResourceError(typeof payload.detail === "string" ? payload.detail : "Request history could not be updated.", response.status);
      return payload as RequestData;
    };
    const data = await read(query);
    const last = Math.max(1, Math.ceil(data.total_count / data.page_size));
    return query.page > last ? read({ ...query, page: last }) : data;
  }, []);
  const resolve = useCallback((query: RequestQuery, data: RequestData) => ({ ...query, page: data.page }), []);
  const historyHref = useCallback((query: RequestQuery) => href(query), []);
  const resource = useScopedWorkspaceResource({ initialData, initialQuery, request, resolveQuery: resolve, historyHref, readHistoryQuery: fromLocation, fallbackError: "Request history could not be updated. The last confirmed results are still shown." });
  const query = resource.query;
  const data = resource.data;
  const statuses = query.type === "leave" ? ["pending", "partially_approved", "approved", "rejected", "withdrawn", "cancelled"] : ["pending", "approved", "rejected"];
  const last = Math.max(1, Math.ceil(data.total_count / data.page_size));
  const pageQuery = (page: number) => ({ ...query, page });

  return <main className="shell shell--workspace ess-compact accerio-page" data-hydrated={hydrated}>
    <WorkspaceStandardHeader eyebrow="Employee services" title="My Requests" description="Track your requests. Open Leave or Attendance to review details, approval history and available actions." actions={<Link prefetch={false} className="button button--secondary" href="/ess/notifications">Notifications</Link>} />
    <WorkspaceStandardPanel title="Request history" description="Choose a request type to track its current status. Cancellation requests appear with your Leave requests.">
      <div aria-busy={resource.isPending}>
        <WorkspaceFilterForm key={`${query.type}-${query.status}`} action="/ess/requests" className="workspace-filter-bar" pending={resource.isPending} updateMode="scoped" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const type = form.get("type") === "attendance" ? "attendance" : "leave"; const requestedStatus = String(form.get("status") || "all"); const allowed = type === "leave" ? ["all", "pending", "partially_approved", "approved", "rejected", "withdrawn", "cancelled"] : ["all", "pending", "approved", "rejected"]; void resource.load({ type, status: allowed.includes(requestedStatus) ? requestedStatus : "all", page: 1 }); }}>
          <label className="form-field">Request type<select className="input-control" name="type" defaultValue={query.type}><option value="leave">Leave</option><option value="attendance">Attendance regularization</option></select></label>
          <label className="form-field">Status<select className="input-control" name="status" defaultValue={query.status}><option value="all">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
          <button className="button button--primary" type="submit">Apply filters</button>
          <a className="button button--ghost" data-navigation-mode="local" href="/ess/requests" onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); void resource.load({ type: "leave", status: "all", page: 1 }); }}>Clear filters</a>
        </WorkspaceFilterForm>
        {resource.error ? <div className="notice notice--error" role="alert"><p>{resource.error}</p><button className="button button--secondary" disabled={resource.isPending} onClick={() => void resource.load(query, "none")} type="button">Retry history</button></div> : null}
        <RequestHistory key={`${query.type}-${query.status}-${data.page}`} items={data.items} type={query.type} />
        <PaginationBar navigationMode="scoped" pending={resource.isPending} firstHref={href(pageQuery(1))} lastHref={href(pageQuery(last))} nextHref={href(pageQuery(data.page + 1))} previousHref={href(pageQuery(Math.max(1, data.page - 1)))} page={data.page} pageSize={data.page_size} totalCount={data.total_count} hasNext={data.has_next} hasPrevious={data.has_previous} onFirst={() => void resource.load(pageQuery(1))} onLast={() => void resource.load(pageQuery(last))} onNext={() => void resource.load(pageQuery(data.page + 1))} onPrevious={() => void resource.load(pageQuery(Math.max(1, data.page - 1)))} />
      </div>
    </WorkspaceStandardPanel>
    <WorkspaceStandardPanel title="Documents and other services" description="Upload required documents or replace a file in Documents. Other request services are not available here."><Link prefetch={false} className="button button--secondary" href="/ess/documents">Open Documents</Link></WorkspaceStandardPanel>
  </main>;
}
