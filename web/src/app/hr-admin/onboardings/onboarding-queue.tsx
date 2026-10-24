"use client";
import {useDocumentUploadDraft} from "@/lib/ui/use-document-upload-draft";
import {postLifecycleBulk,lifecycleNavigate} from "@/lib/ui/lifecycle-bulk";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";


import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceDataTable, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
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

  const pathname = usePathname();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [feedback,setFeedback]=useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pending=useRef(false);const noticeRef=useRef<HTMLDivElement>(null);const ready=useSyncExternalStore(()=>()=>{},()=>true,()=>false);
  useDocumentUploadDraft(false,isSubmitting);
  useEffect(()=>{if(error||feedback)noticeRef.current?.focus();},[error,feedback]);
  const [search, setSearch] = useState(currentFilters.q);
  const [status, setStatus] = useState(currentFilters.status || "all");
  const [owner, setOwner] = useState(currentFilters.owner || "all");
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));
  const [bulkOwner, setBulkOwner] = useState(currentFilters.owner || "");
  useEffect(()=>{const restore=()=>{setSearch(currentFilters.q );setStatus(currentFilters.status || "all");setOwner(currentFilters.owner || "all");setPageSize(String(currentFilters.page_size));setSelectedIds([]);};window.addEventListener('pageshow',restore);window.addEventListener('popstate',restore);return()=>{window.removeEventListener('pageshow',restore);window.removeEventListener('popstate',restore);};},[currentFilters]);
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

  function goToPage(page: number, apply = false) {
    if(!apply){lifecycleNavigate(queueHref({page}));return;}
    lifecycleNavigate(`${pathname}${buildQueryString({
      q: search.trim() || undefined,
      status: status !== "all" ? status : undefined,
      owner: owner !== "all" ? owner : undefined,
      page,
      page_size: Number(pageSize) || currentFilters.page_size,
    })}`);
  }

  function queueHref(params: Record<string,string|number|boolean|undefined> = {}) {
    return `${pathname}${buildQueryString({...currentFilters,...params})}`;
  }

  function statusTone(value: string) {
    if (value === "completed") return "success";
    if (value === "blocked") return "danger";
    if (value === "in_progress") return "info";
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
      record_type: "onboarding",
      record_ids: selectedIds,
      owner_value: nextOwnerValue,
    };
    try {
      const count=await postLifecycleBulk("/api/hr-admin/lifecycle-owner-bulk-actions",body);
      setFeedback(`${count} of ${selectedIds.length} requested records confirmed updated. Reload the queue for current rows.`);setSelectedIds([]);
    } catch(error){setError(error instanceof Error?error.message:"Update outcome could not be confirmed. Reload before retrying.");}
    finally {pending.current=false;setIsSubmitting(false);}
  }

  async function handleBulkStatusAction(nextStatusValue: string) {
    if (state !== "live") {
      setError("Bulk status updates are disabled in demo mode.");
      return;
    }
    setError("");
    if(pending.current)return;pending.current=true;
    setIsSubmitting(true);
    const body: HrAdminLifecycleStatusBulkActionInput = {
      record_type: "onboarding",
      record_ids: selectedIds,
      status_value: nextStatusValue,
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
            <h2 className="section-heading-soft">Onboardings</h2>
            <p className="section-copy section-copy-soft">Filter joiners by readiness, owner, or status.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{selectedIds.length}</strong> selected</span>
          </div>
        </div>
        <div className="queue-toolbar__grid">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" onChange={(event) => setSearch(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();goToPage(1,true);}}} placeholder="Employee, code, owner, template, notes" value={search} />
          </label>
          <label className="form-field">
            <span className="muted">Status</span><select aria-label="Status" className="input-control" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="all">All statuses</option>
              {onboardingStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
            setStatus("all");
            setOwner("all");
            setPageSize("25");
            setBulkOwner("");
            setBulkStatus(onboardingStatusOptions[0]?.value ?? "not_started");
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
              <span className="muted">Bulk status</span><select aria-label="Bulk status" className="input-control" onChange={(event) => setBulkStatus(event.target.value)} value={bulkStatus}>
                {onboardingStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
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
              </section>

      <WorkspaceDataTable ariaLabel="Onboarding records" className="lifecycle-table">
        <thead>
          <tr>
            <th><input aria-label="Select all onboarding records on this page" checked={allSelected} onChange={toggleAll} type="checkbox" /></th>
            <th>Employee</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Joining</th>
            <th>Checklist</th>
            <th>Documents</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
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
            <tr className={isSelected ? "is-selected" : ""} key={item.id}>
              <td><input aria-label={`Select ${item.employee_name}`} checked={isSelected} onChange={() => toggleOne(item.id)} type="checkbox" /></td>
              <td><strong>{item.employee_name}</strong><span>{item.employee_code} · {item.workflow_reference || "No workflow"}</span></td>
              <td><strong>{item.assigned_owner_identifier || "Unassigned"}</strong><span>{item.onboarding_template_code || "No template"}</span></td>
              <td><WorkspaceStatusBadge tone={statusTone(item.status)}>{item.status}</WorkspaceStatusBadge><span>{item.attention_summary || "On track"}</span></td>
              <td><strong>{item.expected_joining_date || "TBD"}</strong><span>Actual {item.actual_joining_date || "Pending"}</span></td>
              <td><strong>{checklistStats.completedCount}/{checklistStats.totalCount}</strong><span>{checklistStats.openCount} open</span></td>
              <td>
                <WorkspaceStatusBadge tone={item.missing_required_document_count > 0 ? "danger" : item.future_due_document_count > 0 ? "warning" : "success"}>
                  {item.missing_required_document_count > 0 ? "Doc blocker" : item.future_due_document_count > 0 ? "Docs upcoming" : "Docs ready"}
                </WorkspaceStatusBadge>
                <span>{missingDocumentSummary}</span>
              </td>
              <td><a data-navigation-mode="document" className="button button--secondary" data-lifecycle-trigger={`edit-onboarding-${item.id}`} href={queueHref({ editOnboarding: item.id })}>Edit</a></td>
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
    </fieldset>
    </section>
  );
}
