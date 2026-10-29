"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { ScopedResourceError, useScopedWorkspaceResource } from "@/lib/ui/use-scoped-workspace-resource";
import type { HrAdminLeaveType, HrAdminPolicyOptions } from "@/lib/types";
import { createEmptyLeaveTypeValue, leaveTypeToFormValue } from "./form-values";
import { LeaveTypeForm } from "./leave-type-form";
import { LeaveTypesWorkbench } from "./leave-types-workbench";

type Data = { items: HrAdminLeaveType[]; options: HrAdminPolicyOptions; state: "live" | "demo" };
type Modal = { mode: "" | "create" | "edit"; id: string };
const subscribe = () => () => undefined;

function readModal(): Modal {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("editLeaveType") || "";
  return id ? { mode: "edit", id } : params.get("leaveTypeModal") === "create" ? { mode: "create", id: "" } : { mode: "", id: "" };
}

export function LeaveTypesWorkspace({ initialData, canManagePolicies, initialModal }: { initialData: Data; canManagePolicies: boolean; initialModal: Modal }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [modal, setModal] = useState(initialModal);
  const request = useCallback(async (_query: Record<string, never>, signal: AbortSignal) => {
    const response = await fetch("/api/hr-admin/leave-types/workspace", { cache: "no-store", signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray((payload as Data).items)) throw new ScopedResourceError(typeof payload.detail === "string" ? payload.detail : "Leave types could not be updated.", response.status);
    return payload as Data;
  }, []);
  const resource = useScopedWorkspaceResource({ initialData, initialQuery: {}, request, fallbackError: "Leave types could not be updated. The last confirmed catalog is still shown." });
  useEffect(() => { const restore = () => setModal(readModal()); window.addEventListener("popstate", restore); return () => window.removeEventListener("popstate", restore); }, []);
  const writeModal = (next: Modal) => {
    const url = new URL(window.location.href); url.searchParams.delete("leaveTypeModal"); url.searchParams.delete("editLeaveType");
    if (next.mode === "create") url.searchParams.set("leaveTypeModal", "create");
    if (next.mode === "edit") url.searchParams.set("editLeaveType", next.id);
    window.history.pushState(window.history.state, "", `${url.pathname}${url.search}`); setModal(next);
  };
  const reconcile = useCallback(async () => { const result = await resource.load({}, "none"); if (result.ok) writeModal({ mode: "", id: "" }); return result.ok; }, [resource]);
  const editItem = modal.mode === "edit" ? resource.data.items.find((item) => item.id === modal.id) ?? null : null;
  return <div data-local-update-hydrated={hydrated ? "true" : "false"} aria-busy={resource.isPending || undefined}>
    {resource.error ? <div className="notice notice--error" role="alert"><strong>Leave type update failed.</strong><span>{resource.error}</span><button className="button button--secondary button--compact" onClick={() => void resource.load({}, "none")} type="button">Retry</button></div> : null}
    <LeaveTypesWorkbench canManagePolicies={canManagePolicies} leaveTypes={resource.data.items} pending={resource.isPending} onOpenCreate={() => writeModal({ mode: "create", id: "" })} onOpenEdit={(id) => writeModal({ mode: "edit", id })} onReconcile={async () => { await reconcile(); }} />
    {canManagePolicies && (modal.mode === "create" || editItem) ? <HrAdminActionModal closeHref="/hr-admin/leave-types" description="Required fields are marked with an asterisk. Validation and governance locks remain active." eyebrow="Leave setup" labelledBy="leave-type-modal-title" onClose={() => writeModal({ mode: "", id: "" })} title={modal.mode === "create" ? "Create leave type" : "Edit leave type"}>
      {modal.mode === "create" ? <LeaveTypeForm initialValue={createEmptyLeaveTypeValue(resource.data.options.leave_categories[0]?.value || "paid", resource.data.options.leave_units[0]?.value || "day")} mode="create" options={resource.data.options} onSaved={reconcile} /> : editItem ? <LeaveTypeForm initialValue={leaveTypeToFormValue(editItem)} item={editItem} itemId={editItem.id} mode="edit" options={resource.data.options} onSaved={reconcile} /> : null}
    </HrAdminActionModal> : null}
  </div>;
}
