"use client";

import { useState } from "react";

import type { HrAdminLeavePolicyAssignmentResolution, HrAdminOptionItem } from "@/lib/types";

type Props = {
  employees: HrAdminOptionItem[];
  leaveTypes: HrAdminOptionItem[];
};

function renderSelectOptions(items: HrAdminOptionItem[]) {
  return [
    <option key="blank" value="">
      Select an option
    </option>,
    ...items.map((item) => (
      <option key={item.id} value={item.id}>
        {item.name}
      </option>
    )),
  ];
}

export function LeavePolicyAssignmentGovernancePanel({ employees, leaveTypes }: Props) {
  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<HrAdminLeavePolicyAssignmentResolution | null>(null);

  async function handleInspect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!employeeId || !leaveTypeId) {
      setError("Choose both an employee and a leave type to inspect routing.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/hr-admin/leave-policy-assignments/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
        }),
      });
      const payload = (await response.json().catch(() => null)) as HrAdminLeavePolicyAssignmentResolution | { detail?: string } | null;
      if (!response.ok || !payload || !("has_resolution" in payload)) {
        setError((payload && "detail" in payload && payload.detail) || "Unable to inspect policy resolution.");
        return;
      }
      setResult(payload);
    } catch {
      setError("Unable to inspect policy resolution.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="section">
      <div className="workspace-card workspace-card--compact">
        <div className="workspace-card__header">
          <div>
            <h2 className="section-heading-soft">Resolution inspector</h2>
            <p className="section-copy section-copy-soft">Test which active leave policy resolves for an employee and leave type.</p>
          </div>
        </div>
        <form className="queue-toolbar panel-card-soft" onSubmit={handleInspect}>
          <label className="queue-toolbar__search">
            <span className="muted">Employee</span>
            <select className="input-control" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              {renderSelectOptions(employees)}
            </select>
          </label>
          <label className="queue-toolbar__search">
            <span className="muted">Leave type</span>
            <select className="input-control" value={leaveTypeId} onChange={(event) => setLeaveTypeId(event.target.value)}>
              {renderSelectOptions(leaveTypes)}
            </select>
          </label>
          <div className="queue-toolbar__actions">
            <button className="button button--primary" disabled={isLoading} type="submit">
              {isLoading ? "Inspecting..." : "Inspect resolution"}
            </button>
          </div>
        </form>
        {error ? (
          <div className="notice">
            <strong>Inspector unavailable.</strong>
            <span className="muted">{error}</span>
          </div>
        ) : null}
        {result ? (
          <div className="detail-grid">
            <div className="detail-row">
              <span className="detail-label">Resolved policy</span>
              <span className="detail-value">{result.policy_name || "No active policy resolved"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Priority</span>
              <span className="detail-value">{result.priority ?? "Not applicable"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Winning scope</span>
              <span className="detail-value">{result.scope_labels.length ? result.scope_labels.join(" • ") : "No active assignment matched"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Summary</span>
              <span className="detail-value">{result.summary}</span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
