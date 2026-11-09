import { NextRequest, NextResponse } from "next/server";

import { ApiRequestError, getHrAdminEmployeeShiftAssignments } from "@/lib/api";

function positive(value: string | null, fallback: number, maximum: number) { const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), maximum) : fallback; }

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const pageSize = positive(query.get("page_size"), 10, 100);
  const requestedPage = positive(query.get("page"), 1, 100000);
  try {
    let result = await getHrAdminEmployeeShiftAssignments({ q: query.get("q") || "", kind: query.get("kind") || "all", primary: query.get("primary") || "all", risk: query.get("risk") || "all", page: requestedPage, page_size: pageSize }, { redirectUnauthorized: false });
    const totalPages = result.data.total_pages ?? Math.max(1, Math.ceil(result.data.total_count / pageSize));
    const safePage = Math.min(requestedPage, totalPages);
    if (safePage !== requestedPage) result = await getHrAdminEmployeeShiftAssignments({ q: query.get("q") || "", kind: query.get("kind") || "all", primary: query.get("primary") || "all", risk: query.get("risk") || "all", page: safePage, page_size: pageSize }, { redirectUnauthorized: false });
    return NextResponse.json({ ...result.data, page: safePage, page_size: pageSize, state: result.state === "live" ? "live" : "demo" });
  } catch (error) {
    if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
      return NextResponse.json({ detail: error.status === 401 ? "Not authenticated." : "You do not have permission to perform this action." }, { status: error.status });
    }
    return NextResponse.json({ detail: "Shift assignments could not be updated." }, { status: 503 });
  }
}
