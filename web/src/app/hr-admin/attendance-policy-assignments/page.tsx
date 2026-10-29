import Link from "next/link";

import { AttendancePolicyAssignmentGovernancePanel } from "@/app/hr-admin/attendance-policy-assignments/attendance-policy-assignment-governance-panel";
import { AttendancePolicyAssignmentsWorkspace } from "@/app/hr-admin/attendance-policy-assignments/attendance-policy-assignments-workspace";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendancePolicyAssignments, getHrAdminPolicyWorkbenchOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";

export default async function HrAdminAttendancePolicyAssignmentsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["attendance.view", "attendance.policies.manage"], fallbackPath: "/hr-admin/policy-assignments" });
  const canManagePolicies = !sessionUser || sessionHasPermission(sessionUser, "attendance.policies.manage");
  const [result, optionsResult] = await Promise.all([
    getHrAdminAttendancePolicyAssignments(),
    getHrAdminPolicyWorkbenchOptions({
      include: ["attendance_policies", "legal_entities", "branches", "locations", "departments", "grades", "employment_types"],
    }),
  ]);
  const activeCount = result.data.filter((item) => item.is_active).length;

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui accerio-page">
      <PageIntro appearance="accerio"
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

      <details className="workspace-context-disclosure"><summary>Attendance navigation and summary</summary><TimeLeaveOperationsStrip
        current="assignments"
        title="Attendance assignment governance"
        description="Map attendance policy behavior to tenant scopes and keep overlap, priority, and employee override review visible."
        primaryMetricLabel="assignments"
        primaryMetricValue={result.data.length}
        secondaryMetricLabel="active"
        secondaryMetricValue={activeCount}
      /></details>

      <AttendancePolicyAssignmentsWorkspace
        canManagePolicies={canManagePolicies}
        initialData={{ items: result.data, state: result.state === "live" ? "live" : "demo" }}
        options={optionsResult.data}
        initialModal={await (async () => { const params = (await searchParams) ?? {}; const first = (key: string) => Array.isArray(params[key]) ? params[key][0] : params[key]; const id = first("editAssignment") || ""; return id ? { mode: "edit" as const, id } : first("assignmentModal") === "create" ? { mode: "create" as const, id: "" } : { mode: "" as const, id: "" }; })()}
      />

      {canManagePolicies ? (
        <AttendancePolicyAssignmentGovernancePanel />
      ) : (
        <section className="section"><div className="notice"><strong>Read-only attendance assignment view.</strong><span className="muted">Resolution previews and assignment edits require attendance policy management permission.</span></div></section>
      )}
    </main>
  );
}
