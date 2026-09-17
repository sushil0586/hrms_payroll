import { type NextRequest } from "next/server";

import { requireApiRoutePermission } from "@/lib/api-route-permissions";
import { proxyHrAdminPayrollConfigRequest } from "../../../payroll-config-proxy";

type RouteContext = {
  params: Promise<{ itemId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const permission = await requireApiRoutePermission(request, "payroll.outputs.download");
  if (!permission.ok) return permission.response;
  const { itemId } = await context.params;
  return proxyHrAdminPayrollConfigRequest({
    request,
    method: "POST",
    upstreamPath: `/hr-admin/payroll-output-artifacts/${itemId}/signed-access/`,
  });
}
