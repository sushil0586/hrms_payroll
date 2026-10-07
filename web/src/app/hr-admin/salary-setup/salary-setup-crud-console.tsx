"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import type {
  HrAdminEmployeeSalaryAssignment,
  HrAdminSalaryComponent,
  HrAdminSalarySetupResponse,
  HrAdminSalaryStructure,
  HrAdminSalaryStructureComponent,
  HrAdminSalaryStructureVersion,
} from "@/lib/types";

import { SetupRecordList } from "../payroll-shared/setup-record-list";

type SaveMode = "create" | "edit";
type ConfigFamily = "component" | "structure" | "version" | "line" | "assignment";
type SalaryActionTab = "import" | ConfigFamily;
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

type AssignmentImportStatus = "ready" | "blocked" | "created" | "failed";

type AssignmentImportRow = {
  index: number;
  source: Record<string, string>;
  payload: Record<string, unknown> | null;
  status: AssignmentImportStatus;
  message: string;
};

const assignmentImportHeaders = [
  "employee_code",
  "structure_name",
  "structure_version",
  "effective_from",
  "effective_to",
  "status",
  "annual_ctc_override",
  "assignment_reason",
  "config_profile_ref",
];

const familyLabels: Record<ConfigFamily, string> = {
  component: "salary component",
  structure: "salary structure",
  version: "structure version",
  line: "component line",
  assignment: "employee salary assignment",
};

const actionTabs: Array<{ key: SalaryActionTab; label: string; detail: string; anchors: string[] }> = [
  { key: "import", label: "Import", detail: "Bulk salary assignments", anchors: ["salary-assignment-import-workbench"] },
  { key: "component", label: "Components", detail: "Earnings and deduction catalog", anchors: ["salary-component-form"] },
  { key: "structure", label: "Structures", detail: "Salary plan containers", anchors: ["salary-structure-form"] },
  { key: "version", label: "Versions", detail: "Effective dated CTC versions", anchors: ["salary-version-form"] },
  { key: "line", label: "Lines", detail: "Component amounts and formulas", anchors: ["salary-line-form"] },
  { key: "assignment", label: "Assignments", detail: "Employee salary coverage", anchors: ["salary-assignment-form"] },
];

const actionGuidance: Record<
  SalaryActionTab,
  {
    title: string;
    summary: string;
    primaryStatLabel: string;
    secondaryStatLabel: string;
    emptyLabel: string;
    guardrails: string[];
  }
> = {
  import: {
    title: "Load salary coverage in bulk, then review exceptions.",
    summary: "Use import when many employees need salary structure assignments. Preview first, commit only clean rows, and keep blocked rows visible for correction.",
    primaryStatLabel: "Assignments",
    secondaryStatLabel: "Ready rows",
    emptyLabel: "No salary assignments yet",
    guardrails: ["Use employee codes from the People master.", "Match structure name and version exactly.", "Commit only rows marked ready."],
  },
  component: {
    title: "Define the salary components that appear in structures and payslips.",
    summary: "Components describe earnings, deductions, formulas, tax treatment, rounding, and payslip visibility before they are used in salary structures.",
    primaryStatLabel: "Components",
    secondaryStatLabel: "Active",
    emptyLabel: "No salary components yet",
    guardrails: ["Use stable component codes.", "Confirm tax and prorate flags before activation.", "Map statutory and accounting references where required."],
  },
  structure: {
    title: "Create reusable salary plans for pay groups.",
    summary: "Structures group versions and lines. Keep the structure name business-readable so HR can choose the right plan during assignment.",
    primaryStatLabel: "Structures",
    secondaryStatLabel: "Active",
    emptyLabel: "No salary structures yet",
    guardrails: ["Attach to a pay group only when the structure is group-specific.", "Keep currency aligned to payroll.", "Activate only launch-ready structures."],
  },
  version: {
    title: "Control effective-dated CTC versions.",
    summary: "Versions let salary structures change over time without overwriting history. Use dates carefully because payroll snapshots depend on them.",
    primaryStatLabel: "Versions",
    secondaryStatLabel: "Active",
    emptyLabel: "No salary versions yet",
    guardrails: ["Avoid overlapping effective windows.", "Keep annual CTC realistic for the structure.", "Use draft until all component lines are ready."],
  },
  line: {
    title: "Build the component mix inside each salary version.",
    summary: "Lines define the amount, percentage, formula, and display order for each component in a salary structure version.",
    primaryStatLabel: "Lines",
    secondaryStatLabel: "Active",
    emptyLabel: "No component lines yet",
    guardrails: ["Choose either fixed amount, percentage, or formula intentionally.", "Keep display order payslip-friendly.", "Disable lines instead of deleting payroll history."],
  },
  assignment: {
    title: "Assign employees to the correct salary version.",
    summary: "Assignments make employees eligible for payroll calculations. Effective dates preserve transfer, increment, and correction history.",
    primaryStatLabel: "Assignments",
    secondaryStatLabel: "Employees covered",
    emptyLabel: "No employee assignments yet",
    guardrails: ["Use active employees in scope.", "Select an active structure version for live payroll.", "Record a clear assignment reason for audit."],
  },
};

function actionTabFromHash(hash: string): SalaryActionTab {
  const normalized = hash.replace(/^#/, "");
  return actionTabs.find((tab) => tab.anchors.includes(normalized))?.key ?? "import";
}

function ActionTabs({
  activeTab,
  onChange,
}: {
  activeTab: SalaryActionTab;
  onChange: (tab: SalaryActionTab) => void;
}) {
  return (
    <nav aria-label="Salary setup action groups" className="setup-action-tabs">
      {actionTabs.map((tab) => (
        <button
          aria-current={activeTab === tab.key ? "page" : undefined}
          className={`setup-action-tab${activeTab === tab.key ? " setup-action-tab--active" : ""}`}
          key={tab.key}
          type="button"
          onClick={() => {
            onChange(tab.key);
            window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${tab.anchors[0]}`);
          }}
        >
          <strong>{tab.label}</strong>
          <span>{tab.detail}</span>
        </button>
      ))}
    </nav>
  );
}

function ActionFlowStrip({ activeTab }: { activeTab: SalaryActionTab }) {
  const label = actionTabs.find((tab) => tab.key === activeTab)?.label ?? "Setup";

  return (
    <div className="setup-action-flow" role="region" aria-label={`${label} workflow`}>
      <div>
        <span>1</span>
        <strong>Select area</strong>
      </div>
      <div>
        <span>2</span>
        <strong>Fill required fields</strong>
      </div>
      <div>
        <span>3</span>
        <strong>Save and reuse</strong>
      </div>
    </div>
  );
}

function DependencyNotice({ children }: { children: ReactNode }) {
  return (
    <div className="notice notice--soft" role="note">
      <strong>Before creating</strong>
      <span className="muted">{children}</span>
    </div>
  );
}

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

function isCurrencyCode(value: string) {
  return /^[A-Z]{3}$/.test(value.trim());
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

function isNumberAtLeast(value: string, min: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min;
}

function isWholeNumberAtLeast(value: string, min: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min;
}

function validateDateWindow(from: string, to: string, label: string) {
  if (!isIsoDate(from)) {
    return `${label} effective from must be a valid date.`;
  }
  if (to && !isIsoDate(to)) {
    return `${label} effective to must be a valid date.`;
  }
  if (to && to < from) {
    return `${label} effective to cannot be earlier than effective from.`;
  }
  return "";
}

function assignmentTemplateCsv() {
  return `${assignmentImportHeaders.join(",")}\n`;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"" && inQuotes && nextChar === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseAssignmentCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], error: "CSV must include a header row and at least one salary assignment row." };
  }

  const parsedHeaders = splitCsvLine(lines[0]);
  const missingHeaders = assignmentImportHeaders.filter((header) => !parsedHeaders.includes(header));
  if (missingHeaders.length) {
    return { rows: [], error: `CSV is missing required columns: ${missingHeaders.join(", ")}.` };
  }

  return {
    rows: lines.slice(1).map((line) => {
      const values = splitCsvLine(line);
      return Object.fromEntries(parsedHeaders.map((header, index) => [header, values[index] ?? ""]));
    }),
    error: "",
  };
}

function escapeCsv(value: string) {
  return value.includes(",") || value.includes("\"") ? `"${value.replaceAll("\"", "\"\"")}"` : value;
}

function assignmentSampleCsv(setup: HrAdminSalarySetupResponse) {
  const employee = setup.options.employees[0];
  const version = setup.versions[0];
  const row = [
    employee?.employee_code ?? "",
    version?.structure_name ?? "",
    version ? String(version.version) : "",
    "2026-04-01",
    "",
    setup.options.config_statuses.find((item) => item.value === "active")?.value ?? setup.options.config_statuses[0]?.value ?? "active",
    "1200000",
    "Bulk salary assignment sample",
    "salary.assignment.bulk.profile.v1",
  ];
  return `${assignmentImportHeaders.join(",")}\n${row.map(escapeCsv).join(",")}`;
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

function FieldHint({ children, tone = "muted" }: { children: string; tone?: "muted" | "warning" }) {
  return <span className={`field-help-text${tone === "warning" ? " field-help-text--warning" : ""}`}>{children}</span>;
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  hint,
  tone = "muted",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  tone?: "muted" | "warning";
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
      {hint ? <FieldHint tone={tone}>{hint}</FieldHint> : null}
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

function ActionSidecar({
  activeTab,
  importReadyCount,
  setup,
}: {
  activeTab: SalaryActionTab;
  importReadyCount: number;
  setup: HrAdminSalarySetupResponse;
}) {
  const guidance = actionGuidance[activeTab];
  const activeLineCount = setup.structure_components.filter((item) => item.is_active).length;
  const stats: Record<SalaryActionTab, { primary: number; secondary: number; latest?: string }> = {
    import: {
      primary: setup.assignments.length,
      secondary: importReadyCount,
      latest: setup.assignments[0]?.employee_name,
    },
    component: {
      primary: setup.components.length,
      secondary: setup.summary.active_component_count,
      latest: setup.components[0]?.name,
    },
    structure: {
      primary: setup.structures.length,
      secondary: setup.summary.active_structure_count,
      latest: setup.structures[0]?.name,
    },
    version: {
      primary: setup.versions.length,
      secondary: setup.summary.active_version_count,
      latest: setup.versions[0]?.structure_name,
    },
    line: {
      primary: setup.structure_components.length,
      secondary: activeLineCount,
      latest: setup.structure_components[0]?.component_name,
    },
    assignment: {
      primary: setup.assignments.length,
      secondary: setup.summary.assigned_employee_count,
      latest: setup.assignments[0]?.employee_name,
    },
  };
  const activeStats = stats[activeTab];

  return (
    <aside className="setup-action-sidecar" aria-label={`${guidance.primaryStatLabel} guidance`}>
      <div className="setup-action-sidecar__hero">
        <span className="workspace-card__eyebrow">Setup guidance</span>
        <h3>{guidance.title}</h3>
        <p>{guidance.summary}</p>
      </div>

      <div className="setup-action-sidecar__stats" aria-label={`${guidance.primaryStatLabel} footprint`}>
        <div>
          <span>{guidance.primaryStatLabel}</span>
          <strong>{activeStats.primary}</strong>
        </div>
        <div>
          <span>{guidance.secondaryStatLabel}</span>
          <strong>{activeStats.secondary}</strong>
        </div>
      </div>

      <div className="setup-action-sidecar__section">
        <strong>Current record</strong>
        <span>{activeStats.latest ?? guidance.emptyLabel}</span>
      </div>

      <div className="setup-action-sidecar__section">
        <strong>Before saving</strong>
        <ul>
          {guidance.guardrails.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </aside>
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
  const [activeActionTab, setActiveActionTab] = useState<SalaryActionTab>("import");
  const [componentForm, setComponentForm] = useState<ComponentForm>(() => emptyComponentForm(initialSetup));
  const [structureForm, setStructureForm] = useState<StructureForm>(() => emptyStructureForm(initialSetup));
  const [versionForm, setVersionForm] = useState<VersionForm>(() => emptyVersionForm(initialSetup));
  const [lineForm, setLineForm] = useState<LineForm>(() => emptyLineForm(initialSetup));
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(() => emptyAssignmentForm(initialSetup));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState<ConfigFamily | null>(null);
  const [assignmentCsvText, setAssignmentCsvText] = useState(assignmentTemplateCsv());
  const [assignmentImportRows, setAssignmentImportRows] = useState<AssignmentImportRow[]>([]);
  const [assignmentImportMessage, setAssignmentImportMessage] = useState("");
  const [assignmentImportTone, setAssignmentImportTone] = useState<"error" | "success">("success");
  const [isAssignmentImportCommitting, setIsAssignmentImportCommitting] = useState(false);
  const [recordPages, setRecordPages] = useState<Record<ConfigFamily, number>>({
    component: 1,
    structure: 1,
    version: 1,
    line: 1,
    assignment: 1,
  });

  useEffect(() => {
    function syncFromHash() {
      setActiveActionTab(actionTabFromHash(window.location.hash));
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

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
  const selectedStructurePayGroup = useMemo(
    () => setup.options.pay_groups.find((item) => item.id === structureForm.pay_group_id),
    [setup.options.pay_groups, structureForm.pay_group_id],
  );
  const selectedVersionStructure = useMemo(
    () => setup.structures.find((item) => item.id === versionForm.structure_id),
    [setup.structures, versionForm.structure_id],
  );
  const selectedAssignmentVersion = useMemo(
    () => setup.versions.find((item) => item.id === assignmentForm.structure_version_id),
    [assignmentForm.structure_version_id, setup.versions],
  );
  const structurePayGroupWarning =
    selectedStructurePayGroup && selectedStructurePayGroup.status !== "active" ? "Selected pay group is not active yet." : "";
  const versionStructureWarning =
    selectedVersionStructure && selectedVersionStructure.status !== "active" ? "Selected salary structure is not active yet." : "";
  const assignmentVersionWarning =
    selectedAssignmentVersion && selectedAssignmentVersion.status !== "active" ? "Selected structure version is not active yet." : "";
  const assignmentImportReadyCount = assignmentImportRows.filter((row) => row.status === "ready").length;

  function setRecordPage(tab: ConfigFamily, page: number) {
    setRecordPages((current) => ({ ...current, [tab]: Math.max(1, page) }));
  }

  function reportValidation(family: ConfigFamily, message: string) {
    setFeedback({ family, tone: "error", message });
    return false;
  }

  function validateComponent() {
    if (componentForm.value_type === "formula" && !componentForm.formula_ref.trim()) {
      return reportValidation("component", "Formula reference is required when value type is formula.");
    }
    if (!componentForm.payslip_visibility.trim()) {
      return reportValidation("component", "Payslip visibility must be set before saving a salary component.");
    }
    return true;
  }

  function validateStructure() {
    if (!isCurrencyCode(structureForm.currency_code)) {
      return reportValidation("structure", "Currency code must be a 3-letter ISO code such as INR.");
    }
    return true;
  }

  function validateVersion() {
    if (!versionForm.structure_id) {
      return reportValidation("version", "Select a salary structure before creating a version.");
    }
    if (!isWholeNumberAtLeast(versionForm.version, 1)) {
      return reportValidation("version", "Version must be a whole number greater than or equal to 1.");
    }
    const dateError = validateDateWindow(versionForm.effective_from, versionForm.effective_to, "Version");
    if (dateError) {
      return reportValidation("version", dateError);
    }
    if (!isNumberAtLeast(versionForm.annual_ctc, 0)) {
      return reportValidation("version", "Annual CTC must be zero or a positive amount.");
    }
    if (!isCurrencyCode(versionForm.currency_code)) {
      return reportValidation("version", "Currency code must be a 3-letter ISO code such as INR.");
    }
    return true;
  }

  function validateLine() {
    if (!lineForm.structure_version_id || !lineForm.component_id) {
      return reportValidation("line", "Select both a structure version and a salary component before saving the line.");
    }
    if (!isWholeNumberAtLeast(lineForm.display_order, 1)) {
      return reportValidation("line", "Display order must be a whole number greater than or equal to 1.");
    }
    if (lineForm.amount && !isNumberAtLeast(lineForm.amount, 0)) {
      return reportValidation("line", "Amount must be zero or a positive amount.");
    }
    if (lineForm.percentage && (!isNumberAtLeast(lineForm.percentage, 0) || Number(lineForm.percentage) > 100)) {
      return reportValidation("line", "Percentage must be between 0 and 100.");
    }
    if (!lineForm.amount.trim() && !lineForm.percentage.trim() && !lineForm.formula_ref.trim()) {
      return reportValidation("line", "Set an amount, percentage, or formula reference before saving a component line.");
    }
    return true;
  }

  function validateAssignment() {
    if (!assignmentForm.employee_id || !assignmentForm.structure_version_id) {
      return reportValidation("assignment", "Select both an employee and a structure version before saving the assignment.");
    }
    const dateError = validateDateWindow(assignmentForm.effective_from, assignmentForm.effective_to, "Assignment");
    if (dateError) {
      return reportValidation("assignment", dateError);
    }
    if (assignmentForm.annual_ctc_override && !isNumberAtLeast(assignmentForm.annual_ctc_override, 0)) {
      return reportValidation("assignment", "Annual CTC override must be zero or a positive amount.");
    }
    if (assignmentForm.status === "active" && !assignmentForm.assignment_reason.trim()) {
      return reportValidation("assignment", "Assignment reason is required before activating employee salary coverage.");
    }
    return true;
  }

  function buildAssignmentImportRow(row: Record<string, string>, index: number, batchKeys: Set<string>): AssignmentImportRow {
    const errors: string[] = [];
    const employeeCode = row.employee_code.trim();
    const structureName = row.structure_name.trim();
    const versionNumber = Number(row.structure_version.trim());
    const status = row.status.trim() || "active";
    const employee = setup.options.employees.find((item) => item.employee_code.toLowerCase() === employeeCode.toLowerCase());
    const version = setup.versions.find(
      (item) => item.structure_name.toLowerCase() === structureName.toLowerCase() && item.version === versionNumber,
    );
    const key = `${employeeCode.toLowerCase()}::${structureName.toLowerCase()}::${row.structure_version.trim()}::${row.effective_from.trim()}`;

    if (!employeeCode) {
      errors.push("Employee code is required.");
    }
    if (!employee) {
      errors.push("Employee code must match an active employee option.");
    }
    if (!structureName) {
      errors.push("Structure name is required.");
    }
    if (!version || !Number.isFinite(versionNumber)) {
      errors.push("Structure name and version must match an available salary structure version.");
    }
    if (!row.effective_from.trim()) {
      errors.push("Effective from is required.");
    } else if (!isIsoDate(row.effective_from.trim())) {
      errors.push("Effective from must be a valid date.");
    }
    if (row.effective_to.trim() && !isIsoDate(row.effective_to.trim())) {
      errors.push("Effective to must be a valid date.");
    }
    if (row.effective_to.trim() && row.effective_to.trim() < row.effective_from.trim()) {
      errors.push("Effective to cannot be earlier than effective from.");
    }
    if (row.annual_ctc_override.trim() && !isNumberAtLeast(row.annual_ctc_override.trim(), 0)) {
      errors.push("Annual CTC override must be zero or a positive amount.");
    }
    if (status === "active" && !row.assignment_reason.trim()) {
      errors.push("Assignment reason is required before activating employee salary coverage.");
    }
    if (!setup.options.config_statuses.some((item) => item.value === status)) {
      errors.push("Status must match an available status value.");
    }
    if (batchKeys.has(key)) {
      errors.push("Duplicate assignment row exists in this import batch.");
    }
    if (employeeCode && structureName && row.structure_version.trim() && row.effective_from.trim()) {
      batchKeys.add(key);
    }

    return {
      index,
      source: row,
      payload: errors.length || !employee || !version
        ? null
        : {
            employee_id: employee.id,
            structure_version_id: version.id,
            effective_from: row.effective_from.trim(),
            effective_to: nullable(row.effective_to),
            status,
            annual_ctc_override: nullable(row.annual_ctc_override),
            assignment_reason: row.assignment_reason.trim(),
            config_snapshot: makeSnapshot(row.config_profile_ref),
          },
      status: errors.length ? "blocked" : "ready",
      message: errors.join(" "),
    };
  }

  function previewAssignmentImport() {
    const parsed = parseAssignmentCsv(assignmentCsvText);
    if (parsed.error) {
      setAssignmentImportRows([]);
      setAssignmentImportMessage(parsed.error);
      setAssignmentImportTone("error");
      return;
    }

    const batchKeys = new Set<string>();
    const rows = parsed.rows.map((row, index) => buildAssignmentImportRow(row, index + 1, batchKeys));
    setAssignmentImportRows(rows);
    setAssignmentImportTone(rows.some((row) => row.status === "blocked") ? "error" : "success");
    setAssignmentImportMessage(rows.some((row) => row.status === "blocked") ? "Preview found blocked rows. Fix the highlighted salary assignment rows before committing." : "Preview ready. Review blocked rows before committing.");
  }

  async function commitAssignmentImport() {
    setIsAssignmentImportCommitting(true);
    const nextRows = [...assignmentImportRows];

    for (let index = 0; index < nextRows.length; index += 1) {
      const row = nextRows[index];
      if (row.status !== "ready" || !row.payload) {
        continue;
      }

      const response = await fetch("/api/hr-admin/employee-salary-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row.payload),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        applyAssignment(payload as HrAdminEmployeeSalaryAssignment);
      }
      nextRows[index] = {
        ...row,
        status: response.ok ? "created" : "failed",
        message: response.ok ? "Created successfully." : getErrorMessage(payload, "Create failed."),
      };
      setAssignmentImportRows([...nextRows]);
    }

    setIsAssignmentImportCommitting(false);
    setAssignmentImportTone("success");
    setAssignmentImportMessage("Commit complete. Review employee salary coverage for created assignments.");
    router.refresh();
  }

  async function save<Item extends ApiItem>(
    family: ConfigFamily,
    path: string,
    itemId: string | undefined,
    body: Record<string, unknown>,
    apply: (item: Item) => void,
  ) {
    setSubmitting(family);
    setFeedback(null);

    let response: Response;
    try {
      response = await fetch(itemId ? `/api/hr-admin/${path}/${itemId}` : `/api/hr-admin/${path}`, {
        method: itemId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      setSubmitting(null);
      setFeedback({ family, tone: "error", message: `Network connection failed while saving ${familyLabels[family]}. Please retry.` });
      return;
    }

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
    <section
      className="section section--tight salary-crud-console"
      data-active-action={activeActionTab}
      aria-labelledby="salary-crud-console-title"
    >
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Browser CRUD</span>
          <h2 id="salary-crud-console-title">Salary setup controls</h2>
        </div>
        <span className="payroll-setup-count">{setup.components.length + setup.structures.length + setup.versions.length + setup.structure_components.length + setup.assignments.length} records</span>
      </div>

      {feedback ? (
        <div className={`notice ${feedback.tone === "success" ? "notice--success" : "notice--error"}`} role={feedback.tone === "success" ? "status" : "alert"}>
          <strong>{feedback.tone === "success" ? "Saved successfully." : "Save failed."}</strong>
          <span className="muted">{feedback.message}</span>
        </div>
      ) : null}

      <ActionTabs activeTab={activeActionTab} onChange={setActiveActionTab} />

      <div className="setup-action-context">
        <div>
          <strong>{actionTabs.find((tab) => tab.key === activeActionTab)?.label}</strong>
          <span>{actionTabs.find((tab) => tab.key === activeActionTab)?.detail}</span>
        </div>
        <span>{setup.components.length && setup.structures.length ? "Ready for salary setup changes" : "Create components and structures first"}</span>
      </div>

      <ActionFlowStrip activeTab={activeActionTab} />

      {activeActionTab === "import" ? (
      <div className="salary-crud-grid setup-action-panel salary-action-import-panel">
      <article className="salary-crud-form salary-import-workbench" data-testid="salary-assignment-import-workbench" id="salary-assignment-import-workbench">
        <div className="salary-crud-form__header">
          <div>
            <span className="workspace-card__eyebrow">Bulk onboarding</span>
            <h3>Salary assignment import</h3>
          </div>
          <span className="queue-summary-chip">
            <strong>{assignmentImportReadyCount}</strong> ready
          </span>
        </div>
        {!versionOptions.length || !employeeOptions.length ? (
          <DependencyNotice>
            {[
              !versionOptions.length ? "Create salary versions" : "",
              !employeeOptions.length ? "add active employees" : "",
            ].filter(Boolean).join(" and ")} before importing salary assignments.
          </DependencyNotice>
        ) : null}
        <div className="organization-import-grid">
          <label className="form-field">
            <span className="muted">CSV data</span>
            <textarea className="input-control organization-import-textarea" value={assignmentCsvText} onChange={(event) => setAssignmentCsvText(event.target.value)} />
          </label>
          <div className="organization-import-actions">
            <button className="button button--secondary" type="button" onClick={() => setAssignmentCsvText(assignmentSampleCsv(setup))}>
              Load sample template
            </button>
            <button className="button button--secondary" type="button" onClick={() => navigator.clipboard.writeText(assignmentTemplateCsv())}>
              Copy template
            </button>
            <a className="button button--secondary" download="salary-assignment-import-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(assignmentTemplateCsv())}`}>
              Download template
            </a>
            <label className="button button--secondary">
              <span>Upload CSV</span>
              <input
                className="sr-only"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }
                  file.text().then(setAssignmentCsvText);
                }}
              />
            </label>
            <button className="button button--primary" type="button" onClick={previewAssignmentImport}>
              Preview import
            </button>
            <button className="button button--primary" type="button" disabled={!assignmentImportReadyCount || isAssignmentImportCommitting} onClick={commitAssignmentImport}>
              {isAssignmentImportCommitting ? "Committing..." : "Commit ready rows"}
            </button>
          </div>
        </div>
        {assignmentImportMessage ? (
          <div className={`notice ${assignmentImportTone === "error" ? "notice--error" : "notice--success"}`} role={assignmentImportTone === "error" ? "alert" : "status"}>
            {assignmentImportMessage}
          </div>
        ) : null}
        {assignmentImportRows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Employee</th>
                  <th>Structure</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {assignmentImportRows.map((row) => (
                  <tr key={`${row.index}-${row.source.employee_code}`}>
                    <td>{row.index}</td>
                    <td>{row.source.employee_code || "Missing employee"}</td>
                    <td>{row.source.structure_name || "Missing structure"} v{row.source.structure_version || "?"}</td>
                    <td><span className="readiness-badge">{row.status}</span></td>
                    <td>{row.message || "Valid for import"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
      <ActionSidecar activeTab={activeActionTab} importReadyCount={assignmentImportReadyCount} setup={setup} />
      </div>
      ) : null}

      {activeActionTab !== "import" ? (
      <div className="salary-crud-grid setup-action-panel">
        {activeActionTab === "component" ? (
        <form
          aria-label="Salary component form"
          className="salary-crud-form"
          data-testid="salary-component-form"
          id="salary-component-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!validateComponent()) {
              return;
            }
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
          <SetupRecordList
            activeId={componentForm.id}
            emptyLabel="No salary components yet"
            items={setup.components}
            label="Salary component records"
            page={recordPages.component}
            renderPrimary={(item) => item.name}
            renderSecondary={(item) => item.code}
            onPageChange={(page) => setRecordPage("component", page)}
            onSelect={(item) => setComponentForm(componentToForm(item))}
          />
          <div className="salary-crud-form__actions">
            <button className="button button--primary" disabled={submitting === "component"} type="submit">
              {submitting === "component" ? "Saving..." : componentForm.id ? "Save component" : "Create component"}
            </button>
          </div>
        </form>
        ) : null}

        {activeActionTab === "structure" ? (
        <form
          aria-label="Salary structure form"
          className="salary-crud-form"
          data-testid="salary-structure-form"
          id="salary-structure-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!validateStructure()) {
              return;
            }
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
              hint={structurePayGroupWarning}
              tone={structurePayGroupWarning ? "warning" : "muted"}
              onChange={(value) => setStructureForm((current) => ({ ...current, pay_group_id: value }))}
            />
            <TextField label="Currency code" required value={structureForm.currency_code} onChange={(value) => setStructureForm((current) => ({ ...current, currency_code: value.toUpperCase().slice(0, 3) }))} />
            <SelectField label="Status" required value={structureForm.status} options={statusOptions} onChange={(value) => setStructureForm((current) => ({ ...current, status: value }))} />
            <TextField label="Description" value={structureForm.description} onChange={(value) => setStructureForm((current) => ({ ...current, description: value }))} />
            <TextField label="Config profile reference" value={structureForm.config_profile_ref} onChange={(value) => setStructureForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <SetupRecordList
            activeId={structureForm.id}
            emptyLabel="No salary structures yet"
            items={setup.structures}
            label="Salary structure records"
            page={recordPages.structure}
            renderPrimary={(item) => item.name}
            renderSecondary={(item) => item.code}
            onPageChange={(page) => setRecordPage("structure", page)}
            onSelect={(item) => setStructureForm(structureToForm(item))}
          />
          <div className="salary-crud-form__actions">
            <button className="button button--primary" disabled={submitting === "structure"} type="submit">
              {submitting === "structure" ? "Saving..." : structureForm.id ? "Save structure" : "Create structure"}
            </button>
          </div>
        </form>
        ) : null}

        {activeActionTab === "version" ? (
        <form
          aria-label="Salary structure version form"
          className="salary-crud-form"
          data-testid="salary-version-form"
          id="salary-version-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!validateVersion()) {
              return;
            }
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
          {!structureOptions.length ? (
            <DependencyNotice>Create a salary structure before adding effective-dated versions.</DependencyNotice>
          ) : null}
          <div className="form-grid salary-crud-form-grid">
            <SelectField
              label="Structure"
              required
              value={versionForm.structure_id}
              options={structureOptions}
              hint={versionStructureWarning}
              tone={versionStructureWarning ? "warning" : "muted"}
              onChange={(value) => setVersionForm((current) => ({ ...current, structure_id: value }))}
            />
            <TextField label="Version" required type="number" value={versionForm.version} onChange={(value) => setVersionForm((current) => ({ ...current, version: value }))} />
            <TextField label="Effective from" required type="date" value={versionForm.effective_from} onChange={(value) => setVersionForm((current) => ({ ...current, effective_from: value }))} />
            <TextField label="Effective to" type="date" value={versionForm.effective_to} onChange={(value) => setVersionForm((current) => ({ ...current, effective_to: value }))} />
            <TextField label="Annual CTC" required type="number" value={versionForm.annual_ctc} onChange={(value) => setVersionForm((current) => ({ ...current, annual_ctc: value }))} />
            <TextField label="Currency code" required value={versionForm.currency_code} onChange={(value) => setVersionForm((current) => ({ ...current, currency_code: value.toUpperCase().slice(0, 3) }))} />
            <SelectField label="Status" required value={versionForm.status} options={statusOptions} onChange={(value) => setVersionForm((current) => ({ ...current, status: value }))} />
            <TextField label="Config profile reference" value={versionForm.config_profile_ref} onChange={(value) => setVersionForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <SetupRecordList
            activeId={versionForm.id}
            emptyLabel="No salary versions yet"
            items={setup.versions}
            label="Salary structure version records"
            page={recordPages.version}
            renderPrimary={(item) => item.structure_name}
            renderSecondary={(item) => `Version ${item.version}`}
            onPageChange={(page) => setRecordPage("version", page)}
            onSelect={(item) => setVersionForm(versionToForm(item))}
          />
          <div className="salary-crud-form__actions">
            <button className="button button--primary" disabled={submitting === "version" || !structureOptions.length} type="submit">
              {submitting === "version" ? "Saving..." : versionForm.id ? "Save version" : "Create version"}
            </button>
          </div>
        </form>
        ) : null}

        {activeActionTab === "line" ? (
        <form
          aria-label="Salary structure component line form"
          className="salary-crud-form"
          data-testid="salary-line-form"
          id="salary-line-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!validateLine()) {
              return;
            }
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
          {!versionOptions.length ? (
            <DependencyNotice>Create a salary structure version before adding component lines.</DependencyNotice>
          ) : null}
          {versionOptions.length && !componentOptions.length ? (
            <DependencyNotice>Create salary components before adding lines to a structure version.</DependencyNotice>
          ) : null}
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
          <SetupRecordList
            activeId={lineForm.id}
            emptyLabel="No component lines yet"
            items={setup.structure_components}
            label="Salary component line records"
            page={recordPages.line}
            renderPrimary={(item) => item.component_name}
            renderSecondary={(item) => item.structure_name}
            onPageChange={(page) => setRecordPage("line", page)}
            onSelect={(item) => setLineForm(lineToForm(item))}
          />
          <div className="salary-crud-form__actions">
            <button className="button button--primary" disabled={submitting === "line" || !versionOptions.length || !componentOptions.length} type="submit">
              {submitting === "line" ? "Saving..." : lineForm.id ? "Save component line" : "Create component line"}
            </button>
          </div>
        </form>
        ) : null}

        {activeActionTab === "assignment" ? (
        <form
          aria-label="Employee salary assignment form"
          className="salary-crud-form"
          data-testid="salary-assignment-form"
          id="salary-assignment-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!validateAssignment()) {
              return;
            }
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
          {!versionOptions.length ? (
            <DependencyNotice>Create an active salary version before assigning employees.</DependencyNotice>
          ) : null}
          {versionOptions.length && !employeeOptions.length ? (
            <DependencyNotice>Add active employees before creating salary assignments.</DependencyNotice>
          ) : null}
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Employee" required value={assignmentForm.employee_id} options={employeeOptions} onChange={(value) => setAssignmentForm((current) => ({ ...current, employee_id: value }))} />
            <SelectField
              label="Structure version"
              required
              value={assignmentForm.structure_version_id}
              options={versionOptions}
              hint={assignmentVersionWarning}
              tone={assignmentVersionWarning ? "warning" : "muted"}
              onChange={(value) => setAssignmentForm((current) => ({ ...current, structure_version_id: value }))}
            />
            <TextField label="Effective from" required type="date" value={assignmentForm.effective_from} onChange={(value) => setAssignmentForm((current) => ({ ...current, effective_from: value }))} />
            <TextField label="Effective to" type="date" value={assignmentForm.effective_to} onChange={(value) => setAssignmentForm((current) => ({ ...current, effective_to: value }))} />
            <SelectField label="Status" required value={assignmentForm.status} options={statusOptions} onChange={(value) => setAssignmentForm((current) => ({ ...current, status: value }))} />
            <TextField label="Annual CTC override" type="number" value={assignmentForm.annual_ctc_override} onChange={(value) => setAssignmentForm((current) => ({ ...current, annual_ctc_override: value }))} />
            <TextField label="Assignment reason" value={assignmentForm.assignment_reason} onChange={(value) => setAssignmentForm((current) => ({ ...current, assignment_reason: value }))} />
            <TextField label="Config profile reference" value={assignmentForm.config_profile_ref} onChange={(value) => setAssignmentForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <SetupRecordList
            activeId={assignmentForm.id}
            emptyLabel="No employee assignments yet"
            items={setup.assignments}
            label="Employee salary assignment records"
            page={recordPages.assignment}
            renderPrimary={(item) => item.employee_name}
            renderSecondary={(item) => `${item.structure_name} v${item.structure_version}`}
            onPageChange={(page) => setRecordPage("assignment", page)}
            onSelect={(item) => setAssignmentForm(assignmentToForm(item))}
          />
          <div className="salary-crud-form__actions">
            <button className="button button--primary" disabled={submitting === "assignment" || !employeeOptions.length || !versionOptions.length} type="submit">
              {submitting === "assignment" ? "Saving..." : assignmentForm.id ? "Save assignment" : "Create assignment"}
            </button>
          </div>
        </form>
        ) : null}
        <ActionSidecar activeTab={activeActionTab} importReadyCount={assignmentImportReadyCount} setup={setup} />
      </div>
      ) : null}
    </section>
  );
}
