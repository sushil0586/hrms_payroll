"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { HrAdminPayrollInputSnapshot, HrAdminPayrollRun, HrAdminPayrollSettlement, HrAdminPayrollSettlementSetupResponse } from "@/lib/types";

type Props = {
  setup: HrAdminPayrollSettlementSetupResponse;
  selectedRun: HrAdminPayrollRun | null;
  selectedSettlement: HrAdminPayrollSettlement | null;
};

type Notice = {
  tone: "success" | "error";
  message: string;
};

async function readPayload(response: Response) {
  return (await response.json().catch(() => ({}))) as { detail?: string; id?: string; status?: string };
}

export function PayrollSettlementActionsPanel({ setup, selectedRun, selectedSettlement }: Props) {
  const router = useRouter();
  const runSnapshots = useMemo(
    () => setup.snapshots.filter((snapshot) => snapshot.payroll_run_id === selectedRun?.id && snapshot.snapshot_status === "locked"),
    [selectedRun?.id, setup.snapshots],
  );
  const [snapshotId, setSnapshotId] = useState(runSnapshots[1]?.id ?? runSnapshots[0]?.id ?? "");
  const activeSnapshot = runSnapshots.find((snapshot) => snapshot.id === snapshotId) ?? runSnapshots[0] ?? null;
  const [sourceRef, setSourceRef] = useState("pilot-settlement-manual");
  const [grossAmount, setGrossAmount] = useState("42000");
  const [recoveryAmount, setRecoveryAmount] = useState("3000");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyAction, setBusyAction] = useState("");

  async function postJson(url: string, body: Record<string, unknown> = {}, successMessage: string, options: { refresh?: boolean } = {}) {
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
      if (options.refresh ?? true) {
        router.refresh();
      }
      return payload;
    } finally {
      setBusyAction("");
    }
  }

  async function createSettlement() {
    if (!selectedRun || !activeSnapshot) {
      setNotice({ tone: "error", message: "Select a run with locked employee snapshots before creating a settlement." });
      return;
    }
    const settlement = await postJson(
      "/api/hr-admin/payroll-settlements",
      {
        payroll_run_id: selectedRun.id,
        employee_id: activeSnapshot.employee_id,
        input_snapshot_id: activeSnapshot.id,
        settlement_date: activeSnapshot.period_end,
        last_working_date: activeSnapshot.period_end,
        currency_code: "INR",
        settlement_profile_ref: "tenant.payroll.settlement.pilot100.v1",
        approval_profile_ref: "tenant.payroll.settlement.approval.pilot100.v1",
        calculation_profile_ref: "tenant.payroll.calc.pilot100.v1",
        source_ref: sourceRef,
        reason: "Pilot certification FNF settlement entered through HR admin workspace.",
        config_snapshot: { source_system_ref: "hr_admin_browser_certification", pilot_phase: "P100-7" },
      },
      "Settlement package created.",
    );
    if (!settlement?.id || !selectedRun) {
      return;
    }
    await postJson(
      `/api/hr-admin/payroll-settlements/${settlement.id}/lines`,
      {
        line_kind: "salary_proration",
        direction: "earning",
        component_code: "P100_FNF_GROSS",
        component_name: "Pilot FNF Gross Due",
        amount: grossAmount,
        currency_code: "INR",
        calculation_order: 910,
        source_ref: `${sourceRef}:gross-due`,
        trace_snapshot: { dependencies: ["locked_input_snapshot", "last_working_date"] },
        config_snapshot: { source_system_ref: "hr_admin_browser_certification" },
      },
      "Settlement gross due line created.",
      { refresh: false },
    );
    await postJson(
      `/api/hr-admin/payroll-settlements/${settlement.id}/lines`,
      {
        line_kind: "notice_recovery",
        direction: "deduction",
        component_code: "P100_FNF_RECOVERY",
        component_name: "Pilot Notice Recovery",
        amount: recoveryAmount,
        currency_code: "INR",
        calculation_order: 920,
        source_ref: `${sourceRef}:notice-recovery`,
        trace_snapshot: { dependencies: ["exit_clearance", "finance_recovery"] },
        config_snapshot: { source_system_ref: "hr_admin_browser_certification" },
      },
      "Settlement recovery line created.",
      { refresh: false },
    );
    router.refresh();
    router.push(`/hr-admin/payroll-settlements?runId=${selectedRun.id}&settlementId=${settlement.id}`);
  }

  async function act(action: "submit" | "approve" | "apply") {
    if (!selectedSettlement) {
      setNotice({ tone: "error", message: "Select a settlement before running a lifecycle action." });
      return;
    }
    await postJson(
      `/api/hr-admin/payroll-settlements/${selectedSettlement.id}/${action}`,
      action === "approve" ? { approval_profile_ref: "tenant.payroll.settlement.approval.pilot100.v1" } : {},
      `Settlement ${action} completed.`,
    );
  }

  return (
    <section className="payroll-setup-assignment-panel" aria-label="Settlement certification actions">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Certification actions</span>
          <h2>Create and apply settlement</h2>
        </div>
        <span className="payroll-setup-count">{runSnapshots.length} locked snapshots</span>
      </div>
      <div className="payroll-output-handoff-grid payroll-adjustment-control-grid">
        <label>
          <span>Employee snapshot</span>
          <select aria-label="Settlement employee snapshot" value={snapshotId} onChange={(event) => setSnapshotId(event.target.value)}>
            {runSnapshots.map((snapshot: HrAdminPayrollInputSnapshot) => (
              <option key={snapshot.id} value={snapshot.id}>
                {snapshot.employee_code} - {snapshot.employee_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Gross due</span>
          <input aria-label="Settlement gross due" inputMode="decimal" value={grossAmount} onChange={(event) => setGrossAmount(event.target.value)} />
        </label>
        <label>
          <span>Recovery</span>
          <input aria-label="Settlement recovery" inputMode="decimal" value={recoveryAmount} onChange={(event) => setRecoveryAmount(event.target.value)} />
        </label>
        <label>
          <span>Source reference</span>
          <input aria-label="Settlement source reference" value={sourceRef} onChange={(event) => setSourceRef(event.target.value)} />
        </label>
      </div>
      <div className="payroll-close-action-row">
        <button className="button button--primary" disabled={Boolean(busyAction) || !selectedRun || !activeSnapshot} onClick={createSettlement} type="button">
          Create settlement
        </button>
        <button className="button button--secondary" disabled={Boolean(busyAction) || !selectedSettlement} onClick={() => act("submit")} type="button">
          Submit selected
        </button>
        <button className="button button--secondary" disabled={Boolean(busyAction) || !selectedSettlement} onClick={() => act("approve")} type="button">
          Approve selected
        </button>
        <button className="button button--secondary" disabled={Boolean(busyAction) || !selectedSettlement} onClick={() => act("apply")} type="button">
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
