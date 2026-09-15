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

const SUPPORT_GRANT_PAGE_SIZE = 5;

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
  const [grantSearch, setGrantSearch] = useState("");
  const [grantPageIndex, setGrantPageIndex] = useState(0);
  const [busyRef, setBusyRef] = useState("");
  const [notice, setNotice] = useState("");

  const actionLabels = useMemo(
    () => Object.fromEntries(data.support_access_management.action_options.map((action) => [action.value, action.label])),
    [data.support_access_management.action_options]
  );

  function toggleScope(scopeRef: string) {
    setSelectedScopes((current) => (current.includes(scopeRef) ? current.filter((item) => item !== scopeRef) : [...current, scopeRef]));
  }

  const supportAgentError = supportAgentIdentifier.trim() ? "" : "Support agent is required.";
  const reasonError = reason.trim() ? "" : "Reason is required.";
  const scopeError = selectedScopes.length ? "" : "Select at least one support scope.";
  const durationError =
    Number.isFinite(duration) && duration >= 1 && duration <= data.support_access_management.max_duration_minutes
      ? ""
      : `Duration must be between 1 and ${data.support_access_management.max_duration_minutes} minutes.`;
  const canRequestSupportAccess =
    !busyRef &&
    data.support_access_management.enabled &&
    !supportAgentError &&
    !reasonError &&
    !scopeError &&
    !durationError;
  const normalizedGrantSearch = grantSearch.trim().toLowerCase();
  const grants = data.support_access_management.recent_grants.filter((grant) => {
    if (!normalizedGrantSearch) {
      return true;
    }
    return [
      grant.support_agent_identifier,
      grant.reason,
      grant.status,
      grant.scope_refs.join(" "),
      grant.session_ref,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedGrantSearch);
  });
  const grantPageCount = Math.max(1, Math.ceil(grants.length / SUPPORT_GRANT_PAGE_SIZE));
  const boundedGrantPageIndex = Math.min(grantPageIndex, grantPageCount - 1);
  const pagedGrants = grants.slice(
    boundedGrantPageIndex * SUPPORT_GRANT_PAGE_SIZE,
    boundedGrantPageIndex * SUPPORT_GRANT_PAGE_SIZE + SUPPORT_GRANT_PAGE_SIZE
  );
  const firstVisibleGrant = grants.length ? boundedGrantPageIndex * SUPPORT_GRANT_PAGE_SIZE + 1 : 0;
  const lastVisibleGrant = Math.min(grants.length, (boundedGrantPageIndex + 1) * SUPPORT_GRANT_PAGE_SIZE);

  async function requestSupportAccess() {
    setBusyRef("request");
    setNotice("");
    if (!canRequestSupportAccess) {
      setBusyRef("");
      setNotice(supportAgentError || reasonError || scopeError || durationError || "Complete the required support access fields.");
      return;
    }
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
    setGrantSearch(reason.trim());
    setGrantPageIndex(0);
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
    const refreshedGrant = (result as { support_access_grant?: { reason?: unknown } }).support_access_grant;
    if (typeof refreshedGrant?.reason === "string" && refreshedGrant.reason) {
      setGrantSearch(refreshedGrant.reason);
      setGrantPageIndex(0);
    }
    router.refresh();
  }

  return (
    <div aria-label="Tenant support access form" className="tenant-support-access-actions" data-testid="tenant-support-access-form">
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
          <input
            aria-describedby="support-agent-error"
            aria-invalid={Boolean(supportAgentError)}
            value={supportAgentIdentifier}
            onChange={(event) => setSupportAgentIdentifier(event.target.value)}
            placeholder="support.agent@example.com"
          />
          {supportAgentError ? (
            <small className="tenant-field-error" id="support-agent-error" role="alert">
              {supportAgentError}
            </small>
          ) : null}
        </label>
        <label>
          <span>Duration</span>
          <input
            aria-describedby="support-duration-error"
            aria-invalid={Boolean(durationError)}
            min={1}
            max={data.support_access_management.max_duration_minutes}
            type="number"
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
          />
          {durationError ? (
            <small className="tenant-field-error" id="support-duration-error" role="alert">
              {durationError}
            </small>
          ) : null}
        </label>
        <label className="tenant-support-access-form__reason">
          <span>Reason</span>
          <input
            aria-describedby="support-reason-error"
            aria-invalid={Boolean(reasonError)}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          {reasonError ? (
            <small className="tenant-field-error" id="support-reason-error" role="alert">
              {reasonError}
            </small>
          ) : null}
        </label>
      </div>

      <div aria-describedby="support-scope-error" aria-label="Support scopes" className="tenant-role-picker">
        {scopes.map((scope) => (
          <label key={scope.value}>
            <input checked={selectedScopes.includes(scope.value)} onChange={() => toggleScope(scope.value)} type="checkbox" />
            <span>{scope.label}</span>
          </label>
        ))}
      </div>
      {scopeError ? (
        <small className="tenant-field-error" id="support-scope-error" role="alert">
          {scopeError}
        </small>
      ) : null}

      <div className="tenant-membership-actions__footer">
        <button
          className="button button--primary"
          disabled={!canRequestSupportAccess}
          onClick={requestSupportAccess}
          type="button"
        >
          {busyRef === "request" ? "Requesting" : "Request access"}
        </button>
        {notice ? <span role="status">{notice}</span> : null}
      </div>

      <div className="tenant-membership-toolbar tenant-membership-toolbar--compact">
        <label>
          <span>Search grants</span>
          <input
            aria-label="Search support grants"
            placeholder="Agent, reason, status, scope"
            value={grantSearch}
            onChange={(event) => {
              setGrantSearch(event.target.value);
              setGrantPageIndex(0);
            }}
          />
        </label>
        <div aria-label="Support grant pagination" className="tenant-membership-pager">
          <span>
            {firstVisibleGrant}-{lastVisibleGrant} of {grants.length}
          </span>
          <button className="button button--secondary button--compact" disabled={boundedGrantPageIndex === 0} onClick={() => setGrantPageIndex((current) => Math.max(0, current - 1))} type="button">
            Previous
          </button>
          <button className="button button--secondary button--compact" disabled={boundedGrantPageIndex >= grantPageCount - 1} onClick={() => setGrantPageIndex((current) => Math.min(grantPageCount - 1, current + 1))} type="button">
            Next
          </button>
        </div>
      </div>

      <div className="tenant-support-access-list">
        {!pagedGrants.length ? <p className="tenant-console-empty">No support grants match the current search.</p> : null}
        {pagedGrants.map((grant) => {
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
                  {grant.status === "requested" || grant.status === "approved" || grant.status === "active" ? (
                    <small className="tenant-field-error tenant-field-error--muted">Required for approve, reject, or revoke.</small>
                  ) : null}
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
