// Stable date labels across server/browser locales and timezones. No payroll calculations.
export function essDocumentDate(value: string | null) {
  if (!value) return "Not available";
  const date = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Not available";
  const [year, month, day] = date.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${months[Number(month) - 1]} ${year}`;
}

export function essMoney(value: unknown) {
  // Preserve the source decimal string without rounding, currency inference or zero fallback.
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value) ? value : "Not available";
}

// Presentation masking of an already authorized self projection; no reveal action.
export function maskEmployeeIdentifier(value: string | null | undefined) {
  return value ? `••••${value.slice(-4)}` : "Not recorded";
}
