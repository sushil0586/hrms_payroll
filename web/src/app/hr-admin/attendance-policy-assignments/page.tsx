import Link from "next/link";

import { AttendancePolicyAssignmentGovernancePanel } from "@/app/hr-admin/attendance-policy-assignments/attendance-policy-assignment-governance-panel";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendancePolicyAssignments, getHrAdminPolicyOptions } from "@/lib/api";

export default async function HrAdminAttendancePolicyAssignmentsPage() {
  const [result, optionsResult] = await Promise.all([
    getHrAdminAttendancePolicyAssignments(),
    getHrAdminPolicyOptions(),
  ]);
  const activeCount = result.data.filter((item) => item.is_active).length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live attendance assignment mode" : "Demo attendance assignment mode"}
        title="Attendance policy assignments by scope."
        description="Map attendance behavior to the branches, locations, departments, employment types, or employees that should inherit it."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/attendance-policy-assignments/new">
              Create attendance assignment
            </Link>
            <Link className="button button--secondary" href="/hr-admin/policy-assignments">
              Back to policy assignments
            </Link>
          </>
        }
        pills={["Priority-driven precedence", "Scope-aware rollout", "Employee override support"]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Assignments" value={result.data.length} trend="Scope links" />
          <MetricTile label="Active assignments" value={activeCount} trend="Currently applied" />
          <MetricTile label="Inactive assignments" value={result.data.length - activeCount} trend="Dormant mappings" />
        </div>
      </section>

      <section className="section queue-layout">
        <div className="queue-list">
          {result.data.map((item) => (
            <article className="record-card" key={item.id}>
              <div className="record-card__header">
                <div className="record-card__title-wrap">
                  <div className="record-card__title">
                    <h2>{item.policy_name}</h2>
                  </div>
                  <div className="record-card__eyebrow">
                    <span className={`record-chip${item.is_active ? " record-chip--accent" : ""}`}>
                      {item.is_active ? "active" : "inactive"}
                    </span>
                    <span className="record-chip">Priority {item.priority}</span>
                  </div>
                </div>
                <div className="record-card__actions">
                  <Link className="button button--secondary" href={`/hr-admin/attendance-policy-assignments/${item.id}/edit`}>
                    Edit
                  </Link>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Scope summary</span>
                  <span className="detail-value">{item.scope_labels?.length ? item.scope_labels.join(" • ") : "Tenant default scope"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Legal entity</span>
                  <span className="detail-value">{item.legal_entity || "Any entity"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Branch</span>
                  <span className="detail-value">{item.branch || "Any branch"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Location</span>
                  <span className="detail-value">{item.location || "Any location"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Employee override</span>
                  <span className="detail-value">{item.employee || "No employee override"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Overlap review</span>
                  <span className="detail-value">
                    {item.conflict_summary || (item.conflict_count ? `${item.conflict_count} overlapping assignments detected.` : "No overlap summary available.")}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <AttendancePolicyAssignmentGovernancePanel employees={optionsResult.data.employees} />
    </main>
  );
}
