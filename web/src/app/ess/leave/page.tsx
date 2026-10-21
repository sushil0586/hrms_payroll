import { LeaveWorkspace } from "@/app/ess/leave/leave-workspace";
import { getEssLeaveWorkspace } from "@/lib/api";
import { normalizeLeaveHistoryFilters } from "@/lib/ui/leave-history-filters";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";

type SearchParamValue = string | string[] | undefined;
export default async function EssLeavePage({ searchParams }: { searchParams?: Promise<Record<string, SearchParamValue>> }) {
  const currentParams = (await searchParams) ?? {};
  const first = (value: SearchParamValue) => Array.isArray(value) ? value[0] : value;
  const requestedStatus = first(currentParams.status) ?? "all";
  const status = ["all", "pending", "partially_approved", "approved", "rejected", "withdrawn", "cancelled"].includes(requestedStatus) ? requestedStatus : "all";
  const rawPage = Number(first(currentParams.page));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const rawRequest = first(currentParams.requestId);
  const requestId = rawRequest && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawRequest) ? rawRequest : undefined;
  const { filters, errors } = normalizeLeaveHistoryFilters(currentParams);
  if (errors.length) return <main className="shell shell--workspace ess-experience-shell ess-compact"><WorkspaceStandardHeader title="Leave filters need attention" description="Correct the filters or return to your complete history." /><div className="notice notice--error" role="alert">{errors.join(" ")}</div><a className="button button--secondary" href="/ess/leave">Clear filters</a></main>;
  const result = await getEssLeaveWorkspace({ ...filters, status, page, requestId });
  return <LeaveWorkspace balances={result.dashboard.leave.balances} currentParams={{ ...currentParams, status }}
    linkedDetail={result.detail} isDemo={result.state !== "live"} leaveRequests={result.requests} leaveTypes={result.types} state={result.state} />;
}
