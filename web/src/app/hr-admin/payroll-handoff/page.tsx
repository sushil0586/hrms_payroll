import Link from "next/link";
import type React from "react";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollFinanceHandoffSetup } from "@/lib/api";
import { PayrollCloseActionsPanel } from "../payroll-close-actions-panel";
import type {
  HrAdminPayrollFinanceHandoff,
  HrAdminPayrollOutputArtifact,
  HrAdminPayrollProviderCallbackEvent,
  HrAdminPayrollProviderDelivery,
  HrAdminPayrollProviderJob,
  HrAdminPayrollProviderRetryEvent,
} from "@/lib/types";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

type EvidenceKind = "delivery" | "retry" | "job" | "callback";
type EvidenceSelection = {
  kind: EvidenceKind;
  id: string;
};
type EvidenceRow = {
  label: string;
  value: unknown;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function numberParam(value: SearchParamValue, fallback: number) {
  const parsed = Number(normalizeParam(value));
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function buildHref(
  basePath: string,
  currentParams: Record<string, SearchParamValue>,
  updates: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();

  Object.entries(currentParams).forEach(([key, value]) => {
    const normalized = normalizeParam(value);
    if (normalized) {
      params.set(key, normalized);
    }
  });

  Object.entries(updates).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  });

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

function parseEvidenceParam(value: SearchParamValue): EvidenceSelection | null {
  const normalizedValue = normalizeParam(value);
  if (!normalizedValue) {
    return null;
  }
  const separatorIndex = normalizedValue.indexOf(":");
  if (separatorIndex < 1) {
    return null;
  }
  const kind = normalizedValue.slice(0, separatorIndex);
  const id = normalizedValue.slice(separatorIndex + 1);
  if ((kind === "delivery" || kind === "retry" || kind === "job" || kind === "callback") && id) {
    return { kind, id };
  }
  return null;
}

function evidenceHref({
  handoffId,
  artifactId,
  kind,
  id,
}: {
  handoffId: string | null | undefined;
  artifactId: string | null | undefined;
  kind: EvidenceKind;
  id: string;
}) {
  const params = new URLSearchParams();
  if (handoffId) {
    params.set("handoffId", handoffId);
  }
  if (artifactId) {
    params.set("artifactId", artifactId);
  }
  params.set("evidence", `${kind}:${id}`);
  return `/hr-admin/payroll-handoff?${params.toString()}`;
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

function formatEvidenceValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "None";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (!value.length) {
      return "None";
    }
    return value.map((item): string => formatEvidenceValue(item)).join(", ");
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "Configured";
  }
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`readiness-badge readiness-badge--${status}`}>{titleCase(status)}</span>;
}

function HandoffRail({
  handoffs,
  selectedHandoff,
  allHandoffs,
  currentParams,
  page,
  pageSize,
}: {
  handoffs: HrAdminPayrollFinanceHandoff[];
  selectedHandoff: HrAdminPayrollFinanceHandoff | null;
  allHandoffs: HrAdminPayrollFinanceHandoff[];
  currentParams: Record<string, SearchParamValue>;
  page: number;
  pageSize: number;
}) {
  const totalPages = Math.max(1, Math.ceil(allHandoffs.length / pageSize));
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
      <PaginationBar
        firstHref={buildHref("/hr-admin/payroll-handoff", currentParams, { handoffPage: "1", handoffPageSize: String(pageSize), handoffId: undefined, artifactId: undefined, evidence: undefined })}
        hasNext={page < totalPages}
        hasPrevious={page > 1}
        lastHref={buildHref("/hr-admin/payroll-handoff", currentParams, { handoffPage: String(totalPages), handoffPageSize: String(pageSize), handoffId: undefined, artifactId: undefined, evidence: undefined })}
        nextHref={buildHref("/hr-admin/payroll-handoff", currentParams, { handoffPage: String(page + 1), handoffPageSize: String(pageSize), handoffId: undefined, artifactId: undefined, evidence: undefined })}
        page={page}
        pageSize={pageSize}
        previousHref={buildHref("/hr-admin/payroll-handoff", currentParams, { handoffPage: String(page - 1), handoffPageSize: String(pageSize), handoffId: undefined, artifactId: undefined, evidence: undefined })}
        totalCount={allHandoffs.length}
      />
    </aside>
  );
}

function artifactAmount(artifact: HrAdminPayrollOutputArtifact | null) {
  if (!artifact) {
    return "0.00";
  }
  return artifact.totals_snapshot.net_pay ?? artifact.totals_snapshot.statutory_total ?? artifact.totals_snapshot.gross_earnings ?? "0.00";
}

function artifactValueLabel(artifact: HrAdminPayrollOutputArtifact | null) {
  if (!artifact) {
    return formatMoney(0);
  }
  if (artifact.kind === "provider_audit_pack") {
    return "Locked evidence";
  }
  return formatMoney(artifactAmount(artifact));
}

function snapshotText(snapshot: Record<string, unknown>, key: string, fallback = "Not configured") {
  const value = snapshot[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function snapshotRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function snapshotList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function responseRuntimeEvents(job: HrAdminPayrollProviderJob) {
  return snapshotList(snapshotRecord(job.response_snapshot).runtime_events);
}

function EvidenceRows({ rows }: { rows: EvidenceRow[] }) {
  return (
    <div className="detail-grid">
      {rows.map((row) => (
        <div className="detail-row" key={row.label}>
          <span className="detail-label">{row.label}</span>
          <span className="detail-value">{formatEvidenceValue(row.value)}</span>
        </div>
      ))}
    </div>
  );
}

function EvidenceBlock({
  eyebrow,
  title,
  rows,
  children,
}: {
  eyebrow: string;
  title: string;
  rows?: EvidenceRow[];
  children?: React.ReactNode;
}) {
  return (
    <section className="payroll-rule-source-card payroll-handoff-audit-block">
      <span className="workspace-card__eyebrow">{eyebrow}</span>
      <h3>{title}</h3>
      {rows ? <EvidenceRows rows={rows} /> : null}
      {children}
    </section>
  );
}

function callbackSecuritySnapshot(event: HrAdminPayrollProviderCallbackEvent) {
  return snapshotRecord(event.verification_snapshot.callback_security);
}

function callbackSignatureAdapterSnapshot(event: HrAdminPayrollProviderCallbackEvent) {
  return snapshotRecord(event.verification_snapshot.signature_adapter);
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
  const schemaMapping = snapshotRecord(submissionContract.schema_mapping ?? providerRoute.schema_mapping ?? delivery?.request_snapshot.schema_mapping);
  const providerConnectionGate = snapshotRecord(providerRoute.provider_connection_gate ?? submissionContract.provider_connection_gate);
  const executionAdapter = snapshotRecord(providerRoute.execution_adapter);
  const httpAdapter = snapshotRecord(providerRoute.http_adapter);
  const productionAdapter = snapshotRecord(providerRoute.production_adapter ?? submissionContract.production_adapter);
  const bankPayout = snapshotRecord(delivery?.response_snapshot.bank_payout ?? providerRoute.bank_payout_adapter ?? submissionContract.bank_payout_adapter);
  const accountingJournal = snapshotRecord(delivery?.response_snapshot.accounting_journal ?? providerRoute.accounting_journal_adapter ?? submissionContract.accounting_journal_adapter);
  const statutoryFiling = snapshotRecord(delivery?.response_snapshot.statutory_filing ?? providerRoute.statutory_filing_adapter ?? submissionContract.statutory_filing_adapter);
  const retryState = snapshotRecord(delivery?.config_snapshot.retry_state);
  const deliveryRetryEvents = delivery ? retryEvents.filter((event) => event.provider_delivery_id === delivery.id) : [];
  const latestRetryEvent = deliveryRetryEvents[0] ?? null;
  const retryableDelivery = delivery?.status === "failed" || delivery?.status === "rejected";
  const evidenceChecksum = String(artifact.totals_snapshot.evidence_checksum_sha256 ?? artifact.checksum_sha256 ?? "");

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
        <strong>{artifactValueLabel(artifact)}</strong>
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
          <div className="detail-row"><span className="detail-label">Checksum Sha256</span><span className="detail-value">{artifact.checksum_sha256 || "Pending"}</span></div>
          {artifact.kind === "provider_audit_pack" ? (
            <div className="detail-row"><span className="detail-label">Evidence Checksum Sha256</span><span className="detail-value">{evidenceChecksum || "Pending"}</span></div>
          ) : null}
          <div className="detail-row"><span className="detail-label">Source hash</span><span className="detail-value">{artifact.source_hash || "Pending"}</span></div>
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
            {httpAdapter.endpoint_url ? (
              <>
                <div className="detail-row"><span className="detail-label">HTTP profile</span><span className="detail-value">{snapshotText(httpAdapter, "adapter_profile_ref")}</span></div>
                <div className="detail-row"><span className="detail-label">HTTP method</span><span className="detail-value">{snapshotText(httpAdapter, "method", "POST")}</span></div>
                <div className="detail-row"><span className="detail-label">HTTP transport</span><span className="detail-value">{snapshotText(httpAdapter, "transport_ref", "default")}</span></div>
                <div className="detail-row"><span className="detail-label">HTTP auth</span><span className="detail-value">{snapshotText(httpAdapter, "auth_scheme", "none")}</span></div>
              </>
            ) : null}
            {productionAdapter.adapter_pack_ref ? (
              <>
                <div className="detail-row"><span className="detail-label">Production pack</span><span className="detail-value">{snapshotText(productionAdapter, "adapter_pack_ref")}</span></div>
                <div className="detail-row"><span className="detail-label">Transport</span><span className="detail-value">{snapshotText(productionAdapter, "transport_mode")}</span></div>
                <div className="detail-row"><span className="detail-label">Transport ref</span><span className="detail-value">{snapshotText(productionAdapter, "transport_ref")}</span></div>
                <div className="detail-row"><span className="detail-label">Operation</span><span className="detail-value">{snapshotText(productionAdapter, "operation_ref")}</span></div>
                <div className="detail-row"><span className="detail-label">Evidence profile</span><span className="detail-value">{snapshotText(productionAdapter, "evidence_profile_ref")}</span></div>
              </>
            ) : null}
            {bankPayout.client_ref || bankPayout.payout_profile_ref ? (
              <>
                <div className="detail-row"><span className="detail-label">Live payout</span><span className="detail-value">{snapshotText(bankPayout, "payout_profile_ref")}</span></div>
                <div className="detail-row"><span className="detail-label">Bank client</span><span className="detail-value">{snapshotText(bankPayout, "client_ref")}</span></div>
                <div className="detail-row"><span className="detail-label">Operation</span><span className="detail-value">{snapshotText(bankPayout, "payment_operation_ref")}</span></div>
                <div className="detail-row"><span className="detail-label">Debit account</span><span className="detail-value">{snapshotText(bankPayout, "debit_account_ref")}</span></div>
                <div className="detail-row"><span className="detail-label">Payment date</span><span className="detail-value">{snapshotText(bankPayout, "payment_date")}</span></div>
                <div className="detail-row"><span className="detail-label">UTR refs</span><span className="detail-value">{formatEvidenceValue(bankPayout.utr_refs)}</span></div>
              </>
            ) : null}
            {accountingJournal.client_ref || accountingJournal.ledger_profile_ref ? (
              <>
                <div className="detail-row"><span className="detail-label">Live journal</span><span className="detail-value">{snapshotText(accountingJournal, "ledger_profile_ref")}</span></div>
                <div className="detail-row"><span className="detail-label">Accounting client</span><span className="detail-value">{snapshotText(accountingJournal, "client_ref")}</span></div>
                <div className="detail-row"><span className="detail-label">Operation</span><span className="detail-value">{snapshotText(accountingJournal, "journal_operation_ref")}</span></div>
                <div className="detail-row"><span className="detail-label">Company</span><span className="detail-value">{snapshotText(accountingJournal, "company_ref")}</span></div>
                <div className="detail-row"><span className="detail-label">Posting date</span><span className="detail-value">{snapshotText(accountingJournal, "posting_date")}</span></div>
                <div className="detail-row"><span className="detail-label">Voucher refs</span><span className="detail-value">{formatEvidenceValue(accountingJournal.voucher_refs)}</span></div>
              </>
            ) : null}
            {statutoryFiling.client_ref || statutoryFiling.filing_profile_ref ? (
              <>
                <div className="detail-row"><span className="detail-label">Live filing</span><span className="detail-value">{snapshotText(statutoryFiling, "filing_profile_ref")}</span></div>
                <div className="detail-row"><span className="detail-label">Statutory client</span><span className="detail-value">{snapshotText(statutoryFiling, "client_ref")}</span></div>
                <div className="detail-row"><span className="detail-label">Operation</span><span className="detail-value">{snapshotText(statutoryFiling, "filing_operation_ref")}</span></div>
                <div className="detail-row"><span className="detail-label">Authority</span><span className="detail-value">{snapshotText(statutoryFiling, "authority_ref")}</span></div>
                <div className="detail-row"><span className="detail-label">Registration</span><span className="detail-value">{snapshotText(statutoryFiling, "registration_ref")}</span></div>
                <div className="detail-row"><span className="detail-label">Receipt refs</span><span className="detail-value">{formatEvidenceValue(statutoryFiling.receipt_refs)}</span></div>
              </>
            ) : null}
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
            <form action={`/api/hr-admin/payroll-provider-deliveries/${delivery.id}/schedule-retry`} method="post">
              <button className="button" type="submit">Schedule retry</button>
            </form>
            <form action={`/api/hr-admin/payroll-provider-deliveries/${delivery.id}/requeue`} method="post">
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

      {delivery ? (
        <section className="payroll-rule-source-card">
          <span className="workspace-card__eyebrow">Schema mapping</span>
          <div className="detail-grid">
            <div className="detail-row"><span className="detail-label">Profile</span><span className="detail-value">{snapshotText(schemaMapping, "mapping_profile_ref")}</span></div>
            <div className="detail-row"><span className="detail-label">Mode</span><span className="detail-value">{titleCase(snapshotText(schemaMapping, "enforcement_mode", "warn"))}</span></div>
            <div className="detail-row"><span className="detail-label">Source</span><span className="detail-value">{snapshotText(schemaMapping, "source_schema_ref")}</span></div>
            <div className="detail-row"><span className="detail-label">Target</span><span className="detail-value">{snapshotText(schemaMapping, "target_schema_ref")}</span></div>
            <div className="detail-row"><span className="detail-label">Mapping hash</span><span className="detail-value">{snapshotText(schemaMapping, "source_hash", "Pending")}</span></div>
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

function AuditGateList({ gates }: { gates: Record<string, unknown>[] }) {
  if (!gates.length) {
    return <span className="payroll-handoff-audit-empty">No gates recorded</span>;
  }
  return (
    <div className="payroll-handoff-gate-list payroll-handoff-audit-gate-list">
      {gates.slice(0, 8).map((gate, index) => (
        <span className={gate.passed ? "is-passed" : "is-blocked"} key={`${String(gate.ref ?? "gate")}-${index}`}>
          {String(gate.ref ?? `gate_${index + 1}`)}
        </span>
      ))}
    </div>
  );
}

function AuditRuntimeEvents({ events }: { events: Record<string, unknown>[] }) {
  if (!events.length) {
    return <span className="payroll-handoff-audit-empty">No runtime events recorded</span>;
  }
  return (
    <div className="payroll-handoff-audit-event-list">
      {events.slice(0, 5).map((event, index) => {
        const evidence = snapshotRecord(event.evidence);
        return (
          <div className="payroll-handoff-audit-event" key={`${String(event.event_type ?? "event")}-${index}`}>
            <strong>{titleCase(String(event.event_type ?? `Runtime event ${index + 1}`))}</strong>
            <span>{formatEvidenceValue(event.recorded_at)}</span>
            {Object.keys(evidence).length ? <code>{formatEvidenceValue(evidence)}</code> : null}
          </div>
        );
      })}
    </div>
  );
}

function AuditEvidenceDetail({
  selection,
  selectedHandoff,
  deliveries,
  callbackEvents,
  providerJobs,
  retryEvents,
}: {
  selection: EvidenceSelection;
  selectedHandoff: HrAdminPayrollFinanceHandoff | null;
  deliveries: HrAdminPayrollProviderDelivery[];
  callbackEvents: HrAdminPayrollProviderCallbackEvent[];
  providerJobs: HrAdminPayrollProviderJob[];
  retryEvents: HrAdminPayrollProviderRetryEvent[];
}) {
  const closeHref = selectedHandoff ? `/hr-admin/payroll-handoff?handoffId=${selectedHandoff.id}` : "/hr-admin/payroll-handoff";

  if (selection.kind === "delivery") {
    const delivery = deliveries.find((item) => item.id === selection.id);
    if (!delivery) {
      return null;
    }
    const submissionContract = snapshotRecord(delivery.request_snapshot.submission_contract ?? delivery.config_snapshot.submission_contract);
    const providerRoute = snapshotRecord(delivery.config_snapshot.provider_route);
    const schemaMapping = snapshotRecord(submissionContract.schema_mapping ?? providerRoute.schema_mapping ?? delivery.request_snapshot.schema_mapping);
    const providerConnectionGate = snapshotRecord(providerRoute.provider_connection_gate ?? submissionContract.provider_connection_gate);
    const productionAdapter = snapshotRecord(providerRoute.production_adapter ?? submissionContract.production_adapter);
    const bankPayout = snapshotRecord(delivery.response_snapshot.bank_payout ?? providerRoute.bank_payout_adapter ?? submissionContract.bank_payout_adapter);
    const accountingJournal = snapshotRecord(delivery.response_snapshot.accounting_journal ?? providerRoute.accounting_journal_adapter ?? submissionContract.accounting_journal_adapter);
    const statutoryFiling = snapshotRecord(delivery.response_snapshot.statutory_filing ?? providerRoute.statutory_filing_adapter ?? submissionContract.statutory_filing_adapter);
    const certificationEvidence = snapshotRecord(delivery.config_snapshot.certification_evidence);
    const relatedJobs = providerJobs.filter((job) => job.provider_delivery_id === delivery.id);
    const relatedRetryEvents = retryEvents.filter((event) => event.provider_delivery_id === delivery.id);
    const relatedCallbacks = callbackEvents.filter((event) => event.provider_delivery_id === delivery.id);
    return (
      <aside className="payroll-setup-detail-panel payroll-output-detail-panel payroll-handoff-detail-panel payroll-handoff-audit-panel" aria-label="Delivery audit evidence">
        <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
          <div>
            <span className="workspace-card__eyebrow">Audit drilldown</span>
            <h2>Delivery Evidence</h2>
            <p className="section-copy section-copy-soft">{delivery.output_artifact_title}</p>
          </div>
          <StatusBadge status={delivery.status} />
        </div>
        <Link className="button button--secondary payroll-handoff-audit-close" href={closeHref}>Close evidence</Link>
        <EvidenceBlock
          eyebrow="Provider delivery"
          title={delivery.provider_ref}
          rows={[
            { label: "Artifact", value: delivery.artifact_kind_label },
            { label: "Channel", value: delivery.channel_ref },
            { label: "Adapter", value: submissionContract.adapter_ref },
            { label: "Submission", value: submissionContract.submission_profile_ref },
            { label: "External ref", value: delivery.external_reference },
            { label: "Payload checksum", value: delivery.payload_checksum_sha256 },
            { label: "Attempts", value: delivery.attempt_count },
            { label: "Retry policy", value: delivery.retry_policy_ref },
          ]}
        />
        <EvidenceBlock
          eyebrow="Schema mapping"
          title={snapshotText(schemaMapping, "mapping_profile_ref", "Mapping pending")}
          rows={[
            { label: "Enforcement", value: schemaMapping.enforcement_mode ?? "warn" },
            { label: "Source schema", value: schemaMapping.source_schema_ref },
            { label: "Target schema", value: schemaMapping.target_schema_ref },
            { label: "Mapping hash", value: schemaMapping.source_hash },
            { label: "Connection mode", value: providerConnectionGate.enforcement_mode },
            { label: "Connection status", value: providerConnectionGate.status },
          ]}
        />
        {productionAdapter.adapter_pack_ref ? (
          <EvidenceBlock
            eyebrow="Production adapter"
            title={snapshotText(productionAdapter, "adapter_pack_ref")}
            rows={[
              { label: "Transport", value: productionAdapter.transport_mode },
              { label: "Operation", value: productionAdapter.operation_ref },
              { label: "Domain contract", value: productionAdapter.domain_contract_ref },
              { label: "Evidence profile", value: productionAdapter.evidence_profile_ref },
              { label: "Credential ref", value: productionAdapter.requires_credential_ref },
              { label: "Certified connection", value: productionAdapter.requires_certified_connection },
            ]}
          />
        ) : null}
        {bankPayout.client_ref || bankPayout.payout_profile_ref ? (
          <EvidenceBlock
            eyebrow="Bank payout"
            title={snapshotText(bankPayout, "payout_profile_ref")}
            rows={[
              { label: "Client", value: bankPayout.client_ref },
              { label: "Operation", value: bankPayout.payment_operation_ref },
              { label: "Debit account", value: bankPayout.debit_account_ref },
              { label: "Payment date", value: bankPayout.payment_date },
              { label: "Total", value: bankPayout.total_amount },
              { label: "Rows", value: bankPayout.payout_row_count },
              { label: "Accepted", value: bankPayout.accepted_count },
              { label: "Rejected", value: bankPayout.rejected_count },
              { label: "UTR refs", value: bankPayout.utr_refs },
              { label: "Evidence refs", value: bankPayout.evidence_refs },
              { label: "Failure taxonomy", value: bankPayout.failure_taxonomy_ref },
            ]}
          />
        ) : null}
        {accountingJournal.client_ref || accountingJournal.ledger_profile_ref ? (
          <EvidenceBlock
            eyebrow="Accounting journal"
            title={snapshotText(accountingJournal, "ledger_profile_ref")}
            rows={[
              { label: "Client", value: accountingJournal.client_ref },
              { label: "Posting profile", value: accountingJournal.posting_profile_ref },
              { label: "Operation", value: accountingJournal.journal_operation_ref },
              { label: "Company", value: accountingJournal.company_ref },
              { label: "Books", value: accountingJournal.books_ref },
              { label: "Posting date", value: accountingJournal.posting_date },
              { label: "Total", value: accountingJournal.total_amount },
              { label: "Rows", value: accountingJournal.journal_row_count },
              { label: "Posted", value: accountingJournal.posted_count },
              { label: "Rejected", value: accountingJournal.rejected_count },
              { label: "Voucher refs", value: accountingJournal.voucher_refs },
              { label: "Document refs", value: accountingJournal.document_refs },
              { label: "Evidence refs", value: accountingJournal.evidence_refs },
              { label: "Failure taxonomy", value: accountingJournal.failure_taxonomy_ref },
            ]}
          />
        ) : null}
        {statutoryFiling.client_ref || statutoryFiling.filing_profile_ref ? (
          <EvidenceBlock
            eyebrow="Statutory filing"
            title={snapshotText(statutoryFiling, "filing_profile_ref")}
            rows={[
              { label: "Client", value: statutoryFiling.client_ref },
              { label: "Operation", value: statutoryFiling.filing_operation_ref },
              { label: "Filing type", value: statutoryFiling.filing_type_ref },
              { label: "Authority", value: statutoryFiling.authority_ref },
              { label: "Registration", value: statutoryFiling.registration_ref },
              { label: "Calendar", value: statutoryFiling.filing_calendar_ref },
              { label: "Due date", value: statutoryFiling.due_date },
              { label: "Total", value: statutoryFiling.total_amount },
              { label: "Rows", value: statutoryFiling.filing_row_count },
              { label: "Accepted", value: statutoryFiling.accepted_count },
              { label: "Rejected", value: statutoryFiling.rejected_count },
              { label: "Receipt refs", value: statutoryFiling.receipt_refs },
              { label: "Challan refs", value: statutoryFiling.challan_refs },
              { label: "Evidence refs", value: statutoryFiling.evidence_refs },
              { label: "Failure taxonomy", value: statutoryFiling.failure_taxonomy_ref },
            ]}
          />
        ) : null}
        <EvidenceBlock
          eyebrow="Certification"
          title={titleCase(snapshotText(certificationEvidence, "status", "pending"))}
          rows={[
            { label: "Profile", value: certificationEvidence.certification_profile_ref },
            { label: "Provider", value: certificationEvidence.provider_ref },
            { label: "Adapter", value: certificationEvidence.adapter_ref },
            { label: "Evidence refs", value: certificationEvidence.evidence_refs },
          ]}
        />
        <EvidenceBlock
          eyebrow="Evidence chain"
          title="Linked provider records"
          rows={[
            { label: "Jobs", value: relatedJobs.length },
            { label: "Retries", value: relatedRetryEvents.length },
            { label: "Callbacks", value: relatedCallbacks.length },
            { label: "Reconciled", value: formatDate(delivery.reconciled_at) },
            { label: "Failure", value: delivery.failure_code || "None" },
          ]}
        />
      </aside>
    );
  }

  if (selection.kind === "retry") {
    const retryEvent = retryEvents.find((item) => item.id === selection.id);
    if (!retryEvent) {
      return null;
    }
    const decision = snapshotRecord(retryEvent.decision_snapshot);
    const request = snapshotRecord(retryEvent.request_snapshot);
    const relatedJob = providerJobs.find((job) => job.retry_event_id === retryEvent.id);
    return (
      <aside className="payroll-setup-detail-panel payroll-output-detail-panel payroll-handoff-detail-panel payroll-handoff-audit-panel" aria-label="Retry audit evidence">
        <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
          <div>
            <span className="workspace-card__eyebrow">Audit drilldown</span>
            <h2>Retry Evidence</h2>
            <p className="section-copy section-copy-soft">{retryEvent.output_artifact_title}</p>
          </div>
          <StatusBadge status={retryEvent.status} />
        </div>
        <Link className="button button--secondary payroll-handoff-audit-close" href={closeHref}>Close evidence</Link>
        <EvidenceBlock
          eyebrow="Retry decision"
          title={retryEvent.retry_policy_ref}
          rows={[
            { label: "Failure taxonomy", value: retryEvent.failure_taxonomy_ref },
            { label: "Failure category", value: retryEvent.failure_category_ref },
            { label: "Failure code", value: retryEvent.failure_code },
            { label: "Reason", value: retryEvent.retry_reason || retryEvent.failure_reason },
            { label: "Attempt", value: retryEvent.attempt_number },
            { label: "Scheduled", value: formatDate(retryEvent.scheduled_for) },
            { label: "Executed", value: formatDate(retryEvent.executed_at) },
          ]}
        />
        <EvidenceBlock
          eyebrow="Decision snapshot"
          title={titleCase(formatEvidenceValue(decision.state ?? retryEvent.status))}
          rows={[
            { label: "Eligible", value: decision.eligible },
            { label: "Max attempts", value: decision.max_attempts },
            { label: "Current attempt", value: decision.current_attempt_count },
            { label: "Next attempt", value: decision.next_attempt_number },
            { label: "Backoff seconds", value: decision.backoff_seconds },
            { label: "Requested for", value: request.requested_for },
          ]}
        />
        {relatedJob ? (
          <EvidenceBlock
            eyebrow="Queue job"
            title={relatedJob.queue_policy_ref}
            rows={[
              { label: "Worker", value: relatedJob.worker_profile_ref },
              { label: "Status", value: relatedJob.status_label },
              { label: "Recovered", value: relatedJob.recovery_count },
              { label: "Last recovery", value: formatDate(relatedJob.last_recovered_at) },
              { label: "Runtime", value: snapshotRecord(relatedJob.response_snapshot).queue_runtime_profile_ref },
            ]}
          />
        ) : null}
      </aside>
    );
  }

  if (selection.kind === "job") {
    const job = providerJobs.find((item) => item.id === selection.id);
    if (!job) {
      return null;
    }
    const queuePolicy = snapshotRecord(job.request_snapshot.queue_policy);
    const leaseSnapshot = snapshotRecord(job.lease_snapshot);
    const responseSnapshot = snapshotRecord(job.response_snapshot);
    return (
      <aside className="payroll-setup-detail-panel payroll-output-detail-panel payroll-handoff-detail-panel payroll-handoff-audit-panel" aria-label="Queue job audit evidence">
        <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
          <div>
            <span className="workspace-card__eyebrow">Audit drilldown</span>
            <h2>Queue Runtime Evidence</h2>
            <p className="section-copy section-copy-soft">{job.job_kind_label}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>
        <Link className="button button--secondary payroll-handoff-audit-close" href={closeHref}>Close evidence</Link>
        <EvidenceBlock
          eyebrow="Queue contract"
          title={job.queue_policy_ref}
          rows={[
            { label: "Worker", value: job.worker_profile_ref },
            { label: "Provider", value: job.provider_ref },
            { label: "Idempotency", value: job.idempotency_key },
            { label: "Priority", value: job.priority },
            { label: "Attempts", value: `${job.attempt_count}/${job.max_attempts}` },
            { label: "Scheduled", value: formatDate(job.scheduled_for) },
            { label: "Failure", value: job.failure_code || "None" },
          ]}
        />
        <EvidenceBlock
          eyebrow="Runtime policy"
          title={snapshotText(queuePolicy, "worker_profile_ref", job.worker_profile_ref)}
          rows={[
            { label: "Lease seconds", value: queuePolicy.lease_seconds },
            { label: "Heartbeat seconds", value: queuePolicy.heartbeat_seconds },
            { label: "Max recoveries", value: queuePolicy.max_recoveries },
            { label: "Recovery backoff", value: queuePolicy.stale_recovery_backoff_seconds },
            { label: "Heartbeat count", value: job.heartbeat_count },
            { label: "Recovery count", value: job.recovery_count },
          ]}
        />
        <EvidenceBlock
          eyebrow="Lease evidence"
          title={snapshotText(leaseSnapshot, "heartbeat_profile_ref", "Lease pending")}
          rows={[
            { label: "Lease owner", value: job.lease_owner_ref || leaseSnapshot.lease_owner_ref },
            { label: "Leased at", value: formatDate(job.leased_at) },
            { label: "Leased until", value: formatDate(job.leased_until) },
            { label: "Heartbeat at", value: formatDate(job.heartbeat_at) },
            { label: "Recovered at", value: formatDate(job.last_recovered_at) },
            { label: "Runtime profile", value: responseSnapshot.queue_runtime_profile_ref },
          ]}
        />
        <EvidenceBlock eyebrow="Runtime events" title={titleCase(snapshotText(responseSnapshot, "last_runtime_event", "No event"))}>
          <AuditRuntimeEvents events={responseRuntimeEvents(job)} />
        </EvidenceBlock>
      </aside>
    );
  }

  const callbackEvent = callbackEvents.find((item) => item.id === selection.id);
  if (!callbackEvent) {
    return null;
  }
  const security = callbackSecuritySnapshot(callbackEvent);
  const signatureAdapter = callbackSignatureAdapterSnapshot(callbackEvent);
  const credentialSnapshot = snapshotRecord(signatureAdapter.credential_snapshot);
  return (
    <aside className="payroll-setup-detail-panel payroll-output-detail-panel payroll-handoff-detail-panel payroll-handoff-audit-panel" aria-label="Callback audit evidence">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Audit drilldown</span>
          <h2>Callback Evidence</h2>
          <p className="section-copy section-copy-soft">{callbackEvent.output_artifact_title}</p>
        </div>
        <StatusBadge status={callbackEvent.status} />
      </div>
      <Link className="button button--secondary payroll-handoff-audit-close" href={closeHref}>Close evidence</Link>
      <EvidenceBlock
        eyebrow="Webhook identity"
        title={callbackEvent.callback_verification_ref}
        rows={[
          { label: "Provider", value: callbackEvent.provider_ref },
          { label: "External event", value: callbackEvent.external_event_id },
          { label: "External ref", value: callbackEvent.external_reference },
          { label: "Idempotency", value: callbackEvent.idempotency_key },
          { label: "Payload checksum", value: callbackEvent.payload_checksum_sha256 },
          { label: "Provider status", value: callbackEvent.provider_status_label },
          { label: "Processed", value: formatDate(callbackEvent.processed_at) },
        ]}
      />
      <EvidenceBlock
        eyebrow="Signature adapter"
        title={snapshotText(signatureAdapter, "signature_adapter_ref", "Adapter pending")}
        rows={[
          { label: "Algorithm", value: signatureAdapter.signature_algorithm_ref },
          { label: "Encoding", value: signatureAdapter.signature_encoding },
          { label: "Compare mode", value: signatureAdapter.compare_mode },
          { label: "Key mode", value: signatureAdapter.key_material_mode },
          { label: "Key ref", value: signatureAdapter.signature_key_ref },
          { label: "Credential source", value: credentialSnapshot.source_ref },
          { label: "Credential resolved", value: credentialSnapshot.resolved },
        ]}
      />
      <EvidenceBlock
        eyebrow="Webhook security"
        title={snapshotText(security, "security_policy_ref", "Security policy pending")}
        rows={[
          { label: "Enforcement", value: security.enforcement_mode },
          { label: "Source IP", value: security.source_ip },
          { label: "Replay window", value: security.replay_window_seconds },
          { label: "Rate limit", value: security.rate_limit_policy_ref },
          { label: "Blocking gates", value: security.blocking_gate_refs },
        ]}
      >
        <AuditGateList gates={snapshotList(security.gates)} />
      </EvidenceBlock>
    </aside>
  );
}

function DeliveryLedger({
  deliveries,
  callbackEvents,
  providerJobs,
  retryEvents,
  selectedHandoff,
  selectedEvidence,
}: {
  deliveries: HrAdminPayrollProviderDelivery[];
  callbackEvents: HrAdminPayrollProviderCallbackEvent[];
  providerJobs: HrAdminPayrollProviderJob[];
  retryEvents: HrAdminPayrollProviderRetryEvent[];
  selectedHandoff: HrAdminPayrollFinanceHandoff | null;
  selectedEvidence: EvidenceSelection | null;
}) {
  const visibleDeliveries = selectedHandoff ? deliveries.filter((item) => item.handoff_id === selectedHandoff.id) : deliveries;
  const visibleEvents = selectedHandoff ? callbackEvents.filter((item) => item.handoff_id === selectedHandoff.id) : callbackEvents;
  const visibleRetryEvents = selectedHandoff ? retryEvents.filter((item) => item.handoff_id === selectedHandoff.id) : retryEvents;
  const visibleJobs = selectedHandoff
    ? providerJobs.filter((job) => visibleDeliveries.some((delivery) => delivery.id === job.provider_delivery_id))
    : providerJobs;
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
            <Link
              className={`payroll-handoff-evidence-card ${selectedEvidence?.kind === "delivery" && selectedEvidence.id === delivery.id ? "is-selected" : ""}`}
              href={evidenceHref({ handoffId: selectedHandoff?.id, artifactId: delivery.output_artifact_id, kind: "delivery", id: delivery.id })}
              key={delivery.id}
            >
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
            </Link>
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
            <Link
              className={`payroll-handoff-evidence-card ${selectedEvidence?.kind === "retry" && selectedEvidence.id === event.id ? "is-selected" : ""}`}
              href={evidenceHref({ handoffId: selectedHandoff?.id, artifactId: event.output_artifact_id, kind: "retry", id: event.id })}
              key={event.id}
            >
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
            </Link>
          ))}
        </div>
      </section>

      <section className="payroll-setup-assignment-panel payroll-handoff-job-panel">
        <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
          <div>
            <span className="workspace-card__eyebrow">Queue orchestration</span>
            <h2>Provider jobs</h2>
          </div>
          <span className="payroll-setup-count">{visibleJobs.length} jobs</span>
        </div>
        <div className="payroll-output-handoff-grid payroll-handoff-delivery-grid">
          {visibleJobs.map((job) => (
            <Link
              className={`payroll-handoff-evidence-card payroll-handoff-job-card ${selectedEvidence?.kind === "job" && selectedEvidence.id === job.id ? "is-selected" : ""}`}
              href={evidenceHref({
                handoffId: selectedHandoff?.id,
                artifactId: visibleDeliveries.find((delivery) => delivery.id === job.provider_delivery_id)?.output_artifact_id,
                kind: "job",
                id: job.id,
              })}
              key={job.id}
            >
              <div className="payroll-delivery-card-heading">
                <strong>{job.job_kind_label}</strong>
                <StatusBadge status={job.status} />
              </div>
              <span>{job.provider_ref || "Provider pending"}</span>
              <code>{job.queue_policy_ref}</code>
              <div className="payroll-handoff-security-strip">
                <span>Worker profile</span>
                <strong>{job.worker_profile_ref}</strong>
                <em>{job.lease_owner_ref || "Lease open"}</em>
              </div>
              <div className="payroll-input-run-card__counts">
                <span>Attempt {job.attempt_count}/{job.max_attempts}</span>
                <span>{formatDate(job.scheduled_for)}</span>
              </div>
              <div className="payroll-input-run-card__counts">
                <span>Heartbeat {job.heartbeat_count}</span>
                <span>Recovered {job.recovery_count}</span>
              </div>
              <div className="payroll-handoff-security-strip">
                <span>Last heartbeat</span>
                <strong>{formatDate(job.heartbeat_at)}</strong>
                <em>{job.last_recovered_at ? `Recovered ${formatDate(job.last_recovered_at)}` : "No recovery"}</em>
              </div>
              <code>{String(snapshotRecord(job.lease_snapshot).heartbeat_profile_ref ?? snapshotRecord(job.response_snapshot).queue_runtime_profile_ref ?? "payroll.provider_queue.runtime.pending")}</code>
            </Link>
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
          {visibleEvents.map((event) => {
            const security = callbackSecuritySnapshot(event);
            const signatureAdapter = callbackSignatureAdapterSnapshot(event);
            const securityGates = snapshotList(security.gates);
            const blockingGateRefs = Array.isArray(security.blocking_gate_refs) ? security.blocking_gate_refs : [];
            return (
              <Link
                className={`payroll-handoff-evidence-card payroll-handoff-callback-card ${selectedEvidence?.kind === "callback" && selectedEvidence.id === event.id ? "is-selected" : ""}`}
                href={evidenceHref({ handoffId: selectedHandoff?.id, artifactId: event.output_artifact_id, kind: "callback", id: event.id })}
                key={event.id}
              >
                <div className="payroll-delivery-card-heading">
                  <strong>{event.status_label}</strong>
                  <StatusBadge status={event.provider_status} />
                </div>
                <span>{event.output_artifact_title}</span>
                <code>{event.callback_verification_ref}</code>
                <div className="payroll-handoff-security-strip">
                  <span>Webhook security</span>
                  <strong>{snapshotText(security, "security_policy_ref", "Policy pending")}</strong>
                  <em>{titleCase(snapshotText(security, "enforcement_mode", "warn"))}</em>
                </div>
                <div className="payroll-handoff-security-strip">
                  <span>Signature adapter</span>
                  <strong>{snapshotText(signatureAdapter, "signature_adapter_ref", "Adapter pending")}</strong>
                  <em>{snapshotText(signatureAdapter, "signature_algorithm_ref", "Algorithm pending")}</em>
                </div>
                <div className="payroll-handoff-gate-list">
                  {securityGates.slice(0, 4).map((gate) => (
                    <span className={gate.passed ? "is-passed" : "is-blocked"} key={String(gate.ref)}>
                      {String(gate.ref)}
                    </span>
                  ))}
                  {blockingGateRefs.length > 0 ? <span className="is-blocked">{blockingGateRefs.length} blockers</span> : null}
                </div>
                <div className="payroll-input-run-card__counts">
                  <span>{event.external_event_id || event.external_reference}</span>
                  <span>{formatDate(event.processed_at)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}

export default async function HrAdminPayrollHandoffPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const selectedHandoffId = normalizeParam(currentParams.handoffId);
  const selectedArtifactId = normalizeParam(currentParams.artifactId);
  const selectedEvidence = parseEvidenceParam(currentParams.evidence);
  const handoffPageSize = Math.min(numberParam(currentParams.handoffPageSize, 8), 25);
  const artifactPageSize = Math.min(numberParam(currentParams.artifactPageSize, 8), 25);
  const result = await getHrAdminPayrollFinanceHandoffSetup();
  const setup = result.data;
  const handoffTotalPages = Math.max(1, Math.ceil(setup.handoffs.length / handoffPageSize));
  const handoffPage = Math.min(numberParam(currentParams.handoffPage, 1), handoffTotalPages);
  const pagedHandoffs = setup.handoffs.slice((handoffPage - 1) * handoffPageSize, handoffPage * handoffPageSize);
  const selectedHandoff = setup.handoffs.find((item) => item.id === selectedHandoffId) ?? pagedHandoffs[0] ?? setup.handoffs[0] ?? null;
  const visibleArtifacts = selectedHandoff ? setup.artifacts.filter((item) => item.output_batch_id === selectedHandoff.output_batch_id) : setup.artifacts;
  const artifactTotalPages = Math.max(1, Math.ceil(visibleArtifacts.length / artifactPageSize));
  const artifactPage = Math.min(numberParam(currentParams.artifactPage, 1), artifactTotalPages);
  const pagedArtifacts = visibleArtifacts.slice((artifactPage - 1) * artifactPageSize, artifactPage * artifactPageSize);
  const selectedArtifact = visibleArtifacts.find((item) => item.id === selectedArtifactId) ?? pagedArtifacts[0] ?? visibleArtifacts[0] ?? null;
  const selectedDelivery = selectedArtifact ? setup.deliveries.find((item) => item.output_artifact_id === selectedArtifact.id) ?? null : null;
  const totals = selectedHandoff?.totals_snapshot ?? {};
  const summary = selectedHandoff?.handoff_summary_snapshot ?? {};
  const statutoryFilingArtifacts = visibleArtifacts.filter((artifact) => {
    const subtype = artifact.config_snapshot.artifact_subtype;
    return artifact.kind === "statutory_report" && (subtype === "statutory_return" || subtype === "statutory_challan");
  });
  const auditPackArtifacts = visibleArtifacts.filter((artifact) => artifact.kind === "provider_audit_pack");

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
          <MetricTile className="metric-tile-soft" label="Provider jobs" value={setup.summary.provider_job_count ?? 0} trend={`${setup.summary.queued_provider_job_count ?? 0} queued / ${setup.summary.recovered_provider_job_count ?? 0} recovered`} />
          <MetricTile className="metric-tile-soft" label="Audit packs" value={setup.summary.provider_audit_pack_count ?? auditPackArtifacts.length} trend="Locked evidence" />
          <MetricTile className="metric-tile-soft" label="Reconciled" value={setup.summary.reconciled_delivery_count} trend={`${setup.summary.submitted_delivery_count} submitted`} />
          <MetricTile className="metric-tile-soft" label="Latest net pay" value={formatMoney(setup.summary.latest_net_pay)} trend="Handoff total" />
        </div>
      </section>

      <section className="section section--tight">
        <div className="payroll-setup-workspace payroll-output-workspace payroll-handoff-workspace">
          <HandoffRail
            allHandoffs={setup.handoffs}
            currentParams={currentParams}
            handoffs={pagedHandoffs}
            page={handoffPage}
            pageSize={handoffPageSize}
            selectedHandoff={selectedHandoff}
          />

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
              <div>
                <span className="workspace-card__eyebrow">Audit pack</span>
                <strong>{auditPackArtifacts.length ? "Locked" : "Pending"}</strong>
              </div>
            </div>

            <PayrollCloseActionsPanel
              eyebrow="Payroll operations"
              title="Handoff controls"
              description="Transmit, acknowledge, and lock provider audit-pack evidence using configurable handoff profiles."
              actions={[
                {
                  id: "transmit-handoff",
                  label: "Transmit handoff",
                  endpoint: selectedHandoff ? `/api/hr-admin/payroll-finance-handoffs/${selectedHandoff.id}/transmit` : "",
                  disabled: !selectedHandoff,
                  disabledReason: "Select a finance handoff first.",
                },
                {
                  id: "acknowledge-handoff",
                  label: "Acknowledge handoff",
                  endpoint: selectedHandoff ? `/api/hr-admin/payroll-finance-handoffs/${selectedHandoff.id}/acknowledge` : "",
                  profileField: "acknowledgement_profile_ref",
                  profileLabel: "Acknowledgement profile ref",
                  defaultProfileRef: "tenant.payroll.finance.ack.v1",
                  disabled: !selectedHandoff,
                  disabledReason: "Select a finance handoff first.",
                },
                {
                  id: "generate-audit-pack",
                  label: "Generate audit pack",
                  endpoint: selectedHandoff ? `/api/hr-admin/payroll-finance-handoffs/${selectedHandoff.id}/generate-audit-pack` : "",
                  profileField: "audit_pack_profile_ref",
                  profileLabel: "Audit pack profile ref",
                  defaultProfileRef: "tenant.payroll.provider.audit.v1",
                  disabled: !selectedHandoff,
                  disabledReason: "Select a finance handoff first.",
                },
              ]}
            />

            {auditPackArtifacts.length ? (
              <section className="payroll-setup-assignment-panel payroll-handoff-audit-pack-panel">
                <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                  <div>
                    <span className="workspace-card__eyebrow">Locked evidence</span>
                    <h2>Provider audit pack</h2>
                  </div>
                  <span className="payroll-setup-count">{auditPackArtifacts.length} pack</span>
                </div>
                <div className="payroll-handoff-filing-grid">
                  {auditPackArtifacts.map((artifact) => (
                    <Link
                      className={`payroll-handoff-filing-card payroll-handoff-audit-pack-card ${selectedArtifact?.id === artifact.id ? "is-selected" : ""}`}
                      href={`/hr-admin/payroll-handoff?handoffId=${selectedHandoff?.id ?? ""}&artifactId=${artifact.id}`}
                      key={artifact.id}
                    >
                      <div className="payroll-delivery-card-heading">
                        <strong>{artifact.title}</strong>
                        <StatusBadge status={artifact.status} />
                      </div>
                      <span>{String(artifact.totals_snapshot.delivery_count ?? 0)} deliveries / {String(artifact.totals_snapshot.provider_job_count ?? 0)} jobs</span>
                      <code>{artifact.output_profile_ref}</code>
                      <div className="payroll-input-run-card__counts">
                        <span>hash {String(artifact.totals_snapshot.evidence_checksum_sha256 ?? artifact.checksum_sha256).slice(0, 12)}</span>
                        <span>{artifact.retention_policy_ref}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

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
                    {pagedArtifacts.map((artifact) => (
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
                        <td>{artifactValueLabel(artifact)}</td>
                        <td><StatusBadge status={artifact.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                firstHref={buildHref("/hr-admin/payroll-handoff", currentParams, { artifactPage: "1", artifactPageSize: String(artifactPageSize), artifactId: undefined, evidence: undefined, handoffId: selectedHandoff?.id })}
                hasNext={artifactPage < artifactTotalPages}
                hasPrevious={artifactPage > 1}
                lastHref={buildHref("/hr-admin/payroll-handoff", currentParams, { artifactPage: String(artifactTotalPages), artifactPageSize: String(artifactPageSize), artifactId: undefined, evidence: undefined, handoffId: selectedHandoff?.id })}
                nextHref={buildHref("/hr-admin/payroll-handoff", currentParams, { artifactPage: String(artifactPage + 1), artifactPageSize: String(artifactPageSize), artifactId: undefined, evidence: undefined, handoffId: selectedHandoff?.id })}
                page={artifactPage}
                pageSize={artifactPageSize}
                previousHref={buildHref("/hr-admin/payroll-handoff", currentParams, { artifactPage: String(artifactPage - 1), artifactPageSize: String(artifactPageSize), artifactId: undefined, evidence: undefined, handoffId: selectedHandoff?.id })}
                totalCount={visibleArtifacts.length}
              />
            </div>

            <DeliveryLedger
              deliveries={setup.deliveries}
              callbackEvents={setup.callback_events}
              providerJobs={setup.provider_jobs}
              retryEvents={setup.retry_events}
              selectedHandoff={selectedHandoff}
              selectedEvidence={selectedEvidence}
            />
          </div>

          {selectedEvidence ? (
            <AuditEvidenceDetail
              selection={selectedEvidence}
              selectedHandoff={selectedHandoff}
              deliveries={setup.deliveries}
              callbackEvents={setup.callback_events}
              providerJobs={setup.provider_jobs}
              retryEvents={setup.retry_events}
            />
          ) : (
            <ArtifactDetail artifact={selectedArtifact} delivery={selectedDelivery} retryEvents={setup.retry_events} />
          )}
        </div>
      </section>
    </main>
  );
}
