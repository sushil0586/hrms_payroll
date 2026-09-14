import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollFinanceHandoffSetup, getHrAdminPayrollStatutorySetup } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { EsicContributionReadinessWorkspace } from "./esic-contribution-readiness-workspace";

export default async function EsicContributionReadinessReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const [statutoryResult, handoffResult] = await Promise.all([
    getHrAdminPayrollStatutorySetup(),
    getHrAdminPayrollFinanceHandoffSetup(),
  ]);

  return (
    <main className="shell shell--payroll-setup shell--payroll-statutory">
      <PageIntro
        eyebrow={statutoryResult.state === "live" && handoffResult.state === "live" ? "Live compliance readiness" : "Demo compliance readiness"}
        title="ESIC Contribution Readiness"
        description="Control-center view for ESIC contribution readiness, employer registration, insured employee coverage, wage evidence, filing calendar, statutory artifacts, and provider filing gates."
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
        pills={["ESIC", "Contribution", "Provider gated"]}
        showPills
      />

      <EsicContributionReadinessWorkspace
        artifacts={handoffResult.data.artifacts}
        deliveries={handoffResult.data.deliveries}
        statutory={statutoryResult.data}
      />
    </main>
  );
}
