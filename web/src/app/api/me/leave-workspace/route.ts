import { NextRequest, NextResponse } from "next/server";

import { getEssLeaveWorkspace } from "@/lib/api";
import { normalizeLeaveHistoryFilters } from "@/lib/ui/leave-history-filters";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;
const STATUSES = new Set(["all", "pending", "partially_approved", "approved", "rejected", "withdrawn", "cancelled"]);

export async function GET(request: NextRequest) {
  if (API_BASE_URL && !request.cookies.get("hrms_access_token")?.value) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const { filters, errors } = normalizeLeaveHistoryFilters(params);
  if (errors.length) return NextResponse.json({ detail: errors.join(" ") }, { status: 400 });
  const requestedPage = Number(request.nextUrl.searchParams.get("page") || "1");
  const statusValue = request.nextUrl.searchParams.get("status") || "all";
  const rawRequestId = request.nextUrl.searchParams.get("requestId") || "";
  const requestId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawRequestId)
    ? rawRequestId
    : undefined;

  try {
    const result = await getEssLeaveWorkspace({
      ...filters,
      status: STATUSES.has(statusValue) ? statusValue : "all",
      page: Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
      requestId,
    });
    return NextResponse.json({
      balances: result.dashboard.leave.balances,
      detail: result.detail,
      requests: result.requests,
      state: result.state,
      types: result.types,
    });
  } catch {
    return NextResponse.json({ detail: "Leave workspace is unavailable." }, { status: 503 });
  }
}
