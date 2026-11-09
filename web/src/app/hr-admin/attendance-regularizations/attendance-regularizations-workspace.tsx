"use client";

import { useCallback, useSyncExternalStore } from "react";
import { ActionFeedbackReceipt } from "@/components/patterns/action-feedback-receipt";

import { AttendanceRegularizationQueue } from "./attendance-regularization-queue";
import type { AttendanceRegularizationItem, HrAdminAttendanceRegularizationListResponse, HrAdminEnumOption } from "@/lib/types";
import { ScopedResourceError, useScopedWorkspaceResource } from "@/lib/ui/use-scoped-workspace-resource";

export type RegularizationQuery = { q: string; status: string; requested_status: string; current_status: string; from_date: string; to_date: string; page: number; page_size: number; reviewRegularization: string };
type Data = HrAdminAttendanceRegularizationListResponse & { state: "live" | "demo"; reviewItem: AttendanceRegularizationItem | null };
const subscribe = () => () => undefined;

function fromLocation(): RegularizationQuery {
  const params = new URLSearchParams(window.location.search);
  const positive = (key: string, fallback: number) => { const value = Number(params.get(key)); return Number.isSafeInteger(value) && value > 0 ? value : fallback; };
  const size = positive("page_size", 25);
  return { q: params.get("q") || "", status: params.get("status") || "", requested_status: params.get("requested_status") || "", current_status: params.get("current_status") || "", from_date: params.get("from_date") || "", to_date: params.get("to_date") || "", page: positive("page", 1), page_size: [10,25,50,100].includes(size) ? size : 25, reviewRegularization: params.get("reviewRegularization") || "" };
}

function href(query: RegularizationQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== "" && !(key === "page" && value === 1) && !(key === "page_size" && value === 25)) params.set(key, String(value)); });
  return `/hr-admin/attendance-regularizations${params.size ? `?${params}` : ""}`;
}

export function AttendanceRegularizationsWorkspace({ initialData, initialQuery, regularizationStatusOptions, attendanceStatusOptions, canReviewRegularizations }: {
  initialData: Data; initialQuery: RegularizationQuery; regularizationStatusOptions: HrAdminEnumOption[]; attendanceStatusOptions: HrAdminEnumOption[]; canReviewRegularizations: boolean;
}) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const request = useCallback(async (query: RegularizationQuery, signal: AbortSignal) => {
    const response = await fetch(`/api/hr-admin/attendance-regularizations/workspace?${new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]))}`, { cache: "no-store", signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray((payload as Data).items)) throw new ScopedResourceError(typeof payload.detail === "string" ? payload.detail : "Attendance regularizations could not be updated.", response.status);
    return payload as Data;
  }, []);
  const resource = useScopedWorkspaceResource({ initialData, initialQuery, request,
    resolveQuery: (query, data) => ({ ...query, page: data.page, page_size: data.page_size, reviewRegularization: data.reviewItem?.id ?? "" }),
    historyHref: (query) => href(query), readHistoryQuery: fromLocation,
    fallbackError: "Attendance regularizations could not be updated. The last confirmed queue is still shown.",
  });
  const query = resource.query;
  const reconcile = useCallback(async () => (await resource.load(query, "none")).ok, [query, resource]);
  return <div data-local-update-hydrated={hydrated ? "true" : "false"} aria-busy={resource.isPending || undefined}>
    <ActionFeedbackReceipt recordIds={["attendance-regularization"]} />
    {resource.error ? <div className="notice notice--error" role="alert"><strong>Regularization update failed.</strong><span>{resource.error}</span><button className="button button--secondary button--compact" onClick={() => void resource.load(query, "none")} type="button">Retry</button></div> : null}
    <AttendanceRegularizationQueue items={resource.data.items} regularizationStatusOptions={regularizationStatusOptions} attendanceStatusOptions={attendanceStatusOptions}
      reviewItem={resource.data.reviewItem} currentFilters={query} pagination={resource.data} canReviewRegularizations={canReviewRegularizations} pending={resource.isPending}
      onQuery={(next) => void resource.load({ ...query, ...next })} onOpenReview={(id) => void resource.load({ ...query, reviewRegularization: id })}
      onCloseReview={() => void resource.load({ ...query, reviewRegularization: "" })} onReconcile={reconcile}
    />
  </div>;
}
