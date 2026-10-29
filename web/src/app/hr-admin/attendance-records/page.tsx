import { redirect } from "next/navigation";
import { attendanceDateError } from "./filter-contract";

import { AttendanceRecordsWorkspace, type AttendanceRecordsQuery } from "@/app/hr-admin/attendance-records/attendance-records-workspace";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendanceOperationOptions, getHrAdminAttendanceRecord, getHrAdminAttendanceRecords, getHrAdminAttendanceWorkbenchOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminAttendanceRecordsPage({ searchParams }: PageProps) {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["attendance.view"], fallbackPath: "/hr-admin" });
  const canManageRecords = !sessionUser || sessionHasPermission(sessionUser, "attendance.records.manage");
  const currentParams = (await searchParams) ?? {};
  const requestedPage = Number(normalizeParam(currentParams.page));
  const page = Number.isFinite(requestedPage) ? Math.max(Math.floor(requestedPage) || 1, 1) : 1;
  const requestedSize = Number(normalizeParam(currentParams.page_size));
  const pageSize = [10, 25, 50, 100].includes(requestedSize) ? requestedSize : 25;
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const source = normalizeParam(currentParams.source) ?? "";
  const shiftId = normalizeParam(currentParams.shift_id) ?? "";
  const lockState = normalizeParam(currentParams.lock_state) ?? "";
  const regularizedState = normalizeParam(currentParams.regularized_state) ?? "";
  const fromDate = normalizeParam(currentParams.from_date) ?? "";
  const toDate = normalizeParam(currentParams.to_date) ?? "";
  const lateOnly = ["1", "true", "yes"].includes((normalizeParam(currentParams.late_only) ?? "").toLowerCase());
  const validationError = attendanceDateError(fromDate, toDate);
  const editRecordId = normalizeParam(currentParams.editRecord) ?? "";

  const [result, optionsResult, recordOptionsResult, editRecordResult] = await Promise.all([
    validationError ? Promise.resolve(null) : getHrAdminAttendanceRecords({
      page,
      page_size: pageSize,
      q,
      status: status || undefined,
      source: source || undefined,
      shift_id: shiftId || undefined,
      lock_state: lockState || undefined,
      regularized_state: regularizedState || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      late_only: lateOnly || undefined,
    }),
    getHrAdminAttendanceWorkbenchOptions({ include_people: true, include_shifts: true }),
    getHrAdminAttendanceOperationOptions(),
    canManageRecords && editRecordId ? getHrAdminAttendanceRecord(editRecordId) : Promise.resolve(null),
  ]);

  if (result && result.data.total_count > 0 && page > Math.ceil(result.data.total_count / pageSize)) {
    const query = new URLSearchParams();
    Object.entries(currentParams).forEach(([key, value]) => { const item = normalizeParam(value); if (item && key !== "editRecord") query.set(key, item); });
    query.set("page", String(Math.ceil(result.data.total_count / pageSize)));
    query.set("page_size", String(pageSize));
    redirect(`/hr-admin/attendance-records?${query}`);
  }
  return (
    <main className="shell shell--time-leave hr-admin-compact-ui accerio-page">
      <PageIntro
        appearance="accerio"
        eyebrow={result?.state === "live" && optionsResult.state === "live" ? "Live attendance records mode" : "Demo attendance records mode"}
        title="Attendance records"
        description="Review daily attendance rows to spot exceptions, late marks, source gaps, and lock state before payroll-ready processing later."
        actions={<a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/attendance-operations">Back to attendance operations</a>}
        pills={["Server-driven filters", "Bulk lock and status actions", "Queue-ready exception review"]}
      />
      {!validationError ? <details className="workspace-context-disclosure"><summary>Attendance navigation and summary</summary><TimeLeaveOperationsStrip
        current="records"
        title="Attendance records workbench"
        description="Review raw and interpreted attendance rows before they become payroll source data."
        primaryMetricLabel="rows"
        primaryMetricValue={result?.data.total_count ?? 0}
        secondaryMetricLabel="page"
        secondaryMetricValue={result?.data.page ?? page}
      />
      </details> : null}
      <AttendanceRecordsWorkspace
        initialData={{ ...(result?.data ?? { items: [], total_count: 0, page, page_size: pageSize, has_next: false, has_previous: false }), state: result?.state === "live" ? "live" : "demo", editRecord: editRecordResult?.data ?? null }}
        initialQuery={{
          q, status, source, shift_id: shiftId, lock_state: lockState, regularized_state: regularizedState,
          from_date: fromDate, to_date: toDate, late_only: lateOnly, page, page_size: pageSize, editRecord: editRecordId,
        } satisfies AttendanceRecordsQuery}
        workbenchOptions={optionsResult.data}
        recordOptions={recordOptionsResult.data}
        canManageRecords={canManageRecords}
      />
    </main>
  );
}
