"use client";

import { useWorkspaceQueryFilter } from "@/components/patterns/use-workspace-query-filter";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { createEmptyShiftValue, shiftToFormValue } from "@/app/hr-admin/shifts/form-values";
import { ShiftForm } from "@/app/hr-admin/shifts/shift-form";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PlatformGovernanceCard, PlatformGovernanceNotice } from "@/components/patterns/platform-governance-card";
import { WorkspaceFilterBar, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminShift } from "@/lib/types";

type Props = {
  items: HrAdminShift[];
  state: "live" | "demo";
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

function formatTime(value: string) {
  return value.slice(0, 5);
}

function formatDay(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function shiftTone(item: HrAdminShift): "success" | "warning" | "neutral" | "info" {
  if (!item.is_active) return "neutral";
  if (item.is_night_shift) return "warning";
  return "success";
}

export function ShiftsWorkbench({ items, state, canManagePolicies }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useWorkspaceQueryFilter("q", "");
  const [status, setStatus] = useWorkspaceQueryFilter("status", "all");
  const [kind, setKind] = useWorkspaceQueryFilter("kind", "all");
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? "");
  const modalMode = searchParams.get("shiftModal") ?? "";
  const editShiftId = searchParams.get("editShift") ?? "";

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !normalizedQuery || [item.name, item.code, item.weekly_off_days.join(" ")].join(" ").toLowerCase().includes(normalizedQuery);
      const matchesStatus = status === "all" || (status === "active" ? item.is_active : !item.is_active);
      const matchesKind =
        kind === "all" ||
        (kind === "night" ? item.is_night_shift : kind === "flexible" ? item.is_flexible : !item.is_night_shift && !item.is_flexible);
      return matchesQuery && matchesStatus && matchesKind;
    });
  }, [items, query, status, kind]);

  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === selectedItemId) ?? null,
    [filteredItems, selectedItemId],
  );
  const activeCount = items.filter((item) => item.is_active).length;
  const nightCount = items.filter((item) => item.is_night_shift).length;
  const flexibleCount = items.filter((item) => item.is_flexible).length;
  const editItem = canManagePolicies && editShiftId ? items.find((item) => item.id === editShiftId) ?? null : null;

  function queueHref(overrides: Record<string, string | number | boolean | undefined> = {}) {
    return `${pathname}${buildQueryString(overrides)}`;
  }

  return (
    <section className="section queue-layout attendance-shifts-workbench">
      <div className="attendance-summary-strip" aria-label="Shift summary">
        <span><strong>{items.length}</strong> shifts</span>
        <span><strong>{activeCount}</strong> active</span>
        <span><strong>{nightCount}</strong> night</span>
        <span><strong>{flexibleCount}</strong> flexible</span>
        <span><strong>{state}</strong> mode</span>
      </div>

      <section aria-label="Shift filters" className="panel-card-soft attendance-queue-toolbar" data-testid="shifts-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Shift master catalog</h2>
            <p className="section-copy section-copy-soft">Review working windows, grace rules, and weekly-off defaults.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{filteredItems.length}</strong> in this view</span>
            <span className="queue-summary-chip"><strong>{selectedItem ? "1" : "0"}</strong> selected</span>
          </div>
        </div>
        <WorkspaceFilterBar className="attendance-record-filter-bar">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" onChange={(event) => setQuery(event.target.value)} placeholder="Shift name, code, weekly off" value={query} />
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
            <span className="muted">Type</span>
            <select className="input-control" onChange={(event) => setKind(event.target.value)} value={kind}>
              <option value="all">All shifts</option>
              <option value="standard">Standard</option>
              <option value="night">Night shift</option>
              <option value="flexible">Flexible</option>
            </select>
          </label>
        </WorkspaceFilterBar>
        <div className="queue-toolbar__actions attendance-toolbar-actions">
          <button className="button button--ghost" onClick={() => {
            setQuery("");
            setStatus("all");
            setKind("all");
          }} type="button">Clear filters</button>
          {canManagePolicies ? <Link className="button button--primary" href={queueHref({ shiftModal: "create" })}>Create shift</Link> : null}
        </div>
      </section>

      <div className={`attendance-review-workbench${selectedItem ? " attendance-review-workbench--with-detail" : ""}`}>
        <section className="panel-card-soft attendance-directory-panel">
          <WorkspaceTableScrollRegion label="Shifts, scroll for more columns" className="attendance-directory-table-wrap workspace-table-region">
            <table className="workspace-data-table workspace-table attendance-directory-table">
              <thead>
                <tr>
                  <th scope="col">Shift</th>
                  <th scope="col">Window</th>
                  <th scope="col">Rules</th>
                  <th scope="col">Weekly off</th>
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
                      <td><strong>{formatTime(item.start_time)} - {formatTime(item.end_time)}</strong><span>{item.working_hours} working hrs</span></td>
                      <td><strong>{item.break_minutes} min break</strong><span>{item.grace_in_minutes}/{item.grace_out_minutes} min grace</span></td>
                      <td><strong>{item.weekly_off_days.length ? item.weekly_off_days.map(formatDay).join(", ") : "None set"}</strong><span>{item.is_flexible ? "Flexible timing" : item.is_night_shift ? "Cross-day window" : "Fixed window"}</span></td>
                      <td><WorkspaceStatusBadge tone={shiftTone(item)}>{item.is_active ? "Active" : "Inactive"}</WorkspaceStatusBadge><span>{item.is_night_shift ? "Night shift" : item.is_flexible ? "Flexible" : "Standard"}</span></td>
                      <td><button className="button button--secondary button--compact" onClick={(event) => {
                        event.stopPropagation();
                        setSelectedItemId(item.id);
                      }} type="button">Inspect</button></td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6}><strong>No shifts match the current filters.</strong><span>Clear filters to restore the catalog.</span></td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </WorkspaceTableScrollRegion>
        </section>

        {selectedItem ? (
          <aside className="panel-card-soft attendance-detail-drawer" aria-label="Shift detail">
            <div className="queue-toolbar__header">
              <div>
                <h2 className="section-heading-soft">Shift detail</h2>
                <p className="section-copy section-copy-soft">Focused timing, grace, and governance state.</p>
              </div>
              <button className="button button--secondary button--compact" onClick={() => setSelectedItemId("")} type="button">Close</button>
            </div>
            <article className="record-card record-card--compact">
              <div className="record-card__header">
                <div>
                  <h3>{selectedItem.name}</h3>
                  <p className="section-copy section-copy-soft">{selectedItem.code} · {formatTime(selectedItem.start_time)} - {formatTime(selectedItem.end_time)}</p>
                </div>
                <WorkspaceStatusBadge tone={shiftTone(selectedItem)}>{selectedItem.is_active ? "Active" : "Inactive"}</WorkspaceStatusBadge>
              </div>
              <div className="record-card__eyebrow">
                {selectedItem.is_night_shift ? <WorkspaceStatusBadge tone="warning">Night shift</WorkspaceStatusBadge> : null}
                {selectedItem.is_flexible ? <WorkspaceStatusBadge tone="info">Flexible</WorkspaceStatusBadge> : null}
                <PlatformGovernanceCard item={selectedItem} />
              </div>
            </article>
            <div className="record-card__actions">
              {canManagePolicies ? (
                <Link className="button button--primary" href={queueHref({ editShift: selectedItem.id })}>Edit shift</Link>
              ) : (
                <button className="button button--secondary" disabled title="Requires attendance.policies.manage permission." type="button">Edit shift</button>
              )}
            </div>
            <details className="record-card" open>
              <summary>Timing</summary>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Start</span><span className="detail-value">{formatTime(selectedItem.start_time)}</span></div>
                <div className="detail-row"><span className="detail-label">End</span><span className="detail-value">{formatTime(selectedItem.end_time)}</span></div>
                <div className="detail-row"><span className="detail-label">Working hours</span><span className="detail-value">{selectedItem.working_hours}</span></div>
                <div className="detail-row"><span className="detail-label">Break</span><span className="detail-value">{selectedItem.break_minutes} minutes</span></div>
              </div>
            </details>
            <details className="record-card" open>
              <summary>Rules</summary>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Grace in</span><span className="detail-value">{selectedItem.grace_in_minutes} minutes</span></div>
                <div className="detail-row"><span className="detail-label">Grace out</span><span className="detail-value">{selectedItem.grace_out_minutes} minutes</span></div>
                <div className="detail-row"><span className="detail-label">Weekly off days</span><span className="detail-value">{selectedItem.weekly_off_days.length ? selectedItem.weekly_off_days.map(formatDay).join(", ") : "No weekly off set"}</span></div>
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
          eyebrow="Shift master"
          labelledBy="shift-create-modal-title"
          title="Create shift"
          description="Define timing, grace handling, and weekly-off defaults."
          tabs={["Timing", "Behavior", "Weekly off"]}
        >
          <ShiftForm compact cancelHref={queueHref()} successHref={queueHref()} initialValue={createEmptyShiftValue()} mode="create" />
        </HrAdminActionModal>
      ) : null}

      {canManagePolicies && editItem ? (
        <HrAdminActionModal
          className="attendance-policy-modal"
          closeHref={queueHref()}
          eyebrow="Shift master"
          labelledBy="shift-edit-modal-title"
          title={`Edit ${editItem.name}`}
          description="Adjust timing, grace handling, and weekly-off defaults."
          tabs={["Timing", "Behavior", "Weekly off"]}
        >
          <ShiftForm compact cancelHref={queueHref()} successHref={queueHref()} initialValue={shiftToFormValue(editItem)} item={editItem} itemId={editItem.id} mode="edit" />
        </HrAdminActionModal>
      ) : null}
    </section>
  );
}
