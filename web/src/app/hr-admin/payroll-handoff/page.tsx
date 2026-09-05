import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollFinanceHandoffSetup } from "@/lib/api";
import type { HrAdminPayrollFinanceHandoff, HrAdminPayrollOutputArtifact } from "@/lib/types";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
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

function HandoffRail({
  handoffs,
  selectedHandoff,
}: {
  handoffs: HrAdminPayrollFinanceHandoff[];
  selectedHandoff: HrAdminPayrollFinanceHandoff | null;
}) {
  return (
    <aside className="payroll-setup-rail payroll-output-rail payroll-handoff-rail">
      <div className="payroll-setup-panel__header">
        <span className="workspace-card__eyebrow">Finance packages</span>
        <h2>Handoffs</h2>
      </div>
      <div className="payroll-setup-card-list">
        {handoffs.map((handoff) => (
          <Link
            className={`payroll-setup-mini-card payroll-output-card payroll-handoff-card ${selectedHandoff?.id === handoff.id ? "is-selected" : ""}`}
            href={`/hr-admin/payroll-handoff?handoffId=${handoff.id}`}
            key={handoff.id}
          >
            <div>
              <strong>{handoff.payroll_run_name}</strong>
              <span>{handoff.artifact_count} finance artifacts</span>
            </div>
            <StatusBadge status={handoff.status} />
            <div className="payroll-input-run-card__counts">
              <span>{formatMoney(handoff.totals_snapshot.net_pay)}</span>
              <span>{formatDate(handoff.transmitted_at)}</span>
            </div>
            <code>{handoff.handoff_profile_ref}</code>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function artifactAmount(artifact: HrAdminPayrollOutputArtifact | null) {
  if (!artifact) {
    return "0.00";
  }
  return artifact.totals_snapshot.net_pay ?? artifact.totals_snapshot.statutory_total ?? artifact.totals_snapshot.gross_earnings ?? "0.00";
}

function ArtifactDetail({ artifact }: { artifact: HrAdminPayrollOutputArtifact | null }) {
  if (!artifact) {
    return (
      <aside className="payroll-setup-detail-panel payroll-output-detail-panel payroll-handoff-detail-panel">
        <div className="payroll-setup-panel__header">
          <span className="workspace-card__eyebrow">Artifact detail</span>
          <h2>No package selected</h2>
        </div>
        <p className="section-copy section-copy-soft">Select a finance artifact to inspect profile references, source hashes, and package metadata.</p>
      </aside>
    );
  }

  return (
    <aside className="payroll-setup-detail-panel payroll-output-detail-panel payroll-handoff-detail-panel" aria-label={`${artifact.title} finance artifact`}>
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Artifact detail</span>
          <h2>{artifact.title}</h2>
          <p className="section-copy section-copy-soft">{artifact.kind_label} / {artifact.mime_type || artifact.content_type}</p>
        </div>
        <StatusBadge status={artifact.status} />
      </div>

      <div className="payroll-output-net-block payroll-handoff-value-block">
        <span className="workspace-card__eyebrow">Package value</span>
        <strong>{formatMoney(artifactAmount(artifact))}</strong>
        <span>{artifact.file_name || artifact.artifact_key}</span>
        {artifact.download_url ? (
          <a className="button button--secondary payroll-output-download-link" href={artifact.download_url}>
            Download file
          </a>
        ) : (
          <span className="payroll-output-download-state">Available after transmit</span>
        )}
      </div>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Handoff metadata</span>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Profile</span><span className="detail-value">{artifact.output_profile_ref}</span></div>
          <div className="detail-row"><span className="detail-label">MIME</span><span className="detail-value">{artifact.mime_type || artifact.content_type}</span></div>
          <div className="detail-row"><span className="detail-label">Size</span><span className="detail-value">{formatFileSize(artifact.file_size_bytes)}</span></div>
          <div className="detail-row"><span className="detail-label">Published by</span><span className="detail-value">{artifact.published_by_name ?? "Pending"}</span></div>
          <div className="detail-row"><span className="detail-label">Published</span><span className="detail-value">{formatDate(artifact.published_at)}</span></div>
          <div className="detail-row"><span className="detail-label">Rows</span><span className="detail-value">{artifact.line_snapshot.length}</span></div>
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Storage governance</span>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Provider</span><span className="detail-value">{artifact.storage_provider_ref}</span></div>
          <div className="detail-row"><span className="detail-label">Key</span><span className="detail-value">{artifact.storage_key || "Pending"}</span></div>
          <div className="detail-row"><span className="detail-label">Retention</span><span className="detail-value">{artifact.retention_policy_ref}</span></div>
          <div className="detail-row"><span className="detail-label">Download</span><span className="detail-value">{artifact.is_downloadable ? "Ready" : "Blocked"}</span></div>
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Source hash</span>
        <code>{artifact.source_hash}</code>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Config refs</span>
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

export default async function HrAdminPayrollHandoffPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const selectedHandoffId = normalizeParam(currentParams.handoffId);
  const selectedArtifactId = normalizeParam(currentParams.artifactId);
  const result = await getHrAdminPayrollFinanceHandoffSetup();
  const setup = result.data;
  const selectedHandoff = setup.handoffs.find((item) => item.id === selectedHandoffId) ?? setup.handoffs[0] ?? null;
  const visibleArtifacts = selectedHandoff ? setup.artifacts.filter((item) => item.output_batch_id === selectedHandoff.output_batch_id) : setup.artifacts;
  const selectedArtifact = visibleArtifacts.find((item) => item.id === selectedArtifactId) ?? visibleArtifacts[0] ?? null;
  const totals = selectedHandoff?.totals_snapshot ?? {};
  const summary = selectedHandoff?.handoff_summary_snapshot ?? {};

  return (
    <main className="shell shell--payroll-setup shell--payroll-outputs shell--payroll-handoff">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll phase 3C" : "Demo payroll phase 3C"}
        title="Payroll Handoff"
        description="Package bank advice, accounting exports, and statutory summaries from published payroll outputs with configurable finance profile references."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/payroll-outputs">
              Outputs
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-review">
              Review
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-calculations">
              Calculations
            </Link>
          </>
        }
        pills={["Bank advice", "Accounting export", "Statutory summary"]}
        showPills
      />

      <section className="section section--tight">
        <div className="metric-grid-modern payroll-setup-metrics">
          <MetricTile className="metric-tile-soft" label="Handoffs" value={setup.summary.handoff_count} trend={`${setup.summary.transmitted_handoff_count} transmitted`} />
          <MetricTile className="metric-tile-soft" label="Finance artifacts" value={setup.summary.finance_artifact_count} trend={`${setup.summary.published_output_batch_count} published batches`} />
          <MetricTile className="metric-tile-soft" label="Accepted" value={setup.summary.accepted_handoff_count} trend={`${setup.summary.generated_handoff_count} generated`} />
          <MetricTile className="metric-tile-soft" label="Latest net pay" value={formatMoney(setup.summary.latest_net_pay)} trend="Handoff total" />
        </div>
      </section>

      <section className="section section--tight">
        <div className="payroll-setup-workspace payroll-output-workspace payroll-handoff-workspace">
          <HandoffRail handoffs={setup.handoffs} selectedHandoff={selectedHandoff} />

          <div className="payroll-setup-main-panel">
            <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
              <div>
                <span className="workspace-card__eyebrow">Transmission state</span>
                <h2>{selectedHandoff?.payroll_run_name ?? "No finance handoff"}</h2>
              </div>
              {selectedHandoff ? <StatusBadge status={selectedHandoff.status} /> : null}
            </div>

            <div className="payroll-calc-total-grid payroll-output-total-grid payroll-handoff-total-grid">
              <article>
                <span>Bank advice</span>
                <strong>{formatMoney(totals.bank_advice_total)}</strong>
              </article>
              <article>
                <span>Accounting net</span>
                <strong>{formatMoney(totals.net_pay)}</strong>
              </article>
              <article>
                <span>Statutory total</span>
                <strong>{formatMoney(totals.statutory_total)}</strong>
              </article>
              <article>
                <span>Artifacts</span>
                <strong>{String(summary.artifact_count ?? selectedHandoff?.artifact_count ?? 0)}</strong>
              </article>
            </div>

            <div className="payroll-review-lock-strip payroll-output-publish-strip payroll-handoff-control-strip">
              <div>
                <span className="workspace-card__eyebrow">Generated</span>
                <strong>{formatDate(selectedHandoff?.generated_at ?? null)}</strong>
                <span>{selectedHandoff?.generated_by_name ?? "Pending"}</span>
              </div>
              <div>
                <span className="workspace-card__eyebrow">Transmitted</span>
                <strong>{formatDate(selectedHandoff?.transmitted_at ?? null)}</strong>
                <span>{selectedHandoff?.transmitted_by_name ?? "Pending"}</span>
              </div>
              <div>
                <span className="workspace-card__eyebrow">Accepted</span>
                <strong>{formatDate(selectedHandoff?.accepted_at ?? null)}</strong>
                <span>{selectedHandoff?.accepted_by_name ?? "Awaiting acknowledgement"}</span>
              </div>
            </div>

            <section className="payroll-setup-assignment-panel payroll-handoff-profile-panel">
              <div className="payroll-setup-panel__header">
                <span className="workspace-card__eyebrow">Profile refs</span>
                <h2>Configurable finance routing</h2>
              </div>
              <div className="payroll-output-handoff-grid payroll-handoff-profile-grid">
                <article>
                  <strong>Handoff</strong>
                  <span>{selectedHandoff?.handoff_profile_ref ?? "No profile"}</span>
                </article>
                <article>
                  <strong>Bank</strong>
                  <span>{selectedHandoff?.bank_file_profile_ref ?? "No profile"}</span>
                </article>
                <article>
                  <strong>Ledger</strong>
                  <span>{selectedHandoff?.accounting_export_profile_ref ?? "No profile"}</span>
                </article>
                <article>
                  <strong>Statutory</strong>
                  <span>{selectedHandoff?.statutory_pack_ref ?? "No profile"}</span>
                </article>
              </div>
            </section>

            <div className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Package register</span>
                  <h2>Finance artifacts</h2>
                </div>
                <span className="payroll-setup-count">{visibleArtifacts.length} artifacts</span>
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-output-artifact-table payroll-handoff-artifact-table">
                  <thead>
                    <tr>
                      <th>Artifact</th>
                      <th>Kind</th>
                      <th>Profile</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleArtifacts.map((artifact) => (
                      <tr className={selectedArtifact?.id === artifact.id ? "is-selected" : ""} key={artifact.id}>
                        <td>
                          <Link href={`/hr-admin/payroll-handoff?handoffId=${selectedHandoff?.id ?? ""}&artifactId=${artifact.id}`}>
                            <strong>{artifact.title}</strong>
                            <span>{artifact.file_name}</span>
                            <span>{artifact.mime_type || artifact.content_type} / {formatFileSize(artifact.file_size_bytes)}</span>
                            <span>hash {artifact.source_hash.slice(0, 12)}</span>
                          </Link>
                        </td>
                        <td><StatusBadge status={artifact.kind} /></td>
                        <td><code>{artifact.output_profile_ref}</code></td>
                        <td>{formatMoney(artifactAmount(artifact))}</td>
                        <td><StatusBadge status={artifact.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <ArtifactDetail artifact={selectedArtifact} />
        </div>
      </section>
    </main>
  );
}
