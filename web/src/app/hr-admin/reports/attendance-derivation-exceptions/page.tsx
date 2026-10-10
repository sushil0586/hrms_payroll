import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendanceRecords } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportInsightsStrip } from "../report-insights-strip";
import { AttendanceDerivationExceptionsReportWorkspace } from "./attendance-derivation-exceptions-report-workspace";

export default async function AttendanceDerivationExceptionsReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });
  const result = await getHrAdminAttendanceRecords({ page: 1, page_size: 500 });
  const items = result.data.items;
  const exceptionRows = items.filter((item) => {
    const summary = item.derivation_summary;
    return summary.warnings.length > 0 || summary.payroll_impact.payroll_impacting || summary.leave_collision_count > 0 || ["absent", "late", "half_day"].includes(item.status) || !summary.schedule_day_type;
  });
  const payrollImpacting = exceptionRows.filter((item) => item.derivation_summary.payroll_impact.payroll_impacting).length;

  return (
    <main className="shell hr-admin-compact-ui">
      <PageIntro
        eyebrow={result.state === "live" ? "Live attendance report" : "Demo attendance report"}
        title="Attendance Derivation Exceptions Report"
        description="Explainable attendance status derivation, payroll-impacting flags, warnings, and leave collision counts."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports/attendance">Attendance reports</Link>
            <Link className="button button--secondary" href="/hr-admin/reports/attendance-register">Attendance register</Link>
            <Link className="button button--primary" href="/hr-admin/attendance-records">Review records</Link>
          </>
        }
        pills={["Derivation evidence", "Payroll impact", "Source linked"]}
        showPills
      />

      <ReportInsightsStrip
        current="time"
        eyebrow="Attendance derivation report"
        title="Explainable attendance exceptions"
        description="Review why attendance status was derived, which rows carry payroll impact, and what evidence supports the result."
        metrics={[
          { label: "records", value: items.length, tone: "neutral" },
          { label: "exceptions", value: exceptionRows.length, tone: exceptionRows.length ? "warning" : "ready" },
          { label: "payroll impact", value: payrollImpacting, tone: payrollImpacting ? "blocked" : "ready" },
          { label: "source", value: result.state === "live" ? "Live" : "Demo", tone: result.state === "live" ? "ready" : "warning" },
        ]}
      />

      <AttendanceDerivationExceptionsReportWorkspace items={items} />
    </main>
  );
}
