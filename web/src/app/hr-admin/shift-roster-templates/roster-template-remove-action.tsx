"use client";

import { useRef, useState } from "react";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { mutationErrorMessage, networkMutationMessage } from "@/lib/ui/api-error-message";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";
import type { HrAdminShiftRosterTemplate } from "@/lib/types";

export function RosterTemplateRemoveAction({ item, onRemoved }: { item: HrAdminShiftRosterTemplate; onRemoved?: (message: string) => Promise<boolean> | boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  async function remove() {
    if (busy.current || accepted) return;
    busy.current = true; setPending(true); setError("");
    try {
      const response = await fetch(`/api/hr-admin/shift-roster-templates/${item.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setError(mutationErrorMessage(payload, response.status, "The roster template could not be removed.")); return; }
      setAccepted(true);
      let confirmed = false;
      try { confirmed = (await onRemoved?.("Roster template removed.")) === true; } catch { /* The delete already succeeded. */ }
      if (confirmed) setOpen(false);
      else setError("The roster template was removed, but the catalog could not be confirmed. Do not remove it again; retry the catalog read.");
    } catch { setError(networkMutationMessage); }
    finally { busy.current = false; setPending(false); }
  }
  return <>
    <button className="button button--ghost" disabled={item.status === "locked" || !onRemoved} onClick={event => { focusActionTrigger(event); setError(""); setOpen(true); }} type="button">Remove</button>
    {open ? <HrAdminActionModal closeHref="/hr-admin/shift-roster-templates" labelledBy={`remove-roster-${item.id}`} title={`Remove ${item.name}?`} description="Only unused templates can be permanently removed. Templates with rollout history cannot be removed." busy={pending} onClose={() => setOpen(false)}>
      {error ? <div className="notice notice--error" role="alert">{error}</div> : null}
      <div className="form-actions-bar"><button className="button button--secondary" disabled={pending} onClick={() => setOpen(false)} type="button">Cancel</button><button className="button button--danger" disabled={pending || accepted} onClick={() => void remove()} type="button">{pending ? "Removing template…" : "Remove template"}</button></div>
    </HrAdminActionModal> : null}
  </>;
}
