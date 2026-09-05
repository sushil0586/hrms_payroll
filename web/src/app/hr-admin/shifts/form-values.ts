import type { HrAdminShift, HrAdminShiftWriteInput } from "@/lib/types";

export function shiftToFormValue(item: HrAdminShift): HrAdminShiftWriteInput {
  return {
    code: item.code,
    name: item.name,
    start_time: item.start_time.slice(0, 5),
    end_time: item.end_time.slice(0, 5),
    working_hours: item.working_hours,
    break_minutes: item.break_minutes,
    grace_in_minutes: item.grace_in_minutes,
    grace_out_minutes: item.grace_out_minutes,
    is_night_shift: item.is_night_shift,
    is_flexible: item.is_flexible,
    weekly_off_days: item.weekly_off_days ?? [],
    is_active: item.is_active,
  };
}

export function createEmptyShiftValue(): HrAdminShiftWriteInput {
  return {
    code: "",
    name: "",
    start_time: "09:00",
    end_time: "18:00",
    working_hours: "8.00",
    break_minutes: 30,
    grace_in_minutes: 0,
    grace_out_minutes: 0,
    is_night_shift: false,
    is_flexible: false,
    weekly_off_days: [],
    is_active: true,
  };
}
