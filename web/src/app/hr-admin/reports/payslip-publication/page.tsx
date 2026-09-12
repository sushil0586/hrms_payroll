import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollOutputSetup } from "@/lib/api";

import { PayslipPublicationReportWorkspace } from "./payslip-publication-report-workspace";

export default async function PayslipPublicationReportPage() {
  const outputSetup = await getHrAdminPayrollOutputSetup();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={outputSetup.state === "live" ? "Live payroll finance report" : "Demo payroll finance report"}
        title="Payslip Publication Report"
        description="Payslip delivery, employee acknowledgement, signed access, download activity, and source-hash evidence from published payroll outputs."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-outputs">
              Payroll outputs
            </Link>
            <Link className="button button--primary" href="/hr-admin/payroll-handoff">
              Payroll handoff
            </Link>
          </>
        }
        pills={["Publication proof", "Acknowledgement", "Access audit"]}
        showPills
      />

      <PayslipPublicationReportWorkspace
        runs={outputSetup.data.runs}
        outputBatches={outputSetup.data.output_batches}
        artifacts={outputSetup.data.artifacts}
      />
    </main>
  );
}
