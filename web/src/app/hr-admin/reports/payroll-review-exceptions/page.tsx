import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollReviewSetup } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportInsightsStrip } from "../report-insights-strip";
import { PayrollReviewExceptionsReportWorkspace } from "./payroll-review-exceptions-report-workspace";

export default async function PayrollReviewExceptionsReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const result = await getHrAdminPayrollReviewSetup();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll finance report" : "Demo payroll finance report"}
        title="Payroll Review Exceptions Report"
        description="Calculation and review exceptions by severity, status, component, decision state, and approval impact."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/reports/payroll-input-exceptions">
              Input exceptions
            </Link>
            <Link className="button button--primary" href="/hr-admin/payroll-review">
              Payroll review
            </Link>
          </>
        }
        pills={["Review exceptions", "Decision evidence", "Approval impact"]}
        showPills
      />

      <ReportInsightsStrip
        current="payroll"
        eyebrow="Payroll exception report"
        title="Review exception evidence"
        description="Inspect calculation and review exceptions by severity, status, component, decision state, and approval impact."
        metrics={[
          { label: "exceptions", value: result.data.summary.exception_count, tone: result.data.summary.exception_count ? "warning" : "ready" },
          { label: "open", value: result.data.summary.open_exception_count, tone: result.data.summary.open_exception_count ? "warning" : "ready" },
          { label: "blockers", value: result.data.summary.open_blocker_count, tone: result.data.summary.open_blocker_count ? "blocked" : "ready" },
          { label: "approvals", value: result.data.summary.approval_count, tone: "neutral" },
        ]}
      />

      <PayrollReviewExceptionsReportWorkspace reviews={result.data.reviews} exceptions={result.data.exceptions} />
    </main>
  );
}
