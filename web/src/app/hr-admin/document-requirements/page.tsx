import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDocumentRequirements } from "@/lib/api";

export default async function HrAdminDocumentRequirementsPage() {
  const result = await getHrAdminDocumentRequirements();

  return (
    <main className="shell">
      <PageIntro
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/document-requirements/new">Create requirement</Link>
            <Link className="button button--secondary" href="/hr-admin/documents">Back to documents</Link>
          </>
        }
        description="Define where documents are mandatory so onboarding and compliance checks stay configurable across clients and org structures."
        eyebrow={result.state === "live" ? "Live document mode" : "Demo document mode"}
        pills={[`${result.data.length} requirement rules`]}
        title="Document requirements"
      />

      <section className="section">
        <div className="metrics-grid">
          <MetricTile label="Requirement rules" trend="Configured scopes" value={result.data.length} />
          <MetricTile label="Mandatory rules" trend="Visible in this list" value={result.data.filter((item) => item.is_mandatory).length} />
          <MetricTile label="Priority total" trend="Across visible rules" value={result.data.reduce((sum, item) => sum + item.priority, 0)} />
        </div>
      </section>

      <section className="section">
        <div className="queue-list">
          {result.data.map((item) => (
            <article className="record-card" key={item.id}>
              <div className="record-card__header">
                <div className="record-card__title-block">
                  <h3>{item.category_name}</h3>
                  <p>Mandatory within {item.required_within_days_of_joining} day(s) of joining.</p>
                </div>
                <div className="record-card__actions">
                  <span className="record-chip">{item.is_mandatory ? "Mandatory" : "Optional"}</span>
                  <Link className="button button--secondary" href={`/hr-admin/document-requirements/${item.id}/edit`}>Edit</Link>
                </div>
              </div>
              <div className="record-card__details">
                <div><span className="record-card__label">Legal entity</span><strong>{item.legal_entity || "All"}</strong></div>
                <div><span className="record-card__label">Branch</span><strong>{item.branch || "All"}</strong></div>
                <div><span className="record-card__label">Department</span><strong>{item.department || "All"}</strong></div>
                <div><span className="record-card__label">Grade</span><strong>{item.grade || "All"}</strong></div>
                <div><span className="record-card__label">Employment type</span><strong>{item.employment_type || "All"}</strong></div>
                <div><span className="record-card__label">Priority</span><strong>{item.priority}</strong></div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
