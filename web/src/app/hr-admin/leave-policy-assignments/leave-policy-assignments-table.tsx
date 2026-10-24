"use client";

import { ActionFeedbackReceipt } from "@/components/patterns/action-feedback-receipt";

import { useSearchParams } from "next/navigation";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";

import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminScopedAssignment } from "@/lib/types";
import { LeavePolicyAssignmentActions } from "./leave-policy-assignment-actions";

type Props = {
  canManagePolicies: boolean;
  assignments: HrAdminScopedAssignment[];
  onChanged?: () => Promise<void>;
};

export function LeavePolicyAssignmentsTable({ assignments, canManagePolicies, onChanged }: Props) {
  const params = useSearchParams();
  const selectedId = params.get("selected") ?? "";
  function href(updates: Record<string,string|undefined>) { const next=new URLSearchParams(params.toString()); for(const [key,value] of Object.entries(updates)){if(value)next.set(key,value);else next.delete(key);} return `/hr-admin/leave-policy-assignments${next.size ? `?${next}` : ""}`; }
  const selected = assignments.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="employee-directory-layout">
      <ActionFeedbackReceipt recordIds={assignments.map(item => item.id)} />
      <WorkspaceTableScrollRegion className="employee-directory-table-wrap workspace-table-region" label="Leave assignments table scroll">
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
            {assignments.map((item) => (
              <tr className={selected?.id === item.id ? "table-row--selected" : ""} key={item.id}>
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
                <td><a className="button button--secondary" data-navigation-mode="document" href={`${href({selected:item.id})}#leave-assignment-detail`}>Inspect</a></td>
              </tr>
            ))}
            {assignments.length === 0 ? (
              <tr><td colSpan={6}>No leave assignments match these filters.</td></tr>
            ) : null}
          </tbody>
        </table>
      </WorkspaceTableScrollRegion>

      {selected ? (
        <aside id="leave-assignment-detail" tabIndex={-1} className="panel-card-soft attendance-detail-drawer" aria-label="Leave assignment detail">
          <div className="record-card__header">
            <div>
              <h2>{selected.policy_name}</h2>
              <p className="section-copy section-copy-soft">{selected.leave_type_name || "All leave types"} · Priority {selected.priority}</p>
            </div>
            <div className="record-card__actions">
              <a className="button button--secondary" data-navigation-mode="document" href={href({selected:undefined})}>Close</a>
              {canManagePolicies ? <a data-navigation-mode="document" className="button button--secondary" href={href({editLeaveAssignment:selected.id})}>Edit</a> : null}
            </div>
          </div>
          <div className="record-card__eyebrow">
            <WorkspaceStatusBadge tone={selected.is_active ? "success" : "neutral"}>{selected.is_active ? "Active" : "Inactive"}</WorkspaceStatusBadge>
            {(selected.conflict_count ?? 0) > 0 ? (
              <WorkspaceStatusBadge tone={selected.has_blocking_conflict ? "danger" : "warning"}>
                {selected.has_blocking_conflict ? "Blocking overlap" : "Overlap watch"}
              </WorkspaceStatusBadge>
            ) : <WorkspaceStatusBadge tone="success">Clear</WorkspaceStatusBadge>}
          </div>
          <div className="detail-grid">
            <div className="detail-row"><span className="detail-label">Effective from</span><span className="detail-value">{selected.effective_from || "Not recorded"}</span></div>
            <div className="detail-row"><span className="detail-label">Effective to</span><span className="detail-value">{selected.effective_to || "Open ended"}</span></div>
            <div className="detail-row"><span className="detail-label">Legal entity</span><span className="detail-value">{selected.legal_entity || "Any entity"}</span></div>
            <div className="detail-row"><span className="detail-label">Branch</span><span className="detail-value">{selected.branch || "Any branch"}</span></div>
            <div className="detail-row"><span className="detail-label">Location</span><span className="detail-value">{selected.location || "Any location"}</span></div>
            <div className="detail-row"><span className="detail-label">Department</span><span className="detail-value">{selected.department || "Any department"}</span></div>
            <div className="detail-row"><span className="detail-label">Grade</span><span className="detail-value">{selected.grade || "Any grade"}</span></div>
            <div className="detail-row"><span className="detail-label">Employment type</span><span className="detail-value">{selected.employment_type || "Any type"}</span></div>
            <div className="detail-row detail-row--full"><span className="detail-label">Employee override</span><span className="detail-value">{selected.employee || "No employee override"}</span></div>
            <div className="detail-row detail-row--full"><span className="detail-label">Resolved scope</span><span className="detail-value">{selected.scope_labels?.length ? selected.scope_labels.join(" · ") : "Global assignment"}</span></div>
          </div>
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
