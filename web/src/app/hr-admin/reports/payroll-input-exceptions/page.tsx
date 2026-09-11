import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollInputSnapshotSetup } from "@/lib/api";

import { PayrollInputExceptionsReportWorkspace } from "./payroll-input-exceptions-report-workspace";

export default async function PayrollInputExceptionsReportPage() {
  const result = await getHrAdminPayrollInputSnapshotSetup();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll finance report" : "Demo payroll finance report"}
        title="Payroll Input Exceptions Report"
        description="Pre-close input readiness across employee snapshots, blockers, warnings, lock state, and source hash evidence."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-readiness">
              Readiness
            </Link>
            <Link className="button button--primary" href="/hr-admin/payroll-inputs">
              Payroll inputs
            </Link>
          </>
        }
        pills={["Pre-close", "Snapshot evidence", "Source hash"]}
        showPills
      />

      <PayrollInputExceptionsReportWorkspace runs={result.data.runs} snapshots={result.data.snapshots} />
    </main>
  );
}
