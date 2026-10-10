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
} from "@/lib/api";

export default async function HrAdminPoliciesPage() {
  const [
    leaveTypesResult,
    leavePoliciesResult,
    leaveAssignmentsResult,
    attendancePoliciesResult,
    attendanceAssignmentsResult,
  ] = await Promise.all([
    getHrAdminLeaveTypes(),
    getHrAdminLeavePolicies(),
    getHrAdminLeavePolicyAssignments(),
    getHrAdminAttendancePolicies(),
    getHrAdminAttendancePolicyAssignments(),
  ]);

  const state =
    leaveTypesResult.state === "live" &&
    leavePoliciesResult.state === "live" &&
    leaveAssignmentsResult.state === "live" &&
    attendancePoliciesResult.state === "live" &&
    attendanceAssignmentsResult.state === "live"
      ? "live"
      : "demo";

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui">
      <PageIntro
        eyebrow={state === "live" ? "Live policy mode" : "Demo policy mode"}
        title="Policy control"
        description="Control leave and attendance rules, assignments, and rollout surfaces from one policy workspace."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/leave-policies">Leave policies</Link>
            <Link className="button button--secondary" href="/hr-admin/attendance-policies">Attendance policies</Link>
            <Link className="button button--secondary" href="/hr-admin/policy-assignments">Assignments</Link>
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
          <MetricTile label="Leave catalog" value={leaveTypesResult.data.length + leavePoliciesResult.data.length} trend="Types and policies" />
          <MetricTile label="Attendance policies" value={attendancePoliciesResult.data.length} trend="Time-rule coverage" />
          <MetricTile
            label="Policy assignments"
            value={leaveAssignmentsResult.data.total_count + attendanceAssignmentsResult.data.length}
            trend="Scoped rollout rules"
          />
          <MetricTile label="Policy surfaces" value={4} trend="Catalog, leave, attendance, assignments" />
        </div>
      </section>

      <section className="section">
        <div className="section-heading-row">
          <div>
            <h2 className="section-heading-soft">Configure policy foundations</h2>
            <p className="section-copy-soft">Use these pages for rule setup. Assignment and balance operations stay in their own workspaces.</p>
          </div>
        </div>
        <div className="workspace-grid-modern">
          <WorkspaceCard
            eyebrow="Leave types"
            title="Leave catalog"
            description="Define the leave buckets employees and managers see."
            href="/hr-admin/leave-types"
            cta="Manage leave types"
            details={[
              { label: "Configured", value: leaveTypesResult.data.length },
              { label: "Policies", value: leavePoliciesResult.data.length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Leave policies"
            title="Entitlement rules"
            description="Set entitlement, accrual, notice, and eligibility behavior."
            href="/hr-admin/leave-policies"
            cta="Manage leave policies"
            details={[
              { label: "Policies", value: leavePoliciesResult.data.length },
              { label: "Assignments", value: leaveAssignmentsResult.data.total_count },
            ]}
          />
          <WorkspaceCard
            eyebrow="Attendance"
            title="Time-treatment rules"
            description="Define lateness, overtime, check-in, and regularization behavior."
            href="/hr-admin/attendance-policies"
            cta="Manage attendance policies"
            details={[
              { label: "Policies", value: attendancePoliciesResult.data.length },
              { label: "Assignments", value: attendanceAssignmentsResult.data.length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Assignments"
            title="Policy rollout"
            description="Apply leave and attendance policies to employee or organization scopes."
            href="/hr-admin/policy-assignments"
            cta="Open assignments"
            details={[
              { label: "Leave", value: leaveAssignmentsResult.data.total_count },
              { label: "Attendance", value: attendanceAssignmentsResult.data.length },
            ]}
          />
        </div>
      </section>

      <section className="section">
        <div className="workspace-grid-modern">
          <WorkspaceCard
            eyebrow="Balances"
            title="Leave balance operations"
            description="Inspect balances, apply credits or debits, and process encashment."
            href="/hr-admin/leave-balances"
            cta="Open balances"
            details={[
              { label: "Policies", value: leavePoliciesResult.data.length },
              { label: "Surface", value: "Operations" },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
