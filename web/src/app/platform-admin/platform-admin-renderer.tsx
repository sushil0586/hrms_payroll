import { getPlatformPolicyPacks, getPlatformPublicLeads, getPlatformTenant, getPlatformTenantOnboarding, getPlatformTenants } from "@/lib/api";
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
  const [leadResult, tenantResult, policyPackResult] = await Promise.all([
    getPlatformPublicLeads(),
    getPlatformTenants(),
    getPlatformPolicyPacks(),
  ]);
  const selectedTenantId = resolveSelectedTenantId(params, tenantResult.data);
  const [selectedTenantResult, onboardingResult] = selectedTenantId
    ? await Promise.all([
        getPlatformTenant(selectedTenantId),
        getPlatformTenantOnboarding(selectedTenantId),
      ])
    : [null, null];

  return (
    <PlatformAdminConsole
      initialPanel={panel}
      leads={leadResult.data}
      onboarding={onboardingResult?.data ?? null}
      policyPacks={policyPackResult.data}
      selectedTenant={selectedTenantResult?.data ?? null}
      tenants={tenantResult.data}
    />
  );
}
