import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollFinanceHandoffSetup, getHrAdminPayrollStatutorySetup } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { PfEcrReadinessWorkspace } from "./pf-ecr-readiness-workspace";

export default async function PfEcrReadinessReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const [statutoryResult, handoffResult] = await Promise.all([
    getHrAdminPayrollStatutorySetup(),
    getHrAdminPayrollFinanceHandoffSetup(),
  ]);

  return (
    <main className="shell shell--payroll-setup shell--payroll-statutory">
      <PageIntro
        eyebrow={statutoryResult.state === "live" && handoffResult.state === "live" ? "Live compliance readiness" : "Demo compliance readiness"}
        title="PF ECR Readiness"
        description="Control-center view for provident fund ECR readiness, employer EPFO registration, UAN coverage, wage evidence, challan state, statutory artifacts, and provider filing gates."
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
            <Link className="button button--secondary" href="/hr-admin/reports/statutory-deductions">
              Deduction report
            </Link>
          </>
        }
        pills={["PF", "ECR", "Provider gated"]}
        showPills
      />

      <PfEcrReadinessWorkspace
        artifacts={handoffResult.data.artifacts}
        deliveries={handoffResult.data.deliveries}
        statutory={statutoryResult.data}
      />
    </main>
  );
}
