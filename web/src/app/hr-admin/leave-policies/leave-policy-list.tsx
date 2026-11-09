"use client";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";


import { ActionFeedbackReceipt, rememberActionSuccess } from "@/components/patterns/action-feedback-receipt";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceFilterForm } from "@/components/patterns/workspace-filter-form";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { useEffect, useMemo, useRef, useState } from "react";

import { apiErrorMessage, mutationErrorMessage } from "@/lib/ui/api-error-message";
import { ActionToast, ERROR_TOAST_DURATION_MS, SUCCESS_TOAST_DURATION_MS } from "@/components/patterns/action-toast";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { performJsonMutation } from "@/lib/ui/json-mutation";
import { PlatformGovernanceCard, PlatformGovernanceNotice } from "@/components/patterns/platform-governance-card";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminLeavePolicy, HrAdminLeavePolicyImpact } from "@/lib/types";

type Props = {
  canManagePolicies: boolean;
  policies: HrAdminLeavePolicy[];
  pending?: boolean;
  onOpenCreate?: () => void;
  onOpenEdit?: (id: string) => void;
  onReconcile?: () => Promise<void> | void;
};

function normalized(value: string) {
  return value.trim().toLowerCase();
}

function uniqueValues(items: string[]) {
  return [...new Set(items.filter(Boolean))].sort((first, second) => first.localeCompare(second));
}

export function LeavePolicyList({ canManagePolicies, policies, pending, onOpenCreate, onOpenEdit, onReconcile }: Props) {
  const initialFilters = useMemo(() => ({ q: "", status: "", leaveType: "", accrual: "", sort: "name-asc" }), []);
  const [draft, setDraft] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [filterPending, setFilterPending] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const inspectTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<HrAdminLeavePolicy | null>(null);
  const impactRequest = useRef(0);
  const [impact, setImpact] = useState<HrAdminLeavePolicyImpact | null>(null);
  const [isImpactLoading, setIsImpactLoading] = useState(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);

  const statusOptions = useMemo(() => uniqueValues(policies.map((item) => item.status)), [policies]);
  const leaveTypeOptions = useMemo(() => uniqueValues(policies.map((item) => item.leave_type)), [policies]);
  const accrualOptions = useMemo(() => uniqueValues(policies.map((item) => item.accrual_frequency)), [policies]);

  const filteredPolicies = useMemo(() => {
    const search = normalized(applied.q);
    const items = policies.filter((item) => {
      const matchesQuery = !search || [item.name, item.code, item.leave_type, item.status, item.accrual_frequency].some((value) => normalized(value).includes(search));
      const matchesStatus = !applied.status || item.status === applied.status;
      const matchesLeaveType = !applied.leaveType || item.leave_type === applied.leaveType;
      const matchesAccrual = !applied.accrual || item.accrual_frequency === applied.accrual;
      return matchesQuery && matchesStatus && matchesLeaveType && matchesAccrual;
    });
    return items.sort((left, right) => {
      if (applied.sort === "name-desc") return right.name.localeCompare(left.name) || left.id.localeCompare(right.id);
      if (applied.sort === "status") return left.status.localeCompare(right.status) || left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
      if (applied.sort === "leave-type") return left.leave_type.localeCompare(right.leave_type) || left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
      if (applied.sort === "entitlement-desc") return Number(right.annual_entitlement) - Number(left.annual_entitlement) || left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
      return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
    });
  }, [applied, policies]);

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredPolicies.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visiblePolicies = filteredPolicies.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const activeCount = policies.filter((item) => normalized(item.status) === "active").length;
  const selectedDetail = filteredPolicies.find((item) => item.id === selectedPolicyId) ?? null;

  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      const next = {
        q: params.get("q") || "",
        status: params.get("status") || "",
        leaveType: params.get("leave_type") || "",
        accrual: params.get("accrual") || "",
        sort: ["name-asc", "name-desc", "status", "leave-type", "entitlement-desc"].includes(params.get("sort") || "") ? params.get("sort")! : "name-asc",
      };
      setDraft(next);
      setApplied(next);
      setPage(1);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  function commitFilters(next: typeof applied) {
    setFilterPending(true);
    window.requestAnimationFrame(() => {
      setApplied(next);
      setPage(1);
      const url = new URL(window.location.href);
      for (const key of ["q", "status", "leave_type", "accrual", "sort"]) url.searchParams.delete(key);
      if (next.q.trim()) url.searchParams.set("q", next.q.trim());
      if (next.status) url.searchParams.set("status", next.status);
      if (next.leaveType) url.searchParams.set("leave_type", next.leaveType);
      if (next.accrual) url.searchParams.set("accrual", next.accrual);
      if (next.sort !== "name-asc") url.searchParams.set("sort", next.sort);
      window.history.pushState(window.history.state, "", `${url.pathname}${url.search}`);
      window.requestAnimationFrame(() => setFilterPending(false));
    });
  }



  async function openRemoveDialog(policy: HrAdminLeavePolicy) {
    const requestId = ++impactRequest.current;
    setSelectedPolicy(policy);
    setImpact(null);
    setActionError("");
    setSuccessMessage("");
    setIsImpactLoading(true);
    try {
      const response = await fetch(`/api/hr-admin/leave-policies/${policy.id}/impact`);
      const payload = await response.json().catch(() => ({}));
      if (requestId !== impactRequest.current) return;
      if (!response.ok) { setActionError(response.status >= 500 ? "Policy impact is unavailable. No removal was submitted. Close this dialog and retry the impact check." : apiErrorMessage(payload, "Unable to load policy impact. Close this dialog and retry the impact check.")); return; }
      setImpact(payload as HrAdminLeavePolicyImpact);
    } catch {
      if (requestId !== impactRequest.current) return;
      setActionError("Unable to load policy impact. Close this dialog and try again.");
    } finally {
      if (requestId === impactRequest.current) setIsImpactLoading(false);
    }
  }

  function closeRemoveDialog() {
    if (isActionSubmitting) return;
    impactRequest.current++;
    setSelectedPolicy(null);
    setImpact(null);
    setActionError("");
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), toast.tone === "error" ? ERROR_TOAST_DURATION_MS : SUCCESS_TOAST_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function submitPolicyRemoval(action: "archive" | "delete") {
    if (!selectedPolicy || isActionSubmitting || pending) return;
    setIsActionSubmitting(true);
    setActionError("");
    const response = await performJsonMutation<HrAdminLeavePolicyImpact>(`/api/hr-admin/leave-policies/${selectedPolicy.id}/${action}`, {
      method: action === "delete" ? "DELETE" : "POST",
    }, "Unable to reach the policy service. Check your connection and retry.");
    const payload = response.payload;
    if (!response.ok) {
      const message = mutationErrorMessage(payload, response.status, "Unable to update this policy. Review its linked records and removal guidance.");
      setImpact((payload as { impact?: HrAdminLeavePolicyImpact }).impact ?? (payload as HrAdminLeavePolicyImpact));
      setActionError(message);
      setIsActionSubmitting(false);
      return;
    }
    const message = action === "delete" ? "Leave policy deleted." : "Leave policy archived.";
    setSuccessMessage(message);
    setToast({ title: "Policy updated.", message, tone: "success" });
    rememberActionSuccess("/hr-admin/leave-policies", selectedPolicy.id, message, "The confirmed policy catalog has been refreshed.");
    setIsActionSubmitting(false);
    setSelectedPolicy(null);
    setImpact(null);
    if (onReconcile) await onReconcile();
  }

  return (
    <section className="section queue-layout">
      <ActionFeedbackReceipt recordIds={policies.map(item => item.id)} />
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
      <div className="attendance-summary-strip" role="group" aria-label="Leave policy summary">
        <span><strong>{policies.length}</strong> policies</span>
        <span><strong>{activeCount}</strong> active</span>
        <span><strong>{policies.length - activeCount}</strong> inactive or draft</span>
      </div>

      <section aria-label="Leave policy filters" className="panel-card-soft attendance-queue-toolbar">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Leave policy catalog</h2>
            <p className="section-copy section-copy-soft">Search policy rules and inspect their entitlement, eligibility, and approval setup.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{filteredPolicies.length}</strong> in this view</span>
            <span className="queue-summary-chip"><strong>{selectedDetail ? "1" : "0"}</strong> selected</span>
          </div>
        </div>
        <WorkspaceFilterForm action="/hr-admin/leave-policies" label="Leave policy filters" className="workspace-filter-form--three" pending={filterPending || pending} updateMode="scoped" onSubmit={(event) => { event.preventDefault(); commitFilters(draft); }}>
          <label className="form-field">
            <span>Search</span>
            <input className="input-control" name="q" placeholder="Policy name, code, type, status" type="search" value={draft.q} onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))} />
          </label>
          <label className="form-field">
            <span>Status</span>
            <select className="input-control" name="status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All statuses</option>
              {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span>Leave type</span>
            <select className="input-control" name="leave_type" value={draft.leaveType} onChange={(event) => setDraft((current) => ({ ...current, leaveType: event.target.value }))}>
              <option value="">All leave types</option>
              {leaveTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <details className="attendance-more-filters">
            <summary className="button button--secondary">More filters</summary>
            <div className="attendance-more-filters__content">
              <label className="form-field">
                <span>Accrual frequency</span>
                <select className="input-control" name="accrual" value={draft.accrual} onChange={(event) => setDraft((current) => ({ ...current, accrual: event.target.value }))}>
                  <option value="">All accruals</option>
                  {accrualOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            </div>
          </details>
          <label className="form-field">
            <span>Sort by</span>
            <select className="input-control" name="sort" value={draft.sort} onChange={(event) => setDraft((current) => ({ ...current, sort: event.target.value }))}>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="status">Status</option>
              <option value="leave-type">Leave type</option>
              <option value="entitlement-desc">Highest entitlement</option>
            </select>
          </label>
          <div className="workspace-filter-actions">
            <button className="button button--primary" type="submit">Apply filters</button>
            <button className="button button--secondary" onClick={() => { const reset = { q: "", status: "", leaveType: "", accrual: "", sort: "name-asc" }; setDraft(reset); commitFilters(reset); }} type="button">Clear filters</button>
            {canManagePolicies && onOpenCreate ? <button className="button button--primary" disabled={pending} onClick={onOpenCreate} type="button">Create leave policy</button> : null}
          </div>
        </WorkspaceFilterForm>
      </section>

      {successMessage ? (
        <div className="notice notice--success" role="status">
          <strong>Policy updated.</strong>
          <span className="muted">{successMessage}</span>
        </div>
      ) : null}

      <div className="attendance-review-workbench">
        <section aria-busy={filterPending || pending || undefined} className="panel-card-soft attendance-directory-panel workspace-table-loading-owner">
          {filterPending || pending ? <div className="workspace-table-loading" role="status"><span aria-hidden="true" className="async-action-button__spinner" />Updating leave policies</div> : null}
          <WorkspaceTableScrollRegion className="attendance-directory-table-wrap workspace-table-region" label="Leave policies table scroll">
            <table aria-label="Leave policies" className="accerio-data-table workspace-table attendance-directory-table">
              <thead>
                <tr>
                  <th scope="col">Policy</th>
                  <th scope="col">Leave type</th>
                  <th scope="col">Entitlement</th>
                  <th scope="col">Accrual</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {visiblePolicies.map((item) => {
                  const isSelected = selectedDetail?.id === item.id;
                  return (
                  <tr aria-selected={isSelected} className={isSelected ? "is-selected" : ""} key={item.id}>
                    <td>
                      <div className="workspace-table__primary-cell">
                        <strong>{item.name}</strong>
                        <span>{item.code}</span>
                      </div>
                    </td>
                    <td>{item.leave_type}</td>
                    <td>{item.annual_entitlement} units</td>
                    <td>{item.accrual_frequency}</td>
                    <td><WorkspaceStatusBadge tone={normalized(item.status) === "active" ? "success" : "neutral"}>{item.status}</WorkspaceStatusBadge></td>
                    <td><button aria-label="Inspect" title={`Inspect ${item.name}`} ref={(node) => { if (isSelected && node) inspectTriggerRef.current = node; }} className="button button--secondary button--compact button--icon" onClick={(event) => { focusActionTrigger(event); inspectTriggerRef.current = event.currentTarget; event.stopPropagation(); setSelectedPolicyId(item.id); }} type="button">...</button></td>
                  </tr>
                  );
                })}
                {filteredPolicies.length === 0 ? (
                  <tr><td colSpan={6}><strong>No leave policies match these filters.</strong><span>Clear filters to restore the catalog.</span></td></tr>
                ) : null}
              </tbody>
            </table>
          </WorkspaceTableScrollRegion>

        </section>

        {filteredPolicies.length > 0 ? <PaginationBar navigationMode="scoped" pending={filterPending || pending} page={currentPage} pageSize={pageSize} totalCount={filteredPolicies.length} hasPrevious={currentPage > 1} hasNext={currentPage < pageCount} onFirst={() => setPage(1)} onPrevious={() => setPage((value) => Math.max(1, value - 1))} onNext={() => setPage((value) => Math.min(pageCount, value + 1))} onLast={() => setPage(pageCount)} /> : null}

        {selectedDetail ? (
          <HrAdminActionModal closeHref="/hr-admin/leave-policies" description="Review entitlement, eligibility, governance, and linked-record actions without leaving the catalog." eyebrow="Leave policy inspection" labelledBy="leave-policy-detail-title" onClose={() => { setSelectedPolicyId(""); window.requestAnimationFrame(() => inspectTriggerRef.current?.focus({ preventScroll: true })); }} title="Leave policy detail">
          <aside id="leave-setup-detail" tabIndex={-1} aria-label="Leave policy detail">
              <div className="queue-toolbar__header">
                <div>
                  <h2 className="section-heading-soft">Leave policy detail</h2>
                  <p className="section-copy section-copy-soft">Focused entitlement, eligibility, and governance state.</p>
                </div>
              </div>
              <article className="record-card record-card--compact">
                <div className="record-card__header">
                  <div>
                    <h3>{selectedDetail.name}</h3>
                    <p className="section-copy section-copy-soft">{selectedDetail.code} · {selectedDetail.leave_type}</p>
                  </div>
                  <WorkspaceStatusBadge tone={normalized(selectedDetail.status) === "active" ? "success" : "neutral"}>{selectedDetail.status}</WorkspaceStatusBadge>
                </div>
                <div className="record-card__eyebrow">
                  <WorkspaceStatusBadge tone="info">{selectedDetail.accrual_frequency}</WorkspaceStatusBadge>
                  <PlatformGovernanceCard item={selectedDetail} />
                </div>
              </article>
              <div className="record-card__actions">
                {canManagePolicies ? <button className="button button--primary" disabled={pending} onClick={(event) => { focusActionTrigger(event); onOpenEdit?.(selectedDetail.id); }} type="button">Edit leave policy</button> : null}
                {canManagePolicies ? <button className="button button--ghost" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); openRemoveDialog(selectedDetail); }} type="button">Removal options</button> : null}
              </div>
              <details className="record-card" open>
                <summary>Entitlement</summary>
                <div className="detail-grid">
                  <div className="detail-row"><span className="detail-label">Annual entitlement</span><span className="detail-value">{selectedDetail.annual_entitlement} units</span></div>
                  <div className="detail-row"><span className="detail-label">Accrual frequency</span><span className="detail-value">{selectedDetail.accrual_frequency}</span></div>
                </div>
              </details>
              <details className="record-card" open>
                <summary>Effective period</summary>
                <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Effective from</span><span className="detail-value">{selectedDetail.effective_from || "Not set"}</span></div>
                <div className="detail-row"><span className="detail-label">Effective to</span><span className="detail-value">{selectedDetail.effective_to || "Open ended"}</span></div>
                </div>
              </details>
              <details className="record-card" open>
                <summary>Eligibility and calculation</summary>
                <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Sandwich rule</span><span className="detail-value">{selectedDetail.sandwich_rule_enabled ? "Enabled" : "Disabled"}</span></div>
                <div className="detail-row"><span className="detail-label">Probation eligible</span><span className="detail-value">{selectedDetail.is_probation_eligible ? "Yes" : "No"}</span></div>
                <div className="detail-row"><span className="detail-label">Minimum service</span><span className="detail-value">{selectedDetail.minimum_service_days} days</span></div>
                </div>
              </details>
              <details className="record-card" open>
                <summary>Approval</summary>
                <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Automatic approval</span><span className="detail-value">{selectedDetail.config_snapshot.approval.auto_approve_enabled ? `${selectedDetail.config_snapshot.approval.auto_approve_after_hours} elapsed hours per step` : "Disabled"}</span></div>
                </div>
              </details>
              <PlatformGovernanceNotice item={selectedDetail} />
          </aside>
          </HrAdminActionModal>
        ) : null}
      </div>

      {selectedPolicy ? (
        <HrAdminActionModal
          closeHref="/hr-admin/leave-policies"
          description="The system checks usage before allowing permanent deletion. Used policies should be archived for audit history."
          eyebrow="Policy removal check"
          labelledBy={`leave-policy-remove-${selectedPolicy.id}`}
          onClose={closeRemoveDialog}
          title={selectedPolicy.name}
        >
            {isImpactLoading ? (
              <div className="notice">
                <strong>Checking impact.</strong>
                <span className="muted">Reviewing assignments, balances, requests, and transactions.</span>
              </div>
            ) : null}

            {impact ? (
              <div className="detail-grid">
                <div className={`notice detail-row--full ${impact.can_delete ? "notice--success" : ""}`}>
                  <strong>{impact.can_delete ? "Permanent delete is available" : "Archive is recommended"}</strong>
                  <span className="muted">{impact.summary}</span>
                </div>
                <div className="detail-row"><span className="detail-label">Active assignments</span><span className="detail-value">{impact.active_assignment_count}</span></div>
                <div className="detail-row"><span className="detail-label">Total assignments</span><span className="detail-value">{impact.assignment_count}</span></div>
                <div className="detail-row"><span className="detail-label">Balances</span><span className="detail-value">{impact.balance_count}</span></div>
                <div className="detail-row"><span className="detail-label">Leave requests</span><span className="detail-value">{impact.leave_request_count}</span></div>
                <div className="detail-row"><span className="detail-label">Pending/draft requests</span><span className="detail-value">{impact.pending_request_count}</span></div>
                <div className="detail-row"><span className="detail-label">Ledger transactions</span><span className="detail-value">{impact.transaction_count}</span></div>
                {impact.warnings.length ? (
                  <div className="notice detail-row--full">
                    <strong>Important notes</strong>
                    <span className="muted">{impact.warnings.join(" ")}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {actionError ? (
              <div className="notice notice--error" role="alert">
                <strong>Action failed.</strong>
                <span className="muted">{actionError}</span>
              </div>
            ) : null}

            <div className="form-actions-bar">
              <span className="muted">Archive removes the policy from active use while preserving audit links. Delete is only available for unused policies.</span>
              <div className="form-actions-bar__buttons">
                <AsyncActionButton className="button button--secondary" disabled={!impact?.can_archive} pending={isActionSubmitting || pending} pendingLabel={pending ? "Refreshing policies" : "Archiving policy"} onClick={() => submitPolicyRemoval("archive")} type="button">Archive policy</AsyncActionButton>
                <AsyncActionButton className="button button--primary" disabled={!impact?.can_delete} pending={isActionSubmitting || pending} pendingLabel={pending ? "Refreshing policies" : "Deleting policy"} onClick={() => submitPolicyRemoval("delete")} type="button">Delete permanently</AsyncActionButton>
              </div>
            </div>
        </HrAdminActionModal>
      ) : null}
    </section>
  );
}
