import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

type RouteContext = {
  params: Promise<{
    employeeId: string;
  }>;
};

async function forward(request: NextRequest, context: RouteContext, method: "GET" | "POST") {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }

  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const { employeeId } = await context.params;
  const body = method === "POST" ? await request.json().catch(() => ({})) : undefined;
  const upstreamResponse = await fetch(`${API_BASE_URL}/hr-admin/employees/${employeeId}/bank-accounts/`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const payload = await upstreamResponse.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstreamResponse.status });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return forward(request, context, "GET");
}

export async function POST(request: NextRequest, context: RouteContext) {
  return forward(request, context, "POST");
}
