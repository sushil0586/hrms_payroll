import type { HrAdminHolidayCalendar, HrAdminHolidayCalendarWriteInput } from "@/lib/types";

export function holidayCalendarToFormValue(item: HrAdminHolidayCalendar): HrAdminHolidayCalendarWriteInput {
  return {
    code: item.code,
    name: item.name,
    legal_entity_id: item.legal_entity_id,
    branch_id: item.branch_id,
    location_id: item.location_id,
    year: item.year,
    is_active: item.is_active,
    holidays: item.holidays.map((holiday) => ({
      id: holiday.id,
      date: holiday.date,
      name: holiday.name,
      description: holiday.description,
      holiday_type: holiday.holiday_type,
      is_optional: holiday.is_optional,
    })),
  };
}

export function createEmptyHolidayCalendarValue(): HrAdminHolidayCalendarWriteInput {
  return {
    code: "",
    name: "",
    legal_entity_id: null,
    branch_id: null,
    location_id: null,
    year: new Date().getFullYear(),
    is_active: true,
    holidays: [],
  };
}
