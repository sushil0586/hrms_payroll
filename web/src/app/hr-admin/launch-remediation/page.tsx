import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLaunchRemediations } from "@/lib/api";
import type { HrAdminLaunchRemediationAssignment } from "@/lib/types";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { LaunchRemediationActions } from "./launch-remediation-actions";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) {
    return "Pending";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusBadgeClass(status: HrAdminLaunchRemediationAssignment["status"]) {
  return `readiness-badge readiness-badge--${status}`;
}

function severityBadgeClass(severity: HrAdminLaunchRemediationAssignment["severity"]) {
  return severity === "blocker" ? "readiness-badge readiness-badge--blocked" : "readiness-badge readiness-badge--warning";
}

export default async function HrAdminLaunchRemediationPage({ searchParams }: PageProps) {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });
  const resolvedSearchParams = (await searchParams) ?? {};
  const status = normalizeParam(resolvedSearchParams.status) || "open";
  const severity = normalizeParam(resolvedSearchParams.severity) || "";
  const ownerRoleRef = normalizeParam(resolvedSearchParams.owner_role_ref) || "";
  const moduleRef = normalizeParam(resolvedSearchParams.module_ref) || "";
  const dueState = normalizeParam(resolvedSearchParams.due_state) || "";
  const q = normalizeParam(resolvedSearchParams.q) || "";
  const page = Number(normalizeParam(resolvedSearchParams.page) || "1") || 1;
  const result = await getHrAdminLaunchRemediations({
    status,
    severity,
    owner_role_ref: ownerRoleRef,
    module_ref: moduleRef,
    due_state: dueState,
    q,
    page,
    page_size: 12,
  });
  const data = result.data;

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={result.state === "live" ? "Live launch desk" : "Demo launch desk"}
        title="Launch Remediation"
        description="Release blockers, warnings, owner routing, and launch-risk decisions."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin">
              Control center
            </Link>
            <a className="button button--primary" href="/api/hr-admin/saas-launch-audit/download">
              Download audit
            </a>
          </>
        }
        pills={["Owner workflow", "Tenant scoped", "Audit trail"]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Open assignments" value={data.summary.open_count} trend="Current unresolved launch risk" />
          <MetricTile label="Blockers" value={data.summary.blocker_count} trend="Must clear or decide before launch" />
          <MetricTile label="Warnings" value={data.summary.warning_count} trend="Pilot acceptance review" />
          <MetricTile label="Overdue" value={data.summary.overdue_count} trend={`${data.summary.due_soon_count} due within 24 hours`} />
          <MetricTile label="Ignored decisions" value={data.summary.ignored_count} trend="Accepted with notes" />
          <MetricTile label="Escalated" value={data.summary.escalated_count} trend={`${data.summary.owner_count} configured owner routes`} />
        </div>
      </section>

      <section className="section">
        <form className="queue-toolbar panel-card-soft launch-remediation-toolbar" method="get">
          <div className="queue-toolbar__header">
            <div>
              <h2>Assignment filters</h2>
              <p>{data.total_count} launch remediation rows in the current view.</p>
            </div>
            <div className="queue-toolbar__actions">
              <Link className="button button--secondary" href="/hr-admin/launch-remediation">
                Reset
              </Link>
              <button className="button button--primary" type="submit">
                Apply
              </button>
            </div>
          </div>
          <div className="queue-toolbar__grid">
            <label className="queue-toolbar__search">
              <span>Search</span>
              <input name="q" defaultValue={q} placeholder="gate, owner, module" />
            </label>
            <label>
              <span>Status</span>
              <select name="status" defaultValue={status}>
                <option value="open">Open</option>
                <option value="ignored">Ignored</option>
                <option value="closed">Closed</option>
                <option value="all">All</option>
              </select>
            </label>
            <label>
              <span>Severity</span>
              <select name="severity" defaultValue={severity}>
                <option value="">All severities</option>
                {data.options.severities.map((option) => (
                  <option value={option} key={option}>
                    {titleCase(option)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Owner</span>
              <select name="owner_role_ref" defaultValue={ownerRoleRef}>
                <option value="">All owners</option>
                {data.options.owners.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Module</span>
              <select name="module_ref" defaultValue={moduleRef}>
                <option value="">All modules</option>
                {data.options.modules.map((option) => (
                  <option value={option.module_ref} key={option.module_ref}>
                    {option.module_label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Due state</span>
              <select name="due_state" defaultValue={dueState}>
                <option value="">All due states</option>
                {data.options.due_states.map((option) => (
                  <option value={option} key={option}>
                    {titleCase(option)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </form>
      </section>

      <section className="section launch-remediation-list">
        {data.items.length ? (
          data.items.map((assignment) => (
            <article className="record-card launch-remediation-card" key={assignment.id}>
              <div className="record-card__header">
                <div className="record-card__title-wrap">
                  <span className="record-card__eyebrow">{assignment.gate_ref}</span>
                  <div className="record-card__title">
                    <h2>{assignment.label}</h2>
                  </div>
                </div>
                <div className="record-card__actions">
                  <span className={severityBadgeClass(assignment.severity)}>{titleCase(assignment.severity)}</span>
                  <span className={statusBadgeClass(assignment.status)}>{titleCase(assignment.status)}</span>
                  <Link className="button button--secondary" href={assignment.action_href}>
                    {assignment.action_label}
                  </Link>
                </div>
              </div>
              <div className="launch-remediation-card__grid">
                <div className="detail-row">
                  <span>Module</span>
                  <strong>{assignment.module_label}</strong>
                </div>
                <div className="detail-row">
                  <span>Owner role</span>
                  <strong>{assignment.owner_role_ref}</strong>
                </div>
                <div className="detail-row">
                  <span>Assignee</span>
                  <strong>{assignment.assigned_to_identifier || "Unassigned"}</strong>
                </div>
                <div className="detail-row">
                  <span>Current value</span>
                  <strong>{assignment.current_value || "Missing"}</strong>
                </div>
                <div className="detail-row">
                  <span>Acknowledged</span>
                  <strong>{assignment.acknowledged_by_identifier || formatDate(assignment.acknowledged_at)}</strong>
                </div>
                <div className="detail-row">
                  <span>Last seen</span>
                  <strong>{formatDate(assignment.last_seen_at)}</strong>
                </div>
                <div className="detail-row">
                  <span>Due</span>
                  <strong>{formatDate(assignment.due_at)}</strong>
                </div>
                <div className="detail-row">
                  <span>Due state</span>
                  <strong>{titleCase(assignment.due_state)}</strong>
                </div>
                <div className="detail-row">
                  <span>Reminders</span>
                  <strong>{assignment.reminder_count}</strong>
                </div>
                <div className="detail-row">
                  <span>Escalation</span>
                  <strong>{assignment.escalation_owner_role_ref || assignment.escalated_by_identifier || "None"}</strong>
                </div>
              </div>
              {assignment.resolution_note ? <p className="record-card__notes">{assignment.resolution_note}</p> : null}
              {assignment.evidence_ref ? <code className="launch-remediation-card__evidence">{assignment.evidence_ref}</code> : null}
              {assignment.status === "open" ? (
                <LaunchRemediationActions
                  assignmentId={assignment.id}
                  defaultOwnerRoleRef={assignment.owner_role_ref}
                  defaultAssignee={assignment.assigned_to_identifier}
                  defaultDueAt={assignment.due_at}
                  defaultEscalationOwnerRoleRef={assignment.escalation_owner_role_ref}
                />
              ) : null}
            </article>
          ))
        ) : (
          <div className="panel-card-soft launch-remediation-empty">
            <h2>No launch remediation rows</h2>
            <p>Current filters have no matching assignments.</p>
          </div>
        )}
      </section>
    </main>
  );
}
