import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

type Props = { params: Promise<{ itemId: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }
  const { itemId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ detail: "A valid JSON request body is required." }, { status: 400 });
  }
  const upstream = await fetch(`${API_BASE_URL}/manager/notifications/${itemId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
    body: JSON.stringify(body),
    cache: "no-store",
  }).catch(() => null);
  if (!upstream) return NextResponse.json({ detail: "Notification service is unavailable." }, { status: 502 });
  const payload = await upstream.json().catch(() => null);
  if (payload === null) return NextResponse.json({ detail: "Notification service returned an unreadable response." }, { status: 502 });
  return NextResponse.json(payload, { status: upstream.status });
}
