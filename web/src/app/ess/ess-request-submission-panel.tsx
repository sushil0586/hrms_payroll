"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { EssAttendanceRecordOption, EssLeaveTypeOption } from "@/lib/types";

type Props = {
  leaveTypes: EssLeaveTypeOption[];
  attendanceRecords: EssAttendanceRecordOption[];
  isDemo: boolean;
};

type Feedback = {
  tone: "success" | "error";
  message: string;
};

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || fallback);
}

function formatRecordLabel(record: EssAttendanceRecordOption) {
  return `${record.attendance_date} - ${record.status.replaceAll("_", " ")}${record.shift ? ` - ${record.shift}` : ""}`;
}

export function EssRequestSubmissionPanel({ leaveTypes, attendanceRecords, isDemo }: Props) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [submitting, setSubmitting] = useState<"leave" | "attendance" | null>(null);
  const defaultLeaveType = leaveTypes[0]?.id ?? "";
  const defaultAttendanceRecord = attendanceRecords.find((record) => !record.is_locked)?.id ?? attendanceRecords[0]?.id ?? "";
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function submitLeave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    if (isDemo) {
      setFeedback({ tone: "error", message: "Leave requests are only available in live mode." });
      return;
    }
    const formData = new FormData(event.currentTarget);
    setSubmitting("leave");
    const response = await fetch("/api/me/leave-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leave_type_id: String(formData.get("leave_type_id") ?? ""),
        start_date: String(formData.get("start_date") ?? ""),
        end_date: String(formData.get("end_date") ?? ""),
        start_day_portion: String(formData.get("start_day_portion") ?? "full_day"),
        end_day_portion: String(formData.get("end_day_portion") ?? "full_day"),
        reason: String(formData.get("reason") ?? ""),
        attachment_reference: String(formData.get("attachment_reference") ?? ""),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setSubmitting(null);
    if (!response.ok) {
      setFeedback({ tone: "error", message: getErrorMessage(payload, "Unable to submit leave request.") });
      return;
    }
    event.currentTarget.reset();
    setFeedback({ tone: "success", message: "Leave request submitted." });
    router.refresh();
  }

  async function submitRegularization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    if (isDemo) {
      setFeedback({ tone: "error", message: "Attendance regularizations are only available in live mode." });
      return;
    }
    const formData = new FormData(event.currentTarget);
    setSubmitting("attendance");
    const response = await fetch("/api/me/attendance-regularizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendance_record_id: String(formData.get("attendance_record_id") ?? ""),
        requested_status: String(formData.get("requested_status") ?? "present"),
        requested_check_in_at: String(formData.get("requested_check_in_at") ?? "") || null,
        requested_check_out_at: String(formData.get("requested_check_out_at") ?? "") || null,
        reason: String(formData.get("reason") ?? ""),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setSubmitting(null);
    if (!response.ok) {
      setFeedback({ tone: "error", message: getErrorMessage(payload, "Unable to submit attendance regularization.") });
      return;
    }
    event.currentTarget.reset();
    setFeedback({ tone: "success", message: "Attendance regularization submitted." });
    router.refresh();
  }

  return (
    <section className="section request-submission-grid">
      <article className="record-card panel-card-soft">
        <div className="section-header">
          <div>
            <h2 className="section-heading-soft">Submit leave request</h2>
            <p className="section-copy section-copy-soft">Create a policy-routed leave request from employee self service.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={submitLeave}>
          <label className="form-field">
            <span className="muted">Leave type</span>
            <select className="input-control" defaultValue={defaultLeaveType} name="leave_type_id" required>
              {leaveTypes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Start date</span>
            <input className="input-control" defaultValue={today} name="start_date" required type="date" />
          </label>
          <label className="form-field">
            <span className="muted">End date</span>
            <input className="input-control" defaultValue={today} name="end_date" required type="date" />
          </label>
          <label className="form-field">
            <span className="muted">Start day portion</span>
            <select className="input-control" defaultValue="full_day" name="start_day_portion">
              <option value="full_day">Full day</option>
              <option value="first_half">First half</option>
              <option value="second_half">Second half</option>
            </select>
          </label>
          <label className="form-field">
            <span className="muted">End day portion</span>
            <select className="input-control" defaultValue="full_day" name="end_day_portion">
              <option value="full_day">Full day</option>
              <option value="first_half">First half</option>
              <option value="second_half">Second half</option>
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Attachment reference</span>
            <input className="input-control" name="attachment_reference" placeholder="Optional policy evidence" />
          </label>
          <label className="form-field form-field--full">
            <span className="muted">Reason</span>
            <textarea className="input-control" name="reason" required rows={3} />
          </label>
          <div className="form-actions-bar form-field--full">
            <span className="muted">Requests appear in MSS when manager approval is required.</span>
            <button className="button button--primary" disabled={submitting === "leave" || !leaveTypes.length} type="submit">
              {submitting === "leave" ? "Submitting..." : "Submit leave"}
            </button>
          </div>
        </form>
      </article>

      <article className="record-card panel-card-soft">
        <div className="section-header">
          <div>
            <h2 className="section-heading-soft">Submit regularization</h2>
            <p className="section-copy section-copy-soft">Request a correction for an employee-owned attendance record.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={submitRegularization}>
          <label className="form-field form-field--full">
            <span className="muted">Attendance record</span>
            <select className="input-control" defaultValue={defaultAttendanceRecord} name="attendance_record_id" required>
              {attendanceRecords.map((record) => (
                <option disabled={record.is_locked} key={record.id} value={record.id}>{formatRecordLabel(record)}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Requested status</span>
            <select className="input-control" defaultValue="present" name="requested_status">
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="half_day">Half day</option>
              <option value="late">Late</option>
              <option value="remote">Remote</option>
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Requested check-in</span>
            <input className="input-control" name="requested_check_in_at" type="datetime-local" />
          </label>
          <label className="form-field">
            <span className="muted">Requested check-out</span>
            <input className="input-control" name="requested_check_out_at" type="datetime-local" />
          </label>
          <label className="form-field form-field--full">
            <span className="muted">Reason</span>
            <textarea className="input-control" name="reason" required rows={3} />
          </label>
          <div className="form-actions-bar form-field--full">
            <span className="muted">Regularizations route to the reporting manager inbox.</span>
            <button className="button button--primary" disabled={submitting === "attendance" || !attendanceRecords.length} type="submit">
              {submitting === "attendance" ? "Submitting..." : "Submit regularization"}
            </button>
          </div>
        </form>
      </article>

      {feedback ? (
        <div className={`notice ${feedback.tone === "success" ? "notice--success" : ""}`} role="status">
          <strong>{feedback.tone === "success" ? "Submitted." : "Submission failed."}</strong>
          <span className="muted">{feedback.message}</span>
        </div>
      ) : null}
    </section>
  );
}
