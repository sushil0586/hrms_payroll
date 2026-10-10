"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { HrAdminPayrollAdjustment, HrAdminPayrollAdjustmentSetupResponse, HrAdminPayrollInputSnapshotListItem, HrAdminPayrollRun } from "@/lib/types";

type Props = {
  setup: HrAdminPayrollAdjustmentSetupResponse;
  selectedRun: HrAdminPayrollRun | null;
  selectedAdjustment: HrAdminPayrollAdjustment | null;
};

type Notice = {
  tone: "success" | "error";
  message: string;
};

function isNumberAtLeast(value: string, min: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min;
}

async function readPayload(response: Response) {
  return (await response.json().catch(() => ({}))) as { detail?: string; id?: string; status?: string; component_name?: string };
}

export function PayrollAdjustmentActionsPanel({ setup, selectedRun, selectedAdjustment }: Props) {
  const router = useRouter();
  const runSnapshots = useMemo(
    () => setup.snapshots.filter((snapshot) => snapshot.payroll_run_id === selectedRun?.id && snapshot.snapshot_status === "locked"),
    [selectedRun?.id, setup.snapshots],
  );
  const runPostLockImpacts = useMemo(
    () => setup.post_lock_impacts.filter((impact) => impact.payroll_run_id === selectedRun?.id),
    [selectedRun?.id, setup.post_lock_impacts],
  );
  const [postLockImpactRef, setPostLockImpactRef] = useState(runPostLockImpacts[0]?.adjustment_source_ref ?? "");
  const selectedPostLockImpact = runPostLockImpacts.find((impact) => impact.adjustment_source_ref === postLockImpactRef) ?? runPostLockImpacts[0] ?? null;
  const [snapshotId, setSnapshotId] = useState(runSnapshots[0]?.id ?? "");
  const activeSnapshot = runSnapshots.find((snapshot) => snapshot.id === (selectedPostLockImpact?.snapshot_id ?? snapshotId)) ?? runSnapshots[0] ?? null;
  const [amount, setAmount] = useState("12500");
  const [sourceRef, setSourceRef] = useState(runPostLockImpacts[0]?.adjustment_source_ref ?? "pilot-adjustment-manual");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busyAction, setBusyAction] = useState("");

  async function postJson(url: string, body: Record<string, unknown> = {}, successMessage: string) {
    setBusyAction(url);
    setNotice(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await readPayload(response);
      if (!response.ok) {
        setNotice({ tone: "error", message: payload.detail ?? "Action failed. Review the payload and current status." });
        return payload;
      }
      setNotice({ tone: "success", message: successMessage });
      router.refresh();
      return payload;
    } finally {
      setBusyAction("");
    }
  }

  async function createAdjustment() {
    if (!selectedRun || !activeSnapshot) {
      setNotice({ tone: "error", message: "Select a run with locked employee snapshots before creating an adjustment." });
      return;
    }
    const nextFieldErrors: Record<string, string> = {};
    if (!isNumberAtLeast(amount.trim(), 0)) {
      nextFieldErrors.amount = "Adjustment amount must be zero or a positive amount.";
    }
    if (!sourceRef.trim()) {
      nextFieldErrors.sourceRef = "Adjustment source reference is required.";
    }
    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setNotice({ tone: "error", message: "Fix the highlighted adjustment fields before continuing." });
      return;
    }
    setFieldErrors({});
    const payload = await postJson(
      "/api/hr-admin/payroll-adjustments",
      {
        payroll_run_id: selectedRun.id,
        employee_id: activeSnapshot.employee_id,
        input_snapshot_id: activeSnapshot.id,
        kind: selectedPostLockImpact ? "arrear" : "bonus",
        direction: "earning",
        component_code: selectedPostLockImpact ? "POST_LOCK_ARREAR" : "P100_BONUS",
        component_name: selectedPostLockImpact ? "Post-Lock Attendance Arrear" : "Pilot Certification Bonus",
        amount,
        currency_code: "INR",
        effective_date: activeSnapshot.period_end,
        source_period_start: activeSnapshot.period_start,
        source_period_end: activeSnapshot.period_end,
        adjustment_profile_ref: "tenant.payroll.adjustment.pilot100.v1",
        approval_profile_ref: "tenant.payroll.adjustment.approval.pilot100.v1",
        source_ref: sourceRef,
        reason: selectedPostLockImpact
          ? "Post-lock attendance or leave change requires arrear/correction review."
          : "Pilot certification one-time adjustment entered through HR admin workspace.",
        config_snapshot: { source_system_ref: "hr_admin_browser_certification", pilot_phase: "P100-7", post_lock_source: selectedPostLockImpact },
      },
      "Adjustment created as draft.",
    );
    if (payload?.id && selectedRun) {
      router.push(`/hr-admin/payroll-adjustments?tab=detail&runId=${selectedRun.id}&adjustmentId=${payload.id}`);
    }
  }

  async function act(action: "submit" | "approve" | "apply") {
    if (!selectedAdjustment) {
      setNotice({ tone: "error", message: "Select an adjustment before running a lifecycle action." });
      return;
    }
    await postJson(
      `/api/hr-admin/payroll-adjustments/${selectedAdjustment.id}/${action}`,
      action === "approve" ? { approval_profile_ref: "tenant.payroll.adjustment.approval.pilot100.v1" } : {},
      `Adjustment ${action} completed.`,
    );
  }

  return (
    <section className="payroll-setup-assignment-panel" aria-label="Adjustment certification actions">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Certification actions</span>
          <h2>Create and apply adjustment</h2>
        </div>
        <span className="payroll-setup-count">{runSnapshots.length} locked snapshots</span>
      </div>
      <div className="payroll-output-handoff-grid payroll-adjustment-control-grid">
        {runPostLockImpacts.length ? (
          <label>
            <span>Post-lock impact</span>
            <select
              aria-label="Post-lock payroll impact"
              value={selectedPostLockImpact?.adjustment_source_ref ?? postLockImpactRef}
              onChange={(event) => {
                const impact = runPostLockImpacts.find((item) => item.adjustment_source_ref === event.target.value) ?? null;
                setPostLockImpactRef(event.target.value);
                setSourceRef(impact?.adjustment_source_ref ?? event.target.value);
                if (impact) {
                  setSnapshotId(impact.snapshot_id);
                }
              }}
            >
              {runPostLockImpacts.map((impact) => (
                <option key={impact.adjustment_source_ref} value={impact.adjustment_source_ref}>
                  {impact.employee_code} - {impact.period_start} to {impact.period_end}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span>Employee snapshot</span>
          <select aria-label="Employee snapshot" value={snapshotId} onChange={(event) => setSnapshotId(event.target.value)}>
            {runSnapshots.map((snapshot: HrAdminPayrollInputSnapshotListItem) => (
              <option key={snapshot.id} value={snapshot.id}>
                {snapshot.employee_code} - {snapshot.employee_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Adjustment amount</span>
          <input aria-invalid={Boolean(fieldErrors.amount)} aria-label="Adjustment amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
          {fieldErrors.amount ? <span className="field-error-text" role="alert">{fieldErrors.amount}</span> : null}
        </label>
        <label>
          <span>Source reference</span>
          <input aria-invalid={Boolean(fieldErrors.sourceRef)} aria-label="Adjustment source reference" value={sourceRef} onChange={(event) => setSourceRef(event.target.value)} />
          {fieldErrors.sourceRef ? <span className="field-error-text" role="alert">{fieldErrors.sourceRef}</span> : null}
        </label>
      </div>
      <div className="payroll-close-action-row">
        <button className="button button--primary" disabled={Boolean(busyAction) || !selectedRun || !activeSnapshot} onClick={createAdjustment} type="button">
          Create adjustment
        </button>
        <button className="button button--secondary" disabled={Boolean(busyAction) || !selectedAdjustment} onClick={() => act("submit")} type="button">
          Submit selected
        </button>
        <button className="button button--secondary" disabled={Boolean(busyAction) || !selectedAdjustment} onClick={() => act("approve")} type="button">
          Approve selected
        </button>
        <button className="button button--secondary" disabled={Boolean(busyAction) || !selectedAdjustment} onClick={() => act("apply")} type="button">
          Apply selected
        </button>
      </div>
      {notice ? (
        <p className={`form-status form-status--${notice.tone}`} role="alert">
          {notice.message}
        </p>
      ) : null}
    </section>
  );
}
