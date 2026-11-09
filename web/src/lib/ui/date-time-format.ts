/** Stable server/browser presentation; ICU punctuation/day-period casing must not change SSR text. */
export function formatWorkspaceDateTime(value: string | null | undefined, timeZone = "Asia/Kolkata"): string {
  if (!value) return "Not available";
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return "Not available";
  const parts = new Intl.DateTimeFormat("en-GB-u-nu-latn", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hour = Number(part("hour"));
  return `${part("day")} ${months[Number(part("month")) - 1]} ${part("year")}, ${hour % 12 || 12}:${part("minute")} ${hour >= 12 ? "pm" : "am"}`;
}

/** Stable date-only presentation for server and browser rendered workspace content. */
export function formatWorkspaceDate(value: string | null | undefined, timeZone = "Asia/Kolkata"): string {
  if (!value) return "Not available";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // A calendar date is not a UTC instant and must not move with the tenant timezone.
  const calendarDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (calendarDate) {
    const [, year, month, day] = calendarDate;
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number(year) < 1 || !Number.isFinite(parsed.getTime()) || parsed.getUTCFullYear() !== Number(year) || parsed.getUTCMonth() + 1 !== Number(month) || parsed.getUTCDate() !== Number(day)) return "Not available";
    return `${day} ${months[Number(month) - 1]} ${year}`;
  }
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return "Not available";
  const parts = new Intl.DateTimeFormat("en-GB-u-nu-latn", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? "";
  return `${part("day")} ${months[Number(part("month")) - 1]} ${part("year")}`;
}
