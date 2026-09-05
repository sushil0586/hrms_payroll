import Link from "next/link";

import { LeavePolicyAssignmentGovernancePanel } from "@/app/hr-admin/leave-policy-assignments/leave-policy-assignment-governance-panel";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeavePolicyAssignments, getHrAdminPolicyOptions } from "@/lib/api";

export default async function HrAdminLeavePolicyAssignmentsPage() {
  const [result, optionsResult] = await Promise.all([getHrAdminLeavePolicyAssignments(), getHrAdminPolicyOptions()]);
  const activeCount = result.data.filter((item) => item.is_active).length;
  const conflictingCount = result.data.filter((item) => (item.conflict_count ?? 0) > 0).length;
  const blockingCount = result.data.filter((item) => item.has_blocking_conflict).length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live leave assignment mode" : "Demo leave assignment mode"}
        title="Leave policy assignments by scope."
        description="Map leave policies to the actual slices of the organization they should govern, with clear priority behavior when multiple rules could apply."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/leave-policy-assignments/new">
              Create leave assignment
            </Link>
            <Link className="button button--secondary" href="/hr-admin/policy-assignments">
              Back to policy assignments
            </Link>
          </>
        }
        pills={["Priority-driven precedence", "Structure-based targeting", "Employee override support"]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Assignments" value={result.data.length} trend="Scope links" />
          <MetricTile label="Active assignments" value={activeCount} trend="Currently applied" />
          <MetricTile label="Overlap watch" value={conflictingCount} trend="Assignments with active overlap" />
          <MetricTile label="Blocking risks" value={blockingCount} trend="Ambiguous exact-priority scope" />
        </div>
      </section>

      <LeavePolicyAssignmentGovernancePanel employees={optionsResult.data.employees} leaveTypes={optionsResult.data.leave_types} />

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
                    {item.leave_type_name ? <span className="record-chip">{item.leave_type_name}</span> : null}
                    {(item.conflict_count ?? 0) > 0 ? (
                      <span className={`record-chip${item.has_blocking_conflict ? " record-chip--danger" : ""}`}>
                        {item.has_blocking_conflict ? "blocking overlap" : `${item.conflict_count} overlap${item.conflict_count === 1 ? "" : "s"}`}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="record-card__actions">
                  <Link className="button button--secondary" href={`/hr-admin/leave-policy-assignments/${item.id}/edit`}>
                    Edit
                  </Link>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Legal entity</span>
                  <span className="detail-value">{item.legal_entity || "Any entity"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Branch</span>
                  <span className="detail-value">{item.branch || "Any branch"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Department</span>
                  <span className="detail-value">{item.department || "Any department"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Employee override</span>
                  <span className="detail-value">{item.employee || "No employee override"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Resolved scope</span>
                  <span className="detail-value">{item.scope_labels?.length ? item.scope_labels.join(" • ") : "Global assignment"}</span>
                </div>
              </div>
              {item.conflict_summary ? (
                <div className="notice">
                  <strong>{item.has_blocking_conflict ? "Action needed." : "Governance note."}</strong>
                  <span className="muted">{item.conflict_summary}</span>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
