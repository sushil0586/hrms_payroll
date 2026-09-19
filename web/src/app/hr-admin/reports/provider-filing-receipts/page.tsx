import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { ComplianceEvidenceStrip } from "@/app/hr-admin/compliance-evidence-strip";
import { getHrAdminPayrollFinanceHandoffSetup } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ProviderFilingReceiptsReportWorkspace } from "./provider-filing-receipts-report-workspace";

export default async function ProviderFilingReceiptsReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const handoffResult = await getHrAdminPayrollFinanceHandoffSetup();

  return (
    <main className="shell shell--payroll-setup shell--payroll-statutory">
      <PageIntro
        eyebrow={handoffResult.state === "live" ? "Live compliance report" : "Demo compliance report"}
        title="Provider Filing Receipts"
        description="Provider delivery receipt tracking across submissions, acknowledgements, callbacks, retries, worker jobs, checksums, and failure evidence."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-handoff">
              Handoff
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-statutory">
              Statutory setup
            </Link>
          </>
        }
        pills={["Compliance", "Provider receipts", "Retry evidence"]}
        showPills
      />

      <ComplianceEvidenceStrip
        current="reports"
        eyebrow="Provider receipt evidence"
        title="Delivery, callback, and retry evidence"
        description="Trace provider submissions, acknowledgements, callbacks, retries, worker jobs, checksums, and failure evidence."
        metrics={[
          { label: "deliveries", value: handoffResult.data.deliveries.length, tone: "neutral" },
          { label: "callbacks", value: handoffResult.data.callback_events.length, tone: "neutral" },
          { label: "retries", value: handoffResult.data.retry_events.length, tone: handoffResult.data.retry_events.length ? "warning" : "neutral" },
          { label: "jobs", value: handoffResult.data.provider_jobs.length, tone: "neutral" },
        ]}
      />

      <ProviderFilingReceiptsReportWorkspace
        callbackEvents={handoffResult.data.callback_events}
        deliveries={handoffResult.data.deliveries}
        providerJobs={handoffResult.data.provider_jobs}
        retryEvents={handoffResult.data.retry_events}
      />
    </main>
  );
}
