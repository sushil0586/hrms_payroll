import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDashboard } from "@/lib/api";
import { reportCatalog } from "@/lib/report-catalog";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportFamilyWorkspace } from "../report-family-workspace";
import { ReportInsightsStrip } from "../report-insights-strip";

const groups = [
  { key: "all", label: "All HR Core", reports: ["workforce", "document-compliance", "lifecycle-queue", "lifecycle-aging"] },
  { key: "workforce", label: "Workforce", reports: ["workforce"] },
  { key: "documents", label: "Documents", reports: ["document-compliance"] },
  { key: "lifecycle", label: "Lifecycle", reports: ["lifecycle-queue", "lifecycle-aging"] },
];

export default async function HrCoreReportsPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });
  const dashboardResult = await getHrAdminDashboard();
  const { overview, workforce, documents } = dashboardResult.data;
  const reports = reportCatalog.filter((report) => report.category === "HR Core");

  return (
    <main className="shell">
      <PageIntro
        eyebrow={dashboardResult.state === "live" ? "Live HR core reports" : "Demo HR core reports"}
        title="HR Core Reports"
        description="Workforce, document compliance, and lifecycle reports are separated from payroll and statutory reports for cleaner daily HR operations."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">All reports</Link>
            <Link className="button button--secondary" href="/hr-admin/employees">Employees</Link>
            <Link className="button button--secondary" href="/hr-admin/employee-documents">Documents</Link>
          </>
        }
        pills={["Workforce", "Documents", "Lifecycle"]}
        showPills
      />

      <ReportInsightsStrip
        current="workforce"
        eyebrow="HR reports"
        title="HR core report workspace"
        description="Open the right HR report without scanning payroll, compliance, or provider reporting rows."
        metrics={[
          { label: "reports", value: reports.length, tone: "neutral" },
          { label: "employees", value: overview.total_employees, tone: "neutral" },
          { label: "joiners", value: workforce.joiners_this_month, tone: "ready" },
          { label: "expiring docs", value: documents.expiring_in_30_days, tone: documents.expiring_in_30_days ? "warning" : "ready" },
        ]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Active employees" value={overview.active_employees} trend="Workforce base" />
          <MetricTile label="Departments" value={workforce.department_headcount.length} trend="Reporting slices" />
          <MetricTile label="Pending approvals" value={overview.pending_approvals} trend="Workflow load" />
          <MetricTile label="Expiring documents" value={documents.expiring_in_30_days} trend="Compliance follow-up" />
        </div>
      </section>

      <ReportFamilyWorkspace reports={reports} groups={groups} />
    </main>
  );
}
