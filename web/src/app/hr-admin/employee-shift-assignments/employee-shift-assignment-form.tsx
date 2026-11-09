"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { useValidationFocus } from "@/lib/ui/use-validation-focus";
import { useFeedbackFocus } from "@/lib/ui/use-feedback-focus";
import { hasFieldErrors, requireValue, validateDateOrder } from "@/lib/ui/validation";

import { rememberActionSuccess } from "@/components/patterns/action-feedback-receipt";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { EmployeeSearchSelect } from "@/components/patterns/employee-search-select";
import { FormSection } from "@/components/patterns/form-section";
import type {
  HrAdminEmployeeShiftAssignmentConflictCheck,
  HrAdminEmployeeShiftAssignmentWriteInput,
  HrAdminPolicyWorkbenchOptions,
} from "@/lib/types";

type Props = {
  initialValue: HrAdminEmployeeShiftAssignmentWriteInput;
  mode: "create" | "edit";
  options: Pick<HrAdminPolicyWorkbenchOptions, "shifts">;
  itemId?: string;
  initialEmployeeLabel?: string | null;
  cancelHref?: string;
  successHref?: string;
  compact?: boolean;
  onSaved?: (message: string) => Promise<boolean> | boolean;
  onCancel?: () => void;
};

const fieldLabels = { employee_id: "Employee", shift_id: "Base shift", assignment_kind: "Assignment mode", effective_from: "Effective from", effective_to: "Effective to", is_primary: "Primary assignment", config_snapshot: "Rotation design" };
type Field = keyof typeof fieldLabels;
type Errors = Partial<Record<Field, string>>;
function extractErrors(payload: unknown): { fields: Errors; message: string } {
  const fields: Errors = {};
  if (!payload || typeof payload !== "object") return { fields, message: "Unable to save shift assignment." };
  const record = payload as Record<string, unknown>;
  for (const key of Object.keys(fieldLabels) as Field[]) {
    const value = record[key];
    if (value) fields[key] = Array.isArray(value) ? value.map(String).join(" ") : typeof value === "string" ? value : "Review the rotation configuration.";
  }
  if (hasFieldErrors(fields)) return { fields, message: "Review the highlighted fields." };
  const conflict = record.conflict_check as { summary?: string } | undefined;
  return { fields, message: conflict?.summary || (typeof record.detail === "string" ? record.detail : Array.isArray(record.non_field_errors) ? record.non_field_errors.join(" ") : "Unable to save shift assignment.") };
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

function FieldHint({ children, tone = "default" }: { children: string; tone?: "default" | "warning" }) {
  return <span className={`field-help-text${tone === "warning" ? " field-help-text--warning" : ""}`}>{children}</span>;
}

const subscribe = () => () => undefined;

export function EmployeeShiftAssignmentForm({
  initialValue,
  mode,
  options,
  itemId,
  initialEmployeeLabel,
  cancelHref,
  successHref = "/hr-admin/employee-shift-assignments",
  compact = false,
  onSaved,
  onCancel,
}: Props) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedUnconfirmed, setAcceptedUnconfirmed] = useState(false);
  const [conflictCheck, setConflictCheck] = useState<HrAdminEmployeeShiftAssignmentConflictCheck | null>(null);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Errors>({});
  const formRef = useValidationFocus<Field>(fieldErrors);
  const errorRef = useFeedbackFocus(error, isSubmitting, hasFieldErrors(fieldErrors));
  const errorPrefix = useId();
  const errorId = (field: Field) => `${errorPrefix}-${field}`;
  const fieldProps = (field: Field) => ({ name: field, "aria-label": fieldLabels[field], "aria-required": ["shift_id", "effective_from"].includes(field) || undefined, "aria-invalid": Boolean(fieldErrors[field]), "aria-describedby": fieldErrors[field] ? errorId(field) : undefined });
  const fieldError = (field: Field) => fieldErrors[field] ? <span className="field-error-text" id={errorId(field)}>{fieldLabels[field]}: {fieldErrors[field]}</span> : null;
  const submittingRef = useRef(false);
  const conflictRequestGeneration = useRef(0);
  const shiftWarning = options.shifts.length === 0 ? "No active shifts are available. Create a shift before assigning coverage." : null;

  function invalidateConflictPreview() {
    // Invalidate immediately, before the next effect cleanup or an older fetch settles.
    conflictRequestGeneration.current += 1;
    setConflictCheck(null);
    setIsCheckingConflicts(false);
  }

  function update<Key extends keyof HrAdminEmployeeShiftAssignmentWriteInput>(key: Key, value: HrAdminEmployeeShiftAssignmentWriteInput[Key]) {
    invalidateConflictPreview();
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setError("");
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  function updateRotationEntry(index: number, key: "shift_id" | "span_days", value: string | number | null) {
    invalidateConflictPreview();
    setFieldErrors((current) => ({ ...current, config_snapshot: undefined }));
    setError("");
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
    invalidateConflictPreview();
    setFieldErrors((current) => ({ ...current, config_snapshot: undefined }));
    setError("");
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
    invalidateConflictPreview();
    setFieldErrors((current) => ({ ...current, config_snapshot: undefined }));
    setError("");
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
    const generation = ++conflictRequestGeneration.current;
    const isCurrent = () => conflictRequestGeneration.current === generation;
    if (!formValue.employee_id || !formValue.shift_id || !formValue.effective_from || validateDateOrder(formValue.effective_from, formValue.effective_to, "Invalid date window.")) {
      return;
    }
    const timeoutId = window.setTimeout(async () => {
      if (!isCurrent()) return;
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
        if (!isCurrent()) return;
        if (!response.ok || !payload) {
          setConflictCheck(null);
          return;
        }
        setConflictCheck(payload);
      } catch {
        if (isCurrent()) setConflictCheck(null);
      } finally {
        if (isCurrent()) setIsCheckingConflicts(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      if (isCurrent()) conflictRequestGeneration.current += 1;
    };
  }, [formValue.assignment_kind, formValue.config_snapshot, formValue.effective_from, formValue.effective_to, formValue.employee_id, formValue.is_primary, formValue.shift_id, itemId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hydrated || submittingRef.current || acceptedUnconfirmed) return;
    const required: Errors = {
      employee_id: requireValue(formValue.employee_id, "Choose an employee."),
      shift_id: requireValue(formValue.shift_id, "Choose a base shift."),
      effective_from: requireValue(formValue.effective_from, "Enter an effective from date."),
      effective_to: validateDateOrder(formValue.effective_from, formValue.effective_to, "Must be on or after Effective from."),
    };
    setFieldErrors(required);
    if (hasFieldErrors(required)) { setError("Review the highlighted fields."); return; }
    if (conflictCheck?.has_blocking_conflict) {
      setError(conflictCheck.summary);
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    setError("");
    let response: Response;
    try {
      response = await fetch(mode === "create" ? "/api/hr-admin/employee-shift-assignments" : `/api/hr-admin/employee-shift-assignments/${itemId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValue),
      });
    } catch {
      setError("Unable to reach the server. Check your connection and try again.");
      setIsSubmitting(false);
      submittingRef.current = false;
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errors = extractErrors(payload);
      setFieldErrors(errors.fields);
      setError(errors.message);
      setIsSubmitting(false);
      submittingRef.current = false;
      return;
    }
    const successMessage = mode === "create" ? "Shift assignment created." : "Shift assignment updated.";
    if (onSaved) {
      setAcceptedUnconfirmed(true);
      let reconciled = false;
      try { reconciled = await onSaved(successMessage); } catch { /* Accepted write remains locked until confirmed. */ }
      if (!reconciled) {
        setError("The assignment was accepted, but the queue could not be confirmed. Do not submit it again; retry the queue read.");
        setIsSubmitting(false);
      }
      return;
    }
    rememberActionSuccess(successHref, String(payload.id || itemId || ""), "Action saved.", successMessage);
    router.push(successHref);
  }

  const rotationSummary = formValue.config_snapshot.rotation.entries
    .map((entry) => {
      const shiftName = options.shifts.find((item) => item.id === entry.shift_id)?.name || "Unselected shift";
      return `${shiftName} (${entry.span_days}d)`;
    })
    .join(" -> ");

  return (
    <form ref={formRef} data-local-update-hydrated={hydrated ? "true" : "false"} aria-busy={!hydrated || isSubmitting || undefined} className={`section form-layout-modern employee-shift-assignment-form${compact ? " employee-shift-assignment-form--modal" : ""}`} onSubmit={handleSubmit}>
      <fieldset aria-labelledby={`${errorPrefix}-title`} className="form-shell-card" disabled={!hydrated} style={{ margin: 0, minWidth: 0 }}>
        <div className="form-shell-card__header">
          <div>
            <h2 id={`${errorPrefix}-title`} className="section-heading-soft">{mode === "create" ? "Shift assignment" : "Edit assignment"}</h2>
            <p className="section-copy section-copy-soft">Configure fixed coverage, weekly rotation, or temporary override logic.</p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip"><strong>{formValue.assignment_kind.replace("_", " ")}</strong> mode</span>
            <span className="queue-summary-chip"><strong>{formValue.is_primary ? "primary" : "secondary"}</strong> assignment</span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          <FormSection title="Coverage window" description="Choose the employee, base shift, assignment mode, and date window. Employee, Base shift and Effective from are required.">
            <div className="form-grid">
              <EmployeeSearchSelect
                name="employee_id" validationError={fieldErrors.employee_id} errorId={errorId("employee_id")}
                hint="Choose the employee whose shift coverage should resolve for attendance."
                selectedLabel={initialEmployeeLabel}
                value={formValue.employee_id ?? ""}
                onChange={(value) => update("employee_id", value || null)}
              />
              <label className="form-field"><span className="muted">Base shift</span><select {...fieldProps("shift_id")} className="input-control" disabled={Boolean(shiftWarning)} value={formValue.shift_id ?? ""} onChange={(e) => update("shift_id", e.target.value || null)}>{selectOptions(options.shifts)}</select>{fieldError("shift_id")}<FieldHint tone={shiftWarning ? "warning" : "default"}>{shiftWarning ?? "Choose the default shift for fixed, override, and rotation coverage."}</FieldHint></label>
              <label className="form-field">
                <span className="muted">Assignment mode</span>
                <select {...fieldProps("assignment_kind")} className="input-control" value={formValue.assignment_kind} onChange={(e) => update("assignment_kind", e.target.value as HrAdminEmployeeShiftAssignmentWriteInput["assignment_kind"])}>
                  <option value="fixed">Fixed shift</option>
                  <option value="weekly_rotation">Weekly rotation</option>
                  <option value="temporary_override">Temporary override</option>
                </select>
                {fieldError("assignment_kind")}
              </label>
              <label className="form-field"><span className="muted">Effective from</span><input {...fieldProps("effective_from")} className="input-control" type="date" value={formValue.effective_from} onChange={(e) => update("effective_from", e.target.value)} />{fieldError("effective_from")}</label>
              <label className="form-field"><span className="muted">Effective to</span><input {...fieldProps("effective_to")} className="input-control" type="date" value={formValue.effective_to ?? ""} onChange={(e) => update("effective_to", e.target.value || null)} />{fieldError("effective_to")}</label>
            </div>
            <div className="toggle-field-list">
              <label className="toggle-field">
                <div>
                  <strong>Primary assignment</strong>
                  <p className="section-copy">Primary assignments win when multiple eligible windows of the same kind could otherwise match the same employee and date.</p>
                </div>
                <input {...fieldProps("is_primary")} checked={formValue.is_primary} onChange={(e) => update("is_primary", e.target.checked)} type="checkbox" />
                {fieldError("is_primary")}
              </label>
            </div>
          </FormSection>

          {formValue.assignment_kind === "weekly_rotation" ? (
            <FormSection title="Rotation design" description="Build the weekly shift sequence. The runtime will cycle through these entries using the anchor date and span days.">
              <div role="group" {...fieldProps("config_snapshot")} tabIndex={fieldErrors.config_snapshot ? -1 : undefined}>
              {fieldError("config_snapshot")}
              <div className="form-grid">
                <label className="form-field">
                  <span className="muted">Rotation anchor date</span>
                  <input
                    aria-label="Rotation anchor date"
                    className="input-control"
                    type="date"
                    value={formValue.config_snapshot.rotation.anchor_date ?? ""}
                    onChange={(e) => {
                      setFieldErrors((current) => ({ ...current, config_snapshot: undefined }));
                      setError("");
                      setFormValue((current) => ({
                        ...current,
                        config_snapshot: {
                          ...current.config_snapshot,
                          rotation: {
                            ...current.config_snapshot.rotation,
                            anchor_date: e.target.value || null,
                          },
                        },
                      }));
                    }}
                  />
                </label>
              </div>
              <div className="detail-grid">
                {formValue.config_snapshot.rotation.entries.map((entry, index) => (
                  <div className="detail-row" key={`${entry.position}-${index}`}>
                    <span className="detail-label">Step {index + 1}</span>
                    <span className="detail-value">
                      <span className="inline-form-row">
                        <select aria-label={`Step ${index + 1} shift`} className="input-control" disabled={Boolean(shiftWarning)} value={entry.shift_id ?? ""} onChange={(e) => updateRotationEntry(index, "shift_id", e.target.value || null)}>
                          {selectOptions(options.shifts)}
                        </select>
                        <input aria-label={`Step ${index + 1} span days`} className="input-control" min={1} type="number" value={entry.span_days} onChange={(e) => updateRotationEntry(index, "span_days", Number(e.target.value))} />
                        <button className="button button--secondary" disabled={formValue.config_snapshot.rotation.entries.length <= 1} onClick={() => removeRotationEntry(index)} type="button">
                          Remove
                        </button>
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="form-actions-bar">
                <span className={shiftWarning ? "field-help-text field-help-text--warning" : "muted"}>{shiftWarning ?? (rotationSummary || "No rotation steps configured yet.")}</span>
                <div className="form-actions-bar__buttons">
                  <button className="button button--secondary" onClick={addRotationEntry} type="button">
                    Add rotation step
                  </button>
                </div>
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

        {error ? <div className="notice notice--error" ref={errorRef} role="alert" tabIndex={-1}><strong>Save failed.</strong><span className="muted">{error}</span></div> : null}
        <div className="form-actions-bar">
          <span className="muted">Shift assignment runtime supports fixed windows, weekly rotations, and temporary overrides.</span>
          <div className="form-actions-bar__buttons">
            <AsyncActionButton className="button button--primary" disabled={acceptedUnconfirmed} pending={isSubmitting} pendingLabel="Saving shift assignment" type="submit">{acceptedUnconfirmed ? "Accepted; awaiting confirmation" : mode === "create" ? "Create assignment" : "Save changes"}</AsyncActionButton>
            <button className="button button--secondary" onClick={() => onCancel ? onCancel() : (cancelHref ? router.push(cancelHref) : router.back())} type="button">Cancel</button>
          </div>
        </div>
      </fieldset>
    </form>
  );
}
