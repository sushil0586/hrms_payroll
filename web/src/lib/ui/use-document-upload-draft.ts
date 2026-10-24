"use client";

import { useEffect, useRef } from "react";

export function documentUploadSnapshot(value: { file: File | null; [key: string]: unknown }) {
  const file = value.file;
  return JSON.stringify({ ...value, file: file ? { name: file.name, size: file.size, type: file.type, lastModified: file.lastModified } : null });
}

/** Keep upload drafts and in-flight writes guarded across role-specific forms. */
export function useDocumentUploadDraft(dirty: boolean, busy: boolean) {
  const leaving = useRef(false);
  useEffect(() => {
    function unload(event: BeforeUnloadEvent) {
      if (!leaving.current && (dirty || busy)) { event.preventDefault(); event.returnValue = ""; }
    }
    function navigate(event: MouseEvent) {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!link || leaving.current || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (busy || (dirty && !window.confirm("Discard unsaved changes?"))) { event.preventDefault(); event.stopImmediatePropagation(); }
      else if (dirty) { leaving.current = true; window.setTimeout(() => { leaving.current = false; }, 1000); }
    }
    window.addEventListener("beforeunload", unload);
    window.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); window.removeEventListener("click", navigate, true); };
  }, [busy, dirty]);
  return { complete: (href: string) => { leaving.current = true; window.location.assign(new URL(href, window.location.origin)); }, cancel: (href: string) => {
    if (!busy && (!dirty || window.confirm("Discard unsaved changes?"))) { leaving.current = true; window.location.assign(new URL(href, window.location.origin)); }
  } };
}
