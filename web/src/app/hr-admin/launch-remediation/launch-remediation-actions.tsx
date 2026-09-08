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

type Props = {
  assignmentId: string;
  defaultOwnerRoleRef: string;
  defaultAssignee: string;
  defaultDueAt: string | null;
  defaultEscalationOwnerRoleRef: string;
};

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 16);
}

export function LaunchRemediationActions({
  assignmentId,
  defaultOwnerRoleRef,
  defaultAssignee,
  defaultDueAt,
  defaultEscalationOwnerRoleRef,
}: Props) {
  const router = useRouter();
  const [ownerRoleRef, setOwnerRoleRef] = useState(defaultOwnerRoleRef);
  const [assignee, setAssignee] = useState(defaultAssignee);
  const [dueAt, setDueAt] = useState(toDateTimeLocal(defaultDueAt));
  const [escalationOwnerRoleRef, setEscalationOwnerRoleRef] = useState(defaultEscalationOwnerRoleRef || defaultOwnerRoleRef);
  const [decisionNote, setDecisionNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function submitAction(action: "acknowledge" | "assign" | "set_due_date" | "send_reminder" | "escalate" | "ignore") {
    setIsSaving(true);
    setNotice("");
    const response = await fetch(`/api/hr-admin/launch-remediations/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        owner_role_ref: ownerRoleRef,
        assigned_to_identifier: assignee,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        escalation_owner_role_ref: escalationOwnerRoleRef,
        resolution_note: action === "acknowledge" ? decisionNote || "Reviewed in launch remediation workspace." : decisionNote,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setIsSaving(false);
    if (!response.ok) {
      setNotice(apiErrorMessage(result, "Launch remediation assignment could not be updated."));
      return;
    }
    setNotice("Assignment updated.");
    router.refresh();
  }

  return (
    <div className="launch-remediation-actions">
      <div className="launch-remediation-actions__inputs">
        <label>
          <span>Owner role</span>
          <input value={ownerRoleRef} onChange={(event) => setOwnerRoleRef(event.target.value)} />
        </label>
        <label>
          <span>Assignee</span>
          <input value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="person or queue" />
        </label>
        <label>
          <span>Due date</span>
          <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
        </label>
        <label>
          <span>Escalation owner</span>
          <input value={escalationOwnerRoleRef} onChange={(event) => setEscalationOwnerRoleRef(event.target.value)} placeholder="role code" />
        </label>
        <label>
          <span>Decision note</span>
          <input value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="required for ignore/escalate" />
        </label>
      </div>
      <div className="launch-remediation-actions__buttons">
        <button className="button button--secondary" type="button" onClick={() => submitAction("acknowledge")} disabled={isSaving}>
          Acknowledge
        </button>
        <button className="button button--secondary" type="button" onClick={() => submitAction("assign")} disabled={isSaving}>
          Assign owner
        </button>
        <button className="button button--secondary" type="button" onClick={() => submitAction("set_due_date")} disabled={isSaving || !dueAt}>
          Set due date
        </button>
        <button className="button button--secondary" type="button" onClick={() => submitAction("send_reminder")} disabled={isSaving}>
          Send reminder
        </button>
        <button className="button button--secondary" type="button" onClick={() => submitAction("escalate")} disabled={isSaving || !escalationOwnerRoleRef.trim()}>
          Escalate
        </button>
        <button className="button button--ghost" type="button" onClick={() => submitAction("ignore")} disabled={isSaving || !decisionNote.trim()}>
          Ignore
        </button>
        {notice ? <span role="status">{notice}</span> : null}
      </div>
    </div>
  );
}
