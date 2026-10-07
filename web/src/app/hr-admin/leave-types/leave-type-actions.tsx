"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ActionToast } from "@/components/patterns/action-toast";
import type { HrAdminLeaveTypeImpact } from "@/lib/types";

type Props = {
  isActive: boolean;
  leaveTypeId: string;
  leaveTypeName: string;
};

function errorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to update this leave type.";
  return String((payload as Record<string, unknown>).detail || (payload as Record<string, unknown>).summary || "Unable to update this leave type.");
}

export function LeaveTypeActions({ isActive, leaveTypeId, leaveTypeName }: Props) {
  const router = useRouter();
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
    const response = await fetch(`/api/hr-admin/leave-types/${leaveTypeId}/impact`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = errorMessage(payload);
      setError(message);
      setToast({ title: "Action failed.", message, tone: "error" });
      setIsLoadingImpact(false);
      return;
    }
    setImpact(payload as HrAdminLeaveTypeImpact);
    setIsLoadingImpact(false);
  }

  function closeDialog() {
    if (isSubmitting) return;
    setDialogOpen(false);
    setImpact(null);
    setError("");
  }

  useEffect(() => {
    if (!dialogOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        setDialogOpen(false);
        setImpact(null);
        setError("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialogOpen, isSubmitting]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function submit(action: "deactivate" | "delete") {
    setIsSubmitting(true);
    setError("");
    const response = await fetch(`/api/hr-admin/leave-types/${leaveTypeId}/${action}`, {
      method: action === "delete" ? "DELETE" : "POST",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = errorMessage(payload);
      setImpact((payload as HrAdminLeaveTypeImpact) ?? impact);
      setError(message);
      setToast({ title: "Action failed.", message, tone: "error" });
      setIsSubmitting(false);
      return;
    }
    const message = action === "delete" ? "Leave type deleted." : "Leave type deactivated.";
    setSuccessMessage(message);
    setToast({ title: "Leave type updated.", message, tone: "success" });
    setIsSubmitting(false);
    setDialogOpen(false);
    setImpact(null);
    window.setTimeout(() => router.refresh(), 900);
  }

  return (
    <>
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
      {successMessage ? <span className="record-chip record-chip--success" role="status">{successMessage}</span> : null}
      <button className="button button--ghost" onClick={openDialog} type="button">Remove</button>
      {dialogOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section aria-label={`Remove ${leaveTypeName}`} aria-modal="true" className="modal-panel modal-panel--wide" role="dialog">
            <div className="modal-panel__header">
              <div>
                <p className="section-eyebrow">Leave type removal check</p>
                <h2 className="section-heading-soft">{leaveTypeName}</h2>
                <p className="section-copy section-copy-soft">The system checks linked policies and leave history before allowing a permanent delete.</p>
              </div>
              <button className="button button--secondary" disabled={isSubmitting} onClick={closeDialog} type="button">Close</button>
            </div>
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
            {error ? <div className="notice notice--error" role="alert"><strong>Action failed.</strong><span className="muted">{error}</span></div> : null}
            <div className="form-actions-bar">
              <span className="muted">Deactivate hides this leave type from new use while keeping linked history intact.</span>
              <div className="form-actions-bar__buttons">
                <button className="button button--secondary" disabled={isSubmitting || !impact?.can_deactivate || !isActive} onClick={() => submit("deactivate")} type="button">
                  {isSubmitting ? "Working..." : "Deactivate"}
                </button>
                <button className="button button--primary" disabled={isSubmitting || !impact?.can_delete} onClick={() => submit("delete")} type="button">
                  Delete permanently
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
