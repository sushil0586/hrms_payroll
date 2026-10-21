import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDashboard } from "@/lib/api";
import { reportCatalog } from "@/lib/report-catalog";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportFamilyWorkspace } from "../report-family-workspace";
import { ReportInsightsStrip } from "../report-insights-strip";

const groups = [
  { key: "all", label: "All Attendance", reports: ["attendance-register", "attendance-derivation-exceptions", "attendance-exceptions", "leave-attendance-collisions", "roster-rollout-audit", "leave-balance"] },
  { key: "daily", label: "Daily Register", reports: ["attendance-register", "attendance-derivation-exceptions", "roster-rollout-audit"] },
  { key: "exceptions", label: "Exceptions", reports: ["attendance-derivation-exceptions", "attendance-exceptions", "leave-attendance-collisions"] },
  { key: "roster", label: "Roster", reports: ["roster-rollout-audit"] },
  { key: "leave", label: "Leave", reports: ["leave-balance", "leave-attendance-collisions"] },
];

export default async function AttendanceReportsPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });
  const dashboardResult = await getHrAdminDashboard();
  const { operations, overview } = dashboardResult.data;
  const reports = reportCatalog.filter((report) => report.category === "Attendance");

  return (
    <main className="shell hr-admin-compact-ui accerio-page">
      <PageIntro appearance="accerio"
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
      />

      <details className="workspace-context-disclosure"><summary>Report navigation and summary</summary><ReportInsightsStrip
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
      /></details>

      <ReportFamilyWorkspace reports={reports} groups={groups} />
    </main>
  );
}
