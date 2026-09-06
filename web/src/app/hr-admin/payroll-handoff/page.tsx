import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollFinanceHandoffSetup } from "@/lib/api";
import type {
  HrAdminPayrollFinanceHandoff,
  HrAdminPayrollOutputArtifact,
  HrAdminPayrollProviderCallbackEvent,
  HrAdminPayrollProviderDelivery,
  HrAdminPayrollProviderRetryEvent,
} from "@/lib/types";

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

function snapshotText(snapshot: Record<string, unknown>, key: string, fallback = "Not configured") {
  const value = snapshot[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function snapshotRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function filingSubtypeLabel(artifact: HrAdminPayrollOutputArtifact) {
  const subtype = snapshotText(artifact.config_snapshot, "artifact_subtype", artifact.kind);
  return titleCase(subtype.replace("statutory_", ""));
}

function ArtifactDetail({
  artifact,
  delivery,
  retryEvents,
}: {
  artifact: HrAdminPayrollOutputArtifact | null;
  delivery: HrAdminPayrollProviderDelivery | null;
  retryEvents: HrAdminPayrollProviderRetryEvent[];
}) {
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
  const submissionContract = snapshotRecord(delivery?.request_snapshot.submission_contract ?? delivery?.config_snapshot.submission_contract);
  const certificationEvidence = snapshotRecord(delivery?.config_snapshot.certification_evidence);
  const providerRoute = snapshotRecord(delivery?.config_snapshot.provider_route);
  const providerConnectionGate = snapshotRecord(providerRoute.provider_connection_gate ?? submissionContract.provider_connection_gate);
  const executionAdapter = snapshotRecord(providerRoute.execution_adapter);
  const retryState = snapshotRecord(delivery?.config_snapshot.retry_state);
  const deliveryRetryEvents = delivery ? retryEvents.filter((event) => event.provider_delivery_id === delivery.id) : [];
  const latestRetryEvent = deliveryRetryEvents[0] ?? null;
  const retryableDelivery = delivery?.status === "failed" || delivery?.status === "rejected";

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
          <div className="detail-row"><span className="detail-label">Subtype</span><span className="detail-value">{filingSubtypeLabel(artifact)}</span></div>
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

      {delivery ? (
        <section className="payroll-rule-source-card">
          <span className="workspace-card__eyebrow">Provider acknowledgement</span>
          <div className="detail-grid">
            <div className="detail-row"><span className="detail-label">Provider</span><span className="detail-value">{delivery.provider_ref}</span></div>
            <div className="detail-row"><span className="detail-label">Channel</span><span className="detail-value">{delivery.channel_ref}</span></div>
            <div className="detail-row"><span className="detail-label">Adapter</span><span className="detail-value">{snapshotText(submissionContract, "adapter_ref")}</span></div>
            <div className="detail-row"><span className="detail-label">Submission</span><span className="detail-value">{snapshotText(submissionContract, "submission_profile_ref")}</span></div>
            <div className="detail-row"><span className="detail-label">External ref</span><span className="detail-value">{delivery.external_reference || "Pending"}</span></div>
            <div className="detail-row"><span className="detail-label">Retry policy</span><span className="detail-value">{delivery.retry_policy_ref}</span></div>
            <div className="detail-row"><span className="detail-label">Connection gate</span><span className="detail-value">{snapshotText(providerConnectionGate, "enforcement_mode", "warn")}</span></div>
            <div className="detail-row"><span className="detail-label">Connection status</span><span className="detail-value">{snapshotText(providerConnectionGate, "status", "not configured")}</span></div>
            <div className="detail-row"><span className="detail-label">Connection blockers</span><span className="detail-value">{Array.isArray(providerConnectionGate.blocking_gate_refs) && providerConnectionGate.blocking_gate_refs.length ? providerConnectionGate.blocking_gate_refs.join(", ") : "None"}</span></div>
            <div className="detail-row"><span className="detail-label">Attempts</span><span className="detail-value">{delivery.attempt_count}</span></div>
            <div className="detail-row"><span className="detail-label">Reconciled</span><span className="detail-value">{formatDate(delivery.reconciled_at)}</span></div>
            {delivery.failure_code ? (
              <div className="detail-row"><span className="detail-label">Failure</span><span className="detail-value">{delivery.failure_code}</span></div>
            ) : null}
          </div>
        </section>
      ) : null}

      {delivery && retryableDelivery ? (
        <section className="payroll-rule-source-card payroll-handoff-retry-command-card">
          <span className="workspace-card__eyebrow">Retry commands</span>
          <div className="payroll-handoff-retry-command-strip">
            <form action={`/api/v1/hr-admin/payroll-provider-deliveries/${delivery.id}/schedule-retry/`} method="post">
              <button className="button" type="submit">Schedule retry</button>
            </form>
            <form action={`/api/v1/hr-admin/payroll-provider-deliveries/${delivery.id}/requeue/`} method="post">
              <button className="button button--secondary" type="submit">Requeue delivery</button>
            </form>
          </div>
          <div className="detail-grid">
            <div className="detail-row"><span className="detail-label">Retry state</span><span className="detail-value">{titleCase(snapshotText(retryState, "state", "not scheduled"))}</span></div>
            <div className="detail-row"><span className="detail-label">Next attempt</span><span className="detail-value">{String(retryState.next_attempt_number ?? latestRetryEvent?.attempt_number ?? "Pending")}</span></div>
            <div className="detail-row"><span className="detail-label">Failure category</span><span className="detail-value">{snapshotText(retryState, "failure_category_ref", latestRetryEvent?.failure_category_ref ?? "Not classified")}</span></div>
            <div className="detail-row"><span className="detail-label">Worker</span><span className="detail-value">{snapshotText(executionAdapter, "worker_profile_ref", "payroll.provider_retry.worker.default.v1")}</span></div>
            {providerRoute.credential_ref ? (
              <div className="detail-row"><span className="detail-label">Credential</span><span className="detail-value">{String(providerRoute.credential_ref)}</span></div>
            ) : null}
            {providerRoute.credential_profile_ref ? (
              <div className="detail-row"><span className="detail-label">Credential profile</span><span className="detail-value">{String(providerRoute.credential_profile_ref)}</span></div>
            ) : null}
          </div>
        </section>
      ) : null}

      {delivery ? (
        <section className="payroll-rule-source-card">
          <span className="workspace-card__eyebrow">Submission contract</span>
          <div className="detail-grid">
            <div className="detail-row"><span className="detail-label">Mode</span><span className="detail-value">{snapshotText(submissionContract, "submission_mode")}</span></div>
            <div className="detail-row"><span className="detail-label">Request schema</span><span className="detail-value">{snapshotText(submissionContract, "request_schema_ref")}</span></div>
            <div className="detail-row"><span className="detail-label">Response schema</span><span className="detail-value">{snapshotText(submissionContract, "response_schema_ref")}</span></div>
            <div className="detail-row"><span className="detail-label">Callback</span><span className="detail-value">{snapshotText(submissionContract, "callback_profile_ref")}</span></div>
            <div className="detail-row"><span className="detail-label">Verification</span><span className="detail-value">{snapshotText(submissionContract, "callback_verification_ref")}</span></div>
            <div className="detail-row"><span className="detail-label">Certification</span><span className="detail-value">{snapshotText(submissionContract, "certification_profile_ref")}</span></div>
            <div className="detail-row"><span className="detail-label">Evidence</span><span className="detail-value">{titleCase(snapshotText(certificationEvidence, "status", "pending"))}</span></div>
          </div>
        </section>
      ) : null}

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

function DeliveryLedger({
  deliveries,
  callbackEvents,
  retryEvents,
  selectedHandoff,
}: {
  deliveries: HrAdminPayrollProviderDelivery[];
  callbackEvents: HrAdminPayrollProviderCallbackEvent[];
  retryEvents: HrAdminPayrollProviderRetryEvent[];
  selectedHandoff: HrAdminPayrollFinanceHandoff | null;
}) {
  const visibleDeliveries = selectedHandoff ? deliveries.filter((item) => item.handoff_id === selectedHandoff.id) : deliveries;
  const visibleEvents = selectedHandoff ? callbackEvents.filter((item) => item.handoff_id === selectedHandoff.id) : callbackEvents;
  const visibleRetryEvents = selectedHandoff ? retryEvents.filter((item) => item.handoff_id === selectedHandoff.id) : retryEvents;
  return (
    <>
      <section className="payroll-setup-assignment-panel payroll-handoff-delivery-panel">
        <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
          <div>
            <span className="workspace-card__eyebrow">Provider ledger</span>
            <h2>Delivery acknowledgements</h2>
          </div>
          <span className="payroll-setup-count">{visibleDeliveries.length} deliveries</span>
        </div>
        <div className="payroll-output-handoff-grid payroll-handoff-delivery-grid">
          {visibleDeliveries.map((delivery) => (
            <article key={delivery.id}>
              <div className="payroll-delivery-card-heading">
                <strong>{delivery.artifact_kind_label}</strong>
                <StatusBadge status={delivery.status} />
              </div>
              <span>{delivery.output_artifact_title}</span>
              <code>{delivery.provider_ref}</code>
              <div className="payroll-input-run-card__counts">
                <span>{delivery.external_reference || "No external ref"}</span>
                <span>{delivery.attempt_count} attempt</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="payroll-setup-assignment-panel payroll-handoff-retry-panel">
        <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
          <div>
            <span className="workspace-card__eyebrow">Async recovery</span>
            <h2>Provider retries</h2>
          </div>
          <span className="payroll-setup-count">{visibleRetryEvents.length} events</span>
        </div>
        <div className="payroll-output-handoff-grid payroll-handoff-delivery-grid">
          {visibleRetryEvents.map((event) => (
            <article key={event.id}>
              <div className="payroll-delivery-card-heading">
                <strong>{event.status_label}</strong>
                <StatusBadge status={event.status} />
              </div>
              <span>{event.output_artifact_title}</span>
              <code>{event.retry_policy_ref}</code>
              <div className="payroll-input-run-card__counts">
                <span>{event.failure_category_ref || event.failure_code || "Classified"}</span>
                <span>Attempt {event.attempt_number}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="payroll-setup-assignment-panel payroll-handoff-callback-panel">
        <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
          <div>
            <span className="workspace-card__eyebrow">Webhook ingestion</span>
            <h2>Provider callbacks</h2>
          </div>
          <span className="payroll-setup-count">{visibleEvents.length} events</span>
        </div>
        <div className="payroll-output-handoff-grid payroll-handoff-delivery-grid">
          {visibleEvents.map((event) => (
            <article key={event.id}>
              <div className="payroll-delivery-card-heading">
                <strong>{event.status_label}</strong>
                <StatusBadge status={event.provider_status} />
              </div>
              <span>{event.output_artifact_title}</span>
              <code>{event.callback_verification_ref}</code>
              <div className="payroll-input-run-card__counts">
                <span>{event.external_event_id || event.external_reference}</span>
                <span>{formatDate(event.processed_at)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
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
  const selectedDelivery = selectedArtifact ? setup.deliveries.find((item) => item.output_artifact_id === selectedArtifact.id) ?? null : null;
  const totals = selectedHandoff?.totals_snapshot ?? {};
  const summary = selectedHandoff?.handoff_summary_snapshot ?? {};
  const statutoryFilingArtifacts = visibleArtifacts.filter((artifact) => {
    const subtype = artifact.config_snapshot.artifact_subtype;
    return artifact.kind === "statutory_report" && (subtype === "statutory_return" || subtype === "statutory_challan");
  });

  return (
    <main className="shell shell--payroll-setup shell--payroll-outputs shell--payroll-handoff">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll phase 3C" : "Demo payroll phase 3C"}
        title="Payroll Handoff"
        description="Package bank advice, accounting exports, statutory summaries, returns, and challans from published payroll outputs with configurable finance profile references."
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
            <Link className="button button--secondary" href="/hr-admin/payroll-providers">
              Providers
            </Link>
          </>
        }
        pills={["Bank advice", "Accounting export", "Statutory filings"]}
        showPills
      />

      <section className="section section--tight">
        <div className="metric-grid-modern payroll-setup-metrics">
          <MetricTile className="metric-tile-soft" label="Handoffs" value={setup.summary.handoff_count} trend={`${setup.summary.transmitted_handoff_count} transmitted`} />
          <MetricTile className="metric-tile-soft" label="Finance artifacts" value={setup.summary.finance_artifact_count} trend={`${setup.summary.published_output_batch_count} published batches`} />
          <MetricTile className="metric-tile-soft" label="Filing files" value={setup.summary.statutory_filing_artifact_count ?? 0} trend={`${setup.summary.statutory_filing_count ?? 0} filing calendars`} />
          <MetricTile className="metric-tile-soft" label="Callbacks" value={setup.summary.provider_callback_event_count ?? 0} trend={`${setup.summary.processed_provider_callback_event_count ?? 0} processed`} />
          <MetricTile className="metric-tile-soft" label="Retries" value={setup.summary.provider_retry_event_count ?? 0} trend={`${setup.summary.scheduled_provider_retry_event_count ?? 0} scheduled`} />
          <MetricTile className="metric-tile-soft" label="Reconciled" value={setup.summary.reconciled_delivery_count} trend={`${setup.summary.submitted_delivery_count} submitted`} />
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
              <article>
                <span>Filing files</span>
                <strong>{String(summary.statutory_filing_artifact_count ?? statutoryFilingArtifacts.length)}</strong>
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
              <div>
                <span className="workspace-card__eyebrow">Reconciled</span>
                <strong>{String(summary.reconciled_delivery_count ?? setup.summary.reconciled_delivery_count ?? 0)}</strong>
                <span>{String(summary.failed_delivery_count ?? 0)} failed</span>
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

            <section className="payroll-setup-assignment-panel payroll-handoff-filing-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Return and challan artifacts</span>
                  <h2>Statutory filing files</h2>
                </div>
                <span className="payroll-setup-count">{statutoryFilingArtifacts.length} files</span>
              </div>
              <div className="payroll-handoff-filing-grid">
                {statutoryFilingArtifacts.map((artifact) => (
                  <Link
                    className={`payroll-handoff-filing-card ${selectedArtifact?.id === artifact.id ? "is-selected" : ""}`}
                    href={`/hr-admin/payroll-handoff?handoffId=${selectedHandoff?.id ?? ""}&artifactId=${artifact.id}`}
                    key={artifact.id}
                  >
                    <div className="payroll-delivery-card-heading">
                      <strong>{artifact.title}</strong>
                      <StatusBadge status={filingSubtypeLabel(artifact).toLowerCase()} />
                    </div>
                    <span>{snapshotText(artifact.config_snapshot, "statutory_filing_calendar_code")} / {snapshotText(artifact.config_snapshot, "filing_type_ref")}</span>
                    <code>{artifact.output_profile_ref}</code>
                    <div className="payroll-input-run-card__counts">
                      <span>{formatMoney(artifact.totals_snapshot.statutory_total)}</span>
                      <span>{snapshotText(artifact.config_snapshot, "provider_ref")}</span>
                    </div>
                  </Link>
                ))}
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

            <DeliveryLedger deliveries={setup.deliveries} callbackEvents={setup.callback_events} retryEvents={setup.retry_events} selectedHandoff={selectedHandoff} />
          </div>

          <ArtifactDetail artifact={selectedArtifact} delivery={selectedDelivery} retryEvents={setup.retry_events} />
        </div>
      </section>
    </main>
  );
}
