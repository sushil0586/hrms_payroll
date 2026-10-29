"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { HolidayCalendarsWorkbench } from "./holiday-calendars-workbench";
import type { HrAdminAttendanceOperationOptions, HrAdminHolidayCalendar } from "@/lib/types";
import { ScopedResourceError, useScopedWorkspaceResource } from "@/lib/ui/use-scoped-workspace-resource";

type Data = { items: HrAdminHolidayCalendar[]; state: "live" | "demo" };
type Modal = { mode: "" | "create" | "edit"; id: string };
const subscribe = () => () => undefined;
function readModal(): Modal { const p = new URLSearchParams(window.location.search); const id = p.get("editCalendar") || ""; return id ? { mode: "edit", id } : p.get("calendarModal") === "create" ? { mode: "create", id: "" } : { mode: "", id: "" }; }

export function HolidayCalendarsWorkspace({ initialData, options, canManagePolicies, initialModal }: { initialData: Data; options: HrAdminAttendanceOperationOptions; canManagePolicies: boolean; initialModal: Modal }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [modal, setModal] = useState(initialModal);
  const request = useCallback(async (_query: Record<string, never>, signal: AbortSignal) => {
    const response = await fetch("/api/hr-admin/holiday-calendars/workspace", { cache: "no-store", signal }); const payload = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray((payload as Data).items)) throw new ScopedResourceError(typeof payload.detail === "string" ? payload.detail : "Holiday calendars could not be updated.", response.status); return payload as Data;
  }, []);
  const resource = useScopedWorkspaceResource({ initialData, initialQuery: {}, request, fallbackError: "Holiday calendars could not be updated. The last confirmed catalog is still shown." });
  useEffect(() => { const restore = () => setModal(readModal()); window.addEventListener("popstate", restore); return () => window.removeEventListener("popstate", restore); }, []);
  const writeModal = (next: Modal) => { const url = new URL(window.location.href); url.searchParams.delete("calendarModal"); url.searchParams.delete("editCalendar"); if (next.mode === "create") url.searchParams.set("calendarModal", "create"); if (next.mode === "edit") url.searchParams.set("editCalendar", next.id); window.history.pushState(window.history.state, "", `${url.pathname}${url.search}`); setModal(next); };
  const reconcile = useCallback(async () => { const result = await resource.load({}, "none"); if (result.ok) writeModal({ mode: "", id: "" }); return result.ok; }, [resource]);
  return <div data-local-update-hydrated={hydrated ? "true" : "false"} aria-busy={resource.isPending || undefined}>
    {resource.error ? <div className="notice notice--error" role="alert"><strong>Calendar update failed.</strong><span>{resource.error}</span><button className="button button--secondary button--compact" onClick={() => void resource.load({}, "none")} type="button">Retry</button></div> : null}
    <HolidayCalendarsWorkbench canManagePolicies={canManagePolicies} items={resource.data.items} options={options} state={resource.data.state} modalMode={modal.mode} editCalendarId={modal.id} pending={resource.isPending} onOpenCreate={() => writeModal({ mode: "create", id: "" })} onOpenEdit={(id) => writeModal({ mode: "edit", id })} onCloseModal={() => writeModal({ mode: "", id: "" })} onReconcile={reconcile} />
  </div>;
}
