"use client";

import { useState } from "react";

import { EmployeeSearchSelect } from "@/components/patterns/employee-search-select";
import type { HrAdminWorkScheduleDay, HrAdminWorkSchedulePreview } from "@/lib/types";

export function EmployeeShiftAssignmentGovernancePanel() {
  const [employeeId, setEmployeeId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<HrAdminWorkSchedulePreview | null>(null);

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
      const query = new URLSearchParams({
        employee_id: employeeId,
        start_date: attendanceDate,
        end_date: endDate || attendanceDate,
      });
      const response = await fetch(`/api/hr-admin/work-schedule-preview?${query.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as HrAdminWorkSchedulePreview | { detail?: string } | null;
      if (!response.ok || !payload || !("days" in payload)) {
        setError((payload && "detail" in payload && payload.detail) || "Unable to inspect work schedule.");
        return;
      }
      setResult(payload);
    } catch {
      setError("Unable to reach the server. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function renderDayLabel(item: HrAdminWorkScheduleDay) {
    if (item.day_type === "holiday") return `Holiday${item.holiday_name ? `: ${item.holiday_name}` : ""}`;
    if (item.day_type === "weekly_off") return "Weekly off";
    if (item.day_type === "working_day") return item.shift_name || "Working day";
    return "Unassigned";
  }

  function renderDayDetail(item: HrAdminWorkScheduleDay) {
    const parts = [
      item.shift_name,
      item.assignment_kind ? item.assignment_kind.replace("_", " ") : null,
      item.attendance_policy_name,
      item.resolution_source,
    ].filter(Boolean);
    return parts.join(" • ") || "No shift, roster, or attendance policy resolved.";
  }

  return (
    <section className="section">
      <div className="workspace-card workspace-card--compact">
        <div className="workspace-card__header">
          <div>
            <h2 className="section-heading-soft">Shift inspector</h2>
            <p className="section-copy section-copy-soft">Preview saved roster, weekly-off, holiday, shift, and attendance-policy resolution across a date range.</p>
          </div>
        </div>
        <form className="queue-toolbar panel-card-soft" onSubmit={handleInspect}>
          <EmployeeSearchSelect value={employeeId} onChange={setEmployeeId} />
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
              {isLoading ? "Inspecting..." : "Preview schedule"}
            </button>
          </div>
        </form>
        {error ? (
          <div className="notice notice--error" role="alert">
            <strong>Inspector unavailable.</strong>
            <span className="muted">{error}</span>
          </div>
        ) : null}
        {result ? (
          <>
            <div className="metric-grid metric-grid--compact">
              <div className="metric-card"><span className="metric-label">Calendar days</span><strong>{result.day_count}</strong><span className="metric-trend">{result.start_date} to {result.end_date}</span></div>
              <div className="metric-card"><span className="metric-label">Working days</span><strong>{result.working_day_count}</strong><span className="metric-trend">Counted for attendance</span></div>
              <div className="metric-card"><span className="metric-label">Weekly offs</span><strong>{result.weekly_off_count}</strong><span className="metric-trend">From resolved shift/roster</span></div>
              <div className="metric-card"><span className="metric-label">Holidays</span><strong>{result.holiday_count}</strong><span className="metric-trend">From attendance policy calendar</span></div>
            </div>
            <div className="detail-grid">
              {result.days.map((item) => (
                <div className="detail-row" key={item.date}>
                  <span className="detail-label">{item.date} • {item.day}</span>
                  <span className="detail-value">
                    <strong>{renderDayLabel(item)}</strong>
                    <span className="muted"> {renderDayDetail(item)}</span>
                    {item.warnings.length ? <span className="field-help-text field-help-text--warning">{item.warnings.join(" ")}</span> : null}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
