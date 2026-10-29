"use client";

import { useState } from "react";

import type { HrAdminGovernanceFields } from "@/lib/types";

type Props = {
  item: HrAdminGovernanceFields;
  detachPath?: string;
  onDetached?: () => Promise<boolean> | boolean;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Unable to update platform governance state.";
  }
  return String((payload as Record<string, unknown>).detail || "Unable to update platform governance state.");
}

export function PlatformGovernanceFormBanner({ item, detachPath, onDetached }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [detached, setDetached] = useState(false);

  if (!item.governance_label && !item.lineage_summary) {
    return null;
  }

  async function handleDetach() {
    if (!detachPath) return;
    setError("");
    setIsSubmitting(true);

    let response: Response;
    try {
      response = await fetch(detachPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      setError("Unable to reach the server. The detach was not confirmed; retry after checking the connection.");
      setIsSubmitting(false);
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }

    if (onDetached) {
      const reconciled = await onDetached();
      if (!reconciled) {
        setError("The detach was accepted, but the updated record could not be confirmed. Do not detach it again; retry the catalog read.");
        setIsSubmitting(false);
      }
      return;
    }
    setDetached(true);
    setIsSubmitting(false);
  }

  return (
    <div className="notice">
      <strong>{detached ? "Tenant managed" : item.governance_label || "Governance state"}</strong>
      <span className="muted">{detached ? "This record is now owned and editable by the tenant." : item.lineage_summary || "This record carries platform governance metadata."}</span>
      <div className="detail-grid" style={{ marginTop: 12 }}>
        <div className="detail-row">
          <span className="detail-label">Edit mode</span>
          <span className="detail-value">{detached ? "editable" : item.edit_mode || "editable"}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Locked fields</span>
          <span className="detail-value">{detached ? 0 : item.locked_field_count ?? 0}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Platform pack</span>
          <span className="detail-value">{detached ? "Tenant managed" : item.source_pack_code || "Tenant managed"}</span>
        </div>
      </div>
      {!detached && item.can_detach_from_platform && detachPath ? (
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
