"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { HrAdminGovernanceFields } from "@/lib/types";

type Props = {
  item: HrAdminGovernanceFields;
  detachPath?: string;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Unable to update platform governance state.";
  }
  return String((payload as Record<string, unknown>).detail || "Unable to update platform governance state.");
}

export function PlatformGovernanceFormBanner({ item, detachPath }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!item.governance_label && !item.lineage_summary) {
    return null;
  }

  async function handleDetach() {
    if (!detachPath) return;
    setError("");
    setIsSubmitting(true);

    const response = await fetch(detachPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="notice">
      <strong>{item.governance_label || "Governance state"}</strong>
      <span className="muted">{item.lineage_summary || "This record carries platform governance metadata."}</span>
      <div className="detail-grid" style={{ marginTop: 12 }}>
        <div className="detail-row">
          <span className="detail-label">Edit mode</span>
          <span className="detail-value">{item.edit_mode || "editable"}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Locked fields</span>
          <span className="detail-value">{item.locked_field_count ?? 0}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Platform pack</span>
          <span className="detail-value">{item.source_pack_code || "Tenant managed"}</span>
        </div>
      </div>
      {item.can_detach_from_platform && detachPath ? (
        <div className="form-actions-bar" style={{ marginTop: 12, paddingTop: 0 }}>
          <span className="muted">Detach this record if the tenant should own and edit it independently going forward.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--secondary" disabled={isSubmitting} onClick={handleDetach} type="button">
              {isSubmitting ? "Detaching..." : "Detach from platform"}
            </button>
          </div>
        </div>
      ) : null}
      {error ? <div style={{ marginTop: 12 }}><span className="muted">{error}</span></div> : null}
    </div>
  );
}
