import Link from "next/link";
import { redirect } from "next/navigation";

import { DataGovernanceWorkbench } from "@/components/governance/data-governance-workbench";
import { PageIntro } from "@/components/patterns/page-intro";
import { getPlatformDataGovernanceWorkspace, getPlatformTenants } from "@/lib/api";
import { requirePlatformAdminAccess } from "@/lib/workspace-access";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function PlatformDataGovernancePage({ searchParams }: PageProps) {
  await requirePlatformAdminAccess();
  const params = (await searchParams) ?? {};
  const requested = Array.isArray(params.tenantId) ? params.tenantId[0] : params.tenantId;
  const tenantsResult = await getPlatformTenants();
  const tenants = tenantsResult.data;
  const selectedTenant = tenants.find((tenant) => tenant.id === requested) ?? tenants[0];
  const selectedTenantId = selectedTenant?.id;
  if (requested && selectedTenantId && requested !== selectedTenantId) redirect(`/platform-admin/data-governance?tenantId=${selectedTenantId}`);
  const result = await getPlatformDataGovernanceWorkspace(selectedTenantId);
  const approvedPolicies = result.data.policies.filter((item) => String(item.status) === "approved").length;
  const activeHolds = result.data.legal_holds.filter((item) => String(item.status) === "active").length;
  const requestedDecisions = result.data.requests.filter((item) => String(item.status) === "requested").length;
  const dispatchableRequests = result.data.requests.filter((item) => ["approved", "failed"].includes(String(item.status))).length;
  const openRequests = result.data.requests.filter((item) => ["requested", "approved", "queued", "running", "failed"].includes(String(item.status))).length;
  const previewCategories = result.data.preview?.categories ?? [];
  const eligibleCategories = previewCategories.filter((item) => Boolean(item.eligible)).length;
  const nextAction = !selectedTenant
    ? { title: "Create or select a tenant", detail: "A tenant scope is required before retention and legal-hold controls can be reviewed." }
    : !approvedPolicies
      ? { title: "Publish the first approved retention rule", detail: `Define a jurisdiction, legal basis, lifecycle field, and approval reference for ${selectedTenant.name}.` }
      : requestedDecisions
        ? { title: "Independently review pending requests", detail: `${requestedDecisions} request${requestedDecisions === 1 ? " needs" : "s need"} a Platform Admin decision before execution.` }
        : dispatchableRequests
          ? { title: "Queue approved or retryable work", detail: `${dispatchableRequests} request${dispatchableRequests === 1 ? " is" : "s are"} ready for governed dispatch.` }
          : activeHolds
            ? { title: "Review active preservation holds", detail: `${activeHolds} active hold${activeHolds === 1 ? " protects" : "s protect"} records from deletion until independently released.` }
            : { title: "Review impact before the next request", detail: "Confirm policy coverage and blockers before approving any export or erasure assessment." };
  return <main className="shell hr-admin-compact-ui accerio-page">
    <PageIntro appearance="accerio" eyebrow="Platform governance" title="Retention and controlled erasure" description="Configure approved retention rules, place legal holds, review impact, and independently approve governed requests." actions={<Link className="button button--secondary" href="/platform-admin">Back to platform workspace</Link>} pills={["Legal hold", "Approved policy", "Erasure disabled by default"]} />
    <nav className="filter-chip-row" aria-label="Tenant governance scope">{tenants.map((tenant) => <Link className={`filter-chip-link${tenant.id === selectedTenantId ? " filter-chip-link--active" : ""}`} href={`/platform-admin/data-governance?tenantId=${tenant.id}`} key={tenant.id}>{tenant.name}</Link>)}</nav>
    <section className="section"><div aria-label="Platform data governance summary" className="tenant-access-summary-strip" role="group"><article><span>Approved policies</span><strong>{approvedPolicies}</strong><small>{selectedTenant?.name ?? "No tenant selected"}</small></article><article><span>Active holds</span><strong>{activeHolds}</strong><small>Deletion remains blocked</small></article><article><span>Open requests</span><strong>{openRequests}</strong><small>{requestedDecisions} awaiting approval</small></article><article><span>Eligible categories</span><strong>{eligibleCategories}/{previewCategories.length}</strong><small>Preview before execution</small></article></div></section>
    <section className="section"><div className="tenant-next-action-card"><div><span className="workspace-card__eyebrow">Next required action</span><h2>{nextAction.title}</h2><p className="tenant-section-copy">{nextAction.detail}</p></div><span className="record-chip record-chip--accent">Review below</span></div></section>
    <section className="section"><div className="tenant-plan-command-band"><div><span className="workspace-card__eyebrow">Governed lifecycle</span><h2>Define, preserve, independently decide.</h2><p className="tenant-section-copy">Every action stays inside the selected tenant. Erasure execution remains disabled by deployment policy.</p></div><ol aria-label="Platform data governance workflow"><li><strong>1</strong><span>Approve retention rules</span></li><li><strong>2</strong><span>Place or release legal holds</span></li><li><strong>3</strong><span>Approve and queue requests</span></li></ol></div></section>
    <DataGovernanceWorkbench mode="platform" selectedTenantId={selectedTenantId} recordCategories={result.data.record_categories} policies={result.data.policies} legalHolds={result.data.legal_holds} requests={result.data.requests} preview={result.data.preview ?? undefined} tenants={tenants.map((tenant) => ({ id: tenant.id, name: tenant.name }))} />
  </main>;
}
