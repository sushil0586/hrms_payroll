import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { WorkspaceCard } from "@/components/patterns/workspace-card";
import {
  getHrAdminAttendanceRecords,
  getHrAdminAttendanceRegularizations,
  getHrAdminEmployeeShiftAssignments,
  getHrAdminHolidayCalendars,
  getHrAdminShiftRosterTemplates,
  getHrAdminShifts,
} from "@/lib/api";

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

  return (
    <main className="shell">
      <PageIntro
        eyebrow={state === "live" ? "Live attendance operations mode" : "Demo attendance operations mode"}
        title="Attendance operations"
        description="Control shifts, calendars, daily records, and correction queues from one operational layer."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/shifts">Open shifts</Link>
            <Link className="button button--secondary" href="/hr-admin/employee-shift-assignments">Shift assignments</Link>
            <Link className="button button--secondary" href="/hr-admin/shift-roster-templates">Roster templates</Link>
            <Link className="button button--secondary" href="/hr-admin/holiday-calendars">Holiday calendars</Link>
            <Link className="button button--secondary" href="/hr-admin/attendance-records">Attendance records</Link>
            <Link className="button button--secondary" href="/hr-admin/attendance-regularizations">Regularizations</Link>
            <Link className="button button--secondary" href="/hr-admin">Back to admin workspace</Link>
          </>
        }
        pills={[
          "Operational attendance control",
          "Correction and exception workflows",
          "Shift and calendar foundations",
        ]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Shift masters configured" value={shiftsResult.data.length} trend="Time-window setup" />
          <MetricTile label="Shift assignments" value={shiftAssignmentsResult.data.length} trend="Coverage windows" />
          <MetricTile label="Roster templates" value={rosterTemplatesResult.data.length} trend="Repeat rollout patterns" />
          <MetricTile label="Holiday calendars configured" value={calendarsResult.data.length} trend="Calendar coverage" />
          <MetricTile label="Attendance records in review window" value={recordsResult.data.total_count} trend="Operational row volume" />
          <MetricTile label="Regularizations in review window" value={regularizationsResult.data.total_count} trend="Correction pressure" />
        </div>
      </section>

      <section className="section">
        <div className="workspace-grid-modern">
          <WorkspaceCard
            eyebrow="Shifts"
            title="Shape working-time windows"
            description="Configure shift timing, grace rules, and weekly-offs so attendance interpretation starts from clean operational assumptions."
            href="/hr-admin/shifts"
            cta="Manage shifts"
            details={[
              { label: "Shift masters", value: shiftsResult.data.length },
              { label: "Active shifts", value: shiftsResult.data.filter((item) => item.is_active).length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Assignments"
            title="Map employees onto shift windows"
            description="Govern fixed shifts, weekly rotations, and temporary overrides before runtime decides which shift actually resolves."
            href="/hr-admin/employee-shift-assignments"
            cta="Manage shift assignments"
            details={[
              { label: "Assignments", value: shiftAssignmentsResult.data.length },
              { label: "Primary windows", value: shiftAssignmentsResult.data.filter((item) => item.is_primary).length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Rosters"
            title="Publish reusable shift patterns"
            description="Define reusable roster templates once, then bulk-roll them out across departments or selected employees."
            href="/hr-admin/shift-roster-templates"
            cta="Manage roster templates"
            details={[
              { label: "Templates", value: rosterTemplatesResult.data.length },
              { label: "Published or locked", value: rosterTemplatesResult.data.filter((item) => item.status !== "draft").length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Calendars"
            title="Define holiday treatment"
            description="Maintain calendar years and holiday scopes that policies and attendance rows can reference without ambiguity."
            href="/hr-admin/holiday-calendars"
            cta="Manage calendars"
            details={[
              { label: "Calendars", value: calendarsResult.data.length },
              { label: "Holiday rows", value: calendarsResult.data.reduce((total, item) => total + item.holidays.length, 0) },
            ]}
          />
          <WorkspaceCard
            eyebrow="Records"
            title="Review daily attendance rows"
            description="Filter, bulk-edit, and correct attendance data from a queue built for high-volume operational review."
            href="/hr-admin/attendance-records"
            cta="Open records"
            details={[
              { label: "Rows in window", value: recordsResult.data.total_count },
              { label: "Current page", value: recordsResult.data.items.length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Regularizations"
            title="Resolve correction requests"
            description="Review and action employee correction requests with enough context to keep audit quality high."
            href="/hr-admin/attendance-regularizations"
            cta="Open regularizations"
            details={[
              { label: "Requests in window", value: regularizationsResult.data.total_count },
              { label: "Current page", value: regularizationsResult.data.items.length },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
