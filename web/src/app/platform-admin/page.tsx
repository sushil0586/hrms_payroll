import { getPlatformPolicyPacks, getPlatformTenant, getPlatformTenantOnboarding, getPlatformTenants } from "@/lib/api";
import type { PlatformTenantListItem } from "@/lib/types";

import { PlatformAdminConsole } from "./platform-admin-console";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveSelectedTenantId(params: Record<string, SearchParamValue>, tenants: PlatformTenantListItem[]) {
  const requested = normalizeParam(params.tenantId);
  if (requested && tenants.some((tenant) => tenant.id === requested)) {
    return requested;
  }
  return tenants[0]?.id ?? "";
}

function resolvePanel(params: Record<string, SearchParamValue>) {
  const requested = normalizeParam(params.panel);
  if (["tenants", "onboarding", "admins", "policy-packs", "events"].includes(requested ?? "")) {
    return requested as "tenants" | "onboarding" | "admins" | "policy-packs" | "events";
  }
  return "tenants";
}

export default async function PlatformAdminPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const [tenantResult, policyPackResult] = await Promise.all([
    getPlatformTenants(),
    getPlatformPolicyPacks(),
  ]);
  const selectedTenantId = resolveSelectedTenantId(currentParams, tenantResult.data);
  const [selectedTenantResult, onboardingResult] = selectedTenantId
    ? await Promise.all([
        getPlatformTenant(selectedTenantId),
        getPlatformTenantOnboarding(selectedTenantId),
      ])
    : [null, null];

  return (
    <PlatformAdminConsole
      initialPanel={resolvePanel(currentParams)}
      onboarding={onboardingResult?.data ?? null}
      policyPacks={policyPackResult.data}
      selectedTenant={selectedTenantResult?.data ?? null}
      tenants={tenantResult.data}
    />
  );
}
