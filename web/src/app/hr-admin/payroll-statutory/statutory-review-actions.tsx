"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AsyncActionButton } from "@/components/patterns/async-action-button";
import type { HrAdminEmployeeStatutoryDeclaration, HrAdminEmployeeStatutoryDeclarationItem } from "@/lib/types";

type Props = {
  canLock: boolean;
  declaration: HrAdminEmployeeStatutoryDeclaration;
  proofItems: HrAdminEmployeeStatutoryDeclarationItem[];
};

function apiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string") return record.detail;
  const first = Object.values(record)[0];
  if (typeof first === "string") return first;
  if (Array.isArray(first) && typeof first[0] === "string") return first[0];
  return fallback;
}

export function StatutoryReviewActions({ canLock, declaration, proofItems }: Props) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [declarationRejectionReason, setDeclarationRejectionReason] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [reopenApprovalReference, setReopenApprovalReference] = useState("");

  async function runAction(actionKey: string, label: string, endpoint: string, payload: Record<string, unknown> = {}) {
    setPendingAction(actionKey);
    setFeedback(null);
    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback({ message: apiErrorMessage(result, `${label} could not be completed.`), tone: "error" });
        return;
      }
      setFeedback({ message: `${label} completed.`, tone: "success" });
      router.refresh();
    } catch {
      setFeedback({ message: "Unable to reach the server. Check the connection and try again.", tone: "error" });
    } finally {
      setPendingAction("");
    }
  }

  const declarationCanBeReviewed = declaration.status === "submitted";
  const declarationCanBeRejected = declaration.status === "submitted" || declaration.status === "verified";
  const actionInProgress = Boolean(pendingAction);

  return (
    <section className="payroll-rule-source-card" aria-labelledby="statutory-review-actions-title">
      <span className="workspace-card__eyebrow">HR proof review</span>
      <h3 id="statutory-review-actions-title">Review submitted evidence</h3>
      <p className="section-copy section-copy-soft">Proof decisions are recorded separately from the declaration lock controlled by Payroll Approval.</p>

      <div className="payroll-statutory-proof-list">
        {proofItems.map((item) => {
          const canDecide = !actionInProgress && declarationCanBeReviewed && ["pending", "submitted", "rejected"].includes(item.proof_status);
          const reason = rejectionReasons[item.id] ?? "";
          return (
            <article className="payroll-statutory-proof-card" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.section_code} / {item.component_code || item.item_kind_label}</span>
              </div>
              <span className={`readiness-badge readiness-badge--${item.proof_status}`}>{item.proof_status_label}</span>
              <label className="form-field">
                <span>Rejection reason</span>
                <input
                  className="input-control"
                  disabled={!canDecide}
                  onChange={(event) => setRejectionReasons((current) => ({ ...current, [item.id]: event.target.value }))}
                  placeholder="Required when rejecting proof"
                  value={reason}
                />
              </label>
              <div className="button-row">
                <AsyncActionButton
                  className="button button--secondary button--compact"
                  disabled={!canDecide}
                  onClick={() => void runAction(`verify-${item.id}`, "Proof verification", `/api/hr-admin/employee-statutory-declaration-items/${item.id}/verify`, { verified_amount: item.declared_amount, proof_status: "verified" })}
                  pending={pendingAction === `verify-${item.id}`}
                  pendingLabel="Verifying proof"
                  type="button"
                >
                  Verify proof
                </AsyncActionButton>
                <AsyncActionButton
                  className="button button--secondary button--compact"
                  disabled={!canDecide || !reason.trim()}
                  onClick={() => void runAction(`reject-${item.id}`, "Proof rejection", `/api/hr-admin/employee-statutory-declaration-items/${item.id}/verify`, { proof_status: "rejected", rejection_reason: reason.trim() })}
                  pending={pendingAction === `reject-${item.id}`}
                  pendingLabel="Rejecting proof"
                  type="button"
                >
                  Reject proof
                </AsyncActionButton>
              </div>
            </article>
          );
        })}
      </div>

      <label className="form-field">
        <span>Declaration rejection reason</span>
        <input className="input-control" disabled={actionInProgress || !declarationCanBeRejected} onChange={(event) => setDeclarationRejectionReason(event.target.value)} placeholder="Required when returning the declaration" value={declarationRejectionReason} />
      </label>
      <div className="button-row">
        <AsyncActionButton className="button button--secondary" disabled={actionInProgress || !declarationCanBeReviewed} onClick={() => void runAction("verify-declaration", "Declaration verification", `/api/hr-admin/employee-statutory-declarations/${declaration.id}/verify`)} pending={pendingAction === "verify-declaration"} pendingLabel="Verifying declaration" type="button">Verify declaration</AsyncActionButton>
        <AsyncActionButton className="button button--secondary" disabled={actionInProgress || !declarationCanBeRejected || !declarationRejectionReason.trim()} onClick={() => void runAction("reject-declaration", "Declaration rejection", `/api/hr-admin/employee-statutory-declarations/${declaration.id}/reject`, { reason: declarationRejectionReason.trim() })} pending={pendingAction === "reject-declaration"} pendingLabel="Returning declaration" type="button">Return to employee</AsyncActionButton>
        {canLock ? <AsyncActionButton className="button button--primary" disabled={actionInProgress || declaration.status !== "verified"} onClick={() => void runAction("lock-declaration", "Declaration lock", `/api/hr-admin/employee-statutory-declarations/${declaration.id}/lock`)} pending={pendingAction === "lock-declaration"} pendingLabel="Locking declaration" type="button">Lock for payroll</AsyncActionButton> : null}
      </div>
      {canLock && ["verified", "locked"].includes(declaration.status) ? (
        <div className="detail-grid detail-grid-soft">
          <strong>Governed reopening</strong>
          <p className="section-copy section-copy-soft">Return an open-year declaration for correction only with an approved change reference. Closed financial years remain immutable.</p>
          <label className="form-field">
            <span>Reopen reason</span>
            <textarea className="input-control" disabled={actionInProgress} onChange={(event) => setReopenReason(event.target.value)} placeholder="Explain the correction required" value={reopenReason} />
          </label>
          <label className="form-field">
            <span>Approval reference</span>
            <input className="input-control" disabled={actionInProgress} onChange={(event) => setReopenApprovalReference(event.target.value)} placeholder="Change or approval reference" value={reopenApprovalReference} />
          </label>
          <AsyncActionButton
            className="button button--secondary"
            disabled={actionInProgress || reopenReason.trim().length < 8 || reopenApprovalReference.trim().length < 3}
            onClick={() => void runAction("reopen-declaration", "Declaration reopening", `/api/hr-admin/employee-statutory-declarations/${declaration.id}/reopen`, { reason: reopenReason.trim(), approval_reference: reopenApprovalReference.trim() })}
            pending={pendingAction === "reopen-declaration"}
            pendingLabel="Reopening declaration"
            type="button"
          >
            Reopen for correction
          </AsyncActionButton>
        </div>
      ) : null}
      {feedback ? <div className={`notice notice--${feedback.tone}`} role={feedback.tone === "success" ? "status" : "alert"}>{feedback.message}</div> : null}
    </section>
  );
}
