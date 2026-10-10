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

  return (
    <main className="shell shell--time-leave">
      <PageIntro
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

      <TimeLeaveOperationsStrip
        current="overview"
        title="Attendance operations command"
        description="Move between attendance records, correction queues, shift coverage, calendars, and leave ledgers without mixing setup and review work."
        primaryMetricLabel="records"
        primaryMetricValue={recordsResult.data.total_count}
        secondaryMetricLabel="regularizations"
        secondaryMetricValue={regularizationsResult.data.total_count}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Attendance records" value={recordsResult.data.total_count} trend="Review window" />
          <MetricTile label="Regularizations" value={regularizationsResult.data.total_count} trend="Correction queue" />
          <MetricTile label="Shift coverage" value={shiftAssignmentsResult.data.total_count} trend="Assignments" />
          <MetricTile label="Setup assets" value={shiftsResult.data.length + calendarsResult.data.length + rosterTemplatesResult.data.total_count} trend="Shifts, calendars, rosters" />
        </div>
      </section>

      <section className="section">
        <div className="section-heading-row">
          <div>
            <h2 className="section-heading-soft">Operate attendance</h2>
            <p className="section-copy-soft">Use these pages for daily review and correction work.</p>
          </div>
        </div>
        <div className="workspace-grid-modern">
          <WorkspaceCard
            eyebrow="Records"
            title="Daily attendance rows"
            description="Filter, bulk-edit, and correct attendance data from a queue built for operational review."
            href="/hr-admin/attendance-records"
            cta="Open records"
            details={[
              { label: "Rows", value: recordsResult.data.total_count },
              { label: "Page size", value: recordsResult.data.items.length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Regularizations"
            title="Correction requests"
            description="Review employee correction requests with enough context to keep audit quality high."
            href="/hr-admin/attendance-regularizations"
            cta="Open regularizations"
            details={[
              { label: "Requests", value: regularizationsResult.data.total_count },
              { label: "Page size", value: regularizationsResult.data.items.length },
            ]}
          />
        </div>
      </section>

      <section className="section">
        <div className="section-heading-row">
          <div>
            <h2 className="section-heading-soft">Configure attendance foundations</h2>
            <p className="section-copy-soft">Use these pages for setup work that attendance runtime depends on.</p>
          </div>
        </div>
        <div className="workspace-grid-modern">
          <WorkspaceCard
            eyebrow="Shifts"
            title="Working-time windows"
            description="Configure shift timing, grace rules, and weekly-offs."
            href="/hr-admin/shifts"
            cta="Manage shifts"
            details={[
              { label: "Shift masters", value: shiftsResult.data.length },
              { label: "Active shifts", value: shiftsResult.data.filter((item) => item.is_active).length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Assignments"
            title="Employee shift coverage"
            description="Govern fixed shifts, weekly rotations, and temporary overrides."
            href="/hr-admin/employee-shift-assignments"
            cta="Manage shift assignments"
            details={[
              { label: "Assignments", value: shiftAssignmentsResult.data.total_count },
              { label: "Primary on page", value: shiftAssignmentsResult.data.items.filter((item) => item.is_primary).length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Rosters"
            title="Reusable shift patterns"
            description="Define roster templates once, then roll them out across teams."
            href="/hr-admin/shift-roster-templates"
            cta="Manage roster templates"
            details={[
              { label: "Templates", value: rosterTemplatesResult.data.total_count },
              { label: "Published on page", value: rosterTemplatesResult.data.items.filter((item) => item.status !== "draft").length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Calendars"
            title="Holiday treatment"
            description="Maintain calendar years and holiday scopes for attendance interpretation."
            href="/hr-admin/holiday-calendars"
            cta="Manage calendars"
            details={[
              { label: "Calendars", value: calendarsResult.data.length },
              { label: "Holiday rows", value: calendarsResult.data.reduce((total, item) => total + item.holidays.length, 0) },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
