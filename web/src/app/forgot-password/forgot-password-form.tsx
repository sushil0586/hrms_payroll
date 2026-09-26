"use client";

import Link from "next/link";
import { useState } from "react";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);
    const response = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
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
    <form className="form-shell-card auth-form-shell" onSubmit={handleSubmit}>
      <div className="form-shell-card__intro">
        <h2 className="section-heading-soft">Reset password</h2>
        <p className="section-copy section-copy-soft">Enter your username or email. If it matches an active account, we will send a secure setup link.</p>
      </div>

      <label className="auth-field">
        <span className="muted">Username or email</span>
        <input
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          className="auth-input"
          placeholder="riya.sharma@company.com"
        />
      </label>

      {notice ? <div className="notice notice--success"><span>{notice}</span></div> : null}
      {error ? <div className="notice"><span className="muted">{error}</span></div> : null}

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
