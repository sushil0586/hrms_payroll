import type { HrAdminAttendancePolicy, HrAdminAttendancePolicyWriteInput } from "@/lib/types";

export function attendancePolicyToFormValue(item: HrAdminAttendancePolicy): HrAdminAttendancePolicyWriteInput {
  const derivation = item.config_snapshot.derivation;
  return {
    code: item.code,
    name: item.name,
    status: item.status,
    attendance_unit: item.attendance_unit,
    default_shift_id: item.default_shift_id,
    holiday_calendar_id: item.holiday_calendar_id,
    full_day_min_hours: item.full_day_min_hours,
    half_day_min_hours: item.half_day_min_hours,
    late_mark_after_minutes: item.late_mark_after_minutes,
    max_late_marks_in_period: item.max_late_marks_in_period,
    overtime_threshold_minutes: item.overtime_threshold_minutes,
    allow_manual_entry: item.allow_manual_entry,
    allow_web_checkin: item.allow_web_checkin,
    allow_mobile_checkin: item.allow_mobile_checkin,
    allow_geofenced_checkin: item.allow_geofenced_checkin,
    allow_regularization: item.allow_regularization,
    require_regularization_reason: item.require_regularization_reason,
    config_snapshot: {
      derivation: {
        enabled: derivation?.enabled ?? false,
        auto_mark_holiday: derivation?.auto_mark_holiday ?? true,
        auto_mark_weekly_off: derivation?.auto_mark_weekly_off ?? true,
        missing_punch_status: derivation?.missing_punch_status ?? "unknown",
        late_status_mode: derivation?.late_status_mode ?? "present",
        derive_overtime: derivation?.derive_overtime ?? true,
      },
    },
  };
}

export function createEmptyAttendancePolicyValue(defaultStatus: string, defaultUnit: string): HrAdminAttendancePolicyWriteInput {
  return {
    code: "",
    name: "",
    status: defaultStatus,
    attendance_unit: defaultUnit,
    default_shift_id: null,
    holiday_calendar_id: null,
    full_day_min_hours: "0.00",
    half_day_min_hours: "0.00",
    late_mark_after_minutes: 0,
    max_late_marks_in_period: 0,
    overtime_threshold_minutes: 0,
    allow_manual_entry: true,
    allow_web_checkin: true,
    allow_mobile_checkin: true,
    allow_geofenced_checkin: false,
    allow_regularization: true,
    require_regularization_reason: true,
    config_snapshot: {
      derivation: {
        enabled: false,
        auto_mark_holiday: true,
        auto_mark_weekly_off: true,
        missing_punch_status: "unknown",
        late_status_mode: "present",
        derive_overtime: true,
      },
    },
  };
}
