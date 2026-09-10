"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ReportCatalogItem } from "@/lib/report-catalog";

const groups = [
  { key: "all", label: "All", reports: ["statutory-deductions", "challan-reconciliation", "statutory-filing-status", "provider-filing-receipts", "tds-efile-readiness"] },
  { key: "deductions", label: "Deductions", reports: ["statutory-deductions"] },
  { key: "filing", label: "Filing & Challans", reports: ["challan-reconciliation", "statutory-filing-status"] },
  { key: "provider", label: "Provider Evidence", reports: ["provider-filing-receipts"] },
  { key: "tds", label: "TDS Package", reports: ["tds-efile-readiness"] },
] as const;

type ComplianceReportGroup = (typeof groups)[number]["key"];

function readyClass(status: string) {
  if (status === "Ready") return "record-chip record-chip--success";
  if (status === "Provider gated") return "record-chip record-chip--warning";
  return "record-chip";
}

function healthSignal(report: ReportCatalogItem) {
  if (report.key === "tds-efile-readiness") return "Provider gated";
  if (report.key === "provider-filing-receipts") return "Receipt tracked";
  if (report.key === "statutory-filing-status") return "Due status";
  if (report.key === "challan-reconciliation") return "Challan ready";
  return "Source hash";
}

function manifestHref(exportRoute: string) {
  const separator = exportRoute.includes("?") ? "&" : "?";
  return `${exportRoute}${separator}format=manifest`;
}

export function ComplianceReportHubWorkspace({ reports }: { reports: ReportCatalogItem[] }) {
  const [activeGroup, setActiveGroup] = useState<ComplianceReportGroup>("all");
  const selectedGroup = groups.find((group) => group.key === activeGroup) ?? groups[0];
  const visibleReports = useMemo(
    () => reports.filter((report) => (selectedGroup.reports as readonly string[]).includes(report.key)),
    [reports, selectedGroup],
  );

  return (
    <div className="compliance-hub-workspace" data-testid="compliance-hub-workspace">
      <div className="report-category-tabs" role="tablist" aria-label="Compliance report groups">
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

      <div className="report-catalog-summary" aria-live="polite">
        <span className="queue-summary-chip">
          <strong>{visibleReports.length}</strong> reports
        </span>
        <span className="queue-summary-chip">
          <strong>{visibleReports.filter((report) => report.status === "Ready").length}</strong> ready
        </span>
        <Link className="button button--secondary" href="/hr-admin/reports/export-audits">
          Export audit history
        </Link>
        <Link className="button button--secondary" href="/api/hr-admin/reports/provider-filing-receipts?delivery_status=failed&sort=status" prefetch={false}>
          Export blocked items
        </Link>
        <Link className="button button--ghost" href="/api/hr-admin/reports/provider-filing-receipts?delivery_status=failed&sort=status&format=manifest" prefetch={false}>
          Blocked manifest
        </Link>
        <Link className="button button--secondary" href="/api/hr-admin/reports/statutory-filing-status?due_status=Overdue&sort=due_status" prefetch={false}>
          Export overdue filings
        </Link>
        <Link className="button button--ghost" href="/api/hr-admin/reports/statutory-filing-status?due_status=Overdue&sort=due_status&format=manifest" prefetch={false}>
          Overdue manifest
        </Link>
      </div>

      <div className="compliance-hub-grid">
        {visibleReports.map((report) => (
          <article className="compliance-hub-card" key={report.key}>
            <div className="workspace-card__header">
              <span className="workspace-card__eyebrow">{report.primaryPersona}</span>
              <h2>{report.title}</h2>
            </div>
            <p className="section-copy section-copy-soft">{report.description}</p>
            <div className="reports-export-card__meta">
              <span className={readyClass(report.status)}>{report.status}</span>
              <span className="queue-summary-chip">
                <strong>{healthSignal(report)}</strong>
              </span>
              <span className="queue-summary-chip">
                <strong>{report.filters.length}</strong> filters
              </span>
              <span className="queue-summary-chip">
                <strong>{report.exports.join(", ")}</strong>
              </span>
            </div>
            <div className="report-row-actions">
              {report.route ? (
                <Link className="button button--secondary" href={report.route}>
                  Open
                </Link>
              ) : null}
              {report.exportRoute ? (
                <Link className="button button--ghost" href={report.exportRoute} prefetch={false}>
                  Export
                </Link>
              ) : null}
              {report.exportRoute && report.key !== "tds-efile-readiness" && report.key !== "statutory-deductions" ? (
                <Link className="button button--ghost" href={manifestHref(report.exportRoute)} prefetch={false}>
                  Manifest
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
