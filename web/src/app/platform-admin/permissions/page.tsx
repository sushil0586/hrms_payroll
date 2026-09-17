import { MetricTile } from "@/components/patterns/metric-tile";
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
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  const { data: catalog } = await getPlatformPermissionCatalog();
  const risks = Array.from(new Set(catalog.map((item) => item.risk_level))).sort();
  const filteredCatalog = catalog.filter((item) => {
    const matchesSearch = query
      ? [item.key, item.label, item.module, item.description, item.required_module, item.required_plan, item.default_role_codes.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(query)
      : true;
    const matchesAssignable =
      assignableFilter === "all" ||
      (assignableFilter === "tenant" && item.tenant_assignable) ||
      (assignableFilter === "platform" && !item.tenant_assignable);
    const matchesRisk = riskFilter === "all" || item.risk_level === riskFilter;
    return matchesSearch && matchesAssignable && matchesRisk;
  });
  const groupedCatalog = groupByModule(filteredCatalog);
  const moduleOptions = Array.from(new Set(catalog.map((item) => item.module))).sort();
  const tenantAssignableCount = catalog.filter((item) => item.tenant_assignable).length;
  const platformOnlyCount = catalog.length - tenantAssignableCount;
  const criticalCount = catalog.filter((item) => item.risk_level === "critical").length;
  const inactiveCount = catalog.filter((item) => item.is_active === false).length;
  const databaseBackedCount = catalog.filter((item) => item.catalog_source === "database").length;
  const catalogSourceLabel = databaseBackedCount ? "DB-managed" : "Code fallback";

  return (
    <>
      <PageIntro
        eyebrow="RBAC control"
        title="Permission Catalog"
        description="Platform-owned permission definitions used by tenant roles, default grants, and backend access checks."
        actions={
          <a className="button button--secondary" href="/platform-admin">
            Dashboard
          </a>
        }
        pills={["DB-sync backed", "Tenant assignability", "Risk review"]}
        showPills
      />

      <section className="section platform-control-metrics" data-testid="platform-permission-catalog-summary">
        <div className="metric-grid-modern">
          <MetricTile label="Permissions" value={catalog.length} trend="Total catalog keys" />
          <MetricTile label="Tenant assignable" value={tenantAssignableCount} trend="Available for tenant roles" />
          <MetricTile label="Platform only" value={platformOnlyCount} trend="Reserved operator controls" />
          <MetricTile label="Critical risk" value={criticalCount} trend="Needs tight governance" />
          <MetricTile label="Inactive" value={inactiveCount} trend="Visible for reactivation" />
          <MetricTile label="Catalog source" value={catalogSourceLabel} trend={databaseBackedCount ? `${databaseBackedCount} DB rows` : "Sync pending"} />
        </div>
      </section>

      <section className="section">
        <form className="platform-permission-filters" method="get">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" name="q" placeholder="Permission key, label, module, role" defaultValue={query} />
          </label>
          <label className="form-field">
            <span className="muted">Assignable scope</span>
            <select className="input-control" name="assignable" defaultValue={assignableFilter}>
              <option value="all">All permissions</option>
              <option value="tenant">Tenant assignable</option>
              <option value="platform">Platform only</option>
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Risk</span>
            <select className="input-control" name="risk" defaultValue={riskFilter}>
              <option value="all">All risk levels</option>
              {risks.map((risk) => (
                <option value={risk} key={risk}>
                  {titleCase(risk)}
                </option>
              ))}
            </select>
          </label>
          <div className="platform-permission-filters__actions">
            <button className="button button--primary" type="submit">
              Apply
            </button>
            <a className="button button--secondary" href="/platform-admin/permissions">
              Reset
            </a>
          </div>
        </form>
      </section>

      <section className="section">
        <div className="record-card">
          <div className="record-card__title-wrap">
            <div className="record-card__title">
              <h2>Catalog review</h2>
              <span className="record-chip">{filteredCatalog.length} visible</span>
            </div>
            <p className="section-copy">
              Permission keys are platform-owned. This page reads synced DB catalog rows when available and falls back to the deployed code catalog until sync is complete.
            </p>
          </div>
          <div className="platform-permission-modules">
            {groupedCatalog.length ? (
              groupedCatalog.map((group) => (
                <article className="platform-permission-module" key={group.module}>
                  <div className="platform-permission-module__header">
                    <div>
                      <span className="eyebrow">Module</span>
                      <h3>{group.module}</h3>
                    </div>
                    <span className="record-chip">{group.permissions.length} keys</span>
                  </div>
                  <div className="platform-permission-list">
                    {group.permissions.map((permission) => (
                      <div className="platform-permission-row" key={permission.key}>
                        <div>
                          <strong>{permission.label}</strong>
                          <code>{permission.key}</code>
                          <small>{permission.description}</small>
                        </div>
                        <div className="platform-permission-row__meta">
                          <span className={riskClass(permission.risk_level)}>{titleCase(permission.risk_level)}</span>
                          <span className={permission.tenant_assignable ? "record-chip record-chip--accent" : "record-chip"}>
                            {permission.tenant_assignable ? "Tenant assignable" : "Platform only"}
                          </span>
                          {permission.is_active === false ? <span className="record-chip record-chip--warning">Inactive</span> : null}
                          {permission.required_module ? <span className="record-chip">{permission.required_module}</span> : null}
                          {permission.required_plan ? <span className="record-chip">{permission.required_plan}</span> : null}
                        </div>
                        <div className="platform-permission-row__roles">
                          <span className="muted">Default roles</span>
                          <strong>{permission.default_role_codes.length ? permission.default_role_codes.join(", ") : "None"}</strong>
                          <PermissionCatalogActions moduleOptions={moduleOptions} permission={permission} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <strong>No permissions match these filters.</strong>
                <span className="muted">Clear the filters or search by a broader permission/module name.</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
