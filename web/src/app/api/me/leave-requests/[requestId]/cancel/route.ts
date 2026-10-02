import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

export async function POST(request: NextRequest, context: { params: Promise<{ requestId: string }> }) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }
  const { requestId } = await context.params;
  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");
  const body = isMultipart ? await request.formData() : JSON.stringify(await request.json().catch(() => ({})));
  const upstreamResponse = await fetch(`${API_BASE_URL}/me/leave-requests/${requestId}/cancel/`, {
    method: "POST",
    headers: { ...(isMultipart ? {} : { "Content-Type": "application/json" }), Authorization: `Token ${token}` },
    body,
    cache: "no-store",
  });
  const payload = await upstreamResponse.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstreamResponse.status });
}
