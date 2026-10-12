"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PlatformGovernanceCard, PlatformGovernanceNotice } from "@/components/patterns/platform-governance-card";
import { WorkspaceFilterBar, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminLeaveType } from "@/lib/types";
import { LeaveTypeActions } from "./leave-type-actions";

type Props = {
  canManagePolicies: boolean;
  leaveTypes: HrAdminLeaveType[];
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function LeaveTypesWorkbench({ canManagePolicies, leaveTypes }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState(leaveTypes[0]?.id ?? "");

  const categories = useMemo(() => uniqueValues(leaveTypes.map((item) => item.category)), [leaveTypes]);
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

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setCategory("all");
  }

  return (
    <section className="section queue-layout">
      <div className="attendance-summary-strip" aria-label="Leave type summary">
        <span><strong>{leaveTypes.length}</strong> leave types</span>
        <span><strong>{leaveTypes.filter((item) => item.is_active).length}</strong> active</span>
        <span><strong>{leaveTypes.filter((item) => !item.is_active).length}</strong> inactive</span>
      </div>

      <div className="workspace-data-panel">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Leave type catalog</h2>
            <p className="section-copy section-copy-soft">Search categories and inspect setup details before editing.</p>
          </div>
          <span className="queue-summary-chip"><strong>{filteredItems.length}</strong> in this view</span>
        </div>
        <WorkspaceFilterBar>
          <label className="form-field">
            <span>Search</span>
            <input className="input-control" onChange={(event) => setQuery(event.target.value)} placeholder="Name, code, category" type="search" value={query} />
          </label>
          <label className="form-field">
            <span>Status</span>
            <select className="input-control" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="form-field">
            <span>Category</span>
            <select className="input-control" onChange={(event) => setCategory(event.target.value)} value={category}>
              <option value="all">All categories</option>
              {categories.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <div className="filter-actions">
            <button className="button button--primary" type="button">Apply filters</button>
            <button className="button button--secondary" onClick={resetFilters} type="button">Reset</button>
          </div>
        </WorkspaceFilterBar>

        <div className="employee-directory-layout">
          <div className="employee-directory-table-wrap">
            <table className="workspace-table attendance-directory-table">
              <thead>
                <tr>
                  <th>Leave type</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Status</th>
                  <th>Rules</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr className={selectedItem?.id === item.id ? "table-row--selected" : ""} key={item.id}>
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
                    <td><button className="button button--secondary" onClick={() => setSelectedId(item.id)} type="button">Inspect</button></td>
                  </tr>
                ))}
                {filteredItems.length === 0 ? (
                  <tr><td colSpan={6}>No leave types match these filters.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {selectedItem ? (
            <aside className="panel-card-soft attendance-detail-drawer" aria-label="Leave type detail">
              <div className="record-card__header">
                <div>
                  <h2>{selectedItem.name}</h2>
                  <p className="section-copy section-copy-soft">{selectedItem.code} · {selectedItem.category}</p>
                </div>
                <div className="record-card__actions">
                  <button className="button button--secondary" onClick={() => setSelectedId("")} type="button">Close</button>
                  {canManagePolicies ? <Link className="button button--secondary" href={`/hr-admin/leave-types?editLeaveType=${selectedItem.id}`}>Edit</Link> : null}
                </div>
              </div>
              <div className="record-card__eyebrow">
                <WorkspaceStatusBadge tone={selectedItem.is_active ? "success" : "neutral"}>{selectedItem.is_active ? "Active" : "Inactive"}</WorkspaceStatusBadge>
                <WorkspaceStatusBadge tone={selectedItem.is_approval_required ? "info" : "neutral"}>{selectedItem.is_approval_required ? "Approval required" : "No approval"}</WorkspaceStatusBadge>
                <PlatformGovernanceCard item={selectedItem} />
              </div>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Short code</span><span className="detail-value">{selectedItem.short_code}</span></div>
                <div className="detail-row"><span className="detail-label">Unit</span><span className="detail-value">{selectedItem.unit}</span></div>
                <div className="detail-row"><span className="detail-label">Attachment</span><span className="detail-value">{selectedItem.requires_attachment ? "Required" : "Not required"}</span></div>
                <div className="detail-row"><span className="detail-label">Negative balance</span><span className="detail-value">{selectedItem.allow_negative_balance ? "Allowed" : "Blocked"}</span></div>
                <div className="detail-row detail-row--full"><span className="detail-label">Description</span><span className="detail-value">{selectedItem.description || "No description"}</span></div>
              </div>
              <PlatformGovernanceNotice item={selectedItem} />
              {canManagePolicies ? <LeaveTypeActions isActive={selectedItem.is_active} leaveTypeId={selectedItem.id} leaveTypeName={selectedItem.name} /> : null}
            </aside>
          ) : null}
        </div>
      </div>
    </section>
  );
}
