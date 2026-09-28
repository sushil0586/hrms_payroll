"use client";

import Link from "next/link";
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

function moduleLink(importType: string) {
  if (importType.includes("organization")) return { href: "/hr-admin/organization", label: "Open organization" };
  if (importType.includes("bank") || importType.includes("employee") || importType.includes("manager")) {
    return { href: "/hr-admin/employees", label: "Open employees" };
  }
  return { href: "/hr-admin/import-history", label: "Open imports" };
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

  function resetFilters() {
    setQuery("");
    setImportType("All");
    setStatus("All");
    setPage(1);
    setLoadState("loading");
  }

  const hasActiveFilters = Boolean(query.trim()) || importType !== "All" || status !== "All";

  return (
    <section className="section section--tight" aria-label="Import batch history">
      <div className="report-catalog-workspace import-history-workspace" data-testid="import-history-workspace">
        <div className="metric-grid-modern payroll-setup-metrics import-history-metrics">
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

        <div className="report-catalog-toolbar import-history-toolbar" aria-label="Import history filters">
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
          <div className="import-history-toolbar__actions">
            <button className="button button--secondary" type="button" disabled={!hasActiveFilters} onClick={resetFilters}>
              Reset
            </button>
          </div>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <span className="queue-summary-chip"><strong>{items.length === 0 ? 0 : firstIndex + 1}-{Math.min(firstIndex + PAGE_SIZE, items.length)}</strong> shown</span>
          <span className="queue-summary-chip"><strong>{loadState === "loading" ? "Loading" : loadState === "error" ? "Blocked" : "Ready"}</strong> status</span>
        </div>

        {visibleItems.length === 0 ? (
          <div className="empty-state">{loadState === "loading" ? "Loading import history." : "No import batches match the selected filters."}</div>
        ) : (
          <div className="import-history-list" aria-label="Import batch results">
            {visibleItems.map((item) => {
              const rowErrors = item.row_errors ?? [];
              const firstError = rowErrors[0]?.message ? String(rowErrors[0].message) : "No row errors";
              const link = moduleLink(item.import_type);

              return (
                <article className="import-history-card" key={item.id}>
                  <div className="import-history-card__header">
                    <div className="import-history-card__identity">
                      <span className="workspace-card__eyebrow">{formatDate(item.created_at)}</span>
                      <h2>{titleCase(item.import_type)}</h2>
                      <p>{item.file_name || "Browser CSV"} · {item.actor_identifier || "System"}</p>
                    </div>
                    <div className="import-history-card__actions">
                      <span className={statusClass(item.status)}>{titleCase(item.status)}</span>
                      <Link className="button button--secondary" href={link.href}>{link.label}</Link>
                    </div>
                  </div>

                  <div className="import-history-card__grid">
                    <div className="import-history-fact">
                      <span>Rows</span>
                      <strong>{item.row_count ?? 0} total</strong>
                      <small>{item.ready_count ?? 0} ready · {item.created_count ?? 0} created · {item.blocked_count ?? 0} blocked · {item.failed_count ?? 0} failed</small>
                    </div>
                    <div className="import-history-fact">
                      <span>Hashes</span>
                      <code>{item.source_hash.slice(0, 20)}</code>
                      <code>{item.batch_hash.slice(0, 20)}</code>
                      <small>{item.source_ref}</small>
                    </div>
                    <div className="import-history-fact">
                      <span>Errors</span>
                      <strong>{rowErrors.length} row issues</strong>
                      <small>{firstError}</small>
                    </div>
                    <div className="import-history-fact">
                      <span>Rollback</span>
                      <strong>{item.rollback_supported ? "Supported" : "Manual review"}</strong>
                      <small>{titleCase(item.rollback_status || "not_requested")}</small>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="pagination-bar" aria-label="Import history pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {items.length === 0 ? 0 : firstIndex + 1}-{Math.min(firstIndex + PAGE_SIZE, items.length)} of {items.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
