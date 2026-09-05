"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { LifecycleItemEditor } from "@/app/hr-admin/lifecycle/lifecycle-item-editor";
import { FormSection } from "@/components/patterns/form-section";
import { getOnboardingChecklistStats, getOnboardingCompletionWarning } from "@/lib/onboarding-readiness";
import type {
  HrAdminLifecycleOptions,
  HrAdminLifecycleWorkItem,
  HrAdminOnboarding,
  HrAdminOnboardingWriteInput,
  HrAdminWorkflowTemplate,
} from "@/lib/types";

type Props = {
  initialValue: HrAdminOnboardingWriteInput;
  item?: HrAdminOnboarding;
  lifecycleTemplates: HrAdminWorkflowTemplate[];
  mode: "create" | "edit";
  options: HrAdminLifecycleOptions;
  itemId?: string;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save onboarding record.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save onboarding record.");
}

function selectOptions(items: Array<{ id: string; name: string; employee_code?: string }>) {
  return [<option key="blank" value="">Select an option</option>, ...items.map((item) => <option key={item.id} value={item.id}>{item.employee_code ? `${item.employee_code} - ${item.name}` : item.name}</option>)];
}

function buildLifecycleTemplateTriggerOptions(templates: HrAdminWorkflowTemplate[], currentValue: string) {
  const lifecycleTemplates = templates.filter((item) => item.module === "lifecycle");
  const latestByTrigger = new Map<string, HrAdminWorkflowTemplate>();
  for (const template of lifecycleTemplates) {
    const existing = latestByTrigger.get(template.trigger_key);
    const shouldReplace =
      !existing ||
      (existing.status !== "active" && template.status === "active") ||
      template.version > existing.version;
    if (shouldReplace) {
      latestByTrigger.set(template.trigger_key, template);
    }
  }

  const items = Array.from(latestByTrigger.values()).sort((left, right) => left.name.localeCompare(right.name));
  const options = [
    <option key="blank" value="">
      No template
    </option>,
    ...items.map((item) => (
      <option key={`${item.trigger_key}-${item.id}`} value={item.trigger_key}>
        {item.name} ({item.trigger_key})
      </option>
    )),
  ];

  if (currentValue && !items.some((item) => item.trigger_key === currentValue)) {
    options.push(
      <option key="current-value" value={currentValue}>
        Current value ({currentValue})
      </option>,
    );
  }

  return options;
}

function parseChecklistItems(rawValue: string): HrAdminLifecycleWorkItem[] {
  if (!rawValue.trim()) return [];
  const parsed = JSON.parse(rawValue);
  return Array.isArray(parsed) ? (parsed as HrAdminLifecycleWorkItem[]) : [];
}

function getReadinessPreview(formValue: HrAdminOnboardingWriteInput) {
  try {
    const checklistSnapshot = parseChecklistItems(formValue.checklist_snapshot);
    const previewItem = {
      actual_joining_date: formValue.actual_joining_date,
      checklist_snapshot: checklistSnapshot,
    };
    return {
      checklistIsValid: true,
      checklistWarning: "",
      completionWarning: getOnboardingCompletionWarning(previewItem),
      ...getOnboardingChecklistStats(previewItem),
    };
  } catch {
    return {
      checklistIsValid: false,
      checklistWarning: "Checklist data is invalid. Fix it before saving or relying on completion readiness.",
      completionWarning: "",
      totalCount: 0,
      completedCount: 0,
      openCount: 0,
    };
  }
}

export function OnboardingForm({ initialValue, item, lifecycleTemplates, mode, options, itemId }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const readinessPreview = getReadinessPreview(formValue);

  const checklistItems = readinessPreview.checklistIsValid ? parseChecklistItems(formValue.checklist_snapshot) : [];

  function update<Key extends keyof HrAdminOnboardingWriteInput>(key: Key, value: HrAdminOnboardingWriteInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  function updateChecklistItems(items: HrAdminLifecycleWorkItem[]) {
    update("checklist_snapshot", JSON.stringify(items, null, 2));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    let checklistSnapshot: HrAdminLifecycleWorkItem[] = [];
    try {
      checklistSnapshot = parseChecklistItems(formValue.checklist_snapshot);
    } catch {
      setError("Checklist data must stay valid.");
      setIsSubmitting(false);
      return;
    }
    const response = await fetch(mode === "create" ? "/api/hr-admin/onboardings" : `/api/hr-admin/onboardings/${itemId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formValue, checklist_snapshot: checklistSnapshot }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }
    router.push("/hr-admin/onboardings");
    router.refresh();
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2>{mode === "create" ? "Create onboarding workflow" : "Edit onboarding workflow"}</h2>
            <p className="section-copy">Capture joiner timing, ownership, workflow context, and readiness details in one place.</p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip"><strong>{formValue.status || "not_started"}</strong> current status</span>
            <span className="queue-summary-chip"><strong>{readinessPreview.totalCount}</strong> checklist items</span>
            {item ? <span className="queue-summary-chip"><strong>{item.missing_required_document_count}</strong> required missing</span> : null}
          </div>
        </div>

        <div className="form-shell-card__grid">
          <FormSection
            description="Basic record identity, status, and dates that drive onboarding readiness."
            title="Joiner and status"
          >
            <div className="form-grid">
              <label className="form-field"><span className="muted">Employee</span><select className="input-control" value={formValue.employee_id ?? ""} onChange={(e) => update("employee_id", e.target.value || null)}>{selectOptions(options.employees)}</select></label>
              <label className="form-field"><span className="muted">Status</span><select className="input-control" value={formValue.status} onChange={(e) => update("status", e.target.value)}>{options.onboarding_statuses.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
              <label className="form-field"><span className="muted">Expected joining date</span><input className="input-control" type="date" value={formValue.expected_joining_date ?? ""} onChange={(e) => update("expected_joining_date", e.target.value || null)} /></label>
              <label className="form-field"><span className="muted">Actual joining date</span><input className="input-control" type="date" value={formValue.actual_joining_date ?? ""} onChange={(e) => update("actual_joining_date", e.target.value || null)} /></label>
            </div>
          </FormSection>

          <FormSection
            description="Keep ownership and workflow linkage aligned with the shared lifecycle queue."
            title="Routing and ownership"
          >
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Lifecycle template trigger</span>
                <select className="input-control" value={formValue.onboarding_template_code} onChange={(e) => update("onboarding_template_code", e.target.value)}>
                  {buildLifecycleTemplateTriggerOptions(lifecycleTemplates, formValue.onboarding_template_code)}
                </select>
              </label>
              <label className="form-field"><span className="muted">Assigned owner</span><select className="input-control" value={formValue.owner_value} onChange={(e) => update("owner_value", e.target.value)}><option value="">Select an owner</option>{options.lifecycle_owners.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="form-field" style={{ gridColumn: "1 / -1" }}><span className="muted">Workflow reference</span><input className="input-control" value={formValue.workflow_reference} onChange={(e) => update("workflow_reference", e.target.value)} /></label>
            </div>
            <div className="notice notice--spaced">
              <strong>Template seeding behavior.</strong>
              <span className="muted">
                A selected template can seed checklist items automatically when a new onboarding is created with an empty checklist. Existing checklist items remain the source of truth after that.
              </span>
            </div>
          </FormSection>

          <FormSection
            description="Checklist items now stay structured, owner-aware, and queue-ready without editing raw JSON."
            fullWidth
            title="Checklist and notes"
          >
            <LifecycleItemEditor
              addLabel="Add checklist item"
              codePrefix="onboarding-item"
              description="Track onboarding work with owners, due dates, escalation timing, and template-derived metadata."
              emptyState="Add items manually, or leave this empty on create and let the selected lifecycle template seed the checklist."
              items={checklistItems}
              onChange={updateChecklistItems}
              ownerOptions={options.lifecycle_owners}
              title="Checklist items"
            />
            <div className="form-grid form-grid--spaced">
              <label className="form-field" style={{ gridColumn: "1 / -1" }}><span className="muted">Notes</span><textarea className="input-control" rows={4} value={formValue.notes} onChange={(e) => update("notes", e.target.value)} /></label>
            </div>
          </FormSection>
        </div>

        <div className="notice">
          <strong>Readiness preview.</strong>
          <span className="muted">
            {readinessPreview.checklistIsValid
              ? readinessPreview.totalCount === 0
                ? "No checklist items added yet."
                : `${readinessPreview.completedCount}/${readinessPreview.totalCount} checklist items complete, ${readinessPreview.openCount} open.`
              : readinessPreview.checklistWarning}
          </span>
        </div>
        {item ? (
          <div className="notice">
            <strong>Document readiness.</strong>
            <span className="muted">
              {item.missing_required_document_count > 0
                ? `${item.missing_required_document_count} required document${item.missing_required_document_count === 1 ? "" : "s"} still missing`
                : item.future_due_document_count > 0
                  ? `${item.future_due_document_count} required document${item.future_due_document_count === 1 ? "" : "s"} will become due later in the onboarding journey`
                  : "Required onboarding documents are currently in a healthy state."}
              {item.missing_required_document_names.length ? ` Missing: ${item.missing_required_document_names.join(", ")}.` : "."}
            </span>
          </div>
        ) : null}
        {formValue.status === "completed" && readinessPreview.checklistIsValid && readinessPreview.completionWarning ? (
          <div className="notice">
            <strong>Completion is still blocked.</strong>
            <span className="muted">{readinessPreview.completionWarning}</span>
          </div>
        ) : null}
        {error ? <div className="notice"><strong>Save failed.</strong><span className="muted">{error}</span></div> : null}
        <div className="form-actions-bar">
          <span className="muted">Changes save back into the onboarding queue and readiness checks immediately.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting} type="submit">{isSubmitting ? "Saving..." : mode === "create" ? "Create onboarding" : "Save changes"}</button>
            <button className="button button--secondary" onClick={() => router.back()} type="button">Cancel</button>
          </div>
        </div>
      </section>
    </form>
  );
}
