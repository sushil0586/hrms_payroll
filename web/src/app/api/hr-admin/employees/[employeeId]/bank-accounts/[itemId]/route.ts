import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

type RouteContext = {
  params: Promise<{
    employeeId: string;
    itemId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }

  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const { employeeId, itemId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const upstreamResponse = await fetch(`${API_BASE_URL}/hr-admin/employees/${employeeId}/bank-accounts/${itemId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await upstreamResponse.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstreamResponse.status });
}
