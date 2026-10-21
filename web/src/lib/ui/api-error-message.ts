const fieldLabels: Record<string, string> = {
  auto_approve_after_hours: "Automatic approval waiting hours",
  auto_approve_enabled: "Enable automatic approval",
  config_snapshot: "Policy settings",
  leave_type_id: "Leave type",
  leave_policy_id: "Leave policy",
  attachment_file: "Evidence file",
  attachment_reference: "Evidence reference",
  non_field_errors: "",
  detail: "",
  comment: "Decision note",
};

function fieldLabel(path: string[]) {
  return path.filter(part => !["config_snapshot", "non_field_errors", "detail"].includes(part))
    .map(part => fieldLabels[part] ?? (/^\d+$/.test(part) ? `Row ${Number(part) + 1}` : part.replaceAll("_", " ")))
    .filter(Boolean).join(" · ").replace(/^./, value => value.toUpperCase());
}

/** Keep field context, including nested DRF serializer errors; never stringify objects. */
export function apiValidationErrors(payload: unknown): Array<{ path: string; message: string }> {
  const errors: Array<{ path: string; message: string }> = [];
  function visit(value: unknown, path: string[], depth: number) {
    if (depth > 8 || errors.length >= 12) return;
    if (typeof value === "string" && value.trim()) {
      errors.push({ path: path.join("."), message: value.trim() });
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, typeof item === "object" && item !== null ? [...path, String(index)] : path, depth + 1));
    } else if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, item]) => visit(item, [...path, key], depth + 1));
    }
  }
  visit(payload, [], 0);
  return errors;
}

export function apiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const fields = payload as Record<string, unknown>;
  const conflict = fields.conflict_check as { summary?: unknown } | undefined;
  if (typeof conflict?.summary === "string" && conflict.summary) return conflict.summary;
  if (typeof fields.detail === "string" && fields.detail) return fields.detail;
  const errors = apiValidationErrors(payload).map(({ path, message }) => {
    const label = fieldLabel(path.split("."));
    return label ? `${label}: ${message}` : message;
  });
  return [...new Set(errors)].join(" ") || fallback;
}

/** Only allow known editor fields to become inline validation errors. */
export function apiFieldErrors<Field extends string>(payload: unknown, fields: readonly Field[], aliases: Readonly<Record<string, Field>> = {}) {
  const result: Partial<Record<Field, string>> = {};
  for (const { path, message } of apiValidationErrors(payload)) {
    const field = fields.find(candidate => candidate === path)
      ?? (aliases[path] && fields.includes(aliases[path]) ? aliases[path] : undefined);
    if (field) result[field] = result[field] ? `${result[field]} ${message}` : message;
  }
  return result;
}

export const unconfirmedMutationMessage = "We could not confirm the outcome. Check the latest records before trying again to avoid submitting twice.";
export const networkMutationMessage = `Unable to reach the server. ${unconfirmedMutationMessage}`;

/** Transport/server failures cannot prove that a write was rolled back. */
export function mutationErrorMessage(payload: unknown, status: number, fallback: string) {
  if (status === 0 || status >= 500) return unconfirmedMutationMessage;
  if (status === 401) return "Your session has expired. Sign in again, then check the latest record before retrying.";
  if (status === 403) return apiErrorMessage(payload, "You do not have permission for this action. Contact your HR administrator if access is needed.");
  if (status === 429) return "Too many attempts. Wait a moment, then check the latest record before retrying.";
  if (status === 409) return apiErrorMessage(payload, "This record changed or conflicts with another record. Refresh and review its current state before retrying.");
  return apiErrorMessage(payload, fallback);
}
