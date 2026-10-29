import { NextRequest, NextResponse } from "next/server";
import {
  getHrAdminEmployeeAccessDetail,
  getHrAdminEmployeeAccessOptions,
  getHrAdminEmployeeBankAccounts,
  getHrAdminEmployeeDetail,
  getHrAdminEmployeeFormOptions,
  getHrAdminEmployees,
} from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const employeeId = request.nextUrl.searchParams.get("employeeId");
    const action = request.nextUrl.searchParams.get("action");
    if (employeeId) {
      const detail = await getHrAdminEmployeeDetail(employeeId);
      if (action === "access") {
        const [access, options] = await Promise.all([
          getHrAdminEmployeeAccessDetail(employeeId),
          getHrAdminEmployeeAccessOptions(),
        ]);
        return NextResponse.json({ detail: detail.data, access: access.data, accessOptions: options.data });
      }
      if (action === "bank") {
        const accounts = await getHrAdminEmployeeBankAccounts(employeeId);
        return NextResponse.json({ detail: detail.data, accounts: accounts.data });
      }
      return NextResponse.json({ detail: detail.data });
    }
    const [employees, options] = await Promise.all([getHrAdminEmployees(), getHrAdminEmployeeFormOptions()]);
    return NextResponse.json({ employees: employees.data, options: options.data, state: employees.state });
  } catch {
    return NextResponse.json({ detail: "Employee workspace could not be updated." }, { status: 503 });
  }
}
