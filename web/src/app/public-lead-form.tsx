"use client";

import { useState } from "react";

import { hasFieldErrors, requireText, validateEmail, type FieldErrors } from "@/lib/ui/validation";

type Props = {
  intent: "signup" | "contact";
  submitLabel: string;
  compact?: boolean;
};

type LeadField = "company_name" | "contact_name" | "work_email" | "employee_count" | "country_code";

function readMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to submit request.";
  const detail = (payload as Record<string, unknown>).detail;
  return typeof detail === "string" ? detail : "Unable to submit request.";
}

export function PublicLeadForm({ intent, submitLabel, compact = false }: Props) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LeadField>>({});

  function clearFieldError(field: LeadField) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const companyName = String(formData.get("company_name") ?? "").trim();
    const contactName = String(formData.get("contact_name") ?? "").trim();
    const workEmail = String(formData.get("work_email") ?? "").trim();
    const employeeCountValue = String(formData.get("employee_count") ?? "").trim();
    const countryCode = String(formData.get("country_code") ?? "IN").trim() || "IN";
    const nextFieldErrors: FieldErrors<LeadField> = {
      company_name: requireText(companyName, "Enter your company name."),
      contact_name: requireText(contactName, "Enter your name."),
      work_email: requireText(workEmail, "Enter your work email.") ?? validateEmail(workEmail, "Enter a valid work email."),
      employee_count:
        employeeCountValue && Number(employeeCountValue) < 1
          ? "Employee count must be at least 1."
          : undefined,
      country_code: /^[A-Za-z]{2}$/.test(countryCode) ? undefined : "Use a 2-letter country code.",
    };
    if (hasFieldErrors(nextFieldErrors)) {
      setFieldErrors(nextFieldErrors);
      setStatus("idle");
      setMessage("");
      return;
    }

    setFieldErrors({});
    setStatus("submitting");
    setMessage("");

    const response = await fetch("/api/public-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent,
        company_name: companyName,
        contact_name: contactName,
        work_email: workEmail,
        phone_number: String(formData.get("phone_number") ?? "").trim(),
        employee_count: Number(employeeCountValue || 0) || null,
        industry: String(formData.get("industry") ?? "").trim(),
        country_code: countryCode.toUpperCase(),
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
    <form className={`public-lead-form${compact ? " public-lead-form--compact" : ""}`} noValidate onSubmit={handleSubmit}>
      <input aria-hidden="true" autoComplete="off" className="public-lead-form__honeypot" name="website" tabIndex={-1} />
      <label className="form-field">
        <span className="muted">Company name</span>
        <input aria-invalid={Boolean(fieldErrors.company_name)} className="input-control" name="company_name" required placeholder="Acme Services Pvt Ltd" onChange={() => clearFieldError("company_name")} />
        {fieldErrors.company_name ? <span className="field-error-text" role="alert">{fieldErrors.company_name}</span> : null}
      </label>
      <label className="form-field">
        <span className="muted">Your name</span>
        <input aria-invalid={Boolean(fieldErrors.contact_name)} className="input-control" name="contact_name" required placeholder="Priya Sharma" onChange={() => clearFieldError("contact_name")} />
        {fieldErrors.contact_name ? <span className="field-error-text" role="alert">{fieldErrors.contact_name}</span> : null}
      </label>
      <label className="form-field">
        <span className="muted">Work email</span>
        <input aria-invalid={Boolean(fieldErrors.work_email)} className="input-control" name="work_email" required type="email" placeholder="priya@company.com" onChange={() => clearFieldError("work_email")} />
        {fieldErrors.work_email ? <span className="field-error-text" role="alert">{fieldErrors.work_email}</span> : null}
      </label>
      <label className="form-field">
        <span className="muted">Phone</span>
        <input className="input-control" name="phone_number" placeholder="+91 90000 00000" />
      </label>
      <label className="form-field">
        <span className="muted">Employees</span>
        <input aria-invalid={Boolean(fieldErrors.employee_count)} className="input-control" min={1} name="employee_count" placeholder="100" type="number" onChange={() => clearFieldError("employee_count")} />
        {fieldErrors.employee_count ? <span className="field-error-text" role="alert">{fieldErrors.employee_count}</span> : null}
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
        <input aria-invalid={Boolean(fieldErrors.country_code)} className="input-control" maxLength={2} name="country_code" defaultValue="IN" onChange={() => clearFieldError("country_code")} />
        {fieldErrors.country_code ? <span className="field-error-text" role="alert">{fieldErrors.country_code}</span> : null}
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
        <div
          className={`notice notice--compact ${status === "success" ? "notice--success" : "notice--error"}`}
          role={status === "success" ? "status" : "alert"}
        >
          <strong>{status === "success" ? "Lead request submitted successfully." : "Lead request submission failed."}</strong>
          <span>{message}</span>
        </div>
      ) : null}
    </form>
  );
}
