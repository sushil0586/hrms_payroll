"use client";

import { useSavePayslipReceipt } from "./payslip-read-state";
import type { EssPayrollPayslip } from "@/lib/types";

import { useEffect, useRef, useState } from "react";

import { ActionToast } from "@/components/patterns/action-toast";
import { AsyncActionButton } from "@/components/patterns/async-action-button";

type Props = {
  endpoint: string;
  isReadAcknowledged: boolean;
  onActionStart?: () => void;
};

export function PayslipReadReceiptAction({ endpoint, isReadAcknowledged, onActionStart }: Props) {
  const saveReceipt = useSavePayslipReceipt();
  const inFlight = useRef(false);
  const [savedEndpoint, setSavedEndpoint] = useState("");
  const acknowledged = isReadAcknowledged || savedEndpoint === endpoint;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);

  async function handleReadAcknowledgement() {
    if (inFlight.current || acknowledged) return;
    inFlight.current = true;
    onActionStart?.();
    setIsSubmitting(true);
    setError("");
    let response: Response;
    try {
      response = await fetch(endpoint, { method: "POST" });
    } catch {
      const message = "Unable to reach the server. Check your connection and retry.";
      setError(message);
      setToast({ title: "Action failed.", message, tone: "error" });
      setIsSubmitting(false);
      inFlight.current = false;
      return;
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message =
        payload && typeof payload === "object" && "detail" in payload
          ? String((payload as Record<string, unknown>).detail)
          : "Unable to record read receipt.";
      setError(message);
      setToast({ title: "Action failed.", message, tone: "error" });
      setIsSubmitting(false);
      inFlight.current = false;
      return;
    }
    const receipt = await response.json().catch(() => null) as EssPayrollPayslip | null;
    if (!receipt || endpoint !== `/api/me/payroll-payslips/${receipt.id}/read` || receipt.access_summary?.is_read_acknowledged !== true) {
      setError("The server did not confirm the read receipt. Retry to verify its state.");
      setIsSubmitting(false);
      inFlight.current = false;
      return;
    }
    saveReceipt?.(receipt);
    setSavedEndpoint(endpoint);
    setToast({ title: "Action saved.", message: "Payslip read receipt recorded.", tone: "success" });
    setIsSubmitting(false);
    inFlight.current = false;
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <div className="record-card__actions">
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
      <AsyncActionButton className="button button--secondary" disabled={acknowledged} pending={!acknowledged && isSubmitting} pendingLabel="Saving read receipt" onClick={handleReadAcknowledgement} type="button">{acknowledged ? "Read acknowledged" : "Mark as read"}</AsyncActionButton>
      {error ? <span className="muted" role="alert">{error}</span> : null}
    </div>
  );
}
