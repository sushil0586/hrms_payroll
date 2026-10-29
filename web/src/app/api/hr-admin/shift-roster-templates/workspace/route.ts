import { NextRequest, NextResponse } from "next/server";

import { getHrAdminShiftRosterTemplates } from "@/lib/api";

function positive(value: string | null, fallback: number, maximum: number) { const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), maximum) : fallback; }

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const pageSize = positive(query.get("page_size"), 10, 100);
  const requestedPage = positive(query.get("page"), 1, 100000);
  try {
    const filters = { q: query.get("q") || "", status: query.get("status") || "all", kind: query.get("kind") || "all", pattern: query.get("pattern") || "all", page: requestedPage, page_size: pageSize };
    let result = await getHrAdminShiftRosterTemplates(filters);
    const totalPages = result.data.total_pages ?? Math.max(1, Math.ceil(result.data.total_count / pageSize));
    const safePage = Math.min(requestedPage, totalPages);
    if (safePage !== requestedPage) result = await getHrAdminShiftRosterTemplates({ ...filters, page: safePage });
    return NextResponse.json({ ...result.data, page: safePage, page_size: pageSize, state: result.state === "live" ? "live" : "demo" });
  } catch { return NextResponse.json({ detail: "Roster templates could not be updated." }, { status: 503 }); }
}
