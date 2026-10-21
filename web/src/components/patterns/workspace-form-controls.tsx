"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

/** SSR fields must not accept edits before their controlled-form handlers exist. */
export function WorkspaceFormControls({ children }: { children: ReactNode }) {
  const interactive = useSyncExternalStore(subscribe, clientReady, serverReady);
  const controls = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    if (!interactive) return;
    const dialog = controls.current?.closest('[role="dialog"]');
    if (dialog && (document.activeElement === document.body || document.activeElement === dialog)) {
      controls.current?.querySelector<HTMLElement>('input:not([disabled]),select:not([disabled]),textarea:not([disabled])')?.focus();
    }
  }, [interactive]);
  return <fieldset ref={controls} disabled={!interactive} aria-busy={!interactive} className="workspace-form-controls">{children}</fieldset>;
}
