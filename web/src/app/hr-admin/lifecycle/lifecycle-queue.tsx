"use client";
import {useDocumentUploadDraft} from "@/lib/ui/use-document-upload-draft";
import {postLifecycleBulk,lifecycleNavigate} from "@/lib/ui/lifecycle-bulk";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";


import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";


import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";


import { probationReviewToFormValue } from "@/app/hr-admin/probation-reviews/form-values";
import {OnboardingForm} from "@/app/hr-admin/onboardings/onboarding-form";
import {onboardingToFormValue} from "@/app/hr-admin/onboardings/form-values";
import {LifecycleEditorDialog} from "./lifecycle-form-state";
import { ProbationReviewForm } from "@/app/hr-admin/probation-reviews/probation-review-form";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { WorkspaceFilterBar, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminEnumOption, HrAdminLifecycleEmployeeOption, HrAdminLifecycleOptions, HrAdminLifecycleOwnerBulkActionInput, HrAdminLifecycleOwnerOption, HrAdminLifecycleQueueItem, HrAdminLifecycleStatusBulkActionInput, HrAdminProbationReview, HrAdminOnboarding, HrAdminWorkflowTemplate } from "@/lib/types";

type Props = {
  items: HrAdminLifecycleQueueItem[];
  state: "live" | "demo";
  employees: HrAdminLifecycleEmployeeOption[];
  lifecycleOwners: HrAdminLifecycleOwnerOption[];
  currentFilters: {
    q: string;
    item_type: string;
    status: string;
    employee_id: string;
    owner: string;
    primary_date_from: string;
    primary_date_to: string;
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
  statusOptionsByType: Record<string, HrAdminEnumOption[]>;
  lifecycleOptions: HrAdminLifecycleOptions;
  editProbationReview?: HrAdminProbationReview | null;
  editOnboarding?: HrAdminOnboarding|null;
  workflowTemplates:HrAdminWorkflowTemplate[];
  recordItem?:HrAdminLifecycleQueueItem|null;
  editRecordItem?:HrAdminLifecycleQueueItem|null;
  summary: {
    documentBlockedCount: number;
    documentUpcomingCount: number;
    onboardingCount: number;
    pendingProbationCount: number;
  };
};

const BULK_ASSIGNABLE_TYPES = new Set(["onboarding", "probation", "movement"]);

function getDocumentAttentionTone(state: string) {
  if (state === "blocked") return "danger";
  if (state === "warning" || state === "upcoming") return "warning";
  return "success";
}

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to update lifecycle owners.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to update lifecycle owners.");
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

export function LifecycleQueue({
  items,
  state,
  employees,
  lifecycleOwners,
  currentFilters,
  pagination,
  statusOptionsByType,
  lifecycleOptions,
  editProbationReview,editOnboarding,workflowTemplates,recordItem,editRecordItem,
  summary,
}: Props) {

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openRecordKey = searchParams.get("record") ?? "";
  const editRecordKey = searchParams.get("editRecord") ?? "";
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pending=useRef(false);const noticeRef=useRef<HTMLDivElement>(null);const ready=useSyncExternalStore(()=>()=>{},()=>true,()=>false);
  useDocumentUploadDraft(false,isSubmitting);
  useEffect(()=>{if(error||feedback)noticeRef.current?.focus();},[error,feedback]);
  const [search, setSearch] = useState(currentFilters.q);
  const [itemType, setItemType] = useState(currentFilters.item_type || "all");
  const [status, setStatus] = useState(currentFilters.status || "all");
  const [employeeId, setEmployeeId] = useState(currentFilters.employee_id || "all");
  const [owner, setOwner] = useState(currentFilters.owner || "all");
  const [primaryDateFrom, setPrimaryDateFrom] = useState(currentFilters.primary_date_from);
  const [primaryDateTo, setPrimaryDateTo] = useState(currentFilters.primary_date_to);
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));
  const [bulkOwner, setBulkOwner] = useState(currentFilters.owner || "");
  useEffect(()=>{const restore=()=>{setSearch(currentFilters.q );setStatus(currentFilters.status || "all");setItemType(currentFilters.item_type || "all");setEmployeeId(currentFilters.employee_id || "all");setOwner(currentFilters.owner || "all");setPrimaryDateFrom(currentFilters.primary_date_from );setPrimaryDateTo(currentFilters.primary_date_to );setPageSize(String(currentFilters.page_size));setSelectedKeys([]);};window.addEventListener('pageshow',restore);window.addEventListener('popstate',restore);return()=>{window.removeEventListener('pageshow',restore);window.removeEventListener('popstate',restore);};},[currentFilters]);
  const [bulkStatus, setBulkStatus] = useState("");
  const inspectTrigger=useRef<HTMLButtonElement|null>(null);const detailRef=useRef<HTMLElement|null>(null);
  const [selectedItemKey, setSelectedItemKey] = useState("");

  useEffect(()=>{if(selectedItemKey){detailRef.current?.scrollIntoView({block:"start"});detailRef.current?.focus({preventScroll:true});}},[selectedItemKey]);
  const statusOptions = itemType !== "all" ? (statusOptionsByType[itemType] ?? []) : [];
  const assignableItems = items.filter((item) => BULK_ASSIGNABLE_TYPES.has(item.item_type));
  const assignableKeys = assignableItems.map((item) => `${item.item_type}:${item.id}`);
  const allAssignableSelected = assignableKeys.length > 0 && assignableKeys.every((key) => selectedKeys.includes(key));

  function getItemKey(item: HrAdminLifecycleQueueItem) {
    return `${item.item_type}:${item.id}`;
  }

  function toggleOne(item: HrAdminLifecycleQueueItem) {
    const itemKey = getItemKey(item);
    if (!BULK_ASSIGNABLE_TYPES.has(item.item_type)) {
      return;
    }
    setSelectedKeys((current) => (current.includes(itemKey) ? current.filter((value) => value !== itemKey) : [...current, itemKey]));
  }

  function toggleAssignablePage() {
    setSelectedKeys((current) => (allAssignableSelected ? current.filter((key) => !assignableKeys.includes(key)) : [...new Set([...current, ...assignableKeys])]));
  }

  const statusBulkType = itemType === "onboarding" || itemType === "probation" || itemType === "movement" ? itemType : "";
  const statusBulkOptions = statusBulkType ? (statusOptionsByType[statusBulkType] ?? []) : [];
  const selectedStatusItems = items.filter((item) => selectedKeys.includes(getItemKey(item)) && item.item_type === statusBulkType);
  const selectedItem = items.find((item) => getItemKey(item) === selectedItemKey) ?? null;
  const modalItem = recordItem??null;
  const editItem = editRecordItem??null;
  const numericPageSize = pagination.page_size;
  const totalPages = Math.max(1, Math.ceil(pagination.total_count / Math.max(numericPageSize, 1)));
  const pageStart = pagination.total_count === 0 ? 0 : ((pagination.page - 1) * numericPageSize) + 1;
  const pageEnd = pagination.total_count === 0 ? 0 : Math.min(pagination.page * numericPageSize, pagination.total_count);
  const bulkStatusBlockedItems =
    statusBulkType === "probation" && bulkStatus === "extend"
      ? selectedStatusItems.filter((item) => item.bulk_status_warning)
      : statusBulkType === "onboarding" && bulkStatus === "completed"
        ? selectedStatusItems.filter((item) => item.bulk_status_warning)
        : [];

  function goToPage(page: number, apply = false) {
    if(!apply){lifecycleNavigate(currentQueueHref({page}));return;}
    lifecycleNavigate(`${pathname}${buildQueryString({
      q: search.trim() || undefined,
      item_type: itemType !== "all" ? itemType : undefined,
      status: status !== "all" ? status : undefined,
      employee_id: employeeId !== "all" ? employeeId : undefined,
      owner: owner !== "all" ? owner : undefined,
      primary_date_from: primaryDateFrom || undefined,
      primary_date_to: primaryDateTo || undefined,
      page,
      page_size: Number(pageSize)||currentFilters.page_size,
    })}`);
  }

  function currentQueueHref(params: Record<string,string|number|boolean|undefined> = {}) {
    return `${pathname}${buildQueryString({...currentFilters,...params})}`;
  }

  async function handleBulkOwnerAction(nextOwnerValue: string) {
    if (state !== "live") {
      setError("Bulk owner updates are disabled in demo mode.");
      return;
    }

    const groupedIds: Record<"onboarding" | "probation" | "movement", string[]> = {
      onboarding: [],
      probation: [],
      movement: [],
    };
    items.forEach((item) => {
      const itemKey = getItemKey(item);
      if (!selectedKeys.includes(itemKey) || !BULK_ASSIGNABLE_TYPES.has(item.item_type)) {
        return;
      }
      groupedIds[item.item_type as keyof typeof groupedIds].push(item.id);
    });

    setError("");
    setFeedback("");
    if(pending.current)return;pending.current=true;
    setIsSubmitting(true);
    let confirmed=0;
    try {
      for (const recordType of ["onboarding", "probation", "movement"] as const) {
        if (groupedIds[recordType].length === 0) {
          continue;
        }
        const body: HrAdminLifecycleOwnerBulkActionInput = {
          record_type: recordType,
          record_ids: groupedIds[recordType],
          owner_value: nextOwnerValue,
        };
        const count=await postLifecycleBulk("/api/hr-admin/lifecycle-owner-bulk-actions",body);
        confirmed+=count;setFeedback(`${confirmed} requested records confirmed updated so far. Reload the queue for current rows.`);
      }
      setSelectedKeys([]);
      setFeedback(`${confirmed} records confirmed updated. Other selected records were not reported updated. Reload the queue for current rows.`);

    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update lifecycle owners.");
    } finally {
      setIsSubmitting(false);pending.current=false;
    }
  }

  async function handleBulkStatusAction(nextStatusValue: string) {
    if (state !== "live") {
      setError("Bulk status updates are disabled in demo mode.");
      return;
    }
    if (!statusBulkType) {
      setError("Choose a single lifecycle type to apply a bulk status update.");
      return;
    }
    const selectedIds = items
      .filter((item) => selectedKeys.includes(getItemKey(item)) && item.item_type === statusBulkType)
      .map((item) => item.id);
    if (selectedIds.length === 0) {
      setError("Select at least one matching lifecycle record on this page.");
      return;
    }

    setError("");
    setFeedback("");
    if(pending.current)return;pending.current=true;
    setIsSubmitting(true);
    const body: HrAdminLifecycleStatusBulkActionInput = {
      record_type: statusBulkType,
      record_ids: selectedIds,
      status_value: nextStatusValue,
    };
    try {
      const count=await postLifecycleBulk("/api/hr-admin/lifecycle-status-bulk-actions",body);
      setFeedback(`${count} of ${selectedIds.length} requested records confirmed updated. Reload the queue for current rows.`);
      setSelectedKeys([]);


    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update lifecycle statuses.");
    } finally {
      setIsSubmitting(false);pending.current=false;
    }
  }

  return (
    <section className="section queue-layout lifecycle-queue-layout"><fieldset className="lifecycle-fields" disabled={!ready||isSubmitting} data-hydrated={ready}>
      {error||feedback?<div className="notice" role={error?"alert":"status"} ref={noticeRef} tabIndex={-1}>{error?<p>{error}</p>:null}{feedback?<p>{feedback}</p>:null}<a data-navigation-mode="document" href={currentQueueHref()}>Reload queue</a></div>:null}
      <div className="hr-employee-summary-strip lifecycle-summary-strip">
        <span><strong>{pagination.total_count}</strong> matching records</span>
        <span><strong>{summary.onboardingCount}</strong> onboardings</span>
        <span><strong>{summary.pendingProbationCount}</strong> probation pending</span>
        <span><strong>{summary.documentBlockedCount}</strong> on-page doc blockers</span>
        <span><strong>{summary.documentUpcomingCount}</strong> on-page doc upcoming</span>
      </div>

      <section className="queue-toolbar panel-card-soft lifecycle-queue-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Lifecycle inbox</h2>
            <p className="section-copy section-copy-soft">Filter by type, owner, employee, or date.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{pagination.total_count}</strong> matching records</span>
            <span className="queue-summary-chip"><strong>{items.length}</strong> on this page</span>
            <span className="queue-summary-chip"><strong>{selectedKeys.length}</strong> selected</span>
          </div>
        </div>
        <WorkspaceFilterBar className="queue-toolbar__grid">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" onChange={(event) => setSearch(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();goToPage(1,true);}}} placeholder="Employee, owner, workflow, notes" value={search} />
          </label>
          <label className="form-field">
            <span className="muted">Lifecycle type</span>
            <select
              onChange={(event) => {
                setItemType(event.target.value);
                setStatus("all");
              }}
              className="input-control"
              value={itemType}
            >
              <option value="all">All lifecycle records</option>
              <option value="onboarding">Onboardings</option>
              <option value="probation">Probation reviews</option>
              <option value="movement">Movements</option>
              <option value="exit">Exits</option>
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Status</span><select aria-label="Status" className="input-control" disabled={itemType === "all"} onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="all">{itemType === "all" ? "Choose a type first" : "All statuses"}</option>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <details className="directory-more-filters lifecycle-more-filters">
            <summary className="button button--secondary button--compact">More filters</summary>
            <div className="directory-more-filters__panel lifecycle-more-filters__panel">
              <label className="form-field">
                <span className="muted">Employee</span><select aria-label="Employee" className="input-control" onChange={(event) => setEmployeeId(event.target.value)} value={employeeId}>
                  <option value="all">All employees</option>
                  {employees.map((option) => <option key={option.id} value={option.id}>{option.name} ({option.employee_code})</option>)}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Owner</span><select aria-label="Owner" className="input-control" onChange={(event) => setOwner(event.target.value)} value={owner}>
                  <option value="all">All owners</option>
                  {lifecycleOwners.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Primary date from</span>
                <input className="input-control" onChange={(event) => setPrimaryDateFrom(event.target.value)} type="date" value={primaryDateFrom} />
              </label>
              <label className="form-field">
                <span className="muted">Primary date to</span>
                <input className="input-control" onChange={(event) => setPrimaryDateTo(event.target.value)} type="date" value={primaryDateTo} />
              </label>
            </div>
          </details>
        </WorkspaceFilterBar>
        <div className="queue-toolbar__actions">
          <button className="button button--primary" onClick={() => goToPage(1,true)} type="button">Apply filters</button>
          <button className="button button--ghost" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent);
            setSelectedKeys([]);
            setError("");
            setFeedback("");
            setSearch("");
            setItemType("all");
            setStatus("all");
            setEmployeeId("all");
            setOwner("all");
            setPrimaryDateFrom("");
            setPrimaryDateTo("");
            setPageSize("25");
            setBulkOwner("");
            setBulkStatus("");
            lifecycleNavigate(pathname);
           }} type="button">Clear filters</button>
          <button className="button button--secondary" disabled={assignableItems.length === 0} onClick={toggleAssignablePage} type="button">
            {allAssignableSelected ? "Clear selection" : "Select page"}
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
                disabled={isSubmitting || selectedKeys.length === 0}
                onClick={() => handleBulkOwnerAction(bulkOwner)}
                type="button"
              >
                {isSubmitting ? "Saving..." : `Assign owner (${selectedKeys.length || 0})`}
              </button>
              <button
                className="button button--ghost"
                disabled={isSubmitting || selectedKeys.length === 0}
                onClick={() => handleBulkOwnerAction("")}
                type="button"
              >
                Clear owner ({selectedKeys.length || 0})
              </button>
            </div>
          </div>
          <div className="queue-toolbar__bulk-group">
            <label className="form-field">
              <span className="muted">Bulk status</span><select aria-label="Bulk status" className="input-control" disabled={!statusBulkType} onChange={(event) => setBulkStatus(event.target.value)} value={bulkStatus}>
                <option value="">{statusBulkType ? "Choose a status" : "Choose a single lifecycle type first"}</option>
                {statusBulkOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <div className="queue-toolbar__actions">
              <button
                className="button button--secondary"
                disabled={isSubmitting || selectedKeys.length === 0 || !statusBulkType || !bulkStatus || bulkStatusBlockedItems.length > 0}
                onClick={() => handleBulkStatusAction(bulkStatus)}
                type="button"
              >
                Set status ({selectedKeys.length || 0})
              </button>
            </div>
          </div>
        </div>
        {bulkStatusBlockedItems.length > 0 ? (
          <div className="notice">
            <strong>{statusBulkType === "onboarding" ? "Bulk completion is blocked." : "Bulk extend is blocked."}</strong>
            <span className="muted">
              {statusBulkType === "onboarding"
                ? bulkStatusBlockedItems.length === 1
                  ? `${bulkStatusBlockedItems[0].employee_name}: ${bulkStatusBlockedItems[0].bulk_status_warning}`
                  : `${bulkStatusBlockedItems.length} selected onboardings still have specific readiness blockers. Review the per-record notes in the queue before bulk completing.`
                : bulkStatusBlockedItems.length === 1
                  ? `${bulkStatusBlockedItems[0].employee_name} is missing an extension end date.`
                  : `${bulkStatusBlockedItems.length} selected probation reviews are missing an extension end date.`}
            </span>
          </div>
        ) : null}
                      </section>

      <div className={`lifecycle-review-workbench${selectedItem ? " lifecycle-review-workbench--with-detail" : ""}`}>
        <article className="record-card panel-card-soft lifecycle-directory-panel">
          <WorkspaceTableScrollRegion label="Lifecycle table 1" className="employee-directory-table-wrap lifecycle-directory-table-wrap workspace-table-region">
            {items.length ? (
              <table className="employee-directory-table lifecycle-directory-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Lifecycle</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Document state</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const itemKey = getItemKey(item);
                    const isAssignable = BULK_ASSIGNABLE_TYPES.has(item.item_type);
                    const isSelected = selectedItemKey === itemKey;
                    return (
                      <tr className={isSelected ? "employee-directory-table__row--active" : ""} key={itemKey}>
                        <td>
                          <div className="document-table-title-cell">
                            <input aria-label={`Select ${item.item_label} for ${item.employee_name}`} checked={selectedKeys.includes(itemKey)} disabled={!isAssignable} onChange={() => toggleOne(item)} type="checkbox" />
                            <button className="document-table-title-button" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); inspectTrigger.current=triggerEvent.currentTarget;setSelectedItemKey(itemKey); }} type="button">
                              <strong>{item.employee_name}</strong>
                              <small>{item.employee_code}</small>
                            </button>
                          </div>
                        </td>
                        <td>
                          <strong>{item.item_label}</strong>
                          <small>{item.primary_date_label}: {item.primary_date || "Not set"}</small>
                        </td>
                        <td>
                          <WorkspaceStatusBadge tone="neutral">{item.status_label}</WorkspaceStatusBadge>
                          <small>{item.secondary_date || item.secondary_date_label || "No secondary date"}</small>
                        </td>
                        <td>
                          <strong>{item.owner_label || "Unassigned"}</strong>
                          <small>{item.workflow_reference || "No workflow"}</small>
                        </td>
                        <td>
                          <WorkspaceStatusBadge tone={getDocumentAttentionTone(item.document_attention_state)}>
                            {item.document_attention_state === "blocked"
                              ? "Doc blocker"
                              : item.document_attention_state === "warning"
                                ? "Docs expiring"
                                : item.document_attention_state === "upcoming"
                                  ? "Docs upcoming"
                                  : "Docs clear"}
                          </WorkspaceStatusBadge>
                          <small>{item.document_attention_summary}</small>
                        </td>
                        <td>
                          <button data-lifecycle-trigger={`inspect-${itemKey}`} className="button button--secondary button--compact" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); inspectTrigger.current=triggerEvent.currentTarget;setSelectedItemKey(itemKey); }} type="button">
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="notice">
                <strong>No lifecycle records match the current filters.</strong>
                <span className="muted">Try clearing one or more filters to widen the review queue.</span>
              </div>
            )}
          </WorkspaceTableScrollRegion>
        </article>

        {selectedItem ? (
          <article tabIndex={-1} ref={detailRef} className="record-card panel-card-soft employee-detail-drawer lifecycle-detail-drawer">
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <h2 className="section-heading-soft">Lifecycle detail</h2>
                <p className="section-copy section-copy-soft">Focused detail for the selected workflow record.</p>
              </div>
              <div className="record-card__actions">
                <button className="button button--ghost button--compact" onClick={() => { inspectTrigger.current?.focus();setSelectedItemKey(""); }} type="button">Close</button>
                <a data-navigation-mode="document" className="button button--secondary button--compact" data-lifecycle-trigger={`record-${getItemKey(selectedItem)}`} href={currentQueueHref({ editRecord: undefined, record: getItemKey(selectedItem) })}>Open record</a>
                <a data-navigation-mode="document" className="button button--primary button--compact" data-lifecycle-trigger={`edit-${getItemKey(selectedItem)}`} href={currentQueueHref({ record: undefined, editRecord: getItemKey(selectedItem) })}>Edit record</a>
              </div>
            </div>
            <div className="document-detail-identity">
              <div>
                <h3>{selectedItem.employee_name}</h3>
                <p>{selectedItem.employee_code} · {selectedItem.item_label}</p>
              </div>
              <WorkspaceStatusBadge tone="neutral">{selectedItem.status_label}</WorkspaceStatusBadge>
            </div>
            {selectedItem.document_attention_state !== "clear" ? (
              <div className="notice">
                <strong>Document attention needed.</strong>
                <span className="muted">{selectedItem.document_attention_summary}</span>
              </div>
            ) : null}
            <div className="employee-detail-stack detail-grid-soft">
              <details className="employee-detail-section" open>
                <summary>Workflow</summary>
                <div className="employee-detail-section__grid">
                  <div className="detail-row"><span className="detail-label">Type</span><span className="detail-value">{selectedItem.item_label}</span></div>
                  <div className="detail-row"><span className="detail-label">Status</span><span className="detail-value">{selectedItem.status_label}</span></div>
                  <div className="detail-row"><span className="detail-label">{selectedItem.primary_date_label}</span><span className="detail-value">{selectedItem.primary_date || "Not set"}</span></div>
                  <div className="detail-row"><span className="detail-label">{selectedItem.secondary_date_label || "Secondary date"}</span><span className="detail-value">{selectedItem.secondary_date || "Not set"}</span></div>
                  <div className="detail-row"><span className="detail-label">Owner</span><span className="detail-value">{selectedItem.owner_label || "Unassigned"}</span></div>
                  <div className="detail-row"><span className="detail-label">Workflow</span><span className="detail-value">{selectedItem.workflow_reference || "Not linked"}</span></div>
                </div>
              </details>
              <details className="employee-detail-section" open>
                <summary>Attention</summary>
                <div className="employee-detail-section__grid">
                  <div className="detail-row"><span className="detail-label">Lifecycle</span><span className="detail-value">{selectedItem.attention_summary || "No active lifecycle pressure."}</span></div>
                  <div className="detail-row"><span className="detail-label">Documents</span><span className="detail-value">{selectedItem.document_attention_summary}</span></div>
                  <div className="detail-row"><span className="detail-label">Missing required</span><span className="detail-value">{selectedItem.missing_required_document_count}</span></div>
                  <div className="detail-row"><span className="detail-label">Expired docs</span><span className="detail-value">{selectedItem.expired_document_count}</span></div>
                  <div className="detail-row"><span className="detail-label">Upcoming required</span><span className="detail-value">{selectedItem.future_due_document_count}</span></div>
                  <div className="detail-row"><span className="detail-label">Expiring soon</span><span className="detail-value">{selectedItem.expiring_document_count}</span></div>
                </div>
              </details>
            </div>
            {selectedItem.bulk_status_warning ? <p className="muted" style={{ margin: 0 }}>{selectedItem.bulk_status_warning}</p> : null}
            {!BULK_ASSIGNABLE_TYPES.has(selectedItem.item_type) ? <p className="muted" style={{ margin: 0 }}>Bulk owner changes are not available for exit records.</p> : null}
          </article>
        ) : null}
      </div>

      <section className="card panel pagination-panel lifecycle-pagination-panel">
        <div className="pagination-bar">
          <div className="pagination-bar__summary">
            <span className="queue-summary-chip"><strong>{pageStart}-{pageEnd}</strong> of {pagination.total_count} records</span>
            <span className="queue-summary-chip"><strong>Page {pagination.page}</strong> of {totalPages}</span>
            <label className="lifecycle-page-size-control">
              <span>Rows</span>
              <select className="input-control" onChange={(event) => setPageSize(event.target.value)} value={pageSize}>
                {[10, 25, 50, 100].map((value) => <option key={value} value={String(value)}>{value}</option>)}
              </select>
            </label>
            <button className="button button--secondary button--compact" onClick={() => goToPage(1,true)} type="button">Apply</button>
          </div>
          {totalPages > 1 ? (
            <div className="pagination-bar__actions">
              <button className="button button--secondary" disabled={!pagination.has_previous} onClick={() => goToPage(1)} type="button">First</button>
              <button className="button button--secondary" disabled={!pagination.has_previous} onClick={() => goToPage(pagination.page - 1)} type="button">Previous</button>
              <button className="button button--secondary" disabled={!pagination.has_next} onClick={() => goToPage(pagination.page + 1)} type="button">Next</button>
              <button className="button button--secondary" disabled={!pagination.has_next} onClick={() => goToPage(totalPages)} type="button">Last</button>
            </div>
          ) : null}
        </div>
      </section>
      {openRecordKey&&!modalItem || editRecordKey&&!editItem?<div className="notice" role="status">Selected record unavailable. No other record has been opened. <a data-navigation-mode="document" href={currentQueueHref()}>Return to queue</a></div>:null}
      {modalItem ? (
        <HrAdminActionModal documentNavigation dirty={false}
          closeHref={currentQueueHref({ record: undefined })}
          description="Review lifecycle context without leaving the queue."
          eyebrow="Lifecycle record"
          footer={
            <>
              <span className="workspace-form-footer__note">Close returns to the lifecycle queue.</span>
              <div className="workspace-form-footer__actions">
                <a data-navigation-mode="document" className="button button--secondary" href={currentQueueHref({ record: undefined })}>Close</a>
              </div>
            </>
          }
          labelledBy="lifecycle-record-modal-title"
          title={`${modalItem.employee_name} - ${modalItem.item_label}`}
        >
          <div className="lifecycle-record-modal-content">
            <div className="document-detail-identity">
              <div>
                <h3>{modalItem.employee_name}</h3>
                <p>{modalItem.employee_code} · {modalItem.item_label}</p>
              </div>
              <WorkspaceStatusBadge tone="neutral">{modalItem.status_label}</WorkspaceStatusBadge>
            </div>
            <div className="employee-detail-stack detail-grid-soft">
              <details className="employee-detail-section" open>
                <summary>Record context</summary>
                <div className="employee-detail-section__grid">
                  <div className="detail-row"><span className="detail-label">Type</span><span className="detail-value">{modalItem.item_label}</span></div>
                  <div className="detail-row"><span className="detail-label">Status</span><span className="detail-value">{modalItem.status_label}</span></div>
                  <div className="detail-row"><span className="detail-label">{modalItem.primary_date_label}</span><span className="detail-value">{modalItem.primary_date || "Not set"}</span></div>
                  <div className="detail-row"><span className="detail-label">{modalItem.secondary_date_label || "Secondary date"}</span><span className="detail-value">{modalItem.secondary_date || "Not set"}</span></div>
                  <div className="detail-row"><span className="detail-label">Owner</span><span className="detail-value">{modalItem.owner_label || "Unassigned"}</span></div>
                  <div className="detail-row"><span className="detail-label">Workflow</span><span className="detail-value">{modalItem.workflow_reference || "Not linked"}</span></div>
                </div>
              </details>
              <details className="employee-detail-section" open>
                <summary>Attention</summary>
                <div className="employee-detail-section__grid">
                  <div className="detail-row"><span className="detail-label">Lifecycle</span><span className="detail-value">{modalItem.attention_summary || "No active lifecycle pressure."}</span></div>
                  <div className="detail-row"><span className="detail-label">Documents</span><span className="detail-value">{modalItem.document_attention_summary}</span></div>
                </div>
              </details>
            </div>
          </div>
        </HrAdminActionModal>
      ) : null}
      {editItem ? (
        <LifecycleEditorDialog
          closeHref={currentQueueHref({ editRecord: undefined })}
          labelledBy="lifecycle-edit-record-modal-title"
          title={`Edit ${editItem.employee_name} - ${editItem.item_label}`}
        >
          {editItem.item_type === "probation" && editProbationReview ? (
            <ProbationReviewForm
              compact
              cancelHref={currentQueueHref({ editRecord: undefined })}
              initialValue={probationReviewToFormValue(editProbationReview)}
              itemId={editProbationReview.id}
              mode="edit"
              options={lifecycleOptions}
              successHref={currentQueueHref({ editRecord: undefined })}
            />
          ) : editItem.item_type==="onboarding"&&editOnboarding ? (
            <OnboardingForm compact cancelHref={currentQueueHref()} successHref={currentQueueHref()} initialValue={onboardingToFormValue(editOnboarding)} item={editOnboarding} itemId={editOnboarding.id} lifecycleTemplates={workflowTemplates} mode="edit" options={lifecycleOptions}/>
          ) : (
            <div className="notice">
              <strong>Use the dedicated record editor.</strong>
              <span className="muted">Movement and exit records have dedicated editors for their full workflow.</span>
              <a data-navigation-mode="document" className="button button--primary button--compact" href={["movement","exit"].includes(editItem.item_type)?`${editItem.detail_href}${editItem.detail_href.includes("?")?"&":"?"}returnTo=${encodeURIComponent(currentQueueHref({editRecord:undefined,record:undefined}))}`:editItem.detail_href}>Open record editor</a>
            </div>
          )}
        </LifecycleEditorDialog>
      ) : null}
    </fieldset>
    </section>
  );
}
