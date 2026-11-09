import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

async function forward(request: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }
  const { itemId } = await context.params;
  const body = await request.json();
  const upstreamResponse = await fetch(`${API_BASE_URL}/hr-admin/employee-shift-assignments/${itemId}/`, {
    method: request.method,
    headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await upstreamResponse.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstreamResponse.status });
}

export const PATCH = forward;
export const POST = forward;
