import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollReviewSetup } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportInsightsStrip } from "../report-insights-strip";
import { SalaryVarianceReportWorkspace } from "./salary-variance-report-workspace";

export default async function SalaryVarianceReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const result = await getHrAdminPayrollReviewSetup();

  return (
    <main className="shell shell--payroll-setup shell--payroll-review">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll finance report" : "Demo payroll finance report"}
        title="Salary Variance Report"
        description="Finance review of employee-level pay movement using configurable prior-period baselines, calculation-line evidence, and review drilldown."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-review">
              Payroll review
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-calculations">
              Calculations
            </Link>
          </>
        }
        pills={["Variance", "Configurable baseline", "Review drilldown"]}
        showPills
      />

      <ReportInsightsStrip
        current="payroll"
        eyebrow="Payroll variance"
        title="Salary variance evidence"
        description="Review employee-level pay movement using prior-period baselines, calculation-line evidence, and payroll review drilldown."
        metrics={[
          { label: "reviews", value: result.data.summary.review_count, tone: "neutral" },
          { label: "open", value: result.data.summary.open_review_count, tone: result.data.summary.open_review_count ? "warning" : "ready" },
          { label: "exceptions", value: result.data.summary.exception_count, tone: result.data.summary.exception_count ? "warning" : "ready" },
          { label: "blockers", value: result.data.summary.open_blocker_count, tone: result.data.summary.open_blocker_count ? "blocked" : "ready" },
        ]}
      />

      <SalaryVarianceReportWorkspace lines={result.data.lines} reviews={result.data.reviews} />
    </main>
  );
}
