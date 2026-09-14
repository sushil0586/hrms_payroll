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
const pfType = "provident_fund";

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

function textIncludesPf(value: unknown) {
  return typeof value === "string" && /pf|epf|eps|edli|ecr|uan|provident/i.test(value);
}

function artifactLooksPf(artifact: HrAdminPayrollOutputArtifact) {
  if (artifact.kind !== "statutory_report") return false;
  const snapshotText = JSON.stringify([artifact.title, artifact.config_snapshot, artifact.line_snapshot]).toLowerCase();
  return snapshotText.includes("provident") || snapshotText.includes("pf") || snapshotText.includes("epf") || snapshotText.includes("eps") || snapshotText.includes("ecr");
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
  const pfComponents = statutory.statutory_components.filter((component) => component.statutory_type === pfType || textIncludesPf(component.code) || textIncludesPf(component.name));
  const activePfComponents = pfComponents.filter((component) => component.status === "active");
  const pfRegistrations = statutory.employer_registrations.filter((registration) => registration.statutory_type === pfType || textIncludesPf(registration.registration_type_ref));
  const activePfRegistrations = pfRegistrations.filter((registration) => registration.status === "active" && registration.registration_number);
  const pfCalendars = statutory.filing_calendars.filter((calendar) => calendar.statutory_type === pfType || textIncludesPf(calendar.filing_type_ref) || textIncludesPf(calendar.name));
  const pfArtifacts = artifacts.filter(artifactLooksPf);
  const pfDeliveries = deliveries.filter((delivery) => delivery.artifact_kind === "statutory_report" && (textIncludesPf(delivery.output_artifact_title) || textIncludesPf(delivery.provider_ref)));
  const applicableProfiles = statutory.employee_profiles.filter((profile) => profile.pf_applicable);
  const profilesWithUan = applicableProfiles.filter((profile) => profile.uan_number.trim());
  const profilesWithPfNumber = applicableProfiles.filter((profile) => profile.pf_number.trim());
  const publishedArtifacts = pfArtifacts.filter((artifact) => artifact.status === "published");
  const acknowledgedDeliveries = pfDeliveries.filter((delivery) => ["acknowledged", "reconciled"].includes(delivery.status));
  const dueCalendars = pfCalendars.filter((calendar) => calendar.is_due || calendar.is_overdue);
  const acknowledgedCalendars = pfCalendars.filter((calendar) => ["acknowledged", "filed"].includes(calendar.status));

  return [
    {
      id: "pf-component",
      gate: "PF component setup",
      area: "Configuration",
      status: gateStatus(activePfComponents.length > 0, pfComponents.length > 0),
      owner: "HR Admin",
      signal: `${activePfComponents.length}/${pfComponents.length} active PF components`,
      evidence: activePfComponents[0]?.statutory_treatment_ref || "Configure active PF component",
      sourceHash: activePfComponents[0]?.statutory_treatment_ref || pfComponents[0]?.statutory_treatment_ref || "source_hash.pending",
      actionHref: "/hr-admin/payroll-statutory",
    },
    {
      id: "pf-registration",
      gate: "Employer EPFO registration",
      area: "Registration",
      status: gateStatus(activePfRegistrations.length > 0, pfRegistrations.length > 0),
      owner: "Payroll Finance",
      signal: `${activePfRegistrations.length}/${pfRegistrations.length} active registrations`,
      evidence: activePfRegistrations[0]?.registration_number || "Add EPFO employer registration",
      sourceHash: sourceHashFrom(pfRegistrations),
      actionHref: "/hr-admin/payroll-statutory",
    },
    {
      id: "pf-calendar",
      gate: "PF ECR filing calendar",
      area: "Calendar",
      status: gateStatus(pfCalendars.length > 0 && dueCalendars.length === 0, pfCalendars.length > 0),
      owner: "Payroll Finance",
      signal: `${pfCalendars.length} calendars, ${dueCalendars.length} due/overdue`,
      evidence: acknowledgedCalendars.length > 0 ? `${acknowledgedCalendars.length} acknowledged` : "Due status needs monitoring",
      sourceHash: sourceHashFrom(pfCalendars),
      actionHref: "/hr-admin/reports/statutory-filing-status",
    },
    {
      id: "uan-coverage",
      gate: "Employee UAN coverage",
      area: "Employee profile",
      status: gateStatus(applicableProfiles.length > 0 && profilesWithUan.length === applicableProfiles.length, profilesWithUan.length > 0),
      owner: "HR Admin",
      signal: `${profilesWithUan.length}/${applicableProfiles.length} PF-applicable profiles with UAN`,
      evidence: "UAN is required before PF ECR extraction",
      sourceHash: sourceHashFrom(applicableProfiles),
      actionHref: "/hr-admin/payroll-statutory",
    },
    {
      id: "pf-member-id",
      gate: "PF member ID coverage",
      area: "Employee profile",
      status: gateStatus(applicableProfiles.length > 0 && profilesWithPfNumber.length === applicableProfiles.length, profilesWithPfNumber.length > 0),
      owner: "HR Admin",
      signal: `${profilesWithPfNumber.length}/${applicableProfiles.length} PF-applicable profiles with PF number`,
      evidence: "PF member number supports ECR reconciliation",
      sourceHash: sourceHashFrom(applicableProfiles),
      actionHref: "/hr-admin/payroll-statutory",
    },
    {
      id: "pf-wage-artifact",
      gate: "PF wage and deduction evidence",
      area: "Artifacts",
      status: gateStatus(publishedArtifacts.length > 0, pfArtifacts.length > 0),
      owner: "Payroll Finance",
      signal: `${publishedArtifacts.length}/${pfArtifacts.length} published PF artifacts`,
      evidence: publishedArtifacts[0]?.title || "Generate statutory report artifact",
      sourceHash: sourceHashFrom(pfArtifacts),
      actionHref: "/hr-admin/reports/statutory-deductions",
    },
    {
      id: "provider-route",
      gate: "Provider ECR route",
      area: "Provider",
      status: gateStatus(acknowledgedDeliveries.length > 0, pfDeliveries.length > 0),
      owner: "Payroll Finance",
      signal: `${acknowledgedDeliveries.length}/${pfDeliveries.length} acknowledged deliveries`,
      evidence: acknowledgedDeliveries[0]?.provider_ref || pfDeliveries[0]?.provider_ref || "Provider route pending",
      sourceHash: acknowledgedDeliveries[0]?.payload_checksum_sha256 || pfDeliveries[0]?.payload_checksum_sha256 || "source_hash.pending",
      actionHref: "/hr-admin/reports/provider-filing-receipts",
    },
  ];
}

export function PfEcrReadinessWorkspace({
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
    <section className="section section--tight" aria-label="PF ECR readiness workspace">
      <div className="report-catalog-workspace statutory-filing-status-report" data-testid="pf-ecr-readiness-report">
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
            <small>Must close before ECR</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>PF artifacts</span>
            <strong>{artifacts.filter(artifactLooksPf).length}</strong>
            <small>Source evidence</small>
          </article>
        </div>

        <div className="report-catalog-toolbar statutory-deductions-toolbar" aria-label="PF readiness filters">
          <label>
            <span>Search gates</span>
            <input
              aria-label="Search gates"
              className="input-control"
              onChange={(event) => updateFilter(() => setQuery(event.target.value))}
              placeholder="Search gate, owner, evidence, hash"
              type="search"
              value={query}
            />
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
          <Link className="button button--secondary" href="/api/hr-admin/reports/pf-ecr-package" prefetch={false}>
            Download PF ECR package
          </Link>
          <Link className="button button--ghost" href="/api/hr-admin/reports/pf-ecr-package?format=manifest" prefetch={false}>
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
                    <div className="empty-state">No PF ECR readiness gates match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="PF readiness pagination">
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
