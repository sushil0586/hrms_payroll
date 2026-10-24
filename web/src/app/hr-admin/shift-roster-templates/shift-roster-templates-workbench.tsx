"use client";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";


import { WorkspaceFilterForm } from "@/components/patterns/workspace-filter-form";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { createEmptyShiftRosterTemplateValue, shiftRosterTemplateToFormValue } from "@/app/hr-admin/shift-roster-templates/form-values";
import { ShiftRosterTemplateForm } from "@/app/hr-admin/shift-roster-templates/shift-roster-template-form";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceFilterBar, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminPolicyWorkbenchOptions, HrAdminShiftRosterTemplate } from "@/lib/types";

type SearchParamValue = string | string[] | undefined;

type Props = {
  canManagePolicies: boolean;
  currentParams: Record<string, SearchParamValue>;
  editItem?: HrAdminShiftRosterTemplate | null;
  items: HrAdminShiftRosterTemplate[];
  options: Pick<HrAdminPolicyWorkbenchOptions, "shifts">;
  page: number;
  pageSize: number;
  state: "live" | "demo";
  totalCount: number;
  totalPages: number;
};

const patterns = ["fixed", "weekly_rotation", "custom_rotation", "alternating_weeks"];

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
  return `/hr-admin/shift-roster-templates${query ? `?${query}` : ""}`;
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function titleLabel(value: string) {
  return formatLabel(value)
    .split(" ")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function statusTone(status: HrAdminShiftRosterTemplate["status"]): "success" | "warning" | "neutral" {
  if (status === "published") return "success";
  if (status === "locked") return "warning";
  return "neutral";
}

function rotationSummary(item: HrAdminShiftRosterTemplate, shifts: HrAdminPolicyWorkbenchOptions["shifts"]) {
  const entries = item.config_snapshot?.rotation?.entries ?? [];
  if (!entries.length) return "No rotation steps configured.";
  return entries
    .map((entry) => `${entry.entry_kind === "off" ? "Off" : shifts.find((shift) => shift.id === entry.shift_id)?.name || "Shift"} (${entry.span_days}d)`)
    .join(" -> ");
}

export function ShiftRosterTemplatesWorkbench({
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
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? "");
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );
  const createModalOpen = searchParams.get("rosterModal") === "create";
  const modalEditItem = canManagePolicies && editItem ? editItem : null;
  const publishedCount = items.filter((item) => item.status === "published" || item.status === "locked").length;
  const rotationCount = items.filter((item) => item.assignment_kind === "weekly_rotation").length;

  function queueHref(overrides: Record<string, string | number | boolean | undefined> = {}) {
    const params: Record<string, string | number | boolean | undefined> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    delete params.rosterModal;
    delete params.editRoster;
    return `${pathname}${buildQueryString({ ...params, ...overrides })}`;
  }

  return (
    <section className="section queue-layout attendance-roster-templates-workbench">
      <div className="attendance-summary-strip" aria-label="Roster template summary">
        <span><strong>{totalCount}</strong> templates</span>
        <span><strong>{publishedCount}</strong> rollout ready</span>
        <span><strong>{rotationCount}</strong> rotations on page</span>
        <span><strong>{items.length}</strong> on page</span>
        <span><strong>{state}</strong> mode</span>
      </div>

      <section aria-label="Roster template filters" className="panel-card-soft attendance-queue-toolbar" data-testid="shift-roster-templates-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Roster template catalog</h2>
            <p className="section-copy section-copy-soft">Filter reusable patterns, inspect rollout readiness, and open template edits in context.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{items.length}</strong> on this page</span>
            <span className="queue-summary-chip"><strong>{selectedItem ? "1" : "0"}</strong> selected</span>
          </div>
        </div>
        <WorkspaceFilterForm key={JSON.stringify(currentParams)} action={pathname} label="Roster template filters" className="workspace-filter-form--block">
          <WorkspaceFilterBar className="attendance-record-filter-bar">
            <label className="form-field">
              <span className="muted">Search</span>
              <input className="input-control" name="q" type="search" defaultValue={normalizeParam(currentParams.q) ?? ""} placeholder="Template, code, shift, description" />
            </label>
            <label className="form-field">
              <span className="muted">Status</span>
              <select className="input-control" name="status" defaultValue={normalizeParam(currentParams.status) ?? "all"}>
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="locked">Locked</option>
              </select>
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
            <details className="attendance-more-filters">
              <summary className="button button--secondary">More filters</summary>
              <div className="attendance-more-filters__panel">
                <label className="form-field">
                  <span className="muted">Pattern</span>
                  <select className="input-control" name="pattern" defaultValue={normalizeParam(currentParams.pattern) ?? "all"}>
                    <option value="all">All patterns</option>
                    {patterns.map((pattern) => <option key={pattern} value={pattern}>{formatLabel(pattern)}</option>)}
                  </select>
                </label>
              </div>
            </details>
          </WorkspaceFilterBar>
          <div className="queue-toolbar__actions attendance-toolbar-actions">
            <button className="button button--primary" type="submit">Apply filters</button>
            <Link className="button button--secondary" href="/hr-admin/shift-roster-templates">Clear filters</Link>
            {canManagePolicies ? <Link className="button button--primary" href={queueHref({ rosterModal: "create" })}>Create template</Link> : null}
          </div>
        </WorkspaceFilterForm>
      </section>

      <div className={`attendance-review-workbench${selectedItem ? " attendance-review-workbench--with-detail" : ""}`}>
        <section className="panel-card-soft attendance-directory-panel">
          <WorkspaceTableScrollRegion label="Shift roster templates, scroll for more columns" className="attendance-directory-table-wrap workspace-table-region">
            <table className="workspace-data-table workspace-table attendance-directory-table">
              <thead>
                <tr>
                  <th scope="col">Template</th>
                  <th scope="col">Base shift</th>
                  <th scope="col">Mode</th>
                  <th scope="col">Pattern</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <tr aria-selected={isSelected} className={isSelected ? "is-selected" : ""} key={item.id} onClick={() => setSelectedItemId(item.id)}>
                      <td><strong>{item.name}</strong><span>{item.code}</span></td>
                      <td><strong>{item.shift}</strong><span>{item.description || "No description added"}</span></td>
                      <td><WorkspaceStatusBadge tone={item.assignment_kind === "temporary_override" ? "info" : "neutral"}>{titleLabel(item.assignment_kind)}</WorkspaceStatusBadge><span>Assignment mode</span></td>
                      <td><strong>{titleLabel(item.config_snapshot?.rotation?.pattern_type ?? "fixed")}</strong><span>{rotationSummary(item, options.shifts)}</span></td>
                      <td><WorkspaceStatusBadge tone={statusTone(item.status)}>{titleLabel(item.status)}</WorkspaceStatusBadge><span>{item.status === "draft" ? "Preview first" : "Rollout ready"}</span></td>
                      <td><button className="button button--secondary button--compact" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent);
                        triggerEvent.stopPropagation();
                        setSelectedItemId(item.id);
                       }} type="button">Inspect</button></td>
                    </tr>
                  );
                })}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6}><strong>No roster templates match these filters.</strong><span>Clear filters or search by template code, status, assignment mode, or pattern.</span></td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </WorkspaceTableScrollRegion>
          <div className="panel-card-soft attendance-pagination-panel">
            <PaginationBar
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
            <WorkspaceFilterForm key={`pagination-${JSON.stringify(currentParams)}`} action={pathname} label="Roster template pagination" className="attendance-pagination-panel__controls workspace-filter-form--inline">
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
          <aside className="panel-card-soft attendance-detail-drawer" aria-label="Roster template detail">
            <div className="queue-toolbar__header">
              <div>
                <h2 className="section-heading-soft">Roster template detail</h2>
                <p className="section-copy section-copy-soft">Focused pattern, status, and rollout context.</p>
              </div>
              <button className="button button--secondary button--compact" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); setSelectedItemId(""); }} type="button">Close</button>
            </div>
            <article className="record-card record-card--compact">
              <div className="record-card__header">
                <div>
                  <h3>{selectedItem.name}</h3>
                  <p className="section-copy section-copy-soft">{selectedItem.code} · {selectedItem.shift}</p>
                </div>
                <WorkspaceStatusBadge tone={statusTone(selectedItem.status)}>{titleLabel(selectedItem.status)}</WorkspaceStatusBadge>
              </div>
              <div className="record-card__eyebrow">
                <WorkspaceStatusBadge tone={selectedItem.assignment_kind === "temporary_override" ? "info" : "neutral"}>{titleLabel(selectedItem.assignment_kind)}</WorkspaceStatusBadge>
              </div>
            </article>
            <div className="record-card__actions">
              {canManagePolicies ? (
                <Link className="button button--primary" href={queueHref({ editRoster: selectedItem.id })}>Edit template</Link>
              ) : (
                <button className="button button--secondary" disabled title="Requires attendance.policies.manage permission." type="button">Edit template</button>
              )}
            </div>
            <details className="record-card" open>
              <summary>Pattern</summary>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Base shift</span><span className="detail-value">{selectedItem.shift}</span></div>
                <div className="detail-row"><span className="detail-label">Mode</span><span className="detail-value">{titleLabel(selectedItem.assignment_kind)}</span></div>
                <div className="detail-row"><span className="detail-label">Pattern type</span><span className="detail-value">{titleLabel(selectedItem.config_snapshot?.rotation?.pattern_type ?? "fixed")}</span></div>
                <div className="detail-row"><span className="detail-label">Anchor date</span><span className="detail-value">{selectedItem.config_snapshot?.rotation?.anchor_date ?? "Not set"}</span></div>
              </div>
            </details>
            <details className="record-card" open>
              <summary>Rotation steps</summary>
              <div className="detail-grid">
                {(selectedItem.config_snapshot?.rotation?.entries ?? []).map((entry, index) => (
                  <div className="detail-row" key={`${entry.position}-${index}`}>
                    <span className="detail-label">Step {index + 1}</span>
                    <span className="detail-value">{entry.entry_kind === "off" ? "Off" : options.shifts.find((shift) => shift.id === entry.shift_id)?.name || "Shift"} · {entry.span_days} day(s)</span>
                  </div>
                ))}
                {selectedItem.config_snapshot?.rotation?.entries?.length ? null : (
                  <div className="detail-row"><span className="detail-label">Steps</span><span className="detail-value">No rotation steps configured.</span></div>
                )}
              </div>
            </details>
          </aside>
        ) : null}
      </div>

      {canManagePolicies && createModalOpen ? (
        <HrAdminActionModal
          className="attendance-policy-modal"
          closeHref={queueHref()}
          eyebrow="Roster template"
          labelledBy="roster-template-create-modal-title"
          title="Create roster template"
          description="Build a reusable shift pattern for later rollout."
          tabs={["Identity", "Pattern", "Review"]}
        >
          <ShiftRosterTemplateForm compact cancelHref={queueHref()} successHref={queueHref()} initialValue={createEmptyShiftRosterTemplateValue()} mode="create" options={options} />
        </HrAdminActionModal>
      ) : null}

      {modalEditItem ? (
        <HrAdminActionModal
          className="attendance-policy-modal"
          closeHref={queueHref()}
          eyebrow="Roster template"
          labelledBy="roster-template-edit-modal-title"
          title={`Edit ${modalEditItem.name}`}
          description="Adjust reusable shift pattern, status, and rollout behavior."
          tabs={["Identity", "Pattern", "Review"]}
        >
          <ShiftRosterTemplateForm compact cancelHref={queueHref()} successHref={queueHref()} initialValue={shiftRosterTemplateToFormValue(modalEditItem)} itemId={modalEditItem.id} mode="edit" options={options} />
        </HrAdminActionModal>
      ) : null}
    </section>
  );
}
