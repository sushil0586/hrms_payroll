"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HrAdminEmployeeListItem } from "@/lib/types";

const PAGE_SIZE = 10;

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function unique(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (["active", "provisioned"].includes(status)) return "record-chip record-chip--success";
  if (["on_notice", "pending"].includes(status)) return "record-chip record-chip--warning";
  if (["inactive", "exited"].includes(status)) return "record-chip record-chip--danger";
  return "record-chip";
}

export function WorkforceReportWorkspace({ employees }: { employees: HrAdminEmployeeListItem[] }) {
  const [query, setQuery] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("All");
  const [department, setDepartment] = useState("All");
  const [managerView, setManagerView] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(1);

  const statusOptions = useMemo(() => ["All", ...unique(employees.map((item) => item.employment_status))], [employees]);
  const departmentOptions = useMemo(() => ["All", ...unique(employees.map((item) => item.department))], [employees]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = employees.filter((employee) => {
      const matchesStatus = employmentStatus === "All" || employee.employment_status === employmentStatus;
      const matchesDepartment = department === "All" || employee.department === department;
      const matchesManagerView =
        managerView === "All" ||
        (managerView === "managers" && employee.direct_reports_count > 0) ||
        (managerView === "needs_reassignment" && !employee.reporting_manager);
      const matchesQuery =
        !normalizedQuery ||
        [
          employee.employee_code,
          employee.full_name,
          employee.work_email,
          employee.phone_number,
          employee.legal_entity,
          employee.branch,
          employee.location,
          employee.business_unit,
          employee.department,
          employee.cost_center,
          employee.designation,
          employee.grade,
          employee.employment_type,
          employee.reporting_manager,
          employee.membership_status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesStatus && matchesDepartment && matchesManagerView && matchesQuery;
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "status") return left.employment_status.localeCompare(right.employment_status);
      if (sortBy === "department") return String(left.department ?? "").localeCompare(String(right.department ?? ""));
      if (sortBy === "manager_coverage") return Number(Boolean(left.reporting_manager)) - Number(Boolean(right.reporting_manager));
      if (sortBy === "access") return Number(right.has_access) - Number(left.has_access);
      return left.full_name.localeCompare(right.full_name);
    });
  }, [department, employees, employmentStatus, managerView, query, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const managerCoverage = filteredRows.filter((employee) => employee.reporting_manager || employee.direct_reports_count > 0).length;
  const accessProvisioned = filteredRows.filter((employee) => employee.has_access).length;
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (employmentStatus !== "All") params.set("employment_status", employmentStatus);
    if (department !== "All") params.set("department", department);
    if (managerView !== "All") params.set("manager_view", managerView);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/workforce?${params.toString()}`;
  }, [department, employmentStatus, managerView, query, sortBy]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Workforce report workspace">
      <div className="report-catalog-workspace workforce-report" data-testid="workforce-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Employees</span>
            <strong>{filteredRows.length}</strong>
            <small>{employees.length} total records</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Active</span>
            <strong>{filteredRows.filter((employee) => employee.employment_status === "active").length}</strong>
            <small>In selected view</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Manager coverage</span>
            <strong>{managerCoverage}</strong>
            <small>Mapped or manager role</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Access provisioned</span>
            <strong>{accessProvisioned}</strong>
            <small>Login-ready employees</small>
          </article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Workforce filters">
          <label>
            <span>Search workforce</span>
            <input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search name, code, org, manager" />
          </label>
          <label>
            <span>Employment status</span>
            <select aria-label="Employment status" className="input-control" value={employmentStatus} onChange={(event) => updateFilter(() => setEmploymentStatus(event.target.value))}>
              {statusOptions.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
            </select>
          </label>
          <label>
            <span>Department</span>
            <select aria-label="Department" className="input-control" value={department} onChange={(event) => updateFilter(() => setDepartment(event.target.value))}>
              {departmentOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Manager coverage</span>
            <select aria-label="Manager coverage" className="input-control" value={managerView} onChange={(event) => updateFilter(() => setManagerView(event.target.value))}>
              <option value="All">All employees</option>
              <option value="managers">Managers only</option>
              <option value="needs_reassignment">Needs reassignment</option>
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}>
              <option value="name">Employee name</option>
              <option value="status">Employment status</option>
              <option value="department">Department</option>
              <option value="manager_coverage">Manager coverage</option>
              <option value="access">Access readiness</option>
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{departmentOptions.length - 1}</strong> departments</span>
          <span className="queue-summary-chip"><strong>{filteredRows.filter((employee) => !employee.reporting_manager).length}</strong> manager gaps</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>Export filtered CSV</Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead>
              <tr>
                <th scope="col">Employee</th>
                <th scope="col">Organization</th>
                <th scope="col">Role</th>
                <th scope="col">Manager</th>
                <th scope="col">Access</th>
                <th scope="col">Dates</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <strong>{employee.full_name}</strong>
                    <span>{employee.employee_code}</span>
                    <span>{employee.work_email}</span>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{employee.legal_entity || "No legal entity"}</span>
                      <span>{employee.branch || "No branch"} / {employee.location || "No location"}</span>
                      <span>{employee.department || "No department"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{employee.designation || "No designation"}</span>
                      <span>{employee.grade || "No grade"}</span>
                      <span>{employee.employment_type || "No employment type"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{employee.reporting_manager || "Needs reassignment"}</span>
                      <span>{employee.direct_reports_count} direct reports</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(employee.employment_status)}>{titleCase(employee.employment_status)}</span>
                      <span className={statusClass(employee.has_access ? "provisioned" : "pending")}>{employee.has_access ? "Provisioned" : "Pending"}</span>
                      <span>{titleCase(employee.membership_status || "not linked")}</span>
                    </div>
                  </td>
                  <td>{formatDate(employee.date_of_joining)}</td>
                  <td>
                    <div className="report-row-actions">
                      <Link className="button button--secondary" href={`/hr-admin/employees?employeeId=${employee.id}`}>
                        Open
                      </Link>
                      <Link className="button button--ghost" href={`/hr-admin/employees/${employee.id}/access`}>
                        Access
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">No workforce rows match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Workforce pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
