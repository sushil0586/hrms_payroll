import Link from "next/link";

import { AttendanceRecordForm } from "@/app/hr-admin/attendance-records/attendance-record-form";
import { attendanceRecordToFormValue } from "@/app/hr-admin/attendance-records/form-values";
import { PageIntro } from "@/components/patterns/page-intro";
import {
  getHrAdminAttendanceOperationOptions,
  getHrAdminAttendanceRecord,
} from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEditAttendanceRecordPage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([
    getHrAdminAttendanceRecord(itemId),
    getHrAdminAttendanceOperationOptions(),
  ]);

  return (
    <main className="shell">
      <PageIntro
        eyebrow={itemResult.state === "live" && optionsResult.state === "live" ? "Live attendance record mode" : "Demo attendance record mode"}
        title="Edit attendance record"
        description="Adjust operational values and lock state for a day-level attendance row."
        actions={<Link className="button button--secondary" href="/hr-admin/attendance-records">Back to attendance records</Link>}
        pills={["Single-row correction", "Lock-state control", "Queue-linked editing"]}
      />
      <AttendanceRecordForm initialValue={attendanceRecordToFormValue(itemResult.data)} options={optionsResult.data} itemId={itemId} />
    </main>
  );
}
