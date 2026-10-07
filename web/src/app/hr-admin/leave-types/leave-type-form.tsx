"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { FormSection } from "@/components/patterns/form-section";
import { PlatformGovernanceFormBanner } from "@/components/patterns/platform-governance-form-banner";
import { GovernanceLockHint, isGovernanceFieldLocked } from "@/components/patterns/platform-governance-locks";
import type { HrAdminLeaveType, HrAdminLeaveTypeWriteInput, HrAdminPolicyOptions } from "@/lib/types";
import { type FieldErrors, hasFieldErrors, requireText } from "@/lib/ui/validation";

type Props = {
  initialValue: HrAdminLeaveTypeWriteInput;
  mode: "create" | "edit";
  options: HrAdminPolicyOptions;
  itemId?: string;
  item?: HrAdminLeaveType;
};

type LeaveTypeField = "code" | "name" | "color_code";

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Unable to save leave type.";
  }
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) {
      return String(value[0]);
    }
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save leave type.");
}

export function LeaveTypeForm({ initialValue, mode, options, itemId, item }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LeaveTypeField>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const codeLocked = isGovernanceFieldLocked(item, "code");
  const nameLocked = isGovernanceFieldLocked(item, "name");
  const shortCodeLocked = isGovernanceFieldLocked(item, "short_code");
  const categoryLocked = isGovernanceFieldLocked(item, "category");
  const unitLocked = isGovernanceFieldLocked(item, "unit");
  const colorCodeLocked = isGovernanceFieldLocked(item, "color_code");
  const descriptionLocked = isGovernanceFieldLocked(item, "description");
  const activeLocked = isGovernanceFieldLocked(item, "is_active");
  const attachmentLocked = isGovernanceFieldLocked(item, "requires_attachment");
  const negativeBalanceLocked = isGovernanceFieldLocked(item, "allow_negative_balance");
  const approvalLocked = isGovernanceFieldLocked(item, "is_approval_required");

  function update<Key extends keyof HrAdminLeaveTypeWriteInput>(key: Key, value: HrAdminLeaveTypeWriteInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key as LeaveTypeField]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingRef.current) {
      return;
    }
    if (mode === "edit" && item && item.can_edit_directly === false) {
      setError("This record cannot be edited directly in its current governance state.");
      return;
    }
    isSubmittingRef.current = true;
    setError("");
    setFieldErrors({});
    setIsSubmitting(true);

    const nextErrors: FieldErrors<LeaveTypeField> = {
      code: requireText(formValue.code, "Enter a unique leave type code."),
      name: requireText(formValue.name, "Enter the leave type name."),
      color_code: formValue.color_code.trim() && !/^#[0-9a-fA-F]{6}$/.test(formValue.color_code.trim()) ? "Enter a color in #RRGGBB format." : undefined,
    };
    if (hasFieldErrors(nextErrors)) {
      setFieldErrors(nextErrors);
      setError("Review the highlighted leave type fields and try again.");
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }

    let response: Response;
    try {
      response = await fetch(mode === "create" ? "/api/hr-admin/leave-types" : `/api/hr-admin/leave-types/${itemId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValue),
      });
    } catch {
      setError("Unable to reach the server. Check your connection and try again.");
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }

    router.push("/hr-admin/leave-types");
    router.refresh();
  }

  return (
    <form className="section form-layout-modern" noValidate onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2>{mode === "create" ? "Create leave type" : "Edit leave type"}</h2>
            <p className="section-copy">Define the leave bucket employees and managers see before policies, assignments, and approval rules build on top of it.</p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip"><strong>{formValue.category}</strong> category</span>
            <span className="queue-summary-chip"><strong>{formValue.unit}</strong> unit</span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          {mode === "edit" && item ? <PlatformGovernanceFormBanner detachPath={`/api/hr-admin/leave-types/${itemId}/detach`} item={item} /> : null}
          <FormSection title="Identity and presentation" description="Keep the leave type recognizable by code, name, category, unit, and visual tag.">
            <div className="form-grid">
              <label className="form-field"><span className="muted">Code</span><input aria-invalid={Boolean(fieldErrors.code)} className="input-control" disabled={codeLocked} required value={formValue.code} onChange={(e) => update("code", e.target.value)} />{fieldErrors.code ? <span className="field-error-text">{fieldErrors.code}</span> : null}<GovernanceLockHint fieldPath="code" item={item} /></label>
              <label className="form-field"><span className="muted">Name</span><input aria-invalid={Boolean(fieldErrors.name)} className="input-control" disabled={nameLocked} required value={formValue.name} onChange={(e) => update("name", e.target.value)} />{fieldErrors.name ? <span className="field-error-text">{fieldErrors.name}</span> : null}<GovernanceLockHint fieldPath="name" item={item} /></label>
              <label className="form-field"><span className="muted">Short code</span><input className="input-control" disabled={shortCodeLocked} value={formValue.short_code} onChange={(e) => update("short_code", e.target.value)} /><GovernanceLockHint fieldPath="short_code" item={item} /></label>
              <label className="form-field"><span className="muted">Category</span><select className="input-control" disabled={categoryLocked} value={formValue.category} onChange={(e) => update("category", e.target.value)}>{options.leave_categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><GovernanceLockHint fieldPath="category" item={item} /></label>
              <label className="form-field"><span className="muted">Unit</span><select className="input-control" disabled={unitLocked} value={formValue.unit} onChange={(e) => update("unit", e.target.value)}>{options.leave_units.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><GovernanceLockHint fieldPath="unit" item={item} /></label>
              <label className="form-field"><span className="muted">Color code</span><input aria-invalid={Boolean(fieldErrors.color_code)} className="input-control" disabled={colorCodeLocked} value={formValue.color_code} onChange={(e) => update("color_code", e.target.value)} placeholder="#0b6e4f" />{fieldErrors.color_code ? <span className="field-error-text">{fieldErrors.color_code}</span> : null}<GovernanceLockHint fieldPath="color_code" item={item} /></label>
              <label className="form-field" style={{ gridColumn: "1 / -1" }}><span className="muted">Description</span><input className="input-control" disabled={descriptionLocked} value={formValue.description} onChange={(e) => update("description", e.target.value)} /><GovernanceLockHint fieldPath="description" item={item} /></label>
            </div>
          </FormSection>

          <FormSection title="Behavior switches" description="These toggles control whether the type is active, approval-driven, and how strict the balance behavior should be.">
            <div className="toggle-field-list">
              {[
                ["is_active", "Active", "Expose this leave type for current policy and request usage."],
                ["requires_attachment", "Requires attachment", "Require supporting evidence when this leave type is used."],
                ["allow_negative_balance", "Allow negative balance", "Permit balances to go below zero for this leave type."],
                ["is_approval_required", "Approval required", "Require approval flow before the leave can be considered final."],
              ].map(([key, label, description]) => (
                <label className="toggle-field" key={key}>
                  <div>
                    <strong>{label}</strong>
                    <p className="section-copy">{description}</p>
                    {key === "is_active" ? <GovernanceLockHint fieldPath="is_active" item={item} /> : null}
                    {key === "requires_attachment" ? <GovernanceLockHint fieldPath="requires_attachment" item={item} /> : null}
                    {key === "allow_negative_balance" ? <GovernanceLockHint fieldPath="allow_negative_balance" item={item} /> : null}
                    {key === "is_approval_required" ? <GovernanceLockHint fieldPath="is_approval_required" item={item} /> : null}
                  </div>
                  <input
                    checked={Boolean(formValue[key as keyof HrAdminLeaveTypeWriteInput])}
                    disabled={
                      key === "is_active"
                        ? activeLocked
                        : key === "requires_attachment"
                          ? attachmentLocked
                          : key === "allow_negative_balance"
                            ? negativeBalanceLocked
                            : key === "is_approval_required"
                              ? approvalLocked
                              : false
                    }
                    onChange={(e) => update(key as keyof HrAdminLeaveTypeWriteInput, e.target.checked as never)}
                    type="checkbox"
                  />
                </label>
              ))}
            </div>
          </FormSection>
        </div>

        {error ? <div className="notice notice--error" role="alert"><strong>Save failed.</strong><span className="muted">{error}</span></div> : null}
        <div className="form-actions-bar">
          <span className="muted">Leave type changes save back into the policy building-block layer immediately.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting || (mode === "edit" && item?.can_edit_directly === false)} type="submit">
              {isSubmitting ? "Saving..." : mode === "create" ? "Create leave type" : item && item.can_edit_directly === false ? "Direct edit unavailable" : "Save changes"}
            </button>
            <button className="button button--secondary" onClick={() => router.back()} type="button">
              Cancel
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}
