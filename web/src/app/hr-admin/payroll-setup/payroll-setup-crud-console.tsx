"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  HrAdminPayGroup,
  HrAdminPayGroupAssignment,
  HrAdminPayrollCalendar,
  HrAdminPayrollPeriod,
  HrAdminPayrollSetupResponse,
} from "@/lib/types";

type SaveMode = "create" | "edit";
type ConfigFamily = "calendar" | "period" | "payGroup" | "assignment";
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
          <option key={`${label}-${option.value || "empty"}`} value={option.value}>
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

export function PayrollSetupCrudConsole({ initialSetup }: { initialSetup: HrAdminPayrollSetupResponse }) {
  const router = useRouter();
  const [setup, setSetup] = useState(initialSetup);
  const [calendarForm, setCalendarForm] = useState<CalendarForm>(() => emptyCalendarForm(initialSetup));
  const [periodForm, setPeriodForm] = useState<PeriodForm>(() => emptyPeriodForm(initialSetup));
  const [payGroupForm, setPayGroupForm] = useState<PayGroupForm>(() => emptyPayGroupForm(initialSetup));
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(() => emptyAssignmentForm(initialSetup));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState<ConfigFamily | null>(null);

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
    <section className="section section--tight salary-crud-console payroll-crud-console" aria-labelledby="payroll-crud-console-title">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Browser CRUD</span>
          <h2 id="payroll-crud-console-title">Payroll setup controls</h2>
        </div>
        <span className="payroll-setup-count">{setup.calendars.length + setup.periods.length + setup.pay_groups.length + setup.assignments.length} records</span>
      </div>

      {feedback ? (
        <div className={`notice ${feedback.tone === "success" ? "notice--success" : ""}`} role="status">
          <strong>{feedback.tone === "success" ? "Saved." : "Save failed."}</strong>
          <span className="muted">{feedback.message}</span>
        </div>
      ) : null}

      <div className="salary-crud-grid payroll-crud-grid">
        <form
          aria-label="Payroll calendar form"
          className="salary-crud-form"
          data-testid="payroll-calendar-form"
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
          <div className="salary-crud-list" aria-label="Payroll calendar records">
            {setup.calendars.slice(0, 8).map((item) => (
              <button className="salary-crud-record" key={item.id} type="button" onClick={() => setCalendarForm(calendarToForm(item))}>
                <strong>{item.name}</strong>
                <span>{item.code}</span>
              </button>
            ))}
          </div>
          <button className="button button--primary" disabled={submitting === "calendar"} type="submit">
            {submitting === "calendar" ? "Saving..." : calendarForm.id ? "Save calendar" : "Create calendar"}
          </button>
        </form>

        <form
          aria-label="Payroll period form"
          className="salary-crud-form"
          data-testid="payroll-period-form"
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
          <div className="salary-crud-list" aria-label="Payroll period records">
            {setup.periods.slice(0, 8).map((item) => (
              <button className="salary-crud-record" key={item.id} type="button" onClick={() => setPeriodForm(periodToForm(item))}>
                <strong>{item.name}</strong>
                <span>{item.code}</span>
              </button>
            ))}
          </div>
          <button className="button button--primary" disabled={submitting === "period" || !calendarOptions.length} type="submit">
            {submitting === "period" ? "Saving..." : periodForm.id ? "Save period" : "Create period"}
          </button>
        </form>

        <form
          aria-label="Pay group form"
          className="salary-crud-form"
          data-testid="pay-group-form"
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
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Calendar" required value={payGroupForm.calendar_id} options={calendarOptions} onChange={(value) => setPayGroupForm((current) => ({ ...current, calendar_id: value }))} />
            <TextField label="Code" required value={payGroupForm.code} onChange={(value) => setPayGroupForm((current) => ({ ...current, code: value }))} />
            <TextField label="Name" required value={payGroupForm.name} onChange={(value) => setPayGroupForm((current) => ({ ...current, name: value }))} />
            <SelectField label="Status" required value={payGroupForm.status} options={payGroupStatusOptions} onChange={(value) => setPayGroupForm((current) => ({ ...current, status: value }))} />
            <TextField label="Default currency code" required value={payGroupForm.default_currency_code} onChange={(value) => setPayGroupForm((current) => ({ ...current, default_currency_code: value.toUpperCase().slice(0, 3) }))} />
            <SelectField label="Legal entity" value={payGroupForm.legal_entity_id} options={optionItems(setup.options.legal_entities, "All legal entities")} onChange={(value) => setPayGroupForm((current) => ({ ...current, legal_entity_id: value }))} />
            <SelectField label="Branch" value={payGroupForm.branch_id} options={optionItems(setup.options.branches, "All branches")} onChange={(value) => setPayGroupForm((current) => ({ ...current, branch_id: value }))} />
            <SelectField label="Location" value={payGroupForm.location_id} options={optionItems(setup.options.locations, "All locations")} onChange={(value) => setPayGroupForm((current) => ({ ...current, location_id: value }))} />
            <SelectField label="Department" value={payGroupForm.department_id} options={optionItems(setup.options.departments, "All departments")} onChange={(value) => setPayGroupForm((current) => ({ ...current, department_id: value }))} />
            <SelectField label="Employment type" value={payGroupForm.employment_type_id} options={optionItems(setup.options.employment_types, "All employment types")} onChange={(value) => setPayGroupForm((current) => ({ ...current, employment_type_id: value }))} />
            <TextField label="Config profile reference" value={payGroupForm.config_profile_ref} onChange={(value) => setPayGroupForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <div className="salary-crud-list" aria-label="Pay group records">
            {setup.pay_groups.slice(0, 8).map((item) => (
              <button className="salary-crud-record" key={item.id} type="button" onClick={() => setPayGroupForm(payGroupToForm(item))}>
                <strong>{item.name}</strong>
                <span>{item.code}</span>
              </button>
            ))}
          </div>
          <button className="button button--primary" disabled={submitting === "payGroup" || !calendarOptions.length} type="submit">
            {submitting === "payGroup" ? "Saving..." : payGroupForm.id ? "Save pay group" : "Create pay group"}
          </button>
        </form>

        <form
          aria-label="Pay group assignment form"
          className="salary-crud-form"
          data-testid="pay-group-assignment-form"
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
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Pay group" required value={assignmentForm.pay_group_id} options={payGroupOptions} onChange={(value) => setAssignmentForm((current) => ({ ...current, pay_group_id: value }))} />
            <SelectField label="Employee" required value={assignmentForm.employee_id} options={employeeOptions} onChange={(value) => setAssignmentForm((current) => ({ ...current, employee_id: value }))} />
            <TextField label="Effective from" required type="date" value={assignmentForm.effective_from} onChange={(value) => setAssignmentForm((current) => ({ ...current, effective_from: value }))} />
            <TextField label="Effective to" type="date" value={assignmentForm.effective_to} onChange={(value) => setAssignmentForm((current) => ({ ...current, effective_to: value }))} />
            <SelectField label="Status" required value={assignmentForm.status} options={payGroupStatusOptions} onChange={(value) => setAssignmentForm((current) => ({ ...current, status: value }))} />
            <TextField label="Config profile reference" value={assignmentForm.config_profile_ref} onChange={(value) => setAssignmentForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <div className="salary-crud-list" aria-label="Pay group assignment records">
            {setup.assignments.slice(0, 8).map((item) => (
              <button className="salary-crud-record" key={item.id} type="button" onClick={() => setAssignmentForm(assignmentToForm(item))}>
                <strong>{item.employee_name}</strong>
                <span>{item.pay_group_name}</span>
              </button>
            ))}
          </div>
          <button className="button button--primary" disabled={submitting === "assignment" || !payGroupOptions.length || !employeeOptions.length} type="submit">
            {submitting === "assignment" ? "Saving..." : assignmentForm.id ? "Save assignment" : "Create assignment"}
          </button>
        </form>
      </div>
    </section>
  );
}
