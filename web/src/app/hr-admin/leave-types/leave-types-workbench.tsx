"use client";

import { ActionFeedbackReceipt } from "@/components/patterns/action-feedback-receipt";

import { useWorkspaceQueryFilter } from "@/components/patterns/use-workspace-query-filter";
import { WorkspaceFilterForm } from "@/components/patterns/workspace-filter-form";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { useMemo, useState } from "react";

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
  const [query, setQuery] = useWorkspaceQueryFilter("q", "");
  const [rawStatus, setStatus] = useWorkspaceQueryFilter("status", "all");
  const [selectedId, setSelectedId] = useState(leaveTypes[0]?.id ?? "");
  const status = allowedFilter(rawStatus, ["all", "active", "inactive"]);

  const categories = useMemo(() => uniqueValues(leaveTypes.map((item) => item.category)), [leaveTypes]);
  const [rawCategory, setCategory] = useWorkspaceQueryFilter("category", "all");
  const category = allowedFilter(rawCategory, ["all", ...categories]);
  const filteredItems = useMemo(() => {
    const search = normalize(query);
    return leaveTypes.filter((item) => {
      const matchesSearch =
        !search ||
        [item.name, item.code, item.short_code, item.category, item.unit].some((value) => normalize(value).includes(search));
      const matchesStatus = status === "all" || (status === "active" ? item.is_active : !item.is_active);
      const matchesCategory = category === "all" || item.category === category;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [category, leaveTypes, query, status]);

  const selectedItem = filteredItems.find((item) => item.id === selectedId) ?? null;



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
        <WorkspaceFilterForm action="/hr-admin/leave-types" label="Leave type filters" className="workspace-filter-form--three" updateMode="scoped" onSubmit={(event) => event.preventDefault()}>
          <label className="form-field">
            <span>Search</span>
            <input className="input-control" name="q" placeholder="Name, code, category" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className="form-field">
            <span>Status</span>
            <select className="input-control" name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="form-field">
            <span>Category</span>
            <select className="input-control" name="category" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <div className="workspace-filter-actions">
            <button className="button button--secondary" onClick={() => { setQuery(""); setStatus("all"); setCategory("all"); }} type="button">Clear filters</button>
            {canManagePolicies && onOpenCreate ? <button className="button button--primary" disabled={pending} onClick={onOpenCreate} type="button">Create leave type</button> : null}
          </div>
        </WorkspaceFilterForm>
      </section>

      <div className={`attendance-review-workbench${selectedItem ? " attendance-review-workbench--with-detail" : ""}`}>
        <section className="panel-card-soft attendance-directory-panel">
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
                {filteredItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <tr aria-selected={isSelected} className={isSelected ? "is-selected" : ""} key={item.id} onClick={() => setSelectedId(item.id)}>
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
                      <td><button className="button button--secondary button--compact" onClick={(event) => { focusActionTrigger(event); event.stopPropagation(); setSelectedId(item.id); }} type="button">Inspect</button></td>
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

        {selectedItem ? (
          <aside id="leave-setup-detail" tabIndex={-1} className="panel-card-soft attendance-detail-drawer" aria-label="Leave type detail">
            <div className="queue-toolbar__header">
              <div>
                <h2 className="section-heading-soft">Leave type detail</h2>
                <p className="section-copy section-copy-soft">Focused rules and governance state.</p>
              </div>
              <button className="button button--secondary button--compact" onClick={(event) => { focusActionTrigger(event); setSelectedId(""); }} type="button">Close</button>
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
              {canManagePolicies && onOpenEdit ? <button className="button button--primary" disabled={pending} onClick={() => onOpenEdit(selectedItem.id)} type="button">Edit leave type</button> : null}
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
        ) : null}
      </div>
    </section>
  );
}
