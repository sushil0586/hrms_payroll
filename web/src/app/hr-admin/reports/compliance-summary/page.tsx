import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollFinanceHandoffSetup, getHrAdminPayrollStatutorySetup } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ComplianceSummaryReportWorkspace } from "./compliance-summary-report-workspace";

export default async function ComplianceSummaryReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const [statutoryResult, handoffResult] = await Promise.all([
    getHrAdminPayrollStatutorySetup(),
    getHrAdminPayrollFinanceHandoffSetup(),
  ]);

  return (
    <main className="shell shell--payroll-setup shell--payroll-statutory">
      <PageIntro
        eyebrow={statutoryResult.state === "live" && handoffResult.state === "live" ? "Live compliance control" : "Demo compliance control"}
        title="Compliance Summary"
        description="One control-center report for statutory setup, employee coverage, deduction evidence, filing calendars, challan readiness, provider receipts, and blocked compliance actions."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports/compliance">Compliance hub</Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-statutory">Statutory setup</Link>
            <Link className="button button--secondary" href="/hr-admin/reports/export-audits">Export audits</Link>
          </>
        }
        pills={["Compliance", "Control report", "Launch gates"]}
        showPills
      />

      <ComplianceSummaryReportWorkspace statutory={statutoryResult.data} handoff={handoffResult.data} />
    </main>
  );
}
