import { NextRequest, NextResponse } from "next/server";

import { requireApiRoutePermission } from "@/lib/api-route-permissions";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

type RouteContext = {
  params: Promise<{ itemId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }
  const permission = await requireApiRoutePermission(request, "payroll.outputs.download");
  if (!permission.ok) return permission.response;
  const token = permission.token;

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
