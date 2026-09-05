import type { HrAdminGovernanceFields } from "@/lib/types";

export function isGovernanceFieldLocked(item: HrAdminGovernanceFields | undefined, fieldPath: string) {
  const lockedFields = item?.platform_locked_fields ?? [];
  return lockedFields.some(
    (lockedPath) =>
      lockedPath === fieldPath ||
      lockedPath.startsWith(`${fieldPath}.`) ||
      (fieldPath === "config_snapshot" && (lockedPath === "config_snapshot" || lockedPath.startsWith("config_snapshot."))),
  );
}

export function GovernanceLockHint({ item, fieldPath }: { item?: HrAdminGovernanceFields; fieldPath: string }) {
  if (!isGovernanceFieldLocked(item, fieldPath)) {
    return null;
  }

  return <span className="muted">Locked by the platform baseline for this record.</span>;
}
