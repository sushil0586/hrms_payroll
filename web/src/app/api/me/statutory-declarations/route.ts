import { NextRequest, NextResponse } from "next/server";

import { getEssStatutoryDeclarations } from "@/lib/api";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams;
  const rawPage = Number(input.get("page") || "1");
  const rawSize = Number(input.get("page_size") || "10");
  const params = {
    q: input.get("q") || "",
    status: ["draft", "submitted", "verified", "rejected", "locked"].includes(input.get("status") || "") ? input.get("status")! : "",
    financial_year: input.get("financial_year") || "",
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    page_size: [5, 10, 25].includes(rawSize) ? rawSize : 10,
  };
  if (!API_BASE_URL) {
    try {
      return NextResponse.json((await getEssStatutoryDeclarations(params)).data);
    } catch {
      return NextResponse.json({ detail: "Statutory declarations are unavailable." }, { status: 503 });
    }
  }
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== "").map(([key, value]) => [key, String(value)]));
  const upstream = await fetch(`${API_BASE_URL}/me/statutory-declarations/?${query}`, { headers: { Authorization: `Token ${token}` }, cache: "no-store" });
  return NextResponse.json(await upstream.json().catch(() => ({})), { status: upstream.status });
}

export async function POST(request: NextRequest) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }

  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const upstream = await fetch(`${API_BASE_URL}/me/statutory-declarations/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      "X-Request-ID": request.headers.get("x-request-id") ?? "",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
