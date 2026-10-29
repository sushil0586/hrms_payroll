import { type NextRequest, NextResponse } from "next/server";
import { getHrAdminPayrollReadiness } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const result = await getHrAdminPayrollReadiness({
      q: params.get("q") ?? "",
      status: params.get("status") ?? "all",
      period_start: params.get("period_start") ?? undefined,
      period_end: params.get("period_end") ?? undefined,
      page: Number(params.get("page")) || 1,
      page_size: Number(params.get("page_size")) || 20,
    });
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ detail: "Payroll readiness could not be updated." }, { status: 503 });
  }
}
