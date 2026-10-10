"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { EmployeeSearchSelect } from "@/components/patterns/employee-search-select";
import type { FieldErrors } from "@/lib/ui/validation";
import type { HrAdminPayrollInputSnapshot, HrAdminPayrollInputSnapshotListItem, HrAdminPayrollInputSnapshotSetupResponse, HrAdminPayrollRun } from "@/lib/types";

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

type OperationTab = "run" | "snapshot" | "lock";
type PayrollInputField =
  | "run.period_id"
  | "run.code"
  | "run.name"
  | "run.input_profile_ref"
  | "run.snapshot_schema_ref"
  | "snapshot.payroll_run_id"
  | "snapshot.employee_id"
  | "snapshot.input_profile_ref"
  | "snapshot.employee_snapshot"
  | "snapshot.organization_snapshot"
  | "snapshot.salary_snapshot"
  | "snapshot.attendance_snapshot"
  | "snapshot.validation_snapshot";

const operationTabs: Array<{ value: OperationTab; label: string; detail: string }> = [
  { value: "run", label: "Payroll run", detail: "Period and pay group scope" },
  { value: "snapshot", label: "Input snapshot", detail: "Employee source evidence" },
  { value: "lock", label: "Lock gate", detail: "Final input control" },
];

const payrollSnapshotImportHeaders = ["employee_code", "monthly_gross", "present_days", "lop_days", "overtime_hours", "leave_days", "working_days"];

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return `${key}: ${String(value[0])}`;
    if (typeof value === "string" && key !== "detail") return `${key}: ${value}`;
  }
  return String((payload as Record<string, unknown>).detail || fallback);
}

function parseJson(value: string, fallback: Record<string, unknown>) {
  if (!value.trim()) return fallback;
  return JSON.parse(value) as Record<string, unknown>;
}

function TextField({
  label,
  value,
  onChange,
  required,
  disabled,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <label className="form-field">
      <span className="muted">{label}</span>
      <input aria-invalid={Boolean(error)} className="input-control" disabled={disabled} required={required} type="text" value={value} onChange={(event) => onChange(event.target.value)} />
      {error ? <span className="field-error-text" role="alert">{error}</span> : null}
    </label>
  );
}

function FieldHint({ children, tone = "muted" }: { children: string; tone?: "muted" | "warning" }) {
  return <span className={`field-help-text${tone === "warning" ? " field-help-text--warning" : ""}`}>{children}</span>;
}

function SelectField({
  label,
  value,
  options,
  onChange,
  required,
  disabled,
  hint,
  tone = "muted",
  error,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  tone?: "muted" | "warning";
  error?: string;
}) {
  return (
    <label className="form-field">
      <span className="muted">{label}</span>
      <select aria-invalid={Boolean(error)} className="input-control" disabled={disabled} required={required} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={`${label}-${option.value || "empty"}`} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error ? <span className="field-error-text" role="alert">{error}</span> : null}
      {hint ? <FieldHint tone={tone}>{hint}</FieldHint> : null}
    </label>
  );
}

function JsonField({ label, value, onChange, disabled, error }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; error?: string }) {
  return (
    <label className="form-field">
      <span className="muted">{label}</span>
      <textarea aria-invalid={Boolean(error)} className="input-control" disabled={disabled} rows={3} value={value} onChange={(event) => onChange(event.target.value)} />
      {error ? <span className="field-error-text" role="alert">{error}</span> : null}
    </label>
  );
}

function firstValue<T extends { id: string }>(items: T[]) {
  return items[0]?.id ?? "";
}

function runToForm(run?: HrAdminPayrollRun | null) {
  return {
    id: run?.id,
    period_id: run?.period_id ?? "",
    pay_group_id: run?.pay_group_id ?? "",
    code: run?.code ?? "",
    name: run?.name ?? "",
    status: run?.status ?? "draft",
    input_profile_ref: run?.input_profile_ref ?? "tenant.payroll.input.browser.v1",
    snapshot_schema_ref: run?.snapshot_schema_ref ?? "tenant.payroll.snapshot.browser.v1",
    config_profile_ref: typeof run?.config_snapshot.profile_ref === "string" ? run.config_snapshot.profile_ref : "",
  };
}

function emptyRunForm(setup: HrAdminPayrollInputSnapshotSetupResponse) {
  return {
    ...runToForm(null),
    period_id: firstValue(setup.options.periods),
    pay_group_id: firstValue(setup.options.pay_groups),
  };
}

function snapshotToForm(snapshot?: Partial<HrAdminPayrollInputSnapshot> | null, runId = "", employeeId = "") {
  return {
    id: snapshot?.id,
    payroll_run_id: snapshot?.payroll_run_id ?? runId,
    employee_id: snapshot?.employee_id ?? employeeId,
    snapshot_status: snapshot?.snapshot_status ?? "ready",
    input_profile_ref: snapshot?.input_profile_ref ?? "tenant.payroll.input.browser.v1",
    employee_snapshot: JSON.stringify(snapshot?.employee_snapshot ?? { source: "browser", employment_status: "active" }),
    organization_snapshot: JSON.stringify(snapshot?.organization_snapshot ?? { source: "browser" }),
    salary_snapshot: JSON.stringify(snapshot?.salary_snapshot ?? { source: "browser", monthly_gross: 50000, currency_code: "INR" }),
    attendance_snapshot: JSON.stringify(snapshot?.attendance_snapshot ?? { working_days: 22, present_days: 22, lop_days: 0 }),
    validation_snapshot: JSON.stringify(snapshot?.validation_snapshot ?? { blockers: [], warnings: [] }),
    config_profile_ref: typeof snapshot?.config_snapshot?.profile_ref === "string" ? snapshot.config_snapshot.profile_ref : "",
  };
}

function snapshotEmployeeLabel(snapshot?: Pick<HrAdminPayrollInputSnapshot, "employee_id" | "employee_name" | "employee_code"> | null) {
  if (!snapshot?.employee_id) return null;
  return `${snapshot.employee_name} (${snapshot.employee_code})`;
}

export function PayrollInputOperationsPanel({
  initialSetup,
  selectedRun,
  selectedSnapshot,
  canManageInputs,
  canLockInputs,
}: {
  initialSetup: HrAdminPayrollInputSnapshotSetupResponse;
  selectedRun: HrAdminPayrollRun | null;
  selectedSnapshot: HrAdminPayrollInputSnapshot | null;
  canManageInputs: boolean;
  canLockInputs: boolean;
}) {
  const router = useRouter();
  const [setup, setSetup] = useState(initialSetup);
  const [runForm, setRunForm] = useState(() => selectedRun ? runToForm(selectedRun) : emptyRunForm(initialSetup));
  const [snapshotForm, setSnapshotForm] = useState(() => snapshotToForm(selectedSnapshot, selectedRun?.id ?? ""));
  const [selectedEmployeeLabel, setSelectedEmployeeLabel] = useState<string | null>(() => snapshotEmployeeLabel(selectedSnapshot));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<PayrollInputField>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [activeOperation, setActiveOperation] = useState<OperationTab>("run");
  const [bulkCsv, setBulkCsv] = useState("");

  const selectedPeriod = useMemo(() => setup.options.periods.find((item) => item.id === runForm.period_id), [runForm.period_id, setup.options.periods]);
  const compatiblePayGroups = useMemo(
    () =>
      selectedPeriod?.calendar_id
        ? setup.options.pay_groups.filter((item) => item.calendar_id === selectedPeriod.calendar_id)
        : setup.options.pay_groups,
    [selectedPeriod, setup.options.pay_groups],
  );
  const selectedPayGroup = useMemo(() => setup.options.pay_groups.find((item) => item.id === runForm.pay_group_id), [runForm.pay_group_id, setup.options.pay_groups]);
  const periodOptions = useMemo(() => setup.options.periods.map((item) => ({ value: item.id, label: item.name })), [setup.options.periods]);
  const payGroupOptions = useMemo(
    () => [{ value: "", label: "All pay groups" }, ...compatiblePayGroups.map((item) => ({ value: item.id, label: item.name }))],
    [compatiblePayGroups],
  );
  const runOptions = useMemo(() => setup.runs.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })), [setup.runs]);
  const runStatusOptions = useMemo(() => setup.options.payroll_run_statuses.map((item) => ({ value: item.value, label: item.label })), [setup.options.payroll_run_statuses]);
  const snapshotStatusOptions = useMemo(() => setup.options.payroll_input_snapshot_statuses.map((item) => ({ value: item.value, label: item.label })), [setup.options.payroll_input_snapshot_statuses]);
  const lockRunId = runForm.id || snapshotForm.payroll_run_id;
  const selectedLockRun = useMemo(() => setup.runs.find((item) => item.id === lockRunId), [lockRunId, setup.runs]);
  const lockRunSnapshots = useMemo(
    () => setup.snapshots.filter((item) => item.payroll_run_id === lockRunId),
    [lockRunId, setup.snapshots],
  );
  const hasLoadedLockSnapshots = lockRunSnapshots.length > 0;
  const lockReadyCount = hasLoadedLockSnapshots ? lockRunSnapshots.filter((item) => item.snapshot_status === "ready").length : selectedLockRun?.ready_count ?? 0;
  const lockWarningCount = hasLoadedLockSnapshots ? lockRunSnapshots.filter((item) => item.snapshot_status === "warning").length : selectedLockRun?.warning_count ?? 0;
  const lockBlockedCount = hasLoadedLockSnapshots ? lockRunSnapshots.filter((item) => item.snapshot_status === "blocked").length : selectedLockRun?.blocked_count ?? 0;
  const lockLockedCount = hasLoadedLockSnapshots ? lockRunSnapshots.filter((item) => item.snapshot_status === "locked").length : selectedLockRun?.locked_count ?? 0;
  const lockSnapshotCount = hasLoadedLockSnapshots ? lockRunSnapshots.length : selectedLockRun?.snapshot_count ?? 0;
  const firstBlockingSnapshot = lockRunSnapshots.find((item) => item.blockers.length > 0);
  const firstWarningSnapshot = lockRunSnapshots.find((item) => item.warnings.length > 0);
  const firstReconciliationBlocker = lockRunSnapshots.find((item) => item.reconciliation_summary.high_count > 0);
  const reconciliationBlockerCount = lockRunSnapshots.reduce((sum, item) => sum + item.reconciliation_summary.high_count, 0);
  const noPeriodWarning = setup.options.periods.length === 0 ? "No payroll periods are configured. Create a period before creating a payroll run." : "";
  const noCompatiblePayGroupWarning =
    runForm.period_id && compatiblePayGroups.length === 0
      ? "No pay groups use this period's calendar. Leave as all pay groups or create a compatible pay group."
      : "";
  const selectedPayGroupWarning =
    selectedPayGroup && selectedPayGroup.status !== "active" ? "Selected pay group is not active yet." : "";
  const manageDisabledReason = "Requires payroll.inputs.manage.";
  const lockDisabledReason = "Requires payroll.lock.";
  const lockBlockedReason = lockBlockedCount > 0
    ? "Resolve blocker snapshots before locking this payroll run."
    : "";
  const lockReconciliationBlockedReason = reconciliationBlockerCount > 0
    ? "Resolve reconciliation blockers before locking this payroll run."
    : "";
  const lockEmptyReason = lockSnapshotCount === 0
    ? "Create at least one input snapshot before locking this payroll run."
    : "";
  const lockAlreadyCompleteReason = lockSnapshotCount > 0 && lockLockedCount >= lockSnapshotCount
    ? "Inputs are already locked for this payroll run."
    : "";
  const lockPermissionReason = !canLockInputs ? lockDisabledReason : "";
  const lockDisabledMessage = lockPermissionReason || lockBlockedReason || lockReconciliationBlockedReason || lockEmptyReason || lockAlreadyCompleteReason;
  const canSubmitLock = canLockInputs && lockSnapshotCount > 0 && lockBlockedCount === 0 && reconciliationBlockerCount === 0 && !lockAlreadyCompleteReason && Boolean(runForm.id || snapshotForm.payroll_run_id);

  function updateRunPeriod(value: string) {
    setRunForm((current) => {
      const payGroupStillValid = current.pay_group_id
        ? setup.options.pay_groups.some((item) => item.id === current.pay_group_id && (!value || item.calendar_id === setup.options.periods.find((period) => period.id === value)?.calendar_id))
        : true;
      return {
        ...current,
        period_id: value,
        pay_group_id: payGroupStillValid ? current.pay_group_id : "",
      };
    });
  }

  function validateRun() {
    const nextFieldErrors: FieldErrors<PayrollInputField> = {};
    if (!runForm.period_id) {
      nextFieldErrors["run.period_id"] = "Select a payroll period before creating a run.";
    }
    if (!runForm.code.trim()) {
      nextFieldErrors["run.code"] = "Enter a unique payroll run code.";
    }
    if (!runForm.name.trim()) {
      nextFieldErrors["run.name"] = "Enter the payroll run name.";
    }
    if (!runForm.input_profile_ref.trim()) {
      nextFieldErrors["run.input_profile_ref"] = "Enter the input profile reference.";
    }
    if (!runForm.snapshot_schema_ref.trim()) {
      nextFieldErrors["run.snapshot_schema_ref"] = "Enter the snapshot schema reference.";
    }
    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setFeedback({ tone: "error", message: "Fix the highlighted payroll run fields before saving." });
      return false;
    }
    setFieldErrors({});
    return true;
  }

  function parseSnapshotJson(field: PayrollInputField, value: string, nextFieldErrors: FieldErrors<PayrollInputField>, message: string) {
    try {
      return parseJson(value, {});
    } catch {
      nextFieldErrors[field] = message;
      return {};
    }
  }

  function buildSnapshotBody() {
    const nextFieldErrors: FieldErrors<PayrollInputField> = {};
    if (!snapshotForm.payroll_run_id) {
      nextFieldErrors["snapshot.payroll_run_id"] = "Select a payroll run before saving a snapshot.";
    }
    if (!snapshotForm.employee_id) {
      nextFieldErrors["snapshot.employee_id"] = "Select an employee before saving a snapshot.";
    }
    if (!snapshotForm.input_profile_ref.trim()) {
      nextFieldErrors["snapshot.input_profile_ref"] = "Enter the input profile reference.";
    }
    const body = {
      payroll_run_id: snapshotForm.payroll_run_id,
      employee_id: snapshotForm.employee_id,
      snapshot_status: snapshotForm.snapshot_status,
      input_profile_ref: snapshotForm.input_profile_ref,
      employee_snapshot: parseSnapshotJson("snapshot.employee_snapshot", snapshotForm.employee_snapshot, nextFieldErrors, "Employee snapshot must be valid JSON."),
      organization_snapshot: parseSnapshotJson("snapshot.organization_snapshot", snapshotForm.organization_snapshot, nextFieldErrors, "Organization snapshot must be valid JSON."),
      salary_snapshot: parseSnapshotJson("snapshot.salary_snapshot", snapshotForm.salary_snapshot, nextFieldErrors, "Salary snapshot must be valid JSON."),
      attendance_snapshot: parseSnapshotJson("snapshot.attendance_snapshot", snapshotForm.attendance_snapshot, nextFieldErrors, "Attendance snapshot must be valid JSON."),
      validation_snapshot: parseSnapshotJson("snapshot.validation_snapshot", snapshotForm.validation_snapshot, nextFieldErrors, "Validation snapshot must be valid JSON."),
      config_snapshot: snapshotForm.config_profile_ref ? { profile_ref: snapshotForm.config_profile_ref } : {},
    };
    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setFeedback({ tone: "error", message: "Fix the highlighted payroll snapshot fields before saving." });
      return null;
    }
    setFieldErrors({});
    return body;
  }

  async function saveRun() {
    if (!validateRun()) {
      return;
    }
    setSubmitting("run");
    setFeedback(null);
    setFieldErrors({});
    const response = await fetch(runForm.id ? `/api/hr-admin/payroll-runs/${runForm.id}` : "/api/hr-admin/payroll-runs", {
      method: runForm.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        period_id: runForm.period_id,
        pay_group_id: runForm.pay_group_id || null,
        code: runForm.code,
        name: runForm.name,
        status: runForm.status,
        input_profile_ref: runForm.input_profile_ref,
        snapshot_schema_ref: runForm.snapshot_schema_ref,
        config_snapshot: runForm.config_profile_ref ? { profile_ref: runForm.config_profile_ref } : {},
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setSubmitting(null);
    if (!response.ok) {
      setFeedback({ tone: "error", message: getErrorMessage(payload, "Unable to save payroll run.") });
      return;
    }
    const run = payload as HrAdminPayrollRun;
    setSetup((current) => ({
      ...current,
      runs: current.runs.some((item) => item.id === run.id) ? current.runs.map((item) => item.id === run.id ? run : item) : [run, ...current.runs],
    }));
    setRunForm(runToForm(run));
    setSnapshotForm((current) => ({ ...current, payroll_run_id: run.id }));
    setFeedback({ tone: "success", message: "Payroll run saved." });
    setActiveOperation("snapshot");
    router.refresh();
  }

  async function saveSnapshot() {
    const body = buildSnapshotBody();
    if (!body) {
      return;
    }
    setSubmitting("snapshot");
    setFeedback(null);
    setFieldErrors({});

    const response = await fetch(snapshotForm.id ? `/api/hr-admin/payroll-input-snapshots/${snapshotForm.id}` : "/api/hr-admin/payroll-input-snapshots", {
      method: snapshotForm.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    setSubmitting(null);
    if (!response.ok) {
      setFeedback({ tone: "error", message: getErrorMessage(payload, "Unable to save payroll snapshot.") });
      return;
    }
    const snapshot = payload as HrAdminPayrollInputSnapshot;
    setSetup((current) => ({
      ...current,
      snapshots: current.snapshots.some((item) => item.id === snapshot.id)
        ? current.snapshots.map((item) => item.id === snapshot.id ? snapshot : item)
        : [snapshot, ...current.snapshots],
    }));
    setSnapshotForm(snapshotToForm(snapshot));
    setFeedback({ tone: "success", message: "Payroll input snapshot saved." });
    setActiveOperation("lock");
    router.refresh();
  }

  async function lockInputs() {
    if (!canSubmitLock) {
      setFeedback({ tone: "error", message: lockDisabledMessage || "Select a payroll run before locking inputs." });
      return;
    }
    setSubmitting("lock");
    setFeedback(null);
    const response = await fetch(`/api/hr-admin/payroll-runs/${runForm.id || snapshotForm.payroll_run_id}/lock-inputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const payload = await response.json().catch(() => ({}));
    setSubmitting(null);
    if (!response.ok) {
      setFeedback({ tone: "error", message: getErrorMessage(payload, "Unable to lock payroll inputs.") });
      return;
    }
    setFeedback({ tone: "success", message: String((payload as { detail?: string }).detail ?? "Payroll inputs locked.") });
    router.refresh();
  }

  function parseBulkRows() {
    const lines = bulkCsv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) {
      throw new Error("Paste a CSV header and at least one payroll input row.");
    }
    const headers = lines[0].split(",").map((item) => item.trim());
    const missing = payrollSnapshotImportHeaders.filter((header) => !headers.includes(header));
    if (missing.length) {
      throw new Error(`Missing CSV columns: ${missing.join(", ")}.`);
    }
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((item) => item.trim());
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
      return {
        payroll_run_id: runForm.id || snapshotForm.payroll_run_id,
        employee_code: row.employee_code,
        monthly_gross: row.monthly_gross,
        present_days: row.present_days,
        lop_days: row.lop_days,
        overtime_hours: row.overtime_hours,
        leave_days: row.leave_days,
        working_days: row.working_days,
      };
    });
  }

  async function importBulkSnapshots() {
    if (!canManageInputs) {
      setFeedback({ tone: "error", message: manageDisabledReason });
      return;
    }
    if (!(runForm.id || snapshotForm.payroll_run_id)) {
      setFeedback({ tone: "error", message: "Select or create a payroll run before importing payroll input snapshots." });
      return;
    }
    let rows: ReturnType<typeof parseBulkRows>;
    try {
      rows = parseBulkRows();
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Unable to parse payroll input CSV." });
      return;
    }
    setSubmitting("bulk-snapshot");
    setFeedback(null);
    const response = await fetch("/api/hr-admin/payroll-input-snapshots/bulk-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const payload = await response.json().catch(() => ({})) as { created_count?: number; failed_count?: number; detail?: string };
    setSubmitting(null);
    if (!response.ok && response.status !== 207) {
      setFeedback({ tone: "error", message: getErrorMessage(payload, "Unable to import payroll input snapshots.") });
      return;
    }
    setFeedback({ tone: payload.failed_count ? "error" : "success", message: `${payload.created_count ?? 0} payroll input snapshots imported; ${payload.failed_count ?? 0} blocked.` });
    setActiveOperation("lock");
    router.refresh();
  }

  return (
    <section className="section section--tight salary-crud-console payroll-input-operations-panel" aria-labelledby="payroll-input-operations-title">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Browser operations</span>
          <h2 id="payroll-input-operations-title">Payroll input operations</h2>
          <p className="section-copy section-copy-soft">Create the run, capture employee source snapshots, then lock only after the guardrail is clear.</p>
        </div>
        <span className="payroll-setup-count">3 controls</span>
      </div>

      <nav className="payroll-input-operation-tabs" aria-label="Payroll input operation steps">
        {operationTabs.map((tab, index) => (
          <button
            aria-current={activeOperation === tab.value ? "step" : undefined}
            className={`payroll-input-operation-tab ${activeOperation === tab.value ? "payroll-input-operation-tab--active" : ""}`}
            key={tab.value}
            type="button"
            onClick={() => setActiveOperation(tab.value)}
          >
            <span>{index + 1}</span>
            <strong>{tab.label}</strong>
            <em>{tab.detail}</em>
          </button>
        ))}
      </nav>

      {feedback ? (
        <div className={`notice ${feedback.tone === "success" ? "notice--success" : "notice--error"}`} role={feedback.tone === "success" ? "status" : "alert"}>
          <strong>{feedback.tone === "success" ? "Saved successfully." : "Save failed."}</strong>
          <span className="muted">{feedback.message}</span>
        </div>
      ) : null}

      <div className="salary-crud-grid payroll-input-operations-grid">
        <form
          aria-label="Payroll run form"
          className={`salary-crud-form ${activeOperation === "run" ? "is-active" : ""}`}
          data-testid="payroll-run-form"
          data-operation-panel="run"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void saveRun();
          }}
        >
          <div className="salary-crud-form__header">
            <div><span className="workspace-card__eyebrow">{runForm.id ? "Edit mode" : "Create mode"}</span><h3>Payroll run</h3></div>
            <button className="button button--secondary button--compact" disabled={!canManageInputs} type="button" onClick={() => setRunForm(emptyRunForm(setup))}>New</button>
          </div>
          <div className="form-grid salary-crud-form-grid">
            <SelectField
              label="Period"
              required
              error={fieldErrors["run.period_id"]}
              value={runForm.period_id}
              options={periodOptions}
              disabled={!periodOptions.length || !canManageInputs}
              hint={!canManageInputs ? manageDisabledReason : noPeriodWarning}
              tone={!canManageInputs || noPeriodWarning ? "warning" : "muted"}
              onChange={updateRunPeriod}
            />
            <SelectField
              label="Pay group"
              value={runForm.pay_group_id}
              options={payGroupOptions}
              disabled={!canManageInputs}
              hint={!canManageInputs ? manageDisabledReason : selectedPayGroupWarning || noCompatiblePayGroupWarning}
              tone={!canManageInputs || selectedPayGroupWarning || noCompatiblePayGroupWarning ? "warning" : "muted"}
              onChange={(value) => setRunForm((current) => ({ ...current, pay_group_id: value }))}
            />
            <TextField disabled={!canManageInputs} label="Code" required error={fieldErrors["run.code"]} value={runForm.code} onChange={(value) => setRunForm((current) => ({ ...current, code: value }))} />
            <TextField disabled={!canManageInputs} label="Name" required error={fieldErrors["run.name"]} value={runForm.name} onChange={(value) => setRunForm((current) => ({ ...current, name: value }))} />
            <SelectField disabled={!canManageInputs} hint={!canManageInputs ? manageDisabledReason : ""} tone="warning" label="Status" required value={runForm.status} options={runStatusOptions} onChange={(value) => setRunForm((current) => ({ ...current, status: value }))} />
            <TextField disabled={!canManageInputs} label="Input profile ref" required error={fieldErrors["run.input_profile_ref"]} value={runForm.input_profile_ref} onChange={(value) => setRunForm((current) => ({ ...current, input_profile_ref: value }))} />
            <TextField disabled={!canManageInputs} label="Snapshot schema ref" required error={fieldErrors["run.snapshot_schema_ref"]} value={runForm.snapshot_schema_ref} onChange={(value) => setRunForm((current) => ({ ...current, snapshot_schema_ref: value }))} />
            <TextField disabled={!canManageInputs} label="Config profile reference" value={runForm.config_profile_ref} onChange={(value) => setRunForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <div className="salary-crud-list" aria-label="Payroll run records">
            {setup.runs.slice(0, 6).map((item) => (
              <button className="salary-crud-record" key={item.id} type="button" onClick={() => {
                setRunForm(runToForm(item));
                setSnapshotForm((current) => ({ ...current, payroll_run_id: item.id }));
              }}>
                <strong>{item.name}</strong>
                <span>{item.code}</span>
              </button>
            ))}
          </div>
          <button className="button button--primary" disabled={!canManageInputs || submitting === "run" || !periodOptions.length} type="submit">
            {submitting === "run" ? "Saving..." : runForm.id ? "Save run" : "Create run"}
          </button>
          {!canManageInputs ? <span className="muted">{manageDisabledReason}</span> : null}
        </form>

        <form
          aria-label="Payroll input snapshot form"
          className={`salary-crud-form ${activeOperation === "snapshot" ? "is-active" : ""}`}
          data-testid="payroll-input-snapshot-form"
          data-operation-panel="snapshot"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void saveSnapshot();
          }}
        >
          <div className="salary-crud-form__header">
            <div><span className="workspace-card__eyebrow">{snapshotForm.id ? "Edit mode" : "Create mode"}</span><h3>Input snapshot</h3></div>
            <button className="button button--secondary button--compact" disabled={!canManageInputs} type="button" onClick={() => {
              setSelectedEmployeeLabel(null);
              setSnapshotForm(snapshotToForm(null, runForm.id ?? firstValue(setup.runs)));
            }}>New</button>
          </div>
          <div className="form-grid salary-crud-form-grid">
            <SelectField disabled={!canManageInputs} hint={!canManageInputs ? manageDisabledReason : ""} tone="warning" label="Payroll run" required error={fieldErrors["snapshot.payroll_run_id"]} value={snapshotForm.payroll_run_id} options={runOptions} onChange={(value) => setSnapshotForm((current) => ({ ...current, payroll_run_id: value }))} />
            <div>
              <EmployeeSearchSelect
                value={snapshotForm.employee_id}
                selectedLabel={selectedEmployeeLabel}
                onChange={(value) => setSnapshotForm((current) => ({ ...current, employee_id: value }))}
                onOptionSelected={(item) => setSelectedEmployeeLabel(item ? `${item.name} (${item.employee_code ?? "No code"})` : null)}
                label="Employee"
                hint={fieldErrors["snapshot.employee_id"] || "Search by employee code, name, or work email."}
              />
              {fieldErrors["snapshot.employee_id"] ? <span className="field-error-text" role="alert">{fieldErrors["snapshot.employee_id"]}</span> : null}
            </div>
            <SelectField disabled={!canManageInputs} label="Snapshot status" required value={snapshotForm.snapshot_status} options={snapshotStatusOptions} onChange={(value) => setSnapshotForm((current) => ({ ...current, snapshot_status: value }))} />
            <TextField disabled={!canManageInputs} label="Input profile ref" required error={fieldErrors["snapshot.input_profile_ref"]} value={snapshotForm.input_profile_ref} onChange={(value) => setSnapshotForm((current) => ({ ...current, input_profile_ref: value }))} />
            <TextField disabled={!canManageInputs} label="Config profile reference" value={snapshotForm.config_profile_ref} onChange={(value) => setSnapshotForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <div className="form-grid salary-crud-form-grid">
            <JsonField disabled={!canManageInputs} label="Employee snapshot JSON" error={fieldErrors["snapshot.employee_snapshot"]} value={snapshotForm.employee_snapshot} onChange={(value) => setSnapshotForm((current) => ({ ...current, employee_snapshot: value }))} />
            <JsonField disabled={!canManageInputs} label="Organization snapshot JSON" error={fieldErrors["snapshot.organization_snapshot"]} value={snapshotForm.organization_snapshot} onChange={(value) => setSnapshotForm((current) => ({ ...current, organization_snapshot: value }))} />
            <JsonField disabled={!canManageInputs} label="Salary snapshot JSON" error={fieldErrors["snapshot.salary_snapshot"]} value={snapshotForm.salary_snapshot} onChange={(value) => setSnapshotForm((current) => ({ ...current, salary_snapshot: value }))} />
            <JsonField disabled={!canManageInputs} label="Attendance snapshot JSON" error={fieldErrors["snapshot.attendance_snapshot"]} value={snapshotForm.attendance_snapshot} onChange={(value) => setSnapshotForm((current) => ({ ...current, attendance_snapshot: value }))} />
            <JsonField disabled={!canManageInputs} label="Validation snapshot JSON" error={fieldErrors["snapshot.validation_snapshot"]} value={snapshotForm.validation_snapshot} onChange={(value) => setSnapshotForm((current) => ({ ...current, validation_snapshot: value }))} />
          </div>
          <div className="salary-crud-list" aria-label="Payroll input snapshot records">
            {setup.snapshots.slice(0, 6).map((item) => (
              <button className="salary-crud-record" key={item.id} type="button" onClick={() => {
                setSelectedEmployeeLabel(snapshotEmployeeLabel(item));
                setSnapshotForm(snapshotToForm(item as HrAdminPayrollInputSnapshotListItem));
              }}>
                <strong>{item.employee_name}</strong>
                <span>{item.payroll_run_name}</span>
              </button>
            ))}
          </div>
          <button className="button button--primary" disabled={!canManageInputs || submitting === "snapshot" || !runOptions.length || !snapshotForm.employee_id} type="submit">
            {submitting === "snapshot" ? "Saving..." : snapshotForm.id ? "Save snapshot" : "Create snapshot"}
          </button>
          {!canManageInputs ? <span className="muted">{manageDisabledReason}</span> : null}
        </form>

        <div className="salary-crud-form" aria-label="Payroll input bulk import" data-testid="payroll-input-bulk-import">
          <div className="salary-crud-form__header">
            <div><span className="workspace-card__eyebrow">Bulk import</span><h3>Payroll snapshots</h3></div>
          </div>
          <p className="section-copy section-copy-soft">Upload-ready CSV capture for payroll input rows after employee, attendance, leave, and bank data are loaded.</p>
          <label className="form-field">
            <span className="muted">CSV data</span>
            <textarea
              className="input-control"
              disabled={!canManageInputs}
              onChange={(event) => setBulkCsv(event.target.value)}
              placeholder={payrollSnapshotImportHeaders.join(",")}
              rows={7}
              value={bulkCsv}
            />
          </label>
          <button className="button button--primary" disabled={!canManageInputs || submitting === "bulk-snapshot"} type="button" onClick={() => void importBulkSnapshots()}>
            {submitting === "bulk-snapshot" ? "Importing..." : "Import payroll snapshots"}
          </button>
        </div>

        <div
          className={`salary-crud-form ${activeOperation === "lock" ? "is-active" : ""}`}
          aria-label="Payroll input lock panel"
          data-testid="payroll-input-lock-form"
          data-operation-panel="lock"
        >
          <div className="salary-crud-form__header">
            <div><span className="workspace-card__eyebrow">Lock gate</span><h3>Input lock</h3></div>
          </div>
          <p className="section-copy section-copy-soft">Locks all non-blocked snapshots on the selected payroll run and advances the run to calculation-ready state.</p>
          <div className="payroll-input-lock-summary" aria-label="Selected run lock readiness">
            <div><span>Snapshots</span><strong>{lockSnapshotCount}</strong></div>
            <div><span>Ready</span><strong>{lockReadyCount}</strong></div>
            <div><span>Warnings</span><strong>{lockWarningCount}</strong></div>
            <div><span>Blocked</span><strong>{lockBlockedCount}</strong></div>
            <div><span>Recon blockers</span><strong>{reconciliationBlockerCount}</strong></div>
            <div><span>Locked</span><strong>{lockLockedCount}</strong></div>
          </div>
          {lockBlockedCount > 0 ? (
            <div className="notice notice--compact" role="note">
              <strong>Lock blocked.</strong>
              <span className="muted">
                {firstBlockingSnapshot?.employee_name
                  ? `${firstBlockingSnapshot.employee_name}: ${firstBlockingSnapshot.blockers[0]}`
                  : "Resolve blocker snapshots before locking this run."}
              </span>
            </div>
          ) : reconciliationBlockerCount > 0 ? (
            <div className="notice notice--compact" role="note">
              <strong>Reconciliation blocks lock.</strong>
              <span className="muted">
                {firstReconciliationBlocker?.employee_name
                  ? `${firstReconciliationBlocker.employee_name}: ${firstReconciliationBlocker.reconciliation_summary.findings.find((item) => item.severity === "high")?.message ?? "Resolve high-risk reconciliation findings."}`
                  : "Resolve high-risk reconciliation findings before locking this run."}
              </span>
            </div>
          ) : lockWarningCount > 0 ? (
            <div className="notice notice--compact notice--success" role="note">
              <strong>Warnings present.</strong>
              <span className="muted">
                {firstWarningSnapshot?.employee_name
                  ? `${firstWarningSnapshot.employee_name}: ${firstWarningSnapshot.warnings[0]}`
                  : "Review warnings before locking this run."}
              </span>
            </div>
          ) : lockSnapshotCount > 0 ? (
            <div className="notice notice--compact notice--success" role="note">
              <strong>Ready to lock.</strong>
              <span className="muted">No blocker snapshots are currently visible for this run.</span>
            </div>
          ) : (
            <div className="notice notice--compact" role="note">
              <strong>No snapshots.</strong>
              <span className="muted">Create at least one input snapshot before locking this run.</span>
            </div>
          )}
          <button
            className="button button--primary"
            disabled={!canSubmitLock || submitting === "lock"}
            type="button"
            onClick={() => void lockInputs()}
          >
            {submitting === "lock" ? "Locking..." : "Lock selected run inputs"}
          </button>
          {lockDisabledMessage ? <span className="muted">{lockDisabledMessage}</span> : null}
        </div>
      </div>
    </section>
  );
}
