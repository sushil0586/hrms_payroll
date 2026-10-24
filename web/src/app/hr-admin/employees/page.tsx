import { WorkspaceFilterForm } from "@/components/patterns/workspace-filter-form";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";

import { EmployeeDirectoryFilters } from "./employee-directory-filters";

import { employeeAccessDetailToFormValue } from "@/app/hr-admin/employees/[employeeId]/access/form-values";
import { EmployeeMaintenanceDialog } from "./employee-maintenance-dialog";
import { PageIntro } from "@/components/patterns/page-intro";
import {
  getHrAdminEmployeeAccessDetail,
  getHrAdminEmployeeAccessOptions,
  getHrAdminEmployeeBankAccounts,
  getHrAdminEmployeeDetail,
  getHrAdminEmployeeFormOptions,
  getHrAdminEmployees,
} from "@/lib/api";
import type { HrAdminEmployeeDetail, HrAdminEmployeeListItem } from "@/lib/types";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { EmployeeBankImportWorkbench } from "./employee-bank-import-workbench";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { EmployeeImportWorkbench } from "./employee-import-workbench";
import { EmployeeManagerImportWorkbench } from "./employee-manager-import-workbench";
import {
  EmployeeSelectionLink,
  EmployeeSelectionProvider,
  EmployeeSelectionRow,
} from "./employee-detail-selection";
import { createEmptyEmployeeFormValue, employeeDetailToFormValue } from "./form-values";

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
    if (normalized && key !== "saved") {
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

function formatMembershipStatus(value: string) {
  return value ? value.replaceAll("_", " ") : "Not provisioned";
}

function formatStatusLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function employeeStatusChipClass(status: string) {
  if (status === "active") {
    return "record-chip record-chip--success employee-status-chip employee-status-chip--active";
  }
  if (status === "on_notice") {
    return "record-chip record-chip--warning employee-status-chip employee-status-chip--on-notice";
  }
  if (status === "inactive") {
    return "record-chip record-chip--neutral employee-status-chip employee-status-chip--inactive";
  }
  if (status === "exited") {
    return "record-chip record-chip--danger employee-status-chip employee-status-chip--exited";
  }
  return "record-chip record-chip--neutral employee-status-chip";
}

function formatReviewReason(warnings: string[]) {
  if (!warnings.length) {
    return "Ready";
  }
  return warnings[0].charAt(0).toUpperCase() + warnings[0].slice(1);
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
  if (!selectedId) {
    return null;
  }
  return items.find((item) => item.id === selectedId) ?? null;
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
  const createMode = normalizeParam(currentParams.create) === "1";
  const actionMode = normalizeParam(currentParams.action);
  const requestedPage = Number(normalizeParam(currentParams.page));
  const page = Number.isFinite(requestedPage) ? Math.max(Math.floor(requestedPage) || 1, 1) : 1;
  const requestedSize = Number(normalizeParam(currentParams.page_size));
  const pageSize = [5, 8, 10, 25, 50].includes(requestedSize) ? requestedSize : 8;
  const sort = ["name", "-name", "code", "-code"].includes(normalizeParam(currentParams.sort) ?? "") ? normalizeParam(currentParams.sort)! : "name";

  const [employeesResult, optionsResult] = await Promise.all([getHrAdminEmployees(), getHrAdminEmployeeFormOptions()]);
  const departmentOptions = Array.from(new Set(employeesResult.data.map((employee) => employee.department).filter(Boolean))).sort();
  const filteredEmployees = [...filterByReadiness(
    filterByManagerView(
      filterByDepartment(filterByQuery(filterByStatus(employeesResult.data, status), q), department),
      managerView,
    ),
    readiness,
  )];
  filteredEmployees.sort((a, b) => {
    const field = sort.endsWith("code") ? "employee_code" : "full_name";
    const order = a[field].localeCompare(b[field], "en", { numeric: true, sensitivity: "base" }) || a.id.localeCompare(b.id);
    return sort.startsWith("-") ? -order : order;
  });
  const viewKey = JSON.stringify([status, q, department, managerView, readiness, sort, pageSize, page]);
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedEmployees = filteredEmployees.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedEmployeeId = normalizeParam(currentParams.employeeId) ?? null;
  const selectedListItem = resolveSelectedItem(employeesResult.data, selectedEmployeeId ?? undefined);
  const detailResult = selectedListItem ? await getHrAdminEmployeeDetail(selectedListItem.id) : null;
  const detail = detailResult?.data ?? null;
  const editMode = actionMode === "edit" && Boolean(detail);
  const accessMode = actionMode === "access" && Boolean(detail);
  const bankMode = actionMode === "bank" && Boolean(detail);
  const state =
    employeesResult.state === "live" && (!detailResult || detailResult.state === "live") ? "live" : "demo";
  const demoPermissionPreview = !sessionUser && state === "demo";
  const canCreateEmployees = demoPermissionPreview || sessionHasPermission(sessionUser, "employees.create");
  const canEditEmployees = demoPermissionPreview || sessionHasPermission(sessionUser, "employees.edit");
  const canImportEmployees = demoPermissionPreview || sessionHasPermission(sessionUser, "employees.import");
  const canManageEmployeeAccess = demoPermissionPreview || sessionHasPermission(sessionUser, "employees.access.manage");
  const recordsNeedingReview = employeesResult.data.filter((item) => getEmployeeWarnings(item).length > 0).length;
  const defaultStatus = optionsResult.data.employment_statuses.find((item) => item.value === "draft")?.value || optionsResult.data.employment_statuses[0]?.value || "draft";
  const [accessResult, accessOptionsResult, bankAccountsResult] = await Promise.all([
    accessMode && canManageEmployeeAccess && detail ? getHrAdminEmployeeAccessDetail(detail.id) : Promise.resolve(null),
    accessMode && canManageEmployeeAccess ? getHrAdminEmployeeAccessOptions() : Promise.resolve(null),
    bankMode && canEditEmployees && detail ? getHrAdminEmployeeBankAccounts(detail.id) : Promise.resolve(null),
  ]);

  const tabs = ["all", "active", "on_notice", "inactive", "exited"];
  const closeActionHref = buildHref("/hr-admin/employees", currentParams, { action: undefined, create: undefined });

  return (
    <main className="shell hr-admin-compact-ui hr-employee-workbench accerio-page employee-directory-phase2">
      <PageIntro
        appearance="accerio"
        eyebrow={state === "live" ? "Live employees" : "Demo employees"}
        title="Employees"
        description="Find employees and manage their profile, access and payout details."
        className="page-header-surface page-header-surface--compact hr-employee-page-header"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            {canCreateEmployees ? (
              <a data-navigation-mode="document"
                className="button button--primary"
                href={buildHref("/hr-admin/employees", currentParams, { create: "1", employeeId: undefined })}
              >
                New employee
              </a>
            ) : null}
          </>
        }
      />

      {["create", "edit"].includes(normalizeParam(currentParams.saved) ?? "") ? (
        <div className="notice notice--success" role="status">
          <strong>{normalizeParam(currentParams.saved) === "create" ? "Employee created." : "Employee changes saved."}</strong>
          <span>The saved employee is selected below. Directory filters still apply.</span>
        </div>
      ) : null}

      <section className="section">
        <div className="hr-employee-summary-strip" role="group" aria-label="Directory totals">
          <span>
            <strong>{employeesResult.data.length}</strong>
            <em>employees</em>
          </span>
          <span>
            <strong>{countProvisioned(employeesResult.data)}</strong>
            <em>access provisioned</em>
          </span>
          <span className={recordsNeedingReview ? "hr-employee-summary-strip__review" : ""}>
            <strong>{recordsNeedingReview}</strong>
            <em>need data review</em>
          </span>
          <span className="employee-directory-status-totals"><em>{tabs.slice(1).map(value => `${countByStatus(employeesResult.data, value)} ${formatStatusLabel(value).toLowerCase()}`).join(" · ")}</em></span>
        </div>
      </section>

      <EmployeeSelectionProvider
        key={viewKey}
        canEditEmployees={canEditEmployees}
        canManageEmployeeAccess={canManageEmployeeAccess}
        initialDetail={detail}
        initialSelectedId={selectedListItem?.id ?? null}
      >
        <article className="queue-toolbar panel-card-soft workspace-list-card">
          <div className="queue-toolbar__header">
            <div>
              <h2 className="section-heading-soft">Directory</h2>
              <p className="section-copy section-copy-soft">Search and filter the master list, then inspect one record in context.</p>
            </div>
            <div className="queue-toolbar__meta">
              <span className="queue-summary-chip">
                <strong>{filteredEmployees.length}</strong> in this view
              </span>
              <span className="queue-summary-chip">
                <strong>{[q.trim(), department !== "all", status !== "all", managerView !== "all", readiness !== "all"].filter(Boolean).length}</strong> active filters
              </span>
            </div>
          </div>

          <WorkspaceFilterForm label="Directory filters" key={viewKey} action="/hr-admin/employees" className="directory-filter-bar">
            <input name="page" type="hidden" value="1" />
            <input name="page_size" type="hidden" value={String(pageSize)} />
            <label className="form-field">
              <span className="text-label-premium">Search</span>
              <input className="input-control" defaultValue={q} name="q" placeholder="Name, code, email, manager" />
            </label>
            <EmployeeDirectoryFilters activeCount={[department !== "all", status !== "all", sort !== "name", managerView !== "all", readiness !== "all"].filter(Boolean).length}>
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
              <span className="text-label-premium">Status</span>
              <select className="input-control" defaultValue={status} name="status">
                {tabs.map((tabStatus) => (
                  <option key={tabStatus} value={tabStatus}>
                    {formatStatusLabel(tabStatus)}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="text-label-premium">Sort by</span>
              <select className="input-control" name="sort" defaultValue={sort}>
                <option value="name">Name A–Z</option><option value="-name">Name Z–A</option>
                <option value="code">Code ascending</option><option value="-code">Code descending</option>
              </select>
            </label>
            <div className="employee-directory-advanced">
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
            </div>
            </EmployeeDirectoryFilters>
            <div className="directory-filter-bar__actions workspace-filter-actions">
              <button className="button button--primary" type="submit">Apply</button>
              <a className="button button--ghost" data-navigation-mode="document" href="/hr-admin/employees">Reset</a>
            </div>
          </WorkspaceFilterForm>

          <WorkspaceTableScrollRegion className="employee-directory-table-wrap workspace-table-region" label="Employee directory, scroll for more columns">
            {filteredEmployees.length ? (
              <table className="employee-directory-table workspace-data-table" aria-label="Employee directory">
                <thead>
                  <tr>
                    <th scope="col">Employee</th>
                    <th scope="col">Structure</th>
                    <th scope="col">Manager</th>
                    <th scope="col">Access</th>
                    <th scope="col">Status</th>
                    <th scope="col">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedEmployees.map((employee) => {
                    const warnings = getEmployeeWarnings(employee);
                    return (
                      <EmployeeSelectionRow employeeId={employee.id} key={employee.id}>
                        <td>
                          <EmployeeSelectionLink className="employee-directory-table__identity" employeeId={employee.id} href={buildHref("/hr-admin/employees", currentParams, { employeeId: employee.id, action: undefined })}>
                            <span className="hr-employee-avatar hr-employee-avatar--small" aria-hidden="true">
                              {employee.full_name
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                            <span>
                              <strong>{employee.full_name}</strong>
                              <small>{employee.employee_code}</small>
                            </span>
                          </EmployeeSelectionLink>
                        </td>
                        <td>
                          <strong>{employee.department || "No department"}</strong>
                          <small>{employee.designation || "No designation"} - {employee.location || "No location"}</small>
                        </td>
                        <td>
                          <strong>{employee.reporting_manager || "No manager"}</strong>
                          <small>{employee.direct_reports_count} direct reports</small>
                        </td>
                        <td>
                          <strong>{employee.has_access ? "Provisioned" : "Not provisioned"}</strong>
                          <small>{formatMembershipStatus(employee.membership_status)} - {employee.assigned_role_count} roles</small>
                        </td>
                        <td>
                          <span className={employeeStatusChipClass(employee.employment_status)}>
                            {formatStatusLabel(employee.employment_status)}
                          </span>
                        </td>
                        <td>
                          <EmployeeSelectionLink
                            className={`employee-review-chip record-chip${warnings.length ? " record-chip--warning employee-review-chip--warning" : " record-chip--success"}`}
                            employeeId={employee.id}
                            href={buildHref("/hr-admin/employees", currentParams, { employeeId: employee.id })}
                          >
                            <strong>{warnings.length ? "Needs review" : "Ready"}</strong>
                            {warnings.length ? <small>{formatReviewReason(warnings)}</small> : null}
                          </EmployeeSelectionLink>
                        </td>
                      </EmployeeSelectionRow>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="notice">
                <strong>No employees in this view.</strong>
                <span className="muted">Adjust your filters or reset the directory to see available employees.</span>
              </div>
            )}
          </WorkspaceTableScrollRegion>

          <section className="card panel pagination-panel employee-directory-pagination">
            <div className="pagination-bar">
              <div className="pagination-bar__summary">
                <span className="queue-summary-chip">
                  <strong>
                    {filteredEmployees.length === 0 ? 0 : ((safePage - 1) * pageSize) + 1}-{filteredEmployees.length === 0 ? 0 : Math.min(safePage * pageSize, filteredEmployees.length)}
                  </strong>
                  of {filteredEmployees.length} records
                </span>
                <form data-navigation-mode="document" key={viewKey} method="get" action="/hr-admin/employees" className="employee-page-size-form" aria-label="Directory pagination">
                  <input name="sort" type="hidden" value={sort} />
                  <input name="status" type="hidden" value={status} />
                  <input name="page" type="hidden" value="1" />
                  {q ? <input name="q" type="hidden" value={q} /> : null}
                  {department !== "all" ? <input name="department" type="hidden" value={department} /> : null}
                  {managerView !== "all" ? <input name="managerView" type="hidden" value={managerView} /> : null}
                  {readiness !== "all" ? <input name="readiness" type="hidden" value={readiness} /> : null}
                  <label>
                    <span>Rows</span>
                    <select className="input-control" defaultValue={String(pageSize)} name="page_size">
                      {[5, 8, 10, 25, 50].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="button button--secondary button--compact" type="submit">Apply</button>
                </form>
              </div>
              {totalPages > 1 ? (
                <div className="pagination-bar__actions">
                  <a data-navigation-mode="document" className="button button--secondary" href={buildHref("/hr-admin/employees", currentParams, { action: undefined, create: undefined, page: "1", page_size: String(pageSize), employeeId: undefined })}>First</a>
                  <a data-navigation-mode="document" className="button button--secondary" href={buildHref("/hr-admin/employees", currentParams, { action: undefined, create: undefined, page: String(Math.max(1, safePage - 1)), page_size: String(pageSize), employeeId: undefined })}>Previous</a>
                  <a data-navigation-mode="document" className="button button--secondary" href={buildHref("/hr-admin/employees", currentParams, { action: undefined, create: undefined, page: String(Math.min(totalPages, safePage + 1)), page_size: String(pageSize), employeeId: undefined })}>Next</a>
                  <a data-navigation-mode="document" className="button button--secondary" href={buildHref("/hr-admin/employees", currentParams, { action: undefined, create: undefined, page: String(totalPages), page_size: String(pageSize), employeeId: undefined })}>Last</a>
                </div>
              ) : null}
            </div>
          </section>
        </article>

      </EmployeeSelectionProvider>

      {canImportEmployees ? (
        <section className="section" id="employee-imports">
          <details className="employee-imports-disclosure panel-card-soft">
            <summary>
              <span>
                <strong>Bulk imports</strong>
                <small>Open only when loading employees, bank accounts, or manager mappings from CSV.</small>
              </span>
              <span className="button button--secondary button--compact">Open tools</span>
            </summary>
            <div className="employee-imports-disclosure__body">
              {canCreateEmployees ? <EmployeeImportWorkbench employees={employeesResult.data} options={optionsResult.data} /> : null}
              {canEditEmployees ? <EmployeeBankImportWorkbench employees={employeesResult.data} /> : null}
              {canEditEmployees ? <EmployeeManagerImportWorkbench employees={employeesResult.data} options={optionsResult.data} /> : null}
            </div>
          </details>
        </section>
      ) : null}

      {createMode && canCreateEmployees ? (
        <EmployeeFormDialog
          closeHref={buildHref("/hr-admin/employees", currentParams, { create: undefined })}
          initialValue={createEmptyEmployeeFormValue(defaultStatus)}
          mode="create"
          options={optionsResult.data}
        />
      ) : null}

      {editMode && canEditEmployees && detail ? (
        <EmployeeFormDialog
          closeHref={closeActionHref}
          employeeId={detail.id}
          initialValue={employeeDetailToFormValue(detail)}
          mode="edit"
          options={optionsResult.data}
        />
      ) : null}

      {accessMode && canManageEmployeeAccess && detail && accessResult?.data?.employee_id && accessOptionsResult ? (
        <EmployeeMaintenanceDialog kind="access" closeHref={closeActionHref} employeeCode={detail.employee_code} employeeName={detail.full_name} form={{
          employeeId: detail.id, existingAccess: accessResult.data.has_access, employeeStatus: detail.employment_status,
          initialValue: employeeAccessDetailToFormValue(accessResult.data), options: accessOptionsResult.data,
        }} />
      ) : null}

      {bankMode && canEditEmployees && detail && bankAccountsResult ? (
        <EmployeeMaintenanceDialog kind="bank" closeHref={closeActionHref} employeeCode={detail.employee_code} employeeName={detail.full_name} form={{
          employeeId: detail.id, employeeName: detail.full_name, initialAccounts: bankAccountsResult.data ?? [],
        }} />
      ) : null}
    </main>
  );
}
