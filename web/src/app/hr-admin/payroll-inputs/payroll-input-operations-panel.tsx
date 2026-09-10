"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { HrAdminPayrollInputSnapshot, HrAdminPayrollInputSnapshotSetupResponse, HrAdminPayrollRun } from "@/lib/types";

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="form-field">
      <span className="muted">{label}</span>
      <input className="input-control" required={required} type="text" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  required,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="form-field">
      <span className="muted">{label}</span>
      <select className="input-control" required={required} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={`${label}-${option.value || "empty"}`} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function JsonField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="form-field">
      <span className="muted">{label}</span>
      <textarea className="input-control" rows={3} value={value} onChange={(event) => onChange(event.target.value)} />
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

function snapshotToForm(snapshot?: HrAdminPayrollInputSnapshot | null, runId = "", employeeId = "") {
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
    config_profile_ref: typeof snapshot?.config_snapshot.profile_ref === "string" ? snapshot.config_snapshot.profile_ref : "",
  };
}

export function PayrollInputOperationsPanel({
  initialSetup,
  selectedRun,
  selectedSnapshot,
}: {
  initialSetup: HrAdminPayrollInputSnapshotSetupResponse;
  selectedRun: HrAdminPayrollRun | null;
  selectedSnapshot: HrAdminPayrollInputSnapshot | null;
}) {
  const router = useRouter();
  const [setup, setSetup] = useState(initialSetup);
  const [runForm, setRunForm] = useState(() => selectedRun ? runToForm(selectedRun) : emptyRunForm(initialSetup));
  const [snapshotForm, setSnapshotForm] = useState(() => snapshotToForm(selectedSnapshot, selectedRun?.id ?? "", firstValue(initialSetup.options.employees)));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const periodOptions = useMemo(() => setup.options.periods.map((item) => ({ value: item.id, label: item.name })), [setup.options.periods]);
  const payGroupOptions = useMemo(() => [{ value: "", label: "All pay groups" }, ...setup.options.pay_groups.map((item) => ({ value: item.id, label: item.name }))], [setup.options.pay_groups]);
  const runOptions = useMemo(() => setup.runs.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })), [setup.runs]);
  const employeeOptions = useMemo(() => setup.options.employees.map((item) => ({ value: item.id, label: `${item.name} (${item.employee_code})` })), [setup.options.employees]);
  const runStatusOptions = useMemo(() => setup.options.payroll_run_statuses.map((item) => ({ value: item.value, label: item.label })), [setup.options.payroll_run_statuses]);
  const snapshotStatusOptions = useMemo(() => setup.options.payroll_input_snapshot_statuses.map((item) => ({ value: item.value, label: item.label })), [setup.options.payroll_input_snapshot_statuses]);

  async function saveRun() {
    setSubmitting("run");
    setFeedback(null);
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
    setFeedback({ tone: "success", message: "payroll run saved." });
    router.refresh();
  }

  async function saveSnapshot() {
    setSubmitting("snapshot");
    setFeedback(null);
    let body: Record<string, unknown>;
    try {
      body = {
        payroll_run_id: snapshotForm.payroll_run_id,
        employee_id: snapshotForm.employee_id,
        snapshot_status: snapshotForm.snapshot_status,
        input_profile_ref: snapshotForm.input_profile_ref,
        employee_snapshot: parseJson(snapshotForm.employee_snapshot, {}),
        organization_snapshot: parseJson(snapshotForm.organization_snapshot, {}),
        salary_snapshot: parseJson(snapshotForm.salary_snapshot, {}),
        attendance_snapshot: parseJson(snapshotForm.attendance_snapshot, {}),
        validation_snapshot: parseJson(snapshotForm.validation_snapshot, {}),
        config_snapshot: snapshotForm.config_profile_ref ? { profile_ref: snapshotForm.config_profile_ref } : {},
      };
    } catch {
      setSubmitting(null);
      setFeedback({ tone: "error", message: "Snapshot JSON is invalid." });
      return;
    }

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
    setFeedback({ tone: "success", message: "payroll input snapshot saved." });
    router.refresh();
  }

  async function lockInputs() {
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

  return (
    <section className="section section--tight salary-crud-console payroll-input-operations-panel" aria-labelledby="payroll-input-operations-title">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Browser operations</span>
          <h2 id="payroll-input-operations-title">Payroll input operations</h2>
        </div>
        <span className="payroll-setup-count">3 controls</span>
      </div>

      {feedback ? (
        <div className={`notice ${feedback.tone === "success" ? "notice--success" : ""}`} role={feedback.tone === "success" ? "status" : "alert"}>
          <strong>{feedback.tone === "success" ? "Saved." : "Save failed."}</strong>
          <span className="muted">{feedback.message}</span>
        </div>
      ) : null}

      <div className="salary-crud-grid payroll-input-operations-grid">
        <form
          aria-label="Payroll run form"
          className="salary-crud-form"
          data-testid="payroll-run-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveRun();
          }}
        >
          <div className="salary-crud-form__header">
            <div><span className="workspace-card__eyebrow">{runForm.id ? "Edit mode" : "Create mode"}</span><h3>Payroll run</h3></div>
            <button className="button button--secondary button--compact" type="button" onClick={() => setRunForm(emptyRunForm(setup))}>New</button>
          </div>
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Period" required value={runForm.period_id} options={periodOptions} onChange={(value) => setRunForm((current) => ({ ...current, period_id: value }))} />
            <SelectField label="Pay group" value={runForm.pay_group_id} options={payGroupOptions} onChange={(value) => setRunForm((current) => ({ ...current, pay_group_id: value }))} />
            <TextField label="Code" required value={runForm.code} onChange={(value) => setRunForm((current) => ({ ...current, code: value }))} />
            <TextField label="Name" required value={runForm.name} onChange={(value) => setRunForm((current) => ({ ...current, name: value }))} />
            <SelectField label="Status" required value={runForm.status} options={runStatusOptions} onChange={(value) => setRunForm((current) => ({ ...current, status: value }))} />
            <TextField label="Input profile ref" required value={runForm.input_profile_ref} onChange={(value) => setRunForm((current) => ({ ...current, input_profile_ref: value }))} />
            <TextField label="Snapshot schema ref" required value={runForm.snapshot_schema_ref} onChange={(value) => setRunForm((current) => ({ ...current, snapshot_schema_ref: value }))} />
            <TextField label="Config profile reference" value={runForm.config_profile_ref} onChange={(value) => setRunForm((current) => ({ ...current, config_profile_ref: value }))} />
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
          <button className="button button--primary" disabled={submitting === "run" || !periodOptions.length} type="submit">
            {submitting === "run" ? "Saving..." : runForm.id ? "Save run" : "Create run"}
          </button>
        </form>

        <form
          aria-label="Payroll input snapshot form"
          className="salary-crud-form"
          data-testid="payroll-input-snapshot-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveSnapshot();
          }}
        >
          <div className="salary-crud-form__header">
            <div><span className="workspace-card__eyebrow">{snapshotForm.id ? "Edit mode" : "Create mode"}</span><h3>Input snapshot</h3></div>
            <button className="button button--secondary button--compact" type="button" onClick={() => setSnapshotForm(snapshotToForm(null, runForm.id ?? firstValue(setup.runs), firstValue(setup.options.employees)))}>New</button>
          </div>
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Payroll run" required value={snapshotForm.payroll_run_id} options={runOptions} onChange={(value) => setSnapshotForm((current) => ({ ...current, payroll_run_id: value }))} />
            <SelectField label="Employee" required value={snapshotForm.employee_id} options={employeeOptions} onChange={(value) => setSnapshotForm((current) => ({ ...current, employee_id: value }))} />
            <SelectField label="Snapshot status" required value={snapshotForm.snapshot_status} options={snapshotStatusOptions} onChange={(value) => setSnapshotForm((current) => ({ ...current, snapshot_status: value }))} />
            <TextField label="Input profile ref" required value={snapshotForm.input_profile_ref} onChange={(value) => setSnapshotForm((current) => ({ ...current, input_profile_ref: value }))} />
            <TextField label="Config profile reference" value={snapshotForm.config_profile_ref} onChange={(value) => setSnapshotForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <div className="form-grid salary-crud-form-grid">
            <JsonField label="Employee snapshot JSON" value={snapshotForm.employee_snapshot} onChange={(value) => setSnapshotForm((current) => ({ ...current, employee_snapshot: value }))} />
            <JsonField label="Organization snapshot JSON" value={snapshotForm.organization_snapshot} onChange={(value) => setSnapshotForm((current) => ({ ...current, organization_snapshot: value }))} />
            <JsonField label="Salary snapshot JSON" value={snapshotForm.salary_snapshot} onChange={(value) => setSnapshotForm((current) => ({ ...current, salary_snapshot: value }))} />
            <JsonField label="Attendance snapshot JSON" value={snapshotForm.attendance_snapshot} onChange={(value) => setSnapshotForm((current) => ({ ...current, attendance_snapshot: value }))} />
            <JsonField label="Validation snapshot JSON" value={snapshotForm.validation_snapshot} onChange={(value) => setSnapshotForm((current) => ({ ...current, validation_snapshot: value }))} />
          </div>
          <div className="salary-crud-list" aria-label="Payroll input snapshot records">
            {setup.snapshots.slice(0, 6).map((item) => (
              <button className="salary-crud-record" key={item.id} type="button" onClick={() => setSnapshotForm(snapshotToForm(item))}>
                <strong>{item.employee_name}</strong>
                <span>{item.payroll_run_name}</span>
              </button>
            ))}
          </div>
          <button className="button button--primary" disabled={submitting === "snapshot" || !runOptions.length || !employeeOptions.length} type="submit">
            {submitting === "snapshot" ? "Saving..." : snapshotForm.id ? "Save snapshot" : "Create snapshot"}
          </button>
        </form>

        <div className="salary-crud-form" aria-label="Payroll input lock panel" data-testid="payroll-input-lock-form">
          <div className="salary-crud-form__header">
            <div><span className="workspace-card__eyebrow">Lock gate</span><h3>Input lock</h3></div>
          </div>
          <p className="section-copy section-copy-soft">Locks all non-blocked snapshots on the selected payroll run and advances the run to calculation-ready state.</p>
          <button className="button button--primary" disabled={submitting === "lock" || !(runForm.id || snapshotForm.payroll_run_id)} type="button" onClick={() => void lockInputs()}>
            {submitting === "lock" ? "Locking..." : "Lock selected run inputs"}
          </button>
        </div>
      </div>
    </section>
  );
}
