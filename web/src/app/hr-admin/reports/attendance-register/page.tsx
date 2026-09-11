import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendanceRecords } from "@/lib/api";

import { AttendanceRegisterReportWorkspace } from "./attendance-register-report-workspace";

export default async function AttendanceRegisterReportPage() {
  const result = await getHrAdminAttendanceRecords({ page: 1, page_size: 500 });

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

      <AttendanceRegisterReportWorkspace items={result.data.items} />
    </main>
  );
}
