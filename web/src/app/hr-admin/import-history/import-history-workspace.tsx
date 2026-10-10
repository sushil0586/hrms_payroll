"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { ImportBatchAudit } from "@/lib/import-batch-audit";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const IMPORT_TYPE_OPTIONS = [
  "employee_profile_bulk_import",
  "employee_bank_bulk_import",
  "reporting_manager_bulk_import",
  "attendance_record_bulk_import",
  "leave_request_bulk_import",
  "leave_policy_assignment_bulk_import",
  "employee_shift_assignment_bulk_import",
  "payroll_input_snapshot_bulk_import",
];

type ImportHistoryPayload = {
  items: ImportBatchAudit[];
  total_count?: number;
  count?: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
  has_next?: boolean;
  has_previous?: boolean;
};

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
  const [actor, setActor] = useState("");
  const [sourceHash, setSourceHash] = useState("");
  const [batchHash, setBatchHash] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [importType, setImportType] = useState("All");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") ?? "");
    setActor(params.get("actor") ?? "");
    setSourceHash(params.get("source_hash") ?? "");
    setBatchHash(params.get("batch_hash") ?? "");
    setFromDate(params.get("from_date") ?? "");
    setToDate(params.get("to_date") ?? "");
    setImportType(params.get("import_type") ?? "All");
    setStatus(params.get("status") ?? "All");
    setPage(Number(params.get("page") ?? 1) || 1);
    setPageSize(Number(params.get("page_size") ?? 25) || 25);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (actor.trim()) params.set("actor", actor.trim());
    if (sourceHash.trim()) params.set("source_hash", sourceHash.trim());
    if (batchHash.trim()) params.set("batch_hash", batchHash.trim());
    if (fromDate) params.set("from_date", fromDate);
    if (toDate) params.set("to_date", toDate);
    if (importType !== "All") params.set("import_type", importType);
    if (status !== "All") params.set("status", status);
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    const queryString = params.toString();
    window.history.replaceState(null, "", queryString ? `/hr-admin/import-history?${queryString}` : "/hr-admin/import-history");
    fetch(`/api/hr-admin/import-batches?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Import history could not load.");
        return response.json() as Promise<ImportHistoryPayload>;
      })
      .then((payload) => {
        setItems(payload.items);
        setTotalCount(payload.total_count ?? payload.count ?? payload.items.length);
        setTotalPages(payload.total_pages ?? Math.max(1, Math.ceil((payload.total_count ?? payload.count ?? payload.items.length) / pageSize)));
        setHasNext(Boolean(payload.has_next));
        setHasPrevious(Boolean(payload.has_previous));
        setLoadState("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setLoadState("error");
      });
    return () => controller.abort();
  }, [actor, batchHash, fromDate, importType, page, pageSize, query, sourceHash, status, toDate]);

  const importTypes = useMemo(() => ["All", ...Array.from(new Set([...IMPORT_TYPE_OPTIONS, ...items.map((item) => item.import_type)])).sort()], [items]);
  const statuses = ["All", "previewed", "committed", "partial", "failed", "rollback_review"];
  const currentPage = Math.min(page, totalPages);
  const firstIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastIndex = Math.min(currentPage * pageSize, totalCount);

  function updateFilter(action: () => void) {
    action();
    setPage(1);
    setLoadState("loading");
  }

  function resetFilters() {
    setQuery("");
    setActor("");
    setSourceHash("");
    setBatchHash("");
    setFromDate("");
    setToDate("");
    setImportType("All");
    setStatus("All");
    setPage(1);
    setPageSize(25);
    setLoadState("loading");
  }

  const hasActiveFilters = Boolean(query.trim()) || Boolean(actor.trim()) || Boolean(sourceHash.trim()) || Boolean(batchHash.trim()) || Boolean(fromDate) || Boolean(toDate) || importType !== "All" || status !== "All" || pageSize !== 25;

  return (
    <section className="section section--tight" aria-label="Import batch history">
      <div className="report-catalog-workspace import-history-workspace" data-testid="import-history-workspace">
        <div className="metric-grid-modern payroll-setup-metrics import-history-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Import batches</span>
            <strong>{totalCount}</strong>
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
            <span>Actor</span>
            <input className="input-control" type="search" value={actor} onChange={(event) => updateFilter(() => setActor(event.target.value))} placeholder="Uploaded by" />
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
          <label>
            <span>From</span>
            <input className="input-control" type="date" value={fromDate} onChange={(event) => updateFilter(() => setFromDate(event.target.value))} />
          </label>
          <label>
            <span>To</span>
            <input className="input-control" type="date" value={toDate} onChange={(event) => updateFilter(() => setToDate(event.target.value))} />
          </label>
          <label>
            <span>Batch hash</span>
            <input className="input-control" type="search" value={batchHash} onChange={(event) => updateFilter(() => setBatchHash(event.target.value))} placeholder="Batch hash" />
          </label>
          <label>
            <span>Source hash</span>
            <input className="input-control" type="search" value={sourceHash} onChange={(event) => updateFilter(() => setSourceHash(event.target.value))} placeholder="Source hash" />
          </label>
          <label>
            <span>Rows</span>
            <select aria-label="Rows per page" className="input-control" value={pageSize} onChange={(event) => updateFilter(() => setPageSize(Number(event.target.value)))}>
              {PAGE_SIZE_OPTIONS.map((item) => (
                <option key={item} value={item}>{item} per page</option>
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
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {totalPages} pages</span>
          <span className="queue-summary-chip"><strong>{firstIndex}-{lastIndex}</strong> shown</span>
          <span className="queue-summary-chip"><strong>{loadState === "loading" ? "Loading" : loadState === "error" ? "Blocked" : "Ready"}</strong> status</span>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">{loadState === "loading" ? "Loading import history." : "No import batches match the selected filters."}</div>
        ) : (
          <div className="import-history-list" aria-label="Import batch results">
            {items.map((item) => {
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
          <button className="button button--secondary" type="button" disabled={!hasPrevious || loadState === "loading"} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {firstIndex}-{lastIndex} of {totalCount}</span>
          <button className="button button--secondary" type="button" disabled={!hasNext || loadState === "loading"} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
