"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  HrAdminPayrollFinanceHandoff,
  HrAdminPayrollOutputArtifact,
  HrAdminPayrollProviderCallbackEvent,
  HrAdminPayrollProviderDelivery,
  HrAdminPayrollProviderJob,
  HrAdminPayrollProviderRetryEvent,
} from "@/lib/types";

const PAGE_SIZE = 10;

type HandoffRow = {
  handoff: HrAdminPayrollFinanceHandoff | null;
  artifact: HrAdminPayrollOutputArtifact | null;
  delivery: HrAdminPayrollProviderDelivery | null;
  callbacks: HrAdminPayrollProviderCallbackEvent[];
  retries: HrAdminPayrollProviderRetryEvent[];
  jobs: HrAdminPayrollProviderJob[];
  blockerCategory: string;
  risk: "Low" | "Medium" | "High";
  nextAction: string;
  detailHref: string;
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (["accepted", "acknowledged", "reconciled", "submitted", "transmitted", "completed", "processed", "low"].includes(normalized)) return "record-chip record-chip--success";
  if (["generated", "queued", "pending", "processing", "scheduled", "running", "medium"].includes(normalized)) return "record-chip record-chip--warning";
  if (["failed", "rejected", "blocked", "dead_lettered", "high"].includes(normalized)) return "record-chip record-chip--danger";
  return "record-chip";
}

function blockerCategory(input: {
  deliveryStatus: string;
  handoffStatus: string;
  retryCount: number;
  scheduledRetryCount: number;
  queuedJobCount: number;
  deadLetteredJobCount: number;
  hasDelivery: boolean;
  failureCode: string;
}) {
  if (!input.hasDelivery) return "Missing provider delivery";
  if (["failed", "rejected"].includes(input.deliveryStatus) || input.failureCode) return "Provider failure";
  if (input.deadLetteredJobCount > 0) return "Dead-lettered job";
  if (input.scheduledRetryCount > 0 || input.retryCount > 0) return "Retry pending";
  if (input.queuedJobCount > 0) return "Queued worker";
  if (["generated", "pending"].includes(input.handoffStatus) || ["pending", "queued"].includes(input.deliveryStatus)) return "Transmission pending";
  return "None";
}

function riskFor(category: string, deliveryStatus: string): HandoffRow["risk"] {
  if (["Provider failure", "Dead-lettered job", "Missing provider delivery"].includes(category)) return "High";
  if (["Retry pending", "Queued worker", "Transmission pending"].includes(category)) return "Medium";
  if (["acknowledged", "reconciled", "submitted", "transmitted", "accepted"].includes(deliveryStatus)) return "Low";
  return "Medium";
}

function nextAction(category: string) {
  if (category === "Missing provider delivery") return "Generate or attach provider delivery";
  if (category === "Provider failure") return "Review provider response and retry";
  if (category === "Dead-lettered job") return "Recover worker job or escalate";
  if (category === "Retry pending") return "Monitor scheduled retry";
  if (category === "Queued worker") return "Monitor worker queue";
  if (category === "Transmission pending") return "Transmit finance handoff";
  return "Ready for finance review";
}

export function FinanceHandoffExceptionsReportWorkspace({
  handoffs,
  artifacts,
  deliveries,
  callbackEvents,
  retryEvents,
  providerJobs,
}: {
  handoffs: HrAdminPayrollFinanceHandoff[];
  artifacts: HrAdminPayrollOutputArtifact[];
  deliveries: HrAdminPayrollProviderDelivery[];
  callbackEvents: HrAdminPayrollProviderCallbackEvent[];
  retryEvents: HrAdminPayrollProviderRetryEvent[];
  providerJobs: HrAdminPayrollProviderJob[];
}) {
  const [query, setQuery] = useState("");
  const [handoffStatus, setHandoffStatus] = useState("All");
  const [deliveryStatus, setDeliveryStatus] = useState("All");
  const [providerRef, setProviderRef] = useState("All");
  const [risk, setRisk] = useState("All");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("risk");
  const [page, setPage] = useState(1);

  const rows = useMemo<HandoffRow[]>(() => {
    const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
    const handoffById = new Map(handoffs.map((handoff) => [handoff.id, handoff]));
    const deliveriesByHandoff = new Map<string, HrAdminPayrollProviderDelivery[]>();
    for (const delivery of deliveries) {
      deliveriesByHandoff.set(delivery.handoff_id, [...(deliveriesByHandoff.get(delivery.handoff_id) ?? []), delivery]);
    }
    const deliveryRows = deliveries.map((delivery) => {
      const handoff = handoffById.get(delivery.handoff_id) ?? null;
      const artifact = artifactById.get(delivery.output_artifact_id) ?? null;
      const callbacks = callbackEvents.filter((event) => event.provider_delivery_id === delivery.id);
      const retries = retryEvents.filter((event) => event.provider_delivery_id === delivery.id);
      const jobs = providerJobs.filter((job) => job.provider_delivery_id === delivery.id);
      const queuedJobCount = jobs.filter((job) => job.status === "queued").length;
      const deadLetteredJobCount = jobs.filter((job) => job.status === "dead_lettered").length;
      const scheduledRetryCount = retries.filter((retry) => retry.status === "scheduled").length;
      const rowCategory = blockerCategory({
        deliveryStatus: delivery.status,
        handoffStatus: handoff?.status ?? "pending",
        retryCount: retries.length,
        scheduledRetryCount,
        queuedJobCount,
        deadLetteredJobCount,
        hasDelivery: true,
        failureCode: delivery.failure_code,
      });
      return {
        handoff,
        artifact,
        delivery,
        callbacks,
        retries,
        jobs,
        blockerCategory: rowCategory,
        risk: riskFor(rowCategory, delivery.status),
        nextAction: nextAction(rowCategory),
        detailHref: `/hr-admin/payroll-handoff?handoffId=${delivery.handoff_id}&artifactId=${delivery.output_artifact_id}&evidence=delivery%3A${delivery.id}`,
      };
    });
    const missingDeliveryRows = handoffs
      .filter((handoff) => (deliveriesByHandoff.get(handoff.id) ?? []).length === 0)
      .map((handoff) => {
        const artifact = artifacts.find((item) => item.output_batch_id === handoff.output_batch_id) ?? null;
        const rowCategory = blockerCategory({
          deliveryStatus: "pending",
          handoffStatus: handoff.status,
          retryCount: 0,
          scheduledRetryCount: 0,
          queuedJobCount: 0,
          deadLetteredJobCount: 0,
          hasDelivery: false,
          failureCode: "",
        });
        return {
          handoff,
          artifact,
          delivery: null,
          callbacks: [],
          retries: [],
          jobs: [],
          blockerCategory: rowCategory,
          risk: riskFor(rowCategory, "pending"),
          nextAction: nextAction(rowCategory),
          detailHref: `/hr-admin/payroll-handoff?handoffId=${handoff.id}`,
        };
      });
    return [...deliveryRows, ...missingDeliveryRows];
  }, [artifacts, callbackEvents, deliveries, handoffs, providerJobs, retryEvents]);

  const handoffStatuses = useMemo(() => ["All", ...unique(rows.map((row) => row.handoff?.status ?? "pending"))], [rows]);
  const deliveryStatuses = useMemo(() => ["All", ...unique(rows.map((row) => row.delivery?.status ?? "pending"))], [rows]);
  const providerRefs = useMemo(() => ["All", ...unique(rows.map((row) => row.delivery?.provider_ref ?? ""))], [rows]);
  const categories = useMemo(() => ["All", ...unique(rows.map((row) => row.blockerCategory))], [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          row.handoff?.payroll_run_name,
          row.handoff?.handoff_profile_ref,
          row.artifact?.title,
          row.artifact?.artifact_key,
          row.artifact?.source_hash,
          row.delivery?.provider_ref,
          row.delivery?.external_reference,
          row.delivery?.failure_code,
          row.delivery?.failure_reason,
          row.blockerCategory,
          row.nextAction,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (handoffStatus === "All" || (row.handoff?.status ?? "pending") === handoffStatus) &&
        (deliveryStatus === "All" || (row.delivery?.status ?? "pending") === deliveryStatus) &&
        (providerRef === "All" || row.delivery?.provider_ref === providerRef) &&
        (risk === "All" || row.risk === risk) &&
        (category === "All" || row.blockerCategory === category)
      );
    });
    return nextRows.sort((left, right) => {
      if (sortBy === "delivery_status") return (left.delivery?.status ?? "pending").localeCompare(right.delivery?.status ?? "pending");
      if (sortBy === "run") return (left.handoff?.payroll_run_name ?? "").localeCompare(right.handoff?.payroll_run_name ?? "");
      if (sortBy === "retries") return right.retries.length - left.retries.length;
      if (sortBy === "jobs") return right.jobs.length - left.jobs.length;
      const scores = { High: 3, Medium: 2, Low: 1 };
      return scores[right.risk] - scores[left.risk] || right.retries.length - left.retries.length;
    });
  }, [category, deliveryStatus, handoffStatus, providerRef, query, risk, rows, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (handoffStatus !== "All") params.set("handoff_status", handoffStatus);
    if (deliveryStatus !== "All") params.set("delivery_status", deliveryStatus);
    if (providerRef !== "All") params.set("provider_ref", providerRef);
    if (risk !== "All") params.set("handoff_risk", risk);
    if (category !== "All") params.set("blocker_category", category);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/finance-handoff-exceptions?${params.toString()}`;
  }, [category, deliveryStatus, handoffStatus, providerRef, query, risk, sortBy]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Finance handoff exceptions report workspace">
      <div className="report-catalog-workspace bank-advice-report" data-testid="finance-handoff-exceptions-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft"><span>Handoff rows</span><strong>{filteredRows.length}</strong><small>{rows.length} total rows</small></article>
          <article className="metric-tile metric-tile-soft"><span>High risk</span><strong>{filteredRows.filter((row) => row.risk === "High").length}</strong><small>Requires attention</small></article>
          <article className="metric-tile metric-tile-soft"><span>Retries</span><strong>{filteredRows.reduce((sum, row) => sum + row.retries.length, 0)}</strong><small>Retry events</small></article>
          <article className="metric-tile metric-tile-soft"><span>Queued jobs</span><strong>{filteredRows.reduce((sum, row) => sum + row.jobs.filter((job) => job.status === "queued").length, 0)}</strong><small>Worker backlog</small></article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Finance handoff exception filters">
          <label><span>Search handoffs</span><input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search run, provider, failure, hash" /></label>
          <label><span>Handoff status</span><select aria-label="Handoff status" className="input-control" value={handoffStatus} onChange={(event) => updateFilter(() => setHandoffStatus(event.target.value))}>{handoffStatuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Delivery status</span><select aria-label="Delivery status" className="input-control" value={deliveryStatus} onChange={(event) => updateFilter(() => setDeliveryStatus(event.target.value))}>{deliveryStatuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}</select></label>
          <label><span>Provider</span><select aria-label="Provider" className="input-control" value={providerRef} onChange={(event) => updateFilter(() => setProviderRef(event.target.value))}>{providerRefs.map((item) => <option key={item} value={item}>{item || "Provider pending"}</option>)}</select></label>
          <label><span>Risk</span><select aria-label="Risk" className="input-control" value={risk} onChange={(event) => updateFilter(() => setRisk(event.target.value))}><option value="All">All</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></label>
          <label><span>Blocker category</span><select aria-label="Blocker category" className="input-control" value={category} onChange={(event) => updateFilter(() => setCategory(event.target.value))}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Sort</span><select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}><option value="risk">Risk first</option><option value="delivery_status">Delivery status</option><option value="run">Payroll run</option><option value="retries">Retries</option><option value="jobs">Jobs</option></select></label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{filteredRows.filter((row) => row.blockerCategory !== "None").length}</strong> exceptions</span>
          <span className="queue-summary-chip"><strong>{filteredRows.filter((row) => row.delivery?.acknowledged_at).length}</strong> acknowledged</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>Export filtered CSV</Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead><tr><th scope="col">Payroll run</th><th scope="col">Artifact</th><th scope="col">Delivery</th><th scope="col">Callbacks</th><th scope="col">Retries and jobs</th><th scope="col">Risk</th><th scope="col">Evidence</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={`${row.handoff?.id ?? "handoff"}:${row.delivery?.id ?? row.artifact?.id ?? "pending"}`}>
                  <td><strong>{row.handoff?.payroll_run_name ?? row.delivery?.output_artifact_title ?? "Run pending"}</strong><span className={statusClass(row.handoff?.status ?? "pending")}>{titleCase(row.handoff?.status ?? "pending")}</span><span>{row.handoff?.handoff_profile_ref ?? "profile.pending"}</span></td>
                  <td><div className="payroll-register-stack"><strong>{row.artifact?.title ?? row.delivery?.output_artifact_title ?? "Artifact pending"}</strong><span>{row.artifact?.kind_label ?? row.delivery?.artifact_kind_label ?? "kind.pending"}</span><span>{row.artifact?.file_name ?? "file.pending"}</span></div></td>
                  <td><div className="payroll-register-stack"><span className={statusClass(row.delivery?.status ?? "pending")}>{titleCase(row.delivery?.status ?? "pending")}</span><span>{row.delivery?.provider_ref || "provider.pending"}</span><span>{row.delivery?.external_reference || "reference.pending"}</span><span>{row.delivery?.attempt_count ?? 0} attempts</span></div></td>
                  <td><div className="payroll-register-stack"><span>{row.callbacks.length} callbacks</span><span>{row.callbacks.filter((event) => event.status === "processed").length} processed</span><span>{row.delivery?.acknowledged_at ?? "ack.pending"}</span></div></td>
                  <td><div className="payroll-register-stack"><span>{row.retries.length} retries</span><span>{row.retries.filter((retry) => retry.status === "scheduled").length} scheduled</span><span>{row.jobs.length} jobs</span><span>{row.jobs.filter((job) => job.status === "queued").length} queued</span></div></td>
                  <td><div className="payroll-register-stack"><span className={statusClass(row.risk)}>{row.risk}</span><span>{row.blockerCategory}</span><strong>{row.nextAction}</strong></div></td>
                  <td><div className="payroll-register-stack"><span>{row.delivery?.failure_code || "failure.none"}</span><span>{row.delivery?.failure_reason || "reason.none"}</span><code>{(row.delivery?.payload_checksum_sha256 || row.artifact?.checksum_sha256 || "checksum.pending").slice(0, 20)}</code><code>{(row.artifact?.source_hash || "hash.pending").slice(0, 20)}</code></div></td>
                  <td><div className="report-row-actions"><Link className="button button--secondary" href={row.detailHref}>Open</Link>{row.delivery ? <Link className="button button--ghost" href={`/hr-admin/payroll-handoff?handoffId=${row.delivery.handoff_id}&artifactId=${row.delivery.output_artifact_id}&evidence=delivery%3A${row.delivery.id}`}>Evidence</Link> : null}</div></td>
                </tr>
              ))}
              {visibleRows.length === 0 ? <tr><td colSpan={8}><div className="empty-state">No finance handoff exception rows match the selected filters.</div></td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Finance handoff exception pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
