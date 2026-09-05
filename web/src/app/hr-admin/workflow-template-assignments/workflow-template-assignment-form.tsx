"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormSection } from "@/components/patterns/form-section";
import type { HrAdminWorkflowOptions, HrAdminWorkflowTemplateAssignmentWriteInput } from "@/lib/types";

type Props = {
  initialValue: HrAdminWorkflowTemplateAssignmentWriteInput;
  mode: "create" | "edit";
  options: HrAdminWorkflowOptions;
  itemId?: string;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save workflow assignment.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save workflow assignment.");
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

export function WorkflowTemplateAssignmentForm({ initialValue, mode, options, itemId }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<Key extends keyof HrAdminWorkflowTemplateAssignmentWriteInput>(key: Key, value: HrAdminWorkflowTemplateAssignmentWriteInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    const response = await fetch(mode === "create" ? "/api/hr-admin/workflow-template-assignments" : `/api/hr-admin/workflow-template-assignments/${itemId}`, {
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
    router.push("/hr-admin/workflow-template-assignments");
    router.refresh();
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__intro">
          <h2 className="section-heading-soft">{mode === "create" ? "Workflow assignment" : "Edit assignment"}</h2>
          <p className="section-copy section-copy-soft">
            Scope a workflow template to the right organizational segment.
          </p>
        </div>

        <FormSection description="Select the template and define where it should apply." title="Assignment scope">
          <div className="form-grid">
            <label className="form-field"><span className="muted">Workflow template</span><select className="input-control" value={formValue.template_id ?? ""} onChange={(e) => update("template_id", e.target.value || null)}>{selectOptions(options.templates)}</select></label>
            <label className="form-field"><span className="muted">Legal entity</span><select className="input-control" value={formValue.legal_entity_id ?? ""} onChange={(e) => update("legal_entity_id", e.target.value || null)}>{selectOptions(options.legal_entities)}</select></label>
            <label className="form-field"><span className="muted">Branch</span><select className="input-control" value={formValue.branch_id ?? ""} onChange={(e) => update("branch_id", e.target.value || null)}>{selectOptions(options.branches)}</select></label>
            <label className="form-field"><span className="muted">Department</span><select className="input-control" value={formValue.department_id ?? ""} onChange={(e) => update("department_id", e.target.value || null)}>{selectOptions(options.departments)}</select></label>
            <label className="form-field"><span className="muted">Business unit</span><select className="input-control" value={formValue.business_unit_id ?? ""} onChange={(e) => update("business_unit_id", e.target.value || null)}>{selectOptions(options.business_units)}</select></label>
            <label className="form-field"><span className="muted">Grade</span><select className="input-control" value={formValue.grade_id ?? ""} onChange={(e) => update("grade_id", e.target.value || null)}>{selectOptions(options.grades)}</select></label>
            <label className="form-field"><span className="muted">Priority</span><input className="input-control" min={0} type="number" value={formValue.priority} onChange={(e) => update("priority", Number(e.target.value) || 0)} /></label>
          </div>
        </FormSection>

        <FormSection description="Use the active flag to turn the rollout on or off." title="Assignment state">
          <div className="detail-grid">
            <label className="detail-row">
              <span className="detail-label">Assignment active</span>
              <input checked={formValue.is_active} onChange={(e) => update("is_active", e.target.checked)} type="checkbox" />
            </label>
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
            {isSubmitting ? "Saving..." : mode === "create" ? "Create assignment" : "Save changes"}
          </button>
          <button className="button button--secondary" onClick={() => router.back()} type="button">
            Cancel
          </button>
        </div>
      </section>
    </form>
  );
}
