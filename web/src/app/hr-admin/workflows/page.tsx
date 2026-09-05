import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { WorkspaceCard } from "@/components/patterns/workspace-card";
import { getHrAdminWorkflowTemplateAssignments, getHrAdminWorkflowTemplates, getHrAdminWorkflowTraces } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: string) {
  if (status === "approved" || status === "completed") return "status status--approved";
  if (status === "pending" || status === "in_progress") return "status status--pending";
  if (status === "rejected" || status === "cancelled") return "status status--rejected";
  return "status status--unknown";
}

export default async function HrAdminWorkflowsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const moduleFilter = normalizeParam(currentParams.module) ?? "all";
  const statusFilter = normalizeParam(currentParams.status) ?? "all";
  const q = normalizeParam(currentParams.q) ?? "";

  const [templatesResult, assignmentsResult, tracesResult] = await Promise.all([
    getHrAdminWorkflowTemplates(),
    getHrAdminWorkflowTemplateAssignments(),
    getHrAdminWorkflowTraces({ module: moduleFilter, status: statusFilter, q, page: 1, page_size: 8 }),
  ]);

  const state = templatesResult.state === "live" && assignmentsResult.state === "live" && tracesResult.state === "live" ? "live" : "demo";
  const activeTraces = tracesResult.data.items.filter((item) => item.status === "pending" || item.status === "in_progress").length;
  const overdueSteps = tracesResult.data.items.reduce((sum, item) => sum + item.overdue_steps, 0);
  const timelineEvents = tracesResult.data.items.reduce((sum, item) => sum + item.timeline_event_count, 0);

  return (
    <main className="shell">
      <PageIntro
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/workflow-templates">Open workflow templates</Link>
            <Link className="button button--secondary" href="/hr-admin/workflow-template-assignments">Open workflow assignments</Link>
            <Link className="button button--ghost" href="/hr-admin/audit">Audit center</Link>
            <Link className="button button--secondary" href="/hr-admin">Back to admin workspace</Link>
          </>
        }
        description="Configure reusable approval templates, attach them to org scopes, and inspect runtime approval traces from one workflow workspace."
        eyebrow={state === "live" ? "Live workflow mode" : "Demo workflow mode"}
        title="Workflow control"
        pills={["Templates", "Assignments", "Timeline trace"]}
      />

      <section className="section">
        <div className="metrics-grid">
          <MetricTile label="Templates" trend="Configured approval blueprints" value={templatesResult.data.length} />
          <MetricTile label="Assignments" trend="Scoped rollout rules" value={assignmentsResult.data.length} />
          <MetricTile label="Approval steps" trend="Across all templates" value={templatesResult.data.reduce((sum, item) => sum + item.steps.length, 0)} />
          <MetricTile label="Open traces" trend="Runtime approval work" value={activeTraces} />
          <MetricTile label="Overdue steps" trend="SLA attention needed" value={overdueSteps} />
          <MetricTile label="Timeline events" trend="Visible trace markers" value={timelineEvents} />
        </div>
      </section>

      <section className="section">
        <div className="workspace-grid">
          <WorkspaceCard
            description="Design approval chains with escalation timing, actor rules, and module-specific triggers."
            details={[
              { label: "Templates", value: templatesResult.data.length },
              { label: "Steps", value: templatesResult.data.reduce((sum, item) => sum + item.steps.length, 0) },
            ]}
            cta="Manage templates"
            eyebrow="Approval blueprints"
            href="/hr-admin/workflow-templates"
            title="Workflow templates"
          />
          <WorkspaceCard
            description="Roll templates out by legal entity, branch, department, business unit, or grade."
            details={[
              { label: "Assignments", value: assignmentsResult.data.length },
              { label: "Live mode", value: state },
            ]}
            cta="Manage assignments"
            eyebrow="Scoped rollout"
            href="/hr-admin/workflow-template-assignments"
            title="Workflow assignments"
          />
        </div>
      </section>

      <section className="section queue-layout">
        <section className="card panel queue-toolbar panel-card-soft">
          <div className="queue-toolbar__header">
            <div>
              <h2 className="section-heading-soft">Workflow timeline</h2>
              <p className="section-copy section-copy-soft">
                Trace approval subjects, current owners, due steps, and recent actions across HR modules.
              </p>
            </div>
            <div className="queue-toolbar__meta">
              <span className="queue-summary-chip"><strong>{tracesResult.data.total_count}</strong> matching</span>
              <span className="queue-summary-chip"><strong>{tracesResult.data.items.length}</strong> visible</span>
              <span className="queue-summary-chip"><strong>{tracesResult.data.status_counts.pending ?? 0}</strong> pending</span>
            </div>
          </div>

          <form className="queue-toolbar__grid" method="get">
            <label className="form-field">
              <span className="muted">Search</span>
              <input className="input-control" defaultValue={q} name="q" placeholder="Employee, subject, actor, or trigger" />
            </label>
            <label className="form-field">
              <span className="muted">Module</span>
              <select className="input-control" defaultValue={moduleFilter} name="module">
                <option value="all">All modules</option>
                <option value="leave">Leave</option>
                <option value="attendance">Attendance</option>
                <option value="lifecycle">Lifecycle</option>
                <option value="documents">Documents</option>
                <option value="config">Configuration</option>
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Status</span>
              <select className="input-control" defaultValue={statusFilter} name="status">
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <div className="queue-toolbar__actions">
              <button className="button button--primary" type="submit">Apply filters</button>
              <Link className="button button--ghost" href="/hr-admin/workflows">Clear filters</Link>
            </div>
          </form>
        </section>

        <div className="queue-list">
          {tracesResult.data.items.map((trace) => (
            <article className="card panel panel-card-soft" key={trace.id}>
              <div className="record-card__header">
                <div>
                  <span className="eyebrow">{formatLabel(trace.module)} - {trace.trigger_key}</span>
                  <h3 className="section-heading-soft">{trace.subject_label}</h3>
                  <p className="section-copy section-copy-soft">
                    {trace.employee_code ? `${trace.employee_code} - ${trace.employee_name}` : trace.subject_identifier}
                  </p>
                </div>
                <span className={statusClass(trace.status)}>{formatLabel(trace.status)}</span>
              </div>

              <div className="detail-grid-soft">
                <div className="detail-row"><span className="detail-label">Current step</span><span className="detail-value">{trace.current_step_name || "No open step"}</span></div>
                <div className="detail-row"><span className="detail-label">Current owner</span><span className="detail-value">{trace.current_actor_summary || "Unassigned"}</span></div>
                <div className="detail-row"><span className="detail-label">Template</span><span className="detail-value">{trace.template_name || "Dynamic workflow"}</span></div>
                <div className="detail-row"><span className="detail-label">Submitted</span><span className="detail-value">{formatDateTime(trace.submitted_at)}</span></div>
              </div>

              <div className="queue-toolbar__summary">
                <span className="queue-summary-chip"><strong>{trace.completed_steps}/{trace.total_steps}</strong> steps closed</span>
                <span className="queue-summary-chip"><strong>{trace.assignment_count}</strong> assignments</span>
                <span className="queue-summary-chip"><strong>{trace.timeline_event_count}</strong> timeline events</span>
                <span className="queue-summary-chip"><strong>{trace.overdue_steps}</strong> overdue</span>
              </div>

              <div className="workspace-grid-modern">
                <section>
                  <h4 className="section-heading-soft">Step trace</h4>
                  <div className="queue-list">
                    {trace.steps.map((step) => (
                      <div className="detail-row" key={step.id}>
                        <span className="detail-label">Step {step.step_order} - {formatLabel(step.status)}</span>
                        <span className="detail-value">{step.name}{step.is_overdue ? " - Overdue" : ""}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="section-heading-soft">Recent timeline</h4>
                  <div className="queue-list">
                    {trace.timeline.slice(0, 4).map((event) => (
                      <div className="detail-row" key={event.id}>
                        <span className="detail-label">{event.title}</span>
                        <span className="detail-value">{formatDateTime(event.occurred_at)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </article>
          ))}
          {tracesResult.data.items.length === 0 ? (
            <section className="card panel panel-card-soft">
              <span className="muted">No workflow traces match the current filters.</span>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
