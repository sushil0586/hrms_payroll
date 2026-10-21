import { redirect } from "next/navigation";
import { attendanceDateError, attendanceQueueHref } from "../attendance-records/filter-contract";

import { LeaveRequestReviewDialog } from "@/app/hr-admin/leave-requests/leave-request-override-form";
import { LeaveRequestImportWorkbench } from "@/app/hr-admin/leave-requests/leave-request-import-workbench";
import { LeaveRequestQueue } from "@/app/hr-admin/leave-requests/leave-request-queue";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeaveRequest, getHrAdminLeaveRequests, getHrAdminPolicyOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminLeaveRequestsPage({ searchParams }: PageProps) {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["leave.view"], fallbackPath: "/hr-admin" });
  const canApproveLeaveRequests = sessionHasPermission(sessionUser, "leave.requests.approve");
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Math.floor(Number(normalizeParam(currentParams.page) || "1")) || 1, 1);
  const pageSize = [10, 25, 50, 100].includes(Number(normalizeParam(currentParams.page_size))) ? Number(normalizeParam(currentParams.page_size)) : 25;
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const leaveTypeCode = normalizeParam(currentParams.leave_type_code) ?? "";
  const fromDate = normalizeParam(currentParams.from_date) ?? "";
  const toDate = normalizeParam(currentParams.to_date) ?? "";
  const selectedLeaveId = normalizeParam(currentParams.selectedLeave) ?? "";
  const overrideLeaveId = normalizeParam(currentParams.overrideLeave) ?? "";

  const invalidDates = attendanceDateError(fromDate, toDate);
  if (invalidDates) return <main className="shell accerio-page"><PageIntro appearance="accerio" eyebrow="Filter validation" title="Review leave filters" description={invalidDates} actions={<a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/leave-requests">Clear filters</a>} /><p role="alert" className="notice notice--error">{invalidDates}</p></main>;
  const [result, optionsResult] = await Promise.all([
    getHrAdminLeaveRequests({
      page,
      page_size: pageSize,
      q,
      status: status || undefined,
      leave_type_code: leaveTypeCode || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
    }),
    getHrAdminPolicyOptions(),
  ]);
  const lastPage = Math.max(1, Math.ceil(result.data.total_count / pageSize));
  if (!Number.isFinite(page) || page > lastPage) redirect(attendanceQueueHref("/hr-admin/leave-requests", {q,status,leave_type_code:leaveTypeCode,from_date:fromDate,to_date:toDate,page:lastPage,page_size:pageSize}));
  const selectedLeave = selectedLeaveId
    ? result.data.items.find((item) => item.id === selectedLeaveId) ?? (await getHrAdminLeaveRequest(selectedLeaveId)).data
    : null;
  const overrideLeave = canApproveLeaveRequests && overrideLeaveId
    ? result.data.items.find((item) => item.id === overrideLeaveId) ?? (await getHrAdminLeaveRequest(overrideLeaveId)).data
    : null;
  const overrideCloseHref = attendanceQueueHref("/hr-admin/leave-requests", {q,status,leave_type_code:leaveTypeCode,from_date:fromDate,to_date:toDate,page,page_size:pageSize,selectedLeave:overrideLeaveId});

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui accerio-page">
      <PageIntro appearance="accerio"
        eyebrow={result.state === "live" ? "Live leave operations" : "Demo leave operations"}
        title="Leave Requests"
        description="Review every leave request across the tenant with employee context, policy evidence, approval track, and balance handoff links."
        actions={<a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/leave-balances">Open leave balances</a>}
      />
      <details className="workspace-context-disclosure"><summary>Leave navigation and summary</summary><TimeLeaveOperationsStrip
        current="leaveRequests"
        title="Leave request operations"
        description="Track pending approvals, approved leave, rejected requests, cancellations, and manager decision evidence."
        primaryMetricLabel="requests"
        primaryMetricValue={result.data.total_count}
        secondaryMetricLabel="pending"
        secondaryMetricValue={result.data.status_counts.pending ?? 0}
      /></details>
      <LeaveRequestQueue
        items={result.data.items}
        selectedItem={selectedLeave}
        currentFilters={{
          q,
          status,
          leave_type_code: leaveTypeCode,
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
        statusCounts={result.data.status_counts}
        leaveTypeOptions={optionsResult.data.leave_types}
        canApproveLeaveRequests={canApproveLeaveRequests}
      />
      <details className="workspace-context-disclosure"><summary>Import leave requests</summary><LeaveRequestImportWorkbench
        requests={result.data.items}
        employees={optionsResult.data.employees}
        leaveTypes={optionsResult.data.leave_types}
      /></details>
      {overrideLeave ? (
        <LeaveRequestReviewDialog closeHref={overrideCloseHref} item={overrideLeave} />
      ) : null}
    </main>
  );
}
