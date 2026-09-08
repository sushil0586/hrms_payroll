import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollProviderConnectionSetup } from "@/lib/api";
import type {
  HrAdminPayrollProviderCertificationRun,
  HrAdminPayrollProviderAdapterRegistryEntry,
  HrAdminPayrollProviderClientRegistryEntry,
  HrAdminPayrollProviderConnection,
  HrAdminPayrollProviderLaunchRehearsal,
  HrAdminPayrollProviderPackageRegistryEntry,
  HrAdminPayrollProviderSchemaMappingPack,
  HrAdminPayrollProviderSchemaMappingSimulation,
  HrAdminPayrollStoragePolicyRegistryEntry,
} from "@/lib/types";

import { LaunchRehearsalActions } from "./launch-rehearsal-actions";
import { MappingPackLifecycleActions } from "./mapping-pack-lifecycle-actions";
import { MappingPackRuleBuilder } from "./mapping-pack-rule-builder";
import { ProviderCertificationActions } from "./provider-certification-actions";

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

function scenarioResults(run: HrAdminPayrollProviderCertificationRun | null): Record<string, unknown>[] {
  const evidence = snapshotRecord(run?.evidence_snapshot);
  const results = evidence.scenario_results;
  return Array.isArray(results)
    ? results.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
}

function mappingLifecycleEntries(pack: HrAdminPayrollProviderSchemaMappingPack | null): Record<string, unknown>[] {
  const evidence = snapshotRecord(pack?.evidence_snapshot);
  const history = evidence.lifecycle_history;
  return Array.isArray(history)
    ? history.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
}

function mappingComparisonDiffs(run: HrAdminPayrollProviderSchemaMappingSimulation | null): Record<string, unknown>[] {
  const comparison = snapshotRecord(run?.comparison_snapshot);
  const diffs = comparison.diffs;
  return Array.isArray(diffs)
    ? diffs.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
}

function adapterRegistryRows(value: unknown): HrAdminPayrollProviderAdapterRegistryEntry[] {
  const registry = snapshotRecord(value);
  const adapters = registry.adapters;
  return Array.isArray(adapters)
    ? adapters.filter((item): item is HrAdminPayrollProviderAdapterRegistryEntry => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
}

function clientRegistryRows(value: unknown): HrAdminPayrollProviderClientRegistryEntry[] {
  const registry = snapshotRecord(value);
  const clients = registry.clients;
  return Array.isArray(clients)
    ? clients.filter((item): item is HrAdminPayrollProviderClientRegistryEntry => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
}

function packageRegistryRows(value: unknown): HrAdminPayrollProviderPackageRegistryEntry[] {
  const registry = snapshotRecord(value);
  const packages = registry.packages;
  return Array.isArray(packages)
    ? packages.filter((item): item is HrAdminPayrollProviderPackageRegistryEntry => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
}

function storagePolicyRegistryRows(value: unknown): HrAdminPayrollStoragePolicyRegistryEntry[] {
  const registry = snapshotRecord(value);
  const policies = registry.policies;
  return Array.isArray(policies)
    ? policies.filter((item): item is HrAdminPayrollStoragePolicyRegistryEntry => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
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

function ConnectionDetail({
  connection,
  certificationRuns,
  mappingPacks,
  simulationRuns,
}: {
  connection: HrAdminPayrollProviderConnection | null;
  certificationRuns: HrAdminPayrollProviderCertificationRun[];
  mappingPacks: HrAdminPayrollProviderSchemaMappingPack[];
  simulationRuns: HrAdminPayrollProviderSchemaMappingSimulation[];
}) {
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
  const providerRoute = snapshotRecord(connection.config_snapshot.provider_route);
  const adapterContract = snapshotRecord(providerRoute.adapter_contract);
  const latestRun = certificationRuns[0] ?? null;
  const latestMappingPack = mappingPacks[0] ?? null;
  const latestSimulation = simulationRuns[0] ?? null;
  const latestMappingLifecycle = mappingLifecycleEntries(latestMappingPack).slice(-3).reverse();
  const latestMappingDiffs = mappingComparisonDiffs(latestSimulation).slice(0, 4);
  const latestScenarioResults = scenarioResults(latestRun);
  const latestScenarioValidation = snapshotRecord(latestScenarioResults[0]?.adapter_contract_validation);
  const latestRequestValidation = snapshotRecord(latestScenarioValidation.request);
  const latestResultValidation = snapshotRecord(latestScenarioValidation.result);

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
        <ProviderCertificationActions connectionId={connection.id} disabled={!connection.sandbox_adapter_ref && !connection.adapter_ref} />
      </div>

      <section className="payroll-rule-source-card payroll-provider-run-card">
        <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
          <div>
            <span className="workspace-card__eyebrow">Latest run</span>
            <h2>{latestRun?.status_label ?? "No run"}</h2>
          </div>
          {latestRun ? <StatusBadge status={latestRun.status} label={`${latestRun.passed_count}/${latestRun.scenario_count}`} /> : null}
        </div>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Scenario profile</span><span className="detail-value">{latestRun?.scenario_profile_ref ?? "Pending"}</span></div>
          <div className="detail-row"><span className="detail-label">Executed</span><span className="detail-value">{formatDate(latestRun?.completed_at ?? null)} / {latestRun?.executed_by_name ?? "Pending"}</span></div>
          <div className="detail-row"><span className="detail-label">Source hash</span><span className="detail-value">{latestRun?.source_hash || "Pending"}</span></div>
        </div>
        <div className="payroll-provider-scenario-list">
          {latestScenarioResults.slice(0, 4).map((scenario) => (
            <article className="payroll-provider-scenario-row" key={String(scenario.scenario_ref ?? scenario.label)}>
              <div>
                <strong>{String(scenario.label ?? scenario.scenario_ref ?? "Scenario")}</strong>
                <span>{String(scenario.route_key ?? scenario.artifact_kind ?? "")}</span>
              </div>
              <StatusBadge status={String(scenario.status ?? "pending")} />
            </article>
          ))}
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Schema mapping</span>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Profile</span><span className="detail-value">{latestMappingPack?.mapping_profile_ref ?? "Mapping pending"}</span></div>
          <div className="detail-row"><span className="detail-label">Mode</span><span className="detail-value">{titleCase(latestMappingPack?.enforcement_mode ?? "warn")}</span></div>
          <div className="detail-row"><span className="detail-label">Source</span><span className="detail-value">{latestMappingPack?.source_schema_ref ?? "Pending"}</span></div>
          <div className="detail-row"><span className="detail-label">Target</span><span className="detail-value">{latestMappingPack?.target_schema_ref ?? "Pending"}</span></div>
          <div className="detail-row"><span className="detail-label">Rules</span><span className="detail-value">{latestMappingPack ? `${latestMappingPack.transform_rules.length} transforms / ${latestMappingPack.validation_rules.length} gates` : "Pending"}</span></div>
          <div className="detail-row"><span className="detail-label">Version</span><span className="detail-value">{latestMappingPack ? `v${latestMappingPack.version} / ${latestMappingPack.status_label}` : "Pending"}</span></div>
          <div className="detail-row"><span className="detail-label">Last action</span><span className="detail-value">{String(snapshotRecord(latestMappingPack?.evidence_snapshot).last_lifecycle_action ?? "Pending")}</span></div>
          <div className="detail-row"><span className="detail-label">Updated by</span><span className="detail-value">{latestMappingPack?.updated_by_name ?? "Pending"}</span></div>
        </div>
        {latestMappingPack ? (
          <div className="payroll-provider-mapping-toolbar">
            <MappingPackRuleBuilder pack={latestMappingPack} />
            <MappingPackLifecycleActions packId={latestMappingPack.id} status={latestMappingPack.status} />
          </div>
        ) : null}
        {latestSimulation ? (
          <div className="payroll-provider-simulation-summary">
            <div className="payroll-delivery-card-heading">
              <div>
                <span className="workspace-card__eyebrow">Latest simulation</span>
                <strong>{latestSimulation.status_label} / {titleCase(latestSimulation.comparison_status)}</strong>
              </div>
              <StatusBadge status={latestSimulation.status} label={`${latestSimulation.passed_gate_count}/${latestSimulation.gate_count}`} />
            </div>
            <div className="detail-grid">
              <div className="detail-row"><span className="detail-label">Comparison</span><span className="detail-value">{latestSimulation.comparison_profile_ref}</span></div>
              <div className="detail-row"><span className="detail-label">Candidate</span><span className="detail-value">v{latestSimulation.mapping_pack_version}</span></div>
              <div className="detail-row"><span className="detail-label">Baseline</span><span className="detail-value">{latestSimulation.baseline_mapping_pack_id ? `v${latestSimulation.baseline_mapping_pack_version}` : "No active baseline"}</span></div>
              <div className="detail-row"><span className="detail-label">Changes</span><span className="detail-value">{latestSimulation.changed_path_count} changed / {latestSimulation.added_path_count} added / {latestSimulation.removed_path_count} removed</span></div>
            </div>
            {latestMappingDiffs.length ? (
              <div className="payroll-provider-diff-list">
                {latestMappingDiffs.map((diff) => (
                  <article className="payroll-provider-diff-row" key={String(diff.path)}>
                    <div>
                      <strong>{String(diff.path)}</strong>
                      <span>{titleCase(String(diff.change_type ?? "changed"))}</span>
                    </div>
                    <code>{String(diff.candidate_value ?? diff.baseline_value ?? "")}</code>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="payroll-provider-lifecycle-list">
          {latestMappingLifecycle.map((entry) => (
            <article className="payroll-provider-lifecycle-row" key={`${String(entry.action ?? "action")}-${String(entry.recorded_at ?? "")}`}>
              <div>
                <strong>{titleCase(String(entry.action ?? "Lifecycle"))}</strong>
                <span>{String(entry.reason ?? "No reason recorded")}</span>
              </div>
              <span>{String(entry.actor_name ?? "System")}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Adapter contract</span>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Profile</span><span className="detail-value">{String(adapterContract.contract_profile_ref ?? "payroll.provider_contract.default.v1")}</span></div>
          <div className="detail-row"><span className="detail-label">Mode</span><span className="detail-value">{titleCase(String(adapterContract.enforcement_mode ?? "warn"))}</span></div>
          <div className="detail-row"><span className="detail-label">Expected adapter</span><span className="detail-value">{String(adapterContract.expected_adapter_ref ?? connection.adapter_ref)}</span></div>
          <div className="detail-row"><span className="detail-label">Latest request</span><span className="detail-value">{titleCase(String(latestRequestValidation.status ?? "pending"))}</span></div>
          <div className="detail-row"><span className="detail-label">Latest result</span><span className="detail-value">{titleCase(String(latestResultValidation.status ?? "pending"))}</span></div>
        </div>
      </section>

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
  const selectedCertificationRuns = selectedConnection
    ? setup.certification_runs.filter((item) => item.provider_connection_id === selectedConnection.id)
    : [];
  const selectedMappingPacks = selectedConnection
    ? setup.schema_mapping_packs.filter((item) => item.provider_connection_id === selectedConnection.id || item.provider_ref === selectedConnection.provider_ref)
        .sort((left, right) => right.version - left.version)
    : [];
  const selectedSimulationRuns = selectedConnection
    ? setup.schema_mapping_simulations.filter((item) => item.provider_connection_id === selectedConnection.id || item.provider_ref === selectedConnection.provider_ref)
    : [];
  const adapterRows = adapterRegistryRows(setup.adapter_registry);
  const clientRows = clientRegistryRows(setup.client_registry);
  const packageRows = packageRegistryRows(setup.package_registry);
  const storagePolicyRows = storagePolicyRegistryRows(setup.storage_policy_registry);
  const launchRehearsal = snapshotRecord(setup.launch_rehearsal);
  const launchLanes = Array.isArray(launchRehearsal.lanes)
    ? launchRehearsal.lanes.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
  const launchHistory = (setup.launch_rehearsals ?? []) as HrAdminPayrollProviderLaunchRehearsal[];
  const latestSelectedRun = selectedCertificationRuns[0] ?? null;
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
          <MetricTile className="metric-tile-soft" label="Cert runs" value={setup.summary.certification_run_count} trend={`${setup.summary.failed_certification_run_count} failed`} />
          <MetricTile className="metric-tile-soft" label="Mapping packs" value={setup.summary.schema_mapping_pack_count ?? 0} trend={`${setup.summary.draft_schema_mapping_pack_count ?? 0} draft / ${setup.summary.active_schema_mapping_pack_count ?? 0} active`} />
          <MetricTile className="metric-tile-soft" label="Simulations" value={setup.summary.schema_mapping_simulation_count ?? 0} trend={`${setup.summary.changed_schema_mapping_simulation_count ?? 0} changed`} />
          <MetricTile className="metric-tile-soft" label="Adapters" value={setup.summary.adapter_registry_count ?? adapterRows.length} trend={`${setup.summary.ready_adapter_registry_count ?? adapterRows.filter((item) => item.status === "ready").length} ready`} />
          <MetricTile className="metric-tile-soft" label="Live packs" value={setup.summary.production_pack_adapter_registry_count ?? 0} trend={`${setup.summary.configured_adapter_registry_count ?? 0} configured`} />
          <MetricTile className="metric-tile-soft" label="Clients" value={setup.summary.client_registry_count ?? clientRows.length} trend={`${setup.summary.ready_client_registry_count ?? clientRows.filter((item) => item.status === "ready").length} ready`} />
          <MetricTile className="metric-tile-soft" label="Fixtures" value={setup.summary.fixture_client_registry_count ?? 0} trend={`${setup.summary.configured_client_registry_count ?? 0} configured`} />
          <MetricTile className="metric-tile-soft" label="Packages" value={setup.summary.package_registry_count ?? packageRows.length} trend={`${setup.summary.ready_package_registry_count ?? packageRows.filter((item) => item.status === "ready").length} ready`} />
          <MetricTile className="metric-tile-soft" label="Storage policies" value={setup.summary.storage_policy_registry_count ?? storagePolicyRows.length} trend={`${setup.summary.blocked_storage_policy_registry_count ?? storagePolicyRows.filter((item) => item.status !== "ready").length} blocked`} />
          <MetricTile className="metric-tile-soft" label="Launch rehearsal" value={String(setup.summary.launch_rehearsal_ready_lane_count ?? launchRehearsal.ready_lane_count ?? 0)} trend={`${String(setup.summary.launch_rehearsal_blocker_count ?? launchRehearsal.launch_blocker_count ?? 0)} blockers`} />
          <MetricTile className="metric-tile-soft" label="Launch history" value={setup.summary.launch_rehearsal_run_count ?? launchHistory.length} trend={`${setup.summary.ready_launch_rehearsal_run_count ?? launchHistory.filter((item) => item.status === "ready").length} ready runs`} />
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
              <article>
                <span>Last run</span>
                <strong>{latestSelectedRun?.status_label ?? "Pending"}</strong>
              </article>
              <article>
                <span>Mapping</span>
                <strong>{selectedMappingPacks[0]?.status_label ?? "Pending"}</strong>
              </article>
              <article>
                <span>Simulation</span>
                <strong>{selectedSimulationRuns[0]?.comparison_status ? titleCase(selectedSimulationRuns[0].comparison_status) : "Pending"}</strong>
              </article>
            </div>

            <section className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Production dry run</span>
                  <h2>Launch rehearsal</h2>
                  <p className="section-copy section-copy-soft">{String(launchRehearsal.rehearsal_profile_ref ?? "payroll.provider_launch_rehearsal.v1")}</p>
                </div>
                <div className="payroll-provider-launch-actions">
                  <StatusBadge status={String(launchRehearsal.status ?? "blocked")} label={titleCase(String(launchRehearsal.status ?? "blocked"))} />
                  <LaunchRehearsalActions />
                </div>
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-provider-run-table">
                  <thead>
                    <tr>
                      <th>Lane</th>
                      <th>Status</th>
                      <th>Package</th>
                      <th>Client</th>
                      <th>Storage</th>
                      <th>Finance handoff gate</th>
                      <th>Blockers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {launchLanes.map((lane) => {
                      const blockers = Array.isArray(lane.blocking_gate_refs) ? lane.blocking_gate_refs : [];
                      const storageRefs = Array.isArray(lane.storage_policy_refs) ? lane.storage_policy_refs : [];
                      return (
                        <tr key={String(lane.provider_kind ?? "provider")}>
                          <td><strong>{titleCase(String(lane.provider_kind ?? "provider"))}</strong></td>
                          <td><StatusBadge status={String(lane.status ?? "blocked")} label={titleCase(String(lane.status ?? "blocked"))} /></td>
                          <td><code>{String(lane.package_ref ?? "") || "Missing"}</code></td>
                          <td><code>{String(lane.client_ref ?? "") || "Missing"}</code></td>
                          <td>{storageRefs.length ? `${storageRefs.length} policy refs` : "Missing"}</td>
                          <td>{titleCase(String(lane.provider_connection_enforcement ?? "warn"))}</td>
                          <td>{blockers.length ? blockers.map(String).join(", ") : "None"}</td>
                        </tr>
                      );
                    })}
                    {!launchLanes.length ? (
                      <tr>
                        <td colSpan={7}>No launch rehearsal lanes found.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="payroll-provider-launch-history">
                <div className="payroll-delivery-card-heading">
                  <div>
                    <span className="workspace-card__eyebrow">Audit history</span>
                    <strong>Recorded rehearsals</strong>
                    <code>{launchHistory[0]?.audit_pack_ref ?? "payroll.provider_launch_readiness.audit_pack.v1"}</code>
                  </div>
                  <span className="payroll-setup-count">{launchHistory.length} runs</span>
                </div>
                <div className="payroll-table-scroll">
                  <table className="payroll-readiness-table payroll-setup-table payroll-provider-run-table">
                    <thead>
                      <tr>
                        <th>Generated</th>
                        <th>Status</th>
                        <th>Lanes</th>
                        <th>Blockers</th>
                        <th>Checksum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {launchHistory.slice(0, 5).map((run) => (
                        <tr key={run.id}>
                          <td>{formatDate(run.generated_at)} / {run.generated_by_name ?? "System"}</td>
                          <td><StatusBadge status={run.status} label={run.status_label} /></td>
                          <td>{run.ready_lane_count} ready / {run.blocked_lane_count} blocked</td>
                          <td>{run.release_blocker_refs.length ? run.release_blocker_refs.slice(0, 3).join(", ") : "None"}</td>
                          <td><code>{run.evidence_checksum_sha256.slice(0, 16)}</code></td>
                        </tr>
                      ))}
                      {!launchHistory.length ? (
                        <tr>
                          <td colSpan={5}>No recorded launch rehearsals yet.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

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
                  <span className="workspace-card__eyebrow">Storage and IAM</span>
                  <h2>Artifact policy readiness</h2>
                </div>
                <span className="payroll-setup-count">{setup.summary.blocked_storage_policy_registry_count ?? 0} blocked</span>
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-provider-run-table">
                  <thead>
                    <tr>
                      <th>Policy</th>
                      <th>Status</th>
                      <th>Source</th>
                      <th>Scope</th>
                      <th>Runtime</th>
                      <th>Governance</th>
                      <th>Verification</th>
                      <th>Blockers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storagePolicyRows.slice(0, 8).map((policyRow) => {
                      const capabilities = snapshotRecord(policyRow.capabilities);
                      const policy = snapshotRecord(policyRow.policy);
                      const controlVerification = snapshotRecord(policyRow.control_verification);
                      const runtimeFlags = [
                        capabilities.requires_runtime_credentials ? "Runtime credentials" : "",
                        capabilities.requires_private_endpoint ? "Private endpoint" : "",
                        capabilities.requires_encryption_ref ? "KMS" : "",
                      ].filter(Boolean).join(", ");
                      const governanceFlags = [
                        capabilities.requires_lifecycle_policy ? "Lifecycle" : "",
                        capabilities.requires_malware_scan ? "Scan" : "",
                        capabilities.requires_durability_policy ? "Durability" : "",
                      ].filter(Boolean).join(", ");
                      return (
                        <tr key={policyRow.storage_policy_ref}>
                          <td>
                            <strong>{policyRow.storage_policy_ref}</strong>
                            <span>{policyRow.required_by_package ? "Required by provider package" : "Available policy"}</span>
                          </td>
                          <td><StatusBadge status={policyRow.status} label={titleCase(policyRow.status)} /></td>
                          <td>{policyRow.source_ref}</td>
                          <td>
                            {String(capabilities.allowed_provider_family_count ?? 0)} families / {String(capabilities.allowed_credential_ref_count ?? 0)} credential refs
                          </td>
                          <td>{runtimeFlags || "Local/default"}</td>
                          <td>{governanceFlags || String(policy.retention_policy_ref ?? "Default retention")}</td>
                          <td>
                            {String(controlVerification.verified_control_count ?? 0)} verified / {String(controlVerification.blocked_control_count ?? 0)} blocked
                          </td>
                          <td>{policyRow.blocking_gate_refs.length ? policyRow.blocking_gate_refs.join(", ") : "None"}</td>
                        </tr>
                      );
                    })}
                    {!storagePolicyRows.length ? (
                      <tr>
                        <td colSpan={8}>No artifact storage policies found.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Package registry</span>
                  <h2>Provider package manifests</h2>
                </div>
                <span className="payroll-setup-count">{setup.summary.blocked_package_registry_count ?? 0} blocked</span>
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-provider-run-table">
                  <thead>
                    <tr>
                      <th>Package</th>
                      <th>Status</th>
                      <th>Source</th>
                      <th>Kind</th>
                      <th>Adapter</th>
                      <th>Client</th>
                      <th>Coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packageRows.slice(0, 12).map((providerPackage) => {
                      const capabilities = snapshotRecord(providerPackage.capabilities);
                      return (
                        <tr key={providerPackage.package_ref}>
                          <td>
                            <strong>{providerPackage.package_ref}</strong>
                            <span>{capabilities.is_fixture_package ? "Certification fixture package" : "Deployment package"}</span>
                          </td>
                          <td><StatusBadge status={providerPackage.status} label={titleCase(providerPackage.status)} /></td>
                          <td>{providerPackage.source_ref}</td>
                          <td>{String(capabilities.provider_kind ?? "provider")}</td>
                          <td><code>{String(capabilities.adapter_ref ?? "")}</code></td>
                          <td><code>{String(capabilities.client_ref ?? "")}</code></td>
                          <td>
                            {String(capabilities.certification_scenario_count ?? 0)} scenarios / {String(capabilities.required_route_config_count ?? 0)} config refs
                          </td>
                        </tr>
                      );
                    })}
                    {!packageRows.length ? (
                      <tr>
                        <td colSpan={7}>No provider package manifests found.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Client registry</span>
                  <h2>Provider client readiness</h2>
                </div>
                <span className="payroll-setup-count">{setup.summary.blocked_client_registry_count ?? 0} blocked</span>
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-provider-run-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Status</th>
                      <th>Source</th>
                      <th>Family</th>
                      <th>Mode</th>
                      <th>Methods</th>
                      <th>Blockers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientRows.slice(0, 12).map((client) => {
                      const capabilities = snapshotRecord(client.capabilities);
                      const methods = Array.isArray(capabilities.implemented_methods)
                        ? capabilities.implemented_methods.map((item) => String(item)).join(", ")
                        : "";
                      return (
                        <tr key={client.client_ref}>
                          <td>
                            <strong>{client.client_ref}</strong>
                            <span>{client.loader_ref || "Registered by deployment"}</span>
                          </td>
                          <td><StatusBadge status={client.status} label={titleCase(client.status)} /></td>
                          <td>{client.source_ref}</td>
                          <td>{String(capabilities.client_family ?? "provider")}</td>
                          <td>{capabilities.is_fixture_client ? "Certification fixture" : "Live client"}</td>
                          <td>{methods || "Pending"}</td>
                          <td>{client.blocking_gate_refs.length ? client.blocking_gate_refs.join(", ") : "None"}</td>
                        </tr>
                      );
                    })}
                    {!clientRows.length ? (
                      <tr>
                        <td colSpan={7}>No provider client registry entries found.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Adapter registry</span>
                  <h2>Live adapter readiness</h2>
                </div>
                <span className="payroll-setup-count">{setup.summary.blocked_adapter_registry_count ?? 0} blocked</span>
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-provider-run-table">
                  <thead>
                    <tr>
                      <th>Adapter</th>
                      <th>Status</th>
                      <th>Source</th>
                      <th>Family</th>
                      <th>Runtime</th>
                      <th>Blockers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adapterRows.slice(0, 12).map((adapter) => {
                      const capabilities = snapshotRecord(adapter.capabilities);
                      const runtime = capabilities.is_production_pack
                        ? "Production pack"
                        : capabilities.is_bank_live_payout
                          ? "Bank payout"
                          : capabilities.is_accounting_live_journal
                            ? "Accounting journal"
                            : capabilities.is_statutory_live_filing
                              ? "Statutory filing"
                              : capabilities.is_http_json
                                ? "HTTP JSON"
                                : capabilities.is_sandbox
                                  ? "Sandbox"
                                  : capabilities.is_manual
                                    ? "Manual"
                                    : "Custom";
                      return (
                        <tr key={adapter.adapter_ref}>
                          <td>
                            <strong>{adapter.adapter_ref}</strong>
                            <span>{adapter.loader_ref || "Registered by deployment"}</span>
                          </td>
                          <td><StatusBadge status={adapter.status} label={titleCase(adapter.status)} /></td>
                          <td>{adapter.source_ref}</td>
                          <td>{String(capabilities.adapter_family ?? "provider")}</td>
                          <td>{runtime}</td>
                          <td>{adapter.blocking_gate_refs.length ? adapter.blocking_gate_refs.join(", ") : "None"}</td>
                        </tr>
                      );
                    })}
                    {!adapterRows.length ? (
                      <tr>
                        <td colSpan={6}>No adapter registry entries found.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Mapping packs</span>
                  <h2>Provider schema coverage</h2>
                </div>
                <span className="payroll-setup-count">{selectedMappingPacks.length} packs</span>
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-provider-run-table">
                  <thead>
                    <tr>
                      <th>Pack</th>
                      <th>Status</th>
                      <th>Artifact</th>
                      <th>Target schema</th>
                      <th>Rules</th>
                      <th>Lifecycle</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMappingPacks.map((pack) => {
                      const lifecycle = mappingLifecycleEntries(pack);
                      const lastAction = snapshotRecord(pack.evidence_snapshot).last_lifecycle_action ?? lifecycle.at(-1)?.action ?? "Pending";
                      return (
                        <tr key={pack.id}>
                          <td>
                            <strong>{pack.mapping_profile_ref}</strong>
                            <span>{pack.source_schema_ref}</span>
                            <span>v{pack.version} / {pack.enforcement_mode}</span>
                          </td>
                          <td><StatusBadge status={pack.status} label={pack.status_label} /></td>
                          <td>{pack.artifact_kind_label}</td>
                          <td><code>{pack.target_schema_ref}</code></td>
                          <td>{pack.transform_rules.length} transforms / {pack.validation_rules.length} gates</td>
                          <td>
                            <strong>{titleCase(String(lastAction))}</strong>
                            <span>{pack.updated_by_name ?? pack.created_by_name ?? "System"}</span>
                          </td>
                          <td>
                            <div className="payroll-provider-mapping-toolbar">
                              <MappingPackRuleBuilder pack={pack} />
                              <MappingPackLifecycleActions packId={pack.id} status={pack.status} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Simulation ledger</span>
                  <h2>Active comparison evidence</h2>
                </div>
                <span className="payroll-setup-count">{selectedSimulationRuns.length} runs</span>
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-provider-run-table">
                  <thead>
                    <tr>
                      <th>Simulation</th>
                      <th>Status</th>
                      <th>Comparison</th>
                      <th>Gates</th>
                      <th>Diffs</th>
                      <th>Source hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSimulationRuns.map((run) => (
                      <tr key={run.id}>
                        <td>
                          <strong>{run.mapping_profile_ref}</strong>
                          <span>v{run.mapping_pack_version} vs {run.baseline_mapping_pack_id ? `v${run.baseline_mapping_pack_version}` : "no baseline"}</span>
                          <span>{formatDate(run.simulated_at)} / {run.simulated_by_name ?? "System"}</span>
                        </td>
                        <td><StatusBadge status={run.status} label={run.status_label} /></td>
                        <td><StatusBadge status={run.comparison_status} label={titleCase(run.comparison_status)} /></td>
                        <td>{run.passed_gate_count}/{run.gate_count} passed</td>
                        <td>{run.changed_path_count} changed / {run.added_path_count} added / {run.removed_path_count} removed</td>
                        <td><code>{run.source_hash}</code></td>
                      </tr>
                    ))}
                    {!selectedSimulationRuns.length ? (
                      <tr>
                        <td colSpan={6}>No simulations recorded.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Certification ledger</span>
                  <h2>Scenario evidence</h2>
                </div>
                <span className="payroll-setup-count">{selectedCertificationRuns.length} runs</span>
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-provider-run-table">
                  <thead>
                    <tr>
                      <th>Run</th>
                      <th>Status</th>
                      <th>Scenarios</th>
                      <th>Profile</th>
                      <th>Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCertificationRuns.map((run) => (
                      <tr key={run.id}>
                        <td>
                          <strong>{run.run_profile_ref}</strong>
                          <span>{run.source_hash}</span>
                        </td>
                        <td><StatusBadge status={run.status} label={run.status_label} /></td>
                        <td>{run.passed_count}/{run.scenario_count} passed</td>
                        <td><code>{run.scenario_profile_ref}</code></td>
                        <td>{formatDate(run.completed_at)} / {run.executed_by_name ?? "Pending"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                        <th>Latest run</th>
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
                        <td>
                          {setup.certification_runs.find((run) => run.provider_connection_id === connection.id)
                            ? <StatusBadge
                                status={setup.certification_runs.find((run) => run.provider_connection_id === connection.id)?.status ?? "pending"}
                                label={setup.certification_runs.find((run) => run.provider_connection_id === connection.id)?.status_label ?? "Pending"}
                              />
                            : "Pending"}
                        </td>
                        <td><StatusBadge status={connection.status} label={connection.status_label} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <ConnectionDetail connection={selectedConnection} certificationRuns={selectedCertificationRuns} mappingPacks={selectedMappingPacks} simulationRuns={selectedSimulationRuns} />
        </div>
      </section>
    </main>
  );
}
