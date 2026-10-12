"use client";

import Link from "next/link";
import { useState } from "react";

import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminScopedAssignment } from "@/lib/types";
import { LeavePolicyAssignmentActions } from "./leave-policy-assignment-actions";

type Props = {
  canManagePolicies: boolean;
  assignments: HrAdminScopedAssignment[];
};

export function LeavePolicyAssignmentsTable({ assignments, canManagePolicies }: Props) {
  const [selectedId, setSelectedId] = useState(assignments[0]?.id ?? "");
  const selected = assignments.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="employee-directory-layout">
      <div className="employee-directory-table-wrap">
        <table className="workspace-table attendance-directory-table">
          <thead>
            <tr>
              <th>Policy</th>
              <th>Scope</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Risk</th>
              <th>Action</th>
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
                <td><button className="button button--secondary" onClick={() => setSelectedId(item.id)} type="button">Inspect</button></td>
              </tr>
            ))}
            {assignments.length === 0 ? (
              <tr><td colSpan={6}>No leave assignments match these filters.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selected ? (
        <aside className="panel-card-soft attendance-detail-drawer" aria-label="Leave assignment detail">
          <div className="record-card__header">
            <div>
              <h2>{selected.policy_name}</h2>
              <p className="section-copy section-copy-soft">{selected.leave_type_name || "All leave types"} · Priority {selected.priority}</p>
            </div>
            <div className="record-card__actions">
              <button className="button button--secondary" onClick={() => setSelectedId("")} type="button">Close</button>
              {canManagePolicies ? <Link className="button button--secondary" href={`/hr-admin/leave-policy-assignments?editLeaveAssignment=${selected.id}`}>Edit</Link> : null}
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
          {canManagePolicies ? <LeavePolicyAssignmentActions assignmentId={selected.id} isActive={selected.is_active} policyName={selected.policy_name} /> : null}
        </aside>
      ) : null}
    </div>
  );
}
