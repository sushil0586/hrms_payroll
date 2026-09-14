"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  HrAdminPayrollFinanceHandoffSetupResponse,
  HrAdminPayrollOutputArtifact,
  HrAdminPayrollProviderDelivery,
  HrAdminPayrollStatutorySetupResponse,
} from "@/lib/types";

type ReadinessStatus = "Ready" | "Warning" | "Blocked";

type ReadinessRow = {
  id: string;
  gate: string;
  area: string;
  status: ReadinessStatus;
  owner: string;
  signal: string;
  evidence: string;
  sourceHash: string;
  actionHref: string;
};

const PAGE_SIZE = 8;
const ptType = "professional_tax";

function statusClass(status: ReadinessStatus) {
  if (status === "Ready") return "record-chip record-chip--success";
  if (status === "Warning") return "record-chip record-chip--warning";
  return "record-chip record-chip--danger";
}

function gateStatus(isReady: boolean, hasPartialEvidence = false): ReadinessStatus {
  if (isReady) return "Ready";
  return hasPartialEvidence ? "Warning" : "Blocked";
}

function sourceHashFrom(items: Array<{ source_hash?: string }>) {
  return items.find((item) => item.source_hash)?.source_hash ?? "source_hash.pending";
}

function textIncludesPt(value: unknown) {
  return typeof value === "string" && /professional.?tax|\bpt\b|state_tax|pt_return/i.test(value);
}

function artifactLooksPt(artifact: HrAdminPayrollOutputArtifact) {
  if (artifact.kind !== "statutory_report") return false;
  const text = JSON.stringify([artifact.title, artifact.config_snapshot, artifact.line_snapshot]).toLowerCase();
  return text.includes("professional_tax") || text.includes("professional tax") || text.includes("pt_return") || /\bpt\b/.test(text);
}

function buildRows({
  artifacts,
  deliveries,
  statutory,
}: {
  artifacts: HrAdminPayrollOutputArtifact[];
  deliveries: HrAdminPayrollProviderDelivery[];
  statutory: HrAdminPayrollStatutorySetupResponse;
}): ReadinessRow[] {
  const ptComponents = statutory.statutory_components.filter((component) => component.statutory_type === ptType || textIncludesPt(component.code) || textIncludesPt(component.name));
  const activePtComponents = ptComponents.filter((component) => component.status === "active");
  const ptRegistrations = statutory.employer_registrations.filter((registration) => registration.statutory_type === ptType || textIncludesPt(registration.registration_type_ref));
  const activePtRegistrations = ptRegistrations.filter((registration) => registration.status === "active" && registration.registration_number);
  const ptCalendars = statutory.filing_calendars.filter((calendar) => calendar.statutory_type === ptType || textIncludesPt(calendar.filing_type_ref) || textIncludesPt(calendar.name));
  const ptArtifacts = artifacts.filter(artifactLooksPt);
  const ptDeliveries = deliveries.filter((delivery) => delivery.artifact_kind === "statutory_report" && (textIncludesPt(delivery.output_artifact_title) || textIncludesPt(delivery.provider_ref)));
  const profilesWithState = statutory.employee_profiles.filter((profile) => profile.professional_tax_state.trim());
  const distinctStates = Array.from(new Set(profilesWithState.map((profile) => profile.professional_tax_state))).filter(Boolean);
  const publishedArtifacts = ptArtifacts.filter((artifact) => artifact.status === "published");
  const acknowledgedDeliveries = ptDeliveries.filter((delivery) => ["acknowledged", "reconciled"].includes(delivery.status));
  const dueCalendars = ptCalendars.filter((calendar) => calendar.is_due || calendar.is_overdue);
  const acknowledgedCalendars = ptCalendars.filter((calendar) => ["acknowledged", "filed"].includes(calendar.status));

  return [
    {
      id: "pt-component",
      gate: "Professional Tax component setup",
      area: "Configuration",
      status: gateStatus(activePtComponents.length > 0, ptComponents.length > 0),
      owner: "HR Admin",
      signal: `${activePtComponents.length}/${ptComponents.length} active PT components`,
      evidence: activePtComponents[0]?.statutory_treatment_ref || "Configure active PT component",
      sourceHash: activePtComponents[0]?.statutory_treatment_ref || ptComponents[0]?.statutory_treatment_ref || "source_hash.pending",
      actionHref: "/hr-admin/payroll-statutory",
    },
    {
      id: "pt-state-coverage",
      gate: "Employee PT state coverage",
      area: "Employee profile",
      status: gateStatus(statutory.employee_profiles.length > 0 && profilesWithState.length === statutory.employee_profiles.length, profilesWithState.length > 0),
      owner: "HR Admin",
      signal: `${profilesWithState.length}/${statutory.employee_profiles.length} profiles with PT state`,
      evidence: distinctStates.length ? distinctStates.join(", ") : "Assign professional tax state",
      sourceHash: sourceHashFrom(profilesWithState),
      actionHref: "/hr-admin/payroll-statutory",
    },
    {
      id: "pt-registration",
      gate: "Employer PT registration",
      area: "Registration",
      status: gateStatus(activePtRegistrations.length > 0, ptRegistrations.length > 0),
      owner: "Payroll Finance",
      signal: `${activePtRegistrations.length}/${ptRegistrations.length} active registrations`,
      evidence: activePtRegistrations[0]?.registration_number || "Add PT employer registration",
      sourceHash: sourceHashFrom(ptRegistrations),
      actionHref: "/hr-admin/payroll-statutory",
    },
    {
      id: "pt-calendar",
      gate: "PT return filing calendar",
      area: "Calendar",
      status: gateStatus(ptCalendars.length > 0 && dueCalendars.length === 0, ptCalendars.length > 0),
      owner: "Payroll Finance",
      signal: `${ptCalendars.length} calendars, ${dueCalendars.length} due/overdue`,
      evidence: acknowledgedCalendars.length > 0 ? `${acknowledgedCalendars.length} acknowledged` : "Due status needs monitoring",
      sourceHash: sourceHashFrom(ptCalendars),
      actionHref: "/hr-admin/reports/statutory-filing-status",
    },
    {
      id: "pt-deduction-artifact",
      gate: "PT deduction artifact evidence",
      area: "Artifacts",
      status: gateStatus(publishedArtifacts.length > 0, ptArtifacts.length > 0),
      owner: "Payroll Finance",
      signal: `${publishedArtifacts.length}/${ptArtifacts.length} published PT artifacts`,
      evidence: publishedArtifacts[0]?.title || "Generate statutory report artifact",
      sourceHash: sourceHashFrom(ptArtifacts),
      actionHref: "/hr-admin/reports/statutory-deductions",
    },
    {
      id: "provider-route",
      gate: "Provider PT return route",
      area: "Provider",
      status: gateStatus(acknowledgedDeliveries.length > 0, ptDeliveries.length > 0),
      owner: "Payroll Finance",
      signal: `${acknowledgedDeliveries.length}/${ptDeliveries.length} acknowledged deliveries`,
      evidence: acknowledgedDeliveries[0]?.provider_ref || ptDeliveries[0]?.provider_ref || "Provider route pending",
      sourceHash: acknowledgedDeliveries[0]?.payload_checksum_sha256 || ptDeliveries[0]?.payload_checksum_sha256 || "source_hash.pending",
      actionHref: "/hr-admin/reports/provider-filing-receipts",
    },
  ];
}

export function ProfessionalTaxReadinessWorkspace({
  artifacts,
  deliveries,
  statutory,
}: {
  artifacts: HrAdminPayrollFinanceHandoffSetupResponse["artifacts"];
  deliveries: HrAdminPayrollFinanceHandoffSetupResponse["deliveries"];
  statutory: HrAdminPayrollStatutorySetupResponse;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [area, setArea] = useState("All");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => buildRows({ artifacts, deliveries, statutory }), [artifacts, deliveries, statutory]);
  const areas = useMemo(() => ["All", ...Array.from(new Set(rows.map((row) => row.area))).sort()], [rows]);
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = status === "All" || row.status === status;
      const matchesArea = area === "All" || row.area === area;
      const matchesQuery = !normalized || [row.gate, row.area, row.owner, row.signal, row.evidence, row.sourceHash].join(" ").toLowerCase().includes(normalized);
      return matchesStatus && matchesArea && matchesQuery;
    });
  }, [area, query, rows, status]);

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
    <section className="section section--tight" aria-label="Professional Tax readiness workspace">
      <div className="report-catalog-workspace statutory-filing-status-report" data-testid="professional-tax-readiness-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft"><span>Readiness</span><strong>{readiness}</strong><small>{readyCount}/{rows.length} gates ready</small></article>
          <article className="metric-tile metric-tile-soft"><span>Warnings</span><strong>{warningCount}</strong><small>Partial evidence</small></article>
          <article className="metric-tile metric-tile-soft"><span>Blocked gates</span><strong>{blockedCount}</strong><small>Must close before return</small></article>
          <article className="metric-tile metric-tile-soft"><span>PT artifacts</span><strong>{artifacts.filter(artifactLooksPt).length}</strong><small>Source evidence</small></article>
        </div>

        <div className="report-catalog-toolbar statutory-deductions-toolbar" aria-label="Professional Tax readiness filters">
          <label><span>Search gates</span><input aria-label="Search gates" className="input-control" onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search gate, owner, evidence, hash" type="search" value={query} /></label>
          <label><span>Readiness status</span><select aria-label="Readiness status" className="input-control" onChange={(event) => updateFilter(() => setStatus(event.target.value))} value={status}>{["All", "Ready", "Warning", "Blocked"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Gate area</span><select aria-label="Gate area" className="input-control" onChange={(event) => updateFilter(() => setArea(event.target.value))} value={area}>{areas.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.length}</strong> gates</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href="/api/hr-admin/reports/professional-tax-package" prefetch={false}>Download PT package</Link>
          <Link className="button button--ghost" href="/api/hr-admin/reports/professional-tax-package?format=manifest" prefetch={false}>Package manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table statutory-deductions-table">
            <thead><tr><th scope="col">Gate</th><th scope="col">Area</th><th scope="col">Status</th><th scope="col">Owner</th><th scope="col">Signal</th><th scope="col">Evidence</th><th scope="col">Source</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.gate}</strong><span>{row.id}</span></td>
                  <td>{row.area}</td>
                  <td><span className={statusClass(row.status)}>{row.status}</span></td>
                  <td>{row.owner}</td>
                  <td>{row.signal}</td>
                  <td>{row.evidence}</td>
                  <td><code>{row.sourceHash.slice(0, 20)}</code></td>
                  <td><Link className="button button--secondary" href={row.actionHref}>Open</Link></td>
                </tr>
              ))}
              {visibleRows.length === 0 ? <tr><td colSpan={8}><div className="empty-state">No Professional Tax readiness gates match the selected filters.</div></td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Professional Tax readiness pagination">
          <button className="button button--secondary" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} type="button">Next</button>
        </div>
      </div>
    </section>
  );
}
