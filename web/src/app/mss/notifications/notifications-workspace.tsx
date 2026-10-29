"use client";

import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";

import { UserNotificationCenter } from "@/components/patterns/user-notification-center";
import type { HrAdminNotificationListResponse } from "@/lib/types";
import { ScopedResourceError, useScopedWorkspaceResource } from "@/lib/ui/use-scoped-workspace-resource";

export type MssNotificationQuery = { page: number; page_size: number; q: string; status: string; channel: string; priority: string; subject_type: string };
const subscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function queryFromLocation(): MssNotificationQuery {
  const params = new URLSearchParams(window.location.search);
  const positive = (key: string, fallback: number) => { const value = Number(params.get(key)); return Number.isSafeInteger(value) && value > 0 ? value : fallback; };
  const requestedSize = positive("page_size", 10);
  return { page: positive("page", 1), page_size: [10, 25, 50].includes(requestedSize) ? requestedSize : 10, q: params.get("q") || "", status: params.get("status") || "", channel: params.get("channel") || "", priority: params.get("priority") || "", subject_type: params.get("subject_type") || "" };
}

function href(query: MssNotificationQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== "" && !(key === "page" && value === 1) && !(key === "page_size" && value === 10)) params.set(key, String(value)); });
  return `/mss/notifications${params.size ? `?${params}` : ""}`;
}

function currentParams(query: MssNotificationQuery) {
  return Object.fromEntries(Object.entries(query).map(([key, value]) => [key, String(value)]));
}

export function MssNotificationsWorkspace({ initialData, initialQuery, state }: { initialData: HrAdminNotificationListResponse; initialQuery: MssNotificationQuery; state: "live" | "demo" }) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const request = useCallback(async (query: MssNotificationQuery, signal: AbortSignal) => {
    const encode = (value: MssNotificationQuery) => new URLSearchParams(Object.entries(value).map(([key, item]) => [key, String(item)]));
    const read = async (value: MssNotificationQuery) => {
      const response = await fetch(`/api/manager/notifications?${encode(value)}`, { cache: "no-store", signal });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) throw new ScopedResourceError("Your session has expired.", 401);
      if (!response.ok || !payload || typeof payload !== "object" || !Array.isArray((payload as HrAdminNotificationListResponse).items)) throw new ScopedResourceError(typeof payload.detail === "string" ? payload.detail : "Manager notifications could not be updated.", response.status);
      return payload as HrAdminNotificationListResponse;
    };
    const data = await read(query);
    const lastPage = Math.max(1, Math.ceil(data.total_count / data.page_size));
    return query.page > lastPage ? read({ ...query, page: lastPage }) : data;
  }, []);
  const resource = useScopedWorkspaceResource({ initialData, initialQuery, request, resolveQuery: (query, data) => ({ ...query, page: data.page, page_size: data.page_size }), historyHref: (query) => href(query), readHistoryQuery: queryFromLocation, fallbackError: "Manager notifications could not be updated. The last confirmed inbox is still shown." });
  const query = resource.query;
  return <UserNotificationCenter
    actions={<><Link className="button button--primary" href="/mss/approvals">Approvals</Link><Link className="button button--ghost" href="/ess/notifications">ESS inbox</Link></>}
    apiEndpointBase="/api/manager/notifications" basePath="/mss/notifications" crossWorkspaceHref="/mss/approvals" crossWorkspaceLabel="Approvals"
    currentParams={currentParams(query)} data={resource.data} state={state} workspace="mss" title="Manager notifications" workspacePill="Manager alerts"
    actionDescription="Use notifications as signals. Open the source approval or delivery detail before taking a decision." actionEyebrow="Manager triage" actionTitle="Open the source workflow before deciding"
    description="Triage team alerts, failed delivery, and approval follow-up without mixing personal ESS messages." filterDescription="Find team alerts by status, channel, priority, or source workflow." filterTitle="Alert filters"
    listDescription="Review one manager alert at a time, then open the source workflow when needed." listTitle="Team alert list"
    hydrated={hydrated} pending={resource.isPending} error={resource.error} onRetry={() => void resource.load(query, "none")}
    onFilter={(params) => void resource.load({ page: Number(params.page || 1), page_size: Number(params.page_size || 10), q: params.q || "", status: params.status || "", channel: params.channel || "", priority: params.priority || "", subject_type: params.subject_type || "" })}
    onPage={(page) => void resource.load({ ...query, page })}
    onReadSaved={(itemId, readAt) => resource.reconcile((data) => ({ ...data, items: data.items.map((item) => item.id === itemId ? { ...item, read_at: readAt } : item) }))}
  />;
}
