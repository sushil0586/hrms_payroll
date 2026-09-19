import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendanceRegularizations } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportInsightsStrip } from "../report-insights-strip";
import { AttendanceExceptionsReportWorkspace } from "./attendance-exceptions-report-workspace";

export default async function AttendanceExceptionsReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const result = await getHrAdminAttendanceRegularizations({ page: 1, page_size: 500 });
  const items = result.data.items;
  const pendingCount = items.filter((item) => item.status === "pending").length;
  const rejectedCount = items.filter((item) => item.status === "rejected").length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live attendance report" : "Demo attendance report"}
        title="Attendance Exceptions SLA Report"
        description="Regularization aging, requested corrections, approval SLA, workflow references, and payroll impact."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/reports/attendance-register">
              Attendance register
            </Link>
            <Link className="button button--primary" href="/hr-admin/attendance-regularizations">
              Review queue
            </Link>
          </>
        }
        pills={["Regularizations", "SLA", "Payroll impact"]}
        showPills
      />

      <ReportInsightsStrip
        current="time"
        eyebrow="Time exception report"
        title="Attendance exception SLA evidence"
        description="Track regularization aging, requested corrections, approval SLA, workflow references, and payroll impact."
        metrics={[
          { label: "requests", value: items.length, tone: "neutral" },
          { label: "pending", value: pendingCount, tone: pendingCount ? "warning" : "ready" },
          { label: "rejected", value: rejectedCount, tone: rejectedCount ? "blocked" : "ready" },
          { label: "source", value: result.state === "live" ? "Live" : "Demo", tone: result.state === "live" ? "ready" : "warning" },
        ]}
      />

      <AttendanceExceptionsReportWorkspace items={items} />
    </main>
  );
}
