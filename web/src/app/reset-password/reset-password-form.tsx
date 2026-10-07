"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { hasFieldErrors, requireText, type FieldErrors } from "@/lib/ui/validation";

type ResetPasswordField = "password" | "passwordConfirm";

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to reset password.";
  const detail = (payload as Record<string, unknown>).detail;
  if (typeof detail === "string") return detail;
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return `${key}: ${String(value[0])}`;
  }
  return "Unable to reset password.";
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const uid = useMemo(() => searchParams.get("uid") || "", [searchParams]);
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ResetPasswordField>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const linkMissing = !uid || !token;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const nextFieldErrors: FieldErrors<ResetPasswordField> = {
      password: requireText(password, "Enter a new password."),
      passwordConfirm: requireText(passwordConfirm, "Confirm the new password."),
    };
    if (!nextFieldErrors.password && !nextFieldErrors.passwordConfirm && password !== passwordConfirm) {
      nextFieldErrors.passwordConfirm = "Passwords do not match.";
    }
    if (hasFieldErrors(nextFieldErrors)) {
      setFieldErrors(nextFieldErrors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    const response = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, token, password, password_confirm: passwordConfirm }),
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
    setPassword("");
    setPasswordConfirm("");
    setNotice(payload.detail || "Password updated. You can sign in with the new password.");
  }

  return (
    <form className="form-shell-card auth-form-shell" noValidate onSubmit={handleSubmit}>
      <div className="form-shell-card__intro">
        <h2 className="section-heading-soft">Set new password</h2>
        <p className="section-copy section-copy-soft">Choose a password for your Accerio HRMS account.</p>
      </div>

      {linkMissing ? (
        <div className="notice">
          <strong>Invalid setup link.</strong>
          <span className="muted">Request a new password setup email from the sign-in page.</span>
        </div>
      ) : null}

      <label className="auth-field">
        <span className="muted">New password</span>
        <input
          required
          disabled={linkMissing || Boolean(notice)}
          type="password"
          value={password}
          aria-invalid={Boolean(fieldErrors.password)}
          onChange={(event) => {
            setPassword(event.target.value);
            setFieldErrors((current) => ({ ...current, password: undefined }));
          }}
          className="auth-input"
          placeholder="Enter a new password"
        />
        {fieldErrors.password ? <span className="field-error-text" role="alert">{fieldErrors.password}</span> : null}
      </label>

      <label className="auth-field">
        <span className="muted">Confirm password</span>
        <input
          required
          disabled={linkMissing || Boolean(notice)}
          type="password"
          value={passwordConfirm}
          aria-invalid={Boolean(fieldErrors.passwordConfirm)}
          onChange={(event) => {
            setPasswordConfirm(event.target.value);
            setFieldErrors((current) => ({ ...current, passwordConfirm: undefined }));
          }}
          className="auth-input"
          placeholder="Re-enter the new password"
        />
        {fieldErrors.passwordConfirm ? <span className="field-error-text" role="alert">{fieldErrors.passwordConfirm}</span> : null}
      </label>

      {notice ? <div className="notice notice--success" role="status"><span>{notice}</span></div> : null}
      {error ? <div className="notice notice--error" role="alert"><span className="muted">{error}</span></div> : null}

      <div className="form-actions-bar auth-form-shell__actions">
        <Link className="auth-recovery-link" href={notice ? "/login" : "/forgot-password"}>
          {notice ? "Back to sign in" : "Request a new link"}
        </Link>
        <div className="form-actions-bar__buttons">
          <button className="button button--primary" disabled={isSubmitting || linkMissing || Boolean(notice)} type="submit">
            {isSubmitting ? "Updating..." : "Update password"}
          </button>
        </div>
      </div>
    </form>
  );
}
