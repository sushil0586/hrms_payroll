import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminWorkflowTemplateAssignments } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = { searchParams?: Promise<Record<string, SearchParamValue>> };

function param(value: SearchParamValue, fallback = "") {
  return (Array.isArray(value) ? value[0] : value) ?? fallback;
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function HrAdminWorkflowTemplateAssignmentsPage({ searchParams }: PageProps) {
  const result = await getHrAdminWorkflowTemplateAssignments();
  const params = (await searchParams) ?? {};
  const q = param(params.q).trim();
  const moduleFilter = param(params.module, "all");
  const stateFilter = param(params.state, "all");
  const normalizedQuery = q.toLocaleLowerCase();
  const modules = Array.from(new Set(result.data.map((item) => item.module))).sort();
  const filteredAssignments = result.data.filter((item) => {
    const scopeValues = [item.template_name, item.module, item.trigger_key, item.legal_entity, item.branch, item.department, item.business_unit, item.grade];
    const matchesQuery = !normalizedQuery || scopeValues.some((value) => value?.toLocaleLowerCase().includes(normalizedQuery));
    const matchesState = stateFilter === "all" || (stateFilter === "active" ? item.is_active : !item.is_active);
    return matchesQuery && matchesState && (moduleFilter === "all" || item.module === moduleFilter);
  });
  const hasFilters = Boolean(q || moduleFilter !== "all" || stateFilter !== "all");

  return (
    <main className="shell shell--workspace workflow-workbench accerio-page">
      <PageIntro appearance="accerio"
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/workflow-template-assignments/new">Create workflow assignment</Link>
            <Link className="button button--secondary" href="/hr-admin/workflow-templates">Back to workflow templates</Link>
          </>
        }
        description="Attach workflow templates to organizational scopes so approval behavior stays configurable across client setups."
        eyebrow={result.state === "live" ? "Live workflow mode" : "Demo workflow mode"}
        pills={[`${result.data.length} loaded assignments`]}
        title="Workflow template assignments"
      />

      <section className="section">
        <div className="attendance-summary-strip payroll-run-summary-strip workflow-metric-grid">
          <span><strong>{result.data.length}</strong> Loaded assignments</span>
          <span><strong>{result.data.filter((item) => item.is_active).length}</strong> Loaded active</span>
          <span><strong>{new Set(result.data.map((item) => item.module)).size}</strong> Loaded modules</span>
        </div>
      </section>

      <section className="section queue-layout">
        <section className="card panel queue-toolbar panel-card-soft workflow-filter-panel" aria-labelledby="workflow-assignment-catalog-heading">
          <div className="queue-toolbar__header">
            <div><h2 className="section-heading-soft" id="workflow-assignment-catalog-heading">Assignment catalog</h2><p className="section-copy section-copy-soft">Find rollout rules by template, module, trigger or organization scope.</p></div>
            <div className="queue-toolbar__meta"><span className="queue-summary-chip"><strong>{filteredAssignments.length}</strong> shown</span><span className="queue-summary-chip"><strong>{result.data.length}</strong> loaded</span></div>
          </div>
          <form className="queue-toolbar__grid" method="get">
            <label className="form-field"><span className="muted">Search assignments</span><input className="input-control" defaultValue={q} name="q" placeholder="Template, trigger, or org scope" type="search" /></label>
            <label className="form-field"><span className="muted">Module</span><select className="input-control" defaultValue={moduleFilter} name="module"><option value="all">All modules</option>{modules.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
            <label className="form-field"><span className="muted">State</span><select className="input-control" defaultValue={stateFilter} name="state"><option value="all">Active and inactive</option><option value="active">Active only</option><option value="inactive">Inactive only</option></select></label>
            <div className="queue-toolbar__actions"><button className="button button--primary" type="submit">Apply filters</button><Link className="button button--ghost" href="/hr-admin/workflow-template-assignments">Clear filters</Link></div>
          </form>
        </section>
        <div className="queue-list workflow-catalog-list">
          {filteredAssignments.map((item) => (
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
          {filteredAssignments.length === 0 ? (
            <section className="card panel panel-card-soft workflow-empty-state">
              <div>
                <span className="eyebrow">{hasFilters ? "No matching assignments" : "No workflow assignments"}</span>
                <h2 className="section-heading-soft">{hasFilters ? "No assignments match the current filters." : "Assign a template to an org scope."}</h2>
                <p className="section-copy section-copy-soft">
                  {hasFilters ? "Clear filters or broaden the search to review the loaded rollout catalog." : "Assignments decide where each approval template applies across legal entities, branches, departments, business units, or grades."}
                </p>
              </div>
              <Link className={`button ${hasFilters ? "button--secondary" : "button--primary"}`} href={hasFilters ? "/hr-admin/workflow-template-assignments" : "/hr-admin/workflow-template-assignments/new"}>{hasFilters ? "Clear filters" : "Create workflow assignment"}</Link>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
