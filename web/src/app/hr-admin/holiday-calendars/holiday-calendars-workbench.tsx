"use client";

import { useWorkspaceQueryFilter } from "@/components/patterns/use-workspace-query-filter";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { createEmptyHolidayCalendarValue, holidayCalendarToFormValue } from "@/app/hr-admin/holiday-calendars/form-values";
import { HolidayCalendarForm } from "@/app/hr-admin/holiday-calendars/holiday-calendar-form";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PlatformGovernanceCard, PlatformGovernanceNotice } from "@/components/patterns/platform-governance-card";
import { WorkspaceFilterBar, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminAttendanceOperationOptions, HrAdminHolidayCalendar } from "@/lib/types";

type Props = {
  canManagePolicies: boolean;
  editItem?: HrAdminHolidayCalendar | null;
  items: HrAdminHolidayCalendar[];
  options: HrAdminAttendanceOperationOptions;
  state: "live" | "demo";
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

function scopeLabel(item: HrAdminHolidayCalendar) {
  return item.branch || item.location || item.legal_entity || "Global tenant scope";
}

function statusTone(item: HrAdminHolidayCalendar): "success" | "neutral" {
  return item.is_active ? "success" : "neutral";
}

export function HolidayCalendarsWorkbench({ canManagePolicies, editItem, items, options, state }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useWorkspaceQueryFilter("q", "");
  const [status, setStatus] = useWorkspaceQueryFilter("status", "all");
  const [year, setYear] = useWorkspaceQueryFilter("year", "all");
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? "");
  const createModalOpen = searchParams.get("calendarModal") === "create";
  const modalEditItem = canManagePolicies && editItem ? editItem : null;
  const yearOptions = Array.from(new Set(items.map((item) => String(item.year)))).sort();

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [item.name, item.code, scopeLabel(item), item.holidays.map((holiday) => holiday.name).join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesStatus = status === "all" || (status === "active" ? item.is_active : !item.is_active);
      const matchesYear = year === "all" || String(item.year) === year;
      return matchesQuery && matchesStatus && matchesYear;
    });
  }, [items, query, status, year]);

  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === selectedItemId) ?? null,
    [filteredItems, selectedItemId],
  );
  const activeCount = items.filter((item) => item.is_active).length;
  const holidayCount = items.reduce((total, item) => total + item.holidays.length, 0);
  const restrictedCount = items.reduce((total, item) => total + item.holidays.filter((holiday) => holiday.holiday_type === "restricted").length, 0);

  function queueHref(overrides: Record<string, string | number | boolean | undefined> = {}) {
    const params: Record<string, string | number | boolean | undefined> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    delete params.calendarModal;
    delete params.editCalendar;
    return `${pathname}${buildQueryString({ ...params, ...overrides })}`;
  }

  return (
    <section className="section queue-layout attendance-holiday-calendars-workbench">
      <div className="attendance-summary-strip" role="group" aria-label="Holiday calendar summary">
        <span><strong>{items.length}</strong> calendars</span>
        <span><strong>{activeCount}</strong> active</span>
        <span><strong>{holidayCount}</strong> holiday rows</span>
        <span><strong>{restrictedCount}</strong> restricted</span>
        <span><strong>{state}</strong> mode</span>
      </div>

      <section aria-label="Holiday calendar filters" className="panel-card-soft attendance-queue-toolbar" data-testid="holiday-calendars-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Holiday calendar catalog</h2>
            <p className="section-copy section-copy-soft">Filter calendar years, inspect scope, and review holiday rows in context.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{filteredItems.length}</strong> in this view</span>
            <span className="queue-summary-chip"><strong>{selectedItem ? "1" : "0"}</strong> selected</span>
          </div>
        </div>
        <WorkspaceFilterBar className="attendance-record-filter-bar">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" onChange={(event) => setQuery(event.target.value)} placeholder="Calendar, code, scope, holiday" value={query} />
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
            <span className="muted">Year</span>
            <select className="input-control" onChange={(event) => setYear(event.target.value)} value={year}>
              <option value="all">All years</option>
              {yearOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </WorkspaceFilterBar>
        <div className="queue-toolbar__actions attendance-toolbar-actions">
          <button className="button button--ghost" onClick={() => {
            setQuery("");
            setStatus("all");
            setYear("all");
          }} type="button">Clear filters</button>
          {canManagePolicies ? <Link className="button button--primary" href={queueHref({ calendarModal: "create" })}>Create calendar</Link> : null}
        </div>
      </section>

      <div className={`attendance-review-workbench${selectedItem ? " attendance-review-workbench--with-detail" : ""}`}>
        <section className="panel-card-soft attendance-directory-panel">
          <WorkspaceTableScrollRegion label="Holiday calendars, scroll for more columns" className="attendance-directory-table-wrap workspace-table-region">
            <table className="workspace-data-table workspace-table attendance-directory-table">
              <thead>
                <tr>
                  <th scope="col">Calendar</th>
                  <th scope="col">Scope</th>
                  <th scope="col">Year</th>
                  <th scope="col">Holiday rows</th>
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
                      <td><strong>{scopeLabel(item)}</strong><span>{item.legal_entity || "Tenant calendar"}</span></td>
                      <td><strong>{item.year}</strong><span>Calendar year</span></td>
                      <td><strong>{item.holidays.length} holidays</strong><span>{item.holidays.filter((holiday) => holiday.holiday_type === "restricted").length} restricted</span></td>
                      <td><WorkspaceStatusBadge tone={statusTone(item)}>{item.is_active ? "Active" : "Inactive"}</WorkspaceStatusBadge><span><PlatformGovernanceCard item={item} /></span></td>
                      <td><button className="button button--secondary button--compact" onClick={(event) => {
                        event.stopPropagation();
                        setSelectedItemId(item.id);
                      }} type="button">Inspect</button></td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6}><strong>No holiday calendars match these filters.</strong><span>Clear filters or search by calendar, code, scope, or holiday name.</span></td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </WorkspaceTableScrollRegion>
        </section>

        {selectedItem ? (
          <aside className="panel-card-soft attendance-detail-drawer" aria-label="Holiday calendar detail">
            <div className="queue-toolbar__header">
              <div>
                <h2 className="section-heading-soft">Calendar detail</h2>
                <p className="section-copy section-copy-soft">Focused scope and holiday-row context.</p>
              </div>
              <button className="button button--secondary button--compact" onClick={() => setSelectedItemId("")} type="button">Close</button>
            </div>
            <article className="record-card record-card--compact">
              <div className="record-card__header">
                <div>
                  <h3>{selectedItem.name}</h3>
                  <p className="section-copy section-copy-soft">{selectedItem.code} · {selectedItem.year}</p>
                </div>
                <WorkspaceStatusBadge tone={statusTone(selectedItem)}>{selectedItem.is_active ? "Active" : "Inactive"}</WorkspaceStatusBadge>
              </div>
              <div className="record-card__eyebrow">
                <PlatformGovernanceCard item={selectedItem} />
              </div>
            </article>
            <div className="record-card__actions">
              {canManagePolicies ? (
                <Link className="button button--primary" href={queueHref({ editCalendar: selectedItem.id })}>Edit calendar</Link>
              ) : (
                <button className="button button--secondary" disabled title="Requires attendance.policies.manage permission." type="button">Edit calendar</button>
              )}
            </div>
            <details className="record-card" open>
              <summary>Scope</summary>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Legal entity</span><span className="detail-value">{selectedItem.legal_entity || "All legal entities"}</span></div>
                <div className="detail-row"><span className="detail-label">Branch</span><span className="detail-value">{selectedItem.branch || "All branches"}</span></div>
                <div className="detail-row"><span className="detail-label">Location</span><span className="detail-value">{selectedItem.location || "All locations"}</span></div>
              </div>
            </details>
            <details className="record-card" open>
              <summary>Holiday rows</summary>
              <div className="detail-grid">
                {selectedItem.holidays.map((holiday) => (
                  <div className="detail-row" key={holiday.id ?? `${holiday.date}-${holiday.name}`}>
                    <span className="detail-label">{holiday.date}</span>
                    <span className="detail-value">{holiday.name} · {holiday.holiday_type}{holiday.is_optional ? " · optional" : ""}</span>
                  </div>
                ))}
                {selectedItem.holidays.length ? null : (
                  <div className="detail-row"><span className="detail-label">Rows</span><span className="detail-value">No holiday rows configured.</span></div>
                )}
              </div>
            </details>
            <PlatformGovernanceNotice item={selectedItem} />
          </aside>
        ) : null}
      </div>

      {canManagePolicies && createModalOpen ? (
        <HrAdminActionModal
          className="attendance-policy-modal"
          closeHref={queueHref()}
          eyebrow="Holiday calendar"
          labelledBy="holiday-calendar-create-modal-title"
          title="Create holiday calendar"
          description="Define the calendar year, scope, and holiday rows."
          tabs={["Scope", "Holiday rows", "Review"]}
        >
          <HolidayCalendarForm compact cancelHref={queueHref()} successHref={queueHref()} initialValue={createEmptyHolidayCalendarValue()} mode="create" options={options} />
        </HrAdminActionModal>
      ) : null}

      {modalEditItem ? (
        <HrAdminActionModal
          className="attendance-policy-modal"
          closeHref={queueHref()}
          eyebrow="Holiday calendar"
          labelledBy="holiday-calendar-edit-modal-title"
          title={`Edit ${modalEditItem.name}`}
          description="Update scope, year, and holiday definitions."
          tabs={["Scope", "Holiday rows", "Review"]}
        >
          <HolidayCalendarForm compact cancelHref={queueHref()} successHref={queueHref()} initialValue={holidayCalendarToFormValue(modalEditItem)} item={modalEditItem} itemId={modalEditItem.id} mode="edit" options={options} />
        </HrAdminActionModal>
      ) : null}
    </section>
  );
}
