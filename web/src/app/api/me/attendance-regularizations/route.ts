import { NextRequest, NextResponse } from "next/server";

import { getEssRegularizations } from "@/lib/api";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

export async function GET(request: NextRequest) {
  if (!API_BASE_URL) {
    try {
      const page = Number(request.nextUrl.searchParams.get("page") || "1");
      const pageSize = Number(request.nextUrl.searchParams.get("page_size") || "5");
      const status = request.nextUrl.searchParams.get("status") || "all";
      const result = await getEssRegularizations({
        status: ["all", "pending", "approved", "rejected"].includes(status) ? status : "all",
        page: Number.isSafeInteger(page) && page > 0 ? page : 1,
        page_size: [5, 10, 25].includes(pageSize) ? pageSize : 5,
      });
      return NextResponse.json(result.data);
    } catch {
      return NextResponse.json({ detail: "Attendance regularizations are unavailable." }, { status: 503 });
    }
  }
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  const query = new URLSearchParams();
  for (const key of ["status", "page", "page_size"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value !== null) query.set(key, value);
  }
  const upstream = await fetch(`${API_BASE_URL}/me/attendance-regularizations/${query.size ? `?${query}` : ""}`, {
    headers: { Authorization: `Token ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15_000),
  });
  return NextResponse.json(await upstream.json().catch(() => ({})), { status: upstream.status });
}

export async function POST(request: NextRequest) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const upstream = await fetch(`${API_BASE_URL}/me/attendance-regularizations/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      "X-Request-ID": request.headers.get("x-request-id") ?? "",
      "Idempotency-Key": request.headers.get("idempotency-key") ?? "",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
