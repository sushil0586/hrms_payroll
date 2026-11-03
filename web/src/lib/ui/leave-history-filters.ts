export type LeaveHistoryFilters = Partial<Record<"q" | "leave_type" | "period" | "date_from" | "date_to" | "month" | "day" | "sort", string>>;
const periods = new Set(["all", "upcoming", "past", "current", "this_year"]);
const sorts = new Set(["newest", "oldest", "leave_type", "status"]);

export function validLeaveDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Reject invalid URL filters visibly; never silently reinterpret a date. */
export function normalizeLeaveHistoryFilters(params: Record<string, string | string[] | undefined>) {
  const filters: LeaveHistoryFilters = {};
  const errors: string[] = [];
  for (const key of ["q", "leave_type", "period", "date_from", "date_to", "month", "day", "sort"] as const) {
    const raw = params[key];
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (!value || (key === "period" && value === "all")) continue;
    if ((key === "q" && value.length > 200) || (key === "leave_type" && value.length > 50)) errors.push("A search filter is too long. Shorten it and apply again.");
    else if (key === "period" && !periods.has(value)) errors.push("Choose a supported date period.");
    else if (key === "sort" && !sorts.has(value)) errors.push("Choose a supported sort order.");
    else if (["date_from", "date_to", "day"].includes(key) && !validLeaveDate(value)) errors.push("Enter valid dates in YYYY-MM-DD format.");
    else if (key === "month" && !validLeaveDate(`${value}-01`)) errors.push("Choose a valid calendar month.");
    else filters[key] = value;
  }
  if (filters.date_from && filters.date_to && filters.date_to < filters.date_from) errors.push("End date cannot be earlier than start date.");
  return { filters, errors };
}
