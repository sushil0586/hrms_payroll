import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollFinanceHandoffSetup } from "@/lib/api";

import { BankAdviceReportWorkspace } from "./bank-advice-report-workspace";

export default async function BankAdviceReportPage() {
  const result = await getHrAdminPayrollFinanceHandoffSetup();

  return (
    <main className="shell shell--payroll-setup shell--payroll-handoff">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll finance report" : "Demo payroll finance report"}
        title="Bank Advice Report"
        description="Payout-ready bank advice artifacts, provider delivery state, reconciliation evidence, and finance handoff routing."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-handoff">
              Payroll handoff
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-providers">
              Providers
            </Link>
          </>
        }
        pills={["Bank advice", "Provider delivery", "Audit manifest"]}
        showPills
      />

      <BankAdviceReportWorkspace
        artifacts={result.data.artifacts}
        deliveries={result.data.deliveries}
        handoffs={result.data.handoffs}
      />
    </main>
  );
}
