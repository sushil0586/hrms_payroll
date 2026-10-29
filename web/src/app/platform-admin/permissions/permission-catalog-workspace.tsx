"use client";

import { useEffect, useMemo, useState } from "react";

import type { PlatformPermissionCatalogItem } from "@/lib/types";
import { PermissionCatalogActions } from "./permission-catalog-actions";

type Filters = { q: string; assignable: string; risk: string; module: string };

function titleCase(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function riskClass(risk: string) {
  return risk === "critical" ? "record-chip record-chip--danger" : risk === "high" ? "record-chip record-chip--warning" : "record-chip";
}

function filtersFromUrl(): Filters {
  const params = new URLSearchParams(window.location.search);
  return { q: params.get("q") ?? "", assignable: params.get("assignable") ?? "all", risk: params.get("risk") ?? "all", module: params.get("module") ?? "all" };
}

export function PermissionCatalogWorkspace({ initialCatalog, initialFilters }: { initialCatalog: PlatformPermissionCatalogItem[]; initialFilters: Filters }) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [draft, setDraft] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const risks = useMemo(() => Array.from(new Set(catalog.map((item) => item.risk_level))).sort(), [catalog]);
  const modules = useMemo(() => Array.from(new Set(catalog.map((item) => item.module))).sort(), [catalog]);
  const filtered = useMemo(() => catalog.filter((item) => {
    const query = filters.q.trim().toLowerCase();
    const search = !query || [item.key, item.label, item.module, item.description, item.required_module, item.required_plan, item.default_role_codes.join(" ")].join(" ").toLowerCase().includes(query);
    const assignable = filters.assignable === "all" || (filters.assignable === "tenant" ? item.tenant_assignable : !item.tenant_assignable);
    return search && assignable && (filters.risk === "all" || item.risk_level === filters.risk) && (filters.module === "all" || item.module === filters.module);
  }), [catalog, filters]);
  const groups = useMemo(() => filtered.reduce<Array<{ module: string; permissions: PlatformPermissionCatalogItem[] }>>((all, item) => {
    const group = all.find((entry) => entry.module === item.module);
    if (group) group.permissions.push(item); else all.push({ module: item.module, permissions: [item] });
    return all;
  }, []), [filtered]);

  useEffect(() => {
    const restore = () => { const next = filtersFromUrl(); setDraft(next); setFilters(next); };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  function apply(next: Filters) {
    setDraft(next); setFilters(next);
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.assignable !== "all") params.set("assignable", next.assignable);
    if (next.risk !== "all") params.set("risk", next.risk);
    if (next.module !== "all") params.set("module", next.module);
    window.history.pushState({}, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
  }

  function reconcile(updated: PlatformPermissionCatalogItem) {
    setCatalog((current) => current.map((item) => item.key === updated.key ? updated : item));
  }

  const tenantCount = catalog.filter((item) => item.tenant_assignable).length;
  return <>
    <section className="section platform-phase3-summary" data-testid="platform-permission-catalog-summary">
      <div aria-label="Permission catalog summary" className="tenant-access-summary-strip" role="group">
        <article><span>Permission keys</span><strong>{catalog.length}</strong><small>{catalog.filter((item) => item.catalog_source === "database").length ? "DB-managed" : "Code fallback"} · {catalog.filter((item) => item.is_active === false).length} inactive</small></article>
        <article><span>Tenant assignable</span><strong>{tenantCount}</strong><small>Available to tenant roles</small></article>
        <article><span>Platform only</span><strong>{catalog.length - tenantCount}</strong><small>Reserved operator controls</small></article>
        <article><span>Critical risk</span><strong>{catalog.filter((item) => item.risk_level === "critical").length}</strong><small>Requires tight governance</small></article>
      </div>
    </section>
    <section className="section">
      <form className="platform-permission-filters" data-async-region onSubmit={(event) => { event.preventDefault(); apply(draft); }}>
        <label className="form-field"><span className="muted">Search</span><input className="input-control" name="q" placeholder="Permission key, label, module, role" value={draft.q} onChange={(event) => setDraft({ ...draft, q: event.target.value })} /></label>
        <label className="form-field"><span className="muted">Assignable scope</span><select className="input-control" value={draft.assignable} onChange={(event) => setDraft({ ...draft, assignable: event.target.value })}><option value="all">All permissions</option><option value="tenant">Tenant assignable</option><option value="platform">Platform only</option></select></label>
        <label className="form-field"><span className="muted">Risk</span><select className="input-control" value={draft.risk} onChange={(event) => setDraft({ ...draft, risk: event.target.value })}><option value="all">All risk levels</option>{risks.map((risk) => <option value={risk} key={risk}>{titleCase(risk)}</option>)}</select></label>
        <label className="form-field"><span className="muted">Module</span><select className="input-control" value={draft.module} onChange={(event) => setDraft({ ...draft, module: event.target.value })}><option value="all">All modules</option>{modules.map((module) => <option value={module} key={module}>{titleCase(module)}</option>)}</select></label>
        <div className="platform-permission-filters__actions"><button className="button button--primary" type="submit">Apply</button><button className="button button--secondary" onClick={() => apply({ q: "", assignable: "all", risk: "all", module: "all" })} type="button">Reset</button></div>
      </form>
      <div className="platform-permission-filter-summary" role="status"><strong>{filtered.length} of {catalog.length} keys visible</strong><span>Filters update this catalog locally and remain in browser history.</span></div>
    </section>
    <section className="section"><div className="record-card"><div className="record-card__title-wrap"><div className="record-card__title"><h2>Catalog review</h2><span className="record-chip">{filtered.length} visible</span></div><p className="section-copy">Permission keys are immutable platform contracts. Metadata changes reconcile only the affected catalog row.</p></div>
      <div className="platform-permission-modules">{groups.length ? groups.map((group) => <article className="platform-permission-module" key={group.module}><div className="platform-permission-module__header"><div><span className="eyebrow">Module</span><h3>{group.module}</h3></div><span className="record-chip">{group.permissions.length} keys</span></div><div className="platform-permission-list">{group.permissions.map((permission) => <div className="platform-permission-row" key={permission.key}><div><strong>{permission.label}</strong><code>{permission.key}</code><small>{permission.description}</small></div><div className="platform-permission-row__meta"><span className={riskClass(permission.risk_level)}>{titleCase(permission.risk_level)}</span><span className={permission.tenant_assignable ? "record-chip record-chip--accent" : "record-chip"}>{permission.tenant_assignable ? "Tenant assignable" : "Platform only"}</span>{permission.is_active === false ? <span className="record-chip record-chip--warning">Inactive</span> : null}</div><div className="platform-permission-row__roles"><span className="muted">Default roles</span><strong>{permission.default_role_codes.length ? permission.default_role_codes.join(", ") : "None"}</strong><PermissionCatalogActions moduleOptions={modules} permission={permission} onSaved={reconcile} /></div></div>)}</div></article>) : <div className="empty-state"><strong>No permissions match these filters.</strong><span className="muted">Clear the filters or search more broadly.</span></div>}</div>
    </div></section>
  </>;
}
