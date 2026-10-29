import { NextRequest, NextResponse } from "next/server";

import { getEssAttendanceMonth } from "@/lib/api";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

export async function GET(request: NextRequest) {
  if (!API_BASE_URL) {
    try {
      const page = Number(request.nextUrl.searchParams.get("page") || "1");
      const pageSize = Number(request.nextUrl.searchParams.get("page_size") || "10");
      const result = await getEssAttendanceMonth({
        month: request.nextUrl.searchParams.get("month") || "",
        page: Number.isSafeInteger(page) && page > 0 ? page : 1,
        page_size: [5, 10, 20, 31].includes(pageSize) ? pageSize : 10,
      });
      return NextResponse.json(result.data);
    } catch {
      return NextResponse.json({ detail: "Attendance records are unavailable." }, { status: 503 });
    }
  }
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }
  const query = new URLSearchParams();
  for (const key of ["month", "page", "page_size"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value !== null) query.set(key, value);
  }
  const upstream = await fetch(`${API_BASE_URL}/me/attendance-records/${query.size ? `?${query}` : ""}`, {
    headers: { Authorization: `Token ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
