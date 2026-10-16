import { type NextRequest } from "next/server";

import { proxyHrAdminPayrollConfigRequest } from "../../payroll-config-proxy";

type RouteContext = { params: Promise<{ itemId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { itemId } = await context.params;
  return proxyHrAdminPayrollConfigRequest({
    request,
    method: "GET",
    upstreamPath: `/hr-admin/payroll-jobs/${itemId}/`,
  });
}
