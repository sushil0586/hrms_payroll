
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeaveBalances } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { completeReport } from "@/lib/complete-report";
import { LeaveBalanceReportWorkspace } from "./leave-balance-report-workspace";

export default async function LeaveBalanceReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const result = await completeReport(getHrAdminLeaveBalances);
  const items = result.data.items;
  return (
    <main className="shell hr-admin-compact-ui accerio-page">
      <PageIntro
        appearance="accerio"
        eyebrow={result.state === "live" ? "Live leave report" : "Demo leave report"}
        title="Leave Balance Report"
        description="Leave entitlement, accrual, consumption, reserved units, encashment, adjustments, and factual balance states."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/reports">
              Reports
            </a>
            <a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/leave-policies">
              Leave policies
            </a>
            <a data-navigation-mode="document" className="button button--primary" href="/hr-admin/leave-balances">
              Balance operations
            </a>
          </>
        }
      />

      <LeaveBalanceReportWorkspace items={items} />
    </main>
  );
}
