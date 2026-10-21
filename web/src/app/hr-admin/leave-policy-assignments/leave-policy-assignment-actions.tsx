"use client";

import { mutationErrorMessage, networkMutationMessage } from "@/lib/ui/api-error-message";

import { useEffect, useState } from "react";

import { ActionToast } from "@/components/patterns/action-toast";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { useRefreshAfterMutation } from "@/lib/ui/use-refresh-after-mutation";

type Props = {
  assignmentId: string;
  isActive: boolean;
  policyName: string;
  onChanged?: () => Promise<void>;
};

function getErrorMessage(payload: unknown, status: number) {
  return mutationErrorMessage(payload, status, 'Unable to update this assignment. Refresh and review its current state.');
}

export function LeavePolicyAssignmentActions({ assignmentId, isActive, policyName, onChanged }: Props) {
  const { isRefreshing, refresh } = useRefreshAfterMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);

  function closeDialog() {
    if (isSubmitting || isRefreshing) return;
    setDialogOpen(false);
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
      const response = await fetch(`/api/hr-admin/leave-policy-assignments/${assignmentId}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: action === "delete" ? undefined : { "Content-Type": "application/json" },
        body: action === "delete" ? undefined : JSON.stringify({ is_active: false }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = getErrorMessage(payload, response.status);
        setError(message);
        setToast({ title: "Action needs attention.", message, tone: "error" });
        return;
      }
      const message = action === "delete" ? "Leave assignment removed." : "Leave assignment deactivated.";
      setSuccessMessage(message);
      setToast({ title: "Assignment updated.", message, tone: "success" });
      setDialogOpen(false);
      if (onChanged) void onChanged(); else refresh();
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
      {successMessage ? (
        <span className="record-chip record-chip--success" role="status">
          {successMessage}
        </span>
      ) : null}
      <button className="button button--ghost" onClick={() => setDialogOpen(true)} type="button">
        Remove
      </button>
      {dialogOpen ? (
        <HrAdminActionModal
          closeHref="/hr-admin/leave-policy-assignments"
          description="Deactivate when HR may need the scope history. Delete only when this assignment was created by mistake."
          eyebrow="Assignment removal"
          labelledBy={`leave-assignment-remove-${assignmentId}`}
          onClose={closeDialog}
          title={policyName}
        >
            <div className="notice">
              <strong>{isActive ? "Active assignment" : "Inactive assignment"}</strong>
              <span className="muted">
                {isActive
                  ? "Deactivation removes this scope from policy resolution while keeping the record visible."
                  : "This assignment is already inactive, so permanent removal is available if HR no longer needs it on the setup screen."}
              </span>
            </div>
            {error ? (
              <div className="notice notice--error" role="alert">
                <strong>Action needs attention.</strong>
                <span className="muted">{error}</span>
              </div>
            ) : null}
            <div className="form-actions-bar">
              <span className="muted">This action does not delete leave requests, balances, or the leave policy itself.</span>
              <div className="form-actions-bar__buttons">
                <AsyncActionButton className="button button--secondary" disabled={!isActive} pending={isSubmitting || isRefreshing} pendingLabel={isRefreshing ? "Refreshing assignments" : "Deactivating assignment"} onClick={() => submit("deactivate")} type="button">Deactivate</AsyncActionButton>
                <AsyncActionButton className="button button--primary" pending={isSubmitting || isRefreshing} pendingLabel={isRefreshing ? "Refreshing assignments" : "Deleting assignment"} onClick={() => submit("delete")} type="button">Delete assignment</AsyncActionButton>
              </div>
            </div>
        </HrAdminActionModal>
      ) : null}
    </>
  );
}
