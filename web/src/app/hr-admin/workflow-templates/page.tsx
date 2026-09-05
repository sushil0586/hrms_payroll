import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminWorkflowTemplates } from "@/lib/api";

export default async function HrAdminWorkflowTemplatesPage() {
  const result = await getHrAdminWorkflowTemplates();

  return (
    <main className="shell">
      <PageIntro
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/workflow-templates/new">Create workflow template</Link>
            <Link className="button button--secondary" href="/hr-admin/workflow-template-assignments">Open template assignments</Link>
            <Link className="button button--secondary" href="/hr-admin/workflows">Back to workflows</Link>
          </>
        }
        description="Build reusable approval chains for leave, attendance, lifecycle, and related HR flows."
        eyebrow={result.state === "live" ? "Live workflow mode" : "Demo workflow mode"}
        pills={[`${result.data.length} templates`]}
        title="Workflow templates"
      />

      <section className="section">
        <div className="metrics-grid">
          <MetricTile label="Templates" trend="Reusable flows" value={result.data.length} />
          <MetricTile label="Active templates" trend="Visible in this catalog" value={result.data.filter((item) => item.status === "active").length} />
          <MetricTile label="Steps" trend="Across all templates" value={result.data.reduce((sum, item) => sum + item.steps.length, 0)} />
        </div>
      </section>

      <section className="section">
        <div className="queue-list">
          {result.data.map((item) => (
            <article className="record-card" key={item.id}>
              <div className="record-card__header">
                <div className="record-card__title-block">
                  <h3>{item.name}</h3>
                  <p>{item.description || "No description provided."}</p>
                </div>
                <div className="record-card__actions">
                  <span className="record-chip">{item.module}</span>
                  <span className="record-chip">{item.status}</span>
                  <Link className="button button--secondary" href={`/hr-admin/workflow-templates/${item.id}/edit`}>Edit</Link>
                </div>
              </div>

              <div className="record-card__details">
                <div><span className="record-card__label">Code</span><strong>{item.code}</strong></div>
                <div><span className="record-card__label">Trigger</span><strong>{item.trigger_key}</strong></div>
                <div><span className="record-card__label">Version</span><strong>{item.version}</strong></div>
                <div><span className="record-card__label">Steps</span><strong>{item.steps.length}</strong></div>
              </div>

              <div className="record-card__notes">
                <strong>Approval steps</strong>
                {item.steps.map((step) => (
                  <div className="detail-row" key={step.id}>
                    <div>
                      <strong>Step {step.step_order}: {step.name}</strong>
                      <p className="muted" style={{ margin: "4px 0 0" }}>
                        {step.mode} • {step.role || step.membership || step.scope_type || "No actor mapping"}
                      </p>
                    </div>
                    <span className="record-chip">{step.actor_type}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
