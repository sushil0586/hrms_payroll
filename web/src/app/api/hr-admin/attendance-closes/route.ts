import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/runtime-flags";

async function forward(request: NextRequest) {
  if (!API_BASE_URL) return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  const body = request.method === "GET" ? undefined : await request.text();
  const upstream = await fetch(`${API_BASE_URL}/hr-admin/attendance-closes/${request.nextUrl.search}`, {
    method: request.method, headers: { Authorization: `Token ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body, cache: "no-store",
  });
  return NextResponse.json(await upstream.json().catch(() => ({})), { status: upstream.status });
}
export const GET = forward;
export const POST = forward;
