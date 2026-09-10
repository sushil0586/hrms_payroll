import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

type RouteContext = {
  params: Promise<{ itemId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const { itemId } = await context.params;
  const upstreamResponse = await fetch(`${API_BASE_URL}/hr-admin/payroll-output-artifacts/${itemId}/access-audit-export/`, {
    headers: { Authorization: `Token ${token}` },
    cache: "no-store",
  });

  const headers = new Headers();
  [
    "content-type",
    "content-disposition",
    "x-payroll-artifact-checksum",
    "x-payroll-access-audit-row-count",
  ].forEach((key) => {
    const value = upstreamResponse.headers.get(key);
    if (value) headers.set(key, value);
  });

  if (!upstreamResponse.ok) {
    const payload = await upstreamResponse.json().catch(() => ({}));
    return NextResponse.json(payload, { status: upstreamResponse.status, headers });
  }

  return new NextResponse(await upstreamResponse.arrayBuffer(), {
    status: upstreamResponse.status,
    headers,
  });
}
