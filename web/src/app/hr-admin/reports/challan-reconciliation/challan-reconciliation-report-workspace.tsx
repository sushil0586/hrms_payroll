"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  HrAdminPayrollOutputArtifact,
  HrAdminPayrollStatutoryEmployerRegistration,
  HrAdminPayrollStatutoryFilingCalendar,
} from "@/lib/types";

type ChallanRow = {
  id: string;
  filingCode: string;
  filingName: string;
  filingTypeRef: string;
  statutoryType: string;
  period: string;
  dueDate: string;
  status: string;
  paymentStatus: "Mapped" | "Pending artifact" | "Pending registration" | "Pending provider" | "Pending source hash";
  amount: number;
  registrationNumber: string;
  authorityRef: string;
  providerRef: string;
  artifactId: string;
  artifactTitle: string;
  sourceHash: string;
};

const PAGE_SIZE = 8;

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDate(value: string) {
  if (!value) return "Not configured";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", maximumFractionDigits: 0, style: "currency" }).format(Number.isFinite(value) ? value : 0);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function statusClass(status: string) {
  if (status === "Mapped" || status === "open" || status === "published") return "record-chip record-chip--success";
  if (status.startsWith("Pending") || status === "due") return "record-chip record-chip--warning";
  return "record-chip";
}

function lineMatchesFiling(line: Record<string, unknown>, filing: HrAdminPayrollStatutoryFilingCalendar) {
  const lineFilingCode = stringValue(line.filing_code || line.filing_calendar_code);
  if (lineFilingCode) return lineFilingCode === filing.code;
  const markers = [line.statutory_type, line.component_code, line.statutory_component_code, line.component_name, line.statutory_treatment_ref]
    .map((value) => stringValue(value).toLowerCase())
    .join(" ");
  return markers.includes(filing.statutory_type.toLowerCase()) || markers.includes("tds") || markers.includes("tax_deducted_at_source");
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
    const artifactMatches = artifacts
      .filter((artifact) => artifact.kind === "statutory_report")
      .flatMap((artifact) =>
        artifact.line_snapshot.filter((rawLine) => lineMatchesFiling(rawLine as Record<string, unknown>, filing)).map((rawLine) => ({ artifact, line: rawLine as Record<string, unknown> })),
      );
    const firstMatch = artifactMatches[0];
    const registration = registrationByType.get(filing.statutory_type);
    const amount = artifactMatches.reduce((sum, item) => sum + numberValue(item.line.amount), 0);
    const registrationNumber = stringValue(filing.employer_registration_number || registration?.registration_number);
    const providerRef = stringValue(filing.provider_ref || registration?.provider_ref);
    const sourceHash = stringValue(firstMatch?.line.source_hash || firstMatch?.artifact.source_hash || filing.source_hash);
    const paymentStatus: ChallanRow["paymentStatus"] = !artifactMatches.length
      ? "Pending artifact"
      : !registrationNumber
        ? "Pending registration"
        : !providerRef
          ? "Pending provider"
          : !sourceHash
            ? "Pending source hash"
            : "Mapped";

    return {
      id: filing.id,
      filingCode: filing.code,
      filingName: filing.name,
      filingTypeRef: filing.filing_type_ref,
      statutoryType: filing.statutory_type,
      period: `${formatDate(filing.period_start)} - ${formatDate(filing.period_end)}`,
      dueDate: formatDate(filing.due_date),
      status: filing.status,
      paymentStatus,
      amount,
      registrationNumber: registrationNumber || "registration.pending",
      authorityRef: stringValue(filing.filing_authority_ref || registration?.filing_authority_ref, "authority.pending"),
      providerRef: providerRef || "provider.route.pending",
      artifactId: firstMatch?.artifact.id ?? "",
      artifactTitle: firstMatch?.artifact.title ?? "No deduction artifact",
      sourceHash: sourceHash || "source_hash.pending",
    } satisfies ChallanRow;
  });
}

export function ChallanReconciliationReportWorkspace({
  artifacts,
  filings,
  registrations,
}: {
  artifacts: HrAdminPayrollOutputArtifact[];
  filings: HrAdminPayrollStatutoryFilingCalendar[];
  registrations: HrAdminPayrollStatutoryEmployerRegistration[];
}) {
  const [query, setQuery] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("All");
  const [provider, setProvider] = useState("All");
  const [sortBy, setSortBy] = useState("due_date");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => buildRows({ artifacts, filings, registrations }), [artifacts, filings, registrations]);
  const paymentStatuses = useMemo(() => ["All", ...unique(rows.map((row) => row.paymentStatus))], [rows]);
  const providers = useMemo(() => ["All", ...unique(rows.map((row) => row.providerRef))], [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter((row) => {
      const matchesStatus = paymentStatus === "All" || row.paymentStatus === paymentStatus;
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
          row.artifactTitle,
          row.sourceHash,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesStatus && matchesProvider && matchesQuery;
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "amount_desc") return right.amount - left.amount;
      if (sortBy === "provider") return left.providerRef.localeCompare(right.providerRef);
      if (sortBy === "status") return left.paymentStatus.localeCompare(right.paymentStatus);
      return left.dueDate.localeCompare(right.dueDate);
    });
  }, [paymentStatus, provider, query, rows, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const mappedRows = filteredRows.filter((row) => row.paymentStatus === "Mapped").length;
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (paymentStatus !== "All") params.set("payment_status", paymentStatus);
    if (provider !== "All") params.set("provider_ref", provider);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/challan-reconciliation?${params.toString()}`;
  }, [paymentStatus, provider, query, sortBy]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Challan reconciliation report workspace">
      <div className="report-catalog-workspace challan-reconciliation-report" data-testid="challan-reconciliation-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Filing calendars</span>
            <strong>{filteredRows.length}</strong>
            <small>{filings.length} configured</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Mapped challans</span>
            <strong>{mappedRows}</strong>
            <small>Artifact, registration, provider, hash</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Deduction amount</span>
            <strong>{formatMoney(filteredRows.reduce((sum, row) => sum + row.amount, 0))}</strong>
            <small>Matched artifacts</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Provider routes</span>
            <strong>{unique(filteredRows.map((row) => row.providerRef)).length}</strong>
            <small>Configurable filing paths</small>
          </article>
        </div>

        <div className="report-catalog-toolbar statutory-deductions-toolbar" aria-label="Challan reconciliation filters">
          <label>
            <span>Search challans</span>
            <input
              className="input-control"
              type="search"
              value={query}
              onChange={(event) => updateFilter(() => setQuery(event.target.value))}
              placeholder="Search filing, TAN, provider, artifact, hash"
            />
          </label>
          <label>
            <span>Payment status</span>
            <select aria-label="Payment status" className="input-control" value={paymentStatus} onChange={(event) => updateFilter(() => setPaymentStatus(event.target.value))}>
              {paymentStatuses.map((item) => (
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
            <select aria-label="Sort challan rows" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}>
              <option value="due_date">Due date</option>
              <option value="amount_desc">Amount high to low</option>
              <option value="provider">Provider</option>
              <option value="status">Payment status</option>
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip">
            <strong>{mappedRows}</strong> mapped
          </span>
          <span className="queue-summary-chip">
            <strong>{filteredRows.length - mappedRows}</strong> pending
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
                <th scope="col">Period</th>
                <th scope="col">Due date</th>
                <th scope="col">Payment status</th>
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
                    <strong>{row.filingName}</strong>
                    <span>{titleCase(row.statutoryType)}</span>
                    <code>{row.filingCode}</code>
                  </td>
                  <td>{row.period}</td>
                  <td>{row.dueDate}</td>
                  <td>
                    <span className={statusClass(row.paymentStatus)}>{row.paymentStatus}</span>
                  </td>
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
                      <span>{row.filingTypeRef}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{row.artifactTitle}</span>
                      <code>{row.sourceHash.slice(0, 16)}</code>
                    </div>
                  </td>
                  <td>
                    <div className="report-row-actions">
                      <Link className="button button--secondary" href="/hr-admin/payroll-statutory">
                        Open
                      </Link>
                      {row.artifactId ? (
                        <Link className="button button--ghost" href={`/api/hr-admin/payroll-output-artifacts/${row.artifactId}/download`} prefetch={false}>
                          Export
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">No challan reconciliation rows match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Challan reconciliation pagination">
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
