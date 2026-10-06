"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ReportCatalogItem } from "@/lib/report-catalog";

type ReportGroup = {
  key: string;
  label: string;
  reports: string[];
};

type Props = {
  reports: ReportCatalogItem[];
  groups: ReportGroup[];
  exportHref?: string;
};

function statusClass(status: ReportCatalogItem["status"]) {
  if (status === "Ready") return "record-chip record-chip--success";
  if (status === "Provider gated") return "record-chip record-chip--warning";
  return "record-chip";
}

function manifestHref(exportRoute: string) {
  const separator = exportRoute.includes("?") ? "&" : "?";
  return `${exportRoute}${separator}format=manifest`;
}

export function ReportFamilyWorkspace({ reports, groups, exportHref = "/hr-admin/reports/export-audits" }: Props) {
  const [activeGroup, setActiveGroup] = useState(groups[0]?.key ?? "all");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const selectedGroup = groups.find((group) => group.key === activeGroup) ?? groups[0];
  const visibleReports = useMemo(() => {
    if (!selectedGroup) return reports;
    const normalizedQuery = query.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesGroup = selectedGroup.reports.includes(report.key);
      const matchesStatus = statusFilter === "All" || report.status === statusFilter;
      const matchesQuery = normalizedQuery
        ? [
            report.title,
            report.key,
            report.description,
            report.primaryPersona,
            report.status,
            report.filters.join(" "),
            report.exports.join(" "),
          ].join(" ").toLowerCase().includes(normalizedQuery)
        : true;
      return matchesGroup && matchesStatus && matchesQuery;
    });
  }, [query, reports, selectedGroup, statusFilter]);
  const statuses = useMemo(() => ["All", ...Array.from(new Set(reports.map((report) => report.status))).sort()], [reports]);

  function clearFilters() {
    setActiveGroup(groups[0]?.key ?? "all");
    setQuery("");
    setStatusFilter("All");
  }

  return (
    <section className="section section--tight" aria-label="Report family workspace">
      <div className="report-catalog-workspace report-family-workspace" data-testid="report-family-workspace">
        <div className="report-command-panel">
          <div>
            <small className="workspace-card__eyebrow">Report workspace</small>
            <h2>Choose a certified report</h2>
            <p className="section-copy section-copy-soft">Find the right report, export evidence with a manifest, or print the filtered report catalog for review.</p>
          </div>
          <div className="report-command-panel__actions">
            <Link className="button button--secondary" href={exportHref}>
              Export audit history
            </Link>
            <button className="button button--ghost" type="button" onClick={() => window.print()}>
              Print workspace
            </button>
          </div>
        </div>

        <div className="report-category-tabs" role="tablist" aria-label="Report subgroups">
          {groups.map((group) => (
            <button
              aria-selected={group.key === activeGroup}
              className="report-category-tab"
              key={group.key}
              onClick={() => setActiveGroup(group.key)}
              role="tab"
              type="button"
            >
              {group.label}
            </button>
          ))}
        </div>

        <div className="report-filter-panel" aria-label="Report family filters">
          <div className="report-filter-panel__header">
            <div>
              <strong>Filter report catalog</strong>
              <span>Search by report, workflow, evidence type, export type, or readiness status.</span>
            </div>
            <button className="button button--ghost" type="button" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
          <div className="report-filter-grid report-filter-grid--report-family">
            <label className="report-filter-field">
              Search reports
              <input className="input-control" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports, filters, evidence..." />
            </label>
            <label className="report-filter-field">
              Group
              <select aria-label="Report group" className="input-control" value={activeGroup} onChange={(event) => setActiveGroup(event.target.value)}>
                {groups.map((group) => (
                  <option key={group.key} value={group.key}>
                    {group.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="report-filter-field">
              Readiness
              <select className="input-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{visibleReports.length}</strong> reports in view</span>
          <span className="queue-summary-chip"><strong>{visibleReports.filter((report) => report.status === "Ready").length}</strong> ready</span>
          <span className="queue-summary-chip"><strong>{visibleReports.filter((report) => report.exportRoute).length}</strong> exportable</span>
        </div>

        <div className="report-family-grid">
          {visibleReports.map((report) => (
            <article className="report-family-card" key={report.key}>
              <div className="workspace-card__header">
                <span className="workspace-card__eyebrow">{report.primaryPersona}</span>
                <h2>{report.title}</h2>
              </div>
              <p className="section-copy section-copy-soft">{report.description}</p>
              <div className="reports-export-card__meta">
                <span className={statusClass(report.status)}>{report.status}</span>
                <span className="queue-summary-chip"><strong>{report.filters.length}</strong> filters</span>
                <span className="queue-summary-chip"><strong>{report.exports.join(", ")}</strong></span>
              </div>
              <div className="detail-grid detail-grid--compact">
                <div className="detail-row">
                  <span className="detail-label">Filters</span>
                  <span className="detail-value">{report.filters.join(", ")}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Evidence</span>
                  <span className="detail-value">{report.exportRoute ? "Checksum, manifest, audit trail" : "Workspace report"}</span>
                </div>
              </div>
              <div className="report-row-actions">
                {report.route ? (
                  <Link className="button button--secondary" href={report.route}>
                    Open report
                  </Link>
                ) : null}
                {report.exportRoute ? (
                  <Link className="button button--ghost" href={report.exportRoute} prefetch={false}>
                    Export
                  </Link>
                ) : null}
                {report.exportRoute ? (
                  <Link className="button button--ghost" href={manifestHref(report.exportRoute)} prefetch={false}>
                    Manifest
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
          {visibleReports.length === 0 ? (
            <div className="empty-state">No reports match the selected filters.</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
