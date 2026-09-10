"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HrAdminPayrollOutputArtifact, HrAdminPayrollOutputBatch } from "@/lib/types";

type PayrollRegisterRow = {
  artifact: HrAdminPayrollOutputArtifact;
  batch: HrAdminPayrollOutputBatch | null;
};

const PAGE_SIZE = 6;

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatMoney(value: unknown, currency = "INR") {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

function formatDate(value: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "published" || status === "locked") return "record-chip record-chip--success";
  if (status === "generated" || status === "review") return "record-chip record-chip--warning";
  return "record-chip";
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

export function PayrollRegisterReportWorkspace({
  artifacts,
  batches,
}: {
  artifacts: HrAdminPayrollOutputArtifact[];
  batches: HrAdminPayrollOutputBatch[];
}) {
  const [query, setQuery] = useState("");
  const [batchStatus, setBatchStatus] = useState("All");
  const [artifactStatus, setArtifactStatus] = useState("All");
  const [sortBy, setSortBy] = useState("published_at_desc");
  const [page, setPage] = useState(1);

  const rows = useMemo<PayrollRegisterRow[]>(() => {
    const batchById = new Map(batches.map((batch) => [batch.id, batch]));
    return artifacts
      .filter((artifact) => artifact.kind === "register")
      .map((artifact) => ({
        artifact,
        batch: batchById.get(artifact.output_batch_id) ?? null,
      }));
  }, [artifacts, batches]);

  const batchStatuses = useMemo(() => ["All", ...unique(batches.map((batch) => batch.status))], [batches]);
  const artifactStatuses = useMemo(() => ["All", ...unique(rows.map((row) => row.artifact.status))], [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter(({ artifact, batch }) => {
      const matchesBatchStatus = batchStatus === "All" || batch?.status === batchStatus;
      const matchesArtifactStatus = artifactStatus === "All" || artifact.status === artifactStatus;
      const matchesQuery =
        !normalizedQuery ||
        [
          artifact.title,
          artifact.file_name,
          artifact.artifact_key,
          artifact.source_hash,
          artifact.output_profile_ref,
          batch?.payroll_run_name,
          batch?.output_profile_ref,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesBatchStatus && matchesArtifactStatus && matchesQuery;
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "net_pay_desc") {
        return Number(right.artifact.totals_snapshot.net_pay ?? 0) - Number(left.artifact.totals_snapshot.net_pay ?? 0);
      }
      if (sortBy === "net_pay_asc") {
        return Number(left.artifact.totals_snapshot.net_pay ?? 0) - Number(right.artifact.totals_snapshot.net_pay ?? 0);
      }
      if (sortBy === "run_name") {
        return String(left.batch?.payroll_run_name ?? "").localeCompare(String(right.batch?.payroll_run_name ?? ""));
      }
      return String(right.artifact.published_at ?? right.artifact.created_at).localeCompare(String(left.artifact.published_at ?? left.artifact.created_at));
    });
  }, [artifactStatus, batchStatus, query, rows, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const totalNetPay = filteredRows.reduce((sum, row) => sum + Number(row.artifact.totals_snapshot.net_pay ?? 0), 0);
  const totalGross = filteredRows.reduce((sum, row) => sum + Number(row.artifact.totals_snapshot.gross_earnings ?? 0), 0);
  const totalDeductions = filteredRows.reduce((sum, row) => sum + Number(row.artifact.totals_snapshot.employee_deductions ?? 0), 0);

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Payroll register report workspace">
      <div className="report-catalog-workspace payroll-register-report" data-testid="payroll-register-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Register artifacts</span>
            <strong>{filteredRows.length}</strong>
            <small>{rows.length} total source artifacts</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Gross earnings</span>
            <strong>{formatMoney(totalGross)}</strong>
            <small>Filtered total</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Deductions</span>
            <strong>{formatMoney(totalDeductions)}</strong>
            <small>Employee deductions</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Net pay</span>
            <strong>{formatMoney(totalNetPay)}</strong>
            <small>Locked output basis</small>
          </article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Payroll register filters">
          <label>
            <span>Search register</span>
            <input
              className="input-control"
              type="search"
              value={query}
              onChange={(event) => updateFilter(() => setQuery(event.target.value))}
              placeholder="Search run, file, profile, hash"
            />
          </label>
          <label>
            <span>Batch status</span>
            <select className="input-control" value={batchStatus} onChange={(event) => updateFilter(() => setBatchStatus(event.target.value))}>
              {batchStatuses.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? item : titleCase(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Artifact status</span>
            <select className="input-control" value={artifactStatus} onChange={(event) => updateFilter(() => setArtifactStatus(event.target.value))}>
              {artifactStatuses.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? item : titleCase(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}>
              <option value="published_at_desc">Published newest</option>
              <option value="run_name">Run name</option>
              <option value="net_pay_desc">Net pay high to low</option>
              <option value="net_pay_asc">Net pay low to high</option>
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip">
            <strong>{filteredRows.filter((row) => row.batch?.status === "published").length}</strong> published batches
          </span>
          <span className="queue-summary-chip">
            <strong>{filteredRows.filter((row) => row.artifact.is_downloadable).length}</strong> downloadable
          </span>
          <span className="queue-summary-chip">
            <strong>{currentPage}</strong> of {pageCount} pages
          </span>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead>
              <tr>
                <th scope="col">Payroll run</th>
                <th scope="col">Gross</th>
                <th scope="col">Deductions</th>
                <th scope="col">Net pay</th>
                <th scope="col">Lock and publish</th>
                <th scope="col">Evidence</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(({ artifact, batch }) => (
                <tr key={artifact.id}>
                  <td>
                    <strong>{batch?.payroll_run_name ?? artifact.title}</strong>
                    <span>{artifact.file_name}</span>
                    <code>{artifact.artifact_key}</code>
                  </td>
                  <td>{formatMoney(artifact.totals_snapshot.gross_earnings)}</td>
                  <td>{formatMoney(artifact.totals_snapshot.employee_deductions)}</td>
                  <td>{formatMoney(artifact.totals_snapshot.net_pay)}</td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(batch?.status ?? "unknown")}>{titleCase(batch?.status ?? "unknown")}</span>
                      <span className={statusClass(artifact.status)}>{titleCase(artifact.status)}</span>
                      <span>{formatDate(artifact.published_at)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{artifact.output_profile_ref}</span>
                      <span>{artifact.storage_provider_ref}</span>
                      <code>{artifact.source_hash.slice(0, 16)}</code>
                    </div>
                  </td>
                  <td>
                    <div className="report-row-actions">
                      <Link className="button button--secondary" href={`/hr-admin/payroll-outputs?batchId=${artifact.output_batch_id}&artifactId=${artifact.id}`}>
                        Open
                      </Link>
                      {artifact.is_downloadable ? (
                        <Link className="button button--ghost" href={`/api/hr-admin/payroll-output-artifacts/${artifact.id}/download`} prefetch={false}>
                          Export
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">No payroll register rows match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Payroll register pagination">
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
