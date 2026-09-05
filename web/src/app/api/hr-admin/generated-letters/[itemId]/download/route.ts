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
  const upstreamResponse = await fetch(`${API_BASE_URL}/hr-admin/generated-letters/${itemId}/download/`, {
    headers: { Authorization: `Token ${token}` },
    cache: "no-store",
  });
  if (!upstreamResponse.ok) {
    const payload = await upstreamResponse.json().catch(() => ({}));
    return NextResponse.json(payload, { status: upstreamResponse.status });
  }
  const headers = new Headers();
  const contentType = upstreamResponse.headers.get("content-type");
  const disposition = upstreamResponse.headers.get("content-disposition");
  if (contentType) headers.set("content-type", contentType);
  if (disposition) headers.set("content-disposition", disposition);
  return new NextResponse(upstreamResponse.body, { status: upstreamResponse.status, headers });
}
