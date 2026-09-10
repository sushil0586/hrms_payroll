import { type NextRequest } from "next/server";

import { proxyHrAdminPayrollConfigRequest } from "../payroll-config-proxy";

export async function POST(request: NextRequest) {
  return proxyHrAdminPayrollConfigRequest({
    request,
    method: "POST",
    upstreamPath: "/hr-admin/payroll-input-snapshots/",
  });
}
