"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  HrAdminEmployeeStatutoryDeclaration,
  HrAdminEmployeeStatutoryDeclarationItem,
  HrAdminEmployeeStatutoryProfile,
  HrAdminPayrollStatutoryComponent,
  HrAdminPayrollStatutoryEmployerRegistration,
  HrAdminPayrollStatutoryFilingCalendar,
  HrAdminPayrollStatutoryPack,
  HrAdminPayrollStatutorySetupResponse,
  HrAdminPayrollStatutorySlab,
} from "@/lib/types";

type Family = "pack" | "component" | "slab" | "registration" | "filing" | "profile" | "declaration" | "item";
type ApiItem =
  | HrAdminPayrollStatutoryPack
  | HrAdminPayrollStatutoryComponent
  | HrAdminPayrollStatutorySlab
  | HrAdminPayrollStatutoryEmployerRegistration
  | HrAdminPayrollStatutoryFilingCalendar
  | HrAdminEmployeeStatutoryProfile
  | HrAdminEmployeeStatutoryDeclaration
  | HrAdminEmployeeStatutoryDeclarationItem;

type Feedback = { tone: "success" | "error"; message: string } | null;

type PackForm = {
  id?: string;
  code: string;
  name: string;
  country_code: string;
  jurisdiction_ref: string;
  status: string;
  effective_from: string;
  effective_to: string;
  currency_code: string;
  statutory_profile_ref: string;
  validation_profile_ref: string;
  config_profile_ref: string;
};

type ComponentForm = {
  id?: string;
  statutory_pack_id: string;
  salary_component_id: string;
  code: string;
  name: string;
  statutory_type: string;
  contribution_owner: string;
  calculation_method: string;
  wage_base_ref: string;
  statutory_treatment_ref: string;
  registration_ref: string;
  applicability_profile_ref: string;
  rounding_rule_ref: string;
  formula_ref: string;
  status: string;
  config_profile_ref: string;
};

type SlabForm = {
  id?: string;
  statutory_component_id: string;
  code: string;
  name: string;
  slab_order: string;
  effective_from: string;
  effective_to: string;
  min_amount: string;
  max_amount: string;
  employee_rate_percent: string;
  employer_rate_percent: string;
  fixed_employee_amount: string;
  fixed_employer_amount: string;
  wage_ceiling_amount: string;
  state_code: string;
  applicability_profile_ref: string;
  status: string;
  config_profile_ref: string;
};

type RegistrationForm = {
  id?: string;
  statutory_pack_id: string;
  statutory_component_id: string;
  legal_entity_id: string;
  branch_id: string;
  location_id: string;
  code: string;
  name: string;
  registration_type_ref: string;
  registration_number: string;
  employer_identifier: string;
  jurisdiction_ref: string;
  filing_authority_ref: string;
  provider_ref: string;
  status: string;
  effective_from: string;
  effective_to: string;
  source_ref: string;
  config_profile_ref: string;
};

type FilingForm = {
  id?: string;
  statutory_pack_id: string;
  statutory_component_id: string;
  employer_registration_id: string;
  code: string;
  name: string;
  filing_type_ref: string;
  filing_frequency: string;
  period_start: string;
  period_end: string;
  due_date: string;
  grace_due_date: string;
  filing_window_start: string;
  filing_window_end: string;
  status: string;
  filing_authority_ref: string;
  provider_ref: string;
  output_profile_ref: string;
  source_ref: string;
  config_profile_ref: string;
};

type ProfileForm = {
  id?: string;
  employee_id: string;
  statutory_pack_id: string;
  profile_ref: string;
  effective_from: string;
  effective_to: string;
  status: string;
  pan_number: string;
  uan_number: string;
  pf_number: string;
  esi_number: string;
  pf_applicable: boolean;
  esi_applicable: boolean;
  professional_tax_state: string;
  lwf_state: string;
  tax_regime: string;
  declaration_status: string;
  previous_employment_income: string;
  previous_employment_tax_deducted: string;
  source_ref: string;
  config_profile_ref: string;
};

type DeclarationForm = {
  id?: string;
  employee_id: string;
  employee_statutory_profile_id: string;
  statutory_pack_id: string;
  financial_year_code: string;
  declaration_profile_ref: string;
  proof_window_ref: string;
  status: string;
  tax_regime: string;
  declared_total_amount: string;
  verified_total_amount: string;
  rejection_reason: string;
  source_ref: string;
  config_profile_ref: string;
};

type ItemForm = {
  id?: string;
  declaration_id: string;
  item_kind: string;
  section_code: string;
  component_code: string;
  name: string;
  declared_amount: string;
  verified_amount: string;
  proof_status: string;
  proof_document_ref: string;
  proof_artifact_key: string;
  source_ref: string;
  config_profile_ref: string;
  rejection_reason: string;
};

const familyLabels: Record<Family, string> = {
  pack: "statutory pack",
  component: "statutory component",
  slab: "statutory slab",
  registration: "employer registration",
  filing: "filing calendar",
  profile: "employee statutory profile",
  declaration: "statutory declaration",
  item: "declaration item",
};

function getConfigProfileRef(snapshot: Record<string, unknown>) {
  return typeof snapshot.profile_ref === "string" ? snapshot.profile_ref : "";
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) {
      return `${key}: ${String(value[0])}`;
    }
    if (typeof value === "string" && key !== "detail") {
      return `${key}: ${value}`;
    }
  }

  return String((payload as Record<string, unknown>).detail || fallback);
}

function makeSnapshot(profileRef: string) {
  return profileRef.trim() ? { profile_ref: profileRef.trim() } : {};
}

function nullable(value: string) {
  return value.trim() ? value.trim() : null;
}

function decimal(value: string, fallback = "0") {
  return value.trim() || fallback;
}

function options(items: { id: string; name: string }[], emptyLabel?: string) {
  const mapped = items.map((item) => ({ value: item.id, label: item.name }));
  return emptyLabel ? [{ value: "", label: emptyLabel }, ...mapped] : mapped;
}

function replaceOrAppend<Item extends { id: string }>(items: Item[], next: Item) {
  return items.some((item) => item.id === next.id)
    ? items.map((item) => (item.id === next.id ? next : item))
    : [next, ...items];
}

function enumOptions(items: { value: string; label: string }[]) {
  return items.map((item) => ({ value: item.value, label: item.label }));
}

function emptyPack(setup: HrAdminPayrollStatutorySetupResponse): PackForm {
  return {
    code: "",
    name: "",
    country_code: "IN",
    jurisdiction_ref: "country:IN",
    status: setup.options.config_statuses[0]?.value ?? "draft",
    effective_from: "2026-04-01",
    effective_to: "2027-03-31",
    currency_code: "INR",
    statutory_profile_ref: "payroll.statutory.india.browser.v1",
    validation_profile_ref: "payroll.statutory.validation.browser.v1",
    config_profile_ref: "",
  };
}

function emptyComponent(setup: HrAdminPayrollStatutorySetupResponse): ComponentForm {
  return {
    statutory_pack_id: setup.packs[0]?.id ?? "",
    salary_component_id: "",
    code: "",
    name: "",
    statutory_type: setup.options.statutory_component_types[0]?.value ?? "provident_fund",
    contribution_owner: setup.options.contribution_owners[0]?.value ?? "employee",
    calculation_method: "slab",
    wage_base_ref: "payroll.wage_base.browser.v1",
    statutory_treatment_ref: "payroll.statutory.treatment.browser.v1",
    registration_ref: "",
    applicability_profile_ref: "",
    rounding_rule_ref: "",
    formula_ref: "",
    status: setup.options.config_statuses[0]?.value ?? "draft",
    config_profile_ref: "",
  };
}

function emptySlab(setup: HrAdminPayrollStatutorySetupResponse): SlabForm {
  return {
    statutory_component_id: setup.statutory_components[0]?.id ?? "",
    code: "",
    name: "",
    slab_order: "10",
    effective_from: "2026-04-01",
    effective_to: "2027-03-31",
    min_amount: "0",
    max_amount: "15000",
    employee_rate_percent: "12",
    employer_rate_percent: "12",
    fixed_employee_amount: "0",
    fixed_employer_amount: "0",
    wage_ceiling_amount: "15000",
    state_code: "KA",
    applicability_profile_ref: "payroll.statutory.slab.browser.v1",
    status: setup.options.config_statuses[0]?.value ?? "draft",
    config_profile_ref: "",
  };
}

function emptyRegistration(setup: HrAdminPayrollStatutorySetupResponse): RegistrationForm {
  return {
    statutory_pack_id: setup.packs[0]?.id ?? "",
    statutory_component_id: "",
    legal_entity_id: "",
    branch_id: "",
    location_id: "",
    code: "",
    name: "",
    registration_type_ref: "pf.establishment",
    registration_number: "",
    employer_identifier: "",
    jurisdiction_ref: "country:IN",
    filing_authority_ref: "epfo",
    provider_ref: "payroll.provider.browser",
    status: setup.options.config_statuses[0]?.value ?? "draft",
    effective_from: "2026-04-01",
    effective_to: "2027-03-31",
    source_ref: "browser-statutory-registration",
    config_profile_ref: "",
  };
}

function emptyFiling(setup: HrAdminPayrollStatutorySetupResponse): FilingForm {
  return {
    statutory_pack_id: setup.packs[0]?.id ?? "",
    statutory_component_id: "",
    employer_registration_id: "",
    code: "",
    name: "",
    filing_type_ref: "pf.ecr",
    filing_frequency: "monthly",
    period_start: "2026-06-01",
    period_end: "2026-06-30",
    due_date: "2026-07-15",
    grace_due_date: "2026-07-20",
    filing_window_start: "2026-07-01",
    filing_window_end: "2026-07-15",
    status: setup.options.statutory_filing_statuses[0]?.value ?? "upcoming",
    filing_authority_ref: "epfo",
    provider_ref: "payroll.provider.browser",
    output_profile_ref: "payroll.output.browser.statutory.v1",
    source_ref: "browser-statutory-filing",
    config_profile_ref: "",
  };
}

function emptyProfile(setup: HrAdminPayrollStatutorySetupResponse): ProfileForm {
  return {
    employee_id: setup.options.employees[0]?.id ?? "",
    statutory_pack_id: setup.packs[0]?.id ?? "",
    profile_ref: "payroll.employee.statutory.browser.v1",
    effective_from: "2026-04-01",
    effective_to: "2027-03-31",
    status: setup.options.config_statuses[0]?.value ?? "draft",
    pan_number: "",
    uan_number: "",
    pf_number: "",
    esi_number: "",
    pf_applicable: false,
    esi_applicable: false,
    professional_tax_state: "KA",
    lwf_state: "KA",
    tax_regime: setup.options.tax_regimes[0]?.value ?? "not_declared",
    declaration_status: setup.options.declaration_statuses[0]?.value ?? "not_started",
    previous_employment_income: "0",
    previous_employment_tax_deducted: "0",
    source_ref: "browser-statutory-profile",
    config_profile_ref: "",
  };
}

function emptyDeclaration(setup: HrAdminPayrollStatutorySetupResponse): DeclarationForm {
  const profile = setup.employee_profiles[0];
  return {
    employee_id: profile?.employee_id ?? setup.options.employees[0]?.id ?? "",
    employee_statutory_profile_id: profile?.id ?? "",
    statutory_pack_id: profile?.statutory_pack_id ?? setup.packs[0]?.id ?? "",
    financial_year_code: "FY2026-27",
    declaration_profile_ref: "payroll.statutory.declaration.browser.v1",
    proof_window_ref: "payroll.proof.browser.window.v1",
    status: "draft",
    tax_regime: setup.options.tax_regimes[0]?.value ?? "not_declared",
    declared_total_amount: "0",
    verified_total_amount: "0",
    rejection_reason: "",
    source_ref: "browser-statutory-declaration",
    config_profile_ref: "",
  };
}

function emptyItem(setup: HrAdminPayrollStatutorySetupResponse): ItemForm {
  return {
    declaration_id: setup.declarations[0]?.id ?? "",
    item_kind: setup.options.statutory_declaration_item_kinds[0]?.value ?? "investment",
    section_code: "",
    component_code: "",
    name: "",
    declared_amount: "10000",
    verified_amount: "0",
    proof_status: "pending",
    proof_document_ref: "",
    proof_artifact_key: "",
    source_ref: "browser-statutory-proof",
    config_profile_ref: "",
    rejection_reason: "",
  };
}

function packToForm(item: HrAdminPayrollStatutoryPack): PackForm {
  return { ...item, effective_to: item.effective_to ?? "", config_profile_ref: getConfigProfileRef(item.config_snapshot) };
}

function componentToForm(item: HrAdminPayrollStatutoryComponent): ComponentForm {
  return {
    id: item.id,
    statutory_pack_id: item.statutory_pack_id,
    salary_component_id: item.salary_component_id ?? "",
    code: item.code,
    name: item.name,
    statutory_type: item.statutory_type,
    contribution_owner: item.contribution_owner,
    calculation_method: item.calculation_method,
    wage_base_ref: item.wage_base_ref,
    statutory_treatment_ref: item.statutory_treatment_ref,
    registration_ref: item.registration_ref,
    applicability_profile_ref: item.applicability_profile_ref,
    rounding_rule_ref: item.rounding_rule_ref,
    formula_ref: item.formula_ref,
    status: item.status,
    config_profile_ref: getConfigProfileRef(item.config_snapshot),
  };
}

function slabToForm(item: HrAdminPayrollStatutorySlab): SlabForm {
  return {
    id: item.id,
    statutory_component_id: item.statutory_component_id,
    code: item.code,
    name: item.name,
    slab_order: String(item.slab_order),
    effective_from: item.effective_from,
    effective_to: item.effective_to ?? "",
    min_amount: item.min_amount,
    max_amount: item.max_amount ?? "",
    employee_rate_percent: item.employee_rate_percent,
    employer_rate_percent: item.employer_rate_percent,
    fixed_employee_amount: item.fixed_employee_amount,
    fixed_employer_amount: item.fixed_employer_amount,
    wage_ceiling_amount: item.wage_ceiling_amount ?? "",
    state_code: item.state_code,
    applicability_profile_ref: item.applicability_profile_ref,
    status: item.status,
    config_profile_ref: getConfigProfileRef(item.config_snapshot),
  };
}

function registrationToForm(item: HrAdminPayrollStatutoryEmployerRegistration): RegistrationForm {
  return {
    id: item.id,
    statutory_pack_id: item.statutory_pack_id,
    statutory_component_id: item.statutory_component_id ?? "",
    legal_entity_id: item.legal_entity_id ?? "",
    branch_id: item.branch_id ?? "",
    location_id: item.location_id ?? "",
    code: item.code,
    name: item.name,
    registration_type_ref: item.registration_type_ref,
    registration_number: item.registration_number,
    employer_identifier: item.employer_identifier,
    jurisdiction_ref: item.jurisdiction_ref,
    filing_authority_ref: item.filing_authority_ref,
    provider_ref: item.provider_ref,
    status: item.status,
    effective_from: item.effective_from,
    effective_to: item.effective_to ?? "",
    source_ref: item.source_ref,
    config_profile_ref: getConfigProfileRef(item.config_snapshot),
  };
}

function filingToForm(item: HrAdminPayrollStatutoryFilingCalendar): FilingForm {
  return {
    id: item.id,
    statutory_pack_id: item.statutory_pack_id,
    statutory_component_id: item.statutory_component_id ?? "",
    employer_registration_id: item.employer_registration_id ?? "",
    code: item.code,
    name: item.name,
    filing_type_ref: item.filing_type_ref,
    filing_frequency: item.filing_frequency,
    period_start: item.period_start,
    period_end: item.period_end,
    due_date: item.due_date,
    grace_due_date: item.grace_due_date ?? "",
    filing_window_start: item.filing_window_start ?? "",
    filing_window_end: item.filing_window_end ?? "",
    status: item.status,
    filing_authority_ref: item.filing_authority_ref,
    provider_ref: item.provider_ref,
    output_profile_ref: item.output_profile_ref,
    source_ref: item.source_ref,
    config_profile_ref: getConfigProfileRef(item.config_snapshot),
  };
}

function profileToForm(item: HrAdminEmployeeStatutoryProfile): ProfileForm {
  return {
    id: item.id,
    employee_id: item.employee_id,
    statutory_pack_id: item.statutory_pack_id ?? "",
    profile_ref: item.profile_ref,
    effective_from: item.effective_from,
    effective_to: item.effective_to ?? "",
    status: item.status,
    pan_number: item.pan_number,
    uan_number: item.uan_number,
    pf_number: item.pf_number,
    esi_number: item.esi_number,
    pf_applicable: item.pf_applicable,
    esi_applicable: item.esi_applicable,
    professional_tax_state: item.professional_tax_state,
    lwf_state: item.lwf_state,
    tax_regime: item.tax_regime,
    declaration_status: item.declaration_status,
    previous_employment_income: item.previous_employment_income,
    previous_employment_tax_deducted: item.previous_employment_tax_deducted,
    source_ref: item.source_ref,
    config_profile_ref: getConfigProfileRef(item.config_snapshot),
  };
}

function declarationToForm(item: HrAdminEmployeeStatutoryDeclaration): DeclarationForm {
  return {
    id: item.id,
    employee_id: item.employee_id,
    employee_statutory_profile_id: item.employee_statutory_profile_id,
    statutory_pack_id: item.statutory_pack_id ?? "",
    financial_year_code: item.financial_year_code,
    declaration_profile_ref: item.declaration_profile_ref,
    proof_window_ref: item.proof_window_ref,
    status: item.status,
    tax_regime: item.tax_regime,
    declared_total_amount: item.declared_total_amount,
    verified_total_amount: item.verified_total_amount,
    rejection_reason: item.rejection_reason,
    source_ref: item.source_ref,
    config_profile_ref: getConfigProfileRef(item.config_snapshot),
  };
}

function itemToForm(item: HrAdminEmployeeStatutoryDeclarationItem): ItemForm {
  return {
    id: item.id,
    declaration_id: item.declaration_id,
    item_kind: item.item_kind,
    section_code: item.section_code,
    component_code: item.component_code,
    name: item.name,
    declared_amount: item.declared_amount,
    verified_amount: item.verified_amount,
    proof_status: item.proof_status,
    proof_document_ref: item.proof_document_ref,
    proof_artifact_key: item.proof_artifact_key,
    source_ref: item.source_ref,
    config_profile_ref: getConfigProfileRef(item.config_snapshot),
    rejection_reason: item.rejection_reason,
  };
}

function TextField({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return (
    <label className="form-field">
      <span className="muted">{label}</span>
      <input className="input-control" required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, onChange, options: selectOptions, required }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; required?: boolean }) {
  return (
    <label className="form-field">
      <span className="muted">{label}</span>
      <select className="input-control" required={required} value={value} onChange={(event) => onChange(event.target.value)}>
        {selectOptions.map((option) => (
          <option key={`${label}-${option.value || "empty"}`} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function BooleanField({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="toggle-field salary-crud-toggle">
      <div><strong>{label}</strong></div>
      <input checked={checked} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function FormHeader({ mode, title, onReset }: { mode: "create" | "edit"; title: string; onReset: () => void }) {
  return (
    <div className="salary-crud-form__header">
      <div>
        <span className="workspace-card__eyebrow">{mode === "edit" ? "Edit mode" : "Create mode"}</span>
        <h3>{title}</h3>
      </div>
      <button className="button button--secondary button--compact" type="button" onClick={onReset}>New</button>
    </div>
  );
}

function RecordList({ label, children }: { label: string; children: ReactNode }) {
  return <div className="salary-crud-list" aria-label={label}>{children}</div>;
}

export function PayrollStatutoryCrudConsole({ initialSetup }: { initialSetup: HrAdminPayrollStatutorySetupResponse }) {
  const router = useRouter();
  const [setup, setSetup] = useState(initialSetup);
  const [packForm, setPackForm] = useState<PackForm>(() => emptyPack(initialSetup));
  const [componentForm, setComponentForm] = useState<ComponentForm>(() => emptyComponent(initialSetup));
  const [slabForm, setSlabForm] = useState<SlabForm>(() => emptySlab(initialSetup));
  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>(() => emptyRegistration(initialSetup));
  const [filingForm, setFilingForm] = useState<FilingForm>(() => emptyFiling(initialSetup));
  const [profileForm, setProfileForm] = useState<ProfileForm>(() => emptyProfile(initialSetup));
  const [declarationForm, setDeclarationForm] = useState<DeclarationForm>(() => emptyDeclaration(initialSetup));
  const [itemForm, setItemForm] = useState<ItemForm>(() => emptyItem(initialSetup));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const packOptions = useMemo(() => setup.packs.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })), [setup.packs]);
  const componentOptions = useMemo(() => setup.statutory_components.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })), [setup.statutory_components]);
  const registrationOptions = useMemo(() => setup.employer_registrations.map((item) => ({ value: item.id, label: `${item.name} (${item.registration_number})` })), [setup.employer_registrations]);
  const employeeOptions = useMemo(() => setup.options.employees.map((item) => ({ value: item.id, label: `${item.name} (${item.employee_code})` })), [setup.options.employees]);
  const profileOptions = useMemo(() => setup.employee_profiles.map((item) => ({ value: item.id, label: `${item.employee_name} (${item.profile_ref})` })), [setup.employee_profiles]);
  const declarationOptions = useMemo(() => setup.declarations.map((item) => ({ value: item.id, label: `${item.employee_name} (${item.financial_year_code})` })), [setup.declarations]);
  const salaryComponentOptions = useMemo(() => setup.options.salary_components.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })), [setup.options.salary_components]);

  async function save<Item extends ApiItem>(family: Family, path: string, itemId: string | undefined, body: Record<string, unknown>, apply: (item: Item) => void) {
    setSubmitting(family);
    setFeedback(null);
    const response = await fetch(itemId ? `/api/hr-admin/${path}/${itemId}` : `/api/hr-admin/${path}`, {
      method: itemId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    setSubmitting(null);
    if (!response.ok) {
      setFeedback({ tone: "error", message: getErrorMessage(payload, `Unable to save ${familyLabels[family]}.`) });
      return;
    }
    apply(payload as Item);
    setFeedback({ tone: "success", message: `${familyLabels[family]} saved.` });
    router.refresh();
  }

  async function postAction<Item extends ApiItem>(label: string, path: string, body: Record<string, unknown>, apply: (item: Item) => void) {
    setSubmitting(label);
    setFeedback(null);
    const response = await fetch(`/api/hr-admin/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    setSubmitting(null);
    if (!response.ok) {
      setFeedback({ tone: "error", message: getErrorMessage(payload, `Unable to ${label}.`) });
      return;
    }
    apply(payload as Item);
    setFeedback({ tone: "success", message: `${label} completed.` });
    router.refresh();
  }

  function applyPack(item: HrAdminPayrollStatutoryPack) {
    setSetup((current) => ({ ...current, packs: replaceOrAppend(current.packs, item) }));
    setPackForm(packToForm(item));
    setComponentForm((current) => ({ ...current, statutory_pack_id: item.id }));
    setRegistrationForm((current) => ({ ...current, statutory_pack_id: item.id }));
    setFilingForm((current) => ({ ...current, statutory_pack_id: item.id }));
    setProfileForm((current) => ({ ...current, statutory_pack_id: item.id }));
    setDeclarationForm((current) => ({ ...current, statutory_pack_id: item.id }));
  }

  function applyComponent(item: HrAdminPayrollStatutoryComponent) {
    setSetup((current) => ({ ...current, statutory_components: replaceOrAppend(current.statutory_components, item) }));
    setComponentForm(componentToForm(item));
    setSlabForm((current) => ({ ...current, statutory_component_id: item.id }));
    setRegistrationForm((current) => ({ ...current, statutory_component_id: item.id }));
    setFilingForm((current) => ({ ...current, statutory_component_id: item.id }));
  }

  function applySlab(item: HrAdminPayrollStatutorySlab) {
    setSetup((current) => ({ ...current, slabs: replaceOrAppend(current.slabs, item) }));
    setSlabForm(slabToForm(item));
  }

  function applyRegistration(item: HrAdminPayrollStatutoryEmployerRegistration) {
    setSetup((current) => ({ ...current, employer_registrations: replaceOrAppend(current.employer_registrations, item) }));
    setRegistrationForm(registrationToForm(item));
    setFilingForm((current) => ({ ...current, employer_registration_id: item.id, statutory_pack_id: item.statutory_pack_id, statutory_component_id: item.statutory_component_id ?? current.statutory_component_id }));
  }

  function applyFiling(item: HrAdminPayrollStatutoryFilingCalendar) {
    setSetup((current) => ({ ...current, filing_calendars: replaceOrAppend(current.filing_calendars, item) }));
    setFilingForm(filingToForm(item));
  }

  function applyProfile(item: HrAdminEmployeeStatutoryProfile) {
    setSetup((current) => ({ ...current, employee_profiles: replaceOrAppend(current.employee_profiles, item) }));
    setProfileForm(profileToForm(item));
    setDeclarationForm((current) => ({ ...current, employee_id: item.employee_id, employee_statutory_profile_id: item.id, statutory_pack_id: item.statutory_pack_id ?? current.statutory_pack_id }));
  }

  function applyDeclaration(item: HrAdminEmployeeStatutoryDeclaration) {
    setSetup((current) => ({ ...current, declarations: replaceOrAppend(current.declarations, item) }));
    setDeclarationForm(declarationToForm(item));
    setItemForm((current) => ({ ...current, declaration_id: item.id }));
  }

  function applyItem(item: HrAdminEmployeeStatutoryDeclarationItem) {
    setSetup((current) => ({ ...current, declaration_items: replaceOrAppend(current.declaration_items, item) }));
    setItemForm(itemToForm(item));
  }

  function profileSelect(value: string) {
    const profile = setup.employee_profiles.find((item) => item.id === value);
    setDeclarationForm((current) => ({
      ...current,
      employee_statutory_profile_id: value,
      employee_id: profile?.employee_id ?? current.employee_id,
      statutory_pack_id: profile?.statutory_pack_id ?? current.statutory_pack_id,
    }));
  }

  return (
    <section className="section section--tight salary-crud-console payroll-statutory-crud-console" aria-labelledby="statutory-crud-console-title">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Browser CRUD</span>
          <h2 id="statutory-crud-console-title">Statutory setup controls</h2>
        </div>
        <span className="payroll-setup-count">{setup.packs.length + setup.statutory_components.length + setup.slabs.length + setup.employer_registrations.length + setup.filing_calendars.length + setup.employee_profiles.length + setup.declarations.length + setup.declaration_items.length} records</span>
      </div>

      {feedback ? (
        <div className={`notice ${feedback.tone === "success" ? "notice--success" : ""}`} role="status">
          <strong>{feedback.tone === "success" ? "Saved." : "Save failed."}</strong>
          <span className="muted">{feedback.message}</span>
        </div>
      ) : null}

      <div className="salary-crud-grid payroll-statutory-crud-grid">
        <form aria-label="Statutory pack form" className="salary-crud-form" data-testid="statutory-pack-form" onSubmit={(event) => {
          event.preventDefault();
          void save<HrAdminPayrollStatutoryPack>("pack", "payroll-statutory-packs", packForm.id, {
            code: packForm.code,
            name: packForm.name,
            country_code: packForm.country_code,
            jurisdiction_ref: packForm.jurisdiction_ref,
            status: packForm.status,
            effective_from: packForm.effective_from,
            effective_to: nullable(packForm.effective_to),
            currency_code: packForm.currency_code,
            statutory_profile_ref: packForm.statutory_profile_ref,
            validation_profile_ref: packForm.validation_profile_ref,
            config_snapshot: makeSnapshot(packForm.config_profile_ref),
          }, applyPack);
        }}>
          <FormHeader mode={packForm.id ? "edit" : "create"} title="Pack" onReset={() => setPackForm(emptyPack(setup))} />
          <div className="form-grid salary-crud-form-grid">
            <TextField label="Code" required value={packForm.code} onChange={(value) => setPackForm((current) => ({ ...current, code: value }))} />
            <TextField label="Name" required value={packForm.name} onChange={(value) => setPackForm((current) => ({ ...current, name: value }))} />
            <TextField label="Country code" required value={packForm.country_code} onChange={(value) => setPackForm((current) => ({ ...current, country_code: value.toUpperCase().slice(0, 2) }))} />
            <TextField label="Jurisdiction reference" value={packForm.jurisdiction_ref} onChange={(value) => setPackForm((current) => ({ ...current, jurisdiction_ref: value }))} />
            <SelectField label="Status" required value={packForm.status} options={enumOptions(setup.options.config_statuses)} onChange={(value) => setPackForm((current) => ({ ...current, status: value }))} />
            <TextField label="Effective from" required type="date" value={packForm.effective_from} onChange={(value) => setPackForm((current) => ({ ...current, effective_from: value }))} />
            <TextField label="Effective to" type="date" value={packForm.effective_to} onChange={(value) => setPackForm((current) => ({ ...current, effective_to: value }))} />
            <TextField label="Currency code" value={packForm.currency_code} onChange={(value) => setPackForm((current) => ({ ...current, currency_code: value.toUpperCase().slice(0, 3) }))} />
            <TextField label="Statutory profile reference" value={packForm.statutory_profile_ref} onChange={(value) => setPackForm((current) => ({ ...current, statutory_profile_ref: value }))} />
            <TextField label="Validation profile reference" value={packForm.validation_profile_ref} onChange={(value) => setPackForm((current) => ({ ...current, validation_profile_ref: value }))} />
            <TextField label="Config profile reference" value={packForm.config_profile_ref} onChange={(value) => setPackForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <RecordList label="Statutory pack records">{setup.packs.slice(0, 8).map((item) => <button className="salary-crud-record" key={item.id} type="button" onClick={() => setPackForm(packToForm(item))}><strong>{item.name}</strong><span>{item.code}</span></button>)}</RecordList>
          <button className="button button--primary" disabled={submitting === "pack"} type="submit">{submitting === "pack" ? "Saving..." : packForm.id ? "Save pack" : "Create pack"}</button>
        </form>

        <form aria-label="Statutory component form" className="salary-crud-form" data-testid="statutory-component-form" onSubmit={(event) => {
          event.preventDefault();
          void save<HrAdminPayrollStatutoryComponent>("component", "payroll-statutory-components", componentForm.id, {
            statutory_pack_id: componentForm.statutory_pack_id,
            salary_component_id: nullable(componentForm.salary_component_id),
            code: componentForm.code,
            name: componentForm.name,
            statutory_type: componentForm.statutory_type,
            contribution_owner: componentForm.contribution_owner,
            calculation_method: componentForm.calculation_method,
            wage_base_ref: componentForm.wage_base_ref,
            statutory_treatment_ref: componentForm.statutory_treatment_ref,
            registration_ref: componentForm.registration_ref,
            applicability_profile_ref: componentForm.applicability_profile_ref,
            rounding_rule_ref: componentForm.rounding_rule_ref,
            formula_ref: componentForm.formula_ref,
            status: componentForm.status,
            config_snapshot: makeSnapshot(componentForm.config_profile_ref),
          }, applyComponent);
        }}>
          <FormHeader mode={componentForm.id ? "edit" : "create"} title="Component" onReset={() => setComponentForm(emptyComponent(setup))} />
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Statutory pack" required value={componentForm.statutory_pack_id} options={packOptions} onChange={(value) => setComponentForm((current) => ({ ...current, statutory_pack_id: value }))} />
            <SelectField label="Salary component" value={componentForm.salary_component_id} options={[{ value: "", label: "No salary link" }, ...salaryComponentOptions]} onChange={(value) => setComponentForm((current) => ({ ...current, salary_component_id: value }))} />
            <TextField label="Code" required value={componentForm.code} onChange={(value) => setComponentForm((current) => ({ ...current, code: value }))} />
            <TextField label="Name" required value={componentForm.name} onChange={(value) => setComponentForm((current) => ({ ...current, name: value }))} />
            <SelectField label="Statutory type" required value={componentForm.statutory_type} options={enumOptions(setup.options.statutory_component_types)} onChange={(value) => setComponentForm((current) => ({ ...current, statutory_type: value }))} />
            <SelectField label="Contribution owner" value={componentForm.contribution_owner} options={enumOptions(setup.options.contribution_owners)} onChange={(value) => setComponentForm((current) => ({ ...current, contribution_owner: value }))} />
            <SelectField label="Calculation method" value={componentForm.calculation_method} options={enumOptions(setup.options.calculation_methods)} onChange={(value) => setComponentForm((current) => ({ ...current, calculation_method: value, formula_ref: value === "formula" ? current.formula_ref : "" }))} />
            <TextField label="Wage base reference" value={componentForm.wage_base_ref} onChange={(value) => setComponentForm((current) => ({ ...current, wage_base_ref: value }))} />
            <TextField label="Statutory treatment reference" required value={componentForm.statutory_treatment_ref} onChange={(value) => setComponentForm((current) => ({ ...current, statutory_treatment_ref: value }))} />
            <TextField label="Registration reference" value={componentForm.registration_ref} onChange={(value) => setComponentForm((current) => ({ ...current, registration_ref: value }))} />
            <TextField label="Applicability profile reference" value={componentForm.applicability_profile_ref} onChange={(value) => setComponentForm((current) => ({ ...current, applicability_profile_ref: value }))} />
            <TextField label="Rounding rule reference" value={componentForm.rounding_rule_ref} onChange={(value) => setComponentForm((current) => ({ ...current, rounding_rule_ref: value }))} />
            <TextField label="Formula reference" value={componentForm.formula_ref} onChange={(value) => setComponentForm((current) => ({ ...current, formula_ref: value }))} />
            <SelectField label="Status" value={componentForm.status} options={enumOptions(setup.options.config_statuses)} onChange={(value) => setComponentForm((current) => ({ ...current, status: value }))} />
            <TextField label="Config profile reference" value={componentForm.config_profile_ref} onChange={(value) => setComponentForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <RecordList label="Statutory component records">{setup.statutory_components.slice(0, 8).map((item) => <button className="salary-crud-record" key={item.id} type="button" onClick={() => setComponentForm(componentToForm(item))}><strong>{item.name}</strong><span>{item.code}</span></button>)}</RecordList>
          <button className="button button--primary" disabled={submitting === "component" || !packOptions.length} type="submit">{submitting === "component" ? "Saving..." : componentForm.id ? "Save component" : "Create component"}</button>
        </form>

        <form aria-label="Statutory slab form" className="salary-crud-form" data-testid="statutory-slab-form" onSubmit={(event) => {
          event.preventDefault();
          void save<HrAdminPayrollStatutorySlab>("slab", "payroll-statutory-slabs", slabForm.id, {
            statutory_component_id: slabForm.statutory_component_id,
            code: slabForm.code,
            name: slabForm.name,
            slab_order: Number(slabForm.slab_order),
            effective_from: slabForm.effective_from,
            effective_to: nullable(slabForm.effective_to),
            min_amount: decimal(slabForm.min_amount),
            max_amount: nullable(slabForm.max_amount),
            employee_rate_percent: decimal(slabForm.employee_rate_percent),
            employer_rate_percent: decimal(slabForm.employer_rate_percent),
            fixed_employee_amount: decimal(slabForm.fixed_employee_amount),
            fixed_employer_amount: decimal(slabForm.fixed_employer_amount),
            wage_ceiling_amount: nullable(slabForm.wage_ceiling_amount),
            state_code: slabForm.state_code,
            applicability_profile_ref: slabForm.applicability_profile_ref,
            status: slabForm.status,
            config_snapshot: makeSnapshot(slabForm.config_profile_ref),
          }, applySlab);
        }}>
          <FormHeader mode={slabForm.id ? "edit" : "create"} title="Slab" onReset={() => setSlabForm(emptySlab(setup))} />
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Statutory component" required value={slabForm.statutory_component_id} options={componentOptions} onChange={(value) => setSlabForm((current) => ({ ...current, statutory_component_id: value }))} />
            <TextField label="Code" required value={slabForm.code} onChange={(value) => setSlabForm((current) => ({ ...current, code: value }))} />
            <TextField label="Name" required value={slabForm.name} onChange={(value) => setSlabForm((current) => ({ ...current, name: value }))} />
            <TextField label="Slab order" type="number" value={slabForm.slab_order} onChange={(value) => setSlabForm((current) => ({ ...current, slab_order: value }))} />
            <TextField label="Effective from" required type="date" value={slabForm.effective_from} onChange={(value) => setSlabForm((current) => ({ ...current, effective_from: value }))} />
            <TextField label="Effective to" type="date" value={slabForm.effective_to} onChange={(value) => setSlabForm((current) => ({ ...current, effective_to: value }))} />
            <TextField label="Minimum amount" type="number" value={slabForm.min_amount} onChange={(value) => setSlabForm((current) => ({ ...current, min_amount: value }))} />
            <TextField label="Maximum amount" type="number" value={slabForm.max_amount} onChange={(value) => setSlabForm((current) => ({ ...current, max_amount: value }))} />
            <TextField label="Employee rate percent" type="number" value={slabForm.employee_rate_percent} onChange={(value) => setSlabForm((current) => ({ ...current, employee_rate_percent: value }))} />
            <TextField label="Employer rate percent" type="number" value={slabForm.employer_rate_percent} onChange={(value) => setSlabForm((current) => ({ ...current, employer_rate_percent: value }))} />
            <TextField label="Fixed employee amount" type="number" value={slabForm.fixed_employee_amount} onChange={(value) => setSlabForm((current) => ({ ...current, fixed_employee_amount: value }))} />
            <TextField label="Fixed employer amount" type="number" value={slabForm.fixed_employer_amount} onChange={(value) => setSlabForm((current) => ({ ...current, fixed_employer_amount: value }))} />
            <TextField label="Wage ceiling amount" type="number" value={slabForm.wage_ceiling_amount} onChange={(value) => setSlabForm((current) => ({ ...current, wage_ceiling_amount: value }))} />
            <TextField label="State code" value={slabForm.state_code} onChange={(value) => setSlabForm((current) => ({ ...current, state_code: value.toUpperCase() }))} />
            <TextField label="Applicability profile reference" value={slabForm.applicability_profile_ref} onChange={(value) => setSlabForm((current) => ({ ...current, applicability_profile_ref: value }))} />
            <SelectField label="Status" value={slabForm.status} options={enumOptions(setup.options.config_statuses)} onChange={(value) => setSlabForm((current) => ({ ...current, status: value }))} />
            <TextField label="Config profile reference" value={slabForm.config_profile_ref} onChange={(value) => setSlabForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <RecordList label="Statutory slab records">{setup.slabs.slice(0, 8).map((item) => <button className="salary-crud-record" key={item.id} type="button" onClick={() => setSlabForm(slabToForm(item))}><strong>{item.name}</strong><span>{item.code}</span></button>)}</RecordList>
          <button className="button button--primary" disabled={submitting === "slab" || !componentOptions.length} type="submit">{submitting === "slab" ? "Saving..." : slabForm.id ? "Save slab" : "Create slab"}</button>
        </form>

        <form aria-label="Employer statutory registration form" className="salary-crud-form" data-testid="statutory-registration-form" onSubmit={(event) => {
          event.preventDefault();
          void save<HrAdminPayrollStatutoryEmployerRegistration>("registration", "payroll-statutory-employer-registrations", registrationForm.id, {
            statutory_pack_id: registrationForm.statutory_pack_id,
            statutory_component_id: nullable(registrationForm.statutory_component_id),
            legal_entity_id: nullable(registrationForm.legal_entity_id),
            branch_id: nullable(registrationForm.branch_id),
            location_id: nullable(registrationForm.location_id),
            code: registrationForm.code,
            name: registrationForm.name,
            registration_type_ref: registrationForm.registration_type_ref,
            registration_number: registrationForm.registration_number,
            employer_identifier: registrationForm.employer_identifier,
            jurisdiction_ref: registrationForm.jurisdiction_ref,
            filing_authority_ref: registrationForm.filing_authority_ref,
            provider_ref: registrationForm.provider_ref,
            status: registrationForm.status,
            effective_from: registrationForm.effective_from,
            effective_to: nullable(registrationForm.effective_to),
            source_ref: registrationForm.source_ref,
            config_snapshot: makeSnapshot(registrationForm.config_profile_ref),
          }, applyRegistration);
        }}>
          <FormHeader mode={registrationForm.id ? "edit" : "create"} title="Employer registration" onReset={() => setRegistrationForm(emptyRegistration(setup))} />
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Statutory pack" required value={registrationForm.statutory_pack_id} options={packOptions} onChange={(value) => setRegistrationForm((current) => ({ ...current, statutory_pack_id: value }))} />
            <SelectField label="Statutory component" value={registrationForm.statutory_component_id} options={[{ value: "", label: "No component scope" }, ...componentOptions]} onChange={(value) => setRegistrationForm((current) => ({ ...current, statutory_component_id: value }))} />
            <SelectField label="Legal entity" value={registrationForm.legal_entity_id} options={options(setup.options.legal_entities, "All legal entities")} onChange={(value) => setRegistrationForm((current) => ({ ...current, legal_entity_id: value }))} />
            <SelectField label="Branch" value={registrationForm.branch_id} options={options(setup.options.branches, "All branches")} onChange={(value) => setRegistrationForm((current) => ({ ...current, branch_id: value }))} />
            <SelectField label="Location" value={registrationForm.location_id} options={options(setup.options.locations, "All locations")} onChange={(value) => setRegistrationForm((current) => ({ ...current, location_id: value }))} />
            <TextField label="Code" required value={registrationForm.code} onChange={(value) => setRegistrationForm((current) => ({ ...current, code: value }))} />
            <TextField label="Name" required value={registrationForm.name} onChange={(value) => setRegistrationForm((current) => ({ ...current, name: value }))} />
            <TextField label="Registration type reference" required value={registrationForm.registration_type_ref} onChange={(value) => setRegistrationForm((current) => ({ ...current, registration_type_ref: value }))} />
            <TextField label="Registration number" required value={registrationForm.registration_number} onChange={(value) => setRegistrationForm((current) => ({ ...current, registration_number: value }))} />
            <TextField label="Employer identifier" value={registrationForm.employer_identifier} onChange={(value) => setRegistrationForm((current) => ({ ...current, employer_identifier: value }))} />
            <TextField label="Jurisdiction reference" value={registrationForm.jurisdiction_ref} onChange={(value) => setRegistrationForm((current) => ({ ...current, jurisdiction_ref: value }))} />
            <TextField label="Filing authority reference" value={registrationForm.filing_authority_ref} onChange={(value) => setRegistrationForm((current) => ({ ...current, filing_authority_ref: value }))} />
            <TextField label="Provider reference" value={registrationForm.provider_ref} onChange={(value) => setRegistrationForm((current) => ({ ...current, provider_ref: value }))} />
            <SelectField label="Status" value={registrationForm.status} options={enumOptions(setup.options.config_statuses)} onChange={(value) => setRegistrationForm((current) => ({ ...current, status: value }))} />
            <TextField label="Effective from" required type="date" value={registrationForm.effective_from} onChange={(value) => setRegistrationForm((current) => ({ ...current, effective_from: value }))} />
            <TextField label="Effective to" type="date" value={registrationForm.effective_to} onChange={(value) => setRegistrationForm((current) => ({ ...current, effective_to: value }))} />
            <TextField label="Source reference" value={registrationForm.source_ref} onChange={(value) => setRegistrationForm((current) => ({ ...current, source_ref: value }))} />
            <TextField label="Config profile reference" value={registrationForm.config_profile_ref} onChange={(value) => setRegistrationForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <RecordList label="Employer statutory registration records">{setup.employer_registrations.slice(0, 8).map((item) => <button className="salary-crud-record" key={item.id} type="button" onClick={() => setRegistrationForm(registrationToForm(item))}><strong>{item.name}</strong><span>{item.code}</span></button>)}</RecordList>
          <button className="button button--primary" disabled={submitting === "registration" || !packOptions.length} type="submit">{submitting === "registration" ? "Saving..." : registrationForm.id ? "Save registration" : "Create registration"}</button>
        </form>

        <form aria-label="Statutory filing calendar form" className="salary-crud-form" data-testid="statutory-filing-form" onSubmit={(event) => {
          event.preventDefault();
          void save<HrAdminPayrollStatutoryFilingCalendar>("filing", "payroll-statutory-filing-calendars", filingForm.id, {
            statutory_pack_id: filingForm.statutory_pack_id,
            statutory_component_id: nullable(filingForm.statutory_component_id),
            employer_registration_id: nullable(filingForm.employer_registration_id),
            code: filingForm.code,
            name: filingForm.name,
            filing_type_ref: filingForm.filing_type_ref,
            filing_frequency: filingForm.filing_frequency,
            period_start: filingForm.period_start,
            period_end: filingForm.period_end,
            due_date: filingForm.due_date,
            grace_due_date: nullable(filingForm.grace_due_date),
            filing_window_start: nullable(filingForm.filing_window_start),
            filing_window_end: nullable(filingForm.filing_window_end),
            status: filingForm.status,
            filing_authority_ref: filingForm.filing_authority_ref,
            provider_ref: filingForm.provider_ref,
            output_profile_ref: filingForm.output_profile_ref,
            source_ref: filingForm.source_ref,
            config_snapshot: makeSnapshot(filingForm.config_profile_ref),
          }, applyFiling);
        }}>
          <FormHeader mode={filingForm.id ? "edit" : "create"} title="Filing calendar" onReset={() => setFilingForm(emptyFiling(setup))} />
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Statutory pack" required value={filingForm.statutory_pack_id} options={packOptions} onChange={(value) => setFilingForm((current) => ({ ...current, statutory_pack_id: value }))} />
            <SelectField label="Statutory component" value={filingForm.statutory_component_id} options={[{ value: "", label: "No component scope" }, ...componentOptions]} onChange={(value) => setFilingForm((current) => ({ ...current, statutory_component_id: value }))} />
            <SelectField label="Employer registration" value={filingForm.employer_registration_id} options={[{ value: "", label: "No registration scope" }, ...registrationOptions]} onChange={(value) => setFilingForm((current) => ({ ...current, employer_registration_id: value }))} />
            <TextField label="Code" required value={filingForm.code} onChange={(value) => setFilingForm((current) => ({ ...current, code: value }))} />
            <TextField label="Name" required value={filingForm.name} onChange={(value) => setFilingForm((current) => ({ ...current, name: value }))} />
            <TextField label="Filing type reference" required value={filingForm.filing_type_ref} onChange={(value) => setFilingForm((current) => ({ ...current, filing_type_ref: value }))} />
            <SelectField label="Filing frequency" value={filingForm.filing_frequency} options={enumOptions(setup.options.payroll_frequencies)} onChange={(value) => setFilingForm((current) => ({ ...current, filing_frequency: value }))} />
            <TextField label="Period start" required type="date" value={filingForm.period_start} onChange={(value) => setFilingForm((current) => ({ ...current, period_start: value }))} />
            <TextField label="Period end" required type="date" value={filingForm.period_end} onChange={(value) => setFilingForm((current) => ({ ...current, period_end: value }))} />
            <TextField label="Due date" required type="date" value={filingForm.due_date} onChange={(value) => setFilingForm((current) => ({ ...current, due_date: value }))} />
            <TextField label="Grace due date" type="date" value={filingForm.grace_due_date} onChange={(value) => setFilingForm((current) => ({ ...current, grace_due_date: value }))} />
            <TextField label="Filing window start" type="date" value={filingForm.filing_window_start} onChange={(value) => setFilingForm((current) => ({ ...current, filing_window_start: value }))} />
            <TextField label="Filing window end" type="date" value={filingForm.filing_window_end} onChange={(value) => setFilingForm((current) => ({ ...current, filing_window_end: value }))} />
            <SelectField label="Status" value={filingForm.status} options={enumOptions(setup.options.statutory_filing_statuses)} onChange={(value) => setFilingForm((current) => ({ ...current, status: value }))} />
            <TextField label="Filing authority reference" value={filingForm.filing_authority_ref} onChange={(value) => setFilingForm((current) => ({ ...current, filing_authority_ref: value }))} />
            <TextField label="Provider reference" value={filingForm.provider_ref} onChange={(value) => setFilingForm((current) => ({ ...current, provider_ref: value }))} />
            <TextField label="Output profile reference" value={filingForm.output_profile_ref} onChange={(value) => setFilingForm((current) => ({ ...current, output_profile_ref: value }))} />
            <TextField label="Source reference" value={filingForm.source_ref} onChange={(value) => setFilingForm((current) => ({ ...current, source_ref: value }))} />
            <TextField label="Config profile reference" value={filingForm.config_profile_ref} onChange={(value) => setFilingForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <RecordList label="Statutory filing calendar records">{setup.filing_calendars.slice(0, 8).map((item) => <button className="salary-crud-record" key={item.id} type="button" onClick={() => setFilingForm(filingToForm(item))}><strong>{item.name}</strong><span>{item.code}</span></button>)}</RecordList>
          <button className="button button--primary" disabled={submitting === "filing" || !packOptions.length} type="submit">{submitting === "filing" ? "Saving..." : filingForm.id ? "Save filing" : "Create filing"}</button>
        </form>

        <form aria-label="Employee statutory profile form" className="salary-crud-form" data-testid="statutory-profile-form" onSubmit={(event) => {
          event.preventDefault();
          void save<HrAdminEmployeeStatutoryProfile>("profile", "employee-statutory-profiles", profileForm.id, {
            employee_id: profileForm.employee_id,
            statutory_pack_id: nullable(profileForm.statutory_pack_id),
            profile_ref: profileForm.profile_ref,
            effective_from: profileForm.effective_from,
            effective_to: nullable(profileForm.effective_to),
            status: profileForm.status,
            pan_number: profileForm.pan_number,
            uan_number: profileForm.uan_number,
            pf_number: profileForm.pf_number,
            esi_number: profileForm.esi_number,
            pf_applicable: profileForm.pf_applicable,
            esi_applicable: profileForm.esi_applicable,
            professional_tax_state: profileForm.professional_tax_state,
            lwf_state: profileForm.lwf_state,
            tax_regime: profileForm.tax_regime,
            declaration_status: profileForm.declaration_status,
            previous_employment_income: decimal(profileForm.previous_employment_income),
            previous_employment_tax_deducted: decimal(profileForm.previous_employment_tax_deducted),
            source_ref: profileForm.source_ref,
            config_snapshot: makeSnapshot(profileForm.config_profile_ref),
          }, applyProfile);
        }}>
          <FormHeader mode={profileForm.id ? "edit" : "create"} title="Employee profile" onReset={() => setProfileForm(emptyProfile(setup))} />
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Employee" required value={profileForm.employee_id} options={employeeOptions} onChange={(value) => setProfileForm((current) => ({ ...current, employee_id: value }))} />
            <SelectField label="Statutory pack" value={profileForm.statutory_pack_id} options={[{ value: "", label: "No pack" }, ...packOptions]} onChange={(value) => setProfileForm((current) => ({ ...current, statutory_pack_id: value }))} />
            <TextField label="Profile reference" value={profileForm.profile_ref} onChange={(value) => setProfileForm((current) => ({ ...current, profile_ref: value }))} />
            <TextField label="Effective from" required type="date" value={profileForm.effective_from} onChange={(value) => setProfileForm((current) => ({ ...current, effective_from: value }))} />
            <TextField label="Effective to" type="date" value={profileForm.effective_to} onChange={(value) => setProfileForm((current) => ({ ...current, effective_to: value }))} />
            <SelectField label="Status" value={profileForm.status} options={enumOptions(setup.options.config_statuses)} onChange={(value) => setProfileForm((current) => ({ ...current, status: value }))} />
            <TextField label="PAN number" value={profileForm.pan_number} onChange={(value) => setProfileForm((current) => ({ ...current, pan_number: value.toUpperCase().slice(0, 10) }))} />
            <TextField label="UAN number" value={profileForm.uan_number} onChange={(value) => setProfileForm((current) => ({ ...current, uan_number: value.slice(0, 12) }))} />
            <TextField label="PF number" value={profileForm.pf_number} onChange={(value) => setProfileForm((current) => ({ ...current, pf_number: value }))} />
            <TextField label="ESI number" value={profileForm.esi_number} onChange={(value) => setProfileForm((current) => ({ ...current, esi_number: value }))} />
            <TextField label="Professional tax state" value={profileForm.professional_tax_state} onChange={(value) => setProfileForm((current) => ({ ...current, professional_tax_state: value.toUpperCase() }))} />
            <TextField label="LWF state" value={profileForm.lwf_state} onChange={(value) => setProfileForm((current) => ({ ...current, lwf_state: value.toUpperCase() }))} />
            <SelectField label="Tax regime" value={profileForm.tax_regime} options={enumOptions(setup.options.tax_regimes)} onChange={(value) => setProfileForm((current) => ({ ...current, tax_regime: value }))} />
            <SelectField label="Declaration status" value={profileForm.declaration_status} options={enumOptions(setup.options.declaration_statuses)} onChange={(value) => setProfileForm((current) => ({ ...current, declaration_status: value }))} />
            <TextField label="Previous employment income" type="number" value={profileForm.previous_employment_income} onChange={(value) => setProfileForm((current) => ({ ...current, previous_employment_income: value }))} />
            <TextField label="Previous employment tax deducted" type="number" value={profileForm.previous_employment_tax_deducted} onChange={(value) => setProfileForm((current) => ({ ...current, previous_employment_tax_deducted: value }))} />
            <TextField label="Source reference" value={profileForm.source_ref} onChange={(value) => setProfileForm((current) => ({ ...current, source_ref: value }))} />
            <TextField label="Config profile reference" value={profileForm.config_profile_ref} onChange={(value) => setProfileForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <div className="toggle-field-list salary-crud-toggle-list">
            <BooleanField label="PF applicable" checked={profileForm.pf_applicable} onChange={(checked) => setProfileForm((current) => ({ ...current, pf_applicable: checked }))} />
            <BooleanField label="ESI applicable" checked={profileForm.esi_applicable} onChange={(checked) => setProfileForm((current) => ({ ...current, esi_applicable: checked }))} />
          </div>
          <RecordList label="Employee statutory profile records">{setup.employee_profiles.slice(0, 8).map((item) => <button className="salary-crud-record" key={item.id} type="button" onClick={() => setProfileForm(profileToForm(item))}><strong>{item.employee_name}</strong><span>{item.profile_ref}</span></button>)}</RecordList>
          <button className="button button--primary" disabled={submitting === "profile" || !employeeOptions.length} type="submit">{submitting === "profile" ? "Saving..." : profileForm.id ? "Save profile" : "Create profile"}</button>
        </form>

        <form aria-label="Employee statutory declaration form" className="salary-crud-form" data-testid="statutory-declaration-form" onSubmit={(event) => {
          event.preventDefault();
          void save<HrAdminEmployeeStatutoryDeclaration>("declaration", "employee-statutory-declarations", declarationForm.id, {
            employee_id: declarationForm.employee_id,
            employee_statutory_profile_id: declarationForm.employee_statutory_profile_id,
            statutory_pack_id: nullable(declarationForm.statutory_pack_id),
            financial_year_code: declarationForm.financial_year_code,
            declaration_profile_ref: declarationForm.declaration_profile_ref,
            proof_window_ref: declarationForm.proof_window_ref,
            status: declarationForm.status,
            tax_regime: declarationForm.tax_regime,
            declared_total_amount: decimal(declarationForm.declared_total_amount),
            verified_total_amount: decimal(declarationForm.verified_total_amount),
            rejection_reason: declarationForm.rejection_reason,
            source_ref: declarationForm.source_ref,
            config_snapshot: makeSnapshot(declarationForm.config_profile_ref),
          }, applyDeclaration);
        }}>
          <FormHeader mode={declarationForm.id ? "edit" : "create"} title="Declaration" onReset={() => setDeclarationForm(emptyDeclaration(setup))} />
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Employee" required value={declarationForm.employee_id} options={employeeOptions} onChange={(value) => setDeclarationForm((current) => ({ ...current, employee_id: value }))} />
            <SelectField label="Employee statutory profile" required value={declarationForm.employee_statutory_profile_id} options={profileOptions} onChange={profileSelect} />
            <SelectField label="Statutory pack" value={declarationForm.statutory_pack_id} options={[{ value: "", label: "No pack" }, ...packOptions]} onChange={(value) => setDeclarationForm((current) => ({ ...current, statutory_pack_id: value }))} />
            <TextField label="Financial year code" required value={declarationForm.financial_year_code} onChange={(value) => setDeclarationForm((current) => ({ ...current, financial_year_code: value.toUpperCase() }))} />
            <TextField label="Declaration profile reference" value={declarationForm.declaration_profile_ref} onChange={(value) => setDeclarationForm((current) => ({ ...current, declaration_profile_ref: value }))} />
            <TextField label="Proof window reference" value={declarationForm.proof_window_ref} onChange={(value) => setDeclarationForm((current) => ({ ...current, proof_window_ref: value }))} />
            <SelectField label="Status" value={declarationForm.status} options={enumOptions(setup.options.statutory_declaration_statuses)} onChange={(value) => setDeclarationForm((current) => ({ ...current, status: value }))} />
            <SelectField label="Tax regime" value={declarationForm.tax_regime} options={enumOptions(setup.options.tax_regimes)} onChange={(value) => setDeclarationForm((current) => ({ ...current, tax_regime: value }))} />
            <TextField label="Declared total amount" type="number" value={declarationForm.declared_total_amount} onChange={(value) => setDeclarationForm((current) => ({ ...current, declared_total_amount: value }))} />
            <TextField label="Verified total amount" type="number" value={declarationForm.verified_total_amount} onChange={(value) => setDeclarationForm((current) => ({ ...current, verified_total_amount: value }))} />
            <TextField label="Rejection reason" value={declarationForm.rejection_reason} onChange={(value) => setDeclarationForm((current) => ({ ...current, rejection_reason: value }))} />
            <TextField label="Source reference" value={declarationForm.source_ref} onChange={(value) => setDeclarationForm((current) => ({ ...current, source_ref: value }))} />
            <TextField label="Config profile reference" value={declarationForm.config_profile_ref} onChange={(value) => setDeclarationForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <div className="salary-crud-action-row">
            <button className="button button--secondary button--compact" disabled={!declarationForm.id || submitting === "submit declaration"} type="button" onClick={() => declarationForm.id && void postAction<HrAdminEmployeeStatutoryDeclaration>("submit declaration", `employee-statutory-declarations/${declarationForm.id}/submit`, {}, applyDeclaration)}>Submit</button>
            <button className="button button--secondary button--compact" disabled={!declarationForm.id || submitting === "verify declaration"} type="button" onClick={() => declarationForm.id && void postAction<HrAdminEmployeeStatutoryDeclaration>("verify declaration", `employee-statutory-declarations/${declarationForm.id}/verify`, {}, applyDeclaration)}>Verify</button>
            <button className="button button--secondary button--compact" disabled={!declarationForm.id || submitting === "reject declaration"} type="button" onClick={() => declarationForm.id && void postAction<HrAdminEmployeeStatutoryDeclaration>("reject declaration", `employee-statutory-declarations/${declarationForm.id}/reject`, { reason: declarationForm.rejection_reason || "Rejected through browser statutory QA." }, applyDeclaration)}>Reject</button>
            <button className="button button--secondary button--compact" disabled={!declarationForm.id || submitting === "lock declaration"} type="button" onClick={() => declarationForm.id && void postAction<HrAdminEmployeeStatutoryDeclaration>("lock declaration", `employee-statutory-declarations/${declarationForm.id}/lock`, {}, applyDeclaration)}>Lock</button>
          </div>
          <RecordList label="Employee statutory declaration records">{setup.declarations.slice(0, 8).map((item) => <button className="salary-crud-record" key={item.id} type="button" onClick={() => setDeclarationForm(declarationToForm(item))}><strong>{item.employee_name}</strong><span>{item.financial_year_code}</span></button>)}</RecordList>
          <button className="button button--primary" disabled={submitting === "declaration" || !employeeOptions.length || !profileOptions.length} type="submit">{submitting === "declaration" ? "Saving..." : declarationForm.id ? "Save declaration" : "Create declaration"}</button>
        </form>

        <form aria-label="Employee statutory declaration item form" className="salary-crud-form" data-testid="statutory-declaration-item-form" onSubmit={(event) => {
          event.preventDefault();
          const path = itemForm.id ? "employee-statutory-declaration-items" : `employee-statutory-declarations/${itemForm.declaration_id}/items`;
          void save<HrAdminEmployeeStatutoryDeclarationItem>("item", path, itemForm.id, {
            item_kind: itemForm.item_kind,
            section_code: itemForm.section_code,
            component_code: itemForm.component_code,
            name: itemForm.name,
            declared_amount: decimal(itemForm.declared_amount),
            verified_amount: decimal(itemForm.verified_amount),
            proof_status: itemForm.proof_status,
            proof_document_ref: itemForm.proof_document_ref,
            proof_artifact_key: itemForm.proof_artifact_key,
            source_ref: itemForm.source_ref,
            config_snapshot: makeSnapshot(itemForm.config_profile_ref),
          }, applyItem);
        }}>
          <FormHeader mode={itemForm.id ? "edit" : "create"} title="Declaration item" onReset={() => setItemForm(emptyItem(setup))} />
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Declaration" required value={itemForm.declaration_id} options={declarationOptions} onChange={(value) => setItemForm((current) => ({ ...current, declaration_id: value }))} />
            <SelectField label="Item kind" value={itemForm.item_kind} options={enumOptions(setup.options.statutory_declaration_item_kinds)} onChange={(value) => setItemForm((current) => ({ ...current, item_kind: value }))} />
            <TextField label="Section code" required value={itemForm.section_code} onChange={(value) => setItemForm((current) => ({ ...current, section_code: value.toUpperCase() }))} />
            <TextField label="Component code" value={itemForm.component_code} onChange={(value) => setItemForm((current) => ({ ...current, component_code: value.toUpperCase() }))} />
            <TextField label="Name" required value={itemForm.name} onChange={(value) => setItemForm((current) => ({ ...current, name: value }))} />
            <TextField label="Declared amount" required type="number" value={itemForm.declared_amount} onChange={(value) => setItemForm((current) => ({ ...current, declared_amount: value }))} />
            <TextField label="Verified amount" type="number" value={itemForm.verified_amount} onChange={(value) => setItemForm((current) => ({ ...current, verified_amount: value }))} />
            <SelectField label="Proof status" value={itemForm.proof_status} options={enumOptions(setup.options.statutory_proof_statuses)} onChange={(value) => setItemForm((current) => ({ ...current, proof_status: value }))} />
            <TextField label="Proof document reference" value={itemForm.proof_document_ref} onChange={(value) => setItemForm((current) => ({ ...current, proof_document_ref: value }))} />
            <TextField label="Proof artifact key" value={itemForm.proof_artifact_key} onChange={(value) => setItemForm((current) => ({ ...current, proof_artifact_key: value }))} />
            <TextField label="Source reference" value={itemForm.source_ref} onChange={(value) => setItemForm((current) => ({ ...current, source_ref: value }))} />
            <TextField label="Config profile reference" value={itemForm.config_profile_ref} onChange={(value) => setItemForm((current) => ({ ...current, config_profile_ref: value }))} />
            <TextField label="Item rejection reason" value={itemForm.rejection_reason} onChange={(value) => setItemForm((current) => ({ ...current, rejection_reason: value }))} />
          </div>
          <div className="salary-crud-action-row">
            <button className="button button--secondary button--compact" disabled={!itemForm.id || submitting === "verify proof item"} type="button" onClick={() => itemForm.id && void postAction<HrAdminEmployeeStatutoryDeclarationItem>("verify proof item", `employee-statutory-declaration-items/${itemForm.id}/verify`, { verified_amount: decimal(itemForm.verified_amount, itemForm.declared_amount), proof_status: "verified" }, applyItem)}>Verify item</button>
            <button className="button button--secondary button--compact" disabled={!itemForm.id || submitting === "reject proof item"} type="button" onClick={() => itemForm.id && void postAction<HrAdminEmployeeStatutoryDeclarationItem>("reject proof item", `employee-statutory-declaration-items/${itemForm.id}/verify`, { verified_amount: decimal(itemForm.verified_amount), proof_status: "rejected", rejection_reason: itemForm.rejection_reason || "Rejected through browser statutory QA." }, applyItem)}>Reject item</button>
          </div>
          <RecordList label="Employee statutory declaration item records">{setup.declaration_items.slice(0, 8).map((item) => <button className="salary-crud-record" key={item.id} type="button" onClick={() => setItemForm(itemToForm(item))}><strong>{item.name}</strong><span>{item.section_code}</span></button>)}</RecordList>
          <button className="button button--primary" disabled={submitting === "item" || !declarationOptions.length} type="submit">{submitting === "item" ? "Saving..." : itemForm.id ? "Save declaration item" : "Create declaration item"}</button>
        </form>
      </div>
    </section>
  );
}
