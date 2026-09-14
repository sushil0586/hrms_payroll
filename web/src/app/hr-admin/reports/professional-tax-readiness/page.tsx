import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollFinanceHandoffSetup, getHrAdminPayrollStatutorySetup } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ProfessionalTaxReadinessWorkspace } from "./professional-tax-readiness-workspace";

export default async function ProfessionalTaxReadinessReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const [statutoryResult, handoffResult] = await Promise.all([
    getHrAdminPayrollStatutorySetup(),
    getHrAdminPayrollFinanceHandoffSetup(),
  ]);

  return (
    <main className="shell shell--payroll-setup shell--payroll-statutory">
      <PageIntro
        eyebrow={statutoryResult.state === "live" && handoffResult.state === "live" ? "Live compliance readiness" : "Demo compliance readiness"}
        title="Professional Tax Readiness"
        description="Control-center view for Professional Tax setup, state coverage, employer registration, filing calendar, deduction artifacts, source hash evidence, and provider filing gates."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports/compliance">Compliance hub</Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-statutory">Statutory setup</Link>
            <Link className="button button--secondary" href="/hr-admin/reports/challan-reconciliation">Challan reconciliation</Link>
          </>
        }
        pills={["PT", "State return", "Provider gated"]}
        showPills
      />

      <ProfessionalTaxReadinessWorkspace
        artifacts={handoffResult.data.artifacts}
        deliveries={handoffResult.data.deliveries}
        statutory={statutoryResult.data}
      />
    </main>
  );
}
