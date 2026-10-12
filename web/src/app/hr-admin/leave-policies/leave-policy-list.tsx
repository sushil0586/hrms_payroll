"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ActionToast } from "@/components/patterns/action-toast";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PlatformGovernanceCard, PlatformGovernanceNotice } from "@/components/patterns/platform-governance-card";
import { WorkspaceFilterBar, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
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
  const [selectedPolicyId, setSelectedPolicyId] = useState(policies[0]?.id ?? "");
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

  const activeCount = policies.filter((item) => normalized(item.status) === "active").length;
  const selectedDetail = filteredPolicies.find((item) => item.id === selectedPolicyId) ?? null;

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
      <div className="attendance-summary-strip" aria-label="Leave policy summary">
        <span><strong>{policies.length}</strong> policies</span>
        <span><strong>{activeCount}</strong> active</span>
        <span><strong>{policies.length - activeCount}</strong> inactive or draft</span>
      </div>

      <div className="workspace-data-panel">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Leave policy catalog</h2>
            <p className="section-copy section-copy-soft">Find a policy, inspect details, then edit or remove with the existing checks.</p>
          </div>
          <span className="queue-summary-chip"><strong>{filteredPolicies.length}</strong> shown</span>
        </div>
        <WorkspaceFilterBar>
          <label className="form-field">
            <span>Search</span>
            <input className="input-control" onChange={(event) => setQuery(event.target.value)} placeholder="Policy name, code, type, status" value={query} />
          </label>
          <label className="form-field">
            <span>Status</span>
            <select className="input-control" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="">All statuses</option>
              {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span>Leave type</span>
            <select className="input-control" onChange={(event) => setLeaveType(event.target.value)} value={leaveType}>
              <option value="">All leave types</option>
              {leaveTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <details className="attendance-more-filters">
            <summary className="button button--secondary">More filters</summary>
            <div className="attendance-more-filters__content">
              <label className="form-field">
                <span>Accrual frequency</span>
                <select className="input-control" onChange={(event) => setAccrualFrequency(event.target.value)} value={accrualFrequency}>
                  <option value="">All accruals</option>
                  {accrualOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            </div>
          </details>
          <div className="filter-actions">
            <button className="button button--primary" type="button">Apply filters</button>
            <button className="button button--secondary" onClick={clearFilters} type="button">Clear</button>
          </div>
        </WorkspaceFilterBar>

        {successMessage ? (
          <div className="notice notice--success" role="status">
            <strong>Policy updated.</strong>
            <span className="muted">{successMessage}</span>
          </div>
        ) : null}

        <div className="employee-directory-layout">
          <div className="employee-directory-table-wrap">
            <table className="workspace-table attendance-directory-table">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Leave type</th>
                  <th>Entitlement</th>
                  <th>Accrual</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.map((item) => (
                  <tr className={selectedDetail?.id === item.id ? "table-row--selected" : ""} key={item.id}>
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
                    <td><button className="button button--secondary" onClick={() => setSelectedPolicyId(item.id)} type="button">Inspect</button></td>
                  </tr>
                ))}
                {filteredPolicies.length === 0 ? (
                  <tr><td colSpan={6}>No leave policies match the current filters.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {selectedDetail ? (
            <aside className="panel-card-soft attendance-detail-drawer" aria-label="Leave policy detail">
              <div className="record-card__header">
                <div>
                  <h2>{selectedDetail.name}</h2>
                  <p className="section-copy section-copy-soft">{selectedDetail.code} · {selectedDetail.leave_type}</p>
                </div>
                <div className="record-card__actions">
                  <button className="button button--secondary" onClick={() => setSelectedPolicyId("")} type="button">Close</button>
                  {canManagePolicies ? (
                    <Link className="button button--secondary" href={`/hr-admin/leave-policies?editLeavePolicy=${selectedDetail.id}`}>
                      Edit
                    </Link>
                  ) : null}
                  {canManagePolicies ? <button className="button button--ghost" onClick={() => openRemoveDialog(selectedDetail)} type="button">Remove</button> : null}
                </div>
              </div>
              <div className="record-card__eyebrow">
                <WorkspaceStatusBadge tone={normalized(selectedDetail.status) === "active" ? "success" : "neutral"}>{selectedDetail.status}</WorkspaceStatusBadge>
                <WorkspaceStatusBadge tone="info">{selectedDetail.accrual_frequency}</WorkspaceStatusBadge>
                <PlatformGovernanceCard item={selectedDetail} />
              </div>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Annual entitlement</span><span className="detail-value">{selectedDetail.annual_entitlement} units</span></div>
                <div className="detail-row"><span className="detail-label">Effective from</span><span className="detail-value">{selectedDetail.effective_from || "Not set"}</span></div>
                <div className="detail-row"><span className="detail-label">Effective to</span><span className="detail-value">{selectedDetail.effective_to || "Open ended"}</span></div>
                <div className="detail-row"><span className="detail-label">Sandwich rule</span><span className="detail-value">{selectedDetail.sandwich_rule_enabled ? "Enabled" : "Disabled"}</span></div>
                <div className="detail-row"><span className="detail-label">Probation eligible</span><span className="detail-value">{selectedDetail.is_probation_eligible ? "Yes" : "No"}</span></div>
                <div className="detail-row"><span className="detail-label">Minimum service</span><span className="detail-value">{selectedDetail.minimum_service_days} days</span></div>
              </div>
              <PlatformGovernanceNotice item={selectedDetail} />
            </aside>
          ) : null}
        </div>
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
                <button className="button button--secondary" disabled={isActionSubmitting || !impact?.can_archive} onClick={() => submitPolicyRemoval("archive")} type="button">
                  {isActionSubmitting ? "Working..." : "Archive policy"}
                </button>
                <button className="button button--primary" disabled={isActionSubmitting || !impact?.can_delete} onClick={() => submitPolicyRemoval("delete")} type="button">
                  Delete permanently
                </button>
              </div>
            </div>
        </HrAdminActionModal>
      ) : null}
    </section>
  );
}
