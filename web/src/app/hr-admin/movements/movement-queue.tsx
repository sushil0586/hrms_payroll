"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceDataTable, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminEnumOption, HrAdminLifecycleOwnerBulkActionInput, HrAdminLifecycleOwnerOption, HrAdminLifecycleStatusBulkActionInput, HrAdminMovement } from "@/lib/types";

type Props = {
  items: HrAdminMovement[];
  state: "live" | "demo";
  lifecycleStatusOptions: HrAdminEnumOption[];
  movementTypeOptions: HrAdminEnumOption[];
  lifecycleOwners: HrAdminLifecycleOwnerOption[];
  currentFilters: {
    q: string;
    status: string;
    movement_type: string;
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
  if (!payload || typeof payload !== "object") return "Unable to update movement owners.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to update movement owners.");
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

export function MovementQueue({ items, state, lifecycleStatusOptions, movementTypeOptions, lifecycleOwners, currentFilters, pagination }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState(currentFilters.q);
  const [status, setStatus] = useState(currentFilters.status || "all");
  const [movementType, setMovementType] = useState(currentFilters.movement_type || "all");
  const [owner, setOwner] = useState(currentFilters.owner || "all");
  const [pageSize, setPageSize] = useState(String(currentFilters.page_size));
  const [bulkOwner, setBulkOwner] = useState(currentFilters.owner || "");
  const [bulkStatus, setBulkStatus] = useState(lifecycleStatusOptions[0]?.value ?? "draft");

  const allSelected = items.length > 0 && selectedIds.length === items.length;

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
      movement_type: movementType !== "all" ? movementType : undefined,
      owner: owner !== "all" ? owner : undefined,
      page,
      page_size: Number(pageSize) || currentFilters.page_size,
    })}`);
  }

  function queueHref(params: Record<string, string | number | boolean | undefined>) {
    return `${pathname}${buildQueryString({
      q: search.trim() || undefined,
      status: status !== "all" ? status : undefined,
      movement_type: movementType !== "all" ? movementType : undefined,
      owner: owner !== "all" ? owner : undefined,
      page: pagination.page,
      page_size: Number(pageSize) || currentFilters.page_size,
      ...params,
    })}`;
  }

  function statusTone(value: string) {
    if (value === "completed" || value === "approved") return "success";
    if (value === "blocked" || value === "cancelled") return "danger";
    if (value === "in_progress" || value === "pending") return "info";
    return "neutral";
  }

  async function handleBulkOwnerAction(nextOwnerValue: string) {
    if (state !== "live") {
      setError("Bulk owner updates are disabled in demo mode.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    const body: HrAdminLifecycleOwnerBulkActionInput = {
      record_type: "movement",
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
      record_type: "movement",
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
    <section className="section queue-layout lifecycle-queue-layout">
      <section className="queue-toolbar panel-card-soft lifecycle-queue-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Movements</h2>
            <p className="section-copy section-copy-soft">Filter structural changes by status, type, or owner.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{pagination.total_count}</strong> total movements</span>
            <span className="queue-summary-chip"><strong>{items.length}</strong> on this page</span>
            <span className="queue-summary-chip"><strong>{selectedIds.length}</strong> selected</span>
          </div>
        </div>
        <div className="queue-toolbar__grid">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" onChange={(event) => setSearch(event.target.value)} placeholder="Employee, movement, department, designation, workflow" value={search} />
          </label>
          <label className="form-field">
            <span className="muted">Status</span>
            <select className="input-control" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="all">All statuses</option>
              {lifecycleStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Movement type</span>
            <select className="input-control" onChange={(event) => setMovementType(event.target.value)} value={movementType}>
              <option value="all">All movement types</option>
              {movementTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Owner</span>
            <select className="input-control" onChange={(event) => setOwner(event.target.value)} value={owner}>
              <option value="all">All owners</option>
              {lifecycleOwners.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
            setMovementType("all");
            setOwner("all");
            setPageSize("25");
            setBulkOwner("");
            setBulkStatus(lifecycleStatusOptions[0]?.value ?? "draft");
            router.push(pathname);
          }} type="button">Clear filters</button>
          <button className="button button--secondary" disabled={items.length === 0} onClick={toggleAll} type="button">
            {allSelected ? "Clear selection" : "Select page"}
          </button>
        </div>
        <div className="queue-toolbar__bulk-grid lifecycle-bulk-grid">
          <div className="queue-toolbar__bulk-group">
            <label className="form-field">
            <span className="muted">Bulk owner</span>
            <select className="input-control" onChange={(event) => setBulkOwner(event.target.value)} value={bulkOwner}>
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
              <span className="muted">Bulk status</span>
              <select className="input-control" onChange={(event) => setBulkStatus(event.target.value)} value={bulkStatus}>
                {lifecycleStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <div className="queue-toolbar__actions">
              <button
                className="button button--secondary"
                disabled={isSubmitting || selectedIds.length === 0}
                onClick={() => handleBulkStatusAction(bulkStatus)}
                type="button"
              >
                Set status ({selectedIds.length || 0})
              </button>
            </div>
          </div>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Use page selection to rebalance destination managers quickly.
        </p>
        <div className="queue-toolbar__summary">
          <span className="queue-summary-chip"><strong>Page {pagination.page}</strong> shared state</span>
          <span className="queue-summary-chip"><strong>{selectedIds.length}</strong> selected</span>
        </div>
        {error ? <div className="notice notice--error" role="alert"><strong>Bulk movement action failed.</strong><span className="muted">{error}</span></div> : null}
      </section>

      <WorkspaceDataTable ariaLabel="Movement records" className="lifecycle-table">
        <thead>
          <tr>
            <th><input aria-label="Select all movement records on this page" checked={allSelected} onChange={toggleAll} type="checkbox" /></th>
            <th>Employee</th>
            <th>Movement</th>
            <th>Status</th>
            <th>From</th>
            <th>To</th>
            <th>Owner</th>
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
              <td><strong>{item.movement_type}</strong><span>Effective {item.effective_date}</span></td>
              <td><WorkspaceStatusBadge tone={statusTone(item.status)}>{item.status}</WorkspaceStatusBadge></td>
              <td><strong>{item.from_department || "NA"}</strong><span>{item.from_designation || item.from_location || "Source unchanged"}</span></td>
              <td><strong>{item.to_department || "NA"}</strong><span>{item.to_designation || item.to_location || "Destination pending"}</span></td>
              <td><strong>{item.owner_value || item.to_manager || "Unassigned"}</strong><span>{item.to_manager || "No manager change"}</span></td>
              <td><Link className="button button--secondary" href={queueHref({ editMovement: item.id })}>Edit</Link></td>
            </tr>
          );
        })}
        </tbody>
      </WorkspaceDataTable>
      <div className="lifecycle-pagination-row">
        <label className="form-field form-field--inline">
          <span className="muted">Rows</span>
          <select className="input-control" onChange={(event) => setPageSize(event.target.value)} value={pageSize}>
            {[10, 25, 50, 100].map((value) => <option key={value} value={String(value)}>{value}</option>)}
          </select>
        </label>
        {items.length === 0 ? (
          <div className="card panel">
            <strong>No movement records match the current filters.</strong>
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
