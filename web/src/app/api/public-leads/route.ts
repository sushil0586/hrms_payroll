import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

export async function POST(request: NextRequest) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "Lead intake is not configured." }, { status: 500 });
  }

  const payload = await request.json().catch(() => ({}));
  const upstream = await fetch(`${API_BASE_URL}/platform/public-leads/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": request.headers.get("user-agent") || "",
      "X-Forwarded-For": request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const result = await upstream.json().catch(() => ({}));
  return NextResponse.json(result, { status: upstream.status });
}
