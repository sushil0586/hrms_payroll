"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { ScopedResourceError, useScopedWorkspaceResource } from "@/lib/ui/use-scoped-workspace-resource";
import type { HrAdminLeavePolicy, HrAdminPolicyOptions } from "@/lib/types";
import { createEmptyLeavePolicyValue, leavePolicyToFormValue } from "./form-values";
import { LeavePolicyForm } from "./leave-policy-form";
import { LeavePolicyList } from "./leave-policy-list";

type Data = { items: HrAdminLeavePolicy[]; options: HrAdminPolicyOptions; state: "live" | "demo" };
type Modal = { mode: "" | "create" | "edit"; id: string };
const subscribe = () => () => undefined;
function readModal(): Modal { const params = new URLSearchParams(window.location.search); const id = params.get("editLeavePolicy") || ""; return id ? { mode: "edit", id } : params.get("leavePolicyModal") === "create" ? { mode: "create", id: "" } : { mode: "", id: "" }; }

export function LeavePoliciesWorkspace({ initialData, canManagePolicies, initialModal }: { initialData: Data; canManagePolicies: boolean; initialModal: Modal }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [modal, setModal] = useState(initialModal);
  const request = useCallback(async (_query: Record<string, never>, signal: AbortSignal) => {
    const response = await fetch("/api/hr-admin/leave-policies/workspace", { cache: "no-store", signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray((payload as Data).items)) throw new ScopedResourceError(typeof payload.detail === "string" ? payload.detail : "Leave policies could not be updated.", response.status);
    return payload as Data;
  }, []);
  const resource = useScopedWorkspaceResource({ initialData, initialQuery: {}, request, fallbackError: "Leave policies could not be updated. The last confirmed catalog is still shown." });
  useEffect(() => { const restore = () => setModal(readModal()); window.addEventListener("popstate", restore); return () => window.removeEventListener("popstate", restore); }, []);
  const writeModal = (next: Modal) => { const url = new URL(window.location.href); url.searchParams.delete("leavePolicyModal"); url.searchParams.delete("editLeavePolicy"); if (next.mode === "create") url.searchParams.set("leavePolicyModal", "create"); if (next.mode === "edit") url.searchParams.set("editLeavePolicy", next.id); window.history.pushState(window.history.state, "", `${url.pathname}${url.search}`); setModal(next); };
  const reconcile = useCallback(async () => { const result = await resource.load({}, "none"); if (result.ok) writeModal({ mode: "", id: "" }); return result.ok; }, [resource]);
  const editItem = modal.mode === "edit" ? resource.data.items.find((item) => item.id === modal.id) ?? null : null;
  return <div data-local-update-hydrated={hydrated ? "true" : "false"} aria-busy={resource.isPending || undefined}>
    {resource.error ? <div className="notice notice--error" role="alert"><strong>Leave policy update failed.</strong><span>{resource.error}</span><button className="button button--secondary button--compact" onClick={() => void resource.load({}, "none")} type="button">Retry</button></div> : null}
    <LeavePolicyList canManagePolicies={canManagePolicies} policies={resource.data.items} pending={resource.isPending} onOpenCreate={() => writeModal({ mode: "create", id: "" })} onOpenEdit={(id) => writeModal({ mode: "edit", id })} onReconcile={async () => { await reconcile(); }} />
    {canManagePolicies && (modal.mode === "create" || editItem) ? <HrAdminActionModal closeHref="/hr-admin/leave-policies" description="Required fields are marked with an asterisk. Preview, validation, and governance locks remain active." eyebrow="Leave setup" labelledBy="leave-policy-modal-title" onClose={() => writeModal({ mode: "", id: "" })} title={modal.mode === "create" ? "Create leave policy" : "Edit leave policy"}>
      {modal.mode === "create" ? <LeavePolicyForm initialValue={createEmptyLeavePolicyValue(resource.data.options.leave_policy_statuses[0]?.value || "draft", resource.data.options.accrual_frequencies[0]?.value || "none")} mode="create" options={resource.data.options} onSaved={reconcile} /> : editItem ? <LeavePolicyForm initialValue={leavePolicyToFormValue(editItem)} item={editItem} itemId={editItem.id} mode="edit" options={resource.data.options} onSaved={reconcile} /> : null}
    </HrAdminActionModal> : null}
  </div>;
}
