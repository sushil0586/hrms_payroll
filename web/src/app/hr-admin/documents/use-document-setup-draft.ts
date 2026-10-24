"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useDocumentSetupState } from "./document-setup-dialog";

const subscribe = () => () => {};

/** One draft contract for standalone and modal category/requirement editors. */
export function useDocumentSetupDraft(value: unknown, busy: boolean, compact: boolean, returnPath: string) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const state = useDocumentSetupState();
  const setBusy = state?.setBusy;
  const setDirty = state?.setDirty;
  const [baseline] = useState(() => JSON.stringify(value));
  const leaving = useRef(false);
  const submitting = useRef(false);
  const dirty = JSON.stringify(value) !== baseline;
  useEffect(() => { setBusy?.(busy); }, [busy, setBusy]);
  useEffect(() => { setDirty?.(dirty); }, [dirty, setDirty]);
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!leaving.current && (dirty || busy)) { event.preventDefault(); event.returnValue = ""; }
    }
    function navigate(event: MouseEvent) {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!anchor || leaving.current || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      if (busy || (dirty && !window.confirm("Discard unsaved changes?"))) { event.preventDefault(); event.stopImmediatePropagation(); }
      else if (dirty) { leaving.current = true; window.setTimeout(() => { leaving.current = false; }, 1000); }
    }
    function permitDeparture() { leaving.current = true; }
    window.addEventListener("document-setup:leaving", permitDeparture);
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("document-setup:leaving", permitDeparture); window.removeEventListener("beforeunload", beforeUnload); window.removeEventListener("click", navigate, true); };
  }, [busy, dirty]);
  function cancel() {
    if (busy || submitting.current) return;
    if (compact) window.dispatchEvent(new CustomEvent("hr-admin-modal:request-close"));
    else if (!dirty || window.confirm("Discard unsaved changes?")) { leaving.current = true; window.location.assign(new URL(returnPath, window.location.origin)); }
  }
  function saved() { leaving.current = true; window.location.assign(new URL(`${returnPath}${returnPath.includes("?") ? "&" : "?"}setup_saved=1`, window.location.origin)); }
  return { ready, cancel, saved, beginSubmit: () => { if (submitting.current) return false; submitting.current = true; return true; }, endSubmit: () => { submitting.current = false; } };
}
