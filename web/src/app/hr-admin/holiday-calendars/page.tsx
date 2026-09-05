import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { PlatformGovernanceCard, PlatformGovernanceNotice } from "@/components/patterns/platform-governance-card";
import { getHrAdminHolidayCalendars } from "@/lib/api";

export default async function HrAdminHolidayCalendarsPage() {
  const result = await getHrAdminHolidayCalendars();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live calendar mode" : "Demo calendar mode"}
        title="Holiday calendars"
        description="Set scope-aware holiday schedules that policies and daily attendance records can reference."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/holiday-calendars/new">Create holiday calendar</Link>
            <Link className="button button--secondary" href="/hr-admin/attendance-operations">Back to attendance operations</Link>
          </>
        }
        pills={["Calendar-year setup", "Scope-aware holidays", "Attendance-ready references"]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Calendars" value={result.data.length} trend="Configured years" />
          <MetricTile label="Active calendars" value={result.data.filter((item) => item.is_active).length} trend="Currently usable" />
          <MetricTile label="Holiday rows" value={result.data.reduce((total, item) => total + item.holidays.length, 0)} trend="Planned exceptions" />
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
                    <span className="record-chip">{item.year}</span>
                    <PlatformGovernanceCard item={item} />
                  </div>
                  <p className="section-copy">{item.code}</p>
                </div>
                <div className="record-card__actions">
                  <Link className="button button--secondary" href={`/hr-admin/holiday-calendars/${item.id}/edit`}>Edit</Link>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Scope</span><span className="detail-value">{item.branch || item.location || item.legal_entity || "Global tenant scope"}</span></div>
                <div className="detail-row"><span className="detail-label">Holiday count</span><span className="detail-value">{item.holidays.length}</span></div>
                <div className="detail-row"><span className="detail-label">Restricted holidays</span><span className="detail-value">{item.holidays.filter((holiday) => holiday.holiday_type === "restricted").length}</span></div>
              </div>
              <PlatformGovernanceNotice item={item} />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
