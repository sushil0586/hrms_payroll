"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormSection } from "@/components/patterns/form-section";
import type { HrAdminEmployeeFormOptions, HrAdminEmployeeWriteInput, HrAdminOptionItem } from "@/lib/types";

type EmployeeFormProps = {
  initialValue: HrAdminEmployeeWriteInput;
  mode: "create" | "edit";
  options: HrAdminEmployeeFormOptions;
  employeeId?: string;
};

type FieldErrors = Partial<Record<keyof HrAdminEmployeeWriteInput, string>>;

function normalizePayload(value: HrAdminEmployeeWriteInput) {
  const nullableFields = new Set([
    "date_of_birth",
    "date_of_joining",
    "legal_entity_id",
    "branch_id",
    "location_id",
    "department_id",
    "business_unit_id",
    "cost_center_id",
    "designation_id",
    "grade_id",
    "employment_type_id",
    "reporting_manager_id",
    "probation_end_date",
    "confirmation_date",
  ]);
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, item === "" && nullableFields.has(key) ? null : item]),
  );
}

function extractErrors(payload: unknown): { message: string; fieldErrors: FieldErrors } {
  if (!payload || typeof payload !== "object") {
    return { message: "Unable to save employee master.", fieldErrors: {} };
  }

  const record = payload as Record<string, unknown>;
  const fieldErrors: FieldErrors = {};

  Object.entries(record).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length) {
      fieldErrors[key as keyof HrAdminEmployeeWriteInput] = String(value[0]);
    } else if (typeof value === "string" && key !== "detail") {
      fieldErrors[key as keyof HrAdminEmployeeWriteInput] = value;
    }
  });

  const firstFieldError = Object.values(fieldErrors)[0];
  if (firstFieldError) {
    return { message: firstFieldError, fieldErrors };
  }

  if ("detail" in record) {
    return { message: String(record.detail), fieldErrors };
  }

  return { message: "Unable to save employee master.", fieldErrors };
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

function FieldHint({ children }: { children: string }) {
  return <span className="muted">{children}</span>;
}

function FieldError({ message }: { message?: string }) {
  return message ? <span className="muted">{message}</span> : null;
}

function sanitizeStructureValue(
  value: HrAdminEmployeeWriteInput,
  options: HrAdminEmployeeFormOptions,
  changedKey: keyof HrAdminEmployeeWriteInput,
) {
  const nextValue = { ...value };
  const selectedBranch = options.branches.find((item) => item.id === nextValue.branch_id);
  const selectedDepartment = options.departments.find((item) => item.id === nextValue.department_id);
  const selectedDesignation = options.designations.find((item) => item.id === nextValue.designation_id);

  if (selectedBranch?.legal_entity_id) {
    if (changedKey === "branch_id" || !nextValue.legal_entity_id) {
      nextValue.legal_entity_id = selectedBranch.legal_entity_id;
    } else if (nextValue.legal_entity_id !== selectedBranch.legal_entity_id) {
      nextValue.branch_id = null;
    }
  }

  if (selectedBranch?.location_id) {
    if (changedKey === "branch_id" || changedKey === "legal_entity_id" || !nextValue.location_id) {
      nextValue.location_id = selectedBranch.location_id;
    } else if (nextValue.location_id !== selectedBranch.location_id) {
      if (changedKey === "location_id") {
        nextValue.branch_id = null;
      } else {
        nextValue.location_id = selectedBranch.location_id;
      }
    }
  }

  if (
    nextValue.branch_id &&
    nextValue.legal_entity_id &&
    !options.branches.some(
      (item) => item.id === nextValue.branch_id && item.legal_entity_id === nextValue.legal_entity_id,
    )
  ) {
    nextValue.branch_id = null;
  }

  if (
    nextValue.cost_center_id &&
    nextValue.legal_entity_id &&
    !options.cost_centers.some(
      (item) => item.id === nextValue.cost_center_id && item.legal_entity_id === nextValue.legal_entity_id,
    )
  ) {
    nextValue.cost_center_id = null;
  }

  if (selectedDepartment?.business_unit_id) {
    if (changedKey === "department_id" || !nextValue.business_unit_id) {
      nextValue.business_unit_id = selectedDepartment.business_unit_id;
    } else if (nextValue.business_unit_id !== selectedDepartment.business_unit_id) {
      if (changedKey === "business_unit_id") {
        nextValue.department_id = null;
      } else {
        nextValue.business_unit_id = selectedDepartment.business_unit_id;
      }
    }
  }

  if (
    nextValue.department_id &&
    nextValue.business_unit_id &&
    !options.departments.some(
      (item) => item.id === nextValue.department_id && item.business_unit_id === nextValue.business_unit_id,
    )
  ) {
    nextValue.department_id = null;
  }

  if (selectedDesignation?.grade_id) {
    if (changedKey === "designation_id" || !nextValue.grade_id) {
      nextValue.grade_id = selectedDesignation.grade_id;
    } else if (nextValue.grade_id !== selectedDesignation.grade_id) {
      if (changedKey === "grade_id") {
        nextValue.designation_id = null;
      } else {
        nextValue.grade_id = selectedDesignation.grade_id;
      }
    }
  }

  if (
    nextValue.designation_id &&
    nextValue.grade_id &&
    !options.designations.some(
      (item) => item.id === nextValue.designation_id && item.grade_id === nextValue.grade_id,
    )
  ) {
    nextValue.designation_id = null;
  }

  return nextValue;
}

export function EmployeeForm({ initialValue, mode, options, employeeId }: EmployeeFormProps) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const filteredBranches = options.branches.filter(
    (item) => !formValue.legal_entity_id || item.legal_entity_id === formValue.legal_entity_id,
  );
  const filteredLocations = options.locations.filter((item) => {
    const selectedBranch = options.branches.find((branch) => branch.id === formValue.branch_id);
    if (selectedBranch?.location_id) {
      return item.id === selectedBranch.location_id;
    }
    return true;
  });
  const filteredCostCenters = options.cost_centers.filter(
    (item) => !formValue.legal_entity_id || item.legal_entity_id === formValue.legal_entity_id,
  );
  const filteredDepartments = options.departments.filter(
    (item) => !formValue.business_unit_id || item.business_unit_id === formValue.business_unit_id,
  );
  const filteredBusinessUnits = options.business_units.filter((item) => {
    const selectedDepartment = options.departments.find((department) => department.id === formValue.department_id);
    if (selectedDepartment?.business_unit_id) {
      return item.id === selectedDepartment.business_unit_id;
    }
    return true;
  });
  const filteredDesignations = options.designations.filter(
    (item) => !formValue.grade_id || item.grade_id === formValue.grade_id,
  );
  const filteredGrades = options.grades.filter((item) => {
    const selectedDesignation = options.designations.find((designation) => designation.id === formValue.designation_id);
    if (selectedDesignation?.grade_id) {
      return item.id === selectedDesignation.grade_id;
    }
    return true;
  });
  const dateWarnings: string[] = [];
  if (formValue.date_of_birth && formValue.date_of_joining && formValue.date_of_birth >= formValue.date_of_joining) {
    dateWarnings.push("date of birth must be earlier than date of joining");
  }
  if (formValue.date_of_joining && formValue.probation_end_date && formValue.probation_end_date < formValue.date_of_joining) {
    dateWarnings.push("probation end date cannot be earlier than date of joining");
  }
  if (formValue.date_of_joining && formValue.confirmation_date && formValue.confirmation_date < formValue.date_of_joining) {
    dateWarnings.push("confirmation date cannot be earlier than date of joining");
  }
  if (formValue.probation_end_date && formValue.confirmation_date && formValue.confirmation_date < formValue.probation_end_date) {
    dateWarnings.push("confirmation date cannot be earlier than probation end date");
  }
  const mappingWarnings: string[] = [];
  if (formValue.branch_id && !formValue.legal_entity_id) {
    mappingWarnings.push("branch should be paired with a legal entity");
  }
  if (formValue.department_id && !formValue.business_unit_id) {
    mappingWarnings.push("department should be paired with a business unit");
  }
  if (formValue.designation_id && !formValue.grade_id) {
    mappingWarnings.push("designation should be paired with a grade");
  }
  if (formValue.legal_entity_id && filteredBranches.length === 0) {
    mappingWarnings.push("no active branches are mapped to the selected legal entity");
  }
  if (formValue.legal_entity_id && filteredCostCenters.length === 0) {
    mappingWarnings.push("no active cost centers are mapped to the selected legal entity");
  }

  function updateField<Key extends keyof HrAdminEmployeeWriteInput>(key: Key, value: HrAdminEmployeeWriteInput[Key]) {
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setFormValue((current) => sanitizeStructureValue({ ...current, [key]: value }, options, key));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setFieldErrors({});

    const response = await fetch(mode === "create" ? "/api/hr-admin/employees" : `/api/hr-admin/employees/${employeeId}`, {
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

    const redirectId = payload.id || employeeId;
    router.push(`/hr-admin/employees${redirectId ? `?employeeId=${redirectId}` : ""}`);
    router.refresh();
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2>{mode === "create" ? "Create employee master" : "Edit employee master"}</h2>
            <p className="section-copy">
              Capture the core employee profile and structural mapping first. We can layer documents, lifecycle, and payroll details afterward.
            </p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip">
              <strong>{formValue.employment_status}</strong> current status
            </span>
            <span className="queue-summary-chip">
              <strong>{formValue.employee_code || "Draft"}</strong> employee code
            </span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          {dateWarnings.length ? (
            <div className="notice form-shell-card__notice">
              <strong>Date review needed.</strong>
              <span className="muted">{dateWarnings.join(", ")}.</span>
            </div>
          ) : null}
          {mappingWarnings.length ? (
            <div className="notice form-shell-card__notice">
              <strong>Structure review needed.</strong>
              <span className="muted">{mappingWarnings.join(", ")}.</span>
            </div>
          ) : null}
          <FormSection
            title="Identity and employment"
            description="Set the core person profile and employment state that downstream workflows inherit."
          >
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Employee code</span>
                <input className="input-control" required value={formValue.employee_code} onChange={(event) => updateField("employee_code", event.target.value)} />
                <FieldError message={fieldErrors.employee_code} />
              </label>
              <label className="form-field">
                <span className="muted">Employment status</span>
                <select className="input-control" value={formValue.employment_status} onChange={(event) => updateField("employment_status", event.target.value)}>
                  {options.employment_statuses.map((option) => (
                    <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                </select>
                <FieldError message={fieldErrors.employment_status} />
              </label>
              <label className="form-field">
                <span className="muted">First name</span>
                <input className="input-control" required value={formValue.first_name} onChange={(event) => updateField("first_name", event.target.value)} />
                <FieldError message={fieldErrors.first_name} />
              </label>
              <label className="form-field">
                <span className="muted">Middle name</span>
                <input className="input-control" value={formValue.middle_name} onChange={(event) => updateField("middle_name", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="muted">Last name</span>
                <input className="input-control" value={formValue.last_name} onChange={(event) => updateField("last_name", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="muted">Preferred name</span>
                <input className="input-control" value={formValue.preferred_name} onChange={(event) => updateField("preferred_name", event.target.value)} />
              </label>
            </div>
          </FormSection>

          <FormSection
            title="Contact and dates"
            description="Keep communication details and milestone dates clean so access, payroll, and lifecycle modules can trust the record."
          >
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Work email</span>
                <input className="input-control" type="email" value={formValue.work_email} onChange={(event) => updateField("work_email", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="muted">Personal email</span>
                <input className="input-control" type="email" value={formValue.personal_email} onChange={(event) => updateField("personal_email", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="muted">Phone number</span>
                <input className="input-control" value={formValue.phone_number} onChange={(event) => updateField("phone_number", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="muted">Date of birth</span>
                <input className="input-control" type="date" value={formValue.date_of_birth ?? ""} onChange={(event) => updateField("date_of_birth", event.target.value || null)} />
                <FieldError message={fieldErrors.date_of_birth} />
              </label>
              <label className="form-field">
                <span className="muted">Date of joining</span>
                <input className="input-control" type="date" value={formValue.date_of_joining ?? ""} onChange={(event) => updateField("date_of_joining", event.target.value || null)} />
                <FieldError message={fieldErrors.date_of_joining} />
              </label>
              <label className="form-field">
                <span className="muted">Probation end date</span>
                <input className="input-control" type="date" value={formValue.probation_end_date ?? ""} onChange={(event) => updateField("probation_end_date", event.target.value || null)} />
                <FieldError message={fieldErrors.probation_end_date} />
              </label>
              <label className="form-field form-field--full">
                <span className="muted">Confirmation date</span>
                <input className="input-control" type="date" value={formValue.confirmation_date ?? ""} onChange={(event) => updateField("confirmation_date", event.target.value || null)} />
                <FieldError message={fieldErrors.confirmation_date} />
              </label>
            </div>
          </FormSection>

          <FormSection
            fullWidth
            title="Structural mapping"
            description="These assignments drive approvals, policy eligibility, routing, attendance interpretation, and payroll coverage."
          >
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Legal entity</span>
                <select className="input-control" value={formValue.legal_entity_id ?? ""} onChange={(event) => updateField("legal_entity_id", event.target.value || null)}>
                  {selectOptions(options.legal_entities)}
                </select>
                <FieldHint>Branch and cost center options narrow to the selected legal entity.</FieldHint>
                <FieldError message={fieldErrors.legal_entity_id} />
              </label>
              <label className="form-field">
                <span className="muted">Branch</span>
                <select className="input-control" value={formValue.branch_id ?? ""} onChange={(event) => updateField("branch_id", event.target.value || null)}>
                  {selectOptions(filteredBranches)}
                </select>
                <FieldHint>Selecting a branch aligns the location automatically when the branch has a mapped location.</FieldHint>
                <FieldError message={fieldErrors.branch_id} />
              </label>
              <label className="form-field">
                <span className="muted">Location</span>
                <select className="input-control" value={formValue.location_id ?? ""} onChange={(event) => updateField("location_id", event.target.value || null)}>
                  {selectOptions(filteredLocations)}
                </select>
                <FieldHint>Location is narrowed by the selected branch when a branch-level location exists.</FieldHint>
                <FieldError message={fieldErrors.location_id} />
              </label>
              <label className="form-field">
                <span className="muted">Business unit</span>
                <select className="input-control" value={formValue.business_unit_id ?? ""} onChange={(event) => updateField("business_unit_id", event.target.value || null)}>
                  {selectOptions(filteredBusinessUnits)}
                </select>
                <FieldHint>Department selection will align or narrow the business unit automatically.</FieldHint>
                <FieldError message={fieldErrors.business_unit_id} />
              </label>
              <label className="form-field">
                <span className="muted">Department</span>
                <select className="input-control" value={formValue.department_id ?? ""} onChange={(event) => updateField("department_id", event.target.value || null)}>
                  {selectOptions(filteredDepartments)}
                </select>
                <FieldHint>Only departments from the selected business unit remain available.</FieldHint>
                <FieldError message={fieldErrors.department_id} />
              </label>
              <label className="form-field">
                <span className="muted">Cost center</span>
                <select className="input-control" value={formValue.cost_center_id ?? ""} onChange={(event) => updateField("cost_center_id", event.target.value || null)}>
                  {selectOptions(filteredCostCenters)}
                </select>
                <FieldHint>Cost centers narrow to the selected legal entity.</FieldHint>
                <FieldError message={fieldErrors.cost_center_id} />
              </label>
              <label className="form-field">
                <span className="muted">Designation</span>
                <select className="input-control" value={formValue.designation_id ?? ""} onChange={(event) => updateField("designation_id", event.target.value || null)}>
                  {selectOptions(filteredDesignations)}
                </select>
                <FieldHint>Designation choice will align the grade if the designation has a mapped grade.</FieldHint>
                <FieldError message={fieldErrors.designation_id} />
              </label>
              <label className="form-field">
                <span className="muted">Grade</span>
                <select className="input-control" value={formValue.grade_id ?? ""} onChange={(event) => updateField("grade_id", event.target.value || null)}>
                  {selectOptions(filteredGrades)}
                </select>
                <FieldHint>Only grades compatible with the selected designation remain available.</FieldHint>
                <FieldError message={fieldErrors.grade_id} />
              </label>
              <label className="form-field">
                <span className="muted">Employment type</span>
                <select className="input-control" value={formValue.employment_type_id ?? ""} onChange={(event) => updateField("employment_type_id", event.target.value || null)}>
                  {selectOptions(options.employment_types)}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Reporting manager</span>
                <select className="input-control" value={formValue.reporting_manager_id ?? ""} onChange={(event) => updateField("reporting_manager_id", event.target.value || null)}>
                  <option value="">Select an option</option>
                  {options.managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} ({manager.employee_code})
                    </option>
                  ))}
                </select>
                <FieldError message={fieldErrors.reporting_manager_id} />
              </label>
            </div>
          </FormSection>
        </div>

        {error ? (
          <div className="notice">
            <strong>Save failed.</strong>
            <span className="muted">{error}</span>
          </div>
        ) : null}

        <div className="form-actions-bar">
          <span className="muted">This saves directly back into the employee directory and keeps the selected master ready for access and lifecycle setup.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : mode === "create" ? "Create employee" : "Save changes"}
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
