"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { TenantAdminConsole } from "@/lib/types";

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

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type Props = {
  data: TenantAdminConsole;
};

export function TenantSupportAccessActions({ data }: Props) {
  const router = useRouter();
  const scopes = data.support_access_management.scope_options;
  const defaultScope = scopes[0]?.value ?? "";
  const [supportAgentIdentifier, setSupportAgentIdentifier] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState(Math.min(60, data.support_access_management.max_duration_minutes));
  const [selectedScopes, setSelectedScopes] = useState<string[]>(defaultScope ? [defaultScope] : []);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [sessionRefs, setSessionRefs] = useState<Record<string, string>>({});
  const [busyRef, setBusyRef] = useState("");
  const [notice, setNotice] = useState("");

  const actionLabels = useMemo(
    () => Object.fromEntries(data.support_access_management.action_options.map((action) => [action.value, action.label])),
    [data.support_access_management.action_options]
  );

  function toggleScope(scopeRef: string) {
    setSelectedScopes((current) => (current.includes(scopeRef) ? current.filter((item) => item !== scopeRef) : [...current, scopeRef]));
  }

  async function requestSupportAccess() {
    setBusyRef("request");
    setNotice("");
    const response = await fetch("/api/tenant-admin/support-access-grants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        support_agent_identifier: supportAgentIdentifier.trim(),
        reason: reason.trim(),
        scope_refs: selectedScopes,
        requested_duration_minutes: duration,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setBusyRef("");
    if (!response.ok) {
      setNotice(apiErrorMessage(result, "Support access request could not be saved."));
      return;
    }
    setNotice("Support access requested.");
    setSupportAgentIdentifier("");
    setReason("");
    router.refresh();
  }

  async function runGrantAction(grantId: string, action: "approve" | "reject" | "start" | "end" | "revoke") {
    setBusyRef(`${grantId}:${action}`);
    setNotice("");
    const response = await fetch(`/api/tenant-admin/support-access-grants/${grantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        decision_note: decisionNotes[grantId] ?? "",
        session_ref: sessionRefs[grantId] ?? "",
      }),
    });
    const result = await response.json().catch(() => ({}));
    setBusyRef("");
    if (!response.ok) {
      setNotice(apiErrorMessage(result, "Support access action could not be saved."));
      return;
    }
    setNotice(`${actionLabels[action] ?? titleCase(action)} saved.`);
    router.refresh();
  }

  return (
    <div className="tenant-support-access-actions">
      <div className="tenant-console-panel__header">
        <div>
          <span className="workspace-card__eyebrow">Support access</span>
          <h2>Scoped support grants</h2>
        </div>
        <span className="record-chip">{data.support_access_management.max_duration_minutes} min max</span>
      </div>

      <div className="tenant-support-access-form">
        <label>
          <span>Support agent</span>
          <input value={supportAgentIdentifier} onChange={(event) => setSupportAgentIdentifier(event.target.value)} placeholder="support.agent@example.com" />
        </label>
        <label>
          <span>Duration</span>
          <input min={1} max={data.support_access_management.max_duration_minutes} type="number" value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
        </label>
        <label className="tenant-support-access-form__reason">
          <span>Reason</span>
          <input value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
      </div>

      <div className="tenant-role-picker">
        {scopes.map((scope) => (
          <label key={scope.value}>
            <input checked={selectedScopes.includes(scope.value)} onChange={() => toggleScope(scope.value)} type="checkbox" />
            <span>{scope.label}</span>
          </label>
        ))}
      </div>

      <div className="tenant-membership-actions__footer">
        <button
          className="button button--primary"
          disabled={busyRef === "request" || !supportAgentIdentifier.trim() || !reason.trim() || selectedScopes.length === 0 || !data.support_access_management.enabled}
          onClick={requestSupportAccess}
          type="button"
        >
          {busyRef === "request" ? "Requesting" : "Request access"}
        </button>
        {notice ? <span role="status">{notice}</span> : null}
      </div>

      <div className="tenant-support-access-list">
        {data.support_access_management.recent_grants.map((grant) => {
          const rowBusy = busyRef.startsWith(`${grant.id}:`);
          const hasDecisionNote = Boolean((decisionNotes[grant.id] ?? "").trim());
          const canApprove = grant.status === "requested" && hasDecisionNote;
          const canStart = grant.status === "approved";
          const canEnd = grant.status === "active";
          const canReject = grant.status === "requested" && hasDecisionNote;
          const canRevoke = (grant.status === "requested" || grant.status === "approved" || grant.status === "active") && hasDecisionNote;
          return (
            <div className="tenant-support-access-row" key={grant.id}>
              <div>
                <strong>{grant.support_agent_identifier}</strong>
                <span>{grant.reason}</span>
                <span>{grant.scope_refs.join(", ")}</span>
                <span>Expires {formatDateTime(grant.access_expires_at)}</span>
              </div>
              <span className="record-chip">{titleCase(grant.status)}</span>
              <div className="tenant-support-access-row__inputs">
                <label>
                  <span>Decision note</span>
                  <input value={decisionNotes[grant.id] ?? ""} onChange={(event) => setDecisionNotes((current) => ({ ...current, [grant.id]: event.target.value }))} />
                </label>
                <label>
                  <span>Session ref</span>
                  <input value={sessionRefs[grant.id] ?? grant.session_ref} onChange={(event) => setSessionRefs((current) => ({ ...current, [grant.id]: event.target.value }))} />
                </label>
              </div>
              <div className="tenant-support-access-row__actions">
                <button className="button button--secondary" disabled={rowBusy || !canApprove} onClick={() => runGrantAction(grant.id, "approve")} type="button">
                  {actionLabels.approve ?? "Approve"}
                </button>
                <button className="button button--secondary" disabled={rowBusy || !canStart} onClick={() => runGrantAction(grant.id, "start")} type="button">
                  {actionLabels.start ?? "Start session"}
                </button>
                <button className="button button--secondary" disabled={rowBusy || !canEnd} onClick={() => runGrantAction(grant.id, "end")} type="button">
                  {actionLabels.end ?? "End session"}
                </button>
                <button className="button button--ghost" disabled={rowBusy || !canReject} onClick={() => runGrantAction(grant.id, "reject")} type="button">
                  {actionLabels.reject ?? "Reject"}
                </button>
                <button className="button button--ghost" disabled={rowBusy || !canRevoke} onClick={() => runGrantAction(grant.id, "revoke")} type="button">
                  {actionLabels.revoke ?? "Revoke"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
