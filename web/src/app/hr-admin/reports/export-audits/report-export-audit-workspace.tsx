"use client";

import { useEffect, useMemo, useState } from "react";

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

export function ReportExportAuditWorkspace() {
  const [items, setItems] = useState<ExportAudit[]>([]);
  const [query, setQuery] = useState("");
  const [reportKey, setReportKey] = useState("All");
  const [exportType, setExportType] = useState("All");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (reportKey !== "All") params.set("report_key", reportKey);
    if (exportType !== "All") params.set("export_type", exportType);
    setStatus("loading");
    fetch(`/api/hr-admin/reports/export-audits?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Export audit history could not load.");
        return response.json() as Promise<{ items: ExportAudit[] }>;
      })
      .then((payload) => {
        setItems(payload.items);
        setStatus("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, [exportType, query, reportKey]);

  const reportKeys = useMemo(() => ["All", ...Array.from(new Set(items.map((item) => item.report_key))).sort()], [items]);
  const exportTypes = ["All", "csv", "manifest"];
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleItems = items.slice(firstIndex, firstIndex + PAGE_SIZE);

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Report export audit history">
      <div className="report-catalog-workspace" data-testid="report-export-audit-workspace">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Audit records</span>
            <strong>{items.length}</strong>
            <small>Current workspace exports</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>CSV exports</span>
            <strong>{items.filter((item) => item.export_type === "csv").length}</strong>
            <small>Report downloads</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Manifests</span>
            <strong>{items.filter((item) => item.export_type === "manifest").length}</strong>
            <small>Audit proof requests</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Reports</span>
            <strong>{new Set(items.map((item) => item.report_key)).size}</strong>
            <small>Distinct report keys</small>
          </article>
        </div>

        <div className="report-catalog-toolbar statutory-deductions-toolbar" aria-label="Export audit filters">
          <label>
            <span>Search audits</span>
            <input
              className="input-control"
              type="search"
              value={query}
              onChange={(event) => updateFilter(() => setQuery(event.target.value))}
              placeholder="Search report, checksum, filters, request"
            />
          </label>
          <label>
            <span>Report</span>
            <select aria-label="Report key" className="input-control" value={reportKey} onChange={(event) => updateFilter(() => setReportKey(event.target.value))}>
              {reportKeys.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? item : titleCase(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Export type</span>
            <select aria-label="Export type" className="input-control" value={exportType} onChange={(event) => updateFilter(() => setExportType(event.target.value))}>
              {exportTypes.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? item : titleCase(item)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip">
            <strong>{currentPage}</strong> of {pageCount} pages
          </span>
          <span className="queue-summary-chip">
            <strong>{status === "loading" ? "Loading" : status === "error" ? "Blocked" : "Ready"}</strong> status
          </span>
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
            Showing {items.length === 0 ? 0 : firstIndex + 1}-{Math.min(firstIndex + PAGE_SIZE, items.length)} of {items.length}
          </span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
