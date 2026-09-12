import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollFinanceHandoffSetup } from "@/lib/api";

import { FinanceHandoffExceptionsReportWorkspace } from "./finance-handoff-exceptions-report-workspace";

export default async function FinanceHandoffExceptionsReportPage() {
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
