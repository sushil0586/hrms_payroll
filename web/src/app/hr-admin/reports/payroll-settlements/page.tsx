import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollSettlementSetup } from "@/lib/api";

import { PayrollSettlementsReportWorkspace } from "./payroll-settlements-report-workspace";

export default async function PayrollSettlementsReportPage() {
  const result = await getHrAdminPayrollSettlementSetup();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll finance report" : "Demo payroll finance report"}
        title="Payroll Settlements Report"
        description="Full-and-final settlement packages by employee, run, package status, approval state, line composition, source hash, and net settlement evidence."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/reports/payroll-adjustments">
              Adjustments report
            </Link>
            <Link className="button button--primary" href="/hr-admin/payroll-settlements">
              Payroll settlements
            </Link>
          </>
        }
        pills={["Full-and-final", "Line composition", "Source hash"]}
        showPills
      />

      <PayrollSettlementsReportWorkspace runs={result.data.runs} settlements={result.data.settlements} lines={result.data.lines} />
    </main>
  );
}
