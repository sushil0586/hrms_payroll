"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HrAdminShiftRosterRollout, HrAdminShiftRosterTemplate } from "@/lib/types";

const PAGE_SIZE = 10;

type RosterRolloutRow = HrAdminShiftRosterRollout & {
  template_code: string;
  template_status: string;
  assignment_kind: string;
  pattern_type: string;
  anchor_date: string;
  rotation_step_count: number;
  off_step_count: number;
  completion_rate: number;
  rollout_risk: "High" | "Medium" | "Low";
  scope: string;
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (["completed", "published", "locked", "low", "true"].includes(normalized)) return "record-chip record-chip--success";
  if (["draft", "medium", "pending", "preview"].includes(normalized)) return "record-chip record-chip--warning";
  if (["failed", "high", "false"].includes(normalized)) return "record-chip record-chip--danger";
  return "record-chip";
}

function rolloutRisk(item: HrAdminShiftRosterRollout): RosterRolloutRow["rollout_risk"] {
  if (item.status !== "completed") return "High";
  if (item.skipped_count > 0 || item.created_count < item.target_count) return "Medium";
  return "Low";
}

function completionRate(item: HrAdminShiftRosterRollout) {
  if (!item.target_count) return 0;
  return Math.round((item.created_count / item.target_count) * 100);
}

function toRows(rollouts: HrAdminShiftRosterRollout[], templates: HrAdminShiftRosterTemplate[]): RosterRolloutRow[] {
  const templateById = new Map(templates.map((template) => [template.id, template]));
  return rollouts.map((item) => {
    const template = templateById.get(item.template_id);
    const entries = template?.config_snapshot?.rotation?.entries ?? [];
    return {
      ...item,
      template_code: template?.code ?? "",
      template_status: template?.status ?? "",
      assignment_kind: template?.assignment_kind ?? "",
      pattern_type: template?.config_snapshot?.rotation?.pattern_type ?? template?.assignment_kind ?? "",
      anchor_date: template?.config_snapshot?.rotation?.anchor_date ?? "",
      rotation_step_count: entries.length,
      off_step_count: entries.filter((entry) => entry.entry_kind === "off").length,
      completion_rate: completionRate(item),
      rollout_risk: rolloutRisk(item),
      scope: item.scope_labels.join(" | "),
    };
  });
}

export function RosterRolloutAuditReportWorkspace({
  rollouts,
  templates,
}: {
  rollouts: HrAdminShiftRosterRollout[];
  templates: HrAdminShiftRosterTemplate[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [assignmentKind, setAssignmentKind] = useState("All");
  const [templateStatus, setTemplateStatus] = useState("All");
  const [primaryState, setPrimaryState] = useState("All");
  const [risk, setRisk] = useState("All");
  const [sortBy, setSortBy] = useState("created");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => toRows(rollouts, templates), [rollouts, templates]);
  const statuses = useMemo(() => ["All", ...unique(rows.map((row) => row.status))], [rows]);
  const assignmentKinds = useMemo(() => ["All", ...unique(rows.map((row) => row.assignment_kind))], [rows]);
  const templateStatuses = useMemo(() => ["All", ...unique(rows.map((row) => row.template_status))], [rows]);
  const risks = ["All", "High", "Medium", "Low"];

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          row.template_name,
          row.template_code,
          row.template_status,
          row.assignment_kind,
          row.pattern_type,
          row.status,
          row.scope,
          row.summary,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (status === "All" || row.status === status) &&
        (assignmentKind === "All" || row.assignment_kind === assignmentKind) &&
        (templateStatus === "All" || row.template_status === templateStatus) &&
        (primaryState === "All" || (primaryState === "primary" ? row.is_primary : !row.is_primary)) &&
        (risk === "All" || row.rollout_risk === risk)
      );
    });
    const riskScore = { High: 3, Medium: 2, Low: 1 };
    return nextRows.sort((left, right) => {
      if (sortBy === "template") return left.template_name.localeCompare(right.template_name);
      if (sortBy === "window") return right.effective_from.localeCompare(left.effective_from);
      if (sortBy === "completion") return right.completion_rate - left.completion_rate;
      if (sortBy === "risk") return riskScore[right.rollout_risk] - riskScore[left.rollout_risk];
      return right.created_at.localeCompare(left.created_at);
    });
  }, [assignmentKind, primaryState, query, risk, rows, sortBy, status, templateStatus]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status !== "All") params.set("status", status);
    if (assignmentKind !== "All") params.set("assignment_kind", assignmentKind);
    if (templateStatus !== "All") params.set("template_status", templateStatus);
    if (primaryState !== "All") params.set("primary_state", primaryState);
    if (risk !== "All") params.set("rollout_risk", risk);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/roster-rollout-audit?${params.toString()}`;
  }, [assignmentKind, primaryState, query, risk, sortBy, status, templateStatus]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Roster rollout audit report workspace">
      <div className="report-catalog-workspace roster-rollout-audit-report" data-testid="roster-rollout-audit-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft"><span>Rollouts</span><strong>{filteredRows.length}</strong><small>{rollouts.length} total runs</small></article>
          <article className="metric-tile metric-tile-soft"><span>Created assignments</span><strong>{filteredRows.reduce((sum, row) => sum + row.created_count, 0)}</strong><small>Generated rows</small></article>
          <article className="metric-tile metric-tile-soft"><span>Skipped rows</span><strong>{filteredRows.reduce((sum, row) => sum + row.skipped_count, 0)}</strong><small>Needs review</small></article>
          <article className="metric-tile metric-tile-soft"><span>Medium/high risk</span><strong>{filteredRows.filter((row) => row.rollout_risk !== "Low").length}</strong><small>Rollout audit</small></article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Roster rollout audit filters">
          <label><span>Search rollouts</span><input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search template, pattern, scope, summary" /></label>
          <label><span>Rollout status</span><select aria-label="Rollout status" className="input-control" value={status} onChange={(event) => updateFilter(() => setStatus(event.target.value))}>{statuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Assignment kind</span><select aria-label="Assignment kind" className="input-control" value={assignmentKind} onChange={(event) => updateFilter(() => setAssignmentKind(event.target.value))}>{assignmentKinds.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Template status</span><select aria-label="Template status" className="input-control" value={templateStatus} onChange={(event) => updateFilter(() => setTemplateStatus(event.target.value))}>{templateStatuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Primary state</span><select aria-label="Primary state" className="input-control" value={primaryState} onChange={(event) => updateFilter(() => setPrimaryState(event.target.value))}><option value="All">All</option><option value="primary">Primary</option><option value="secondary">Secondary</option></select></label>
          <label><span>Risk</span><select aria-label="Risk" className="input-control" value={risk} onChange={(event) => updateFilter(() => setRisk(event.target.value))}>{risks.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Sort</span><select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}><option value="created">Created newest</option><option value="risk">Risk first</option><option value="template">Template</option><option value="window">Window newest</option><option value="completion">Completion high to low</option></select></label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.filter((row) => row.rollout_risk !== "Low").length}</strong> review rollouts</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>Export filtered CSV</Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead><tr><th scope="col">Template</th><th scope="col">Pattern</th><th scope="col">Rollout window</th><th scope="col">Scope</th><th scope="col">Result</th><th scope="col">Risk</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.template_name}</strong><span>{row.template_code || row.template_id}</span><span className={statusClass(row.template_status)}>{titleCase(row.template_status || "unknown")}</span></td>
                  <td><div className="payroll-register-stack"><span>{titleCase(row.assignment_kind || "unknown")}</span><span>{titleCase(row.pattern_type || "pattern missing")}</span><span>{row.rotation_step_count} steps / {row.off_step_count} off steps</span><span>Anchor {row.anchor_date || "not set"}</span></div></td>
                  <td><div className="payroll-register-stack"><span>{row.effective_from} to {row.effective_to || "open ended"}</span><span>{row.is_primary ? "Primary assignments" : "Secondary assignments"}</span><span>{new Date(row.created_at).toLocaleDateString("en-IN")}</span></div></td>
                  <td><div className="payroll-register-stack"><span>{row.scope || "Manual selection"}</span></div></td>
                  <td><div className="payroll-register-stack"><span className={statusClass(row.status)}>{titleCase(row.status)}</span><span>{row.created_count}/{row.target_count} created</span><span>{row.skipped_count} skipped</span><span>{row.completion_rate}% completion</span></div></td>
                  <td><div className="payroll-register-stack"><span className={statusClass(row.rollout_risk)}>{row.rollout_risk}</span><span>{row.summary}</span></div></td>
                  <td><div className="report-row-actions"><Link className="button button--secondary" href="/hr-admin/shift-roster-templates">Review</Link><Link className="button button--ghost" href={`/hr-admin/shift-roster-templates/${row.template_id}/edit`}>Template</Link></div></td>
                </tr>
              ))}
              {visibleRows.length === 0 ? <tr><td colSpan={7}><div className="empty-state">No roster rollout audit rows match the selected filters.</div></td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Roster rollout audit pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
