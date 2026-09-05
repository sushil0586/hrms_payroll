import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { PlatformGovernanceCard, PlatformGovernanceNotice } from "@/components/patterns/platform-governance-card";
import { getHrAdminLeavePolicies } from "@/lib/api";

export default async function HrAdminLeavePoliciesPage() {
  const result = await getHrAdminLeavePolicies();
  const activeCount = result.data.filter((item) => item.status === "active").length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live leave policy mode" : "Demo leave policy mode"}
        title="Leave policy admin for enforceable leave behavior."
        description="Define the entitlement, accrual, notice, and eligibility behavior that the system should actually apply beyond simple leave labels."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/leave-policies/new">
              Create leave policy
            </Link>
            <Link className="button button--secondary" href="/hr-admin/policies">
              Back to policies
            </Link>
          </>
        }
        pills={["Entitlement and accrual rules", "Eligibility and notice control", "Assignment-ready policy objects"]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Policies" value={result.data.length} trend="Configured rules" />
          <MetricTile label="Active policies" value={activeCount} trend="Currently usable" />
          <MetricTile label="Draft or inactive" value={result.data.length - activeCount} trend="Needs review" />
        </div>
      </section>

      <section className="section queue-layout">
        <div className="queue-list">
          {result.data.map((item) => (
            <article className="record-card" key={item.id}>
              <div className="record-card__header">
                <div className="record-card__title-wrap">
                  <div className="record-card__title">
                    <h2>{item.name}</h2>
                  </div>
                  <div className="record-card__eyebrow">
                    <span className="record-chip record-chip--accent">{item.leave_type}</span>
                    <span className="record-chip">{item.status}</span>
                    <span className="record-chip">{item.accrual_frequency}</span>
                    <PlatformGovernanceCard item={item} />
                  </div>
                  <p className="section-copy">{item.code}</p>
                </div>
                <div className="record-card__actions">
                  <Link className="button button--secondary" href={`/hr-admin/leave-policies/${item.id}/edit`}>
                    Edit
                  </Link>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Annual entitlement</span>
                  <span className="detail-value">{item.annual_entitlement} units</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Accrual frequency</span>
                  <span className="detail-value">{item.accrual_frequency}</span>
                </div>
              </div>
              <PlatformGovernanceNotice item={item} />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
