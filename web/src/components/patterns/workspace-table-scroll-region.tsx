"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

/** Keep wide tables operable when a browser does not scroll focused regions with arrow keys. */
export function WorkspaceTableScrollRegion({
  label,
  className,
  children,
}: {
  label: string;
  className: string;
  children: ReactNode;
}) {
  const interactive = useSyncExternalStore(subscribeToHydration, clientReady, serverReady);

  // SSR keeps the named table readable. Advertise the keyboard scroll region
  // only once its handler is attached, so the first arrow key is not lost
  // during selective hydration (notably in WebKit).
  return (
    <div
      className={className}
      role={interactive ? "region" : undefined}
      aria-label={interactive ? label : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(event) => {
        if (
          event.target !== event.currentTarget ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey
        )
          return;
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        event.currentTarget.scrollLeft +=
          direction *
          Math.max(1, Math.round(event.currentTarget.clientWidth / 2));
      }}
    >
      {children}
    </div>
  );
}
