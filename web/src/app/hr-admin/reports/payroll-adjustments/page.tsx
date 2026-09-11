import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollAdjustmentSetup } from "@/lib/api";

import { PayrollAdjustmentsReportWorkspace } from "./payroll-adjustments-report-workspace";

export default async function PayrollAdjustmentsReportPage() {
  const result = await getHrAdminPayrollAdjustmentSetup();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll finance report" : "Demo payroll finance report"}
        title="Payroll Adjustments Report"
        description="One-time payroll inputs by employee, run, kind, direction, status, approval state, amount risk, and source hash evidence."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/reports/payroll-review-exceptions">
              Review exceptions
            </Link>
            <Link className="button button--primary" href="/hr-admin/payroll-adjustments">
              Payroll adjustments
            </Link>
          </>
        }
        pills={["One-time inputs", "Approval evidence", "Source hash"]}
        showPills
      />

      <PayrollAdjustmentsReportWorkspace runs={result.data.runs} adjustments={result.data.adjustments} />
    </main>
  );
}
