"use client";

import { useEffect, useMemo, useState } from "react";

import type { ImportBatchAudit } from "@/lib/import-batch-audit";

const PAGE_SIZE = 8;

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "committed") return "record-chip record-chip--success";
  if (status === "partial" || status === "rollback_review") return "record-chip record-chip--warning";
  if (status === "failed") return "record-chip record-chip--danger";
  return "record-chip record-chip--accent";
}

export function ImportHistoryWorkspace() {
  const [items, setItems] = useState<ImportBatchAudit[]>([]);
  const [query, setQuery] = useState("");
  const [importType, setImportType] = useState("All");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (importType !== "All") params.set("import_type", importType);
    if (status !== "All") params.set("status", status);
    fetch(`/api/hr-admin/import-batches?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Import history could not load.");
        return response.json() as Promise<{ items: ImportBatchAudit[] }>;
      })
      .then((payload) => {
        setItems(payload.items);
        setLoadState("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setLoadState("error");
      });
    return () => controller.abort();
  }, [importType, query, status]);

  const importTypes = useMemo(() => ["All", ...Array.from(new Set(items.map((item) => item.import_type))).sort()], [items]);
  const statuses = ["All", "previewed", "committed", "partial", "failed", "rollback_review"];
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleItems = items.slice(firstIndex, firstIndex + PAGE_SIZE);

  function updateFilter(action: () => void) {
    action();
    setPage(1);
    setLoadState("loading");
  }

  return (
    <section className="section section--tight" aria-label="Import batch history">
      <div className="report-catalog-workspace" data-testid="import-history-workspace">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Import batches</span>
            <strong>{items.length}</strong>
            <small>Current filter</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Committed</span>
            <strong>{items.filter((item) => item.status === "committed").length}</strong>
            <small>Completed batches</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Blocked rows</span>
            <strong>{items.reduce((total, item) => total + (item.blocked_count ?? 0), 0)}</strong>
            <small>Needs correction</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Rollback ready</span>
            <strong>{items.filter((item) => item.rollback_supported).length}</strong>
            <small>Configured reversals</small>
          </article>
        </div>

        <div className="report-catalog-toolbar statutory-deductions-toolbar" aria-label="Import history filters">
          <label>
            <span>Search imports</span>
            <input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search type, actor, file, hash" />
          </label>
          <label>
            <span>Import type</span>
            <select aria-label="Import type" className="input-control" value={importType} onChange={(event) => updateFilter(() => setImportType(event.target.value))}>
              {importTypes.map((item) => (
                <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select aria-label="Import status" className="input-control" value={status} onChange={(event) => updateFilter(() => setStatus(event.target.value))}>
              {statuses.map((item) => (
                <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <span className="queue-summary-chip"><strong>{loadState === "loading" ? "Loading" : loadState === "error" ? "Blocked" : "Ready"}</strong> status</span>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table statutory-deductions-table">
            <thead>
              <tr>
                <th scope="col">Created</th>
                <th scope="col">Import</th>
                <th scope="col">Rows</th>
                <th scope="col">Hashes</th>
                <th scope="col">Errors</th>
                <th scope="col">Rollback</th>
                <th scope="col">Actor</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const rowErrors = item.row_errors ?? [];

                return (
                  <tr key={item.id}>
                    <td>{formatDate(item.created_at)}</td>
                    <td>
                      <strong>{titleCase(item.import_type)}</strong>
                      <span className={statusClass(item.status)}>{titleCase(item.status)}</span>
                      <span>{item.file_name || "Browser CSV"}</span>
                    </td>
                    <td>
                      <div className="payroll-register-stack">
                        <span>{item.row_count ?? 0} total</span>
                        <span>{item.ready_count ?? 0} ready</span>
                        <span>{item.created_count ?? 0} created</span>
                        <span>{item.blocked_count ?? 0} blocked</span>
                        <span>{item.failed_count ?? 0} failed</span>
                      </div>
                    </td>
                    <td>
                      <div className="payroll-register-stack">
                        <code>{item.source_hash.slice(0, 20)}</code>
                        <code>{item.batch_hash.slice(0, 20)}</code>
                        <span>{item.source_ref}</span>
                      </div>
                    </td>
                    <td>
                      <div className="payroll-register-stack">
                        <span>{rowErrors.length} row issues</span>
                        <span>{rowErrors[0]?.message ? String(rowErrors[0].message) : "No row errors"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="payroll-register-stack">
                        <span>{item.rollback_supported ? "Supported" : "Manual review"}</span>
                        <span>{titleCase(item.rollback_status || "not_requested")}</span>
                      </div>
                    </td>
                    <td>{item.actor_identifier}</td>
                  </tr>
                );
              })}
              {visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">{loadState === "loading" ? "Loading import history." : "No import batches match the selected filters."}</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Import history pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {items.length === 0 ? 0 : firstIndex + 1}-{Math.min(firstIndex + PAGE_SIZE, items.length)} of {items.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
