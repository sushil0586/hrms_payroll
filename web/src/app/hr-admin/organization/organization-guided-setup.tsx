"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AsyncActionButton } from "@/components/patterns/async-action-button";
import type { HrAdminOrganizationItem, HrAdminOrganizationSnapshot, HrAdminOrganizationWriteInput } from "@/lib/types";
import type { OrganizationWorkflowState } from "./organization-workflows";

type GuidedSetupProps = {
  snapshot: HrAdminOrganizationSnapshot;
};

type SetupField =
  | "legalEntityCode"
  | "legalEntityName"
  | "registeredName"
  | "primaryEmail"
  | "primaryPhone"
  | "locationCode"
  | "locationName"
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "state"
  | "postalCode"
  | "branchCode"
  | "branchName"
  | "branchType"
  | "businessUnitCode"
  | "businessUnitName"
  | "departmentCode"
  | "departmentName"
  | "employmentTypeCode"
  | "employmentTypeName"
  | "employmentTypeDescription";

type SetupFormValue = Record<SetupField, string> & {
  countryCode: string;
  timezone: string;
  isPayrollEligible: boolean;
};

type StepStatus = {
  label: string;
  status: "ready" | "running" | "created" | "skipped" | "failed";
  message: string;
};

const initialFormValue: SetupFormValue = {
  legalEntityCode: "",
  legalEntityName: "",
  registeredName: "",
  primaryEmail: "",
  primaryPhone: "",
  locationCode: "",
  locationName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  branchCode: "",
  branchName: "",
  branchType: "",
  businessUnitCode: "",
  businessUnitName: "",
  departmentCode: "",
  departmentName: "",
  employmentTypeCode: "",
  employmentTypeName: "",
  employmentTypeDescription: "",
  countryCode: "IN",
  timezone: "Asia/Kolkata",
  isPayrollEligible: true,
};

const requiredFields: Array<{ key: keyof SetupFormValue; label: string }> = [
  { key: "legalEntityCode", label: "Legal entity code" },
  { key: "legalEntityName", label: "Legal entity name" },
  { key: "locationCode", label: "Location code" },
  { key: "locationName", label: "Location name" },
  { key: "branchCode", label: "Branch code" },
  { key: "branchName", label: "Branch name" },
  { key: "businessUnitCode", label: "Business unit code" },
  { key: "businessUnitName", label: "Business unit name" },
  { key: "departmentCode", label: "Department code" },
  { key: "departmentName", label: "Department name" },
  { key: "employmentTypeCode", label: "Employment type code" },
  { key: "employmentTypeName", label: "Employment type name" },
];

function normalizeCode(value: string) {
  return value.trim().toLowerCase();
}

function findByCode(items: HrAdminOrganizationItem[], code: string) {
  const normalizedCode = normalizeCode(code);
  return items.find((item) => normalizeCode(item.code) === normalizedCode) ?? null;
}

async function createMaster(section: string, payload: HrAdminOrganizationWriteInput) {
  const response = await fetch(`/api/hr-admin/organization/${section}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body.detail === "string" ? body.detail : typeof body.code === "string" ? body.code : "Create failed.";
    throw new Error(response.status >= 500 ? "Step outcome could not be confirmed. Check the catalog before retrying; earlier confirmed steps are retained." : message);
  }
  if (typeof body?.id !== "string" || !body.id || body.code !== payload.code || typeof body.name !== "string") throw new Error("Step outcome could not be confirmed. Check the catalog before retrying.");
  return body as HrAdminOrganizationItem;
}

function fieldValue(value: string) {
  return value.trim();
}

function readinessCount(snapshot: HrAdminOrganizationSnapshot) {
  const checks = [
    snapshot.legal_entities.some((item) => item.is_active),
    snapshot.locations.some((item) => item.is_active),
    snapshot.branches.some((item) => item.is_active),
    snapshot.departments.some((item) => item.is_active),
    snapshot.employment_types.some((item) => item.is_active),
  ];
  return checks.filter(Boolean).length;
}

export function OrganizationGuidedSetup({ snapshot, onStateChange }: GuidedSetupProps & {onStateChange?: (state:OrganizationWorkflowState)=>void}) {
  const [formValue, setFormValue] = useState<SetupFormValue>(initialFormValue);
  const [steps, setSteps] = useState<StepStatus[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [savedKey,setSavedKey] = useState(()=>JSON.stringify(initialFormValue));
  const pending = useRef(false);const confirmed = useRef<Record<string,HrAdminOrganizationItem>>({});
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(()=>{onStateChange?.({dirty:JSON.stringify(formValue)!==savedKey,busy:isSubmitting});},[formValue,savedKey,isSubmitting,onStateChange]);
  useEffect(()=>{if(error||notice)feedback.current?.focus();},[error,notice]);
  const missingRequired = useMemo(
    () => requiredFields.filter((field) => !String(formValue[field.key]).trim()).map((field) => field.label),
    [formValue],
  );
  const completedCount = readinessCount(snapshot);
  const isLaunchStructureReady = completedCount === 5;

  function updateField<Key extends keyof SetupFormValue>(key: Key, value: SetupFormValue[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
    setError("");
    setNotice("");
  }

  function setStep(label: string, status: StepStatus["status"], message: string) {
    setSteps((current) => {
      const existing = current.find((item) => item.label === label);
      if (existing) {
        return current.map((item) => (item.label === label ? { label, status, message } : item));
      }
      return [...current, { label, status, message }];
    });
  }

  async function createOrReuse(
    label: string,
    section: string,
    existingItems: HrAdminOrganizationItem[],
    code: string,
    payload: HrAdminOrganizationWriteInput,
  ) {
    const key = `${section}:${normalizeCode(code)}`;
    const existing = confirmed.current[key] ?? findByCode(existingItems, code);
    if (existing) {
      setStep(label, "skipped", "Already exists.");
      return existing;
    }
    setStep(label, "running", "Creating...");
    let created: HrAdminOrganizationItem;
    try { created = await createMaster(section, payload); } catch (error) { throw new Error(error instanceof TypeError ? "Step outcome could not be confirmed. Check the catalog before retrying; earlier confirmed steps are retained." : error instanceof Error ? error.message : "Step outcome could not be confirmed."); }
    confirmed.current[key] = created;
    setStep(label, "created", "Created.");
    return created;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    if (missingRequired.length) {
      setError(`Complete required fields: ${missingRequired.join(", ")}.`);
      return;
    }

    pending.current=true;
    setIsSubmitting(true);
    setError("");
    setNotice("");
    setSteps([]);

    try {
      const legalEntity = await createOrReuse("Legal entity", "legal_entities", snapshot.legal_entities, formValue.legalEntityCode, {
        code: fieldValue(formValue.legalEntityCode),
        name: fieldValue(formValue.legalEntityName),
        registered_name: fieldValue(formValue.registeredName),
        country_code: fieldValue(formValue.countryCode),
        timezone: fieldValue(formValue.timezone),
        primary_email: fieldValue(formValue.primaryEmail),
        primary_phone: fieldValue(formValue.primaryPhone),
        is_active: true,
      });
      const location = await createOrReuse("Location", "locations", snapshot.locations, formValue.locationCode, {
        code: fieldValue(formValue.locationCode),
        name: fieldValue(formValue.locationName),
        address_line_1: fieldValue(formValue.addressLine1),
        address_line_2: fieldValue(formValue.addressLine2),
        city: fieldValue(formValue.city),
        state: fieldValue(formValue.state),
        postal_code: fieldValue(formValue.postalCode),
        country_code: fieldValue(formValue.countryCode),
        is_active: true,
      });
      await createOrReuse("Branch", "branches", snapshot.branches, formValue.branchCode, {
        code: fieldValue(formValue.branchCode),
        name: fieldValue(formValue.branchName),
        legal_entity_id: legalEntity.id,
        location_id: location.id,
        branch_type: fieldValue(formValue.branchType),
        is_active: true,
      });
      const businessUnit = await createOrReuse("Business unit", "business_units", snapshot.business_units, formValue.businessUnitCode, {
        code: fieldValue(formValue.businessUnitCode),
        name: fieldValue(formValue.businessUnitName),
        is_active: true,
      });
      await createOrReuse("Department", "departments", snapshot.departments, formValue.departmentCode, {
        code: fieldValue(formValue.departmentCode),
        name: fieldValue(formValue.departmentName),
        business_unit_id: businessUnit.id,
        is_active: true,
      });
      await createOrReuse("Employment type", "employment_types", snapshot.employment_types, formValue.employmentTypeCode, {
        code: fieldValue(formValue.employmentTypeCode),
        name: fieldValue(formValue.employmentTypeName),
        description: fieldValue(formValue.employmentTypeDescription),
        is_payroll_eligible: formValue.isPayrollEligible,
        is_active: true,
      });

      setNotice("Setup steps confirmed. Review created and reused records; reload the catalog for current counts.");
      setSavedKey(JSON.stringify(formValue));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to complete organization setup.");
      setSteps((current) =>
        current.map((step) => (step.status === "running" ? { ...step, status: "failed", message: "Failed." } : step)),
      );
    } finally {
      pending.current=false;
      setIsSubmitting(false);
    }
  }

  return (
    <section className="section">
      <details className="organization-workflow-disclosure panel-card-soft" data-testid="organization-guided-setup-disclosure">
        <summary>
          <span>
            <strong>Guided setup</strong>
            <small>Create the minimum active structure needed to clear the organization launch gate.</small>
          </span>
          <span className="queue-summary-chip">
            <strong>{completedCount}/5</strong> ready
          </span>
          <span className="button button--secondary button--compact">Open setup</span>
        </summary>
      <form aria-busy={isSubmitting} className="organization-guided-setup" onSubmit={handleSubmit}><fieldset className="organization-fields" disabled={isSubmitting}>
        <div className="tenant-console-panel__header">
          <div>
            <span className="workspace-card__eyebrow">Guided setup</span>
            <h2>Complete launch-required organization masters</h2>
            <p className="section-copy">Create the minimum active structure needed to clear the organization launch gate.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className={`queue-summary-chip${isLaunchStructureReady ? " queue-summary-chip--success" : ""}`}>
              <strong>{completedCount}/5</strong> launch masters ready
            </span>
          </div>
        </div>

        <div className="organization-guided-setup__grid">
          <fieldset className="form-section organization-guided-setup__fieldset">
            <legend>Legal entity</legend>
            <div className="form-grid">
              <label className="form-field">
                <span className="text-label-premium">Code</span>
                <input className="input-control" required id="setup-legalEntityCode" value={formValue.legalEntityCode} onChange={(event) => updateField("legalEntityCode", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">Name</span>
                <input className="input-control" required id="setup-legalEntityName" value={formValue.legalEntityName} onChange={(event) => updateField("legalEntityName", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">Registered name</span>
                <input className="input-control" id="setup-registeredName" value={formValue.registeredName} onChange={(event) => updateField("registeredName", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">Primary email</span>
                <input className="input-control" type="email" id="setup-primaryEmail" value={formValue.primaryEmail} onChange={(event) => updateField("primaryEmail", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">Primary phone</span>
                <input className="input-control" id="setup-primaryPhone" value={formValue.primaryPhone} onChange={(event) => updateField("primaryPhone", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">Timezone</span>
                <input className="input-control" id="setup-timezone" value={formValue.timezone} onChange={(event) => updateField("timezone", event.target.value)} />
              </label>
            </div>
          </fieldset>

          <fieldset className="form-section organization-guided-setup__fieldset">
            <legend>Location and branch</legend>
            <div className="form-grid">
              <label className="form-field">
                <span className="text-label-premium">Location code</span>
                <input className="input-control" required id="setup-locationCode" value={formValue.locationCode} onChange={(event) => updateField("locationCode", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">Location name</span>
                <input className="input-control" required id="setup-locationName" value={formValue.locationName} onChange={(event) => updateField("locationName", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">Address line 1</span>
                <input className="input-control" id="setup-addressLine1" value={formValue.addressLine1} onChange={(event) => updateField("addressLine1", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">City</span>
                <input className="input-control" id="setup-city" value={formValue.city} onChange={(event) => updateField("city", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">State</span>
                <input className="input-control" id="setup-state" value={formValue.state} onChange={(event) => updateField("state", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">PIN code</span>
                <input className="input-control" id="setup-postalCode" value={formValue.postalCode} onChange={(event) => updateField("postalCode", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">Branch code</span>
                <input className="input-control" required id="setup-branchCode" value={formValue.branchCode} onChange={(event) => updateField("branchCode", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">Branch name</span>
                <input className="input-control" required id="setup-branchName" value={formValue.branchName} onChange={(event) => updateField("branchName", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">Branch type</span>
                <input className="input-control" id="setup-branchType" value={formValue.branchType} onChange={(event) => updateField("branchType", event.target.value)} />
              </label>
            </div>
          </fieldset>

          <fieldset className="form-section organization-guided-setup__fieldset">
            <legend>Department and employment</legend>
            <div className="form-grid">
              <label className="form-field">
                <span className="text-label-premium">Business unit code</span>
                <input className="input-control" required id="setup-businessUnitCode" value={formValue.businessUnitCode} onChange={(event) => updateField("businessUnitCode", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">Business unit name</span>
                <input className="input-control" required id="setup-businessUnitName" value={formValue.businessUnitName} onChange={(event) => updateField("businessUnitName", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">Department code</span>
                <input className="input-control" required id="setup-departmentCode" value={formValue.departmentCode} onChange={(event) => updateField("departmentCode", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">Department name</span>
                <input className="input-control" required id="setup-departmentName" value={formValue.departmentName} onChange={(event) => updateField("departmentName", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">Employment type code</span>
                <input className="input-control" required id="setup-employmentTypeCode" value={formValue.employmentTypeCode} onChange={(event) => updateField("employmentTypeCode", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="text-label-premium">Employment type name</span>
                <input className="input-control" required id="setup-employmentTypeName" value={formValue.employmentTypeName} onChange={(event) => updateField("employmentTypeName", event.target.value)} />
              </label>
              <label className="toggle-field organization-guided-setup__toggle">
                <div>
                  <strong>Payroll eligible</strong>
                  <p className="section-copy">Use this employment type for payroll-ready employees.</p>
                </div>
                <input checked={formValue.isPayrollEligible} onChange={(event) => updateField("isPayrollEligible", event.target.checked)} type="checkbox" />
              </label>
            </div>
          </fieldset>
        </div>

        {steps.length ? (
          <div aria-live="polite" className="organization-guided-setup__steps" role="status">
            {steps.map((step) => (
              <div className="detail-row" key={step.label}>
                <span>{step.label}</span>
                <strong>{step.status === "running" ? "Creating" : step.message}</strong>
              </div>
            ))}
          </div>
        ) : null}
        {error ? (
          <div ref={feedback} tabIndex={-1} className="notice notice--error" role="alert">
            <strong>Setup could not be completed.</strong>
            <span className="muted">{error}</span>
          </div>
        ) : null}
        {notice ? (
          <div ref={feedback} tabIndex={-1} className="notice" role="status">
            <strong>{notice}</strong><a data-navigation-mode="document" href="/hr-admin/organization">Reload catalog</a>
          </div>
        ) : null}

        <div className="form-actions-bar">
          <span className="muted">Steps run sequentially. Confirmed earlier steps are retained if a later step fails.</span>
          <div className="form-actions-bar__buttons">
            <AsyncActionButton
              className="button button--primary"
              disabled={missingRequired.length > 0}
              pending={isSubmitting}
              pendingLabel="Saving organization setup"
              type="submit"
            >
              Save organization setup
            </AsyncActionButton>
          </div>
        </div>
      </fieldset></form>
      </details>
    </section>
  );
}
