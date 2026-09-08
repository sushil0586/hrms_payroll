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

function formatJson(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

type Props = {
  data: TenantAdminConsole;
};

export function TenantChangeRequestActions({ data }: Props) {
  const router = useRouter();
  const requestTypes = data.change_request_management.request_type_options;
  const defaultType = requestTypes[0]?.value ?? "plan_change";
  const [requestType, setRequestType] = useState(defaultType);
  const [title, setTitle] = useState("");
  const [targetRef, setTargetRef] = useState("");
  const [description, setDescription] = useState("");
  const [payloadText, setPayloadText] = useState("{\n  \"subscription_plan\": \"enterprise\"\n}");
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [busyRef, setBusyRef] = useState("");
  const [notice, setNotice] = useState("");

  const selectedType = requestTypes.find((item) => item.value === requestType) ?? requestTypes[0];
  const actionLabels = useMemo(
    () => Object.fromEntries(data.change_request_management.action_options.map((action) => [action.value, action.label])),
    [data.change_request_management.action_options]
  );

  function updateType(nextType: string) {
    setRequestType(nextType);
    const nextConfig = requestTypes.find((item) => item.value === nextType);
    if (nextConfig?.allowed_payload_fields.includes("primary_email")) {
      setPayloadText("{\n  \"primary_email\": \"billing@example.com\"\n}");
    } else if (nextConfig?.allowed_payload_fields.includes("configuration_key")) {
      setPayloadText("{\n  \"configuration_key\": \"saas.commercial_profile.v1\",\n  \"change_summary\": \"Review commercial profile settings\"\n}");
      setTargetRef("saas.commercial_profile.v1");
    } else {
      setPayloadText("{\n  \"subscription_plan\": \"enterprise\"\n}");
    }
  }

  async function submitChangeRequest() {
    setBusyRef("create");
    setNotice("");
    let requestedPayload: Record<string, unknown>;
    try {
      const parsed = JSON.parse(payloadText) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Payload must be a JSON object.");
      }
      requestedPayload = parsed as Record<string, unknown>;
    } catch (error) {
      setBusyRef("");
      setNotice(error instanceof Error ? error.message : "Payload must be valid JSON.");
      return;
    }
    const response = await fetch("/api/tenant-admin/change-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request_type: requestType,
        title: title.trim(),
        target_ref: targetRef.trim(),
        description: description.trim(),
        requested_payload: requestedPayload,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setBusyRef("");
    if (!response.ok) {
      setNotice(apiErrorMessage(result, "Change request could not be submitted."));
      return;
    }
    setNotice("Change request submitted.");
    setTitle("");
    setDescription("");
    router.refresh();
  }

  async function runRequestAction(requestId: string, action: "approve" | "reject" | "cancel" | "apply") {
    setBusyRef(`${requestId}:${action}`);
    setNotice("");
    const response = await fetch(`/api/tenant-admin/change-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        decision_note: decisionNotes[requestId] ?? "",
      }),
    });
    const result = await response.json().catch(() => ({}));
    setBusyRef("");
    if (!response.ok) {
      setNotice(apiErrorMessage(result, "Change request action could not be saved."));
      return;
    }
    setNotice(`${actionLabels[action] ?? titleCase(action)} saved.`);
    router.refresh();
  }

  return (
    <div className="tenant-change-request-actions">
      <div className="tenant-console-panel__header">
        <div>
          <span className="workspace-card__eyebrow">Change requests</span>
          <h2>Billing and configuration queue</h2>
        </div>
        <span className="record-chip">{data.change_request_management.recent_requests.length} requests</span>
      </div>

      <div className="tenant-change-request-form">
        <label>
          <span>Type</span>
          <select value={requestType} onChange={(event) => updateType(event.target.value)}>
            {requestTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={selectedType?.label ?? "Change request"} />
        </label>
        <label>
          <span>Target ref</span>
          <input value={targetRef} onChange={(event) => setTargetRef(event.target.value)} placeholder={selectedType?.target_ref_required ? "Required" : "Optional"} />
        </label>
        <label>
          <span>Description</span>
          <input value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className="tenant-change-request-form__payload">
          <span>Payload</span>
          <textarea value={payloadText} onChange={(event) => setPayloadText(event.target.value)} rows={5} />
        </label>
      </div>
      <div className="tenant-change-request-hint">
        <span>{selectedType?.description}</span>
        <strong>{selectedType?.allowed_payload_fields.join(", ")}</strong>
      </div>
      <div className="tenant-membership-actions__footer">
        <button className="button button--primary" disabled={busyRef === "create" || !title.trim() || !data.change_request_management.enabled} onClick={submitChangeRequest} type="button">
          {busyRef === "create" ? "Submitting" : "Submit request"}
        </button>
        {notice ? <span role="status">{notice}</span> : null}
      </div>

      <div className="tenant-change-request-list">
        {data.change_request_management.recent_requests.map((request) => {
          const rowBusy = busyRef.startsWith(`${request.id}:`);
          const canApprove = request.status === "submitted";
          const canCancel = request.status === "submitted";
          const canApply = request.status === "approved";
          return (
            <div className="tenant-change-request-row" key={request.id}>
              <div>
                <strong>{request.title}</strong>
                <span>{titleCase(request.request_type)} by {request.requested_by_identifier}</span>
                <code>{formatJson(request.requested_payload)}</code>
              </div>
              <span className="record-chip">{titleCase(request.status)}</span>
              <label>
                <span>Decision note</span>
                <input value={decisionNotes[request.id] ?? ""} onChange={(event) => setDecisionNotes((current) => ({ ...current, [request.id]: event.target.value }))} />
              </label>
              <div className="tenant-change-request-row__actions">
                <button className="button button--secondary" disabled={rowBusy || !canApprove} onClick={() => runRequestAction(request.id, "approve")} type="button">
                  {actionLabels.approve ?? "Approve"}
                </button>
                <button className="button button--secondary" disabled={rowBusy || !canApply} onClick={() => runRequestAction(request.id, "apply")} type="button">
                  {actionLabels.apply ?? "Mark applied"}
                </button>
                <button className="button button--ghost" disabled={rowBusy || !canApprove} onClick={() => runRequestAction(request.id, "reject")} type="button">
                  {actionLabels.reject ?? "Reject"}
                </button>
                <button className="button button--ghost" disabled={rowBusy || !canCancel} onClick={() => runRequestAction(request.id, "cancel")} type="button">
                  {actionLabels.cancel ?? "Cancel"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
