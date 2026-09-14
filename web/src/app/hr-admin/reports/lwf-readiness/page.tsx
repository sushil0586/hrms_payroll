import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollFinanceHandoffSetup, getHrAdminPayrollStatutorySetup } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { LwfReadinessWorkspace } from "./lwf-readiness-workspace";

export default async function LwfReadinessReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const [statutoryResult, handoffResult] = await Promise.all([
    getHrAdminPayrollStatutorySetup(),
    getHrAdminPayrollFinanceHandoffSetup(),
  ]);

  return (
    <main className="shell shell--payroll-setup shell--payroll-statutory">
      <PageIntro
        eyebrow={statutoryResult.state === "live" && handoffResult.state === "live" ? "Live compliance readiness" : "Demo compliance readiness"}
        title="LWF Readiness"
        description="Control-center view for Labour Welfare Fund setup, employee state coverage, employer registration, filing calendar, deduction artifacts, source hash evidence, and provider filing gates."
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
        pills={["LWF", "Labour welfare return", "Provider gated"]}
        showPills
      />

      <LwfReadinessWorkspace
        artifacts={handoffResult.data.artifacts}
        deliveries={handoffResult.data.deliveries}
        statutory={statutoryResult.data}
      />
    </main>
  );
}
