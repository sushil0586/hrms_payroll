"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export function LaunchRehearsalActions() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [notice, setNotice] = useState("");

  async function runRehearsal() {
    setIsRunning(true);
    setNotice("");
    try {
      const response = await fetch("/api/hr-admin/payroll-provider-launch-rehearsals/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice(apiErrorMessage(result, "Launch rehearsal could not be recorded."));
        return;
      }
      if (!(result as { launch_rehearsal_run?: { id?: string; status?: string } }).launch_rehearsal_run?.id) {
        setNotice("The rehearsal outcome was not confirmed. Verify launch readiness before retrying.");
        return;
      }
      setNotice("Launch rehearsal recorded.");
      router.refresh();
    } catch {
      setNotice("The rehearsal outcome could not be confirmed. Verify launch readiness before retrying.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="payroll-provider-cert-actions">
      <button className="button button--primary" type="button" onClick={runRehearsal} disabled={isRunning}>
        {isRunning ? "Running" : "Run rehearsal"}
      </button>
      {notice ? <span role="status">{notice}</span> : null}
    </div>
  );
}
