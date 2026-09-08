"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  async function postAction(action: "clone" | "activate" | "archive") {
    setBusyAction(action);
    setNotice("");
    const body = action === "activate"
      ? { approval_reason: "Approved from HR admin mapping workspace." }
      : action === "archive"
        ? { archive_reason: "Archived from HR admin mapping workspace." }
        : { overrides: { change_reason: "Drafted from active mapping pack." } };
    const response = await fetch(`/api/hr-admin/payroll-provider-schema-mapping-packs/${packId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    setBusyAction("");
    if (!response.ok) {
      setNotice(apiErrorMessage(result, `Mapping pack ${action} failed.`));
      return;
    }
    setNotice(apiErrorMessage(result, `Mapping pack ${action} completed.`));
    router.refresh();
  }

  async function exportPack() {
    setBusyAction("export");
    setNotice("");
    const response = await fetch(`/api/hr-admin/payroll-provider-schema-mapping-packs/${packId}/export`);
    const result = await response.json().catch(() => ({}));
    setBusyAction("");
    if (!response.ok) {
      setNotice(apiErrorMessage(result, "Mapping pack export failed."));
      return;
    }
    const exportPayload = result && typeof result === "object"
      ? (result as { export_payload?: { mapping_profile_ref?: string; version?: number; source_hash?: string } }).export_payload
      : null;
    setNotice(exportPayload ? `Export ready: ${exportPayload.mapping_profile_ref} v${exportPayload.version}` : "Export ready.");
  }

  const isBusy = Boolean(busyAction);
  return (
    <div className="payroll-provider-mapping-actions">
      <button className="button button--secondary" type="button" onClick={() => postAction("clone")} disabled={isBusy}>
        {busyAction === "clone" ? "Cloning" : "Clone"}
      </button>
      <button className="button button--primary" type="button" onClick={() => postAction("activate")} disabled={isBusy || status === "active"}>
        {busyAction === "activate" ? "Activating" : "Activate"}
      </button>
      <button className="button button--secondary" type="button" onClick={exportPack} disabled={isBusy}>
        {busyAction === "export" ? "Exporting" : "Export"}
      </button>
      <button className="button button--secondary" type="button" onClick={() => postAction("archive")} disabled={isBusy || status === "archived"}>
        {busyAction === "archive" ? "Archiving" : "Archive"}
      </button>
      {notice ? <span role="status">{notice}</span> : null}
    </div>
  );
}
