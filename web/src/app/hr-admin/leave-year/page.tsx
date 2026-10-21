
import { LeaveYearWorkbench } from "./leave-year-workbench";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPolicyWorkbenchOptions, getLeaveYearWorkspace } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

export default async function HrAdminLeaveYearPage() {
  const user = await requireSessionPermission({ permissionKeys: ["leave.periods.view"], fallbackPath: "/hr-admin/leave-policies" });
  const [workspace, options] = await Promise.all([getLeaveYearWorkspace("hr-admin"), getHrAdminPolicyWorkbenchOptions({ include: ["leave_policies", "legal_entities"] })]);
  return <main className="shell shell--time-leave hr-admin-compact-ui accerio-page"><PageIntro appearance="accerio" eyebrow="Governed leave calendar" title="Leave-year control" description="Configure effective leave-year boundaries, preview rollover impact, and monitor durable year-close execution." actions={<a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/leave-policies">Back to leave policies</a>} /><LeaveYearWorkbench portal="hr-admin" periods={workspace.data.periods} runs={workspace.data.runs} classification={workspace.data.classification} options={options.data} canManage={sessionHasPermission(user, "leave.periods.manage")} canClose={sessionHasPermission(user, "leave.periods.close")} canReopen={sessionHasPermission(user, "leave.periods.reopen")} /></main>;
}
