import { type NextRequest } from "next/server";

import { proxyHrAdminPayrollConfigRequest } from "../payroll-config-proxy";

export async function GET(request: NextRequest) {
  return proxyHrAdminPayrollConfigRequest({
    request,
    method: "GET",
    upstreamPath: "/hr-admin/payroll-input-snapshot-setup/",
  });
}
