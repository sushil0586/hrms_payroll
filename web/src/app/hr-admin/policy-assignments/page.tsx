import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { WorkspaceCard } from "@/components/patterns/workspace-card";
import { getHrAdminAttendancePolicyAssignments, getHrAdminLeavePolicyAssignments } from "@/lib/api";

export default async function HrAdminPolicyAssignmentsPage() {
  const [leaveResult, attendanceResult] = await Promise.all([
    getHrAdminLeavePolicyAssignments(),
    getHrAdminAttendancePolicyAssignments(),
  ]);

  const state = leaveResult.state === "live" && attendanceResult.state === "live" ? "live" : "demo";

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui">
      <PageIntro
        eyebrow={state === "live" ? "Live assignment mode" : "Demo assignment mode"}
        title="Policy assignments"
        description="Apply leave and attendance policies by branch, department, grade, employment type, or employee scope."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/leave-policy-assignments">Open leave assignments</Link>
            <Link className="button button--secondary" href="/hr-admin/attendance-policy-assignments">Open attendance assignments</Link>
            <Link className="button button--secondary" href="/hr-admin/policies">Back to policies</Link>
          </>
        }
      />
      <section className="section">
        <div className="metrics-grid">
          <MetricTile label="Leave assignments" value={leaveResult.data.total_count} trend="Scoped policy rollout" />
          <MetricTile label="Attendance assignments" value={attendanceResult.data.length} trend="Operational coverage" />
          <MetricTile label="Active assignments" value={leaveResult.data.items.filter((item) => item.is_active).length + attendanceResult.data.filter((item) => item.is_active).length} trend="Visible leave plus attendance" />
        </div>
      </section>
      <section className="section">
        <div className="section-heading-row">
          <div>
            <h2 className="section-heading-soft">Choose assignment scope</h2>
            <p className="section-copy-soft">Leave and attendance assignment rules stay separate so rollout behavior is easier to audit.</p>
          </div>
        </div>
        <div className="workspace-grid">
          <WorkspaceCard
            eyebrow="Leave"
            title="Leave policy assignments"
            description="Apply leave policies to organization slices or employee overrides."
            href="/hr-admin/leave-policy-assignments"
            cta="Manage leave assignments"
            details={[
              { label: "Assignments", value: leaveResult.data.total_count },
              { label: "Active on page", value: leaveResult.data.items.filter((item) => item.is_active).length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Attendance"
            title="Attendance policy assignments"
            description="Map attendance policies to branches, departments, grades, and employees."
            href="/hr-admin/attendance-policy-assignments"
            cta="Manage attendance assignments"
            details={[
              { label: "Assignments", value: attendanceResult.data.length },
              { label: "Active", value: attendanceResult.data.filter((item) => item.is_active).length },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
