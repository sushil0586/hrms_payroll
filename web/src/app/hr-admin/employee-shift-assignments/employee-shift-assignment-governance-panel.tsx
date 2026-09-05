"use client";

import { useState } from "react";

import type { HrAdminEmployeeShiftAssignmentResolution, HrAdminOptionItem } from "@/lib/types";

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

export function EmployeeShiftAssignmentGovernancePanel({ employees }: Props) {
  const [employeeId, setEmployeeId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<HrAdminEmployeeShiftAssignmentResolution | null>(null);

  async function handleInspect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!employeeId || !attendanceDate) {
      setError("Choose both an employee and a start date to inspect resolved shift coverage.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/hr-admin/employee-shift-assignments/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
          attendance_date: attendanceDate,
          end_date: endDate || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as HrAdminEmployeeShiftAssignmentResolution | { detail?: string } | null;
      if (!response.ok || !payload || !("has_resolution" in payload)) {
        setError((payload && "detail" in payload && payload.detail) || "Unable to inspect shift resolution.");
        return;
      }
      setResult(payload);
    } catch {
      setError("Unable to inspect shift resolution.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="section">
      <div className="workspace-card workspace-card--compact">
        <div className="workspace-card__header">
          <div>
            <h2 className="section-heading-soft">Shift inspector</h2>
            <p className="section-copy section-copy-soft">Test which shift or rotation resolves for an employee across a date range.</p>
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
            <span className="muted">Start date</span>
            <input className="input-control" type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} />
          </label>
          <label className="queue-toolbar__search">
            <span className="muted">End date</span>
            <input className="input-control" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
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
              <span className="detail-label">Resolved shift</span>
              <span className="detail-value">{result.shift_name || "No shift resolved"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Winning assignment mode</span>
              <span className="detail-value">{result.assignment_kind ? result.assignment_kind.replace("_", " ") : "No matched assignment"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Coverage window</span>
              <span className="detail-value">{result.end_date ? `${result.attendance_date} to ${result.end_date}` : result.attendance_date}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Winning scope</span>
              <span className="detail-value">{result.scope_labels.length ? result.scope_labels.join(" • ") : "No matched shift assignment"}</span>
            </div>
            {result.sequence_summary ? (
              <div className="detail-row">
                <span className="detail-label">Sequence summary</span>
                <span className="detail-value">{result.sequence_summary}</span>
              </div>
            ) : null}
            <div className="detail-row">
              <span className="detail-label">Summary</span>
              <span className="detail-value">{result.summary}</span>
            </div>
            {result.sequence?.length ? (
              <div className="detail-row">
                <span className="detail-label">Range preview</span>
                <span className="detail-value">
                  {result.sequence.map((item) => `${item.attendance_date}: ${item.shift_name || "No shift"} (${item.assignment_kind?.replace("_", " ") || "none"})`).join(" • ")}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
