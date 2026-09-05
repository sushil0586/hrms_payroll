import type { HrAdminGovernanceFields } from "@/lib/types";

type Props = {
  item: HrAdminGovernanceFields;
};

function getChipClass(item: HrAdminGovernanceFields) {
  switch (item.governance_state) {
    case "platform_locked":
    case "platform_approval_required":
      return "record-chip record-chip--danger";
    case "platform_editable":
    case "tenant_detached_clone":
      return "record-chip record-chip--accent";
    default:
      return "record-chip";
  }
}

export function PlatformGovernanceCard({ item }: Props) {
  if (!item.governance_state && !item.lineage_summary) {
    return null;
  }

  return (
    <>
      {item.governance_label ? <span className={getChipClass(item)}>{item.governance_label}</span> : null}
      {item.can_detach_from_platform ? <span className="record-chip">detach available</span> : null}
      {item.locked_field_count ? <span className="record-chip">{item.locked_field_count} locked field{item.locked_field_count === 1 ? "" : "s"}</span> : null}
    </>
  );
}

export function PlatformGovernanceNotice({ item }: Props) {
  if (!item.governance_label && !item.lineage_summary) {
    return null;
  }

  return (
    <div className="notice">
      <strong>{item.governance_label || "Governance state"}</strong>
      <span className="muted">{item.lineage_summary || "This record carries governance metadata."}</span>
    </div>
  );
}
