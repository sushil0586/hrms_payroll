import { type NextRequest } from "next/server";

import { proxyHrAdminPayrollConfigRequest } from "../../../payroll-config-proxy";

type RouteContext = {
  params: Promise<{ itemId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { itemId } = await context.params;
  return proxyHrAdminPayrollConfigRequest({
    request,
    method: "POST",
    upstreamPath: `/hr-admin/payroll-review-exceptions/${itemId}/decision/`,
  });
}
