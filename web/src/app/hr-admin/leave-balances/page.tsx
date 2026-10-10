import Link from "next/link";

import { LeaveBalanceOperations } from "@/app/hr-admin/leave-balances/leave-balance-operations";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeaveBalances, getHrAdminLeaveBalanceTransactions, getHrAdminPolicyWorkbenchOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function numberParam(value: SearchParamValue, fallback: number) {
  const parsed = Number(normalizeParam(value));
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export default async function HrAdminLeaveBalancesPage({ searchParams }: PageProps) {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["leave.view"], fallbackPath: "/hr-admin" });
  const canManageBalances = sessionHasPermission(sessionUser, "leave.balances.manage");
  const currentParams = (await searchParams) ?? {};
  const q = normalizeParam(currentParams.q) ?? "";
  const employeeId = normalizeParam(currentParams.employee_id) ?? "";
  const leavePolicyId = normalizeParam(currentParams.leave_policy_id) ?? "";
  const transactionStatus = normalizeParam(currentParams.transaction_status) ?? "";
  const balancePage = numberParam(currentParams.balance_page, 1);
  const transactionPage = numberParam(currentParams.transaction_page, 1);
  const pageSize = Math.min(numberParam(currentParams.page_size, 12), 50);
  const [balancesResult, transactionsResult, optionsResult] = await Promise.all([
    getHrAdminLeaveBalances({
      q: q || undefined,
      employee_id: employeeId || undefined,
      leave_policy_id: leavePolicyId || undefined,
      page: balancePage,
      page_size: pageSize,
    }),
    getHrAdminLeaveBalanceTransactions({
      q: q || undefined,
      employee_id: employeeId || undefined,
      leave_policy_id: leavePolicyId || undefined,
      status: transactionStatus || undefined,
      page: transactionPage,
      page_size: pageSize,
    }),
    getHrAdminPolicyWorkbenchOptions({ include: ["leave_policies"] }),
  ]);
  const encashedTotal = balancesResult.data.items.reduce((sum, item) => sum + Number(item.encashed_amount), 0);
  const adjustmentsTotal = balancesResult.data.items.reduce((sum, item) => sum + Number(item.adjustment_amount), 0);
  const pendingReviewsCount = transactionsResult.data.items.filter((item) => item.status === "pending").length;

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui">
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
        primaryMetricValue={balancesResult.data.total_count}
        secondaryMetricLabel="pending reviews"
        secondaryMetricValue={pendingReviewsCount}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Tracked balances" value={balancesResult.data.total_count} trend="Matching employee-policy rows" />
          <MetricTile label="Encashed units" value={encashedTotal.toFixed(2)} trend="Current page total" />
          <MetricTile label="Net adjustments" value={adjustmentsTotal.toFixed(2)} trend="Current page total" />
          <MetricTile label="Pending reviews" value={pendingReviewsCount} trend="Current transaction page" />
        </div>
      </section>

      <LeaveBalanceOperations
        balancesPage={balancesResult.data}
        options={optionsResult.data}
        canManageBalances={canManageBalances}
        initialFilters={{
          balancePage,
          employeeId,
          pageSize,
          policyId: leavePolicyId,
          query: q,
          transactionPage,
          transactionStatus,
        }}
        transactionsPage={transactionsResult.data}
      />
    </main>
  );
}
