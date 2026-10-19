"use client";

import { Suspense, use, type ReactNode } from "react";

let documentSettled = false;
let documentReady: Promise<void> | undefined;

function parsedDocument() {
  if (typeof document === "undefined" || documentSettled) return null;
  // Cache outside React: retrying a suspended hydration must reuse its promise.
  documentReady ??= new Promise<void>((resolve) => {
    const finish = () => requestAnimationFrame(() => {
      documentSettled = true;
      resolve();
    });
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", finish, { once: true });
    } else {
      finish();
    }
  });
  return documentReady;
}

function ParsedDocument({ children }: { children: ReactNode }) {
  const pending = parsedDocument();
  if (pending) use(pending);
  return children;
}

/** Keep SSR content, but hydrate the streamed shell after parsing and its reveal frame.
 * React's early host-claim race can otherwise discard valid, unfinished HTML.
 * Client navigation in the same document is not delayed. No framework internals are patched.
 */
export function WorkspaceHydrationBoundary({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  return <Suspense fallback={fallback}><ParsedDocument>{children}</ParsedDocument></Suspense>;
}
