"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  HrAdminEmployeeSalaryAssignment,
  HrAdminSalaryComponent,
  HrAdminSalarySetupResponse,
  HrAdminSalaryStructure,
  HrAdminSalaryStructureComponent,
  HrAdminSalaryStructureVersion,
} from "@/lib/types";

type SaveMode = "create" | "edit";
type ConfigFamily = "component" | "structure" | "version" | "line" | "assignment";
type ApiItem =
  | HrAdminSalaryComponent
  | HrAdminSalaryStructure
  | HrAdminSalaryStructureVersion
  | HrAdminSalaryStructureComponent
  | HrAdminEmployeeSalaryAssignment;

type ComponentForm = {
  id?: string;
  code: string;
  name: string;
  component_type: string;
  value_type: string;
  formula_ref: string;
  applicability_rule_ref: string;
  rounding_rule_ref: string;
  accounting_mapping_ref: string;
  statutory_treatment_ref: string;
  payslip_visibility: string;
  status: string;
  is_taxable: boolean;
  is_proratable: boolean;
  config_profile_ref: string;
};

type StructureForm = {
  id?: string;
  code: string;
  name: string;
  pay_group_id: string;
  currency_code: string;
  status: string;
  description: string;
  config_profile_ref: string;
};

type VersionForm = {
  id?: string;
  structure_id: string;
  version: string;
  effective_from: string;
  effective_to: string;
  annual_ctc: string;
  currency_code: string;
  status: string;
  config_profile_ref: string;
};

type LineForm = {
  id?: string;
  structure_version_id: string;
  component_id: string;
  display_order: string;
  amount: string;
  percentage: string;
  formula_ref: string;
  calculation_rule_ref: string;
  is_active: boolean;
  config_profile_ref: string;
};

type AssignmentForm = {
  id?: string;
  employee_id: string;
  structure_version_id: string;
  effective_from: string;
  effective_to: string;
  status: string;
  annual_ctc_override: string;
  assignment_reason: string;
  config_profile_ref: string;
};

type Feedback = {
  family: ConfigFamily;
  tone: "success" | "error";
  message: string;
} | null;

const familyLabels: Record<ConfigFamily, string> = {
  component: "salary component",
  structure: "salary structure",
  version: "structure version",
  line: "component line",
  assignment: "employee salary assignment",
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

function replaceOrAppend<Item extends { id: string }>(items: Item[], next: Item) {
  return items.some((item) => item.id === next.id)
    ? items.map((item) => (item.id === next.id ? next : item))
    : [next, ...items];
}

function emptyComponentForm(setup: HrAdminSalarySetupResponse): ComponentForm {
  return {
    code: "",
    name: "",
    component_type: setup.options.component_types[0]?.value ?? "earning",
    value_type: setup.options.component_value_types[0]?.value ?? "fixed_amount",
    formula_ref: "",
    applicability_rule_ref: "",
    rounding_rule_ref: "",
    accounting_mapping_ref: "",
    statutory_treatment_ref: "",
    payslip_visibility: "visible",
    status: setup.options.config_statuses[0]?.value ?? "draft",
    is_taxable: true,
    is_proratable: true,
    config_profile_ref: "",
  };
}

function emptyStructureForm(setup: HrAdminSalarySetupResponse): StructureForm {
  return {
    code: "",
    name: "",
    pay_group_id: "",
    currency_code: "INR",
    status: setup.options.config_statuses[0]?.value ?? "draft",
    description: "",
    config_profile_ref: "",
  };
}

function emptyVersionForm(setup: HrAdminSalarySetupResponse): VersionForm {
  return {
    structure_id: setup.structures[0]?.id ?? "",
    version: "1",
    effective_from: "2026-01-01",
    effective_to: "",
    annual_ctc: "0.00",
    currency_code: "INR",
    status: setup.options.config_statuses[0]?.value ?? "draft",
    config_profile_ref: "",
  };
}

function emptyLineForm(setup: HrAdminSalarySetupResponse): LineForm {
  return {
    structure_version_id: setup.versions[0]?.id ?? "",
    component_id: setup.components[0]?.id ?? "",
    display_order: "1",
    amount: "",
    percentage: "",
    formula_ref: "",
    calculation_rule_ref: "",
    is_active: true,
    config_profile_ref: "",
  };
}

function emptyAssignmentForm(setup: HrAdminSalarySetupResponse): AssignmentForm {
  return {
    employee_id: setup.options.employees[0]?.id ?? "",
    structure_version_id: setup.versions[0]?.id ?? "",
    effective_from: "2026-01-01",
    effective_to: "",
    status: setup.options.config_statuses[0]?.value ?? "draft",
    annual_ctc_override: "",
    assignment_reason: "",
    config_profile_ref: "",
  };
}

function componentToForm(item: HrAdminSalaryComponent): ComponentForm {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    component_type: item.component_type,
    value_type: item.value_type,
    formula_ref: item.formula_ref,
    applicability_rule_ref: item.applicability_rule_ref,
    rounding_rule_ref: item.rounding_rule_ref,
    accounting_mapping_ref: item.accounting_mapping_ref,
    statutory_treatment_ref: item.statutory_treatment_ref,
    payslip_visibility: item.payslip_visibility,
    status: item.status,
    is_taxable: item.is_taxable,
    is_proratable: item.is_proratable,
    config_profile_ref: getConfigProfileRef(item.config_snapshot),
  };
}

function structureToForm(item: HrAdminSalaryStructure): StructureForm {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    pay_group_id: item.pay_group_id ?? "",
    currency_code: item.currency_code,
    status: item.status,
    description: item.description,
    config_profile_ref: getConfigProfileRef(item.config_snapshot),
  };
}

function versionToForm(item: HrAdminSalaryStructureVersion): VersionForm {
  return {
    id: item.id,
    structure_id: item.structure_id,
    version: String(item.version),
    effective_from: item.effective_from,
    effective_to: item.effective_to ?? "",
    annual_ctc: item.annual_ctc,
    currency_code: item.currency_code,
    status: item.status,
    config_profile_ref: getConfigProfileRef(item.config_snapshot),
  };
}

function lineToForm(item: HrAdminSalaryStructureComponent): LineForm {
  return {
    id: item.id,
    structure_version_id: item.structure_version_id,
    component_id: item.component_id,
    display_order: String(item.display_order),
    amount: item.amount ?? "",
    percentage: item.percentage ?? "",
    formula_ref: item.formula_ref,
    calculation_rule_ref: item.calculation_rule_ref,
    is_active: item.is_active,
    config_profile_ref: getConfigProfileRef(item.config_snapshot),
  };
}

function assignmentToForm(item: HrAdminEmployeeSalaryAssignment): AssignmentForm {
  return {
    id: item.id,
    employee_id: item.employee_id,
    structure_version_id: item.structure_version_id,
    effective_from: item.effective_from,
    effective_to: item.effective_to ?? "",
    status: item.status,
    annual_ctc_override: item.annual_ctc_override ?? "",
    assignment_reason: item.assignment_reason,
    config_profile_ref: getConfigProfileRef(item.config_snapshot),
  };
}

function TextField({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="form-field">
      <span className="muted">{label}</span>
      <input className="input-control" required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <label className="form-field">
      <span className="muted">{label}</span>
      <select className="input-control" required={required} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function BooleanField({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="toggle-field salary-crud-toggle">
      <div>
        <strong>{label}</strong>
      </div>
      <input checked={checked} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function FormHeader({ mode, title, onReset }: { mode: SaveMode; title: string; onReset: () => void }) {
  return (
    <div className="salary-crud-form__header">
      <div>
        <span className="workspace-card__eyebrow">{mode === "edit" ? "Edit mode" : "Create mode"}</span>
        <h3>{title}</h3>
      </div>
      <button className="button button--secondary button--compact" type="button" onClick={onReset}>
        New
      </button>
    </div>
  );
}

export function SalarySetupCrudConsole({ initialSetup }: { initialSetup: HrAdminSalarySetupResponse }) {
  const router = useRouter();
  const [setup, setSetup] = useState(initialSetup);
  const [componentForm, setComponentForm] = useState<ComponentForm>(() => emptyComponentForm(initialSetup));
  const [structureForm, setStructureForm] = useState<StructureForm>(() => emptyStructureForm(initialSetup));
  const [versionForm, setVersionForm] = useState<VersionForm>(() => emptyVersionForm(initialSetup));
  const [lineForm, setLineForm] = useState<LineForm>(() => emptyLineForm(initialSetup));
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(() => emptyAssignmentForm(initialSetup));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState<ConfigFamily | null>(null);

  const structureOptions = useMemo(
    () => setup.structures.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })),
    [setup.structures],
  );
  const versionOptions = useMemo(
    () => setup.versions.map((item) => ({ value: item.id, label: `${item.structure_name} v${item.version}` })),
    [setup.versions],
  );
  const componentOptions = useMemo(
    () => setup.components.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })),
    [setup.components],
  );
  const employeeOptions = useMemo(
    () => setup.options.employees.map((item) => ({ value: item.id, label: `${item.name} (${item.employee_code})` })),
    [setup.options.employees],
  );
  const statusOptions = useMemo(
    () => setup.options.config_statuses.map((item) => ({ value: item.value, label: item.label })),
    [setup.options.config_statuses],
  );

  async function save<Item extends ApiItem>(
    family: ConfigFamily,
    path: string,
    itemId: string | undefined,
    body: Record<string, unknown>,
    apply: (item: Item) => void,
  ) {
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
      setFeedback({ family, tone: "error", message: getErrorMessage(payload, `Unable to save ${familyLabels[family]}.`) });
      return;
    }

    apply(payload as Item);
    setFeedback({ family, tone: "success", message: `${familyLabels[family]} saved.` });
    router.refresh();
  }

  function applyComponent(item: HrAdminSalaryComponent) {
    setSetup((current) => ({
      ...current,
      components: replaceOrAppend(current.components, item),
      summary: {
        ...current.summary,
        component_count: current.components.some((component) => component.id === item.id) ? current.summary.component_count : current.summary.component_count + 1,
      },
    }));
    setComponentForm(componentToForm(item));
  }

  function applyStructure(item: HrAdminSalaryStructure) {
    setSetup((current) => ({
      ...current,
      structures: replaceOrAppend(current.structures, item),
      summary: {
        ...current.summary,
        structure_count: current.structures.some((structure) => structure.id === item.id) ? current.summary.structure_count : current.summary.structure_count + 1,
      },
    }));
    setStructureForm(structureToForm(item));
    setVersionForm((current) => ({ ...current, structure_id: item.id }));
  }

  function applyVersion(item: HrAdminSalaryStructureVersion) {
    setSetup((current) => ({
      ...current,
      versions: replaceOrAppend(current.versions, item),
      summary: {
        ...current.summary,
        active_version_count:
          !current.versions.some((version) => version.id === item.id) && item.status === "active"
            ? current.summary.active_version_count + 1
            : current.summary.active_version_count,
      },
    }));
    setVersionForm(versionToForm(item));
    setLineForm((current) => ({ ...current, structure_version_id: item.id }));
    setAssignmentForm((current) => ({ ...current, structure_version_id: item.id }));
  }

  function applyLine(item: HrAdminSalaryStructureComponent) {
    setSetup((current) => ({
      ...current,
      structure_components: replaceOrAppend(current.structure_components, item),
    }));
    setLineForm(lineToForm(item));
  }

  function applyAssignment(item: HrAdminEmployeeSalaryAssignment) {
    setSetup((current) => ({
      ...current,
      assignments: replaceOrAppend(current.assignments, item),
      summary: {
        ...current.summary,
        assigned_employee_count: current.assignments.some((assignment) => assignment.id === item.id)
          ? current.summary.assigned_employee_count
          : current.summary.assigned_employee_count + 1,
      },
    }));
    setAssignmentForm(assignmentToForm(item));
  }

  return (
    <section className="section section--tight salary-crud-console" aria-labelledby="salary-crud-console-title">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Browser CRUD</span>
          <h2 id="salary-crud-console-title">Salary setup controls</h2>
        </div>
        <span className="payroll-setup-count">{setup.components.length + setup.structures.length + setup.versions.length + setup.structure_components.length + setup.assignments.length} records</span>
      </div>

      {feedback ? (
        <div className={`notice ${feedback.tone === "success" ? "notice--success" : ""}`} role="status">
          <strong>{feedback.tone === "success" ? "Saved." : "Save failed."}</strong>
          <span className="muted">{feedback.message}</span>
        </div>
      ) : null}

      <div className="salary-crud-grid">
        <form
          aria-label="Salary component form"
          className="salary-crud-form"
          data-testid="salary-component-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save<HrAdminSalaryComponent>("component", "salary-components", componentForm.id, {
              code: componentForm.code,
              name: componentForm.name,
              component_type: componentForm.component_type,
              value_type: componentForm.value_type,
              formula_ref: componentForm.formula_ref,
              applicability_rule_ref: componentForm.applicability_rule_ref,
              rounding_rule_ref: componentForm.rounding_rule_ref,
              accounting_mapping_ref: componentForm.accounting_mapping_ref,
              statutory_treatment_ref: componentForm.statutory_treatment_ref,
              payslip_visibility: componentForm.payslip_visibility,
              status: componentForm.status,
              is_taxable: componentForm.is_taxable,
              is_proratable: componentForm.is_proratable,
              config_snapshot: makeSnapshot(componentForm.config_profile_ref),
            }, applyComponent);
          }}
        >
          <FormHeader mode={componentForm.id ? "edit" : "create"} title="Component" onReset={() => setComponentForm(emptyComponentForm(setup))} />
          <div className="form-grid salary-crud-form-grid">
            <TextField label="Code" required value={componentForm.code} onChange={(value) => setComponentForm((current) => ({ ...current, code: value }))} />
            <TextField label="Name" required value={componentForm.name} onChange={(value) => setComponentForm((current) => ({ ...current, name: value }))} />
            <SelectField label="Component type" required value={componentForm.component_type} options={setup.options.component_types} onChange={(value) => setComponentForm((current) => ({ ...current, component_type: value }))} />
            <SelectField label="Value type" required value={componentForm.value_type} options={setup.options.component_value_types} onChange={(value) => setComponentForm((current) => ({ ...current, value_type: value }))} />
            <SelectField label="Status" required value={componentForm.status} options={statusOptions} onChange={(value) => setComponentForm((current) => ({ ...current, status: value }))} />
            <TextField label="Payslip visibility" value={componentForm.payslip_visibility} onChange={(value) => setComponentForm((current) => ({ ...current, payslip_visibility: value }))} />
            <TextField label="Formula reference" value={componentForm.formula_ref} onChange={(value) => setComponentForm((current) => ({ ...current, formula_ref: value }))} />
            <TextField label="Applicability rule reference" value={componentForm.applicability_rule_ref} onChange={(value) => setComponentForm((current) => ({ ...current, applicability_rule_ref: value }))} />
            <TextField label="Rounding rule reference" value={componentForm.rounding_rule_ref} onChange={(value) => setComponentForm((current) => ({ ...current, rounding_rule_ref: value }))} />
            <TextField label="Accounting mapping reference" value={componentForm.accounting_mapping_ref} onChange={(value) => setComponentForm((current) => ({ ...current, accounting_mapping_ref: value }))} />
            <TextField label="Statutory treatment reference" value={componentForm.statutory_treatment_ref} onChange={(value) => setComponentForm((current) => ({ ...current, statutory_treatment_ref: value }))} />
            <TextField label="Config profile reference" value={componentForm.config_profile_ref} onChange={(value) => setComponentForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <div className="toggle-field-list salary-crud-toggle-list">
            <BooleanField label="Taxable" checked={componentForm.is_taxable} onChange={(checked) => setComponentForm((current) => ({ ...current, is_taxable: checked }))} />
            <BooleanField label="Proratable" checked={componentForm.is_proratable} onChange={(checked) => setComponentForm((current) => ({ ...current, is_proratable: checked }))} />
          </div>
          <div className="salary-crud-list" aria-label="Salary component records">
            {setup.components.slice(0, 8).map((item) => (
              <button className="salary-crud-record" key={item.id} type="button" onClick={() => setComponentForm(componentToForm(item))}>
                <strong>{item.name}</strong>
                <span>{item.code}</span>
              </button>
            ))}
          </div>
          <button className="button button--primary" disabled={submitting === "component"} type="submit">
            {submitting === "component" ? "Saving..." : componentForm.id ? "Save component" : "Create component"}
          </button>
        </form>

        <form
          aria-label="Salary structure form"
          className="salary-crud-form"
          data-testid="salary-structure-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save<HrAdminSalaryStructure>("structure", "salary-structures", structureForm.id, {
              code: structureForm.code,
              name: structureForm.name,
              pay_group_id: nullable(structureForm.pay_group_id),
              currency_code: structureForm.currency_code,
              status: structureForm.status,
              description: structureForm.description,
              config_snapshot: makeSnapshot(structureForm.config_profile_ref),
            }, applyStructure);
          }}
        >
          <FormHeader mode={structureForm.id ? "edit" : "create"} title="Structure" onReset={() => setStructureForm(emptyStructureForm(setup))} />
          <div className="form-grid salary-crud-form-grid">
            <TextField label="Code" required value={structureForm.code} onChange={(value) => setStructureForm((current) => ({ ...current, code: value }))} />
            <TextField label="Name" required value={structureForm.name} onChange={(value) => setStructureForm((current) => ({ ...current, name: value }))} />
            <SelectField
              label="Pay group"
              value={structureForm.pay_group_id}
              options={[{ value: "", label: "All groups" }, ...setup.options.pay_groups.map((item) => ({ value: item.id, label: item.name }))]}
              onChange={(value) => setStructureForm((current) => ({ ...current, pay_group_id: value }))}
            />
            <TextField label="Currency code" required value={structureForm.currency_code} onChange={(value) => setStructureForm((current) => ({ ...current, currency_code: value.toUpperCase().slice(0, 3) }))} />
            <SelectField label="Status" required value={structureForm.status} options={statusOptions} onChange={(value) => setStructureForm((current) => ({ ...current, status: value }))} />
            <TextField label="Description" value={structureForm.description} onChange={(value) => setStructureForm((current) => ({ ...current, description: value }))} />
            <TextField label="Config profile reference" value={structureForm.config_profile_ref} onChange={(value) => setStructureForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <div className="salary-crud-list" aria-label="Salary structure records">
            {setup.structures.slice(0, 8).map((item) => (
              <button className="salary-crud-record" key={item.id} type="button" onClick={() => setStructureForm(structureToForm(item))}>
                <strong>{item.name}</strong>
                <span>{item.code}</span>
              </button>
            ))}
          </div>
          <button className="button button--primary" disabled={submitting === "structure"} type="submit">
            {submitting === "structure" ? "Saving..." : structureForm.id ? "Save structure" : "Create structure"}
          </button>
        </form>

        <form
          aria-label="Salary structure version form"
          className="salary-crud-form"
          data-testid="salary-version-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save<HrAdminSalaryStructureVersion>("version", "salary-structure-versions", versionForm.id, {
              structure_id: versionForm.structure_id,
              version: Number(versionForm.version),
              effective_from: versionForm.effective_from,
              effective_to: nullable(versionForm.effective_to),
              annual_ctc: versionForm.annual_ctc,
              currency_code: versionForm.currency_code,
              status: versionForm.status,
              config_snapshot: makeSnapshot(versionForm.config_profile_ref),
            }, applyVersion);
          }}
        >
          <FormHeader mode={versionForm.id ? "edit" : "create"} title="Version" onReset={() => setVersionForm(emptyVersionForm(setup))} />
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Structure" required value={versionForm.structure_id} options={structureOptions} onChange={(value) => setVersionForm((current) => ({ ...current, structure_id: value }))} />
            <TextField label="Version" required type="number" value={versionForm.version} onChange={(value) => setVersionForm((current) => ({ ...current, version: value }))} />
            <TextField label="Effective from" required type="date" value={versionForm.effective_from} onChange={(value) => setVersionForm((current) => ({ ...current, effective_from: value }))} />
            <TextField label="Effective to" type="date" value={versionForm.effective_to} onChange={(value) => setVersionForm((current) => ({ ...current, effective_to: value }))} />
            <TextField label="Annual CTC" required type="number" value={versionForm.annual_ctc} onChange={(value) => setVersionForm((current) => ({ ...current, annual_ctc: value }))} />
            <TextField label="Currency code" required value={versionForm.currency_code} onChange={(value) => setVersionForm((current) => ({ ...current, currency_code: value.toUpperCase().slice(0, 3) }))} />
            <SelectField label="Status" required value={versionForm.status} options={statusOptions} onChange={(value) => setVersionForm((current) => ({ ...current, status: value }))} />
            <TextField label="Config profile reference" value={versionForm.config_profile_ref} onChange={(value) => setVersionForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <div className="salary-crud-list" aria-label="Salary structure version records">
            {setup.versions.slice(0, 8).map((item) => (
              <button className="salary-crud-record" key={item.id} type="button" onClick={() => setVersionForm(versionToForm(item))}>
                <strong>{item.structure_name}</strong>
                <span>Version {item.version}</span>
              </button>
            ))}
          </div>
          <button className="button button--primary" disabled={submitting === "version" || !structureOptions.length} type="submit">
            {submitting === "version" ? "Saving..." : versionForm.id ? "Save version" : "Create version"}
          </button>
        </form>

        <form
          aria-label="Salary structure component line form"
          className="salary-crud-form"
          data-testid="salary-line-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save<HrAdminSalaryStructureComponent>("line", "salary-structure-components", lineForm.id, {
              structure_version_id: lineForm.structure_version_id,
              component_id: lineForm.component_id,
              display_order: Number(lineForm.display_order),
              amount: nullable(lineForm.amount),
              percentage: nullable(lineForm.percentage),
              formula_ref: lineForm.formula_ref,
              calculation_rule_ref: lineForm.calculation_rule_ref,
              is_active: lineForm.is_active,
              config_snapshot: makeSnapshot(lineForm.config_profile_ref),
            }, applyLine);
          }}
        >
          <FormHeader mode={lineForm.id ? "edit" : "create"} title="Component line" onReset={() => setLineForm(emptyLineForm(setup))} />
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Structure version" required value={lineForm.structure_version_id} options={versionOptions} onChange={(value) => setLineForm((current) => ({ ...current, structure_version_id: value }))} />
            <SelectField label="Component" required value={lineForm.component_id} options={componentOptions} onChange={(value) => setLineForm((current) => ({ ...current, component_id: value }))} />
            <TextField label="Display order" required type="number" value={lineForm.display_order} onChange={(value) => setLineForm((current) => ({ ...current, display_order: value }))} />
            <TextField label="Amount" type="number" value={lineForm.amount} onChange={(value) => setLineForm((current) => ({ ...current, amount: value }))} />
            <TextField label="Percentage" type="number" value={lineForm.percentage} onChange={(value) => setLineForm((current) => ({ ...current, percentage: value }))} />
            <TextField label="Formula reference" value={lineForm.formula_ref} onChange={(value) => setLineForm((current) => ({ ...current, formula_ref: value }))} />
            <TextField label="Calculation rule reference" value={lineForm.calculation_rule_ref} onChange={(value) => setLineForm((current) => ({ ...current, calculation_rule_ref: value }))} />
            <TextField label="Config profile reference" value={lineForm.config_profile_ref} onChange={(value) => setLineForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <div className="toggle-field-list salary-crud-toggle-list">
            <BooleanField label="Active line" checked={lineForm.is_active} onChange={(checked) => setLineForm((current) => ({ ...current, is_active: checked }))} />
          </div>
          <div className="salary-crud-list" aria-label="Salary component line records">
            {setup.structure_components.slice(0, 8).map((item) => (
              <button className="salary-crud-record" key={item.id} type="button" onClick={() => setLineForm(lineToForm(item))}>
                <strong>{item.component_name}</strong>
                <span>{item.structure_name}</span>
              </button>
            ))}
          </div>
          <button className="button button--primary" disabled={submitting === "line" || !versionOptions.length || !componentOptions.length} type="submit">
            {submitting === "line" ? "Saving..." : lineForm.id ? "Save component line" : "Create component line"}
          </button>
        </form>

        <form
          aria-label="Employee salary assignment form"
          className="salary-crud-form"
          data-testid="salary-assignment-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save<HrAdminEmployeeSalaryAssignment>("assignment", "employee-salary-assignments", assignmentForm.id, {
              employee_id: assignmentForm.employee_id,
              structure_version_id: assignmentForm.structure_version_id,
              effective_from: assignmentForm.effective_from,
              effective_to: nullable(assignmentForm.effective_to),
              status: assignmentForm.status,
              annual_ctc_override: nullable(assignmentForm.annual_ctc_override),
              assignment_reason: assignmentForm.assignment_reason,
              config_snapshot: makeSnapshot(assignmentForm.config_profile_ref),
            }, applyAssignment);
          }}
        >
          <FormHeader mode={assignmentForm.id ? "edit" : "create"} title="Employee assignment" onReset={() => setAssignmentForm(emptyAssignmentForm(setup))} />
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Employee" required value={assignmentForm.employee_id} options={employeeOptions} onChange={(value) => setAssignmentForm((current) => ({ ...current, employee_id: value }))} />
            <SelectField label="Structure version" required value={assignmentForm.structure_version_id} options={versionOptions} onChange={(value) => setAssignmentForm((current) => ({ ...current, structure_version_id: value }))} />
            <TextField label="Effective from" required type="date" value={assignmentForm.effective_from} onChange={(value) => setAssignmentForm((current) => ({ ...current, effective_from: value }))} />
            <TextField label="Effective to" type="date" value={assignmentForm.effective_to} onChange={(value) => setAssignmentForm((current) => ({ ...current, effective_to: value }))} />
            <SelectField label="Status" required value={assignmentForm.status} options={statusOptions} onChange={(value) => setAssignmentForm((current) => ({ ...current, status: value }))} />
            <TextField label="Annual CTC override" type="number" value={assignmentForm.annual_ctc_override} onChange={(value) => setAssignmentForm((current) => ({ ...current, annual_ctc_override: value }))} />
            <TextField label="Assignment reason" value={assignmentForm.assignment_reason} onChange={(value) => setAssignmentForm((current) => ({ ...current, assignment_reason: value }))} />
            <TextField label="Config profile reference" value={assignmentForm.config_profile_ref} onChange={(value) => setAssignmentForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <div className="salary-crud-list" aria-label="Employee salary assignment records">
            {setup.assignments.slice(0, 8).map((item) => (
              <button className="salary-crud-record" key={item.id} type="button" onClick={() => setAssignmentForm(assignmentToForm(item))}>
                <strong>{item.employee_name}</strong>
                <span>{item.structure_name} v{item.structure_version}</span>
              </button>
            ))}
          </div>
          <button className="button button--primary" disabled={submitting === "assignment" || !employeeOptions.length || !versionOptions.length} type="submit">
            {submitting === "assignment" ? "Saving..." : assignmentForm.id ? "Save assignment" : "Create assignment"}
          </button>
        </form>
      </div>
    </section>
  );
}
