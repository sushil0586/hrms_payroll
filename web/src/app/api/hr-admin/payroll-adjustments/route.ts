import { type NextRequest } from "next/server";

import { proxyHrAdminPayrollConfigRequest } from "../payroll-config-proxy";

export async function GET(request: NextRequest) {
  return proxyHrAdminPayrollConfigRequest({
    request,
    method: "GET",
    upstreamPath: "/hr-admin/payroll-adjustments/",
  });
}

export async function POST(request: NextRequest) {
  return proxyHrAdminPayrollConfigRequest({
    request,
    method: "POST",
    upstreamPath: "/hr-admin/payroll-adjustments/",
  });
}
