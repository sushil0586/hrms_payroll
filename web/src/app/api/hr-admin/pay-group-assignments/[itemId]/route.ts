import { type NextRequest } from "next/server";

import { proxyHrAdminPayrollConfigRequest } from "../../payroll-config-proxy";

type RouteContext = {
  params: Promise<{ itemId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { itemId } = await context.params;
  return proxyHrAdminPayrollConfigRequest({
    request,
    method: "PATCH",
    upstreamPath: `/hr-admin/pay-group-assignments/${itemId}/`,
  });
}
