import { NextRequest, NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/runtime-flags";

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!API_BASE_URL) return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  const { path } = await context.params;
  const target = `${API_BASE_URL}/hr-admin/leave-year/${path.join("/")}/${request.nextUrl.search}`;
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.text();
  const upstream = await fetch(target, {
    method: request.method,
    headers: { Authorization: `Token ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body,
    cache: "no-store",
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
