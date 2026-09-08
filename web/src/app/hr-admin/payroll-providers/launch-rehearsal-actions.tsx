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
    const response = await fetch("/api/hr-admin/payroll-provider-launch-rehearsals/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const result = await response.json().catch(() => ({}));
    setIsRunning(false);
    if (!response.ok) {
      setNotice(apiErrorMessage(result, "Launch rehearsal could not be recorded."));
      return;
    }
    setNotice("Launch rehearsal recorded.");
    router.refresh();
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
