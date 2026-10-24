"use client";

import { useEffect, useRef, useState } from "react";
import { useDocumentSetupDraft } from "@/app/hr-admin/documents/use-document-setup-draft";

import { FormSection } from "@/components/patterns/form-section";
import type { HrAdminDocumentOptions, HrAdminDocumentRequirementRuleWriteInput, HrAdminOptionItem } from "@/lib/types";

type Props = {
  initialValue: HrAdminDocumentRequirementRuleWriteInput;
  mode: "create" | "edit";
  options: HrAdminDocumentOptions;
  itemId?: string;
  compact?: boolean;
  returnPath?: string;
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
      All / no restriction
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

function selectedName(items: Array<{ id: string; name: string }>, value: string | null) {
  if (!value) return "All";
  return items.find((item) => item.id === value)?.name ?? "Selected record";
}

export function DocumentRequirementForm({ initialValue, mode, options, itemId, compact = false, returnPath = "/hr-admin/document-requirements" }: Props) {
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const draft = useDocumentSetupDraft(formValue, isSubmitting, compact, returnPath);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (compact && draft.ready) formRef.current?.querySelector<HTMLElement>("input:not(:disabled), select:not(:disabled)")?.focus(); }, [compact, draft.ready]);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  const filteredBranches = filteredByLegalEntity(options.branches, formValue.legal_entity_id);
  const branchWarning =
    formValue.legal_entity_id && filteredBranches.length === 0
      ? "No active branches are mapped to this legal entity."
      : null;
  const scopeSummary = [
    `Category: ${formValue.category_id ? selectedName(options.categories, formValue.category_id) : "Select a category"}`,
    `Legal entity: ${selectedName(options.legal_entities, formValue.legal_entity_id)}`,
    `Branch: ${selectedName(options.branches, formValue.branch_id)}`,
    `Department: ${selectedName(options.departments, formValue.department_id)}`,
    `Grade: ${selectedName(options.grades, formValue.grade_id)}`,
    `Employment type: ${selectedName(options.employment_types, formValue.employment_type_id)}`,
  ].join(" • ");

  function update<Key extends keyof HrAdminDocumentRequirementRuleWriteInput>(key: Key, value: HrAdminDocumentRequirementRuleWriteInput[Key]) {
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
      return nextValue;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.beginSubmit()) return;
    setError("");
    setIsSubmitting(true);
    if (!formValue.category_id || !Number.isInteger(formValue.priority) || formValue.priority < 0 || !Number.isInteger(formValue.required_within_days_of_joining) || formValue.required_within_days_of_joining < 0) {
      setError(!formValue.category_id ? "Select a document category." : "Joining days and priority must be whole numbers of zero or greater.");
      draft.endSubmit();
      setIsSubmitting(false);
      return;
    }
    let response: Response;
    try {
      response = await fetch(mode === "create" ? "/api/hr-admin/document-requirements" : `/api/hr-admin/document-requirements/${itemId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValue),
      });
    } catch {
      setError("Save outcome could not be confirmed. Check the list before retrying; your draft is retained.");
      draft.endSubmit();
      setIsSubmitting(false);
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(response.status >= 500 ? "Save outcome could not be confirmed. Check the list before retrying; your draft is retained." : getErrorMessage(payload));
      draft.endSubmit();
      setIsSubmitting(false);
      return;
    }
    draft.saved();
  }

  return (
    <form ref={formRef} data-hydrated={draft.ready} className={`${compact ? "" : "section "}form-layout-modern document-child-form document-setup-form`} onFocusCapture={(event) => {
      const target = event.target as HTMLElement;
      const footer = formRef.current?.querySelector(".form-actions-bar");
      if (footer && !footer.contains(target) && target.getBoundingClientRect().bottom > footer.getBoundingClientRect().top) target.scrollIntoView({ block: "center" });
    }} noValidate onSubmit={handleSubmit}>
      <fieldset disabled={!draft.ready || isSubmitting} className={compact ? "form-shell-card form-shell-card--compact" : "form-shell-card"}>


        <FormSection description="Choose the category and the org filters where the rule should apply." title="Requirement scope">
          <div className="form-grid">
            <div className="form-field"><label className="muted" htmlFor="document-requirements-field-1">Category (required)</label><select aria-invalid={Boolean(error) && !formValue.category_id} aria-describedby={error && !formValue.category_id ? "requirement-save-error" : undefined} required id="document-requirements-field-1" className="input-control" value={formValue.category_id ?? ""} onChange={(e) => update("category_id", e.target.value || null)}>{[<option key="blank" value="">Select a category</option>, ...selectOptions(options.categories).slice(1)]}</select></div>
            <div className="form-field"><label className="muted" htmlFor="document-requirements-field-2">Legal entity</label><select id="document-requirements-field-2" className="input-control" value={formValue.legal_entity_id ?? ""} onChange={(e) => update("legal_entity_id", e.target.value || null)}>{selectOptions(options.legal_entities)}</select><FieldHint>Branch scope narrows to the selected legal entity.</FieldHint></div>
            <div className="form-field"><label className="muted" htmlFor="document-requirements-field-3">Branch</label><select id="document-requirements-field-3" className="input-control" disabled={Boolean(branchWarning)} value={formValue.branch_id ?? ""} onChange={(e) => update("branch_id", e.target.value || null)}>{selectOptions(filteredBranches)}</select><FieldHint tone={branchWarning ? "warning" : "default"}>{branchWarning ?? "Branch scope is optional unless the document rule is branch-specific."}</FieldHint></div>
            <div className="form-field"><label className="muted" htmlFor="document-requirements-field-4">Department</label><select id="document-requirements-field-4" className="input-control" value={formValue.department_id ?? ""} onChange={(e) => update("department_id", e.target.value || null)}>{selectOptions(options.departments)}</select></div>
            <div className="form-field"><label className="muted" htmlFor="document-requirements-field-5">Grade</label><select id="document-requirements-field-5" className="input-control" value={formValue.grade_id ?? ""} onChange={(e) => update("grade_id", e.target.value || null)}>{selectOptions(options.grades)}</select></div>
            <div className="form-field"><label className="muted" htmlFor="document-requirements-field-6">Employment type</label><select id="document-requirements-field-6" className="input-control" value={formValue.employment_type_id ?? ""} onChange={(e) => update("employment_type_id", e.target.value || null)}>{selectOptions(options.employment_types)}</select></div>
            <div className="form-field"><label className="muted" htmlFor="document-requirements-field-7">Required within joining days</label><input id="document-requirements-field-7" className="input-control" min={0} aria-invalid={Boolean(error) && (!Number.isInteger(formValue.required_within_days_of_joining) || formValue.required_within_days_of_joining < 0)} aria-describedby={error && (!Number.isInteger(formValue.required_within_days_of_joining) || formValue.required_within_days_of_joining < 0) ? "requirement-save-error" : undefined} type="number" value={formValue.required_within_days_of_joining} onChange={(e) => update("required_within_days_of_joining", Number(e.target.value) || 0)} /></div>
            <div className="form-field"><label className="muted" htmlFor="document-requirements-field-8">Priority</label><input id="document-requirements-field-8" className="input-control" min={0} aria-invalid={Boolean(error) && (!Number.isInteger(formValue.priority) || formValue.priority < 0)} aria-describedby={error && (!Number.isInteger(formValue.priority) || formValue.priority < 0) ? "requirement-save-error" : undefined} type="number" value={formValue.priority} onChange={(e) => update("priority", Number(e.target.value) || 0)} /></div>
          </div>
          <div className="document-decision-effect">
            <strong>Scope preview</strong>
            <span>{scopeSummary}</span>
          </div>
        </FormSection>

        <FormSection description="Use these switches to keep the rule active and control whether it is enforced." title="Requirement state">
          <div className="document-setup-switches">
            <label className="detail-row"><span className="detail-label">Mandatory</span><input checked={formValue.is_mandatory} onChange={(e) => update("is_mandatory", e.target.checked)} type="checkbox" /></label>
            <label className="detail-row"><span className="detail-label">Active</span><input checked={formValue.is_active} onChange={(e) => update("is_active", e.target.checked)} type="checkbox" /></label>
            <div className="detail-row"><span className="detail-label">Employee impact</span><strong>{formValue.is_active ? (formValue.is_mandatory ? "Required in ESS" : "Optional in ESS") : "Disabled for ESS checks"}</strong></div>
            <div className="detail-row"><span className="detail-label">Due window</span><strong>{formValue.required_within_days_of_joining} day(s) after joining</strong></div>
          </div>
        </FormSection>

      </fieldset>
        {error ? (
          <div id="requirement-save-error" ref={errorRef} tabIndex={-1} className="notice notice--error" role="alert">
            <strong>Review before continuing.</strong>
            <span className="muted">{error}</span>
          </div>
        ) : null}

        <div className="form-actions-bar">
          <span className="muted">Requirement changes affect compliance checks for matching employees.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--secondary" disabled={isSubmitting} onClick={draft.cancel} type="button">
              Cancel
            </button>
            <button className="button button--primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : mode === "create" ? "Create requirement" : "Save changes"}
            </button>
          </div>
        </div>
    </form>
  );
}
