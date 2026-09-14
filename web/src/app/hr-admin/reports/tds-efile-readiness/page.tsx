import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollFinanceHandoffSetup, getHrAdminPayrollStatutorySetup } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { TdsEfileReadinessWorkspace } from "./tds-efile-readiness-workspace";

export default async function TdsEfileReadinessReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const [statutoryResult, handoffResult] = await Promise.all([
    getHrAdminPayrollStatutorySetup(),
    getHrAdminPayrollFinanceHandoffSetup(),
  ]);

  return (
    <main className="shell shell--payroll-setup shell--payroll-statutory">
      <PageIntro
        eyebrow={statutoryResult.state === "live" && handoffResult.state === "live" ? "Live compliance readiness" : "Demo compliance readiness"}
        title="TDS E-file Readiness"
        description="Control-center view for Form 24Q readiness, TAN registration, PAN/declaration coverage, challan evidence, statutory artifacts, and provider filing gates."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports/compliance">
              Compliance hub
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-statutory">
              Statutory setup
            </Link>
            <Link className="button button--secondary" href="/hr-admin/reports/statutory-filing-status">
              Filing status
            </Link>
          </>
        }
        pills={["TDS", "Form 24Q", "Provider gated"]}
        showPills
      />

      <TdsEfileReadinessWorkspace
        artifacts={handoffResult.data.artifacts}
        deliveries={handoffResult.data.deliveries}
        statutory={statutoryResult.data}
      />
    </main>
  );
}
