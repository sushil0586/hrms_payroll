import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import {
  getHrAdminPayrollAdjustmentSetup,
  getHrAdminPayrollInputSnapshotSetup,
  getHrAdminPayrollOutputSetup,
  getHrAdminPayrollReviewSetup,
  getHrAdminPayrollSettlementSetup,
} from "@/lib/api";

import { PayrollCloseReadinessReportWorkspace } from "./payroll-close-readiness-report-workspace";

export default async function PayrollCloseReadinessReportPage() {
  const [inputSetup, reviewSetup, adjustmentSetup, settlementSetup, outputSetup] = await Promise.all([
    getHrAdminPayrollInputSnapshotSetup(),
    getHrAdminPayrollReviewSetup(),
    getHrAdminPayrollAdjustmentSetup(),
    getHrAdminPayrollSettlementSetup(),
    getHrAdminPayrollOutputSetup(),
  ]);

  return (
    <main className="shell">
      <PageIntro
        eyebrow={inputSetup.state === "live" ? "Live payroll finance report" : "Demo payroll finance report"}
        title="Payroll Close Readiness Report"
        description="Run-level close gate combining input lock coverage, review blockers, pending adjustments, pending settlements, output state, and source evidence."
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
            <Link className="button button--primary" href="/hr-admin/payroll-calculations">
              Payroll control
            </Link>
          </>
        }
        pills={["Close gate", "Blocker proof", "Run evidence"]}
        showPills
      />

      <PayrollCloseReadinessReportWorkspace
        runs={inputSetup.data.runs}
        snapshots={inputSetup.data.snapshots}
        reviews={reviewSetup.data.reviews}
        exceptions={reviewSetup.data.exceptions}
        adjustments={adjustmentSetup.data.adjustments}
        settlements={settlementSetup.data.settlements}
        outputBatches={outputSetup.data.output_batches}
        artifacts={outputSetup.data.artifacts}
      />
    </main>
  );
}
