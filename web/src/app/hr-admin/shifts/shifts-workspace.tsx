"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { ShiftsWorkbench } from "./shifts-workbench";
import type { HrAdminShift } from "@/lib/types";
import { ScopedResourceError, useScopedWorkspaceResource } from "@/lib/ui/use-scoped-workspace-resource";

type Data = { items: HrAdminShift[]; state: "live" | "demo" };
type Modal = { mode: "" | "create" | "edit"; id: string };
const subscribe = () => () => undefined;

function readModal(): Modal {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("editShift") || "";
  return id ? { mode: "edit", id } : params.get("shiftModal") === "create" ? { mode: "create", id: "" } : { mode: "", id: "" };
}

export function ShiftsWorkspace({ initialData, canManagePolicies, initialModal }: { initialData: Data; canManagePolicies: boolean; initialModal: Modal }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [modal, setModal] = useState(initialModal);
  const request = useCallback(async (_query: Record<string, never>, signal: AbortSignal) => {
    const response = await fetch("/api/hr-admin/shifts/workspace", { cache: "no-store", signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray((payload as Data).items)) throw new ScopedResourceError(typeof payload.detail === "string" ? payload.detail : "Shifts could not be updated.", response.status);
    return payload as Data;
  }, []);
  const resource = useScopedWorkspaceResource({ initialData, initialQuery: {}, request, fallbackError: "Shifts could not be updated. The last confirmed catalog is still shown." });
  useEffect(() => { const restore = () => setModal(readModal()); window.addEventListener("popstate", restore); return () => window.removeEventListener("popstate", restore); }, []);
  const writeModal = (next: Modal) => {
    const url = new URL(window.location.href); url.searchParams.delete("shiftModal"); url.searchParams.delete("editShift");
    if (next.mode === "create") url.searchParams.set("shiftModal", "create");
    if (next.mode === "edit") url.searchParams.set("editShift", next.id);
    window.history.pushState(window.history.state, "", `${url.pathname}${url.search}`); setModal(next);
  };
  const reconcile = useCallback(async () => { const result = await resource.load({}, "none"); if (result.ok) writeModal({ mode: "", id: "" }); return result.ok; }, [resource]);
  return <div data-local-update-hydrated={hydrated ? "true" : "false"} aria-busy={resource.isPending || undefined}>
    {resource.error ? <div className="notice notice--error" role="alert"><strong>Shift update failed.</strong><span>{resource.error}</span><button className="button button--secondary button--compact" onClick={() => void resource.load({}, "none")} type="button">Retry</button></div> : null}
    <ShiftsWorkbench items={resource.data.items} state={resource.data.state} canManagePolicies={canManagePolicies} modalMode={modal.mode} editShiftId={modal.id} pending={resource.isPending} onOpenCreate={() => writeModal({ mode: "create", id: "" })} onOpenEdit={(id) => writeModal({ mode: "edit", id })} onCloseModal={() => writeModal({ mode: "", id: "" })} onReconcile={reconcile} />
  </div>;
}
