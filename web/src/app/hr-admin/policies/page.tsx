import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { WorkspaceCard } from "@/components/patterns/workspace-card";
import {
  getHrAdminAttendancePolicies,
  getHrAdminAttendancePolicyAssignments,
  getHrAdminLeavePolicies,
  getHrAdminLeavePolicyAssignments,
  getHrAdminLeaveTypes,
  getHrAdminPolicyOptions,
} from "@/lib/api";

export default async function HrAdminPoliciesPage() {
  const [
    leaveTypesResult,
    leavePoliciesResult,
    leaveAssignmentsResult,
    attendancePoliciesResult,
    attendanceAssignmentsResult,
    optionsResult,
  ] = await Promise.all([
    getHrAdminLeaveTypes(),
    getHrAdminLeavePolicies(),
    getHrAdminLeavePolicyAssignments(),
    getHrAdminAttendancePolicies(),
    getHrAdminAttendancePolicyAssignments(),
    getHrAdminPolicyOptions(),
  ]);

  const state =
    leaveTypesResult.state === "live" &&
    leavePoliciesResult.state === "live" &&
    leaveAssignmentsResult.state === "live" &&
    attendancePoliciesResult.state === "live" &&
    attendanceAssignmentsResult.state === "live" &&
    optionsResult.state === "live"
      ? "live"
      : "demo";

  return (
    <main className="shell">
      <PageIntro
        eyebrow={state === "live" ? "Live policy mode" : "Demo policy mode"}
        title="Policy control"
        description="Control leave and attendance rules, assignments, and rollout surfaces from one policy workspace."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/leave-types">
              Open leave types
            </Link>
            <Link className="button button--secondary" href="/hr-admin/attendance-policies">
              Attendance policies
            </Link>
            <Link className="button button--secondary" href="/hr-admin/leave-policies">
              Leave policies
            </Link>
            <Link className="button button--secondary" href="/hr-admin/leave-balances">
              Leave balances
            </Link>
            <Link className="button button--secondary" href="/hr-admin/policy-assignments">
              Policy assignments
            </Link>
            <Link className="button button--secondary" href="/hr-admin">
              Back to admin workspace
            </Link>
          </>
        }
        pills={[
          "Policy building blocks and assignments",
          "Attendance and leave coverage",
          "Ready for structure-aware rollout",
        ]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Leave types" value={leaveTypesResult.data.length} trend="Behavior building blocks" />
          <MetricTile label="Attendance policies" value={attendancePoliciesResult.data.length} trend="Time-rule coverage" />
          <MetricTile label="Leave policies" value={leavePoliciesResult.data.length} trend="Entitlement rules" />
          <MetricTile
            label="Policy assignments"
            value={leaveAssignmentsResult.data.length + attendanceAssignmentsResult.data.length}
            trend="Scoped rollout rules"
          />
          <MetricTile label="Available shifts" value={optionsResult.data.shifts.length} trend="Attendance mapping" />
          <MetricTile label="Holiday calendars" value={optionsResult.data.holiday_calendars.length} trend="Calendar mapping" />
        </div>
      </section>

      <section className="section">
        <div className="workspace-grid-modern">
          <WorkspaceCard
            eyebrow="Leave types"
            title="Shape the leave catalog"
            description="Define the actual leave buckets employees and managers see before layering policy behavior on top."
            href="/hr-admin/leave-types"
            cta="Manage leave types"
            details={[
              { label: "Configured", value: leaveTypesResult.data.length },
              { label: "Categories", value: optionsResult.data.leave_categories.length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Leave policies"
            title="Control entitlement logic"
            description="Set entitlement, accrual, notice, and eligibility rules that determine how leave behaves in practice."
            href="/hr-admin/leave-policies"
            cta="Manage leave policies"
            details={[
              { label: "Policies", value: leavePoliciesResult.data.length },
              { label: "Assignments", value: leaveAssignmentsResult.data.length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Leave balances"
            title="Run balance operations"
            description="Inspect balances, apply credits or debits, and process encashment against real policy-aware closing balances."
            href="/hr-admin/leave-balances"
            cta="Open leave balances"
            details={[
              { label: "Policies", value: leavePoliciesResult.data.length },
              { label: "Employees", value: optionsResult.data.employees.length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Attendance"
            title="Control time-treatment rules"
            description="Define lateness, overtime, manual entry, check-in, and regularization behavior from a single operator surface."
            href="/hr-admin/attendance-policies"
            cta="Manage attendance policies"
            details={[
              { label: "Policies", value: attendancePoliciesResult.data.length },
              { label: "Assignments", value: attendanceAssignmentsResult.data.length },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
