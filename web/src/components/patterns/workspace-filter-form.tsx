"use client";

import { useEffect, useState, useSyncExternalStore, type FormEventHandler, type ReactNode } from "react";

const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

/** Module-owned controls and query names; shared GET, action and reset presentation. */
export function WorkspaceFilterForm({ action, children, label = "Filters", className = "", onSubmit }: {
  action: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  const interactive = useSyncExternalStore(subscribeToHydration, clientReady, serverReady);
  const [restoration, setRestoration] = useState(0);
  useEffect(() => {
    // A restored document can carry an unapplied browser-persisted draft.
    // defaultValue belongs to the committed server query, unlike that draft.
    let frame = 0;
    const restoreCommitted = () => {
      // Browsers restore persisted controls after pageshow/popstate dispatch.
      // Reset before the next paint, after that native restoration completes.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setRestoration(value => value + 1));
    };
    window.addEventListener("pageshow", restoreCommitted);
    window.addEventListener("popstate", restoreCommitted);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pageshow", restoreCommitted);
      window.removeEventListener("popstate", restoreCommitted);
    };
  }, []);
  return <form key={restoration} onSubmit={onSubmit} data-navigation-mode="document" action={action} method="get" aria-label={label} className={`workspace-filter-form ${className}`}><fieldset className="workspace-filter-fields" disabled={!interactive} aria-label={label}>{children}</fieldset></form>;
}
