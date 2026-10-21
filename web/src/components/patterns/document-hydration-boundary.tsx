"use client";

import { use, type ReactNode } from "react";

let parsedDocument: Promise<void> | undefined;

/** Keep streamed server HTML intact until the parser has installed its segments.
 * Use inside Suspense. Subsequent client navigations do not wait.
 * Temporary containment for React's streaming/parser hydration race (#37321).
 */
export function DocumentHydrationBoundary({ children }: { children: ReactNode }) {
  if (typeof document !== "undefined" && document.readyState === "loading") {
    parsedDocument ??= new Promise<void>(resolve => {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    });
    use(parsedDocument);
  }
  return children;
}
