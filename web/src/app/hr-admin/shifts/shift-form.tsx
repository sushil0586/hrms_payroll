"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormSection } from "@/components/patterns/form-section";
import { PlatformGovernanceFormBanner } from "@/components/patterns/platform-governance-form-banner";
import { GovernanceLockHint, isGovernanceFieldLocked } from "@/components/patterns/platform-governance-locks";
import type { HrAdminShift, HrAdminShiftWriteInput } from "@/lib/types";

type Props = {
  initialValue: HrAdminShiftWriteInput;
  mode: "create" | "edit";
  itemId?: string;
  item?: HrAdminShift;
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

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save shift.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save shift.");
}

export function ShiftForm({ initialValue, mode, itemId, item }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  function toggleWeeklyOff(day: string) {
    setFormValue((current) => ({
      ...current,
      weekly_off_days: current.weekly_off_days.includes(day)
        ? current.weekly_off_days.filter((item) => item !== day)
        : [...current.weekly_off_days, day],
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "edit" && item && item.can_edit_directly === false) {
      setError("This record cannot be edited directly in its current governance state.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    const response = await fetch(mode === "create" ? "/api/hr-admin/shifts" : `/api/hr-admin/shifts/${itemId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formValue),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }
    router.push("/hr-admin/shifts");
    router.refresh();
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2 className="section-heading-soft">{mode === "create" ? "Shift" : "Edit shift"}</h2>
            <p className="section-copy section-copy-soft">Define a working-time window, grace handling, and weekly-off pattern.</p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip"><strong>{formValue.start_time || "--:--"}</strong> start</span>
            <span className="queue-summary-chip"><strong>{formValue.end_time || "--:--"}</strong> end</span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          {mode === "edit" && item ? <PlatformGovernanceFormBanner detachPath={`/api/hr-admin/shifts/${itemId}/detach`} item={item} /> : null}
          <FormSection title="Shift timing" description="Set the core start, end, duration, and grace values that control attendance interpretation.">
            <div className="form-grid">
              <label className="form-field"><span className="muted">Code</span><input className="input-control" disabled={codeLocked} required value={formValue.code} onChange={(e) => update("code", e.target.value)} /><GovernanceLockHint fieldPath="code" item={item} /></label>
              <label className="form-field"><span className="muted">Name</span><input className="input-control" disabled={nameLocked} required value={formValue.name} onChange={(e) => update("name", e.target.value)} /><GovernanceLockHint fieldPath="name" item={item} /></label>
              <label className="form-field"><span className="muted">Start time</span><input className="input-control" disabled={startLocked} required type="time" value={formValue.start_time} onChange={(e) => update("start_time", e.target.value)} /><GovernanceLockHint fieldPath="start_time" item={item} /></label>
              <label className="form-field"><span className="muted">End time</span><input className="input-control" disabled={endLocked} required type="time" value={formValue.end_time} onChange={(e) => update("end_time", e.target.value)} /><GovernanceLockHint fieldPath="end_time" item={item} /></label>
              <label className="form-field"><span className="muted">Working hours</span><input className="input-control" disabled={workingHoursLocked} value={formValue.working_hours} onChange={(e) => update("working_hours", e.target.value)} /><GovernanceLockHint fieldPath="working_hours" item={item} /></label>
              <label className="form-field"><span className="muted">Break minutes</span><input className="input-control" disabled={breakMinutesLocked} type="number" value={formValue.break_minutes} onChange={(e) => update("break_minutes", Number(e.target.value))} /><GovernanceLockHint fieldPath="break_minutes" item={item} /></label>
              <label className="form-field"><span className="muted">Grace in minutes</span><input className="input-control" disabled={graceInLocked} type="number" value={formValue.grace_in_minutes} onChange={(e) => update("grace_in_minutes", Number(e.target.value))} /><GovernanceLockHint fieldPath="grace_in_minutes" item={item} /></label>
              <label className="form-field"><span className="muted">Grace out minutes</span><input className="input-control" disabled={graceOutLocked} type="number" value={formValue.grace_out_minutes} onChange={(e) => update("grace_out_minutes", Number(e.target.value))} /><GovernanceLockHint fieldPath="grace_out_minutes" item={item} /></label>
            </div>
          </FormSection>

          <FormSection title="Operational behavior" description="Control whether the shift is active, flexible, or spans overnight working patterns.">
            <div className="toggle-field-list">
              <label className="toggle-field"><div><strong>Night shift</strong><p className="section-copy">Use when the shift crosses calendar boundaries overnight.</p><GovernanceLockHint fieldPath="is_night_shift" item={item} /></div><input checked={formValue.is_night_shift} disabled={nightShiftLocked} onChange={(e) => update("is_night_shift", e.target.checked)} type="checkbox" /></label>
              <label className="toggle-field"><div><strong>Flexible shift</strong><p className="section-copy">Allow looser timing assumptions when this shift should not behave like a rigid fixed window.</p><GovernanceLockHint fieldPath="is_flexible" item={item} /></div><input checked={formValue.is_flexible} disabled={flexibleLocked} onChange={(e) => update("is_flexible", e.target.checked)} type="checkbox" /></label>
              <label className="toggle-field"><div><strong>Active</strong><p className="section-copy">Only active shifts are expected to be used in ongoing attendance operations.</p><GovernanceLockHint fieldPath="is_active" item={item} /></div><input checked={formValue.is_active} disabled={activeLocked} onChange={(e) => update("is_active", e.target.checked)} type="checkbox" /></label>
            </div>
          </FormSection>

          <FormSection fullWidth title="Weekly off days" description="Mark the off-days that should be treated as non-working defaults for this shift.">
            <GovernanceLockHint fieldPath="weekly_off_days" item={item} />
            <div className="toggle-field-list">
            {DAYS.map((day) => (
              <label className="toggle-field" key={day.value}>
                <div>
                  <strong>{day.label}</strong>
                  <p className="section-copy">Mark this day as a regular weekly off for the shift.</p>
                </div>
                <input checked={formValue.weekly_off_days.includes(day.value)} disabled={weeklyOffDaysLocked} onChange={() => toggleWeeklyOff(day.value)} type="checkbox" />
              </label>
            ))}
            </div>
          </FormSection>
        </div>
        {error ? <div className="notice"><strong>Save failed.</strong><span className="muted">{error}</span></div> : null}
        <div className="form-actions-bar">
          <span className="muted">Shift changes save back into attendance operations immediately.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting || (mode === "edit" && item?.can_edit_directly === false)} type="submit">{isSubmitting ? "Saving..." : mode === "create" ? "Create shift" : item && item.can_edit_directly === false ? "Direct edit unavailable" : "Save changes"}</button>
            <button className="button button--secondary" onClick={() => router.back()} type="button">Cancel</button>
          </div>
        </div>
      </section>
    </form>
  );
}
