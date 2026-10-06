"use client";

import { useEffect, useMemo, useState } from "react";

import { reportCatalog } from "@/lib/report-catalog";

type ExportAudit = {
  id: string;
  actor_display: string;
  report_key: string;
  export_type: "csv" | "manifest";
  filters: Record<string, string>;
  row_count: number;
  checksum_sha256: string;
  content_type: string;
  source_endpoints: string[];
  evidence_columns: string[];
  generated_at: string;
  request_identifier: string;
};

const PAGE_SIZE = 8;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function chipClass(value: string) {
  if (value === "csv") return "record-chip record-chip--success";
  if (value === "manifest") return "record-chip record-chip--accent";
  return "record-chip";
}

function auditMatchesFilters(item: ExportAudit, filters: { exportType: string; query: string; reportKey: string }) {
  if (filters.reportKey !== "All" && item.report_key !== filters.reportKey) return false;
  if (filters.exportType !== "All" && item.export_type !== filters.exportType) return false;
  const normalizedQuery = filters.query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return [
    item.actor_display,
    item.report_key,
    item.export_type,
    item.checksum_sha256,
    item.request_identifier,
    item.content_type,
    JSON.stringify(item.filters),
    item.source_endpoints.join(" "),
    item.evidence_columns.join(" "),
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

export function ReportExportAuditWorkspace() {
  const [items, setItems] = useState<ExportAudit[]>([]);
  const [query, setQuery] = useState("");
  const [reportKey, setReportKey] = useState("All");
  const [exportType, setExportType] = useState("All");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (reportKey !== "All") params.set("report_key", reportKey);
    if (exportType !== "All") params.set("export_type", exportType);
    queueMicrotask(() => {
      if (!active) return;
      setItems([]);
      setStatus("loading");
    });
    fetch(`/api/hr-admin/reports/export-audits?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Export audit history could not load.");
        return response.json() as Promise<{ items: ExportAudit[] }>;
      })
      .then((payload) => {
        if (!active) return;
        setItems(payload.items.filter((item) => auditMatchesFilters(item, { exportType, query, reportKey })));
        setStatus("ready");
      })
      .catch((error) => {
        if (active && error.name !== "AbortError") setStatus("error");
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [exportType, query, reloadToken, reportKey]);

  const reportKeys = useMemo(
    () => ["All", ...Array.from(new Set([...reportCatalog.map((item) => item.key), ...items.map((item) => item.report_key)])).sort()],
    [items],
  );
  const exportTypes = ["All", "csv", "manifest"];
  const filteredItems = useMemo(
    () => items.filter((item) => auditMatchesFilters(item, { exportType, query, reportKey })),
    [exportType, items, query, reportKey],
  );
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleItems = filteredItems.slice(firstIndex, firstIndex + PAGE_SIZE);

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  function clearFilters() {
    setQuery("");
    setReportKey("All");
    setExportType("All");
    setPage(1);
  }

  function reloadAudits() {
    setReloadToken((value) => value + 1);
  }

  return (
    <section className="section section--tight" aria-label="Report export audit history">
      <div className="report-catalog-workspace" data-testid="report-export-audit-workspace">
        <div className="report-command-panel">
          <div>
            <small className="workspace-card__eyebrow">Export evidence ledger</small>
            <h2>Report download audit trail</h2>
            <p className="section-copy section-copy-soft">Review who generated each CSV or manifest, which filters were used, and which checksum proves the exported evidence.</p>
          </div>
          <div className="report-command-panel__actions">
            <button className="button button--secondary" type="button" onClick={reloadAudits}>
              Refresh history
            </button>
            <button className="button button--ghost" type="button" onClick={() => window.print()}>
              Print audit
            </button>
          </div>
        </div>

        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Audit records</span>
            <strong>{filteredItems.length}</strong>
            <small>Current workspace exports</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>CSV exports</span>
            <strong>{filteredItems.filter((item) => item.export_type === "csv").length}</strong>
            <small>Report downloads</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Manifests</span>
            <strong>{filteredItems.filter((item) => item.export_type === "manifest").length}</strong>
            <small>Audit proof requests</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Reports</span>
            <strong>{new Set(filteredItems.map((item) => item.report_key)).size}</strong>
            <small>Distinct report keys</small>
          </article>
        </div>

        <div className="report-filter-panel" aria-label="Export audit filters">
          <div className="report-filter-panel__header">
            <div>
              <strong>Filter export history</strong>
              <span>Find records by report key, checksum, source endpoint, evidence column, request id, or filter payload.</span>
            </div>
            <button className="button button--ghost" type="button" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
          <div className="report-filter-grid report-filter-grid--export-audit">
            <label className="report-filter-field">
              Search audits
              <input
                className="input-control"
                type="search"
                value={query}
                onChange={(event) => updateFilter(() => setQuery(event.target.value))}
                onInput={(event) => updateFilter(() => setQuery(event.currentTarget.value))}
                placeholder="Search report, checksum, filters, request"
              />
            </label>
            <label className="report-filter-field">
              Report
              <select aria-label="Report key" className="input-control" value={reportKey} onChange={(event) => updateFilter(() => setReportKey(event.target.value))}>
                {reportKeys.map((item) => (
                  <option key={item} value={item}>
                    {item === "All" ? item : titleCase(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="report-filter-field">
              Export type
              <select aria-label="Export type" className="input-control" value={exportType} onChange={(event) => updateFilter(() => setExportType(event.target.value))}>
                {exportTypes.map((item) => (
                  <option key={item} value={item}>
                    {item === "All" ? item : titleCase(item)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip">
            <strong>{currentPage}</strong> of {pageCount} pages
          </span>
          <span className="queue-summary-chip">
            <strong>{status === "loading" ? "Loading" : status === "error" ? "Blocked" : "Ready"}</strong> status
          </span>
          {status === "error" ? (
            <button className="button button--secondary" type="button" onClick={reloadAudits}>
              Retry loading
            </button>
          ) : null}
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table statutory-deductions-table">
            <thead>
              <tr>
                <th scope="col">Generated</th>
                <th scope="col">Report</th>
                <th scope="col">Type</th>
                <th scope="col">Rows</th>
                <th scope="col">Checksum</th>
                <th scope="col">Filters</th>
                <th scope="col">Evidence</th>
                <th scope="col">Actor</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.generated_at)}</td>
                  <td>
                    <strong>{titleCase(item.report_key)}</strong>
                    <code>{item.report_key}</code>
                  </td>
                  <td>
                    <span className={chipClass(item.export_type)}>{titleCase(item.export_type)}</span>
                    <span>{item.content_type}</span>
                  </td>
                  <td>{item.row_count}</td>
                  <td>
                    <code>{item.checksum_sha256.slice(0, 20)}</code>
                  </td>
                  <td>
                    <code>{JSON.stringify(item.filters)}</code>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{item.source_endpoints.length} sources</span>
                      <span>{item.evidence_columns.length} columns</span>
                      <span>{item.source_endpoints.join(", ") || "No source endpoint"}</span>
                      <code>{item.evidence_columns.join(", ") || "No evidence columns"}</code>
                      <code>{item.request_identifier}</code>
                    </div>
                  </td>
                  <td>{item.actor_display}</td>
                </tr>
              ))}
              {visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">{status === "loading" ? "Loading export audit history." : "No export audit records match the selected filters."}</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Export audit pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Previous
          </button>
          <span>
            Showing {filteredItems.length === 0 ? 0 : firstIndex + 1}-{Math.min(firstIndex + PAGE_SIZE, filteredItems.length)} of {filteredItems.length}
          </span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
