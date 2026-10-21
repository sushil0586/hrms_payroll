import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { ShiftsWorkbench } from "@/app/hr-admin/shifts/shifts-workbench";
import { getHrAdminShifts } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";

export default async function HrAdminShiftsPage() {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["attendance.view", "attendance.policies.manage"], fallbackPath: "/hr-admin/attendance-operations" });
  const canManagePolicies = sessionHasPermission(sessionUser, "attendance.policies.manage");
  const result = await getHrAdminShifts();

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui accerio-page">
      <PageIntro appearance="accerio"
        eyebrow={result.state === "live" ? "Live shift mode" : "Demo shift mode"}
        title="Shifts"
        description="Configure the attendance windows, grace rules, and weekly-off patterns that operational attendance depends on."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/attendance-operations">Back to attendance operations</Link>
          </>
        }
        pills={["Time-window setup", "Weekly-off patterns", "Attendance-ready shift logic"]}
      />

      <details className="workspace-context-disclosure"><summary>Attendance navigation and summary</summary><TimeLeaveOperationsStrip
        current="shifts"
        title="Shift master configuration"
        description="Define working-time windows, weekly-off patterns, grace rules, and night-shift behavior before assigning employees."
        primaryMetricLabel="shifts"
        primaryMetricValue={result.data.length}
        secondaryMetricLabel="active"
        secondaryMetricValue={result.data.filter((item) => item.is_active).length}
      /></details>

      <ShiftsWorkbench canManagePolicies={canManagePolicies} items={result.data} state={result.state} />
    </main>
  );
}
