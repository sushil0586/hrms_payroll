import { NextRequest, NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/runtime-flags";

function authHeaders(request: NextRequest) {
  const token = request.cookies.get("hrms_access_token")?.value;
  return token ? { Authorization: `Token ${token}` } : null;
}

export async function GET(request: NextRequest) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }

  const headers = authHeaders(request);
  if (!headers) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const upstream = await fetch(`${API_BASE_URL}/hr-admin/import-batches/?${request.nextUrl.searchParams.toString()}`, {
    headers,
    cache: "no-store",
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}

export async function POST(request: NextRequest) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }

  const headers = authHeaders(request);
  if (!headers) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const upstream = await fetch(`${API_BASE_URL}/hr-admin/import-batches/`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(await request.json()),
    cache: "no-store",
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
