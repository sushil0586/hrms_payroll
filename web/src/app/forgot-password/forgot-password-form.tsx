"use client";

import Link from "next/link";
import { useState } from "react";

import { hasFieldErrors, requireText, validateEmail, type FieldErrors } from "@/lib/ui/validation";

type ForgotPasswordField = "identifier";

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to send password setup email.";
  const detail = (payload as Record<string, unknown>).detail;
  if (typeof detail === "string") return detail;
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return `${key}: ${String(value[0])}`;
  }
  return "Unable to send password setup email.";
}

export function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ForgotPasswordField>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedIdentifier = identifier.trim();
    const nextFieldErrors: FieldErrors<ForgotPasswordField> = {
      identifier: requireText(trimmedIdentifier, "Enter your username or email.") ?? (trimmedIdentifier.includes("@") ? validateEmail(trimmedIdentifier) : undefined),
    };
    if (hasFieldErrors(nextFieldErrors)) {
      setFieldErrors(nextFieldErrors);
      setError("");
      setNotice("");
      return;
    }

    setFieldErrors({});
    setError("");
    setNotice("");
    setIsSubmitting(true);
    const response = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: trimmedIdentifier }),
    }).catch(() => null);
    setIsSubmitting(false);
    if (!response) {
      setError("Unable to reach the authentication service.");
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      return;
    }
    setNotice(payload.detail || "If the account exists, a secure password setup link will be sent shortly.");
  }

  return (
    <form className="form-shell-card auth-form-shell" noValidate onSubmit={handleSubmit}>
      <div className="form-shell-card__intro">
        <h2 className="section-heading-soft">Reset password</h2>
        <p className="section-copy section-copy-soft">Enter your username or email. If it matches an active account, we will send a secure setup link.</p>
      </div>

      <label className="auth-field">
        <span className="muted">Username or email</span>
        <input
          required
          value={identifier}
          aria-invalid={Boolean(fieldErrors.identifier)}
          onChange={(event) => {
            setIdentifier(event.target.value);
            setFieldErrors((current) => ({ ...current, identifier: undefined }));
          }}
          className="auth-input"
          placeholder="riya.sharma@company.com"
        />
        {fieldErrors.identifier ? <span className="field-error-text" role="alert">{fieldErrors.identifier}</span> : null}
      </label>

      {notice ? (
        <div className="notice notice--success" role="status">
          <strong>Password setup email requested.</strong>
          <span>{notice}</span>
        </div>
      ) : null}
      {error ? (
        <div className="notice notice--error" role="alert">
          <strong>Password setup email could not be sent.</strong>
          <span className="muted">{error}</span>
        </div>
      ) : null}

      <div className="form-actions-bar auth-form-shell__actions">
        <Link className="auth-recovery-link" href="/login">
          Back to sign in
        </Link>
        <div className="form-actions-bar__buttons">
          <button className="button button--primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Sending..." : "Send setup link"}
          </button>
        </div>
      </div>
    </form>
  );
}
