"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ActionToast } from "@/components/patterns/action-toast";
import { PlatformGovernanceCard, PlatformGovernanceNotice } from "@/components/patterns/platform-governance-card";
import type { HrAdminLeavePolicy, HrAdminLeavePolicyImpact } from "@/lib/types";

type Props = {
  canManagePolicies: boolean;
  policies: HrAdminLeavePolicy[];
};

function normalized(value: string) {
  return value.trim().toLowerCase();
}

function uniqueValues(items: string[]) {
  return [...new Set(items.filter(Boolean))].sort((first, second) => first.localeCompare(second));
}

export function LeavePolicyList({ canManagePolicies, policies }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [accrualFrequency, setAccrualFrequency] = useState("");
  const [selectedPolicy, setSelectedPolicy] = useState<HrAdminLeavePolicy | null>(null);
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
    const search = normalized(query);
    return policies.filter((item) => {
      const matchesQuery = !search || [item.name, item.code, item.leave_type, item.status, item.accrual_frequency].some((value) => normalized(value).includes(search));
      const matchesStatus = !status || item.status === status;
      const matchesLeaveType = !leaveType || item.leave_type === leaveType;
      const matchesAccrual = !accrualFrequency || item.accrual_frequency === accrualFrequency;
      return matchesQuery && matchesStatus && matchesLeaveType && matchesAccrual;
    });
  }, [accrualFrequency, leaveType, policies, query, status]);

  function clearFilters() {
    setQuery("");
    setStatus("");
    setLeaveType("");
    setAccrualFrequency("");
  }

  async function openRemoveDialog(policy: HrAdminLeavePolicy) {
    setSelectedPolicy(policy);
    setImpact(null);
    setActionError("");
    setSuccessMessage("");
    setIsImpactLoading(true);
    const response = await fetch(`/api/hr-admin/leave-policies/${policy.id}/impact`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = String(payload.detail || "Unable to load policy impact.");
      setActionError(message);
      setToast({ title: "Action failed.", message, tone: "error" });
      setIsImpactLoading(false);
      return;
    }
    setImpact(payload as HrAdminLeavePolicyImpact);
    setIsImpactLoading(false);
  }

  function closeRemoveDialog() {
    if (isActionSubmitting) return;
    setSelectedPolicy(null);
    setImpact(null);
    setActionError("");
  }

  useEffect(() => {
    if (!selectedPolicy) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!isActionSubmitting) {
          setSelectedPolicy(null);
          setImpact(null);
          setActionError("");
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPolicy, isActionSubmitting]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function submitPolicyRemoval(action: "archive" | "delete") {
    if (!selectedPolicy) return;
    setIsActionSubmitting(true);
    setActionError("");
    const response = await fetch(`/api/hr-admin/leave-policies/${selectedPolicy.id}/${action}`, {
      method: action === "delete" ? "DELETE" : "POST",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = String(payload.detail || payload.summary || "Unable to update this policy.");
      setImpact((payload as { impact?: HrAdminLeavePolicyImpact }).impact ?? (payload as HrAdminLeavePolicyImpact));
      setActionError(message);
      setToast({ title: "Action failed.", message, tone: "error" });
      setIsActionSubmitting(false);
      return;
    }
    const message = action === "delete" ? "Leave policy deleted." : "Leave policy archived.";
    setSuccessMessage(message);
    setToast({ title: "Policy updated.", message, tone: "success" });
    setIsActionSubmitting(false);
    setSelectedPolicy(null);
    setImpact(null);
    window.setTimeout(() => router.refresh(), 900);
  }

  return (
    <section className="section queue-layout">
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
      <div className="queue-toolbar panel-card-soft">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Policy filters</h2>
            <p className="section-copy section-copy-soft">Find the right leave policy by name, type, status, or accrual behavior before editing.</p>
          </div>
          <span className="queue-summary-chip"><strong>{filteredPolicies.length}</strong> shown</span>
        </div>
        <div className="queue-toolbar__grid">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" onChange={(event) => setQuery(event.target.value)} placeholder="Policy name, code, type, status" value={query} />
          </label>
          <label className="form-field">
            <span className="muted">Status</span>
            <select className="input-control" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="">All statuses</option>
              {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Leave type</span>
            <select className="input-control" onChange={(event) => setLeaveType(event.target.value)} value={leaveType}>
              <option value="">All leave types</option>
              {leaveTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Accrual frequency</span>
            <select className="input-control" onChange={(event) => setAccrualFrequency(event.target.value)} value={accrualFrequency}>
              <option value="">All accruals</option>
              {accrualOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <div className="queue-toolbar__summary">
          <span className="queue-summary-chip"><strong>{policies.length}</strong> total</span>
          <span className="queue-summary-chip"><strong>{status || "Any"}</strong> status</span>
          <span className="queue-summary-chip"><strong>{leaveType || "Any"}</strong> leave type</span>
          <button className="button button--secondary" onClick={clearFilters} type="button">Clear filters</button>
        </div>
      </div>

      <div className="queue-list">
        {successMessage ? (
          <div className="notice notice--success" role="status">
            <strong>Policy updated.</strong>
            <span className="muted">{successMessage}</span>
          </div>
        ) : null}
        {filteredPolicies.map((item) => (
          <article className="record-card" key={item.id}>
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>{item.name}</h2>
                </div>
                <div className="record-card__eyebrow">
                  <span className="record-chip record-chip--accent">{item.leave_type}</span>
                  <span className="record-chip">{item.status}</span>
                  <span className="record-chip">{item.accrual_frequency}</span>
                  <PlatformGovernanceCard item={item} />
                </div>
                <p className="section-copy">{item.code}</p>
              </div>
              <div className="record-card__actions">
                {canManagePolicies ? (
                  <>
                    <Link className="button button--secondary" href={`/hr-admin/leave-policies/${item.id}/edit`}>
                      Edit
                    </Link>
                    <button className="button button--ghost" onClick={() => openRemoveDialog(item)} type="button">
                      Remove
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            <div className="detail-grid">
              <div className="detail-row">
                <span className="detail-label">Annual entitlement</span>
                <span className="detail-value">{item.annual_entitlement} units</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Accrual frequency</span>
                <span className="detail-value">{item.accrual_frequency}</span>
              </div>
            </div>
            <PlatformGovernanceNotice item={item} />
          </article>
        ))}
        {filteredPolicies.length === 0 ? (
          <div className="card panel">
            <strong>No leave policies match the current filters.</strong>
            <p className="section-copy section-copy-soft">Clear filters or broaden the search to review more policy records.</p>
          </div>
        ) : null}
      </div>

      {selectedPolicy ? (
        <div className="modal-backdrop" role="presentation">
          <section aria-modal="true" className="modal-panel modal-panel--wide" role="dialog" aria-label={`Remove ${selectedPolicy.name}`}>
            <div className="modal-panel__header">
              <div>
                <p className="section-eyebrow">Policy removal check</p>
                <h2 className="section-heading-soft">{selectedPolicy.name}</h2>
                <p className="section-copy section-copy-soft">The system checks usage before allowing permanent deletion. Used policies should be archived for audit history.</p>
              </div>
              <button className="button button--secondary" disabled={isActionSubmitting} onClick={closeRemoveDialog} type="button">Close</button>
            </div>

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
                <button className="button button--secondary" disabled={isActionSubmitting || !impact?.can_archive} onClick={() => submitPolicyRemoval("archive")} type="button">
                  {isActionSubmitting ? "Working..." : "Archive policy"}
                </button>
                <button className="button button--primary" disabled={isActionSubmitting || !impact?.can_delete} onClick={() => submitPolicyRemoval("delete")} type="button">
                  Delete permanently
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
