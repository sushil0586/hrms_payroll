import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollOutputSetup } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportInsightsStrip } from "../report-insights-strip";
import { PayrollRegisterReportWorkspace } from "./payroll-register-report-workspace";

export default async function PayrollRegisterReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const result = await getHrAdminPayrollOutputSetup();

  return (
    <main className="shell shell--payroll-setup shell--payroll-outputs">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll finance report" : "Demo payroll finance report"}
        title="Payroll Register Report"
        description="Finance-ready payroll register view backed by locked output artifacts, source hashes, export controls, and tenant-scoped payroll output evidence."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-outputs">
              Output artifacts
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-review">
              Review
            </Link>
          </>
        }
        pills={["Payroll finance", "Locked snapshots", "Export audited"]}
        showPills
      />

      <ReportInsightsStrip
        current="payroll"
        eyebrow="Payroll report"
        title="Payroll register evidence"
        description="Inspect finance-ready payroll registers backed by locked output artifacts, source hashes, export controls, and tenant-scoped output evidence."
        metrics={[
          { label: "batches", value: result.data.summary.output_batch_count, tone: "neutral" },
          { label: "published", value: result.data.summary.published_batch_count, tone: result.data.summary.published_batch_count ? "ready" : "warning" },
          { label: "artifacts", value: result.data.summary.artifact_count, tone: "ready" },
          { label: "payslips", value: result.data.summary.payslip_count, tone: "neutral" },
        ]}
      />

      <PayrollRegisterReportWorkspace artifacts={result.data.artifacts} batches={result.data.output_batches} />
    </main>
  );
}
