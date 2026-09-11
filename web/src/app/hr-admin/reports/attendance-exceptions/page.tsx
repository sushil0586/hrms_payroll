import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendanceRegularizations } from "@/lib/api";

import { AttendanceExceptionsReportWorkspace } from "./attendance-exceptions-report-workspace";

export default async function AttendanceExceptionsReportPage() {
  const result = await getHrAdminAttendanceRegularizations({ page: 1, page_size: 500 });

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

      <AttendanceExceptionsReportWorkspace items={result.data.items} />
    </main>
  );
}
