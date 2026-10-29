import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { ShiftsWorkspace } from "@/app/hr-admin/shifts/shifts-workspace";
import { getHrAdminShifts } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";

type SearchParamValue = string | string[] | undefined;
export default async function HrAdminShiftsPage({ searchParams }: { searchParams?: Promise<Record<string, SearchParamValue>> }) {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["attendance.view", "attendance.policies.manage"], fallbackPath: "/hr-admin/attendance-operations" });
  const canManagePolicies = sessionHasPermission(sessionUser, "attendance.policies.manage");
  const result = await getHrAdminShifts();
  const params = (await searchParams) ?? {};
  const value = (key: string) => Array.isArray(params[key]) ? params[key]?.[0] ?? "" : params[key] ?? "";
  const editId = value("editShift");
  const initialModal = editId ? { mode: "edit" as const, id: editId } : value("shiftModal") === "create" ? { mode: "create" as const, id: "" } : { mode: "" as const, id: "" };

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

      <ShiftsWorkspace canManagePolicies={canManagePolicies} initialData={{ items: result.data, state: result.state === "live" ? "live" : "demo" }} initialModal={initialModal} />
    </main>
  );
}
