import Link from "next/link";

import { ActionMenu } from "@/components/patterns/action-menu";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminEmployeeDetail, getHrAdminEmployeeFormOptions, getHrAdminEmployees } from "@/lib/api";
import type { HrAdminEmployeeDetail, HrAdminEmployeeListItem } from "@/lib/types";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { EmployeeBankImportWorkbench } from "./employee-bank-import-workbench";
import { EmployeeImportWorkbench } from "./employee-import-workbench";
import { EmployeeManagerImportWorkbench } from "./employee-manager-import-workbench";

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

function needsOperationalAccess(item: HrAdminEmployeeDetail | HrAdminEmployeeListItem) {
  return item.employment_status === "active" || item.employment_status === "on_notice";
}

function countManagersNeedingReview(items: HrAdminEmployeeListItem[]) {
  return items.filter((item) => getEmployeeManagerWarnings(item).length > 0).length;
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

function filterByReadiness(items: HrAdminEmployeeListItem[], readiness: string) {
  if (readiness === "access_review") {
    return items.filter((item) => getEmployeeAccessWarnings(item).length > 0);
  }
  if (readiness === "structure_review") {
    return items.filter((item) => getEmployeeStructuralWarnings(item).length > 0);
  }
  if (readiness === "manager_review") {
    return items.filter((item) => getEmployeeManagerWarnings(item).length > 0);
  }
  if (readiness === "ready") {
    return items.filter((item) => getEmployeeWarnings(item).length === 0);
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
  const requiresAccess = needsOperationalAccess(detail);
  if (!detail.has_access && requiresAccess) {
    warnings.push("active employee has no access");
  }
  if (detail.has_access && detail.membership_status !== "active" && requiresAccess) {
    warnings.push("access is not fully active");
  }
  if (detail.has_access && detail.assigned_role_count === 0) {
    warnings.push("access has no assigned roles");
  }
  if (detail.direct_reports_count > 0 && (!detail.has_access || detail.membership_status !== "active")) {
    warnings.push("manager access is not ready for active reporting lines");
  }
  if (!requiresAccess && (detail.has_access || detail.membership_status === "active")) {
    warnings.push("inactive or exited employee still has active access");
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
  const allWarnings = [...structuralWarnings, ...accessWarnings, ...managerWarnings];

  return (
    <>
      <div className="hr-employee-profile-summary">
        <div className="hr-employee-avatar" aria-hidden="true">
          {detail.full_name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div>
          <h3>{detail.full_name}</h3>
          <p>
            {detail.employee_code} • {detail.department || "No department"} • {detail.designation || "No designation"}
          </p>
        </div>
        <span className={`record-chip${detail.employment_status === "active" ? " record-chip--accent" : ""}`}>
          {detail.employment_status.replace("_", " ")}
        </span>
      </div>
      <div className="hr-employee-readiness-strip">
        <span className={structuralWarnings.length ? "hr-employee-readiness-pill hr-employee-readiness-pill--warn" : "hr-employee-readiness-pill"}>
          Structure {structuralWarnings.length ? "review" : "ready"}
        </span>
        <span className={accessWarnings.length ? "hr-employee-readiness-pill hr-employee-readiness-pill--warn" : "hr-employee-readiness-pill"}>
          Access {accessWarnings.length ? "review" : "ready"}
        </span>
        <span className={managerWarnings.length ? "hr-employee-readiness-pill hr-employee-readiness-pill--warn" : "hr-employee-readiness-pill"}>
          Manager chain {managerWarnings.length ? "review" : "ready"}
        </span>
      </div>
      {allWarnings.length ? (
        <div className="platform-validation-strip platform-validation-strip--warning">
          <strong>{allWarnings.length} readiness item{allWarnings.length === 1 ? "" : "s"} need review.</strong>
          <span>{allWarnings.slice(0, 3).join(", ")}.</span>
        </div>
      ) : null}
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
  const sessionUser = await requireSessionPermission({
    permissionKeys: ["employees.view", "employees.create", "employees.edit", "employees.import", "employees.access.manage"],
    fallbackPath: "/hr-admin",
  });
  const currentParams = (await searchParams) ?? {};
  const status = normalizeParam(currentParams.status) ?? "all";
  const q = normalizeParam(currentParams.q) ?? "";
  const department = normalizeParam(currentParams.department) ?? "all";
  const managerView = normalizeParam(currentParams.managerView) ?? "all";
  const readiness = normalizeParam(currentParams.readiness) ?? "all";
  const page = Math.max(Number(normalizeParam(currentParams.page) ?? "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) ?? "8") || 8, 1), 50);

  const [employeesResult, optionsResult] = await Promise.all([getHrAdminEmployees(), getHrAdminEmployeeFormOptions()]);
  const departmentOptions = Array.from(new Set(employeesResult.data.map((employee) => employee.department).filter(Boolean))).sort();
  const filteredEmployees = filterByReadiness(
    filterByManagerView(
      filterByDepartment(filterByQuery(filterByStatus(employeesResult.data, status), q), department),
      managerView,
    ),
    readiness,
  );
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedEmployees = filteredEmployees.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedListItem = resolveSelectedItem(
    filteredEmployees,
    normalizeParam(currentParams.employeeId) ?? pagedEmployees[0]?.id,
  );
  const detailResult = selectedListItem ? await getHrAdminEmployeeDetail(selectedListItem.id) : null;
  const detail = detailResult?.data ?? null;
  const state =
    employeesResult.state === "live" && (!detailResult || detailResult.state === "live") ? "live" : "demo";
  const canCreateEmployees = sessionHasPermission(sessionUser, "employees.create");
  const canEditEmployees = sessionHasPermission(sessionUser, "employees.edit");
  const canImportEmployees = sessionHasPermission(sessionUser, "employees.import");
  const canManageEmployeeAccess = sessionHasPermission(sessionUser, "employees.access.manage");
  const accessReadyCount = employeesResult.data.filter((item) => getEmployeeAccessWarnings(item).length === 0).length;
  const accessReviewCount = employeesResult.data.length - accessReadyCount;
  const accessReadinessPercent = employeesResult.data.length ? Math.round((accessReadyCount / employeesResult.data.length) * 100) : 0;
  const structureReviewCount = employeesResult.data.filter((item) => getEmployeeStructuralWarnings(item).length > 0).length;
  const managerReviews = countManagersNeedingReview(employeesResult.data);

  const tabs = ["all", "active", "on_notice", "inactive", "exited"];

  return (
    <main className="shell hr-employee-workbench">
      <PageIntro
        eyebrow={state === "live" ? "Live employees" : "Demo employees"}
        title="Employees"
        description="Operate the employee master, access readiness, manager structure, and payroll prerequisites from one focused workbench."
        className="page-header-surface page-header-surface--compact hr-employee-page-header"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin">
              Admin
            </Link>
            {canCreateEmployees ? (
              <Link className="button button--primary" href="/hr-admin/employees/new">
                New employee
              </Link>
            ) : null}
          </>
        }
        pills={["Directory", "Access", "Structure"]}
        showPills
      />

      <section className="section hr-employee-command-grid">
        <div className="hr-employee-command-panel panel-card-soft">
          <div>
            <span className="eyebrow-soft">Workforce command</span>
            <h2 className="section-heading-soft">Keep employee data ready for access, payroll, and approvals.</h2>
            <p className="section-copy section-copy-soft">
              Use the directory for daily lookup, the selected profile for correction work, and imports for controlled bulk updates.
            </p>
          </div>
          <div className="hr-employee-command-actions">
            {canImportEmployees ? <a className="button button--secondary" href="#employee-imports">Import updates</a> : null}
            {canCreateEmployees ? (
              <Link className="button button--primary" href="/hr-admin/employees/new">
                New employee
              </Link>
            ) : null}
          </div>
        </div>
        <div className="hr-employee-health-panel panel-card-soft">
          <div
            className={`hr-employee-health-ring${accessReviewCount ? " hr-employee-health-ring--warn" : " hr-employee-health-ring--ready"}`}
            aria-label={`${accessReviewCount} employees need access review; ${accessReadyCount} of ${employeesResult.data.length} access-ready`}
            style={{
              background: `radial-gradient(circle at center, #fff 57%, transparent 58%), conic-gradient(var(--hr-employee-ring-color) 0 ${accessReadinessPercent}%, rgba(226, 232, 240, 0.95) ${accessReadinessPercent}% 100%)`,
            }}
          >
            <strong>{accessReviewCount}</strong>
            <span>need review</span>
          </div>
          <div>
            <span className="eyebrow-soft">Operational readiness</span>
            <h3>Access readiness review</h3>
            <p>
              {accessReviewCount
                ? `${accessReadyCount} of ${employeesResult.data.length} employees are access-ready. ${accessReviewCount} need IAM, membership, or role cleanup before launch.`
                : "All employee access records are ready for the current workforce."}
            </p>
            <div className="hr-employee-health-actions">
              <Link className="button button--secondary button--compact" href="/hr-admin/employees?readiness=access_review&page_size=25">
                Review access
              </Link>
              <Link className="button button--ghost button--compact" href="/hr-admin/employees?readiness=structure_review&page_size=25">
                Structure
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="hr-employee-kpi-grid">
          <MetricTile className="metric-tile-soft" label="Employees in scope" labelClassName="metric-label-soft" value={employeesResult.data.length} valueClassName="metric-value-soft" trend="Master coverage" trendClassName="metric-trend-soft" />
          <MetricTile className="metric-tile-soft" label="Active employees" labelClassName="metric-label-soft" value={countByStatus(employeesResult.data, "active")} valueClassName="metric-value-soft" trend="Current workforce" trendClassName="metric-trend-soft" />
          <MetricTile className="metric-tile-soft" label="Access provisioned" labelClassName="metric-label-soft" value={countProvisioned(employeesResult.data)} valueClassName="metric-value-soft" trend="Login-ready employees" trendClassName="metric-trend-soft" />
          <MetricTile className="metric-tile-soft" label="Departments represented" labelClassName="metric-label-soft" value={departmentOptions.length} valueClassName="metric-value-soft" trend="Org spread" trendClassName="metric-trend-soft" />
          <MetricTile
            className="metric-tile-soft"
            label="Manager reviews"
            labelClassName="metric-label-soft"
            value={managerReviews}
            valueClassName="metric-value-soft"
            trend={`${structureReviewCount} structure reviews`}
            trendClassName="metric-trend-soft"
          />
        </div>
      </section>

      <section className="section employee-master-layout">
        <article className="queue-toolbar panel-card-soft">
          <div className="queue-toolbar__header">
            <div>
              <h2 className="section-heading-soft">Employee directory</h2>
              <p className="section-copy section-copy-soft">Search and filter the master list, then inspect one record in context.</p>
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
            <input name="page" type="hidden" value="1" />
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
            <label className="form-field">
              <span className="text-label-premium">Readiness</span>
              <select className="input-control" defaultValue={readiness} name="readiness">
                <option value="all">All readiness</option>
                <option value="access_review">Access review</option>
                <option value="structure_review">Structure review</option>
                <option value="manager_review">Manager review</option>
                <option value="ready">Ready records</option>
              </select>
            </label>
            <label className="form-field">
              <span className="text-label-premium">Page size</span>
              <select className="input-control" defaultValue={String(pageSize)} name="page_size">
                {[5, 8, 10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
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
                    page: "1",
                    q: q || undefined,
                    department: department !== "all" ? department : undefined,
                    managerView: managerView !== "all" ? managerView : undefined,
                    readiness: readiness !== "all" ? readiness : undefined,
                    page_size: String(pageSize),
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
              pagedEmployees.map((employee) => {
                const warnings = getEmployeeWarnings(employee);
                return (
                <Link
                  className={`employee-directory-item directory-item-soft${selectedListItem?.id === employee.id ? " employee-directory-item--active" : ""}`}
                  href={buildHref("/hr-admin/employees", currentParams, { employeeId: employee.id })}
                  key={employee.id}
                >
                  <div className="employee-directory-item__header">
                    <div className="hr-employee-list-identity">
                      <span className="hr-employee-avatar hr-employee-avatar--small" aria-hidden="true">
                        {employee.full_name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <div>
                        <strong>{employee.full_name}</strong>
                        <p className="section-copy">
                          {employee.employee_code} • {employee.department || "No department"} • {employee.designation || "No designation"}
                        </p>
                      </div>
                    </div>
                    <div className="hr-employee-row-status">
                      {warnings.length ? <span className="record-chip record-chip--warning">{warnings.length} review</span> : null}
                      <span className={`record-chip${employee.employment_status === "active" ? " record-chip--accent" : ""}`}>
                        {employee.employment_status.replace("_", " ")}
                      </span>
                    </div>
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

          <PaginationBar
            firstHref={buildHref("/hr-admin/employees", currentParams, { page: "1", page_size: String(pageSize), employeeId: undefined })}
            hasNext={safePage < totalPages}
            hasPrevious={safePage > 1}
            lastHref={buildHref("/hr-admin/employees", currentParams, { page: String(totalPages), page_size: String(pageSize), employeeId: undefined })}
            nextHref={buildHref("/hr-admin/employees", currentParams, { page: String(safePage + 1), page_size: String(pageSize), employeeId: undefined })}
            page={safePage}
            pageSize={pageSize}
            previousHref={buildHref("/hr-admin/employees", currentParams, { page: String(safePage - 1), page_size: String(pageSize), employeeId: undefined })}
            totalCount={filteredEmployees.length}
          />
        </article>

        <article className="record-card panel-card-soft">
          <div className="record-card__header">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2 className="section-heading-soft">Employee master detail</h2>
              </div>
              <p className="section-copy section-copy-soft">Focused detail for the selected employee.</p>
            </div>
            {detail && (canEditEmployees || canManageEmployeeAccess) ? (
              <div className="record-card__actions">
                <ActionMenu
                  label="Actions"
                  items={[
                    ...(canEditEmployees
                      ? [
                          {
                            href: `/hr-admin/employees/${detail.id}/edit`,
                            title: "Edit employee",
                            description: "Update profile, org mapping, and employment data.",
                          },
                        ]
                      : []),
                    ...(canManageEmployeeAccess
                      ? [
                          {
                            href: `/hr-admin/employees/${detail.id}/access`,
                            title: "Manage access",
                            description: "Review roles, login state, and membership access.",
                          },
                        ]
                      : []),
                    ...(canEditEmployees
                      ? [
                          {
                            href: `/hr-admin/employees/${detail.id}/bank-accounts`,
                            title: "Manage bank accounts",
                            description: "Maintain payout account coverage for payroll readiness.",
                          },
                        ]
                      : []),
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

      <div id="employee-imports" />
      {canImportEmployees && canCreateEmployees ? <EmployeeImportWorkbench employees={employeesResult.data} options={optionsResult.data} /> : null}
      {canImportEmployees && canEditEmployees ? <EmployeeBankImportWorkbench employees={employeesResult.data} /> : null}
      {canImportEmployees && canEditEmployees ? <EmployeeManagerImportWorkbench employees={employeesResult.data} options={optionsResult.data} /> : null}
    </main>
  );
}
