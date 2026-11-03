import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { ComplianceEvidenceStrip } from "@/app/hr-admin/compliance-evidence-strip";
import { getHrAdminPayrollFinanceHandoffSetup, getHrAdminPayrollStatutorySetup } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ChallanReconciliationReportWorkspace } from "./challan-reconciliation-report-workspace";

export default async function ChallanReconciliationReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const [statutoryResult, handoffResult] = await Promise.all([
    getHrAdminPayrollStatutorySetup(),
    getHrAdminPayrollFinanceHandoffSetup(),
  ]);

  return (
    <main className="shell shell--payroll-setup shell--payroll-statutory accerio-page">
      <PageIntro appearance="accerio"
        eyebrow={statutoryResult.state === "live" && handoffResult.state === "live" ? "Live compliance report" : "Demo compliance report"}
        title="Challan Reconciliation"
        description="Calendar-wise statutory reconciliation across filing windows, employer registrations, provider routes, source hashes, and published deduction artifacts."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports/compliance">
              Compliance hub
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-statutory">
              Statutory setup
            </Link>
            <Link className="button button--secondary" href="/hr-admin/reports/statutory-filing-status">
              Filing status
            </Link>
          </>
        }
        pills={["Compliance", "Challan readiness", "Provider mapped"]}
        showPills
      />

      <ComplianceEvidenceStrip
        current="reports"
        eyebrow="Challan evidence"
        title="Payment and filing reconciliation"
        description="Reconcile filing calendars, employer registrations, provider routes, source hashes, and published statutory artifacts."
        metrics={[
          { label: "filings", value: statutoryResult.data.summary.filing_calendar_count, tone: "neutral" },
          { label: "due", value: statutoryResult.data.summary.due_filing_calendar_count, tone: statutoryResult.data.summary.due_filing_calendar_count ? "warning" : "ready" },
          { label: "registrations", value: statutoryResult.data.summary.active_employer_registration_count, tone: "ready" },
          { label: "artifacts", value: handoffResult.data.summary.statutory_filing_artifact_count ?? 0, tone: (handoffResult.data.summary.statutory_filing_artifact_count ?? 0) ? "ready" : "warning" },
        ]}
      />

      <ChallanReconciliationReportWorkspace
        artifacts={handoffResult.data.artifacts}
        filings={statutoryResult.data.filing_calendars}
        registrations={statutoryResult.data.employer_registrations}
      />
    </main>
  );
}
