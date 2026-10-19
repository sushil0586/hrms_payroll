"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent, MouseEvent, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type PendingNavigation = {
  destinationKey: string;
  focusHeading: boolean;
  id: number;
  label: string;
};
type NavigationFeedbackContextValue = {
  navigate: (href: string, label: string, target?: HTMLElement | null, options?: { scroll?: boolean }) => void;
};

const NavigationFeedbackContext = createContext<NavigationFeedbackContextValue | null>(null);
const FOCUS_INTENT_KEY = "hrms.workspace-navigation-focus";

function navigationLabel(element: HTMLElement) {
  return element.getAttribute("aria-label")?.trim()
    || element.querySelector<HTMLElement>(".nav-item__content strong, strong")?.textContent?.trim()
    || element.textContent?.replace(/\s+/g, " ").trim()
    || "requested view";
}

function localRegion(element: HTMLElement) {
  return element.closest<HTMLElement>(
    "[data-async-region], .queue-toolbar, .table-shell, .record-card, .pagination-panel, .panel-card-soft, .app-sidebar__nav, .mobile-workspace-nav__panel",
  );
}

function isSameDocumentHash(url: URL) {
  return url.pathname === window.location.pathname
    && url.search === window.location.search
    && Boolean(url.hash);
}

function destinationKey(url: URL) {
  return `${url.pathname}${url.search}`;
}

export function useWorkspaceNavigationFeedback() {
  return useContext(NavigationFeedbackContext)?.navigate ?? (() => undefined);
}

function NavigationFeedbackBoundary({ children, routeKey, documentNavigation }: { children: ReactNode; routeKey: string; documentNavigation: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingNavigation | null>(null);
  const activeRegionRef = useRef<HTMLElement | null>(null);
  const navigationIdRef = useRef(0);

  const clearPending = useCallback(() => {
    const region = activeRegionRef.current;
    if (region) {
      region.removeAttribute("aria-busy");
      region.removeAttribute("data-navigation-pending");
    }
    activeRegionRef.current = null;
    setPending(null);
  }, []);

  const navigate = useCallback((href: string, label: string, target: HTMLElement | null = null, options?: { scroll?: boolean }) => {
    const url = new URL(href, window.location.href);
    if (documentNavigation) {
      // A fresh authorized read avoids a completed RSC response leaving stale visible content.
      if (url.pathname !== window.location.pathname) sessionStorage.setItem(FOCUS_INTENT_KEY, destinationKey(url));
      const destination = new URL(`${url.pathname}${url.search}${url.hash}`, window.location.origin);
      window.location.assign(destination.href);
      return;
    }
    const nextRegion = target ? localRegion(target) : null;
    if (activeRegionRef.current && activeRegionRef.current !== nextRegion) {
      activeRegionRef.current.removeAttribute("aria-busy");
      activeRegionRef.current.removeAttribute("data-navigation-pending");
    }
    activeRegionRef.current = nextRegion;
    if (nextRegion) {
      nextRegion.setAttribute("aria-busy", "true");
      nextRegion.setAttribute("data-navigation-pending", "true");
    }
    const id = ++navigationIdRef.current;
    setPending({
      destinationKey: destinationKey(url),
      focusHeading: url.pathname !== window.location.pathname,
      id,
      label,
    });
    if (url.pathname !== window.location.pathname) sessionStorage.setItem(FOCUS_INTENT_KEY, destinationKey(url));
    router.push(`${url.pathname}${url.search}${url.hash}`, { scroll: options?.scroll });
  }, [documentNavigation, router]);

  useEffect(() => {
    if (sessionStorage.getItem(FOCUS_INTENT_KEY) !== routeKey) return;
    const focusHeading = () => {
      if (document.querySelector("[data-workspace-error]")) {
        sessionStorage.removeItem(FOCUS_INTENT_KEY);
        return true;
      }
      const heading = document.querySelector<HTMLElement>(".app-content--workspace main h1");
      if (!heading) return false;
      sessionStorage.removeItem(FOCUS_INTENT_KEY);
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      return true;
    };
    if (focusHeading()) return;
    const observer = new MutationObserver(() => {
      if (focusHeading()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [routeKey]);

  useEffect(() => {
    if (!pending) return;
    if (routeKey !== pending.destinationKey) return;
    requestAnimationFrame(() => {
      if (navigationIdRef.current !== pending.id) return;
      clearPending();
    });
  }, [clearPending, pending, routeKey]);

  useEffect(() => {
    const handlePageShow = () => {
      clearPending();
      const currentUrl = new URL(window.location.href);
      if (sessionStorage.getItem(FOCUS_INTENT_KEY) !== destinationKey(currentUrl)) sessionStorage.removeItem(FOCUS_INTENT_KEY);
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      const region = activeRegionRef.current;
      region?.removeAttribute("aria-busy");
      region?.removeAttribute("data-navigation-pending");
    };
  }, [clearPending]);

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
    if (!anchor || anchor.target || anchor.hasAttribute("download") || anchor.dataset.navigationMode === "document") return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin || isSameDocumentHash(url)) return;
    if (`${url.pathname}${url.search}` === `${window.location.pathname}${window.location.search}`) {
      // In document-navigation workspaces an active link is a no-op. Let its
      // local click handler close the mobile menu, without starting a redundant
      // RSC refresh that can outlive the next document navigation in WebKit.
      if (documentNavigation) event.preventDefault();
      return;
    }
    event.preventDefault();
    navigate(url.href, navigationLabel(anchor), anchor);
  }

  function handleSubmit(event: FormEvent<HTMLDivElement>) {
    const form = event.target as HTMLFormElement;
    if (!(form instanceof HTMLFormElement) || form.dataset.navigationMode === "document") return;
    const declaredMethod = form.getAttribute("method")?.toLowerCase();
    const isServerQueryForm = declaredMethod === "get" || (!declaredMethod && form.hasAttribute("action"));
    if (!isServerQueryForm) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const url = new URL(form.action || window.location.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    event.preventDefault();
    const params = new URLSearchParams();
    new FormData(form).forEach((value, key) => {
      if (typeof value === "string" && value) params.append(key, value);
    });
    const query = params.toString();
    navigate(query ? `${url.pathname}?${query}` : url.pathname, submitter ? navigationLabel(submitter) : "filtered results", submitter ?? form, { scroll: false });
  }

  const value = useMemo(() => ({ navigate }), [navigate]);

  return (
    <NavigationFeedbackContext.Provider value={value}>
      <div className="workspace-navigation-boundary" onClickCapture={handleClick} onSubmitCapture={handleSubmit}>
        {pending ? (
          <div
            aria-atomic="true"
            aria-live="polite"
            className="workspace-navigation-status"
            data-testid="workspace-navigation-status"
            role="status"
          >
            <span aria-hidden="true" className="workspace-navigation-status__spinner" />
            <span>Loading {pending.label}</span>
          </div>
        ) : null}
        {children}
      </div>
    </NavigationFeedbackContext.Provider>
  );
}

export function WorkspaceNavigationFeedback({ children, documentNavigation = false }: { children: ReactNode; documentNavigation?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  return <NavigationFeedbackBoundary documentNavigation={documentNavigation} routeKey={query ? `${pathname}?${query}` : pathname}>{children}</NavigationFeedbackBoundary>;
}
