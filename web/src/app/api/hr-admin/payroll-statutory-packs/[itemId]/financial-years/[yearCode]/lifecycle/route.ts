import { type NextRequest } from "next/server";

import { proxyHrAdminPayrollConfigRequest } from "../../../../../payroll-config-proxy";

type RouteContext = { params: Promise<{ itemId: string; yearCode: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { itemId, yearCode } = await context.params;
  return proxyHrAdminPayrollConfigRequest({
    request,
    method: "POST",
    upstreamPath: `/hr-admin/payroll-statutory-packs/${itemId}/financial-years/${encodeURIComponent(yearCode)}/lifecycle/`,
  });
}
