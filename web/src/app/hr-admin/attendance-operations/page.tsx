import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import {
  getHrAdminAttendanceRecords,
  getHrAdminAttendanceRegularizations,
  getHrAdminEmployeeShiftAssignments,
  getHrAdminHolidayCalendars,
  getHrAdminShiftRosterTemplates,
  getHrAdminShifts,
} from "@/lib/api";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";

export default async function HrAdminAttendanceOperationsPage() {
  const [shiftsResult, calendarsResult, recordsResult, regularizationsResult, shiftAssignmentsResult, rosterTemplatesResult] = await Promise.all([
    getHrAdminShifts(),
    getHrAdminHolidayCalendars(),
    getHrAdminAttendanceRecords(),
    getHrAdminAttendanceRegularizations(),
    getHrAdminEmployeeShiftAssignments(),
    getHrAdminShiftRosterTemplates(),
  ]);

  const state =
    shiftsResult.state === "live" &&
    calendarsResult.state === "live" &&
    recordsResult.state === "live" &&
    regularizationsResult.state === "live" &&
    shiftAssignmentsResult.state === "live" &&
    rosterTemplatesResult.state === "live"
      ? "live"
      : "demo";
  const setupAssetCount = shiftsResult.data.length + calendarsResult.data.length + rosterTemplatesResult.data.total_count;
  const activeShiftCount = shiftsResult.data.filter((item) => item.is_active).length;
  const primaryAssignmentCount = shiftAssignmentsResult.data.items.filter((item) => item.is_primary).length;
  const publishedRosterCount = rosterTemplatesResult.data.items.filter((item) => item.status !== "draft").length;
  const holidayRowCount = calendarsResult.data.reduce((total, item) => total + item.holidays.length, 0);

  const dailyOperations = [
    {
      label: "Attendance records",
      description: "Review raw and interpreted daily rows before payroll source processing.",
      href: "/hr-admin/attendance-records",
      metric: `${recordsResult.data.total_count} records`,
      secondary: `${recordsResult.data.items.length} on current page`,
      tone: "info" as const,
      action: "Open records",
    },
    {
      label: "Regularizations",
      description: "Resolve correction requests with employee, shift, and audit context.",
      href: "/hr-admin/attendance-regularizations",
      metric: `${regularizationsResult.data.total_count} requests`,
      secondary: `${regularizationsResult.data.items.length} on current page`,
      tone: regularizationsResult.data.total_count ? ("warning" as const) : ("success" as const),
      action: "Open queue",
    },
    {
      label: "Leave requests",
      description: "Review leave evidence that can affect attendance and payroll outcomes.",
      href: "/hr-admin/leave-requests",
      metric: "Approval queue",
      secondary: "Route to leave operations",
      tone: "neutral" as const,
      action: "Open leave",
    },
    {
      label: "Leave balances",
      description: "Inspect leave ledgers used when attendance and leave overlap.",
      href: "/hr-admin/leave-balances",
      metric: "Leave ledgers",
      secondary: "Route to balances",
      tone: "neutral" as const,
      action: "Open balances",
    },
  ];

  const setupOperations = [
    {
      label: "Shifts",
      description: "Configure working windows, grace rules, and weekly-off patterns.",
      href: "/hr-admin/shifts",
      metric: `${shiftsResult.data.length} shifts`,
      secondary: `${activeShiftCount} active`,
      tone: activeShiftCount ? ("success" as const) : ("warning" as const),
      action: "Manage shifts",
    },
    {
      label: "Shift assignments",
      description: "Govern fixed shifts, rotations, primary assignments, and overrides.",
      href: "/hr-admin/employee-shift-assignments",
      metric: `${shiftAssignmentsResult.data.total_count} assignments`,
      secondary: `${primaryAssignmentCount} primary on page`,
      tone: "info" as const,
      action: "Manage assignments",
    },
    {
      label: "Roster templates",
      description: "Maintain reusable shift patterns for rollout across teams.",
      href: "/hr-admin/shift-roster-templates",
      metric: `${rosterTemplatesResult.data.total_count} templates`,
      secondary: `${publishedRosterCount} published on page`,
      tone: "info" as const,
      action: "Manage rosters",
    },
    {
      label: "Holiday calendars",
      description: "Maintain calendar years and holiday scopes for attendance interpretation.",
      href: "/hr-admin/holiday-calendars",
      metric: `${calendarsResult.data.length} calendars`,
      secondary: `${holidayRowCount} holiday rows`,
      tone: "info" as const,
      action: "Manage calendars",
    },
  ];

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui attendance-operations-hub accerio-page">
      <PageIntro appearance="accerio"
        eyebrow={state === "live" ? "Live attendance operations mode" : "Demo attendance operations mode"}
        title="Attendance operations"
        description="Control shifts, calendars, daily records, and correction queues from one operational layer."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/attendance-records">Attendance records</Link>
            <Link className="button button--secondary" href="/hr-admin/employee-shift-assignments">Shift assignments</Link>
            <Link className="button button--secondary" href="/hr-admin">Back to admin workspace</Link>
          </>
        }
        pills={[
          "Operational attendance control",
          "Correction and exception workflows",
          "Shift and calendar foundations",
        ]}
      />

      <details className="workspace-context-disclosure"><summary>Attendance navigation and summary</summary><TimeLeaveOperationsStrip
        current="overview"
        title="Attendance operations command"
        description="Move between attendance records, correction queues, shift coverage, calendars, and leave ledgers without mixing setup and review work."
        primaryMetricLabel="records"
        primaryMetricValue={recordsResult.data.total_count}
        secondaryMetricLabel="regularizations"
        secondaryMetricValue={regularizationsResult.data.total_count}
      /></details>

      <div className="attendance-summary-strip" aria-label="Attendance operations summary">
        <span><strong>{recordsResult.data.total_count}</strong> records</span>
        <span><strong>{regularizationsResult.data.total_count}</strong> regularizations</span>
        <span><strong>{shiftAssignmentsResult.data.total_count}</strong> assignments</span>
        <span><strong>{setupAssetCount}</strong> setup assets</span>
        <span><strong>{state}</strong> mode</span>
      </div>

      <section className="section attendance-operations-panel">
        <div className="section-heading-row attendance-operations-panel__header">
          <div>
            <h2 className="section-heading-soft">Daily operations</h2>
            <p className="section-copy-soft">Open the active queues used for attendance review, correction, and leave evidence.</p>
          </div>
        </div>
        <div className="attendance-operation-list">
          {dailyOperations.map((item) => (
            <Link className="attendance-operation-row" href={item.href} key={item.href}>
              <div className="attendance-operation-row__main">
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </div>
              <div className="attendance-operation-row__meta">
                <WorkspaceStatusBadge tone={item.tone}>{item.metric}</WorkspaceStatusBadge>
                <span>{item.secondary}</span>
              </div>
              <span className="button button--secondary button--compact">{item.action}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section attendance-operations-panel">
        <div className="section-heading-row attendance-operations-panel__header">
          <div>
            <h2 className="section-heading-soft">Attendance setup</h2>
            <p className="section-copy-soft">Maintain the foundations used by attendance runtime and downstream payroll readiness.</p>
          </div>
        </div>
        <div className="attendance-operation-list">
          {setupOperations.map((item) => (
            <Link className="attendance-operation-row" href={item.href} key={item.href}>
              <div className="attendance-operation-row__main">
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </div>
              <div className="attendance-operation-row__meta">
                <WorkspaceStatusBadge tone={item.tone}>{item.metric}</WorkspaceStatusBadge>
                <span>{item.secondary}</span>
              </div>
              <span className="button button--secondary button--compact">{item.action}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
