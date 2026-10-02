import { LeaveWorkspace } from "@/app/ess/leave/leave-workspace";
import { getEssDashboard, getEssRequestOptions } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EssLeavePage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const status = normalizeParam(currentParams.status) ?? "all";
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const [{ dashboard, leaveRequests, state }, requestOptions] = await Promise.all([
    getEssDashboard({ leave_status: status, leave_page: page }),
    getEssRequestOptions(),
  ]);
  const workspaceState = state === "live" ? "live" : "demo";

  return (
    <LeaveWorkspace
      balances={dashboard.leave.balances}
      currentParams={currentParams}
      isDemo={workspaceState === "demo" || requestOptions.state === "demo"}
      leaveRequests={leaveRequests}
      leaveTypes={requestOptions.leaveTypes}
      state={workspaceState}
    />
  );
}
