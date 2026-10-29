import { NextRequest, NextResponse } from "next/server";

import { getEssRequestHistory } from "@/lib/api";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams;
  const type = input.get("type") === "attendance" ? "attendance" : "leave";
  const allowed = type === "leave"
    ? ["all", "pending", "partially_approved", "approved", "rejected", "withdrawn", "cancelled"]
    : ["all", "pending", "approved", "rejected"];
  const status = allowed.includes(input.get("status") || "") ? input.get("status")! : "all";
  const rawPage = Number(input.get("page") || "1");
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  if (!API_BASE_URL) {
    try {
      return NextResponse.json((await getEssRequestHistory({ type, status, page })).data);
    } catch {
      return NextResponse.json({ detail: "Request history is unavailable." }, { status: 503 });
    }
  }
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  const query = new URLSearchParams({ page: String(page), page_size: "10" });
  if (status !== "all") query.set("status", status);
  const resource = type === "leave" ? "leave-requests" : "attendance-regularizations";
  const upstream = await fetch(`${API_BASE_URL}/me/${resource}/?${query}`, { headers: { Authorization: `Token ${token}` }, cache: "no-store" });
  return NextResponse.json(await upstream.json().catch(() => ({})), { status: upstream.status });
}
