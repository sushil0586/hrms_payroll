import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminWorkflowTemplateAssignments } from "@/lib/api";

export default async function HrAdminWorkflowTemplateAssignmentsPage() {
  const result = await getHrAdminWorkflowTemplateAssignments();

  return (
    <main className="shell shell--workspace workflow-workbench">
      <PageIntro
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/workflow-template-assignments/new">Create workflow assignment</Link>
            <Link className="button button--secondary" href="/hr-admin/workflow-templates">Back to workflow templates</Link>
          </>
        }
        description="Attach workflow templates to organizational scopes so approval behavior stays configurable across client setups."
        eyebrow={result.state === "live" ? "Live workflow mode" : "Demo workflow mode"}
        pills={[`${result.data.length} assignments`]}
        title="Workflow template assignments"
      />

      <section className="section">
        <div className="metric-grid-modern workflow-metric-grid">
          <MetricTile label="Assignments" trend="Scoped rollout entries" value={result.data.length} />
          <MetricTile label="Active assignments" trend="Enabled in current catalog" value={result.data.filter((item) => item.is_active).length} />
          <MetricTile label="Unique modules" trend="Represented in visible list" value={new Set(result.data.map((item) => item.module)).size} />
        </div>
      </section>

      <section className="section">
        <div className="queue-list workflow-catalog-list">
          {result.data.map((item) => (
            <article className="record-card workflow-catalog-card" key={item.id}>
              <div className="record-card__header">
                <div className="record-card__title-block">
                  <h3>{item.template_name}</h3>
                  <p>{item.module} / {item.trigger_key}</p>
                </div>
                <div className="record-card__actions">
                  <span className="record-chip">{item.is_active ? "Active" : "Inactive"}</span>
                  <Link className="button button--secondary" href={`/hr-admin/workflow-template-assignments/${item.id}/edit`}>Edit</Link>
                </div>
              </div>
              <div className="record-card__details">
                <div><span className="record-card__label">Legal entity</span><strong>{item.legal_entity || "All"}</strong></div>
                <div><span className="record-card__label">Branch</span><strong>{item.branch || "All"}</strong></div>
                <div><span className="record-card__label">Department</span><strong>{item.department || "All"}</strong></div>
                <div><span className="record-card__label">Business unit</span><strong>{item.business_unit || "All"}</strong></div>
                <div><span className="record-card__label">Grade</span><strong>{item.grade || "All"}</strong></div>
                <div><span className="record-card__label">Priority</span><strong>{item.priority}</strong></div>
              </div>
            </article>
          ))}
          {result.data.length === 0 ? (
            <section className="card panel panel-card-soft workflow-empty-state">
              <div>
                <span className="eyebrow">No workflow assignments</span>
                <h2 className="section-heading-soft">Assign a template to an org scope.</h2>
                <p className="section-copy section-copy-soft">
                  Assignments decide where each approval template applies across legal entities, branches, departments, business units, or grades.
                </p>
              </div>
              <Link className="button button--primary" href="/hr-admin/workflow-template-assignments/new">Create workflow assignment</Link>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
