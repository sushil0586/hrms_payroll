import { NextRequest, NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/runtime-flags";
import { actorTokenHash, listBackendReportExportAudits, listReportExportAudits } from "@/lib/report-export-audit-store";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  if (API_BASE_URL) {
    const upstream = await fetch(`${API_BASE_URL}/hr-admin/dashboard/`, {
      headers: { Authorization: `Token ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!upstream.ok) {
      return NextResponse.json({ detail: "HR admin access required." }, { status: upstream.status });
    }
  }

  const params = request.nextUrl.searchParams;
  const filters = {
    exportType: params.get("export_type") || undefined,
    reportKey: params.get("report_key") || undefined,
    query: params.get("q") || undefined,
  };
  if (API_BASE_URL) {
    const backendPayload = await listBackendReportExportAudits(API_BASE_URL, token, filters).catch(() => null);
    if (backendPayload) {
      return NextResponse.json({
        ...backendPayload,
        filters: {
          export_type: params.get("export_type") || "All",
          report_key: params.get("report_key") || "All",
          q: params.get("q") || "",
        },
        source: "backend",
      });
    }
  }

  const rows = await listReportExportAudits({
    actorTokenHash: actorTokenHash(token),
    ...filters,
  });

  return NextResponse.json({
    items: rows,
    count: rows.length,
    filters: {
      export_type: params.get("export_type") || "All",
      report_key: params.get("report_key") || "All",
      q: params.get("q") || "",
    },
    source: "local",
  });
}
