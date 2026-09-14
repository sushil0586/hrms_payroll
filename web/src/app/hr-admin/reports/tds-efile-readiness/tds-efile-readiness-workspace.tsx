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
const tdsType = "tax_deducted_at_source";

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

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

function textIncludesTds(value: unknown) {
  return typeof value === "string" && /tds|24q|tax_deducted_at_source|income_tax/i.test(value);
}

function artifactLooksTds(artifact: HrAdminPayrollOutputArtifact) {
  if (artifact.kind !== "statutory_report") return false;
  const snapshotText = JSON.stringify([artifact.title, artifact.config_snapshot, artifact.line_snapshot]).toLowerCase();
  return snapshotText.includes("tds") || snapshotText.includes("24q") || snapshotText.includes("tax_deducted_at_source") || snapshotText.includes("income_tax");
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
  const tdsComponents = statutory.statutory_components.filter((component) => component.statutory_type === tdsType);
  const activeTdsComponents = tdsComponents.filter((component) => component.status === "active");
  const tdsRegistrations = statutory.employer_registrations.filter((registration) => registration.statutory_type === tdsType || textIncludesTds(registration.registration_type_ref));
  const activeTdsRegistrations = tdsRegistrations.filter((registration) => registration.status === "active" && registration.registration_number);
  const tdsCalendars = statutory.filing_calendars.filter((calendar) => calendar.statutory_type === tdsType || textIncludesTds(calendar.filing_type_ref) || textIncludesTds(calendar.name));
  const tdsArtifacts = artifacts.filter(artifactLooksTds);
  const tdsDeliveries = deliveries.filter((delivery) => delivery.artifact_kind === "statutory_report" && (textIncludesTds(delivery.output_artifact_title) || textIncludesTds(delivery.provider_ref)));
  const profilesWithPan = statutory.employee_profiles.filter((profile) => profile.pan_number.trim());
  const lockedDeclarations = statutory.declarations.filter((declaration) => declaration.status === "locked");
  const verifiedDeclarationItems = statutory.declaration_items.filter((item) => item.proof_status === "verified");
  const publishedArtifacts = tdsArtifacts.filter((artifact) => artifact.status === "published");
  const acknowledgedDeliveries = tdsDeliveries.filter((delivery) => ["acknowledged", "reconciled"].includes(delivery.status));
  const dueCalendars = tdsCalendars.filter((calendar) => calendar.is_due || calendar.is_overdue);
  const acknowledgedCalendars = tdsCalendars.filter((calendar) => ["acknowledged", "filed"].includes(calendar.status));

  return [
    {
      id: "tds-component",
      gate: "TDS component setup",
      area: "Configuration",
      status: gateStatus(activeTdsComponents.length > 0, tdsComponents.length > 0),
      owner: "HR Admin",
      signal: `${activeTdsComponents.length}/${tdsComponents.length} active TDS components`,
      evidence: activeTdsComponents[0]?.statutory_treatment_ref || "Configure active TDS component",
      sourceHash: activeTdsComponents[0]?.statutory_treatment_ref || tdsComponents[0]?.statutory_treatment_ref || "source_hash.pending",
      actionHref: "/hr-admin/payroll-statutory",
    },
    {
      id: "tds-registration",
      gate: "Employer TAN registration",
      area: "Registration",
      status: gateStatus(activeTdsRegistrations.length > 0, tdsRegistrations.length > 0),
      owner: "Payroll Finance",
      signal: `${activeTdsRegistrations.length}/${tdsRegistrations.length} active registrations`,
      evidence: activeTdsRegistrations[0]?.registration_number || "Add TAN/employer registration",
      sourceHash: sourceHashFrom(tdsRegistrations),
      actionHref: "/hr-admin/payroll-statutory",
    },
    {
      id: "tds-calendar",
      gate: "Form 24Q filing calendar",
      area: "Calendar",
      status: gateStatus(tdsCalendars.length > 0 && dueCalendars.length === 0, tdsCalendars.length > 0),
      owner: "Payroll Finance",
      signal: `${tdsCalendars.length} calendars, ${dueCalendars.length} due/overdue`,
      evidence: acknowledgedCalendars.length > 0 ? `${acknowledgedCalendars.length} acknowledged` : "Due status needs monitoring",
      sourceHash: sourceHashFrom(tdsCalendars),
      actionHref: "/hr-admin/reports/statutory-filing-status",
    },
    {
      id: "pan-coverage",
      gate: "Employee PAN coverage",
      area: "Employee profile",
      status: gateStatus(statutory.employee_profiles.length > 0 && profilesWithPan.length === statutory.employee_profiles.length, profilesWithPan.length > 0),
      owner: "HR Admin",
      signal: `${profilesWithPan.length}/${statutory.employee_profiles.length} profiles with PAN`,
      evidence: "PAN is required before TDS e-file extraction",
      sourceHash: sourceHashFrom(statutory.employee_profiles),
      actionHref: "/hr-admin/payroll-statutory",
    },
    {
      id: "declaration-lock",
      gate: "Tax declaration lock",
      area: "Proof review",
      status: gateStatus(statutory.declarations.length > 0 && lockedDeclarations.length === statutory.declarations.length, lockedDeclarations.length > 0),
      owner: "HR Admin",
      signal: `${lockedDeclarations.length}/${statutory.declarations.length} declarations locked`,
      evidence: `${verifiedDeclarationItems.length} verified proof rows`,
      sourceHash: sourceHashFrom(statutory.declarations),
      actionHref: "/hr-admin/payroll-statutory",
    },
    {
      id: "challan-artifact",
      gate: "Challan and deduction evidence",
      area: "Artifacts",
      status: gateStatus(publishedArtifacts.length > 0, tdsArtifacts.length > 0),
      owner: "Payroll Finance",
      signal: `${publishedArtifacts.length}/${tdsArtifacts.length} published TDS artifacts`,
      evidence: publishedArtifacts[0]?.title || "Generate statutory report artifact",
      sourceHash: sourceHashFrom(tdsArtifacts),
      actionHref: "/hr-admin/reports/challan-reconciliation",
    },
    {
      id: "provider-route",
      gate: "Provider filing route",
      area: "Provider",
      status: gateStatus(acknowledgedDeliveries.length > 0, tdsDeliveries.length > 0),
      owner: "Payroll Finance",
      signal: `${acknowledgedDeliveries.length}/${tdsDeliveries.length} acknowledged deliveries`,
      evidence: acknowledgedDeliveries[0]?.provider_ref || tdsDeliveries[0]?.provider_ref || "Provider route pending",
      sourceHash: acknowledgedDeliveries[0]?.payload_checksum_sha256 || tdsDeliveries[0]?.payload_checksum_sha256 || "source_hash.pending",
      actionHref: "/hr-admin/reports/provider-filing-receipts",
    },
  ];
}

export function TdsEfileReadinessWorkspace({
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
    <section className="section section--tight" aria-label="TDS e-file readiness workspace">
      <div className="report-catalog-workspace statutory-filing-status-report" data-testid="tds-efile-readiness-report">
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
            <small>Must close before e-file</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>TDS artifacts</span>
            <strong>{artifacts.filter(artifactLooksTds).length}</strong>
            <small>Source evidence</small>
          </article>
        </div>

        <div className="report-catalog-toolbar statutory-deductions-toolbar" aria-label="TDS readiness filters">
          <label>
            <span>Search gates</span>
            <input
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
          <Link className="button button--secondary" href="/api/hr-admin/reports/tds-efile-package" prefetch={false}>
            Download TDS e-file package
          </Link>
          <Link className="button button--ghost" href="/api/hr-admin/reports/tds-efile-package?format=manifest" prefetch={false}>
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
                    <div className="empty-state">No TDS readiness gates match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="TDS readiness pagination">
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
