import { WorkspaceFilterForm } from "@/components/patterns/workspace-filter-form";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { OrganizationAccessNotice } from "./organization-access-notice";
import { OrganizationWorkflows } from "./organization-workflows";

import { PaginationBar } from "@/components/patterns/pagination-bar";
import { getHrAdminOrganizationItem, getHrAdminOrganizationSnapshot } from "@/lib/api";
import type { HrAdminOrganizationItem, HrAdminOrganizationSnapshot } from "@/lib/types";
import { ORGANIZATION_SECTION_CONFIG, isOrganizationSectionKey, type OrganizationSectionKey } from "@/app/hr-admin/organization/section-config";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

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

const masterDescriptions: Record<OrganizationSectionKey, string> = {
  legal_entities: "Legal employer records used for compliance, payroll, and employee assignment.",
  locations: "Physical offices or work locations used by branches and employee records.",
  branches: "Operating branches linked to legal entities and locations.",
  business_units: "High-level business structure for grouping departments and ownership.",
  departments: "Department hierarchy used for reporting, policy assignment, and workflows.",
  cost_centers: "Finance allocation masters used by employees and payroll reporting.",
  grades: "Level structure that supports designation mapping and compensation bands.",
  designations: "Job titles attached to employees, usually mapped to a grade.",
  employment_types: "Worker categories such as full time, contractor, intern, or consultant.",
};

const masterDependencyLabels: Record<OrganizationSectionKey, string> = {
  legal_entities: "Feeds branches, cost centers, employees",
  locations: "Feeds branches and employees",
  branches: "Feeds employee assignment",
  business_units: "Feeds departments and employees",
  departments: "Feeds employee assignment and workflows",
  cost_centers: "Feeds payroll and finance reporting",
  grades: "Feeds designations and employee profiles",
  designations: "Feeds employee profiles",
  employment_types: "Feeds payroll eligibility and employee profiles",
};

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
  const user = await requireSessionPermission({ permissionKeys: ["organization.view", "organization.manage"], fallbackPath: "/access-denied" });
  if (!sessionHasPermission(user, "organization.view")) return <OrganizationAccessNotice />;
  const currentParams = (await searchParams) ?? {};
  const result = await getHrAdminOrganizationSnapshot().catch(()=>null);
  if (result?.state !== "live") return <OrganizationAccessNotice unavailable />;
  const sections = getSections(result.data);
  const requestedSection = normalizeParam(currentParams.section) ?? "departments";
  const sectionKey: OrganizationSectionKey = isOrganizationSectionKey(requestedSection) ? requestedSection : "departments";
  const active = sections[sectionKey];
  const q = normalizeParam(currentParams.q) ?? "";
  const requestedStatus = normalizeParam(currentParams.status);
  const status = requestedStatus === "active" || requestedStatus === "inactive" ? requestedStatus : "all";
  const pageSizeValue = Number(normalizeParam(currentParams.page_size));
  const pageSize = [10,25,50].includes(pageSizeValue) ? pageSizeValue : 10;
  const matched = filterByQuery(filterByStatus(active.items, status), q);
  const totalPages = Math.max(1, Math.ceil(matched.length / pageSize));
  const requestedPage = Number(normalizeParam(currentParams.page));
  const page = Math.min(Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1, totalPages);
  const visible = matched.slice((page - 1) * pageSize, page * pageSize);
  const selectedId = normalizeParam(currentParams.itemId);
  const selected = selectedId ? active.items.find(item => item.id === selectedId) : undefined;
  const detailResult = selected ? await getHrAdminOrganizationItem(sectionKey, selected.id).catch(()=>null) : null;
  const detailData = detailResult?.data as HrAdminOrganizationItem | undefined;
  const detail = detailResult?.state === "live" && detailData?.id === selectedId ? detailData : null;
  const impact = detail ? getOrganizationImpactNotice(detail, sectionKey) : null;
  const canManage = sessionHasPermission(user, "organization.manage");
  const scope = { ...currentParams, section: sectionKey, page: String(page), page_size: String(pageSize) };
  const returnHref = buildHref("/hr-admin/organization", scope, { itemId: selectedId, saved: undefined });
  const createHref = `/hr-admin/organization/${sectionKey}/new?${new URLSearchParams({returnTo:returnHref})}`;
  const editHref = (id:string) => `/hr-admin/organization/${sectionKey}/${id}/edit?${new URLSearchParams({returnTo:buildHref("/hr-admin/organization",scope,{itemId:id,saved:undefined})})}`;
  return <main className="shell accerio-page organization-makeover">
    <WorkspaceStandardHeader title="Organization masters" description="Maintain the structure used by employee records and HR policies." actions={<>{canManage?<a data-navigation-mode="document" className="button button--primary" href={createHref}>Create {ORGANIZATION_SECTION_CONFIG[sectionKey].singular.toLowerCase()}</a>:null}{sessionHasPermission(user,"employees.view")?<a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/employees">Employees</a>:null}</>} />
    <div className="attendance-summary-strip" aria-label="Organization catalog summary"><span><strong>{active.items.length}</strong> loaded {active.label.toLowerCase()}</span><span><strong>{matched.length}</strong> matching</span><span><strong>{visible.length}</strong> on this page</span></div>
    {normalizeParam(currentParams.saved)==="1" && detail ? <div className="notice notice--success" role="status"><strong>{detail.name}</strong> Current record loaded. {detail.is_active?"Active":"Inactive"} · {detail.code}</div>:null}
    <section className="organization-catalog" aria-label="Organization catalog">
      <WorkspaceFilterForm action="/hr-admin/organization" label="Organization filters" className="organization-catalog-filters">
        <input type="hidden" name="page" value="1" />
        <label className="form-field">Section<select className="input-control" name="section" defaultValue={sectionKey}>{Object.entries(sections).map(([key,value])=><option key={key} value={key}>{value.label} ({value.items.length})</option>)}</select></label>
        <label className="form-field">Search<input className="input-control" name="q" defaultValue={q} placeholder="Name, code, parent or location" /></label>
        <label className="form-field">Status<select className="input-control" name="status" defaultValue={status}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label className="form-field">Page size<select className="input-control" name="page_size" defaultValue={pageSize}>{[10,25,50].map(size=><option key={size}>{size}</option>)}</select></label>
        <div className="form-actions-bar__buttons"><button className="button button--primary" type="submit">Apply filters</button><a data-navigation-mode="document" className="button button--secondary" href={`/hr-admin/organization?section=${sectionKey}`}>Clear filters</a></div>
      </WorkspaceFilterForm>
      <div className="workspace-table-region" role="region" aria-label="Organization master records" tabIndex={0}><table className="workspace-table" aria-label="Organization masters"><thead><tr><th>Name / code</th><th>Status</th><th>Dependencies</th><th>Actions</th></tr></thead><tbody>{visible.map(item=><tr key={item.id}><td><strong>{item.name}</strong><br/>{item.code}</td><td>{item.is_active?"Active":"Inactive"}</td><td>{itemMeta(item,sectionKey).filter(Boolean).join(" · ")||"No additional mapping"}<br/>{getOrganizationWarnings(item,sectionKey).join(" · ")}</td><td><div className="form-actions-bar__buttons"><a data-navigation-mode="document" className="button button--secondary" href={buildHref("/hr-admin/organization",scope,{itemId:item.id,saved:undefined})+"#organization-detail"}>Inspect</a>{canManage?<a data-navigation-mode="document" className="button button--ghost" href={editHref(item.id)}>Edit</a>:null}</div></td></tr>)}</tbody></table></div>
      {!matched.length?<p role="status">{active.items.length?"No organization records match the filters.":"No records in this organization section yet."}</p>:null}
      <PaginationBar navigationMode="document" firstHref={buildHref("/hr-admin/organization",scope,{page:"1"})} lastHref={buildHref("/hr-admin/organization",scope,{page:String(totalPages)})} nextHref={buildHref("/hr-admin/organization",scope,{page:String(page+1)})} previousHref={buildHref("/hr-admin/organization",scope,{page:String(page-1)})} hasNext={page<totalPages} hasPrevious={page>1} page={page} pageSize={pageSize} totalCount={matched.length} />
    </section>
    {selectedId?<section className="organization-detail" id="organization-detail" aria-label="Selected organization record"><div className="organization-detail-heading"><h2>{detail?detail.name:"Selected record unavailable"}</h2><a data-navigation-mode="document" className="button button--secondary" href={buildHref("/hr-admin/organization",scope,{itemId:undefined,saved:undefined})}>Close detail</a>{detail&&canManage?<a data-navigation-mode="document" className="button button--secondary" href={editHref(detail.id)}>Edit selected record</a>:null}</div>{detail?<>{!matched.some(item=>item.id===detail.id)?<p>This record is outside the current filters. The catalog scope is unchanged.</p>:null}{impact?<p>{impact.message}.</p>:null}<div className="detail-grid">{buildItemDetailRows(detail,sectionKey).map(row=><DetailRow key={row.label} label={row.label} value={row.value}/>)}</div></>:<p>The requested record could not be confirmed in this section. No other record has been selected.</p>}</section>:null}
    <details className="organization-library"><summary>Master library and dependencies</summary><div className="organization-library-grid">{(Object.keys(ORGANIZATION_SECTION_CONFIG) as OrganizationSectionKey[]).map(key=><article key={key}><h3>{sections[key].label}</h3><p>{masterDescriptions[key]}</p><p>{masterDependencyLabels[key]}</p><a data-navigation-mode="document" href={`/hr-admin/organization?section=${key}`}>Open {sections[key].label.toLowerCase()}</a></article>)}</div></details>
    {canManage?<OrganizationWorkflows snapshot={result.data}/>:null}
  </main>;
}
