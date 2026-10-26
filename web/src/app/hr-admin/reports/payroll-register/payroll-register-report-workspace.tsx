"use client";

import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";


import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { AsyncDownloadButton } from "@/components/patterns/async-download-button";
import type { HrAdminPayrollOutputArtifact, HrAdminPayrollOutputBatch } from "@/lib/types";

type PayrollRegisterRow = {
  artifact: HrAdminPayrollOutputArtifact;
  batch: HrAdminPayrollOutputBatch | null;
};

const PAGE_SIZE = 6;
const DEFAULT_SORT = "published_at_desc";
const SORT_OPTIONS = [DEFAULT_SORT, "run_name", "net_pay_desc", "net_pay_asc"] as const;

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

function optionValue(value: string | null, options: string[]) {
  return value && options.includes(value) ? value : "All";
}

function sortValue(value: string | null) {
  return value && SORT_OPTIONS.some((option) => option === value) ? value : DEFAULT_SORT;
}

function pageValue(value: string | null) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function screenParams({ artifactStatus, batchStatus, page, query, sortBy }: {
  artifactStatus: string;
  batchStatus: string;
  page: number;
  query: string;
  sortBy: string;
}) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (batchStatus !== "All") params.set("batch_status", batchStatus);
  if (artifactStatus !== "All") params.set("artifact_status", artifactStatus);
  if (sortBy !== DEFAULT_SORT) params.set("sort", sortBy);
  if (page > 1) params.set("page", String(page));
  return params;
}

export function PayrollRegisterReportWorkspace({
  artifacts,
  batches,
}: {
  artifacts: HrAdminPayrollOutputArtifact[];
  batches: HrAdminPayrollOutputBatch[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

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
  const committedQuery = searchParams.get("q")?.trim() ?? "";
  const committedBatchStatus = optionValue(searchParams.get("batch_status"), batchStatuses);
  const committedArtifactStatus = optionValue(searchParams.get("artifact_status"), artifactStatuses);
  const committedSortBy = sortValue(searchParams.get("sort"));
  const requestedPage = pageValue(searchParams.get("page"));
  const [draft, setDraft] = useState({
    key: searchKey,
    query: committedQuery,
    batchStatus: committedBatchStatus,
    artifactStatus: committedArtifactStatus,
    sortBy: committedSortBy,
  });
  const activeDraft = draft.key === searchKey
    ? draft
    : { key: searchKey, query: committedQuery, batchStatus: committedBatchStatus, artifactStatus: committedArtifactStatus, sortBy: committedSortBy };
  const { query, batchStatus, artifactStatus, sortBy } = activeDraft;

  function updateDraft(next: Partial<Omit<typeof activeDraft, "key">>) {
    setDraft({ ...activeDraft, ...next, key: searchKey });
  }

  const filteredRows = useMemo(() => {
    const normalizedQuery = committedQuery.toLowerCase();
    const nextRows = rows.filter(({ artifact, batch }) => {
      const matchesBatchStatus = committedBatchStatus === "All" || batch?.status === committedBatchStatus;
      const matchesArtifactStatus = committedArtifactStatus === "All" || artifact.status === committedArtifactStatus;
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
      let result = 0;
      if (committedSortBy === "net_pay_desc") result = Number(right.artifact.totals_snapshot.net_pay ?? 0) - Number(left.artifact.totals_snapshot.net_pay ?? 0);
      if (committedSortBy === "net_pay_asc") result = Number(left.artifact.totals_snapshot.net_pay ?? 0) - Number(right.artifact.totals_snapshot.net_pay ?? 0);
      if (committedSortBy === "run_name") result = String(left.batch?.payroll_run_name ?? "").localeCompare(String(right.batch?.payroll_run_name ?? ""));
      if (committedSortBy === DEFAULT_SORT) result = String(right.artifact.published_at ?? right.artifact.created_at).localeCompare(String(left.artifact.published_at ?? left.artifact.created_at));
      return result || left.artifact.id.localeCompare(right.artifact.id);
    });
  }, [committedArtifactStatus, committedBatchStatus, committedQuery, committedSortBy, rows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const totalNetPay = filteredRows.reduce((sum, row) => sum + Number(row.artifact.totals_snapshot.net_pay ?? 0), 0);
  const totalGross = filteredRows.reduce((sum, row) => sum + Number(row.artifact.totals_snapshot.gross_earnings ?? 0), 0);
  const totalDeductions = filteredRows.reduce((sum, row) => sum + Number(row.artifact.totals_snapshot.employee_deductions ?? 0), 0);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (committedQuery) params.set("q", committedQuery);
    if (committedBatchStatus !== "All") params.set("batch_status", committedBatchStatus);
    if (committedArtifactStatus !== "All") params.set("artifact_status", committedArtifactStatus);
    params.set("sort", committedSortBy);
    return `/api/hr-admin/reports/payroll-register?${params.toString()}`;
  }, [committedArtifactStatus, committedBatchStatus, committedQuery, committedSortBy]);
  const manifestHref = `${exportHref}&format=manifest`;

  const committedScreenParams = screenParams({ artifactStatus: committedArtifactStatus, batchStatus: committedBatchStatus, page: currentPage, query: committedQuery, sortBy: committedSortBy });
  const returnTo = `${pathname}${committedScreenParams.size ? `?${committedScreenParams.toString()}` : ""}`;

  useEffect(() => {
    const params = screenParams({ artifactStatus: committedArtifactStatus, batchStatus: committedBatchStatus, page: currentPage, query: committedQuery, sortBy: committedSortBy });
    if (searchKey === params.toString()) return;
    router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  }, [committedArtifactStatus, committedBatchStatus, committedQuery, committedSortBy, currentPage, pathname, router, searchKey]);

  function applyFilters(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const params = screenParams({ artifactStatus, batchStatus, page: 1, query, sortBy });
    router.push(`${pathname}${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  function clearFilters() {
    router.push(pathname, { scroll: false });
  }

  function changePage(nextPage: number) {
    const params = screenParams({ artifactStatus: committedArtifactStatus, batchStatus: committedBatchStatus, page: nextPage, query: committedQuery, sortBy: committedSortBy });
    router.push(`${pathname}${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  function outputHref(artifact: HrAdminPayrollOutputArtifact) {
    const params = new URLSearchParams({ tab: "detail", batchId: artifact.output_batch_id, artifactId: artifact.id, returnTo });
    return `/hr-admin/payroll-outputs?${params.toString()}`;
  }

  return (
    <section className="section section--tight" aria-label="Payroll register report workspace">
      <div className="report-catalog-workspace payroll-register-report" data-testid="payroll-register-report">
        <div className="report-command-panel">
          <div>
            <small className="workspace-card__eyebrow">Payroll output evidence</small>
            <h2>Payroll register control</h2>
            <p className="section-copy section-copy-soft">Review locked register totals, publish state, source hashes, and downloadable payroll output before finance handoff.</p>
          </div>
          <div className="report-command-panel__actions">
            <AsyncDownloadButton href={exportHref} fileName="payroll-register.csv">Export filtered CSV</AsyncDownloadButton>
            <AsyncDownloadButton className="button button--ghost" href={manifestHref} fileName="payroll-register-manifest.json">Manifest</AsyncDownloadButton>
            <button className="button button--ghost" type="button" onClick={() => window.print()}>Print report</button>
          </div>
        </div>

        <div className="attendance-summary-strip payroll-run-summary-strip">
          <article>
            <span>Register artifacts</span>
            <strong>{filteredRows.length}</strong>
            <small>{rows.length} total source artifacts</small>
          </article>
          <article>
            <span>Gross earnings</span>
            <strong>{formatMoney(totalGross)}</strong>
            <small>Filtered total</small>
          </article>
          <article>
            <span>Deductions</span>
            <strong>{formatMoney(totalDeductions)}</strong>
            <small>Employee deductions</small>
          </article>
          <article>
            <span>Net pay</span>
            <strong>{formatMoney(totalNetPay)}</strong>
            <small>Locked output basis</small>
          </article>
        </div>

        <form className="report-filter-panel" aria-label="Payroll register filters" onSubmit={applyFilters}>
          <div className="report-filter-panel__header">
            <div>
              <strong>Filter payroll register</strong>
              <span>Search payroll output by run, file, profile, hash, status, or value sort.</span>
            </div>
            <div className="report-command-panel__actions">
              <button className="button button--ghost" type="button" onClick={clearFilters}>Clear filters</button>
              <button className="button button--primary" type="submit">Apply filters</button>
            </div>
          </div>
          <div className="report-filter-grid report-filter-grid--payroll">
          <label className="report-filter-field">
            Search register
            <input
              className="input-control"
              type="search"
              value={query}
              onChange={(event) => updateDraft({ query: event.target.value })}
              placeholder="Search run, file, profile, hash"
            />
          </label>
          <label className="report-filter-field">
            Batch status
            <select className="input-control" value={batchStatus} onChange={(event) => updateDraft({ batchStatus: event.target.value })}>
              {batchStatuses.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? item : titleCase(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="report-filter-field">
            Artifact status
            <select className="input-control" value={artifactStatus} onChange={(event) => updateDraft({ artifactStatus: event.target.value })}>
              {artifactStatuses.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? item : titleCase(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="report-filter-field">
            Sort
            <select className="input-control" value={sortBy} onChange={(event) => updateDraft({ sortBy: event.target.value })}>
              <option value="published_at_desc">Published newest</option>
              <option value="run_name">Run name</option>
              <option value="net_pay_desc">Net pay high to low</option>
              <option value="net_pay_asc">Net pay low to high</option>
            </select>
          </label>
          </div>
        </form>

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

        <WorkspaceTableScrollRegion label="Payroll register report table 1" className="report-catalog-table-wrap workspace-table-region">
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
                      <Link className="button button--secondary" href={outputHref(artifact)}>
                        Open
                      </Link>
                      {artifact.is_downloadable ? (
                        <AsyncDownloadButton className="button button--ghost" href={`/api/hr-admin/payroll-output-artifacts/${artifact.id}/download`} fileName={artifact.file_name}>
                          Export
                        </AsyncDownloadButton>
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
        </WorkspaceTableScrollRegion>

        <div className="pagination-bar" aria-label="Payroll register pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>
            Previous
          </button>
          <span>
            Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
          </span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => changePage(currentPage + 1)}>
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
