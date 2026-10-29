"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { LeaveRequestImportWorkbench } from "./leave-request-import-workbench";
import { LeaveRequestQueue } from "./leave-request-queue";
import { LeaveRequestReviewDialog } from "./leave-request-override-form";
import { ScopedResourceError, useScopedWorkspaceResource } from "@/lib/ui/use-scoped-workspace-resource";
import type { HrAdminOptionItem, LeaveRequestItem, HrAdminLeaveRequestListResponse } from "@/lib/types";

type Query = { q: string; status: string; leave_type_code: string; from_date: string; to_date: string; page: number; page_size: number };
type Data = HrAdminLeaveRequestListResponse;
const subscribe = () => () => undefined;
function href(q: Query) { const p = new URLSearchParams(); for (const key of ["q","status","leave_type_code","from_date","to_date"] as const) if (q[key]) p.set(key, q[key]); if (q.page > 1) p.set("page", String(q.page)); if (q.page_size !== 25) p.set("page_size", String(q.page_size)); return `/hr-admin/leave-requests${p.size ? `?${p}` : ""}`; }
function readQuery(): Query { const p = new URLSearchParams(window.location.search); const page = Number(p.get("page")); const size = Number(p.get("page_size")); return { q:p.get("q")||"",status:p.get("status")||"",leave_type_code:p.get("leave_type_code")||"",from_date:p.get("from_date")||"",to_date:p.get("to_date")||"",page:Number.isSafeInteger(page)&&page>0?page:1,page_size:[10,25,50,100].includes(size)?size:25 }; }

export function LeaveRequestsWorkspace({ initialData, initialQuery, leaveTypes, employees, canApproveLeaveRequests }: { initialData: Data; initialQuery: Query; leaveTypes: HrAdminOptionItem[]; employees: HrAdminOptionItem[]; canApproveLeaveRequests: boolean }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false); const [review, setReview] = useState<LeaveRequestItem | null>(null);
  const request = useCallback(async (q: Query, signal: AbortSignal) => { const p = new URLSearchParams({ ...q, page:String(q.page), page_size:String(q.page_size) }); const response = await fetch(`/api/hr-admin/leave-requests/workspace?${p}`, { cache:"no-store", signal }); const payload = await response.json().catch(() => ({})); if (!response.ok || !Array.isArray(payload.items)) throw new ScopedResourceError(typeof payload.detail === "string" ? payload.detail : "Leave requests could not be updated.", response.status); return payload as Data; }, []);
  const resource = useScopedWorkspaceResource({ initialData, initialQuery, request, historyHref: href, readHistoryQuery: readQuery, resolveQuery:(q,d)=>({...q,page:d.page,page_size:d.page_size}), fallbackError:"Leave requests could not be updated. The last confirmed queue is still shown." });
  const reconcile = useCallback(async () => { await resource.load(resource.query, "none"); setReview(null); const url = new URL(window.location.href); url.searchParams.delete("overrideLeave"); window.history.replaceState(window.history.state,"",`${url.pathname}${url.search}`); }, [resource]);
  const openReview = (item: LeaveRequestItem) => { const url = new URL(window.location.href); url.searchParams.set("overrideLeave", item.id); window.history.pushState(window.history.state,"",`${url.pathname}${url.search}`); setReview(item); };
  return <div data-local-update-hydrated={hydrated ? "true" : "false"} aria-busy={resource.isPending || undefined}>
    {resource.error ? <div className="notice notice--error" role="alert"><strong>Queue update failed.</strong><span>{resource.error}</span><button className="button button--secondary" onClick={() => void resource.load(resource.query,"none")} type="button">Retry</button></div> : null}
    <LeaveRequestQueue items={resource.data.items} currentFilters={resource.query} pagination={resource.data} statusCounts={resource.data.status_counts} leaveTypeOptions={leaveTypes} canApproveLeaveRequests={canApproveLeaveRequests} pending={resource.isPending} onApplyFilters={q => void resource.load(q)} onPage={page => void resource.load({...resource.query,page})} onReview={openReview} />
    <details className="workspace-context-disclosure"><summary>Import leave requests</summary><LeaveRequestImportWorkbench requests={resource.data.items} employees={employees} leaveTypes={leaveTypes} onCommitted={reconcile} /></details>
    {review ? <LeaveRequestReviewDialog closeHref={href(resource.query)} item={review} onDecided={reconcile} /> : null}
  </div>;
}
