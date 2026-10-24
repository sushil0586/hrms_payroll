"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useValidationFocus } from "@/lib/ui/use-validation-focus";
import { mutationErrorMessage, networkMutationMessage } from "@/lib/ui/api-error-message";
import { useFeedbackFocus } from "@/lib/ui/use-feedback-focus";

import { FormSection } from "@/components/patterns/form-section";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { WorkspaceFormFooter } from "@/components/patterns/workspace-standard";
import type { HrAdminEmployeeFormOptions, HrAdminEmployeeWriteInput, HrAdminOptionItem } from "@/lib/types";
import { hasFieldErrors, requireText, validateDateOrder, validateEmail } from "@/lib/ui/validation";

export type EmployeeFormProps = {
  initialValue: HrAdminEmployeeWriteInput;
  mode: "create" | "edit";
  options: HrAdminEmployeeFormOptions;
  employeeId?: string;
  cancelHref?: string;
  onSubmittingChange?: (busy: boolean) => void;
};

const subscribeToHydration = () => () => {};

type FieldErrors = Partial<Record<keyof HrAdminEmployeeWriteInput, string>>;
type EmployeeFormStep = "identity" | "contact" | "structure" | "review";

const employeeFormSteps: Array<{ id: EmployeeFormStep; label: string }> = [
  { id: "identity", label: "Identity" },
  { id: "contact", label: "Contact" },
  { id: "structure", label: "Structure" },
  { id: "review", label: "Review" },
];

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

function extractErrors(payload: unknown, values: HrAdminEmployeeWriteInput): { message: string; fieldErrors: FieldErrors } {
  if (!payload || typeof payload !== "object") {
    return { message: "Unable to save employee master.", fieldErrors: {} };
  }

  const record = payload as Record<string, unknown>;
  const fieldErrors: FieldErrors = {};

  Object.entries(record).forEach(([key, value]) => {
    if (!(key in values)) return;
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

  if (Array.isArray(record.non_field_errors) && record.non_field_errors.length) {
    return { message: String(record.non_field_errors[0]), fieldErrors };
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

function FieldHint({ children, tone = "default" }: { children: string; tone?: "default" | "warning" }) {
  return <span className={`field-help-text${tone === "warning" ? " field-help-text--warning" : ""}`}>{children}</span>;
}

function FieldError({ message, field }: { message?: string; field: string }) {
  return message ? <span id={`employee-error-${field}`} className="field-error-text">{message}</span> : null;
}

function ReviewRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="employee-form-review-row">
      <span>{label}</span>
      <strong>{value || "Not set"}</strong>
    </div>
  );
}

function findOptionName(items: HrAdminOptionItem[], id: string | null | undefined) {
  if (!id) {
    return "Not set";
  }
  return items.find((item) => item.id === id)?.name ?? "Not set";
}

function stepForErrors(errors: FieldErrors): EmployeeFormStep {
  if (errors.employee_code || errors.first_name || errors.middle_name || errors.last_name || errors.preferred_name || errors.employment_status) {
    return "identity";
  }
  if (
    errors.phone_number ||
    errors.work_email ||
    errors.personal_email ||
    errors.date_of_birth ||
    errors.date_of_joining ||
    errors.probation_end_date ||
    errors.confirmation_date
  ) {
    return "contact";
  }
  return "structure";
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

export function EmployeeForm({ initialValue, mode, options, employeeId, cancelHref, onSubmittingChange }: EmployeeFormProps) {
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [formValue, setFormValue] = useState(initialValue);
  const [activeStep, setActiveStep] = useState<EmployeeFormStep>("identity");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const formRef = useValidationFocus(fieldErrors);
  const feedbackRef = useFeedbackFocus(error, isSubmitting, hasFieldErrors(fieldErrors));
  const stepBodyRef = useRef<HTMLDivElement>(null);
  const focusStepRef = useRef(false);
  const savedRef = useRef(false);
  const dirty = JSON.stringify(formValue) !== JSON.stringify(initialValue);

  useEffect(() => { onSubmittingChange?.(isSubmitting); }, [isSubmitting, onSubmittingChange]);
  useEffect(() => {
    if (!focusStepRef.current) return;
    focusStepRef.current = false;
    stepBodyRef.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [activeStep]);
  useEffect(() => {
    if (cancelHref) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!savedRef.current && (dirty || isSubmittingRef.current)) { event.preventDefault(); event.returnValue = ""; }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [cancelHref, dirty]);

  function selectStep(step: EmployeeFormStep) {
    if (isSubmittingRef.current || step === activeStep) return;
    focusStepRef.current = true;
    setActiveStep(step);
  }

  function cancel() {
    if (isSubmittingRef.current) return;
    if (cancelHref) {
      window.dispatchEvent(new CustomEvent("hr-admin-modal:request-close"));
    } else if (!dirty || window.confirm("Discard unsaved changes?")) {
      savedRef.current = true;
      window.location.assign(employeeId ? `/hr-admin/employees?employeeId=${encodeURIComponent(employeeId)}` : "/hr-admin/employees");
    }
  }


  const selectedBranch = options.branches.find((branch) => branch.id === formValue.branch_id);
  const selectedDepartment = options.departments.find((department) => department.id === formValue.department_id);
  const selectedDesignation = options.designations.find((designation) => designation.id === formValue.designation_id);

  const filteredBranches = options.branches.filter(
    (item) => !formValue.legal_entity_id || item.legal_entity_id === formValue.legal_entity_id,
  );
  const filteredLocations = options.locations.filter((item) => {
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
    if (selectedDepartment?.business_unit_id) {
      return item.id === selectedDepartment.business_unit_id;
    }
    return true;
  });
  const filteredDesignations = options.designations.filter(
    (item) => !formValue.grade_id || item.grade_id === formValue.grade_id,
  );
  const filteredGrades = options.grades.filter((item) => {
    if (selectedDesignation?.grade_id) {
      return item.id === selectedDesignation.grade_id;
    }
    return true;
  });
  const dateWarnings: string[] = [];
  if (formValue.date_of_birth && formValue.date_of_joining && formValue.date_of_birth >= formValue.date_of_joining) {
    dateWarnings.push("Date of birth must be earlier than date of joining");
  }
  if (formValue.date_of_joining && formValue.probation_end_date && formValue.probation_end_date < formValue.date_of_joining) {
    dateWarnings.push("Probation end date cannot be earlier than date of joining");
  }
  if (formValue.date_of_joining && formValue.confirmation_date && formValue.confirmation_date < formValue.date_of_joining) {
    dateWarnings.push("Confirmation date cannot be earlier than date of joining");
  }
  if (formValue.probation_end_date && formValue.confirmation_date && formValue.confirmation_date < formValue.probation_end_date) {
    dateWarnings.push("Confirmation date cannot be earlier than probation end date");
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
  const branchWarning =
    formValue.legal_entity_id && filteredBranches.length === 0
      ? "No active branches are mapped to this legal entity."
      : null;
  const branchLocationWarning =
    selectedBranch && !selectedBranch.location_id
      ? "This branch has no mapped location. Select the location manually before saving."
      : null;
  const costCenterWarning =
    formValue.legal_entity_id && filteredCostCenters.length === 0
      ? "No active cost centers are mapped to this legal entity."
      : null;
  const departmentWarning =
    formValue.business_unit_id && filteredDepartments.length === 0
      ? "No active departments are mapped to this business unit."
      : null;
  const departmentBusinessUnitWarning =
    selectedDepartment && !selectedDepartment.business_unit_id
      ? "This department has no mapped business unit. Select the business unit manually before saving."
      : null;
  const gradeWarning =
    selectedDesignation && !selectedDesignation.grade_id
      ? "This designation has no mapped grade. Select the grade manually before saving."
      : null;

  function updateField<Key extends keyof HrAdminEmployeeWriteInput>(key: Key, value: HrAdminEmployeeWriteInput[Key]) {
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setFormValue((current) => sanitizeStructureValue({ ...current, [key]: value }, options, key));
  }

  function goToPreviousStep() {
    const index = employeeFormSteps.findIndex((step) => step.id === activeStep);
    selectStep(employeeFormSteps[Math.max(0, index - 1)].id);
  }

  function goToNextStep() {
    const index = employeeFormSteps.findIndex((step) => step.id === activeStep);
    selectStep(employeeFormSteps[Math.min(employeeFormSteps.length - 1, index + 1)].id);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;
    setError("");
    setFieldErrors({});
    const nextErrors: FieldErrors = {
      employee_code: requireText(formValue.employee_code, "Enter the employee code."),
      first_name: requireText(formValue.first_name, "Enter the first name."),
      work_email: validateEmail(formValue.work_email, "Enter a valid work email address."),
      personal_email: validateEmail(formValue.personal_email, "Enter a valid personal email address."),
      date_of_birth:
        formValue.date_of_birth && formValue.date_of_joining && formValue.date_of_birth >= formValue.date_of_joining
          ? "Date of birth must be earlier than date of joining."
          : undefined,
      probation_end_date: validateDateOrder(formValue.date_of_joining, formValue.probation_end_date, "Probation end date cannot be earlier than date of joining."),
      confirmation_date:
        validateDateOrder(formValue.date_of_joining, formValue.confirmation_date, "Confirmation date cannot be earlier than date of joining.") ??
        validateDateOrder(formValue.probation_end_date, formValue.confirmation_date, "Confirmation date cannot be earlier than probation end date."),
    };
    if (hasFieldErrors(nextErrors)) {
      setFieldErrors(nextErrors);
      setError("Review the highlighted employee fields and try again.");
      setActiveStep(stepForErrors(nextErrors));
      isSubmittingRef.current = false;
      return;
    }
    setIsSubmitting(true);

    let response: Response;
    try {
      response = await fetch(mode === "create" ? "/api/hr-admin/employees" : `/api/hr-admin/employees/${employeeId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(normalizePayload(formValue)),
      });
    } catch {
      setError(networkMutationMessage);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const nextErrors = extractErrors(payload, formValue);
      setError(mutationErrorMessage(payload, response.status, nextErrors.message));
      setFieldErrors(nextErrors.fieldErrors);
      if (hasFieldErrors(nextErrors.fieldErrors)) setActiveStep(stepForErrors(nextErrors.fieldErrors));
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }

    const redirectId = payload.id || employeeId;
    const destination = new URL(cancelHref || "/hr-admin/employees", window.location.origin);
    destination.searchParams.delete("create");
    destination.searchParams.delete("action");
    if (redirectId) destination.searchParams.set("employeeId", redirectId);
    destination.searchParams.set("saved", mode);
    // Successful navigation must not prompt to discard the values just saved.
    savedRef.current = true;
    window.location.assign(destination);
  }

  return (
    <form ref={formRef} aria-busy={isSubmitting} className="section form-layout-modern employee-child-form employee-master-form" noValidate onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2>Employee details</h2>
            <p className="section-copy">
              Work through identity, contact dates, and structural mapping before saving.
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

        <nav className="employee-form-stepper" aria-label="Employee form progress">
          {employeeFormSteps.map((step, index) => (
            <button
              aria-current={activeStep === step.id ? "step" : undefined}
              className="employee-form-stepper__item"
              key={step.id}
              disabled={!ready || isSubmitting}
              onClick={() => selectStep(step.id)}
              type="button"
            >
              <span>{index + 1}.</span>
              {step.label}
            </button>
          ))}
        </nav>

        <p className="employee-form-required-note">Required: employee code and first name.</p>
        <fieldset disabled={!ready || isSubmitting} className="employee-master-form__fields">
        <div
          ref={(element) => {
            stepBodyRef.current = element;
            element?.querySelectorAll("h2").forEach((heading) => { heading.tabIndex = -1; });
          }}
          className="form-shell-card__grid employee-form-step-body"
        >
          {dateWarnings.length ? (
            <div className="notice notice--error form-shell-card__notice" role="alert">
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
          {activeStep === "identity" ? (
          <FormSection title="Identity and employment" description="Core employment details.">
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Employee code</span>
                <input name="employee_code" aria-invalid={Boolean(fieldErrors.employee_code)} aria-describedby={fieldErrors.employee_code ? "employee-error-employee_code" : undefined} className="input-control" required value={formValue.employee_code} onChange={(event) => updateField("employee_code", event.target.value)} />
                <FieldError field="employee_code" message={fieldErrors.employee_code} />
              </label>
              <label className="form-field">
                <span className="muted">Employment status</span>
                <select name="employment_status" aria-invalid={Boolean(fieldErrors.employment_status)} aria-describedby={fieldErrors.employment_status ? "employee-error-employment_status" : undefined} className="input-control" value={formValue.employment_status} onChange={(event) => updateField("employment_status", event.target.value)}>
                  {options.employment_statuses.map((option) => (
                    <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                </select>
                <FieldError field="employment_status" message={fieldErrors.employment_status} />
              </label>
              <label className="form-field">
                <span className="muted">First name</span>
                <input name="first_name" aria-invalid={Boolean(fieldErrors.first_name)} aria-describedby={fieldErrors.first_name ? "employee-error-first_name" : undefined} className="input-control" required value={formValue.first_name} onChange={(event) => updateField("first_name", event.target.value)} />
                <FieldError field="first_name" message={fieldErrors.first_name} />
              </label>
              <label className="form-field">
                <span className="muted">Middle name</span>
                <input name="middle_name" aria-invalid={Boolean(fieldErrors.middle_name)} aria-describedby={fieldErrors.middle_name ? "employee-error-middle_name" : undefined} className="input-control" value={formValue.middle_name} onChange={(event) => updateField("middle_name", event.target.value)} />
                <FieldError field="middle_name" message={fieldErrors.middle_name} />
              </label>
              <label className="form-field">
                <span className="muted">Last name</span>
                <input name="last_name" aria-invalid={Boolean(fieldErrors.last_name)} aria-describedby={fieldErrors.last_name ? "employee-error-last_name" : undefined} className="input-control" value={formValue.last_name} onChange={(event) => updateField("last_name", event.target.value)} />
                <FieldError field="last_name" message={fieldErrors.last_name} />
              </label>
              <label className="form-field">
                <span className="muted">Preferred name</span>
                <input name="preferred_name" aria-invalid={Boolean(fieldErrors.preferred_name)} aria-describedby={fieldErrors.preferred_name ? "employee-error-preferred_name" : undefined} className="input-control" value={formValue.preferred_name} onChange={(event) => updateField("preferred_name", event.target.value)} />
                <FieldError field="preferred_name" message={fieldErrors.preferred_name} />
              </label>
            </div>
          </FormSection>
          ) : null}

          {activeStep === "contact" ? (
          <FormSection title="Contact and dates" description="Emails, phone, and milestones.">
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Work email</span>
                <input name="work_email" aria-invalid={Boolean(fieldErrors.work_email)} aria-describedby={fieldErrors.work_email ? "employee-error-work_email" : undefined} className="input-control" type="email" value={formValue.work_email} onChange={(event) => updateField("work_email", event.target.value)} />
                <FieldError field="work_email" message={fieldErrors.work_email} />
              </label>
              <label className="form-field">
                <span className="muted">Personal email</span>
                <input name="personal_email" aria-invalid={Boolean(fieldErrors.personal_email)} aria-describedby={fieldErrors.personal_email ? "employee-error-personal_email" : undefined} className="input-control" type="email" value={formValue.personal_email} onChange={(event) => updateField("personal_email", event.target.value)} />
                <FieldError field="personal_email" message={fieldErrors.personal_email} />
              </label>
              <label className="form-field">
                <span className="muted">Phone number</span>
                <input name="phone_number" aria-invalid={Boolean(fieldErrors.phone_number)} aria-describedby={fieldErrors.phone_number ? "employee-error-phone_number" : undefined} className="input-control" value={formValue.phone_number} onChange={(event) => updateField("phone_number", event.target.value)} />
                <FieldError field="phone_number" message={fieldErrors.phone_number} />
              </label>
              <label className="form-field">
                <span className="muted">Date of birth</span>
                <input name="date_of_birth" aria-invalid={Boolean(fieldErrors.date_of_birth)} aria-describedby={fieldErrors.date_of_birth ? "employee-error-date_of_birth" : undefined} className="input-control" type="date" value={formValue.date_of_birth ?? ""} onChange={(event) => updateField("date_of_birth", event.target.value || null)} />
                <FieldError field="date_of_birth" message={fieldErrors.date_of_birth} />
              </label>
              <label className="form-field">
                <span className="muted">Date of joining</span>
                <input name="date_of_joining" aria-invalid={Boolean(fieldErrors.date_of_joining)} aria-describedby={fieldErrors.date_of_joining ? "employee-error-date_of_joining" : undefined} className="input-control" type="date" value={formValue.date_of_joining ?? ""} onChange={(event) => updateField("date_of_joining", event.target.value || null)} />
                <FieldError field="date_of_joining" message={fieldErrors.date_of_joining} />
              </label>
              <label className="form-field">
                <span className="muted">Probation end date</span>
                <input name="probation_end_date" aria-invalid={Boolean(fieldErrors.probation_end_date)} aria-describedby={fieldErrors.probation_end_date ? "employee-error-probation_end_date" : undefined} className="input-control" type="date" value={formValue.probation_end_date ?? ""} onChange={(event) => updateField("probation_end_date", event.target.value || null)} />
                <FieldError field="probation_end_date" message={fieldErrors.probation_end_date} />
              </label>
              <label className="form-field form-field--full">
                <span className="muted">Confirmation date</span>
                <input name="confirmation_date" aria-invalid={Boolean(fieldErrors.confirmation_date)} aria-describedby={fieldErrors.confirmation_date ? "employee-error-confirmation_date" : undefined} className="input-control" type="date" value={formValue.confirmation_date ?? ""} onChange={(event) => updateField("confirmation_date", event.target.value || null)} />
                <FieldError field="confirmation_date" message={fieldErrors.confirmation_date} />
              </label>
            </div>
          </FormSection>
          ) : null}

          {activeStep === "structure" ? (
          <FormSection
            fullWidth
            title="Structural mapping"
            description="Org, approval, and payroll mapping."
          >
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Legal entity</span>
                <select name="legal_entity_id" aria-invalid={Boolean(fieldErrors.legal_entity_id)} aria-describedby={fieldErrors.legal_entity_id ? "employee-error-legal_entity_id" : undefined} className="input-control" value={formValue.legal_entity_id ?? ""} onChange={(event) => updateField("legal_entity_id", event.target.value || null)}>
                  {selectOptions(options.legal_entities)}
                </select>
                <FieldHint>Filters branch and cost center.</FieldHint>
                <FieldError field="legal_entity_id" message={fieldErrors.legal_entity_id} />
              </label>
              <label className="form-field">
                <span className="muted">Branch</span>
                <select name="branch_id" aria-invalid={Boolean(fieldErrors.branch_id)} aria-describedby={fieldErrors.branch_id ? "employee-error-branch_id" : undefined}
                  className="input-control"
                  disabled={Boolean(branchWarning)}
                  value={formValue.branch_id ?? ""}
                  onChange={(event) => updateField("branch_id", event.target.value || null)}
                >
                  {selectOptions(filteredBranches)}
                </select>
                <FieldHint tone={branchWarning ? "warning" : "default"}>
                  {branchWarning ?? "Can set location automatically."}
                </FieldHint>
                <FieldError field="branch_id" message={fieldErrors.branch_id} />
              </label>
              <label className="form-field">
                <span className="muted">Location</span>
                <select name="location_id" aria-invalid={Boolean(fieldErrors.location_id)} aria-describedby={fieldErrors.location_id ? "employee-error-location_id" : undefined} className="input-control" value={formValue.location_id ?? ""} onChange={(event) => updateField("location_id", event.target.value || null)}>
                  {selectOptions(filteredLocations)}
                </select>
                <FieldHint tone={branchLocationWarning ? "warning" : "default"}>
                  {branchLocationWarning ?? "Filtered by branch when mapped."}
                </FieldHint>
                <FieldError field="location_id" message={fieldErrors.location_id} />
              </label>
              <label className="form-field">
                <span className="muted">Business unit</span>
                <select name="business_unit_id" aria-invalid={Boolean(fieldErrors.business_unit_id)} aria-describedby={fieldErrors.business_unit_id ? "employee-error-business_unit_id" : undefined} className="input-control" value={formValue.business_unit_id ?? ""} onChange={(event) => updateField("business_unit_id", event.target.value || null)}>
                  {selectOptions(filteredBusinessUnits)}
                </select>
                <FieldHint tone={departmentBusinessUnitWarning ? "warning" : "default"}>
                  {departmentBusinessUnitWarning ?? "Can align from department."}
                </FieldHint>
                <FieldError field="business_unit_id" message={fieldErrors.business_unit_id} />
              </label>
              <label className="form-field">
                <span className="muted">Department</span>
                <select name="department_id" aria-invalid={Boolean(fieldErrors.department_id)} aria-describedby={fieldErrors.department_id ? "employee-error-department_id" : undefined}
                  className="input-control"
                  disabled={Boolean(departmentWarning)}
                  value={formValue.department_id ?? ""}
                  onChange={(event) => updateField("department_id", event.target.value || null)}
                >
                  {selectOptions(filteredDepartments)}
                </select>
                <FieldHint tone={departmentWarning ? "warning" : "default"}>
                  {departmentWarning ?? "Filtered by business unit."}
                </FieldHint>
                <FieldError field="department_id" message={fieldErrors.department_id} />
              </label>
              <label className="form-field">
                <span className="muted">Cost center</span>
                <select name="cost_center_id" aria-invalid={Boolean(fieldErrors.cost_center_id)} aria-describedby={fieldErrors.cost_center_id ? "employee-error-cost_center_id" : undefined}
                  className="input-control"
                  disabled={Boolean(costCenterWarning)}
                  value={formValue.cost_center_id ?? ""}
                  onChange={(event) => updateField("cost_center_id", event.target.value || null)}
                >
                  {selectOptions(filteredCostCenters)}
                </select>
                <FieldHint tone={costCenterWarning ? "warning" : "default"}>
                  {costCenterWarning ?? "Filtered by legal entity."}
                </FieldHint>
                <FieldError field="cost_center_id" message={fieldErrors.cost_center_id} />
              </label>
              <label className="form-field">
                <span className="muted">Designation</span>
                <select name="designation_id" aria-invalid={Boolean(fieldErrors.designation_id)} aria-describedby={fieldErrors.designation_id ? "employee-error-designation_id" : undefined} className="input-control" value={formValue.designation_id ?? ""} onChange={(event) => updateField("designation_id", event.target.value || null)}>
                  {selectOptions(filteredDesignations)}
                </select>
                <FieldHint>Can align grade automatically.</FieldHint>
                <FieldError field="designation_id" message={fieldErrors.designation_id} />
              </label>
              <label className="form-field">
                <span className="muted">Grade</span>
                <select name="grade_id" aria-invalid={Boolean(fieldErrors.grade_id)} aria-describedby={fieldErrors.grade_id ? "employee-error-grade_id" : undefined} className="input-control" value={formValue.grade_id ?? ""} onChange={(event) => updateField("grade_id", event.target.value || null)}>
                  {selectOptions(filteredGrades)}
                </select>
                <FieldHint tone={gradeWarning ? "warning" : "default"}>
                  {gradeWarning ?? "Filtered by designation."}
                </FieldHint>
                <FieldError field="grade_id" message={fieldErrors.grade_id} />
              </label>
              <label className="form-field">
                <span className="muted">Employment type</span>
                <select name="employment_type_id" aria-invalid={Boolean(fieldErrors.employment_type_id)} aria-describedby={fieldErrors.employment_type_id ? "employee-error-employment_type_id" : undefined} className="input-control" value={formValue.employment_type_id ?? ""} onChange={(event) => updateField("employment_type_id", event.target.value || null)}>
                  {selectOptions(options.employment_types)}
                </select>
                <FieldError field="employment_type_id" message={fieldErrors.employment_type_id} />
              </label>
              <label className="form-field">
                <span className="muted">Reporting manager</span>
                <select name="reporting_manager_id" aria-invalid={Boolean(fieldErrors.reporting_manager_id)} aria-describedby={fieldErrors.reporting_manager_id ? "employee-error-reporting_manager_id" : undefined} className="input-control" value={formValue.reporting_manager_id ?? ""} onChange={(event) => updateField("reporting_manager_id", event.target.value || null)}>
                  <option value="">Select an option</option>
                  {options.managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} ({manager.employee_code})
                    </option>
                  ))}
                </select>
                <FieldError field="reporting_manager_id" message={fieldErrors.reporting_manager_id} />
              </label>
            </div>
          </FormSection>
          ) : null}

          {activeStep === "review" ? (
            <FormSection fullWidth title="Review" description="Confirm before saving.">
              <div className="employee-form-review-grid">
                <ReviewRow label="Employee code" value={formValue.employee_code} />
                <ReviewRow label="Status" value={formValue.employment_status} />
                <ReviewRow label="First name" value={formValue.first_name} />
                <ReviewRow label="Middle name" value={formValue.middle_name} />
                <ReviewRow label="Last name" value={formValue.last_name} />
                <ReviewRow label="Preferred name" value={formValue.preferred_name} />
                <ReviewRow label="Work email" value={formValue.work_email} />
                <ReviewRow label="Personal email" value={formValue.personal_email} />
                <ReviewRow label="Phone number" value={formValue.phone_number} />
                <ReviewRow label="Date of birth" value={formValue.date_of_birth} />
                <ReviewRow label="Date of joining" value={formValue.date_of_joining} />
                <ReviewRow label="Probation end date" value={formValue.probation_end_date} />
                <ReviewRow label="Confirmation date" value={formValue.confirmation_date} />
                <ReviewRow label="Legal entity" value={findOptionName(options.legal_entities, formValue.legal_entity_id)} />
                <ReviewRow label="Branch" value={findOptionName(options.branches, formValue.branch_id)} />
                <ReviewRow label="Location" value={findOptionName(options.locations, formValue.location_id)} />
                <ReviewRow label="Business unit" value={findOptionName(options.business_units, formValue.business_unit_id)} />
                <ReviewRow label="Department" value={findOptionName(options.departments, formValue.department_id)} />
                <ReviewRow label="Cost center" value={findOptionName(options.cost_centers, formValue.cost_center_id)} />
                <ReviewRow label="Designation" value={findOptionName(options.designations, formValue.designation_id)} />
                <ReviewRow label="Grade" value={findOptionName(options.grades, formValue.grade_id)} />
                <ReviewRow label="Employment type" value={findOptionName(options.employment_types, formValue.employment_type_id)} />
                <ReviewRow
                  label="Reporting manager"
                  value={formValue.reporting_manager_id ? options.managers.find((manager) => manager.id === formValue.reporting_manager_id)?.name : "Not set"}
                />
              </div>
            </FormSection>
          ) : null}
        </div>

        </fieldset>

        {error ? (
          <div ref={feedbackRef} tabIndex={-1} className="notice notice--error" role="alert">
            <strong>Save needs attention.</strong>
            <span className="muted">{error}</span>
          </div>
        ) : null}

        <WorkspaceFormFooter
          className="form-actions-bar"
          fixed
          note={`Step ${employeeFormSteps.findIndex((step) => step.id === activeStep) + 1} of ${employeeFormSteps.length}`}
        >
          <button
            className="button button--secondary"
            disabled={!ready || isSubmitting}
            onClick={cancel}
            type="button"
          >
            Cancel
          </button>
          {activeStep !== "identity" ? (
            <button
              className="button button--secondary"
              disabled={!ready || isSubmitting}
              onClick={(event) => {
                event.preventDefault();
                goToPreviousStep();
              }}
              type="button"
            >
              Back
            </button>
          ) : null}
          {activeStep !== "review" ? (
            <button
              className="button button--primary"
              disabled={!ready || isSubmitting}
              onClick={(event) => {
                event.preventDefault();
                goToNextStep();
              }}
              type="button"
            >
              Continue
            </button>
          ) : (
            <AsyncActionButton
              className="button button--primary"
              disabled={!ready || isSubmitting}
              pending={isSubmitting}
              pendingLabel={mode === "create" ? "Creating employee" : "Saving changes"}
              type="submit"
            >
              {mode === "create" ? "Create employee" : "Save changes"}
            </AsyncActionButton>
          )}
        </WorkspaceFormFooter>
      </section>
    </form>
  );
}
