"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormSection } from "@/components/patterns/form-section";
import type {
  HrAdminAttendanceOperationOptions,
  HrAdminAttendanceRecordWriteInput,
} from "@/lib/types";

type Props = {
  initialValue: HrAdminAttendanceRecordWriteInput;
  options: HrAdminAttendanceOperationOptions;
  itemId: string;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save attendance record.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save attendance record.");
}

function selectOptions(items: Array<{ id: string; name: string }>) {
  return [
    <option key="blank" value="">Select an option</option>,
    ...items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>),
  ];
}

export function AttendanceRecordForm({ initialValue, options, itemId }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<Key extends keyof HrAdminAttendanceRecordWriteInput>(key: Key, value: HrAdminAttendanceRecordWriteInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const response = await fetch(`/api/hr-admin/attendance-records/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formValue,
        check_in_at: formValue.check_in_at ? new Date(formValue.check_in_at).toISOString() : null,
        check_out_at: formValue.check_out_at ? new Date(formValue.check_out_at).toISOString() : null,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }
    router.push("/hr-admin/attendance-records");
    router.refresh();
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2>Edit attendance record</h2>
            <p className="section-copy">Adjust operational values, source assumptions, and lock state for a single day-level attendance row.</p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip"><strong>{formValue.status}</strong> status</span>
            <span className="queue-summary-chip"><strong>{formValue.source}</strong> source</span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          <FormSection title="Attendance interpretation" description="Update the row status, source, shift linkage, and timing details used in downstream attendance logic.">
            <div className="form-grid">
              <label className="form-field"><span className="muted">Status</span><select className="input-control" value={formValue.status} onChange={(e) => update("status", e.target.value)}>{options.attendance_statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="form-field"><span className="muted">Source</span><select className="input-control" value={formValue.source} onChange={(e) => update("source", e.target.value)}>{options.attendance_sources.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="form-field"><span className="muted">Shift</span><select className="input-control" value={formValue.shift_id ?? ""} onChange={(e) => update("shift_id", e.target.value || null)}>{selectOptions(options.shifts)}</select></label>
              <label className="form-field"><span className="muted">Check in</span><input className="input-control" type="datetime-local" value={formValue.check_in_at ?? ""} onChange={(e) => update("check_in_at", e.target.value || null)} /></label>
              <label className="form-field"><span className="muted">Check out</span><input className="input-control" type="datetime-local" value={formValue.check_out_at ?? ""} onChange={(e) => update("check_out_at", e.target.value || null)} /></label>
              <label className="form-field"><span className="muted">Work duration hours</span><input className="input-control" value={formValue.work_duration_hours} onChange={(e) => update("work_duration_hours", e.target.value)} /></label>
              <label className="form-field"><span className="muted">Overtime hours</span><input className="input-control" value={formValue.overtime_hours} onChange={(e) => update("overtime_hours", e.target.value)} /></label>
              <label className="form-field"><span className="muted">Late minutes</span><input className="input-control" type="number" value={formValue.late_minutes} onChange={(e) => update("late_minutes", Number(e.target.value))} /></label>
              <label className="form-field"><span className="muted">Early exit minutes</span><input className="input-control" type="number" value={formValue.early_exit_minutes} onChange={(e) => update("early_exit_minutes", Number(e.target.value))} /></label>
              <label className="form-field" style={{ gridColumn: "1 / -1" }}><span className="muted">Notes</span><textarea className="input-control" rows={4} value={formValue.notes} onChange={(e) => update("notes", e.target.value)} /></label>
            </div>
          </FormSection>

          <FormSection title="Operational state" description="These switches control whether the row is considered regularized and whether further edits should be blocked.">
            <div className="toggle-field-list">
              <label className="toggle-field"><div><strong>Marked as regularized</strong><p className="section-copy">Keep the record aligned with the correction workflow outcome.</p></div><input checked={formValue.is_regularized} onChange={(e) => update("is_regularized", e.target.checked)} type="checkbox" /></label>
              <label className="toggle-field"><div><strong>Lock record</strong><p className="section-copy">Prevent additional edits when the row should be treated as finalized.</p></div><input checked={formValue.is_locked} onChange={(e) => update("is_locked", e.target.checked)} type="checkbox" /></label>
            </div>
          </FormSection>
        </div>
        {error ? <div className="notice"><strong>Save failed.</strong><span className="muted">{error}</span></div> : null}
        <div className="form-actions-bar">
          <span className="muted">Changes go straight back into the attendance record queue and affect downstream review state immediately.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting} type="submit">{isSubmitting ? "Saving..." : "Save attendance record"}</button>
            <button className="button button--secondary" onClick={() => router.back()} type="button">Cancel</button>
          </div>
        </div>
      </section>
    </form>
  );
}
