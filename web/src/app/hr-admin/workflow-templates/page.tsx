import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminWorkflowTemplates } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = { searchParams?: Promise<Record<string, SearchParamValue>> };

function param(value: SearchParamValue, fallback = "") {
  return (Array.isArray(value) ? value[0] : value) ?? fallback;
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function HrAdminWorkflowTemplatesPage({ searchParams }: PageProps) {
  const result = await getHrAdminWorkflowTemplates();
  const params = (await searchParams) ?? {};
  const q = param(params.q).trim();
  const moduleFilter = param(params.module, "all");
  const statusFilter = param(params.status, "all");
  const normalizedQuery = q.toLocaleLowerCase();
  const modules = Array.from(new Set(result.data.map((item) => item.module))).sort();
  const statuses = Array.from(new Set(result.data.map((item) => item.status))).sort();
  const filteredTemplates = result.data.filter((item) => {
    const matchesQuery = !normalizedQuery || [item.name, item.code, item.trigger_key, item.description]
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    return matchesQuery && (moduleFilter === "all" || item.module === moduleFilter) && (statusFilter === "all" || item.status === statusFilter);
  });
  const hasFilters = Boolean(q || moduleFilter !== "all" || statusFilter !== "all");

  return (
    <main className="shell shell--workspace workflow-workbench accerio-page">
      <PageIntro appearance="accerio"
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/workflow-templates/new">Create workflow template</Link>
            <Link className="button button--secondary" href="/hr-admin/workflow-template-assignments">Open template assignments</Link>
            <Link className="button button--secondary" href="/hr-admin/workflows">Back to workflows</Link>
          </>
        }
        description="Build reusable approval chains for leave, attendance, lifecycle, and related HR flows."
        eyebrow={result.state === "live" ? "Live workflow mode" : "Demo workflow mode"}
        pills={[`${result.data.length} loaded templates`]}
        title="Workflow templates"
      />

      <section className="section">
        <div className="attendance-summary-strip payroll-run-summary-strip workflow-metric-grid">
          <span><strong>{result.data.length}</strong> Loaded templates</span>
          <span><strong>{result.data.filter((item) => item.status === "active").length}</strong> Loaded active</span>
          <span><strong>{result.data.reduce((sum, item) => sum + item.steps.length, 0)}</strong> Loaded steps</span>
        </div>
      </section>

      <section className="section queue-layout">
        <section className="card panel queue-toolbar panel-card-soft workflow-filter-panel" aria-labelledby="workflow-template-catalog-heading">
          <div className="queue-toolbar__header">
            <div><h2 className="section-heading-soft" id="workflow-template-catalog-heading">Template catalog</h2><p className="section-copy section-copy-soft">Find a reusable approval chain by identity, module, trigger or state.</p></div>
            <div className="queue-toolbar__meta"><span className="queue-summary-chip"><strong>{filteredTemplates.length}</strong> shown</span><span className="queue-summary-chip"><strong>{result.data.length}</strong> loaded</span></div>
          </div>
          <form className="queue-toolbar__grid" method="get">
            <label className="form-field"><span className="muted">Search templates</span><input className="input-control" defaultValue={q} name="q" placeholder="Name, code, trigger, or description" type="search" /></label>
            <label className="form-field"><span className="muted">Module</span><select className="input-control" defaultValue={moduleFilter} name="module"><option value="all">All modules</option>{modules.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
            <label className="form-field"><span className="muted">Status</span><select className="input-control" defaultValue={statusFilter} name="status"><option value="all">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
            <div className="queue-toolbar__actions"><button className="button button--primary" type="submit">Apply filters</button><Link className="button button--ghost" href="/hr-admin/workflow-templates">Clear filters</Link></div>
          </form>
        </section>
        <div className="queue-list workflow-catalog-list">
          {filteredTemplates.map((item) => (
            <article className="record-card workflow-catalog-card" key={item.id}>
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

              <div className="record-card__notes workflow-step-notes">
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
          {filteredTemplates.length === 0 ? (
            <section className="card panel panel-card-soft workflow-empty-state">
              <div>
                <span className="eyebrow">{hasFilters ? "No matching templates" : "No workflow templates"}</span>
                <h2 className="section-heading-soft">{hasFilters ? "No templates match the current filters." : "Create the first approval template."}</h2>
                <p className="section-copy section-copy-soft">
                  {hasFilters ? "Clear filters or broaden the search to review the loaded catalog." : "Templates define reusable approval chains before they are assigned to teams or org scopes."}
                </p>
              </div>
              <Link className={`button ${hasFilters ? "button--secondary" : "button--primary"}`} href={hasFilters ? "/hr-admin/workflow-templates" : "/hr-admin/workflow-templates/new"}>{hasFilters ? "Clear filters" : "Create workflow template"}</Link>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
