import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getFinancialCalendarWorkspace } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

import { FinancialCalendarWorkbench } from "./financial-calendar-workbench";

export default async function FinancialCalendarsPage() {
  const user = await requireSessionPermission({
    permissionKeys: ["tenant.settings.view", "tenant.settings.manage", "finance.periods.close", "finance.periods.reopen"],
    workspace: "tenant_admin",
    fallbackPath: "/tenant-admin",
  });
  const workspace = await getFinancialCalendarWorkspace();
  return (
    <main className="shell hr-admin-compact-ui">
      <PageIntro
        eyebrow="Finance governance"
        title="Financial years and periods"
        description="Configure explicit fiscal boundaries and control posting-period lifecycle with audited transitions."
        actions={<Link className="button button--secondary" href="/tenant-admin">Back to tenant workspace</Link>}
        pills={["Explicit dates", "Tenant scoped", "Audited close"]}
      />
      <FinancialCalendarWorkbench
        initialData={workspace.data}
        canManage={sessionHasPermission(user, "tenant.settings.manage")}
        canClose={sessionHasPermission(user, "finance.periods.close")}
        canReopen={sessionHasPermission(user, "finance.periods.reopen")}
      />
    </main>
  );
}
