import Link from "next/link";

import { AttendanceRecordBulkManager } from "@/app/hr-admin/attendance-records/attendance-record-bulk-manager";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendanceOperationOptions, getHrAdminAttendanceRecords } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminAttendanceRecordsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "25") || 25, 1), 100);
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const source = normalizeParam(currentParams.source) ?? "";
  const lockState = normalizeParam(currentParams.lock_state) ?? "";
  const regularizedState = normalizeParam(currentParams.regularized_state) ?? "";
  const lateOnly = ["1", "true", "yes"].includes((normalizeParam(currentParams.late_only) ?? "").toLowerCase());

  const [result, optionsResult] = await Promise.all([
    getHrAdminAttendanceRecords({
      page,
      page_size: pageSize,
      q,
      status: status || undefined,
      source: source || undefined,
      lock_state: lockState || undefined,
      regularized_state: regularizedState || undefined,
      late_only: lateOnly || undefined,
    }),
    getHrAdminAttendanceOperationOptions(),
  ]);

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" && optionsResult.state === "live" ? "Live attendance records mode" : "Demo attendance records mode"}
        title="Attendance records review window."
        description="Review daily attendance rows to spot exceptions, late marks, source gaps, and lock state before payroll-ready processing later."
        actions={<Link className="button button--secondary" href="/hr-admin/attendance-operations">Back to attendance operations</Link>}
        pills={["Server-driven filters", "Bulk lock and status actions", "Queue-ready exception review"]}
      />
      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Rows in window" value={result.data.total_count} trend="Reviewable attendance rows" />
          <MetricTile label="Current page" value={result.data.items.length} trend={`Page ${result.data.page}`} />
          <MetricTile label="Attendance statuses" value={optionsResult.data.attendance_statuses.length} trend="Status options" />
          <MetricTile label="Attendance sources" value={optionsResult.data.attendance_sources.length} trend="Capture channels" />
        </div>
      </section>
      <AttendanceRecordBulkManager
        items={result.data.items}
        state={result.state}
        statusOptions={optionsResult.data.attendance_statuses}
        sourceOptions={optionsResult.data.attendance_sources}
        currentFilters={{
          q,
          status,
          source,
          lock_state: lockState,
          regularized_state: regularizedState,
          late_only: lateOnly,
          page,
          page_size: pageSize,
        }}
        pagination={{
          total_count: result.data.total_count,
          page: result.data.page,
          page_size: result.data.page_size,
          has_next: result.data.has_next,
          has_previous: result.data.has_previous,
        }}
      />
    </main>
  );
}
