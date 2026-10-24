import { notFound } from "next/navigation";

import { BankAccountManager } from "@/app/hr-admin/employees/[employeeId]/bank-accounts/bank-account-manager";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminEmployeeBankAccounts, getHrAdminEmployeeDetail } from "@/lib/api";
import { requireSessionPermission } from "@/lib/workspace-access";

type PageProps = {
  params: Promise<{
    employeeId: string;
  }>;
};

export default async function HrAdminEmployeeBankAccountsPage({ params }: PageProps) {
  const { employeeId } = await params;
  await requireSessionPermission({
    permissionKeys: ["employees.edit"],
    fallbackPath: `/hr-admin/employees?employeeId=${employeeId}`,
  });
  const [employeeResult, bankResult] = await Promise.all([
    getHrAdminEmployeeDetail(employeeId),
    getHrAdminEmployeeBankAccounts(employeeId),
  ]);

  if (!employeeResult.data?.id) {
    notFound();
  }

  const accounts = bankResult.data ?? [];
  const primaryCount = accounts.filter((item) => item.is_primary).length;
  const state = employeeResult.state === "live" && bankResult.state === "live" ? "live" : "demo";

  return (
    <main className="shell hr-admin-compact-ui accerio-page employee-maintenance-phase4">
      <PageIntro appearance="accerio"
        eyebrow={`${state === "demo" ? "Demo · " : ""}${employeeResult.data.employee_code} · ${employeeResult.data.employment_status.replaceAll("_", " ")}`}
        title={`Bank accounts for ${employeeResult.data.full_name}`}
        description={`${employeeResult.data.employee_code} · Employee status: ${employeeResult.data.employment_status.replaceAll("_", " ")}. Maintain payout accounts used by payroll readiness and bank advice exports.`}
      />

      <BankAccountManager
        employeeId={employeeId}
        employeeName={employeeResult.data.full_name}
        initialAccounts={accounts}
      />
    </main>
  );
}
