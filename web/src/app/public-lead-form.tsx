"use client";

import { useState } from "react";

type Props = {
  intent: "signup" | "contact";
  submitLabel: string;
  compact?: boolean;
};

function readMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to submit request.";
  const detail = (payload as Record<string, unknown>).detail;
  return typeof detail === "string" ? detail : "Unable to submit request.";
}

export function PublicLeadForm({ intent, submitLabel, compact = false }: Props) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setStatus("submitting");
    setMessage("");

    const response = await fetch("/api/public-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent,
        company_name: String(formData.get("company_name") ?? "").trim(),
        contact_name: String(formData.get("contact_name") ?? "").trim(),
        work_email: String(formData.get("work_email") ?? "").trim(),
        phone_number: String(formData.get("phone_number") ?? "").trim(),
        employee_count: Number(formData.get("employee_count") || 0) || null,
        industry: String(formData.get("industry") ?? "").trim(),
        country_code: String(formData.get("country_code") ?? "IN").trim() || "IN",
        preferred_plan: String(formData.get("preferred_plan") ?? "").trim(),
        message: String(formData.get("message") ?? "").trim(),
        source_path: window.location.pathname,
        website: String(formData.get("website") ?? ""),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(readMessage(payload));
      return;
    }
    setStatus("success");
    setMessage(readMessage(payload));
    form.reset();
  }

  return (
    <form className={`public-lead-form${compact ? " public-lead-form--compact" : ""}`} onSubmit={handleSubmit}>
      <input aria-hidden="true" autoComplete="off" className="public-lead-form__honeypot" name="website" tabIndex={-1} />
      <label className="form-field">
        <span className="muted">Company name</span>
        <input className="input-control" name="company_name" required placeholder="Acme Services Pvt Ltd" />
      </label>
      <label className="form-field">
        <span className="muted">Your name</span>
        <input className="input-control" name="contact_name" required placeholder="Priya Sharma" />
      </label>
      <label className="form-field">
        <span className="muted">Work email</span>
        <input className="input-control" name="work_email" required type="email" placeholder="priya@company.com" />
      </label>
      <label className="form-field">
        <span className="muted">Phone</span>
        <input className="input-control" name="phone_number" placeholder="+91 90000 00000" />
      </label>
      <label className="form-field">
        <span className="muted">Employees</span>
        <input className="input-control" min={1} name="employee_count" placeholder="100" type="number" />
      </label>
      <label className="form-field">
        <span className="muted">Preferred plan</span>
        <select className="input-control" name="preferred_plan" defaultValue={intent === "signup" ? "growth" : ""}>
          <option value="">Not sure yet</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="business">Business</option>
          <option value="partner">Partner / payroll bureau</option>
        </select>
      </label>
      <label className="form-field">
        <span className="muted">Industry</span>
        <input className="input-control" name="industry" placeholder="Technology, services, manufacturing" />
      </label>
      <label className="form-field">
        <span className="muted">Country</span>
        <input className="input-control" maxLength={2} name="country_code" defaultValue="IN" />
      </label>
      <label className="form-field public-lead-form__message">
        <span className="muted">Message</span>
        <textarea className="input-control" name="message" placeholder="Tell us about payroll size, compliance needs, migration timeline, or pilot expectations." />
      </label>
      <div className="form-actions-bar public-lead-form__actions">
        <span className="muted">No tenant is created until platform admin approves the request.</span>
        <button className="button button--primary" disabled={status === "submitting"} type="submit">
          {status === "submitting" ? "Submitting..." : submitLabel}
        </button>
      </div>
      {message ? (
        <div className={`notice notice--compact ${status === "success" ? "notice--success" : ""}`} role="status">
          <strong>{message}</strong>
        </div>
      ) : null}
    </form>
  );
}
