"use client";

import { ActionFeedbackReceipt } from "@/components/patterns/action-feedback-receipt";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceFilterForm } from "@/components/patterns/workspace-filter-form";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { useEffect, useMemo, useRef, useState } from "react";

import { PlatformGovernanceCard, PlatformGovernanceNotice } from "@/components/patterns/platform-governance-card";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminLeaveType } from "@/lib/types";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";
import { LeaveTypeActions } from "./leave-type-actions";

type Props = {
  canManagePolicies: boolean;
  leaveTypes: HrAdminLeaveType[];
  pending?: boolean;
  onOpenCreate?: () => void;
  onOpenEdit?: (id: string) => void;
  onReconcile?: () => Promise<void> | void;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function allowedFilter(value: string | null, allowed: string[]) {
  return value && allowed.includes(value) ? value : "all";
}

export function LeaveTypesWorkbench({ canManagePolicies, leaveTypes, pending, onOpenCreate, onOpenEdit, onReconcile }: Props) {
  const initialFilters = useMemo(() => ({ q: "", status: "all", category: "all", sort: "name-asc" }), []);
  const [draft, setDraft] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [filterPending, setFilterPending] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const inspectTriggerRef = useRef<HTMLButtonElement | null>(null);

  const categories = useMemo(() => uniqueValues(leaveTypes.map((item) => item.category)), [leaveTypes]);
  const status = allowedFilter(applied.status, ["all", "active", "inactive"]);
  const category = allowedFilter(applied.category, ["all", ...categories]);
  const filteredItems = useMemo(() => {
    const search = normalize(applied.q);
    const items = leaveTypes.filter((item) => {
      const matchesSearch =
        !search ||
        [item.name, item.code, item.short_code, item.category, item.unit].some((value) => normalize(value).includes(search));
      const matchesStatus = status === "all" || (status === "active" ? item.is_active : !item.is_active);
      const matchesCategory = category === "all" || item.category === category;
      return matchesSearch && matchesStatus && matchesCategory;
    });
    return items.sort((left, right) => {
      if (applied.sort === "name-desc") return right.name.localeCompare(left.name) || left.id.localeCompare(right.id);
      if (applied.sort === "category") return left.category.localeCompare(right.category) || left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
      if (applied.sort === "status") return Number(right.is_active) - Number(left.is_active) || left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
      return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
    });
  }, [applied.q, applied.sort, category, leaveTypes, status]);

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedItem = leaveTypes.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      const next = {
        q: params.get("q") || "",
        status: allowedFilter(params.get("status"), ["all", "active", "inactive"]),
        category: params.get("category") || "all",
        sort: allowedFilter(params.get("sort"), ["name-asc", "name-desc", "category", "status"]),
      };
      setDraft(next);
      setApplied(next);
      setPage(1);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  function commitFilters(next: typeof applied) {
    setFilterPending(true);
    window.requestAnimationFrame(() => {
      setApplied(next);
      setPage(1);
      const url = new URL(window.location.href);
      for (const key of ["q", "status", "category", "sort"]) url.searchParams.delete(key);
      if (next.q.trim()) url.searchParams.set("q", next.q.trim());
      if (next.status !== "all") url.searchParams.set("status", next.status);
      if (next.category !== "all") url.searchParams.set("category", next.category);
      if (next.sort !== "name-asc") url.searchParams.set("sort", next.sort);
      window.history.pushState(window.history.state, "", `${url.pathname}${url.search}`);
      window.requestAnimationFrame(() => setFilterPending(false));
    });
  }

  function submitFilters(form: HTMLFormElement) {
    const data = new FormData(form);
    commitFilters({
      q: String(data.get("q") ?? ""),
      status: String(data.get("status") ?? "all"),
      category: String(data.get("category") ?? "all"),
      sort: String(data.get("sort") ?? "name-asc"),
    });
  }



  return (
    <section className="section queue-layout">
      <ActionFeedbackReceipt recordIds={leaveTypes.map(item => item.id)} />
      <div className="attendance-summary-strip" role="group" aria-label="Leave type summary">
        <span><strong>{leaveTypes.length}</strong> leave types</span>
        <span><strong>{leaveTypes.filter((item) => item.is_active).length}</strong> active</span>
        <span><strong>{leaveTypes.filter((item) => !item.is_active).length}</strong> inactive</span>
      </div>

      <section aria-label="Leave type filters" className="panel-card-soft attendance-queue-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Leave type catalog</h2>
            <p className="section-copy section-copy-soft">Search categories and inspect setup details before editing.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{filteredItems.length}</strong> in this view</span>
            <span className="queue-summary-chip"><strong>{selectedItem ? "1" : "0"}</strong> selected</span>
          </div>
        </div>
        <WorkspaceFilterForm action="/hr-admin/leave-types" label="Leave type filters" className="workspace-filter-form--three" pending={filterPending || pending} updateMode="scoped" onSubmit={(event) => { event.preventDefault(); submitFilters(event.currentTarget); }}>
          <label className="form-field">
            <span>Search</span>
            <input className="input-control" name="q" placeholder="Name, code, category" type="search" value={draft.q} onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))} />
          </label>
          <label className="form-field">
            <span>Status</span>
            <select className="input-control" name="status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="form-field">
            <span>Category</span>
            <select className="input-control" name="category" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
              <option value="all">All categories</option>
              {categories.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span>Sort by</span>
            <select className="input-control" name="sort" value={draft.sort} onChange={(event) => setDraft((current) => ({ ...current, sort: event.target.value }))}>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="category">Category</option>
              <option value="status">Status</option>
            </select>
          </label>
          <div className="workspace-filter-actions">
            <button className="button button--primary" type="submit">Apply filters</button>
            <button className="button button--secondary" onClick={() => { const reset = { q: "", status: "all", category: "all", sort: "name-asc" }; setDraft(reset); commitFilters(reset); }} type="button">Clear filters</button>
            {canManagePolicies && onOpenCreate ? <button className="button button--primary" disabled={pending} onClick={onOpenCreate} type="button">Create leave type</button> : null}
          </div>
        </WorkspaceFilterForm>
      </section>

      <div className="attendance-review-workbench">
        <section aria-busy={filterPending || pending || undefined} className="panel-card-soft attendance-directory-panel workspace-table-loading-owner">
          {filterPending || pending ? <div className="workspace-table-loading" role="status"><span aria-hidden="true" className="async-action-button__spinner" />Updating leave types</div> : null}
          <WorkspaceTableScrollRegion className="attendance-directory-table-wrap workspace-table-region" label="Leave types table scroll">
            <table aria-label="Leave types" className="accerio-data-table workspace-table attendance-directory-table">
              <thead>
                <tr>
                  <th scope="col">Leave type</th>
                  <th scope="col">Category</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Status</th>
                  <th scope="col">Rules</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <tr aria-selected={isSelected} className={isSelected ? "is-selected" : ""} key={item.id}>
                      <td>
                        <div className="workspace-table__primary-cell">
                          <strong>{item.name}</strong>
                          <span>{item.code} · {item.short_code}</span>
                        </div>
                      </td>
                      <td>{item.category}</td>
                      <td>{item.unit}</td>
                      <td><WorkspaceStatusBadge tone={item.is_active ? "success" : "neutral"}>{item.is_active ? "Active" : "Inactive"}</WorkspaceStatusBadge></td>
                      <td>
                        <span className="section-copy section-copy-soft">
                          {item.is_approval_required ? "Approval" : "No approval"} · {item.requires_attachment ? "Attachment" : "No attachment"}
                        </span>
                      </td>
                      <td>
                        <span className="inspect-action">
                          <button aria-describedby={`leave-type-inspect-tooltip-${item.id}`} aria-label="Inspect" title={`Inspect ${item.name}`} ref={(node) => { if (isSelected && node) inspectTriggerRef.current = node; }} className="button button--secondary button--compact button--icon" onClick={(event) => { focusActionTrigger(event); inspectTriggerRef.current = event.currentTarget; event.stopPropagation(); setSelectedId(item.id); }} type="button">...</button>
                          <span className="inspect-action__tooltip" id={`leave-type-inspect-tooltip-${item.id}`} role="tooltip">Inspect {item.name}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 ? (
                  <tr><td colSpan={6}><strong>No leave types match these filters.</strong><span>Clear filters to restore the catalog.</span></td></tr>
                ) : null}
              </tbody>
            </table>
          </WorkspaceTableScrollRegion>
        </section>
        {filteredItems.length > 0 ? <PaginationBar navigationMode="scoped" pending={filterPending || pending} page={currentPage} pageSize={pageSize} totalCount={filteredItems.length} hasPrevious={currentPage > 1} hasNext={currentPage < pageCount} onFirst={() => setPage(1)} onPrevious={() => setPage((value) => Math.max(1, value - 1))} onNext={() => setPage((value) => Math.min(pageCount, value + 1))} onLast={() => setPage(pageCount)} /> : null}
        {selectedItem ? (
          <HrAdminActionModal closeHref="/hr-admin/leave-types" description="Review configuration, governance, and linked-record actions without leaving the catalog." eyebrow="Leave type inspection" labelledBy="leave-type-detail-title" onClose={() => { setSelectedId(""); window.requestAnimationFrame(() => inspectTriggerRef.current?.focus({ preventScroll: true })); }} title="Leave type detail">
          <aside id="leave-setup-detail" tabIndex={-1} aria-label="Leave type detail">
            <div className="queue-toolbar__header">
              <div>
                <h2 className="section-heading-soft">Leave type detail</h2>
                <p className="section-copy section-copy-soft">Focused rules and governance state.</p>
              </div>
              <button className="button button--secondary button--compact" onClick={() => { setSelectedId(""); window.requestAnimationFrame(() => inspectTriggerRef.current?.focus({ preventScroll: true })); }} type="button">Close</button>
            </div>
            <article className="record-card record-card--compact">
              <div className="record-card__header">
                <div>
                  <h3>{selectedItem.name}</h3>
                  <p className="section-copy section-copy-soft">{selectedItem.code} · {selectedItem.short_code}</p>
                </div>
                <WorkspaceStatusBadge tone={selectedItem.is_active ? "success" : "neutral"}>{selectedItem.is_active ? "Active" : "Inactive"}</WorkspaceStatusBadge>
              </div>
              <div className="record-card__eyebrow">
                <WorkspaceStatusBadge tone={selectedItem.is_approval_required ? "info" : "neutral"}>{selectedItem.is_approval_required ? "Approval required" : "No approval"}</WorkspaceStatusBadge>
                <PlatformGovernanceCard item={selectedItem} />
              </div>
            </article>
            <div className="record-card__actions">
              {canManagePolicies && onOpenEdit ? <button className="button button--primary" disabled={pending} onClick={(event) => { focusActionTrigger(event); setSelectedId(""); onOpenEdit(selectedItem.id); }} type="button">Edit leave type</button> : null}
            </div>
            <details className="record-card" open>
              <summary>Identity</summary>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Short code</span><span className="detail-value">{selectedItem.short_code}</span></div>
                <div className="detail-row"><span className="detail-label">Category</span><span className="detail-value">{selectedItem.category}</span></div>
                <div className="detail-row"><span className="detail-label">Unit</span><span className="detail-value">{selectedItem.unit}</span></div>
              </div>
            </details>
            <details className="record-card" open>
              <summary>Rules</summary>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Approval</span><span className="detail-value">{selectedItem.is_approval_required ? "Required" : "Not required"}</span></div>
                <div className="detail-row"><span className="detail-label">Attachment</span><span className="detail-value">{selectedItem.requires_attachment ? "Required" : "Not required"}</span></div>
                <div className="detail-row"><span className="detail-label">Negative balance</span><span className="detail-value">{selectedItem.allow_negative_balance ? "Allowed" : "Blocked"}</span></div>
              </div>
            </details>
            <details className="record-card" open>
              <summary>Description</summary>
              <p className="section-copy section-copy-soft">{selectedItem.description || "No description provided."}</p>
            </details>
            <PlatformGovernanceNotice item={selectedItem} />
            {canManagePolicies ? <div className="record-card__actions"><LeaveTypeActions key={selectedItem.id} isActive={selectedItem.is_active} leaveTypeId={selectedItem.id} leaveTypeName={selectedItem.name} onChanged={onReconcile} /></div> : null}
          </aside>
          </HrAdminActionModal>
        ) : null}
      </div>
    </section>
  );
}
