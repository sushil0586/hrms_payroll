import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeaveBalances } from "@/lib/api";

import { LeaveBalanceReportWorkspace } from "./leave-balance-report-workspace";

export default async function LeaveBalanceReportPage() {
  const result = await getHrAdminLeaveBalances();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live attendance report" : "Demo attendance report"}
        title="Leave Balance Report"
        description="Leave entitlement, accrual, consumption, reserved units, encashment, adjustments, and liability risk."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/leave-policies">
              Leave policies
            </Link>
            <Link className="button button--primary" href="/hr-admin/leave-balances">
              Balance operations
            </Link>
          </>
        }
        pills={["Balances", "Liability", "Encashment"]}
        showPills
      />

      <LeaveBalanceReportWorkspace items={result.data} />
    </main>
  );
}
