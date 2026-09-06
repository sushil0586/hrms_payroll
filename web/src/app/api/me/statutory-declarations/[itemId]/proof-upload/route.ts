import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

type Props = { params: Promise<{ itemId: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }

  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const { itemId } = await params;
  const formData = await request.formData();
  const upstream = await fetch(`${API_BASE_URL}/me/statutory-declarations/${itemId}/proof-upload/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "X-Request-ID": request.headers.get("x-request-id") ?? "",
    },
    body: formData,
    cache: "no-store",
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
