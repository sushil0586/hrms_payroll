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
const esiType = "employee_state_insurance";

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

function textIncludesEsi(value: unknown) {
  return typeof value === "string" && /esi|esic|insurance|insured|ip_number|employee_state_insurance/i.test(value);
}

function artifactLooksEsi(artifact: HrAdminPayrollOutputArtifact) {
  if (artifact.kind !== "statutory_report") return false;
  const snapshotText = JSON.stringify([artifact.title, artifact.config_snapshot, artifact.line_snapshot]).toLowerCase();
  return snapshotText.includes("esi") || snapshotText.includes("esic") || snapshotText.includes("insurance") || snapshotText.includes("employee_state_insurance");
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
  const esiComponents = statutory.statutory_components.filter((component) => component.statutory_type === esiType || textIncludesEsi(component.code) || textIncludesEsi(component.name));
  const activeEsiComponents = esiComponents.filter((component) => component.status === "active");
  const esiRegistrations = statutory.employer_registrations.filter((registration) => registration.statutory_type === esiType || textIncludesEsi(registration.registration_type_ref));
  const activeEsiRegistrations = esiRegistrations.filter((registration) => registration.status === "active" && registration.registration_number);
  const esiCalendars = statutory.filing_calendars.filter((calendar) => calendar.statutory_type === esiType || textIncludesEsi(calendar.filing_type_ref) || textIncludesEsi(calendar.name));
  const esiArtifacts = artifacts.filter(artifactLooksEsi);
  const esiDeliveries = deliveries.filter((delivery) => delivery.artifact_kind === "statutory_report" && (textIncludesEsi(delivery.output_artifact_title) || textIncludesEsi(delivery.provider_ref)));
  const applicableProfiles = statutory.employee_profiles.filter((profile) => profile.esi_applicable);
  const profilesWithEsi = applicableProfiles.filter((profile) => profile.esi_number.trim());
  const publishedArtifacts = esiArtifacts.filter((artifact) => artifact.status === "published");
  const acknowledgedDeliveries = esiDeliveries.filter((delivery) => ["acknowledged", "reconciled"].includes(delivery.status));
  const dueCalendars = esiCalendars.filter((calendar) => calendar.is_due || calendar.is_overdue);
  const acknowledgedCalendars = esiCalendars.filter((calendar) => ["acknowledged", "filed"].includes(calendar.status));

  return [
    {
      id: "esic-component",
      gate: "ESIC component setup",
      area: "Configuration",
      status: gateStatus(activeEsiComponents.length > 0, esiComponents.length > 0),
      owner: "HR Admin",
      signal: `${activeEsiComponents.length}/${esiComponents.length} active ESIC components`,
      evidence: activeEsiComponents[0]?.statutory_treatment_ref || "Configure active ESIC component",
      sourceHash: activeEsiComponents[0]?.statutory_treatment_ref || esiComponents[0]?.statutory_treatment_ref || "source_hash.pending",
      actionHref: "/hr-admin/payroll-statutory",
    },
    {
      id: "esic-registration",
      gate: "Employer ESIC registration",
      area: "Registration",
      status: gateStatus(activeEsiRegistrations.length > 0, esiRegistrations.length > 0),
      owner: "Payroll Finance",
      signal: `${activeEsiRegistrations.length}/${esiRegistrations.length} active registrations`,
      evidence: activeEsiRegistrations[0]?.registration_number || "Add ESIC employer registration",
      sourceHash: sourceHashFrom(esiRegistrations),
      actionHref: "/hr-admin/payroll-statutory",
    },
    {
      id: "esic-calendar",
      gate: "ESIC filing calendar",
      area: "Calendar",
      status: gateStatus(esiCalendars.length > 0 && dueCalendars.length === 0, esiCalendars.length > 0),
      owner: "Payroll Finance",
      signal: `${esiCalendars.length} calendars, ${dueCalendars.length} due/overdue`,
      evidence: acknowledgedCalendars.length > 0 ? `${acknowledgedCalendars.length} acknowledged` : "Due status needs monitoring",
      sourceHash: sourceHashFrom(esiCalendars),
      actionHref: "/hr-admin/reports/statutory-filing-status",
    },
    {
      id: "esi-number-coverage",
      gate: "Employee ESIC number coverage",
      area: "Employee profile",
      status: gateStatus(applicableProfiles.length > 0 && profilesWithEsi.length === applicableProfiles.length, profilesWithEsi.length > 0),
      owner: "HR Admin",
      signal: `${profilesWithEsi.length}/${applicableProfiles.length} ESI-applicable profiles with ESIC number`,
      evidence: "ESIC number is required before contribution extraction",
      sourceHash: sourceHashFrom(applicableProfiles),
      actionHref: "/hr-admin/payroll-statutory",
    },
    {
      id: "esi-wage-artifact",
      gate: "ESIC wage and contribution evidence",
      area: "Artifacts",
      status: gateStatus(publishedArtifacts.length > 0, esiArtifacts.length > 0),
      owner: "Payroll Finance",
      signal: `${publishedArtifacts.length}/${esiArtifacts.length} published ESIC artifacts`,
      evidence: publishedArtifacts[0]?.title || "Generate statutory report artifact",
      sourceHash: sourceHashFrom(esiArtifacts),
      actionHref: "/hr-admin/reports/statutory-deductions",
    },
    {
      id: "provider-route",
      gate: "Provider ESIC route",
      area: "Provider",
      status: gateStatus(acknowledgedDeliveries.length > 0, esiDeliveries.length > 0),
      owner: "Payroll Finance",
      signal: `${acknowledgedDeliveries.length}/${esiDeliveries.length} acknowledged deliveries`,
      evidence: acknowledgedDeliveries[0]?.provider_ref || esiDeliveries[0]?.provider_ref || "Provider route pending",
      sourceHash: acknowledgedDeliveries[0]?.payload_checksum_sha256 || esiDeliveries[0]?.payload_checksum_sha256 || "source_hash.pending",
      actionHref: "/hr-admin/reports/provider-filing-receipts",
    },
  ];
}

export function EsicContributionReadinessWorkspace({
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
    <section className="section section--tight" aria-label="ESIC contribution readiness workspace">
      <div className="report-catalog-workspace statutory-filing-status-report" data-testid="esic-contribution-readiness-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Readiness</span>
            <strong>{readiness}</strong>
            <small>{readyCount}/{rows.length} gates ready</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Warnings</span>
            <strong>{warningCount}</strong>
            <small>Partial evidence</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Blocked gates</span>
            <strong>{blockedCount}</strong>
            <small>Must close before filing</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>ESIC artifacts</span>
            <strong>{artifacts.filter(artifactLooksEsi).length}</strong>
            <small>Source evidence</small>
          </article>
        </div>

        <div className="report-catalog-toolbar statutory-deductions-toolbar" aria-label="ESIC readiness filters">
          <label>
            <span>Search gates</span>
            <input aria-label="Search gates" className="input-control" onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search gate, owner, evidence, hash" type="search" value={query} />
          </label>
          <label>
            <span>Readiness status</span>
            <select aria-label="Readiness status" className="input-control" onChange={(event) => updateFilter(() => setStatus(event.target.value))} value={status}>
              {["All", "Ready", "Warning", "Blocked"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Gate area</span>
            <select aria-label="Gate area" className="input-control" onChange={(event) => updateFilter(() => setArea(event.target.value))} value={area}>
              {areas.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip">
            <strong>{filteredRows.length}</strong> gates
          </span>
          <span className="queue-summary-chip">
            <strong>{currentPage}</strong> of {pageCount} pages
          </span>
          <Link className="button button--secondary" href="/api/hr-admin/reports/esic-contribution-package" prefetch={false}>
            Download ESIC package
          </Link>
          <Link className="button button--ghost" href="/api/hr-admin/reports/esic-contribution-package?format=manifest" prefetch={false}>
            Package manifest
          </Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table statutory-deductions-table">
            <thead>
              <tr>
                <th scope="col">Gate</th>
                <th scope="col">Area</th>
                <th scope="col">Status</th>
                <th scope="col">Owner</th>
                <th scope="col">Signal</th>
                <th scope="col">Evidence</th>
                <th scope="col">Source</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.gate}</strong>
                    <span>{row.id}</span>
                  </td>
                  <td>{row.area}</td>
                  <td>
                    <span className={statusClass(row.status)}>{row.status}</span>
                  </td>
                  <td>{row.owner}</td>
                  <td>{row.signal}</td>
                  <td>{row.evidence}</td>
                  <td>
                    <code>{row.sourceHash.slice(0, 20)}</code>
                  </td>
                  <td>
                    <Link className="button button--secondary" href={row.actionHref}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">No ESIC readiness gates match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="ESIC readiness pagination">
          <button className="button button--secondary" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">
            Previous
          </button>
          <span>
            Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
          </span>
          <button className="button button--secondary" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} type="button">
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
