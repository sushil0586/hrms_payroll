import { NextRequest, NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/runtime-flags";

function authHeaders(request: NextRequest) {
  const token = request.cookies.get("hrms_access_token")?.value;
  return token ? { Authorization: `Token ${token}` } : null;
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }
  const headers = authHeaders(request);
  if (!headers) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }
  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ detail: "Import batch finalization payload is required." }, { status: 400 });
  }
  const { itemId } = await context.params;
  const upstream = await fetch(`${API_BASE_URL}/hr-admin/import-batches/${itemId}/`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const responsePayload = await upstream.json().catch(() => ({}));
  return NextResponse.json(responsePayload, { status: upstream.status });
}
