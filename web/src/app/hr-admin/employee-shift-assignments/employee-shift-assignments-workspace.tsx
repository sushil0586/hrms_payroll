"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { useSearchParams } from "next/navigation";

import { ActionFeedbackReceipt, rememberActionSuccess } from "@/components/patterns/action-feedback-receipt";
import { EmployeeShiftAssignmentsWorkbench } from "./employee-shift-assignments-workbench";
import type { HrAdminEmployeeShiftAssignment, HrAdminPolicyWorkbenchOptions } from "@/lib/types";
import { ScopedResourceError, useScopedWorkspaceResource } from "@/lib/ui/use-scoped-workspace-resource";

type Query = { q: string; kind: string; primary: string; risk: string; page: number; page_size: number };
type Data = { items: HrAdminEmployeeShiftAssignment[]; total_count: number; total_pages?: number; page: number; page_size: number; state: "live" | "demo" };
type Modal = { mode: "" | "create" | "edit"; id: string };
const subscribe = () => () => undefined;
const number = (value: string | null, fallback: number) => { const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback; };
function readQuery(): Query { const p = new URLSearchParams(window.location.search); return { q: p.get("q") || "", kind: p.get("kind") || "all", primary: p.get("primary") || "all", risk: p.get("risk") || "all", page: number(p.get("page"), 1), page_size: Math.min(number(p.get("page_size"), 10), 100) }; }
function readModal(): Modal { const p = new URLSearchParams(window.location.search); const id = p.get("editAssignment") || ""; return id ? { mode: "edit", id } : p.get("assignmentModal") === "create" ? { mode: "create", id: "" } : { mode: "", id: "" }; }
function href(query: Query) { const p = new URLSearchParams(); if (query.q) p.set("q", query.q); if (query.kind !== "all") p.set("kind", query.kind); if (query.primary !== "all") p.set("primary", query.primary); if (query.risk !== "all") p.set("risk", query.risk); if (query.page !== 1) p.set("page", String(query.page)); if (query.page_size !== 10) p.set("page_size", String(query.page_size)); return `/hr-admin/employee-shift-assignments${p.size ? `?${p}` : ""}`; }

function resolveCatalogQuery(query: Query, data: Data): Query { return { ...query, page: data.page, page_size: data.page_size }; }

export function EmployeeShiftAssignmentsWorkspace({ initialData, initialQuery, initialModal, initialEditItem, options, canManagePolicies }: { initialData: Data; initialQuery: Query; initialModal: Modal; initialEditItem?: HrAdminEmployeeShiftAssignment | null; options: Pick<HrAdminPolicyWorkbenchOptions, "shifts">; canManagePolicies: boolean }) {
  const historySearch = useSearchParams().toString();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [modal, setModal] = useState(initialModal);
  const request = useCallback(async (query: Query, signal: AbortSignal) => { const p = new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)])); const response = await fetch(`/api/hr-admin/employee-shift-assignments/workspace?${p}`, { cache: "no-store", signal }); const payload = await response.json().catch(() => ({})); if (!response.ok || !Array.isArray((payload as Data).items)) throw new ScopedResourceError(typeof payload.detail === "string" ? payload.detail : "Shift assignments could not be updated.", response.status); return payload as Data; }, []);
  const historyHref = useCallback((query: Query) => href(query), []);
  const resource = useScopedWorkspaceResource({ initialData, initialQuery, request, historyHref, readHistoryQuery: readQuery, resolveQuery: resolveCatalogQuery, fallbackError: "Shift assignments could not be updated. The last confirmed page is still shown." });
  useEffect(() => { const reconcileImport = () => { void resource.load(resource.query, "none"); }; window.addEventListener("hrms:employee-shift-assignments-changed", reconcileImport); return () => window.removeEventListener("hrms:employee-shift-assignments-changed", reconcileImport); }, [resource]);
  const { query: committedQuery, load: restoreQuery } = resource;
  const restoredSearchRef = useRef(historySearch);
  useEffect(() => {
    // Next can restore a cached route without retaining the previous popstate listener.
    // Reconcile its committed URL with the scoped resource after that restoration.
    // A clamped page can intentionally differ from the URL. Restore once per
    // committed URL transition, never again merely because a read normalized it.
    if (restoredSearchRef.current === historySearch) return;
    restoredSearchRef.current = historySearch;
    const restored = readQuery();
    if (JSON.stringify(restored) !== JSON.stringify(committedQuery)) {
      void restoreQuery(restored, "none", "history");
    }
  }, [historySearch, restoreQuery, committedQuery]);
  useEffect(() => { const restore = () => setModal(readModal()); window.addEventListener("popstate", restore); return () => window.removeEventListener("popstate", restore); }, []);
  const currentParams = useMemo(() => Object.fromEntries(Object.entries(resource.query).map(([key, value]) => [key, String(value)])), [resource.query]);
  const changeQuery = (updates: Record<string, string>) => { const next = { ...resource.query, ...updates, page: number(updates.page ?? String(resource.query.page), 1), page_size: Math.min(number(updates.page_size ?? String(resource.query.page_size), 10), 100) }; void resource.load(next, "push"); };
  const writeModal = (next: Modal) => { const url = new URL(window.location.href); url.searchParams.delete("assignmentModal"); url.searchParams.delete("editAssignment"); if (next.mode === "create") url.searchParams.set("assignmentModal", "create"); if (next.mode === "edit") url.searchParams.set("editAssignment", next.id); window.history.pushState(null, "", `${url.pathname}${url.search}`); setModal(next); };
  const reconcile = useCallback(async (message: string) => { const result = await resource.load(resource.query, "none"); if (result.ok) { writeModal({ mode: "", id: "" }); rememberActionSuccess(window.location.pathname, "assignment-catalog", "Action saved.", message); } return result.ok; }, [resource]);
  const totalPages = resource.data.total_pages ?? Math.max(1, Math.ceil(resource.data.total_count / resource.data.page_size));
  return <div data-local-update-hydrated={hydrated ? "true" : "false"} aria-busy={resource.isPending || undefined}>
    <ActionFeedbackReceipt recordIds={["assignment-catalog", ...resource.data.items.map(item => item.id)]} />
    {resource.error ? <div className="notice notice--error" role="alert"><strong>Assignment update failed.</strong><span>{resource.error}</span><button className="button button--secondary button--compact" onClick={() => void resource.load(resource.query, "none")} type="button">Retry</button></div> : null}
    <EmployeeShiftAssignmentsWorkbench canManagePolicies={canManagePolicies} currentParams={currentParams} editItem={initialEditItem} items={resource.data.items} options={options} page={resource.data.page} pageSize={resource.data.page_size} state={resource.data.state} totalCount={resource.data.total_count} totalPages={totalPages} pending={resource.isPending} modalMode={modal.mode} editAssignmentId={modal.id} onQueryChange={changeQuery} onOpenCreate={() => writeModal({ mode: "create", id: "" })} onOpenEdit={(id) => writeModal({ mode: "edit", id })} onCloseModal={() => writeModal({ mode: "", id: "" })} onReconcile={reconcile} />
  </div>;
}
