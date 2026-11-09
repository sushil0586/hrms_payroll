"use client";

import { useRef, useState } from "react";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";
import { mutationErrorMessage, networkMutationMessage } from "@/lib/ui/api-error-message";
import { useValidationFocus } from "@/lib/ui/use-validation-focus";
import type { HrAdminEmployeeShiftAssignment } from "@/lib/types";

export function AssignmentLifecycleAction({ item, onSaved }: { item: HrAdminEmployeeShiftAssignment; onSaved?: (message: string) => Promise<boolean> | boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [reason, setReason] = useState("");
  const [lastDay, setLastDay] = useState(item.schedule_today ?? "");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"reason" | "last_working_date" | "acknowledge_schedule_change", string>>>({});
  const formRef = useValidationFocus(errors);
  const busy = useRef(false);
  const ending = item.lifecycle_action === "end";
  const label = ending ? "End assignment" : "Cancel future assignment";
  const prefix = `lifecycle-${item.id}`;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || accepted) return;
    const next: typeof errors = {};
    if (!reason.trim()) next.reason = "Enter a reason.";
    if (ending && (!lastDay || lastDay < (item.schedule_today ?? "") || (item.effective_to && lastDay >= item.effective_to))) next.last_working_date = "Choose today or later, before the existing end date.";
    if (!acknowledged) next.acknowledge_schedule_change = "Review and acknowledge the schedule change.";
    setErrors(next);
    if (Object.keys(next).length) return;
    busy.current = true; setPending(true); setError("");
    try {
      const response = await fetch(`/api/hr-admin/employee-shift-assignments/${item.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: item.lifecycle_action, expected_updated_at: item.updated_at, reason: reason.trim(), acknowledge_schedule_change: acknowledged, ...(ending ? { last_working_date: lastDay } : {}) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setError(mutationErrorMessage(payload, response.status, "The assignment could not be changed.")); return; }
      setAccepted(true);
      let confirmed = false;
      try { confirmed = (await onSaved?.(ending ? `Assignment ends after ${lastDay}.` : "Future assignment cancelled.")) === true; } catch { /* Accepted write stays locked. */ }
      if (confirmed) {
        setOpen(false);
        window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-assignment-inspect="${item.id}"]`)?.focus({ preventScroll: true }));
      }
      else setError("The change was accepted, but the list could not be confirmed. Do not submit again; refresh the assignment list.");
    } catch { setError(networkMutationMessage); }
    finally { busy.current = false; setPending(false); }
  }
  return <>
    <button className="button button--secondary" disabled={!item.lifecycle_action || !onSaved} title={item.lifecycle_unavailable_reason || undefined} type="button" onClick={event => { focusActionTrigger(event); setOpen(true); }}>{item.lifecycle_action ? label : "Lifecycle unavailable"}</button>
    {!item.lifecycle_action ? <span className="muted">{item.lifecycle_unavailable_reason}</span> : null}
    {open ? <HrAdminActionModal closeHref="/hr-admin/employee-shift-assignments" labelledBy={`${prefix}-title`} title={label} description={`${item.employee_code} · ${item.shift} · ${item.effective_from} to ${item.effective_to ?? "open ended"}`} busy={pending} onClose={() => setOpen(false)}>
      <form ref={formRef} noValidate onSubmit={submit}>
        <fieldset disabled={pending || accepted} className="form-grid">
          <div className="notice notice--warning"><strong>Review schedule impact.</strong><span>History and roster rollout records will be retained. {ending ? "The assignment remains effective through the last working date. From the following day" : "Throughout the cancelled window"}, remaining assignments and attendance-policy defaults determine the schedule, including weekly offs. No replacement assignment is created. Review the employee’s schedule for gaps before confirming. Calendar: {item.schedule_timezone}.</span></div>
          {ending ? <label className="form-field"><span>Last working date</span><input className="input-control" name="last_working_date" aria-label="Last working date" type="date" min={item.schedule_today} value={lastDay} onChange={e => setLastDay(e.target.value)} aria-invalid={Boolean(errors.last_working_date)} aria-describedby={errors.last_working_date ? `${prefix}-date-error` : undefined} />{errors.last_working_date ? <span id={`${prefix}-date-error`} className="field-error-text">{errors.last_working_date}</span> : null}</label> : null}
          <label className="form-field"><span>Reason</span><textarea className="input-control" name="reason" aria-label="Reason" maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? `${prefix}-reason-error` : undefined} />{errors.reason ? <span id={`${prefix}-reason-error`} className="field-error-text">{errors.reason}</span> : null}</label>
          <label className="toggle-field"><span>I reviewed fallback coverage, weekly offs and possible schedule gaps.</span><input name="acknowledge_schedule_change" type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} aria-invalid={Boolean(errors.acknowledge_schedule_change)} aria-describedby={errors.acknowledge_schedule_change ? `${prefix}-ack-error` : undefined} /></label>
          {errors.acknowledge_schedule_change ? <span id={`${prefix}-ack-error`} className="field-error-text">{errors.acknowledge_schedule_change}</span> : null}
        </fieldset>
        {error ? <div className="notice notice--error" role="alert">{error}</div> : null}
        <div className="form-actions-bar"><button className="button button--secondary" disabled={pending} onClick={() => setOpen(false)} type="button">Keep assignment</button><button className="button button--primary" disabled={pending || accepted} type="submit">{accepted ? "Accepted; awaiting confirmation" : pending ? "Saving…" : `Confirm ${ending ? "end" : "cancellation"}`}</button></div>
      </form>
    </HrAdminActionModal> : null}
  </>;
}
