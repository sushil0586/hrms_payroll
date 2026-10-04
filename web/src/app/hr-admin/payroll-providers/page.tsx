import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollFinanceHandoffSetup, getHrAdminPayrollProviderConnectionSetup } from "@/lib/api";
import { PAYROLL_LIVE_RAILS_ENABLED } from "@/lib/runtime-flags";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import type {
  HrAdminPayrollFinanceHandoffSetupResponse,
  HrAdminPayrollProviderCertificationRun,
  HrAdminPayrollProviderAdapterRegistryEntry,
  HrAdminPayrollProviderCallbackEvent,
  HrAdminPayrollProviderClientRegistryEntry,
  HrAdminPayrollProviderConnection,
  HrAdminPayrollProviderDelivery,
  HrAdminPayrollProviderJob,
  HrAdminPayrollProviderLaunchRehearsal,
  HrAdminPayrollProviderPackageRegistryEntry,
  HrAdminPayrollProviderRetryEvent,
  HrAdminPayrollProviderSchemaMappingPack,
  HrAdminPayrollProviderSchemaMappingSimulation,
  HrAdminPayrollStoragePolicyRegistryEntry,
} from "@/lib/types";

import { ComplianceEvidenceStrip } from "../compliance-evidence-strip";
import { LaunchRehearsalActions } from "./launch-rehearsal-actions";
import { MappingPackLifecycleActions } from "./mapping-pack-lifecycle-actions";
import { MappingPackRuleBuilder } from "./mapping-pack-rule-builder";
import { ProviderCertificationActions } from "./provider-certification-actions";
import { ProviderConnectionActivationAction } from "./provider-connection-activation-action";
import { ProviderConnectionEditor } from "./provider-connection-editor";

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

type ProviderFailureBucket = {
  ref: string;
  label: string;
  severity: "ready" | "warning" | "blocked";
  count: number;
  retryable: number;
  owner: string;
  action: string;
};

type ProviderTab = "overview" | "connections" | "mapping" | "delivery" | "registry";
type ProviderLaneTone = "ready" | "warning" | "blocked";

type ProviderLaneStep = {
  ref: string;
  label: string;
  status: "done" | "open";
  detail: string;
  tab: ProviderTab;
};

type ProviderLanePlan = {
  tone: ProviderLaneTone;
  label: string;
  headline: string;
  nextAction: string;
  blockers: string[];
  steps: ProviderLaneStep[];
  canActivate: boolean;
};

const PROVIDER_TABS: Array<{ id: ProviderTab; label: string; helper: string }> = [
  { id: "overview", label: "Overview", helper: "Readiness and rehearsal" },
  { id: "connections", label: "Connections", helper: "Provider detail and certification" },
  { id: "mapping", label: "Mapping", helper: "Schema packs and simulations" },
  { id: "delivery", label: "Delivery", helper: "Callbacks, retries, failures" },
  { id: "registry", label: "Registry", helper: "Adapters, clients, storage" },
];

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeProviderTab(value: SearchParamValue): ProviderTab {
  const candidate = normalizeParam(value);
  return PROVIDER_TABS.some((tab) => tab.id === candidate) ? candidate as ProviderTab : "overview";
}

function providerHref(tab: ProviderTab, connectionId?: string | null) {
  const params = new URLSearchParams({ tab });
  if (connectionId) {
    params.set("connectionId", connectionId);
  }
  return `/hr-admin/payroll-providers?${params.toString()}`;
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

function LaunchRailGuard({
  connection,
  compact = false,
}: {
  connection?: HrAdminPayrollProviderConnection | null;
  compact?: boolean;
}) {
  const isProductionLike = Boolean(connection && (
    connection.environment_ref.toLowerCase().includes("prod") ||
    connection.adapter_ref.toLowerCase().includes("live_") ||
    connection.provider_ref.toLowerCase().includes("live")
  ));
  const modeLabel = PAYROLL_LIVE_RAILS_ENABLED ? "Live rails enabled" : "Live rails off";
  const tone = PAYROLL_LIVE_RAILS_ENABLED ? "ready" : isProductionLike ? "blocked" : "sandbox";
  const detail = PAYROLL_LIVE_RAILS_ENABLED
    ? "Provider live actions require certification evidence before use."
    : "Certification and rehearsal are allowed; real payout, filing, and journal submission stay disabled.";

  return (
    <div className={`launch-rail-guard launch-rail-guard--${tone} ${compact ? "launch-rail-guard--compact" : ""}`}>
      <span className="launch-rail-guard__dot" aria-hidden="true" />
      <strong>{modeLabel}</strong>
      <span>{detail}</span>
    </div>
  );
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

function providerLanePlan({
  connection,
  mappingPacks,
  simulationRuns,
}: {
  connection: HrAdminPayrollProviderConnection;
  mappingPacks: HrAdminPayrollProviderSchemaMappingPack[];
  simulationRuns: HrAdminPayrollProviderSchemaMappingSimulation[];
}): ProviderLanePlan {
  const gates = readinessGates(connection);
  const readiness = snapshotRecord(connection.readiness_snapshot);
  const config = snapshotRecord(connection.config_snapshot);
  const activeMappingPack = mappingPacks.find((pack) => pack.status === "active") ?? null;
  const latestMappingPack = mappingPacks[0] ?? null;
  const latestSimulation = simulationRuns[0] ?? null;
  const activeAllowed = Boolean(readiness.active_allowed);
  const isPlaceholder = config.placeholder === true || connection.provider_ref.includes("placeholder");
  const liveDeliveryDisabled = config.live_delivery_enabled === false;
  const runtimeGateRefs = new Set([
    "adapter_configured",
    "channel_configured",
    "credential_reference_configured",
    "callback_contract_configured",
    "retry_policy_configured",
  ]);
  const missingRuntimeGates = gates.filter((gate) => runtimeGateRefs.has(gate.ref) && !gate.passed);
  const certificationPassed = connection.certification_status === "passed";
  const mappingReady = Boolean(activeMappingPack);
  const simulationBlocked = latestSimulation?.status === "blocked";
  const blockers = [
    isPlaceholder ? "Provider placeholder is still selected" : "",
    liveDeliveryDisabled ? "Live delivery is disabled in provider config" : "",
    ...missingRuntimeGates.map((gate) => gate.label),
    mappingReady ? "" : "No active schema mapping pack",
    simulationBlocked ? "Latest mapping simulation is blocked" : "",
    certificationPassed ? "" : "Certification is not passed",
  ].filter(Boolean);

  const steps: ProviderLaneStep[] = [
    {
      ref: "provider_runtime",
      label: "Runtime route",
      status: !isPlaceholder && !liveDeliveryDisabled && missingRuntimeGates.length === 0 ? "done" : "open",
      detail: missingRuntimeGates.length
        ? missingRuntimeGates.map((gate) => gate.label).join(", ")
        : isPlaceholder
          ? "Replace seeded placeholder with a real provider route."
          : liveDeliveryDisabled
            ? "Enable live delivery after provider credentials and contract are approved."
            : "Adapter, channel, callback, retry policy, and credential reference are configured.",
      tab: "registry",
    },
    {
      ref: "schema_mapping",
      label: "Schema mapping",
      status: mappingReady && !simulationBlocked ? "done" : "open",
      detail: activeMappingPack
        ? `${activeMappingPack.mapping_profile_ref} v${activeMappingPack.version} is active.`
        : latestMappingPack
          ? `${latestMappingPack.mapping_profile_ref} v${latestMappingPack.version} is ${latestMappingPack.status_label.toLowerCase()}.`
          : "Create or activate a mapping pack for this provider artifact.",
      tab: "mapping",
    },
    {
      ref: "sandbox_certification",
      label: "Sandbox certification",
      status: certificationPassed ? "done" : "open",
      detail: certificationPassed
        ? `${connection.certification_status_label} using ${connection.certification_profile_ref}.`
        : "Run certification after runtime route and mapping are ready.",
      tab: "connections",
    },
    {
      ref: "activation",
      label: "Activation",
      status: connection.status === "active" ? "done" : "open",
      detail: connection.status === "active"
        ? "Connection is active for governed handoff routes."
        : activeAllowed && mappingReady
          ? "Ready for platform approval to activate this provider lane."
          : "Activation is blocked until all launch gates pass.",
      tab: "connections",
    },
  ];

  if (connection.status === "active") {
    return {
      tone: "ready",
      label: "Active",
      headline: "Active provider lane",
      nextAction: "Monitor callbacks, retries, and finance handoff evidence.",
      blockers: [],
      steps,
      canActivate: false,
    };
  }
  if (isPlaceholder || liveDeliveryDisabled) {
    return {
      tone: "blocked",
      label: "Placeholder",
      headline: "Replace provider placeholder",
      nextAction: "Configure the real provider route, credential reference, and live delivery flag before certification.",
      blockers,
      steps,
      canActivate: false,
    };
  }
  if (missingRuntimeGates.length) {
    return {
      tone: "blocked",
      label: "Config needed",
      headline: "Complete runtime configuration",
      nextAction: `Fix ${missingRuntimeGates[0].label.toLowerCase()} first.`,
      blockers,
      steps,
      canActivate: false,
    };
  }
  if (!mappingReady || simulationBlocked) {
    return {
      tone: "warning",
      label: "Mapping needed",
      headline: "Activate mapping coverage",
      nextAction: "Review simulation output and activate the mapping pack for this provider lane.",
      blockers,
      steps,
      canActivate: false,
    };
  }
  if (!certificationPassed) {
    return {
      tone: "warning",
      label: "Certify",
      headline: "Ready for sandbox certification",
      nextAction: "Run certification and review scenario evidence.",
      blockers,
      steps,
      canActivate: false,
    };
  }
  if (activeAllowed) {
    return {
      tone: "ready",
      label: "Activate",
      headline: "Certified, pending activation",
      nextAction: "Activate after platform approval and live-rail window confirmation.",
      blockers,
      steps,
      canActivate: true,
    };
  }
  return {
    tone: "warning",
    label: "Review",
    headline: "Review provider readiness",
    nextAction: "Inspect readiness gates and certification evidence.",
    blockers,
    steps,
    canActivate: false,
  };
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

function providerFailureBuckets({
  deliveries,
  callbackEvents,
  retryEvents,
  providerJobs,
}: {
  deliveries: HrAdminPayrollProviderDelivery[];
  callbackEvents: HrAdminPayrollProviderCallbackEvent[];
  retryEvents: HrAdminPayrollProviderRetryEvent[];
  providerJobs: HrAdminPayrollProviderJob[];
}): ProviderFailureBucket[] {
  const failedDeliveries = deliveries.filter((item) => ["failed", "rejected"].includes(item.status));
  const rejectedCallbacks = callbackEvents.filter((item) => item.status === "rejected");
  const pendingCallbacks = callbackEvents.filter((item) => ["received", "pending"].includes(item.status));
  const scheduledRetries = retryEvents.filter((item) => item.status === "scheduled");
  const deadLetteredRetries = retryEvents.filter((item) => item.status === "dead_lettered");
  const queuedJobs = providerJobs.filter((item) => item.status === "queued");
  const deadLetteredJobs = providerJobs.filter((item) => item.status === "dead_lettered");
  const staleJobs = providerJobs.filter((item) => ["leased", "running"].includes(item.status) && item.leased_until && new Date(item.leased_until).getTime() <= Date.now());

  return [
    {
      ref: "provider.delivery.failure",
      label: "Delivery failures",
      severity: failedDeliveries.length ? "blocked" : "ready",
      count: failedDeliveries.length,
      retryable: failedDeliveries.filter((item) => item.retry_policy_ref).length,
      owner: "Payroll operations",
      action: "Review provider response and schedule retry from finance handoff.",
    },
    {
      ref: "provider.callback.rejected",
      label: "Callback rejections",
      severity: rejectedCallbacks.length ? "blocked" : pendingCallbacks.length ? "warning" : "ready",
      count: rejectedCallbacks.length + pendingCallbacks.length,
      retryable: pendingCallbacks.length,
      owner: "Integration owner",
      action: "Check signature, idempotency, and provider status mapping before accepting callbacks.",
    },
    {
      ref: "provider.retry.queue",
      label: "Retry queue",
      severity: deadLetteredRetries.length ? "blocked" : scheduledRetries.length ? "warning" : "ready",
      count: scheduledRetries.length + deadLetteredRetries.length,
      retryable: scheduledRetries.length,
      owner: "Payroll operations",
      action: "Execute scheduled retries and investigate dead-lettered retry decisions.",
    },
    {
      ref: "provider.job.worker",
      label: "Worker jobs",
      severity: deadLetteredJobs.length || staleJobs.length ? "blocked" : queuedJobs.length ? "warning" : "ready",
      count: queuedJobs.length + deadLetteredJobs.length + staleJobs.length,
      retryable: queuedJobs.length,
      owner: "Platform operations",
      action: "Recover stale jobs, requeue failed work, and confirm worker heartbeat.",
    },
  ];
}

function selectedProviderEvents({
  providerRef,
  deliveries,
  callbackEvents,
  retryEvents,
  providerJobs,
}: {
  providerRef?: string;
  deliveries: HrAdminPayrollProviderDelivery[];
  callbackEvents: HrAdminPayrollProviderCallbackEvent[];
  retryEvents: HrAdminPayrollProviderRetryEvent[];
  providerJobs: HrAdminPayrollProviderJob[];
}) {
  if (!providerRef) {
    return { deliveries: [], callbackEvents: [], retryEvents: [], providerJobs: [] };
  }
  const selectedDeliveries = deliveries.filter((item) => item.provider_ref === providerRef);
  const selectedDeliveryIds = new Set(selectedDeliveries.map((item) => item.id));

  return {
    deliveries: selectedDeliveries,
    callbackEvents: callbackEvents.filter((item) => item.provider_ref === providerRef || selectedDeliveryIds.has(item.provider_delivery_id)),
    retryEvents: retryEvents.filter((item) => selectedDeliveryIds.has(item.provider_delivery_id)),
    providerJobs: providerJobs.filter((item) => item.provider_ref === providerRef || (item.provider_delivery_id ? selectedDeliveryIds.has(item.provider_delivery_id) : false)),
  };
}

function ProviderRail({
  connections,
  mappingPacks,
  simulationRuns,
  selectedConnection,
  activeTab,
}: {
  connections: HrAdminPayrollProviderConnection[];
  mappingPacks: HrAdminPayrollProviderSchemaMappingPack[];
  simulationRuns: HrAdminPayrollProviderSchemaMappingSimulation[];
  selectedConnection: HrAdminPayrollProviderConnection | null;
  activeTab: ProviderTab;
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
          const lanePlan = providerLanePlan({
            connection,
            mappingPacks: mappingPacks.filter((item) => item.provider_connection_id === connection.id || item.provider_ref === connection.provider_ref),
            simulationRuns: simulationRuns.filter((item) => item.provider_connection_id === connection.id || item.provider_ref === connection.provider_ref),
          });
          return (
            <Link
              className={`payroll-setup-mini-card payroll-provider-card ${selectedConnection?.id === connection.id ? "is-selected" : ""}`}
              href={providerHref(activeTab, connection.id)}
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
              <div className={`payroll-provider-card-next payroll-provider-card-next--${lanePlan.tone}`}>
                <strong>{lanePlan.label}</strong>
                <span>{lanePlan.nextAction}</span>
              </div>
              <code>{connection.provider_ref}</code>
            </Link>
          );
        })}
        {connections.length === 0 ? (
          <div className="empty-state">No provider connections are configured yet. Add bank, accounting, or statutory provider routes before certifying launch readiness.</div>
        ) : null}
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
        <LaunchRailGuard connection={connection} compact />
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
          {gates.length === 0 ? (
            <div className="empty-state">No readiness gates are recorded for this provider connection yet.</div>
          ) : null}
        </div>
      </section>
    </aside>
  );
}

export default async function PayrollProvidersPage({ searchParams }: PageProps) {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });
  const params = await searchParams;
  const selectedConnectionId = normalizeParam(params?.connectionId);
  const activeTab = normalizeProviderTab(params?.tab);
  const [result, handoffResult] = await Promise.all([
    getHrAdminPayrollProviderConnectionSetup(),
    getHrAdminPayrollFinanceHandoffSetup(),
  ]);
  const setup = result.data;
  const handoffSetup: HrAdminPayrollFinanceHandoffSetupResponse = handoffResult.data;
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
  const selectedLanePlan = selectedConnection
    ? providerLanePlan({
        connection: selectedConnection,
        mappingPacks: selectedMappingPacks,
        simulationRuns: selectedSimulationRuns,
      })
    : null;
  const selectedActiveMappingPack = selectedMappingPacks.find((pack) => pack.status === "active") ?? null;
  const selectedDraftMappingPack = selectedMappingPacks.find((pack) => pack.status === "draft") ?? null;
  const selectedLatestMappingPack = selectedActiveMappingPack ?? selectedDraftMappingPack ?? selectedMappingPacks[0] ?? null;
  const selectedLatestSimulation = selectedSimulationRuns[0] ?? null;
  const selectedEvents = selectedProviderEvents({
    providerRef: selectedConnection?.provider_ref,
    deliveries: handoffSetup.deliveries,
    callbackEvents: handoffSetup.callback_events,
    retryEvents: handoffSetup.retry_events,
    providerJobs: handoffSetup.provider_jobs,
  });
  const failureBuckets = providerFailureBuckets({
    deliveries: handoffSetup.deliveries,
    callbackEvents: handoffSetup.callback_events,
    retryEvents: handoffSetup.retry_events,
    providerJobs: handoffSetup.provider_jobs,
  });
  const blockedFailureBucketCount = failureBuckets.filter((bucket) => bucket.severity === "blocked").length;
  const warningFailureBucketCount = failureBuckets.filter((bucket) => bucket.severity === "warning").length;

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
            <Link className="button button--secondary" href="/api/hr-admin/payroll-provider-certification-evidence" prefetch={false}>
              Export evidence
            </Link>
            <Link className="button button--ghost" href="/api/hr-admin/payroll-provider-certification-evidence?format=manifest" prefetch={false}>
              Evidence manifest
            </Link>
          </>
        }
        pills={["Bank", "Accounting", "Statutory"]}
        showPills
      />

      <ComplianceEvidenceStrip
        current="providers"
        eyebrow="Provider governance"
        title="Provider certification and live-rail control"
        description="Review provider readiness, certification evidence, mapping packs, callbacks, retries, launch rehearsals, and blocked live-rail gates before handoff uses any connection."
        metrics={[
          { label: "connections", value: setup.summary.connection_count, tone: "neutral" },
          { label: "certified", value: setup.summary.certified_connection_count, tone: "ready" },
          { label: "blocked", value: setup.summary.blocked_connection_count, tone: setup.summary.blocked_connection_count ? "blocked" : "ready" },
          { label: "failure buckets", value: blockedFailureBucketCount, tone: blockedFailureBucketCount ? "blocked" : warningFailureBucketCount ? "warning" : "ready" },
        ]}
      />

      <section className="section section--tight">
        <LaunchRailGuard connection={selectedConnection} />
      </section>

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
          <MetricTile className="metric-tile-soft" label="Failure taxonomy" value={blockedFailureBucketCount} trend={`${warningFailureBucketCount} watch`} />
          <MetricTile className="metric-tile-soft" label="Callback/retry" value={(handoffSetup.summary.provider_callback_event_count ?? 0) + (handoffSetup.summary.provider_retry_event_count ?? 0)} trend={`${handoffSetup.summary.dead_lettered_provider_retry_event_count ?? 0} dead-lettered`} />
        </div>
      </section>

      <section className="section section--tight">
        <nav className="payroll-setup-tabs" aria-label="Payroll provider sections">
          {PROVIDER_TABS.map((tab) => (
            <Link
              className={`payroll-setup-tab ${activeTab === tab.id ? "payroll-setup-tab--active" : ""}`}
              href={providerHref(tab.id, selectedConnection?.id)}
              key={tab.id}
            >
              <strong>{tab.label}</strong>
              <span>{tab.helper}</span>
            </Link>
          ))}
        </nav>
      </section>

      <section className="section section--tight">
        <div className="payroll-setup-workspace payroll-provider-workspace">
          <ProviderRail
            connections={setup.connections}
            mappingPacks={setup.schema_mapping_packs}
            simulationRuns={setup.schema_mapping_simulations}
            selectedConnection={selectedConnection}
            activeTab={activeTab}
          />

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

            {selectedLanePlan ? (
              <section className={`payroll-setup-assignment-panel payroll-provider-lane-plan payroll-provider-lane-plan--${selectedLanePlan.tone}`}>
                <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                  <div>
                    <span className="workspace-card__eyebrow">Selected lane plan</span>
                    <h2>{selectedLanePlan.headline}</h2>
                    <p className="section-copy section-copy-soft">{selectedLanePlan.nextAction}</p>
                  </div>
                  <div className="payroll-provider-lane-actions">
                    {selectedConnection ? (
                      <ProviderConnectionEditor
                        connection={selectedConnection}
                        providerKinds={setup.options.provider_kinds}
                        connectionStatuses={setup.options.connection_statuses}
                      />
                    ) : null}
                    {selectedConnection && selectedLanePlan.canActivate ? (
                      <ProviderConnectionActivationAction connectionId={selectedConnection.id} />
                    ) : null}
                    {selectedConnection ? (
                      <Link className="button button--secondary" href={providerHref("mapping", selectedConnection.id)}>
                        Review mapping
                      </Link>
                    ) : null}
                    <StatusBadge status={selectedLanePlan.tone} label={selectedLanePlan.label} />
                  </div>
                </div>
                <div className="payroll-provider-lane-step-grid">
                  {selectedLanePlan.steps.map((step) => (
                    <Link
                      className={`payroll-provider-lane-step payroll-provider-lane-step--${step.status}`}
                      href={providerHref(step.tab, selectedConnection?.id)}
                      key={step.ref}
                    >
                      <div>
                        <strong>{step.label}</strong>
                        <span>{step.detail}</span>
                      </div>
                      <StatusBadge status={step.status === "done" ? "passed" : selectedLanePlan.tone} label={step.status === "done" ? "Done" : "Open"} />
                    </Link>
                  ))}
                </div>
                <div className="payroll-provider-lane-mapping-summary">
                  <div>
                    <span className="workspace-card__eyebrow">Mapping coverage</span>
                    <strong>
                      {selectedActiveMappingPack
                        ? `Active v${selectedActiveMappingPack.version}`
                        : selectedDraftMappingPack
                          ? `Draft v${selectedDraftMappingPack.version}`
                          : "Missing mapping pack"}
                    </strong>
                    <span>
                      {selectedLatestMappingPack
                        ? `${selectedLatestMappingPack.mapping_profile_ref} / ${selectedLatestMappingPack.artifact_kind_label}`
                        : "Create or import a mapping pack before provider activation."}
                    </span>
                  </div>
                  <div>
                    <span className="workspace-card__eyebrow">Latest simulation</span>
                    <strong>
                      {selectedLatestSimulation
                        ? `${selectedLatestSimulation.status_label} / ${titleCase(selectedLatestSimulation.comparison_status)}`
                        : "Not simulated"}
                    </strong>
                    <span>
                      {selectedLatestSimulation
                        ? `${selectedLatestSimulation.passed_gate_count}/${selectedLatestSimulation.gate_count} gates, ${selectedLatestSimulation.changed_path_count} changed paths`
                        : "Run simulation from the mapping workspace when a draft changes."}
                    </span>
                  </div>
                  <Link className="button button--secondary" href={providerHref("mapping", selectedConnection?.id)}>
                    Open mapping
                  </Link>
                </div>
                {selectedLanePlan.blockers.length ? (
                  <div className="payroll-provider-lane-blockers">
                    <span className="workspace-card__eyebrow">Open blockers</span>
                    <div>
                      {selectedLanePlan.blockers.slice(0, 5).map((blocker) => (
                        <span className="record-chip" key={blocker}>{blocker}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {activeTab === "overview" ? (
              <>
            <section className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Production dry run</span>
                  <h2>Launch rehearsal</h2>
                  <p className="section-copy section-copy-soft">{String(launchRehearsal.rehearsal_profile_ref ?? "payroll.provider_launch_rehearsal.v1")}</p>
                </div>
                <div className="payroll-provider-launch-actions">
                  <LaunchRailGuard connection={selectedConnection} compact />
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
                {selectedGates.length === 0 ? (
                  <div className="empty-state">No certification gates are available for the selected provider.</div>
                ) : null}
              </div>
            </section>
              </>
            ) : null}

            {activeTab === "delivery" ? (
            <section className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Failure taxonomy</span>
                  <h2>Callback, retry, and revoke certification</h2>
                  <p className="section-copy section-copy-soft">Classify provider failures before live rails are enabled; destructive recovery actions stay guarded by backend permission and state checks.</p>
                </div>
                <span className="payroll-setup-count">{blockedFailureBucketCount} blocked / {warningFailureBucketCount} watch</span>
              </div>
              <div className="payroll-provider-gate-grid payroll-provider-failure-grid">
                {failureBuckets.map((bucket) => (
                  <article className={`payroll-provider-gate-card is-${bucket.severity}`} key={bucket.ref}>
                    <div className="payroll-delivery-card-heading">
                      <strong>{bucket.label}</strong>
                      <StatusBadge status={bucket.severity} label={bucket.severity === "ready" ? "Clear" : titleCase(bucket.severity)} />
                    </div>
                    <span>{bucket.count} open signals / {bucket.retryable} retryable</span>
                    <span>{bucket.owner}</span>
                    <code>{bucket.ref}</code>
                    <p className="section-copy section-copy-soft">{bucket.action}</p>
                  </article>
                ))}
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-provider-run-table">
                  <thead>
                    <tr>
                      <th>Evidence type</th>
                      <th>Selected provider</th>
                      <th>Status</th>
                      <th>Failure/ref</th>
                      <th>Guarded action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEvents.deliveries.slice(0, 5).map((delivery) => (
                      <tr key={`delivery-${delivery.id}`}>
                        <td><strong>Delivery</strong><span>{delivery.output_artifact_title}</span></td>
                        <td><code>{delivery.provider_ref}</code></td>
                        <td><StatusBadge status={delivery.status} label={delivery.status_label} /></td>
                        <td><span>{delivery.failure_code || "failure.none"}</span><span>{delivery.failure_reason || delivery.external_reference || "No provider failure recorded"}</span></td>
                        <td><span className="record-chip">Retry/requeue API guarded</span></td>
                      </tr>
                    ))}
                    {selectedEvents.callbackEvents.slice(0, 5).map((event) => (
                      <tr key={`callback-${event.id}`}>
                        <td><strong>Callback</strong><span>{event.external_event_id || event.idempotency_key}</span></td>
                        <td><code>{event.provider_ref}</code></td>
                        <td><StatusBadge status={event.status} label={event.status_label} /></td>
                        <td><span>{event.failure_code || event.provider_status}</span><span>{event.failure_reason || event.callback_verification_ref}</span></td>
                        <td><span className="record-chip">Signature/idempotency guarded</span></td>
                      </tr>
                    ))}
                    {selectedEvents.retryEvents.slice(0, 5).map((event) => (
                      <tr key={`retry-${event.id}`}>
                        <td><strong>Retry</strong><span>Attempt {event.attempt_number}</span></td>
                        <td><code>{event.failure_taxonomy_ref}</code></td>
                        <td><StatusBadge status={event.status} label={event.status_label} /></td>
                        <td><span>{event.failure_category_ref || event.failure_code || "retry.none"}</span><span>{event.retry_reason || event.failure_reason || "No retry reason recorded"}</span></td>
                        <td><span className="record-chip">Backoff/dead-letter guarded</span></td>
                      </tr>
                    ))}
                    {selectedEvents.providerJobs.slice(0, 5).map((job) => (
                      <tr key={`job-${job.id}`}>
                        <td><strong>Worker job</strong><span>{job.job_kind_label}</span></td>
                        <td><code>{job.provider_ref}</code></td>
                        <td><StatusBadge status={job.status} label={job.status_label} /></td>
                        <td><span>{job.failure_code || job.queue_policy_ref}</span><span>{job.failure_reason || `${job.attempt_count}/${job.max_attempts} attempts`}</span></td>
                        <td><span className="record-chip">Worker recovery guarded</span></td>
                      </tr>
                    ))}
                    {!selectedEvents.deliveries.length && !selectedEvents.callbackEvents.length && !selectedEvents.retryEvents.length && !selectedEvents.providerJobs.length ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="empty-state">No delivery, callback, retry, or worker-job evidence exists yet for the selected provider. Run a finance handoff or sandbox certification to generate provider event proof.</div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
            ) : null}

            {activeTab === "registry" ? (
              <>
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
              </>
            ) : null}

            {activeTab === "mapping" ? (
              <>
            <section className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Mapping packs</span>
                  <h2>Provider schema coverage</h2>
                </div>
                <span className="payroll-setup-count">{selectedMappingPacks.length} packs</span>
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-provider-run-table payroll-provider-mapping-table">
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
                    {!selectedMappingPacks.length ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="empty-state">No schema mapping packs are available for this provider yet.</div>
                        </td>
                      </tr>
                    ) : null}
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
              </>
            ) : null}

            {activeTab === "connections" ? (
              <>
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
                    {!selectedCertificationRuns.length ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="empty-state">No certification runs have been recorded for this provider yet.</div>
                        </td>
                      </tr>
                    ) : null}
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
                      <th>Next step</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {setup.connections.map((connection) => {
                      const lanePlan = providerLanePlan({
                        connection,
                        mappingPacks: setup.schema_mapping_packs.filter((item) => item.provider_connection_id === connection.id || item.provider_ref === connection.provider_ref),
                        simulationRuns: setup.schema_mapping_simulations.filter((item) => item.provider_connection_id === connection.id || item.provider_ref === connection.provider_ref),
                      });
                      const latestRun = setup.certification_runs.find((run) => run.provider_connection_id === connection.id);
                      return (
                        <tr className={selectedConnection?.id === connection.id ? "is-selected" : ""} key={connection.id}>
                          <td>
                            <Link href={providerHref("connections", connection.id)}>
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
                            {latestRun
                              ? <StatusBadge status={latestRun.status} label={latestRun.status_label} />
                              : "Pending"}
                          </td>
                          <td>
                            <Link className="payroll-provider-register-action" href={providerHref(lanePlan.steps.find((step) => step.status === "open")?.tab ?? "connections", connection.id)}>
                              <strong>{lanePlan.headline}</strong>
                              <span>{lanePlan.nextAction}</span>
                            </Link>
                          </td>
                          <td><StatusBadge status={connection.status} label={connection.status_label} /></td>
                        </tr>
                      );
                    })}
                    {!setup.connections.length ? (
                      <tr>
                        <td colSpan={8}>
                          <div className="empty-state">No provider connections are configured yet.</div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
              </>
            ) : null}
          </div>

          {activeTab === "connections" ? (
            <ConnectionDetail connection={selectedConnection} certificationRuns={selectedCertificationRuns} mappingPacks={selectedMappingPacks} simulationRuns={selectedSimulationRuns} />
          ) : null}
        </div>
      </section>
    </main>
  );
}
