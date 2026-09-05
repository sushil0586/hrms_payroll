"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { FormSection } from "@/components/patterns/form-section";
import type {
  HrAdminEmployeeShiftAssignmentConflictCheck,
  HrAdminEmployeeShiftAssignmentWriteInput,
  HrAdminPolicyOptions,
} from "@/lib/types";

type Props = {
  initialValue: HrAdminEmployeeShiftAssignmentWriteInput;
  mode: "create" | "edit";
  options: HrAdminPolicyOptions;
  itemId?: string;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save shift assignment.";
  const conflictCheck = (payload as { conflict_check?: { summary?: string } }).conflict_check;
  if (conflictCheck?.summary) return conflictCheck.summary;
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save shift assignment.");
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

export function EmployeeShiftAssignmentForm({ initialValue, mode, options, itemId }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictCheck, setConflictCheck] = useState<HrAdminEmployeeShiftAssignmentConflictCheck | null>(null);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  function update<Key extends keyof HrAdminEmployeeShiftAssignmentWriteInput>(key: Key, value: HrAdminEmployeeShiftAssignmentWriteInput[Key]) {
    setConflictCheck(null);
    setIsCheckingConflicts(false);
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  function updateRotationEntry(index: number, key: "shift_id" | "span_days", value: string | number | null) {
    setFormValue((current) => ({
      ...current,
      config_snapshot: {
        ...current.config_snapshot,
        rotation: {
          ...current.config_snapshot.rotation,
          entries: current.config_snapshot.rotation.entries.map((entry, entryIndex) =>
            entryIndex === index
              ? {
                  ...entry,
                  [key]: key === "span_days" ? Math.max(Number(value || 1), 1) : value,
                }
              : entry,
          ),
        },
      },
    }));
  }

  function addRotationEntry() {
    setFormValue((current) => ({
      ...current,
      config_snapshot: {
        ...current.config_snapshot,
        rotation: {
          ...current.config_snapshot.rotation,
          entries: [
            ...current.config_snapshot.rotation.entries,
            {
              position: current.config_snapshot.rotation.entries.length,
              shift_id: current.shift_id,
              span_days: 7,
            },
          ],
        },
      },
    }));
  }

  function removeRotationEntry(index: number) {
    setFormValue((current) => ({
      ...current,
      config_snapshot: {
        ...current.config_snapshot,
        rotation: {
          ...current.config_snapshot.rotation,
          entries: current.config_snapshot.rotation.entries
            .filter((_, entryIndex) => entryIndex !== index)
            .map((entry, entryIndex) => ({ ...entry, position: entryIndex })),
        },
      },
    }));
  }

  useEffect(() => {
    if (!formValue.employee_id || !formValue.shift_id || !formValue.effective_from) {
      return;
    }
    const timeoutId = window.setTimeout(async () => {
      setIsCheckingConflicts(true);
      try {
        const response = await fetch("/api/hr-admin/employee-shift-assignments/conflicts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_id: itemId ?? null,
            employee_id: formValue.employee_id,
            shift_id: formValue.shift_id,
            assignment_kind: formValue.assignment_kind,
            effective_from: formValue.effective_from,
            effective_to: formValue.effective_to,
            is_primary: formValue.is_primary,
          }),
        });
        const payload = (await response.json().catch(() => null)) as HrAdminEmployeeShiftAssignmentConflictCheck | null;
        if (!response.ok || !payload) {
          setConflictCheck(null);
          return;
        }
        setConflictCheck(payload);
      } catch {
        setConflictCheck(null);
      } finally {
        setIsCheckingConflicts(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [formValue.assignment_kind, formValue.effective_from, formValue.effective_to, formValue.employee_id, formValue.is_primary, formValue.shift_id, itemId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (conflictCheck?.has_blocking_conflict) {
      setError(conflictCheck.summary);
      return;
    }
    setIsSubmitting(true);
    setError("");
    const response = await fetch(mode === "create" ? "/api/hr-admin/employee-shift-assignments" : `/api/hr-admin/employee-shift-assignments/${itemId}`, {
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
    router.push("/hr-admin/employee-shift-assignments");
    router.refresh();
  }

  const rotationSummary = formValue.config_snapshot.rotation.entries
    .map((entry) => {
      const shiftName = options.shifts.find((item) => item.id === entry.shift_id)?.name || "Unselected shift";
      return `${shiftName} (${entry.span_days}d)`;
    })
    .join(" -> ");

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2 className="section-heading-soft">{mode === "create" ? "Shift assignment" : "Edit assignment"}</h2>
            <p className="section-copy section-copy-soft">Configure fixed coverage, weekly rotation, or temporary override logic.</p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip"><strong>{formValue.assignment_kind.replace("_", " ")}</strong> mode</span>
            <span className="queue-summary-chip"><strong>{formValue.is_primary ? "primary" : "secondary"}</strong> assignment</span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          <FormSection title="Coverage window" description="Choose the employee, base shift, assignment mode, and date window.">
            <div className="form-grid">
              <label className="form-field"><span className="muted">Employee</span><select className="input-control" value={formValue.employee_id ?? ""} onChange={(e) => update("employee_id", e.target.value || null)}>{selectOptions(options.employees)}</select></label>
              <label className="form-field"><span className="muted">Base shift</span><select className="input-control" value={formValue.shift_id ?? ""} onChange={(e) => update("shift_id", e.target.value || null)}>{selectOptions(options.shifts)}</select></label>
              <label className="form-field">
                <span className="muted">Assignment mode</span>
                <select className="input-control" value={formValue.assignment_kind} onChange={(e) => update("assignment_kind", e.target.value as HrAdminEmployeeShiftAssignmentWriteInput["assignment_kind"])}>
                  <option value="fixed">Fixed shift</option>
                  <option value="weekly_rotation">Weekly rotation</option>
                  <option value="temporary_override">Temporary override</option>
                </select>
              </label>
              <label className="form-field"><span className="muted">Effective from</span><input className="input-control" type="date" value={formValue.effective_from} onChange={(e) => update("effective_from", e.target.value)} /></label>
              <label className="form-field"><span className="muted">Effective to</span><input className="input-control" type="date" value={formValue.effective_to ?? ""} onChange={(e) => update("effective_to", e.target.value || null)} /></label>
            </div>
            <div className="toggle-field-list">
              <label className="toggle-field">
                <div>
                  <strong>Primary assignment</strong>
                  <p className="section-copy">Primary assignments win when multiple eligible windows of the same kind could otherwise match the same employee and date.</p>
                </div>
                <input checked={formValue.is_primary} onChange={(e) => update("is_primary", e.target.checked)} type="checkbox" />
              </label>
            </div>
          </FormSection>

          {formValue.assignment_kind === "weekly_rotation" ? (
            <FormSection title="Rotation design" description="Build the weekly shift sequence. The runtime will cycle through these entries using the anchor date and span days.">
              <div className="form-grid">
                <label className="form-field">
                  <span className="muted">Rotation anchor date</span>
                  <input
                    className="input-control"
                    type="date"
                    value={formValue.config_snapshot.rotation.anchor_date ?? ""}
                    onChange={(e) =>
                      setFormValue((current) => ({
                        ...current,
                        config_snapshot: {
                          ...current.config_snapshot,
                          rotation: {
                            ...current.config_snapshot.rotation,
                            anchor_date: e.target.value || null,
                          },
                        },
                      }))
                    }
                  />
                </label>
              </div>
              <div className="detail-grid">
                {formValue.config_snapshot.rotation.entries.map((entry, index) => (
                  <div className="detail-row" key={`${entry.position}-${index}`}>
                    <span className="detail-label">Step {index + 1}</span>
                    <span className="detail-value">
                      <span className="inline-form-row">
                        <select className="input-control" value={entry.shift_id ?? ""} onChange={(e) => updateRotationEntry(index, "shift_id", e.target.value || null)}>
                          {selectOptions(options.shifts)}
                        </select>
                        <input className="input-control" min={1} type="number" value={entry.span_days} onChange={(e) => updateRotationEntry(index, "span_days", Number(e.target.value))} />
                        <button className="button button--secondary" disabled={formValue.config_snapshot.rotation.entries.length <= 1} onClick={() => removeRotationEntry(index)} type="button">
                          Remove
                        </button>
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="form-actions-bar">
                <span className="muted">{rotationSummary || "No rotation steps configured yet."}</span>
                <div className="form-actions-bar__buttons">
                  <button className="button button--secondary" onClick={addRotationEntry} type="button">
                    Add rotation step
                  </button>
                </div>
              </div>
            </FormSection>
          ) : (
            <FormSection
              title={formValue.assignment_kind === "temporary_override" ? "Override behavior" : "Fixed behavior"}
              description={
                formValue.assignment_kind === "temporary_override"
                  ? "Temporary overrides win over other windows for their effective dates, which is useful for special shifts, events, and short-term roster deviations."
                  : "Fixed assignments keep one shift active for the whole effective window."
              }
            >
              <div className="notice">
                <strong>{formValue.assignment_kind === "temporary_override" ? "Temporary override mode." : "Fixed shift mode."}</strong>
                <span className="muted">
                  {formValue.assignment_kind === "temporary_override"
                    ? "Use a tight date window so the override only takes precedence for the intended period."
                    : "The selected base shift will resolve for the employee throughout this window unless a higher-precedence override applies."}
                </span>
              </div>
            </FormSection>
          )}

          <FormSection title="Overlap governance" description="Check whether this date window collides with existing shift coverage before saving it into runtime.">
            <div className="notice">
              <strong>{conflictCheck ? (conflictCheck.has_blocking_conflict ? "Blocking overlap detected." : conflictCheck.has_conflicts ? "Window overlap review." : "Shift governance check.") : "Checking overlap impact..."}</strong>
              <span className="muted">
                {isCheckingConflicts && !conflictCheck
                  ? "Reviewing existing shift assignments for the employee."
                  : conflictCheck?.summary ?? "This panel will show whether the selected employee already has overlapping shift coverage in the same period."}
              </span>
            </div>
            {conflictCheck?.candidate_scope?.length ? (
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Candidate scope</span>
                  <span className="detail-value">{conflictCheck.candidate_scope.join(" • ")}</span>
                </div>
              </div>
            ) : null}
            {conflictCheck?.conflicts?.length ? (
              <div className="detail-grid">
                {conflictCheck.conflicts.map((conflict) => (
                  <div className="detail-row" key={conflict.assignment_id}>
                    <span className="detail-label">{conflict.shift_name}</span>
                    <span className="detail-value">
                      {`${conflict.assignment_kind.replace("_", " ")} • ${conflict.effective_from} to ${conflict.effective_to ?? "open ended"} • ${conflict.is_primary ? "primary" : "secondary"} • ${
                        conflict.is_primary_conflict ? "primary overlap" : "window overlap"
                      }`}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </FormSection>
        </div>

        {error ? <div className="notice"><strong>Save failed.</strong><span className="muted">{error}</span></div> : null}
        <div className="form-actions-bar">
          <span className="muted">Shift assignment runtime supports fixed windows, weekly rotations, and temporary overrides.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting} type="submit">{isSubmitting ? "Saving..." : mode === "create" ? "Create assignment" : "Save changes"}</button>
            <button className="button button--secondary" onClick={() => router.back()} type="button">Cancel</button>
          </div>
        </div>
      </section>
    </form>
  );
}
