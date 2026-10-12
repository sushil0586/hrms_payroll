import Link from "next/link";

import { LeaveRequestOverrideForm } from "@/app/hr-admin/leave-requests/leave-request-override-form";
import { LeaveRequestImportWorkbench } from "@/app/hr-admin/leave-requests/leave-request-import-workbench";
import { LeaveRequestQueue } from "@/app/hr-admin/leave-requests/leave-request-queue";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
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
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "25") || 25, 1), 100);
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const leaveTypeCode = normalizeParam(currentParams.leave_type_code) ?? "";
  const fromDate = normalizeParam(currentParams.from_date) ?? "";
  const toDate = normalizeParam(currentParams.to_date) ?? "";
  const selectedLeaveId = normalizeParam(currentParams.selectedLeave) ?? "";
  const overrideLeaveId = normalizeParam(currentParams.overrideLeave) ?? "";

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
  const selectedLeave = selectedLeaveId
    ? result.data.items.find((item) => item.id === selectedLeaveId) ?? (await getHrAdminLeaveRequest(selectedLeaveId)).data
    : null;
  const overrideLeave = canApproveLeaveRequests && overrideLeaveId
    ? result.data.items.find((item) => item.id === overrideLeaveId) ?? (await getHrAdminLeaveRequest(overrideLeaveId)).data
    : null;
  const overrideCloseHref = overrideLeaveId ? `/hr-admin/leave-requests?selectedLeave=${overrideLeaveId}` : "/hr-admin/leave-requests";

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui">
      <PageIntro
        eyebrow={result.state === "live" ? "Live leave operations" : "Demo leave operations"}
        title="Leave Requests"
        description="Review every leave request across the tenant with employee context, policy evidence, approval track, and balance handoff links."
        actions={<Link className="button button--secondary" href="/hr-admin/leave-balances">Open leave balances</Link>}
      />
      <TimeLeaveOperationsStrip
        current="leaveRequests"
        title="Leave request operations"
        description="Track pending approvals, approved leave, rejected requests, cancellations, and manager decision evidence."
        primaryMetricLabel="requests"
        primaryMetricValue={result.data.total_count}
        secondaryMetricLabel="pending"
        secondaryMetricValue={result.data.status_counts.pending ?? 0}
      />
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
      <LeaveRequestImportWorkbench
        requests={result.data.items}
        employees={optionsResult.data.employees}
        leaveTypes={optionsResult.data.leave_types}
      />
      {overrideLeave ? (
        <HrAdminActionModal
          closeHref={overrideCloseHref}
          description="Approve or reject the current pending leave step when HR must act for an unavailable approver."
          eyebrow="HR override"
          labelledBy="leave-request-override-title"
          title="Review leave request"
        >
          <LeaveRequestOverrideForm closeHref={overrideCloseHref} item={overrideLeave} />
        </HrAdminActionModal>
      ) : null}
    </main>
  );
}
