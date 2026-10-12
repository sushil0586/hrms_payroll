import Link from "next/link";

import { AttendancePoliciesWorkbench } from "@/app/hr-admin/attendance-policies/attendance-policies-workbench";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendancePolicies, getHrAdminPolicyOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";

export default async function HrAdminAttendancePoliciesPage() {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["attendance.view", "attendance.policies.manage"], fallbackPath: "/hr-admin" });
  const canManagePolicies = sessionHasPermission(sessionUser, "attendance.policies.manage");
  const [result, optionsResult] = await Promise.all([getHrAdminAttendancePolicies(), getHrAdminPolicyOptions()]);
  const activeCount = result.data.filter((item) => item.status === "active").length;

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui">
      <PageIntro
        eyebrow={result.state === "live" ? "Live attendance policy mode" : "Demo attendance policy mode"}
        title="Attendance policies"
        description="Set time rules, thresholds, and check-in behavior that drive attendance treatment."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/policies">
              Back to policies
            </Link>
          </>
        }
        pills={["Threshold-based attendance rules", "Shift and holiday linkage", "Regularization-aware behavior"]}
      />

      <TimeLeaveOperationsStrip
        current="policies"
        title="Attendance policy configuration"
        description="Configure late marks, shift linkage, holiday behavior, and attendance interpretation before assigning policy scope."
        primaryMetricLabel="policies"
        primaryMetricValue={result.data.length}
        secondaryMetricLabel="active"
        secondaryMetricValue={activeCount}
      />

      <AttendancePoliciesWorkbench
        canManagePolicies={canManagePolicies}
        items={result.data}
        options={optionsResult.data}
        state={result.state === "live" && optionsResult.state === "live" ? "live" : "demo"}
      />
    </main>
  );
}
