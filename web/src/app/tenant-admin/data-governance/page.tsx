import Link from "next/link";

import { DataGovernanceWorkbench } from "@/components/governance/data-governance-workbench";
import { PageIntro } from "@/components/patterns/page-intro";
import { getTenantDataGovernanceWorkspace } from "@/lib/api";
import { requireSessionPermission } from "@/lib/workspace-access";

export default async function TenantDataGovernancePage() {
  await requireSessionPermission({ permissionKeys: ["tenant.retention.view"], workspace: "tenant_admin", fallbackPath: "/tenant-admin" });
  const result = await getTenantDataGovernanceWorkspace();
  return <main className="shell hr-admin-compact-ui accerio-page">
    <PageIntro appearance="accerio" eyebrow="Tenant governance" title="Data retention and exports" description="Review approved retention rules, legal holds, impact previews, and independently approved data requests." actions={<Link className="button button--secondary" href="/tenant-admin">Back to tenant workspace</Link>} pills={["Tenant scoped", "Maker/checker", "Audit retained"]} />
    <DataGovernanceWorkbench mode="tenant" recordCategories={result.data.record_categories} policies={result.data.policies} legalHolds={result.data.legal_holds} requests={result.data.requests} preview={result.data.preview} />
  </main>;
}
