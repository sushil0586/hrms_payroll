import Link from "next/link";

import { DataGovernanceWorkbench } from "@/components/governance/data-governance-workbench";
import { PageIntro } from "@/components/patterns/page-intro";
import { getTenantDataGovernanceWorkspace } from "@/lib/api";
import { requireSessionPermission } from "@/lib/workspace-access";

export default async function TenantDataGovernancePage() {
  await requireSessionPermission({ permissionKeys: ["tenant.retention.view"], workspace: "tenant_admin", fallbackPath: "/tenant-admin" });
  const result = await getTenantDataGovernanceWorkspace();
  const activeHolds = result.data.legal_holds.filter((item) => String(item.status) === "active").length;
  const openRequests = result.data.requests.filter((item) => ["requested", "approved", "queued", "running", "failed"].includes(String(item.status))).length;
  const eligibleCategories = result.data.preview.categories.filter((item) => Boolean(item.eligible)).length;
  return <main className="shell hr-admin-compact-ui accerio-page">
    <PageIntro appearance="accerio" eyebrow="Tenant governance" title="Data retention and exports" description="Review approved retention rules, legal holds, impact previews, and independently approved data requests." actions={<Link className="button button--secondary" href="/tenant-admin">Back to tenant workspace</Link>} pills={["Tenant scoped", "Maker/checker", "Audit retained"]} />
    <section className="section"><div aria-label="Data governance summary" className="tenant-access-summary-strip" role="group"><article><span>Approved policies</span><strong>{result.data.policies.length}</strong><small>Configured retention rules</small></article><article><span>Active holds</span><strong>{activeHolds}</strong><small>Deletion remains blocked</small></article><article><span>Open requests</span><strong>{openRequests}</strong><small>Independent approval lifecycle</small></article><article><span>Eligible categories</span><strong>{eligibleCategories}/{result.data.preview.categories.length}</strong><small>Preview only until approved</small></article></div></section>
    <section className="section"><div className="tenant-plan-command-band"><div><span className="workspace-card__eyebrow">Governed data workflow</span><h2>Preview, request, independently approve.</h2><p className="tenant-section-copy">Tenant Admin can assess impact and submit a request. Platform governance remains responsible for approval and execution.</p></div><ol aria-label="Data governance workflow"><li><strong>1</strong><span>Review policy and hold impact</span></li><li><strong>2</strong><span>Request the minimum data scope</span></li><li><strong>3</strong><span>Track independent approval</span></li></ol></div></section>
    <DataGovernanceWorkbench mode="tenant" recordCategories={result.data.record_categories} policies={result.data.policies} legalHolds={result.data.legal_holds} requests={result.data.requests} preview={result.data.preview} />
  </main>;
}
