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
