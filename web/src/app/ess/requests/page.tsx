import { getEssRequestHistory } from "@/lib/api";
import type { AttendanceRegularizationItem, EssAttendanceRegularizationListResponse, EssLeaveRequestListResponse, LeaveRequestItem } from "@/lib/types";

import { RequestsWorkspace, type RequestQuery } from "./requests-workspace";

type Params = Record<string, string | string[] | undefined>;
type RequestData = (EssLeaveRequestListResponse | EssAttendanceRegularizationListResponse) & { items: (LeaveRequestItem | AttendanceRegularizationItem)[] };

export default async function RequestsPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const params = (await searchParams) ?? {};
  const first = (key: string) => Array.isArray(params[key]) ? params[key][0] : params[key];
  const type = first("type") === "attendance" ? "attendance" : "leave";
  const allowed = type === "leave" ? ["pending", "partially_approved", "approved", "rejected", "withdrawn", "cancelled"] : ["pending", "approved", "rejected"];
  const status = allowed.includes(first("status") || "") ? first("status")! : "all";
  const rawPage = Number(first("page") || 1);
  const query: RequestQuery = { type, status, page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1 };
  let result = await getEssRequestHistory(query);
  const last = Math.max(1, Math.ceil(result.data.total_count / result.data.page_size));
  if (query.page > last) { query.page = last; result = await getEssRequestHistory(query); }
  return <RequestsWorkspace initialData={result.data as RequestData} initialQuery={query} />;
}
