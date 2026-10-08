import { NextRequest, NextResponse } from "next/server";

import { requireApiRoutePermission } from "@/lib/api-route-permissions";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

export async function POST(request: NextRequest) {
  if (!API_BASE_URL) return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  const permission = await requireApiRoutePermission(request, "notifications.manage");
  if (!permission.ok) return permission.response;
  const body = await request.json();
  const upstream = await fetch(`${API_BASE_URL}/hr-admin/notifications/bulk-retry/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Token ${permission.token}` },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
