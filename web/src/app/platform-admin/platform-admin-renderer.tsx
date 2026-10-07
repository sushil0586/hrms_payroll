import { getPlatformPolicyPacks, getPlatformPublicLeads, getPlatformSummary, getPlatformTenant, getPlatformTenantOnboarding, getPlatformTenants } from "@/lib/api";
import type { PlatformPolicyPackListItem, PlatformPublicLead, PlatformSummary, PlatformTenantListItem, PlatformTenantOnboarding } from "@/lib/types";

import { PlatformAdminConsole } from "./platform-admin-console";

export type SearchParamValue = string | string[] | undefined;
export type PlatformPanel = "control" | "leads" | "tenants" | "launch" | "onboarding" | "admins" | "policy-packs" | "events";

export function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveSelectedTenantId(params: Record<string, SearchParamValue>, tenants: PlatformTenantListItem[]) {
  const requested = normalizeParam(params.tenantId);
  if (requested) {
    return requested;
  }
  return tenants[0]?.id ?? "";
}

export function resolvePanel(params: Record<string, SearchParamValue>) {
  const requested = normalizeParam(params.panel);
  if (["control", "leads", "tenants", "launch", "onboarding", "admins", "policy-packs", "events"].includes(requested ?? "")) {
    return requested as PlatformPanel;
  }
  return "control";
}

function listData<Item>(value: Item[] | { items?: Item[] } | null | undefined): Item[] {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  return [];
}

const demoTenant = {
  id: "demo-platform-tenant",
  code: "northstar-foods",
  name: "Northstar Foods",
  legal_name: "Northstar Foods Pvt Ltd",
  primary_domain: "northstar.example",
  primary_email: "ops@northstar.example",
  primary_phone: "+91 90000 00001",
  timezone: "Asia/Kolkata",
  country_code: "IN",
  subscription_plan: "growth",
  seed_pack: "standard_office",
  status: "draft",
  onboarding_status: "setup_pending",
  is_sandbox: true,
} as PlatformTenantListItem;

const demoLead = {
  id: "demo-platform-lead",
  company_name: "Acme Foods",
  contact_name: "Asha Rao",
  work_email: "asha@acme.example",
  intent: "HRMS rollout",
  status: "qualified",
  preferred_plan: "growth",
  industry: "food",
} as PlatformPublicLead;

const demoPolicyPack = {
  id: "demo-policy-pack",
  source_pack_id: null,
  source_pack_code: "",
  source_pack_version: null,
  code: "india-office-baseline",
  name: "India Office Baseline",
  domain: "leave",
  country_code: "IN",
  industry_tag: "general",
  description: "Demo setup template",
  status: "draft",
  version: 1,
  is_active: true,
  published_at: null,
  published_by_identifier: "",
  item_count: 0,
  adoption_count: 0,
  items: [],
} as PlatformPolicyPackListItem;

function fallbackSummary(): PlatformSummary {
  return {
    counts: {
      active_tenants: 0,
      onboarding_tenants: 1,
      sandbox_tenants: 1,
      handoff_ready_tenants: 0,
      baseline_pending_tenants: 1,
      published_policy_packs: 0,
      active_leads: 1,
      new_leads: 0,
      leads: 1,
      qualified_leads: 1,
      tenants: 1,
      policy_packs: 1,
    },
    first_tenant: demoTenant,
    lead_queue: [demoLead],
    stale_onboarding_tenants: [demoTenant],
  };
}

function fallbackOnboarding(): PlatformTenantOnboarding {
  return {
    id: "demo-onboarding",
    tenant_id: demoTenant.id,
    tenant_code: demoTenant.code,
    tenant_name: demoTenant.name,
    tenant_status: demoTenant.status,
    tenant_onboarding_status: demoTenant.onboarding_status,
    owner_mode: "combined_platform_admin",
    setup_style: "platform_assisted",
    data_setup_style: "manual",
    policy_control_style: "mixed",
    launch_blueprint_ref: "demo-blueprint",
    launch_blueprint_version: "1",
    launch_readiness_status: "draft",
    launch_subscription_plan_snapshot: demoTenant.subscription_plan,
    launch_preview_payload: {},
    launch_selected_at: null,
    launch_applied_at: null,
    launch_verified_at: null,
    launch_status_notes: "",
    country_context: "IN",
    industry_context: "general",
    notes: "",
    internal_handoff_notes: "",
    customer_handoff_notes: "",
    first_login_verified_at: null,
    baseline_published_at: null,
    handoff_completed_at: null,
    admin_contacts: [
      {
        id: "demo-admin-contact",
        full_name: "Ava Patel",
        email: "ava@northstar.example",
        phone_number: "+91 90000 00002",
        job_title: "Head of People",
        is_primary: true,
        notes: "",
        user_id: null,
        membership_id: null,
        membership_status: "",
        user_is_active: null,
        provisioning_status: "pending",
        invited_at: null,
        first_login_at: null,
        created_at: "",
        updated_at: "",
      },
    ],
    checklist_items: [],
    recent_events: [],
  };
}

export async function renderPlatformAdminConsole(panel: PlatformPanel, params: Record<string, SearchParamValue> = {}) {
  const summaryResult = await getPlatformSummary();
  const summary = summaryResult.data?.counts ? summaryResult.data : fallbackSummary();
  const requestedTenantId = normalizeParam(params.tenantId);
  const shouldLoadLeads = panel === "leads";
  const shouldLoadTenants = panel === "tenants";
  const shouldLoadPolicyPacks = panel === "policy-packs" || panel === "onboarding";
  const needsSelectedTenant = ["launch", "onboarding", "admins", "policy-packs", "events"].includes(panel);

  const [leadResult, tenantResult, policyPackResult] = await Promise.all([
    shouldLoadLeads ? getPlatformPublicLeads() : Promise.resolve({ data: summary.lead_queue }),
    shouldLoadTenants ? getPlatformTenants() : Promise.resolve({ data: summary.stale_onboarding_tenants }),
    shouldLoadPolicyPacks ? getPlatformPolicyPacks() : Promise.resolve({ data: [] }),
  ]);
  const leads = listData<PlatformPublicLead>(leadResult.data);
  const tenants = listData<PlatformTenantListItem>(tenantResult.data);
  const policyPacks = listData<PlatformPolicyPackListItem>(policyPackResult.data);
  const safeLeads = leads.length ? leads : [demoLead];
  const safeTenants = tenants.length ? tenants : [demoTenant];
  const safePolicyPacks = policyPacks.length ? policyPacks : [demoPolicyPack];
  const selectedTenantSeed = summary.first_tenant ? [summary.first_tenant] : [];
  const selectedTenantId = resolveSelectedTenantId(params, [...safeTenants, ...selectedTenantSeed]);
  const shouldLoadSelectedTenant = Boolean(selectedTenantId && (needsSelectedTenant || requestedTenantId));
  const [selectedTenantResult, onboardingResult] = await Promise.all([
    shouldLoadSelectedTenant ? getPlatformTenant(selectedTenantId) : Promise.resolve(null),
    selectedTenantId && needsSelectedTenant ? getPlatformTenantOnboarding(selectedTenantId) : Promise.resolve(null),
  ]);

  return (
    <PlatformAdminConsole
      initialPanel={panel}
      leads={safeLeads}
      onboarding={(onboardingResult?.data && "tenant_id" in onboardingResult.data ? onboardingResult.data : fallbackOnboarding())}
      policyPacks={safePolicyPacks}
      selectedTenant={(selectedTenantResult?.data && "id" in selectedTenantResult.data ? selectedTenantResult.data : safeTenants[0])}
      summary={summary}
      tenants={safeTenants}
    />
  );
}
