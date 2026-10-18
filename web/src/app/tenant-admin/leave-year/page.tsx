import Link from "next/link";

import { LeaveYearWorkbench } from "@/app/hr-admin/leave-year/leave-year-workbench";
import { PageIntro } from "@/components/patterns/page-intro";
import { getLeaveYearWorkspace, getTenantAdminLeaveYearOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

export default async function TenantAdminLeaveYearPage() {
  const user = await requireSessionPermission({ permissionKeys: ["leave.periods.view"], workspace: "tenant_admin", fallbackPath: "/tenant-admin" });
  const [workspace, options] = await Promise.all([getLeaveYearWorkspace("tenant-admin"), getTenantAdminLeaveYearOptions()]);
  return <main className="shell hr-admin-compact-ui"><PageIntro eyebrow="Tenant governance" title="Leave-year control" description="Review and administer tenant leave-year periods with the same auditable close controls used by HR." actions={<Link className="button button--secondary" href="/tenant-admin">Back to tenant workspace</Link>} pills={["Tenant scoped", "Permission controlled", "Historical safety"]} /><LeaveYearWorkbench portal="tenant-admin" periods={workspace.data.periods} runs={workspace.data.runs} classification={workspace.data.classification} options={options.data} canManage={sessionHasPermission(user, "leave.periods.manage")} canClose={sessionHasPermission(user, "leave.periods.close")} canReopen={sessionHasPermission(user, "leave.periods.reopen")} /></main>;
}
