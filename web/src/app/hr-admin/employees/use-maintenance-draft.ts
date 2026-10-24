"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export type MaintenanceCallbacks = {
  onBusyChange?: (busy: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
};
const subscribe = () => () => {};

/** Keep explicit return, dirty protection and modal request state aligned. */
export function useMaintenanceDraft(value: unknown, busy: boolean, employeeId: string, cancelHref: string | undefined, callbacks: MaintenanceCallbacks) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const [baseline, setBaseline] = useState(() => JSON.stringify(value));
  const dirty = JSON.stringify(value) !== baseline;
  const leaving = useRef(false);
  const { onBusyChange, onDirtyChange } = callbacks;
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (cancelHref) return;
    function warn(event: BeforeUnloadEvent) {
      if (!leaving.current && (dirty || busy)) { event.preventDefault(); event.returnValue = ""; }
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, cancelHref, dirty]);
  function confirmDiscard() { return !busy && (!dirty || window.confirm("Discard unsaved changes?")); }
  function cancel() {
    if (busy) return;
    if (cancelHref) window.dispatchEvent(new CustomEvent("hr-admin-modal:request-close"));
    else if (confirmDiscard()) { leaving.current = true; window.location.assign(new URL(`/hr-admin/employees?employeeId=${encodeURIComponent(employeeId)}`, window.location.origin)); }
  }
  return { ready, dirty, cancel, confirmDiscard, markSaved: (next: unknown) => setBaseline(JSON.stringify(next)) };
}
