import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminEmployees } from "@/lib/api";

import { WorkforceReportWorkspace } from "./workforce-report-workspace";

export default async function WorkforceReportPage() {
  const result = await getHrAdminEmployees();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live HR core report" : "Demo HR core report"}
        title="Employee Master Report"
        description="Workforce structure, manager coverage, access readiness, and organization mapping evidence."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/employees">
              Employee masters
            </Link>
            <Link className="button button--primary" href="/hr-admin/employees/new">
              New employee
            </Link>
          </>
        }
        pills={["Workforce", "Manager coverage", "Access readiness"]}
        showPills
      />

      <WorkforceReportWorkspace employees={result.data} />
    </main>
  );
}
