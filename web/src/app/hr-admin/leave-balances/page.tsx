import Link from "next/link";
import { redirect } from "next/navigation";
import { attendanceQueueHref } from "../attendance-records/filter-contract";

import { LeaveBalanceOperations } from "@/app/hr-admin/leave-balances/leave-balance-operations";
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
  const safeBalancePage = Math.min(balancePage, balancesResult.data.total_pages ?? Math.max(1, Math.ceil(balancesResult.data.total_count / pageSize)));
  const safeTransactionPage = Math.min(transactionPage, transactionsResult.data.total_pages ?? Math.max(1, Math.ceil(transactionsResult.data.total_count / pageSize)));
  if (safeBalancePage !== balancePage || safeTransactionPage !== transactionPage) redirect(attendanceQueueHref("/hr-admin/leave-balances", {q,employee_id:employeeId,leave_policy_id:leavePolicyId,transaction_status:transactionStatus,page_size:pageSize,balance_page:safeBalancePage,transaction_page:safeTransactionPage}));
  const pendingReviewsCount = transactionsResult.data.items.filter((item) => item.status === "pending").length;

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui accerio-page">
      <PageIntro appearance="accerio"
        eyebrow={balancesResult.state === "live" ? "Live leave balance mode" : "Demo leave balance mode"}
        title="Leave balances"
        description="Inspect balances, run controlled adjustments, and process encashment from one operator surface."
        actions={
          <Link className="button button--secondary" href="/hr-admin/leave-requests">Leave requests</Link>
        }
      />

      <details className="workspace-context-disclosure"><summary>Leave navigation and summary</summary><TimeLeaveOperationsStrip
        current="balances"
        title="Leave balance ledger"
        description="Inspect employee-policy balances, controlled adjustments, encashment, and maker-checker review pressure."
        primaryMetricLabel="balances"
        primaryMetricValue={balancesResult.data.total_count}
        secondaryMetricLabel="pending reviews on this transaction page"
        secondaryMetricValue={pendingReviewsCount}
      /></details>

      <LeaveBalanceOperations
        balancesPage={balancesResult.data}
        options={optionsResult.data}
        canManageBalances={canManageBalances}
        initialFilters={{
          selectedBalanceId: normalizeParam(currentParams.selectedBalance) ?? "",
          selectedTransactionId: normalizeParam(currentParams.selectedTransaction) ?? "",
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
