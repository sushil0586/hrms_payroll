"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HrAdminPayrollFinanceHandoff, HrAdminPayrollOutputArtifact, HrAdminPayrollProviderDelivery } from "@/lib/types";

type BankAdviceRow = {
  artifact: HrAdminPayrollOutputArtifact;
  delivery: HrAdminPayrollProviderDelivery | null;
  handoff: HrAdminPayrollFinanceHandoff | null;
};

const PAGE_SIZE = 8;

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatMoney(value: unknown, currency = "INR") {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

function formatDate(value: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (["accepted", "acknowledged", "reconciled", "submitted", "transmitted", "published"].includes(status)) return "record-chip record-chip--success";
  if (["generated", "queued", "pending", "processing"].includes(status)) return "record-chip record-chip--warning";
  if (["failed", "rejected", "blocked"].includes(status)) return "record-chip record-chip--danger";
  return "record-chip";
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function artifactAmount(artifact: HrAdminPayrollOutputArtifact) {
  return artifact.totals_snapshot.bank_advice_total ?? artifact.totals_snapshot.net_pay ?? artifact.totals_snapshot.gross_earnings ?? 0;
}

export function BankAdviceReportWorkspace({
  artifacts,
  deliveries,
  handoffs,
}: {
  artifacts: HrAdminPayrollOutputArtifact[];
  deliveries: HrAdminPayrollProviderDelivery[];
  handoffs: HrAdminPayrollFinanceHandoff[];
}) {
  const [query, setQuery] = useState("");
  const [handoffStatus, setHandoffStatus] = useState("All");
  const [deliveryStatus, setDeliveryStatus] = useState("All");
  const [providerRef, setProviderRef] = useState("All");
  const [sortBy, setSortBy] = useState("amount_desc");
  const [page, setPage] = useState(1);

  const rows = useMemo<BankAdviceRow[]>(() => {
    const handoffByBatchId = new Map(handoffs.map((handoff) => [handoff.output_batch_id, handoff]));
    const deliveryByArtifactId = new Map(deliveries.map((delivery) => [delivery.output_artifact_id, delivery]));
    return artifacts
      .filter((artifact) => artifact.kind === "bank_advice")
      .map((artifact) => ({
        artifact,
        delivery: deliveryByArtifactId.get(artifact.id) ?? null,
        handoff: handoffByBatchId.get(artifact.output_batch_id) ?? null,
      }));
  }, [artifacts, deliveries, handoffs]);

  const handoffStatuses = useMemo(() => ["All", ...unique(rows.map((row) => row.handoff?.status ?? ""))], [rows]);
  const deliveryStatuses = useMemo(() => ["All", ...unique(rows.map((row) => row.delivery?.status ?? "pending"))], [rows]);
  const providerRefs = useMemo(() => ["All", ...unique(rows.map((row) => row.delivery?.provider_ref ?? ""))], [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter(({ artifact, delivery, handoff }) => {
      const matchesHandoff = handoffStatus === "All" || handoff?.status === handoffStatus;
      const matchesDelivery = deliveryStatus === "All" || (delivery?.status ?? "pending") === deliveryStatus;
      const matchesProvider = providerRef === "All" || delivery?.provider_ref === providerRef;
      const matchesQuery =
        !normalizedQuery ||
        [
          artifact.title,
          artifact.file_name,
          artifact.artifact_key,
          artifact.source_hash,
          artifact.checksum_sha256,
          handoff?.payroll_run_name,
          handoff?.bank_file_profile_ref,
          delivery?.provider_ref,
          delivery?.external_reference,
          delivery?.payload_checksum_sha256,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesHandoff && matchesDelivery && matchesProvider && matchesQuery;
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "run_name") return String(left.handoff?.payroll_run_name ?? left.artifact.title).localeCompare(String(right.handoff?.payroll_run_name ?? right.artifact.title));
      if (sortBy === "delivery_status") return String(left.delivery?.status ?? "pending").localeCompare(String(right.delivery?.status ?? "pending"));
      if (sortBy === "submitted_desc") return String(right.delivery?.submitted_at ?? "").localeCompare(String(left.delivery?.submitted_at ?? ""));
      return Number(artifactAmount(right.artifact)) - Number(artifactAmount(left.artifact));
    });
  }, [deliveryStatus, handoffStatus, providerRef, query, rows, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const totalAmount = filteredRows.reduce((sum, row) => sum + Number(artifactAmount(row.artifact) ?? 0), 0);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (handoffStatus !== "All") params.set("handoff_status", handoffStatus);
    if (deliveryStatus !== "All") params.set("delivery_status", deliveryStatus);
    if (providerRef !== "All") params.set("provider_ref", providerRef);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/bank-advice?${params.toString()}`;
  }, [deliveryStatus, handoffStatus, providerRef, query, sortBy]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Bank advice report workspace">
      <div className="report-catalog-workspace bank-advice-report" data-testid="bank-advice-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Bank advice files</span>
            <strong>{filteredRows.length}</strong>
            <small>{rows.length} total artifacts</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Payout value</span>
            <strong>{formatMoney(totalAmount)}</strong>
            <small>Filtered total</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Submitted</span>
            <strong>{filteredRows.filter((row) => row.delivery?.submitted_at).length}</strong>
            <small>Provider submissions</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Reconciled</span>
            <strong>{filteredRows.filter((row) => row.delivery?.reconciled_at).length}</strong>
            <small>Bank acknowledgements</small>
          </article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Bank advice filters">
          <label>
            <span>Search bank advice</span>
            <input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search run, provider, file, hash" />
          </label>
          <label>
            <span>Handoff status</span>
            <select aria-label="Handoff status" className="input-control" value={handoffStatus} onChange={(event) => updateFilter(() => setHandoffStatus(event.target.value))}>
              {handoffStatuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
            </select>
          </label>
          <label>
            <span>Delivery status</span>
            <select aria-label="Delivery status" className="input-control" value={deliveryStatus} onChange={(event) => updateFilter(() => setDeliveryStatus(event.target.value))}>
              {deliveryStatuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
            </select>
          </label>
          <label>
            <span>Provider</span>
            <select aria-label="Provider" className="input-control" value={providerRef} onChange={(event) => updateFilter(() => setProviderRef(event.target.value))}>
              {providerRefs.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}>
              <option value="amount_desc">Payout high to low</option>
              <option value="run_name">Run name</option>
              <option value="delivery_status">Delivery status</option>
              <option value="submitted_desc">Submitted newest</option>
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.filter((row) => row.handoff?.status === "transmitted").length}</strong> transmitted</span>
          <span className="queue-summary-chip"><strong>{filteredRows.filter((row) => row.delivery?.status === "reconciled").length}</strong> reconciled</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>Export filtered CSV</Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead>
              <tr>
                <th scope="col">Payroll run</th>
                <th scope="col">Payout</th>
                <th scope="col">Handoff</th>
                <th scope="col">Provider</th>
                <th scope="col">Delivery</th>
                <th scope="col">Evidence</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(({ artifact, delivery, handoff }) => (
                <tr key={artifact.id}>
                  <td>
                    <strong>{handoff?.payroll_run_name ?? artifact.title}</strong>
                    <span>{artifact.file_name}</span>
                    <code>{artifact.artifact_key}</code>
                  </td>
                  <td>{formatMoney(artifactAmount(artifact))}</td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(handoff?.status ?? "pending")}>{titleCase(handoff?.status ?? "pending")}</span>
                      <span>{handoff?.bank_file_profile_ref ?? "No bank profile"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{delivery?.provider_ref ?? "Provider pending"}</span>
                      <span>{delivery?.external_reference || "Reference pending"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(delivery?.status ?? "pending")}>{titleCase(delivery?.status ?? "pending")}</span>
                      <span>{formatDate(delivery?.submitted_at ?? null)}</span>
                      <span>{formatDate(delivery?.reconciled_at ?? null)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <code>{artifact.source_hash.slice(0, 16)}</code>
                      <code>{(delivery?.payload_checksum_sha256 || artifact.checksum_sha256).slice(0, 16)}</code>
                    </div>
                  </td>
                  <td>
                    <div className="report-row-actions">
                      <Link className="button button--secondary" href={`/hr-admin/payroll-handoff?handoffId=${handoff?.id ?? ""}&artifactId=${artifact.id}`}>
                        Open
                      </Link>
                      {delivery ? (
                        <Link className="button button--ghost" href={`/hr-admin/payroll-handoff?handoffId=${handoff?.id ?? ""}&artifactId=${artifact.id}&evidence=delivery%3A${delivery.id}`}>
                          Evidence
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">No bank advice rows match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Bank advice pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
