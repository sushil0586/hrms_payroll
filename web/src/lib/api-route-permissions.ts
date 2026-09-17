import { NextRequest, NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/runtime-flags";

const PAYROLL_REPORT_KEYS = new Set([
  "payroll-register",
  "salary-variance",
  "bank-advice",
  "payroll-input-exceptions",
  "payroll-review-exceptions",
  "payroll-adjustments",
  "payroll-settlements",
  "payroll-close-readiness",
  "payslip-publication",
  "finance-handoff-exceptions",
]);

const COMPLIANCE_REPORT_KEYS = new Set([
  "challan-reconciliation",
  "statutory-filing-status",
  "provider-filing-receipts",
]);

type PermissionCheckResult =
  | { ok: true; token: string }
  | { ok: false; response: NextResponse };

type SessionPayload = {
  effective_permissions?: string[];
};

export function reportExportPermissionForKey(reportKey: string) {
  if (COMPLIANCE_REPORT_KEYS.has(reportKey)) return "reports.compliance.export";
  if (PAYROLL_REPORT_KEYS.has(reportKey)) return "reports.payroll.export";
  return "reports.hr.export";
}

export async function requireApiRoutePermission(request: NextRequest, permissionKey: string): Promise<PermissionCheckResult> {
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return { ok: false, response: NextResponse.json({ detail: "Not authenticated." }, { status: 401 }) };
  }

  if (!API_BASE_URL) {
    return { ok: true, token };
  }

  const sessionResponse = await fetch(`${API_BASE_URL}/auth/session/`, {
    headers: { Authorization: `Token ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  }).catch(() => null);

  if (!sessionResponse?.ok) {
    return {
      ok: false,
      response: NextResponse.json({ detail: "Unable to verify session permissions." }, { status: 403 }),
    };
  }

  const session = (await sessionResponse.json().catch(() => ({}))) as SessionPayload;
  const permissions = new Set(session.effective_permissions || []);
  if (!permissions.has(permissionKey)) {
    return {
      ok: false,
      response: NextResponse.json({ detail: `Missing tenant permission: ${permissionKey}.` }, { status: 403 }),
    };
  }

  return { ok: true, token };
}
