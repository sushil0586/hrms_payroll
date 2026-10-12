import Link from "next/link";

import { AttendancePolicyAssignmentGovernancePanel } from "@/app/hr-admin/attendance-policy-assignments/attendance-policy-assignment-governance-panel";
import { AttendancePolicyAssignmentsWorkbench } from "@/app/hr-admin/attendance-policy-assignments/attendance-policy-assignments-workbench";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendancePolicyAssignments, getHrAdminPolicyWorkbenchOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";

export default async function HrAdminAttendancePolicyAssignmentsPage() {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["attendance.view", "attendance.policies.manage"], fallbackPath: "/hr-admin/policy-assignments" });
  const canManagePolicies = sessionHasPermission(sessionUser, "attendance.policies.manage");
  const [result, optionsResult] = await Promise.all([
    getHrAdminAttendancePolicyAssignments(),
    getHrAdminPolicyWorkbenchOptions({
      include: ["attendance_policies", "legal_entities", "branches", "locations", "departments", "grades", "employment_types"],
    }),
  ]);
  const activeCount = result.data.filter((item) => item.is_active).length;

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui">
      <PageIntro
        eyebrow={result.state === "live" ? "Live attendance assignment mode" : "Demo attendance assignment mode"}
        title="Attendance assignments"
        description="Map attendance behavior to the branches, locations, departments, employment types, or employees that should inherit it."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/policy-assignments">
              Back to policy assignments
            </Link>
          </>
        }
        pills={["Priority-driven precedence", "Scope-aware rollout", "Employee override support"]}
      />

      <TimeLeaveOperationsStrip
        current="assignments"
        title="Attendance assignment governance"
        description="Map attendance policy behavior to tenant scopes and keep overlap, priority, and employee override review visible."
        primaryMetricLabel="assignments"
        primaryMetricValue={result.data.length}
        secondaryMetricLabel="active"
        secondaryMetricValue={activeCount}
      />

      <AttendancePolicyAssignmentsWorkbench
        canManagePolicies={canManagePolicies}
        items={result.data}
        options={optionsResult.data}
        state={result.state === "live" && optionsResult.state === "live" ? "live" : "demo"}
      />

      {canManagePolicies ? (
        <AttendancePolicyAssignmentGovernancePanel />
      ) : (
        <section className="section"><div className="notice"><strong>Read-only attendance assignment view.</strong><span className="muted">Resolution previews and assignment edits require attendance policy management permission.</span></div></section>
      )}
    </main>
  );
}
