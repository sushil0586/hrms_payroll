import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollFinanceHandoffSetup, getHrAdminPayrollStatutorySetup } from "@/lib/api";
import { reportCatalog } from "@/lib/report-catalog";

import { ComplianceReportHubWorkspace } from "./compliance-report-hub-workspace";

const complianceReportKeys = [
  "statutory-deductions",
  "challan-reconciliation",
  "statutory-filing-status",
  "provider-filing-receipts",
  "tds-efile-readiness",
];

export default async function ComplianceReportHubPage() {
  const [statutoryResult, handoffResult] = await Promise.all([
    getHrAdminPayrollStatutorySetup(),
    getHrAdminPayrollFinanceHandoffSetup(),
  ]);
  const reports = complianceReportKeys
    .map((key) => reportCatalog.find((report) => report.key === key))
    .filter((report) => report !== undefined);
  const statutory = statutoryResult.data;
  const handoff = handoffResult.data;

  return (
    <main className="shell shell--payroll-setup shell--payroll-statutory">
      <PageIntro
        eyebrow={statutoryResult.state === "live" && handoffResult.state === "live" ? "Live compliance hub" : "Demo compliance hub"}
        title="Compliance Reports"
        description="Payroll statutory reporting workspace for deductions, filing status, challan reconciliation, provider receipts, and TDS e-file readiness."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              All reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-statutory">
              Statutory setup
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-handoff">
              Handoff
            </Link>
          </>
        }
        pills={["Compliance", "Exports", "Provider evidence"]}
        showPills
      />

      <section className="section section--tight" aria-label="Compliance report hub">
        <div className="report-catalog-workspace compliance-report-hub" data-testid="compliance-report-hub">
          <div className="metric-grid-modern payroll-setup-metrics">
            <article className="metric-tile metric-tile-soft">
              <span>Filing calendars</span>
              <strong>{statutory.summary.filing_calendar_count}</strong>
              <small>{statutory.summary.due_filing_calendar_count} due</small>
            </article>
            <article className="metric-tile metric-tile-soft">
              <span>Statutory artifacts</span>
              <strong>{handoff.summary.statutory_filing_artifact_count ?? 0}</strong>
              <small>{handoff.summary.statutory_filing_count ?? 0} filing rows</small>
            </article>
            <article className="metric-tile metric-tile-soft">
              <span>Provider callbacks</span>
              <strong>{handoff.summary.provider_callback_event_count ?? 0}</strong>
              <small>{handoff.summary.rejected_provider_callback_event_count ?? 0} rejected</small>
            </article>
            <article className="metric-tile metric-tile-soft">
              <span>Provider retries</span>
              <strong>{handoff.summary.provider_retry_event_count ?? 0}</strong>
              <small>{handoff.summary.scheduled_provider_retry_event_count ?? 0} scheduled</small>
            </article>
          </div>

          <ComplianceReportHubWorkspace reports={reports} />
        </div>
      </section>
    </main>
  );
}
