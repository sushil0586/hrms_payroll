import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollProviderConnectionSetup } from "@/lib/api";
import type { HrAdminPayrollProviderConnection } from "@/lib/types";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

type ReadinessGate = {
  ref: string;
  label: string;
  passed: boolean;
  value: string;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
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

function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={`readiness-badge readiness-badge--${status}`}>{label || titleCase(status)}</span>;
}

function readinessGates(connection: HrAdminPayrollProviderConnection): ReadinessGate[] {
  const rawGates = connection.readiness_snapshot.gates;
  if (!Array.isArray(rawGates)) {
    return [];
  }
  return rawGates
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    .map((item) => ({
      ref: String(item.ref ?? ""),
      label: String(item.label ?? item.ref ?? "Gate"),
      passed: Boolean(item.passed),
      value: String(item.value ?? ""),
    }));
}

function snapshotRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function ProviderRail({
  connections,
  selectedConnection,
}: {
  connections: HrAdminPayrollProviderConnection[];
  selectedConnection: HrAdminPayrollProviderConnection | null;
}) {
  return (
    <aside className="payroll-setup-rail payroll-provider-rail">
      <div className="payroll-setup-panel__header">
        <span className="workspace-card__eyebrow">Provider catalog</span>
        <h2>Connections</h2>
      </div>
      <div className="payroll-setup-card-list">
        {connections.map((connection) => {
          const gates = readinessGates(connection);
          return (
            <Link
              className={`payroll-setup-mini-card payroll-provider-card ${selectedConnection?.id === connection.id ? "is-selected" : ""}`}
              href={`/hr-admin/payroll-providers?connectionId=${connection.id}`}
              key={connection.id}
            >
              <div>
                <strong>{connection.provider_name}</strong>
                <span>{connection.provider_kind_label} / {connection.environment_ref}</span>
              </div>
              <StatusBadge status={connection.status} label={connection.status_label} />
              <div className="payroll-input-run-card__counts">
                <span>{gates.filter((gate) => gate.passed).length}/{gates.length || 6} gates</span>
                <span>{connection.certification_status_label}</span>
              </div>
              <code>{connection.provider_ref}</code>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

function ConnectionDetail({ connection }: { connection: HrAdminPayrollProviderConnection | null }) {
  if (!connection) {
    return (
      <aside className="payroll-setup-detail-panel payroll-provider-detail-panel">
        <div className="payroll-setup-panel__header">
          <span className="workspace-card__eyebrow">Connection detail</span>
          <h2>No provider selected</h2>
        </div>
      </aside>
    );
  }

  const gates = readinessGates(connection);
  const certification = snapshotRecord(connection.certification_snapshot);
  const evidence = snapshotRecord(certification.evidence_snapshot);

  return (
    <aside className="payroll-setup-detail-panel payroll-provider-detail-panel" aria-label={`${connection.provider_name} provider detail`}>
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Connection detail</span>
          <h2>{connection.provider_name}</h2>
          <p className="section-copy section-copy-soft">{connection.provider_kind_label} / {connection.environment_ref}</p>
        </div>
        <StatusBadge status={connection.status} label={connection.status_label} />
      </div>

      <div className="payroll-provider-cert-block">
        <span className="workspace-card__eyebrow">Certification</span>
        <strong>{connection.certification_status_label}</strong>
        <span>{connection.certification_profile_ref}</span>
        <span>{formatDate(connection.last_tested_at)} / {connection.last_tested_by_name ?? "Pending"}</span>
      </div>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Runtime refs</span>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Adapter</span><span className="detail-value">{connection.adapter_ref}</span></div>
          <div className="detail-row"><span className="detail-label">Sandbox</span><span className="detail-value">{connection.sandbox_adapter_ref}</span></div>
          <div className="detail-row"><span className="detail-label">Channel</span><span className="detail-value">{connection.channel_ref}</span></div>
          <div className="detail-row"><span className="detail-label">Retry</span><span className="detail-value">{connection.retry_policy_ref}</span></div>
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Credential boundary</span>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Required</span><span className="detail-value">{connection.credential_required ? "Yes" : "No"}</span></div>
          <div className="detail-row"><span className="detail-label">Credential</span><span className="detail-value">{connection.credential_ref || "Not required"}</span></div>
          <div className="detail-row"><span className="detail-label">Profile</span><span className="detail-value">{connection.credential_profile_ref || "Not required"}</span></div>
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Certification evidence</span>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Pack</span><span className="detail-value">{String(evidence.test_pack_ref ?? "Pending")}</span></div>
          <div className="detail-row"><span className="detail-label">Deliveries</span><span className="detail-value">{String(evidence.sandbox_delivery_count ?? 0)}</span></div>
          <div className="detail-row"><span className="detail-label">Callback</span><span className="detail-value">{evidence.callback_verified ? "Verified" : "Pending"}</span></div>
          <div className="detail-row"><span className="detail-label">Evidence hash</span><span className="detail-value">{String(certification.evidence_hash ?? "Pending")}</span></div>
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Gate detail</span>
        <div className="payroll-provider-gate-list">
          {gates.map((gate) => (
            <article className="payroll-provider-gate" key={gate.ref}>
              <div>
                <strong>{gate.label}</strong>
                <span>{gate.value}</span>
              </div>
              <StatusBadge status={gate.passed ? "passed" : "pending"} label={gate.passed ? "Passed" : "Pending"} />
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
}

export default async function PayrollProvidersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedConnectionId = normalizeParam(params?.connectionId);
  const result = await getHrAdminPayrollProviderConnectionSetup();
  const setup = result.data;
  const selectedConnection = setup.connections.find((item) => item.id === selectedConnectionId) ?? setup.connections[0] ?? null;
  const selectedGates = selectedConnection ? readinessGates(selectedConnection) : [];
  const selectedReadyCount = selectedGates.filter((gate) => gate.passed).length;

  return (
    <main className="shell shell--payroll-setup shell--payroll-providers">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll phase 5Q" : "Demo payroll phase 5Q"}
        title="Payroll Providers"
        description="Onboard, certify, and activate payroll provider connections before finance handoff uses them in production."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/payroll-handoff">
              Handoff
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-outputs">
              Outputs
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-statutory">
              Statutory
            </Link>
          </>
        }
        pills={["Bank", "Accounting", "Statutory"]}
        showPills
      />

      <section className="section section--tight">
        <div className="metric-grid-modern payroll-setup-metrics">
          <MetricTile className="metric-tile-soft" label="Connections" value={setup.summary.connection_count} trend={`${setup.summary.active_connection_count} active`} />
          <MetricTile className="metric-tile-soft" label="Certified" value={setup.summary.certified_connection_count} trend={`${setup.summary.active_allowed_count} launch ready`} />
          <MetricTile className="metric-tile-soft" label="Sandbox ready" value={setup.summary.sandbox_ready_connection_count} trend={`${setup.summary.blocked_connection_count} blocked`} />
          <MetricTile className="metric-tile-soft" label="Credential refs" value={setup.summary.credential_required_count} trend="No raw secrets" />
          <MetricTile className="metric-tile-soft" label="Bank lanes" value={setup.summary.bank_connection_count} trend="Payout providers" />
          <MetricTile className="metric-tile-soft" label="Statutory lanes" value={setup.summary.statutory_connection_count} trend="Return and challan" />
        </div>
      </section>

      <section className="section section--tight">
        <div className="payroll-setup-workspace payroll-provider-workspace">
          <ProviderRail connections={setup.connections} selectedConnection={selectedConnection} />

          <div className="payroll-setup-main-panel">
            <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
              <div>
                <span className="workspace-card__eyebrow">Launch control</span>
                <h2>{selectedConnection?.provider_name ?? "Provider connections"}</h2>
                <p className="section-copy section-copy-soft">{selectedConnection?.provider_ref ?? "No connection selected"}</p>
              </div>
              {selectedConnection ? <StatusBadge status={selectedConnection.status} label={selectedConnection.status_label} /> : null}
            </div>

            <div className="payroll-calc-total-grid payroll-provider-total-grid">
              <article>
                <span>Readiness</span>
                <strong>{selectedReadyCount}/{selectedGates.length || 6}</strong>
              </article>
              <article>
                <span>Certification</span>
                <strong>{selectedConnection?.certification_status_label ?? "Pending"}</strong>
              </article>
              <article>
                <span>Environment</span>
                <strong>{selectedConnection?.environment_ref ?? "sandbox"}</strong>
              </article>
              <article>
                <span>Credential</span>
                <strong>{selectedConnection?.credential_required ? "Required" : "Optional"}</strong>
              </article>
            </div>

            <section className="payroll-setup-assignment-panel payroll-provider-readiness-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Readiness gates</span>
                  <h2>Certification checklist</h2>
                </div>
                <span className="payroll-setup-count">{selectedReadyCount} passed</span>
              </div>
              <div className="payroll-provider-gate-grid">
                {selectedGates.map((gate) => (
                  <article className={`payroll-provider-gate-card ${gate.passed ? "is-passed" : "is-pending"}`} key={gate.ref}>
                    <div className="payroll-delivery-card-heading">
                      <strong>{gate.label}</strong>
                      <StatusBadge status={gate.passed ? "passed" : "pending"} label={gate.passed ? "Passed" : "Pending"} />
                    </div>
                    <span>{gate.value}</span>
                    <code>{gate.ref}</code>
                  </article>
                ))}
              </div>
            </section>

            <section className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Provider register</span>
                  <h2>Vertical coverage</h2>
                </div>
                <span className="payroll-setup-count">{setup.connections.length} providers</span>
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-provider-table">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Kind</th>
                      <th>Adapter</th>
                      <th>Credential</th>
                      <th>Certification</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {setup.connections.map((connection) => (
                      <tr className={selectedConnection?.id === connection.id ? "is-selected" : ""} key={connection.id}>
                        <td>
                          <Link href={`/hr-admin/payroll-providers?connectionId=${connection.id}`}>
                            <strong>{connection.provider_name}</strong>
                            <span>{connection.provider_ref}</span>
                            <span>{connection.channel_ref}</span>
                          </Link>
                        </td>
                        <td><StatusBadge status={connection.provider_kind} label={connection.provider_kind_label} /></td>
                        <td><code>{connection.adapter_ref}</code></td>
                        <td><code>{connection.credential_ref || "not_required"}</code></td>
                        <td><StatusBadge status={connection.certification_status} label={connection.certification_status_label} /></td>
                        <td><StatusBadge status={connection.status} label={connection.status_label} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <ConnectionDetail connection={selectedConnection} />
        </div>
      </section>
    </main>
  );
}
