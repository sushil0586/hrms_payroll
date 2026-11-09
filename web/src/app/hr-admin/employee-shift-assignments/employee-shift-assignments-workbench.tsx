"use client";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";


import { WorkspaceFilterForm } from "@/components/patterns/workspace-filter-form";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { AssignmentLifecycleAction } from "./assignment-lifecycle-action";
import { EmployeeShiftAssignmentForm } from "@/app/hr-admin/employee-shift-assignments/employee-shift-assignment-form";
import { createEmptyEmployeeShiftAssignmentValue, employeeShiftAssignmentToFormValue } from "@/app/hr-admin/employee-shift-assignments/form-values";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceFilterBar, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminEmployeeShiftAssignment, HrAdminPolicyWorkbenchOptions } from "@/lib/types";

type SearchParamValue = string | string[] | undefined;

type Props = {
  canManagePolicies: boolean;
  currentParams: Record<string, SearchParamValue>;
  editItem?: HrAdminEmployeeShiftAssignment | null;
  items: HrAdminEmployeeShiftAssignment[];
  options: Pick<HrAdminPolicyWorkbenchOptions, "shifts">;
  page: number;
  pageSize: number;
  state: "live" | "demo";
  totalCount: number;
  totalPages: number;
  pending?: boolean;
  modalMode?: "" | "create" | "edit";
  editAssignmentId?: string;
  onQueryChange?: (updates: Record<string, string>) => void;
  onOpenCreate?: () => void;
  onOpenEdit?: (id: string) => void;
  onCloseModal?: () => void;
  onReconcile?: (message: string) => Promise<boolean> | boolean;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === false) return;
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function buildHref(currentParams: Record<string, SearchParamValue>, updates: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(currentParams).forEach(([key, value]) => {
    const normalized = normalizeParam(value);
    if (normalized) params.set(key, normalized);
  });
  Object.entries(updates).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  const query = params.toString();
  return `/hr-admin/employee-shift-assignments${query ? `?${query}` : ""}`;
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function assignmentTone(item: HrAdminEmployeeShiftAssignment): "success" | "warning" | "danger" | "neutral" | "info" {
  if (item.has_blocking_conflict) return "danger";
  if ((item.conflict_count ?? 0) > 0) return "warning";
  if (item.assignment_kind === "temporary_override") return "info";
  return item.is_primary ? "success" : "neutral";
}

function riskLabel(item: HrAdminEmployeeShiftAssignment) {
  if (item.has_blocking_conflict) return "Blocking overlap";
  if ((item.conflict_count ?? 0) > 0) return "Needs review";
  return "Clear";
}

export function EmployeeShiftAssignmentsWorkbench({
  canManagePolicies,
  currentParams,
  editItem,
  items,
  options,
  page,
  pageSize,
  state,
  totalCount,
  totalPages,
  pending,
  modalMode,
  editAssignmentId,
  onQueryChange,
  onOpenCreate,
  onOpenEdit,
  onCloseModal,
  onReconcile,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? "");
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );
  const createModalOpen = modalMode !== undefined ? modalMode === "create" : searchParams.get("assignmentModal") === "create";
  const controlledEditItem = editAssignmentId ? items.find((item) => item.id === editAssignmentId) ?? null : null;
  const modalEditItem = canManagePolicies && (modalMode === "edit" || (modalMode === undefined && editItem)) ? controlledEditItem ?? editItem ?? null : null;
  const primaryCount = items.filter((item) => item.is_primary).length;
  const reviewCount = items.filter((item) => item.has_blocking_conflict || (item.conflict_count ?? 0) > 0).length;
  const uniqueEmployees = new Set(items.map((item) => item.employee_id)).size;

  function queueHref(overrides: Record<string, string | number | boolean | undefined> = {}) {
    const params: Record<string, string | number | boolean | undefined> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    delete params.assignmentModal;
    delete params.editAssignment;
    return `${pathname}${buildQueryString({ ...params, ...overrides })}`;
  }

  return (
    <section className="section queue-layout attendance-shift-assignments-workbench">
      <div className="attendance-summary-strip" aria-label="Shift assignment summary">
        <span><strong>{totalCount}</strong> assignments</span>
        <span><strong>{primaryCount}</strong> primary on page</span>
        <span><strong>{uniqueEmployees}</strong> employees on page</span>
        <span><strong>{reviewCount}</strong> need review</span>
        <span><strong>{state}</strong> mode</span>
      </div>

      <section aria-label="Shift assignment filters" className="panel-card-soft attendance-queue-toolbar" data-testid="employee-shift-assignments-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Shift assignment queue</h2>
            <p className="section-copy section-copy-soft">Filter employee coverage, inspect one assignment, and resolve overlap risk.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{items.length}</strong> on this page</span>
            <span className="queue-summary-chip"><strong>{selectedItem ? "1" : "0"}</strong> selected</span>
          </div>
        </div>
        <WorkspaceFilterForm key={JSON.stringify(currentParams)} action={pathname} label="Shift assignment filters" className="workspace-filter-form--block" pending={pending} updateMode={onQueryChange ? "scoped" : "document"} onSubmit={onQueryChange ? (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onQueryChange({ q: String(data.get("q") || ""), kind: String(data.get("kind") || "all"), risk: String(data.get("risk") || "all"), primary: String(data.get("primary") || "all"), page: "1", page_size: String(pageSize) }); } : undefined}>
          <WorkspaceFilterBar className="attendance-record-filter-bar">
            <label className="form-field">
              <span className="muted">Search</span>
              <input className="input-control" name="q" type="search" defaultValue={normalizeParam(currentParams.q) ?? ""} placeholder="Employee, code, shift, scope" />
            </label>
            <label className="form-field">
              <span className="muted">Mode</span>
              <select className="input-control" name="kind" defaultValue={normalizeParam(currentParams.kind) ?? "all"}>
                <option value="all">All modes</option>
                <option value="fixed">Fixed</option>
                <option value="weekly_rotation">Weekly rotation</option>
                <option value="temporary_override">Temporary override</option>
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Risk</span>
              <select className="input-control" name="risk" defaultValue={normalizeParam(currentParams.risk) ?? "all"}>
                <option value="all">All risk states</option>
                <option value="blocking">Blocking overlap</option>
                <option value="overlap">Any overlap</option>
                <option value="clear">Clear</option>
              </select>
            </label>
            <details className="attendance-more-filters">
              <summary className="button button--secondary">More filters</summary>
              <div className="attendance-more-filters__panel">
                <label className="form-field">
                  <span className="muted">Primary state</span>
                  <select className="input-control" name="primary" defaultValue={normalizeParam(currentParams.primary) ?? "all"}>
                    <option value="all">All</option>
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                  </select>
                </label>
              </div>
            </details>
          </WorkspaceFilterBar>
          <div className="queue-toolbar__actions attendance-toolbar-actions">
            <button className="button button--primary" type="submit">Apply filters</button>
            {onQueryChange ? <button className="button button--secondary" onClick={() => onQueryChange({ q: "", kind: "all", risk: "all", primary: "all", page: "1", page_size: String(pageSize) })} type="button">Clear filters</button> : <Link className="button button--secondary" href="/hr-admin/employee-shift-assignments">Clear filters</Link>}
            {canManagePolicies ? onOpenCreate ? <button className="button button--primary" disabled={pending} onClick={(triggerEvent) => {
              focusActionTrigger(triggerEvent);
              onOpenCreate();
            }} type="button">Create assignment</button> : <Link className="button button--primary" href={queueHref({ assignmentModal: "create" })}>Create assignment</Link> : null}
          </div>
        </WorkspaceFilterForm>
      </section>

      <div className={`attendance-review-workbench${selectedItem ? " attendance-review-workbench--with-detail" : ""}`}>
        <section className="panel-card-soft attendance-directory-panel">
          <WorkspaceTableScrollRegion label="Employee shift assignments, scroll for more columns" className="attendance-directory-table-wrap workspace-table-region"
            emptyState={items.length === 0 ? <><strong>No shift assignments match these filters.</strong><span className="muted">Clear filters or search by employee, shift, assignment mode, or risk state.</span></> : null}>
            <table className="workspace-data-table workspace-table attendance-directory-table">
              <thead>
                <tr>
                  <th scope="col">Employee</th>
                  <th scope="col">Shift</th>
                  <th scope="col">Mode</th>
                  <th scope="col">Window</th>
                  <th scope="col">Review</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <tr aria-selected={isSelected} className={isSelected ? "is-selected" : ""} key={item.id} onClick={() => setSelectedItemId(item.id)}>
                      <td><strong>{item.employee}</strong><span>{item.employee_code}</span></td>
                      <td><strong>{item.shift}</strong><span>{item.scope_labels?.length ? item.scope_labels.join(" · ") : "No scope summary"}</span></td>
                      <td><WorkspaceStatusBadge tone={item.assignment_kind === "temporary_override" ? "info" : "neutral"}>{formatLabel(item.assignment_kind)}</WorkspaceStatusBadge><span>{item.is_primary ? "Primary" : "Secondary"} · {item.lifecycle_state ?? ""}</span></td>
                      <td><strong>{item.effective_from}</strong><span>to {item.effective_to ?? "open ended"}</span></td>
                      <td><WorkspaceStatusBadge tone={assignmentTone(item)}>{riskLabel(item)}</WorkspaceStatusBadge><span>{item.conflict_summary || "No overlap summary"}</span></td>
                      <td><button data-assignment-inspect={item.id} className="button button--secondary button--compact" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent);
                        detailTriggerRef.current = triggerEvent.currentTarget;
                        triggerEvent.stopPropagation();
                        setSelectedItemId(item.id);
                       }} type="button">Inspect</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </WorkspaceTableScrollRegion>
          <div className="panel-card-soft attendance-pagination-panel">
            <PaginationBar
              navigationMode={onQueryChange ? "scoped" : undefined}
              pending={pending}
              onFirst={onQueryChange ? () => onQueryChange({ page: "1" }) : undefined}
              onPrevious={onQueryChange ? () => onQueryChange({ page: String(page - 1) }) : undefined}
              onNext={onQueryChange ? () => onQueryChange({ page: String(page + 1) }) : undefined}
              onLast={onQueryChange ? () => onQueryChange({ page: String(totalPages) }) : undefined}
              firstHref={buildHref(currentParams, { page: "1", page_size: String(pageSize) })}
              hasNext={page < totalPages}
              hasPrevious={page > 1}
              lastHref={buildHref(currentParams, { page: String(totalPages), page_size: String(pageSize) })}
              nextHref={buildHref(currentParams, { page: String(page + 1), page_size: String(pageSize) })}
              page={page}
              pageSize={pageSize}
              previousHref={buildHref(currentParams, { page: String(page - 1), page_size: String(pageSize) })}
              totalCount={totalCount}
            />
            <WorkspaceFilterForm key={`pagination-${JSON.stringify(currentParams)}`} action={pathname} label="Shift assignment pagination" className="attendance-pagination-panel__controls workspace-filter-form--inline" pending={pending} updateMode={onQueryChange ? "scoped" : "document"} onSubmit={onQueryChange ? (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onQueryChange({ page: "1", page_size: String(data.get("page_size") || pageSize) }); } : undefined}>
              {Object.entries(currentParams).map(([key, value]) => {
                const normalized = normalizeParam(value);
                if (!normalized || key === "page_size" || key === "page") return null;
                return <input key={key} name={key} type="hidden" value={normalized} />;
              })}
              <label className="form-field attendance-pagination-rows"><span className="muted">Rows</span><select className="input-control" name="page_size" defaultValue={String(pageSize)}><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label>
              <button className="button button--secondary" type="submit">Apply</button>
            </WorkspaceFilterForm>
          </div>
        </section>

        {selectedItem ? (
          <aside className="panel-card-soft attendance-detail-drawer" aria-label="Shift assignment detail">
            <div className="queue-toolbar__header">
              <div>
                <h2 className="section-heading-soft">Assignment detail</h2>
                <p className="section-copy section-copy-soft">Focused coverage, window, and overlap context.</p>
              </div>
              <button className="button button--secondary button--compact" onClick={() => {
                const trigger = detailTriggerRef.current;
                setSelectedItemId("");
                window.requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
              }} type="button">Close</button>
            </div>
            <article className="record-card record-card--compact">
              <div className="record-card__header">
                <div>
                  <h3>{selectedItem.employee}</h3>
                  <p className="section-copy section-copy-soft">{selectedItem.employee_code} · {selectedItem.shift}</p>
                </div>
                <WorkspaceStatusBadge tone={assignmentTone(selectedItem)}>{riskLabel(selectedItem)}</WorkspaceStatusBadge>
              </div>
              <div className="record-card__eyebrow">
                <WorkspaceStatusBadge tone={selectedItem.is_primary ? "success" : "neutral"}>{selectedItem.is_primary ? "Primary" : "Secondary"}</WorkspaceStatusBadge>
                <WorkspaceStatusBadge tone={selectedItem.assignment_kind === "temporary_override" ? "info" : "neutral"}>{formatLabel(selectedItem.assignment_kind)}</WorkspaceStatusBadge>
              </div>
            </article>
            <div className="record-card__actions">
              {canManagePolicies && selectedItem.lifecycle_state === "future" ? (
                onOpenEdit ? <button className="button button--primary" disabled={pending} onClick={(triggerEvent) => {
                  focusActionTrigger(triggerEvent);
                  onOpenEdit(selectedItem.id);
                }} type="button">Edit assignment</button> : <Link className="button button--primary" href={queueHref({ editAssignment: selectedItem.id })}>Edit assignment</Link>
              ) : (
                <button className="button button--secondary" disabled title={canManagePolicies ? "Active and historical coverage is preserved; use the eligible lifecycle action." : "Requires attendance.policies.manage permission."} type="button">Edit assignment</button>
              )}
              {canManagePolicies ? <AssignmentLifecycleAction key={`${selectedItem.id}-${selectedItem.updated_at}`} item={selectedItem} onSaved={onReconcile} /> : null}
            </div>
            <details className="record-card" open>
              <summary>Coverage</summary>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Employee</span><span className="detail-value">{selectedItem.employee} ({selectedItem.employee_code})</span></div>
                <div className="detail-row"><span className="detail-label">Shift</span><span className="detail-value">{selectedItem.shift}</span></div>
                <div className="detail-row"><span className="detail-label">Window</span><span className="detail-value">{selectedItem.effective_from} to {selectedItem.effective_to ?? "open ended"}</span></div>
                <div className="detail-row"><span className="detail-label">Scope</span><span className="detail-value">{selectedItem.scope_labels?.length ? selectedItem.scope_labels.join(" · ") : "No scope summary"}</span></div>
              </div>
            </details>
            <details className="record-card" open>
              <summary>Overlap review</summary>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Conflict count</span><span className="detail-value">{selectedItem.conflict_count ?? 0}</span></div>
                <div className="detail-row"><span className="detail-label">Blocking</span><span className="detail-value">{selectedItem.has_blocking_conflict ? "Yes" : "No"}</span></div>
                <div className="detail-row"><span className="detail-label">Summary</span><span className="detail-value">{selectedItem.conflict_summary || "No overlap summary available."}</span></div>
              </div>
            </details>
          </aside>
        ) : null}
      </div>

      {canManagePolicies && createModalOpen ? (
        <HrAdminActionModal
          className="attendance-policy-modal"
          closeHref={queueHref()}
          eyebrow="Shift assignment"
          labelledBy="shift-assignment-create-modal-title"
          title="Create shift assignment"
          description="Assign an employee to fixed, rotating, or temporary shift coverage."
          tabs={["Coverage", "Behavior", "Overlap"]}
          busy={pending}
          onClose={onCloseModal}
        >
          <EmployeeShiftAssignmentForm compact cancelHref={queueHref()} successHref={queueHref()} initialValue={createEmptyEmployeeShiftAssignmentValue()} mode="create" options={options} onCancel={onCloseModal} onSaved={onReconcile} />
        </HrAdminActionModal>
      ) : null}

      {modalEditItem && modalEditItem.lifecycle_state === "future" ? (
        <HrAdminActionModal
          className="attendance-policy-modal"
          closeHref={queueHref()}
          eyebrow="Shift assignment"
          labelledBy="shift-assignment-edit-modal-title"
          title={`Edit ${modalEditItem.employee}`}
          description="Update shift coverage timing, precedence, and overlap handling."
          tabs={["Coverage", "Behavior", "Overlap"]}
          busy={pending}
          onClose={onCloseModal}
        >
          <EmployeeShiftAssignmentForm
            compact
            cancelHref={queueHref()}
            successHref={queueHref()}
            initialEmployeeLabel={`${modalEditItem.employee_code} - ${modalEditItem.employee}`}
            initialValue={employeeShiftAssignmentToFormValue(modalEditItem)}
            itemId={modalEditItem.id}
            mode="edit"
            options={options}
            onCancel={onCloseModal}
            onSaved={onReconcile}
          />
        </HrAdminActionModal>
      ) : null}
    </section>
  );
}
