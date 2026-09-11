import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollReviewSetup } from "@/lib/api";

import { PayrollReviewExceptionsReportWorkspace } from "./payroll-review-exceptions-report-workspace";

export default async function PayrollReviewExceptionsReportPage() {
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

      <PayrollReviewExceptionsReportWorkspace reviews={result.data.reviews} exceptions={result.data.exceptions} />
    </main>
  );
}
