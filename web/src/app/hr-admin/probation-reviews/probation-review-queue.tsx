"use client";
import {useDocumentUploadDraft} from "@/lib/ui/use-document-upload-draft";
import {postLifecycleBulk,lifecycleNavigate} from "@/lib/ui/lifecycle-bulk";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";


import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceDataTable, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
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

  const pathname = usePathname();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [feedback,setFeedback]=useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pending=useRef(false);const noticeRef=useRef<HTMLDivElement>(null);const ready=useSyncExternalStore(()=>()=>{},()=>true,()=>false);
  useDocumentUploadDraft(false,isSubmitting);
  useEffect(()=>{if(error||feedback)noticeRef.current?.focus();},[error,feedback]);
  const [search, setSearch] = useState(currentFilters.q);
  const [decision, setDecision] = useState(currentFilters.decision || "all");
  const [owner, setOwner] = useState(currentFilters.owner || "all");
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));
  const [bulkOwner, setBulkOwner] = useState(currentFilters.owner || "");
  useEffect(()=>{const restore=()=>{setSearch(currentFilters.q );setDecision(currentFilters.decision || "all");setOwner(currentFilters.owner || "all");setPageSize(String(currentFilters.page_size));setSelectedIds([]);};window.addEventListener('pageshow',restore);window.addEventListener('popstate',restore);return()=>{window.removeEventListener('pageshow',restore);window.removeEventListener('popstate',restore);};},[currentFilters]);
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

  function goToPage(page: number, apply = false) {
    if(!apply){lifecycleNavigate(queueHref({page}));return;}
    lifecycleNavigate(`${pathname}${buildQueryString({
      q: search.trim() || undefined,
      decision: decision !== "all" ? decision : undefined,
      owner: owner !== "all" ? owner : undefined,
      page,
      page_size: Number(pageSize) || currentFilters.page_size,
    })}`);
  }

  function queueHref(params: Record<string,string|number|boolean|undefined> = {}) {
    return `${pathname}${buildQueryString({...currentFilters,...params})}`;
  }

  function decisionTone(value: string) {
    if (value === "confirmed" || value === "completed") return "success";
    if (value === "terminate" || value === "rejected") return "danger";
    if (value === "extend") return "warning";
    if (value === "pending") return "info";
    return "neutral";
  }

  async function handleBulkOwnerAction(nextOwnerValue: string) {
    if (state !== "live") {
      setError("Bulk owner updates are disabled in demo mode.");
      return;
    }
    setError("");
    if(pending.current)return;pending.current=true;
    setIsSubmitting(true);
    const body: HrAdminLifecycleOwnerBulkActionInput = {
      record_type: "probation",
      record_ids: selectedIds,
      owner_value: nextOwnerValue,
    };
    try {
      const count=await postLifecycleBulk("/api/hr-admin/lifecycle-owner-bulk-actions",body);
      setFeedback(`${count} of ${selectedIds.length} requested records confirmed updated. Reload the queue for current rows.`);setSelectedIds([]);
    } catch(error){setError(error instanceof Error?error.message:"Update outcome could not be confirmed. Reload before retrying.");}
    finally {pending.current=false;setIsSubmitting(false);}
  }

  async function handleBulkStatusAction(nextDecisionValue: string) {
    if (state !== "live") {
      setError("Bulk status updates are disabled in demo mode.");
      return;
    }
    setError("");
    if(pending.current)return;pending.current=true;
    setIsSubmitting(true);
    const body: HrAdminLifecycleStatusBulkActionInput = {
      record_type: "probation",
      record_ids: selectedIds,
      status_value: nextDecisionValue,
    };
    try {
      const count=await postLifecycleBulk("/api/hr-admin/lifecycle-status-bulk-actions",body);
      setFeedback(`${count} of ${selectedIds.length} requested records confirmed updated. Reload the queue for current rows.`);setSelectedIds([]);
    } catch(error){setError(error instanceof Error?error.message:"Update outcome could not be confirmed. Reload before retrying.");}
    finally {pending.current=false;setIsSubmitting(false);}
  }

  return (
    <section className="section queue-layout lifecycle-queue-layout"><fieldset className="lifecycle-fields" disabled={!ready||isSubmitting} data-hydrated={ready}>
      {error||feedback?<div className="notice" role={error?"alert":"status"} ref={noticeRef} tabIndex={-1}>{error?<p>{error}</p>:null}{feedback?<p>{feedback}</p>:null}<a data-navigation-mode="document" href={queueHref()}>Reload queue</a></div>:null}
      <section className="queue-toolbar panel-card-soft lifecycle-queue-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Probation reviews</h2>
            <p className="section-copy section-copy-soft">Filter by decision, owner, or search context.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{pagination.total_count}</strong> total reviews</span>
            <span className="queue-summary-chip"><strong>{selectedIds.length}</strong> selected</span>
          </div>
        </div>
        <div className="queue-toolbar__grid">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" onChange={(event) => setSearch(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();goToPage(1,true);}}} placeholder="Employee, code, reviewer, workflow, remarks" value={search} />
          </label>
          <label className="form-field">
            <span className="muted">Decision</span><select aria-label="Decision" className="input-control" onChange={(event) => setDecision(event.target.value)} value={decision}>
              <option value="all">All decisions</option>
              {probationDecisionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Owner</span><select aria-label="Owner" className="input-control" onChange={(event) => setOwner(event.target.value)} value={owner}>
              <option value="all">All owners</option>
              {lifecycleOwners.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="queue-toolbar__actions">
          <button className="button button--primary" onClick={() => goToPage(1,true)} type="button">Apply filters</button>
          <button className="button button--ghost" onClick={() => {
            setSelectedIds([]);
            setError("");
            setSearch("");
            setDecision("all");
            setOwner("all");
            setPageSize("25");
            setBulkOwner("");
            setBulkDecision(probationDecisionOptions[0]?.value ?? "pending");
            lifecycleNavigate(pathname);
          }} type="button">Clear filters</button>
          <button className="button button--secondary" disabled={items.length === 0} onClick={toggleAll} type="button">
            {allSelected ? "Clear selection" : "Select page"}
          </button>
        </div>
        <div className="queue-toolbar__bulk-grid lifecycle-bulk-grid">
          <div className="queue-toolbar__bulk-group">
            <label className="form-field">
              <span className="muted">Bulk owner</span><select aria-label="Bulk owner" className="input-control" onChange={(event) => setBulkOwner(event.target.value)} value={bulkOwner}>
                <option value="">Clear owner assignment</option>
                {lifecycleOwners.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
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
          <div className="queue-toolbar__bulk-group">
            <label className="form-field">
              <span className="muted">Bulk decision</span><select aria-label="Bulk decision" className="input-control" onChange={(event) => setBulkDecision(event.target.value)} value={bulkDecision}>
                {probationDecisionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <div className="queue-toolbar__actions">
              <button
                className="button button--secondary"
                disabled={isSubmitting || selectedIds.length === 0 || extendBlockedItems.length > 0}
                onClick={() => handleBulkStatusAction(bulkDecision)}
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
              </section>

      <WorkspaceDataTable ariaLabel="Probation review records" className="lifecycle-table">
        <thead>
          <tr>
            <th><input aria-label="Select all probation reviews on this page" checked={allSelected} onChange={toggleAll} type="checkbox" /></th>
            <th>Employee</th>
            <th>Decision</th>
            <th>Review date</th>
            <th>Probation end</th>
            <th>Reviewer</th>
            <th>Extension</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <tr className={isSelected ? "is-selected" : ""} key={item.id}>
              <td><input aria-label={`Select ${item.employee_name}`} checked={isSelected} onChange={() => toggleOne(item.id)} type="checkbox" /></td>
              <td><strong>{item.employee_name}</strong><span>{item.employee_code} · {item.workflow_reference || "No workflow"}</span></td>
              <td><WorkspaceStatusBadge tone={decisionTone(item.decision)}>{item.decision}</WorkspaceStatusBadge></td>
              <td><strong>{item.review_date}</strong><span>{item.remarks || "No remarks"}</span></td>
              <td><strong>{item.probation_end_date || "TBD"}</strong></td>
              <td><strong>{item.reviewer_identifier || "Unassigned"}</strong><span>{item.owner_value || "No owner value"}</span></td>
              <td><strong>{item.extension_end_date || "No extension"}</strong></td>
              <td><a data-navigation-mode="document" className="button button--secondary" data-lifecycle-trigger={`edit-probation-${item.id}`} href={queueHref({ editReview: item.id })}>Edit</a></td>
            </tr>
          );
        })}
        </tbody>
      </WorkspaceDataTable>
      <div className="lifecycle-pagination-row">
        <label className="form-field form-field--inline">
          <span className="muted">Rows</span><select aria-label="Rows" className="input-control" onChange={(event) => setPageSize(event.target.value)} value={pageSize}>
            {[10, 25, 50, 100].map((value) => <option key={value} value={String(value)}>{value}</option>)}
          </select>
        </label>
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
    </fieldset>
    </section>
  );
}
