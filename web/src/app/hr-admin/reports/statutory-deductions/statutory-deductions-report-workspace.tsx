"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  HrAdminPayrollOutputArtifact,
  HrAdminPayrollStatutoryComponent,
  HrAdminPayrollStatutoryEmployerRegistration,
  HrAdminPayrollStatutoryFilingCalendar,
} from "@/lib/types";

type StatutoryDeductionRow = {
  id: string;
  componentCode: string;
  componentName: string;
  statutoryType: string;
  lineType: string;
  amount: number;
  employeeCode: string;
  payrollRunName: string;
  artifactTitle: string;
  artifactId: string;
  status: string;
  providerRef: string;
  authorityRef: string;
  registrationNumber: string;
  filingCode: string;
  treatmentRef: string;
  sourceHash: string;
  outputProfileRef: string;
};

const PAGE_SIZE = 8;

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatMoney(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function stringValue(value: unknown, fallback = "Not configured") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusClass(status: string) {
  if (status === "published" || status === "active" || status === "ready") return "record-chip record-chip--success";
  if (status === "generated" || status === "pending") return "record-chip record-chip--warning";
  return "record-chip";
}

function buildRows({
  artifacts,
  components,
  registrations,
  filings,
}: {
  artifacts: HrAdminPayrollOutputArtifact[];
  components: HrAdminPayrollStatutoryComponent[];
  registrations: HrAdminPayrollStatutoryEmployerRegistration[];
  filings: HrAdminPayrollStatutoryFilingCalendar[];
}) {
  const componentByCode = new Map(components.map((component) => [component.code.toLowerCase(), component]));
  const registrationByComponentType = new Map(registrations.map((registration) => [registration.statutory_type, registration]));
  const filingByCode = new Map(filings.map((filing) => [filing.code, filing]));

  return artifacts
    .filter((artifact) => artifact.kind === "statutory_report")
    .flatMap((artifact) =>
      artifact.line_snapshot.map((rawLine, index) => {
        const line = rawLine as Record<string, unknown>;
        const componentCode = stringValue(line.component_code, "unmapped").toLowerCase();
        const component = componentByCode.get(componentCode);
        const filingCode = stringValue(line.filing_calendar_code, stringValue(artifact.config_snapshot.statutory_filing_calendar_code, ""));
        const filing = filingByCode.get(filingCode);
        const statutoryType = component?.statutory_type ?? filing?.statutory_type ?? stringValue(line.statutory_type, "unmapped");
        const registration = registrationByComponentType.get(statutoryType);

        return {
          id: `${artifact.id}:${index}`,
          componentCode,
          componentName: stringValue(line.component_name, component?.name ?? titleCase(componentCode)),
          statutoryType,
          lineType: stringValue(line.line_type, "deduction"),
          amount: numberValue(line.amount),
          employeeCode: stringValue(line.employee_code, "Run level"),
          payrollRunName: stringValue(line.payroll_run_name, artifact.title),
          artifactTitle: artifact.title,
          artifactId: artifact.id,
          status: artifact.status,
          providerRef: stringValue(line.provider_ref, filing?.provider_ref ?? registration?.provider_ref ?? "provider.route.pending"),
          authorityRef: stringValue(line.authority_ref, filing?.filing_authority_ref ?? registration?.filing_authority_ref ?? "authority.pending"),
          registrationNumber: stringValue(line.employer_registration_number, filing?.employer_registration_number ?? registration?.registration_number ?? "registration.pending"),
          filingCode: filingCode || "summary",
          treatmentRef: stringValue(line.statutory_treatment_ref, component?.statutory_treatment_ref ?? "treatment.pending"),
          sourceHash: stringValue(line.source_hash, artifact.source_hash),
          outputProfileRef: artifact.output_profile_ref,
        } satisfies StatutoryDeductionRow;
      }),
    );
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

export function StatutoryDeductionsReportWorkspace({
  artifacts,
  components,
  registrations,
  filings,
}: {
  artifacts: HrAdminPayrollOutputArtifact[];
  components: HrAdminPayrollStatutoryComponent[];
  registrations: HrAdminPayrollStatutoryEmployerRegistration[];
  filings: HrAdminPayrollStatutoryFilingCalendar[];
}) {
  const [query, setQuery] = useState("");
  const [statutoryType, setStatutoryType] = useState("All");
  const [provider, setProvider] = useState("All");
  const [sortBy, setSortBy] = useState("amount_desc");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => buildRows({ artifacts, components, filings, registrations }), [artifacts, components, filings, registrations]);
  const statutoryTypes = useMemo(() => ["All", ...unique(rows.map((row) => row.statutoryType))], [rows]);
  const providers = useMemo(() => ["All", ...unique(rows.map((row) => row.providerRef))], [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter((row) => {
      const matchesType = statutoryType === "All" || row.statutoryType === statutoryType;
      const matchesProvider = provider === "All" || row.providerRef === provider;
      const matchesQuery =
        !normalizedQuery ||
        [
          row.componentCode,
          row.componentName,
          row.employeeCode,
          row.payrollRunName,
          row.artifactTitle,
          row.providerRef,
          row.authorityRef,
          row.registrationNumber,
          row.filingCode,
          row.sourceHash,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesType && matchesProvider && matchesQuery;
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "component") return left.componentName.localeCompare(right.componentName);
      if (sortBy === "employee") return left.employeeCode.localeCompare(right.employeeCode);
      if (sortBy === "provider") return left.providerRef.localeCompare(right.providerRef);
      return right.amount - left.amount;
    });
  }, [provider, query, rows, sortBy, statutoryType]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const totalAmount = filteredRows.reduce((sum, row) => sum + row.amount, 0);

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Statutory deduction summary report workspace">
      <div className="report-catalog-workspace statutory-deductions-report" data-testid="statutory-deductions-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Deduction rows</span>
            <strong>{filteredRows.length}</strong>
            <small>{rows.length} statutory source rows</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Total amount</span>
            <strong>{formatMoney(totalAmount)}</strong>
            <small>Filtered deductions</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Components</span>
            <strong>{unique(filteredRows.map((row) => row.componentCode)).length}</strong>
            <small>{components.length} configured</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Provider routes</span>
            <strong>{unique(filteredRows.map((row) => row.providerRef)).length}</strong>
            <small>Configurable filing paths</small>
          </article>
        </div>

        <div className="report-catalog-toolbar statutory-deductions-toolbar" aria-label="Statutory deduction filters">
          <label>
            <span>Search deductions</span>
            <input
              className="input-control"
              type="search"
              value={query}
              onChange={(event) => updateFilter(() => setQuery(event.target.value))}
              placeholder="Search component, employee, provider, hash"
            />
          </label>
          <label>
            <span>Statutory type</span>
            <select className="input-control" value={statutoryType} onChange={(event) => updateFilter(() => setStatutoryType(event.target.value))}>
              {statutoryTypes.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? item : titleCase(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Provider route</span>
            <select className="input-control" value={provider} onChange={(event) => updateFilter(() => setProvider(event.target.value))}>
              {providers.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}>
              <option value="amount_desc">Amount high to low</option>
              <option value="component">Component</option>
              <option value="employee">Employee</option>
              <option value="provider">Provider</option>
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip">
            <strong>{filteredRows.filter((row) => row.status === "published").length}</strong> published evidence rows
          </span>
          <span className="queue-summary-chip">
            <strong>{registrations.length}</strong> registrations
          </span>
          <span className="queue-summary-chip">
            <strong>{currentPage}</strong> of {pageCount} pages
          </span>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table statutory-deductions-table">
            <thead>
              <tr>
                <th scope="col">Component</th>
                <th scope="col">Employee</th>
                <th scope="col">Line type</th>
                <th scope="col">Amount</th>
                <th scope="col">Registration</th>
                <th scope="col">Provider</th>
                <th scope="col">Evidence</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.componentName}</strong>
                    <span>{titleCase(row.statutoryType)}</span>
                    <code>{row.componentCode}</code>
                  </td>
                  <td>{row.employeeCode}</td>
                  <td>{titleCase(row.lineType)}</td>
                  <td>{formatMoney(row.amount)}</td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{row.registrationNumber}</span>
                      <span>{row.authorityRef}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(row.status)}>{titleCase(row.status)}</span>
                      <span>{row.providerRef}</span>
                      <span>{row.filingCode}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{row.outputProfileRef}</span>
                      <span>{row.treatmentRef}</span>
                      <code>{row.sourceHash.slice(0, 16)}</code>
                    </div>
                  </td>
                  <td>
                    <div className="report-row-actions">
                      <Link className="button button--secondary" href="/hr-admin/payroll-statutory">
                        Open
                      </Link>
                      <Link className="button button--ghost" href={`/api/hr-admin/payroll-output-artifacts/${row.artifactId}/download`} prefetch={false}>
                        Export
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">No statutory deduction rows match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Statutory deductions pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Previous
          </button>
          <span>
            Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
          </span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
