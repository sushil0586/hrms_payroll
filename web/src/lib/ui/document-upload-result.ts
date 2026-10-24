import type { HrAdminEmployeeDocument } from "@/lib/types";

/** A successful transport response still needs a stored-document acknowledgement. */
export function storedEmployeeDocument(payload: unknown): HrAdminEmployeeDocument | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Partial<HrAdminEmployeeDocument>;
  return typeof value.id === "string" && Boolean(value.id) && typeof value.artifact_id === "string" && Boolean(value.artifact_id) &&
    typeof value.file_name === "string" && Boolean(value.file_name) && typeof value.title === "string" &&
    typeof value.version_number === "number" && Number.isSafeInteger(value.version_number) && value.version_number > 0 &&
    ["pending", "verified"].includes(value.verification_status ?? "")
    ? value as HrAdminEmployeeDocument : null;
}
