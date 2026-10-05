import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

export async function GET(request: NextRequest) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }

  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const upstreamUrl = new URL(`${API_BASE_URL}/hr-admin/employee-documents/`);
  request.nextUrl.searchParams.forEach((value, key) => upstreamUrl.searchParams.set(key, value));
  const upstreamResponse = await fetch(upstreamUrl, {
    headers: {
      Authorization: `Token ${token}`,
    },
    cache: "no-store",
  });

  const payload = await upstreamResponse.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstreamResponse.status });
}

export async function POST(request: NextRequest) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }

  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const formData = await request.formData();
  const upstreamResponse = await fetch(`${API_BASE_URL}/hr-admin/employee-documents/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
    },
    body: formData,
    cache: "no-store",
  });

  const payload = await upstreamResponse.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstreamResponse.status });
}
