"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { PaginationBar } from "@/components/patterns/pagination-bar";
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
    <section className="section queue-layout">
      <section className="queue-toolbar panel-card-soft">
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
              {lifecycleStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <div className="form-field" style={{ alignSelf: "end" }}>
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
        {error ? <div className="notice"><strong>Bulk movement action failed.</strong><span className="muted">{error}</span></div> : null}
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
                  <span className="record-chip record-chip--accent">{item.movement_type}</span>
                  <span className="record-chip">{item.status}</span>
                  <span className="record-chip">Effective {item.effective_date}</span>
                </div>
                <p className="section-copy section-copy-soft">{item.workflow_reference || "Workflow not linked"} • Owner {item.owner_value || item.to_manager || "unassigned"}</p>
              </div>
              <div className="record-card__actions">
                <Link className="button button--secondary" href={`/hr-admin/movements/${item.id}/edit`}>Edit</Link>
              </div>
            </div>
            <div className="detail-grid">
              <div className="detail-row"><span className="detail-label">Status</span><span className="detail-value">{item.status}</span></div>
              <div className="detail-row"><span className="detail-label">From department</span><span className="detail-value">{item.from_department || "NA"}</span></div>
              <div className="detail-row"><span className="detail-label">To department</span><span className="detail-value">{item.to_department || "NA"}</span></div>
              <div className="detail-row"><span className="detail-label">To designation</span><span className="detail-value">{item.to_designation || "NA"}</span></div>
            </div>
          </article>
        );
        })}
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
