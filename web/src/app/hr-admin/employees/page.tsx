import Link from "next/link";

import { EmployeeAccessForm } from "@/app/hr-admin/employees/[employeeId]/access/access-form";
import { employeeAccessDetailToFormValue } from "@/app/hr-admin/employees/[employeeId]/access/form-values";
import { BankAccountManager } from "@/app/hr-admin/employees/[employeeId]/bank-accounts/bank-account-manager";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
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
import { EmployeeForm } from "./employee-form";
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
  const selectedEmployeeId = normalizeParam(currentParams.employeeId) ?? null;
  const selectedListItem = resolveSelectedItem(filteredEmployees, selectedEmployeeId ?? undefined);
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
  const accessReadyCount = employeesResult.data.filter((item) => getEmployeeAccessWarnings(item).length === 0).length;
  const accessReviewCount = employeesResult.data.length - accessReadyCount;
  const accessReadinessPercent = employeesResult.data.length ? Math.round((accessReadyCount / employeesResult.data.length) * 100) : 0;
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
    <main className="shell hr-admin-compact-ui hr-employee-workbench">
      <PageIntro
        eyebrow={state === "live" ? "Live employees" : "Demo employees"}
        title="Employees"
        description="Operate employee master data, access readiness, manager structure, and payroll prerequisites."
        className="page-header-surface page-header-surface--compact hr-employee-page-header"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin">
              Back to dashboard
            </Link>
            {canCreateEmployees ? (
              <Link
                className="button button--primary"
                href={buildHref("/hr-admin/employees", currentParams, { create: "1", employeeId: undefined })}
              >
                New employee
              </Link>
            ) : null}
          </>
        }
        pills={["Directory", "Access", "Structure"]}
        showPills
      />

      <section className="section hr-employee-command-grid">
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
              {canImportEmployees ? <a className="button button--secondary button--compact" href="#employee-imports">Bulk imports</a> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="hr-employee-summary-strip" aria-label="Employee directory summary">
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
            <em>need review</em>
          </span>
        </div>
      </section>

      <EmployeeSelectionProvider
        canEditEmployees={canEditEmployees}
        canManageEmployeeAccess={canManageEmployeeAccess}
        initialDetail={detail}
        initialSelectedId={selectedListItem?.id ?? null}
      >
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
            <input name="page" type="hidden" value="1" />
            <input name="page_size" type="hidden" value={String(pageSize)} />
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
              <span className="text-label-premium">Status</span>
              <select className="input-control" defaultValue={status} name="status">
                {tabs.map((tabStatus) => (
                  <option key={tabStatus} value={tabStatus}>
                    {formatStatusLabel(tabStatus)}
                  </option>
                ))}
              </select>
            </label>
            <details className="directory-more-filters">
              <summary className="button button--secondary button--compact">More filters</summary>
              <div className="directory-more-filters__panel">
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
            </details>
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
                  <span>{formatStatusLabel(tabStatus)}</span>
                  <strong>{countByStatus(employeesResult.data, tabStatus)}</strong>
                </Link>
              ))}
          </div>

          <div className="employee-directory-table-wrap">
            {filteredEmployees.length ? (
              <table className="employee-directory-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Structure</th>
                    <th>Manager</th>
                    <th>Access</th>
                    <th>Status</th>
                    <th>Review</th>
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
                <span className="muted">Try another status tab or seed more tenant data.</span>
              </div>
            )}
          </div>

          <section className="card panel pagination-panel employee-directory-pagination">
            <div className="pagination-bar">
              <div className="pagination-bar__summary">
                <span className="queue-summary-chip">
                  <strong>
                    {filteredEmployees.length === 0 ? 0 : ((safePage - 1) * pageSize) + 1}-{filteredEmployees.length === 0 ? 0 : Math.min(safePage * pageSize, filteredEmployees.length)}
                  </strong>
                  of {filteredEmployees.length} records
                </span>
                <form action="/hr-admin/employees" className="employee-page-size-form">
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
                  <Link className="button button--secondary" href={buildHref("/hr-admin/employees", currentParams, { page: "1", page_size: String(pageSize), employeeId: undefined })}>First</Link>
                  <Link className="button button--secondary" href={buildHref("/hr-admin/employees", currentParams, { page: String(Math.max(1, safePage - 1)), page_size: String(pageSize), employeeId: undefined })}>Previous</Link>
                  <Link className="button button--secondary" href={buildHref("/hr-admin/employees", currentParams, { page: String(Math.min(totalPages, safePage + 1)), page_size: String(pageSize), employeeId: undefined })}>Next</Link>
                  <Link className="button button--secondary" href={buildHref("/hr-admin/employees", currentParams, { page: String(totalPages), page_size: String(pageSize), employeeId: undefined })}>Last</Link>
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
        <HrAdminActionModal
          closeHref={buildHref("/hr-admin/employees", currentParams, { create: undefined })}
          description="A guided setup. Fields marked * are required."
          eyebrow="Employee master"
          labelledBy="employee-create-modal-title"
          title="Create employee"
        >
          <EmployeeForm
            cancelHref={buildHref("/hr-admin/employees", currentParams, { create: undefined })}
            initialValue={createEmptyEmployeeFormValue(defaultStatus)}
            mode="create"
            options={optionsResult.data}
          />
        </HrAdminActionModal>
      ) : null}

      {editMode && canEditEmployees && detail ? (
        <HrAdminActionModal
          closeHref={closeActionHref}
          description="Update profile, contact, structure, and review before saving."
          eyebrow={detail.employee_code}
          labelledBy="employee-edit-modal-title"
          title="Edit employee"
        >
          <EmployeeForm
            cancelHref={closeActionHref}
            employeeId={detail.id}
            initialValue={employeeDetailToFormValue(detail)}
            mode="edit"
            options={optionsResult.data}
          />
        </HrAdminActionModal>
      ) : null}

      {accessMode && canManageEmployeeAccess && detail && accessResult?.data?.employee_id && accessOptionsResult ? (
        <HrAdminActionModal
          closeHref={closeActionHref}
          eyebrow={detail.employee_code}
          labelledBy="employee-access-modal-title"
          tabs={["Identity", "Controls", "Roles", "Review"]}
          title="Manage access"
        >
          <EmployeeAccessForm
            employeeId={detail.id}
            existingAccess={accessResult.data.has_access}
            cancelHref={closeActionHref}
            employeeStatus={detail.employment_status}
            initialValue={employeeAccessDetailToFormValue(accessResult.data)}
            options={accessOptionsResult.data}
          />
        </HrAdminActionModal>
      ) : null}

      {bankMode && canEditEmployees && detail && bankAccountsResult ? (
        <HrAdminActionModal
          className="employee-bank-modal"
          closeHref={closeActionHref}
          eyebrow={detail.employee_code}
          labelledBy="employee-bank-modal-title"
          tabs={["Accounts", "Payout", "Primary", "Review"]}
          title="Manage bank accounts"
        >
          <BankAccountManager
            cancelHref={closeActionHref}
            employeeId={detail.id}
            employeeName={detail.full_name}
            initialAccounts={bankAccountsResult.data ?? []}
          />
        </HrAdminActionModal>
      ) : null}
    </main>
  );
}
