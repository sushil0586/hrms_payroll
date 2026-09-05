"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { ORGANIZATION_SECTION_CONFIG, type OrganizationSectionKey } from "@/app/hr-admin/organization/section-config";
import { FormSection } from "@/components/patterns/form-section";
import type { HrAdminOrganizationFormOptions, HrAdminOrganizationItem, HrAdminOrganizationWriteInput } from "@/lib/types";

type OrganizationFormProps = {
  initialValue: HrAdminOrganizationWriteInput;
  mode: "create" | "edit";
  section: OrganizationSectionKey;
  options: HrAdminOrganizationFormOptions;
  itemId?: string;
  currentItem?: HrAdminOrganizationItem;
};

type OrganizationFieldErrors = Partial<Record<keyof HrAdminOrganizationWriteInput, string>>;

function getDeactivationGuidance(item: HrAdminOrganizationItem | undefined, section: OrganizationSectionKey) {
  if (!item) {
    return [];
  }

  const guidance: Array<{ label: string; href: string; helper: string }> = [];

  if ((item.linked_employees_count ?? 0) > 0) {
    guidance.push({
      label: "Review linked employees",
      href: `/hr-admin/employees?q=${encodeURIComponent(item.name)}`,
      helper: `${item.linked_employees_count} employees still reference this record.`,
    });
  }
  if ((item.branches_count ?? 0) > 0) {
    guidance.push({
      label: "Review linked branches",
      href: `/hr-admin/organization?section=branches&q=${encodeURIComponent(item.name)}`,
      helper: `${item.branches_count} branches still depend on this record.`,
    });
  }
  if ((item.child_count ?? 0) > 0) {
    guidance.push({
      label: section === "business_units" ? "Review child business units" : "Review child departments",
      href: `/hr-admin/organization?section=${section}&q=${encodeURIComponent(item.name)}`,
      helper: `${item.child_count} child records still sit underneath this master.`,
    });
  }
  if ((item.departments_count ?? 0) > 0) {
    guidance.push({
      label: "Review dependent departments",
      href: `/hr-admin/organization?section=departments&q=${encodeURIComponent(item.name)}`,
      helper: `${item.departments_count} departments still depend on this business unit.`,
    });
  }
  if ((item.designations_count ?? 0) > 0) {
    guidance.push({
      label: "Review dependent designations",
      href: `/hr-admin/organization?section=designations&q=${encodeURIComponent(item.name)}`,
      helper: `${item.designations_count} designations still depend on this grade.`,
    });
  }
  if ((item.cost_centers_count ?? 0) > 0) {
    guidance.push({
      label: "Review linked cost centers",
      href: `/hr-admin/organization?section=legal_entities&q=${encodeURIComponent(item.name)}`,
      helper: `${item.cost_centers_count} cost centers still depend on this legal entity.`,
    });
  }

  return guidance;
}

function normalizePayload(value: HrAdminOrganizationWriteInput) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, item === "" ? null : item]));
}

function extractErrors(payload: unknown): { message: string; fieldErrors: OrganizationFieldErrors } {
  if (!payload || typeof payload !== "object") {
    return { message: "Unable to save organization master.", fieldErrors: {} };
  }

  const record = payload as Record<string, unknown>;
  const fieldErrors: OrganizationFieldErrors = {};

  Object.entries(record).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length) {
      fieldErrors[key as keyof HrAdminOrganizationWriteInput] = String(value[0]);
    } else if (typeof value === "string" && key !== "detail") {
      fieldErrors[key as keyof HrAdminOrganizationWriteInput] = value;
    }
  });

  const firstFieldError = Object.values(fieldErrors)[0];
  if (firstFieldError) {
    return { message: firstFieldError, fieldErrors };
  }

  if ("detail" in record) {
    return { message: String(record.detail), fieldErrors };
  }

  return { message: "Unable to save organization master.", fieldErrors };
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

function FieldError({ message }: { message?: string }) {
  return message ? <span className="muted">{message}</span> : null;
}

export function OrganizationForm({ initialValue, mode, section, options, itemId, currentItem }: OrganizationFormProps) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<OrganizationFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sectionMeta = ORGANIZATION_SECTION_CONFIG[section];
  const filteredBusinessUnits = itemId ? options.business_units.filter((item) => item.id !== itemId) : options.business_units;
  const filteredDepartments = itemId ? options.departments.filter((item) => item.id !== itemId) : options.departments;
  const deactivationGuidance = !formValue.is_active && mode === "edit" ? getDeactivationGuidance(currentItem, section) : [];

  function updateField<Key extends keyof HrAdminOrganizationWriteInput>(key: Key, value: HrAdminOrganizationWriteInput[Key]) {
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setFieldErrors({});

    const response = await fetch(mode === "create" ? `/api/hr-admin/organization/${section}` : `/api/hr-admin/organization/${section}/${itemId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(normalizePayload(formValue)),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const nextErrors = extractErrors(payload);
      setError(nextErrors.message);
      setFieldErrors(nextErrors.fieldErrors);
      setIsSubmitting(false);
      return;
    }

    router.push(`/hr-admin/organization?section=${section}`);
    router.refresh();
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2>{mode === "create" ? `Create ${sectionMeta.singular}` : `Edit ${sectionMeta.singular}`}</h2>
            <p className="section-copy">
              Keep this master data clean and consistent, because downstream policy scope, workflow routing, and payroll logic all depend on it.
            </p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip">
              <strong>{sectionMeta.singular}</strong> record type
            </span>
            <span className="queue-summary-chip">
              <strong>{formValue.is_active ? "active" : "inactive"}</strong> status
            </span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          {!formValue.is_active && mode === "edit" ? (
            <div className="notice">
              <strong>Inactive records must be dependency-safe.</strong>
              <span className="muted">
                Clear or reassign downstream usage before saving this record as inactive.
                {deactivationGuidance.length ? " Use these review shortcuts to clean up linked records first." : " No obvious dependency counts are currently flagged on this record."}
              </span>
              {deactivationGuidance.length ? (
                <div className="employee-directory-item__meta">
                  {deactivationGuidance.map((item) => (
                    <span key={item.href}>
                      <Link href={item.href}>{item.label}</Link> - {item.helper}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <FormSection title="Core identity" description="Every organization master starts with a stable code, readable name, and active-state choice.">
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Code</span>
                <input className="input-control" required value={formValue.code} onChange={(event) => updateField("code", event.target.value)} />
                <FieldError message={fieldErrors.code} />
              </label>
              <label className="form-field">
                <span className="muted">Name</span>
                <input className="input-control" required value={formValue.name} onChange={(event) => updateField("name", event.target.value)} />
                <FieldError message={fieldErrors.name} />
              </label>
              <label className="form-field">
                <span className="muted">Active</span>
                <select className="input-control" value={formValue.is_active ? "true" : "false"} onChange={(event) => updateField("is_active", event.target.value === "true")}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
                <FieldError message={fieldErrors.is_active} />
              </label>
            </div>
          </FormSection>

          {section === "locations" ? (
            <FormSection title="Location details" description="Capture address and country metadata that later feed branch setup and employee assignment.">
              <div className="form-grid">
                <label className="form-field">
                  <span className="muted">Address line 1</span>
                  <input className="input-control" value={formValue.address_line_1 ?? ""} onChange={(event) => updateField("address_line_1", event.target.value)} />
                </label>
                <label className="form-field">
                  <span className="muted">Address line 2</span>
                  <input className="input-control" value={formValue.address_line_2 ?? ""} onChange={(event) => updateField("address_line_2", event.target.value)} />
                </label>
                <label className="form-field">
                  <span className="muted">City</span>
                  <input className="input-control" value={formValue.city ?? ""} onChange={(event) => updateField("city", event.target.value)} />
                </label>
                <label className="form-field">
                  <span className="muted">State</span>
                  <input className="input-control" value={formValue.state ?? ""} onChange={(event) => updateField("state", event.target.value)} />
                </label>
                <label className="form-field">
                  <span className="muted">Postal code</span>
                  <input className="input-control" value={formValue.postal_code ?? ""} onChange={(event) => updateField("postal_code", event.target.value)} />
                </label>
                <label className="form-field">
                  <span className="muted">Country code</span>
                  <input className="input-control" value={formValue.country_code ?? ""} onChange={(event) => updateField("country_code", event.target.value)} placeholder="IN" />
                </label>
              </div>
            </FormSection>
          ) : null}

          {section === "legal_entities" ? (
            <FormSection title="Legal entity details" description="These fields support legal and contact accuracy for the tenant's operating entities.">
              <div className="form-grid">
                <label className="form-field">
                  <span className="muted">Registered name</span>
                  <input className="input-control" value={formValue.registered_name ?? ""} onChange={(event) => updateField("registered_name", event.target.value)} />
                </label>
                <label className="form-field">
                  <span className="muted">Country code</span>
                  <input className="input-control" value={formValue.country_code ?? ""} onChange={(event) => updateField("country_code", event.target.value)} placeholder="IN" />
                </label>
                <label className="form-field">
                  <span className="muted">Timezone</span>
                  <input className="input-control" value={formValue.timezone ?? ""} onChange={(event) => updateField("timezone", event.target.value)} placeholder="Asia/Kolkata" />
                </label>
                <label className="form-field">
                  <span className="muted">Primary email</span>
                  <input className="input-control" type="email" value={formValue.primary_email ?? ""} onChange={(event) => updateField("primary_email", event.target.value)} />
                </label>
                <label className="form-field">
                  <span className="muted">Primary phone</span>
                  <input className="input-control" value={formValue.primary_phone ?? ""} onChange={(event) => updateField("primary_phone", event.target.value)} />
                </label>
              </div>
            </FormSection>
          ) : null}

          {section === "branches" ? (
            <FormSection title="Branch mapping" description="Tie branches cleanly to legal entities and locations so employee mapping stays trustworthy.">
              <div className="form-grid">
                <label className="form-field">
                  <span className="muted">Legal entity</span>
                  <select className="input-control" value={formValue.legal_entity_id ?? ""} onChange={(event) => updateField("legal_entity_id", event.target.value || null)}>
                    {selectOptions(options.legal_entities)}
                  </select>
                  <FieldError message={fieldErrors.legal_entity_id} />
                </label>
                <label className="form-field">
                  <span className="muted">Location</span>
                  <select className="input-control" value={formValue.location_id ?? ""} onChange={(event) => updateField("location_id", event.target.value || null)}>
                    {selectOptions(options.locations)}
                  </select>
                  <FieldError message={fieldErrors.location_id} />
                </label>
                <label className="form-field">
                  <span className="muted">Branch type</span>
                  <input className="input-control" value={formValue.branch_type ?? ""} onChange={(event) => updateField("branch_type", event.target.value)} />
                </label>
              </div>
            </FormSection>
          ) : null}

          {section === "business_units" ? (
            <FormSection title="Business unit hierarchy" description="Optional parent linkage helps represent larger structure without overcomplicating the catalog.">
              <div className="form-grid">
                <label className="form-field">
                  <span className="muted">Parent business unit</span>
                  <select className="input-control" value={formValue.parent_id ?? ""} onChange={(event) => updateField("parent_id", event.target.value || null)}>
                    {selectOptions(filteredBusinessUnits)}
                  </select>
                  <FieldError message={fieldErrors.parent_id} />
                </label>
              </div>
            </FormSection>
          ) : null}

          {section === "departments" ? (
            <FormSection title="Department hierarchy" description="Department structure should stay explicit because policy scope and reporting often depend on it.">
              <div className="form-grid">
                <label className="form-field">
                  <span className="muted">Business unit</span>
                  <select className="input-control" value={formValue.business_unit_id ?? ""} onChange={(event) => updateField("business_unit_id", event.target.value || null)}>
                    {selectOptions(options.business_units)}
                  </select>
                  <FieldError message={fieldErrors.business_unit_id} />
                </label>
                <label className="form-field">
                  <span className="muted">Parent department</span>
                  <select className="input-control" value={formValue.parent_id ?? ""} onChange={(event) => updateField("parent_id", event.target.value || null)}>
                    {selectOptions(filteredDepartments)}
                  </select>
                  <FieldError message={fieldErrors.parent_id} />
                </label>
              </div>
            </FormSection>
          ) : null}

          {section === "grades" ? (
            <FormSection title="Grade level" description="Level adds a small but important structure signal for designations and workforce mapping.">
              <div className="form-grid">
                <label className="form-field">
                  <span className="muted">Level</span>
                  <input
                    className="input-control"
                    type="number"
                    value={formValue.level ?? ""}
                    onChange={(event) => updateField("level", event.target.value ? Number(event.target.value) : null)}
                  />
                  <FieldError message={fieldErrors.level} />
                </label>
              </div>
            </FormSection>
          ) : null}

          {section === "designations" ? (
            <FormSection title="Designation mapping" description="Attach designations to grades so employee assignments and compensation structure stay aligned.">
              <div className="form-grid">
                <label className="form-field">
                  <span className="muted">Grade</span>
                  <select className="input-control" value={formValue.grade_id ?? ""} onChange={(event) => updateField("grade_id", event.target.value || null)}>
                    {selectOptions(options.grades)}
                  </select>
                  <FieldError message={fieldErrors.grade_id} />
                </label>
              </div>
            </FormSection>
          ) : null}

          {section === "employment_types" ? (
            <FormSection title="Employment type behavior" description="This shape influences how different worker categories are treated downstream.">
              <div className="form-grid">
                <label className="form-field">
                  <span className="muted">Description</span>
                  <input className="input-control" value={formValue.description ?? ""} onChange={(event) => updateField("description", event.target.value)} />
                </label>
                <label className="form-field">
                  <span className="muted">Payroll eligibility</span>
                  <select className="input-control" value={formValue.is_payroll_eligible ? "true" : "false"} onChange={(event) => updateField("is_payroll_eligible", event.target.value === "true")}>
                    <option value="true">Payroll eligible</option>
                    <option value="false">Non payroll</option>
                  </select>
                </label>
              </div>
            </FormSection>
          ) : null}
        </div>

        {error ? (
          <div className="notice">
            <strong>Save failed.</strong>
            <span className="muted">{error}</span>
          </div>
        ) : null}

        <div className="form-actions-bar">
          <span className="muted">This saves directly back into the structure catalog so downstream setup can use the updated master immediately.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : mode === "create" ? `Create ${sectionMeta.singular.toLowerCase()}` : "Save changes"}
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
