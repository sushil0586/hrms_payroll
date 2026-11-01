"use client";

import { ActionFeedbackReceipt } from "@/components/patterns/action-feedback-receipt";

import { useState } from "react";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";

import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminScopedAssignment } from "@/lib/types";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";
import { LeavePolicyAssignmentActions } from "./leave-policy-assignment-actions";

type Props = {
  canManagePolicies: boolean;
  assignments: HrAdminScopedAssignment[];
  onChanged?: () => Promise<void>;
  onOpenEdit?: (id: string) => void;
};

export function LeavePolicyAssignmentsTable({ assignments, canManagePolicies, onChanged, onOpenEdit }: Props) {
  const [selectedId, setSelectedId] = useState(assignments[0]?.id ?? "");
  const selected = assignments.find((item) => item.id === selectedId) ?? null;

  return (
    <div className={`attendance-review-workbench${selected ? " attendance-review-workbench--with-detail" : ""}`}>
      <ActionFeedbackReceipt recordIds={assignments.map(item => item.id)} />
      <section className="panel-card-soft attendance-directory-panel">
        <WorkspaceTableScrollRegion className="attendance-directory-table-wrap workspace-table-region" label="Leave assignments table scroll">
          <table aria-label="Leave assignments" className="accerio-data-table workspace-table attendance-directory-table">
          <thead>
            <tr>
              <th scope="col">Policy</th>
              <th scope="col">Scope</th>
              <th scope="col">Priority</th>
              <th scope="col">Status</th>
              <th scope="col">Risk</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((item) => {
              const isSelected = selected?.id === item.id;
              return (
              <tr aria-selected={isSelected} className={isSelected ? "is-selected" : ""} key={item.id} onClick={() => setSelectedId(item.id)}>
                <td>
                  <div className="workspace-table__primary-cell">
                    <strong>{item.policy_name}</strong>
                    <span>{item.leave_type_name || "All leave types"}</span>
                  </div>
                </td>
                <td>{item.scope_labels?.length ? item.scope_labels.join(" · ") : "Global assignment"}</td>
                <td>{item.priority}</td>
                <td><WorkspaceStatusBadge tone={item.is_active ? "success" : "neutral"}>{item.is_active ? "Active" : "Inactive"}</WorkspaceStatusBadge></td>
                <td>
                  {(item.conflict_count ?? 0) > 0 ? (
                    <WorkspaceStatusBadge tone={item.has_blocking_conflict ? "danger" : "warning"}>
                      {item.has_blocking_conflict ? "Blocking overlap" : `${item.conflict_count} overlap${item.conflict_count === 1 ? "" : "s"}`}
                    </WorkspaceStatusBadge>
                  ) : (
                    <WorkspaceStatusBadge tone="success">Clear</WorkspaceStatusBadge>
                  )}
                </td>
                <td><button className="button button--secondary button--compact" onClick={(event) => { focusActionTrigger(event); event.stopPropagation(); setSelectedId(item.id); }} type="button">Inspect</button></td>
              </tr>
              );
            })}
            {assignments.length === 0 ? (
              <tr><td colSpan={6}><strong>No leave assignments match these filters.</strong><span>Clear filters or review whether policy assignments have been configured.</span></td></tr>
            ) : null}
          </tbody>
          </table>
        </WorkspaceTableScrollRegion>
      </section>

      {selected ? (
        <aside id="leave-assignment-detail" tabIndex={-1} className="panel-card-soft attendance-detail-drawer" aria-label="Leave assignment detail">
          <div className="queue-toolbar__header">
            <div>
              <h2 className="section-heading-soft">Leave assignment detail</h2>
              <p className="section-copy section-copy-soft">Focused scope, priority, and conflict state.</p>
            </div>
            <button className="button button--secondary button--compact" onClick={(event) => { focusActionTrigger(event); setSelectedId(""); }} type="button">Close</button>
          </div>
          <article className="record-card record-card--compact">
            <div className="record-card__header">
              <div>
                <h3>{selected.policy_name}</h3>
                <p className="section-copy section-copy-soft">{selected.leave_type_name || "All leave types"} · Priority {selected.priority}</p>
              </div>
              <WorkspaceStatusBadge tone={selected.is_active ? "success" : "neutral"}>{selected.is_active ? "Active" : "Inactive"}</WorkspaceStatusBadge>
            </div>
            <div className="record-card__eyebrow">
              {(selected.conflict_count ?? 0) > 0 ? (
                <WorkspaceStatusBadge tone={selected.has_blocking_conflict ? "danger" : "warning"}>
                  {selected.has_blocking_conflict ? "Blocking overlap" : "Overlap watch"}
                </WorkspaceStatusBadge>
              ) : <WorkspaceStatusBadge tone="success">Conflict clear</WorkspaceStatusBadge>}
            </div>
          </article>
          <div className="record-card__actions">
            {canManagePolicies && onOpenEdit ? <button className="button button--primary" onClick={() => onOpenEdit(selected.id)} type="button">Edit assignment</button> : null}
          </div>
          <details className="record-card" open>
            <summary>Effective period</summary>
            <div className="detail-grid">
              <div className="detail-row"><span className="detail-label">Effective from</span><span className="detail-value">{selected.effective_from || "Not recorded"}</span></div>
              <div className="detail-row"><span className="detail-label">Effective to</span><span className="detail-value">{selected.effective_to || "Open ended"}</span></div>
            </div>
          </details>
          <details className="record-card" open>
            <summary>Organization scope</summary>
            <div className="detail-grid">
              <div className="detail-row"><span className="detail-label">Legal entity</span><span className="detail-value">{selected.legal_entity || "Any entity"}</span></div>
              <div className="detail-row"><span className="detail-label">Branch</span><span className="detail-value">{selected.branch || "Any branch"}</span></div>
              <div className="detail-row"><span className="detail-label">Location</span><span className="detail-value">{selected.location || "Any location"}</span></div>
              <div className="detail-row"><span className="detail-label">Department</span><span className="detail-value">{selected.department || "Any department"}</span></div>
              <div className="detail-row"><span className="detail-label">Grade</span><span className="detail-value">{selected.grade || "Any grade"}</span></div>
              <div className="detail-row"><span className="detail-label">Employment type</span><span className="detail-value">{selected.employment_type || "Any type"}</span></div>
            </div>
          </details>
          <details className="record-card" open>
            <summary>Resolved assignment</summary>
            <div className="detail-grid">
              <div className="detail-row detail-row--full"><span className="detail-label">Employee override</span><span className="detail-value">{selected.employee || "No employee override"}</span></div>
              <div className="detail-row detail-row--full"><span className="detail-label">Resolved scope</span><span className="detail-value">{selected.scope_labels?.length ? selected.scope_labels.join(" · ") : "Global assignment"}</span></div>
            </div>
          </details>
          {selected.conflict_summary ? (
            <div className="notice">
              <strong>{selected.has_blocking_conflict ? "Action needed." : "Governance note."}</strong>
              <span className="muted">{selected.conflict_summary}</span>
            </div>
          ) : null}
          {canManagePolicies ? <LeavePolicyAssignmentActions onChanged={onChanged} key={selected.id} assignmentId={selected.id} isActive={selected.is_active} policyName={selected.policy_name} /> : null}
        </aside>
      ) : null}
    </div>
  );
}
