"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormSection } from "@/components/patterns/form-section";
import type { HrAdminDocumentOptions, HrAdminDocumentRequirementRuleWriteInput } from "@/lib/types";

type Props = {
  initialValue: HrAdminDocumentRequirementRuleWriteInput;
  mode: "create" | "edit";
  options: HrAdminDocumentOptions;
  itemId?: string;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save document requirement.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save document requirement.");
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

export function DocumentRequirementForm({ initialValue, mode, options, itemId }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<Key extends keyof HrAdminDocumentRequirementRuleWriteInput>(key: Key, value: HrAdminDocumentRequirementRuleWriteInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const response = await fetch(mode === "create" ? "/api/hr-admin/document-requirements" : `/api/hr-admin/document-requirements/${itemId}`, {
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
    router.push("/hr-admin/document-requirements");
    router.refresh();
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__intro">
          <h2>{mode === "create" ? "Create document requirement" : "Edit document requirement"}</h2>
          <p className="section-copy">
            Scope this requirement by org structure and employment context so compliance rules stay flexible across clients.
          </p>
        </div>

        <FormSection description="Choose the category and the org filters where the rule should apply." title="Requirement scope">
          <div className="form-grid">
            <label className="form-field"><span className="muted">Category</span><select className="input-control" value={formValue.category_id ?? ""} onChange={(e) => update("category_id", e.target.value || null)}>{selectOptions(options.categories)}</select></label>
            <label className="form-field"><span className="muted">Legal entity</span><select className="input-control" value={formValue.legal_entity_id ?? ""} onChange={(e) => update("legal_entity_id", e.target.value || null)}>{selectOptions(options.legal_entities)}</select></label>
            <label className="form-field"><span className="muted">Branch</span><select className="input-control" value={formValue.branch_id ?? ""} onChange={(e) => update("branch_id", e.target.value || null)}>{selectOptions(options.branches)}</select></label>
            <label className="form-field"><span className="muted">Department</span><select className="input-control" value={formValue.department_id ?? ""} onChange={(e) => update("department_id", e.target.value || null)}>{selectOptions(options.departments)}</select></label>
            <label className="form-field"><span className="muted">Grade</span><select className="input-control" value={formValue.grade_id ?? ""} onChange={(e) => update("grade_id", e.target.value || null)}>{selectOptions(options.grades)}</select></label>
            <label className="form-field"><span className="muted">Employment type</span><select className="input-control" value={formValue.employment_type_id ?? ""} onChange={(e) => update("employment_type_id", e.target.value || null)}>{selectOptions(options.employment_types)}</select></label>
            <label className="form-field"><span className="muted">Required within joining days</span><input className="input-control" min={0} type="number" value={formValue.required_within_days_of_joining} onChange={(e) => update("required_within_days_of_joining", Number(e.target.value) || 0)} /></label>
            <label className="form-field"><span className="muted">Priority</span><input className="input-control" min={0} type="number" value={formValue.priority} onChange={(e) => update("priority", Number(e.target.value) || 0)} /></label>
          </div>
        </FormSection>

        <FormSection description="Use these switches to keep the rule active and control whether it is enforced." title="Requirement state">
          <div className="detail-grid">
            <label className="detail-row"><span className="detail-label">Mandatory</span><input checked={formValue.is_mandatory} onChange={(e) => update("is_mandatory", e.target.checked)} type="checkbox" /></label>
            <label className="detail-row"><span className="detail-label">Active</span><input checked={formValue.is_active} onChange={(e) => update("is_active", e.target.checked)} type="checkbox" /></label>
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
            {isSubmitting ? "Saving..." : mode === "create" ? "Create requirement" : "Save changes"}
          </button>
          <button className="button button--secondary" onClick={() => router.back()} type="button">
            Cancel
          </button>
        </div>
      </section>
    </form>
  );
}
