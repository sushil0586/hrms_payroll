import Link from "next/link";
import { notFound } from "next/navigation";

import { BankAccountManager } from "@/app/hr-admin/employees/[employeeId]/bank-accounts/bank-account-manager";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminEmployeeBankAccounts, getHrAdminEmployeeDetail } from "@/lib/api";

type PageProps = {
  params: Promise<{
    employeeId: string;
  }>;
};

export default async function HrAdminEmployeeBankAccountsPage({ params }: PageProps) {
  const { employeeId } = await params;
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
        title={`Bank accounts for ${employeeResult.data.full_name}.`}
        description="Maintain employee payout accounts for payroll readiness, bank advice, and finance handoff coverage."
        actions={<Link className="button button--secondary" href={`/hr-admin/employees?employeeId=${employeeId}`}>Back to employee detail</Link>}
        pills={["Payroll readiness", "Primary payout account", "Tenant scoped"]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Bank accounts" value={accounts.length} trend="Employee payout records" />
          <MetricTile label="Primary accounts" value={primaryCount} trend="Payroll readiness coverage" />
          <MetricTile label="Employee status" value={employeeResult.data.employment_status.replace("_", " ")} trend={employeeResult.data.employee_code} />
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
