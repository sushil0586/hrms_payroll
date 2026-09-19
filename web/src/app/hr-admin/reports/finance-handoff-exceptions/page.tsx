import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { ComplianceEvidenceStrip } from "@/app/hr-admin/compliance-evidence-strip";
import { getHrAdminPayrollFinanceHandoffSetup } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { FinanceHandoffExceptionsReportWorkspace } from "./finance-handoff-exceptions-report-workspace";

export default async function FinanceHandoffExceptionsReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const result = await getHrAdminPayrollFinanceHandoffSetup();

  return (
    <main className="shell shell--payroll-setup shell--payroll-handoff">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll finance report" : "Demo payroll finance report"}
        title="Finance Handoff Exceptions Report"
        description="Failed, queued, retried, acknowledged, and audit-pack-ready payroll finance handoff evidence for finance operations."
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
            <Link className="button button--primary" href="/hr-admin/payroll-providers">
              Providers
            </Link>
          </>
        }
        pills={["Exception queue", "Retry evidence", "Audit pack"]}
        showPills
      />

      <ComplianceEvidenceStrip
        current="reports"
        eyebrow="Finance exception evidence"
        title="Handoff exception control"
        description="Inspect failed, queued, retried, acknowledged, and audit-pack-ready handoff evidence for finance operations."
        metrics={[
          { label: "handoffs", value: result.data.summary.handoff_count, tone: "neutral" },
          { label: "deliveries", value: result.data.deliveries.length, tone: "neutral" },
          { label: "callbacks", value: result.data.callback_events.length, tone: "neutral" },
          { label: "dead letters", value: result.data.summary.dead_lettered_provider_retry_event_count ?? 0, tone: (result.data.summary.dead_lettered_provider_retry_event_count ?? 0) ? "blocked" : "ready" },
        ]}
      />

      <FinanceHandoffExceptionsReportWorkspace
        handoffs={result.data.handoffs}
        artifacts={result.data.artifacts}
        deliveries={result.data.deliveries}
        callbackEvents={result.data.callback_events}
        retryEvents={result.data.retry_events}
        providerJobs={result.data.provider_jobs}
      />
    </main>
  );
}
