"use client";

import { useEffect, useRef, useState } from "react";
import { useDocumentSetupDraft } from "@/app/hr-admin/documents/use-document-setup-draft";

import { FormSection } from "@/components/patterns/form-section";
import type { HrAdminDocumentCategoryWriteInput, HrAdminDocumentOptions } from "@/lib/types";
import { type FieldErrors, hasFieldErrors, requireText } from "@/lib/ui/validation";

type Props = {
  initialValue: HrAdminDocumentCategoryWriteInput;
  mode: "create" | "edit";
  options: HrAdminDocumentOptions;
  itemId?: string;
  compact?: boolean;
  returnPath?: string;
};

type DocumentCategoryField = "code" | "name" | "visibility_rules";

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save document category.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save document category.");
}

function categoryOutcomeLabel(formValue: HrAdminDocumentCategoryWriteInput) {
  const outcomes = [];
  outcomes.push(formValue.is_active ? "Active in setup" : "Hidden from new setup");
  outcomes.push(formValue.allow_employee_upload ? "Employees can upload" : "HR upload only");
  outcomes.push(formValue.requires_verification ? "HR verification required" : "Auto-accepted by policy");
  if (formValue.requires_expiry_date) outcomes.push("Expiry date required");
  if (formValue.allow_multiple_files) outcomes.push("Multiple files allowed");
  return outcomes.join(" • ");
}

export function DocumentCategoryForm({ initialValue, mode, options, itemId, compact = false, returnPath = "/hr-admin/document-categories" }: Props) {
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<DocumentCategoryField>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const draft = useDocumentSetupDraft(formValue, isSubmitting, compact, returnPath);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (compact && draft.ready) formRef.current?.querySelector<HTMLElement>("input:not(:disabled), select:not(:disabled)")?.focus(); }, [compact, draft.ready]);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  function update<Key extends keyof HrAdminDocumentCategoryWriteInput>(key: Key, value: HrAdminDocumentCategoryWriteInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key as DocumentCategoryField]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.beginSubmit()) return;
    setError("");
    setFieldErrors({});
    setIsSubmitting(true);

    const nextErrors: FieldErrors<DocumentCategoryField> = {
      code: requireText(formValue.code, "Enter a unique document category code."),
      name: requireText(formValue.name, "Enter the document category name."),
    };

    let parsedVisibilityRules: unknown = {};
    try {
      parsedVisibilityRules = formValue.visibility_rules.trim() ? JSON.parse(formValue.visibility_rules) : {};
    } catch {
      nextErrors.visibility_rules = "Visibility rules must be valid JSON.";
    }
    if (hasFieldErrors(nextErrors)) {
      setFieldErrors(nextErrors);
      setError("Review the highlighted document category fields and try again.");
      draft.endSubmit();
      setIsSubmitting(false);
      return;
    }

    let response: Response;
    try {
      response = await fetch(mode === "create" ? "/api/hr-admin/document-categories" : `/api/hr-admin/document-categories/${itemId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formValue, visibility_rules: parsedVisibilityRules }),
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
    <form ref={formRef} data-hydrated={draft.ready} className={`${compact ? "" : "section "}form-layout-modern document-child-form document-setup-form`} noValidate onFocusCapture={(event) => {
      const target = event.target as HTMLElement;
      const footer = formRef.current?.querySelector(".form-actions-bar");
      if (footer && !footer.contains(target) && target.getBoundingClientRect().bottom > footer.getBoundingClientRect().top) target.scrollIntoView({ block: "center" });
    }} onSubmit={handleSubmit}>
      <fieldset disabled={!draft.ready || isSubmitting} className={compact ? "form-shell-card form-shell-card--compact" : "form-shell-card"}>


        <FormSection description="Set the category identity and any visibility rules that control where it appears." title="Category setup">
          <div className="form-grid">
            <div className="form-field"><label className="muted" htmlFor="document-categories-field-1">Code</label><input maxLength={60} id="document-categories-field-1" aria-invalid={Boolean(fieldErrors.code)} aria-describedby={fieldErrors.code ? "document-categories-field-1-error" : undefined} className="input-control" required value={formValue.code} onChange={(e) => update("code", e.target.value)} />{fieldErrors.code ? <span id="document-categories-field-1-error" className="field-error-text">{fieldErrors.code}</span> : null}</div>
            <div className="form-field"><label className="muted" htmlFor="document-categories-field-2">Name</label><input maxLength={255} id="document-categories-field-2" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "document-categories-field-2-error" : undefined} className="input-control" required value={formValue.name} onChange={(e) => update("name", e.target.value)} />{fieldErrors.name ? <span id="document-categories-field-2-error" className="field-error-text">{fieldErrors.name}</span> : null}</div>
            <div className="form-field"><label className="muted" htmlFor="document-categories-field-3">Category type</label><select id="document-categories-field-3" className="input-control" value={formValue.category_type} onChange={(e) => update("category_type", e.target.value)}>{options.document_category_types.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
            <div className="form-field"><label className="muted" htmlFor="document-categories-field-4">Description</label><input id="document-categories-field-4" className="input-control" value={formValue.description} onChange={(e) => update("description", e.target.value)} /></div>
            <div className="form-field form-field--full"><label className="muted" htmlFor="document-categories-field-5">Visibility rules JSON</label><textarea id="document-categories-field-5" aria-invalid={Boolean(fieldErrors.visibility_rules)} aria-describedby={fieldErrors.visibility_rules ? "document-categories-field-5-error" : undefined} className="input-control" rows={5} value={formValue.visibility_rules} onChange={(e) => update("visibility_rules", e.target.value)} />{fieldErrors.visibility_rules ? <span id="document-categories-field-5-error" className="field-error-text">{fieldErrors.visibility_rules}</span> : null}</div>
          </div>
          <div className="document-decision-effect">
            <strong>Category impact</strong>
            <span>{categoryOutcomeLabel(formValue)}</span>
          </div>
        </FormSection>

        <FormSection description="These switches shape how employees and HR teams can work with this category." title="Behavior and validation">
          <div className="document-setup-switches">
            {[
              ["is_active", "Active"],
              ["is_system_seeded", "System seeded"],
              ["requires_expiry_date", "Requires expiry date"],
              ["requires_verification", "Requires verification"],
              ["allow_employee_upload", "Allow employee upload"],
              ["allow_multiple_files", "Allow multiple files"],
            ].map(([key, label]) => (
              <label className="detail-row" key={key}>
                <span className="detail-label">{label}</span>
                <input
                  checked={Boolean(formValue[key as keyof HrAdminDocumentCategoryWriteInput])}
                  onChange={(e) => update(key as keyof HrAdminDocumentCategoryWriteInput, e.target.checked as never)}
                  type="checkbox"
                />
              </label>
            ))}
          </div>
        </FormSection>

      </fieldset>
        {error ? (
          <div ref={errorRef} tabIndex={-1} className="notice notice--error" role="alert">
            <strong>Review before continuing.</strong>
            <span className="muted">{error}</span>
          </div>
        ) : null}

        <div className="form-actions-bar">
          <span className="muted">Category changes apply to future document uploads and requirements.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--secondary" disabled={isSubmitting} onClick={draft.cancel} type="button">
              Cancel
            </button>
            <button className="button button--primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : mode === "create" ? "Create category" : "Save changes"}
            </button>
          </div>
        </div>
    </form>
  );
}
