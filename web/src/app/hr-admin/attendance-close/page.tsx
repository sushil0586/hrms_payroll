import Link from "next/link";
import { PageIntro } from "@/components/patterns/page-intro";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { AttendanceCloseWorkbench } from "./attendance-close-workbench";

export default async function AttendanceClosePage() {
  const user = await requireSessionPermission({ permissionKeys: ["attendance.view"], fallbackPath: "/hr-admin/attendance-records" });
  return <main className="shell shell--time-leave hr-admin-compact-ui accerio-page">
    <PageIntro appearance="accerio" eyebrow="Governed payroll input" title="Monthly attendance close" description="Reconcile attendance evidence, resolve blockers, close the period, and retain versioned correction history." actions={<Link className="button button--secondary" href="/hr-admin/attendance-records">Attendance records</Link>} pills={["Immutable evidence", "Scoped row locks", "Audited reopen"]} />
    <AttendanceCloseWorkbench canManage={sessionHasPermission(user, "attendance.close.manage")} canApprove={sessionHasPermission(user, "attendance.close.approve")} />
  </main>;
}
