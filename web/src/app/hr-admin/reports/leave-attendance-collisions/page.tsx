import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeaveRequests } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportInsightsStrip } from "../report-insights-strip";
import { LeaveAttendanceCollisionsReportWorkspace } from "./leave-attendance-collisions-report-workspace";

export default async function LeaveAttendanceCollisionsReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });
  const result = await getHrAdminLeaveRequests({ page: 1, page_size: 500 });
  const collisionCount = result.data.items.reduce((sum, item) => sum + (item.attendance_collision_summary?.collision_count ?? 0), 0);
  const blockingCount = result.data.items.filter((item) => item.attendance_collision_summary?.payroll_blocking).length;

  return (
    <main className="shell hr-admin-compact-ui">
      <PageIntro
        eyebrow={result.state === "live" ? "Live attendance report" : "Demo attendance report"}
        title="Leave-Attendance Collision Report"
        description="Approved leave overlapping payable attendance, payroll blocking state, and source evidence for correction review."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports/attendance">Attendance reports</Link>
            <Link className="button button--secondary" href="/hr-admin/leave-requests">Leave requests</Link>
            <Link className="button button--primary" href="/hr-admin/payroll-inputs">Payroll inputs</Link>
          </>
        }
        pills={["Collision evidence", "Payroll blocking", "Source linked"]}
        showPills
      />

      <ReportInsightsStrip
        current="time"
        eyebrow="Leave-attendance report"
        title="Collision review evidence"
        description="Use this report to prove which approved leave rows overlap payable attendance before payroll close."
        metrics={[
          { label: "leave requests", value: result.data.total_count, tone: "neutral" },
          { label: "collisions", value: collisionCount, tone: collisionCount ? "blocked" : "ready" },
          { label: "blocking requests", value: blockingCount, tone: blockingCount ? "blocked" : "ready" },
          { label: "page size", value: result.data.items.length, tone: "neutral" },
        ]}
      />

      <LeaveAttendanceCollisionsReportWorkspace items={result.data.items} />
    </main>
  );
}
