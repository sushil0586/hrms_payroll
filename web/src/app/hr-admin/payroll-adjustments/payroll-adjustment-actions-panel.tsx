"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { HrAdminPayrollAdjustment, HrAdminPayrollAdjustmentSetupResponse, HrAdminPayrollInputSnapshot, HrAdminPayrollRun } from "@/lib/types";

type Props = {
  setup: HrAdminPayrollAdjustmentSetupResponse;
  selectedRun: HrAdminPayrollRun | null;
  selectedAdjustment: HrAdminPayrollAdjustment | null;
};

type Notice = {
  tone: "success" | "error";
  message: string;
};

async function readPayload(response: Response) {
  return (await response.json().catch(() => ({}))) as { detail?: string; id?: string; status?: string; component_name?: string };
}

export function PayrollAdjustmentActionsPanel({ setup, selectedRun, selectedAdjustment }: Props) {
  const router = useRouter();
  const runSnapshots = useMemo(
    () => setup.snapshots.filter((snapshot) => snapshot.payroll_run_id === selectedRun?.id && snapshot.snapshot_status === "locked"),
    [selectedRun?.id, setup.snapshots],
  );
  const [snapshotId, setSnapshotId] = useState(runSnapshots[0]?.id ?? "");
  const activeSnapshot = runSnapshots.find((snapshot) => snapshot.id === snapshotId) ?? runSnapshots[0] ?? null;
  const [amount, setAmount] = useState("12500");
  const [sourceRef, setSourceRef] = useState("pilot-adjustment-manual");
  const [notice, setNotice] = useState<Notice | null>(null);
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
    const payload = await postJson(
      "/api/hr-admin/payroll-adjustments",
      {
        payroll_run_id: selectedRun.id,
        employee_id: activeSnapshot.employee_id,
        input_snapshot_id: activeSnapshot.id,
        kind: "bonus",
        direction: "earning",
        component_code: "P100_BONUS",
        component_name: "Pilot Certification Bonus",
        amount,
        currency_code: "INR",
        effective_date: activeSnapshot.period_end,
        source_period_start: activeSnapshot.period_start,
        source_period_end: activeSnapshot.period_end,
        adjustment_profile_ref: "tenant.payroll.adjustment.pilot100.v1",
        approval_profile_ref: "tenant.payroll.adjustment.approval.pilot100.v1",
        source_ref: sourceRef,
        reason: "Pilot certification one-time adjustment entered through HR admin workspace.",
        config_snapshot: { source_system_ref: "hr_admin_browser_certification", pilot_phase: "P100-7" },
      },
      "Adjustment created as draft.",
    );
    if (payload?.id && selectedRun) {
      router.push(`/hr-admin/payroll-adjustments?runId=${selectedRun.id}&adjustmentId=${payload.id}`);
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
        <label>
          <span>Employee snapshot</span>
          <select aria-label="Employee snapshot" value={snapshotId} onChange={(event) => setSnapshotId(event.target.value)}>
            {runSnapshots.map((snapshot: HrAdminPayrollInputSnapshot) => (
              <option key={snapshot.id} value={snapshot.id}>
                {snapshot.employee_code} - {snapshot.employee_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Adjustment amount</span>
          <input aria-label="Adjustment amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <label>
          <span>Source reference</span>
          <input aria-label="Adjustment source reference" value={sourceRef} onChange={(event) => setSourceRef(event.target.value)} />
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
