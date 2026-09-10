"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import type {
  PlatformOnboardingAdminContact,
  PlatformPolicyPackListItem,
  PlatformTenantListItem,
  PlatformTenantOnboarding,
} from "@/lib/types";

type Props = {
  initialPanel: PlatformPanel;
  tenants: PlatformTenantListItem[];
  selectedTenant: PlatformTenantListItem | null;
  onboarding: PlatformTenantOnboarding | null;
  policyPacks: PlatformPolicyPackListItem[];
};

type MutationMethod = "POST" | "PATCH";
type PlatformPanel = "tenants" | "onboarding" | "admins" | "policy-packs" | "events";

const PAGE_SIZE = 8;

const platformTabs: { panel: PlatformPanel; label: string; countKey: "tenants" | "onboarding" | "admins" | "policyPacks" | "events" }[] = [
  { panel: "tenants", label: "Tenants", countKey: "tenants" },
  { panel: "onboarding", label: "Onboarding", countKey: "onboarding" },
  { panel: "admins", label: "Admins", countKey: "admins" },
  { panel: "policy-packs", label: "Policy Packs", countKey: "policyPacks" },
  { panel: "events", label: "Events", countKey: "events" },
];

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string") return record.detail;
  const firstEntry = Object.values(record).find((value) => Array.isArray(value) || typeof value === "string");
  if (Array.isArray(firstEntry) && firstEntry.length) return String(firstEntry[0]);
  if (typeof firstEntry === "string") return firstEntry;
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
  const params = new URLSearchParams({ panel });
  if (selectedTenantId) params.set("tenantId", selectedTenantId);
  return `/platform-admin?${params.toString()}`;
}

export function PlatformAdminConsole({ initialPanel, tenants, selectedTenant, onboarding, policyPacks }: Props) {
  const router = useRouter();
  const [busyRef, setBusyRef] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [tenantQuery, setTenantQuery] = useState("");
  const [policyPackQuery, setPolicyPackQuery] = useState("");
  const [eventQuery, setEventQuery] = useState("");
  const [tenantPage, setTenantPage] = useState(1);
  const [policyPackPage, setPolicyPackPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);

  const tenantCounts = useMemo(() => {
    return {
      active: tenants.filter((tenant) => tenant.status === "active").length,
      onboarding: tenants.filter((tenant) => tenant.onboarding_status !== "active").length,
      sandbox: tenants.filter((tenant) => tenant.is_sandbox).length,
      publishedPacks: policyPacks.filter((pack) => pack.status === "published").length,
    };
  }, [policyPacks, tenants]);

  const provisionableContacts = onboarding?.admin_contacts.filter((contact) => !contact.membership_id) ?? [];
  const primaryContact = onboarding?.admin_contacts.find((contact) => contact.is_primary) ?? onboarding?.admin_contacts[0] ?? null;
  const publishedPacks = policyPacks.filter((pack) => pack.status === "published");
  const events = onboarding?.recent_events ?? [];
  const normalizedTenantQuery = tenantQuery.trim().toLowerCase();
  const normalizedPolicyPackQuery = policyPackQuery.trim().toLowerCase();
  const normalizedEventQuery = eventQuery.trim().toLowerCase();
  const filteredTenants = normalizedTenantQuery
    ? tenants.filter((tenant) => [tenant.name, tenant.code, tenant.primary_domain, tenant.subscription_plan, tenant.onboarding_status].join(" ").toLowerCase().includes(normalizedTenantQuery))
    : tenants;
  const filteredPolicyPacks = normalizedPolicyPackQuery
    ? policyPacks.filter((pack) => [pack.name, pack.code, pack.domain, pack.status, pack.country_code, pack.industry_tag].join(" ").toLowerCase().includes(normalizedPolicyPackQuery))
    : policyPacks;
  const filteredEvents = normalizedEventQuery
    ? events.filter((event) => [event.event_type, event.summary, event.actor_identifier, event.created_at].join(" ").toLowerCase().includes(normalizedEventQuery))
    : events;
  const tenantPageData = paginate(filteredTenants, tenantPage);
  const policyPackPageData = paginate(filteredPolicyPacks, policyPackPage);
  const eventPageData = paginate(filteredEvents, eventPage);
  const tabCounts = {
    tenants: tenants.length,
    onboarding: selectedTenant && onboarding ? 2 : 0,
    admins: onboarding?.admin_contacts.length ?? 0,
    policyPacks: policyPacks.length,
    events: events.length,
  };

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
      router.push(buildPanelHref("onboarding", payload.id));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Tenant creation failed.");
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
      event.currentTarget.reset();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Admin contact creation failed.");
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
        title="Platform Admin Console"
        description="Create tenants, prepare onboarding, provision first admins, publish baselines, and activate customer handoff."
        actions={
          <>
            <Link className="button button--secondary" href="/">
              Home
            </Link>
            {selectedTenant ? (
              <Link className="button button--primary" href={`/platform-admin?tenantId=${selectedTenant.id}&panel=onboarding`}>
                Open selected tenant
              </Link>
            ) : null}
          </>
        }
        pills={["Tenant onboarding", "Policy baselines", "First admin provisioning", "Activation gates"]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Tenants" value={tenants.length} trend="Platform catalog" />
          <MetricTile label="Active tenants" value={tenantCounts.active} trend="Activated" />
          <MetricTile label="Onboarding" value={tenantCounts.onboarding} trend="Not yet active" />
          <MetricTile label="Published packs" value={tenantCounts.publishedPacks} trend={`${policyPacks.length} total packs`} />
        </div>
      </section>

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
            </div>
            <p className="section-copy">Start a new customer onboarding record and primary domain mapping.</p>
          </div>
          <form className="form-grid" onSubmit={handleTenantCreate}>
            <label className="form-field"><span className="muted">Code</span><input className="input-control" name="code" required placeholder="qa-pa-tenant-01" /></label>
            <label className="form-field"><span className="muted">Name</span><input className="input-control" name="name" required placeholder="QA Platform Tenant 01" /></label>
            <label className="form-field"><span className="muted">Legal name</span><input className="input-control" name="legal_name" placeholder="QA Platform Tenant Pvt Ltd" /></label>
            <label className="form-field"><span className="muted">Primary domain</span><input className="input-control" name="primary_domain" placeholder="qa-pa-tenant-01.example.test" /></label>
            <label className="form-field"><span className="muted">Primary email</span><input className="input-control" name="primary_email" type="email" placeholder="ops@example.test" /></label>
            <label className="form-field"><span className="muted">Primary phone</span><input className="input-control" name="primary_phone" placeholder="+91 90000 00001" /></label>
            <label className="form-field"><span className="muted">Plan</span><select className="input-control" name="subscription_plan" defaultValue="starter"><option value="starter">Starter</option><option value="growth">Growth</option><option value="enterprise">Enterprise</option></select></label>
            <label className="form-field"><span className="muted">Seed pack</span><select className="input-control" name="seed_pack" defaultValue="standard_office"><option value="standard_office">Standard Office</option><option value="shift_based">Shift Based Operations</option><option value="retail_field">Retail or Field Workforce</option><option value="professional_services">Professional Services</option></select></label>
            <label className="form-field"><span className="muted">Timezone</span><input className="input-control" name="timezone" defaultValue="Asia/Kolkata" /></label>
            <label className="form-field"><span className="muted">Country</span><input className="input-control" name="country_code" defaultValue="IN" maxLength={2} /></label>
            <label className="form-field"><span className="muted">Sandbox</span><input name="is_sandbox" type="checkbox" defaultChecked /></label>
            <div className="form-actions-bar">
              <span className="muted">Creates tenant, onboarding record, checklist evidence, and domain mapping.</span>
              <button className="button button--primary" disabled={Boolean(busyRef)} type="submit">
                {busyRef === "/api/platform/tenants" ? "Creating..." : "Create tenant"}
              </button>
            </div>
          </form>
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
                  <h2>Activation gates</h2>
                  <StatusChip value={onboarding.tenant_onboarding_status} />
                </div>
                <p className="section-copy">Baseline, handoff, and active tenant state transitions.</p>
              </div>
              <div className="form-actions-bar">
                <span className="muted">Baseline timestamp: {formatDateTime(onboarding.baseline_published_at)}</span>
                <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => handleTenantAction("mark-baseline-published")}>Mark baseline</button>
              </div>
              <div className="form-actions-bar">
                <span className="muted">Handoff timestamp: {formatDateTime(onboarding.handoff_completed_at)}</span>
                <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => handleTenantAction("mark-handoff-ready")}>Mark handoff</button>
              </div>
              <div className="form-actions-bar">
                <span className="muted">Primary admin: {primaryContact?.email || "Not set"}</span>
                <button className="button button--primary" disabled={Boolean(busyRef)} type="button" onClick={() => handleTenantAction("activate")}>Activate tenant</button>
              </div>
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
                <label className="form-field"><span className="muted">Name</span><input className="input-control" name="name" required defaultValue={selectedTenant.name} /></label>
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
                <label className="form-field"><span className="muted">Owner mode</span><select className="input-control" name="owner_mode" defaultValue={onboarding.owner_mode}><option value="combined_platform_admin">Combined Platform Admin</option><option value="split_platform_roles">Split Platform Roles</option></select></label>
                <label className="form-field"><span className="muted">Setup style</span><select className="input-control" name="setup_style" defaultValue={onboarding.setup_style}><option value="platform_assisted">Platform Assisted</option><option value="shared">Shared</option><option value="customer_led">Customer Led</option></select></label>
                <label className="form-field"><span className="muted">Data setup</span><select className="input-control" name="data_setup_style" defaultValue={onboarding.data_setup_style}><option value="manual">Manual</option><option value="import_led">Import Led</option><option value="seeded_demo">Seeded Demo</option></select></label>
                <label className="form-field"><span className="muted">Policy control</span><select className="input-control" name="policy_control_style" defaultValue={onboarding.policy_control_style}><option value="mostly_locked">Mostly Locked</option><option value="mostly_delegated">Mostly Delegated</option><option value="mixed">Mixed</option></select></label>
                <label className="form-field"><span className="muted">Country context</span><input className="input-control" name="country_context" defaultValue={onboarding.country_context} maxLength={2} /></label>
                <label className="form-field"><span className="muted">Industry</span><input className="input-control" name="industry_context" defaultValue={onboarding.industry_context} /></label>
                <label className="form-field"><span className="muted">Notes</span><textarea className="input-control" name="notes" defaultValue={onboarding.notes} /></label>
                <label className="form-field"><span className="muted">Internal handoff</span><textarea className="input-control" name="internal_handoff_notes" defaultValue={onboarding.internal_handoff_notes} /></label>
                <label className="form-field"><span className="muted">Customer handoff</span><textarea className="input-control" name="customer_handoff_notes" defaultValue={onboarding.customer_handoff_notes} /></label>
                <div className="form-actions-bar">
                  <span className="muted">Prepared tenants move out of created state.</span>
                  <button className="button button--primary" disabled={Boolean(busyRef)} type="submit">Save onboarding</button>
                </div>
              </form>
            </article>
          </section>
          ) : null}

          {initialPanel === "admins" ? (
          <section className="section support-session-grid" data-testid="platform-admin-admins-panel">
            <article className="record-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Admin contacts</h2>
                  <span className="record-chip">{onboarding.admin_contacts.length} contacts</span>
                </div>
                <p className="section-copy">Primary customer admin contact and provisioned login state.</p>
              </div>
              <div className="tenant-support-access-list">
                {onboarding.admin_contacts.map((contact: PlatformOnboardingAdminContact) => (
                  <div className="tenant-support-access-row" key={contact.id}>
                    <div>
                      <strong>{contact.full_name}</strong>
                      <span>{contact.email}</span>
                    </div>
                    <StatusChip value={contact.provisioning_status} />
                    <span className="record-chip">{contact.is_primary ? "Primary" : "Secondary"}</span>
                  </div>
                ))}
              </div>
              <form className="form-grid" onSubmit={handleContactCreate}>
                <label className="form-field"><span className="muted">Full name</span><input className="input-control" name="full_name" required placeholder="Ava Patel" /></label>
                <label className="form-field"><span className="muted">Email</span><input className="input-control" name="email" required type="email" placeholder="ava.patel@example.test" /></label>
                <label className="form-field"><span className="muted">Phone</span><input className="input-control" name="phone_number" placeholder="+91 90000 00002" /></label>
                <label className="form-field"><span className="muted">Job title</span><input className="input-control" name="job_title" placeholder="Head of People" /></label>
                <label className="form-field"><span className="muted">Primary</span><input name="is_primary" type="checkbox" defaultChecked /></label>
                <label className="form-field"><span className="muted">Notes</span><textarea className="input-control" name="notes" /></label>
                <div className="form-actions-bar">
                  <span className="muted">A new primary contact supersedes the previous primary marker.</span>
                  <button className="button button--primary" disabled={Boolean(busyRef)} type="submit">Add contact</button>
                </div>
              </form>
            </article>

            <article className="record-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Provision first admin</h2>
                  <span className="record-chip">{provisionableContacts.length} ready</span>
                </div>
                <p className="section-copy">Create the tenant-scoped login and membership from a contact.</p>
              </div>
              <form className="form-grid" onSubmit={handleProvision}>
                <label className="form-field"><span className="muted">Contact</span><select className="input-control" name="contact_id" defaultValue={primaryContact?.membership_id ? provisionableContacts[0]?.id ?? "" : primaryContact?.id ?? ""} required><option value="">Select contact</option>{provisionableContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.full_name} - {contact.email}</option>)}</select></label>
                <label className="form-field"><span className="muted">Username</span><input className="input-control" name="username" required placeholder="tenant01.admin" /></label>
                <label className="form-field"><span className="muted">Role</span><select className="input-control" name="role_code" defaultValue="hr-admin"><option value="hr-admin">HR Admin</option><option value="tenant-admin">Tenant Admin</option></select></label>
                <label className="form-field"><span className="muted">Role name</span><input className="input-control" name="role_name" placeholder="HR Admin" /></label>
                <label className="form-field"><span className="muted">Password</span><input className="input-control" name="password" type="password" placeholder="Leave blank to generate" /></label>
                <label className="form-field"><span className="muted">Membership</span><select className="input-control" name="membership_status" defaultValue="active"><option value="active">Active</option><option value="invited">Invited</option></select></label>
                <label className="form-field"><span className="muted">Must change password</span><input name="must_change_password" type="checkbox" defaultChecked /></label>
                <label className="form-field"><span className="muted">User active</span><input name="is_user_active" type="checkbox" defaultChecked /></label>
                <div className="form-actions-bar">
                  <span className="muted">Provisioning completes the first-admin checklist item.</span>
                  <button className="button button--primary" disabled={Boolean(busyRef) || !provisionableContacts.length} type="submit">Provision admin</button>
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
                  <h2>Policy packs</h2>
                  <span className="record-chip">{policyPacks.length} packs</span>
                </div>
                <p className="section-copy">Platform-owned baseline packs available for tenant adoption.</p>
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
                    <strong>No policy packs match this view.</strong>
                    <span className="muted">Create a pack or clear the search.</span>
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
                <label className="form-field"><span className="muted">Code</span><input className="input-control" name="code" required placeholder="qa-baseline-pack" /></label>
                <label className="form-field"><span className="muted">Name</span><input className="input-control" name="name" required placeholder="QA Baseline Pack" /></label>
                <label className="form-field"><span className="muted">Domain</span><select className="input-control" name="domain" defaultValue="leave"><option value="leave">Leave</option><option value="attendance">Attendance</option><option value="workflow">Workflow</option><option value="document">Document</option></select></label>
                <label className="form-field"><span className="muted">Status</span><select className="input-control" name="status" defaultValue="draft"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
                <label className="form-field"><span className="muted">Version</span><input className="input-control" name="version" defaultValue="1" min={1} type="number" /></label>
                <label className="form-field"><span className="muted">Country</span><input className="input-control" name="country_code" defaultValue="IN" maxLength={2} /></label>
                <label className="form-field"><span className="muted">Industry</span><input className="input-control" name="industry_tag" placeholder="technology" /></label>
                <label className="form-field"><span className="muted">Description</span><textarea className="input-control" name="description" /></label>
                <label className="form-field"><span className="muted">Active</span><input name="is_active" type="checkbox" defaultChecked /></label>
                <div className="form-actions-bar">
                  <span className="muted">Pack items are managed by backend/admin until item-authoring UI is added.</span>
                  <button className="button button--primary" disabled={Boolean(busyRef)} type="submit">Create pack</button>
                </div>
              </form>
            </article>

            <article className="record-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Adopt baseline</h2>
                  <span className="record-chip">{publishedPacks.length} published</span>
                </div>
                <p className="section-copy">Apply a published platform pack to the selected tenant.</p>
              </div>
              <form className="form-grid" onSubmit={handleAdoptPack}>
                <label className="form-field"><span className="muted">Published pack</span><select className="input-control" name="policy_pack_id" required><option value="">Select pack</option>{publishedPacks.map((pack) => <option key={pack.id} value={pack.id}>{pack.name} - {pack.code}</option>)}</select></label>
                <label className="form-field"><span className="muted">Adoption mode</span><select className="input-control" name="adoption_mode" defaultValue="clone_to_tenant_records"><option value="clone_to_tenant_records">Clone To Tenant Records</option><option value="baseline_plus_tenant_overrides">Baseline Plus Tenant Overrides</option><option value="baseline_only">Baseline Only</option></select></label>
                <label className="form-field"><span className="muted">Notes</span><textarea className="input-control" name="notes" placeholder="Initial platform baseline for onboarding." /></label>
                <div className="form-actions-bar">
                  <span className="muted">Adoption marks baseline evidence and writes onboarding history.</span>
                  <button className="button button--primary" disabled={Boolean(busyRef) || !publishedPacks.length} type="submit">Adopt pack</button>
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
    </main>
  );
}
