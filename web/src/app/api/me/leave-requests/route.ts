import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

export async function POST(request: NextRequest) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }
  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");
  const body = isMultipart ? await request.formData() : JSON.stringify(await request.json().catch(() => ({})));
  const upstream = await fetch(`${API_BASE_URL}/me/leave-requests/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      ...(isMultipart ? {} : { "Content-Type": "application/json" }),
      "X-Request-ID": request.headers.get("x-request-id") ?? "",
    },
    body,
    cache: "no-store",
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
