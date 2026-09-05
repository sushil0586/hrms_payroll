"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormSection } from "@/components/patterns/form-section";
import { PlatformGovernanceFormBanner } from "@/components/patterns/platform-governance-form-banner";
import { GovernanceLockHint, isGovernanceFieldLocked } from "@/components/patterns/platform-governance-locks";
import type { HrAdminAttendanceOperationOptions, HrAdminHolidayCalendar, HrAdminHolidayCalendarWriteInput } from "@/lib/types";

type Props = {
  initialValue: HrAdminHolidayCalendarWriteInput;
  mode: "create" | "edit";
  options: HrAdminAttendanceOperationOptions;
  itemId?: string;
  item?: HrAdminHolidayCalendar;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save holiday calendar.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save holiday calendar.");
}

function selectOptions(items: Array<{ id: string; name: string }>) {
  return [
    <option key="blank" value="">Select an option</option>,
    ...items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>),
  ];
}

export function HolidayCalendarForm({ initialValue, mode, options, itemId, item }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const codeLocked = isGovernanceFieldLocked(item, "code");
  const nameLocked = isGovernanceFieldLocked(item, "name");
  const yearLocked = isGovernanceFieldLocked(item, "year");
  const legalEntityLocked = isGovernanceFieldLocked(item, "legal_entity_id");
  const branchLocked = isGovernanceFieldLocked(item, "branch_id");
  const locationLocked = isGovernanceFieldLocked(item, "location_id");
  const activeLocked = isGovernanceFieldLocked(item, "is_active");
  const holidaysLocked = isGovernanceFieldLocked(item, "holidays");

  function update<Key extends keyof HrAdminHolidayCalendarWriteInput>(key: Key, value: HrAdminHolidayCalendarWriteInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  function updateHoliday(index: number, key: "date" | "name" | "description" | "holiday_type" | "is_optional", value: string | boolean) {
    setFormValue((current) => ({
      ...current,
      holidays: current.holidays.map((holiday, holidayIndex) =>
        holidayIndex === index ? { ...holiday, [key]: value } : holiday,
      ),
    }));
  }

  function addHoliday() {
    setFormValue((current) => ({
      ...current,
      holidays: [...current.holidays, { date: "", name: "", description: "", holiday_type: "general", is_optional: false }],
    }));
  }

  function removeHoliday(index: number) {
    setFormValue((current) => ({
      ...current,
      holidays: current.holidays.filter((_, holidayIndex) => holidayIndex !== index),
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
    const response = await fetch(mode === "create" ? "/api/hr-admin/holiday-calendars" : `/api/hr-admin/holiday-calendars/${itemId}`, {
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
    router.push("/hr-admin/holiday-calendars");
    router.refresh();
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2>{mode === "create" ? "Create holiday calendar" : "Edit holiday calendar"}</h2>
            <p className="section-copy">Define the calendar year, scope, and holiday rows that attendance and policy logic should respect.</p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip"><strong>{formValue.year || "Year"}</strong> calendar year</span>
            <span className="queue-summary-chip"><strong>{formValue.holidays.length}</strong> holiday rows</span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          {mode === "edit" && item ? <PlatformGovernanceFormBanner detachPath={`/api/hr-admin/holiday-calendars/${itemId}/detach`} item={item} /> : null}
          <FormSection title="Calendar identity and scope" description="Set the base calendar record and the branch, location, or legal scope it belongs to.">
            <div className="form-grid">
              <label className="form-field"><span className="muted">Code</span><input className="input-control" disabled={codeLocked} required value={formValue.code} onChange={(e) => update("code", e.target.value)} /><GovernanceLockHint fieldPath="code" item={item} /></label>
              <label className="form-field"><span className="muted">Name</span><input className="input-control" disabled={nameLocked} required value={formValue.name} onChange={(e) => update("name", e.target.value)} /><GovernanceLockHint fieldPath="name" item={item} /></label>
              <label className="form-field"><span className="muted">Year</span><input className="input-control" disabled={yearLocked} required type="number" value={formValue.year ?? ""} onChange={(e) => update("year", Number(e.target.value))} /><GovernanceLockHint fieldPath="year" item={item} /></label>
              <label className="form-field"><span className="muted">Legal entity</span><select className="input-control" disabled={legalEntityLocked} value={formValue.legal_entity_id ?? ""} onChange={(e) => update("legal_entity_id", e.target.value || null)}>{selectOptions(options.legal_entities)}</select><GovernanceLockHint fieldPath="legal_entity_id" item={item} /></label>
              <label className="form-field"><span className="muted">Branch</span><select className="input-control" disabled={branchLocked} value={formValue.branch_id ?? ""} onChange={(e) => update("branch_id", e.target.value || null)}>{selectOptions(options.branches)}</select><GovernanceLockHint fieldPath="branch_id" item={item} /></label>
              <label className="form-field"><span className="muted">Location</span><select className="input-control" disabled={locationLocked} value={formValue.location_id ?? ""} onChange={(e) => update("location_id", e.target.value || null)}>{selectOptions(options.locations)}</select><GovernanceLockHint fieldPath="location_id" item={item} /></label>
            </div>
            <div className="toggle-field-list">
              <label className="toggle-field">
                <div>
                  <strong>Active</strong>
                  <p className="section-copy">Only active calendars are expected to be used for live attendance treatment.</p>
                  <GovernanceLockHint fieldPath="is_active" item={item} />
                </div>
                <input checked={formValue.is_active} disabled={activeLocked} onChange={(e) => update("is_active", e.target.checked)} type="checkbox" />
              </label>
            </div>
          </FormSection>

          <FormSection fullWidth title="Holiday rows" description="Add every holiday that should affect attendance and policy behavior for this calendar year.">
            <div className="form-actions-bar">
              <span className="muted">Each row can carry its own description and optional-holiday flag.</span>
              <div className="form-actions-bar__buttons">
                <button className="button button--secondary" disabled={holidaysLocked} onClick={addHoliday} type="button">Add holiday</button>
              </div>
            </div>
            <GovernanceLockHint fieldPath="holidays" item={item} />
            <div className="queue-list">
            {formValue.holidays.map((holiday, index) => (
              <div className="form-section-card form-section-card--full" key={holiday.id ?? `new-${index}`}>
                <div className="form-section-card__header">
                  <h2>Holiday {index + 1}</h2>
                </div>
                <div className="form-grid">
                  <label className="form-field"><span className="muted">Date</span><input className="input-control" disabled={holidaysLocked} required type="date" value={holiday.date} onChange={(e) => updateHoliday(index, "date", e.target.value)} /></label>
                  <label className="form-field"><span className="muted">Name</span><input className="input-control" disabled={holidaysLocked} required value={holiday.name} onChange={(e) => updateHoliday(index, "name", e.target.value)} /></label>
                  <label className="form-field"><span className="muted">Holiday type</span><select className="input-control" disabled={holidaysLocked} value={holiday.holiday_type} onChange={(e) => updateHoliday(index, "holiday_type", e.target.value)}><option value="general">General holiday</option><option value="compulsory">Compulsory holiday (CH)</option><option value="restricted">Restricted holiday (RH)</option></select></label>
                  <label className="form-field"><span className="muted">Description</span><input className="input-control" disabled={holidaysLocked} value={holiday.description} onChange={(e) => updateHoliday(index, "description", e.target.value)} /></label>
                </div>
                <div className="toggle-field-list">
                  <label className="toggle-field"><div><strong>Optional holiday</strong><p className="section-copy">Use this when the day should be visible but not treated as a mandatory non-working day for everyone.</p></div><input checked={holiday.is_optional} disabled={holidaysLocked} onChange={(e) => updateHoliday(index, "is_optional", e.target.checked)} type="checkbox" /></label>
                </div>
                <button className="button button--secondary" disabled={holidaysLocked} onClick={() => removeHoliday(index)} type="button">Remove holiday</button>
              </div>
            ))}
            </div>
          </FormSection>
        </div>

        {error ? <div className="notice"><strong>Save failed.</strong><span className="muted">{error}</span></div> : null}
        <div className="form-actions-bar">
          <span className="muted">Calendar changes save directly back into attendance operations and policy references.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting || (mode === "edit" && item?.can_edit_directly === false)} type="submit">{isSubmitting ? "Saving..." : mode === "create" ? "Create holiday calendar" : item && item.can_edit_directly === false ? "Direct edit unavailable" : "Save changes"}</button>
            <button className="button button--secondary" onClick={() => router.back()} type="button">Cancel</button>
          </div>
        </div>
      </section>
    </form>
  );
}
