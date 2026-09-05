import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { PlatformGovernanceCard, PlatformGovernanceNotice } from "@/components/patterns/platform-governance-card";
import { getHrAdminLeaveTypes } from "@/lib/api";

export default async function HrAdminLeaveTypesPage() {
  const result = await getHrAdminLeaveTypes();
  const activeCount = result.data.filter((item) => item.is_active).length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live leave policy mode" : "Demo leave policy mode"}
        title="Leave type admin for leave behavior building blocks."
        description="Manage the leave categories employees and managers work with before layering policy assignments, accrual rules, and approval logic on top."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/leave-types/new">
              Create leave type
            </Link>
            <Link className="button button--secondary" href="/hr-admin/policies">
              Back to policies
            </Link>
          </>
        }
        pills={["Foundational leave buckets", "Approval and balance behavior", "Policy-ready structure"]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Leave types" value={result.data.length} trend="Configured categories" />
          <MetricTile label="Active types" value={activeCount} trend="Currently usable" />
          <MetricTile label="Inactive types" value={result.data.length - activeCount} trend="Needs review" />
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
                    <span className="record-chip record-chip--accent">{item.category}</span>
                    <span className="record-chip">{item.unit}</span>
                    <span className={`record-chip${item.is_active ? " record-chip--accent" : ""}`}>
                      {item.is_active ? "active" : "inactive"}
                    </span>
                    <PlatformGovernanceCard item={item} />
                  </div>
                  <p className="section-copy">{item.code}</p>
                </div>
                <div className="record-card__actions">
                  <Link className="button button--secondary" href={`/hr-admin/leave-types/${item.id}/edit`}>
                    Edit
                  </Link>
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
