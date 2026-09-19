import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { ComplianceEvidenceStrip } from "@/app/hr-admin/compliance-evidence-strip";
import { getHrAdminPayrollFinanceHandoffSetup, getHrAdminPayrollStatutorySetup } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { StatutoryFilingStatusReportWorkspace } from "./statutory-filing-status-report-workspace";

export default async function StatutoryFilingStatusReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const [statutoryResult, handoffResult] = await Promise.all([
    getHrAdminPayrollStatutorySetup(),
    getHrAdminPayrollFinanceHandoffSetup(),
  ]);

  return (
    <main className="shell shell--payroll-setup shell--payroll-statutory">
      <PageIntro
        eyebrow={statutoryResult.state === "live" && handoffResult.state === "live" ? "Live compliance report" : "Demo compliance report"}
        title="Statutory Filing Status"
        description="Filing-calendar status tracking across due dates, overdue exposure, acknowledgement state, provider route readiness, and artifact evidence."
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
        pills={["Compliance", "Filing calendar", "Due status"]}
        showPills
      />

      <ComplianceEvidenceStrip
        current="reports"
        eyebrow="Filing calendar"
        title="Statutory filing evidence"
        description="Track due dates, overdue exposure, acknowledgement state, route readiness, and generated filing artifacts."
        metrics={[
          { label: "filings", value: statutoryResult.data.summary.filing_calendar_count, tone: "neutral" },
          { label: "due", value: statutoryResult.data.summary.due_filing_calendar_count, tone: statutoryResult.data.summary.due_filing_calendar_count ? "warning" : "ready" },
          { label: "registrations", value: statutoryResult.data.summary.active_employer_registration_count, tone: "ready" },
          { label: "artifacts", value: handoffResult.data.summary.statutory_filing_artifact_count ?? 0, tone: (handoffResult.data.summary.statutory_filing_artifact_count ?? 0) ? "ready" : "warning" },
        ]}
      />

      <StatutoryFilingStatusReportWorkspace
        artifacts={handoffResult.data.artifacts}
        filings={statutoryResult.data.filing_calendars}
        registrations={statutoryResult.data.employer_registrations}
      />
    </main>
  );
}
