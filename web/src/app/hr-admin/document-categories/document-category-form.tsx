"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormSection } from "@/components/patterns/form-section";
import type { HrAdminDocumentCategoryWriteInput, HrAdminDocumentOptions } from "@/lib/types";
import { type FieldErrors, hasFieldErrors, requireText } from "@/lib/ui/validation";

type Props = {
  initialValue: HrAdminDocumentCategoryWriteInput;
  mode: "create" | "edit";
  options: HrAdminDocumentOptions;
  itemId?: string;
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

export function DocumentCategoryForm({ initialValue, mode, options, itemId }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<DocumentCategoryField>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<Key extends keyof HrAdminDocumentCategoryWriteInput>(key: Key, value: HrAdminDocumentCategoryWriteInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key as DocumentCategoryField]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setIsSubmitting(true);

    const nextErrors: FieldErrors<DocumentCategoryField> = {
      code: requireText(formValue.code, "Enter a unique document category code."),
      name: requireText(formValue.name, "Enter the document category name."),
    };

    let parsedVisibilityRules: Record<string, unknown> = {};
    try {
      parsedVisibilityRules = formValue.visibility_rules.trim() ? JSON.parse(formValue.visibility_rules) : {};
    } catch {
      nextErrors.visibility_rules = "Visibility rules must be valid JSON.";
    }
    if (hasFieldErrors(nextErrors)) {
      setFieldErrors(nextErrors);
      setError("Review the highlighted document category fields and try again.");
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
      setError("Unable to reach the server. Check your connection and try again.");
      setIsSubmitting(false);
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }

    router.push("/hr-admin/document-categories");
    router.refresh();
  }

  return (
    <form className="section form-layout-modern document-child-form" noValidate onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__intro">
          <h2>{mode === "create" ? "Create document category" : "Edit document category"}</h2>
          <p className="section-copy">Control validation, upload behavior, and reuse rules for one document type.</p>
        </div>

        <FormSection description="Set the category identity and any visibility rules that control where it appears." title="Category setup">
          <div className="form-grid">
            <label className="form-field"><span className="muted">Code</span><input aria-invalid={Boolean(fieldErrors.code)} className="input-control" required value={formValue.code} onChange={(e) => update("code", e.target.value)} />{fieldErrors.code ? <span className="field-error-text">{fieldErrors.code}</span> : null}</label>
            <label className="form-field"><span className="muted">Name</span><input aria-invalid={Boolean(fieldErrors.name)} className="input-control" required value={formValue.name} onChange={(e) => update("name", e.target.value)} />{fieldErrors.name ? <span className="field-error-text">{fieldErrors.name}</span> : null}</label>
            <label className="form-field"><span className="muted">Category type</span><select className="input-control" value={formValue.category_type} onChange={(e) => update("category_type", e.target.value)}>{options.document_category_types.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="form-field"><span className="muted">Description</span><input className="input-control" value={formValue.description} onChange={(e) => update("description", e.target.value)} /></label>
            <label className="form-field form-field--full"><span className="muted">Visibility rules JSON</span><textarea aria-invalid={Boolean(fieldErrors.visibility_rules)} className="input-control" rows={5} value={formValue.visibility_rules} onChange={(e) => update("visibility_rules", e.target.value)} />{fieldErrors.visibility_rules ? <span className="field-error-text">{fieldErrors.visibility_rules}</span> : null}</label>
          </div>
          <div className="document-decision-effect">
            <strong>Category impact</strong>
            <span>{categoryOutcomeLabel(formValue)}</span>
          </div>
        </FormSection>

        <FormSection description="These switches shape how employees and HR teams can work with this category." title="Behavior and validation">
          <div className="detail-grid">
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

        {error ? (
          <div className="notice notice--error" role="alert">
            <strong>Save failed.</strong>
            <span className="muted">{error}</span>
          </div>
        ) : null}

        <div className="form-actions-bar">
          <span className="muted">Category changes apply to future document uploads and requirements.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--secondary" onClick={() => router.back()} type="button">
              Cancel
            </button>
            <button className="button button--primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : mode === "create" ? "Create category" : "Save changes"}
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}
