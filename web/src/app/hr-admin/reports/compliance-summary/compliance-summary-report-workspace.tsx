"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HrAdminPayrollFinanceHandoffSetupResponse, HrAdminPayrollStatutorySetupResponse } from "@/lib/types";

type ReadinessStatus = "Ready" | "Warning" | "Blocked";
type SummaryRow = {
  id: string;
  area: string;
  status: ReadinessStatus;
  owner: string;
  signal: string;
  evidence: string;
  route: string;
};

const PAGE_SIZE = 8;
const statutoryTypes = [
  { id: "tds", label: "TDS", route: "/hr-admin/reports/tds-efile-readiness", pattern: /tds|income.?tax|form.?24q|form.?16/i },
  { id: "pf", label: "PF", route: "/hr-admin/reports/pf-ecr-readiness", pattern: /pf|epf|epfo|uan|ecr/i },
  { id: "esic", label: "ESIC", route: "/hr-admin/reports/esic-contribution-readiness", pattern: /esi|esic|insured/i },
  { id: "pt", label: "Professional Tax", route: "/hr-admin/reports/professional-tax-readiness", pattern: /professional.?tax|\bpt\b|state_tax/i },
  { id: "lwf", label: "LWF", route: "/hr-admin/reports/lwf-readiness", pattern: /labou?r.?welfare|lwf|welfare.?fund/i },
];

function statusClass(status: ReadinessStatus) {
  if (status === "Ready") return "record-chip record-chip--success";
  if (status === "Warning") return "record-chip record-chip--warning";
  return "record-chip record-chip--danger";
}

function gateStatus(ready: boolean, partial = false): ReadinessStatus {
  if (ready) return "Ready";
  return partial ? "Warning" : "Blocked";
}

function matches(pattern: RegExp, values: unknown[]) {
  return pattern.test(values.map((value) => String(value ?? "")).join(" "));
}

function artifactMatches(pattern: RegExp, artifact: HrAdminPayrollFinanceHandoffSetupResponse["artifacts"][number]) {
  if (artifact.kind !== "statutory_report") return false;
  return matches(pattern, [artifact.title, JSON.stringify(artifact.config_snapshot), JSON.stringify(artifact.line_snapshot)]);
}

function buildRows(statutory: HrAdminPayrollStatutorySetupResponse, handoff: HrAdminPayrollFinanceHandoffSetupResponse): SummaryRow[] {
  const rows = statutoryTypes.map((item) => {
    const components = statutory.statutory_components.filter((component) => component.statutory_type === item.id || matches(item.pattern, [component.code, component.name, component.statutory_treatment_ref]));
    const activeComponents = components.filter((component) => component.status === "active");
    const registrations = statutory.employer_registrations.filter((registration) => registration.statutory_type === item.id || matches(item.pattern, [registration.registration_type_ref, registration.registration_number, registration.filing_authority_ref]));
    const activeRegistrations = registrations.filter((registration) => registration.status === "active" && registration.registration_number);
    const calendars = statutory.filing_calendars.filter((calendar) => calendar.statutory_type === item.id || matches(item.pattern, [calendar.code, calendar.name, calendar.filing_type_ref]));
    const dueCalendars = calendars.filter((calendar) => calendar.is_due || calendar.is_overdue);
    const artifacts = handoff.artifacts.filter((artifact) => artifactMatches(item.pattern, artifact));
    const publishedArtifacts = artifacts.filter((artifact) => artifact.status === "published");
    const deliveries = handoff.deliveries.filter((delivery) => delivery.artifact_kind === "statutory_report" && matches(item.pattern, [delivery.output_artifact_title, delivery.provider_ref]));
    const acknowledgedDeliveries = deliveries.filter((delivery) => ["acknowledged", "reconciled"].includes(delivery.status));
    const ready = activeComponents.length > 0 && activeRegistrations.length > 0 && calendars.length > 0 && dueCalendars.length === 0 && publishedArtifacts.length > 0;
    const partial = components.length > 0 || registrations.length > 0 || calendars.length > 0 || artifacts.length > 0 || deliveries.length > 0;

    return {
      id: item.id,
      area: item.label,
      status: gateStatus(ready, partial),
      owner: item.id === "tds" ? "Payroll Finance" : "HR Admin + Payroll Finance",
      signal: `${activeComponents.length}/${components.length} components, ${activeRegistrations.length}/${registrations.length} registrations, ${dueCalendars.length} due`,
      evidence: `${publishedArtifacts.length}/${artifacts.length} artifacts, ${acknowledgedDeliveries.length}/${deliveries.length} provider receipts`,
      route: item.route,
    };
  });

  rows.push(
    {
      id: "challans",
      area: "Challans",
      status: gateStatus((handoff.summary.statutory_filing_artifact_count ?? 0) > 0 && statutory.summary.due_filing_calendar_count === 0, (handoff.summary.statutory_filing_artifact_count ?? 0) > 0),
      owner: "Payroll Finance",
      signal: `${statutory.summary.filing_calendar_count} calendars, ${statutory.summary.due_filing_calendar_count} due`,
      evidence: `${handoff.summary.statutory_filing_artifact_count ?? 0} statutory artifacts`,
      route: "/hr-admin/reports/challan-reconciliation",
    },
    {
      id: "filing-status",
      area: "Filing status",
      status: gateStatus(statutory.summary.overdue_filing_calendar_count === 0, statutory.summary.acknowledged_filing_calendar_count > 0),
      owner: "Payroll Finance",
      signal: `${statutory.summary.overdue_filing_calendar_count} overdue, ${statutory.summary.acknowledged_filing_calendar_count} acknowledged`,
      evidence: "Filing calendar evidence",
      route: "/hr-admin/reports/statutory-filing-status",
    },
    {
      id: "provider-evidence",
      area: "Provider evidence",
      status: gateStatus((handoff.summary.provider_callback_event_count ?? 0) > 0 && (handoff.summary.rejected_provider_callback_event_count ?? 0) === 0, (handoff.summary.provider_callback_event_count ?? 0) > 0),
      owner: "Payroll Finance",
      signal: `${handoff.summary.provider_callback_event_count ?? 0} callbacks, ${handoff.summary.rejected_provider_callback_event_count ?? 0} rejected`,
      evidence: `${handoff.summary.provider_retry_event_count ?? 0} retry events`,
      route: "/hr-admin/reports/provider-filing-receipts",
    },
  );

  return rows;
}

export function ComplianceSummaryReportWorkspace({
  statutory,
  handoff,
}: {
  statutory: HrAdminPayrollStatutorySetupResponse;
  handoff: HrAdminPayrollFinanceHandoffSetupResponse;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const rows = useMemo(() => buildRows(statutory, handoff), [handoff, statutory]);
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = status === "All" || row.status === status;
      const matchesQuery = !normalized || [row.area, row.owner, row.signal, row.evidence].join(" ").toLowerCase().includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [query, rows, status]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const readyCount = rows.filter((row) => row.status === "Ready").length;
  const warningCount = rows.filter((row) => row.status === "Warning").length;
  const blockedCount = rows.filter((row) => row.status === "Blocked").length;
  const readiness = blockedCount > 0 ? "Blocked" : warningCount > 0 ? "Warning" : "Ready";

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Compliance summary workspace">
      <div className="report-catalog-workspace statutory-filing-status-report" data-testid="compliance-summary-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft"><span>Overall readiness</span><strong>{readiness}</strong><small>{readyCount}/{rows.length} areas ready</small></article>
          <article className="metric-tile metric-tile-soft"><span>Warnings</span><strong>{warningCount}</strong><small>Partial evidence</small></article>
          <article className="metric-tile metric-tile-soft"><span>Blocked areas</span><strong>{blockedCount}</strong><small>Launch gate blockers</small></article>
          <article className="metric-tile metric-tile-soft"><span>Filing calendars</span><strong>{statutory.summary.filing_calendar_count}</strong><small>{statutory.summary.overdue_filing_calendar_count} overdue</small></article>
        </div>

        <div className="report-catalog-toolbar statutory-deductions-toolbar" aria-label="Compliance summary filters">
          <label><span>Search areas</span><input aria-label="Search areas" className="input-control" onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search area, owner, signal, evidence" type="search" value={query} /></label>
          <label><span>Readiness status</span><select aria-label="Readiness status" className="input-control" onChange={(event) => updateFilter(() => setStatus(event.target.value))} value={status}>{["All", "Ready", "Warning", "Blocked"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.length}</strong> areas</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href="/api/hr-admin/reports/compliance-summary" prefetch={false}>Export summary</Link>
          <Link className="button button--ghost" href="/api/hr-admin/reports/compliance-summary?format=manifest" prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table statutory-deductions-table">
            <thead><tr><th scope="col">Area</th><th scope="col">Status</th><th scope="col">Owner</th><th scope="col">Signal</th><th scope="col">Evidence</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.area}</strong><span>{row.id}</span></td>
                  <td><span className={statusClass(row.status)}>{row.status}</span></td>
                  <td>{row.owner}</td>
                  <td>{row.signal}</td>
                  <td>{row.evidence}</td>
                  <td><Link className="button button--secondary" href={row.route}>Open</Link></td>
                </tr>
              ))}
              {visibleRows.length === 0 ? <tr><td colSpan={6}><div className="empty-state">No compliance summary areas match the selected filters.</div></td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Compliance summary pagination">
          <button className="button button--secondary" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} type="button">Next</button>
        </div>
      </div>
    </section>
  );
}
