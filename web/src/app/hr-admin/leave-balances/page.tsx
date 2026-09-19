import Link from "next/link";

import { LeaveBalanceOperations } from "@/app/hr-admin/leave-balances/leave-balance-operations";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeaveBalances, getHrAdminLeaveBalanceTransactions, getHrAdminPolicyOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";

export default async function HrAdminLeaveBalancesPage() {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["leave.view"], fallbackPath: "/hr-admin" });
  const canManageBalances = sessionHasPermission(sessionUser, "leave.balances.manage");
  const [balancesResult, transactionsResult, optionsResult] = await Promise.all([
    getHrAdminLeaveBalances(),
    getHrAdminLeaveBalanceTransactions(),
    getHrAdminPolicyOptions(),
  ]);
  const encashedTotal = balancesResult.data.reduce((sum, item) => sum + Number(item.encashed_amount), 0);
  const adjustmentsTotal = balancesResult.data.reduce((sum, item) => sum + Number(item.adjustment_amount), 0);
  const pendingReviewsCount = transactionsResult.data.filter((item) => item.status === "pending").length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={balancesResult.state === "live" ? "Live leave balance mode" : "Demo leave balance mode"}
        title="Leave balances"
        description="Inspect balances, run controlled adjustments, and process encashment from one operator surface."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/leave-policies">
              Leave policies
            </Link>
            <Link className="button button--secondary" href="/hr-admin/policies">
              Back to policies
            </Link>
          </>
        }
      />

      <TimeLeaveOperationsStrip
        current="balances"
        title="Leave balance ledger"
        description="Inspect employee-policy balances, controlled adjustments, encashment, and maker-checker review pressure."
        primaryMetricLabel="balances"
        primaryMetricValue={balancesResult.data.length}
        secondaryMetricLabel="pending reviews"
        secondaryMetricValue={pendingReviewsCount}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Tracked balances" value={balancesResult.data.length} trend="Employee-policy rows" />
          <MetricTile label="Encashed units" value={encashedTotal.toFixed(2)} trend="Recorded year-to-date" />
          <MetricTile label="Net adjustments" value={adjustmentsTotal.toFixed(2)} trend="Manual operator actions" />
          <MetricTile label="Pending reviews" value={pendingReviewsCount} trend="Awaiting maker-checker approval" />
        </div>
      </section>

      <LeaveBalanceOperations
        initialBalances={balancesResult.data}
        initialTransactions={transactionsResult.data}
        options={optionsResult.data}
        canManageBalances={canManageBalances}
      />
    </main>
  );
}
