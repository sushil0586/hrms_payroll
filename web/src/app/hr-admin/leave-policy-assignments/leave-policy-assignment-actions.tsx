"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ActionToast } from "@/components/patterns/action-toast";

type Props = {
  assignmentId: string;
  isActive: boolean;
  policyName: string;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to update this assignment.";
  return String((payload as Record<string, unknown>).detail || "Unable to update this assignment.");
}

export function LeavePolicyAssignmentActions({ assignmentId, isActive, policyName }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);

  function closeDialog() {
    if (isSubmitting) return;
    setDialogOpen(false);
    setError("");
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!dialogOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        setDialogOpen(false);
        setError("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialogOpen, isSubmitting]);

  async function submit(action: "deactivate" | "delete") {
    setIsSubmitting(true);
    setError("");
    const response = await fetch(`/api/hr-admin/leave-policy-assignments/${assignmentId}`, {
      method: action === "delete" ? "DELETE" : "PATCH",
      headers: action === "delete" ? undefined : { "Content-Type": "application/json" },
      body: action === "delete" ? undefined : JSON.stringify({ is_active: false }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = getErrorMessage(payload);
      setError(message);
      setToast({ title: "Action failed.", message, tone: "error" });
      setIsSubmitting(false);
      return;
    }
    const message = action === "delete" ? "Leave assignment removed." : "Leave assignment deactivated.";
    setSuccessMessage(message);
    setToast({ title: "Assignment updated.", message, tone: "success" });
    setIsSubmitting(false);
    setDialogOpen(false);
    window.setTimeout(() => router.refresh(), 900);
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
        <div className="modal-backdrop" role="presentation">
          <section aria-label={`Remove ${policyName} assignment`} aria-modal="true" className="modal-panel" role="dialog">
            <div className="modal-panel__header">
              <div>
                <p className="section-eyebrow">Assignment removal</p>
                <h2 className="section-heading-soft">{policyName}</h2>
                <p className="section-copy section-copy-soft">Deactivate when HR may need the scope history. Delete only when this assignment was created by mistake.</p>
              </div>
              <button className="button button--secondary" disabled={isSubmitting} onClick={closeDialog} type="button">Close</button>
            </div>
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
                <strong>Action failed.</strong>
                <span className="muted">{error}</span>
              </div>
            ) : null}
            <div className="form-actions-bar">
              <span className="muted">This action does not delete leave requests, balances, or the leave policy itself.</span>
              <div className="form-actions-bar__buttons">
                <button className="button button--secondary" disabled={isSubmitting || !isActive} onClick={() => submit("deactivate")} type="button">
                  {isSubmitting ? "Working..." : "Deactivate"}
                </button>
                <button className="button button--primary" disabled={isSubmitting} onClick={() => submit("delete")} type="button">
                  Delete assignment
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
