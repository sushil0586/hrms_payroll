"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { EssAttendanceRecordOption, EssLeaveTypeOption } from "@/lib/types";
import { type FieldErrors, hasFieldErrors, requireText, requireValue, validateDateOrder } from "@/lib/ui/validation";

type Props = {
  leaveTypes: EssLeaveTypeOption[];
  attendanceRecords: EssAttendanceRecordOption[];
  isDemo: boolean;
  mode?: "all" | "leave" | "attendance";
};

type Feedback = {
  tone: "success" | "error";
  message: string;
};

type LeaveField = "leave_type_id" | "start_date" | "end_date" | "reason";
type AttendanceField = "attendance_record_id" | "requested_check_out_at" | "reason";

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

export function EssRequestSubmissionPanel({ leaveTypes, attendanceRecords, isDemo, mode = "all" }: Props) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [leaveFieldErrors, setLeaveFieldErrors] = useState<FieldErrors<LeaveField>>({});
  const [attendanceFieldErrors, setAttendanceFieldErrors] = useState<FieldErrors<AttendanceField>>({});
  const [submitting, setSubmitting] = useState<"leave" | "attendance" | null>(null);
  const submittingRef = useRef<"leave" | "attendance" | null>(null);
  const showLeaveForm = mode === "all" || mode === "leave";
  const showAttendanceForm = mode === "all" || mode === "attendance";
  const defaultLeaveType = leaveTypes[0]?.id ?? "";
  const defaultAttendanceRecord = attendanceRecords.find((record) => !record.is_locked)?.id ?? attendanceRecords[0]?.id ?? "";
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function clearLeaveFieldError(field: LeaveField) {
    setLeaveFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function clearAttendanceFieldError(field: AttendanceField) {
    setAttendanceFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submitLeave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = "leave";
    setFeedback(null);
    setLeaveFieldErrors({});
    if (isDemo) {
      setFeedback({ tone: "error", message: "Leave requests are only available in live mode." });
      submittingRef.current = null;
      return;
    }
    const formData = new FormData(event.currentTarget);
    const startDate = String(formData.get("start_date") ?? "");
    const endDate = String(formData.get("end_date") ?? "");
    const nextErrors: FieldErrors<LeaveField> = {
      leave_type_id: requireValue(String(formData.get("leave_type_id") ?? ""), "Select a leave type before submitting."),
      start_date: requireValue(startDate, "Select the leave start date."),
      end_date: requireValue(endDate, "Select the leave end date.") ?? validateDateOrder(startDate, endDate, "End date must be the same as or after the start date."),
      reason: requireText(String(formData.get("reason") ?? ""), "Enter the reason for this leave request."),
    };
    if (hasFieldErrors(nextErrors)) {
      setLeaveFieldErrors(nextErrors);
      setFeedback({ tone: "error", message: "Review the highlighted leave fields and try again." });
      submittingRef.current = null;
      return;
    }
    setSubmitting("leave");
    let response: Response;
    try {
      response = await fetch("/api/me/leave-requests", {
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
    } catch {
      setSubmitting(null);
      submittingRef.current = null;
      setFeedback({ tone: "error", message: "Unable to reach the server. Check your connection and try again." });
      return;
    }
    const payload = await response.json().catch(() => ({}));
    setSubmitting(null);
    if (!response.ok) {
      setFeedback({ tone: "error", message: getErrorMessage(payload, "Unable to submit leave request.") });
      submittingRef.current = null;
      return;
    }
    event.currentTarget.reset();
    setFeedback({ tone: "success", message: "Leave request submitted." });
    submittingRef.current = null;
    router.refresh();
  }

  async function submitRegularization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = "attendance";
    setFeedback(null);
    setAttendanceFieldErrors({});
    if (isDemo) {
      setFeedback({ tone: "error", message: "Attendance regularizations are only available in live mode." });
      submittingRef.current = null;
      return;
    }
    const formData = new FormData(event.currentTarget);
    const checkIn = String(formData.get("requested_check_in_at") ?? "");
    const checkOut = String(formData.get("requested_check_out_at") ?? "");
    const nextErrors: FieldErrors<AttendanceField> = {
      attendance_record_id: requireValue(String(formData.get("attendance_record_id") ?? ""), "Select the attendance day that needs correction."),
      requested_check_out_at: validateDateOrder(checkIn, checkOut, "Requested check-out cannot be earlier than requested check-in."),
      reason: requireText(String(formData.get("reason") ?? ""), "Enter the reason for this attendance correction."),
    };
    if (hasFieldErrors(nextErrors)) {
      setAttendanceFieldErrors(nextErrors);
      setFeedback({ tone: "error", message: "Review the highlighted attendance fields and try again." });
      submittingRef.current = null;
      return;
    }
    setSubmitting("attendance");
    let response: Response;
    try {
      response = await fetch("/api/me/attendance-regularizations", {
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
    } catch {
      setSubmitting(null);
      submittingRef.current = null;
      setFeedback({ tone: "error", message: "Unable to reach the server. Check your connection and try again." });
      return;
    }
    const payload = await response.json().catch(() => ({}));
    setSubmitting(null);
    if (!response.ok) {
      setFeedback({ tone: "error", message: getErrorMessage(payload, "Unable to submit attendance regularization.") });
      submittingRef.current = null;
      return;
    }
    event.currentTarget.reset();
    setFeedback({ tone: "success", message: "Attendance regularization submitted." });
    submittingRef.current = null;
    router.refresh();
  }

  return (
    <section className={`section request-submission-grid request-submission-grid--${mode}`}>
      {showLeaveForm ? (
        <article className="record-card panel-card-soft">
          <div className="section-header">
            <div>
              <h2 className="section-heading-soft">Submit leave request</h2>
              <p className="section-copy section-copy-soft">Create a policy-routed leave request from employee self service.</p>
            </div>
          </div>
          <form className="form-grid" noValidate onSubmit={submitLeave}>
            <label className="form-field">
              <span className="muted">Leave type</span>
              <select aria-invalid={Boolean(leaveFieldErrors.leave_type_id)} className="input-control" defaultValue={defaultLeaveType} name="leave_type_id" onChange={() => clearLeaveFieldError("leave_type_id")} required>
                {leaveTypes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              {leaveFieldErrors.leave_type_id ? <span className="field-error-text">{leaveFieldErrors.leave_type_id}</span> : null}
            </label>
            <label className="form-field">
              <span className="muted">Start date</span>
              <input aria-invalid={Boolean(leaveFieldErrors.start_date)} className="input-control" defaultValue={today} name="start_date" onChange={() => clearLeaveFieldError("start_date")} required type="date" />
              {leaveFieldErrors.start_date ? <span className="field-error-text">{leaveFieldErrors.start_date}</span> : null}
            </label>
            <label className="form-field">
              <span className="muted">End date</span>
              <input aria-invalid={Boolean(leaveFieldErrors.end_date)} className="input-control" defaultValue={today} name="end_date" onChange={() => clearLeaveFieldError("end_date")} required type="date" />
              {leaveFieldErrors.end_date ? <span className="field-error-text">{leaveFieldErrors.end_date}</span> : null}
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
              <textarea aria-invalid={Boolean(leaveFieldErrors.reason)} className="input-control" name="reason" onChange={() => clearLeaveFieldError("reason")} required rows={3} />
              {leaveFieldErrors.reason ? <span className="field-error-text">{leaveFieldErrors.reason}</span> : null}
            </label>
            <div className="form-actions-bar form-field--full">
              <span className="muted">Requests appear in MSS when manager approval is required.</span>
              <button className="button button--primary" disabled={submitting === "leave" || !leaveTypes.length} type="submit">
                {submitting === "leave" ? "Submitting..." : "Submit leave"}
              </button>
            </div>
          </form>
        </article>
      ) : null}

      {showAttendanceForm ? (
        <article className="record-card panel-card-soft">
          <div className="section-header">
            <div>
              <h2 className="section-heading-soft">Submit regularization</h2>
              <p className="section-copy section-copy-soft">Request a correction for an employee-owned attendance record.</p>
            </div>
          </div>
          <form className="form-grid" noValidate onSubmit={submitRegularization}>
            <label className="form-field form-field--full">
              <span className="muted">Attendance record</span>
              <select aria-invalid={Boolean(attendanceFieldErrors.attendance_record_id)} className="input-control" defaultValue={defaultAttendanceRecord} name="attendance_record_id" onChange={() => clearAttendanceFieldError("attendance_record_id")} required>
                {attendanceRecords.map((record) => (
                  <option disabled={record.is_locked} key={record.id} value={record.id}>{formatRecordLabel(record)}</option>
                ))}
              </select>
              {attendanceFieldErrors.attendance_record_id ? <span className="field-error-text">{attendanceFieldErrors.attendance_record_id}</span> : null}
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
              <input aria-invalid={Boolean(attendanceFieldErrors.requested_check_out_at)} className="input-control" name="requested_check_out_at" onChange={() => clearAttendanceFieldError("requested_check_out_at")} type="datetime-local" />
              {attendanceFieldErrors.requested_check_out_at ? <span className="field-error-text">{attendanceFieldErrors.requested_check_out_at}</span> : null}
            </label>
            <label className="form-field form-field--full">
              <span className="muted">Reason</span>
              <textarea aria-invalid={Boolean(attendanceFieldErrors.reason)} className="input-control" name="reason" onChange={() => clearAttendanceFieldError("reason")} required rows={3} />
              {attendanceFieldErrors.reason ? <span className="field-error-text">{attendanceFieldErrors.reason}</span> : null}
            </label>
            <div className="form-actions-bar form-field--full">
              <span className="muted">Regularizations route to the reporting manager inbox.</span>
              <button className="button button--primary" disabled={submitting === "attendance" || !attendanceRecords.length} type="submit">
                {submitting === "attendance" ? "Submitting..." : "Submit regularization"}
              </button>
            </div>
          </form>
        </article>
      ) : null}

      {feedback ? (
        <div className={`notice ${feedback.tone === "success" ? "notice--success" : "notice--error"}`} role={feedback.tone === "success" ? "status" : "alert"}>
          <strong>{feedback.tone === "success" ? "Submitted successfully." : "Submission failed."}</strong>
          <span className="muted">{feedback.message}</span>
        </div>
      ) : null}
    </section>
  );
}
