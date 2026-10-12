import Link from "next/link";
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
    <main className="shell">
      <PageIntro
        eyebrow={state === "live" ? "Live banking mode" : "Demo banking mode"}
        title={`Bank accounts for ${employeeResult.data.full_name}`}
        description="Maintain payout accounts used by payroll readiness and bank advice exports."
        actions={<Link className="button button--secondary" href={`/hr-admin/employees?employeeId=${employeeId}`}>Back to employee detail</Link>}
        pills={["Payout", "Primary", "Payroll ready"]}
      />

      <section className="section">
        <div className="attendance-summary-strip payroll-run-summary-strip">
          <span><strong>{accounts.length}</strong> Bank accounts</span>
          <span><strong>{primaryCount}</strong> Primary accounts</span>
          <span><strong>{employeeResult.data.employment_status.replace("_", " ")}</strong> Employee status</span>
        </div>
      </section>

      <BankAccountManager
        employeeId={employeeId}
        employeeName={employeeResult.data.full_name}
        initialAccounts={accounts}
      />
    </main>
  );
}
