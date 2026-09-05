import type { HrAdminAttendanceRecord, HrAdminAttendanceRecordWriteInput } from "@/lib/types";

export function attendanceRecordToFormValue(item: HrAdminAttendanceRecord): HrAdminAttendanceRecordWriteInput {
  return {
    status: item.status,
    source: item.source,
    shift_id: item.shift_id,
    check_in_at: item.check_in_at ? item.check_in_at.slice(0, 16) : null,
    check_out_at: item.check_out_at ? item.check_out_at.slice(0, 16) : null,
    work_duration_hours: item.work_duration_hours,
    overtime_hours: item.overtime_hours,
    late_minutes: item.late_minutes,
    early_exit_minutes: item.early_exit_minutes,
    is_regularized: item.is_regularized,
    is_locked: item.is_locked,
    notes: item.notes,
  };
}
