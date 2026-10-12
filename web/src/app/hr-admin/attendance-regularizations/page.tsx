import Link from "next/link";

import { AttendanceRegularizationQueue } from "@/app/hr-admin/attendance-regularizations/attendance-regularization-queue";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendanceRegularization, getHrAdminAttendanceRegularizations, getHrAdminAttendanceWorkbenchOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminAttendanceRegularizationsPage({ searchParams }: PageProps) {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["attendance.view"], fallbackPath: "/hr-admin" });
  const canReviewRegularizations = sessionHasPermission(sessionUser, "attendance.regularization.review");
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "25") || 25, 1), 100);
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const requestedStatus = normalizeParam(currentParams.requested_status) ?? "";
  const currentStatus = normalizeParam(currentParams.current_status) ?? "";
  const fromDate = normalizeParam(currentParams.from_date) ?? "";
  const toDate = normalizeParam(currentParams.to_date) ?? "";
  const reviewRegularizationId = normalizeParam(currentParams.reviewRegularization) ?? "";

  const [result, optionsResult] = await Promise.all([
    getHrAdminAttendanceRegularizations({
      page,
      page_size: pageSize,
      q,
      status: status || undefined,
      requested_status: requestedStatus || undefined,
      current_status: currentStatus || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
    }),
    getHrAdminAttendanceWorkbenchOptions(),
  ]);
  const reviewResult = canReviewRegularizations && reviewRegularizationId ? await getHrAdminAttendanceRegularization(reviewRegularizationId) : null;

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui">
      <PageIntro
        eyebrow={result.state === "live" && optionsResult.state === "live" ? "Live regularization mode" : "Demo regularization mode"}
        title="Regularizations"
        description="Review correction requests across the tenant to understand operational bottlenecks, exception quality, and approval pressure."
        actions={<Link className="button button--secondary" href="/hr-admin/attendance-operations">Back to attendance operations</Link>}
        pills={["Server-driven review queue", "Status-focused triage", "In-context approval decisions"]}
      />
      <TimeLeaveOperationsStrip
        current="regularizations"
        title="Attendance correction queue"
        description="Triage requested attendance corrections, review context, and preserve approval evidence."
        primaryMetricLabel="requests"
        primaryMetricValue={result.data.total_count}
        secondaryMetricLabel="status options"
        secondaryMetricValue={optionsResult.data.regularization_statuses.length}
      />
      <AttendanceRegularizationQueue
        items={result.data.items}
        regularizationStatusOptions={optionsResult.data.regularization_statuses}
        attendanceStatusOptions={optionsResult.data.attendance_statuses}
        reviewItem={reviewResult?.data ?? null}
        currentFilters={{
          q,
          status,
          requested_status: requestedStatus,
          current_status: currentStatus,
          from_date: fromDate,
          to_date: toDate,
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
        canReviewRegularizations={canReviewRegularizations}
      />
    </main>
  );
}
