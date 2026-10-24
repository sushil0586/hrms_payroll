"use client";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";


import { apiErrorMessage, mutationErrorMessage, networkMutationMessage } from "@/lib/ui/api-error-message";

import { useEffect, useState } from "react";

import { ActionToast } from "@/components/patterns/action-toast";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { useRefreshAfterMutation } from "@/lib/ui/use-refresh-after-mutation";
import type { HrAdminLeaveTypeImpact } from "@/lib/types";

type Props = {
  isActive: boolean;
  leaveTypeId: string;
  leaveTypeName: string;
};

function errorMessage(payload: unknown, status: number) {
  return mutationErrorMessage(payload, status, 'Unable to update this leave type. Refresh and review its linked records.');
}

export function LeaveTypeActions({ isActive, leaveTypeId, leaveTypeName }: Props) {
  const { isRefreshing, refresh } = useRefreshAfterMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [impact, setImpact] = useState<HrAdminLeaveTypeImpact | null>(null);
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);

  async function openDialog() {
    setDialogOpen(true);
    setImpact(null);
    setError("");
    setSuccessMessage("");
    setIsLoadingImpact(true);
    try {
      const response = await fetch(`/api/hr-admin/leave-types/${leaveTypeId}/impact`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = response.status >= 500 ? "Removal impact is unavailable. No removal was submitted. Close this dialog and retry the impact check." : apiErrorMessage(payload, "Unable to load removal impact. Close this dialog and try again.");
        setError(message);
        setToast({ title: "Action needs attention.", message, tone: "error" });
        return;
      }
      setImpact(payload as HrAdminLeaveTypeImpact);
    } catch {
      const message = "Unable to load the removal impact. Check your connection and reopen this dialog to retry.";
      setError(message);
      setToast({ title: "Action needs attention.", message, tone: "error" });
    } finally {
      setIsLoadingImpact(false);
    }
  }

  function closeDialog() {
    if (isSubmitting || isRefreshing) return;
    setDialogOpen(false);
    setImpact(null);
    setError("");
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), toast.tone === "error" ? 8000 : 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function submit(action: "deactivate" | "delete") {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/hr-admin/leave-types/${leaveTypeId}/${action}`, {
        method: action === "delete" ? "DELETE" : "POST",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = errorMessage(payload, response.status);
        setImpact((payload as HrAdminLeaveTypeImpact) ?? impact);
        setError(message);
        setToast({ title: "Action needs attention.", message, tone: "error" });
        return;
      }
      const message = action === "delete" ? "Leave type deleted." : "Leave type deactivated.";
      setSuccessMessage(message);
      setToast({ title: "Leave type updated.", message, tone: "success" });
      setDialogOpen(false);
      setImpact(null);
      refresh();
    } catch {
      const message = networkMutationMessage;
      setError(message);
      setToast({ title: "Action needs attention.", message, tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
      {successMessage ? <span className="record-chip record-chip--success" role="status">{successMessage}</span> : null}
      <button className="button button--ghost" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); openDialog(); }} type="button">Remove</button>
      {dialogOpen ? (
        <HrAdminActionModal
          closeHref="/hr-admin/leave-types"
          description="The system checks linked policies and leave history before allowing a permanent delete."
          eyebrow="Leave type removal check"
          labelledBy={`leave-type-remove-${leaveTypeId}`}
          onClose={closeDialog}
          title={leaveTypeName}
        >
            {isLoadingImpact ? (
              <div className="notice"><strong>Checking impact.</strong><span className="muted">Reviewing policies, leave requests, balances, and transactions.</span></div>
            ) : null}
            {impact ? (
              <div className="detail-grid">
                <div className={`notice detail-row--full ${impact.can_delete ? "notice--success" : ""}`}>
                  <strong>{impact.can_delete ? "Permanent delete is available" : "Deactivate is recommended"}</strong>
                  <span className="muted">{impact.summary}</span>
                </div>
                <div className="detail-row"><span className="detail-label">Policies</span><span className="detail-value">{impact.policy_count}</span></div>
                <div className="detail-row"><span className="detail-label">Active policies</span><span className="detail-value">{impact.active_policy_count}</span></div>
                <div className="detail-row"><span className="detail-label">Leave requests</span><span className="detail-value">{impact.leave_request_count}</span></div>
                <div className="detail-row"><span className="detail-label">Balances</span><span className="detail-value">{impact.balance_count}</span></div>
                <div className="detail-row"><span className="detail-label">Ledger transactions</span><span className="detail-value">{impact.transaction_count}</span></div>
                {impact.warnings.length ? (
                  <div className="notice detail-row--full"><strong>Important notes</strong><span className="muted">{impact.warnings.join(" ")}</span></div>
                ) : null}
              </div>
            ) : null}
            {error ? <div className="notice notice--error" role="alert"><strong>Action needs attention.</strong><span className="muted">{error}</span></div> : null}
            <div className="form-actions-bar">
              <span className="muted">Deactivate hides this leave type from new use while keeping linked history intact.</span>
              <div className="form-actions-bar__buttons">
                <AsyncActionButton className="button button--secondary" disabled={!impact?.can_deactivate || !isActive} pending={isSubmitting || isRefreshing} pendingLabel={isRefreshing ? "Refreshing leave types" : "Deactivating leave type"} onClick={() => submit("deactivate")} type="button">Deactivate</AsyncActionButton>
                <AsyncActionButton className="button button--primary" disabled={!impact?.can_delete} pending={isSubmitting || isRefreshing} pendingLabel={isRefreshing ? "Refreshing leave types" : "Deleting leave type"} onClick={() => submit("delete")} type="button">Delete permanently</AsyncActionButton>
              </div>
            </div>
        </HrAdminActionModal>
      ) : null}
    </>
  );
}
