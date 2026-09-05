"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createEmptyWorkflowStep } from "@/app/hr-admin/workflow-templates/form-values";
import { FormSection } from "@/components/patterns/form-section";
import type {
  HrAdminWorkflowLifecycleTriggerPreset,
  HrAdminWorkflowOptions,
  HrAdminWorkflowRuleOption,
  HrAdminWorkflowStepWriteInput,
  HrAdminWorkflowTemplateWriteInput,
} from "@/lib/types";

type Props = {
  initialValue: HrAdminWorkflowTemplateWriteInput;
  mode: "create" | "edit";
  options: HrAdminWorkflowOptions;
  itemId?: string;
};

type WorkflowRuleSnapshot = Record<string, unknown>;

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save workflow template.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save workflow template.");
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

function normalizeRuleSnapshot(value: unknown): WorkflowRuleSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as WorkflowRuleSnapshot;
}

function cleanRuleSnapshot(value: WorkflowRuleSnapshot): WorkflowRuleSnapshot {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === null || entry === undefined || entry === "") return false;
      if (Array.isArray(entry) && entry.length === 0) return false;
      return true;
    }),
  );
}

function getRuleString(snapshot: WorkflowRuleSnapshot, key: string) {
  const value = snapshot[key];
  return typeof value === "string" ? value : "";
}

function getRuleStringArray(snapshot: WorkflowRuleSnapshot, key: string) {
  const value = snapshot[key];
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

function getRuleNumberValue(snapshot: WorkflowRuleSnapshot, key: string) {
  const value = snapshot[key];
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value;
  return "";
}

function getLifecycleTriggerPreset(options: HrAdminWorkflowOptions, triggerKey: string): HrAdminWorkflowLifecycleTriggerPreset | null {
  const presets = options.lifecycle_rule_options.trigger_presets;
  if (!presets.length) return null;

  const normalizedTriggerKey = triggerKey.trim().toLowerCase();
  const matchedPreset = presets.find((preset) =>
    preset.match_terms.some((term) => normalizedTriggerKey.includes(term.trim().toLowerCase())),
  );

  return matchedPreset ?? presets.find((preset) => preset.key === "default") ?? presets[0];
}

function buildLifecycleAnchorOptions(
  baseOptions: HrAdminWorkflowRuleOption[],
  selectedAnchors: string[],
): HrAdminWorkflowRuleOption[] {
  const optionMap = new Map(baseOptions.map((option) => [option.value, option]));
  for (const anchor of selectedAnchors) {
    if (!anchor || optionMap.has(anchor)) continue;
    optionMap.set(anchor, {
      value: anchor,
      label: `${anchor.replace(/_/g, " ")} (currently selected)`,
    });
  }
  return Array.from(optionMap.values());
}

export function WorkflowTemplateForm({ initialValue, mode, options, itemId }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLifecycleTemplate = formValue.module === "lifecycle";
  const lifecyclePreset = isLifecycleTemplate ? getLifecycleTriggerPreset(options, formValue.trigger_key) : null;

  function update<Key extends keyof HrAdminWorkflowTemplateWriteInput>(key: Key, value: HrAdminWorkflowTemplateWriteInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  function updateStep(index: number, patch: Partial<HrAdminWorkflowStepWriteInput>) {
    setFormValue((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => {
        if (stepIndex !== index) return step;
        return { ...step, ...patch };
      }),
    }));
  }

  function updateStepRule(index: number, patch: Partial<WorkflowRuleSnapshot>) {
    setFormValue((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => {
        if (stepIndex !== index) return step;
        const nextRuleSnapshot = cleanRuleSnapshot({
          ...normalizeRuleSnapshot(step.rule_snapshot),
          ...patch,
        });
        return { ...step, rule_snapshot: nextRuleSnapshot };
      }),
    }));
  }

  function addStep() {
    setFormValue((current) => ({
      ...current,
      steps: [
        ...current.steps,
        createEmptyWorkflowStep(
          {
            mode: options.workflow_step_modes[0]?.value,
            actor_type: options.workflow_actor_types[0]?.value,
            scope_type: options.workflow_scope_types[0]?.value,
          },
          current.steps.length + 1,
        ),
      ],
    }));
  }

  function removeStep(index: number) {
    setFormValue((current) => ({
      ...current,
      steps: current.steps
        .filter((_, stepIndex) => stepIndex !== index)
        .map((step, stepIndex) => ({ ...step, step_order: stepIndex + 1 })),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    let parsedConditionSnapshot: Record<string, unknown> = {};
    try {
      parsedConditionSnapshot = formValue.condition_snapshot.trim() ? JSON.parse(formValue.condition_snapshot) : {};
    } catch {
      setError("Condition snapshot must be valid JSON.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      ...formValue,
      condition_snapshot: parsedConditionSnapshot,
      steps: formValue.steps.map((step, stepIndex) => ({
        ...step,
        step_order: stepIndex + 1,
        rule_snapshot: cleanRuleSnapshot(normalizeRuleSnapshot(step.rule_snapshot)),
      })),
    };

    const response = await fetch(mode === "create" ? "/api/hr-admin/workflow-templates" : `/api/hr-admin/workflow-templates/${itemId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const responsePayload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(responsePayload));
      setIsSubmitting(false);
      return;
    }

    router.push("/hr-admin/workflow-templates");
    router.refresh();
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__intro">
          <h2 className="section-heading-soft">{mode === "create" ? "Workflow template" : "Edit workflow"}</h2>
          <p className="section-copy section-copy-soft">
            Define routing, escalation, and SLA controls in one reusable template.
          </p>
        </div>

        <FormSection description="Set template identity, module target, and effective dates." title="Template setup">
          <div className="form-grid">
            <label className="form-field"><span className="muted">Code</span><input className="input-control" required value={formValue.code} onChange={(e) => update("code", e.target.value)} /></label>
            <label className="form-field"><span className="muted">Name</span><input className="input-control" required value={formValue.name} onChange={(e) => update("name", e.target.value)} /></label>
            <label className="form-field">
              <span className="muted">Module</span>
              <select className="input-control" value={formValue.module} onChange={(e) => update("module", e.target.value)}>
                {options.workflow_modules.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Trigger key</span>
              <input className="input-control" required value={formValue.trigger_key} onChange={(e) => update("trigger_key", e.target.value)} />
            </label>
            <label className="form-field">
              <span className="muted">Status</span>
              <select className="input-control" value={formValue.status} onChange={(e) => update("status", e.target.value)}>
                {options.workflow_statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="form-field"><span className="muted">Version</span><input className="input-control" min={1} type="number" value={formValue.version} onChange={(e) => update("version", Number(e.target.value) || 1)} /></label>
            <label className="form-field"><span className="muted">Effective from</span><input className="input-control" type="date" value={formValue.effective_from ?? ""} onChange={(e) => update("effective_from", e.target.value || null)} /></label>
            <label className="form-field"><span className="muted">Effective to</span><input className="input-control" type="date" value={formValue.effective_to ?? ""} onChange={(e) => update("effective_to", e.target.value || null)} /></label>
            <label className="form-field form-field--full"><span className="muted">Description</span><textarea className="input-control" rows={3} value={formValue.description} onChange={(e) => update("description", e.target.value)} /></label>
            <label className="form-field form-field--full"><span className="muted">Condition snapshot JSON</span><textarea className="input-control" rows={5} value={formValue.condition_snapshot} onChange={(e) => update("condition_snapshot", e.target.value)} /></label>
          </div>

          {isLifecycleTemplate && lifecyclePreset ? (
            <div className="notice notice--spaced">
              <strong>Lifecycle SLA metadata is active.</strong>
              <span className="muted">
                {lifecyclePreset.label} matched this trigger. Step SLA controls below are populated from workflow options, so due anchors,
                offset units, and working-day choices stay aligned with backend validation.
              </span>
            </div>
          ) : null}

          <div className="detail-grid">
            <label className="detail-row">
              <span className="detail-label">System seeded</span>
              <input checked={formValue.is_system_seeded} onChange={(e) => update("is_system_seeded", e.target.checked)} type="checkbox" />
            </label>
          </div>
        </FormSection>

        <FormSection description="Configure actors, escalation timing, and action permissions." title="Workflow steps">
          <div className="form-shell-card__actions form-shell-card__actions--start form-shell-card__actions--flush">
            <button className="button button--secondary" onClick={addStep} type="button">Add step</button>
          </div>
          <div className="stack">
            {formValue.steps.map((step, index) => {
              const ruleSnapshot = normalizeRuleSnapshot(step.rule_snapshot);
              const primaryAnchor = getRuleString(ruleSnapshot, "due_anchor");
              const fallbackAnchors = getRuleStringArray(ruleSnapshot, "due_anchor_candidates");
              const selectedAnchors = primaryAnchor ? [primaryAnchor, ...fallbackAnchors] : fallbackAnchors;
              const presetAnchorValues = new Set((lifecyclePreset?.allowed_due_anchors ?? []).map((option) => option.value));
              const allowedDueAnchors = buildLifecycleAnchorOptions(
                lifecyclePreset?.allowed_due_anchors ?? [],
                selectedAnchors,
              );
              const invalidAnchors = selectedAnchors.filter(
                (anchor) => !presetAnchorValues.has(anchor),
              );
              const dueOffsetUnit =
                getRuleString(ruleSnapshot, "due_offset_unit") || options.lifecycle_rule_options.due_offset_units[0]?.value || "calendar_days";
              const nonWorkingWeekdays = getRuleStringArray(ruleSnapshot, "non_working_weekdays");

              return (
                <article className="record-card panel-card-soft" key={`${index}-${step.step_order}`}>
                  <div className="record-card__header">
                    <div className="record-card__title-block">
                      <h3>Step {index + 1}</h3>
                      <p>{step.name || "Name the step and define who acts on it."}</p>
                    </div>
                    <div className="record-card__actions">
                      <span className="record-chip">{step.actor_type}</span>
                      {formValue.steps.length > 1 ? (
                        <button className="button button--secondary" onClick={() => removeStep(index)} type="button">
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="form-grid">
                    <label className="form-field"><span className="muted">Name</span><input className="input-control" required value={step.name} onChange={(e) => updateStep(index, { name: e.target.value })} /></label>
                    <label className="form-field"><span className="muted">Mode</span><select className="input-control" value={step.mode} onChange={(e) => updateStep(index, { mode: e.target.value })}>{options.workflow_step_modes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                    <label className="form-field"><span className="muted">Actor type</span><select className="input-control" value={step.actor_type} onChange={(e) => updateStep(index, { actor_type: e.target.value })}>{options.workflow_actor_types.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                    <label className="form-field"><span className="muted">Role</span><select className="input-control" value={step.role_id ?? ""} onChange={(e) => updateStep(index, { role_id: e.target.value || null })}>{selectOptions(options.roles)}</select></label>
                    <label className="form-field"><span className="muted">Configured membership</span><select className="input-control" value={step.membership_id ?? ""} onChange={(e) => updateStep(index, { membership_id: e.target.value || null })}>{selectOptions(options.memberships)}</select></label>
                    <label className="form-field"><span className="muted">Scope type</span><select className="input-control" value={step.scope_type} onChange={(e) => updateStep(index, { scope_type: e.target.value })}>{options.workflow_scope_types.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                    <label className="form-field"><span className="muted">Permission key</span><input className="input-control" value={step.permission_key} onChange={(e) => updateStep(index, { permission_key: e.target.value })} /></label>
                    <label className="form-field"><span className="muted">Auto approve after hours</span><input className="input-control" min={0} type="number" value={step.auto_approve_after_hours} onChange={(e) => updateStep(index, { auto_approve_after_hours: Number(e.target.value) || 0 })} /></label>
                    <label className="form-field"><span className="muted">Escalate after hours</span><input className="input-control" min={0} type="number" value={step.escalate_after_hours} onChange={(e) => updateStep(index, { escalate_after_hours: Number(e.target.value) || 0 })} /></label>
                  </div>

                  {isLifecycleTemplate && lifecyclePreset ? (
                    <div className="record-card__notes">
                      <div className="detail-row" style={{ alignItems: "flex-start" }}>
                        <div>
                          <strong>Lifecycle SLA rule</strong>
                          <p className="muted" style={{ margin: "4px 0 0" }}>
                            Guided from <code>{lifecyclePreset.label}</code>. Matching terms: {lifecyclePreset.match_terms.length ? lifecyclePreset.match_terms.join(", ") : "generic lifecycle"}.
                          </p>
                        </div>
                        <button
                          className="button button--secondary"
                          onClick={() =>
                            updateStepRule(index, {
                              due_anchor: undefined,
                              due_anchor_candidates: undefined,
                              due_offset_days: undefined,
                              due_offset_unit: undefined,
                              non_working_weekdays: undefined,
                            })
                          }
                          type="button"
                        >
                          Clear SLA
                        </button>
                      </div>

                      <div className="form-grid form-grid--spaced">
                        <label className="form-field">
                          <span className="muted">Primary due anchor</span>
                          <select
                            className="input-control"
                            value={primaryAnchor}
                            onChange={(e) => {
                              const nextAnchor = e.target.value;
                              updateStepRule(index, {
                                due_anchor: nextAnchor || undefined,
                                due_anchor_candidates: fallbackAnchors.filter((anchor) => anchor !== nextAnchor),
                              });
                            }}
                          >
                            <option value="">No SLA anchor</option>
                            {allowedDueAnchors.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </label>

                        <label className="form-field">
                          <span className="muted">Due offset days</span>
                          <input
                            className="input-control"
                            placeholder="0"
                            type="number"
                            value={getRuleNumberValue(ruleSnapshot, "due_offset_days")}
                            onChange={(e) => {
                              const nextValue = e.target.value;
                              updateStepRule(index, {
                                due_offset_days: nextValue === "" ? undefined : Number(nextValue),
                              });
                            }}
                          />
                        </label>

                        <label className="form-field">
                          <span className="muted">Offset unit</span>
                          <select
                            className="input-control"
                            value={dueOffsetUnit}
                            onChange={(e) =>
                              updateStepRule(index, {
                                due_offset_unit: e.target.value,
                                non_working_weekdays: e.target.value === "business_days" ? nonWorkingWeekdays : undefined,
                              })
                            }
                          >
                            {options.lifecycle_rule_options.due_offset_units.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </label>

                        <div className="form-field form-field--full">
                          <span className="muted">Fallback anchors</span>
                          <div className="detail-grid" style={{ marginTop: 8 }}>
                            {allowedDueAnchors.map((option) => {
                              const isChecked = fallbackAnchors.includes(option.value);
                              const isDisabled = option.value === primaryAnchor;
                              return (
                                <label className="detail-row" key={option.value}>
                                  <span className="detail-label">{option.label}</span>
                                  <input
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onChange={(e) => {
                                      const nextAnchors = e.target.checked
                                        ? Array.from(new Set([...fallbackAnchors, option.value]))
                                        : fallbackAnchors.filter((anchor) => anchor !== option.value);
                                      updateStepRule(index, { due_anchor_candidates: nextAnchors });
                                    }}
                                    type="checkbox"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="form-field form-field--full">
                          <span className="muted">Non-working weekdays for business-day rules</span>
                          <div className="detail-grid" style={{ marginTop: 8 }}>
                            {options.lifecycle_rule_options.non_working_weekdays.map((option) => (
                              <label className="detail-row" key={option.value}>
                                <span className="detail-label">{option.label}</span>
                                <input
                                  checked={nonWorkingWeekdays.includes(option.value)}
                                  disabled={dueOffsetUnit !== "business_days"}
                                  onChange={(e) => {
                                    const nextWeekdays = e.target.checked
                                      ? Array.from(new Set([...nonWorkingWeekdays, option.value]))
                                      : nonWorkingWeekdays.filter((weekday) => weekday !== option.value);
                                    updateStepRule(index, { non_working_weekdays: nextWeekdays });
                                  }}
                                  type="checkbox"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      {invalidAnchors.length ? (
                        <div className="notice notice--spaced">
                          <strong>Anchor review needed.</strong>
                          <span className="muted">
                            {invalidAnchors.join(", ")} no longer matches the trigger-driven lifecycle metadata for this template.
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="detail-grid">
                    {[
                      ["allow_delegate", "Allow delegate"],
                      ["allow_send_back", "Allow send back"],
                      ["allow_comment", "Allow comment"],
                    ].map(([key, label]) => (
                      <label className="detail-row" key={key}>
                        <span className="detail-label">{label}</span>
                        <input
                          checked={Boolean(step[key as keyof HrAdminWorkflowStepWriteInput])}
                          onChange={(e) => updateStep(index, { [key]: e.target.checked } as Partial<HrAdminWorkflowStepWriteInput>)}
                          type="checkbox"
                        />
                      </label>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </FormSection>

        {error ? (
          <div className="notice">
            <strong>Save failed.</strong>
            <span className="muted">{error}</span>
          </div>
        ) : null}

        <div className="form-shell-card__actions">
          <button className="button button--primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : mode === "create" ? "Create workflow template" : "Save changes"}
          </button>
          <button className="button button--secondary" onClick={() => router.back()} type="button">
            Cancel
          </button>
        </div>
      </section>
    </form>
  );
}
