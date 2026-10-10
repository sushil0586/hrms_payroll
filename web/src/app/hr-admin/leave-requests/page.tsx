import Link from "next/link";

import { LeaveRequestImportWorkbench } from "@/app/hr-admin/leave-requests/leave-request-import-workbench";
import { LeaveRequestQueue } from "@/app/hr-admin/leave-requests/leave-request-queue";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeaveRequests, getHrAdminPolicyOptions } from "@/lib/api";
import { requireSessionPermission } from "@/lib/workspace-access";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminLeaveRequestsPage({ searchParams }: PageProps) {
  await requireSessionPermission({ permissionKeys: ["leave.view"], fallbackPath: "/hr-admin" });
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "25") || 25, 1), 100);
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const leaveTypeCode = normalizeParam(currentParams.leave_type_code) ?? "";
  const fromDate = normalizeParam(currentParams.from_date) ?? "";
  const toDate = normalizeParam(currentParams.to_date) ?? "";

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

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui">
      <PageIntro
        eyebrow={result.state === "live" ? "Live leave operations" : "Demo leave operations"}
        title="Leave Requests"
        description="Review every leave request across the tenant with employee context, policy evidence, approval track, and balance handoff links."
        actions={<Link className="button button--secondary" href="/hr-admin/leave-balances">Open leave balances</Link>}
        pills={["Tenant-wide queue", "Approval track visible", "Print-ready operations view"]}
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
      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Matching requests" value={result.data.total_count} trend="Filtered workload" />
          <MetricTile label="Pending approval" value={result.data.status_counts.pending ?? 0} trend="Needs approver action" />
          <MetricTile label="Approved" value={result.data.status_counts.approved ?? 0} trend="Payroll-impacting leave" />
          <MetricTile label="Rejected/cancelled" value={(result.data.status_counts.rejected ?? 0) + (result.data.status_counts.cancelled ?? 0)} trend="Closed exceptions" />
        </div>
      </section>
      <LeaveRequestQueue
        items={result.data.items}
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
      />
      <LeaveRequestImportWorkbench
        requests={result.data.items}
        employees={optionsResult.data.employees}
        leaveTypes={optionsResult.data.leave_types}
      />
    </main>
  );
}
