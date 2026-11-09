"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { apiFieldErrors, mutationErrorMessage, networkMutationMessage } from "@/lib/ui/api-error-message";
import { useValidationFocus } from "@/lib/ui/use-validation-focus";
import { useFeedbackFocus } from "@/lib/ui/use-feedback-focus";
import { hasFieldErrors, requireText } from "@/lib/ui/validation";
import { rememberActionSuccess } from "@/components/patterns/action-feedback-receipt";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { FormSection } from "@/components/patterns/form-section";
import type { HrAdminPolicyOptions, HrAdminShiftRosterTemplateWriteInput } from "@/lib/types";

type Props = {
  initialValue: HrAdminShiftRosterTemplateWriteInput;
  mode: "create" | "edit";
  options: Pick<HrAdminPolicyOptions, "shifts">;
  itemId?: string;
  cancelHref?: string;
  successHref?: string;
  compact?: boolean;
  onSaved?: (message: string) => Promise<boolean> | boolean;
  onCancel?: () => void;
};

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

const fields = ["code", "name", "shift_id", "config_snapshot"] as const;
type Field = typeof fields[number];
const subscribe = () => () => undefined;

const guidedPatterns = [
  { value: "custom_cycle", label: "Custom cycle" },
  { value: "weekly_rotation", label: "Weekly rotation" },
  { value: "six_on_one_off", label: "6 on / 1 off" },
  { value: "five_on_two_off", label: "5 on / 2 off" },
  { value: "four_on_four_off", label: "4 on / 4 off" },
  { value: "two_two_three", label: "2-2-3" },
];

const guidedPatternEntries: Record<string, Array<{ entry_kind: "work" | "off"; span_days: number }>> = {
  six_on_one_off: [{ entry_kind: "work", span_days: 6 }, { entry_kind: "off", span_days: 1 }],
  five_on_two_off: [{ entry_kind: "work", span_days: 5 }, { entry_kind: "off", span_days: 2 }],
  four_on_four_off: [{ entry_kind: "work", span_days: 4 }, { entry_kind: "off", span_days: 4 }],
  two_two_three: [{ entry_kind: "work", span_days: 2 }, { entry_kind: "off", span_days: 2 }, { entry_kind: "work", span_days: 3 }],
};

export function ShiftRosterTemplateForm({
  initialValue,
  mode,
  options,
  itemId,
  cancelHref,
  successHref = "/hr-admin/shift-roster-templates",
  compact = false,
  onSaved,
  onCancel,
}: Props) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const formRef = useValidationFocus<Field>(fieldErrors);
  const prefix = useId();
  const fieldProps = (field: Field) => ({ name: field, "aria-label": ({ code: "Code", name: "Name", shift_id: "Base shift", config_snapshot: "Rotation pattern" })[field], "aria-invalid": Boolean(fieldErrors[field]), "aria-describedby": fieldErrors[field] ? `${prefix}-${field}` : undefined });
  const fieldError = (field: Field) => fieldErrors[field] ? <span className="field-error-text" id={`${prefix}-${field}`}>{fieldErrors[field]}</span> : null;
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedUnconfirmed, setAcceptedUnconfirmed] = useState(false);
  const submittingRef = useRef(false);
  const feedbackRef = useFeedbackFocus(error, isSubmitting, hasFieldErrors(fieldErrors));

  function update<Key extends keyof HrAdminShiftRosterTemplateWriteInput>(key: Key, value: HrAdminShiftRosterTemplateWriteInput[Key]) {
    setError("");
    setFieldErrors(current => ({ ...current, [key]: undefined }));
    setFormValue((current) => ({ ...current, [key]: value,
      ...(key === "shift_id" ? { config_snapshot: { ...current.config_snapshot, rotation: { ...current.config_snapshot.rotation, entries: current.config_snapshot.rotation.entries.map(entry => entry.entry_kind === "off" ? entry : !entry.shift_id || entry.shift_id === current.shift_id ? { ...entry, shift_id: value as string | null } : entry) } } } : {}),
    }));
  }

  function updateRotationEntry(index: number, key: "entry_kind" | "shift_id" | "span_days", value: string | number | null) {
    setError(""); setFieldErrors(current => ({ ...current, config_snapshot: undefined }));
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
                  ...(key === "entry_kind" && value === "off" ? { shift_id: null } : {}),
                }
              : entry,
          ),
        },
      },
    }));
  }

  function addRotationEntry() {
    setError(""); setFieldErrors(current => ({ ...current, config_snapshot: undefined }));
    setFormValue((current) => ({
      ...current,
      config_snapshot: {
        ...current.config_snapshot,
        rotation: {
          ...current.config_snapshot.rotation,
          entries: [
            ...current.config_snapshot.rotation.entries,
            { position: current.config_snapshot.rotation.entries.length, entry_kind: "work", shift_id: current.shift_id, span_days: 7 },
          ],
        },
      },
    }));
  }

  function updatePatternType(patternType: string) {
    setError(""); setFieldErrors(current => ({ ...current, config_snapshot: undefined }));
    setFormValue((current) => ({
      ...current,
      assignment_kind: "weekly_rotation",
      config_snapshot: {
        ...current.config_snapshot,
        rotation: {
          ...current.config_snapshot.rotation,
          pattern_type: patternType,
          entries: (guidedPatternEntries[patternType] ?? current.config_snapshot.rotation.entries).map((entry, index) => ({
            position: index,
            entry_kind: entry.entry_kind ?? "work",
            shift_id: entry.entry_kind === "off" ? null : current.shift_id,
            span_days: entry.span_days,
          })),
        },
      },
    }));
  }

  function removeRotationEntry(index: number) {
    setError(""); setFieldErrors(current => ({ ...current, config_snapshot: undefined }));
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hydrated || submittingRef.current || acceptedUnconfirmed) return;
    submittingRef.current = true;
    setError("");
    const errors: Partial<Record<Field, string>> = {
      code: requireText(formValue.code, "Enter a unique roster template code."),
      name: requireText(formValue.name, "Enter the roster template name."),
      shift_id: requireText(formValue.shift_id, "Select a base shift."),
    };
    if (formValue.assignment_kind === "weekly_rotation") {
      const entries = formValue.config_snapshot.rotation.entries;
      if (!entries.some(entry => (entry.entry_kind ?? "work") === "work")) errors.config_snapshot = "Add at least one work step.";
      else if (entries.some(entry => !Number.isInteger(entry.span_days) || entry.span_days < 1)) errors.config_snapshot = "Each rotation step needs a whole number of days greater than zero.";
    }
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) { setError("Review the highlighted fields and try again."); submittingRef.current = false; return; }
    setIsSubmitting(true);
    let response: Response;
    try {
      response = await fetch(mode === "create" ? "/api/hr-admin/shift-roster-templates" : `/api/hr-admin/shift-roster-templates/${itemId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValue),
      });
    } catch {
      setError(networkMutationMessage);
      setIsSubmitting(false);
      submittingRef.current = false;
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFieldErrors(apiFieldErrors<Field>(payload, fields));
      setError(mutationErrorMessage(payload, response.status, "Unable to save roster template."));
      setIsSubmitting(false);
      submittingRef.current = false;
      return;
    }
    const message = mode === "create" ? "Roster template created." : "Roster template updated.";
    if (onSaved) {
      setAcceptedUnconfirmed(true);
      let reconciled = false;
      try { reconciled = await onSaved(message); } catch { /* Preserve the accepted-write lock on confirmation failure. */ }
      if (!reconciled) {
        setError("The template was accepted, but the queue could not be confirmed. Do not submit it again; retry the queue read.");
        setIsSubmitting(false);
      }
      return;
    }
    rememberActionSuccess(successHref, String(payload.id || itemId || ""), "Action saved.", message);
    router.push(successHref);
  }

  return (
    <form ref={formRef} noValidate aria-busy={isSubmitting || undefined} className={`section form-layout-modern shift-roster-template-form${compact ? " shift-roster-template-form--modal" : ""}`} onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2>{mode === "create" ? "Create roster template" : "Edit roster template"}</h2>
            <p className="section-copy">Define a publishable shift pattern that operations can roll out to teams without rebuilding the same employee windows manually.</p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip"><strong>{formValue.status}</strong> status</span>
            <span className="queue-summary-chip"><strong>{formValue.assignment_kind.replace("_", " ")}</strong> mode</span>
          </div>
        </div>
        <div className="form-shell-card__grid">
          <FormSection title="Identity" description="Give the roster template a reusable code and business-friendly description.">
            <div className="form-grid">
              <label className="form-field"><span className="muted">Code</span><input {...fieldProps("code")} maxLength={60} className="input-control" required value={formValue.code} onChange={(e) => update("code", e.target.value)} />{fieldError("code")}</label>
              <label className="form-field"><span className="muted">Name</span><input {...fieldProps("name")} maxLength={255} className="input-control" required value={formValue.name} onChange={(e) => update("name", e.target.value)} />{fieldError("name")}</label>
              <label className="form-field"><span className="muted">Status</span><select className="input-control" value={formValue.status} onChange={(e) => update("status", e.target.value as HrAdminShiftRosterTemplateWriteInput["status"])}><option value="draft">Draft</option><option value="published">Published</option><option value="locked">Locked</option></select></label>
              <label className="form-field"><span className="muted">Base shift</span><select {...fieldProps("shift_id")} required className="input-control" value={formValue.shift_id ?? ""} onChange={(e) => update("shift_id", e.target.value || null)}>{selectOptions(options.shifts)}</select>{fieldError("shift_id")}</label>
              <label className="form-field"><span className="muted">Assignment mode</span><select className="input-control" value={formValue.assignment_kind} onChange={(e) => update("assignment_kind", e.target.value as HrAdminShiftRosterTemplateWriteInput["assignment_kind"])}><option value="fixed">Fixed</option><option value="weekly_rotation">Weekly rotation</option><option value="temporary_override">Temporary override</option></select></label>
            </div>
            <label className="form-field">
              <span className="muted">Description</span>
              <textarea className="input-control input-control--textarea" rows={3} value={formValue.description} onChange={(e) => update("description", e.target.value)} />
            </label>
          </FormSection>

          {formValue.assignment_kind === "weekly_rotation" ? (
            <FormSection title="Rotation pattern" description="Build the reusable rotation sequence that this template will stamp into employee shift assignments.">
              <div className="form-grid">
                <label className="form-field"><span className="muted">Pattern</span><select className="input-control" value={formValue.config_snapshot.rotation.pattern_type ?? "custom_cycle"} onChange={(e) => updatePatternType(e.target.value)}>{guidedPatterns.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <label className="form-field"><span className="muted">Rotation anchor date</span><input className="input-control" type="date" value={formValue.config_snapshot.rotation.anchor_date ?? ""} onChange={(e) => setFormValue((current) => ({ ...current, config_snapshot: { ...current.config_snapshot, rotation: { ...current.config_snapshot.rotation, anchor_date: e.target.value || null } } }))} /></label>
              </div>
              <div {...fieldProps("config_snapshot")} tabIndex={-1}>
                {fieldError("config_snapshot")}
                {formValue.config_snapshot.rotation.entries.map((entry, index) => (
                  <div className="detail-row" key={`${entry.position}-${index}`}>
                    <span className="detail-label">Step {index + 1}</span>
                    <span className="detail-value">
                      <span className="inline-form-row">
                        <select aria-label={`Step ${index + 1} type`} className="input-control" value={entry.entry_kind ?? "work"} onChange={(e) => updateRotationEntry(index, "entry_kind", e.target.value)}>
                          <option value="work">Work</option>
                          <option value="off">Off</option>
                        </select>
                        <select aria-label={`Step ${index + 1} shift`} className="input-control" disabled={(entry.entry_kind ?? "work") === "off"} value={entry.shift_id ?? ""} onChange={(e) => updateRotationEntry(index, "shift_id", e.target.value || null)}>
                          {selectOptions(options.shifts)}
                        </select>
                        <input aria-label={`Step ${index + 1} days`} className="input-control" min={1} type="number" value={entry.span_days} onChange={(e) => updateRotationEntry(index, "span_days", Number(e.target.value))} />
                        <button className="button button--secondary" disabled={formValue.config_snapshot.rotation.entries.length <= 1} onClick={() => removeRotationEntry(index)} type="button">Remove</button>
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="form-actions-bar">
                <span className="muted">Each step uses the selected shift for the configured span in days before the sequence moves forward.</span>
                <div className="form-actions-bar__buttons">
                  <button className="button button--secondary" onClick={addRotationEntry} type="button">Add rotation step</button>
                </div>
              </div>
            </FormSection>
          ) : (
            <FormSection title="Execution note" description="This template will roll out one consistent shift assignment per employee instead of a multi-step rotation.">
              <div className="notice">
                <strong>{formValue.assignment_kind === "temporary_override" ? "Temporary override template." : "Fixed shift template."}</strong>
                <span className="muted">
                  {formValue.assignment_kind === "temporary_override"
                    ? "Use this when operations need a short-term override that should outrank a worker’s normal schedule."
                    : "Use this when a team should receive one common base shift across the rollout window."}
                </span>
              </div>
            </FormSection>
          )}
        </div>
        {error ? <div ref={feedbackRef} tabIndex={-1} className="notice notice--error" role="alert"><strong>Save failed.</strong><span className="muted">{error}</span></div> : null}
        <div className="form-actions-bar">
          <span className="muted">Draft templates can be tested in rollout preview first. Published and locked templates are safer for operational rollout.</span>
          <div className="form-actions-bar__buttons">
            <AsyncActionButton className="button button--primary" disabled={!hydrated || acceptedUnconfirmed} pending={isSubmitting} pendingLabel="Saving roster template" type="submit">{acceptedUnconfirmed ? "Accepted; awaiting confirmation" : mode === "create" ? "Create template" : "Save changes"}</AsyncActionButton>
            <button className="button button--secondary" onClick={() => onCancel ? onCancel() : (cancelHref ? router.push(cancelHref) : router.back())} type="button">Cancel</button>
          </div>
        </div>
      </section>
    </form>
  );
}
