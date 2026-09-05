import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDocumentCategories } from "@/lib/api";

export default async function HrAdminDocumentCategoriesPage() {
  const result = await getHrAdminDocumentCategories();

  return (
    <main className="shell">
      <PageIntro
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/document-categories/new">Create category</Link>
            <Link className="button button--secondary" href="/hr-admin/documents">Back to documents</Link>
          </>
        }
        description="Define the reusable document categories that onboarding, compliance, and employee recordkeeping will depend on."
        eyebrow={result.state === "live" ? "Live document mode" : "Demo document mode"}
        pills={[`${result.data.length} categories`]}
        title="Document categories"
      />

      <section className="section">
        <div className="metrics-grid">
          <MetricTile label="Categories" trend="Catalog size" value={result.data.length} />
          <MetricTile label="Verification required" trend="Visible in this list" value={result.data.filter((item) => item.requires_verification).length} />
          <MetricTile label="Employee upload enabled" trend="Visible in this list" value={result.data.filter((item) => item.allow_employee_upload).length} />
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
                  <span className="record-chip">{item.category_type}</span>
                  <Link className="button button--secondary" href={`/hr-admin/document-categories/${item.id}/edit`}>Edit</Link>
                </div>
              </div>
              <div className="record-card__details">
                <div><span className="record-card__label">Code</span><strong>{item.code}</strong></div>
                <div><span className="record-card__label">Type</span><strong>{item.category_type}</strong></div>
                <div><span className="record-card__label">Verification</span><strong>{item.requires_verification ? "Required" : "Not required"}</strong></div>
                <div><span className="record-card__label">Upload mode</span><strong>{item.allow_employee_upload ? "Employee upload" : "HR only"}</strong></div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
