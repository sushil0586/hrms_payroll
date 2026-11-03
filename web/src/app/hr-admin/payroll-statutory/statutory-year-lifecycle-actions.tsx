"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { HrAdminPayrollStatutoryPack } from "@/lib/types";

function lifecycleError(payload: unknown) {
  if (!payload || typeof payload !== "object") return "The financial-year action could not be completed.";
  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string") return record.detail;
  if (Array.isArray(record.readiness)) return record.readiness.join(" ");
  if (typeof record.readiness === "string") return record.readiness;
  if (Array.isArray(record.action)) return record.action.join(" ");
  return "The financial-year action could not be completed. Review readiness and try again.";
}

export function StatutoryYearLifecycleActions({
  canApprove,
  isOpen,
  onCompleted,
  packId,
  yearCode,
}: {
  canApprove: boolean;
  isOpen: boolean;
  onCompleted: (pack: HrAdminPayrollStatutoryPack) => void;
  packId: string;
  yearCode: string;
}) {
  const router = useRouter();
  const action = isOpen ? "close" : "reopen";
  const [reason, setReason] = useState("");
  const [approvalReference, setApprovalReference] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function submit() {
    setPending(true);
    setStatus(null);
    try {
      const response = await fetch(
        `/api/hr-admin/payroll-statutory-packs/${packId}/financial-years/${encodeURIComponent(yearCode)}/lifecycle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason, approval_reference: approvalReference }),
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(lifecycleError(payload));
      const returnedPack = payload && typeof payload === "object"
        ? (payload as { pack?: HrAdminPayrollStatutoryPack }).pack
        : undefined;
      if (!returnedPack) throw new Error("The financial-year action completed without returning the updated statutory pack.");
      onCompleted(returnedPack);
      setStatus({ tone: "success", message: `Financial year ${action} completed and audited.` });
      setReason("");
      setApprovalReference("");
      router.refresh();
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : lifecycleError(null) });
    } finally {
      setPending(false);
    }
  }

  if (!canApprove) {
    return <p className="section-copy section-copy-soft">Payroll Approval permission is required to {action} this year.</p>;
  }

  return (
    <div className="salary-crud-form" aria-label={`${yearCode} lifecycle controls`}>
      <div className="form-grid form-grid--three">
        <label className="field-shell">
          <span>{action === "close" ? "Close reason" : "Reopen reason"}</span>
          <input disabled={pending} minLength={8} value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        <label className="field-shell">
          <span>Approval reference</span>
          <input disabled={pending} minLength={3} value={approvalReference} onChange={(event) => setApprovalReference(event.target.value)} />
        </label>
      </div>
      <button className="button button--secondary" disabled={pending || reason.trim().length < 8 || approvalReference.trim().length < 3} type="button" onClick={() => void submit()}>
        {pending ? `${action === "close" ? "Closing" : "Reopening"} year...` : `${action === "close" ? "Close" : "Reopen"} financial year`}
      </button>
      {status ? <p className={`form-status form-status--${status.tone}`} role={status.tone === "error" ? "alert" : "status"}>{status.message}</p> : null}
    </div>
  );
}
