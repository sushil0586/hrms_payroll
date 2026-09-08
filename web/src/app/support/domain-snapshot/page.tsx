import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getSupportSessionDomainSnapshot } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatValue(value: unknown) {
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-IN").format(value);
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "string") {
    return titleCase(value);
  }
  if (value === null || value === undefined) {
    return "Not set";
  }
  return String(value);
}

function numberFromRecord(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" ? value : 0;
}

function objectFromRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function statusBadgeClass(status: string) {
  if (status === "ready" || status === "active" || status === "ok" || status === "support_session_allowed") {
    return "readiness-badge readiness-badge--ready";
  }
  if (status === "warning" || status === "near_limit" || status === "requested" || status === "approved") {
    return "readiness-badge readiness-badge--warning";
  }
  return "readiness-badge readiness-badge--blocked";
}

export default async function SupportDomainSnapshotPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const tenantCode = normalizeParam(currentParams.tenant_code) || "northstar-foods";
  const domainRef = normalizeParam(currentParams.domain_ref) || "payroll_providers";
  const sessionRef = normalizeParam(currentParams.session_ref) || "support-session-demo-001";
  const result = await getSupportSessionDomainSnapshot({
    tenant_code: tenantCode,
    domain_ref: domainRef,
    session_ref: sessionRef,
  });
  const data = result.data;
  const actorLabel = data.support_session.actor_identifier.split("@")[0] || data.support_session.actor_identifier || "Unknown";
  const summary = objectFromRecord(data.snapshot, "summary");
  const primaryCount =
    numberFromRecord(summary, "provider_connection_count") ||
    numberFromRecord(summary, "output_batch_count") ||
    numberFromRecord(summary, "finance_handoff_count") ||
    numberFromRecord(summary, "pay_group_count") ||
    numberFromRecord(summary, "signal_count") ||
    numberFromRecord(summary, "check_count") ||
    numberFromRecord(summary, "active_membership_count");
  const statusCounts = [
    objectFromRecord(data.snapshot, "provider_job_status_counts"),
    objectFromRecord(data.snapshot, "artifact_status_counts"),
    objectFromRecord(data.snapshot, "finance_handoff_status_counts"),
    objectFromRecord(data.snapshot, "payroll_run_status_counts"),
  ].find((item) => Object.keys(item).length) || {};

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={result.state === "live" ? "Live support diagnostics" : "Demo support diagnostics"}
        title="Support Domain Snapshot"
        description="Read-only tenant diagnostics for approved, time-boxed support sessions."
        actions={
          <>
            <Link className="button button--secondary" href={`/support?tenant_code=${tenantCode}&session_ref=${sessionRef}`}>
              Session console
            </Link>
            <Link className="button button--primary" href="/tenant-admin">
              Tenant console
            </Link>
          </>
        }
        pills={[data.tenant.code, data.domain.scope_ref, titleCase(data.support_session.code)]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Session" value={data.support_session.allowed ? "Allowed" : "Denied"} trend={titleCase(data.support_session.required_scope_ref)} />
          <MetricTile label="Domain" value={data.domain.label} trend={data.domain.domain_ref} />
          <MetricTile label="Snapshot count" value={primaryCount.toString()} trend={data.domain.profile_source} />
          <MetricTile
            label="Agent"
            value={actorLabel}
            trend={data.support_session.session_ref}
            valueClassName="support-session-metric-value"
            trendClassName="support-session-metric-trend"
          />
        </div>
      </section>

      <section className="section support-session-grid">
        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Runtime enforcement</span>
              <h2>Scope-bound snapshot</h2>
            </div>
            <span className={statusBadgeClass(data.support_session.code)}>{titleCase(data.support_session.code)}</span>
          </div>
          <div className="tenant-console-list">
            <div className="tenant-console-row">
              <div>
                <strong>{data.domain.label}</strong>
                <span>{data.domain.description || data.domain.domain_ref}</span>
              </div>
              <span className="record-chip">{titleCase(data.domain.scope_ref)}</span>
            </div>
            <div className="support-session-scopes">
              {data.support_session.scope_refs.map((scope) => (
                <span className="record-chip" key={scope}>
                  {titleCase(scope)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Available domains</span>
              <h2>{data.available_domains.length} configured</h2>
            </div>
            <span className="record-chip">Read only</span>
          </div>
          <div className="support-session-scopes">
            {data.available_domains.map((domain) => (
              <Link
                className="record-chip"
                href={`/support/domain-snapshot?tenant_code=${tenantCode}&session_ref=${sessionRef}&domain_ref=${domain.domain_ref}`}
                key={domain.domain_ref}
              >
                {domain.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section support-session-grid">
        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Summary</span>
              <h2>{data.domain.label}</h2>
            </div>
            <span className="record-chip">{Object.keys(summary).length} fields</span>
          </div>
          <div className="tenant-console-detail-grid">
            {Object.entries(summary).slice(0, 8).map(([key, value]) => (
              <div className="detail-row" key={key}>
                <span>{titleCase(key)}</span>
                <strong>{formatValue(value)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Status counts</span>
              <h2>Operational mix</h2>
            </div>
            <span className="record-chip">{Object.keys(statusCounts).length} states</span>
          </div>
          <div className="tenant-console-list">
            {Object.entries(statusCounts).length ? (
              Object.entries(statusCounts).map(([key, value]) => (
                <div className="tenant-console-row" key={key}>
                  <div>
                    <strong>{titleCase(key)}</strong>
                    <span>{data.domain.domain_ref}</span>
                  </div>
                  <span className="record-chip">{formatValue(value)}</span>
                </div>
              ))
            ) : (
              <p className="tenant-console-empty">No status counts are available for this snapshot.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
