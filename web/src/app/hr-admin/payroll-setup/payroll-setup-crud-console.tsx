"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  HrAdminPayGroup,
  HrAdminPayGroupAssignment,
  HrAdminPayrollCalendar,
  HrAdminPayrollPeriod,
  HrAdminPayrollSetupResponse,
} from "@/lib/types";

import { SetupRecordList } from "../payroll-shared/setup-record-list";

type SaveMode = "create" | "edit";
type ConfigFamily = "calendar" | "period" | "payGroup" | "assignment";
type PayrollActionTab = ConfigFamily;
type ApiItem = HrAdminPayrollCalendar | HrAdminPayrollPeriod | HrAdminPayGroup | HrAdminPayGroupAssignment;

type CalendarForm = {
  id?: string;
  code: string;
  name: string;
  frequency: string;
  timezone: string;
  currency_code: string;
  period_start_day: string;
  is_active: boolean;
  config_profile_ref: string;
};

type PeriodForm = {
  id?: string;
  calendar_id: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  pay_date: string;
  status: string;
  config_profile_ref: string;
};

type PayGroupForm = {
  id?: string;
  calendar_id: string;
  code: string;
  name: string;
  status: string;
  default_currency_code: string;
  legal_entity_id: string;
  branch_id: string;
  location_id: string;
  department_id: string;
  employment_type_id: string;
  config_profile_ref: string;
};

type AssignmentForm = {
  id?: string;
  pay_group_id: string;
  employee_id: string;
  effective_from: string;
  effective_to: string;
  status: string;
  config_profile_ref: string;
};

type Feedback = {
  family: ConfigFamily;
  tone: "success" | "error";
  message: string;
} | null;

const familyLabels: Record<ConfigFamily, string> = {
  calendar: "payroll calendar",
  period: "payroll period",
  payGroup: "pay group",
  assignment: "pay group assignment",
};

const actionTabs: Array<{ key: PayrollActionTab; label: string; detail: string; anchors: string[] }> = [
  { key: "calendar", label: "Calendars", detail: "Payroll year and frequency", anchors: ["payroll-calendar-form"] },
  { key: "period", label: "Periods", detail: "Monthly payroll windows", anchors: ["payroll-period-form"] },
  { key: "payGroup", label: "Pay groups", detail: "Employee payroll cohorts", anchors: ["pay-group-form"] },
  { key: "assignment", label: "Assignments", detail: "Employee group mapping", anchors: ["pay-group-assignment-form"] },
];

const actionGuidance: Record<
  PayrollActionTab,
  {
    title: string;
    summary: string;
    primaryStatLabel: string;
    secondaryStatLabel: string;
    emptyLabel: string;
    guardrails: string[];
  }
> = {
  calendar: {
    title: "Create the payroll calendar once, then reuse it for every run.",
    summary: "Use calendars for frequency, currency, timezone, and period-start convention. Most tenants need only one active calendar per country payroll.",
    primaryStatLabel: "Calendars",
    secondaryStatLabel: "Active",
    emptyLabel: "No calendars yet",
    guardrails: ["Use stable codes such as IN-MONTHLY.", "Keep only launch-ready calendars active.", "Create periods after saving the calendar."],
  },
  period: {
    title: "Open clean payroll windows for calculation and close.",
    summary: "Periods define the date boundary and pay date. Keep draft periods editable, then open only the run that payroll teams are actively processing.",
    primaryStatLabel: "Periods",
    secondaryStatLabel: "Open",
    emptyLabel: "No periods yet",
    guardrails: ["Pick the correct calendar first.", "Dates should not overlap inside one calendar.", "Open one operational period at a time."],
  },
  payGroup: {
    title: "Group employees by payroll policy and operating scope.",
    summary: "Pay groups decide which employees are pulled into a run. Scope by legal entity, branch, location, department, or employment type only when needed.",
    primaryStatLabel: "Pay groups",
    secondaryStatLabel: "Active",
    emptyLabel: "No pay groups yet",
    guardrails: ["Start broad, then narrow only for real differences.", "Avoid duplicate groups for the same cohort.", "Use active groups for live payroll only."],
  },
  assignment: {
    title: "Attach employees to the right payroll group.",
    summary: "Assignments make employees eligible for a payroll run. Use effective dates so transfers and policy changes remain auditable.",
    primaryStatLabel: "Assignments",
    secondaryStatLabel: "Employees assigned",
    emptyLabel: "No assignments yet",
    guardrails: ["Assign only active employees in scope.", "Use effective dates for mid-cycle changes.", "Review unassigned employees before payroll lock."],
  },
};

function actionTabFromHash(hash: string): PayrollActionTab {
  const normalized = hash.replace(/^#/, "");
  return actionTabs.find((tab) => tab.anchors.includes(normalized))?.key ?? "calendar";
}

function ActionTabs({
  activeTab,
  onChange,
}: {
  activeTab: PayrollActionTab;
  onChange: (tab: PayrollActionTab) => void;
}) {
  return (
    <nav aria-label="Payroll setup action groups" className="setup-action-tabs">
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

function optionItems(items: { id: string; name: string }[], emptyLabel?: string) {
  const options = items.map((item) => ({ value: item.id, label: item.name }));
  return emptyLabel ? [{ value: "", label: emptyLabel }, ...options] : options;
}

function FieldHint({ children, tone = "muted" }: { children: string; tone?: "muted" | "warning" }) {
  return <span className={`field-help-text${tone === "warning" ? " field-help-text--warning" : ""}`}>{children}</span>;
}

function replaceOrAppend<Item extends { id: string }>(items: Item[], next: Item) {
  return items.some((item) => item.id === next.id)
    ? items.map((item) => (item.id === next.id ? next : item))
    : [next, ...items];
}

function emptyCalendarForm(setup: HrAdminPayrollSetupResponse): CalendarForm {
  return {
    code: "",
    name: "",
    frequency: setup.options.payroll_frequencies[0]?.value ?? "monthly",
    timezone: "Asia/Kolkata",
    currency_code: "INR",
    period_start_day: "1",
    is_active: true,
    config_profile_ref: "",
  };
}

function emptyPeriodForm(setup: HrAdminPayrollSetupResponse): PeriodForm {
  return {
    calendar_id: setup.calendars[0]?.id ?? "",
    code: "",
    name: "",
    start_date: "2026-04-01",
    end_date: "2026-04-30",
    pay_date: "2026-05-01",
    status: setup.options.payroll_period_statuses[0]?.value ?? "draft",
    config_profile_ref: "",
  };
}

function emptyPayGroupForm(setup: HrAdminPayrollSetupResponse): PayGroupForm {
  return {
    calendar_id: setup.calendars[0]?.id ?? "",
    code: "",
    name: "",
    status: setup.options.pay_group_statuses[0]?.value ?? "draft",
    default_currency_code: "INR",
    legal_entity_id: "",
    branch_id: "",
    location_id: "",
    department_id: "",
    employment_type_id: "",
    config_profile_ref: "",
  };
}

function emptyAssignmentForm(setup: HrAdminPayrollSetupResponse): AssignmentForm {
  return {
    pay_group_id: setup.pay_groups[0]?.id ?? "",
    employee_id: setup.options.employees[0]?.id ?? "",
    effective_from: "2026-04-01",
    effective_to: "2027-03-31",
    status: setup.options.pay_group_statuses.find((item) => item.value === "draft")?.value ?? setup.options.pay_group_statuses[0]?.value ?? "draft",
    config_profile_ref: "",
  };
}

function calendarToForm(item: HrAdminPayrollCalendar): CalendarForm {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    frequency: item.frequency,
    timezone: item.timezone,
    currency_code: item.currency_code,
    period_start_day: String(item.period_start_day),
    is_active: item.is_active,
    config_profile_ref: getConfigProfileRef(item.config_snapshot),
  };
}

function periodToForm(item: HrAdminPayrollPeriod): PeriodForm {
  return {
    id: item.id,
    calendar_id: item.calendar_id,
    code: item.code,
    name: item.name,
    start_date: item.start_date,
    end_date: item.end_date,
    pay_date: item.pay_date,
    status: item.status,
    config_profile_ref: getConfigProfileRef(item.config_snapshot),
  };
}

function payGroupToForm(item: HrAdminPayGroup): PayGroupForm {
  return {
    id: item.id,
    calendar_id: item.calendar_id,
    code: item.code,
    name: item.name,
    status: item.status,
    default_currency_code: item.default_currency_code,
    legal_entity_id: item.legal_entity_id ?? "",
    branch_id: item.branch_id ?? "",
    location_id: item.location_id ?? "",
    department_id: item.department_id ?? "",
    employment_type_id: item.employment_type_id ?? "",
    config_profile_ref: getConfigProfileRef(item.config_snapshot),
  };
}

function assignmentToForm(item: HrAdminPayGroupAssignment): AssignmentForm {
  return {
    id: item.id,
    pay_group_id: item.pay_group_id,
    employee_id: item.employee_id,
    effective_from: item.effective_from,
    effective_to: item.effective_to ?? "",
    status: item.status,
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
  disabled,
  hint,
  tone = "muted",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  tone?: "muted" | "warning";
}) {
  return (
    <label className="form-field">
      <span className="muted">{label}</span>
      <select className="input-control" disabled={disabled} required={required} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={`${label}-${option.value || "empty"}`} value={option.value}>
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

function ActionSidecar({ activeTab, setup }: { activeTab: PayrollActionTab; setup: HrAdminPayrollSetupResponse }) {
  const guidance = actionGuidance[activeTab];
  const stats: Record<PayrollActionTab, { primary: number; secondary: number; latest?: string }> = {
    calendar: {
      primary: setup.calendars.length,
      secondary: setup.summary.active_calendar_count,
      latest: setup.calendars[0]?.name,
    },
    period: {
      primary: setup.periods.length,
      secondary: setup.summary.open_period_count,
      latest: setup.periods[0]?.name,
    },
    payGroup: {
      primary: setup.pay_groups.length,
      secondary: setup.summary.active_pay_group_count,
      latest: setup.pay_groups[0]?.name,
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

function ActionFlowStrip({ activeTab }: { activeTab: PayrollActionTab }) {
  const label = actionTabs.find((tab) => tab.key === activeTab)?.label ?? "Setup";
  return (
    <div className="setup-action-flow" aria-label={`${label} workflow`}>
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

function DependencyNotice({ children }: { children: string }) {
  return (
    <div className="notice notice--soft" role="note">
      <strong>Before creating</strong>
      <span className="muted">{children}</span>
    </div>
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

export function PayrollSetupCrudConsole({ initialSetup }: { initialSetup: HrAdminPayrollSetupResponse }) {
  const router = useRouter();
  const [setup, setSetup] = useState(initialSetup);
  const [activeActionTab, setActiveActionTab] = useState<PayrollActionTab>("calendar");
  const [calendarForm, setCalendarForm] = useState<CalendarForm>(() => emptyCalendarForm(initialSetup));
  const [periodForm, setPeriodForm] = useState<PeriodForm>(() => emptyPeriodForm(initialSetup));
  const [payGroupForm, setPayGroupForm] = useState<PayGroupForm>(() => emptyPayGroupForm(initialSetup));
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(() => emptyAssignmentForm(initialSetup));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState<ConfigFamily | null>(null);
  const [recordPages, setRecordPages] = useState<Record<PayrollActionTab, number>>({
    calendar: 1,
    period: 1,
    payGroup: 1,
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

  const calendarOptions = useMemo(
    () => setup.calendars.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })),
    [setup.calendars],
  );
  const payGroupOptions = useMemo(
    () => setup.pay_groups.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })),
    [setup.pay_groups],
  );
  const employeeOptions = useMemo(
    () => setup.options.employees.map((item) => ({ value: item.id, label: `${item.name} (${item.employee_code})` })),
    [setup.options.employees],
  );
  const frequencyOptions = useMemo(
    () => setup.options.payroll_frequencies.map((item) => ({ value: item.value, label: item.label })),
    [setup.options.payroll_frequencies],
  );
  const periodStatusOptions = useMemo(
    () => setup.options.payroll_period_statuses.map((item) => ({ value: item.value, label: item.label })),
    [setup.options.payroll_period_statuses],
  );
  const payGroupStatusOptions = useMemo(
    () => setup.options.pay_group_statuses.map((item) => ({ value: item.value, label: item.label })),
    [setup.options.pay_group_statuses],
  );
  const scopedBranches = useMemo(
    () =>
      payGroupForm.legal_entity_id
        ? setup.options.branches.filter((item) => item.legal_entity_id === payGroupForm.legal_entity_id)
        : setup.options.branches,
    [payGroupForm.legal_entity_id, setup.options.branches],
  );
  const selectedBranch = useMemo(
    () => setup.options.branches.find((item) => item.id === payGroupForm.branch_id),
    [payGroupForm.branch_id, setup.options.branches],
  );
  const payGroupBranchWarning =
    payGroupForm.legal_entity_id && scopedBranches.length === 0 ? "No active branches are mapped to this legal entity." : "";
  const payGroupLocationHint =
    payGroupForm.branch_id && !selectedBranch?.location_id
      ? "This branch has no mapped location. Select a location manually when location scope is required."
      : "";

  function setRecordPage(tab: PayrollActionTab, page: number) {
    setRecordPages((current) => ({ ...current, [tab]: Math.max(1, page) }));
  }

  function updatePayGroupLegalEntity(value: string) {
    setPayGroupForm((current) => {
      const branchStillValid = current.branch_id
        ? setup.options.branches.some((item) => item.id === current.branch_id && (!value || item.legal_entity_id === value))
        : true;
      return {
        ...current,
        legal_entity_id: value,
        branch_id: branchStillValid ? current.branch_id : "",
        location_id: branchStillValid ? current.location_id : "",
      };
    });
  }

  function updatePayGroupBranch(value: string) {
    const branch = setup.options.branches.find((item) => item.id === value);
    setPayGroupForm((current) => ({
      ...current,
      branch_id: value,
      legal_entity_id: branch?.legal_entity_id ?? current.legal_entity_id,
      location_id: branch?.location_id ?? current.location_id,
    }));
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

  function applyCalendar(item: HrAdminPayrollCalendar) {
    setSetup((current) => ({
      ...current,
      calendars: replaceOrAppend(current.calendars, item),
      summary: {
        ...current.summary,
        calendar_count: current.calendars.some((calendar) => calendar.id === item.id) ? current.summary.calendar_count : current.summary.calendar_count + 1,
        active_calendar_count:
          !current.calendars.some((calendar) => calendar.id === item.id) && item.is_active
            ? current.summary.active_calendar_count + 1
            : current.summary.active_calendar_count,
      },
    }));
    setCalendarForm(calendarToForm(item));
    setPeriodForm((current) => ({ ...current, calendar_id: item.id }));
    setPayGroupForm((current) => ({ ...current, calendar_id: item.id, default_currency_code: item.currency_code }));
  }

  function applyPeriod(item: HrAdminPayrollPeriod) {
    setSetup((current) => ({
      ...current,
      periods: replaceOrAppend(current.periods, item),
      summary: {
        ...current.summary,
        open_period_count:
          !current.periods.some((period) => period.id === item.id) && item.status === "open"
            ? current.summary.open_period_count + 1
            : current.summary.open_period_count,
      },
    }));
    setPeriodForm(periodToForm(item));
  }

  function applyPayGroup(item: HrAdminPayGroup) {
    setSetup((current) => ({
      ...current,
      pay_groups: replaceOrAppend(current.pay_groups, item),
      summary: {
        ...current.summary,
        active_pay_group_count:
          !current.pay_groups.some((group) => group.id === item.id) && item.status === "active"
            ? current.summary.active_pay_group_count + 1
            : current.summary.active_pay_group_count,
      },
    }));
    setPayGroupForm(payGroupToForm(item));
    setAssignmentForm((current) => ({ ...current, pay_group_id: item.id }));
  }

  function applyAssignment(item: HrAdminPayGroupAssignment) {
    setSetup((current) => ({
      ...current,
      assignments: replaceOrAppend(current.assignments, item),
      summary: {
        ...current.summary,
        assigned_employee_count:
          !current.assignments.some((assignment) => assignment.id === item.id) && item.status === "active"
            ? current.summary.assigned_employee_count + 1
            : current.summary.assigned_employee_count,
      },
    }));
    setAssignmentForm(assignmentToForm(item));
  }

  return (
    <section
      className="section section--tight salary-crud-console payroll-crud-console"
      aria-labelledby="payroll-crud-console-title"
      data-active-action={activeActionTab}
    >
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Setup actions</span>
          <h2 id="payroll-crud-console-title">Maintain payroll setup</h2>
          <p className="section-copy">Choose one setup area, update the form, and use the guidance panel to confirm the change fits the payroll flow.</p>
        </div>
        <span className="payroll-setup-count">{setup.calendars.length + setup.periods.length + setup.pay_groups.length + setup.assignments.length} records</span>
      </div>

      {feedback ? (
        <div className={`notice ${feedback.tone === "success" ? "notice--success" : ""}`} role="status">
          <strong>{feedback.tone === "success" ? "Saved." : "Save failed."}</strong>
          <span className="muted">{feedback.message}</span>
        </div>
      ) : null}

      <ActionTabs activeTab={activeActionTab} onChange={setActiveActionTab} />

      <div className="setup-action-context">
        <div>
          <strong>{actionTabs.find((tab) => tab.key === activeActionTab)?.label}</strong>
          <span>{actionTabs.find((tab) => tab.key === activeActionTab)?.detail}</span>
        </div>
        <span>{calendarOptions.length ? "Ready for payroll setup changes" : "Create a calendar first"}</span>
      </div>
      <ActionFlowStrip activeTab={activeActionTab} />

      <div className="salary-crud-grid payroll-crud-grid setup-action-panel">
        {activeActionTab === "calendar" ? (
        <form
          aria-label="Payroll calendar form"
          className="salary-crud-form"
          data-testid="payroll-calendar-form"
          id="payroll-calendar-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save<HrAdminPayrollCalendar>("calendar", "payroll-calendars", calendarForm.id, {
              code: calendarForm.code,
              name: calendarForm.name,
              frequency: calendarForm.frequency,
              timezone: calendarForm.timezone,
              currency_code: calendarForm.currency_code,
              period_start_day: Number(calendarForm.period_start_day),
              is_active: calendarForm.is_active,
              config_snapshot: makeSnapshot(calendarForm.config_profile_ref),
            }, applyCalendar);
          }}
        >
          <FormHeader mode={calendarForm.id ? "edit" : "create"} title="Calendar" onReset={() => setCalendarForm(emptyCalendarForm(setup))} />
          <div className="form-grid salary-crud-form-grid">
            <TextField label="Code" required value={calendarForm.code} onChange={(value) => setCalendarForm((current) => ({ ...current, code: value }))} />
            <TextField label="Name" required value={calendarForm.name} onChange={(value) => setCalendarForm((current) => ({ ...current, name: value }))} />
            <SelectField label="Frequency" required value={calendarForm.frequency} options={frequencyOptions} onChange={(value) => setCalendarForm((current) => ({ ...current, frequency: value }))} />
            <TextField label="Timezone" required value={calendarForm.timezone} onChange={(value) => setCalendarForm((current) => ({ ...current, timezone: value }))} />
            <TextField label="Currency code" required value={calendarForm.currency_code} onChange={(value) => setCalendarForm((current) => ({ ...current, currency_code: value.toUpperCase().slice(0, 3) }))} />
            <TextField label="Period start day" required type="number" value={calendarForm.period_start_day} onChange={(value) => setCalendarForm((current) => ({ ...current, period_start_day: value }))} />
            <TextField label="Config profile reference" value={calendarForm.config_profile_ref} onChange={(value) => setCalendarForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <div className="toggle-field-list salary-crud-toggle-list">
            <BooleanField label="Active calendar" checked={calendarForm.is_active} onChange={(checked) => setCalendarForm((current) => ({ ...current, is_active: checked }))} />
          </div>
          <SetupRecordList
            activeId={calendarForm.id}
            emptyLabel="No calendars yet"
            items={setup.calendars}
            label="Payroll calendar records"
            page={recordPages.calendar}
            renderPrimary={(item) => item.name}
            renderSecondary={(item) => item.code}
            onPageChange={(page) => setRecordPage("calendar", page)}
            onSelect={(item) => setCalendarForm(calendarToForm(item))}
          />
          <div className="salary-crud-form__actions">
            <button className="button button--primary" disabled={submitting === "calendar"} type="submit">
              {submitting === "calendar" ? "Saving..." : calendarForm.id ? "Save calendar" : "Create calendar"}
            </button>
          </div>
        </form>
        ) : null}

        {activeActionTab === "period" ? (
        <form
          aria-label="Payroll period form"
          className="salary-crud-form"
          data-testid="payroll-period-form"
          id="payroll-period-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save<HrAdminPayrollPeriod>("period", "payroll-periods", periodForm.id, {
              calendar_id: periodForm.calendar_id,
              code: periodForm.code,
              name: periodForm.name,
              start_date: periodForm.start_date,
              end_date: periodForm.end_date,
              pay_date: periodForm.pay_date,
              status: periodForm.status,
              config_snapshot: makeSnapshot(periodForm.config_profile_ref),
            }, applyPeriod);
          }}
        >
          <FormHeader mode={periodForm.id ? "edit" : "create"} title="Period" onReset={() => setPeriodForm(emptyPeriodForm(setup))} />
          {!calendarOptions.length ? <DependencyNotice>Create a payroll calendar before adding periods.</DependencyNotice> : null}
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Calendar" required value={periodForm.calendar_id} options={calendarOptions} onChange={(value) => setPeriodForm((current) => ({ ...current, calendar_id: value }))} />
            <TextField label="Code" required value={periodForm.code} onChange={(value) => setPeriodForm((current) => ({ ...current, code: value }))} />
            <TextField label="Name" required value={periodForm.name} onChange={(value) => setPeriodForm((current) => ({ ...current, name: value }))} />
            <TextField label="Start date" required type="date" value={periodForm.start_date} onChange={(value) => setPeriodForm((current) => ({ ...current, start_date: value }))} />
            <TextField label="End date" required type="date" value={periodForm.end_date} onChange={(value) => setPeriodForm((current) => ({ ...current, end_date: value }))} />
            <TextField label="Pay date" required type="date" value={periodForm.pay_date} onChange={(value) => setPeriodForm((current) => ({ ...current, pay_date: value }))} />
            <SelectField label="Status" required value={periodForm.status} options={periodStatusOptions} onChange={(value) => setPeriodForm((current) => ({ ...current, status: value }))} />
            <TextField label="Config profile reference" value={periodForm.config_profile_ref} onChange={(value) => setPeriodForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <SetupRecordList
            activeId={periodForm.id}
            emptyLabel="No periods yet"
            items={setup.periods}
            label="Payroll period records"
            page={recordPages.period}
            renderPrimary={(item) => item.name}
            renderSecondary={(item) => item.code}
            onPageChange={(page) => setRecordPage("period", page)}
            onSelect={(item) => setPeriodForm(periodToForm(item))}
          />
          <div className="salary-crud-form__actions">
            <button className="button button--primary" disabled={submitting === "period" || !calendarOptions.length} type="submit">
              {submitting === "period" ? "Saving..." : periodForm.id ? "Save period" : "Create period"}
            </button>
          </div>
        </form>
        ) : null}

        {activeActionTab === "payGroup" ? (
        <form
          aria-label="Pay group form"
          className="salary-crud-form"
          data-testid="pay-group-form"
          id="pay-group-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save<HrAdminPayGroup>("payGroup", "pay-groups", payGroupForm.id, {
              calendar_id: payGroupForm.calendar_id,
              code: payGroupForm.code,
              name: payGroupForm.name,
              status: payGroupForm.status,
              default_currency_code: payGroupForm.default_currency_code,
              legal_entity_id: nullable(payGroupForm.legal_entity_id),
              branch_id: nullable(payGroupForm.branch_id),
              location_id: nullable(payGroupForm.location_id),
              department_id: nullable(payGroupForm.department_id),
              employment_type_id: nullable(payGroupForm.employment_type_id),
              config_snapshot: makeSnapshot(payGroupForm.config_profile_ref),
            }, applyPayGroup);
          }}
        >
          <FormHeader mode={payGroupForm.id ? "edit" : "create"} title="Pay group" onReset={() => setPayGroupForm(emptyPayGroupForm(setup))} />
          {!calendarOptions.length ? <DependencyNotice>Create a payroll calendar before adding pay groups.</DependencyNotice> : null}
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Calendar" required value={payGroupForm.calendar_id} options={calendarOptions} onChange={(value) => setPayGroupForm((current) => ({ ...current, calendar_id: value }))} />
            <TextField label="Code" required value={payGroupForm.code} onChange={(value) => setPayGroupForm((current) => ({ ...current, code: value }))} />
            <TextField label="Name" required value={payGroupForm.name} onChange={(value) => setPayGroupForm((current) => ({ ...current, name: value }))} />
            <SelectField label="Status" required value={payGroupForm.status} options={payGroupStatusOptions} onChange={(value) => setPayGroupForm((current) => ({ ...current, status: value }))} />
            <TextField label="Default currency code" required value={payGroupForm.default_currency_code} onChange={(value) => setPayGroupForm((current) => ({ ...current, default_currency_code: value.toUpperCase().slice(0, 3) }))} />
            <SelectField label="Legal entity" value={payGroupForm.legal_entity_id} options={optionItems(setup.options.legal_entities, "All legal entities")} onChange={updatePayGroupLegalEntity} />
            <SelectField
              label="Branch"
              value={payGroupForm.branch_id}
              options={optionItems(scopedBranches, "All branches")}
              disabled={Boolean(payGroupForm.legal_entity_id && scopedBranches.length === 0)}
              hint={payGroupBranchWarning}
              tone={payGroupBranchWarning ? "warning" : "muted"}
              onChange={updatePayGroupBranch}
            />
            <SelectField
              label="Location"
              value={payGroupForm.location_id}
              options={optionItems(setup.options.locations, "All locations")}
              hint={payGroupLocationHint}
              tone={payGroupLocationHint ? "warning" : "muted"}
              onChange={(value) => setPayGroupForm((current) => ({ ...current, location_id: value }))}
            />
            <SelectField label="Department" value={payGroupForm.department_id} options={optionItems(setup.options.departments, "All departments")} onChange={(value) => setPayGroupForm((current) => ({ ...current, department_id: value }))} />
            <SelectField label="Employment type" value={payGroupForm.employment_type_id} options={optionItems(setup.options.employment_types, "All employment types")} onChange={(value) => setPayGroupForm((current) => ({ ...current, employment_type_id: value }))} />
            <TextField label="Config profile reference" value={payGroupForm.config_profile_ref} onChange={(value) => setPayGroupForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <SetupRecordList
            activeId={payGroupForm.id}
            emptyLabel="No pay groups yet"
            items={setup.pay_groups}
            label="Pay group records"
            page={recordPages.payGroup}
            renderPrimary={(item) => item.name}
            renderSecondary={(item) => item.code}
            onPageChange={(page) => setRecordPage("payGroup", page)}
            onSelect={(item) => setPayGroupForm(payGroupToForm(item))}
          />
          <div className="salary-crud-form__actions">
            <button className="button button--primary" disabled={submitting === "payGroup" || !calendarOptions.length} type="submit">
              {submitting === "payGroup" ? "Saving..." : payGroupForm.id ? "Save pay group" : "Create pay group"}
            </button>
          </div>
        </form>
        ) : null}

        {activeActionTab === "assignment" ? (
        <form
          aria-label="Pay group assignment form"
          className="salary-crud-form"
          data-testid="pay-group-assignment-form"
          id="pay-group-assignment-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save<HrAdminPayGroupAssignment>("assignment", "pay-group-assignments", assignmentForm.id, {
              pay_group_id: assignmentForm.pay_group_id,
              employee_id: assignmentForm.employee_id,
              effective_from: assignmentForm.effective_from,
              effective_to: nullable(assignmentForm.effective_to),
              status: assignmentForm.status,
              config_snapshot: makeSnapshot(assignmentForm.config_profile_ref),
            }, applyAssignment);
          }}
        >
          <FormHeader mode={assignmentForm.id ? "edit" : "create"} title="Assignment" onReset={() => setAssignmentForm(emptyAssignmentForm(setup))} />
          {!payGroupOptions.length ? <DependencyNotice>Create at least one pay group before assigning employees.</DependencyNotice> : null}
          {payGroupOptions.length && !employeeOptions.length ? <DependencyNotice>Add active employees before creating pay group assignments.</DependencyNotice> : null}
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Pay group" required value={assignmentForm.pay_group_id} options={payGroupOptions} onChange={(value) => setAssignmentForm((current) => ({ ...current, pay_group_id: value }))} />
            <SelectField label="Employee" required value={assignmentForm.employee_id} options={employeeOptions} onChange={(value) => setAssignmentForm((current) => ({ ...current, employee_id: value }))} />
            <TextField label="Effective from" required type="date" value={assignmentForm.effective_from} onChange={(value) => setAssignmentForm((current) => ({ ...current, effective_from: value }))} />
            <TextField label="Effective to" type="date" value={assignmentForm.effective_to} onChange={(value) => setAssignmentForm((current) => ({ ...current, effective_to: value }))} />
            <SelectField label="Status" required value={assignmentForm.status} options={payGroupStatusOptions} onChange={(value) => setAssignmentForm((current) => ({ ...current, status: value }))} />
            <TextField label="Config profile reference" value={assignmentForm.config_profile_ref} onChange={(value) => setAssignmentForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <SetupRecordList
            activeId={assignmentForm.id}
            emptyLabel="No assignments yet"
            items={setup.assignments}
            label="Pay group assignment records"
            page={recordPages.assignment}
            renderPrimary={(item) => item.employee_name}
            renderSecondary={(item) => item.pay_group_name}
            onPageChange={(page) => setRecordPage("assignment", page)}
            onSelect={(item) => setAssignmentForm(assignmentToForm(item))}
          />
          <div className="salary-crud-form__actions">
            <button className="button button--primary" disabled={submitting === "assignment" || !payGroupOptions.length || !employeeOptions.length} type="submit">
              {submitting === "assignment" ? "Saving..." : assignmentForm.id ? "Save assignment" : "Create assignment"}
            </button>
          </div>
        </form>
        ) : null}

        <ActionSidecar activeTab={activeActionTab} setup={setup} />
      </div>
    </section>
  );
}
