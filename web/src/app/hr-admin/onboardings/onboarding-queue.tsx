"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { PaginationBar } from "@/components/patterns/pagination-bar";
import { getOnboardingChecklistStats, getOnboardingCompletionWarning } from "@/lib/onboarding-readiness";
import type { HrAdminEnumOption, HrAdminLifecycleOwnerBulkActionInput, HrAdminLifecycleOwnerOption, HrAdminLifecycleStatusBulkActionInput, HrAdminOnboarding } from "@/lib/types";

type Props = {
  items: HrAdminOnboarding[];
  state: "live" | "demo";
  onboardingStatusOptions: HrAdminEnumOption[];
  lifecycleOwners: HrAdminLifecycleOwnerOption[];
  currentFilters: {
    q: string;
    status: string;
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
  if (!payload || typeof payload !== "object") return "Unable to update onboarding owners.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to update onboarding owners.");
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

export function OnboardingQueue({ items, state, onboardingStatusOptions, lifecycleOwners, currentFilters, pagination }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState(currentFilters.q);
  const [status, setStatus] = useState(currentFilters.status || "all");
  const [owner, setOwner] = useState(currentFilters.owner || "all");
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));
  const [bulkOwner, setBulkOwner] = useState(currentFilters.owner || "");
  const [bulkStatus, setBulkStatus] = useState(onboardingStatusOptions[0]?.value ?? "not_started");

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));
  const completionBlockedItems = bulkStatus === "completed" ? selectedItems.filter((item) => getOnboardingCompletionWarning(item)) : [];
  const documentBlockedItems = items.filter((item) => item.missing_required_document_count > 0);

  function toggleOne(itemId: string) {
    setSelectedIds((current) => (current.includes(itemId) ? current.filter((value) => value !== itemId) : [...current, itemId]));
  }

  function toggleAll() {
    setSelectedIds((current) => (current.length === items.length ? [] : items.map((item) => item.id)));
  }

  function goToPage(page: number) {
    router.push(`${pathname}${buildQueryString({
      q: search.trim() || undefined,
      status: status !== "all" ? status : undefined,
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
      record_type: "onboarding",
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

  async function handleBulkStatusAction(nextStatusValue: string) {
    if (state !== "live") {
      setError("Bulk status updates are disabled in demo mode.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    const body: HrAdminLifecycleStatusBulkActionInput = {
      record_type: "onboarding",
      record_ids: selectedIds,
      status_value: nextStatusValue,
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
            <h2 className="section-heading-soft">Onboardings</h2>
            <p className="section-copy section-copy-soft">Filter joiners by readiness, owner, or status.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{pagination.total_count}</strong> total records</span>
            <span className="queue-summary-chip"><strong>{items.length}</strong> on this page</span>
            <span className="queue-summary-chip"><strong>{selectedIds.length}</strong> selected</span>
          </div>
        </div>
        <div className="queue-toolbar__grid">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" onChange={(event) => setSearch(event.target.value)} placeholder="Employee, code, owner, template, notes" value={search} />
          </label>
          <label className="form-field">
            <span className="muted">Status</span>
            <select className="input-control" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="all">All statuses</option>
              {onboardingStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
            setStatus("all");
            setOwner("all");
            setPageSize("25");
            setBulkOwner("");
            setBulkStatus(onboardingStatusOptions[0]?.value ?? "not_started");
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
            <span className="muted">Bulk status</span>
            <select className="input-control" onChange={(event) => setBulkStatus(event.target.value)} value={bulkStatus}>
              {onboardingStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <div className="form-field" style={{ alignSelf: "end" }}>
            <div className="queue-toolbar__actions">
              <button
                className="button button--secondary"
                disabled={isSubmitting || selectedIds.length === 0 || completionBlockedItems.length > 0}
                onClick={() => handleBulkStatusAction(bulkStatus)}
                type="button"
              >
                Set status ({selectedIds.length || 0})
              </button>
            </div>
          </div>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Use page selection to rebalance ownership quickly.
        </p>
        {documentBlockedItems.length > 0 ? (
          <div className="notice">
            <strong>Document follow-up is pending.</strong>
            <span className="muted">
              {documentBlockedItems.length === 1
                ? `${documentBlockedItems[0].employee_name} still has ${documentBlockedItems[0].missing_required_document_count} missing required document.`
                : `${documentBlockedItems.length} onboardings on this page still have missing required documents.`}
            </span>
          </div>
        ) : null}
        {completionBlockedItems.length > 0 ? (
          <div className="notice">
            <strong>Bulk completion is blocked.</strong>
            <span className="muted">
              {completionBlockedItems.length === 1
                ? `${completionBlockedItems[0].employee_name}: ${getOnboardingCompletionWarning(completionBlockedItems[0])}`
                : `${completionBlockedItems.length} selected onboardings still have specific readiness blockers. Review the per-record notes below before bulk completing.`}
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
          const checklistStats = getOnboardingChecklistStats(item);
          const missingDocumentSummary =
            item.missing_required_document_count > 0
              ? `${item.missing_required_document_count} required document${item.missing_required_document_count === 1 ? "" : "s"} missing`
              : item.future_due_document_count > 0
                ? `${item.future_due_document_count} required document${item.future_due_document_count === 1 ? "" : "s"} due later`
                : "All due required documents are present";
          return (
          <article className="record-card panel-card-soft" key={item.id}>
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <label className="record-card__title">
                  <input checked={isSelected} onChange={() => toggleOne(item.id)} type="checkbox" />
                  <h2>{item.employee_name}</h2>
                </label>
                <div className="record-card__eyebrow">
                  <span className="record-chip record-chip--accent">{item.status}</span>
                  <span className="record-chip">{item.employee_code}</span>
                  <span className="record-chip">{item.attention_state || "on_track"}</span>
                  {item.missing_required_document_count > 0 ? <span className="record-chip record-chip--danger">Doc blocker</span> : null}
                  {item.missing_required_document_count === 0 && item.future_due_document_count > 0 ? <span className="record-chip record-chip--accent">Docs upcoming</span> : null}
                  <span className="record-chip">{item.onboarding_template_code || "No template code"}</span>
                  {item.is_rehire_journey ? <span className="record-chip">Rehire journey</span> : null}
                </div>
                <p className="section-copy section-copy-soft">{item.workflow_reference || "Workflow not linked"} • Owner {item.assigned_owner_identifier || "unassigned"}</p>
              </div>
              <div className="record-card__actions">
                <Link className="button button--secondary" href={`/hr-admin/onboardings/${item.id}/edit`}>Edit</Link>
              </div>
            </div>
            <div className="detail-grid">
              <div className="detail-row"><span className="detail-label">Status</span><span className="detail-value">{item.status}</span></div>
              <div className="detail-row"><span className="detail-label">Expected joining</span><span className="detail-value">{item.expected_joining_date || "TBD"}</span></div>
              <div className="detail-row"><span className="detail-label">Actual joining</span><span className="detail-value">{item.actual_joining_date || "Pending"}</span></div>
              <div className="detail-row"><span className="detail-label">Assigned owner</span><span className="detail-value">{item.assigned_owner_identifier || "Unassigned"}</span></div>
              <div className="detail-row"><span className="detail-label">Checklist items</span><span className="detail-value">{checklistStats.totalCount}</span></div>
              <div className="detail-row"><span className="detail-label">Attention summary</span><span className="detail-value">{item.attention_summary || "No active lifecycle pressure."}</span></div>
              <div className="detail-row"><span className="detail-label">Next due</span><span className="detail-value">{item.next_due_on || "None"}</span></div>
              <div className="detail-row"><span className="detail-label">Next escalation</span><span className="detail-value">{item.next_escalation_on || "None"}</span></div>
              <div className="detail-row"><span className="detail-label">Documents</span><span className="detail-value">{missingDocumentSummary}</span></div>
              <div className="detail-row"><span className="detail-label">Missing required</span><span className="detail-value">{item.missing_required_document_count}</span></div>
              <div className="detail-row"><span className="detail-label">Future due required</span><span className="detail-value">{item.future_due_document_count}</span></div>
            </div>
            <div className="record-card__notes">
              {item.missing_required_document_count > 0 ? (
                <div className="notice">
                  <strong>Completion blocker.</strong>
                  <span className="muted">{missingDocumentSummary}.</span>
                </div>
              ) : null}
              <p className="muted" style={{ margin: 0 }}>
                {checklistStats.totalCount === 0
                  ? "No checklist items added yet."
                  : `${checklistStats.completedCount}/${checklistStats.totalCount} checklist items complete, ${checklistStats.openCount} open.`}
              </p>
              {item.checklist_overdue_count > 0 || item.checklist_escalation_due_count > 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  {item.checklist_overdue_count} overdue, {item.checklist_escalation_due_count} escalation due.
                </p>
              ) : null}
              {item.missing_required_document_names.length > 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  Missing documents: {item.missing_required_document_names.join(", ")}.
                </p>
              ) : null}
              {getOnboardingCompletionWarning(item) ? <p className="muted" style={{ margin: 0 }}>{getOnboardingCompletionWarning(item)}</p> : null}
            </div>
          </article>
        );
        })}
        {items.length === 0 ? (
          <div className="card panel">
            <strong>No onboarding records match the current filters.</strong>
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
