"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormSection } from "@/components/patterns/form-section";
import type { HrAdminOptionItem, HrAdminWorkflowOptions, HrAdminWorkflowTemplateAssignmentWriteInput } from "@/lib/types";

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

function FieldHint({ children, tone = "default" }: { children: string; tone?: "default" | "warning" }) {
  return <span className={`field-help-text${tone === "warning" ? " field-help-text--warning" : ""}`}>{children}</span>;
}

function filteredByLegalEntity(items: HrAdminOptionItem[], legalEntityId: string | null) {
  return items.filter((item) => !legalEntityId || item.legal_entity_id === legalEntityId);
}

function filteredByBusinessUnit(items: HrAdminOptionItem[], businessUnitId: string | null) {
  return items.filter((item) => !businessUnitId || item.business_unit_id === businessUnitId);
}

export function WorkflowTemplateAssignmentForm({ initialValue, mode, options, itemId }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const filteredBranches = filteredByLegalEntity(options.branches, formValue.legal_entity_id);
  const filteredDepartments = filteredByBusinessUnit(options.departments, formValue.business_unit_id);
  const branchWarning =
    formValue.legal_entity_id && filteredBranches.length === 0
      ? "No active branches are mapped to this legal entity."
      : null;
  const departmentWarning =
    formValue.business_unit_id && filteredDepartments.length === 0
      ? "No active departments are mapped to this business unit."
      : null;

  function update<Key extends keyof HrAdminWorkflowTemplateAssignmentWriteInput>(key: Key, value: HrAdminWorkflowTemplateAssignmentWriteInput[Key]) {
    setFormValue((current) => {
      const nextValue = { ...current, [key]: value };
      if (
        key === "legal_entity_id" &&
        nextValue.branch_id &&
        !filteredByLegalEntity(options.branches, nextValue.legal_entity_id).some((item) => item.id === nextValue.branch_id)
      ) {
        nextValue.branch_id = null;
      }
      if (key === "branch_id") {
        const nextBranch = options.branches.find((item) => item.id === nextValue.branch_id);
        if (nextBranch?.legal_entity_id && !nextValue.legal_entity_id) {
          nextValue.legal_entity_id = nextBranch.legal_entity_id;
        }
      }
      if (
        key === "business_unit_id" &&
        nextValue.department_id &&
        !filteredByBusinessUnit(options.departments, nextValue.business_unit_id).some((item) => item.id === nextValue.department_id)
      ) {
        nextValue.department_id = null;
      }
      if (key === "department_id") {
        const nextDepartment = options.departments.find((item) => item.id === nextValue.department_id);
        if (nextDepartment?.business_unit_id && !nextValue.business_unit_id) {
          nextValue.business_unit_id = nextDepartment.business_unit_id;
        }
      }
      return nextValue;
    });
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
            <label className="form-field"><span className="muted">Legal entity</span><select className="input-control" value={formValue.legal_entity_id ?? ""} onChange={(e) => update("legal_entity_id", e.target.value || null)}>{selectOptions(options.legal_entities)}</select><FieldHint>Branch scope narrows to the selected legal entity.</FieldHint></label>
            <label className="form-field"><span className="muted">Branch</span><select className="input-control" disabled={Boolean(branchWarning)} value={formValue.branch_id ?? ""} onChange={(e) => update("branch_id", e.target.value || null)}>{selectOptions(filteredBranches)}</select><FieldHint tone={branchWarning ? "warning" : "default"}>{branchWarning ?? "Branch scope is optional unless the workflow should apply only to a branch."}</FieldHint></label>
            <label className="form-field"><span className="muted">Department</span><select className="input-control" disabled={Boolean(departmentWarning)} value={formValue.department_id ?? ""} onChange={(e) => update("department_id", e.target.value || null)}>{selectOptions(filteredDepartments)}</select><FieldHint tone={departmentWarning ? "warning" : "default"}>{departmentWarning ?? "Department scope narrows to the selected business unit."}</FieldHint></label>
            <label className="form-field"><span className="muted">Business unit</span><select className="input-control" value={formValue.business_unit_id ?? ""} onChange={(e) => update("business_unit_id", e.target.value || null)}>{selectOptions(options.business_units)}</select><FieldHint>Department options narrow to the selected business unit.</FieldHint></label>
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
