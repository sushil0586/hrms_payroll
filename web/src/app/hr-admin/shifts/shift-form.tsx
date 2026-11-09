"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { useValidationFocus } from "@/lib/ui/use-validation-focus";
import { useFeedbackFocus } from "@/lib/ui/use-feedback-focus";
import { hasFieldErrors } from "@/lib/ui/validation";

import { apiFieldErrors, mutationErrorMessage } from "@/lib/ui/api-error-message";
import { rememberActionSuccess } from "@/components/patterns/action-feedback-receipt";
import { FormSection } from "@/components/patterns/form-section";
import { PlatformGovernanceFormBanner } from "@/components/patterns/platform-governance-form-banner";
import { GovernanceLockHint, isGovernanceFieldLocked } from "@/components/patterns/platform-governance-locks";
import type { HrAdminShift, HrAdminShiftWriteInput } from "@/lib/types";

type Props = {
  initialValue: HrAdminShiftWriteInput;
  mode: "create" | "edit";
  itemId?: string;
  item?: HrAdminShift;
  cancelHref?: string;
  successHref?: string;
  compact?: boolean;
  existingCodes?: string[];
  onSaved?: (message: string) => Promise<boolean> | boolean;
  onCancel?: () => void;
};

const DAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const labels = { code: "Code", name: "Name", start_time: "Start time", end_time: "End time", working_hours: "Working hours", break_minutes: "Break minutes", grace_in_minutes: "Grace in minutes", grace_out_minutes: "Grace out minutes", is_night_shift: "Night shift", is_flexible: "Flexible shift", is_active: "Active", weekly_off_days: "Weekly off days" };
type Field = keyof typeof labels;
type Errors = Partial<Record<Field, string>>;

const subscribe = () => () => undefined;

export function ShiftForm({ initialValue, mode, itemId, item, cancelHref, successHref = "/hr-admin/shifts", compact = false, onSaved, onCancel, existingCodes }: Props) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedUnconfirmed, setAcceptedUnconfirmed] = useState(false);
  const submittingRef = useRef(false);
  const [fieldErrors, setFieldErrors] = useState<Errors>({});
  const formRef = useValidationFocus<Field>(fieldErrors);
  const errorRef = useFeedbackFocus(error, isSubmitting, hasFieldErrors(fieldErrors));
  const prefix = useId();
  const propsFor = (field: Field) => ({ name: field, "aria-label": labels[field], "aria-invalid": Boolean(fieldErrors[field]), "aria-describedby": fieldErrors[field] ? `${prefix}-${field}` : undefined });
  const fieldError = (field: Field) => fieldErrors[field] ? <span className="field-error-text" id={`${prefix}-${field}`}>{labels[field]}: {fieldErrors[field]}</span> : null;
  const codeLocked = isGovernanceFieldLocked(item, "code");
  const nameLocked = isGovernanceFieldLocked(item, "name");
  const startLocked = isGovernanceFieldLocked(item, "start_time");
  const endLocked = isGovernanceFieldLocked(item, "end_time");
  const workingHoursLocked = isGovernanceFieldLocked(item, "working_hours");
  const breakMinutesLocked = isGovernanceFieldLocked(item, "break_minutes");
  const graceInLocked = isGovernanceFieldLocked(item, "grace_in_minutes");
  const graceOutLocked = isGovernanceFieldLocked(item, "grace_out_minutes");
  const nightShiftLocked = isGovernanceFieldLocked(item, "is_night_shift");
  const flexibleLocked = isGovernanceFieldLocked(item, "is_flexible");
  const activeLocked = isGovernanceFieldLocked(item, "is_active");
  const weeklyOffDaysLocked = isGovernanceFieldLocked(item, "weekly_off_days");

  function update<Key extends keyof HrAdminShiftWriteInput>(key: Key, value: HrAdminShiftWriteInput[Key]) {
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setError("");
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  function toggleWeeklyOff(day: string) {
    setFieldErrors((current) => ({ ...current, weekly_off_days: undefined }));
    setError("");
    setFormValue((current) => ({
      ...current,
      weekly_off_days: current.weekly_off_days.includes(day)
        ? current.weekly_off_days.filter((item) => item !== day)
        : [...current.weekly_off_days, day],
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hydrated || submittingRef.current || acceptedUnconfirmed) return;
    const requiredErrors: Errors = {};
    for (const field of ["code", "name", "start_time", "end_time"] as const) {
      if (!String(formValue[field]).trim()) requiredErrors[field] = `${labels[field]} is required.`;
    }
    if (hasFieldErrors(requiredErrors)) {
      setFieldErrors(requiredErrors);
      setError("Review the highlighted fields.");
      return;
    }
    if (!event.currentTarget.reportValidity()) return;
    submittingRef.current = true;
    if (mode === "edit" && item && item.can_edit_directly === false) {
      setError("This record cannot be edited directly in its current governance state.");
      submittingRef.current = false;
      return;
    }
    if (mode === "create" && existingCodes?.includes(formValue.code.trim())) {
      setFieldErrors({ code: "A shift with this code already exists. Use a unique code or edit the existing shift." });
      setError("A shift with this code already exists. Use a unique code or edit the existing shift.");
      submittingRef.current = false;
      return;
    }
    setError("");
    setIsSubmitting(true);
    let response: Response;
    try {
      response = await fetch(mode === "create" ? "/api/hr-admin/shifts" : `/api/hr-admin/shifts/${itemId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValue),
      });
    } catch {
      setError("Unable to reach the server. The shift was not confirmed; keep this form open and retry after checking the connection.");
      setIsSubmitting(false);
      submittingRef.current = false;
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const fields = apiFieldErrors<Field>(payload, Object.keys(labels) as Field[]);
      setFieldErrors(fields);
      setError(mutationErrorMessage(payload, response.status, "Unable to save shift. Review the entered values and try again."));
      setIsSubmitting(false);
      submittingRef.current = false;
      return;
    }
    const successMessage = mode === "create" ? "Shift created." : "Shift updated.";
    if (onSaved) {
      setAcceptedUnconfirmed(true);
      let reconciled = false;
      try { reconciled = await onSaved(successMessage); } catch { /* Keep an accepted write locked until the catalog is confirmed. */ }
      if (!reconciled) {
        setError("The shift was accepted, but the catalog could not be confirmed. Do not submit it again; retry the catalog read.");
        setIsSubmitting(false);
        submittingRef.current = false;
      }
      return;
    }
    rememberActionSuccess(successHref, String(payload.id || itemId || ""), "Action saved.", successMessage);
    router.push(successHref);
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }
    if (cancelHref) {
      router.push(cancelHref);
      return;
    }
    router.back();
  }

  return (
    <form noValidate ref={formRef} data-local-update-hydrated={hydrated ? "true" : "false"} aria-busy={!hydrated || isSubmitting || undefined} className={`section form-layout-modern shift-form${compact ? " shift-form--modal" : ""}`} onSubmit={handleSubmit}>
      <fieldset aria-labelledby={`${prefix}-title`} className="form-shell-card" disabled={!hydrated} style={{ margin: 0, minWidth: 0 }}>
        <div className="form-shell-card__header">
          <div>
            <h2 id={`${prefix}-title`} className="section-heading-soft">{mode === "create" ? "Shift" : "Edit shift"}</h2>
            <p className="section-copy section-copy-soft">Define a working-time window, grace handling, and weekly-off pattern.</p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip"><strong>{formValue.start_time || "--:--"}</strong> start</span>
            <span className="queue-summary-chip"><strong>{formValue.end_time || "--:--"}</strong> end</span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          {mode === "edit" && item ? <PlatformGovernanceFormBanner detachPath={`/api/hr-admin/shifts/${itemId}/detach`} item={item} onDetached={onSaved ? () => onSaved("Shift detached from platform governance.") : undefined} /> : null}
          <FormSection title="Shift timing" description="Set the core start, end, duration, and grace values that control attendance interpretation.">
            <div className="form-grid">
              <label className="form-field"><span className="muted">Code</span><input {...propsFor("code")} className="input-control" disabled={codeLocked} required value={formValue.code} onChange={(e) => update("code", e.target.value)} />{fieldError("code")}<GovernanceLockHint fieldPath="code" item={item} /></label>
              <label className="form-field"><span className="muted">Name</span><input {...propsFor("name")} className="input-control" disabled={nameLocked} required value={formValue.name} onChange={(e) => update("name", e.target.value)} />{fieldError("name")}<GovernanceLockHint fieldPath="name" item={item} /></label>
              <label className="form-field"><span className="muted">Start time</span><input {...propsFor("start_time")} className="input-control" disabled={startLocked} required type="time" value={formValue.start_time} onChange={(e) => update("start_time", e.target.value)} />{fieldError("start_time")}<GovernanceLockHint fieldPath="start_time" item={item} /></label>
              <label className="form-field"><span className="muted">End time</span><input {...propsFor("end_time")} className="input-control" disabled={endLocked} required type="time" value={formValue.end_time} onChange={(e) => update("end_time", e.target.value)} />{fieldError("end_time")}<GovernanceLockHint fieldPath="end_time" item={item} /></label>
              <label className="form-field"><span className="muted">Working hours</span><input {...propsFor("working_hours")} className="input-control" disabled={workingHoursLocked} value={formValue.working_hours} onChange={(e) => update("working_hours", e.target.value)} />{fieldError("working_hours")}<GovernanceLockHint fieldPath="working_hours" item={item} /></label>
              <label className="form-field"><span className="muted">Break minutes</span><input {...propsFor("break_minutes")} className="input-control" disabled={breakMinutesLocked} type="number" value={formValue.break_minutes} onChange={(e) => update("break_minutes", Number(e.target.value))} />{fieldError("break_minutes")}<GovernanceLockHint fieldPath="break_minutes" item={item} /></label>
              <label className="form-field"><span className="muted">Grace in minutes</span><input {...propsFor("grace_in_minutes")} className="input-control" disabled={graceInLocked} type="number" value={formValue.grace_in_minutes} onChange={(e) => update("grace_in_minutes", Number(e.target.value))} />{fieldError("grace_in_minutes")}<GovernanceLockHint fieldPath="grace_in_minutes" item={item} /></label>
              <label className="form-field"><span className="muted">Grace out minutes</span><input {...propsFor("grace_out_minutes")} className="input-control" disabled={graceOutLocked} type="number" value={formValue.grace_out_minutes} onChange={(e) => update("grace_out_minutes", Number(e.target.value))} />{fieldError("grace_out_minutes")}<GovernanceLockHint fieldPath="grace_out_minutes" item={item} /></label>
            </div>
          </FormSection>

          <FormSection title="Operational behavior" description="Control whether the shift is active, flexible, or spans overnight working patterns.">
            <div className="toggle-field-list">
              <label className="toggle-field"><div><strong>Night shift</strong><p className="section-copy">Use when the shift crosses calendar boundaries overnight.</p><GovernanceLockHint fieldPath="is_night_shift" item={item} /></div><input {...propsFor("is_night_shift")} checked={formValue.is_night_shift} disabled={nightShiftLocked} onChange={(e) => update("is_night_shift", e.target.checked)} type="checkbox" />{fieldError("is_night_shift")}</label>
              <label className="toggle-field"><div><strong>Flexible shift</strong><p className="section-copy">Allow looser timing assumptions when this shift should not behave like a rigid fixed window.</p><GovernanceLockHint fieldPath="is_flexible" item={item} /></div><input {...propsFor("is_flexible")} checked={formValue.is_flexible} disabled={flexibleLocked} onChange={(e) => update("is_flexible", e.target.checked)} type="checkbox" />{fieldError("is_flexible")}</label>
              <label className="toggle-field"><div><strong>Active</strong><p className="section-copy">Only active shifts are expected to be used in ongoing attendance operations.</p><GovernanceLockHint fieldPath="is_active" item={item} /></div><input {...propsFor("is_active")} checked={formValue.is_active} disabled={activeLocked} onChange={(e) => update("is_active", e.target.checked)} type="checkbox" />{fieldError("is_active")}</label>
            </div>
          </FormSection>

          <FormSection fullWidth title="Weekly off days" description="Mark the off-days that should be treated as non-working defaults for this shift.">
            {fieldError("weekly_off_days")}
            <GovernanceLockHint fieldPath="weekly_off_days" item={item} />
            <div className="toggle-field-list">
            {DAYS.map((day) => (
              <label className="toggle-field" key={day.value}>
                <div>
                  <strong>{day.label}</strong>
                  <p className="section-copy">Mark this day as a regular weekly off for the shift.</p>
                </div>
                <input aria-invalid={Boolean(fieldErrors.weekly_off_days)} aria-describedby={fieldErrors.weekly_off_days ? `${prefix}-weekly_off_days` : undefined} checked={formValue.weekly_off_days.includes(day.value)} disabled={weeklyOffDaysLocked} onChange={() => toggleWeeklyOff(day.value)} type="checkbox" />
              </label>
            ))}
            </div>
          </FormSection>
        </div>
        {error ? <div ref={errorRef} tabIndex={-1} className="notice notice--error" role="alert"><strong>Save failed.</strong><span className="muted">{error}</span></div> : null}
        <div className="form-actions-bar">
          <span className="muted">Shift changes save back into attendance operations immediately.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting || acceptedUnconfirmed || (mode === "edit" && item?.can_edit_directly === false)} type="submit">{acceptedUnconfirmed ? "Accepted; awaiting confirmation" : isSubmitting ? "Saving..." : mode === "create" ? "Create shift" : item && item.can_edit_directly === false ? "Direct edit unavailable" : "Save changes"}</button>
            <button className="button button--secondary" onClick={handleCancel} type="button">Cancel</button>
          </div>
        </div>
      </fieldset>
    </form>
  );
}
