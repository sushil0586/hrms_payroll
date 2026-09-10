"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  HrAdminPayrollProviderCallbackEvent,
  HrAdminPayrollProviderDelivery,
  HrAdminPayrollProviderJob,
  HrAdminPayrollProviderRetryEvent,
} from "@/lib/types";

type ReceiptRow = {
  id: string;
  artifactTitle: string;
  artifactKind: string;
  deliveryStatus: string;
  providerStatus: string;
  providerRef: string;
  channelRef: string;
  externalReference: string;
  submittedAt: string;
  acknowledgedAt: string;
  reconciledAt: string;
  attemptCount: number;
  callbackCount: number;
  retryCount: number;
  jobCount: number;
  checksum: string;
  failureCode: string;
  failureReason: string;
  evidenceHref: string;
};

const PAGE_SIZE = 8;

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function chipClass(value: string) {
  if (["acknowledged", "reconciled", "submitted", "processed", "completed"].includes(value)) return "record-chip record-chip--success";
  if (["failed", "rejected", "dead_lettered"].includes(value)) return "record-chip record-chip--danger";
  if (["pending", "queued", "scheduled", "retrying"].includes(value)) return "record-chip record-chip--warning";
  return "record-chip";
}

function latestProviderStatus(events: HrAdminPayrollProviderCallbackEvent[]) {
  return events[0]?.provider_status || events[0]?.provider_status_label || "callback.pending";
}

function buildRows({
  callbackEvents,
  deliveries,
  providerJobs,
  retryEvents,
}: {
  callbackEvents: HrAdminPayrollProviderCallbackEvent[];
  deliveries: HrAdminPayrollProviderDelivery[];
  providerJobs: HrAdminPayrollProviderJob[];
  retryEvents: HrAdminPayrollProviderRetryEvent[];
}) {
  return deliveries.map((delivery) => {
    const callbacks = callbackEvents.filter((event) => event.provider_delivery_id === delivery.id);
    const retries = retryEvents.filter((event) => event.provider_delivery_id === delivery.id);
    const jobs = providerJobs.filter((job) => job.provider_delivery_id === delivery.id);
    return {
      id: delivery.id,
      artifactTitle: delivery.output_artifact_title,
      artifactKind: delivery.artifact_kind_label || titleCase(delivery.artifact_kind),
      deliveryStatus: delivery.status,
      providerStatus: latestProviderStatus(callbacks),
      providerRef: delivery.provider_ref,
      channelRef: delivery.channel_ref,
      externalReference: stringValue(delivery.external_reference, "receipt.pending"),
      submittedAt: formatDate(delivery.submitted_at),
      acknowledgedAt: formatDate(delivery.acknowledged_at),
      reconciledAt: formatDate(delivery.reconciled_at),
      attemptCount: delivery.attempt_count,
      callbackCount: callbacks.length,
      retryCount: retries.length,
      jobCount: jobs.length,
      checksum: stringValue(delivery.payload_checksum_sha256 || callbacks[0]?.payload_checksum_sha256, "checksum.pending"),
      failureCode: stringValue(delivery.failure_code || callbacks[0]?.failure_code || retries[0]?.failure_code, "None"),
      failureReason: stringValue(delivery.failure_reason || callbacks[0]?.failure_reason || retries[0]?.failure_reason, "No failure recorded"),
      evidenceHref: `/hr-admin/payroll-handoff?handoffId=${delivery.handoff_id}&artifactId=${delivery.output_artifact_id}&evidence=delivery%3A${delivery.id}`,
    } satisfies ReceiptRow;
  });
}

export function ProviderFilingReceiptsReportWorkspace({
  callbackEvents,
  deliveries,
  providerJobs,
  retryEvents,
}: {
  callbackEvents: HrAdminPayrollProviderCallbackEvent[];
  deliveries: HrAdminPayrollProviderDelivery[];
  providerJobs: HrAdminPayrollProviderJob[];
  retryEvents: HrAdminPayrollProviderRetryEvent[];
}) {
  const [query, setQuery] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("All");
  const [providerStatus, setProviderStatus] = useState("All");
  const [provider, setProvider] = useState("All");
  const [sortBy, setSortBy] = useState("submitted");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => buildRows({ callbackEvents, deliveries, providerJobs, retryEvents }), [callbackEvents, deliveries, providerJobs, retryEvents]);
  const deliveryStatuses = useMemo(() => ["All", ...unique(rows.map((row) => row.deliveryStatus))], [rows]);
  const providerStatuses = useMemo(() => ["All", ...unique(rows.map((row) => row.providerStatus))], [rows]);
  const providers = useMemo(() => ["All", ...unique(rows.map((row) => row.providerRef))], [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter((row) => {
      const matchesDelivery = deliveryStatus === "All" || row.deliveryStatus === deliveryStatus;
      const matchesProviderStatus = providerStatus === "All" || row.providerStatus === providerStatus;
      const matchesProvider = provider === "All" || row.providerRef === provider;
      const matchesQuery =
        !normalizedQuery ||
        [
          row.artifactTitle,
          row.artifactKind,
          row.providerRef,
          row.channelRef,
          row.externalReference,
          row.checksum,
          row.failureCode,
          row.failureReason,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesDelivery && matchesProviderStatus && matchesProvider && matchesQuery;
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "provider") return left.providerRef.localeCompare(right.providerRef);
      if (sortBy === "status") return left.deliveryStatus.localeCompare(right.deliveryStatus);
      if (sortBy === "callbacks") return right.callbackCount - left.callbackCount;
      return right.submittedAt.localeCompare(left.submittedAt);
    });
  }, [deliveryStatus, provider, providerStatus, query, rows, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (deliveryStatus !== "All") params.set("delivery_status", deliveryStatus);
    if (providerStatus !== "All") params.set("provider_status", providerStatus);
    if (provider !== "All") params.set("provider_ref", provider);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/provider-filing-receipts?${params.toString()}`;
  }, [deliveryStatus, provider, providerStatus, query, sortBy]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Provider filing receipts report workspace">
      <div className="report-catalog-workspace provider-filing-receipts-report" data-testid="provider-filing-receipts-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Provider deliveries</span>
            <strong>{filteredRows.length}</strong>
            <small>{deliveries.length} total submissions</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Acknowledged</span>
            <strong>{filteredRows.filter((row) => row.acknowledgedAt !== "Pending").length}</strong>
            <small>Receipt timestamp captured</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Callbacks</span>
            <strong>{filteredRows.reduce((sum, row) => sum + row.callbackCount, 0)}</strong>
            <small>Provider events</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Retries</span>
            <strong>{filteredRows.reduce((sum, row) => sum + row.retryCount, 0)}</strong>
            <small>Recovery events</small>
          </article>
        </div>

        <div className="report-catalog-toolbar statutory-deductions-toolbar" aria-label="Provider filing receipt filters">
          <label>
            <span>Search receipts</span>
            <input
              className="input-control"
              type="search"
              value={query}
              onChange={(event) => updateFilter(() => setQuery(event.target.value))}
              placeholder="Search provider, receipt, artifact, checksum, failure"
            />
          </label>
          <label>
            <span>Delivery status</span>
            <select aria-label="Delivery status" className="input-control" value={deliveryStatus} onChange={(event) => updateFilter(() => setDeliveryStatus(event.target.value))}>
              {deliveryStatuses.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? item : titleCase(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Provider status</span>
            <select aria-label="Provider status" className="input-control" value={providerStatus} onChange={(event) => updateFilter(() => setProviderStatus(event.target.value))}>
              {providerStatuses.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? item : titleCase(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Provider route</span>
            <select aria-label="Provider route" className="input-control" value={provider} onChange={(event) => updateFilter(() => setProvider(event.target.value))}>
              {providers.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select aria-label="Sort receipt rows" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}>
              <option value="submitted">Submitted</option>
              <option value="provider">Provider</option>
              <option value="status">Delivery status</option>
              <option value="callbacks">Callbacks</option>
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip">
            <strong>{filteredRows.filter((row) => row.failureCode !== "None").length}</strong> failures
          </span>
          <span className="queue-summary-chip">
            <strong>{unique(filteredRows.map((row) => row.providerRef)).length}</strong> providers
          </span>
          <span className="queue-summary-chip">
            <strong>{currentPage}</strong> of {pageCount} pages
          </span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>
            Export filtered CSV
          </Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>
            Manifest
          </Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table statutory-deductions-table">
            <thead>
              <tr>
                <th scope="col">Artifact</th>
                <th scope="col">Delivery</th>
                <th scope="col">Provider</th>
                <th scope="col">Receipt</th>
                <th scope="col">Timeline</th>
                <th scope="col">Callbacks</th>
                <th scope="col">Checksum</th>
                <th scope="col">Failure</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.artifactTitle}</strong>
                    <span>{row.artifactKind}</span>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={chipClass(row.deliveryStatus)}>{titleCase(row.deliveryStatus)}</span>
                      <span>{row.attemptCount} attempts</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{row.providerRef}</span>
                      <span>{row.channelRef}</span>
                      <span className={chipClass(row.providerStatus)}>{titleCase(row.providerStatus)}</span>
                    </div>
                  </td>
                  <td>{row.externalReference}</td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>Submitted {row.submittedAt}</span>
                      <span>Acknowledged {row.acknowledgedAt}</span>
                      <span>Reconciled {row.reconciledAt}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{row.callbackCount} callbacks</span>
                      <span>{row.retryCount} retries</span>
                      <span>{row.jobCount} jobs</span>
                    </div>
                  </td>
                  <td>
                    <code>{row.checksum.slice(0, 16)}</code>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{row.failureCode}</span>
                      <span>{row.failureReason}</span>
                    </div>
                  </td>
                  <td>
                    <div className="report-row-actions">
                      <Link className="button button--secondary" href={row.evidenceHref}>
                        Evidence
                      </Link>
                      <Link className="button button--ghost" href="/hr-admin/payroll-handoff">
                        Handoff
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">No provider filing receipt rows match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Provider filing receipt pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Previous
          </button>
          <span>
            Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
          </span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
