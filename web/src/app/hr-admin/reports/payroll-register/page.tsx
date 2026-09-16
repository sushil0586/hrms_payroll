import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollOutputSetup } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

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

      <PayrollRegisterReportWorkspace artifacts={result.data.artifacts} batches={result.data.output_batches} />
    </main>
  );
}
