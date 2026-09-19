import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeaveBalances } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportInsightsStrip } from "../report-insights-strip";
import { LeaveBalanceReportWorkspace } from "./leave-balance-report-workspace";

export default async function LeaveBalanceReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const result = await getHrAdminLeaveBalances();
  const items = result.data;
  const reservedCount = items.filter((item) => Number(item.reserved_amount) > 0).length;
  const overdrawnCount = items.filter((item) => Number(item.closing_balance) - Number(item.reserved_amount) < 0).length;

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

      <ReportInsightsStrip
        current="time"
        eyebrow="Leave report"
        title="Leave balance evidence"
        description="Review entitlement, accrual, consumption, reserved units, encashment, adjustments, and liability risk."
        metrics={[
          { label: "balances", value: items.length, tone: "neutral" },
          { label: "reserved", value: reservedCount, tone: reservedCount ? "warning" : "ready" },
          { label: "overdrawn", value: overdrawnCount, tone: overdrawnCount ? "blocked" : "ready" },
          { label: "source", value: result.state === "live" ? "Live" : "Demo", tone: result.state === "live" ? "ready" : "warning" },
        ]}
      />

      <LeaveBalanceReportWorkspace items={items} />
    </main>
  );
}
