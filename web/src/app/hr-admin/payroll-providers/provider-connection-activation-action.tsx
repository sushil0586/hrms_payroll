"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  connectionId: string;
};

function apiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail) {
    return detail;
  }
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) {
      return `${key}: ${String(value[0])}`;
    }
    if (typeof value === "string") {
      return `${key}: ${value}`;
    }
  }
  return fallback;
}

export function ProviderConnectionActivationAction({ connectionId }: Props) {
  const router = useRouter();
  const [isActivating, setIsActivating] = useState(false);
  const [notice, setNotice] = useState("");

  async function activateConnection() {
    setIsActivating(true);
    setNotice("");
    try {
      const response = await fetch(`/api/hr-admin/payroll-provider-connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice(apiErrorMessage(result, "Provider connection could not be activated."));
        return;
      }
      if ((result as { id?: string; status?: string }).status !== "active") {
        setNotice("Provider activation was not confirmed. Verify the connection before retrying.");
        return;
      }
      setNotice("Provider connection activated.");
      router.refresh();
    } catch {
      setNotice("Provider activation could not be confirmed. Verify the connection before retrying.");
    } finally {
      setIsActivating(false);
    }
  }

  return (
    <div className="payroll-provider-activation-action">
      <button className="button button--primary" type="button" onClick={activateConnection} disabled={isActivating}>
        {isActivating ? "Activating" : "Activate connection"}
      </button>
      {notice ? <span role="status">{notice}</span> : null}
    </div>
  );
}
