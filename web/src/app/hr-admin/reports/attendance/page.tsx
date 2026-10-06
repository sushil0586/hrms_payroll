import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDashboard } from "@/lib/api";
import { reportCatalog } from "@/lib/report-catalog";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportFamilyWorkspace } from "../report-family-workspace";
import { ReportInsightsStrip } from "../report-insights-strip";

const groups = [
  { key: "all", label: "All Attendance", reports: ["attendance-register", "attendance-exceptions", "leave-balance"] },
  { key: "daily", label: "Daily Register", reports: ["attendance-register"] },
  { key: "exceptions", label: "Exceptions", reports: ["attendance-exceptions"] },
  { key: "leave", label: "Leave Balance", reports: ["leave-balance"] },
];

export default async function AttendanceReportsPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });
  const dashboardResult = await getHrAdminDashboard();
  const { operations, overview } = dashboardResult.data;
  const reports = reportCatalog.filter((report) => report.category === "Attendance");

  return (
    <main className="shell">
      <PageIntro
        eyebrow={dashboardResult.state === "live" ? "Live attendance reports" : "Demo attendance reports"}
        title="Attendance Reports"
        description="Daily attendance, exception SLA, and leave balance reporting in one focused workspace."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">All reports</Link>
            <Link className="button button--secondary" href="/hr-admin/attendance-operations">Attendance operations</Link>
            <Link className="button button--secondary" href="/hr-admin/leave-balances">Leave balances</Link>
          </>
        }
        pills={["Attendance", "Exceptions", "Leave"]}
        showPills
      />

      <ReportInsightsStrip
        current="time"
        eyebrow="Attendance reports"
        title="Time and leave report workspace"
        description="Use this workspace for day-level attendance proof, correction aging, and leave liability."
        metrics={[
          { label: "reports", value: reports.length, tone: "neutral" },
          { label: "leave approvals", value: operations.pending_leave_requests, tone: operations.pending_leave_requests ? "warning" : "ready" },
          { label: "regularizations", value: operations.pending_regularizations, tone: operations.pending_regularizations ? "warning" : "ready" },
          { label: "employees", value: overview.total_employees, tone: "neutral" },
        ]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Pending leave" value={operations.pending_leave_requests} trend="Approval load" />
          <MetricTile label="Attendance corrections" value={operations.pending_regularizations} trend="Exception queue" />
          <MetricTile label="Employees" value={overview.total_employees} trend="Report population" />
          <MetricTile label="Report set" value={reports.length} trend="Attendance coverage" />
        </div>
      </section>

      <ReportFamilyWorkspace reports={reports} groups={groups} />
    </main>
  );
}
