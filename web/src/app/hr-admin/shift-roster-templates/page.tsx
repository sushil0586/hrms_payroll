import Link from "next/link";

import { ShiftRosterRolloutPanel } from "@/app/hr-admin/shift-roster-templates/shift-roster-rollout-panel";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPolicyOptions, getHrAdminShiftRosterRollouts, getHrAdminShiftRosterTemplates } from "@/lib/api";

export default async function HrAdminShiftRosterTemplatesPage() {
  const [result, optionsResult, rolloutsResult] = await Promise.all([
    getHrAdminShiftRosterTemplates(),
    getHrAdminPolicyOptions(),
    getHrAdminShiftRosterRollouts(),
  ]);
  const publishedCount = result.data.filter((item) => item.status === "published" || item.status === "locked").length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live roster template mode" : "Demo roster template mode"}
        title="Shift roster templates for repeat rollout."
        description="Define reusable shift patterns once, then publish and roll them out across teams with less manual scheduling work."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/shift-roster-templates/new">Create roster template</Link>
            <Link className="button button--secondary" href="/hr-admin/attendance-operations">Back to attendance operations</Link>
          </>
        }
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Templates" value={result.data.length} trend="Reusable roster patterns" />
          <MetricTile label="Published or locked" value={publishedCount} trend="Rollout ready" />
          <MetricTile label="Rotation templates" value={result.data.filter((item) => item.assignment_kind === "weekly_rotation").length} trend="Recurring coverage" />
        </div>
      </section>

      <section className="section queue-layout">
        <div className="queue-list">
          {result.data.map((item) => (
            <article className="record-card" key={item.id}>
              <div className="record-card__header">
                <div className="record-card__title-wrap">
                  <div className="record-card__title"><h2>{item.name}</h2></div>
                  <div className="record-card__eyebrow">
                    <span className="record-chip">{item.code}</span>
                    <span className="record-chip">{item.assignment_kind.replace("_", " ")}</span>
                    <span className={`record-chip${item.status === "locked" ? " record-chip--danger" : item.status === "published" ? " record-chip--accent" : ""}`}>{item.status}</span>
                  </div>
                </div>
                <div className="record-card__actions">
                  <Link className="button button--secondary" href={`/hr-admin/shift-roster-templates/${item.id}/edit`}>Edit</Link>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Base shift</span>
                  <span className="detail-value">{item.shift}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Description</span>
                  <span className="detail-value">{item.description || "No description added."}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Rotation summary</span>
                  <span className="detail-value">
                    {item.config_snapshot?.rotation?.entries?.map((entry) => `${optionsResult.data.shifts.find((shift) => shift.id === entry.shift_id)?.name || "Shift"} (${entry.span_days}d)`).join(" -> ") || "No rotation steps configured."}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <ShiftRosterRolloutPanel options={optionsResult.data} templates={result.data} rollouts={rolloutsResult.data} />
    </main>
  );
}
