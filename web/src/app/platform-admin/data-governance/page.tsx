import Link from "next/link";

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
  const selectedTenantId = requested || tenants[0]?.id;
  const result = await getPlatformDataGovernanceWorkspace(selectedTenantId);
  return <main className="shell hr-admin-compact-ui accerio-page">
    <PageIntro appearance="accerio" eyebrow="Platform governance" title="Retention and controlled erasure" description="Configure approved retention rules, place legal holds, review impact, and independently approve governed requests." actions={<Link className="button button--secondary" href="/platform-admin">Back to platform workspace</Link>} pills={["Legal hold", "Approved policy", "Erasure disabled by default"]} />
    <nav className="filter-chip-row" aria-label="Tenant governance scope">{tenants.map((tenant) => <Link className={`filter-chip-link${tenant.id === selectedTenantId ? " filter-chip-link--active" : ""}`} href={`/platform-admin/data-governance?tenantId=${tenant.id}`} key={tenant.id}>{tenant.name}</Link>)}</nav>
    <DataGovernanceWorkbench mode="platform" recordCategories={result.data.record_categories} policies={result.data.policies} legalHolds={result.data.legal_holds} requests={result.data.requests} preview={result.data.preview ?? undefined} tenants={tenants.map((tenant) => ({ id: tenant.id, name: tenant.name }))} />
  </main>;
}
