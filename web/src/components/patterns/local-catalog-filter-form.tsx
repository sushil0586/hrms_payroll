"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  pathname: string;
  itemSelector: string;
  emptySelector?: string;
  countSelector?: string;
  mode: "notification-events" | "notification-templates" | "workflow-templates" | "workflow-assignments" | "workflow-traces";
};

/** Owns filters for catalogs whose complete dataset is already in the document. */
function matches(item: HTMLElement, values: FormData, mode: Props["mode"]) {
  const get=(key:string)=>String(values.get(key)||"").trim().toLowerCase();
  const q=get("q"); const search=(item.dataset.filterSearch||"").toLowerCase();
  if(q&&!search.includes(q))return false;
  const eq=(formKey:string,dataKey:string)=>{const value=get(formKey);return !value||value==="all"||value===(item.dataset[dataKey]||"").toLowerCase();};
  if(mode==="notification-events")return eq("module","filterModule")&&eq("channel","filterChannel")&&eq("active","filterActive")&&eq("template_mode","filterTemplateMode");
  if(mode==="notification-templates")return eq("status","filterStatus")&&eq("channel","filterChannel")&&eq("source","filterSource");
  if(mode==="workflow-templates"||mode==="workflow-traces")return eq("module","filterModule")&&eq("status","filterStatus");
  return eq("module","filterModule")&&eq("state","filterState");
}

export function LocalCatalogFilterForm({ children, className, pathname, itemSelector, emptySelector, countSelector, mode }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const hydrated = useSyncExternalStore(() => () => undefined, () => true, () => false);

  const apply = useCallback((history: "push" | "replace" | "none" = "push") => {
    const form = formRef.current;
    if (!form) return;
    setPending(true);
    const values = new FormData(form);
    const items = Array.from(document.querySelectorAll<HTMLElement>(itemSelector));
    let visible = 0;
    items.forEach((item) => {
      const show = matches(item, values, mode);
      item.hidden = !show;
      item.style.display = show ? "" : "none";
      if (show) visible += 1;
    });
    if (emptySelector) document.querySelectorAll<HTMLElement>(emptySelector).forEach((item) => { item.hidden = visible !== 0; item.style.display = visible === 0 ? "" : "none"; });
    if (countSelector) document.querySelectorAll<HTMLElement>(countSelector).forEach((item) => { item.textContent = String(visible); });
    if (history !== "none") {
      const params = new URLSearchParams();
      for (const [key, raw] of values.entries()) {
        const value = String(raw).trim();
        if (value && value !== "all") params.set(key, value);
      }
      window.history[history === "push" ? "pushState" : "replaceState"](window.history.state, "", `${pathname}${params.size ? `?${params}` : ""}`);
    }
    window.requestAnimationFrame(() => setPending(false));
  }, [countSelector, emptySelector, itemSelector, mode, pathname]);

  const restore = useCallback((event?: PopStateEvent) => {
    event?.stopImmediatePropagation();
    const form = formRef.current;
    if (!form) return;
    const params = new URLSearchParams(window.location.search);
    Array.from(form.elements).forEach((control) => {
      if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement) || !control.name) return;
      control.value = params.get(control.name) ?? (control instanceof HTMLSelectElement ? "all" : "");
    });
    apply("none");
  }, [apply]);

  useEffect(() => {
    window.addEventListener("popstate", restore, { capture: true });
    return () => window.removeEventListener("popstate", restore, { capture: true });
  }, [restore]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply("push");
  }

  function clear() {
    const form = formRef.current;
    if (!form) return;
    form.reset();
    Array.from(form.querySelectorAll<HTMLInputElement>('input[type="search"], input[type="text"]')).forEach((input) => { input.value = ""; });
    Array.from(form.querySelectorAll("select")).forEach((select) => { select.value = "all"; });
    apply("push");
  }

  return <form aria-busy={pending || undefined} className={className} data-local-catalog-hydrated={hydrated ? "true" : "false"} data-navigation-mode="local" onSubmit={submit} ref={formRef}>
    {children}
    <button className="button button--ghost" onClick={clear} type="button">Clear filters</button>
  </form>;
}
