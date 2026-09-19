import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { ComplianceEvidenceStrip } from "@/app/hr-admin/compliance-evidence-strip";
import { getHrAdminPayrollFinanceHandoffSetup, getHrAdminPayrollStatutorySetup } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { StatutoryDeductionsReportWorkspace } from "./statutory-deductions-report-workspace";

export default async function StatutoryDeductionsReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

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

      <ComplianceEvidenceStrip
        current="reports"
        eyebrow="Deduction evidence"
        title="Statutory deduction source control"
        description="Review component-wise statutory deduction evidence using statutory setup, employer registrations, filing calendars, and published payroll artifacts."
        metrics={[
          { label: "components", value: statutoryResult.data.summary.active_statutory_component_count, tone: "ready" },
          { label: "registrations", value: statutoryResult.data.summary.active_employer_registration_count, tone: "ready" },
          { label: "filings", value: statutoryResult.data.summary.filing_calendar_count, tone: "neutral" },
          { label: "artifacts", value: handoffResult.data.summary.statutory_filing_artifact_count ?? 0, tone: (handoffResult.data.summary.statutory_filing_artifact_count ?? 0) ? "ready" : "warning" },
        ]}
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
