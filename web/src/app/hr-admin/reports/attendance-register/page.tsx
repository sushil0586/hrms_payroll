import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendanceRecords } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportInsightsStrip } from "../report-insights-strip";
import { AttendanceRegisterReportWorkspace } from "./attendance-register-report-workspace";

export default async function AttendanceRegisterReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const result = await getHrAdminAttendanceRecords({ page: 1, page_size: 500 });
  const items = result.data.items;
  const exceptionCount = items.filter((item) => item.status === "absent" || item.late_minutes > 0 || item.early_exit_minutes > 0 || item.is_regularized).length;
  const lockedCount = items.filter((item) => item.is_locked).length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live attendance report" : "Demo attendance report"}
        title="Daily Attendance Register"
        description="Daily attendance status, capture source, shift, punch, exception, lock, and payroll-readiness evidence."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/attendance-operations">
              Attendance operations
            </Link>
            <Link className="button button--primary" href="/hr-admin/attendance-records">
              Review records
            </Link>
          </>
        }
        pills={["Daily register", "Exceptions", "Payroll readiness"]}
        showPills
      />

      <ReportInsightsStrip
        current="time"
        eyebrow="Time report"
        title="Attendance register evidence"
        description="Review daily attendance status, source, shift, punch timing, exceptions, locks, and payroll-readiness evidence."
        metrics={[
          { label: "records", value: items.length, tone: "neutral" },
          { label: "exceptions", value: exceptionCount, tone: exceptionCount ? "warning" : "ready" },
          { label: "locked", value: lockedCount, tone: "ready" },
          { label: "source", value: result.state === "live" ? "Live" : "Demo", tone: result.state === "live" ? "ready" : "warning" },
        ]}
      />

      <AttendanceRegisterReportWorkspace items={items} />
    </main>
  );
}
