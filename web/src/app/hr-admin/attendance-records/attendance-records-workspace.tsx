"use client";

import { useCallback, useSyncExternalStore } from "react";
import { ActionFeedbackReceipt } from "@/components/patterns/action-feedback-receipt";

import { AttendanceRecordBulkManager } from "./attendance-record-bulk-manager";
import { AttendanceRecordImportWorkbench } from "./attendance-record-import-workbench";
import { attendanceDateError, type AttendanceRecordFilters } from "./filter-contract";
import type { HrAdminAttendanceOperationOptions, HrAdminAttendanceRecord, HrAdminAttendanceRecordListResponse, HrAdminAttendanceWorkbenchOptions } from "@/lib/types";
import { ScopedResourceError, useScopedWorkspaceResource } from "@/lib/ui/use-scoped-workspace-resource";

type Data = HrAdminAttendanceRecordListResponse & { state: "live" | "demo"; editRecord: HrAdminAttendanceRecord | null };
export type AttendanceRecordsQuery = AttendanceRecordFilters & { editRecord: string };
const subscribe = () => () => undefined;

function fromLocation(): AttendanceRecordsQuery {
  const params = new URLSearchParams(window.location.search);
  const positive = (key: string, fallback: number) => { const value = Number(params.get(key)); return Number.isSafeInteger(value) && value > 0 ? value : fallback; };
  const requestedSize = positive("page_size", 25);
  return {
    q: params.get("q") || "", status: params.get("status") || "", source: params.get("source") || "", shift_id: params.get("shift_id") || "",
    lock_state: params.get("lock_state") || "", regularized_state: params.get("regularized_state") || "", from_date: params.get("from_date") || "", to_date: params.get("to_date") || "",
    late_only: ["1", "true", "yes"].includes((params.get("late_only") || "").toLowerCase()), page: positive("page", 1),
    page_size: [10, 25, 50, 100].includes(requestedSize) ? requestedSize : 25, editRecord: params.get("editRecord") || "",
  };
}

function href(query: AttendanceRecordsQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === "" || value === false || (key === "page" && value === 1) || (key === "page_size" && value === 25)) return;
    params.set(key, String(value));
  });
  return `/hr-admin/attendance-records${params.size ? `?${params}` : ""}`;
}

export function AttendanceRecordsWorkspace({ initialData, initialQuery, workbenchOptions, recordOptions, canManageRecords }: {
  initialData: Data; initialQuery: AttendanceRecordsQuery; workbenchOptions: HrAdminAttendanceWorkbenchOptions;
  recordOptions: HrAdminAttendanceOperationOptions; canManageRecords: boolean;
}) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const request = useCallback(async (query: AttendanceRecordsQuery, signal: AbortSignal) => {
    const response = await fetch(`/api/hr-admin/attendance-records/workspace?${new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]))}`, { cache: "no-store", signal });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) throw new ScopedResourceError("Your session has expired.", 401);
    if (!response.ok || !Array.isArray((payload as Data).items)) throw new ScopedResourceError(typeof payload.detail === "string" ? payload.detail : "Attendance records could not be updated.", response.status);
    return payload as Data;
  }, []);
  const resource = useScopedWorkspaceResource({
    initialData, initialQuery, request,
    resolveQuery: (query, data) => ({ ...query, page: data.page, page_size: data.page_size, editRecord: data.editRecord?.id ?? "" }),
    historyHref: (query) => href(query), readHistoryQuery: fromLocation,
    fallbackError: "Attendance records could not be updated. The last confirmed queue is still shown.",
  });
  const query = resource.query;
  const filters: AttendanceRecordFilters = query;
  const validationError = attendanceDateError(query.from_date, query.to_date);
  const reconcile = useCallback(async () => (await resource.load(query, "none")).ok, [query, resource]);
  return <div data-local-update-hydrated={hydrated ? "true" : "false"} aria-busy={resource.isPending || undefined}>
    <ActionFeedbackReceipt recordIds={["attendance-record"]} />
    {resource.error ? <div className="notice notice--error" role="alert"><strong>Attendance update failed.</strong><span>{resource.error}</span><button className="button button--secondary button--compact" onClick={() => void resource.load(query, "none")} type="button">Retry</button></div> : null}
    <AttendanceRecordBulkManager
      items={resource.data.items} state={resource.data.state} statusOptions={workbenchOptions.attendance_statuses} sourceOptions={workbenchOptions.attendance_sources}
      shiftOptions={workbenchOptions.shifts} recordOptions={recordOptions} editRecord={resource.data.editRecord} currentFilters={filters}
      pagination={resource.data} canManageRecords={canManageRecords} pending={resource.isPending} validationError={validationError}
      onQuery={(next) => void resource.load({ ...query, ...next })} onReconcile={reconcile}
      onOpenEdit={(id) => void resource.load({ ...query, editRecord: id }, "push")}
      onCloseEdit={() => void resource.load({ ...query, editRecord: "" }, "push")}
    />
    {!validationError ? <details className="workspace-context-disclosure"><summary>Attendance import tools</summary><AttendanceRecordImportWorkbench
      records={resource.data.items} employees={workbenchOptions.employees} shifts={workbenchOptions.shifts}
      statusOptions={workbenchOptions.attendance_statuses} sourceOptions={workbenchOptions.attendance_sources}
      canManageRecords={canManageRecords} onCommitted={reconcile}
    /></details> : null}
  </div>;
}
