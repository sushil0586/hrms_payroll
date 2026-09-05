"use client";

import { useState } from "react";

import type { HrAdminAttendancePolicyAssignmentResolution, HrAdminOptionItem } from "@/lib/types";

type Props = {
  employees: HrAdminOptionItem[];
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

export function AttendancePolicyAssignmentGovernancePanel({ employees }: Props) {
  const [employeeId, setEmployeeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<HrAdminAttendancePolicyAssignmentResolution | null>(null);

  async function handleInspect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!employeeId) {
      setError("Choose an employee to inspect attendance policy resolution.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/hr-admin/attendance-policy-assignments/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
        }),
      });
      const payload = (await response.json().catch(() => null)) as HrAdminAttendancePolicyAssignmentResolution | { detail?: string } | null;
      if (!response.ok || !payload || !("has_resolution" in payload)) {
        setError((payload && "detail" in payload && payload.detail) || "Unable to inspect attendance policy resolution.");
        return;
      }
      setResult(payload);
    } catch {
      setError("Unable to inspect attendance policy resolution.");
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
            <p className="section-copy section-copy-soft">Test which active attendance policy resolves for an employee.</p>
          </div>
        </div>
        <form className="queue-toolbar panel-card-soft" onSubmit={handleInspect}>
          <label className="queue-toolbar__search">
            <span className="muted">Employee</span>
            <select className="input-control" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              {renderSelectOptions(employees)}
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
