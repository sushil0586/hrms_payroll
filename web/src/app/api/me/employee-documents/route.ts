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

  const formData = await request.formData();
  const upstreamResponse = await fetch(`${API_BASE_URL}/me/employee-documents/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Idempotency-Key": request.headers.get("idempotency-key") ?? "",
    },
    body: formData,
    cache: "no-store",
  });

  const payload = await upstreamResponse.json().catch(() => ({}));
  const result = NextResponse.json(payload, { status: upstreamResponse.status });
  const replayed = upstreamResponse.headers.get("idempotency-replayed");
  if (replayed) result.headers.set("Idempotency-Replayed", replayed);
  return result;
}
