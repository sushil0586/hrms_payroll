import { getPlatformPolicyPacks, getPlatformPublicLeads, getPlatformSummary, getPlatformTenant, getPlatformTenantOnboarding, getPlatformTenants } from "@/lib/api";
import type { PlatformTenantListItem } from "@/lib/types";

import { PlatformAdminConsole } from "./platform-admin-console";

export type SearchParamValue = string | string[] | undefined;
export type PlatformPanel = "control" | "leads" | "tenants" | "onboarding" | "admins" | "policy-packs" | "events";

export function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveSelectedTenantId(params: Record<string, SearchParamValue>, tenants: PlatformTenantListItem[]) {
  const requested = normalizeParam(params.tenantId);
  if (requested && tenants.some((tenant) => tenant.id === requested)) {
    return requested;
  }
  return tenants[0]?.id ?? "";
}

export function resolvePanel(params: Record<string, SearchParamValue>) {
  const requested = normalizeParam(params.panel);
  if (["control", "leads", "tenants", "onboarding", "admins", "policy-packs", "events"].includes(requested ?? "")) {
    return requested as PlatformPanel;
  }
  return "control";
}

export async function renderPlatformAdminConsole(panel: PlatformPanel, params: Record<string, SearchParamValue> = {}) {
  const summaryResult = await getPlatformSummary();
  const requestedTenantId = normalizeParam(params.tenantId);
  const shouldLoadLeads = panel === "leads";
  const shouldLoadTenants = panel === "tenants";
  const shouldLoadPolicyPacks = panel === "policy-packs";
  const needsSelectedTenant = ["onboarding", "admins", "policy-packs", "events"].includes(panel);

  const [leadResult, tenantResult, policyPackResult] = await Promise.all([
    shouldLoadLeads ? getPlatformPublicLeads() : Promise.resolve({ data: summaryResult.data.lead_queue }),
    shouldLoadTenants ? getPlatformTenants() : Promise.resolve({ data: summaryResult.data.stale_onboarding_tenants }),
    shouldLoadPolicyPacks ? getPlatformPolicyPacks() : Promise.resolve({ data: [] }),
  ]);
  const selectedTenantSeed = summaryResult.data.first_tenant ? [summaryResult.data.first_tenant] : [];
  const selectedTenantId = resolveSelectedTenantId(params, [...tenantResult.data, ...selectedTenantSeed]);
  const shouldLoadSelectedTenant = Boolean(selectedTenantId && (needsSelectedTenant || requestedTenantId));
  const [selectedTenantResult, onboardingResult] = await Promise.all([
    shouldLoadSelectedTenant ? getPlatformTenant(selectedTenantId) : Promise.resolve(null),
    selectedTenantId && needsSelectedTenant ? getPlatformTenantOnboarding(selectedTenantId) : Promise.resolve(null),
  ]);

  return (
    <PlatformAdminConsole
      initialPanel={panel}
      leads={leadResult.data}
      onboarding={onboardingResult?.data ?? null}
      policyPacks={policyPackResult.data}
      selectedTenant={selectedTenantResult?.data ?? null}
      summary={summaryResult.data}
      tenants={tenantResult.data}
    />
  );
}
