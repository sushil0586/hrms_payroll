import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

type Props = { params: Promise<{ path?: string[] }> };

function buildTarget(path: string[] = []) {
  const suffix = path.length ? `${path.join("/")}/` : "";
  return `${API_BASE_URL}/platform-policy-packs/${suffix}`;
}

async function proxyPolicyPackRequest(request: NextRequest, path: string[] | undefined, method: "GET" | "POST") {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }

  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const target = new URL(buildTarget(path));
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));
  const upstream = await fetch(target, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
    body: method === "GET" ? undefined : JSON.stringify(await request.json().catch(() => ({}))),
    cache: "no-store",
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}

export async function GET(request: NextRequest, { params }: Props) {
  const { path } = await params;
  return proxyPolicyPackRequest(request, path, "GET");
}

export async function POST(request: NextRequest, { params }: Props) {
  const { path } = await params;
  return proxyPolicyPackRequest(request, path, "POST");
}
