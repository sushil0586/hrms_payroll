import { NextRequest, NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/runtime-flags";

export async function GET(request: NextRequest) {
  if (!API_BASE_URL) return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  const upstream = await fetch(`${API_BASE_URL}/tenant-admin/data-governance/`, {
    headers: { Authorization: `Token ${token}` }, cache: "no-store",
  });
  return NextResponse.json(await upstream.json().catch(() => ({})), { status: upstream.status });
}
