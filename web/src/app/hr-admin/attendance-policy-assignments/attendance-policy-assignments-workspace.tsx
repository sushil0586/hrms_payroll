"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { AttendancePolicyAssignmentsWorkbench } from "./attendance-policy-assignments-workbench";
import type { HrAdminPolicyWorkbenchOptions, HrAdminScopedAssignment } from "@/lib/types";
import { ScopedResourceError, useScopedWorkspaceResource } from "@/lib/ui/use-scoped-workspace-resource";

type Data = { items: HrAdminScopedAssignment[]; state: "live" | "demo" };
type Modal = { mode: "" | "create" | "edit"; id: string };
const subscribe = () => () => undefined;

function readModal(): Modal {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("editAssignment") || "";
  return id ? { mode: "edit", id } : params.get("assignmentModal") === "create" ? { mode: "create", id: "" } : { mode: "", id: "" };
}

export function AttendancePolicyAssignmentsWorkspace({ initialData, options, canManagePolicies, initialModal }: { initialData: Data; options: HrAdminPolicyWorkbenchOptions; canManagePolicies: boolean; initialModal: Modal }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [modal, setModal] = useState(initialModal);
  const request = useCallback(async (_query: Record<string, never>, signal: AbortSignal) => {
    const response = await fetch("/api/hr-admin/attendance-policy-assignments/workspace", { cache: "no-store", signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray((payload as Data).items)) throw new ScopedResourceError(typeof payload.detail === "string" ? payload.detail : "Attendance assignments could not be updated.", response.status);
    return payload as Data;
  }, []);
  const resource = useScopedWorkspaceResource({ initialData, initialQuery: {}, request, fallbackError: "Attendance assignments could not be updated. The last confirmed catalog is still shown." });
  useEffect(() => { const restore = () => setModal(readModal()); window.addEventListener("popstate", restore); return () => window.removeEventListener("popstate", restore); }, []);
  const writeModal = (next: Modal) => {
    const url = new URL(window.location.href); url.searchParams.delete("assignmentModal"); url.searchParams.delete("editAssignment");
    if (next.mode === "create") url.searchParams.set("assignmentModal", "create");
    if (next.mode === "edit") url.searchParams.set("editAssignment", next.id);
    window.history.pushState(window.history.state, "", `${url.pathname}${url.search}`); setModal(next);
  };
  const reconcile = useCallback(async () => (await resource.load({}, "none")).ok, [resource]);
  return <div data-local-update-hydrated={hydrated ? "true" : "false"} aria-busy={resource.isPending || undefined}>
    {resource.error ? <div className="notice notice--error" role="alert"><strong>Assignment update failed.</strong><span>{resource.error}</span><button className="button button--secondary button--compact" onClick={() => void resource.load({}, "none")} type="button">Retry</button></div> : null}
    <AttendancePolicyAssignmentsWorkbench items={resource.data.items} state={resource.data.state} options={options} canManagePolicies={canManagePolicies}
      modalMode={modal.mode} editAssignmentId={modal.id} pending={resource.isPending} onOpenCreate={() => writeModal({ mode: "create", id: "" })}
      onOpenEdit={(id) => writeModal({ mode: "edit", id })} onCloseModal={() => writeModal({ mode: "", id: "" })}
      onReconcile={reconcile}
    />
  </div>;
}
