import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollReadiness } from "@/lib/api";
import { reportCatalog } from "@/lib/report-catalog";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportFamilyWorkspace } from "../report-family-workspace";
import { ReportInsightsStrip } from "../report-insights-strip";

const groups = [
  {
    key: "all",
    label: "All Payroll",
    reports: [
      "payroll-register",
      "payroll-input-exceptions",
      "salary-variance",
      "payroll-review-exceptions",
      "payroll-adjustments",
      "payroll-settlements",
      "payroll-close-readiness",
      "payslip-publication",
      "bank-advice",
      "finance-handoff-exceptions",
    ],
  },
  { key: "run", label: "Run Control", reports: ["payroll-register", "payroll-input-exceptions", "payroll-review-exceptions", "payroll-close-readiness"] },
  { key: "variance", label: "Variance", reports: ["salary-variance", "payroll-adjustments", "payroll-settlements"] },
  { key: "outputs", label: "Outputs", reports: ["payslip-publication", "bank-advice", "finance-handoff-exceptions"] },
];

export default async function PayrollReportsPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });
  const readinessResult = await getHrAdminPayrollReadiness();
  const reports = reportCatalog.filter((report) => report.category === "Payroll Finance");
  const readiness = readinessResult.data.summary;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={readinessResult.state === "live" ? "Live payroll reports" : "Demo payroll reports"}
        title="Payroll Reports"
        description="Payroll register, exception, adjustment, settlement, payslip, bank advice, and finance handoff reports without mixing HR core or statutory views."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">All reports</Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-readiness">Payroll control</Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-handoff">Finance handoff</Link>
          </>
        }
        pills={["Payroll", "Finance", "Outputs"]}
        showPills
      />

      <ReportInsightsStrip
        current="payroll"
        eyebrow="Payroll reports"
        title="Payroll finance report workspace"
        description="Review payroll evidence by run-control, variance, and output handoff workflows."
        metrics={[
          { label: "reports", value: reports.length, tone: "neutral" },
          { label: "employees", value: readiness.total_employees, tone: "neutral" },
          { label: "blocked", value: readiness.blocked, tone: readiness.blocked ? "blocked" : "ready" },
          { label: "warnings", value: readiness.warnings, tone: readiness.warnings ? "warning" : "ready" },
        ]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Employees in readiness" value={readiness.total_employees} trend="Payroll population" />
          <MetricTile label="Blocked employees" value={readiness.blocked} trend="Close risk" />
          <MetricTile label="Warning employees" value={readiness.warnings} trend="Review queue" />
          <MetricTile label="Report set" value={reports.length} trend="Payroll coverage" />
        </div>
      </section>

      <ReportFamilyWorkspace reports={reports} groups={groups} />
    </main>
  );
}
