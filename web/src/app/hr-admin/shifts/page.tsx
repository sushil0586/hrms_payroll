import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { PlatformGovernanceCard, PlatformGovernanceNotice } from "@/components/patterns/platform-governance-card";
import { getHrAdminShifts } from "@/lib/api";

export default async function HrAdminShiftsPage() {
  const result = await getHrAdminShifts();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live shift mode" : "Demo shift mode"}
        title="Shift admin for working-time setup."
        description="Configure the attendance windows, grace rules, and weekly-off patterns that operational attendance depends on."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/shifts/new">Create shift</Link>
            <Link className="button button--secondary" href="/hr-admin/attendance-operations">Back to attendance operations</Link>
          </>
        }
        pills={["Time-window setup", "Weekly-off patterns", "Attendance-ready shift logic"]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Shift masters" value={result.data.length} trend="Configured schedules" />
          <MetricTile label="Active shifts" value={result.data.filter((item) => item.is_active).length} trend="Currently usable" />
          <MetricTile label="Night shifts" value={result.data.filter((item) => item.is_night_shift).length} trend="Cross-day coverage" />
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
                    <span className={`record-chip${item.is_active ? " record-chip--accent" : ""}`}>{item.is_active ? "active" : "inactive"}</span>
                    {item.is_night_shift ? <span className="record-chip">night shift</span> : null}
                    {item.is_flexible ? <span className="record-chip">flexible</span> : null}
                    <PlatformGovernanceCard item={item} />
                  </div>
                  <p className="section-copy">{item.code}</p>
                </div>
                <div className="record-card__actions">
                  <Link className="button button--secondary" href={`/hr-admin/shifts/${item.id}/edit`}>Edit</Link>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Time window</span><span className="detail-value">{item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}</span></div>
                <div className="detail-row"><span className="detail-label">Weekly off days</span><span className="detail-value">{item.weekly_off_days.join(", ") || "No weekly off set"}</span></div>
              </div>
              <PlatformGovernanceNotice item={item} />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
