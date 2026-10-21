export type AttendanceRecordFilters = {
  q: string; status: string; source: string; shift_id: string;
  lock_state: string; regularized_state: string; from_date: string; to_date: string;
  late_only: boolean; page: number; page_size: number;
};

export function attendanceDateError(from: string, to: string) {
  for (const [label, value] of [["From", from], ["To", to]]) {
    if (!value) continue;
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return `${label} date must be a valid calendar date.`;
  }
  return from && to && from > to ? "From date must be on or before to date." : "";
}

export function attendanceQueueHref(pathname: string, committed: Record<string, string | number | boolean | undefined>, overrides: Record<string, string | number | boolean | undefined> = {}) {
  const query = new URLSearchParams();
  Object.entries({ ...committed, ...overrides }).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== false) query.set(key, String(value));
  });
  return `${pathname}${query.size ? `?${query}` : ""}`;
}
