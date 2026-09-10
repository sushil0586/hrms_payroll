import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollFinanceHandoffSetup, getHrAdminPayrollStatutorySetup } from "@/lib/api";

import { ChallanReconciliationReportWorkspace } from "./challan-reconciliation-report-workspace";

export default async function ChallanReconciliationReportPage() {
  const [statutoryResult, handoffResult] = await Promise.all([
    getHrAdminPayrollStatutorySetup(),
    getHrAdminPayrollFinanceHandoffSetup(),
  ]);

  return (
    <main className="shell shell--payroll-setup shell--payroll-statutory">
      <PageIntro
        eyebrow={statutoryResult.state === "live" && handoffResult.state === "live" ? "Live compliance report" : "Demo compliance report"}
        title="Challan Reconciliation"
        description="Calendar-wise statutory reconciliation across filing windows, employer registrations, provider routes, source hashes, and published deduction artifacts."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-statutory">
              Statutory setup
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-handoff">
              Handoff
            </Link>
          </>
        }
        pills={["Compliance", "Challan readiness", "Provider mapped"]}
        showPills
      />

      <ChallanReconciliationReportWorkspace
        artifacts={handoffResult.data.artifacts}
        filings={statutoryResult.data.filing_calendars}
        registrations={statutoryResult.data.employer_registrations}
      />
    </main>
  );
}
