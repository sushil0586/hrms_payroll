import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { PlatformGovernanceCard, PlatformGovernanceNotice } from "@/components/patterns/platform-governance-card";
import { getHrAdminAttendancePolicies } from "@/lib/api";

export default async function HrAdminAttendancePoliciesPage() {
  const result = await getHrAdminAttendancePolicies();
  const activeCount = result.data.filter((item) => item.status === "active").length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live attendance policy mode" : "Demo attendance policy mode"}
        title="Attendance policies"
        description="Set time rules, thresholds, and check-in behavior that drive attendance treatment."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/attendance-policies/new">
              Create attendance policy
            </Link>
            <Link className="button button--secondary" href="/hr-admin/policies">
              Back to policies
            </Link>
          </>
        }
        pills={["Threshold-based attendance rules", "Shift and holiday linkage", "Regularization-aware behavior"]}
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
                    <span className="record-chip record-chip--accent">{item.attendance_unit}</span>
                    <span className="record-chip">{item.status}</span>
                    <PlatformGovernanceCard item={item} />
                  </div>
                  <p className="section-copy">{item.code}</p>
                </div>
                <div className="record-card__actions">
                  <Link className="button button--secondary" href={`/hr-admin/attendance-policies/${item.id}/edit`}>
                    Edit
                  </Link>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Default shift</span>
                  <span className="detail-value">{item.default_shift || "No shift"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Holiday calendar</span>
                  <span className="detail-value">{item.holiday_calendar || "No calendar"}</span>
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
