"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  HrAdminPayrollOutputArtifact,
  HrAdminPayrollStatutoryEmployerRegistration,
  HrAdminPayrollStatutoryFilingCalendar,
} from "@/lib/types";

type FilingStatusRow = {
  id: string;
  filingCode: string;
  filingName: string;
  filingTypeRef: string;
  statutoryType: string;
  frequency: string;
  period: string;
  dueDate: string;
  dueStatus: "Acknowledged" | "Overdue" | "Due" | "Open";
  status: string;
  registrationNumber: string;
  authorityRef: string;
  providerRef: string;
  outputProfileRef: string;
  sourceHash: string;
  artifactCount: number;
  publishedArtifactCount: number;
};

const PAGE_SIZE = 8;

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDate(value: string) {
  if (!value) return "Not configured";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function chipClass(value: string) {
  if (value === "Acknowledged" || value === "Open" || value === "published") return "record-chip record-chip--success";
  if (value === "Due" || value === "Overdue") return "record-chip record-chip--warning";
  return "record-chip";
}

function artifactMatchesFiling(artifact: HrAdminPayrollOutputArtifact, filing: HrAdminPayrollStatutoryFilingCalendar) {
  if (artifact.kind !== "statutory_report") return false;
  const configCode = stringValue(artifact.config_snapshot.statutory_filing_calendar_code);
  if (configCode) return configCode === filing.code;
  return artifact.line_snapshot.some((rawLine) => {
    const line = rawLine as Record<string, unknown>;
    const lineCode = stringValue(line.filing_code || line.filing_calendar_code);
    if (lineCode) return lineCode === filing.code;
    return [line.statutory_type, line.component_code, line.statutory_component_code, line.component_name]
      .map((value) => stringValue(value).toLowerCase())
      .join(" ")
      .includes(filing.statutory_type.toLowerCase());
  });
}

function dueStatusFor(filing: HrAdminPayrollStatutoryFilingCalendar): FilingStatusRow["dueStatus"] {
  if (filing.status === "acknowledged" || filing.status === "filed") return "Acknowledged";
  if (filing.is_overdue) return "Overdue";
  if (filing.is_due) return "Due";
  return "Open";
}

function buildRows({
  artifacts,
  filings,
  registrations,
}: {
  artifacts: HrAdminPayrollOutputArtifact[];
  filings: HrAdminPayrollStatutoryFilingCalendar[];
  registrations: HrAdminPayrollStatutoryEmployerRegistration[];
}) {
  const registrationByType = new Map(registrations.map((registration) => [registration.statutory_type, registration]));

  return filings.map((filing) => {
    const matchedArtifacts = artifacts.filter((artifact) => artifactMatchesFiling(artifact, filing));
    const registration = registrationByType.get(filing.statutory_type);
    return {
      id: filing.id,
      filingCode: filing.code,
      filingName: filing.name,
      filingTypeRef: filing.filing_type_ref,
      statutoryType: filing.statutory_type,
      frequency: filing.filing_frequency_label || titleCase(filing.filing_frequency),
      period: `${formatDate(filing.period_start)} - ${formatDate(filing.period_end)}`,
      dueDate: formatDate(filing.due_date),
      dueStatus: dueStatusFor(filing),
      status: filing.status,
      registrationNumber: stringValue(filing.employer_registration_number || registration?.registration_number, "registration.pending"),
      authorityRef: stringValue(filing.filing_authority_ref || registration?.filing_authority_ref, "authority.pending"),
      providerRef: stringValue(filing.provider_ref || registration?.provider_ref, "provider.route.pending"),
      outputProfileRef: stringValue(filing.output_profile_ref, "output.profile.pending"),
      sourceHash: stringValue(filing.source_hash || matchedArtifacts[0]?.source_hash, "source_hash.pending"),
      artifactCount: matchedArtifacts.length,
      publishedArtifactCount: matchedArtifacts.filter((artifact) => artifact.status === "published").length,
    } satisfies FilingStatusRow;
  });
}

export function StatutoryFilingStatusReportWorkspace({
  artifacts,
  filings,
  registrations,
}: {
  artifacts: HrAdminPayrollOutputArtifact[];
  filings: HrAdminPayrollStatutoryFilingCalendar[];
  registrations: HrAdminPayrollStatutoryEmployerRegistration[];
}) {
  const [query, setQuery] = useState("");
  const [dueStatus, setDueStatus] = useState("All");
  const [provider, setProvider] = useState("All");
  const [sortBy, setSortBy] = useState("due_status");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => buildRows({ artifacts, filings, registrations }), [artifacts, filings, registrations]);
  const dueStatuses = useMemo(() => ["All", ...unique(rows.map((row) => row.dueStatus))], [rows]);
  const providers = useMemo(() => ["All", ...unique(rows.map((row) => row.providerRef))], [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter((row) => {
      const matchesDueStatus = dueStatus === "All" || row.dueStatus === dueStatus;
      const matchesProvider = provider === "All" || row.providerRef === provider;
      const matchesQuery =
        !normalizedQuery ||
        [
          row.filingCode,
          row.filingName,
          row.filingTypeRef,
          row.statutoryType,
          row.registrationNumber,
          row.authorityRef,
          row.providerRef,
          row.outputProfileRef,
          row.sourceHash,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesDueStatus && matchesProvider && matchesQuery;
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "filing") return left.filingName.localeCompare(right.filingName);
      if (sortBy === "provider") return left.providerRef.localeCompare(right.providerRef);
      if (sortBy === "artifacts") return right.publishedArtifactCount - left.publishedArtifactCount;
      return left.dueStatus.localeCompare(right.dueStatus);
    });
  }, [dueStatus, provider, query, rows, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (dueStatus !== "All") params.set("due_status", dueStatus);
    if (provider !== "All") params.set("provider_ref", provider);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/statutory-filing-status?${params.toString()}`;
  }, [dueStatus, provider, query, sortBy]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Statutory filing status report workspace">
      <div className="report-catalog-workspace statutory-filing-status-report" data-testid="statutory-filing-status-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Filing calendars</span>
            <strong>{filteredRows.length}</strong>
            <small>{filings.length} configured</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Due or overdue</span>
            <strong>{filteredRows.filter((row) => row.dueStatus === "Due" || row.dueStatus === "Overdue").length}</strong>
            <small>Calendar risk</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Published evidence</span>
            <strong>{filteredRows.reduce((sum, row) => sum + row.publishedArtifactCount, 0)}</strong>
            <small>Statutory artifacts</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Provider routes</span>
            <strong>{unique(filteredRows.map((row) => row.providerRef)).length}</strong>
            <small>Configurable filing paths</small>
          </article>
        </div>

        <div className="report-catalog-toolbar statutory-deductions-toolbar" aria-label="Statutory filing status filters">
          <label>
            <span>Search filings</span>
            <input
              className="input-control"
              type="search"
              value={query}
              onChange={(event) => updateFilter(() => setQuery(event.target.value))}
              placeholder="Search filing, TAN, provider, output profile, hash"
            />
          </label>
          <label>
            <span>Due status</span>
            <select aria-label="Due status" className="input-control" value={dueStatus} onChange={(event) => updateFilter(() => setDueStatus(event.target.value))}>
              {dueStatuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Provider route</span>
            <select aria-label="Provider route" className="input-control" value={provider} onChange={(event) => updateFilter(() => setProvider(event.target.value))}>
              {providers.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select aria-label="Sort filing rows" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}>
              <option value="due_status">Due status</option>
              <option value="filing">Filing</option>
              <option value="provider">Provider</option>
              <option value="artifacts">Published evidence</option>
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip">
            <strong>{filteredRows.filter((row) => row.dueStatus === "Open").length}</strong> open
          </span>
          <span className="queue-summary-chip">
            <strong>{filteredRows.filter((row) => row.dueStatus === "Acknowledged").length}</strong> acknowledged
          </span>
          <span className="queue-summary-chip">
            <strong>{currentPage}</strong> of {pageCount} pages
          </span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>
            Export filtered CSV
          </Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>
            Manifest
          </Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table statutory-deductions-table">
            <thead>
              <tr>
                <th scope="col">Filing</th>
                <th scope="col">Frequency</th>
                <th scope="col">Period</th>
                <th scope="col">Due date</th>
                <th scope="col">Due status</th>
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
                    <strong>{row.filingName}</strong>
                    <span>{titleCase(row.statutoryType)}</span>
                    <code>{row.filingCode}</code>
                  </td>
                  <td>{row.frequency}</td>
                  <td>{row.period}</td>
                  <td>{row.dueDate}</td>
                  <td>
                    <span className={chipClass(row.dueStatus)}>{row.dueStatus}</span>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{row.registrationNumber}</span>
                      <span>{row.authorityRef}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={chipClass(row.status)}>{titleCase(row.status)}</span>
                      <span>{row.providerRef}</span>
                      <span>{row.outputProfileRef}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{row.publishedArtifactCount} published / {row.artifactCount} total</span>
                      <code>{row.sourceHash.slice(0, 16)}</code>
                    </div>
                  </td>
                  <td>
                    <div className="report-row-actions">
                      <Link className="button button--secondary" href="/hr-admin/payroll-statutory">
                        Open
                      </Link>
                      <Link className="button button--ghost" href="/hr-admin/payroll-handoff">
                        Handoff
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">No statutory filing rows match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Statutory filing status pagination">
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
