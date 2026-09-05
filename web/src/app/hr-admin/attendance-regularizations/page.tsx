import Link from "next/link";

import { AttendanceRegularizationQueue } from "@/app/hr-admin/attendance-regularizations/attendance-regularization-queue";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendanceOperationOptions, getHrAdminAttendanceRegularizations } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminAttendanceRegularizationsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "25") || 25, 1), 100);
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const requestedStatus = normalizeParam(currentParams.requested_status) ?? "";
  const currentStatus = normalizeParam(currentParams.current_status) ?? "";

  const [result, optionsResult] = await Promise.all([
    getHrAdminAttendanceRegularizations({
      page,
      page_size: pageSize,
      q,
      status: status || undefined,
      requested_status: requestedStatus || undefined,
      current_status: currentStatus || undefined,
    }),
    getHrAdminAttendanceOperationOptions(),
  ]);

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" && optionsResult.state === "live" ? "Live regularization mode" : "Demo regularization mode"}
        title="Attendance regularization queue for HR oversight."
        description="Review correction requests across the tenant to understand operational bottlenecks, exception quality, and approval pressure."
        actions={<Link className="button button--secondary" href="/hr-admin/attendance-operations">Back to attendance operations</Link>}
        pills={["Server-driven review queue", "Status-focused triage", "In-context approval decisions"]}
      />
      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Requests in window" value={result.data.total_count} trend="Correction workload" />
          <MetricTile label="Current page" value={result.data.items.length} trend={`Page ${result.data.page}`} />
          <MetricTile label="Request statuses" value={optionsResult.data.regularization_statuses.length} trend="Workflow states" />
          <MetricTile label="Attendance statuses" value={optionsResult.data.attendance_statuses.length} trend="Requested outcomes" />
        </div>
      </section>
      <AttendanceRegularizationQueue
        items={result.data.items}
        regularizationStatusOptions={optionsResult.data.regularization_statuses}
        attendanceStatusOptions={optionsResult.data.attendance_statuses}
        currentFilters={{
          q,
          status,
          requested_status: requestedStatus,
          current_status: currentStatus,
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
