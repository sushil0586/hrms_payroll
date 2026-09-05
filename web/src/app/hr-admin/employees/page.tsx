import Link from "next/link";

import { ActionMenu } from "@/components/patterns/action-menu";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminEmployeeDetail, getHrAdminEmployees } from "@/lib/api";
import type { HrAdminEmployeeDetail, HrAdminEmployeeListItem } from "@/lib/types";

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

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function countByStatus(items: HrAdminEmployeeListItem[], status: string) {
  if (status === "all") {
    return items.length;
  }
  return items.filter((item) => item.employment_status === status).length;
}

function countProvisioned(items: HrAdminEmployeeListItem[]) {
  return items.filter((item) => item.has_access).length;
}

function formatMembershipStatus(value: string) {
  return value ? value.replaceAll("_", " ") : "Not provisioned";
}

function filterByStatus(items: HrAdminEmployeeListItem[], status: string) {
  if (status === "all") {
    return items;
  }
  return items.filter((item) => item.employment_status === status);
}

function filterByQuery(items: HrAdminEmployeeListItem[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) =>
    [
      item.full_name,
      item.employee_code,
      item.work_email,
      item.department,
      item.business_unit,
      item.legal_entity,
      item.cost_center,
      item.designation,
      item.grade,
      item.employment_type,
      item.branch,
      item.location,
      item.reporting_manager,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
  );
}

function filterByDepartment(items: HrAdminEmployeeListItem[], department: string) {
  if (!department || department === "all") {
    return items;
  }
  return items.filter((item) => item.department === department);
}

function filterByManagerView(items: HrAdminEmployeeListItem[], managerView: string) {
  if (managerView === "managers") {
    return items.filter((item) => item.direct_reports_count > 0);
  }
  if (managerView === "needs_reassignment") {
    return items.filter(
      (item) =>
        item.direct_reports_count > 0 &&
        (item.employment_status === "inactive" || item.employment_status === "exited"),
    );
  }
  return items;
}

function getEmployeeStructuralWarnings(detail: HrAdminEmployeeDetail | HrAdminEmployeeListItem) {
  const warnings: string[] = [];
  if (!detail.department) {
    warnings.push("department missing");
  }
  if (!detail.designation) {
    warnings.push("designation missing");
  }
  if (!detail.branch) {
    warnings.push("branch missing");
  }
  if (!detail.location) {
    warnings.push("location missing");
  }
  return warnings;
}

function getEmployeeAccessWarnings(detail: HrAdminEmployeeDetail | HrAdminEmployeeListItem) {
  const warnings: string[] = [];
  const needsOperationalAccess = detail.employment_status === "active" || detail.employment_status === "on_notice";
  if (!detail.has_access && needsOperationalAccess) {
    warnings.push("active employee has no access");
  }
  if (detail.has_access && detail.membership_status !== "active" && needsOperationalAccess) {
    warnings.push("access is not fully active");
  }
  if (detail.has_access && detail.assigned_role_count === 0) {
    warnings.push("access has no assigned roles");
  }
  if (detail.direct_reports_count > 0 && (!detail.has_access || detail.membership_status !== "active")) {
    warnings.push("manager access is not ready for active reporting lines");
  }
  return warnings;
}

function getEmployeeManagerWarnings(detail: HrAdminEmployeeDetail | HrAdminEmployeeListItem) {
  const warnings: string[] = [];
  if (detail.direct_reports_count > 0 && (detail.employment_status === "inactive" || detail.employment_status === "exited")) {
    warnings.push("reassign direct reports before finalizing offboarding");
  }
  return warnings;
}

function getEmployeeWarnings(detail: HrAdminEmployeeDetail | HrAdminEmployeeListItem) {
  return [...getEmployeeStructuralWarnings(detail), ...getEmployeeAccessWarnings(detail), ...getEmployeeManagerWarnings(detail)];
}

function resolveSelectedItem(items: HrAdminEmployeeListItem[], selectedId?: string) {
  if (selectedId) {
    const selected = items.find((item) => item.id === selectedId);
    if (selected) {
      return selected;
    }
  }
  return items[0] ?? null;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function EmployeeDetailPanel({ detail }: { detail: HrAdminEmployeeDetail | null }) {
  if (!detail) {
    return (
      <div className="notice">
        <strong>No employee selected.</strong>
        <span className="muted">Choose an employee from the list to inspect their master detail.</span>
      </div>
    );
  }

  const structuralWarnings = getEmployeeStructuralWarnings(detail);
  const accessWarnings = getEmployeeAccessWarnings(detail);
  const managerWarnings = getEmployeeManagerWarnings(detail);

  return (
    <>
      {structuralWarnings.length ? (
        <div className="notice">
          <strong>Structural review needed.</strong>
          <span className="muted">{structuralWarnings.join(", ")}.</span>
        </div>
      ) : null}
      {accessWarnings.length ? (
        <div className="notice">
          <strong>Access review needed.</strong>
          <span className="muted">{accessWarnings.join(", ")}.</span>
        </div>
      ) : null}
      {managerWarnings.length ? (
        <div className="notice">
          <strong>Manager reassignment review needed.</strong>
          <span className="muted">{managerWarnings.join(", ")}.</span>
        </div>
      ) : null}
      <div className="detail-grid">
        <DetailRow label="Employee" value={`${detail.full_name} (${detail.employee_code})`} />
        <DetailRow label="Preferred Name" value={detail.preferred_name || "Not available"} />
        <DetailRow label="Employment Status" value={detail.employment_status.replace("_", " ")} />
        <DetailRow label="Date of Joining" value={formatDate(detail.date_of_joining)} />
        <DetailRow label="Probation End Date" value={formatDate(detail.probation_end_date)} />
        <DetailRow label="Confirmation Date" value={formatDate(detail.confirmation_date)} />
        <DetailRow label="Work Email" value={detail.work_email || "Not available"} />
        <DetailRow label="Personal Email" value={detail.personal_email || "Not available"} />
        <DetailRow label="Phone Number" value={detail.phone_number || "Not available"} />
        <DetailRow label="Legal Entity" value={detail.legal_entity || "Not mapped"} />
        <DetailRow label="Branch" value={detail.branch || "Not mapped"} />
        <DetailRow label="Location" value={detail.location || "Not mapped"} />
        <DetailRow label="Business Unit" value={detail.business_unit || "Not mapped"} />
        <DetailRow label="Department" value={detail.department || "Not mapped"} />
        <DetailRow label="Cost Center" value={detail.cost_center || "Not mapped"} />
        <DetailRow label="Designation" value={detail.designation || "Not mapped"} />
        <DetailRow label="Grade" value={detail.grade || "Not mapped"} />
        <DetailRow label="Employment Type" value={detail.employment_type || "Not mapped"} />
        <DetailRow label="Reporting Manager" value={detail.reporting_manager || "Not assigned"} />
        <DetailRow label="Direct Reports" value={String(detail.direct_reports_count)} />
        <DetailRow label="Access Provisioned" value={detail.has_access ? "Yes" : "No"} />
        <DetailRow label="Membership Status" value={formatMembershipStatus(detail.membership_status)} />
        <DetailRow label="Assigned Roles" value={String(detail.assigned_role_count)} />
        <DetailRow label="Last Updated" value={formatDateTime(detail.updated_at)} />
      </div>
    </>
  );
}

export default async function HrAdminEmployeesPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const status = normalizeParam(currentParams.status) ?? "all";
  const q = normalizeParam(currentParams.q) ?? "";
  const department = normalizeParam(currentParams.department) ?? "all";
  const managerView = normalizeParam(currentParams.managerView) ?? "all";

  const employeesResult = await getHrAdminEmployees();
  const departmentOptions = Array.from(new Set(employeesResult.data.map((employee) => employee.department).filter(Boolean))).sort();
  const filteredEmployees = filterByManagerView(
    filterByDepartment(filterByQuery(filterByStatus(employeesResult.data, status), q), department),
    managerView,
  );
  const selectedListItem = resolveSelectedItem(filteredEmployees, normalizeParam(currentParams.employeeId));
  const detailResult = selectedListItem ? await getHrAdminEmployeeDetail(selectedListItem.id) : null;
  const detail = detailResult?.data ?? null;
  const state =
    employeesResult.state === "live" && (!detailResult || detailResult.state === "live") ? "live" : "demo";

  const tabs = ["all", "active", "on_notice", "inactive", "exited"];

  return (
    <main className="shell">
      <PageIntro
        eyebrow={state === "live" ? "Live employees" : "Demo employees"}
        title="Employees"
        description="Directory, access, and org fit."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin">
              Admin
            </Link>
            <Link className="button button--primary" href="/hr-admin/employees/new">
              New employee
            </Link>
          </>
        }
        pills={["Directory", "Access", "Structure"]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile className="metric-tile-soft" label="Employees in scope" labelClassName="metric-label-soft" value={employeesResult.data.length} valueClassName="metric-value-soft" trend="Master coverage" trendClassName="metric-trend-soft" />
          <MetricTile className="metric-tile-soft" label="Active employees" labelClassName="metric-label-soft" value={countByStatus(employeesResult.data, "active")} valueClassName="metric-value-soft" trend="Current workforce" trendClassName="metric-trend-soft" />
          <MetricTile className="metric-tile-soft" label="Access provisioned" labelClassName="metric-label-soft" value={countProvisioned(employeesResult.data)} valueClassName="metric-value-soft" trend="Login-ready employees" trendClassName="metric-trend-soft" />
          <MetricTile className="metric-tile-soft" label="Departments represented" labelClassName="metric-label-soft" value={departmentOptions.length} valueClassName="metric-value-soft" trend="Org spread" trendClassName="metric-trend-soft" />
          <MetricTile
            className="metric-tile-soft"
            label="Managers in reporting chain"
            labelClassName="metric-label-soft"
            value={new Set(employeesResult.data.map((employee) => employee.reporting_manager).filter(Boolean)).size}
            valueClassName="metric-value-soft"
            trend="Leadership coverage"
            trendClassName="metric-trend-soft"
          />
        </div>
      </section>

      <section className="section employee-master-layout">
        <article className="queue-toolbar panel-card-soft">
          <div className="queue-toolbar__header">
            <div>
              <h2 className="section-heading-soft">Employee directory</h2>
              <p className="section-copy section-copy-soft">Filter first, then inspect one record in context.</p>
            </div>
            <div className="queue-toolbar__meta">
              <span className="queue-summary-chip">
                <strong>{filteredEmployees.length}</strong> in this view
              </span>
              <span className="queue-summary-chip">
                <strong>{selectedListItem ? "1" : "0"}</strong> selected
              </span>
            </div>
          </div>

          <form action="/hr-admin/employees" className="directory-filter-bar">
            <input name="status" type="hidden" value={status} />
            <label className="form-field">
              <span className="text-label-premium">Search</span>
              <input className="input-control" defaultValue={q} name="q" placeholder="Name, code, email, manager" />
            </label>
            <label className="form-field">
              <span className="text-label-premium">Department</span>
              <select className="input-control" defaultValue={department} name="department">
                <option value="all">All departments</option>
                {departmentOptions.map((item) => (
                  <option key={item} value={item ?? ""}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="text-label-premium">Manager review</span>
              <select className="input-control" defaultValue={managerView} name="managerView">
                <option value="all">All employees</option>
                <option value="managers">Managers only</option>
                <option value="needs_reassignment">Needs reassignment</option>
              </select>
            </label>
            <div className="directory-filter-bar__actions">
              <button className="button button--primary" type="submit">Apply</button>
              <Link className="button button--ghost" href="/hr-admin/employees">Reset</Link>
            </div>
          </form>

          <div className="employee-status-filter">
              {tabs.map((tabStatus) => (
                <Link
                  className={`filter-chip-link chip-filter-soft${status === tabStatus ? " filter-chip-link--active" : ""}`}
                  href={buildHref("/hr-admin/employees", currentParams, {
                    status: tabStatus,
                    employeeId: undefined,
                    q: q || undefined,
                    department: department !== "all" ? department : undefined,
                    managerView: managerView !== "all" ? managerView : undefined,
                  })}
                  key={tabStatus}
                >
                  <span>{tabStatus.replace("_", " ")}</span>
                  <strong>{countByStatus(employeesResult.data, tabStatus)}</strong>
                </Link>
              ))}
          </div>

          <div className="employee-directory-list">
            {filteredEmployees.length ? (
              filteredEmployees.map((employee) => {
                const warnings = getEmployeeWarnings(employee);
                return (
                <Link
                  className={`employee-directory-item directory-item-soft${selectedListItem?.id === employee.id ? " employee-directory-item--active" : ""}`}
                  href={buildHref("/hr-admin/employees", currentParams, { employeeId: employee.id })}
                  key={employee.id}
                >
                  <div className="employee-directory-item__header">
                    <div>
                      <strong>{employee.full_name}</strong>
                      <p className="section-copy">
                        {employee.employee_code} • {employee.department || "No department"} • {employee.designation || "No designation"}
                      </p>
                    </div>
                    <span className={`record-chip${employee.employment_status === "active" ? " record-chip--accent" : ""}`}>
                      {employee.employment_status}
                    </span>
                  </div>
                  <div className="employee-directory-item__meta">
                    <span>{employee.branch || "No branch"}</span>
                    <span>{employee.location || "No location"}</span>
                    <span>{employee.reporting_manager || "No manager"}</span>
                  </div>
                  <div className="employee-directory-item__meta">
                    <span>{employee.has_access ? "Access provisioned" : "No access yet"}</span>
                    <span>{formatMembershipStatus(employee.membership_status)}</span>
                    <span>{employee.assigned_role_count} roles</span>
                  </div>
                  <div className="employee-directory-item__meta">
                    <span>{employee.direct_reports_count} direct reports</span>
                    <span>{employee.direct_reports_count > 0 ? "Manager chain in use" : "Individual contributor"}</span>
                  </div>
                  {warnings.length ? (
                    <div className="employee-directory-item__meta">
                      <span>{warnings.length} review warnings</span>
                      <span>{warnings.slice(0, 2).join(" • ")}</span>
                    </div>
                  ) : null}
                  <span className="muted">{employee.work_email}</span>
                </Link>
                );
              })
            ) : (
              <div className="notice">
                <strong>No employees in this view.</strong>
                <span className="muted">Try another status tab or seed more tenant data.</span>
              </div>
            )}
          </div>
        </article>

        <article className="record-card panel-card-soft">
          <div className="record-card__header">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2 className="section-heading-soft">Employee master detail</h2>
              </div>
              <p className="section-copy section-copy-soft">Focused detail for the selected employee.</p>
            </div>
            {detail ? (
              <div className="record-card__actions">
                <ActionMenu
                  label="Actions"
                  items={[
                    {
                      href: `/hr-admin/employees/${detail.id}/edit`,
                      title: "Edit employee",
                      description: "Update profile, org mapping, and employment data.",
                    },
                    {
                      href: `/hr-admin/employees/${detail.id}/access`,
                      title: "Manage access",
                      description: "Review roles, login state, and membership access.",
                    },
                  ]}
                />
              </div>
            ) : null}
          </div>
          <div className="detail-grid-soft">
            <EmployeeDetailPanel detail={detail} />
          </div>
        </article>
      </section>
    </main>
  );
}
