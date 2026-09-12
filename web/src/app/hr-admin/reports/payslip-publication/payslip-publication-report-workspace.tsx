"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HrAdminPayrollOutputArtifact, HrAdminPayrollOutputBatch, HrAdminPayrollRun } from "@/lib/types";

const PAGE_SIZE = 10;

type PublicationState = "Acknowledged" | "Downloaded" | "Published" | "Generated";
type AccessRisk = "Low" | "Medium" | "High";

type PayslipPublicationRow = {
  artifact: HrAdminPayrollOutputArtifact;
  batch: HrAdminPayrollOutputBatch | null;
  run: HrAdminPayrollRun | null;
  publicationState: PublicationState;
  accessRisk: AccessRisk;
  acknowledgementState: "Acknowledged" | "Pending";
  detailHref: string;
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (["acknowledged", "downloaded", "published", "low", "active"].includes(normalized)) return "record-chip record-chip--success";
  if (["generated", "medium", "pending"].includes(normalized)) return "record-chip record-chip--warning";
  if (["high", "revoked", "failed", "expired"].includes(normalized)) return "record-chip record-chip--danger";
  return "record-chip";
}

function publicationState(artifact: HrAdminPayrollOutputArtifact): PublicationState {
  if (artifact.access_summary.is_read_acknowledged || artifact.access_summary.read_acknowledgement_count > 0) return "Acknowledged";
  if (artifact.access_summary.download_count > 0) return "Downloaded";
  if (artifact.status === "published" || artifact.published_at) return "Published";
  return "Generated";
}

function accessRisk(artifact: HrAdminPayrollOutputArtifact, state: PublicationState): AccessRisk {
  if (artifact.access_summary.revoked_event_count > 0 || artifact.access_summary.expired_signed_grant_count > 0) return "High";
  if (state === "Generated") return "High";
  if (state === "Published" && artifact.access_summary.download_count === 0 && artifact.access_summary.read_acknowledgement_count === 0) return "Medium";
  return "Low";
}

export function PayslipPublicationReportWorkspace({
  runs,
  outputBatches,
  artifacts,
}: {
  runs: HrAdminPayrollRun[];
  outputBatches: HrAdminPayrollOutputBatch[];
  artifacts: HrAdminPayrollOutputArtifact[];
}) {
  const [query, setQuery] = useState("");
  const [runId, setRunId] = useState("All");
  const [state, setState] = useState("All");
  const [risk, setRisk] = useState("All");
  const [artifactStatus, setArtifactStatus] = useState("All");
  const [acknowledgement, setAcknowledgement] = useState("All");
  const [sortBy, setSortBy] = useState("risk");
  const [page, setPage] = useState(1);

  const rows = useMemo<PayslipPublicationRow[]>(() => {
    const batchById = new Map(outputBatches.map((batch) => [batch.id, batch]));
    const runById = new Map(runs.map((run) => [run.id, run]));
    return artifacts
      .filter((artifact) => artifact.kind === "payslip")
      .map((artifact) => {
        const batch = batchById.get(artifact.output_batch_id) ?? null;
        const rowState = publicationState(artifact);
        return {
          artifact,
          batch,
          run: runById.get(artifact.payroll_run_id) ?? null,
          publicationState: rowState,
          accessRisk: accessRisk(artifact, rowState),
          acknowledgementState: artifact.access_summary.is_read_acknowledged || artifact.access_summary.read_acknowledgement_count > 0 ? "Acknowledged" : "Pending",
          detailHref: `/hr-admin/payroll-outputs?batchId=${artifact.output_batch_id}&artifactId=${artifact.id}`,
        };
      });
  }, [artifacts, outputBatches, runs]);

  const states = ["All", "Acknowledged", "Downloaded", "Published", "Generated"];
  const risks = ["All", "High", "Medium", "Low"];
  const statuses = useMemo(() => ["All", ...unique(rows.map((row) => row.artifact.status))], [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter((row) => {
      const artifact = row.artifact;
      const matchesQuery =
        !normalizedQuery ||
        [
          artifact.employee_code,
          artifact.employee_name,
          artifact.artifact_key,
          artifact.title,
          artifact.file_name,
          artifact.status,
          row.batch?.payroll_run_name,
          row.batch?.status,
          row.publicationState,
          row.accessRisk,
          artifact.source_hash,
          artifact.checksum_sha256,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (runId === "All" || artifact.payroll_run_id === runId) &&
        (state === "All" || row.publicationState === state) &&
        (risk === "All" || row.accessRisk === risk) &&
        (artifactStatus === "All" || artifact.status === artifactStatus) &&
        (acknowledgement === "All" || row.acknowledgementState === acknowledgement)
      );
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "published_at") return (right.artifact.published_at ?? "").localeCompare(left.artifact.published_at ?? "");
      if (sortBy === "employee") return (left.artifact.employee_name ?? "").localeCompare(right.artifact.employee_name ?? "");
      if (sortBy === "run") return (left.batch?.payroll_run_name ?? "").localeCompare(right.batch?.payroll_run_name ?? "");
      if (sortBy === "downloads") return right.artifact.access_summary.download_count - left.artifact.access_summary.download_count;
      if (sortBy === "acknowledgement") return right.artifact.access_summary.read_acknowledgement_count - left.artifact.access_summary.read_acknowledgement_count;
      const scores = { High: 3, Medium: 2, Low: 1 };
      return scores[right.accessRisk] - scores[left.accessRisk] || right.artifact.access_summary.revoked_event_count - left.artifact.access_summary.revoked_event_count;
    });
  }, [acknowledgement, artifactStatus, query, risk, rows, runId, sortBy, state]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (runId !== "All") params.set("payroll_run_id", runId);
    if (state !== "All") params.set("publication_state", state);
    if (risk !== "All") params.set("access_risk", risk);
    if (artifactStatus !== "All") params.set("artifact_status", artifactStatus);
    if (acknowledgement !== "All") params.set("acknowledgement", acknowledgement);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/payslip-publication?${params.toString()}`;
  }, [acknowledgement, artifactStatus, query, risk, runId, sortBy, state]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Payslip publication report workspace">
      <div className="report-catalog-workspace payroll-register-report" data-testid="payslip-publication-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft"><span>Payslips</span><strong>{filteredRows.length}</strong><small>{rows.length} total payslips</small></article>
          <article className="metric-tile metric-tile-soft"><span>Published</span><strong>{filteredRows.filter((row) => row.publicationState !== "Generated").length}</strong><small>Visible or delivered</small></article>
          <article className="metric-tile metric-tile-soft"><span>Acknowledged</span><strong>{filteredRows.filter((row) => row.acknowledgementState === "Acknowledged").length}</strong><small>Employee read proof</small></article>
          <article className="metric-tile metric-tile-soft"><span>Access risk</span><strong>{filteredRows.filter((row) => row.accessRisk === "High").length}</strong><small>High-risk rows</small></article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Payslip publication filters">
          <label><span>Search payslips</span><input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search employee, run, artifact, hash" /></label>
          <label><span>Payroll run</span><select aria-label="Payroll run" className="input-control" value={runId} onChange={(event) => updateFilter(() => setRunId(event.target.value))}><option value="All">All</option>{runs.map((run) => <option key={run.id} value={run.id}>{run.name}</option>)}</select></label>
          <label><span>Publication state</span><select aria-label="Publication state" className="input-control" value={state} onChange={(event) => updateFilter(() => setState(event.target.value))}>{states.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Access risk</span><select aria-label="Access risk" className="input-control" value={risk} onChange={(event) => updateFilter(() => setRisk(event.target.value))}>{risks.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Artifact status</span><select aria-label="Artifact status" className="input-control" value={artifactStatus} onChange={(event) => updateFilter(() => setArtifactStatus(event.target.value))}>{statuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Acknowledgement</span><select aria-label="Acknowledgement" className="input-control" value={acknowledgement} onChange={(event) => updateFilter(() => setAcknowledgement(event.target.value))}><option value="All">All</option><option value="Acknowledged">Acknowledged</option><option value="Pending">Pending</option></select></label>
          <label><span>Sort</span><select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}><option value="risk">Risk first</option><option value="published_at">Latest published</option><option value="employee">Employee</option><option value="run">Payroll run</option><option value="downloads">Downloads</option><option value="acknowledgement">Acknowledgements</option></select></label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.filter((row) => row.accessRisk === "High").length}</strong> high risk</span>
          <span className="queue-summary-chip"><strong>{filteredRows.reduce((sum, row) => sum + row.artifact.access_summary.download_count, 0)}</strong> downloads</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>Export filtered CSV</Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead><tr><th scope="col">Employee</th><th scope="col">Run</th><th scope="col">Payslip</th><th scope="col">Publication</th><th scope="col">Access</th><th scope="col">Acknowledgement</th><th scope="col">Evidence</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {visibleRows.map((row) => {
                const artifact = row.artifact;
                return (
                  <tr key={artifact.id}>
                    <td><strong>{artifact.employee_name ?? "Unassigned employee"}</strong><span>{artifact.employee_code ?? "code.pending"}</span></td>
                    <td><div className="payroll-register-stack"><strong>{row.batch?.payroll_run_name ?? row.run?.name ?? artifact.payroll_run_id}</strong><span>{row.run?.period_name ?? "period.pending"}</span><span className={statusClass(row.batch?.status ?? "not_generated")}>{titleCase(row.batch?.status ?? "not_generated")}</span></div></td>
                    <td><div className="payroll-register-stack"><strong>{artifact.title}</strong><span>{artifact.file_name}</span><span>{artifact.artifact_key}</span></div></td>
                    <td><div className="payroll-register-stack"><span className={statusClass(row.publicationState)}>{row.publicationState}</span><span>{artifact.published_at ?? "publish.pending"}</span><span>{artifact.published_by_name ?? row.batch?.published_by_name ?? "publisher.pending"}</span></div></td>
                    <td><div className="payroll-register-stack"><span className={statusClass(row.accessRisk)}>{row.accessRisk}</span><span>{artifact.access_summary.notification_count} notifications</span><span>{artifact.access_summary.signed_url_issued_count} signed URLs</span><span>{artifact.access_summary.download_count} downloads</span><span>{artifact.access_summary.revoked_event_count} revoked</span></div></td>
                    <td><div className="payroll-register-stack"><span className={statusClass(row.acknowledgementState)}>{row.acknowledgementState}</span><span>{artifact.access_summary.read_acknowledgement_count} read acknowledgements</span><span>{artifact.access_summary.first_read_at ?? "first.read.pending"}</span></div></td>
                    <td><div className="payroll-register-stack"><span>{artifact.storage_provider_ref}</span><span>{artifact.download_strategy_ref}</span><code>{artifact.source_hash || "hash.pending"}</code><code>{artifact.checksum_sha256 || "checksum.pending"}</code></div></td>
                    <td><div className="report-row-actions"><Link className="button button--secondary" href={row.detailHref}>Open</Link><Link className="button button--ghost" href={`/api/hr-admin/payroll-output-artifacts/${artifact.id}/access-audit-export`} prefetch={false}>Audit CSV</Link></div></td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 ? <tr><td colSpan={8}><div className="empty-state">No payslip publication rows match the selected filters.</div></td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Payslip publication pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
