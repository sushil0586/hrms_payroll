import { PageIntro } from "@/components/patterns/page-intro";
import { getPlatformPermissionCatalog } from "@/lib/api";
import type { PlatformPermissionCatalogItem } from "@/lib/types";
import { PermissionCatalogActions } from "./permission-catalog-actions";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function titleCase(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function riskClass(riskLevel: string) {
  if (riskLevel === "critical") return "record-chip record-chip--danger";
  if (riskLevel === "high") return "record-chip record-chip--warning";
  return "record-chip";
}

function groupByModule(items: PlatformPermissionCatalogItem[]) {
  return items.reduce<Array<{ module: string; permissions: PlatformPermissionCatalogItem[] }>>((groups, item) => {
    const existing = groups.find((group) => group.module === item.module);
    if (existing) {
      existing.permissions.push(item);
      return groups;
    }
    groups.push({ module: item.module, permissions: [item] });
    return groups;
  }, []);
}

export default async function PlatformAdminPermissionsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const query = (normalizeParam(params.q) ?? "").trim().toLowerCase();
  const assignableFilter = normalizeParam(params.assignable) ?? "all";
  const riskFilter = normalizeParam(params.risk) ?? "all";
  const moduleFilter = normalizeParam(params.module) ?? "all";
  const { data: catalog } = await getPlatformPermissionCatalog();
  const risks = Array.from(new Set(catalog.map((item) => item.risk_level))).sort();
  const moduleOptions = Array.from(new Set(catalog.map((item) => item.module))).sort();
  const filteredCatalog = catalog.filter((item) => {
    const matchesSearch = query
      ? [item.key, item.label, item.module, item.description, item.required_module, item.required_plan, item.default_role_codes.join(" ")]
          .join(" ").toLowerCase().includes(query)
      : true;
    const matchesAssignable = assignableFilter === "all" || (assignableFilter === "tenant" && item.tenant_assignable) || (assignableFilter === "platform" && !item.tenant_assignable);
    const matchesRisk = riskFilter === "all" || item.risk_level === riskFilter;
    const matchesModule = moduleFilter === "all" || item.module === moduleFilter;
    return matchesSearch && matchesAssignable && matchesRisk && matchesModule;
  });
  const groupedCatalog = groupByModule(filteredCatalog);
  const tenantAssignableCount = catalog.filter((item) => item.tenant_assignable).length;
  const platformOnlyCount = catalog.length - tenantAssignableCount;
  const criticalCount = catalog.filter((item) => item.risk_level === "critical").length;
  const inactiveCount = catalog.filter((item) => item.is_active === false).length;
  const databaseBackedCount = catalog.filter((item) => item.catalog_source === "database").length;
  const catalogSourceLabel = databaseBackedCount ? "DB-managed" : "Code fallback";
  const activeFilterLabels = [
    query ? `search "${query}"` : "",
    assignableFilter !== "all" ? (assignableFilter === "tenant" ? "tenant assignable" : "platform only") : "",
    riskFilter !== "all" ? `${riskFilter} risk` : "",
    moduleFilter !== "all" ? `${moduleFilter} module` : "",
  ].filter(Boolean);
  const nextReviewHref = criticalCount ? "/platform-admin/permissions?assignable=platform&risk=critical" : "/platform-admin/permissions?assignable=platform";
  const nextReviewTitle = activeFilterLabels.length ? "Review the filtered authority set" : "Review governed platform-only keys";
  const nextReviewDetail = activeFilterLabels.length
    ? `${filteredCatalog.length} of ${catalog.length} permission keys match the current URL-stable scope.`
    : `${criticalCount} critical-risk key${criticalCount === 1 ? "" : "s"} and ${platformOnlyCount} platform-only key${platformOnlyCount === 1 ? "" : "s"} need explicit platform governance.`;

  return (
    <main className="shell accerio-page platform-permission-catalog">
      <PageIntro appearance="accerio" eyebrow="RBAC control" title="Permission Catalog"
        description="Platform-owned permission definitions used by tenant roles, default grants, and backend access checks."
        actions={<a className="button button--secondary" href="/platform-admin">Dashboard</a>}
        pills={["Immutable keys", "Tenant assignability", "Risk review"]} showPills />

      <section className="section platform-phase3-summary" data-testid="platform-permission-catalog-summary">
        <div aria-label="Permission catalog summary" className="tenant-access-summary-strip" role="group">
          <article><span>Permission keys</span><strong>{catalog.length}</strong><small>{catalogSourceLabel} · {inactiveCount} inactive</small></article>
          <article><span>Tenant assignable</span><strong>{tenantAssignableCount}</strong><small>Available to tenant roles</small></article>
          <article><span>Platform only</span><strong>{platformOnlyCount}</strong><small>Reserved operator controls</small></article>
          <article><span>Critical risk</span><strong>{criticalCount}</strong><small>Requires tight governance</small></article>
        </div>
        <div className="platform-next-action" role="status">
          <div><span className="eyebrow">Next required action</span><strong>{nextReviewTitle}</strong><span>{nextReviewDetail}</span></div>
          <a className="button button--primary" href={activeFilterLabels.length ? "/platform-admin/permissions" : nextReviewHref}>{activeFilterLabels.length ? "Reset catalog view" : "Review governed keys"}</a>
        </div>
      </section>

      <section className="section">
        <form className="platform-permission-filters" data-async-region key={`${query}:${assignableFilter}:${riskFilter}:${moduleFilter}`} method="get">
          <label className="form-field"><span className="muted">Search</span><input className="input-control" name="q" placeholder="Permission key, label, module, role" defaultValue={query} /></label>
          <label className="form-field"><span className="muted">Assignable scope</span><select className="input-control" name="assignable" defaultValue={assignableFilter}><option value="all">All permissions</option><option value="tenant">Tenant assignable</option><option value="platform">Platform only</option></select></label>
          <label className="form-field"><span className="muted">Risk</span><select className="input-control" name="risk" defaultValue={riskFilter}><option value="all">All risk levels</option>{risks.map((risk) => <option value={risk} key={risk}>{titleCase(risk)}</option>)}</select></label>
          <label className="form-field"><span className="muted">Module</span><select className="input-control" name="module" defaultValue={moduleFilter}><option value="all">All modules</option>{moduleOptions.map((module) => <option value={module} key={module}>{titleCase(module)}</option>)}</select></label>
          <div className="platform-permission-filters__actions"><button className="button button--primary" type="submit">Apply</button><a className="button button--secondary" href="/platform-admin/permissions">Reset</a></div>
        </form>
        <div className="platform-permission-filter-summary" role="status">
          <strong>{filteredCatalog.length} of {catalog.length} keys visible</strong>
          <span>{activeFilterLabels.length ? `Filtered by ${activeFilterLabels.join(", ")}.` : "Complete permission authority catalog."}</span>
          <small>Search, authority scope, risk, and module are preserved in the URL after Apply.</small>
        </div>
      </section>

      <section className="section">
        <div className="record-card">
          <div className="record-card__title-wrap">
            <div className="record-card__title"><h2>Catalog review</h2><span className="record-chip">{filteredCatalog.length} visible</span></div>
            <p className="section-copy">Permission keys are immutable platform contracts. Metadata changes are DB-managed when synced; runtime enforcement continues to use the deployed key and falls back to the code catalog until sync is complete.</p>
          </div>
          <div className="platform-permission-modules">
            {groupedCatalog.length ? groupedCatalog.map((group) => (
              <article className="platform-permission-module" key={group.module}>
                <div className="platform-permission-module__header"><div><span className="eyebrow">Module</span><h3>{group.module}</h3></div><span className="record-chip">{group.permissions.length} keys</span></div>
                <div className="platform-permission-list">
                  {group.permissions.map((permission) => (
                    <div className="platform-permission-row" key={permission.key}>
                      <div><strong>{permission.label}</strong><code>{permission.key}</code><small>{permission.description}</small></div>
                      <div className="platform-permission-row__meta">
                        <span className={riskClass(permission.risk_level)}>{titleCase(permission.risk_level)}</span>
                        <span className={permission.tenant_assignable ? "record-chip record-chip--accent" : "record-chip"}>{permission.tenant_assignable ? "Tenant assignable" : "Platform only"}</span>
                        {permission.is_active === false ? <span className="record-chip record-chip--warning">Inactive</span> : null}
                        {permission.required_module ? <span className="record-chip">{permission.required_module}</span> : null}
                        {permission.required_plan ? <span className="record-chip">{permission.required_plan}</span> : null}
                      </div>
                      <div className="platform-permission-row__roles"><span className="muted">Default roles</span><strong>{permission.default_role_codes.length ? permission.default_role_codes.join(", ") : "None"}</strong><PermissionCatalogActions moduleOptions={moduleOptions} permission={permission} /></div>
                    </div>
                  ))}
                </div>
              </article>
            )) : <div className="empty-state"><strong>No permissions match these filters.</strong><span className="muted">Clear the filters or search by a broader permission/module name.</span></div>}
          </div>
        </div>
      </section>
    </main>
  );
}
