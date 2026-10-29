import { NextRequest, NextResponse } from "next/server";

import { getEssPayrollPayslips } from "@/lib/api";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

function positive(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams;
  const requestedSize = positive(input.get("page_size"), 5);
  const params = {
    page: positive(input.get("page"), 1),
    page_size: [5, 10, 25, 50].includes(requestedSize) ? requestedSize : 5,
    q: input.get("q") || "",
    year: /^[1-9]\d{3}$/.test(input.get("year") || "") ? input.get("year")! : "",
    selected_id: input.get("selected_id") || "",
  };
  if (!API_BASE_URL) {
    try {
      return NextResponse.json((await getEssPayrollPayslips(params, 15_000)).data);
    } catch {
      return NextResponse.json({ detail: "Payslips are unavailable." }, { status: 503 });
    }
  }
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== "").map(([key, value]) => [key, String(value)]));
  const upstream = await fetch(`${API_BASE_URL}/me/payroll-payslips/?${query}`, { headers: { Authorization: `Token ${token}` }, cache: "no-store" });
  return NextResponse.json(await upstream.json().catch(() => ({})), { status: upstream.status });
}
