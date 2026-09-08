import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

export async function GET(request: NextRequest) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }
  const supportSessionRef = request.headers.get("X-HRMS-Support-Session-Ref") || request.nextUrl.searchParams.get("session_ref") || "";
  const upstream = await fetch(`${API_BASE_URL}/support/tenant-console/${request.nextUrl.search}`, {
    headers: {
      Authorization: `Token ${token}`,
      "X-HRMS-Support-Session-Ref": supportSessionRef,
    },
    cache: "no-store",
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
