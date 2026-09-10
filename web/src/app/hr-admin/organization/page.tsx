import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminOrganizationItem, getHrAdminOrganizationSnapshot } from "@/lib/api";
import type { HrAdminOrganizationItem, HrAdminOrganizationSnapshot } from "@/lib/types";
import { isOrganizationSectionKey } from "@/app/hr-admin/organization/section-config";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(
  basePath: string,
  currentParams: Record<string, SearchParamValue>,
  updates: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();

  Object.entries(currentParams).forEach(([key, value]) => {
    const normalized = normalizeParam(value);
    if (normalized) {
      params.set(key, normalized);
    }
  });

  Object.entries(updates).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  });

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function filterByQuery(items: HrAdminOrganizationItem[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) =>
    [
      item.name,
      item.code,
      item.legal_entity,
      item.location,
      item.branch_type,
      item.parent,
      item.business_unit,
      item.grade,
      item.country_code,
      item.timezone,
      item.city,
      item.state,
      item.description,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
  );
}

function filterByStatus(items: HrAdminOrganizationItem[], status: string) {
  if (status === "all") {
    return items;
  }
  return items.filter((item) => (status === "active" ? item.is_active : !item.is_active));
}

function resolveSelectedItem(items: HrAdminOrganizationItem[], selectedId?: string) {
  if (selectedId) {
    const selected = items.find((item) => item.id === selectedId);
    if (selected) {
      return selected;
    }
  }
  return items[0] ?? null;
}

function getOrganizationWarnings(item: HrAdminOrganizationItem, section: string) {
  const warnings: string[] = [];
  if (!item.is_active) {
    warnings.push("record is inactive");
  }

  switch (section) {
    case "legal_entities":
      if ((item.linked_employees_count ?? 0) > 0) {
        warnings.push("employees depend on this legal entity");
      }
      if ((item.branches_count ?? 0) > 0) {
        warnings.push("branches depend on this legal entity");
      }
      break;
    case "locations":
      if ((item.linked_employees_count ?? 0) > 0) {
        warnings.push("employees depend on this location");
      }
      if ((item.branches_count ?? 0) > 0) {
        warnings.push("branches depend on this location");
      }
      break;
    case "branches":
      if ((item.linked_employees_count ?? 0) > 0) {
        warnings.push("employees mapped to this branch");
      }
      if (!item.location) {
        warnings.push("branch location not mapped");
      }
      break;
    case "business_units":
      if ((item.child_count ?? 0) > 0) {
        warnings.push("child business units exist");
      }
      if ((item.departments_count ?? 0) > 0) {
        warnings.push("departments depend on this unit");
      }
      break;
    case "departments":
      if ((item.linked_employees_count ?? 0) > 0) {
        warnings.push("employees mapped to this department");
      }
      if ((item.child_count ?? 0) > 0) {
        warnings.push("child departments exist");
      }
      break;
    case "cost_centers":
      if ((item.linked_employees_count ?? 0) > 0) {
        warnings.push("employees mapped to this cost center");
      }
      if (!item.legal_entity) {
        warnings.push("cost center legal entity not mapped");
      }
      break;
    case "grades":
      if ((item.designations_count ?? 0) > 0) {
        warnings.push("designations depend on this grade");
      }
      if ((item.linked_employees_count ?? 0) > 0) {
        warnings.push("employees mapped to this grade");
      }
      break;
    case "designations":
      if ((item.linked_employees_count ?? 0) > 0) {
        warnings.push("employees mapped to this designation");
      }
      if (!item.grade) {
        warnings.push("designation grade not mapped");
      }
      break;
    case "employment_types":
      if ((item.linked_employees_count ?? 0) > 0) {
        warnings.push("employees use this employment type");
      }
      break;
    default:
      break;
  }

  return warnings;
}

function getOrganizationImpactNotice(item: HrAdminOrganizationItem, section: string) {
  const warnings = getOrganizationWarnings(item, section);
  if (!warnings.length) {
    return {
      title: "Low edit impact.",
      message: "This record has no obvious downstream dependency warning in the current review snapshot.",
    };
  }
  return {
    title: "Change carefully.",
    message: warnings.join(", "),
  };
}

function buildItemDetailRows(item: HrAdminOrganizationItem, section: string) {
  const baseRows = [
    { label: "Name", value: item.name },
    { label: "Code", value: item.code },
    { label: "Status", value: item.is_active ? "active" : "inactive" },
  ];

  switch (section) {
    case "legal_entities":
      return [
        ...baseRows,
        { label: "Registered Name", value: item.registered_name || "Not set" },
        { label: "Country Code", value: item.country_code || "Not set" },
        { label: "Timezone", value: item.timezone || "Not set" },
        { label: "Primary Email", value: item.primary_email || "Not set" },
        { label: "Primary Phone", value: item.primary_phone || "Not set" },
        { label: "Linked Employees", value: String(item.linked_employees_count ?? 0) },
        { label: "Branches Using This Entity", value: String(item.branches_count ?? 0) },
        { label: "Cost Centers Using This Entity", value: String(item.cost_centers_count ?? 0) },
      ];
    case "locations":
      return [
        ...baseRows,
        { label: "Address Line 1", value: item.address_line_1 || "Not set" },
        { label: "Address Line 2", value: item.address_line_2 || "Not set" },
        { label: "City", value: item.city || "Not set" },
        { label: "State", value: item.state || "Not set" },
        { label: "Postal Code", value: item.postal_code || "Not set" },
        { label: "Country Code", value: item.country_code || "Not set" },
        { label: "Linked Employees", value: String(item.linked_employees_count ?? 0) },
        { label: "Branches Using This Location", value: String(item.branches_count ?? 0) },
      ];
    case "branches":
      return [
        ...baseRows,
        { label: "Legal Entity", value: item.legal_entity || "Not set" },
        { label: "Location", value: item.location || "Not set" },
        { label: "Branch Type", value: item.branch_type || "Not set" },
        { label: "Linked Employees", value: String(item.linked_employees_count ?? 0) },
      ];
    case "business_units":
      return [
        ...baseRows,
        { label: "Parent Business Unit", value: item.parent || "No parent" },
        { label: "Linked Employees", value: String(item.linked_employees_count ?? 0) },
        { label: "Child Business Units", value: String(item.child_count ?? 0) },
        { label: "Departments In This Unit", value: String(item.departments_count ?? 0) },
      ];
    case "departments":
      return [
        ...baseRows,
        { label: "Business Unit", value: item.business_unit || "Not set" },
        { label: "Parent Department", value: item.parent || "No parent" },
        { label: "Linked Employees", value: String(item.linked_employees_count ?? 0) },
        { label: "Child Departments", value: String(item.child_count ?? 0) },
      ];
    case "cost_centers":
      return [
        ...baseRows,
        { label: "Legal Entity", value: item.legal_entity || "Not set" },
        { label: "Linked Employees", value: String(item.linked_employees_count ?? 0) },
      ];
    case "grades":
      return [
        ...baseRows,
        { label: "Level", value: item.level ? String(item.level) : "Not set" },
        { label: "Linked Employees", value: String(item.linked_employees_count ?? 0) },
        { label: "Designations In This Grade", value: String(item.designations_count ?? 0) },
      ];
    case "designations":
      return [
        ...baseRows,
        { label: "Grade", value: item.grade || "Not set" },
        { label: "Linked Employees", value: String(item.linked_employees_count ?? 0) },
      ];
    case "employment_types":
      return [
        ...baseRows,
        { label: "Description", value: item.description || "Not set" },
        { label: "Payroll Eligibility", value: item.is_payroll_eligible ? "Payroll eligible" : "Non payroll" },
        { label: "Linked Employees", value: String(item.linked_employees_count ?? 0) },
      ];
    default:
      return baseRows;
  }
}

function getSections(snapshot: HrAdminOrganizationSnapshot) {
  return {
    legal_entities: { label: "Legal Entities", items: snapshot.legal_entities },
    locations: { label: "Locations", items: snapshot.locations },
    branches: { label: "Branches", items: snapshot.branches },
    business_units: { label: "Business Units", items: snapshot.business_units },
    departments: { label: "Departments", items: snapshot.departments },
    cost_centers: { label: "Cost Centers", items: snapshot.cost_centers },
    grades: { label: "Grades", items: snapshot.grades },
    designations: { label: "Designations", items: snapshot.designations },
    employment_types: { label: "Employment Types", items: snapshot.employment_types },
  } as const;
}

function itemMeta(item: HrAdminOrganizationItem, section: string) {
  switch (section) {
    case "legal_entities":
      return [item.country_code, item.timezone];
    case "locations":
      return [item.city, item.state, item.country_code];
    case "branches":
      return [item.legal_entity, item.location, item.branch_type];
    case "business_units":
      return [item.parent];
    case "departments":
      return [item.business_unit, item.parent];
    case "cost_centers":
      return [item.legal_entity];
    case "grades":
      return [item.level ? `Level ${item.level}` : null];
    case "designations":
      return [item.grade];
    case "employment_types":
      return [item.is_payroll_eligible ? "Payroll eligible" : "Non payroll"];
    default:
      return [];
  }
}

export default async function HrAdminOrganizationPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const snapshotResult = await getHrAdminOrganizationSnapshot();
  const sections = getSections(snapshotResult.data);
  const sectionKey = (normalizeParam(currentParams.section) ?? "departments") as keyof typeof sections;
  const activeSection = sections[sectionKey] ?? sections.departments;
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "all";
  const filteredItems = filterByQuery(filterByStatus(activeSection.items, status), q);
  const selectedItem = resolveSelectedItem(filteredItems, normalizeParam(currentParams.itemId));
  const selectedDetailResult =
    selectedItem && isOrganizationSectionKey(sectionKey)
      ? await getHrAdminOrganizationItem(sectionKey, selectedItem.id)
      : null;
  const selectedDetail = (selectedDetailResult?.data as HrAdminOrganizationItem | undefined) ?? selectedItem;
  const selectedImpact = selectedDetail ? getOrganizationImpactNotice(selectedDetail, sectionKey) : null;
  const statusTabs = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "inactive", label: "Inactive" },
  ];

  return (
    <main className="shell">
      <PageIntro
        eyebrow={snapshotResult.state === "live" ? "Live structure mode" : "Demo structure mode"}
        title="Organization setup review for the structural backbone of the HRMS."
        description="Validate the master setup that drives permissions, policy scoping, workflows, leave assignments, attendance rules, and later payroll processing."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin">
              Back to admin workspace
            </Link>
            {isOrganizationSectionKey(sectionKey) ? (
              <Link className="button button--primary" href={`/hr-admin/organization/${sectionKey}/new`}>
                Create {activeSection.label.slice(0, -1).toLowerCase()}
              </Link>
            ) : null}
            <Link className="button button--secondary" href="/hr-admin/employees">
              Open employee masters
            </Link>
          </>
        }
        pills={[
          "Structural backbone for HRMS",
          "Cross-module master data hygiene",
          "Ready for employee and policy mapping",
        ]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Legal entities" value={snapshotResult.data.summary.legal_entities_count} trend="Legal structure" />
          <MetricTile label="Branches" value={snapshotResult.data.summary.branches_count} trend="Operational footprint" />
          <MetricTile label="Cost centers" value={snapshotResult.data.summary.cost_centers_count} trend="Finance mapping" />
          <MetricTile label="Employment types" value={snapshotResult.data.summary.employment_types_count} trend="Workforce rules" />
        </div>
      </section>

      <section className="section employee-master-layout">
        <article className="queue-toolbar">
          <div className="queue-toolbar__header">
            <div>
              <h2>Structure catalog</h2>
              <p className="section-copy">Move through each structural layer and inspect the current configuration footprint without losing creation context.</p>
            </div>
            <div className="queue-toolbar__meta">
              <span className="queue-summary-chip">
                <strong>{filteredItems.length}</strong> in active view
              </span>
              <span className="queue-summary-chip">
                <strong>{Object.keys(sections).length}</strong> structure layers
              </span>
            </div>
          </div>

          <form action="/hr-admin/organization" className="directory-filter-bar">
            <input name="section" type="hidden" value={sectionKey} />
            <input name="itemId" type="hidden" value={selectedItem?.id ?? ""} />
            <label className="form-field">
              <span className="text-label-premium">Search</span>
              <input className="input-control" defaultValue={q} name="q" placeholder="Name, code, parent, location" />
            </label>
            <label className="form-field">
              <span className="text-label-premium">Status</span>
              <select className="input-control" defaultValue={status} name="status">
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </label>
            <div className="directory-filter-bar__actions">
              <button className="button button--primary" type="submit">Apply</button>
              <Link className="button button--ghost" href={buildHref("/hr-admin/organization", currentParams, { q: undefined, status: undefined, itemId: undefined })}>Reset</Link>
            </div>
          </form>

          <div className="employee-status-filter">
              {Object.entries(sections).map(([key, value]) => (
                <Link
                  className={`filter-chip-link${sectionKey === key ? " filter-chip-link--active" : ""}`}
                  href={buildHref("/hr-admin/organization", currentParams, { section: key, itemId: undefined })}
                  key={key}
                >
                  <span>{value.label}</span>
                  <strong>{value.items.length}</strong>
                </Link>
              ))}
          </div>

          <div className="employee-status-filter">
            {statusTabs.map((tab) => (
              <Link
                className={`filter-chip-link${status === tab.key ? " filter-chip-link--active" : ""}`}
                href={buildHref("/hr-admin/organization", currentParams, { status: tab.key, itemId: undefined })}
                key={tab.key}
              >
                <span>{tab.label}</span>
                <strong>{filterByStatus(activeSection.items, tab.key).length}</strong>
              </Link>
            ))}
          </div>

          <div className="employee-directory-list">
            {filteredItems.length ? (
              filteredItems.map((item) => {
                const warnings = getOrganizationWarnings(item, sectionKey);
                return (
                  <div
                    className={`employee-directory-item${selectedItem?.id === item.id ? " employee-directory-item--active" : ""}`}
                    key={item.id}
                  >
                    <Link href={buildHref("/hr-admin/organization", currentParams, { itemId: item.id })}>
                      <div className="employee-directory-item__header">
                        <div>
                          <strong>{item.name}</strong>
                          <p className="section-copy">{item.code}</p>
                        </div>
                        <span className={`record-chip${item.is_active ? " record-chip--accent" : ""}`}>
                          {item.is_active ? "active" : "inactive"}
                        </span>
                      </div>
                      <div className="employee-directory-item__meta">
                        {itemMeta(item, sectionKey).filter(Boolean).map((meta) => (
                          <span key={`${item.id}-${meta}`}>{meta}</span>
                        ))}
                      </div>
                      {warnings.length ? (
                        <div className="employee-directory-item__meta">
                          <span>{warnings.length} review warnings</span>
                          <span>{warnings.slice(0, 2).join(" • ")}</span>
                        </div>
                      ) : (
                        <div className="employee-directory-item__meta">
                          <span>No active dependency warnings</span>
                        </div>
                      )}
                    </Link>
                    {isOrganizationSectionKey(sectionKey) ? (
                      <div className="record-card__actions">
                        <Link className="button button--secondary" href={`/hr-admin/organization/${sectionKey}/${item.id}/edit`}>
                          Edit
                        </Link>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="notice">
                <strong>No items match this review state.</strong>
                <span className="muted">Try another section, reset the filters, or create a new master record.</span>
              </div>
            )}
          </div>
        </article>

        <article className="record-card">
          <div className="record-card__title-wrap">
            <div className="record-card__title">
              <h2>{selectedItem ? `${selectedItem.name} detail` : "Structural summary"}</h2>
            </div>
            <p className="section-copy">
              {selectedDetail
                ? "Inspect the selected master record and verify its dependency fields before editing."
                : "A quick audit panel for what is already configured in the tenant setup."}
            </p>
          </div>
          {selectedImpact ? (
            <div className="notice">
              <strong>{selectedImpact.title}</strong>
              <span className="muted">{selectedImpact.message}.</span>
            </div>
          ) : null}
          <div className="detail-grid">
            {selectedDetail ? (
              buildItemDetailRows(selectedDetail, sectionKey).map((row) => (
                <DetailRow key={`${row.label}-${row.value}`} label={row.label} value={row.value} />
              ))
            ) : (
              <>
                <DetailRow label="Legal Entities" value={String(snapshotResult.data.summary.legal_entities_count)} />
                <DetailRow label="Locations" value={String(snapshotResult.data.summary.locations_count)} />
                <DetailRow label="Branches" value={String(snapshotResult.data.summary.branches_count)} />
                <DetailRow label="Business Units" value={String(snapshotResult.data.summary.business_units_count)} />
                <DetailRow label="Departments" value={String(snapshotResult.data.summary.departments_count)} />
                <DetailRow label="Cost Centers" value={String(snapshotResult.data.summary.cost_centers_count)} />
                <DetailRow label="Grades" value={String(snapshotResult.data.summary.grades_count)} />
                <DetailRow label="Designations" value={String(snapshotResult.data.summary.designations_count)} />
                <DetailRow label="Employment Types" value={String(snapshotResult.data.summary.employment_types_count)} />
              </>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
