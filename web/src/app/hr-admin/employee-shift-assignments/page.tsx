import Link from "next/link";

import { EmployeeShiftAssignmentGovernancePanel } from "@/app/hr-admin/employee-shift-assignments/employee-shift-assignment-governance-panel";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminEmployeeShiftAssignments, getHrAdminPolicyOptions } from "@/lib/api";

export default async function HrAdminEmployeeShiftAssignmentsPage() {
  const [result, optionsResult] = await Promise.all([
    getHrAdminEmployeeShiftAssignments(),
    getHrAdminPolicyOptions(),
  ]);
  const primaryCount = result.data.filter((item) => item.is_primary).length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live shift assignment mode" : "Demo shift assignment mode"}
        title="Shift assignments"
        description="Control fixed shifts, weekly rotations, and temporary overrides before attendance runtime depends on them."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/employee-shift-assignments/new">
              Create shift assignment
            </Link>
            <Link className="button button--secondary" href="/hr-admin/attendance-operations">
              Back to attendance operations
            </Link>
          </>
        }
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Assignments" value={result.data.length} trend="Coverage windows" />
          <MetricTile label="Primary assignments" value={primaryCount} trend="Winning coverage" />
          <MetricTile label="Employees covered" value={new Set(result.data.map((item) => item.employee_id)).size} trend="Operational mapping" />
        </div>
      </section>

      <section className="section queue-layout">
        <div className="queue-list">
          {result.data.map((item) => (
            <article className="record-card" key={item.id}>
              <div className="record-card__header">
                <div className="record-card__title-wrap">
                  <div className="record-card__title">
                    <h2>{item.employee}</h2>
                  </div>
                  <div className="record-card__eyebrow">
                    <span className="record-chip">{item.employee_code}</span>
                    <span className={`record-chip${item.is_primary ? " record-chip--accent" : ""}`}>{item.is_primary ? "primary" : "secondary"}</span>
                  </div>
                </div>
                <div className="record-card__actions">
                  <Link className="button button--secondary" href={`/hr-admin/employee-shift-assignments/${item.id}/edit`}>
                    Edit
                  </Link>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Shift</span>
                  <span className="detail-value">{item.shift}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Assignment mode</span>
                  <span className="detail-value">{item.assignment_kind.replace("_", " ")}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Effective window</span>
                  <span className="detail-value">{`${item.effective_from} to ${item.effective_to ?? "open ended"}`}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Scope summary</span>
                  <span className="detail-value">{item.scope_labels?.length ? item.scope_labels.join(" • ") : "No scope summary"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Overlap review</span>
                  <span className="detail-value">{item.conflict_summary || "No overlap summary available."}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <EmployeeShiftAssignmentGovernancePanel employees={optionsResult.data.employees} />
    </main>
  );
}
