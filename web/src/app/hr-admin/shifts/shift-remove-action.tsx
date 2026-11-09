"use client";

import { useRef, useState } from "react";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { mutationErrorMessage, networkMutationMessage } from "@/lib/ui/api-error-message";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";
import type { HrAdminShift } from "@/lib/types";

export function ShiftRemoveAction({ item, onRemoved }: { item: HrAdminShift; onRemoved?: (message: string) => Promise<boolean> | boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  async function remove() {
    if (busy.current || accepted) return;
    busy.current = true; setPending(true); setError("");
    try {
      const response = await fetch(`/api/hr-admin/shifts/${item.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setError(mutationErrorMessage(payload, response.status, "The shift could not be removed.")); return; }
      setAccepted(true);
      let confirmed = false;
      try { confirmed = (await onRemoved?.("Shift removed.")) === true; } catch { /* The delete already succeeded. */ }
      if (confirmed) setOpen(false);
      else setError("The shift was removed, but the catalog could not be confirmed. Do not remove it again; retry the catalog read.");
    } catch { setError(networkMutationMessage); }
    finally { busy.current = false; setPending(false); }
  }
  return <>
    <button className="button button--ghost" disabled={item.managed_by_platform || !onRemoved} onClick={event => { focusActionTrigger(event); setError(""); setOpen(true); }} type="button">Remove</button>
    {open ? <HrAdminActionModal closeHref="/hr-admin/shifts" labelledBy={`remove-shift-${item.id}`} title={`Remove ${item.name}?`} description="Only unused shifts can be permanently removed. Shifts referenced by other records must be deactivated instead." busy={pending} onClose={() => setOpen(false)}>
      {error ? <div className="notice notice--error" role="alert">{error}</div> : null}
      <div className="form-actions-bar"><button className="button button--secondary" disabled={pending} onClick={() => setOpen(false)} type="button">Cancel</button><button className="button button--danger" disabled={pending || accepted} onClick={() => void remove()} type="button">{pending ? "Removing shift…" : "Remove shift"}</button></div>
    </HrAdminActionModal> : null}
  </>;
}
