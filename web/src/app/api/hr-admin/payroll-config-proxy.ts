import { type NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

type ProxyOptions = {
  request: NextRequest;
  upstreamPath: string;
  upstreamSearch?: string;
  method: "GET" | "POST" | "PATCH";
};

export async function proxyHrAdminPayrollConfigRequest({ request, upstreamPath, upstreamSearch = "", method }: ProxyOptions) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }

  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const body = method === "GET" ? undefined : contentType.includes("application/json") ? await request.json().catch(() => ({})) : {};
  const upstreamResponse = await fetch(`${API_BASE_URL}${upstreamPath}${upstreamSearch}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await upstreamResponse.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstreamResponse.status });
}
