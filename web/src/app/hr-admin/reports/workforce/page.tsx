import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminEmployees } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportInsightsStrip } from "../report-insights-strip";
import { WorkforceReportWorkspace } from "./workforce-report-workspace";

export default async function WorkforceReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const result = await getHrAdminEmployees();
  const employees = result.data;
  const activeCount = employees.filter((item) => item.employment_status === "active").length;
  const managerGapCount = employees.filter((item) => !item.reporting_manager && item.direct_reports_count === 0).length;

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

      <ReportInsightsStrip
        current="workforce"
        eyebrow="Workforce report"
        title="Employee master evidence"
        description="Inspect workforce structure, manager coverage, access readiness, organization mapping, and exportable employee master evidence."
        metrics={[
          { label: "employees", value: employees.length, tone: "neutral" },
          { label: "active", value: activeCount, tone: "ready" },
          { label: "manager gaps", value: managerGapCount, tone: managerGapCount ? "warning" : "ready" },
          { label: "source", value: result.state === "live" ? "Live" : "Demo", tone: result.state === "live" ? "ready" : "warning" },
        ]}
      />

      <WorkforceReportWorkspace employees={employees} />
    </main>
  );
}
