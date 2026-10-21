"use client";

import { useWorkspaceQueryFilter } from "@/components/patterns/use-workspace-query-filter";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { AttendancePolicyAssignmentForm } from "@/app/hr-admin/attendance-policy-assignments/attendance-policy-assignment-form";
import { attendancePolicyAssignmentToFormValue, createEmptyAttendancePolicyAssignmentValue } from "@/app/hr-admin/attendance-policy-assignments/form-values";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { WorkspaceFilterBar, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminPolicyWorkbenchOptions, HrAdminScopedAssignment } from "@/lib/types";

type AssignmentOptions = Pick<
  HrAdminPolicyWorkbenchOptions,
  "attendance_policies" | "legal_entities" | "branches" | "locations" | "departments" | "grades" | "employment_types"
>;

type Props = {
  items: HrAdminScopedAssignment[];
  state: "live" | "demo";
  options: AssignmentOptions;
  canManagePolicies: boolean;
};

function buildQueryString(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === false) return;
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function statusTone(item: HrAdminScopedAssignment): "success" | "warning" | "danger" | "neutral" | "info" {
  if (item.has_blocking_conflict) return "danger";
  if (item.conflict_count) return "warning";
  return item.is_active ? "success" : "neutral";
}

export function AttendancePolicyAssignmentsWorkbench({ items, state, options, canManagePolicies }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useWorkspaceQueryFilter("q", "");
  const [status, setStatus] = useWorkspaceQueryFilter("status", "all");
  const [scope, setScope] = useWorkspaceQueryFilter("scope", "all");
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? "");
  const modalMode = searchParams.get("assignmentModal") ?? "";
  const editAssignmentId = searchParams.get("editAssignment") ?? "";

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const scopeText = item.scope_labels?.join(" ") || "Tenant default scope";
      const matchesQuery = !normalizedQuery || [item.policy_name, item.employee ?? "", scopeText].join(" ").toLowerCase().includes(normalizedQuery);
      const matchesStatus = status === "all" || (status === "active" ? item.is_active : !item.is_active);
      const matchesScope =
        scope === "all" ||
        (scope === "employee" ? Boolean(item.employee_id) : scope === "org" ? !item.employee_id : Boolean(item.has_blocking_conflict || item.conflict_count));
      return matchesQuery && matchesStatus && matchesScope;
    });
  }, [items, query, status, scope]);

  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === selectedItemId) ?? null,
    [filteredItems, selectedItemId],
  );
  const activeCount = items.filter((item) => item.is_active).length;
  const conflictCount = items.filter((item) => item.has_blocking_conflict || item.conflict_count).length;
  const editItem = canManagePolicies && editAssignmentId ? items.find((item) => item.id === editAssignmentId) ?? null : null;

  function queueHref(overrides: Record<string, string | number | boolean | undefined> = {}) {
    return `${pathname}${buildQueryString(overrides)}`;
  }

  return (
    <section className="section queue-layout attendance-policy-assignments-workbench">
      <div className="attendance-summary-strip" aria-label="Attendance assignment summary">
        <span><strong>{items.length}</strong> assignments</span>
        <span><strong>{activeCount}</strong> active</span>
        <span><strong>{conflictCount}</strong> overlap review</span>
        <span><strong>{state}</strong> mode</span>
      </div>

      <section aria-label="Attendance assignment filters" className="panel-card-soft attendance-queue-toolbar" data-testid="attendance-policy-assignments-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Attendance assignment catalog</h2>
            <p className="section-copy section-copy-soft">Review scope, priority and overlap before policy rollout.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{filteredItems.length}</strong> in this view</span>
            <span className="queue-summary-chip"><strong>{selectedItem ? "1" : "0"}</strong> selected</span>
          </div>
        </div>
        <WorkspaceFilterBar className="attendance-record-filter-bar">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" onChange={(event) => setQuery(event.target.value)} placeholder="Policy, employee, scope" value={query} />
          </label>
          <label className="form-field">
            <span className="muted">Status</span>
            <select className="input-control" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Scope</span>
            <select className="input-control" onChange={(event) => setScope(event.target.value)} value={scope}>
              <option value="all">All scopes</option>
              <option value="org">Organization scope</option>
              <option value="employee">Employee override</option>
              <option value="conflict">Overlap review</option>
            </select>
          </label>
        </WorkspaceFilterBar>
        <div className="queue-toolbar__actions attendance-toolbar-actions">
          <button className="button button--ghost" onClick={() => {
            setQuery("");
            setStatus("all");
            setScope("all");
          }} type="button">Clear filters</button>
          {canManagePolicies ? <Link className="button button--primary" href={queueHref({ assignmentModal: "create" })}>Create attendance assignment</Link> : null}
        </div>
      </section>

      <div className={`attendance-review-workbench${selectedItem ? " attendance-review-workbench--with-detail" : ""}`}>
        <section className="panel-card-soft attendance-directory-panel">
          <WorkspaceTableScrollRegion label="Attendance policy assignments, scroll for more columns" className="attendance-directory-table-wrap workspace-table-region">
            <table className="workspace-data-table workspace-table attendance-directory-table">
              <thead>
                <tr>
                  <th scope="col">Assignment</th>
                  <th scope="col">Scope</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <tr aria-selected={isSelected} className={isSelected ? "is-selected" : ""} key={item.id} onClick={() => setSelectedItemId(item.id)}>
                      <td><strong>{item.policy_name}</strong><span>{item.employee || "Scoped assignment"}</span></td>
                      <td><strong>{item.scope_labels?.length ? item.scope_labels[0] : "Tenant default"}</strong><span>{item.scope_labels?.slice(1).join(" · ") || "Applies broadly"}</span></td>
                      <td><strong>{item.priority}</strong><span>{item.employee_id ? "Employee override" : "Organization scope"}</span></td>
                      <td><WorkspaceStatusBadge tone={statusTone(item)}>{item.has_blocking_conflict ? "Blocked" : item.conflict_count ? "Needs review" : item.is_active ? "Active" : "Inactive"}</WorkspaceStatusBadge><span>{item.conflict_summary || "No overlap summary"}</span></td>
                      <td><button className="button button--secondary button--compact" onClick={(event) => {
                        event.stopPropagation();
                        setSelectedItemId(item.id);
                      }} type="button">Inspect</button></td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5}><strong>No assignments match the current filters.</strong><span>Clear filters to restore the catalog.</span></td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </WorkspaceTableScrollRegion>
        </section>

        {selectedItem ? (
          <aside className="panel-card-soft attendance-detail-drawer" aria-label="Attendance assignment detail">
            <div className="queue-toolbar__header">
              <div>
                <h2 className="section-heading-soft">Assignment detail</h2>
                <p className="section-copy section-copy-soft">Focused scope and priority context.</p>
              </div>
              <button className="button button--secondary button--compact" onClick={() => setSelectedItemId("")} type="button">Close</button>
            </div>
            <article className="record-card record-card--compact">
              <div className="record-card__header">
                <div>
                  <h3>{selectedItem.policy_name}</h3>
                  <p className="section-copy section-copy-soft">{selectedItem.employee || "Organization assignment"} · Priority {selectedItem.priority}</p>
                </div>
                <WorkspaceStatusBadge tone={statusTone(selectedItem)}>{selectedItem.is_active ? "Active" : "Inactive"}</WorkspaceStatusBadge>
              </div>
            </article>
            <div className="record-card__actions">
              {canManagePolicies ? (
                <Link className="button button--primary" href={queueHref({ editAssignment: selectedItem.id })}>Edit assignment</Link>
              ) : (
                <button className="button button--secondary" disabled title="Requires attendance.policies.manage permission." type="button">Edit assignment</button>
              )}
            </div>
            <details className="record-card" open>
              <summary>Scope</summary>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Legal entity</span><span className="detail-value">{selectedItem.legal_entity || "Any entity"}</span></div>
                <div className="detail-row"><span className="detail-label">Branch</span><span className="detail-value">{selectedItem.branch || "Any branch"}</span></div>
                <div className="detail-row"><span className="detail-label">Location</span><span className="detail-value">{selectedItem.location || "Any location"}</span></div>
                <div className="detail-row"><span className="detail-label">Department</span><span className="detail-value">{selectedItem.department || "Any department"}</span></div>
                <div className="detail-row"><span className="detail-label">Employee</span><span className="detail-value">{selectedItem.employee || "No employee override"}</span></div>
              </div>
            </details>
            <details className="record-card" open>
              <summary>Governance</summary>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Priority</span><span className="detail-value">{selectedItem.priority}</span></div>
                <div className="detail-row"><span className="detail-label">Overlap review</span><span className="detail-value">{selectedItem.conflict_summary || (selectedItem.conflict_count ? `${selectedItem.conflict_count} overlaps detected` : "No overlap summary available.")}</span></div>
              </div>
            </details>
          </aside>
        ) : null}
      </div>

      {canManagePolicies && modalMode === "create" ? (
        <HrAdminActionModal
          className="attendance-policy-modal"
          closeHref={queueHref()}
          eyebrow="Attendance assignment"
          labelledBy="attendance-assignment-create-modal-title"
          title="Create attendance assignment"
          description="Map attendance policy behavior to a rollout scope."
          tabs={["Policy", "Scope", "State"]}
        >
          <AttendancePolicyAssignmentForm compact cancelHref={queueHref()} successHref={queueHref()} initialValue={createEmptyAttendancePolicyAssignmentValue()} mode="create" options={options} />
        </HrAdminActionModal>
      ) : null}

      {canManagePolicies && editItem ? (
        <HrAdminActionModal
          className="attendance-policy-modal"
          closeHref={queueHref()}
          eyebrow="Attendance assignment"
          labelledBy="attendance-assignment-edit-modal-title"
          title={`Edit ${editItem.policy_name}`}
          description="Adjust scope, priority and activation state."
          tabs={["Policy", "Scope", "State"]}
        >
          <AttendancePolicyAssignmentForm compact cancelHref={queueHref()} successHref={queueHref()} initialValue={attendancePolicyAssignmentToFormValue(editItem)} itemId={editItem.id} mode="edit" options={options} />
        </HrAdminActionModal>
      ) : null}
    </section>
  );
}
