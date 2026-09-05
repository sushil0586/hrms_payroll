"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormSection } from "@/components/patterns/form-section";
import { PlatformGovernanceFormBanner } from "@/components/patterns/platform-governance-form-banner";
import { GovernanceLockHint, isGovernanceFieldLocked } from "@/components/patterns/platform-governance-locks";
import type { HrAdminAttendancePolicy, HrAdminAttendancePolicyPreview, HrAdminAttendancePolicyWriteInput, HrAdminPolicyOptions } from "@/lib/types";

type Props = {
  initialValue: HrAdminAttendancePolicyWriteInput;
  mode: "create" | "edit";
  options: HrAdminPolicyOptions;
  itemId?: string;
  item?: HrAdminAttendancePolicy;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save attendance policy.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save attendance policy.");
}

function selectOptions(items: Array<{ id: string; name: string }>) {
  return [
    <option key="blank" value="">
      Select an option
    </option>,
    ...items.map((item) => (
      <option key={item.id} value={item.id}>
        {item.name}
      </option>
    )),
  ];
}

export function AttendancePolicyForm({ initialValue, mode, options, itemId, item }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewEmployeeId, setPreviewEmployeeId] = useState(options.employees[0]?.id ?? "");
  const [previewDate, setPreviewDate] = useState("");
  const [previewCheckInAt, setPreviewCheckInAt] = useState("");
  const [previewCheckOutAt, setPreviewCheckOutAt] = useState("");
  const [previewStatus, setPreviewStatus] = useState("");
  const [previewShiftId, setPreviewShiftId] = useState("");
  const [previewResult, setPreviewResult] = useState<HrAdminAttendancePolicyPreview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const codeLocked = isGovernanceFieldLocked(item, "code");
  const nameLocked = isGovernanceFieldLocked(item, "name");
  const statusLocked = isGovernanceFieldLocked(item, "status");
  const attendanceUnitLocked = isGovernanceFieldLocked(item, "attendance_unit");
  const defaultShiftLocked = isGovernanceFieldLocked(item, "default_shift_id");
  const holidayCalendarLocked = isGovernanceFieldLocked(item, "holiday_calendar_id");
  const fullDayMinHoursLocked = isGovernanceFieldLocked(item, "full_day_min_hours");
  const halfDayMinHoursLocked = isGovernanceFieldLocked(item, "half_day_min_hours");
  const lateMarkLocked = isGovernanceFieldLocked(item, "late_mark_after_minutes");
  const maxLateMarksLocked = isGovernanceFieldLocked(item, "max_late_marks_in_period");
  const overtimeThresholdLocked = isGovernanceFieldLocked(item, "overtime_threshold_minutes");
  const manualEntryLocked = isGovernanceFieldLocked(item, "allow_manual_entry");
  const webCheckinLocked = isGovernanceFieldLocked(item, "allow_web_checkin");
  const mobileCheckinLocked = isGovernanceFieldLocked(item, "allow_mobile_checkin");
  const geofencedCheckinLocked = isGovernanceFieldLocked(item, "allow_geofenced_checkin");
  const regularizationLocked = isGovernanceFieldLocked(item, "allow_regularization");
  const regularizationReasonLocked = isGovernanceFieldLocked(item, "require_regularization_reason");
  const configSnapshotLocked = isGovernanceFieldLocked(item, "config_snapshot");

  function update<Key extends keyof HrAdminAttendancePolicyWriteInput>(key: Key, value: HrAdminAttendancePolicyWriteInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  function updateDerivation<Key extends keyof HrAdminAttendancePolicyWriteInput["config_snapshot"]["derivation"]>(
    key: Key,
    value: HrAdminAttendancePolicyWriteInput["config_snapshot"]["derivation"][Key],
  ) {
    setFormValue((current) => ({
      ...current,
      config_snapshot: {
        ...current.config_snapshot,
        derivation: {
          ...current.config_snapshot.derivation,
          [key]: value,
        },
      },
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
    const response = await fetch(mode === "create" ? "/api/hr-admin/attendance-policies" : `/api/hr-admin/attendance-policies/${itemId}`, {
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
    router.push("/hr-admin/attendance-policies");
    router.refresh();
  }

  async function handlePreview() {
    setPreviewError("");
    setPreviewResult(null);
    if (!previewEmployeeId) {
      setPreviewError("Select an employee for preview.");
      return;
    }
    if (!previewDate) {
      setPreviewError("Select an attendance date for preview.");
      return;
    }
    setIsPreviewLoading(true);
    const response = await fetch("/api/hr-admin/attendance-policies/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: previewEmployeeId,
        attendance_date: previewDate,
        requested_status: previewStatus || null,
        requested_check_in_at: previewCheckInAt ? new Date(previewCheckInAt).toISOString() : null,
        requested_check_out_at: previewCheckOutAt ? new Date(previewCheckOutAt).toISOString() : null,
        shift_id: previewShiftId || null,
        policy_id: itemId ?? null,
        default_shift_id: formValue.default_shift_id,
        holiday_calendar_id: formValue.holiday_calendar_id,
        full_day_min_hours: formValue.full_day_min_hours,
        half_day_min_hours: formValue.half_day_min_hours,
        late_mark_after_minutes: formValue.late_mark_after_minutes,
        overtime_threshold_minutes: formValue.overtime_threshold_minutes,
        config_snapshot: formValue.config_snapshot,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPreviewError(getErrorMessage(payload));
      setIsPreviewLoading(false);
      return;
    }
    setPreviewResult(payload as HrAdminAttendancePolicyPreview);
    setIsPreviewLoading(false);
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2>{mode === "create" ? "Create attendance policy" : "Edit attendance policy"}</h2>
            <p className="section-copy">Define the core attendance treatment rules, thresholds, and mapping dependencies that shape daily operational time handling.</p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip"><strong>{formValue.status}</strong> status</span>
            <span className="queue-summary-chip"><strong>{formValue.attendance_unit}</strong> attendance unit</span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          {mode === "edit" && item ? <PlatformGovernanceFormBanner detachPath={`/api/hr-admin/attendance-policies/${itemId}/detach`} item={item} /> : null}
          <FormSection title="Identity and mapping" description="Set the policy identity and the base references that support operational attendance treatment.">
            <div className="form-grid">
              <label className="form-field"><span className="muted">Code</span><input className="input-control" disabled={codeLocked} required value={formValue.code} onChange={(e) => update("code", e.target.value)} /><GovernanceLockHint fieldPath="code" item={item} /></label>
              <label className="form-field"><span className="muted">Name</span><input className="input-control" disabled={nameLocked} required value={formValue.name} onChange={(e) => update("name", e.target.value)} /><GovernanceLockHint fieldPath="name" item={item} /></label>
              <label className="form-field"><span className="muted">Status</span><select className="input-control" disabled={statusLocked} value={formValue.status} onChange={(e) => update("status", e.target.value)}>{options.attendance_policy_statuses.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select><GovernanceLockHint fieldPath="status" item={item} /></label>
              <label className="form-field"><span className="muted">Attendance unit</span><select className="input-control" disabled={attendanceUnitLocked} value={formValue.attendance_unit} onChange={(e) => update("attendance_unit", e.target.value)}>{options.attendance_units.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select><GovernanceLockHint fieldPath="attendance_unit" item={item} /></label>
              <label className="form-field"><span className="muted">Default shift</span><select className="input-control" disabled={defaultShiftLocked} value={formValue.default_shift_id ?? ""} onChange={(e) => update("default_shift_id", e.target.value || null)}>{selectOptions(options.shifts)}</select><GovernanceLockHint fieldPath="default_shift_id" item={item} /></label>
              <label className="form-field"><span className="muted">Holiday calendar</span><select className="input-control" disabled={holidayCalendarLocked} value={formValue.holiday_calendar_id ?? ""} onChange={(e) => update("holiday_calendar_id", e.target.value || null)}>{selectOptions(options.holiday_calendars)}</select><GovernanceLockHint fieldPath="holiday_calendar_id" item={item} /></label>
            </div>
          </FormSection>

          <FormSection title="Thresholds and limits" description="These values shape how the policy interprets full day, half day, lateness, and overtime.">
            <div className="form-grid">
              <label className="form-field"><span className="muted">Full day min hours</span><input className="input-control" disabled={fullDayMinHoursLocked} value={formValue.full_day_min_hours} onChange={(e) => update("full_day_min_hours", e.target.value)} /><GovernanceLockHint fieldPath="full_day_min_hours" item={item} /></label>
              <label className="form-field"><span className="muted">Half day min hours</span><input className="input-control" disabled={halfDayMinHoursLocked} value={formValue.half_day_min_hours} onChange={(e) => update("half_day_min_hours", e.target.value)} /><GovernanceLockHint fieldPath="half_day_min_hours" item={item} /></label>
              <label className="form-field"><span className="muted">Late mark after minutes</span><input className="input-control" disabled={lateMarkLocked} type="number" value={formValue.late_mark_after_minutes} onChange={(e) => update("late_mark_after_minutes", Number(e.target.value))} /><GovernanceLockHint fieldPath="late_mark_after_minutes" item={item} /></label>
              <label className="form-field"><span className="muted">Max late marks in period</span><input className="input-control" disabled={maxLateMarksLocked} type="number" value={formValue.max_late_marks_in_period} onChange={(e) => update("max_late_marks_in_period", Number(e.target.value))} /><GovernanceLockHint fieldPath="max_late_marks_in_period" item={item} /></label>
              <label className="form-field"><span className="muted">Overtime threshold minutes</span><input className="input-control" disabled={overtimeThresholdLocked} type="number" value={formValue.overtime_threshold_minutes} onChange={(e) => update("overtime_threshold_minutes", Number(e.target.value))} /><GovernanceLockHint fieldPath="overtime_threshold_minutes" item={item} /></label>
            </div>
          </FormSection>

          <FormSection fullWidth title="Input and regularization controls" description="These switches define which entry paths are allowed and how exception handling should work.">
            <div className="toggle-field-list">
              {[
                ["allow_manual_entry", "Allow manual entry", "Let attendance be entered manually when needed."],
                ["allow_web_checkin", "Allow web check-in", "Permit web-based check-in as a valid attendance input."],
                ["allow_mobile_checkin", "Allow mobile check-in", "Permit mobile-based check-in as a valid attendance input."],
                ["allow_geofenced_checkin", "Allow geofenced check-in", "Require or allow geofenced location-aware check-in."],
                ["allow_regularization", "Allow regularization", "Let employees submit attendance corrections after the fact."],
                ["require_regularization_reason", "Require regularization reason", "Force a reason when a regularization request is created."],
              ].map(([key, label, description]) => (
                <label className="toggle-field" key={key}>
                  <div>
                    <strong>{label}</strong>
                    <p className="section-copy">{description}</p>
                    {key === "allow_manual_entry" ? <GovernanceLockHint fieldPath="allow_manual_entry" item={item} /> : null}
                    {key === "allow_web_checkin" ? <GovernanceLockHint fieldPath="allow_web_checkin" item={item} /> : null}
                    {key === "allow_mobile_checkin" ? <GovernanceLockHint fieldPath="allow_mobile_checkin" item={item} /> : null}
                    {key === "allow_geofenced_checkin" ? <GovernanceLockHint fieldPath="allow_geofenced_checkin" item={item} /> : null}
                    {key === "allow_regularization" ? <GovernanceLockHint fieldPath="allow_regularization" item={item} /> : null}
                    {key === "require_regularization_reason" ? <GovernanceLockHint fieldPath="require_regularization_reason" item={item} /> : null}
                  </div>
                  <input
                    checked={Boolean(formValue[key as keyof HrAdminAttendancePolicyWriteInput])}
                    disabled={
                      key === "allow_manual_entry"
                        ? manualEntryLocked
                        : key === "allow_web_checkin"
                          ? webCheckinLocked
                          : key === "allow_mobile_checkin"
                            ? mobileCheckinLocked
                            : key === "allow_geofenced_checkin"
                              ? geofencedCheckinLocked
                              : key === "allow_regularization"
                                ? regularizationLocked
                                : key === "require_regularization_reason"
                                  ? regularizationReasonLocked
                                  : false
                    }
                    onChange={(e) => update(key as keyof HrAdminAttendancePolicyWriteInput, e.target.checked as never)}
                    type="checkbox"
                  />
                </label>
              ))}
            </div>
          </FormSection>

          <FormSection fullWidth title="Runtime derivation" description="Control whether attendance status should be auto-derived from punches, shifts, holidays, and policy thresholds instead of staying fully manual.">
            <GovernanceLockHint fieldPath="config_snapshot" item={item} />
            <fieldset disabled={configSnapshotLocked} style={{ border: 0, margin: 0, padding: 0 }}>
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Missing punch status</span>
                <select
                  className="input-control"
                  value={formValue.config_snapshot.derivation.missing_punch_status}
                  onChange={(e) => updateDerivation("missing_punch_status", e.target.value as "unknown" | "absent")}
                >
                  <option value="unknown">Unknown</option>
                  <option value="absent">Absent</option>
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Late status mode</span>
                <select
                  className="input-control"
                  value={formValue.config_snapshot.derivation.late_status_mode}
                  onChange={(e) => updateDerivation("late_status_mode", e.target.value as "present" | "late")}
                >
                  <option value="present">Keep status as present</option>
                  <option value="late">Set status to late</option>
                </select>
              </label>
            </div>
            <div className="toggle-field-list">
              {[
                ["enabled", "Enable automatic derivation", "Use attendance policy thresholds, punches, shift context, and holiday context to derive status and metrics automatically."],
                ["auto_mark_holiday", "Auto mark holiday", "When a matching holiday exists, let the runtime mark the day as holiday automatically."],
                ["auto_mark_weekly_off", "Auto mark weekly off", "Use shift weekly-off patterns to derive weekly-off status when appropriate."],
                ["derive_overtime", "Derive overtime from shift thresholds", "Calculate overtime automatically when recorded hours exceed the shift and policy threshold."],
              ].map(([key, label, description]) => (
                <label className="toggle-field" key={key}>
                  <div>
                    <strong>{label}</strong>
                    <p className="section-copy">{description}</p>
                  </div>
                  <input
                    checked={Boolean(formValue.config_snapshot.derivation[key as keyof HrAdminAttendancePolicyWriteInput["config_snapshot"]["derivation"]])}
                    onChange={(e) => updateDerivation(key as keyof HrAdminAttendancePolicyWriteInput["config_snapshot"]["derivation"], e.target.checked as never)}
                    type="checkbox"
                  />
                </label>
              ))}
            </div>
            </fieldset>
          </FormSection>

          <FormSection
            fullWidth
            title="Policy preview"
            description="Test how this draft policy will derive attendance for a real employee, date, and punch pattern before rollout."
          >
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Employee</span>
                <select className="input-control" value={previewEmployeeId} onChange={(e) => setPreviewEmployeeId(e.target.value)}>
                  {selectOptions(options.employees)}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Attendance date</span>
                <input className="input-control" type="date" value={previewDate} onChange={(e) => setPreviewDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span className="muted">Preview shift override</span>
                <select className="input-control" value={previewShiftId} onChange={(e) => setPreviewShiftId(e.target.value)}>
                  {selectOptions(options.shifts)}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Requested status override</span>
                <select className="input-control" value={previewStatus} onChange={(e) => setPreviewStatus(e.target.value)}>
                  <option value="">Auto derive</option>
                  {options.attendance_statuses.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Check in</span>
                <input className="input-control" type="datetime-local" value={previewCheckInAt} onChange={(e) => setPreviewCheckInAt(e.target.value)} />
              </label>
              <label className="form-field">
                <span className="muted">Check out</span>
                <input className="input-control" type="datetime-local" value={previewCheckOutAt} onChange={(e) => setPreviewCheckOutAt(e.target.value)} />
              </label>
            </div>
            <div className="form-actions-bar">
              <span className="muted">Preview uses the draft policy fields on this form, not only the currently saved policy.</span>
              <div className="form-actions-bar__buttons">
                <button className="button button--secondary" onClick={handlePreview} type="button">
                  {isPreviewLoading ? "Previewing..." : "Preview attendance outcome"}
                </button>
              </div>
            </div>
            {previewError ? (
              <div className="notice">
                <strong>Preview failed.</strong>
                <span className="muted">{previewError}</span>
              </div>
            ) : null}
            {previewResult ? (
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Derived status</span><span className="detail-value">{previewResult.derived_status}</span></div>
                <div className="detail-row"><span className="detail-label">Resolved shift</span><span className="detail-value">{previewResult.resolved_shift_name || "No shift"}</span></div>
                <div className="detail-row"><span className="detail-label">Matched holiday</span><span className="detail-value">{previewResult.matched_holiday_name ? `${previewResult.matched_holiday_name} (${previewResult.matched_holiday_type || "holiday"})` : "No holiday"}</span></div>
                <div className="detail-row"><span className="detail-label">Work duration</span><span className="detail-value">{previewResult.work_duration_hours} hrs</span></div>
                <div className="detail-row"><span className="detail-label">Overtime</span><span className="detail-value">{previewResult.overtime_hours} hrs</span></div>
                <div className="detail-row"><span className="detail-label">Late minutes</span><span className="detail-value">{previewResult.late_minutes}</span></div>
                <div className="detail-row"><span className="detail-label">Early exit minutes</span><span className="detail-value">{previewResult.early_exit_minutes}</span></div>
                <div className="detail-row"><span className="detail-label">Current resolved policy</span><span className="detail-value">{previewResult.current_resolved_policy_name || "No active policy"}</span></div>
                <div className="detail-row"><span className="detail-label">Current assignment priority</span><span className="detail-value">{previewResult.current_assignment_priority ?? "n/a"}</span></div>
                <div className="detail-row"><span className="detail-label">Draft matches current resolution</span><span className="detail-value">{previewResult.draft_policy_matches_current_resolution ? "Yes" : "No"}</span></div>
                <div className="detail-row detail-row--stacked">
                  <span className="detail-label">Current assignment scope</span>
                  <span className="detail-value">{previewResult.current_assignment_scope?.length ? previewResult.current_assignment_scope.join(" • ") : "No matched assignment scope"}</span>
                </div>
              </div>
            ) : null}
          </FormSection>
        </div>

        {error ? <div className="notice"><strong>Save failed.</strong><span className="muted">{error}</span></div> : null}
        <div className="form-actions-bar">
          <span className="muted">Policy changes save back into the attendance policy catalog and stay ready for scoped assignments.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting || (mode === "edit" && item?.can_edit_directly === false)} type="submit">{isSubmitting ? "Saving..." : mode === "create" ? "Create attendance policy" : item && item.can_edit_directly === false ? "Direct edit unavailable" : "Save changes"}</button>
            <button className="button button--secondary" onClick={() => router.back()} type="button">Cancel</button>
          </div>
        </div>
      </section>
    </form>
  );
}
