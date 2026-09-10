import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollOutputSetup } from "@/lib/api";
import type { HrAdminPayrollOutputArtifact, HrAdminPayrollOutputBatch } from "@/lib/types";
import { PayrollCloseActionsPanel } from "../payroll-close-actions-panel";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function hrAdminArtifactDownloadUrl(artifact: HrAdminPayrollOutputArtifact) {
  return `/api/hr-admin/payroll-output-artifacts/${artifact.id}/download`;
}

function hrAdminArtifactAccessAuditUrl(artifact: HrAdminPayrollOutputArtifact) {
  return `/api/hr-admin/payroll-output-artifacts/${artifact.id}/access-audit-export`;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) {
    return "Pending";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(value: unknown, currency = "INR") {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

function formatFileSize(value: number) {
  if (!value) {
    return "Pending";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  return `${(value / 1024).toFixed(1)} KB`;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`readiness-badge readiness-badge--${status}`}>{titleCase(status)}</span>;
}

function BatchRail({
  batches,
  selectedBatch,
}: {
  batches: HrAdminPayrollOutputBatch[];
  selectedBatch: HrAdminPayrollOutputBatch | null;
}) {
  return (
    <aside className="payroll-setup-rail payroll-output-rail">
      <div className="payroll-setup-panel__header">
        <span className="workspace-card__eyebrow">Output batches</span>
        <h2>Output batches</h2>
      </div>
      <div className="payroll-setup-card-list">
        {batches.map((batch) => (
          <Link
            className={`payroll-setup-mini-card payroll-output-card ${selectedBatch?.id === batch.id ? "is-selected" : ""}`}
            href={`/hr-admin/payroll-outputs?batchId=${batch.id}`}
            key={batch.id}
          >
            <div>
              <strong>{batch.payroll_run_name}</strong>
              <span>{batch.artifact_count} artifacts / {batch.published_artifact_count} published</span>
            </div>
            <StatusBadge status={batch.status} />
            <div className="payroll-input-run-card__counts">
              <span>{batch.payslip_count} payslips</span>
              <span>{batch.register_count} register</span>
            </div>
            <code>{batch.output_profile_ref}</code>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function ArtifactDetail({ artifact }: { artifact: HrAdminPayrollOutputArtifact | null }) {
  if (!artifact) {
    return (
      <aside className="payroll-setup-detail-panel payroll-output-detail-panel">
        <div className="payroll-setup-panel__header">
          <span className="workspace-card__eyebrow">Artifact detail</span>
          <h2>No artifact selected</h2>
        </div>
        <p className="section-copy section-copy-soft">Select a payslip or register artifact to inspect output metadata and source evidence.</p>
      </aside>
    );
  }

  return (
    <aside className="payroll-setup-detail-panel payroll-output-detail-panel" aria-label={`${artifact.title} output artifact`}>
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Artifact detail</span>
          <h2>{artifact.title}</h2>
          <p className="section-copy section-copy-soft">{artifact.employee_name ?? "Run level"} / {artifact.kind_label}</p>
        </div>
        <StatusBadge status={artifact.status} />
      </div>

      <div className="payroll-output-net-block">
        <span className="workspace-card__eyebrow">Net pay</span>
        <strong>{formatMoney(artifact.totals_snapshot.net_pay)}</strong>
        <span>{artifact.file_name || artifact.artifact_key}</span>
        {artifact.download_url ? (
          <a className="button button--secondary payroll-output-download-link" href={hrAdminArtifactDownloadUrl(artifact)}>
            Download file
          </a>
        ) : (
          <span className="payroll-output-download-state">Available after publish</span>
        )}
      </div>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Output metadata</span>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Profile</span><span className="detail-value">{artifact.output_profile_ref}</span></div>
          <div className="detail-row"><span className="detail-label">MIME</span><span className="detail-value">{artifact.mime_type || artifact.content_type}</span></div>
          <div className="detail-row"><span className="detail-label">Size</span><span className="detail-value">{formatFileSize(artifact.file_size_bytes)}</span></div>
          <div className="detail-row"><span className="detail-label">Published by</span><span className="detail-value">{artifact.published_by_name ?? "Pending"}</span></div>
          <div className="detail-row"><span className="detail-label">Published</span><span className="detail-value">{formatDate(artifact.published_at)}</span></div>
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Storage governance</span>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Provider</span><span className="detail-value">{artifact.storage_provider_ref}</span></div>
          <div className="detail-row"><span className="detail-label">Key</span><span className="detail-value">{artifact.storage_key || "Pending"}</span></div>
          <div className="detail-row"><span className="detail-label">Object version</span><span className="detail-value">{artifact.storage_object_version || "Pending"}</span></div>
          <div className="detail-row"><span className="detail-label">Strategy</span><span className="detail-value">{artifact.download_strategy_ref}</span></div>
          <div className="detail-row"><span className="detail-label">Signed URL</span><span className="detail-value">{artifact.supports_signed_url ? `${artifact.signed_url_expires_in_seconds}s` : "Streamed"}</span></div>
          <div className="detail-row"><span className="detail-label">Retention</span><span className="detail-value">{artifact.retention_policy_ref}</span></div>
          <div className="detail-row"><span className="detail-label">Download</span><span className="detail-value">{artifact.is_downloadable ? "Ready" : "Blocked"}</span></div>
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Access governance</span>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Signed issued</span><span className="detail-value">{artifact.access_summary.signed_url_issued_count}</span></div>
          <div className="detail-row"><span className="detail-label">Active grants</span><span className="detail-value">{artifact.access_summary.active_signed_grant_count}</span></div>
          <div className="detail-row"><span className="detail-label">Revoked grants</span><span className="detail-value">{artifact.access_summary.revoked_signed_grant_count}</span></div>
          <div className="detail-row"><span className="detail-label">Expired grants</span><span className="detail-value">{artifact.access_summary.expired_signed_grant_count}</span></div>
          <div className="detail-row"><span className="detail-label">Downloads</span><span className="detail-value">{artifact.access_summary.download_count}</span></div>
          <div className="detail-row"><span className="detail-label">Latest expiry</span><span className="detail-value">{formatDate(artifact.access_summary.latest_signed_grant_expires_at)}</span></div>
        </div>
        <a className="button button--ghost payroll-output-download-link" href={hrAdminArtifactAccessAuditUrl(artifact)}>
          Export access audit
        </a>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Source hash</span>
        <code>{artifact.source_hash}</code>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Template config</span>
        <div className="payroll-rule-snapshot-list">
          {Object.entries(artifact.config_snapshot).slice(0, 5).map(([key, value]) => (
            <div className="detail-row" key={key}>
              <span className="detail-label">{titleCase(key)}</span>
              <span className="detail-value">{String(value ?? "None")}</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

export default async function HrAdminPayrollOutputsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const selectedBatchId = normalizeParam(currentParams.batchId);
  const selectedArtifactId = normalizeParam(currentParams.artifactId);
  const result = await getHrAdminPayrollOutputSetup();
  const setup = result.data;
  const selectedBatch = setup.output_batches.find((item) => item.id === selectedBatchId) ?? setup.output_batches[0] ?? null;
  const visibleArtifacts = selectedBatch ? setup.artifacts.filter((item) => item.output_batch_id === selectedBatch.id) : setup.artifacts;
  const selectedArtifact = visibleArtifacts.find((item) => item.id === selectedArtifactId) ?? visibleArtifacts[0] ?? null;
  const totals = selectedBatch?.totals_snapshot ?? {};
  const summary = selectedBatch?.artifact_summary_snapshot ?? {};

  return (
    <main className="shell shell--payroll-setup shell--payroll-outputs">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll phase 3B" : "Demo payroll phase 3B"}
        title="Payroll Outputs"
        description="Generate and publish payroll output artifacts from final-locked reviews while preserving source hashes and configurable template references."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/payroll-review">
              Review
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-handoff">
              Handoff
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-calculations">
              Calculations
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-rules">
              Rules
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-setup">
              Payroll Setup
            </Link>
          </>
        }
        pills={["Payslip artifacts", "Register snapshot", "Publish controlled"]}
        showPills
      />

      <section className="section section--tight">
        <div className="metric-grid-modern payroll-setup-metrics">
          <MetricTile className="metric-tile-soft" label="Output batches" value={setup.summary.output_batch_count} trend={`${setup.summary.published_batch_count} published`} />
          <MetricTile className="metric-tile-soft" label="Artifacts" value={setup.summary.artifact_count} trend={`${setup.summary.published_artifact_count} published`} />
          <MetricTile className="metric-tile-soft" label="Payslips" value={setup.summary.payslip_count} trend={`${setup.summary.register_count} registers`} />
          <MetricTile className="metric-tile-soft" label="Latest net pay" value={formatMoney(setup.summary.latest_net_pay)} trend="Output total" />
        </div>
      </section>

      <section className="section section--tight">
        <div className="payroll-setup-workspace payroll-output-workspace">
          <BatchRail batches={setup.output_batches} selectedBatch={selectedBatch} />

          <div className="payroll-setup-main-panel">
            <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
              <div>
                <span className="workspace-card__eyebrow">Publish state</span>
                <h2>{selectedBatch?.payroll_run_name ?? "No output batch"}</h2>
              </div>
              {selectedBatch ? <StatusBadge status={selectedBatch.status} /> : null}
            </div>

            <div className="payroll-calc-total-grid payroll-output-total-grid">
              <article>
                <span>Gross earnings</span>
                <strong>{formatMoney(totals.gross_earnings)}</strong>
              </article>
              <article>
                <span>Deductions</span>
                <strong>{formatMoney(totals.employee_deductions)}</strong>
              </article>
              <article>
                <span>Net pay</span>
                <strong>{formatMoney(totals.net_pay)}</strong>
              </article>
              <article>
                <span>Published</span>
                <strong>{String(summary.published_count ?? selectedBatch?.published_artifact_count ?? 0)}</strong>
              </article>
            </div>

            <div className="payroll-review-lock-strip payroll-output-publish-strip">
              <div>
                <span className="workspace-card__eyebrow">Generated</span>
                <strong>{formatDate(selectedBatch?.generated_at ?? null)}</strong>
                <span>{selectedBatch?.generated_by_name ?? "Pending"}</span>
              </div>
              <div>
                <span className="workspace-card__eyebrow">Published</span>
                <strong>{formatDate(selectedBatch?.published_at ?? null)}</strong>
                <span>{selectedBatch?.published_by_name ?? "Pending"}</span>
              </div>
              <div>
                <span className="workspace-card__eyebrow">Output profile</span>
                <strong>{selectedBatch?.output_profile_ref ?? "No profile"}</strong>
                <span>{selectedBatch?.artifact_count ?? 0} artifacts</span>
              </div>
            </div>

            <PayrollCloseActionsPanel
              eyebrow="Payroll operations"
              title="Output controls"
              description="Publish generated payroll outputs and create downstream finance handoff packages from selected batches."
              actions={[
                {
                  id: "publish-outputs",
                  label: "Publish outputs",
                  endpoint: selectedBatch ? `/api/hr-admin/payroll-output-batches/${selectedBatch.id}/publish` : "",
                  disabled: !selectedBatch,
                  disabledReason: "Select an output batch first.",
                },
                {
                  id: "generate-finance-handoff",
                  label: "Generate handoff",
                  endpoint: selectedBatch ? `/api/hr-admin/payroll-output-batches/${selectedBatch.id}/generate-finance-handoff` : "",
                  profileField: "handoff_profile_ref",
                  profileLabel: "Handoff profile ref",
                  defaultProfileRef: "tenant.payroll.finance.handoff.v1",
                  disabled: !selectedBatch,
                  disabledReason: "Select an output batch first.",
                },
              ]}
            />

            <div className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Artifact register</span>
                  <h2>Artifact register</h2>
                </div>
                <span className="payroll-setup-count">{visibleArtifacts.length} artifacts</span>
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-output-artifact-table">
                  <thead>
                    <tr>
                      <th>Artifact</th>
                      <th>Kind</th>
                      <th>Employee</th>
                      <th>Net pay</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleArtifacts.map((artifact) => (
                      <tr className={selectedArtifact?.id === artifact.id ? "is-selected" : ""} key={artifact.id}>
                        <td>
                          <Link href={`/hr-admin/payroll-outputs?batchId=${artifact.output_batch_id}&artifactId=${artifact.id}`}>
                            <strong>{artifact.title}</strong>
                            <span>{artifact.file_name}</span>
                            <span>{artifact.mime_type || artifact.content_type} / {formatFileSize(artifact.file_size_bytes)}</span>
                            <span>hash {artifact.source_hash.slice(0, 12)}</span>
                          </Link>
                        </td>
                        <td><StatusBadge status={artifact.kind} /></td>
                        <td>
                          <strong>{artifact.employee_name ?? "Run level"}</strong>
                          <span>{artifact.employee_code ?? artifact.artifact_key}</span>
                        </td>
                        <td>{formatMoney(artifact.totals_snapshot.net_pay)}</td>
                        <td><StatusBadge status={artifact.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <section className="payroll-setup-assignment-panel payroll-output-handoff-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Handoff readiness</span>
                  <h2>Finance handoff readiness</h2>
                </div>
                <StatusBadge status="generated" />
              </div>
              <div className="payroll-output-handoff-grid">
                <article>
                  <strong>Payslips</strong>
                  <span>Employee portal publishing payloads are available.</span>
                </article>
                <article>
                  <strong>Register</strong>
                  <span>Run-level register snapshot is ready for finance review.</span>
                </article>
                <article>
                  <strong>Next outputs</strong>
                  <span>Bank files, accounting exports, and statutory files remain separate controlled phases.</span>
                </article>
              </div>
            </section>
          </div>

          <ArtifactDetail artifact={selectedArtifact} />
        </div>
      </section>
    </main>
  );
}
