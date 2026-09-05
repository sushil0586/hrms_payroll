"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { PaginationBar } from "@/components/patterns/pagination-bar";
import type { HrAdminEnumOption, HrAdminLifecycleOwnerBulkActionInput, HrAdminLifecycleOwnerOption, HrAdminLifecycleStatusBulkActionInput, HrAdminProbationReview } from "@/lib/types";

type Props = {
  items: HrAdminProbationReview[];
  state: "live" | "demo";
  probationDecisionOptions: HrAdminEnumOption[];
  lifecycleOwners: HrAdminLifecycleOwnerOption[];
  currentFilters: {
    q: string;
    decision: string;
    owner: string;
    page: number;
    page_size: number;
  };
  pagination: {
    total_count: number;
    page: number;
    page_size: number;
    has_next: boolean;
    has_previous: boolean;
  };
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to update probation review owners.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to update probation review owners.");
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === false) {
      return;
    }
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export function ProbationReviewQueue({ items, state, probationDecisionOptions, lifecycleOwners, currentFilters, pagination }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState(currentFilters.q);
  const [decision, setDecision] = useState(currentFilters.decision || "all");
  const [owner, setOwner] = useState(currentFilters.owner || "all");
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));
  const [bulkOwner, setBulkOwner] = useState(currentFilters.owner || "");
  const [bulkDecision, setBulkDecision] = useState(probationDecisionOptions[0]?.value ?? "pending");

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));
  const extendBlockedItems = bulkDecision === "extend" ? selectedItems.filter((item) => !item.extension_end_date) : [];

  function toggleOne(itemId: string) {
    setSelectedIds((current) => (current.includes(itemId) ? current.filter((value) => value !== itemId) : [...current, itemId]));
  }

  function toggleAll() {
    setSelectedIds((current) => (current.length === items.length ? [] : items.map((item) => item.id)));
  }

  function goToPage(page: number) {
    router.push(`${pathname}${buildQueryString({
      q: search.trim() || undefined,
      decision: decision !== "all" ? decision : undefined,
      owner: owner !== "all" ? owner : undefined,
      page,
      page_size: Number(pageSize) || currentFilters.page_size,
    })}`);
  }

  async function handleBulkOwnerAction(nextOwnerValue: string) {
    if (state !== "live") {
      setError("Bulk owner updates are disabled in demo mode.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    const body: HrAdminLifecycleOwnerBulkActionInput = {
      record_type: "probation",
      record_ids: selectedIds,
      owner_value: nextOwnerValue,
    };
    const response = await fetch("/api/hr-admin/lifecycle-owner-bulk-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }
    setSelectedIds([]);
    setIsSubmitting(false);
    router.refresh();
  }

  async function handleBulkDecisionAction(nextDecisionValue: string) {
    if (state !== "live") {
      setError("Bulk status updates are disabled in demo mode.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    const body: HrAdminLifecycleStatusBulkActionInput = {
      record_type: "probation",
      record_ids: selectedIds,
      status_value: nextDecisionValue,
    };
    const response = await fetch("/api/hr-admin/lifecycle-status-bulk-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }
    setSelectedIds([]);
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <section className="section queue-layout">
      <section className="queue-toolbar panel-card-soft">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Probation reviews</h2>
            <p className="section-copy section-copy-soft">Filter by decision, owner, or search context.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{pagination.total_count}</strong> total reviews</span>
            <span className="queue-summary-chip"><strong>{items.length}</strong> on this page</span>
            <span className="queue-summary-chip"><strong>{selectedIds.length}</strong> selected</span>
          </div>
        </div>
        <div className="queue-toolbar__grid">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" onChange={(event) => setSearch(event.target.value)} placeholder="Employee, code, reviewer, workflow, remarks" value={search} />
          </label>
          <label className="form-field">
            <span className="muted">Decision</span>
            <select className="input-control" onChange={(event) => setDecision(event.target.value)} value={decision}>
              <option value="all">All decisions</option>
              {probationDecisionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Owner</span>
            <select className="input-control" onChange={(event) => setOwner(event.target.value)} value={owner}>
              <option value="all">All owners</option>
              {lifecycleOwners.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Rows per page</span>
            <select className="input-control" onChange={(event) => setPageSize(event.target.value)} value={pageSize}>
              {[10, 25, 50, 100].map((value) => <option key={value} value={String(value)}>{value}</option>)}
            </select>
          </label>
        </div>
        <div className="queue-toolbar__actions">
          <button className="button button--primary" onClick={() => goToPage(1)} type="button">Apply filters</button>
          <button className="button button--ghost" onClick={() => {
            setSelectedIds([]);
            setError("");
            setSearch("");
            setDecision("all");
            setOwner("all");
            setPageSize("25");
            setBulkOwner("");
            setBulkDecision(probationDecisionOptions[0]?.value ?? "pending");
            router.push(pathname);
          }} type="button">Clear filters</button>
          <button className="button button--secondary" disabled={items.length === 0} onClick={toggleAll} type="button">
            {allSelected ? "Clear selection" : "Select page"}
          </button>
        </div>
        <div className="queue-toolbar__grid">
          <label className="form-field">
            <span className="muted">Bulk owner</span>
            <select className="input-control" onChange={(event) => setBulkOwner(event.target.value)} value={bulkOwner}>
              <option value="">Clear owner assignment</option>
              {lifecycleOwners.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <div className="form-field" style={{ alignSelf: "end" }}>
            <div className="queue-toolbar__actions">
              <button
                className="button button--primary"
                disabled={isSubmitting || selectedIds.length === 0}
                onClick={() => handleBulkOwnerAction(bulkOwner)}
                type="button"
              >
                {isSubmitting ? "Saving..." : `Assign owner (${selectedIds.length || 0})`}
              </button>
              <button
                className="button button--ghost"
                disabled={isSubmitting || selectedIds.length === 0}
                onClick={() => handleBulkOwnerAction("")}
                type="button"
              >
                Clear owner ({selectedIds.length || 0})
              </button>
            </div>
          </div>
          <label className="form-field">
            <span className="muted">Bulk decision</span>
            <select className="input-control" onChange={(event) => setBulkDecision(event.target.value)} value={bulkDecision}>
              {probationDecisionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <div className="form-field" style={{ alignSelf: "end" }}>
            <div className="queue-toolbar__actions">
              <button
                className="button button--secondary"
                disabled={isSubmitting || selectedIds.length === 0 || extendBlockedItems.length > 0}
                onClick={() => handleBulkDecisionAction(bulkDecision)}
                type="button"
              >
                Set decision ({selectedIds.length || 0})
              </button>
            </div>
          </div>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Use page selection to rebalance reviewers quickly.
        </p>
        {extendBlockedItems.length > 0 ? (
          <div className="notice">
            <strong>Bulk extend is blocked.</strong>
            <span className="muted">
              {extendBlockedItems.length === 1
                ? `${extendBlockedItems[0].employee_name} is missing an extension end date.`
                : `${extendBlockedItems.length} selected reviews are missing an extension end date.`}
            </span>
          </div>
        ) : null}
        <div className="queue-toolbar__summary">
          <span className="queue-summary-chip"><strong>Page {pagination.page}</strong> shared state</span>
          <span className="queue-summary-chip"><strong>{selectedIds.length}</strong> selected</span>
        </div>
        {error ? <div className="notice"><strong>Bulk action failed.</strong><span className="muted">{error}</span></div> : null}
      </section>

      <div className="queue-list">
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          return (
          <article className="record-card panel-card-soft" key={item.id}>
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <label className="record-card__title">
                  <input checked={isSelected} onChange={() => toggleOne(item.id)} type="checkbox" />
                  <h2>{item.employee_name}</h2>
                </label>
                <div className="record-card__eyebrow">
                  <span className="record-chip record-chip--accent">{item.decision}</span>
                  <span className="record-chip">{item.employee_code}</span>
                  <span className="record-chip">Review {item.review_date}</span>
                </div>
                <p className="section-copy section-copy-soft">{item.workflow_reference || "Workflow not linked"} • Reviewer {item.reviewer_identifier || "unassigned"}</p>
              </div>
              <div className="record-card__actions">
                <Link className="button button--secondary" href={`/hr-admin/probation-reviews/${item.id}/edit`}>Edit</Link>
              </div>
            </div>
            <div className="detail-grid">
              <div className="detail-row"><span className="detail-label">Decision</span><span className="detail-value">{item.decision}</span></div>
              <div className="detail-row"><span className="detail-label">Probation end</span><span className="detail-value">{item.probation_end_date || "TBD"}</span></div>
              <div className="detail-row"><span className="detail-label">Reviewer</span><span className="detail-value">{item.reviewer_identifier || "Unassigned"}</span></div>
              <div className="detail-row"><span className="detail-label">Extension end</span><span className="detail-value">{item.extension_end_date || "No extension"}</span></div>
            </div>
          </article>
        );
        })}
        {items.length === 0 ? (
          <div className="card panel">
            <strong>No probation reviews match the current filters.</strong>
            <p className="muted">Try clearing one or more filters to widen the queue.</p>
          </div>
        ) : null}
      </div>

      <PaginationBar
        hasNext={pagination.has_next}
        hasPrevious={pagination.has_previous}
        onFirst={() => goToPage(1)}
        onLast={() => goToPage(Math.max(1, Math.ceil(pagination.total_count / pagination.page_size)))}
        onNext={() => goToPage(pagination.page + 1)}
        onPrevious={() => goToPage(pagination.page - 1)}
        page={pagination.page}
        pageSize={pagination.page_size}
        totalCount={pagination.total_count}
      />
    </section>
  );
}
