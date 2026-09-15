"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import type {
  PlatformOnboardingAdminContact,
  PlatformPublicLead,
  PlatformPolicyPackListItem,
  PlatformTenantListItem,
  PlatformTenantOnboarding,
} from "@/lib/types";

type Props = {
  initialPanel: PlatformPanel;
  leads: PlatformPublicLead[];
  tenants: PlatformTenantListItem[];
  selectedTenant: PlatformTenantListItem | null;
  onboarding: PlatformTenantOnboarding | null;
  policyPacks: PlatformPolicyPackListItem[];
};

type MutationMethod = "POST" | "PATCH";
type PlatformPanel = "control" | "leads" | "tenants" | "onboarding" | "admins" | "policy-packs" | "events";

const PAGE_SIZE = 8;

const platformTabs: { panel: PlatformPanel; label: string; countKey: "control" | "leads" | "tenants" | "onboarding" | "admins" | "policyPacks" | "events" }[] = [
  { panel: "control", label: "Control", countKey: "control" },
  { panel: "leads", label: "Leads", countKey: "leads" },
  { panel: "tenants", label: "Tenants", countKey: "tenants" },
  { panel: "onboarding", label: "Launch Checklist", countKey: "onboarding" },
  { panel: "admins", label: "Tenant Admin Users", countKey: "admins" },
  { panel: "policy-packs", label: "Setup Templates", countKey: "policyPacks" },
  { panel: "events", label: "Events", countKey: "events" },
];

const panelGuides: Record<PlatformPanel, { title: string; description: string; steps: string[] }> = {
  control: {
    title: "Dashboard",
    description: "Start here to see signup requests, customer setup readiness, admin access, and launch blockers.",
    steps: ["Review urgent signals", "Open the matching panel", "Resolve or record evidence"],
  },
  leads: {
    title: "Leads",
    description: "Review public signup/contact requests, qualify promising accounts, and convert approved leads into tenants.",
    steps: ["Review lead details", "Mark reviewing or qualified", "Convert to tenant"],
  },
  tenants: {
    title: "Tenants",
    description: "Search the customer registry, select a tenant, and create new customer organizations when needed.",
    steps: ["Find or create tenant", "Select tenant", "Open onboarding"],
  },
  onboarding: {
    title: "Launch Checklist",
    description: "Move the selected customer through setup template adoption, tenant admin access, and launch readiness.",
    steps: ["Verify tenant setup", "Confirm setup and admin access", "Activate when ready"],
  },
  admins: {
    title: "Tenant Admin Users",
    description: "Create customer admin contacts and provision the first login user for the customer organization.",
    steps: ["Add primary contact", "Create login access", "Share login securely"],
  },
  "policy-packs": {
    title: "Setup Templates",
    description: "Create, publish, and apply reusable setup templates so every tenant starts from controlled configuration.",
    steps: ["Create template", "Publish template", "Apply to selected tenant"],
  },
  events: {
    title: "Audit Logs",
    description: "Review tenant onboarding events and evidence for platform actions, customer readiness, support, and activation.",
    steps: ["Search evidence", "Check actor and timestamp", "Use for signoff"],
  },
};

const panelPills: Record<PlatformPanel, string[]> = {
  control: ["Action queue", "Tenant readiness", "Launch blockers"],
  leads: ["Public signup", "Qualification", "Tenant conversion"],
  tenants: ["Customer registry", "Create tenant", "Select workspace"],
  onboarding: ["Setup details", "Launch checklist", "Readiness evidence"],
  admins: ["Admin contacts", "Login access", "Secure sharing"],
  "policy-packs": ["Setup templates", "Publish", "Apply"],
  events: ["Audit evidence", "Actor trail", "Timeline"],
};

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizedSearchText(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
}

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function apiErrorMessage(payload: unknown, fallback: string) {
  const friendly = (message: string) => {
    if (/Primary tenant admin must be provisioned/i.test(message)) return "Create login access for the primary tenant admin before marking this customer ready.";
    if (/Baseline must be published/i.test(message)) return "Apply and confirm an initial setup template before marking this customer ready.";
    if (/Tenant handoff must be ready/i.test(message)) return "Mark the customer ready for the tenant admin before activation.";
    if (/At least one adopted policy pack is required/i.test(message)) return "Apply a published setup template to this tenant before confirming setup.";
    if (/already exists|duplicate/i.test(message)) return "This record already exists. Search the list or use a different code/email.";
    return message;
  };
  if (Array.isArray(payload) && payload.length) return friendly(String(payload[0]));
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string") return friendly(record.detail);
  const firstEntry = Object.values(record).find((value) => Array.isArray(value) || typeof value === "string");
  if (Array.isArray(firstEntry) && firstEntry.length) return friendly(String(firstEntry[0]));
  if (typeof firstEntry === "string") return friendly(firstEntry);
  return fallback;
}

function DetailRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value === null || value === undefined || value === "" ? "Not set" : String(value)}</span>
    </div>
  );
}

function StatusChip({ value }: { value: string }) {
  const isReady = ["active", "published", "provisioned", "completed", "handoff_ready", "baseline_published"].includes(value);
  return <span className={`record-chip${isReady ? " record-chip--accent" : ""}`}>{titleCase(value)}</span>;
}

function GateChecklistItem({
  complete,
  label,
  detail,
}: {
  complete: boolean;
  label: string;
  detail: string;
}) {
  return (
    <li className={`platform-gate-checklist__item${complete ? " is-complete" : " is-blocked"}`}>
      <span aria-hidden="true">{complete ? "Done" : "Needed"}</span>
      <div>
        <strong>{label}</strong>
        <small>{detail}</small>
      </div>
    </li>
  );
}

function GuidedChecklistItem({
  index,
  status,
  title,
  detail,
  actionHref,
  actionLabel,
}: {
  index: number;
  status: "done" | "needed" | "blocked";
  title: string;
  detail: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  const statusLabel = status === "done" ? "Done" : status === "blocked" ? "Blocked" : "Needed";

  return (
    <li className={`platform-guided-checklist__item platform-guided-checklist__item--${status}`}>
      <span className="platform-guided-checklist__index">{index}</span>
      <div className="platform-guided-checklist__content">
        <div className="platform-guided-checklist__title-row">
          <strong>{title}</strong>
          <span>{statusLabel}</span>
        </div>
        <small>{detail}</small>
        {actionHref && actionLabel ? (
          <Link className="button button--secondary" href={actionHref}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function ValidationNote({ children }: { children: React.ReactNode }) {
  return <small className="platform-validation-note">{children}</small>;
}

function clampPage(page: number, totalCount: number) {
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  return Math.min(Math.max(page, 1), totalPages);
}

function paginate<T>(items: T[], page: number) {
  const safePage = clampPage(page, items.length);
  const start = (safePage - 1) * PAGE_SIZE;
  return {
    items: items.slice(start, start + PAGE_SIZE),
    page: safePage,
    hasPrevious: safePage > 1,
    hasNext: safePage * PAGE_SIZE < items.length,
  };
}

function buildPanelHref(panel: PlatformPanel, selectedTenantId?: string) {
  const panelPaths: Record<PlatformPanel, string> = {
    control: "/platform-admin",
    leads: "/platform-admin/leads",
    tenants: "/platform-admin/tenants",
    onboarding: "/platform-admin/onboarding",
    admins: "/platform-admin/admins",
    "policy-packs": "/platform-admin/policy-packs",
    events: "/platform-admin/audit-logs",
  };
  const params = new URLSearchParams();
  if (selectedTenantId) params.set("tenantId", selectedTenantId);
  const query = params.toString();
  return query ? `${panelPaths[panel]}?${query}` : panelPaths[panel];
}

function leadUrgency(lead: PlatformPublicLead) {
  if (lead.status === "new") return "Review now";
  if (lead.status === "qualified") return "Create tenant";
  if (lead.status === "reviewing") return "Follow up";
  return titleCase(lead.status);
}

function leadCodeSuggestion(lead: PlatformPublicLead) {
  return lead.company_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42) || "new-tenant";
}

function leadDomainSuggestion(lead: PlatformPublicLead) {
  const emailDomain = lead.work_email.split("@")[1]?.toLowerCase() ?? "";
  if (emailDomain && !emailDomain.endsWith(".example")) return emailDomain;
  return "";
}

export function PlatformAdminConsole({ initialPanel, leads, tenants, selectedTenant, onboarding, policyPacks }: Props) {
  const router = useRouter();
  const [busyRef, setBusyRef] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [leadQuery, setLeadQuery] = useState("");
  const [tenantQuery, setTenantQuery] = useState("");
  const [policyPackQuery, setPolicyPackQuery] = useState("");
  const [eventQuery, setEventQuery] = useState("");
  const [editingContactId, setEditingContactId] = useState("");
  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [leadPage, setLeadPage] = useState(1);
  const [tenantPage, setTenantPage] = useState(1);
  const [policyPackPage, setPolicyPackPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);

  const tenantCounts = useMemo(() => {
    return {
      active: tenants.filter((tenant) => tenant.status === "active").length,
      onboarding: tenants.filter((tenant) => tenant.onboarding_status !== "active").length,
      sandbox: tenants.filter((tenant) => tenant.is_sandbox).length,
      handoffReady: tenants.filter((tenant) => tenant.onboarding_status === "handoff_ready").length,
      baselinePending: tenants.filter((tenant) => ["created", "prepared"].includes(tenant.onboarding_status)).length,
      publishedPacks: policyPacks.filter((pack) => pack.status === "published").length,
    };
  }, [policyPacks, tenants]);

  const provisionableContacts = onboarding?.admin_contacts.filter((contact) => !contact.membership_id) ?? [];
  const primaryContact = onboarding?.admin_contacts.find((contact) => contact.is_primary) ?? onboarding?.admin_contacts[0] ?? null;
  const hasProvisionedPrimaryAdmin = Boolean(primaryContact?.membership_id);
  const hasBaseline = Boolean(onboarding?.baseline_published_at);
  const canMarkHandoff = Boolean(selectedTenant && hasBaseline && hasProvisionedPrimaryAdmin);
  const canActivateTenant = Boolean(selectedTenant && onboarding?.handoff_completed_at && hasProvisionedPrimaryAdmin);
  const publishedPacks = policyPacks.filter((pack) => pack.status === "published");
  const canAdoptBaseline = Boolean(selectedTenant && publishedPacks.length);
  const guidedChecklist = selectedTenant && onboarding ? [
    {
      status: "done" as const,
      title: "Customer record created",
      detail: `${selectedTenant.name} exists in the tenant registry.`,
      actionHref: buildPanelHref("tenants", selectedTenant.id),
      actionLabel: "Review tenant",
    },
    {
      status: hasBaseline ? "done" as const : publishedPacks.length ? "needed" as const : "blocked" as const,
      title: "Apply setup template",
      detail: hasBaseline
        ? `Initial setup was confirmed ${formatDateTime(onboarding.baseline_published_at)}.`
        : publishedPacks.length
          ? "Choose a published setup template and apply it to this tenant."
          : "Publish at least one setup template before this tenant can receive initial setup.",
      actionHref: buildPanelHref("policy-packs", selectedTenant.id),
      actionLabel: hasBaseline ? "View templates" : "Apply template",
    },
    {
      status: hasProvisionedPrimaryAdmin ? "done" as const : primaryContact ? "needed" as const : "blocked" as const,
      title: "Create tenant admin login",
      detail: hasProvisionedPrimaryAdmin
        ? `${primaryContact?.email || "Primary tenant admin"} has tenant admin access.`
        : primaryContact
          ? `Create login access for ${primaryContact.email}.`
          : "Add a primary tenant admin contact before creating login access.",
      actionHref: buildPanelHref("admins", selectedTenant.id),
      actionLabel: hasProvisionedPrimaryAdmin ? "View admin users" : primaryContact ? "Create login access" : "Add admin contact",
    },
    {
      status: onboarding.handoff_completed_at ? "done" as const : canMarkHandoff ? "needed" as const : "blocked" as const,
      title: "Mark ready for tenant admin",
      detail: onboarding.handoff_completed_at
        ? `Customer readiness was marked ${formatDateTime(onboarding.handoff_completed_at)}.`
        : canMarkHandoff
          ? "Setup and primary admin access are complete. Mark this customer ready."
          : "Complete setup template and tenant admin login before marking ready.",
      actionHref: buildPanelHref("onboarding", selectedTenant.id),
      actionLabel: onboarding.handoff_completed_at ? "View readiness" : "Open launch checklist",
    },
    {
      status: selectedTenant.status === "active" ? "done" as const : canActivateTenant ? "needed" as const : "blocked" as const,
      title: "Activate tenant",
      detail: selectedTenant.status === "active"
        ? "Tenant is active and available for customer use."
        : canActivateTenant
          ? "Readiness is complete. Activate the tenant when the customer is ready to begin."
          : "Mark the customer ready for tenant admin before activation.",
      actionHref: buildPanelHref("onboarding", selectedTenant.id),
      actionLabel: selectedTenant.status === "active" ? "View active tenant" : "Open launch checklist",
    },
  ] : [];
  const events = onboarding?.recent_events ?? [];
  const normalizedLeadQuery = leadQuery.trim().toLowerCase();
  const normalizedTenantQuery = tenantQuery.trim().toLowerCase();
  const normalizedPolicyPackQuery = policyPackQuery.trim().toLowerCase();
  const normalizedEventQuery = normalizedSearchText(eventQuery.trim());
  const filteredLeads = normalizedLeadQuery
    ? leads.filter((lead) => [lead.company_name, lead.contact_name, lead.work_email, lead.intent, lead.status, lead.preferred_plan, lead.industry].join(" ").toLowerCase().includes(normalizedLeadQuery))
    : leads;
  const filteredTenants = normalizedTenantQuery
    ? tenants.filter((tenant) => [tenant.name, tenant.code, tenant.primary_domain, tenant.subscription_plan, tenant.onboarding_status].join(" ").toLowerCase().includes(normalizedTenantQuery))
    : tenants;
  const filteredPolicyPacks = normalizedPolicyPackQuery
    ? policyPacks.filter((pack) => [pack.name, pack.code, pack.domain, pack.status, pack.country_code, pack.industry_tag].join(" ").toLowerCase().includes(normalizedPolicyPackQuery))
    : policyPacks;
  const filteredEvents = normalizedEventQuery
    ? events.filter((event) =>
        [event.event_type, event.summary, event.actor_identifier, event.created_at]
          .map(normalizedSearchText)
          .join(" ")
          .includes(normalizedEventQuery),
      )
    : events;
  const leadPageData = paginate(filteredLeads, leadPage);
  const tenantPageData = paginate(filteredTenants, tenantPage);
  const policyPackPageData = paginate(filteredPolicyPacks, policyPackPage);
  const eventPageData = paginate(filteredEvents, eventPage);
  const activeLeads = leads.filter((lead) => ["new", "reviewing", "qualified"].includes(lead.status));
  const newLeads = leads.filter((lead) => lead.status === "new");
  const qualifiedLeads = leads.filter((lead) => lead.status === "qualified");
  const staleOnboardingTenants = tenants.filter((tenant) => !["active", "handoff_ready"].includes(tenant.onboarding_status)).slice(0, 5);
  const leadQueue = [...newLeads, ...qualifiedLeads, ...activeLeads.filter((lead) => !["new", "qualified"].includes(lead.status))].slice(0, 5);
  const controlRisks = [
    {
      label: "New public leads",
      value: newLeads.length,
      action: "Review and qualify inbound requests.",
      href: buildPanelHref("leads", selectedTenant?.id),
    },
    {
      label: "Tenants not active",
      value: tenantCounts.onboarding,
      action: "Move prepared tenants through setup confirmation, admin access, readiness, and activation.",
      href: buildPanelHref("tenants", selectedTenant?.id),
    },
    {
      label: "Published setup templates",
      value: tenantCounts.publishedPacks,
      action: tenantCounts.publishedPacks ? "Apply setup templates for onboarding tenants." : "Publish at least one setup template before marking a customer ready.",
      href: buildPanelHref("policy-packs", selectedTenant?.id),
    },
  ];
  const tabCounts = {
    control: activeLeads.length + tenantCounts.onboarding,
    leads: leads.filter((lead) => ["new", "reviewing", "qualified"].includes(lead.status)).length,
    tenants: tenants.length,
    onboarding: selectedTenant && onboarding ? 2 : 0,
    admins: onboarding?.admin_contacts.length ?? 0,
    policyPacks: policyPacks.length,
    events: events.length,
  };
  const activeGuide = panelGuides[initialPanel];
  const pageTitle = initialPanel === "control" ? "Platform Admin Dashboard" : activeGuide.title;
  const pageDescription =
    initialPanel === "control"
      ? "A simple control center for public leads, tenant readiness, setup templates, admin access, and activation blockers."
      : activeGuide.description;

  async function mutate<T>(path: string, method: MutationMethod, body: Record<string, unknown>, successMessage: string): Promise<T> {
    setBusyRef(path);
    setError("");
    setMessage("");
    setGeneratedPassword("");
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    setBusyRef("");
    if (!response.ok) {
      throw new Error(apiErrorMessage(payload, "Platform action failed."));
    }
    setMessage(successMessage);
    router.refresh();
    return payload as T;
  }

  async function handleTenantCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      const payload = await mutate<PlatformTenantListItem>(
        "/api/platform/tenants",
        "POST",
        {
          code: formValue(formData, "code"),
          name: formValue(formData, "name"),
          legal_name: formValue(formData, "legal_name"),
          primary_domain: formValue(formData, "primary_domain"),
          primary_email: formValue(formData, "primary_email"),
          primary_phone: formValue(formData, "primary_phone"),
          timezone: formValue(formData, "timezone") || "Asia/Kolkata",
          country_code: formValue(formData, "country_code") || "IN",
          subscription_plan: formValue(formData, "subscription_plan") || "starter",
          seed_pack: formValue(formData, "seed_pack") || "standard_office",
          is_sandbox: formData.has("is_sandbox"),
        },
        "Tenant created.",
      );
      setShowCreateTenantModal(false);
      router.push(buildPanelHref("onboarding", payload.id));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Tenant creation failed.");
    }
  }

  async function handleLeadStatus(leadId: string, status: string) {
    try {
      await mutate(`/api/platform/leads/${leadId}`, "PATCH", { status }, `Lead marked ${titleCase(status)}.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Lead update failed.");
    }
  }

  async function handleLeadConvert(event: React.FormEvent<HTMLFormElement>, leadId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      const payload = await mutate<{ tenant?: PlatformTenantListItem }>(
        `/api/platform/leads/${leadId}/convert`,
        "POST",
        {
          code: formValue(formData, "code"),
          primary_domain: formValue(formData, "primary_domain"),
          subscription_plan: formValue(formData, "subscription_plan") || "growth",
          seed_pack: formValue(formData, "seed_pack") || "standard_office",
          is_sandbox: formData.has("is_sandbox"),
          owner_mode: formValue(formData, "owner_mode") || "combined_platform_admin",
          setup_style: formValue(formData, "setup_style") || "platform_assisted",
          data_setup_style: formValue(formData, "data_setup_style") || "manual",
          policy_control_style: formValue(formData, "policy_control_style") || "mixed",
          admin_job_title: formValue(formData, "admin_job_title"),
          notes: formValue(formData, "notes"),
        },
        "Lead converted to tenant.",
      );
      if (payload.tenant?.id) {
        router.push(buildPanelHref("admins", payload.tenant.id));
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Lead conversion failed.");
    }
  }

  async function handleTenantPatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;
    const formData = new FormData(event.currentTarget);
    try {
      await mutate(
        `/api/platform/tenants/${selectedTenant.id}`,
        "PATCH",
        {
          name: formValue(formData, "name"),
          legal_name: formValue(formData, "legal_name"),
          status: formValue(formData, "status"),
          subscription_plan: formValue(formData, "subscription_plan"),
          seed_pack: formValue(formData, "seed_pack"),
          primary_email: formValue(formData, "primary_email"),
          primary_phone: formValue(formData, "primary_phone"),
          timezone: formValue(formData, "timezone"),
          country_code: formValue(formData, "country_code"),
          primary_domain: formValue(formData, "primary_domain"),
          is_sandbox: formData.has("is_sandbox"),
        },
        "Tenant updated.",
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Tenant update failed.");
    }
  }

  async function handleOnboardingPatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;
    const formData = new FormData(event.currentTarget);
    try {
      await mutate(
        `/api/platform/tenants/${selectedTenant.id}/onboarding`,
        "PATCH",
        {
          owner_mode: formValue(formData, "owner_mode"),
          setup_style: formValue(formData, "setup_style"),
          data_setup_style: formValue(formData, "data_setup_style"),
          policy_control_style: formValue(formData, "policy_control_style"),
          country_context: formValue(formData, "country_context"),
          industry_context: formValue(formData, "industry_context"),
          notes: formValue(formData, "notes"),
          internal_handoff_notes: formValue(formData, "internal_handoff_notes"),
          customer_handoff_notes: formValue(formData, "customer_handoff_notes"),
        },
        "Onboarding metadata updated.",
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Onboarding update failed.");
    }
  }

  async function handleContactCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;
    const formData = new FormData(event.currentTarget);
    try {
      await mutate(
        `/api/platform/tenants/${selectedTenant.id}/admin-contacts`,
        "POST",
        {
          full_name: formValue(formData, "full_name"),
          email: formValue(formData, "email"),
          phone_number: formValue(formData, "phone_number"),
          job_title: formValue(formData, "job_title"),
          is_primary: formData.has("is_primary"),
          notes: formValue(formData, "notes"),
        },
        "Admin contact added.",
      );
      setShowAddContactModal(false);
      event.currentTarget.reset();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Admin contact creation failed.");
    }
  }

  async function handleContactPatch(event: React.FormEvent<HTMLFormElement>, contactId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      await mutate(
        `/api/platform/admin-contacts/${contactId}`,
        "PATCH",
        {
          full_name: formValue(formData, "full_name"),
          email: formValue(formData, "email"),
          phone_number: formValue(formData, "phone_number"),
          job_title: formValue(formData, "job_title"),
          is_primary: formData.has("is_primary"),
          notes: formValue(formData, "notes"),
        },
        "Admin contact updated.",
      );
      setEditingContactId("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Admin contact update failed.");
    }
  }

  async function handleProvision(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const contactId = formValue(formData, "contact_id");
    if (!contactId) return;
    try {
      const payload = await mutate<{ generated_password?: string }>(
        `/api/platform/admin-contacts/${contactId}/provision-user`,
        "POST",
        {
          username: formValue(formData, "username"),
          role_code: formValue(formData, "role_code") || "hr-admin",
          role_name: formValue(formData, "role_name"),
          password: formValue(formData, "password"),
          must_change_password: formData.has("must_change_password"),
          is_user_active: formData.has("is_user_active"),
          membership_status: formValue(formData, "membership_status") || "active",
        },
        "First admin provisioned.",
      );
      if (payload.generated_password) {
        setGeneratedPassword(payload.generated_password);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Admin provisioning failed.");
    }
  }

  async function handlePolicyPackCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      await mutate(
        "/api/platform-policy-packs",
        "POST",
        {
          code: formValue(formData, "code"),
          name: formValue(formData, "name"),
          domain: formValue(formData, "domain") || "leave",
          country_code: formValue(formData, "country_code"),
          industry_tag: formValue(formData, "industry_tag"),
          description: formValue(formData, "description"),
          status: formValue(formData, "status") || "draft",
          version: Number(formValue(formData, "version") || "1"),
          is_active: formData.has("is_active"),
        },
        "Policy pack created.",
      );
      event.currentTarget.reset();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Policy pack creation failed.");
    }
  }

  async function handlePublishPack(packId: string) {
    try {
      await mutate(`/api/platform-policy-packs/${packId}/publish`, "POST", {}, "Policy pack published.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Policy pack publish failed.");
    }
  }

  async function handleAdoptPack(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;
    const formData = new FormData(event.currentTarget);
    const packId = formValue(formData, "policy_pack_id");
    if (!packId) return;
    try {
      await mutate(
        `/api/platform-policy-packs/${packId}/adopt-for-tenant`,
        "POST",
        {
          tenant_id: selectedTenant.id,
          adoption_mode: formValue(formData, "adoption_mode") || "clone_to_tenant_records",
          notes: formValue(formData, "notes"),
        },
        "Policy pack adopted for tenant.",
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Policy pack adoption failed.");
    }
  }

  async function handleTenantAction(action: "mark-baseline-published" | "mark-handoff-ready" | "activate") {
    if (!selectedTenant) return;
    try {
      await mutate(
        `/api/platform/tenants/${selectedTenant.id}/onboarding/${action}`,
        "POST",
        {},
        titleCase(action),
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Tenant state action failed.");
    }
  }

  return (
    <main className="shell">
      <PageIntro
        eyebrow="Live platform operations"
        title={pageTitle}
        description={pageDescription}
        className="page-header-surface page-header-surface--compact"
        actions={
          <>
            {initialPanel !== "control" ? (
              <Link className="button button--secondary" href="/platform-admin">
                Dashboard
              </Link>
            ) : null}
            {initialPanel !== "tenants" ? (
              <Link className="button button--secondary" href={buildPanelHref("tenants", selectedTenant?.id)}>
                Tenants
              </Link>
            ) : null}
            {selectedTenant && initialPanel !== "onboarding" ? (
              <Link className="button button--primary" href={`/platform-admin/onboarding?tenantId=${selectedTenant.id}`}>
                Open selected tenant
              </Link>
            ) : null}
          </>
        }
        pills={panelPills[initialPanel]}
        showPills
      />

      {initialPanel === "control" ? (
        <section className="section platform-control-metrics">
          <div className="metric-grid-modern">
            <MetricTile label="Open control actions" value={tabCounts.control} trend="Leads and tenant gates" />
            <MetricTile label="Tenants" value={tenants.length} trend="Platform catalog" />
            <MetricTile label="Active tenants" value={tenantCounts.active} trend="Activated" />
            <MetricTile label="Onboarding" value={tenantCounts.onboarding} trend="Not yet active" />
            <MetricTile label="Public leads" value={activeLeads.length} trend={`${newLeads.length} new`} />
            <MetricTile label="Published packs" value={tenantCounts.publishedPacks} trend={`${policyPacks.length} total packs`} />
          </div>
        </section>
      ) : null}

      {(message || error || generatedPassword) ? (
        <section className="section">
          <div className="notice">
            {message ? <strong>{message}</strong> : null}
            {error ? <strong>{error}</strong> : null}
            {generatedPassword ? <span className="muted">Generated password: {generatedPassword}</span> : null}
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="tabbar" role="tablist" aria-label="Platform admin sections">
          {platformTabs.map((item) => (
            <Link
              aria-selected={initialPanel === item.panel}
              className={`tab ${initialPanel === item.panel ? "tab--active" : ""}`}
              href={buildPanelHref(item.panel, selectedTenant?.id)}
              key={item.panel}
              role="tab"
            >
              {item.label}
              <span>{tabCounts[item.countKey]}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="platform-panel-guide" data-testid="platform-admin-panel-guide">
          <div>
            <span className="eyebrow">Selected workspace</span>
            <h2>{activeGuide.title}</h2>
            <p>{activeGuide.description}</p>
          </div>
          <ol aria-label={`${activeGuide.title} workflow`}>
            {activeGuide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section>

      {initialPanel === "control" ? (
      <>
        <section className="section platform-control-center" data-testid="platform-admin-control-center">
          <article className="record-card platform-control-card platform-control-card--primary">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Mission queue</h2>
                <span className="record-chip">{leadQueue.length} priority leads</span>
              </div>
              <p className="section-copy">Inbound signup and contact requests that need platform operator action before tenant creation.</p>
            </div>
            <div className="tenant-support-access-list">
              {leadQueue.map((lead) => (
                <div className="tenant-support-access-row tenant-support-access-row--stacked" key={lead.id}>
                  <div>
                    <strong>{lead.company_name}</strong>
                    <span>{lead.contact_name} - {lead.work_email}</span>
                    <span>{lead.employee_count ? `${lead.employee_count} employees` : "Employee count not set"} - {lead.preferred_plan || "Plan not set"}</span>
                  </div>
                  <StatusChip value={lead.status} />
                  <span className="record-chip">{leadUrgency(lead)}</span>
                  <Link className="button button--secondary" href={buildPanelHref("leads", selectedTenant?.id)}>Open leads</Link>
                </div>
              ))}
              {!leadQueue.length ? (
                <div className="notice notice--success">
                  <strong>No active public leads need review.</strong>
                  <span className="muted">New public signup and contact requests will land here.</span>
                </div>
              ) : null}
            </div>
          </article>

          <article className="record-card platform-control-card">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Tenant pipeline</h2>
                <span className="record-chip">{tenantCounts.onboarding} in motion</span>
              </div>
              <p className="section-copy">Launch posture across created, prepared, setup-confirmed, ready, sandbox, and active tenants.</p>
            </div>
            <div className="detail-grid">
              <DetailRow label="Active" value={tenantCounts.active} />
              <DetailRow label="Not active" value={tenantCounts.onboarding} />
              <DetailRow label="Setup pending" value={tenantCounts.baselinePending} />
              <DetailRow label="Ready for tenant admin" value={tenantCounts.handoffReady} />
              <DetailRow label="Sandbox" value={tenantCounts.sandbox} />
              <DetailRow label="Published packs" value={tenantCounts.publishedPacks} />
            </div>
            <div className="form-actions-bar">
              <span className="muted">Use tenant details to complete setup confirmation, tenant admin access, readiness, and activation.</span>
              <Link className="button button--primary" href={buildPanelHref("tenants", selectedTenant?.id)}>Open tenants</Link>
            </div>
          </article>
        </section>

        <section className="section platform-control-grid">
          <article className="record-card">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Risk radar</h2>
                <span className="record-chip">{controlRisks.filter((item) => Number(item.value) > 0).length} signals</span>
              </div>
              <p className="section-copy">Each signal explains the next action instead of just showing a number.</p>
            </div>
            <div className="tenant-support-access-list">
              {controlRisks.map((risk) => (
                <div className="tenant-support-access-row" key={risk.label}>
                  <div>
                    <strong>{risk.label}</strong>
                    <span>{risk.action}</span>
                  </div>
                  <span className="record-chip">{risk.value}</span>
                  <Link className="button button--secondary" href={risk.href}>Resolve</Link>
                </div>
              ))}
            </div>
          </article>

          <article className="record-card">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Activation blockers</h2>
                <span className="record-chip">{staleOnboardingTenants.length} shown</span>
              </div>
              <p className="section-copy">Tenants that still need platform action before they become customer-ready.</p>
            </div>
            <div className="tenant-support-access-list">
              {staleOnboardingTenants.map((tenant) => (
                <div className="tenant-support-access-row" key={tenant.id}>
                  <div>
                    <strong>{tenant.name}</strong>
                    <span>{tenant.code} - {tenant.primary_domain || "No domain"}</span>
                  </div>
                  <StatusChip value={tenant.onboarding_status} />
                  <Link className="button button--secondary" href={buildPanelHref("onboarding", tenant.id)}>Review</Link>
                </div>
              ))}
              {!staleOnboardingTenants.length ? (
                <div className="notice notice--success">
                  <strong>No tenant activation blockers in this view.</strong>
                  <span className="muted">Created and prepared tenants will appear here.</span>
                </div>
              ) : null}
            </div>
          </article>

          <article className="record-card">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Command shortcuts</h2>
              </div>
              <p className="section-copy">Fast paths for the platform operator’s common decisions.</p>
            </div>
            <div className="platform-command-grid">
              <Link className="button button--primary" href={buildPanelHref("leads", selectedTenant?.id)}>Review leads</Link>
              <Link className="button button--secondary" href={buildPanelHref("tenants", selectedTenant?.id)}>Create tenant</Link>
              <Link className="button button--secondary" href={buildPanelHref("admins", selectedTenant?.id)}>Create admin access</Link>
              <Link className="button button--secondary" href={buildPanelHref("policy-packs", selectedTenant?.id)}>Setup templates</Link>
              <Link className="button button--secondary" href="/hr-admin/saas-operations">Ops health</Link>
              <Link className="button button--secondary" href="/hr-admin/saas-resilience">Resilience</Link>
            </div>
          </article>

          <article className="record-card">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Evidence trail</h2>
              </div>
              <p className="section-copy">Operator proof for tenant setup, setup templates, support posture, and launch checks.</p>
            </div>
            <div className="detail-grid">
              <DetailRow label="Tenant events" value={events.length} />
              <DetailRow label="Setup templates" value={policyPacks.length} />
              <DetailRow label="Active leads" value={activeLeads.length} />
              <DetailRow label="Selected tenant" value={selectedTenant?.code || "Not selected"} />
            </div>
            <div className="form-actions-bar">
              <span className="muted">Open events or SaaS operations when evidence is needed for signoff.</span>
              <Link className="button button--secondary" href={buildPanelHref("events", selectedTenant?.id)}>Open events</Link>
            </div>
          </article>
        </section>
      </>
      ) : null}

      {initialPanel === "leads" ? (
      <section className="section" data-testid="platform-admin-leads-panel">
        <article className="record-card">
          <div className="record-card__title-wrap">
            <div className="record-card__title">
              <h2>Public signup and contact leads</h2>
              <span className="record-chip">{filteredLeads.length} visible</span>
            </div>
            <p className="section-copy">Review public requests, qualify them, then create tenants through the protected onboarding workflow.</p>
          </div>
          <label className="queue-toolbar__search">
            <span>Search</span>
            <input
              className="input-control"
              name="lead_search"
              onChange={(event) => {
                setLeadQuery(event.target.value);
                setLeadPage(1);
              }}
              placeholder="Company, contact, email, plan, status"
              value={leadQuery}
            />
          </label>
          <div className="tenant-support-access-list">
            {leadPageData.items.map((lead) => (
              <div className="tenant-support-access-row tenant-support-access-row--stacked" key={lead.id}>
                <div>
                  <strong>{lead.company_name}</strong>
                  <span>{lead.contact_name} - {lead.work_email} - {lead.phone_number || "No phone"}</span>
                  <span>{lead.employee_count ? `${lead.employee_count} employees` : "Employee count not set"} - {lead.preferred_plan || "Plan not set"} - {lead.industry || "Industry not set"}</span>
                  {lead.message ? <span>{lead.message}</span> : null}
                </div>
                <StatusChip value={lead.status} />
                <span className="record-chip">{titleCase(lead.intent)}</span>
                <span className="record-chip">{formatDateTime(lead.created_at)}</span>
                <div className="button-row">
                  <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => handleLeadStatus(lead.id, "reviewing")}>Reviewing</button>
                  <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => handleLeadStatus(lead.id, "qualified")}>Qualified</button>
                  <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => handleLeadStatus(lead.id, "closed")}>Close</button>
                </div>
                {lead.converted_tenant_id ? (
                  <div className="notice notice--compact notice--success">
                    <strong>Converted tenant is ready for tenant admin access.</strong>
                    <Link className="button button--secondary" href={buildPanelHref("admins", lead.converted_tenant_id)}>
                      Open admin setup
                    </Link>
                  </div>
                ) : (
                  <form className="platform-lead-convert-form" onSubmit={(event) => handleLeadConvert(event, lead.id)}>
                    <div className="record-card__title">
                      <h3>Convert to tenant</h3>
                      <span className="record-chip">Approval controlled</span>
                    </div>
                    <div className="notice notice--compact platform-validation-strip">
                      <strong>Before converting</strong>
                      <span className="muted">Confirm commercial approval, choose a unique tenant code, and keep sandbox on for trials.</span>
                    </div>
                    <div className="form-grid">
                      <label className="form-field"><span className="muted">Tenant code</span><input className="input-control" name="code" required defaultValue={leadCodeSuggestion(lead)} /><ValidationNote>Required and must be unique. Use lowercase letters, numbers, or hyphens.</ValidationNote></label>
                      <label className="form-field"><span className="muted">Primary domain</span><input className="input-control" name="primary_domain" defaultValue={leadDomainSuggestion(lead)} placeholder="customer.example.com" /><ValidationNote>Optional during trial; add the real customer domain before production activation.</ValidationNote></label>
                      <label className="form-field"><span className="muted">Plan</span><select className="input-control" name="subscription_plan" defaultValue={lead.preferred_plan === "business" ? "enterprise" : lead.preferred_plan || "growth"}><option value="starter">Starter</option><option value="growth">Growth</option><option value="enterprise">Enterprise</option></select></label>
                      <label className="form-field"><span className="muted">Seed pack</span><select className="input-control" name="seed_pack" defaultValue="standard_office"><option value="standard_office">Standard Office</option><option value="shift_based">Shift Based Operations</option><option value="retail_field">Retail or Field Workforce</option><option value="professional_services">Professional Services</option></select></label>
                      <label className="form-field"><span className="muted">Owner mode</span><select className="input-control" name="owner_mode" defaultValue="combined_platform_admin"><option value="combined_platform_admin">Combined Platform Admin</option><option value="split_platform_roles">Split Platform Roles</option></select></label>
                      <label className="form-field"><span className="muted">Setup style</span><select className="input-control" name="setup_style" defaultValue="platform_assisted"><option value="platform_assisted">Platform Assisted</option><option value="shared">Shared</option><option value="customer_led">Customer Led</option></select></label>
                      <label className="form-field"><span className="muted">Data setup</span><select className="input-control" name="data_setup_style" defaultValue="manual"><option value="manual">Manual</option><option value="import_led">Import Led</option><option value="seeded_demo">Seeded Demo</option></select></label>
                      <label className="form-field"><span className="muted">Policy control</span><select className="input-control" name="policy_control_style" defaultValue="mixed"><option value="mostly_locked">Mostly Locked</option><option value="mostly_delegated">Mostly Delegated</option><option value="mixed">Mixed</option></select></label>
                      <label className="form-field"><span className="muted">Admin title</span><input className="input-control" name="admin_job_title" placeholder="Head of People" /></label>
                      <label className="form-field"><span className="muted">Sandbox</span><input name="is_sandbox" type="checkbox" defaultChecked /></label>
                      <label className="form-field platform-lead-convert-form__notes"><span className="muted">Conversion notes</span><textarea className="input-control" name="notes" placeholder="Commercial approval, pilot scope, or onboarding context." /></label>
                    </div>
                    <div className="form-actions-bar">
                      <span className="muted">Creates tenant, primary admin contact, checklist evidence, and conversion audit.</span>
                      <button className="button button--primary" disabled={Boolean(busyRef)} type="submit">
                        {busyRef === `/api/platform/leads/${lead.id}/convert` ? "Converting..." : "Convert lead"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
            {!filteredLeads.length ? (
              <div className="notice">
                <strong>No public leads match this view.</strong>
                <span className="muted">Public signup and contact submissions will appear here for platform review.</span>
              </div>
            ) : null}
          </div>
          <PaginationBar
            hasNext={leadPageData.hasNext}
            hasPrevious={leadPageData.hasPrevious}
            onFirst={() => setLeadPage(1)}
            onLast={() => setLeadPage(Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE)))}
            onNext={() => setLeadPage((current) => clampPage(current + 1, filteredLeads.length))}
            onPrevious={() => setLeadPage((current) => clampPage(current - 1, filteredLeads.length))}
            page={leadPageData.page}
            pageSize={PAGE_SIZE}
            totalCount={filteredLeads.length}
          />
          <div className="notice notice--compact">
            <strong>Approval remains controlled.</strong>
            <span className="muted">Use the Tenants tab to create the tenant only after the lead is qualified and commercials are approved.</span>
          </div>
        </article>
      </section>
      ) : null}

      {initialPanel === "tenants" ? (
      <section className="section employee-master-layout" data-testid="platform-admin-tenants-panel">
        <article className="queue-toolbar">
          <div className="queue-toolbar__header">
            <div>
              <h2>Tenant pipeline</h2>
              <p className="section-copy">Customer tenants, onboarding state, domain posture, and activation status.</p>
            </div>
            <span className="queue-summary-chip"><strong>{tenantCounts.sandbox}</strong> sandbox tenants</span>
          </div>
          <label className="queue-toolbar__search">
            <span>Search</span>
            <input
              className="input-control"
              name="tenant_search"
              onChange={(event) => {
                setTenantQuery(event.target.value);
                setTenantPage(1);
              }}
              placeholder="Tenant, domain, plan, status"
              value={tenantQuery}
            />
          </label>

          <div className="employee-directory-list">
            {tenantPageData.items.map((tenant) => (
              <div className={`employee-directory-item${selectedTenant?.id === tenant.id ? " employee-directory-item--active" : ""}`} key={tenant.id}>
                <Link href={buildPanelHref("onboarding", tenant.id)}>
                  <div className="employee-directory-item__header">
                    <div>
                      <strong>{tenant.name}</strong>
                      <p className="section-copy">{tenant.code}</p>
                    </div>
                    <StatusChip value={tenant.onboarding_status} />
                  </div>
                  <div className="employee-directory-item__meta">
                    <span>{tenant.primary_domain || "No domain"}</span>
                    <span>{titleCase(tenant.subscription_plan)}</span>
                    <span>{tenant.is_sandbox ? "Sandbox" : "Live-ready"}</span>
                  </div>
                </Link>
              </div>
            ))}
            {!filteredTenants.length ? (
              <div className="notice">
                <strong>No tenants yet.</strong>
                <span className="muted">Create a tenant or clear the search.</span>
              </div>
            ) : null}
          </div>
          <PaginationBar
            hasNext={tenantPageData.hasNext}
            hasPrevious={tenantPageData.hasPrevious}
            onFirst={() => setTenantPage(1)}
            onLast={() => setTenantPage(Math.max(1, Math.ceil(filteredTenants.length / PAGE_SIZE)))}
            onNext={() => setTenantPage((current) => clampPage(current + 1, filteredTenants.length))}
            onPrevious={() => setTenantPage((current) => clampPage(current - 1, filteredTenants.length))}
            page={tenantPageData.page}
            pageSize={PAGE_SIZE}
            totalCount={filteredTenants.length}
          />
        </article>

        <article className="record-card">
          <div className="record-card__title-wrap">
            <div className="record-card__title">
              <h2>Create tenant</h2>
              <span className="record-chip">Modal flow</span>
            </div>
            <p className="section-copy">Start a new customer onboarding record only when the commercial and implementation context is ready.</p>
          </div>
          <div className="detail-grid">
            <DetailRow label="Required" value="Code and name" />
            <DetailRow label="Recommended" value="Domain, email, phone" />
            <DetailRow label="Default mode" value="Sandbox" />
            <DetailRow label="After create" value="Onboarding gates" />
          </div>
          <div className="form-actions-bar">
            <span className="muted">The tenant form opens in a focused dialog with validation notes.</span>
            <button className="button button--primary" type="button" onClick={() => setShowCreateTenantModal(true)}>
              Create tenant
            </button>
          </div>
        </article>
      </section>
      ) : null}

      {selectedTenant && onboarding ? (
        <>
          {initialPanel === "onboarding" ? (
          <section className="section support-session-grid" data-testid="platform-admin-onboarding-panel">
            <article className="record-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>{selectedTenant.name}</h2>
                  <StatusChip value={selectedTenant.status} />
                </div>
                <p className="section-copy">{selectedTenant.code}</p>
              </div>
              <div className="detail-grid">
                <DetailRow label="Onboarding Status" value={selectedTenant.onboarding_status} />
                <DetailRow label="Primary Domain" value={selectedTenant.primary_domain} />
                <DetailRow label="Plan" value={selectedTenant.subscription_plan} />
                <DetailRow label="Seed Pack" value={selectedTenant.seed_pack} />
                <DetailRow label="Country" value={selectedTenant.country_code} />
                <DetailRow label="Timezone" value={selectedTenant.timezone} />
              </div>
            </article>

            <article className="record-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Launch checklist</h2>
                  <StatusChip value={onboarding.tenant_onboarding_status} />
                </div>
                <p className="section-copy">Follow these steps in order to make the customer ready for launch.</p>
              </div>
              <ol className="platform-guided-checklist" aria-label="Guided tenant launch checklist">
                {guidedChecklist.map((step, index) => (
                  <GuidedChecklistItem
                    actionHref={step.actionHref}
                    actionLabel={step.actionLabel}
                    detail={step.detail}
                    index={index + 1}
                    key={step.title}
                    status={step.status}
                    title={step.title}
                  />
                ))}
              </ol>
              <div className="platform-gate-divider" />
              <p className="section-copy">Readiness gates and timestamps</p>
              <ol className="platform-gate-checklist" aria-label="Activation gate validation checklist">
                <GateChecklistItem
                  complete={hasBaseline}
                  label="Initial setup confirmed"
                  detail={hasBaseline ? `Confirmed ${formatDateTime(onboarding.baseline_published_at)}` : "Apply a published setup template, then confirm setup."}
                />
                <GateChecklistItem
                  complete={hasProvisionedPrimaryAdmin}
                  label="Primary tenant admin has login access"
                  detail={hasProvisionedPrimaryAdmin ? `${primaryContact?.email || "Primary admin"} has tenant access.` : `Create login access for ${primaryContact?.email || "the primary contact"} from Tenant Admin Users.`}
                />
                <GateChecklistItem
                  complete={Boolean(onboarding.handoff_completed_at)}
                  label="Ready for tenant admin"
                  detail={onboarding.handoff_completed_at ? `Marked ${formatDateTime(onboarding.handoff_completed_at)}` : "Available after setup confirmation and primary admin access are complete."}
                />
              </ol>
              <div className="form-actions-bar">
                <span className="muted">Setup confirmed at: {formatDateTime(onboarding.baseline_published_at)}</span>
                <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => handleTenantAction("mark-baseline-published")}>Confirm setup</button>
              </div>
              <div className="form-actions-bar">
                <span className="muted">Ready for tenant admin at: {formatDateTime(onboarding.handoff_completed_at)}</span>
                <button className="button button--secondary" disabled={Boolean(busyRef) || !canMarkHandoff} type="button" onClick={() => handleTenantAction("mark-handoff-ready")}>Mark ready</button>
              </div>
              <div className="form-actions-bar">
                <span className="muted">Primary admin: {primaryContact?.email || "Not set"}</span>
                <button className="button button--primary" disabled={Boolean(busyRef) || !canActivateTenant} type="button" onClick={() => handleTenantAction("activate")}>Activate tenant</button>
              </div>
              {!hasBaseline ? (
                <div className="notice notice--compact platform-gate-next-step">
                  <strong>Initial setup must be confirmed first.</strong>
                  <span className="muted">Apply a published setup template, then confirm setup for this tenant.</span>
                  <Link className="button button--secondary" href={buildPanelHref("policy-packs", selectedTenant.id)}>Open setup templates</Link>
                </div>
              ) : null}
              {hasBaseline && !hasProvisionedPrimaryAdmin ? (
                <div className="notice notice--compact platform-gate-next-step">
                  <strong>Primary tenant admin needs login access before this customer can be marked ready.</strong>
                  <span className="muted">Open Tenant Admin Users, create login access for {primaryContact?.email || "the primary contact"}, then return here.</span>
                  <Link className="button button--secondary" href={buildPanelHref("admins", selectedTenant.id)}>Open tenant admin users</Link>
                </div>
              ) : null}
            </article>
          </section>
          ) : null}

          {initialPanel === "onboarding" ? (
          <section className="section support-session-grid">
            <article className="record-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Edit tenant setup</h2>
                </div>
                <p className="section-copy">Update tenant account fields and primary domain.</p>
              </div>
              <form className="form-grid" onSubmit={handleTenantPatch}>
                <div className="notice notice--compact platform-validation-strip">
                  <strong>Tenant setup validation</strong>
                  <span className="muted">Save setup changes before confirming setup or marking the customer ready so the audit trail has the final customer context.</span>
                </div>
                <label className="form-field"><span className="muted">Name</span><input className="input-control" name="name" required defaultValue={selectedTenant.name} /><ValidationNote>Required. This appears in platform lists and customer setup screens.</ValidationNote></label>
                <label className="form-field"><span className="muted">Legal name</span><input className="input-control" name="legal_name" defaultValue={selectedTenant.legal_name} /></label>
                <label className="form-field"><span className="muted">Status</span><select className="input-control" name="status" defaultValue={selectedTenant.status}><option value="draft">Draft</option><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
                <label className="form-field"><span className="muted">Plan</span><select className="input-control" name="subscription_plan" defaultValue={selectedTenant.subscription_plan}><option value="starter">Starter</option><option value="growth">Growth</option><option value="enterprise">Enterprise</option></select></label>
                <label className="form-field"><span className="muted">Seed pack</span><select className="input-control" name="seed_pack" defaultValue={selectedTenant.seed_pack}><option value="standard_office">Standard Office</option><option value="shift_based">Shift Based Operations</option><option value="retail_field">Retail or Field Workforce</option><option value="professional_services">Professional Services</option></select></label>
                <label className="form-field"><span className="muted">Primary email</span><input className="input-control" name="primary_email" type="email" defaultValue={selectedTenant.primary_email} /></label>
                <label className="form-field"><span className="muted">Primary phone</span><input className="input-control" name="primary_phone" defaultValue={selectedTenant.primary_phone} /></label>
                <label className="form-field"><span className="muted">Primary domain</span><input className="input-control" name="primary_domain" defaultValue={selectedTenant.primary_domain} /></label>
                <label className="form-field"><span className="muted">Timezone</span><input className="input-control" name="timezone" defaultValue={selectedTenant.timezone} /></label>
                <label className="form-field"><span className="muted">Country</span><input className="input-control" name="country_code" defaultValue={selectedTenant.country_code} maxLength={2} /></label>
                <label className="form-field"><span className="muted">Sandbox</span><input name="is_sandbox" type="checkbox" defaultChecked={selectedTenant.is_sandbox} /></label>
                <div className="form-actions-bar">
                  <span className="muted">Tenant changes write onboarding event evidence.</span>
                  <button className="button button--primary" disabled={Boolean(busyRef)} type="submit">Save tenant</button>
                </div>
              </form>
            </article>

            <article className="record-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Onboarding metadata</h2>
                </div>
                <p className="section-copy">Implementation model, setup style, data approach, and policy control posture.</p>
              </div>
              <form className="form-grid" onSubmit={handleOnboardingPatch}>
                <div className="notice notice--compact platform-validation-strip">
                  <strong>Onboarding validation</strong>
                  <span className="muted">Choose who owns setup, how data enters the tenant, and whether policies are locked or delegated before the customer is marked ready.</span>
                </div>
                <label className="form-field"><span className="muted">Owner mode</span><select className="input-control" name="owner_mode" defaultValue={onboarding.owner_mode}><option value="combined_platform_admin">Combined Platform Admin</option><option value="split_platform_roles">Split Platform Roles</option></select></label>
                <label className="form-field"><span className="muted">Setup style</span><select className="input-control" name="setup_style" defaultValue={onboarding.setup_style}><option value="platform_assisted">Platform Assisted</option><option value="shared">Shared</option><option value="customer_led">Customer Led</option></select></label>
                <label className="form-field"><span className="muted">Data setup</span><select className="input-control" name="data_setup_style" defaultValue={onboarding.data_setup_style}><option value="manual">Manual</option><option value="import_led">Import Led</option><option value="seeded_demo">Seeded Demo</option></select></label>
                <label className="form-field"><span className="muted">Policy control</span><select className="input-control" name="policy_control_style" defaultValue={onboarding.policy_control_style}><option value="mostly_locked">Mostly Locked</option><option value="mostly_delegated">Mostly Delegated</option><option value="mixed">Mixed</option></select></label>
                <label className="form-field"><span className="muted">Country context</span><input className="input-control" name="country_context" defaultValue={onboarding.country_context} maxLength={2} /></label>
                <label className="form-field"><span className="muted">Industry</span><input className="input-control" name="industry_context" defaultValue={onboarding.industry_context} /></label>
                <label className="form-field"><span className="muted">Notes</span><textarea className="input-control" name="notes" defaultValue={onboarding.notes} /></label>
                <label className="form-field"><span className="muted">Internal readiness notes</span><textarea className="input-control" name="internal_handoff_notes" defaultValue={onboarding.internal_handoff_notes} /></label>
                <label className="form-field"><span className="muted">Customer readiness notes</span><textarea className="input-control" name="customer_handoff_notes" defaultValue={onboarding.customer_handoff_notes} /></label>
                <div className="form-actions-bar">
                  <span className="muted">Prepared tenants move out of created state.</span>
                  <button className="button button--primary" disabled={Boolean(busyRef)} type="submit">Save onboarding</button>
                </div>
              </form>
            </article>
          </section>
          ) : null}

          {initialPanel === "admins" ? (
          <section className="section support-session-grid platform-admin-users-grid" data-testid="platform-admin-admins-panel">
            <article className="record-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Admin contacts</h2>
                  <span className="record-chip">{onboarding.admin_contacts.length} contacts</span>
                </div>
                <p className="section-copy">Primary customer admin contact and login access state.</p>
              </div>
              <div className="tenant-support-access-list">
                {onboarding.admin_contacts.map((contact: PlatformOnboardingAdminContact) => (
                  <div className="tenant-support-access-row tenant-support-access-row--stacked" key={contact.id}>
                    {editingContactId === contact.id ? (
                      <form className="form-grid platform-contact-edit-form" onSubmit={(event) => handleContactPatch(event, contact.id)}>
                        <div className="notice notice--compact platform-validation-strip">
                          <strong>Edit contact validation</strong>
                          <span className="muted">This updates onboarding contact details. It does not reset the provisioned user password or role.</span>
                        </div>
                        <label className="form-field"><span className="muted">Full name</span><input className="input-control" name="full_name" required defaultValue={contact.full_name} /><ValidationNote>Required. Use the current customer-side admin owner.</ValidationNote></label>
                        <label className="form-field"><span className="muted">Email</span><input className="input-control" name="email" required type="email" defaultValue={contact.email} /><ValidationNote>Required. For provisioned contacts, coordinate any login identity changes separately.</ValidationNote></label>
                        <label className="form-field"><span className="muted">Phone</span><input className="input-control" name="phone_number" defaultValue={contact.phone_number} /></label>
                        <label className="form-field"><span className="muted">Job title</span><input className="input-control" name="job_title" defaultValue={contact.job_title} /></label>
                        <label className="form-field"><span className="muted">Primary</span><input name="is_primary" type="checkbox" defaultChecked={contact.is_primary} /></label>
                        <label className="form-field"><span className="muted">Notes</span><textarea className="input-control" name="notes" defaultValue={contact.notes} /></label>
                        <div className="form-actions-bar">
                          <span className="muted">Saving writes an admin contact update event.</span>
                          <div className="button-row">
                            <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => setEditingContactId("")}>Cancel</button>
                            <button className="button button--primary" disabled={Boolean(busyRef)} type="submit">Save contact</button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div>
                          <strong>{contact.full_name}</strong>
                          <span>{contact.email}</span>
                          <span>{contact.job_title || "Job title not set"} - {contact.phone_number || "Phone not set"}</span>
                        </div>
                        <StatusChip value={contact.provisioning_status} />
                        <span className="record-chip">{contact.is_primary ? "Primary" : "Secondary"}</span>
                        <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => setEditingContactId(contact.id)}>Edit</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
                <div className="form-actions-bar">
                  <span className="muted">Add or edit contacts before creating the first tenant admin login.</span>
                  <button className="button button--primary" type="button" onClick={() => setShowAddContactModal(true)}>Add contact</button>
                </div>
            </article>

            <article className="record-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Create tenant admin login</h2>
                  <span className="record-chip">{provisionableContacts.length} ready</span>
                </div>
                <p className="section-copy">Create the tenant-scoped login and membership from a contact.</p>
              </div>
              <form className="form-grid" onSubmit={handleProvision}>
                {!provisionableContacts.length ? (
                  <div className="notice notice--compact platform-validation-strip">
                    <strong>No contacts are ready for login access.</strong>
                    <span className="muted">Add a primary contact first, or select a tenant whose primary contact does not already have login access.</span>
                  </div>
                ) : (
                  <div className="notice notice--compact platform-validation-strip">
                    <strong>Before creating login access</strong>
                    <span className="muted">Select the primary contact, choose the tenant role, and enter a password only if you do not want the system to generate one.</span>
                  </div>
                )}
                <label className="form-field"><span className="muted">Contact</span><select className="input-control" name="contact_id" defaultValue={primaryContact?.membership_id ? provisionableContacts[0]?.id ?? "" : primaryContact?.id ?? ""} required><option value="">Select contact</option>{provisionableContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.full_name} - {contact.email}</option>)}</select></label>
                <label className="form-field"><span className="muted">Username</span><input className="input-control" name="username" required placeholder="tenant01.admin" /><ValidationNote>Required and must be unique across logins.</ValidationNote></label>
                <label className="form-field"><span className="muted">Role</span><select className="input-control" name="role_code" defaultValue="hr-admin"><option value="hr-admin">HR Admin</option><option value="tenant-admin">Tenant Admin</option></select></label>
                <label className="form-field"><span className="muted">Role name</span><input className="input-control" name="role_name" placeholder="HR Admin" /></label>
                <label className="form-field"><span className="muted">Password</span><input className="input-control" name="password" type="password" placeholder="Leave blank to generate" /></label>
                <label className="form-field"><span className="muted">Membership</span><select className="input-control" name="membership_status" defaultValue="active"><option value="active">Active</option><option value="invited">Invited</option></select></label>
                <label className="form-field"><span className="muted">Must change password</span><input name="must_change_password" type="checkbox" defaultChecked /></label>
                <label className="form-field"><span className="muted">User active</span><input name="is_user_active" type="checkbox" defaultChecked /></label>
                <div className="form-actions-bar">
                  <span className="muted">Creating login access completes the primary tenant-admin checklist item.</span>
                  <button className="button button--primary" disabled={Boolean(busyRef) || !provisionableContacts.length} type="submit">Create login access</button>
                </div>
              </form>
            </article>
          </section>
          ) : null}

          {initialPanel === "policy-packs" ? (
          <section className="section support-session-grid" data-testid="platform-admin-policy-packs-panel">
            <article className="record-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Setup templates</h2>
                  <span className="record-chip">{policyPacks.length} packs</span>
                </div>
                <p className="section-copy">Platform-owned setup templates available for tenant onboarding.</p>
              </div>
              <label className="queue-toolbar__search">
                <span>Search</span>
                <input
                  className="input-control"
                  name="policy_pack_search"
                  onChange={(event) => {
                    setPolicyPackQuery(event.target.value);
                    setPolicyPackPage(1);
                  }}
                  placeholder="Pack, code, domain, status"
                  value={policyPackQuery}
                />
              </label>
              <div className="tenant-support-access-list">
                {policyPackPageData.items.map((pack) => (
                  <div className="tenant-support-access-row" key={pack.id}>
                    <div>
                      <strong>{pack.name}</strong>
                      <span>{pack.code} - {titleCase(pack.domain)} - v{pack.version}</span>
                    </div>
                    <StatusChip value={pack.status} />
                    <button className="button button--secondary" disabled={Boolean(busyRef) || pack.status === "published"} type="button" onClick={() => handlePublishPack(pack.id)}>Publish</button>
                  </div>
                ))}
                {!filteredPolicyPacks.length ? (
                  <div className="notice">
                    <strong>No setup templates match this view.</strong>
                    <span className="muted">Create a template or clear the search.</span>
                  </div>
                ) : null}
              </div>
              <PaginationBar
                hasNext={policyPackPageData.hasNext}
                hasPrevious={policyPackPageData.hasPrevious}
                onFirst={() => setPolicyPackPage(1)}
                onLast={() => setPolicyPackPage(Math.max(1, Math.ceil(filteredPolicyPacks.length / PAGE_SIZE)))}
                onNext={() => setPolicyPackPage((current) => clampPage(current + 1, filteredPolicyPacks.length))}
                onPrevious={() => setPolicyPackPage((current) => clampPage(current - 1, filteredPolicyPacks.length))}
                page={policyPackPageData.page}
                pageSize={PAGE_SIZE}
                totalCount={filteredPolicyPacks.length}
              />
              <form className="form-grid" onSubmit={handlePolicyPackCreate}>
                <div className="notice notice--compact platform-validation-strip">
                  <strong>Template validation</strong>
                  <span className="muted">Create as draft while the setup is still changing. Only published templates can be applied to tenants.</span>
                </div>
                <label className="form-field"><span className="muted">Code</span><input className="input-control" name="code" required placeholder="qa-setup-template" /><ValidationNote>Required and unique. Use a stable code because it appears in setup evidence.</ValidationNote></label>
                <label className="form-field"><span className="muted">Name</span><input className="input-control" name="name" required placeholder="QA Setup Template" /><ValidationNote>Required. Use a name operators can recognize during tenant onboarding.</ValidationNote></label>
                <label className="form-field"><span className="muted">Domain</span><select className="input-control" name="domain" defaultValue="leave"><option value="leave">Leave</option><option value="attendance">Attendance</option><option value="workflow">Workflow</option><option value="document">Document</option></select></label>
                <label className="form-field"><span className="muted">Status</span><select className="input-control" name="status" defaultValue="draft"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
                <label className="form-field"><span className="muted">Version</span><input className="input-control" name="version" defaultValue="1" min={1} type="number" /></label>
                <label className="form-field"><span className="muted">Country</span><input className="input-control" name="country_code" defaultValue="IN" maxLength={2} /></label>
                <label className="form-field"><span className="muted">Industry</span><input className="input-control" name="industry_tag" placeholder="technology" /></label>
                <label className="form-field"><span className="muted">Description</span><textarea className="input-control" name="description" /></label>
                <label className="form-field"><span className="muted">Active</span><input name="is_active" type="checkbox" defaultChecked /></label>
                <div className="form-actions-bar">
                  <span className="muted">Template items are managed by backend/admin until item-authoring UI is added.</span>
                  <button className="button button--primary" disabled={Boolean(busyRef)} type="submit">Create template</button>
                </div>
              </form>
            </article>

            <article className="record-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Apply setup template</h2>
                  <span className="record-chip">{publishedPacks.length} published</span>
                </div>
                <p className="section-copy">Apply a published platform setup template to the selected tenant.</p>
              </div>
              <form className="form-grid" onSubmit={handleAdoptPack}>
                {!canAdoptBaseline ? (
                  <div className="notice notice--compact platform-validation-strip">
                    <strong>Setup template cannot be applied yet.</strong>
                    <span className="muted">{selectedTenant ? "Publish at least one setup template before applying it." : "Select a tenant before applying a setup template."}</span>
                  </div>
                ) : (
                  <div className="notice notice--compact platform-validation-strip">
                    <strong>Before adoption</strong>
                    <span className="muted">Select a published template for the chosen tenant. Applying it creates setup evidence used by the readiness check.</span>
                  </div>
                )}
                <label className="form-field"><span className="muted">Published template</span><select className="input-control" name="policy_pack_id" required><option value="">Select template</option>{publishedPacks.map((pack) => <option key={pack.id} value={pack.id}>{pack.name} - {pack.code}</option>)}</select></label>
                <label className="form-field"><span className="muted">Apply mode</span><select className="input-control" name="adoption_mode" defaultValue="clone_to_tenant_records"><option value="clone_to_tenant_records">Copy To Tenant Records</option><option value="baseline_plus_tenant_overrides">Template Plus Tenant Overrides</option><option value="baseline_only">Template Only</option></select></label>
                <label className="form-field"><span className="muted">Notes</span><textarea className="input-control" name="notes" placeholder="Initial platform setup for onboarding." /></label>
                <div className="form-actions-bar">
                  <span className="muted">Applying the template writes setup evidence and onboarding history.</span>
                  <button className="button button--primary" disabled={Boolean(busyRef) || !canAdoptBaseline} type="submit">Apply template</button>
                </div>
              </form>

              <div className="detail-grid">
                {onboarding.checklist_items.map((item) => (
                  <DetailRow key={item.id} label={item.label} value={item.status} />
                ))}
              </div>
            </article>
          </section>
          ) : null}

          {initialPanel === "events" ? (
          <section className="section" data-testid="platform-admin-events-panel">
            <article className="record-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Onboarding events</h2>
                  <span className="record-chip">{onboarding.recent_events.length} recent</span>
                </div>
                <p className="section-copy">Latest platform-side evidence for the selected tenant.</p>
              </div>
              <label className="queue-toolbar__search">
                <span>Search</span>
                <input
                  className="input-control"
                  name="event_search"
                  onChange={(event) => {
                    setEventQuery(event.target.value);
                    setEventPage(1);
                  }}
                  placeholder="Event, actor, summary"
                  value={eventQuery}
                />
              </label>
              <div className="tenant-support-access-list">
                {eventPageData.items.map((event) => (
                  <div className="tenant-support-access-row" key={event.id}>
                    <div>
                      <strong>{titleCase(event.event_type)}</strong>
                      <span>{event.summary || "Event recorded."}</span>
                    </div>
                    <span className="record-chip">{event.actor_identifier || "system"}</span>
                    <span className="record-chip">{formatDateTime(event.created_at)}</span>
                  </div>
                ))}
                {!filteredEvents.length ? (
                  <div className="notice">
                    <strong>No onboarding events match this view.</strong>
                    <span className="muted">Clear the search or select a tenant with recorded events.</span>
                  </div>
                ) : null}
              </div>
              <PaginationBar
                hasNext={eventPageData.hasNext}
                hasPrevious={eventPageData.hasPrevious}
                onFirst={() => setEventPage(1)}
                onLast={() => setEventPage(Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE)))}
                onNext={() => setEventPage((current) => clampPage(current + 1, filteredEvents.length))}
                onPrevious={() => setEventPage((current) => clampPage(current - 1, filteredEvents.length))}
                page={eventPageData.page}
                pageSize={PAGE_SIZE}
                totalCount={filteredEvents.length}
              />
            </article>
          </section>
          ) : null}
        </>
      ) : null}
      {showCreateTenantModal ? (
        <div className="tenant-modal-shell" role="presentation">
          <div aria-label="Create platform tenant" aria-modal="true" className="tenant-modal" role="dialog">
            <div className="tenant-modal__header">
              <div>
                <span className="eyebrow">Tenant onboarding</span>
                <h3>Create tenant</h3>
              </div>
              <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => setShowCreateTenantModal(false)}>Close</button>
            </div>
            <form className="form-grid tenant-membership-form-grid--dialog" onSubmit={handleTenantCreate}>
              <div className="notice notice--compact platform-validation-strip form-field--full">
                <strong>Before creating</strong>
                <span className="muted">Code and name are mandatory. Email, phone, and domain can be completed later, but activation still needs tenant admin login access and readiness signoff.</span>
              </div>
              <label className="form-field"><span className="muted">Code</span><input className="input-control" name="code" required placeholder="qa-pa-tenant-01" /><ValidationNote>Required and unique. This becomes the tenant identifier in audit evidence.</ValidationNote></label>
              <label className="form-field"><span className="muted">Name</span><input className="input-control" name="name" required placeholder="QA Platform Tenant 01" /><ValidationNote>Required. Use the customer-facing organization name.</ValidationNote></label>
              <label className="form-field"><span className="muted">Legal name</span><input className="input-control" name="legal_name" placeholder="QA Platform Tenant Pvt Ltd" /></label>
              <label className="form-field"><span className="muted">Primary domain</span><input className="input-control" name="primary_domain" placeholder="qa-pa-tenant-01.example.test" /><ValidationNote>Optional for setup; should be final before live customer activation.</ValidationNote></label>
              <label className="form-field"><span className="muted">Primary email</span><input className="input-control" name="primary_email" type="email" placeholder="ops@example.test" /><ValidationNote>Use a monitored customer or implementation mailbox.</ValidationNote></label>
              <label className="form-field"><span className="muted">Primary phone</span><input className="input-control" name="primary_phone" placeholder="+91 90000 00001" /></label>
              <label className="form-field"><span className="muted">Plan</span><select className="input-control" name="subscription_plan" defaultValue="starter"><option value="starter">Starter</option><option value="growth">Growth</option><option value="enterprise">Enterprise</option></select></label>
              <label className="form-field"><span className="muted">Seed pack</span><select className="input-control" name="seed_pack" defaultValue="standard_office"><option value="standard_office">Standard Office</option><option value="shift_based">Shift Based Operations</option><option value="retail_field">Retail or Field Workforce</option><option value="professional_services">Professional Services</option></select></label>
              <label className="form-field"><span className="muted">Timezone</span><input className="input-control" name="timezone" defaultValue="Asia/Kolkata" /></label>
              <label className="form-field"><span className="muted">Country</span><input className="input-control" name="country_code" defaultValue="IN" maxLength={2} /></label>
              <label className="form-field"><span className="muted">Sandbox</span><input name="is_sandbox" type="checkbox" defaultChecked /></label>
              <div className="tenant-modal__actions form-field--full">
                <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => setShowCreateTenantModal(false)}>Cancel</button>
                <button className="button button--primary" disabled={Boolean(busyRef)} type="submit">
                  {busyRef === "/api/platform/tenants" ? "Creating..." : "Create tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {showAddContactModal && selectedTenant ? (
        <div className="tenant-modal-shell" role="presentation">
          <div aria-label="Add platform admin contact" aria-modal="true" className="tenant-modal" role="dialog">
            <div className="tenant-modal__header">
              <div>
                <span className="eyebrow">First admin</span>
                <h3>Add admin contact</h3>
              </div>
              <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => setShowAddContactModal(false)}>Close</button>
            </div>
            <form className="form-grid tenant-membership-form-grid--dialog" onSubmit={handleContactCreate}>
              <div className="notice notice--compact platform-validation-strip form-field--full">
                <strong>Contact validation</strong>
                <span className="muted">A primary contact is required before the customer can be marked ready. Make sure the email belongs to the real tenant admin.</span>
              </div>
              <label className="form-field"><span className="muted">Full name</span><input className="input-control" name="full_name" required placeholder="Ava Patel" /><ValidationNote>Required. This person becomes the customer-side owner for onboarding.</ValidationNote></label>
              <label className="form-field"><span className="muted">Email</span><input className="input-control" name="email" required type="email" placeholder="ava.patel@example.test" /><ValidationNote>Required and used for the provisioned login identity.</ValidationNote></label>
              <label className="form-field"><span className="muted">Phone</span><input className="input-control" name="phone_number" placeholder="+91 90000 00002" /></label>
              <label className="form-field"><span className="muted">Job title</span><input className="input-control" name="job_title" placeholder="Head of People" /></label>
              <label className="form-field"><span className="muted">Primary</span><input name="is_primary" type="checkbox" defaultChecked /></label>
              <label className="form-field"><span className="muted">Notes</span><textarea className="input-control" name="notes" /></label>
              <div className="tenant-modal__actions form-field--full">
                <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => setShowAddContactModal(false)}>Cancel</button>
                <button className="button button--primary" disabled={Boolean(busyRef)} type="submit">Add contact</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
