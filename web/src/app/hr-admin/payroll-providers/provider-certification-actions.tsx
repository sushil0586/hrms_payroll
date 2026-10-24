"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  connectionId: string;
  disabled?: boolean;
};

function apiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail) {
      return detail;
    }
    return JSON.stringify(payload);
  }
  return fallback;
}

export function ProviderCertificationActions({ connectionId, disabled }: Props) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [notice, setNotice] = useState("");

  async function runCertification() {
    setIsRunning(true);
    setNotice("");
    try {
      const response = await fetch(`/api/hr-admin/payroll-provider-connections/${connectionId}/run-certification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice(apiErrorMessage(result, "Certification run could not be completed."));
        return;
      }
      if (!(result as { certification_run?: { id?: string; status?: string } }).certification_run?.id) {
        setNotice("The certification outcome was not confirmed. Verify the connection before retrying.");
        return;
      }
      setNotice("Certification run completed.");
      router.refresh();
    } catch {
      setNotice("The certification outcome could not be confirmed. Verify the connection before retrying.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="payroll-provider-cert-actions">
      <button
        className="button button--primary"
        type="button"
        onClick={runCertification}
        disabled={disabled || isRunning}
      >
        {isRunning ? "Running" : "Run certification"}
      </button>
      {notice ? <span role="status">{notice}</span> : null}
    </div>
  );
}
