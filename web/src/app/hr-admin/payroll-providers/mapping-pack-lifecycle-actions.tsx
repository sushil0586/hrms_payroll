"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AsyncActionButton } from "@/components/patterns/async-action-button";

type Props = {
  packId: string;
  status: string;
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

export function MappingPackLifecycleActions({ packId, status }: Props) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState("");
  const [notice, setNotice] = useState("");
  const [isError, setIsError] = useState(false);

  async function postAction(action: "clone" | "activate" | "archive") {
    if (busyAction) return;
    setBusyAction(action);
    setNotice("");
    setIsError(false);
    const body = action === "activate"
      ? { approval_reason: "Approved from HR admin mapping workspace." }
      : action === "archive"
        ? { archive_reason: "Archived from HR admin mapping workspace." }
        : { overrides: { change_reason: "Drafted from active mapping pack." } };
    try {
      const response = await fetch(`/api/hr-admin/payroll-provider-schema-mapping-packs/${packId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setIsError(true);
        setNotice(apiErrorMessage(result, `Mapping pack ${action} failed.`));
        return;
      }
      setNotice(apiErrorMessage(result, `Mapping pack ${action} completed.`));
      router.refresh();
    } catch {
      setIsError(true);
      setNotice(`Mapping pack ${action} could not reach the service. Try again.`);
    } finally {
      setBusyAction("");
    }
  }

  async function exportPack() {
    if (busyAction) return;
    setBusyAction("export");
    setNotice("");
    setIsError(false);
    try {
      const response = await fetch(`/api/hr-admin/payroll-provider-schema-mapping-packs/${packId}/export`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setIsError(true);
        setNotice(apiErrorMessage(result, "Mapping pack export failed."));
        return;
      }
      const exportPayload = result && typeof result === "object"
        ? (result as { export_payload?: { mapping_profile_ref?: string; version?: number; source_hash?: string } }).export_payload
        : null;
      setNotice(exportPayload ? `Export ready: ${exportPayload.mapping_profile_ref} v${exportPayload.version}` : "Export ready.");
    } catch {
      setIsError(true);
      setNotice("Mapping pack export could not reach the service. Try again.");
    } finally {
      setBusyAction("");
    }
  }

  const isBusy = Boolean(busyAction);
  return (
    <div className="payroll-provider-mapping-actions">
      <AsyncActionButton className="button button--secondary" type="button" onClick={() => postAction("clone")} disabled={isBusy} pending={busyAction === "clone"} pendingLabel="Cloning">Clone</AsyncActionButton>
      <AsyncActionButton className="button button--primary" type="button" onClick={() => postAction("activate")} disabled={isBusy || status === "active"} pending={busyAction === "activate"} pendingLabel="Activating">Activate</AsyncActionButton>
      <AsyncActionButton className="button button--secondary" type="button" onClick={exportPack} disabled={isBusy} pending={busyAction === "export"} pendingLabel="Preparing export">Export</AsyncActionButton>
      <AsyncActionButton className="button button--secondary" type="button" onClick={() => postAction("archive")} disabled={isBusy || status === "archived"} pending={busyAction === "archive"} pendingLabel="Archiving">Archive</AsyncActionButton>
      {notice ? <span role={isError ? "alert" : "status"}>{notice}</span> : null}
    </div>
  );
}
