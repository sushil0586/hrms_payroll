"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormSection } from "@/components/patterns/form-section";
import type { HrAdminPolicyOptions, HrAdminShiftRosterTemplateWriteInput } from "@/lib/types";

type Props = {
  initialValue: HrAdminShiftRosterTemplateWriteInput;
  mode: "create" | "edit";
  options: HrAdminPolicyOptions;
  itemId?: string;
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

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save roster template.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save roster template.");
}

export function ShiftRosterTemplateForm({ initialValue, mode, options, itemId }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<Key extends keyof HrAdminShiftRosterTemplateWriteInput>(key: Key, value: HrAdminShiftRosterTemplateWriteInput[Key]) {
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
            { position: current.config_snapshot.rotation.entries.length, shift_id: current.shift_id, span_days: 7 },
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const response = await fetch(mode === "create" ? "/api/hr-admin/shift-roster-templates" : `/api/hr-admin/shift-roster-templates/${itemId}`, {
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
    router.push("/hr-admin/shift-roster-templates");
    router.refresh();
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
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
              <label className="form-field"><span className="muted">Code</span><input className="input-control" required value={formValue.code} onChange={(e) => update("code", e.target.value)} /></label>
              <label className="form-field"><span className="muted">Name</span><input className="input-control" required value={formValue.name} onChange={(e) => update("name", e.target.value)} /></label>
              <label className="form-field"><span className="muted">Status</span><select className="input-control" value={formValue.status} onChange={(e) => update("status", e.target.value as HrAdminShiftRosterTemplateWriteInput["status"])}><option value="draft">Draft</option><option value="published">Published</option><option value="locked">Locked</option></select></label>
              <label className="form-field"><span className="muted">Base shift</span><select className="input-control" value={formValue.shift_id ?? ""} onChange={(e) => update("shift_id", e.target.value || null)}>{selectOptions(options.shifts)}</select></label>
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
                <label className="form-field"><span className="muted">Rotation anchor date</span><input className="input-control" type="date" value={formValue.config_snapshot.rotation.anchor_date ?? ""} onChange={(e) => setFormValue((current) => ({ ...current, config_snapshot: { ...current.config_snapshot, rotation: { ...current.config_snapshot.rotation, anchor_date: e.target.value || null } } }))} /></label>
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
        {error ? <div className="notice"><strong>Save failed.</strong><span className="muted">{error}</span></div> : null}
        <div className="form-actions-bar">
          <span className="muted">Draft templates can be tested in rollout preview first. Published and locked templates are safer for operational rollout.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting} type="submit">{isSubmitting ? "Saving..." : mode === "create" ? "Create template" : "Save changes"}</button>
            <button className="button button--secondary" onClick={() => router.back()} type="button">Cancel</button>
          </div>
        </div>
      </section>
    </form>
  );
}
