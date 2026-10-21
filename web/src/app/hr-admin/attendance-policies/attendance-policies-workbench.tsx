"use client";

import { useWorkspaceQueryFilter } from "@/components/patterns/use-workspace-query-filter";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { AttendancePolicyForm } from "@/app/hr-admin/attendance-policies/attendance-policy-form";
import { attendancePolicyToFormValue, createEmptyAttendancePolicyValue } from "@/app/hr-admin/attendance-policies/form-values";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PlatformGovernanceCard, PlatformGovernanceNotice } from "@/components/patterns/platform-governance-card";
import { WorkspaceFilterBar, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminAttendancePolicy, HrAdminPolicyOptions } from "@/lib/types";

type Props = {
  items: HrAdminAttendancePolicy[];
  state: "live" | "demo";
  options: HrAdminPolicyOptions;
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

function formatLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function statusTone(value: string): "success" | "warning" | "danger" | "neutral" | "info" {
  const normalized = value.toLowerCase();
  if (normalized === "active") return "success";
  if (normalized === "draft") return "warning";
  if (normalized === "inactive") return "neutral";
  return "info";
}

export function AttendancePoliciesWorkbench({ items, state, options, canManagePolicies }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useWorkspaceQueryFilter("q", "");
  const [status, setStatus] = useWorkspaceQueryFilter("status", "all");
  const [unit, setUnit] = useWorkspaceQueryFilter("unit", "all");
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? "");
  const modalMode = searchParams.get("policyModal") ?? "";
  const editPolicyId = searchParams.get("editPolicy") ?? "";

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !normalizedQuery || [item.name, item.code, item.default_shift ?? "", item.holiday_calendar ?? ""].join(" ").toLowerCase().includes(normalizedQuery);
      const matchesStatus = status === "all" || item.status === status;
      const matchesUnit = unit === "all" || item.attendance_unit === unit;
      return matchesQuery && matchesStatus && matchesUnit;
    });
  }, [items, query, status, unit]);

  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === selectedItemId) ?? null,
    [filteredItems, selectedItemId],
  );
  const activeCount = items.filter((item) => item.status === "active").length;
  const draftCount = items.length - activeCount;
  const editItem = canManagePolicies && editPolicyId ? items.find((item) => item.id === editPolicyId) ?? null : null;
  const defaultStatus = options.attendance_policy_statuses[0]?.value || "draft";
  const defaultUnit = options.attendance_units[0]?.value || "day";

  function queueHref(overrides: Record<string, string | number | boolean | undefined> = {}) {
    return `${pathname}${buildQueryString(overrides)}`;
  }

  return (
    <section className="section queue-layout attendance-policies-workbench">
      <div className="attendance-summary-strip" aria-label="Attendance policy summary">
        <span><strong>{items.length}</strong> policies</span>
        <span><strong>{activeCount}</strong> active</span>
        <span><strong>{draftCount}</strong> draft or inactive</span>
        <span><strong>{state}</strong> mode</span>
      </div>

      <section aria-label="Attendance policy filters" className="panel-card-soft attendance-queue-toolbar" data-testid="attendance-policies-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Attendance policy catalog</h2>
            <p className="section-copy section-copy-soft">Review rules, thresholds, and policy readiness before scoped assignment.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{filteredItems.length}</strong> in this view</span>
            <span className="queue-summary-chip"><strong>{selectedItem ? "1" : "0"}</strong> selected</span>
          </div>
        </div>
        <WorkspaceFilterBar className="attendance-record-filter-bar">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" onChange={(event) => setQuery(event.target.value)} placeholder="Policy name, code, shift, calendar" value={query} />
          </label>
          <label className="form-field">
            <span className="muted">Status</span>
            <select className="input-control" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="all">All statuses</option>
              {options.attendance_policy_statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Unit</span>
            <select className="input-control" onChange={(event) => setUnit(event.target.value)} value={unit}>
              <option value="all">All units</option>
              {options.attendance_units.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </WorkspaceFilterBar>
        <div className="queue-toolbar__actions attendance-toolbar-actions">
          <button className="button button--ghost" onClick={() => {
            setQuery("");
            setStatus("all");
            setUnit("all");
          }} type="button">Clear filters</button>
          {canManagePolicies ? <Link className="button button--primary" href={queueHref({ policyModal: "create" })}>Create attendance policy</Link> : null}
        </div>
      </section>

      <div className={`attendance-review-workbench${selectedItem ? " attendance-review-workbench--with-detail" : ""}`}>
        <section className="panel-card-soft attendance-directory-panel">
          <WorkspaceTableScrollRegion label="Attendance policies, scroll for more columns" className="attendance-directory-table-wrap workspace-table-region">
            <table className="workspace-data-table workspace-table attendance-directory-table">
              <thead>
                <tr>
                  <th scope="col">Policy</th>
                  <th scope="col">Rules</th>
                  <th scope="col">References</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <tr aria-selected={isSelected} className={isSelected ? "is-selected" : ""} key={item.id} onClick={() => setSelectedItemId(item.id)}>
                      <td><strong>{item.name}</strong><span>{item.code}</span></td>
                      <td><strong>{item.full_day_min_hours}h full / {item.half_day_min_hours}h half</strong><span>{item.late_mark_after_minutes} min late grace</span></td>
                      <td><strong>{item.default_shift || "No shift"}</strong><span>{item.holiday_calendar || "No calendar"}</span></td>
                      <td><WorkspaceStatusBadge tone={statusTone(item.status)}>{formatLabel(item.status)}</WorkspaceStatusBadge><span>{formatLabel(item.attendance_unit)}</span></td>
                      <td><button className="button button--secondary button--compact" onClick={(event) => {
                        event.stopPropagation();
                        setSelectedItemId(item.id);
                      }} type="button">Inspect</button></td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5}><strong>No attendance policies match the current filters.</strong><span>Clear filters to restore the catalog.</span></td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </WorkspaceTableScrollRegion>
        </section>

        {selectedItem ? (
          <aside className="panel-card-soft attendance-detail-drawer" aria-label="Attendance policy detail">
            <div className="queue-toolbar__header">
              <div>
                <h2 className="section-heading-soft">Policy detail</h2>
                <p className="section-copy section-copy-soft">Focused rules and governance state.</p>
              </div>
              <button className="button button--secondary button--compact" onClick={() => setSelectedItemId("")} type="button">Close</button>
            </div>
            <article className="record-card record-card--compact">
              <div className="record-card__header">
                <div>
                  <h3>{selectedItem.name}</h3>
                  <p className="section-copy section-copy-soft">{selectedItem.code} · {formatLabel(selectedItem.attendance_unit)}</p>
                </div>
                <WorkspaceStatusBadge tone={statusTone(selectedItem.status)}>{formatLabel(selectedItem.status)}</WorkspaceStatusBadge>
              </div>
              <div className="record-card__eyebrow">
                <PlatformGovernanceCard item={selectedItem} />
              </div>
            </article>
            <div className="record-card__actions">
              {canManagePolicies ? (
                <Link className="button button--primary" href={queueHref({ editPolicy: selectedItem.id })}>Edit policy</Link>
              ) : (
                <button className="button button--secondary" disabled title="Requires attendance.policies.manage permission." type="button">Edit policy</button>
              )}
            </div>
            <details className="record-card" open>
              <summary>Thresholds</summary>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Full day min</span><span className="detail-value">{selectedItem.full_day_min_hours} hours</span></div>
                <div className="detail-row"><span className="detail-label">Half day min</span><span className="detail-value">{selectedItem.half_day_min_hours} hours</span></div>
                <div className="detail-row"><span className="detail-label">Late mark after</span><span className="detail-value">{selectedItem.late_mark_after_minutes} minutes</span></div>
                <div className="detail-row"><span className="detail-label">Max late marks</span><span className="detail-value">{selectedItem.max_late_marks_in_period}</span></div>
                <div className="detail-row"><span className="detail-label">Overtime threshold</span><span className="detail-value">{selectedItem.overtime_threshold_minutes} minutes</span></div>
              </div>
            </details>
            <details className="record-card" open>
              <summary>Controls</summary>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Manual entry</span><span className="detail-value">{selectedItem.allow_manual_entry ? "Allowed" : "Blocked"}</span></div>
                <div className="detail-row"><span className="detail-label">Web check-in</span><span className="detail-value">{selectedItem.allow_web_checkin ? "Allowed" : "Blocked"}</span></div>
                <div className="detail-row"><span className="detail-label">Mobile check-in</span><span className="detail-value">{selectedItem.allow_mobile_checkin ? "Allowed" : "Blocked"}</span></div>
                <div className="detail-row"><span className="detail-label">Regularization</span><span className="detail-value">{selectedItem.allow_regularization ? "Allowed" : "Blocked"}</span></div>
              </div>
            </details>
            <PlatformGovernanceNotice item={selectedItem} />
          </aside>
        ) : null}
      </div>

      {canManagePolicies && modalMode === "create" ? (
        <HrAdminActionModal
          className="attendance-policy-modal"
          closeHref={queueHref()}
          eyebrow="Attendance policy"
          labelledBy="attendance-policy-create-modal-title"
          title="Create attendance policy"
          description="Define rules, thresholds and runtime behavior."
          tabs={["Identity", "Thresholds", "Preview"]}
        >
          <AttendancePolicyForm
            compact
            cancelHref={queueHref()}
            successHref={queueHref()}
            initialValue={createEmptyAttendancePolicyValue(defaultStatus, defaultUnit)}
            mode="create"
            options={options}
          />
        </HrAdminActionModal>
      ) : null}

      {canManagePolicies && editItem ? (
        <HrAdminActionModal
          className="attendance-policy-modal"
          closeHref={queueHref()}
          eyebrow="Attendance policy"
          labelledBy="attendance-policy-edit-modal-title"
          title={`Edit ${editItem.name}`}
          description="Adjust rules, thresholds and runtime behavior."
          tabs={["Identity", "Thresholds", "Preview"]}
        >
          <AttendancePolicyForm
            compact
            cancelHref={queueHref()}
            successHref={queueHref()}
            initialValue={attendancePolicyToFormValue(editItem)}
            item={editItem}
            itemId={editItem.id}
            mode="edit"
            options={options}
          />
        </HrAdminActionModal>
      ) : null}
    </section>
  );
}
