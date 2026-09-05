"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { PaginationBar } from "@/components/patterns/pagination-bar";
import type { HrAdminEnumOption, HrAdminLifecycleEmployeeOption, HrAdminLifecycleOwnerBulkActionInput, HrAdminLifecycleOwnerOption, HrAdminLifecycleQueueItem, HrAdminLifecycleStatusBulkActionInput } from "@/lib/types";

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
};

const BULK_ASSIGNABLE_TYPES = new Set(["onboarding", "probation", "movement"]);

function getDocumentAttentionChipClass(state: string) {
  if (state === "blocked") return "record-chip record-chip--danger";
  if (state === "warning" || state === "upcoming") return "record-chip record-chip--accent";
  return "record-chip";
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
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState(currentFilters.q);
  const [itemType, setItemType] = useState(currentFilters.item_type || "all");
  const [status, setStatus] = useState(currentFilters.status || "all");
  const [employeeId, setEmployeeId] = useState(currentFilters.employee_id || "all");
  const [owner, setOwner] = useState(currentFilters.owner || "all");
  const [primaryDateFrom, setPrimaryDateFrom] = useState(currentFilters.primary_date_from);
  const [primaryDateTo, setPrimaryDateTo] = useState(currentFilters.primary_date_to);
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));
  const [bulkOwner, setBulkOwner] = useState(currentFilters.owner || "");
  const [bulkStatus, setBulkStatus] = useState("");

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
  const bulkStatusBlockedItems =
    statusBulkType === "probation" && bulkStatus === "extend"
      ? selectedStatusItems.filter((item) => item.bulk_status_warning)
      : statusBulkType === "onboarding" && bulkStatus === "completed"
        ? selectedStatusItems.filter((item) => item.bulk_status_warning)
        : [];

  function goToPage(page: number) {
    router.push(`${pathname}${buildQueryString({
      q: search.trim() || undefined,
      item_type: itemType !== "all" ? itemType : undefined,
      status: status !== "all" ? status : undefined,
      employee_id: employeeId !== "all" ? employeeId : undefined,
      owner: owner !== "all" ? owner : undefined,
      primary_date_from: primaryDateFrom || undefined,
      primary_date_to: primaryDateTo || undefined,
      page,
      page_size: Number(pageSize) || currentFilters.page_size,
    })}`);
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
    setIsSubmitting(true);
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
        const response = await fetch("/api/hr-admin/lifecycle-owner-bulk-actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(getErrorMessage(payload));
        }
      }
      setSelectedKeys([]);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update lifecycle owners.");
    } finally {
      setIsSubmitting(false);
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
    setIsSubmitting(true);
    const body: HrAdminLifecycleStatusBulkActionInput = {
      record_type: statusBulkType,
      record_ids: selectedIds,
      status_value: nextStatusValue,
    };
    try {
      const response = await fetch("/api/hr-admin/lifecycle-status-bulk-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(payload));
      }
      setSelectedKeys([]);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update lifecycle statuses.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="section queue-layout">
      <section className="queue-toolbar panel-card-soft">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Lifecycle inbox</h2>
            <p className="section-copy section-copy-soft">Filter by type, owner, employee, or date.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{pagination.total_count}</strong> total records</span>
            <span className="queue-summary-chip"><strong>{items.length}</strong> on this page</span>
            <span className="queue-summary-chip"><strong>{selectedKeys.length}</strong> selected</span>
          </div>
        </div>
        <div className="queue-toolbar__grid">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" onChange={(event) => setSearch(event.target.value)} placeholder="Employee, owner, workflow, notes" value={search} />
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
            <span className="muted">Status</span>
            <select className="input-control" disabled={itemType === "all"} onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="all">{itemType === "all" ? "Choose a type first" : "All statuses"}</option>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Employee</span>
            <select className="input-control" onChange={(event) => setEmployeeId(event.target.value)} value={employeeId}>
              <option value="all">All employees</option>
              {employees.map((option) => <option key={option.id} value={option.id}>{option.name} ({option.employee_code})</option>)}
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
            <span className="muted">Primary date from</span>
            <input className="input-control" onChange={(event) => setPrimaryDateFrom(event.target.value)} type="date" value={primaryDateFrom} />
          </label>
          <label className="form-field">
            <span className="muted">Primary date to</span>
            <input className="input-control" onChange={(event) => setPrimaryDateTo(event.target.value)} type="date" value={primaryDateTo} />
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
            setSelectedKeys([]);
            setError("");
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
            router.push(pathname);
          }} type="button">Clear filters</button>
          <button className="button button--secondary" disabled={assignableItems.length === 0} onClick={toggleAssignablePage} type="button">
            {allAssignableSelected ? "Clear selection" : "Select page"}
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
          <label className="form-field">
            <span className="muted">Bulk status</span>
            <select className="input-control" disabled={!statusBulkType} onChange={(event) => setBulkStatus(event.target.value)} value={bulkStatus}>
              <option value="">{statusBulkType ? "Choose a status" : "Choose a single lifecycle type first"}</option>
              {statusBulkOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <div className="form-field" style={{ alignSelf: "end" }}>
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
        <p className="muted" style={{ margin: 0 }}>
          Owner updates work for onboarding, probation, and movement items. Exits remain review-only here.
        </p>
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
        <p className="muted" style={{ margin: 0 }}>
          Bulk status updates require one lifecycle type at a time.
        </p>
        <div className="queue-toolbar__summary">
          <span className="queue-summary-chip"><strong>Page {pagination.page}</strong> shared state</span>
          <span className="queue-summary-chip"><strong>{selectedKeys.length}</strong> selected</span>
        </div>
        {error ? <div className="notice"><strong>Lifecycle bulk action failed.</strong><span className="muted">{error}</span></div> : null}
      </section>

      <div className="queue-list">
        {items.map((item) => {
          const itemKey = getItemKey(item);
          const isAssignable = BULK_ASSIGNABLE_TYPES.has(item.item_type);
          const isSelected = selectedKeys.includes(itemKey);
          return (
          <article className="record-card panel-card-soft" key={`${item.item_type}-${item.id}`}>
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <label className="record-card__title">
                  <input checked={isSelected} disabled={!isAssignable} onChange={() => toggleOne(item)} type="checkbox" />
                  <h2>{item.employee_name} ({item.employee_code})</h2>
                </label>
                <div className="record-card__eyebrow">
                  <span className="record-chip record-chip--accent">{item.item_label}</span>
                  <span className="record-chip">{item.status_label}</span>
                  <span className={getDocumentAttentionChipClass(item.document_attention_state)}>
                    {item.document_attention_state === "blocked"
                      ? "Doc blocker"
                      : item.document_attention_state === "warning"
                        ? "Docs expiring"
                        : item.document_attention_state === "upcoming"
                          ? "Docs upcoming"
                          : "Docs clear"}
                  </span>
                  <span className="record-chip">{item.primary_date_label}: {item.primary_date || "Not set"}</span>
                </div>
                <p className="section-copy section-copy-soft">{item.summary || `${item.item_label} routed through ${item.workflow_reference || "an unlinked workflow"}.`}</p>
              </div>
              <div className="record-card__actions">
                <Link className="button button--secondary" href={item.detail_href}>Open record</Link>
              </div>
            </div>
            <div className="detail-grid">
              <div className="detail-row"><span className="detail-label">Type</span><span className="detail-value">{item.item_label}</span></div>
              <div className="detail-row"><span className="detail-label">Status</span><span className="detail-value">{item.status_label}</span></div>
              <div className="detail-row"><span className="detail-label">{item.primary_date_label}</span><span className="detail-value">{item.primary_date || "Not set"}</span></div>
              <div className="detail-row"><span className="detail-label">{item.secondary_date_label || "Secondary date"}</span><span className="detail-value">{item.secondary_date || "Not set"}</span></div>
              <div className="detail-row"><span className="detail-label">Owner</span><span className="detail-value">{item.owner_label || "Unassigned"}</span></div>
              <div className="detail-row"><span className="detail-label">Workflow</span><span className="detail-value">{item.workflow_reference || "Not linked"}</span></div>
              <div className="detail-row"><span className="detail-label">Lifecycle attention</span><span className="detail-value">{item.attention_summary || "No active lifecycle pressure."}</span></div>
              <div className="detail-row"><span className="detail-label">Document attention</span><span className="detail-value">{item.document_attention_summary}</span></div>
              <div className="detail-row"><span className="detail-label">Missing required</span><span className="detail-value">{item.missing_required_document_count}</span></div>
              <div className="detail-row"><span className="detail-label">Expired docs</span><span className="detail-value">{item.expired_document_count}</span></div>
              <div className="detail-row"><span className="detail-label">Upcoming required</span><span className="detail-value">{item.future_due_document_count}</span></div>
              <div className="detail-row"><span className="detail-label">Expiring soon</span><span className="detail-value">{item.expiring_document_count}</span></div>
            </div>
            <div className="record-card__notes">
              {item.document_attention_state !== "clear" ? (
                <div className="notice">
                  <strong>Document attention needed.</strong>
                  <span className="muted">{item.document_attention_summary}</span>
                </div>
              ) : null}
              {item.bulk_status_warning ? <p className="muted" style={{ margin: 0 }}>{item.bulk_status_warning}</p> : null}
              {!isAssignable ? <p className="muted" style={{ margin: 0 }}>Bulk owner changes are not available for exit records.</p> : null}
            </div>
          </article>
        );
        })}
        {items.length === 0 ? (
          <div className="card panel">
            <strong>No lifecycle records match the current filters.</strong>
            <p className="muted">Try clearing one or more filters to widen the review queue.</p>
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
