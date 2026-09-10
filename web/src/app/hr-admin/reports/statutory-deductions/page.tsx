import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollFinanceHandoffSetup, getHrAdminPayrollStatutorySetup } from "@/lib/api";

import { StatutoryDeductionsReportWorkspace } from "./statutory-deductions-report-workspace";

export default async function StatutoryDeductionsReportPage() {
  const [statutoryResult, handoffResult] = await Promise.all([
    getHrAdminPayrollStatutorySetup(),
    getHrAdminPayrollFinanceHandoffSetup(),
  ]);

  return (
    <main className="shell shell--payroll-setup shell--payroll-statutory">
      <PageIntro
        eyebrow={statutoryResult.state === "live" && handoffResult.state === "live" ? "Live compliance report" : "Demo compliance report"}
        title="Statutory Deduction Summary"
        description="Component-wise statutory deduction report using configurable statutory setup, employer registrations, filing calendars, and published payroll handoff artifacts."
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
        pills={["Compliance", "Config driven", "Source hash"]}
        showPills
      />

      <StatutoryDeductionsReportWorkspace
        artifacts={handoffResult.data.artifacts}
        components={statutoryResult.data.statutory_components}
        filings={statutoryResult.data.filing_calendars}
        registrations={statutoryResult.data.employer_registrations}
      />
    </main>
  );
}
